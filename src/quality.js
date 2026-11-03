// SPDX-License-Identifier: AGPL-3.0-only
// Public SDK root. Implementation modules are private package members.
import { analyzeOperation } from "./operation.js";
export { compareCheckReports } from "./report-comparison.js";
export { validateQualityResult } from "./result-validation.js";
export { executeQualityRequest } from "./execution.js";
export { readExecutionProfile } from "./execution-profile.js";
export { stageCandidateData } from "./candidate-staging.js";
export { qualifyGitMarkdown } from "./qualification.js";

/** Run checking, inspection, or guarded formatting. Resource ceilings resolve from
 * package defaults, configuration, the execution profile and then invocation options;
 * `resourceLimitMode: "unlimited"` removes every package ceiling.
 */
export function runQuality(options = {}) {
  return analyzeOperation(options);
}

/** Inspect selection and effective policy; no content verdict is produced. */
export function inspectSelection(options = {}) {
  return analyzeOperation({ ...options, mode: "inspect" });
}

/** Process bounded supplied bytes at their final logical path without checkout writes.
 * A logical document is the authoritative content for that path; excluded bytes are
 * returned exactly and relative links resolve against the real consumer root.
 */
export function processLogicalDocument(options = {}) {
  const { content, path, requestId = null, ...rest } = options ?? {};
  return analyzeOperation(
    { ...rest, mode: rest.mode ?? "format" },
    { content, path, requestId },
  );
}
