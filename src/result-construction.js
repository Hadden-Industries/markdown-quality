// SPDX-License-Identifier: AGPL-3.0-only
// Private construction of provisional result records. An initial record is
// failure-shaped with no error evidence, so validation rejects it until the
// operation records either a completed outcome or an actual failure.
import { metadata } from "./contracts.js";
import { installedToolVersions } from "./tool-versions.js";
import { manifest } from "./native-tool.js";
import { presetIdentity } from "./preset.js";

export const resultSchemaVersion = 5;
export const operations = Object.freeze([
  "check",
  "format",
  "inspect",
  "normalize",
]);

/** Runtime normalization identity; NFC verdicts and repairs depend on it. */
export function runtimeIdentity() {
  return {
    node: process.versions.node,
    icu: process.versions.icu ?? null,
    unicode: process.versions.unicode ?? null,
  };
}

export function createInitialQualityResult(
  mode = "check",
  explicit = false,
  { dryRun = false, updateLinks = false } = {},
) {
  return {
    schemaVersion: resultSchemaVersion,
    package: { name: metadata.name, version: metadata.version },
    preset: presetIdentity,
    tools: installedToolVersions(manifest.snapperVersion),
    runtime: runtimeIdentity(),
    operation: operations.includes(mode) ? mode : "unknown",
    dryRun: dryRun === true,
    updateLinks: updateLinks === true,
    root: null,
    configurationOrigin: null,
    configurationBytesSha256: null,
    defaultConfigurationSha256: null,
    policyResolverInputsSha256: null,
    effectiveConfigurationSha256: null,
    configuration: null,
    policy: null,
    resourcePolicy: null,
    strict: false,
    document: null,
    selection: {
      mode: explicit ? "explicit" : "full",
      files: [],
      omissions: [],
      reconciliationDecisions: [],
      readDependencies: [],
    },
    diagnostics: [],
    operationStatus: "failed",
    qualityStatus: "not-checked",
    qualityBasis: null,
    exitCode: 2,
    documentResults: [],
    writtenPaths: [],
    proposedChanges: [],
    anchorChanges: [],
    backlinkCoverage: null,
    refusals: [],
    errors: [],
  };
}
