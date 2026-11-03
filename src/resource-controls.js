// SPDX-License-Identifier: AGPL-3.0-only
// Resource-control authority. Every package-imposed resource ceiling is listed here
// with its owner and disable semantics; a new ceiling needs an entry, a public
// override, an unlimited-mode projection and coverage before it can ship.
import { defaultAnalyzerLimits } from "./analyzer-limits.js";
import { fail } from "./contracts.js";

/** Configured execution ceilings outside the analyzer vocabulary. Null disables one. */
export const defaultExecutionLimits = Object.freeze({
  executionTimeoutMs: 180_000,
  maxOutputBytes: 8_388_608,
  maxRequestBytes: 8_388_608,
  maxNodeOldGenerationMiB: 256,
  maxProfileBytes: 65_536,
  maxRuntimeDeclarationBytes: 65_536,
  gitTimeoutMs: 10_000,
  runtimeProbeTimeoutMs: 10_000,
  maxRuntimeProbeOutputBytes: 4_096,
  maxQualificationSamples: 100,
  maxEvidenceInputBytes: 67_108_864,
  maxUnboundEvidenceSamples: 1_000,
  maxMemoParseBytes: 4_194_304,
  maxMemoLayoutBytes: 4_194_304,
  maxMemoEntriesPerStage: 4,
  cleanupTimeoutMs: 5_000,
  maxComparisonInputBytes: 8_388_608,
});

/** Ceilings whose configured default follows another effective ceiling. */
export const derivedExecutionLimits = Object.freeze({
  maxGitInventoryOutputBytes: (limits) =>
    limits.analyzerLimits.maxInventoryBytes,
  maxGitTreeOutputBytes: (limits) =>
    limits.executionLimits.maxStagedEntries === null
      ? null
      : checkedProduct(limits.executionLimits.maxStagedEntries, 1024),
});

/** Trusted qualification declares these; ordinary operations have no package default. */
export const qualificationLimitKeys = Object.freeze([
  "sampleTimeoutMs",
  "maxObservedMemoryBytes",
  "maxStagedDataBytes",
  "maxStagedEntries",
]);

export const analyzerLimitKeys = Object.freeze(
  Object.keys(defaultAnalyzerLimits),
);
export const executionLimitKeys = Object.freeze([
  ...Object.keys(defaultExecutionLimits),
  ...Object.keys(derivedExecutionLimits),
  ...qualificationLimitKeys,
]);

// Remaining fixed constants are not resource ceilings and never refuse work:
// - Work units: 65,536-byte read chunks; 32-document and 4 MiB analysis and prose
//   recheck batches (native-protocol nativeGroupCapacity, prose-diagnostics) flush
//   early rather than reject; normalization scans character references in 40-unit
//   windows.
// - Correctness or protocol: native report reservation estimates checked against
//   maxNativeOutputBytes; Snapper's long_threshold, which disables its unrelated
//   length advisory; CommonMark character-reference digit and name lengths.
// - Representation bounds: timers clamp to Node's 2,147,483,647 ms maximum and
//   re-arm; diagnostic messages quote at most 200 or 300 characters of input.

/** Disclosed with every resolved policy; package modes cannot remove these. */
export const externalResourceConstraints =
  "Unlimited means no package-imposed ceilings. Node/V8 heap and stack defaults, JavaScript string and buffer representation limits, operating-system and filesystem constraints, and hosted-provider job or artifact limits still apply; a library cannot change its host process's startup heap.";

function checkedProduct(left, right) {
  const product = left * right;
  if (!Number.isSafeInteger(product))
    fail(
      "INVALID_RESOURCE_POLICY",
      "A derived resource ceiling exceeds the safe integer range.",
    );
  return product;
}

const ceiling = (value) =>
  value === null || (Number.isSafeInteger(value) && value >= 1);

/** Validate one sparse layer; unknown keys were already rejected by its schema. */
function admitLayer(layer) {
  const mode = layer.resourceLimitMode;
  if (mode !== undefined && !["configured", "unlimited"].includes(mode))
    fail(
      "INVALID_RESOURCE_POLICY",
      "resourceLimitMode must be configured or unlimited.",
    );
  const analyzer =
    layer.analyzerLimits === false
      ? Object.fromEntries(analyzerLimitKeys.map((key) => [key, null]))
      : (layer.analyzerLimits ?? {});
  for (const [scope, values, keys] of [
    ["analyzerLimits", analyzer, analyzerLimitKeys],
    ["execution", layer.executionLimits ?? {}, executionLimitKeys],
  ])
    for (const [key, value] of Object.entries(values)) {
      if (!keys.includes(key))
        fail(
          "INVALID_RESOURCE_POLICY",
          `Unknown ${scope} resource ceiling: ${key}.`,
        );
      if (!ceiling(value))
        fail(
          "INVALID_RESOURCE_POLICY",
          `Resource ceiling ${key} must be a positive safe integer or null.`,
        );
      if (mode === "unlimited" && value !== null)
        fail(
          "INVALID_RESOURCE_POLICY",
          `Unlimited mode contradicts the finite ${key} in the same ${layer.origin} layer.`,
        );
    }
  return {
    origin: layer.origin,
    mode,
    analyzer,
    execution: layer.executionLimits ?? {},
  };
}

/** Resolve package defaults, then configuration, execution profile and invocation layers.
 * The highest layer that names resourceLimitMode selects it; unlimited projects every
 * package ceiling to null and higher layers may then set individual values again.
 * The result is an owned snapshot; no consumer rereads lower-precedence settings.
 */
export function resolveResourcePolicy(layers) {
  const admitted = layers.filter(Boolean).map(admitLayer);
  let modeIndex = -1;
  for (const [index, layer] of admitted.entries())
    if (layer.mode !== undefined) modeIndex = index;
  const resourceLimitMode =
    modeIndex < 0 ? "configured" : admitted[modeIndex].mode;
  const analyzerLimits = {},
    executionLimits = {},
    origins = {};
  const unlimited =
    resourceLimitMode === "unlimited"
      ? `unlimited:${admitted[modeIndex].origin}`
      : undefined;
  for (const key of analyzerLimitKeys) {
    analyzerLimits[key] = unlimited ? null : defaultAnalyzerLimits[key];
    origins[`analyzerLimits.${key}`] = unlimited ?? "package-default";
  }
  for (const key of executionLimitKeys) {
    const configured = Object.hasOwn(defaultExecutionLimits, key)
      ? defaultExecutionLimits[key]
      : null;
    executionLimits[key] = unlimited ? null : configured;
    origins[key] =
      unlimited ??
      (Object.hasOwn(defaultExecutionLimits, key)
        ? "package-default"
        : Object.hasOwn(derivedExecutionLimits, key)
          ? "derived"
          : "undeclared");
  }
  for (const [index, layer] of admitted.entries()) {
    if (unlimited && index < modeIndex) continue;
    for (const [key, value] of Object.entries(layer.analyzer)) {
      analyzerLimits[key] = value;
      origins[`analyzerLimits.${key}`] = layer.origin;
    }
    for (const [key, value] of Object.entries(layer.execution)) {
      executionLimits[key] = value;
      origins[key] = layer.origin;
    }
  }
  const resolved = { analyzerLimits, executionLimits };
  for (const [key, derive] of Object.entries(derivedExecutionLimits))
    if (origins[key] === "derived") executionLimits[key] = derive(resolved);
  return {
    resourceLimitMode,
    resourceLimitModeOrigin:
      modeIndex < 0 ? "package-default" : admitted[modeIndex].origin,
    analyzerLimits,
    executionLimits,
    origins,
    externalConstraints: externalResourceConstraints,
  };
}

/** The ceiling that governs reading an input before that input can declare policy.
 * Layers are ordered lowest precedence first and were supplied out of band; a file
 * can never authorize reading itself beyond this value.
 */
export function bootstrapCeiling(key, layers) {
  const scope = analyzerLimitKeys.includes(key)
    ? "analyzerLimits"
    : "executionLimits";
  let modeSettled = false;
  for (const layer of [...layers].filter(Boolean).reverse()) {
    const admitted = admitLayer(layer);
    const value = (
      scope === "analyzerLimits" ? admitted.analyzer : admitted.execution
    )[key];
    if (value !== undefined) return value;
    if (!modeSettled && admitted.mode !== undefined) {
      if (admitted.mode === "unlimited") return null;
      modeSettled = true;
    }
  }
  return scope === "analyzerLimits"
    ? defaultAnalyzerLimits[key]
    : (defaultExecutionLimits[key] ?? null);
}
