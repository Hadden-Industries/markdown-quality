// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAnalyzerLimits } from "../src/analyzer-limits.js";
import { executionLimitKeys } from "../src/resource-controls.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceNames = ["configuration", "result", "execution"];
const names = [
  "configuration",
  "effective-configuration",
  "result",
  "execution",
];

const ceiling = {
  type: ["integer", "null"],
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
};
const closed = (keys, value, required = true) => ({
  type: "object",
  additionalProperties: false,
  ...(required ? { required: [...keys] } : {}),
  properties: Object.fromEntries(
    keys.map((key) => [key, structuredClone(value)]),
  ),
});

/** Fill only the current contract's known projections; never resolve arbitrary references. */
export function projectSchemas(
  sources,
  analyzerCatalog = defaultAnalyzerLimits,
  executionKeys = executionLimitKeys,
) {
  const [configuration, result, execution] = sourceNames.map((name) =>
    structuredClone(sources[name]),
  );
  assert.ok(!Object.hasOwn(configuration.properties, "analyzerLimits"));
  assert.ok(!Object.hasOwn(result.properties, "configuration"));
  assert.ok(
    !Object.hasOwn(result.properties.policy.properties, "analyzerLimits"),
  );
  assert.ok(
    !Object.hasOwn(
      result.properties.resourcePolicy.properties,
      "executionLimits",
    ),
  );
  assert.ok(!Object.hasOwn(execution.properties, "analyzerLimits"));
  const analyzerKeys = Object.keys(analyzerCatalog);
  const sparseAnalyzer = {
    anyOf: [{ const: false }, closed(analyzerKeys, ceiling, false)],
  };
  configuration.properties.analyzerLimits = structuredClone(sparseAnalyzer);
  // The resolved representation requires every runtime field and never accepts
  // sparse input as resolved output.
  const effective = structuredClone(configuration);
  effective.$id = configuration.$id.replace(
    ":configuration:",
    ":effective-configuration:",
  );
  effective.required = Object.keys(effective.properties);
  for (const key of ["syntax", "links", "layout"])
    effective.properties[key].required = Object.keys(
      effective.properties[key].properties,
    );
  effective.properties.analyzerLimits = closed(analyzerKeys, ceiling);
  result.properties.configuration = {
    anyOf: [{ type: "null" }, structuredClone(effective)],
  };
  result.properties.policy.properties.analyzerLimits = closed(
    analyzerKeys,
    ceiling,
  );
  result.properties.resourcePolicy.properties.executionLimits = closed(
    executionKeys,
    ceiling,
  );
  result.properties.resourcePolicy.properties.origins = closed(
    [...analyzerKeys.map((key) => `analyzerLimits.${key}`), ...executionKeys],
    { type: "string", minLength: 1 },
  );
  execution.properties.analyzerLimits = structuredClone(sparseAnalyzer);
  for (const key of executionKeys)
    execution.properties[key] = structuredClone(ceiling);
  return {
    configuration,
    "effective-configuration": effective,
    result,
    execution,
  };
}

/** Read the fixed authoring sources, which are never needed by installed consumers. */
export function schemaProjections(
  directory = root,
  analyzerCatalog = defaultAnalyzerLimits,
  executionKeys = executionLimitKeys,
) {
  const sources = Object.fromEntries(
    sourceNames.map((name) => [
      name,
      JSON.parse(
        readFileSync(join(directory, "scripts/schema-sources", `${name}.json`)),
      ),
    ]),
  );
  return projectSchemas(sources, analyzerCatalog, executionKeys);
}

/** Structural equality permits repository formatting without accepting stale contract data. */
export function checkGeneratedSchemas(directory = root) {
  const projections = schemaProjections(directory);
  for (const name of names)
    assert.deepEqual(
      JSON.parse(
        readFileSync(join(directory, "schemas", `${name}.schema.json`)),
      ),
      projections[name],
      `Stale generated schema: ${name}`,
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  if (process.argv[2] === "--check") checkGeneratedSchemas();
  else {
    assert.equal(process.argv[2], "--write", "Use --check or --write");
    // Writing is a supported-tooling-runtime operation; product schema checks
    // and imports remain dependency-free on every public product runtime.
    const { formatJsonValue } = await import("@hadden-industries/json-quality");
    for (const [name, value] of Object.entries(schemaProjections()))
      writeFileSync(
        join(root, "schemas", `${name}.schema.json`),
        await formatJsonValue(value),
      );
  }
}
