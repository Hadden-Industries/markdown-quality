// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { consumer } from "./helpers.js";
import { compareQualityReports } from "../src/migration.js";
import { createResult } from "../src/quality.js";
const schema = JSON.parse(
  readFileSync(new URL("../schemas/result.schema.json", import.meta.url)),
);
test("comparison CLI exposes a bypass for its input-file byte ceiling", (t) => {
  const original = createResult("check", true);
  Object.assign(original, { outcome: "clean", exitCode: 0 });
  const root = consumer(t, {
    "old.json": JSON.stringify(original) + " ".repeat(8 * 1024 * 1024),
    "new.json": JSON.stringify(original),
    "schema.json": JSON.stringify(schema),
    "inputs.json": "[]",
  });
  const script = fileURLToPath(
    new URL("../scripts/compare-quality-reports.js", import.meta.url),
  );
  const paths = [
    "old.json",
    "new.json",
    "schema.json",
    "schema.json",
    "inputs.json",
    "inputs.json",
  ].map((path) => join(root, path));
  const bounded = spawnSync(process.execPath, [script, ...paths], {
    encoding: "utf8",
    timeout: 30000,
  });
  assert.notEqual(bounded.status, 0);
  assert.match(bounded.stderr, /bounded regular JSON file/u);
  const unlimited = spawnSync(
    process.execPath,
    [script, "--no-limits", ...paths],
    { encoding: "utf8", timeout: 30000 },
  );
  assert.equal(unlimited.status, 0, unlimited.stderr);
  assert.deepEqual(JSON.parse(unlimited.stdout).added, []);
});
test("comparison and migration schema accept reports beyond default diagnostic and source byte ceilings", () => {
  const original = createResult("check", true);
  original.selection.files = ["a.md"];
  original.unchanged = ["a.md"];
  original.outcome = "clean";
  original.exitCode = 0;
  const candidate = structuredClone(original);
  candidate.outcome = "findings";
  candidate.diagnostics = Array.from({ length: 10001 }, (_, index) => ({
    path: "a.md",
    source: "quality",
    rule: "quality/long-prose-line",
    line: index + 1,
    column: 121,
    message: "Long prose.",
    severity: "info",
  }));
  const inputs = [{ path: "a.md", bytes: 3000000, sha256: "a".repeat(64) }];
  const comparison = compareQualityReports({
    incumbent: original,
    candidate,
    incumbentSchema: schema,
    candidateSchema: schema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.equal(comparison.added.length, 10001);
  const validate = new Ajv({ strict: true }).compile(
    JSON.parse(
      readFileSync(
        new URL("../schemas/migration.schema.json", import.meta.url),
      ),
    ),
  );
  assert.ok(validate(comparison), JSON.stringify(validate.errors));
});
test("read-only report comparison requires identical captured source identities", () => {
  const original = createResult("check", true);
  original.selection.files = ["a.md"];
  original.unchanged = ["a.md"];
  original.outcome = "clean";
  original.exitCode = 0;
  const candidate = structuredClone(original);
  candidate.diagnostics.push({
    path: "a.md",
    source: "quality",
    rule: "quality/non-nfc-prose",
    line: 3,
    column: 1,
    message: "Prose observation.",
    severity: "info",
  });
  candidate.outcome = "findings";
  const inputs = [{ path: "a.md", bytes: 10, sha256: "a".repeat(64) }];
  const comparison = compareQualityReports({
    incumbent: original,
    candidate,
    incumbentSchema: schema,
    candidateSchema: schema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.equal(comparison.added.length, 1);
  assert.equal(comparison.resolved.length, 0);
  assert.equal(comparison.candidate.exitCode, 0);
  const migrationSchema = JSON.parse(
    readFileSync(new URL("../schemas/migration.schema.json", import.meta.url)),
  );
  const validate = new Ajv({ strict: true }).compile(migrationSchema);
  assert.ok(validate(comparison), JSON.stringify(validate.errors));
  assert.deepEqual(original.diagnostics, []);
  assert.throws(
    () =>
      compareQualityReports({
        incumbent: original,
        candidate,
        incumbentSchema: schema,
        candidateSchema: schema,
        incumbentInputs: inputs,
        candidateInputs: [{ ...inputs[0], sha256: "b".repeat(64) }],
      }),
    /identical/u,
  );
  assert.throws(
    () =>
      compareQualityReports({
        incumbent: original,
        candidate: { ...candidate, schemaVersion: 88 },
        incumbentSchema: schema,
        candidateSchema: schema,
        incumbentInputs: inputs,
        candidateInputs: inputs,
      }),
    /schema/u,
  );
});

test("comparison preserves policy and distinguishes rewording from changed findings", () => {
  const original = createResult("check", true);
  Object.assign(original, { outcome: "findings", exitCode: 1 });
  original.selection.files = ["a.md"];
  original.unprocessed = ["a.md"];
  original.policy = {
    dialect: "gfm",
    frontmatter: "yaml",
    lint: {},
    formatter: { endOfLine: "preserve" },
    sentence: { format: "markdown", max_width: 0, clause_breaks: false },
  };
  original.diagnostics = [
    {
      path: "a.md",
      source: "quality",
      rule: "trailing-whitespace",
      line: 1,
      column: 2,
      severity: "error",
      message: "Old wording.",
    },
  ];
  const candidate = structuredClone(original);
  candidate.policy.formatter.endOfLine = "lf";
  candidate.diagnostics[0].message = "New wording.";
  candidate.diagnostics.push({
    ...candidate.diagnostics[0],
    source: "formatter",
    rule: "layout",
    message: "Would format.",
  });
  const inputs = [{ path: "a.md", bytes: 10, sha256: "a".repeat(64) }];
  const compare = (report = candidate) =>
    compareQualityReports({
      incumbent: original,
      candidate: report,
      incumbentSchema: schema,
      candidateSchema: schema,
      incumbentInputs: inputs,
      candidateInputs: inputs,
    });
  const result = compare();
  assert.deepEqual(result.incumbent.policy, original.policy);
  assert.deepEqual(result.candidate.policy, candidate.policy);
  assert.equal(result.retained.length, 1);
  assert.equal(result.added.length, 1);
  assert.equal(result.resolved.length, 0);
  assert.deepEqual(result.messageChanges, [
    { before: original.diagnostics[0], after: candidate.diagnostics[0] },
  ]);
  assert.deepEqual(result.wouldFormat, { incumbent: [], candidate: ["a.md"] });
  for (const invalid of [
    { ...candidate, outcome: "error" },
    {
      ...candidate,
      errors: [{ code: "READ", message: "Incomplete operation." }],
    },
    { ...candidate, unprocessed: [], unchanged: [] },
    { ...candidate, unprocessed: [], unchanged: ["a.md"] },
    { ...candidate, exitCode: 0, unprocessed: [], unchanged: ["a.md"] },
  ])
    assert.throws(() => compare(invalid), /complete read-only/u);
  assert.throws(
    () =>
      compare({
        ...candidate,
        diagnostics: [{ ...candidate.diagnostics[0], path: "b.md" }],
      }),
    /selected scope/u,
  );
  const futureSchema = structuredClone(schema);
  futureSchema.properties.schemaVersion.const = 3;
  assert.throws(
    () =>
      compareQualityReports({
        incumbent: original,
        candidate: { ...candidate, schemaVersion: 3 },
        incumbentSchema: schema,
        candidateSchema: futureSchema,
        incumbentInputs: inputs,
        candidateInputs: inputs,
      }),
    /unsupported report schema/u,
  );
  const duplicates = structuredClone(candidate);
  duplicates.diagnostics = [
    candidate.diagnostics[0],
    { ...candidate.diagnostics[0], message: "Different wording." },
  ];
  const duplicateBefore = structuredClone(duplicates);
  duplicateBefore.diagnostics.push({
    ...candidate.diagnostics[0],
    message: "Dropped wording.",
  });
  const duplicateResult = compareQualityReports({
    incumbent: duplicateBefore,
    candidate: duplicates,
    incumbentSchema: schema,
    candidateSchema: schema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.equal(duplicateResult.retained.length, 2);
  assert.deepEqual(duplicateResult.messageChanges, []);
  assert.deepEqual(
    duplicateResult.resolved.map((d) => d.message),
    ["Dropped wording."],
  );
  const reordered = structuredClone(duplicates);
  reordered.diagnostics = [
    { ...duplicates.diagnostics[0], message: "Changed wording." },
    duplicates.diagnostics[0],
  ];
  const reorderedResult = compareQualityReports({
    incumbent: duplicates,
    candidate: reordered,
    incumbentSchema: schema,
    candidateSchema: schema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.deepEqual(
    reorderedResult.messageChanges.map(({ before, after }) => [
      before.message,
      after.message,
    ]),
    [["Different wording.", "Changed wording."]],
  );
});
