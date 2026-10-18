// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { impactFixture } from "./dependency-impact-helpers.js";

/** Hold the real fixture cwd until the test explicitly releases its owned child. */
async function lockedFixture(t) {
  let cleanup;
  const fixture = impactFixture({ after: (hook) => (cleanup = hook) });
  const child = spawn(
    process.execPath,
    [
      "-e",
      "process.on('message', () => process.exit(0)); process.send('ready');",
    ],
    {
      cwd: fixture.root,
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close", {
        signal: AbortSignal.timeout(5000),
      });
      child.kill();
      await closed;
    }
    await rm(fixture.root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  });
  const [ready] = await once(child, "message", {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(ready, "ready");
  return { ...fixture, child, cleanup };
}

test(
  "fixture teardown waits for a Windows cwd lock to be released",
  {
    skip: process.platform !== "win32",
    timeout: 15000,
  },
  async (t) => {
    const fixture = await lockedFixture(t);
    const closed = once(fixture.child, "close");
    // The parent cannot deliver this release while the old synchronous hook runs.
    const release = setTimeout(() => fixture.child.send("release"), 150);
    try {
      await fixture.cleanup();
      const [code, signal] = await closed;
      assert.equal(code, 0);
      assert.equal(signal, null);
      assert.equal(existsSync(fixture.root), false);
    } finally {
      clearTimeout(release);
    }
  },
);

test(
  "fixture teardown still reports a Windows directory that remains locked",
  {
    skip: process.platform !== "win32",
    timeout: 15000,
  },
  async (t) => {
    const fixture = await lockedFixture(t);
    await assert.rejects(Promise.resolve().then(fixture.cleanup), (error) =>
      ["EBUSY", "EPERM"].includes(error.code),
    );
    assert.equal(existsSync(fixture.root), true);
    assert.equal(fixture.child.exitCode, null);
  },
);
