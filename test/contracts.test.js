// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { runQuality } from "../src/quality.js";
import { loadConfiguration, safePath } from "../src/configuration.js";
import { readDocument } from "../src/documents.js";
import { terminalText } from "../src/contracts.js";
import { validateDiagnostics } from "../src/native-tool.js";
import { consumer } from "./helpers.js";
const schema = JSON.parse(
  readFileSync(
    new URL("../schemas/result.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ strict: true }).compile(schema);
test("explicit empty selection is clean, bounded and schema-valid", async (t) => {
  const root = consumer(t, { "a.md": "Alpha. Beta.\n" });
  const result = await runQuality({ root, files: [] });
  assert.equal(result.exitCode, 0);
  assert.equal(result.selection.mode, "explicit");
  assert.deepEqual(result.selection.files, []);
  assert.ok(validate(result), JSON.stringify(validate.errors));
});
test("configuration rejects executable extensions, unknown versions and rules", (t) => {
  for (const extra of [
    { plugins: ["evil"] },
    { schemaVersion: 1 },
    { lint: { "markdown/unknown": "off" } },
    { include: ["../**"] },
  ]) {
    const root = consumer(t, {}, extra);
    assert.throws(() => loadConfiguration({ root }));
  }
});
test("native success with diagnostics remains findings, unknown reports fail", () => {
  const report = {
    would_reformat: false,
    diagnostics: [{ kind: "fused", line: 1, excerpt: "Alpha. Beta." }],
  };
  assert.equal(
    validateDiagnostics(
      { status: 0, stdout: Buffer.from(JSON.stringify([report])) },
      "Alpha. Beta.\n",
    ).length,
    1,
  );
  for (const value of [
    { ...report, diagnostics: [{ kind: "unexpected", line: 1, excerpt: "" }] },
    { ...report, diagnostics: [{ kind: "wrap", line: 99, excerpt: "" }] },
    {},
  ])
    assert.throws(() =>
      validateDiagnostics(
        { status: 0, stdout: Buffer.from(JSON.stringify([value])) },
        "Alpha.\n",
      ),
    );
  assert.throws(() =>
    validateDiagnostics(
      { status: 0, stdout: Buffer.from("[broken") },
      "Alpha.\n",
    ),
  );
});
test("UTF-8 failure is operational, full check preserves original bytes", async (t) => {
  const root = consumer(t, { "bad.md": Buffer.from([0xff, 0xfe]) });
  const before = readFileSync(join(root, "bad.md"));
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 2);
  assert.equal(result.errors[0].code, "INVALID_UTF8");
  assert.deepEqual(readFileSync(join(root, "bad.md")), before);
});
test("tiny input preimages retain only their actual bytes", (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" });
  const buffers = Array.from(
    { length: 32 },
    () => readDocument(root, "a.md").bytes,
  );
  assert.equal(
    buffers.reduce((sum, bytes) => sum + bytes.buffer.byteLength, 0),
    32 * 7,
  );
  for (const bytes of buffers) assert.equal(bytes.toString(), "Alpha.\n");
});
test("root-as-file and directory-as-file errors do not disclose absolute paths", async (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" });
  assert.throws(() => safePath(root, ".", { file: true }), {
    code: "INVALID_FILE",
  });
  for (const options of [
    { root: join(root, "a.md") },
    { root, files: ["missing/child.md"] },
  ]) {
    const result = await runQuality(options);
    assert.equal(result.exitCode, 2);
    assert.ok(!JSON.stringify(result).includes(root));
    assert.ok(validate(result), JSON.stringify(validate.errors));
  }
});
test("text output escapes controls and bidi characters while ordinary Unicode remains readable", () => {
  assert.equal(
    terminalText("é\u001b[2J\n\u202eX\u009b"),
    "é\\u001b[2J\\u000a\\u202eX\\u009b",
  );
});
