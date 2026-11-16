// SPDX-License-Identifier: AGPL-3.0-only
/** Bind release admission to original qualification or verified artifact promotion. */
import assert from "node:assert/strict";
import { candidateJobNames } from "./node-matrix.js";
import { assertMatrixJobLabel } from "./runner-policy.js";

export const releaseQualificationWorkflow =
  ".github/workflows/release-qualification.yml";
export const registryWorkflow = ".github/workflows/release-registry.yml";
export const registryJobNames = (matrix) => [
  "admit",
  ...matrix.os.flatMap((os) =>
    matrix.node.map((node) => `registry (${os}, ${node})`),
  ),
  "security",
  "qualified",
];

/** Names belong to the caller and reusable workflows at the same source commit. */
export function releaseQualificationJobNames(matrix, policy, mode = "legacy") {
  assert.ok(matrix, "Release qualification requires a frozen runtime matrix");
  if (mode === "reused")
    return ["resolve", "fresh", "security", "distribution", "qualified"];
  if (mode === "fresh")
    return [
      "resolve",
      ...releaseQualificationJobNames(matrix, policy)
        .filter((name) => !["security", "distribution"].includes(name))
        .map((name) => `fresh / ${name}`),
      "security",
      "distribution",
      "qualified",
    ];
  assert.equal(mode, "legacy");
  const candidates = candidateJobNames(matrix, policy);
  return [
    "resolve",
    "dependencies",
    "native / Validate win32-x64",
    "native / Validate linux-x64",
    ...candidates.map((name) => `product / ${name}`),
    "scans / Validate Actions approval model",
    ...["actions", "javascript-typescript", "python"].map(
      (language) => `scans / Scan ${language}`,
    ),
    "security",
    "distribution",
    "qualified",
  ];
}

/** GitHub retains the separate manual-fixture branch as one inactive job. */
export function verifyReleaseQualificationJob(run, job) {
  assert.equal(job.status, "completed");
  assert.equal(
    job.conclusion,
    "success",
    `Unexpected release gate result: ${job.name}`,
  );
  assert.equal(job.head_sha, run.head_sha);
  assert.equal(job.run_id, run.id);
  assert.equal(job.run_attempt, run.run_attempt);
  assertMatrixJobLabel(job);
}

/** Reject omitted, skipped, duplicate, stale-attempt and wrong-source gate evidence. */
export function verifyReleaseQualificationJobs(run, jobs, release) {
  const mode = qualificationMode(release, jobs);
  if (mode === "reused") verifyPromotion(release, run.head_sha);
  const expected = releaseQualificationJobNames(
    release.qualificationMatrix,
    release.runtimePolicy,
    mode,
  );
  assert.equal(jobs.total_count, expected.length, "Incomplete release gates");
  assert.equal(jobs.jobs.length, expected.length, "Truncated release gates");
  assert.deepEqual(jobs.jobs.map((job) => job.name).sort(), expected.sort());
  for (const job of jobs.jobs) {
    if (mode === "reused" && job.name === "fresh") {
      assert.equal(job.status, "completed");
      assert.equal(job.conclusion, "skipped");
      assert.equal(job.head_sha, run.head_sha);
      assert.equal(job.run_id, run.id);
      assert.equal(job.run_attempt, run.run_attempt);
    } else verifyReleaseQualificationJob(run, job);
  }
}

/** Old records retain their original graph; new records distinguish both routes. */
export function qualificationMode(release, jobs) {
  return release.promotion
    ? "reused"
    : jobs.jobs.some(({ name }) => name === "fresh / resolve")
      ? "fresh"
      : "legacy";
}

/** A promotion identifies a later authorization without rewriting the original build. */
export function verifyPromotion(release, releaseCommit) {
  const p = release.promotion;
  assert.equal(p.schemaVersion, 1);
  for (const key of ["buildCommit", "releaseCommit", "tree"])
    assert.match(p[key], /^[a-f0-9]{40}$/u);
  for (const key of ["buildManifestSha256", "proofSha256"])
    assert.match(p[key], /^[a-f0-9]{64}$/u);
  assert.equal(p.buildCommit, release.source.head);
  assert.equal(p.releaseCommit, releaseCommit);
  assert.equal(p.tree, release.source.tree);
  assert.equal(release.source.clean, true);
  assert.equal(p.parents.length, 2);
  for (const parent of p.parents) assert.match(parent, /^[a-f0-9]{40}$/u);
  for (const key of ["run", "attempt", "pullRequest"])
    assert.ok(Number.isSafeInteger(p[key]) && p[key] > 0);
}

/** Signed release tags identify the landed commit, package provenance the build commit. */
export const releaseCommit = (release) =>
  release.promotion?.releaseCommit ?? release.source?.head ?? release.source;
