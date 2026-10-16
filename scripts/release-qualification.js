// SPDX-License-Identifier: AGPL-3.0-only
/** Bind release admission to the complete fresh, manually requested hosted graph. */
import assert from "node:assert/strict";
import { candidateJobNames } from "./node-matrix.js";

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
export function releaseQualificationJobNames(matrix, policy) {
  assert.ok(matrix, "Release qualification requires a frozen runtime matrix");
  const candidates = candidateJobNames(matrix, policy);
  return [
    "resolve",
    "product / matrix",
    "product / strategy",
    "product / required",
    ...matrix.os.flatMap((os) =>
      matrix.node.flatMap((node) => [
        `product / probe (${os}, ${node})`,
        `product / package (${os}, ${node})`,
      ]),
    ),
    "candidate / shared",
    ...candidates.map((name) => `candidate / ${name}`),
    "security",
    "distribution",
    "qualified",
  ];
}

/** GitHub retains the separate manual-fixture branch as one inactive job. */
export function verifyReleaseQualificationJob(run, job) {
  assert.equal(job.status, "completed");
  const inactive = job.name === "candidate / shared";
  assert.equal(
    job.conclusion,
    inactive ? "skipped" : "success",
    `Unexpected release gate result: ${job.name}`,
  );
  if (inactive)
    assert.deepEqual(job.steps, [], "Inactive fixture branch executed steps");
  assert.equal(job.head_sha, run.head_sha);
  assert.equal(job.run_id, run.id);
  assert.equal(job.run_attempt, run.run_attempt);
}

/** Reject omitted, skipped, duplicate, stale-attempt and wrong-source gate evidence. */
export function verifyReleaseQualificationJobs(run, jobs, release) {
  const expected = releaseQualificationJobNames(
    release.qualificationMatrix,
    release.runtimePolicy,
  );
  assert.equal(jobs.total_count, expected.length, "Incomplete release gates");
  assert.equal(jobs.jobs.length, expected.length, "Truncated release gates");
  assert.deepEqual(jobs.jobs.map((job) => job.name).sort(), expected.sort());
  for (const job of jobs.jobs) verifyReleaseQualificationJob(run, job);
}
