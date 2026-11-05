// SPDX-License-Identifier: AGPL-3.0-only
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultExecutionLimits } from "./execution-defaults.js";
const failedOutputs = new WeakSet();
function ownedDelivery(stream, bytes, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        Object.assign(
          new Error("Output delivery was cancelled or exceeded its deadline."),
          { code: "CANCELLED" },
        ),
      );
      return;
    }
    // Windows inherited stdout/stderr pipes can block the event loop inside
    // write(). Keep the deadline in the caller and terminate only this writer.
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("./cli-output-worker.js", import.meta.url)),
        stream === process.stderr ? "stderr" : "stdout",
      ],
      {
        stdio: ["pipe", "inherit", "inherit", "ipc"],
        windowsHide: true,
        env: Object.fromEntries(
          ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
            .filter((key) => process.env[key])
            .map((key) => [key, process.env[key]]),
        ),
      },
    );
    let delivered = false,
      failure;
    const cancel = () => {
      failure = Object.assign(
        new Error("Output delivery was cancelled or exceeded its deadline."),
        { code: "CANCELLED" },
      );
      child.kill();
    };
    signal?.addEventListener("abort", cancel, { once: true });
    child.on("error", (error) => {
      failure = error;
    });
    child.stdin.on("error", (error) => {
      failure ??= error;
    });
    child.on("message", (message) => {
      if (message?.delivered === true) delivered = true;
      else if (typeof message?.code === "string")
        failure = Object.assign(new Error("Output delivery failed."), {
          code: message.code,
        });
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", cancel);
      if (failure) reject(failure);
      else if (code === 0 && delivered) resolve();
      else
        reject(
          Object.assign(
            new Error("Output writer closed without complete delivery."),
            { code: "OUTPUT_FAILED" },
          ),
        );
    });
    child.stdin.end(bytes);
    if (signal?.aborted) cancel();
  });
}
/** Own output independently of worker cleanup, and await every delivered chunk. */
export async function writeOutput(
  stream,
  content,
  { signal, maxOutputBytes = null } = {},
) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (signal?.aborted)
    throw Object.assign(
      new Error("Output delivery was cancelled or exceeded its deadline."),
      { code: "CANCELLED" },
    );
  if (maxOutputBytes !== null && bytes.length > maxOutputBytes)
    throw Object.assign(new Error("Output exceeds maxOutputBytes."), {
      code: "OUTPUT_LIMIT",
    });
  if (bytes.length === 0) return;
  if (stream === process.stdout || stream === process.stderr) {
    try {
      return await ownedDelivery(stream, bytes, signal);
    } catch (error) {
      failedOutputs.add(stream);
      throw error;
    }
  }
  for (let offset = 0; offset < bytes.length; offset += 65536) {
    await new Promise((resolve, reject) => {
      const failed = (error) => {
        cleanup();
        reject(error);
      };
      const cancelled = () => {
        const error = Object.assign(
          new Error("Output delivery was cancelled or exceeded its deadline."),
          { code: "CANCELLED" },
        );
        stream.destroy();
        failed(error);
      };
      const cleanup = () => {
        stream.removeListener("error", failed);
        signal?.removeEventListener("abort", cancelled);
      };
      stream.once("error", failed);
      signal?.addEventListener("abort", cancelled, { once: true });
      if (signal?.aborted) {
        cancelled();
        return;
      }
      stream.write(bytes.subarray(offset, offset + 65536), (error) => {
        // Writable emits its error after invoking the callback. Keep the once
        // listener until that event so EPIPE cannot become an unhandled error.
        if (error) {
          signal?.removeEventListener("abort", cancelled);
          reject(error);
        } else {
          cleanup();
          resolve();
        }
      });
    });
  }
}

/** A failed sink is not retried. Failure text has the existing cleanup allowance,
 * independent of the expired operation, and never recursively reports failure. */
export async function writeFailure(
  message,
  {
    cleanupTimeoutMs = defaultExecutionLimits.cleanupTimeoutMs,
    maxOutputBytes = defaultExecutionLimits.maxOutputBytes,
  } = {},
) {
  if (failedOutputs.has(process.stderr)) return;
  const controller = new AbortController();
  let timer;
  if (cleanupTimeoutMs !== null) {
    const end = performance.now() + cleanupTimeoutMs;
    const expire = () => {
      const remaining = end - performance.now();
      if (remaining <= 0) controller.abort();
      else timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
    };
    expire();
  }
  try {
    await writeOutput(process.stderr, message, {
      signal: controller.signal,
      maxOutputBytes,
    });
  } catch {
    /* The operational exit remains authoritative when no error sink works. */
  } finally {
    clearTimeout(timer);
  }
}
