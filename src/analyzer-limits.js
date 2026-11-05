// SPDX-License-Identifier: AGPL-3.0-only
/** Configured analyzer ceilings. Null overrides disable individual package ceilings.
 * Populations and units are documented in the resource-control inventory.
 */
export const defaultAnalyzerLimits = Object.freeze({
  maxDocumentBytes: 2_097_152,
  maxTotalDocumentBytes: 33_554_432,
  maxPathsPerSelectionStage: 10_000,
  maxEnumeratedEntries: 100_000,
  maxConfigurationBytes: 262_144,
  nativeInvocationTimeoutMs: 15_000,
  maxNativeOutputBytes: 8_388_608,
  maxTotalDiagnostics: 10_000,
  maxDocumentDiagnostics: 1_000,
  maxDiagnosticJsonBytes: 4_194_304,
  maxInventoryBytes: 4_194_304,
  documentAnalysisTimeoutMs: 30_000,
  maxWorkerOldGenerationMiB: 128,
  workerStackMiB: 4,
  nativeStagingAccessTimeoutMs: 1_000,
  maxNativeStagingCommandOutputBytes: 65_536,
  maxPatternsPerList: 100,
  maxPatternCodePoints: 512,
  maxRuleOverrideCount: 60,
  maxReadDependencyDocuments: 10_000,
  maxLinkDiagnosticCodePoints: 200,
  maxPathDiagnosticCodePoints: 300,
  nativeThreads: 1,
});
