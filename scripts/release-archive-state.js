// SPDX-License-Identifier: AGPL-3.0-only
/** Selected npm channel and GitHub stable-line guards for new-format archival. */
import assert from "node:assert/strict";
import { releasePackages, releaseSemver } from "./release-coordinates.js";
import { readPackageTags } from "./release-labels.js";

export function archiveOperation(qualified, review, releaseId) {
  const stable =
    qualified.channel === "latest" &&
    !releaseSemver.prerelease(qualified.version);
  return {
    version: qualified.version,
    releaseId,
    label: qualified.channel,
    priors: review.guards.selectedLabels,
    targets: Object.fromEntries(
      releasePackages.map((name) => [name, qualified.version]),
    ),
    priorGithubLatest: review.guards.githubLatest,
    targetGithubLatest: stable ? releaseId : review.guards.githubLatest,
    priorPrerelease: true,
    targetPrerelease: !stable,
  };
}

export function readArchiveFamily(
  qualified,
  review,
  deadline,
  tags = readPackageTags,
) {
  return Object.fromEntries(
    releasePackages.map((name) => {
      const result = tags(name, {
        deadline,
        now: Date.now,
        allowAbsentPackage:
          review.guards.selectedLabels[name] === null &&
          review.guards.defaults[name] === null,
      });
      if (qualified.channel !== "latest")
        assert.equal(
          result.latest ?? null,
          review.guards.defaults[name],
          "Archival must preserve npm defaults",
        );
      return [name, result[qualified.channel] ?? null];
    }),
  );
}
