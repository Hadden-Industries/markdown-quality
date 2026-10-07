// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv from "ajv";
import { consumer } from "./helpers.js";
import { runQuality } from "../src/quality.js";
import { safePath } from "../src/configuration.js";
import { limits } from "../src/contracts.js";
const validate = new Ajv({ strict: true }).compile(
  JSON.parse(
    readFileSync(
      new URL("../schemas/result.schema.json", import.meta.url),
      "utf8",
    ),
  ),
);
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
test("CLI concurrency reaches real analysis and rejects counts below one before writes", (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n", "b.md": "Beta.\n" });
  const result = spawnSync(
    process.execPath,
    [cli, "check", "--root", root, "--concurrency", "2", "--json"],
    { encoding: "utf8", timeout: 30_000 },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).unchanged, ["a.md", "b.md"]);
  const invalid = spawnSync(
    process.execPath,
    [cli, "format", "--root", root, "--concurrency", "0", "--json"],
    { encoding: "utf8", timeout: 30_000 },
  );
  assert.equal(invalid.status, 2, invalid.stdout + invalid.stderr);
  const rejected = JSON.parse(invalid.stdout);
  assert.ok(validate(rejected), JSON.stringify(validate.errors));
  assert.equal(rejected.errors[0].code, "INVALID_CONCURRENCY");
  assert.deepEqual(rejected.written, []);
});
test("CLI literal and JSON selections preserve boundaries and schema on every exit", (t) => {
  const root = consumer(t, {
    "space [é].md": "Alpha.\n",
    "a.md": "Alpha. Beta.\n",
  });
  for (const [args, status] of [
    [["check", "--files-json", "[]"], 0],
    [["check", "--", "space [é].md"], 0],
    [["check", "a.md", "--"], 2],
    [["check", "--files-json", "null"], 2],
    [["changed"], 2],
    [["check", "--", "a.md"], 1],
  ]) {
    const result = spawnSync(
      process.execPath,
      [cli, args[0], "--root", root, "--json", ...args.slice(1)],
      { encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(result.status, status, result.stdout + result.stderr);
    const value = JSON.parse(result.stdout);
    assert.ok(validate(value), JSON.stringify(validate.errors));
  }
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Alpha. Beta.\n");
});
test("oversized files, outside paths and alternate streams fail before analysis or writes", async (t) => {
  const root = consumer(t, {
    "big.md": Buffer.alloc(limits.fileBytes + 1, 97),
    "a.md": "Alpha.\n",
  });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 2);
  assert.equal(result.errors[0].code, "DOCUMENT_LIMIT");
  assert.deepEqual(result.written, []);
  assert.throws(() => safePath(root, "../outside.md"));
  assert.throws(() => safePath(root, join(root, "a.md") + ":stream"));
  const inspect = await runQuality({ root, mode: "inspect", files: ["a.md"] });
  assert.ok(validate(inspect), JSON.stringify(validate.errors));
  assert.equal(inspect.configuration.layout.endOfLine, "lf");
  assert.deepEqual(inspect.unprocessed, []);
});
test(
  "Linux filenames cannot inject terminal commands into text diagnostics",
  { skip: process.platform !== "linux" },
  (t) => {
    const file = "\u001b[2J\nnotice.md";
    const root = consumer(t, { [file]: "Alpha. Beta.\n" });
    const text = spawnSync(process.execPath, [cli, "check", "--root", root], {
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(text.status, 1, text.stdout + text.stderr);
    assert.ok(!text.stdout.includes("\u001b"));
    assert.ok(text.stdout.includes("\\u001b[2J\\u000anotice.md"));
    const json = spawnSync(
      process.execPath,
      [cli, "check", "--root", root, "--json"],
      { encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(json.status, 1, json.stdout + json.stderr);
    assert.equal(JSON.parse(json.stdout).diagnostics[0].path, file);
  },
);
