// SPDX-License-Identifier: AGPL-3.0-only
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { resolveConsumerRoot } from "./configuration.js";
import { fail, OperationError, decode } from "./contracts.js";
import { validateQualityResult } from "./result-validation.js";
import { defaultInventory, bindGitExecutable } from "./documents.js";

/** Child environment deliberately excludes credentials, PATH and Node/config injection. */
export function executionEnvironment() {
  return Object.fromEntries(
    ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
      .filter((name) => process.env[name])
      .map((name) => [name, process.env[name]]),
  );
}

/** Invoke the installed canonical analyzer in a fresh Node process, with bounded
 * framing, sanitized environment, cancellation and native process-tree termination.
 * OS observation/qualification remains the separately shipped observer contract.
 */
export async function executeQuality(
  request,
  {
    checkerMs = 180000,
    reportBytes = 8388608,
    requestBytes = 8388608,
    nodeOldSpaceMb = 256,
    signal,
    processGroup = "owned",
  } = {},
) {
  for (const bound of [checkerMs, reportBytes, requestBytes, nodeOldSpaceMb])
    if (!Number.isSafeInteger(bound) || bound < 1)
      fail(
        "INVALID_EXECUTION",
        "External execution requires finite positive bounds.",
      );
  if (
    !["owned", "inherit"].includes(processGroup) ||
    (signal !== undefined && !(signal instanceof AbortSignal))
  )
    fail(
      "INVALID_EXECUTION",
      "Execution requires a supported containment mode and AbortSignal.",
    );
  if (signal?.aborted)
    fail("CANCELLED", "Operation was cancelled before launch.");
  if (!request || typeof request !== "object" || Array.isArray(request))
    fail("INVALID_EXECUTION", "Execution requires a request object.");
  const logical = Object.hasOwn(request, "document");
  if (
    logical &&
    (!request.document ||
      typeof request.document !== "object" ||
      Array.isArray(request.document) ||
      typeof request.document.path !== "string" ||
      typeof request.document.contentBase64 !== "string")
  )
    fail("INVALID_DOCUMENT", "Invalid logical document framing.");
  if (!logical && request.mode === "format")
    fail(
      "INVALID_EXECUTION",
      "Bounded execution is read-only; checkout formatting requires runQuality.",
    );
  request = { ...request, root: resolveConsumerRoot(request.root) };
  if (!logical)
    request = {
      ...request,
      inventory: defaultInventory(
        resolve(request.root ?? process.cwd()),
        request.files,
        request.inventory,
      ),
    };
  if (request.inventory === "git") {
    // Bind native host Git before removing PATH. Candidate data cannot supply
    // the executable, and the checker never inherits a command-search graph.
    request = {
      ...request,
      gitExecutable: bindGitExecutable(request.root, request.gitExecutable),
    };
  }
  const input = Buffer.from(JSON.stringify(request));
  if (input.length > requestBytes)
    fail("REQUEST_LIMIT", "Request exceeds the input framing bound.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--max-old-space-size=" + nodeOldSpaceMb,
        fileURLToPath(new URL("./execution-worker.js", import.meta.url)),
        String(requestBytes),
      ],
      {
        env: executionEnvironment(),
        windowsHide: true,
        detached: process.platform !== "win32" && processGroup === "owned",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = [],
      outputBytes = 0,
      stderrBytes = 0,
      failure,
      termination;
    async function stop(code, message) {
      if (failure) return;
      failure = new OperationError(code, message);
      if (!child.pid) return;
      if (process.platform === "win32") {
        termination = new Promise((done) =>
          execFile(
            join(
              process.env.SystemRoot ?? "C:\\Windows",
              "System32",
              "taskkill.exe",
            ),
            ["/PID", String(child.pid), "/T", "/F"],
            { windowsHide: true, env: executionEnvironment(), timeout: 5000 },
            (error) => {
              if (error && child.exitCode === null)
                failure = new OperationError(
                  "CLEANUP_FAILED",
                  "Owned process-tree termination failed.",
                );
              done();
            },
          ),
        );
      } else {
        try {
          process.kill(
            processGroup === "owned" ? -child.pid : child.pid,
            "SIGKILL",
          );
        } catch (error) {
          if (error.code !== "ESRCH")
            failure = new OperationError(
              "CLEANUP_FAILED",
              "Owned process-group termination failed.",
            );
        }
      }
    }
    const deadline = performance.now() + checkerMs;
    let timer;
    function expire() {
      const remaining = deadline - performance.now();
      if (remaining > 0) {
        timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
        return;
      }
      void stop("EXECUTION_TIMEOUT", "External checker exceeded its deadline.");
    }
    timer = setTimeout(expire, Math.min(checkerMs, 2_147_483_647));
    const cancel = () => stop("CANCELLED", "Operation was cancelled.");
    signal?.addEventListener("abort", cancel, { once: true });
    child.stdout.on("data", (bytes) => {
      outputBytes += bytes.length;
      if (outputBytes > reportBytes)
        void stop("REPORT_LIMIT", "Checker output exceeds the report bound.");
      else output.push(bytes);
    });
    child.stderr.on("data", (bytes) => {
      stderrBytes += bytes.length;
      if (stderrBytes > reportBytes)
        void stop(
          "REPORT_LIMIT",
          "Checker error output exceeds the report bound.",
        );
    });
    child.stdin.on("error", () => {});
    child.on("error", () => {
      failure = new OperationError(
        "EXECUTION_FAILED",
        "Cannot start installed checker.",
      );
    });
    child.on("close", async (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      await termination;
      if (failure) return reject(failure);
      try {
        const report = JSON.parse(decode(Buffer.concat(output)));
        validateQualityResult(report, {
          operation: request.mode ?? (logical ? "format" : "check"),
          exitCode: code,
          ...(logical ? { requestId: request.document.requestId ?? null } : {}),
        });
        resolve(report);
      } catch (error) {
        reject(
          error.code
            ? error
            : new OperationError(
                "INVALID_RESULT",
                "Checker returned malformed report framing.",
              ),
        );
      }
    });
    child.stdin.end(input);
  });
}
