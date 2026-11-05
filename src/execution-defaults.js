// SPDX-License-Identifier: AGPL-3.0-only
// Pure defaults shared with pre-admission CLI failure delivery. No operational
// imports: discovery and metadata failures must not depend on installed policy.
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
