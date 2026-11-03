// SPDX-License-Identifier: AGPL-3.0-only
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Frozen oracles record schema-2 limit spellings. Translate only declared names;
// values, populations and null bypass semantics are unchanged.
const renamedLimits = {
  fileBytes: "maxDocumentBytes",
  totalBytes: "maxTotalDocumentBytes",
  files: "maxPathsPerSelectionStage",
  entries: "maxEnumeratedEntries",
  configBytes: "maxConfigurationBytes",
  nativeMs: "nativeInvocationTimeoutMs",
  nativeOutputBytes: "maxNativeOutputBytes",
  diagnostics: "maxTotalDiagnostics",
  documentDiagnostics: "maxDocumentDiagnostics",
  diagnosticBytes: "maxDiagnosticJsonBytes",
  selectionBytes: "maxInventoryBytes",
  analysisMs: "documentAnalysisTimeoutMs",
  workerHeapMb: "maxWorkerOldGenerationMiB",
  workerStackMb: "workerStackMiB",
  stagingMs: "nativeStagingAccessTimeoutMs",
  stagingOutputBytes: "maxNativeStagingCommandOutputBytes",
  patterns: "maxPatternsPerList",
  patternLength: "maxPatternCodePoints",
  lintRules: "maxRuleOverrideCount",
};

// Invoke the installed public API so the maintainer can select its resource
// budget without adding configuration files to the immutable consumer corpus.
const [cli, root, limits, gitExecutablePath, config] = process.argv.slice(2);
const require = createRequire(pathToFileURL(cli));
const { runQuality } = await import(
  pathToFileURL(require.resolve("@hadden-industries/markdown-quality"))
);
const analyzerLimits = Object.fromEntries(
  Object.entries(JSON.parse(limits)).map(([key, value]) => [
    renamedLimits[key] ?? key,
    value,
  ]),
);
const result = await runQuality({
  root,
  mode: "check",
  analyzerLimits,
  config,
  gitExecutablePath,
});
process.stdout.write(JSON.stringify(result) + "\n");
process.exitCode = result.exitCode;
