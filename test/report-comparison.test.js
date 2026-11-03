// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { consumer } from "./helpers.js";
import { compareCheckReports } from "../src/report-comparison.js";
import { executeQualityRequest, runQuality } from "../src/quality.js";
import { metadata } from "../src/contracts.js";
const currentSchema = JSON.parse(
  readFileSync(new URL("../schemas/result.schema.json", import.meta.url)),
);
const comparisonSchema = JSON.parse(
  readFileSync(new URL("../schemas/comparison.schema.json", import.meta.url)),
);
// Historical schema 1-3 reports are caller-supplied evidence with their own
// schemas; this minimal schema admits the historical schema-3 report shape.
const historicalFields = [
  "schemaVersion",
  "operation",
  "configDigest",
  "selection",
  "diagnostics",
  "outcome",
  "exitCode",
  "written",
  "unchanged",
  "unprocessed",
  "errors",
];
const schema = {
  type: "object",
  required: historicalFields,
  properties: Object.fromEntries(historicalFields.map((key) => [key, {}])),
};
/** A historical schema-3 report shape; the comparator still reads these fields. */
function createResult(mode = "check", explicit = false) {
  return {
    schemaVersion: 3,
    package: { name: metadata.name, version: metadata.version },
    preset: "authored-gfm@1",
    tools: {},
    operation: mode,
    configDigest: null,
    configuration: null,
    policy: null,
    strict: false,
    document: null,
    selection: {
      mode: explicit ? "explicit" : "full",
      files: [],
      exclusions: [],
      inventory: [],
    },
    diagnostics: [],
    outcome: "error",
    exitCode: 2,
    written: [],
    unchanged: [],
    unprocessed: [],
    errors: [],
  };
}
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
    new URL("../scripts/compare-check-reports.js", import.meta.url),
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
    [script, "--no-input-size-limit", ...paths],
    { encoding: "utf8", timeout: 30000 },
  );
  assert.equal(unlimited.status, 0, unlimited.stderr);
  assert.deepEqual(JSON.parse(unlimited.stdout).added, []);
});
test("comparison and comparison schema accept reports beyond default diagnostic and source byte ceilings", () => {
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
  const comparison = compareCheckReports({
    incumbent: original,
    candidate,
    incumbentSchema: schema,
    candidateSchema: schema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.equal(comparison.added.length, 10001);
  const validate = new Ajv({ strict: true }).compile(comparisonSchema);
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
  const comparison = compareCheckReports({
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
  assert.equal(comparison.schemaVersion, 3);
  assert.equal(comparison.incumbent.configurationBytesSha256, null);
  assert.equal(comparison.incumbent.effectiveConfigurationSha256, null);
  assert.match(comparison.incumbent.selectionSha256, /^[a-f0-9]{64}$/u);
  assert.match(comparison.incumbent.inputManifestSha256, /^[a-f0-9]{64}$/u);
  const validate = new Ajv({ strict: true }).compile(comparisonSchema);
  assert.ok(validate(comparison), JSON.stringify(validate.errors));
  assert.deepEqual(original.diagnostics, []);
  assert.throws(
    () =>
      compareCheckReports({
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
      compareCheckReports({
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
    compareCheckReports({
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
  assert.deepEqual(result.formattingDriftPaths, {
    incumbent: [],
    candidate: ["a.md"],
  });
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
  assert.throws(
    () =>
      compareCheckReports({
        incumbent: original,
        candidate: { ...candidate, schemaVersion: 5 },
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
  const duplicateResult = compareCheckReports({
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
  const reorderedResult = compareCheckReports({
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

test("schema-4 complete check reports compare with current provenance identities", async (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" });
  const incumbent = await executeQualityRequest({ mode: "check", root });
  assert.equal(incumbent.schemaVersion, 4);
  assert.equal(incumbent.operationStatus, "completed");
  assert.equal(incumbent.qualityBasis, "input");
  const candidate = structuredClone(incumbent);
  candidate.diagnostics.push({
    path: "a.md",
    source: "quality",
    rule: "quality/non-nfc-prose",
    line: 1,
    column: 1,
    message: "Prose observation.",
    severity: "info",
  });
  candidate.qualityStatus = "findings";
  const bytes = readFileSync(join(root, "a.md"));
  const inputs = [
    {
      path: "a.md",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  ];
  const comparison = compareCheckReports({
    incumbent,
    candidate,
    incumbentSchema: currentSchema,
    candidateSchema: currentSchema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  });
  assert.equal(comparison.schemaVersion, 3);
  assert.equal(comparison.incumbent.reportSchemaVersion, 4);
  assert.equal(
    comparison.incumbent.configurationBytesSha256,
    incumbent.configurationBytesSha256,
  );
  assert.equal(
    comparison.incumbent.effectiveConfigurationSha256,
    incumbent.effectiveConfigurationSha256,
  );
  assert.match(
    comparison.candidate.effectiveConfigurationSha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.equal(
    comparison.incumbent.selectionSha256,
    comparison.candidate.selectionSha256,
  );
  assert.equal(comparison.added.length, 1);
  assert.deepEqual(comparison.formattingDriftPaths, {
    incumbent: [],
    candidate: [],
  });
  const validate = new Ajv({ strict: true }).compile(comparisonSchema);
  assert.ok(validate(comparison), JSON.stringify(validate.errors));
  const repair = await runQuality({ mode: "format", root });
  assert.equal(repair.schemaVersion, 4);
  assert.equal(repair.operation, "format");
  assert.throws(
    () =>
      compareCheckReports({
        incumbent,
        candidate: repair,
        incumbentSchema: currentSchema,
        candidateSchema: currentSchema,
        incumbentInputs: inputs,
        candidateInputs: inputs,
      }),
    /complete read-only/u,
  );
});
