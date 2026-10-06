// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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
    { timeout: 30000, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
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
