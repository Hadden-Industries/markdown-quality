// SPDX-License-Identifier: AGPL-3.0-only
/** Owner-reviewed family operations and their exact preimages; no provider effects here. */
import assert from "node:assert/strict";
import {
  releasePackages,
  releaseVersion,
  releaseSemver,
} from "./release-coordinates.js";
import { ownerDispatchBytes } from "./release-decision-transport.js";

/** Bind authenticated dispatch authority to one complete operation rather than caller-supplied hashes alone. */
export function readReleaseOperation(
  env,
  qualified,
  { allowHistoricalController = false } = {},
) {
  const bytes = ownerDispatchBytes({
    ...env,
    REVIEW_JSON: env.OPERATION_JSON,
    REVIEW_SHA: env.OPERATION_SHA,
  });
  const operation = JSON.parse(bytes);
  assert.equal(operation.schemaVersion, 1);
  assert.equal(operation.repository, "Hadden-Industries/markdown-quality");
  assert.equal(operation.owner, "maksymshostak");
  assert.match(operation.controller, /^[a-f0-9]{40}$/u);
  if (!allowHistoricalController)
    assert.equal(operation.controller, env.GITHUB_SHA);
  assert.equal(operation.source, qualified.source);
  assert.equal(operation.version, qualified.version);
  assert.equal(operation.manifestSha256, qualified.manifestSha256);
  assert.equal(operation.qualificationSha256, env.QUALIFICATION_SHA);
  assert.match(operation.operationId, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
  assert.ok(Number.isFinite(Date.parse(operation.acceptedAt)));
  assert.ok(
    [
      "promote",
      "align",
      "restore",
      "direct",
      "continue",
      "partial",
      "verify",
      "retire-pilot",
    ].includes(operation.operation),
  );
  assert.ok(
    Number.isSafeInteger(operation.releaseId) && operation.releaseId > 0,
  );
  for (const key of ["priorGithubLatest", "targetGithubLatest"])
    assert.ok(
      operation[key] === null ||
        (Number.isSafeInteger(operation[key]) && operation[key] > 0),
    );
  for (const key of ["priorPrerelease", "targetPrerelease"])
    assert.equal(typeof operation[key], "boolean");
  assert.ok(["latest", "pilot"].includes(operation.label));
  for (const key of ["priors", "targets"]) {
    assert.deepEqual(
      Object.keys(operation[key]).sort(),
      [...releasePackages].sort(),
    );
    for (const value of Object.values(operation[key]))
      if (value !== null) releaseVersion(value);
  }
  assert.deepEqual(
    Object.keys(operation.targetIntegrities).sort(),
    [...releasePackages].sort(),
  );
  for (const name of releasePackages) {
    if (operation.targets[name] === null)
      assert.equal(operation.targetIntegrities[name], null);
    else {
      assert.match(
        operation.targetIntegrities[name],
        /^sha512-[A-Za-z0-9+/]{86}==$/u,
      );
      if (operation.targets[name] === qualified.version)
        assert.equal(
          operation.targetIntegrities[name],
          qualified.archives.find((archive) => archive.package === name)
            .integrity,
        );
    }
  }
  assert.ok(Array.isArray(operation.scope?.npm));
  assert.equal(new Set(operation.scope.npm).size, operation.scope.npm.length);
  assert.ok(
    operation.scope.npm.every((name) => releasePackages.includes(name)),
  );
  assert.equal(typeof operation.scope.github, "boolean");
  if (!operation.scope.github) {
    assert.equal(operation.targetGithubLatest, operation.priorGithubLatest);
    assert.equal(operation.targetPrerelease, operation.priorPrerelease);
  }
  if (
    operation.scope.github &&
    operation.targetGithubLatest === operation.priorGithubLatest &&
    operation.targetPrerelease === operation.priorPrerelease
  )
    assert.equal(
      operation.githubNoop,
      true,
      "Already-classified GitHub targets require an approved no-op",
    );
  assert.ok(
    (operation.noops ?? []).every((name) => releasePackages.includes(name)),
  );
  if (["promote", "align", "restore"].includes(operation.operation)) {
    releaseVersion(qualified.version, { stable: true });
    assert.equal(operation.label, "latest");
    for (const name of releasePackages)
      assert.equal(operation.targets[name], qualified.version);
    assert.equal(operation.targetGithubLatest, operation.releaseId);
    assert.equal(operation.targetPrerelease, false);
  }
  if (operation.operation === "promote") {
    assert.equal(
      new Set(Object.values(operation.priors)).size,
      1,
      "Forward promotion requires a coherent approved prior family",
    );
    const prior = operation.priors[releasePackages[0]];
    releaseVersion(prior, { stable: true });
    assert.ok(
      releaseSemver.gt(qualified.version, prior),
      "Forward promotion must advance the prior version",
    );
    assert.deepEqual(
      [...operation.scope.npm].sort(),
      [...releasePackages].sort(),
    );
    assert.equal(operation.scope.github, true);
  }
  if (operation.operation === "align") {
    assert.equal(operation.priors[releasePackages[2]], qualified.version);
    assert.equal(
      operation.priorGithubLatest,
      operation.releaseId,
      "Core and GitHub must agree before companion alignment",
    );
    assert.equal(operation.priorPrerelease, false);
    assert.equal(operation.scope.github, false);
    assert.ok(!operation.scope.npm.includes(releasePackages[2]));
  }
  if (operation.operation === "restore") {
    assert.deepEqual(
      [...operation.scope.npm].sort(),
      [...releasePackages].sort(),
      "A completed stable release restores the whole family",
    );
    assert.equal(operation.scope.github, true);
  }
  if (operation.operation === "direct") {
    assert.equal(qualified.channel, "latest");
    assert.ok(
      qualified.decision,
      "Direct completion requires authenticated staging decisions",
    );
    assert.equal(operation.label, "latest");
    assert.equal(
      operation.scope.npm.length,
      0,
      "Direct staging already moved defaults; no redundant npm requests",
    );
    for (const name of releasePackages)
      assert.equal(operation.targets[name], qualified.version);
    if (releaseSemver.prerelease(qualified.version)) {
      assert.equal(operation.scope.github, false);
      assert.equal(operation.targetGithubLatest, operation.priorGithubLatest);
      assert.equal(operation.targetPrerelease, true);
    } else {
      assert.equal(operation.targetGithubLatest, operation.releaseId);
      assert.equal(operation.targetPrerelease, false);
      assert.ok(operation.scope.github || operation.githubNoop === true);
    }
  }
  if (operation.operation === "continue") {
    releaseVersion(qualified.version, { stable: true });
    assert.equal(operation.label, "latest");
    assert.equal(operation.targetGithubLatest, operation.releaseId);
    assert.equal(operation.targetPrerelease, false);
    assert.ok(operation.originalOperationId && operation.originalWriter);
    assert.match(operation.originalJournalSha256, /^[a-f0-9]{64}$/u);
    assert.match(operation.originalDecisionSha256, /^[a-f0-9]{64}$/u);
    for (const name of releasePackages) {
      assert.equal(operation.targets[name], qualified.version);
      if (!operation.scope.npm.includes(name))
        assert.equal(operation.priors[name], qualified.version);
    }
  }
  if (operation.operation === "verify") {
    assert.equal(operation.scope.npm.length, 0);
    assert.equal(operation.scope.github, false);
    assert.equal(operation.targetGithubLatest, operation.priorGithubLatest);
    assert.equal(operation.targetPrerelease, operation.priorPrerelease);
    // The owner selects which supported channel is observed. A previously
    // promoted pilot archive can therefore be verified under latest as well.
    for (const name of releasePackages)
      assert.equal(operation.targets[name], qualified.version);
  }
  if (operation.operation === "partial") {
    if (operation.affectedManifestSha256 !== undefined) {
      assert.match(operation.affectedManifestSha256, /^[a-f0-9]{64}$/u);
      assert.deepEqual(
        Object.keys(operation.originalJournals).sort(),
        [...operation.scope.npm].sort(),
      );
      for (const value of Object.values(operation.originalJournals))
        assert.match(value, /^[a-f0-9]{64}$/u);
    }
    assert.equal(operation.scope.github, false);
    assert.equal(operation.targetGithubLatest, operation.priorGithubLatest);
    assert.equal(operation.targetPrerelease, operation.priorPrerelease);
    assert.match(operation.originalJournalSha256, /^[a-f0-9]{64}$/u);
    assert.match(operation.originalDecisionSha256, /^[a-f0-9]{64}$/u);
    assert.ok(operation.originalWriter && operation.originalOperationId);
    assert.ok(
      operation.targetQualifications,
      "Partial recovery requires every prior target's original public qualification",
    );
    for (const name of operation.scope.npm)
      if (operation.targets[name] === null)
        requireApprovedDeletion(operation, name);
  }
  if (operation.operation === "retire-pilot")
    verifyPilotRetirement(operation, qualified);
  for (const name of releasePackages) {
    if (!operation.scope.npm.includes(name) && operation.operation !== "direct")
      assert.equal(
        operation.targets[name],
        operation.priors[name],
        "Excluded npm labels are guards",
      );
    if (
      operation.scope.npm.includes(name) &&
      operation.targets[name] === operation.priors[name]
    )
      assert.ok(
        operation.noops?.includes(name),
        "An already-at-target value requires an approved no-op",
      );
  }
  return { operation, bytes };
}

/** A label removal needs the owner's exact package/current/absent preview, never an inferred one. */
function requireApprovedDeletion(operation, name) {
  assert.ok(
    operation.approvedDeletions?.some(
      (entry) =>
        entry.package === name &&
        entry.current === operation.priors[name] &&
        entry.target === null,
    ),
    "Label deletion needs an explicit package/current/deletion preview",
  );
}

/**
 * Admit the npm-only retirement of an evaluated pilot alias family.
 * The qualified subject is the current stable release: it must be GitHub
 * latest and stable, and its three `latest` labels are frozen as guards.
 * The retired subject is no later than that stable version; when it is the
 * same subject its identity must equal the admitted stable qualification.
 * Every present pilot alias needs an approved deletion and every absent alias
 * an approved no-op, so the whole family is explicitly accounted for.
 */
function verifyPilotRetirement(operation, qualified) {
  releaseVersion(qualified.version, { stable: true });
  assert.equal(operation.label, "pilot", "Retirement removes pilot aliases");
  assert.equal(operation.scope.github, false, "Retirement is npm-only");
  assert.equal(operation.priorGithubLatest, operation.releaseId);
  assert.equal(operation.priorPrerelease, false);
  assert.deepEqual(
    [...operation.scope.npm].sort(),
    [...releasePackages].sort(),
    "Retirement accounts for the whole pilot family",
  );
  assert.deepEqual(
    Object.keys(operation.guards?.latest ?? {}).sort(),
    [...releasePackages].sort(),
  );
  for (const name of releasePackages)
    assert.equal(
      operation.guards.latest[name],
      qualified.version,
      "Retirement requires the coherent stable latest family",
    );
  const retired = operation.retired;
  assert.deepEqual(Object.keys(retired ?? {}).sort(), [
    "manifestSha256",
    "prerelease",
    "qualificationSha256",
    "releaseId",
    "source",
    "version",
  ]);
  releaseVersion(retired.version);
  assert.ok(
    !releaseSemver.gt(retired.version, qualified.version),
    "A newer pilot candidate is not retired by this stable release",
  );
  assert.match(retired.source, /^[a-f0-9]{40}$/u);
  assert.match(retired.manifestSha256, /^[a-f0-9]{64}$/u);
  assert.match(retired.qualificationSha256, /^[a-f0-9]{64}$/u);
  assert.ok(Number.isSafeInteger(retired.releaseId) && retired.releaseId > 0);
  assert.equal(typeof retired.prerelease, "boolean");
  if (retired.version === qualified.version)
    assert.deepEqual(
      retired,
      {
        version: qualified.version,
        source: qualified.source,
        manifestSha256: qualified.manifestSha256,
        qualificationSha256: operation.qualificationSha256,
        releaseId: operation.releaseId,
        prerelease: false,
      },
      "The retired subject must be the admitted stable subject",
    );
  else assert.notEqual(retired.releaseId, operation.releaseId);
  // A resumed retirement names its whole original writer; history admission
  // then derives the remaining scope from that writer's authenticated effects.
  const original = [
    "originalOperationId",
    "originalDecisionSha256",
    "originalJournalSha256",
    "originalWriter",
  ];
  assert.ok(
    original.every((name) => operation[name] === undefined) ||
      original.every((name) => operation[name] !== undefined),
    "A resumed retirement names its complete original writer",
  );
  if (operation.originalOperationId !== undefined) {
    assert.notEqual(operation.originalOperationId, operation.operationId);
    assert.match(operation.originalDecisionSha256, /^[a-f0-9]{64}$/u);
    assert.match(operation.originalJournalSha256, /^[a-f0-9]{64}$/u);
    for (const name of ["run", "attempt", "job"])
      assert.match(String(operation.originalWriter[name]), /^[1-9]\d{0,15}$/u);
  }
  const noops = new Set(operation.noops ?? []);
  for (const name of releasePackages) {
    assert.equal(operation.targets[name], null, "Retirement targets absence");
    if (operation.priors[name] === null)
      assert.ok(
        noops.has(name),
        "An absent pilot alias needs an approved no-op",
      );
    else {
      assert.equal(
        operation.priors[name],
        retired.version,
        "Each present pilot alias must name the retired subject",
      );
      assert.ok(!noops.has(name), "A present pilot alias is not a no-op");
      requireApprovedDeletion(operation, name);
    }
  }
}

/**
 * Whether an admitted operation has a GitHub writer. Pilot retirement is
 * npm-only and must reach completion without acquiring GitHub write
 * permission; every other variant retains its sealed GitHub writer record,
 * including the zero-effect preflight of npm-only recovery variants.
 */
export function githubWriterRequired(operation) {
  return operation.operation !== "retire-pilot";
}

/**
 * Whether a decision resumes an interrupted original operation, so its
 * authenticated ancestors may remain unfinished. Partial recovery and forward
 * continuation always do; a pilot retirement does when it names an original
 * retirement writer and the settlements that let it repeat refused requests.
 */
export function resumesOperation(operation) {
  return (
    ["partial", "continue"].includes(operation.operation) ||
    (operation.operation === "retire-pilot" &&
      operation.originalOperationId !== undefined)
  );
}
