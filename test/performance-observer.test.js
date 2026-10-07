// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { consumer } from "./helpers.js";

test("maintainer observer measures real native descendants and retains genuine findings without modifying inputs", (t) => {
  const root = consumer(t, {
    "a.md": "Alpha.\n",
    "b.md": "#   Heading\n\nBeta.\n",
  });
  const output = mkdtempSync(join(tmpdir(), "markdown-quality-observer-test-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const prefix = join(output, "sample");
  const result = spawnSync(
    "python",
    [
      fileURLToPath(
        new URL("../scripts/qualify-performance.py", import.meta.url),
      ),
      "--observe",
      process.execPath,
      fileURLToPath(new URL("../src/cli.js", import.meta.url)),
      root,
      prefix,
    ],
    {
      timeout: 30000,
      encoding: "utf8",
      windowsHide: true,
      // The Linux observer owns a distinct process group, including native children.
      detached: process.platform === "linux",
    },
  );
  if (process.platform === "linux" && result.pid > 0) {
    try {
      process.kill(-result.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(!result.stdout.includes("\r"), "Observer status must use LF bytes");
  const resourceBytes = readFileSync(prefix + ".resources.json");
  assert.ok(
    !resourceBytes.includes(13),
    "Generated resource evidence must use LF",
  );
  assert.equal(resourceBytes.at(-1), 10);
  const report = JSON.parse(result.stdout);
  assert.equal(report.exitCode, 1);
  assert.equal(report.activeDescendants, 0);
  assert.equal(report.selected, 2);
  assert.ok(report.peakTreeBytes > 0);
  assert.ok(report.elapsedMs > 0);
  assert.ok(report.userCpuMsIncludingDriver > 0);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(
    report.diagnostics.map(({ path, rule }) => [path, rule]),
    [["b.md", "layout"]],
  );
  assert.equal(
    readFileSync(join(root, "b.md"), "utf8"),
    "#   Heading\n\nBeta.\n",
  );
  assert.equal(
    JSON.parse(readFileSync(prefix + ".stdout.json", "utf8")).outcome,
    "findings",
  );
});

test(
  "interrupted Linux observers dispose the CLI and its grandchildren",
  { skip: process.platform !== "linux", timeout: 15000 },
  async (t) => {
    const root = consumer(t);
    const pids = join(root, "pids.json");
    const cli = join(root, "hanging-cli.mjs");
    writeFileSync(
      cli,
      `import {spawn} from 'node:child_process';
       import {renameSync,writeFileSync} from 'node:fs';
       const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
       writeFileSync(${JSON.stringify(pids + ".tmp")},JSON.stringify([process.pid,child.pid]));
       renameSync(${JSON.stringify(pids + ".tmp")},${JSON.stringify(pids)});
       setInterval(()=>{},1000);`,
    );
    const observer = spawn(
      "python",
      [
        fileURLToPath(
          new URL("../scripts/qualify-performance.py", import.meta.url),
        ),
        "--observe",
        process.execPath,
        cli,
        root,
        join(root, "interrupted"),
      ],
      { detached: true, stdio: "ignore" },
    );
    const exited = once(observer, "exit", {
      signal: AbortSignal.timeout(10000),
    });
    try {
      const deadline = Date.now() + 5000;
      while (!existsSync(pids) && Date.now() < deadline) await delay(20);
      assert.ok(existsSync(pids), "The real CLI and grandchild must start.");
      const children = JSON.parse(readFileSync(pids, "utf8"));
      assert.equal(children.length, 2);
      assert.ok(children.every((pid) => Number.isInteger(pid) && pid > 0));
      observer.kill("SIGTERM");
      const [code, signal] = await exited;
      assert.equal(code, null);
      assert.equal(signal, "SIGKILL");
      for (const pid of children) {
        let live = true;
        const stoppedBy = Date.now() + 2000;
        while (live && Date.now() < stoppedBy) {
          try {
            // Zombies await the host's reaper but execute no further work.
            const state = readFileSync(`/proc/${pid}/stat`, "utf8")
              .split(") ")
              .at(-1)[0];
            live = !["Z", "X"].includes(state);
          } catch (error) {
            if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
            live = false;
          }
          if (live) await delay(20);
        }
        assert.ok(!live, `Child ${pid} remains live.`);
      }
    } finally {
      try {
        process.kill(-observer.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      await exited.catch(() => {});
    }
  },
);
