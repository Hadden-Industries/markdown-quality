// SPDX-License-Identifier: AGPL-3.0-only
// Private observer child: no candidate module is loaded.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { isDeepStrictEqual } from "node:util";
import { stageCandidateData, stagedDataDigest } from "./candidate-staging.js";
import { runQualityRequest } from "./execution.js";
import { admitCheckEvidence } from "./result-validation.js";
import { fail, digest, exceeds } from "./contracts.js";
import { checkoutIdentity } from "./qualification.js";
import { markdownPathPredicate, createPathDecision } from "./documents.js";

const [requestPath, outputRoot, receiptPath] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
const candidate = checkoutIdentity(
  request.candidateRoot,
  request.gitExecutablePath,
  request.candidateCommitId,
  request.profile,
);
const trusted = checkoutIdentity(
  request.trustedRoot,
  request.gitExecutablePath,
  request.trustedCommitId,
  request.profile,
);
const staging = stageCandidateData({
  candidateRoot: request.candidateRoot,
  trustedRoot: request.trustedRoot,
  profile: request.profilePath,
  outputRoot,
});
const profile = staging.profile;
if (profile.profileSha256 !== request.profile.profileSha256)
  fail("PROFILE_CHANGED", "Trusted profile changed before execution.");
const before = staging.stagedDataSha256;
// The staged trusted snapshot is the effective policy, including its include scope.
const trustedConfiguration = JSON.parse(
  readFileSync(join(outputRoot, staging.configPath), "utf8"),
);
const { include } = trustedConfiguration;
const markdown = markdownPathPredicate(include);
// Receipts keep each checkout's Markdown inventory, not every tracked path.
const recorded = ({ trackedPaths, ...identity }) => ({
  ...identity,
  markdownPaths: trackedPaths.filter(markdown),
});
const started = performance.now();
// The trusted profile and snapshot own policy; the staged candidate's own files,
// including any configuration or execution profile, are data only.
const result = await runQualityRequest(
  {
    mode: "check",
    root: outputRoot,
    config: staging.configPath,
    reconciliationInventory: recorded(candidate).markdownPaths,
  },
  {
    processGroup: "inherit",
    resourceLimitMode: profile.resourceLimitMode,
    executionTimeoutMs: profile.executionTimeoutMs,
    maxOutputBytes: profile.maxOutputBytes,
    maxRequestBytes: profile.maxRequestBytes,
    maxNodeOldGenerationMiB: profile.maxNodeOldGenerationMiB,
    cleanupTimeoutMs: profile.cleanupTimeoutMs,
  },
  {
    profileSnapshot: {
      origin: {
        kind: "file",
        path: profile.profilePath,
        bytesSha256: profile.profileSha256,
      },
      value: profile.sparseProfile,
      observation: null,
    },
    profileOrigin: {
      kind: "trusted-request",
      path: profile.profilePath,
      bytesSha256: profile.profileSha256,
    },
    configurationSource: staging.configurationSource,
  },
);
const checkerElapsedMs = Math.round(performance.now() - started);
admitCheckEvidence(result, {
  configurationBytesSha256: staging.trustedConfigurationSnapshotSha256,
  selectionMode: "full",
  files: recorded(candidate)
    .markdownPaths.filter(
      (path) =>
        createPathDecision(trustedConfiguration)(path).decision === "selected",
    )
    .sort(),
});
if (
  result.configurationOrigin?.kind !== "trusted-snapshot" ||
  !isDeepStrictEqual(
    result.configurationOrigin.source,
    staging.configurationSource,
  )
)
  fail("INVALID_RESULT", "Check did not use the trusted policy snapshot.");
if (stagedDataDigest(outputRoot, profile) !== before)
  fail("STAGED_DATA_CHANGED", "Read-only check changed staged data.");
if (
  !isDeepStrictEqual(
    checkoutIdentity(
      request.candidateRoot,
      request.gitExecutablePath,
      request.candidateCommitId,
      request.profile,
    ),
    candidate,
  ) ||
  !isDeepStrictEqual(
    checkoutIdentity(
      request.trustedRoot,
      request.gitExecutablePath,
      request.trustedCommitId,
      request.profile,
    ),
    trusted,
  )
)
  fail("CHECKOUT_CHANGED", "Qualification checkout changed during execution.");
const receipt = {
  schemaVersion: 2,
  candidate: recorded(candidate),
  trusted: recorded(trusted),
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
  gitExecutableSha256: digest(readFileSync(request.gitExecutablePath)),
};
const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n");
if (exceeds(bytes.length, profile.maxOutputBytes))
  fail("REPORT_LIMIT", "Qualification receipt exceeds the report bound.");
writeFileSync(receiptPath, bytes, { flag: "wx" });
process.exitCode = result.exitCode;
