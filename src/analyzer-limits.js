// SPDX-License-Identifier: AGPL-3.0-only
/** Current analyzer ceilings. Null overrides bypass individual ceilings. */
export const analyzerLimits = Object.freeze({
  fileBytes: 2_097_152,
  totalBytes: 33_554_432,
  files: 10_000,
  entries: 100_000,
  configBytes: 262_144,
  nativeMs: 15_000,
  nativeOutputBytes: 8_388_608,
  diagnostics: 10_000,
  documentDiagnostics: 1_000,
  diagnosticBytes: 4_194_304,
  selectionBytes: 4_194_304,
  analysisMs: 30_000,
  workerHeapMb: 128,
  workerStackMb: 4,
  stagingMs: 1_000,
  stagingOutputBytes: 65_536,
  patterns: 100,
  patternLength: 512,
  lintRules: 60,
});
