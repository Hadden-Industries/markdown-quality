// SPDX-License-Identifier: AGPL-3.0-only
/** Native owners retain domain admission; this boundary streams bytes/census. */
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repositoryPython } from "./python-target.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const frameMaximum = 65536;
const pendingMaximum = 262144;

/** Private finite metadata framing; JSON payloads are opaque binary frames. */
async function* frames(stream) {
  let pending = Buffer.alloc(0);
  for await (const part of stream) {
    if (pending.length + part.length > pendingMaximum)
      throw new Error("Native provider transport capacity");
    pending = Buffer.concat([pending, part]);
    while (pending.length >= 5) {
      const kind = String.fromCharCode(pending[0]),
        length = pending.readUInt32LE(1);
      if (!["J", "D"].includes(kind) || length > frameMaximum)
        throw new Error("Invalid native provider frame");
      if (pending.length < 5 + length) break;
      const bytes = pending.subarray(5, 5 + length);
      pending = pending.subarray(5 + length);
      if (kind === "J") {
        const control = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
        if (!control || typeof control !== "object" || Array.isArray(control))
          throw new Error("Invalid native provider control");
        yield { kind, control };
      } else yield { kind, bytes };
    }
  }
  if (pending.length) throw new Error("Truncated native provider frame");
}

function timeout(ms) {
  let timer;
  const promise = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return { promise, clear: () => clearTimeout(timer) };
}

/** Three sequential streams share one active child. No complete payload,
 * base64 envelope or aggregate inventory crosses this owner boundary.
 */
export async function provideRepositoryJson({ root, signal }) {
  if (resolve(root) !== resolve(repositoryRoot))
    throw new Error("Native repository context differs.");
  signal?.throwIfAborted();
  let active,
    closed = false;

  async function* phaseFrames(phase) {
    if (closed || active) throw new Error("Native provider is not ready.");
    signal?.throwIfAborted();
    const child = spawn(
      repositoryPython(root),
      [
        "-I",
        "-B",
        join(root, "scripts/collect-json-documents.py"),
        "--phase",
        phase,
      ],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let settle,
      finished = false,
      failure,
      stderr = Buffer.alloc(0);
    const exited = new Promise((resolve) => {
      settle = resolve;
    });
    child.once("error", (error) => {
      finished = true;
      settle({ error });
    });
    child.once("close", (code, signal) => {
      finished = true;
      settle({ code, signal });
    });
    const stop = () => {
      if (!finished) child.kill();
      // A paused readable can otherwise hold ChildProcess "close" after exit.
      child.stdout?.destroy();
      child.stderr?.destroy();
    };
    const terminate = async () => {
      stop();
      const grace = timeout(2000);
      try {
        const result = await Promise.race([exited, grace.promise]);
        if (result !== undefined) return;
      } finally {
        grace.clear();
      }
      if (!finished) child.kill("SIGKILL");
      const forced = timeout(2000);
      try {
        if ((await Promise.race([exited, forced.promise])) === undefined)
          throw new Error("Native provider child did not settle.");
      } finally {
        forced.clear();
      }
    };
    const owner = { terminate };
    active = owner;
    const timer = setTimeout(() => {
      failure = new Error("Native provider time capacity");
      stop();
    }, 60000);
    signal?.addEventListener("abort", stop, { once: true });
    child.stderr.on("data", (chunk) => {
      if (stderr.length + chunk.length > frameMaximum) {
        failure = new Error("Native provider diagnostic capacity");
        stop();
      } else stderr = Buffer.concat([stderr, chunk]);
    });
    let complete = false;
    try {
      for await (const frame of frames(child.stdout)) {
        if (closed) throw new Error("Native provider closed.");
        signal?.throwIfAborted();
        if (failure) throw failure;
        if (complete)
          throw new Error("Native provider data follows completion.");
        if (frame.kind === "J" && frame.control.type === "complete")
          complete = true;
        else yield frame;
      }
      const result = await exited;
      signal?.throwIfAborted();
      if (failure) throw failure;
      if (result.error || result.code !== 0)
        throw new Error(
          "Native JSON admission failed: " +
            (stderr.toString("utf8") || result.error?.message || result.signal),
        );
      if (!complete) throw new Error("Native provider completion missing.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
      await terminate();
      if (active === owner) active = undefined;
    }
  }

  async function* entries(phase, type) {
    for await (const frame of phaseFrames(phase)) {
      if (frame.kind !== "J" || frame.control.type !== type)
        throw new Error("Unexpected native provider metadata.");
      yield frame.control.entry;
    }
  }

  async function* documents() {
    const iterator = phaseFrames("documents")[Symbol.asyncIterator]();
    try {
      while (true) {
        const next = await iterator.next();
        if (next.done) return;
        const frame = next.value;
        if (frame.kind !== "J" || frame.control.type !== "document")
          throw new Error("Native provider document header missing.");
        let consumed = false;
        const chunks = (async function* () {
          while (true) {
            if (closed) throw new Error("Native provider closed.");
            signal?.throwIfAborted();
            const next = await iterator.next();
            if (next.done)
              throw new Error("Native provider document end missing.");
            const frame = next.value;
            if (frame.kind === "D") yield frame.bytes;
            else if (frame.control.type === "document-end") {
              consumed = true;
              return;
            } else
              throw new Error("Unexpected native provider document boundary.");
          }
        })();
        yield {
          path: frame.control.path,
          source: frame.control.source,
          chunks,
        };
        if (!consumed)
          throw new Error("Native provider document was not consumed.");
      }
    } finally {
      await iterator.return();
    }
  }

  return {
    authorities: entries("authorities", "authority"),
    inventory: entries("inventory", "inventory"),
    documents: documents(),
    async close() {
      closed = true;
      await active?.terminate();
    },
  };
}
