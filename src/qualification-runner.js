// SPDX-License-Identifier: AGPL-3.0-only
// Private observer child: no candidate module is loaded.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { stageCandidate, stagedDataDigest } from "./candidate-staging.js";
import { executeQuality } from "./execution.js";
import { validateQualityResult } from "./result-validation.js";
import { fail, digest } from "./contracts.js";
import { checkoutIdentity } from "./qualification.js";

const [requestPath, outputRoot, receiptPath] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
const candidate = checkoutIdentity(
  request.sourceRoot,
  request.git,
  request.candidateSha,
  request.profile,
);
const trusted = checkoutIdentity(
  request.trustedRoot,
  request.git,
  request.trustedSha,
  request.profile,
);
const staging = stageCandidate({
  ...request,
  profile: request.profilePath,
  outputRoot,
});
if (staging.profile.profileSha256 !== request.profile.profileSha256)
  fail("PROFILE_CHANGED", "Trusted profile changed before execution.");
const before = staging.stagedDataSha256;
const started = performance.now();
const result = await executeQuality(
  {
    mode: "check",
    root: outputRoot,
    config: staging.configPath,
    inventory: candidate.markdownPaths,
    limits: staging.profile.limits,
  },
  { ...staging.profile, processGroup: "inherit" },
);
const checkerElapsedMs = Math.round(performance.now() - started);
validateQualityResult(result, {
  operation: "check",
  configDigest: staging.policySha256,
  selectionMode: "full",
});
if (stagedDataDigest(outputRoot, staging.profile) !== before)
  fail("STAGED_DATA_CHANGED", "Read-only check changed staged data.");
if (
  JSON.stringify(
    checkoutIdentity(
      request.sourceRoot,
      request.git,
      request.candidateSha,
      request.profile,
    ),
  ) !== JSON.stringify(candidate) ||
  JSON.stringify(
    checkoutIdentity(
      request.trustedRoot,
      request.git,
      request.trustedSha,
      request.profile,
    ),
  ) !== JSON.stringify(trusted)
)
  fail("CHECKOUT_CHANGED", "Qualification checkout changed during execution.");
const receipt = {
  schemaVersion: 1,
  candidate,
  trusted,
  staging,
  producer: request.producer,
  workflow: request.workflow ?? null,
  host: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
  },
  checkerElapsedMs,
  result,
  gitExecutableSha256: digest(readFileSync(request.git)),
};
const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n");
if (bytes.length > staging.profile.reportBytes)
  fail("REPORT_LIMIT", "Qualification receipt exceeds the report bound.");
writeFileSync(receiptPath, bytes, { flag: "wx" });
process.exitCode = result.exitCode;
