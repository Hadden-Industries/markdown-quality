// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readDocument } from "../src/documents.js";
import { replaceDocument } from "../src/replacement.js";
import { consumer } from "./helpers.js";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { runQuality } from "../src/quality.js";
test("concurrent preimage is retained and no temporary file is created", (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" }),
    item = readDocument(root, "a.md");
  writeFileSync(join(root, "a.md"), "Concurrent.\n");
  assert.throws(() => replaceDocument(root, item, "Beta.\n"), {
    code: "PREIMAGE_CHANGED",
  });
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Concurrent.\n");
  assert.ok(!readdirSync(root).some((p) => p.endsWith(".tmp")));
});
test("per-file replacement completes intact and removes its owned temporary file", (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" }),
    item = readDocument(root, "a.md");
  replaceDocument(root, item, "Beta.\n");
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Beta.\n");
  assert.ok(!readdirSync(root).some((p) => p.endsWith(".tmp")));
});
test("a later filesystem interruption reports the completed prefix and preserves remaining preimages", async (t) => {
  const root = consumer(t, {
    "a.md": "Alpha. Beta.\n",
    "b.md": "Gamma. Delta.\n",
    "c.md": "Epsilon. Zeta.\n",
    "sentinel.txt": "retained",
  });
  const rename = fs.renameSync;
  let calls = 0;
  t.mock.method(fs, "renameSync", (from, to) => {
    calls++;
    if (to === join(root, "b.md"))
      throw Object.assign(new Error("sensitive " + root), { code: "EIO" });
    return rename(from, to);
  });
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 2);
  assert.equal(calls, 2);
  assert.deepEqual(result.written, ["a.md"]);
  assert.deepEqual(result.unprocessed, ["b.md", "c.md"]);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Alpha.\nBeta.\n");
  assert.equal(readFileSync(join(root, "b.md"), "utf8"), "Gamma. Delta.\n");
  assert.equal(readFileSync(join(root, "c.md"), "utf8"), "Epsilon. Zeta.\n");
  assert.equal(readFileSync(join(root, "sentinel.txt"), "utf8"), "retained");
  assert.ok(!JSON.stringify(result).includes(root));
  assert.ok(!readdirSync(root).some((p) => p.endsWith(".tmp")));
});
