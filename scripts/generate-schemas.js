// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzerLimits } from "../src/analyzer-limits.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = ["configuration", "result", "execution"];

/** Fill only the current contract's known projections; never resolve arbitrary references. */
export function projectSchemas(sources, catalog = analyzerLimits) {
  const [configuration, result, execution] = names.map((name) =>
    structuredClone(sources[name]),
  );
  assert.ok(!Object.hasOwn(configuration.properties, "limits"));
  assert.ok(!Object.hasOwn(result.properties, "configuration"));
  assert.ok(!Object.hasOwn(result.properties.policy.properties, "limits"));
  assert.ok(!Object.hasOwn(execution.properties.limits, "properties"));
  const limitProperties = (nullable) =>
    Object.fromEntries(
      Object.keys(catalog).map((name) => [
        name,
        {
          type: nullable ? ["integer", "null"] : "integer",
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      ]),
    );
  configuration.properties.limits = {
    anyOf: [
      { const: false },
      {
        type: "object",
        additionalProperties: false,
        properties: limitProperties(true),
      },
    ],
  };
  result.properties.policy.properties.limits = structuredClone(
    configuration.properties.limits,
  );
  result.properties.configuration = {
    anyOf: [{ type: "null" }, structuredClone(configuration)],
  };
  execution.properties.limits.properties = limitProperties(false);
  return { configuration, result, execution };
}

/** Read the fixed authoring sources, which are never needed by installed consumers. */
export function schemaProjections(directory = root, catalog = analyzerLimits) {
  const sources = Object.fromEntries(
    names.map((name) => [
      name,
      JSON.parse(
        readFileSync(join(directory, "scripts/schema-sources", `${name}.json`)),
      ),
    ]),
  );
  return projectSchemas(sources, catalog);
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
    for (const [name, value] of Object.entries(schemaProjections()))
      writeFileSync(
        join(root, "schemas", `${name}.schema.json`),
        JSON.stringify(value, null, 2) + "\n",
      );
  }
}
