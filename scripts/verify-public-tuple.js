// SPDX-License-Identifier: AGPL-3.0-only
/** Invoke the existing anonymous recipient/provenance qualifier with the retained stage origins. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { readJson } from "./release-assets.js";
import { native } from "./commands.js";

assert.equal(
  process.argv.length,
  4,
  "Usage: verify-public-tuple.js ARCHIVES REPORT",
);
const [directory, output] = process.argv.slice(2);
const context = readJson(join(directory, "continuation.json"));
const map = context.origins;
assert.equal(context.schemaVersion, 2);
const args = [
  "scripts/qualify-public-registry.mjs",
  "--manifest",
  join(directory, "release-manifest.json"),
  "--provenance",
  "--publication-origins",
  join(directory, "publication-origins.json"),
  "--publication-source",
  map.controlSource,
  "--publication-run",
  map.run,
  "--publication-attempt",
  map.attempt,
  "--recovery-run",
  map.recovery.run,
  "--recovery-attempt",
  map.recovery.attempt,
  "--recovery-origins-sha256",
  map.recovery.originsSha256,
];
if (process.env.RELEASE_SECURITY_OUTPUT)
  args.push("--security-output", process.env.RELEASE_SECURITY_OUTPUT);
native(process.execPath, [...args, output], {
  env: { ...process.env, CANDIDATE_RUN: map.candidateRun },
  timeout: 1_200_000,
});
