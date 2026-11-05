// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { defaultAnalyzerLimits } from "../src/analyzer-limits.js";
import {
  checkGeneratedSchemas,
  schemaProjections,
} from "../scripts/generate-schemas.js";
import { consumer } from "./helpers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
// These accepted names/defaults are independent expectations, not projected from the generator.
const expectedLimits = {
  maxDocumentBytes: 2097152,
  maxTotalDocumentBytes: 33554432,
  maxPathsPerSelectionStage: 10000,
  maxEnumeratedEntries: 100000,
  maxConfigurationBytes: 262144,
  nativeInvocationTimeoutMs: 15000,
  maxNativeOutputBytes: 8388608,
  maxTotalDiagnostics: 10000,
  maxDocumentDiagnostics: 1000,
  maxDiagnosticJsonBytes: 4194304,
  maxInventoryBytes: 4194304,
  documentAnalysisTimeoutMs: 30000,
  maxWorkerOldGenerationMiB: 128,
  workerStackMiB: 4,
  nativeStagingAccessTimeoutMs: 1000,
  maxNativeStagingCommandOutputBytes: 65536,
  maxPatternsPerList: 100,
  maxPatternCodePoints: 512,
  maxRuleOverrideCount: 60,
  maxReadDependencyDocuments: 10000,
};
// Independently maintained execution ceiling names accepted by profile schema 2.
const expectedExecutionCeilings = [
  "executionTimeoutMs",
  "maxOutputBytes",
  "maxRequestBytes",
  "maxNodeOldGenerationMiB",
  "maxProfileBytes",
  "maxRuntimeDeclarationBytes",
  "gitTimeoutMs",
  "runtimeProbeTimeoutMs",
  "maxRuntimeProbeOutputBytes",
  "maxQualificationSamples",
  "maxEvidenceInputBytes",
  "maxUnboundEvidenceSamples",
  "maxMemoParseBytes",
  "maxMemoLayoutBytes",
  "maxMemoEntriesPerStage",
  "cleanupTimeoutMs",
  "maxComparisonInputBytes",
  "maxGitInventoryOutputBytes",
  "maxGitTreeOutputBytes",
  "sampleTimeoutMs",
  "maxObservedMemoryBytes",
  "maxStagedDataBytes",
  "maxStagedEntries",
];
const ceilingValues = [
  1,
  Number.MAX_SAFE_INTEGER,
  null,
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  "1",
];
const nullableAccepted = (value) =>
  value === null || value === 1 || value === Number.MAX_SAFE_INTEGER;

test("standalone shipped schemas preserve nullable analyzer and execution ceiling contracts", () => {
  assert.deepEqual(defaultAnalyzerLimits, expectedLimits);
  const schemas = {};
  for (const name of [
    "configuration",
    "effective-configuration",
    "result",
    "execution",
  ]) {
    schemas[name] = JSON.parse(
      readFileSync(join(root, "schemas", `${name}.schema.json`)),
    );
    // A consumer compiles each export alone, with no sibling schema registry.
    new Ajv({ strict: true }).compile(schemas[name]);
  }
  const config = new Ajv({ strict: true }).compile(schemas.configuration);
  const resultLimits = new Ajv({ strict: true }).compile(
    schemas.result.properties.policy.properties.analyzerLimits,
  );
  const execution = new Ajv({ strict: true }).compile(schemas.execution);
  const profileLimits = new Ajv({ strict: true }).compile(
    schemas.execution.properties.analyzerLimits,
  );
  // Sparse input: every key is optional, including the whole file contents.
  assert.equal(config({}), true);
  assert.equal(config({ analyzerLimits: false }), true);
  assert.equal(config({ analyzerLimits: {} }), true);
  assert.equal(config({ analyzerLimits: true }), false);
  assert.equal(execution({}), true);
  assert.equal(execution({ analyzerLimits: false }), true);
  assert.equal(profileLimits(false), true);
  // Resolved policy is complete and never the sparse disable switch.
  assert.equal(resultLimits(false), false);
  assert.equal(resultLimits(expectedLimits), true);
  assert.equal(
    resultLimits(
      Object.fromEntries(Object.keys(expectedLimits).map((key) => [key, null])),
    ),
    true,
  );
  for (const key of Object.keys(expectedLimits)) {
    const { [key]: _omitted, ...incomplete } = expectedLimits;
    assert.equal(resultLimits(incomplete), false, key);
    for (const value of ceilingValues) {
      const accepted = nullableAccepted(value);
      assert.equal(
        config({ analyzerLimits: { [key]: value } }),
        accepted,
        `${key}:${value}`,
      );
      assert.equal(
        resultLimits({ ...expectedLimits, [key]: value }),
        accepted,
        `${key}:${value}`,
      );
      assert.equal(
        profileLimits({ [key]: value }),
        accepted,
        `${key}:${value}`,
      );
    }
  }
  for (const key of expectedExecutionCeilings)
    for (const value of ceilingValues)
      assert.equal(
        execution({ [key]: value }),
        nullableAccepted(value),
        `${key}:${value}`,
      );
  assert.equal(config({ analyzerLimits: { unknown: 1 } }), false);
  assert.equal(profileLimits({ unknown: 1 }), false);
  assert.equal(execution({ unknownCeiling: 1 }), false);
  assert.equal(config({ limits: false }), false);
  assert.equal(config({ schemaVersion: 2 }), false);
  assert.equal(config({ schemaVersion: 3 }), true);
  assert.equal(execution({ schemaVersion: 1 }), false);
});

test("canonical schema changes propagate and manual generated drift is rejected", (t) => {
  checkGeneratedSchemas();
  const fixture = consumer(t);
  mkdirSync(join(fixture, "scripts"));
  cpSync(
    join(root, "scripts/schema-sources"),
    join(fixture, "scripts/schema-sources"),
    { recursive: true },
  );
  cpSync(join(root, "schemas"), join(fixture, "schemas"), { recursive: true });
  checkGeneratedSchemas(fixture);
  const projected = schemaProjections(
    fixture,
    {
      ...expectedLimits,
      syntheticLimit: 7,
    },
    [...expectedExecutionCeilings, "syntheticCeiling"],
  );
  const ceiling = {
    type: ["integer", "null"],
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  };
  for (const shape of [
    projected.configuration.properties.analyzerLimits.anyOf[1],
    projected["effective-configuration"].properties.analyzerLimits,
    projected.result.properties.policy.properties.analyzerLimits,
    projected.result.properties.configuration.anyOf[1].properties
      .analyzerLimits,
    projected.execution.properties.analyzerLimits.anyOf[1],
  ])
    assert.deepEqual(shape.properties.syntheticLimit, ceiling);
  assert.deepEqual(projected.execution.properties.syntheticCeiling, ceiling);
  assert.deepEqual(
    projected.result.properties.resourcePolicy.properties.executionLimits
      .properties.syntheticCeiling,
    ceiling,
  );
  const path = join(fixture, "schemas/execution.schema.json");
  const changed = JSON.parse(readFileSync(path));
  changed.properties.analyzerLimits.anyOf[1].properties.maxDocumentBytes.minimum = 0;
  writeFileSync(path, JSON.stringify(changed));
  assert.throws(() => checkGeneratedSchemas(fixture), /Stale generated schema/);
  // A second independently maintained limit shape is refused at the authoring seam.
  const source = join(fixture, "scripts/schema-sources/configuration.json");
  const duplicate = JSON.parse(readFileSync(source));
  duplicate.properties.analyzerLimits = { type: "object" };
  writeFileSync(source, JSON.stringify(duplicate));
  assert.throws(() => schemaProjections(fixture));
});

test("the current compatibility guide describes the actual exported schema versions", () => {
  const guide = readFileSync(
    join(root, "docs/centralized-contracts.md"),
    "utf8",
  );
  for (const [name, version] of [
    ["Configuration", 3],
    ["Result", 5],
    ["Execution", 2],
  ])
    assert.match(
      guide,
      new RegExp(`\\|\\s+${name}\\s+\\|\\s+${version}\\s+\\|`),
    );
  const support = readFileSync(
    join(root, "docs/support-and-release.md"),
    "utf8",
  );
  assert.ok(!support.includes("Configuration schema 1 remains loadable"));
  assert.ok(support.includes("centralized-contracts.md"));
});
