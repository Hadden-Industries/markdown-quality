// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { analyzerLimits } from "../src/analyzer-limits.js";
import {
  checkGeneratedSchemas,
  schemaProjections,
} from "../scripts/generate-schemas.js";
import { consumer } from "./helpers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
// These accepted names/defaults are independent expectations, not projected from the generator.
const expectedLimits = {
  fileBytes: 2097152,
  totalBytes: 33554432,
  files: 10000,
  entries: 100000,
  configBytes: 262144,
  nativeMs: 15000,
  nativeOutputBytes: 8388608,
  diagnostics: 10000,
  documentDiagnostics: 1000,
  diagnosticBytes: 4194304,
  selectionBytes: 4194304,
  analysisMs: 30000,
  workerHeapMb: 128,
  workerStackMb: 4,
  stagingMs: 1000,
  stagingOutputBytes: 65536,
  patterns: 100,
  patternLength: 512,
  lintRules: 60,
};

test("standalone shipped schemas preserve nullable analyzer and finite execution contracts", () => {
  assert.deepEqual(analyzerLimits, expectedLimits);
  const schemas = {};
  for (const name of ["configuration", "result", "execution"]) {
    schemas[name] = JSON.parse(
      readFileSync(join(root, "schemas", `${name}.schema.json`)),
    );
    // A consumer compiles each export alone, with no sibling schema registry.
    new Ajv({ strict: true }).compile(schemas[name]);
  }
  const config = new Ajv({ strict: true }).compile(schemas.configuration);
  const resultLimits = new Ajv({ strict: true }).compile(
    schemas.result.properties.policy.properties.limits,
  );
  const finite = new Ajv({ strict: true }).compile(
    schemas.execution.properties.limits,
  );
  const base = {
    schemaVersion: 2,
    preset: "authored-gfm@1",
    include: ["*.md"],
  };
  assert.equal(config({ ...base, limits: false }), true);
  assert.equal(resultLimits(false), true);
  assert.equal(finite(false), false);
  for (const key of Object.keys(expectedLimits)) {
    for (const value of [
      1,
      Number.MAX_SAFE_INTEGER,
      null,
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
    ]) {
      const nullableAccepted =
        value === null || value === 1 || value === Number.MAX_SAFE_INTEGER;
      assert.equal(
        config({ ...base, limits: { [key]: value } }),
        nullableAccepted,
        `${key}:${value}`,
      );
      assert.equal(resultLimits({ [key]: value }), nullableAccepted);
      assert.equal(
        finite({ [key]: value }),
        value === 1 || value === Number.MAX_SAFE_INTEGER,
      );
    }
  }
  assert.equal(config({ ...base, limits: { unknown: 1 } }), false);
  assert.equal(finite({ unknown: 1 }), false);
  assert.equal(config({ ...base, schemaVersion: 1 }), false);
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
  const projected = schemaProjections(fixture, {
    ...expectedLimits,
    syntheticLimit: 7,
  });
  for (const shape of [
    projected.configuration.properties.limits.anyOf[1],
    projected.result.properties.policy.properties.limits.anyOf[1],
    projected.result.properties.configuration.anyOf[1].properties.limits
      .anyOf[1],
  ])
    assert.deepEqual(shape.properties.syntheticLimit, {
      type: ["integer", "null"],
      minimum: 1,
      maximum: Number.MAX_SAFE_INTEGER,
    });
  assert.equal(
    projected.execution.properties.limits.properties.syntheticLimit.type,
    "integer",
  );
  const path = join(fixture, "schemas/execution.schema.json");
  const changed = JSON.parse(readFileSync(path));
  changed.properties.limits.properties.fileBytes.minimum = 0;
  writeFileSync(path, JSON.stringify(changed));
  assert.throws(() => checkGeneratedSchemas(fixture), /Stale generated schema/);
  // A second independently maintained limit shape is refused at the authoring seam.
  const source = join(fixture, "scripts/schema-sources/configuration.json");
  const duplicate = JSON.parse(readFileSync(source));
  duplicate.properties.limits = { type: "object" };
  writeFileSync(source, JSON.stringify(duplicate));
  assert.throws(() => schemaProjections(fixture));
});

test("the current compatibility guide describes the actual exported schema versions", () => {
  const guide = readFileSync(
    join(root, "docs/centralized-contracts.md"),
    "utf8",
  );
  for (const [name, version] of [
    ["Configuration", 2],
    ["Result", 3],
    ["Execution", 1],
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
