// SPDX-License-Identifier: AGPL-3.0-only
// From OwlAPI 2f2dc35d974f31a7098895b9b8cbc22fb1ec6bc4 (source register).
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

const positiveId = (value) => Number.isSafeInteger(value) && value > 0;
const executionIdentity = (job) => {
  const started = Date.parse(job?.started_at);
  const completed = Date.parse(job?.completed_at);
  return job &&
    typeof job.name === "string" &&
    job.name.length > 0 &&
    positiveId(job.run_id) &&
    /^[a-f0-9]{40}$/u.test(job.head_sha ?? "") &&
    positiveId(job.runner_id) &&
    Number.isFinite(started) &&
    Number.isFinite(completed) &&
    completed >= started
    ? [job.name, job.run_id, job.head_sha, job.runner_id, started, completed]
    : null;
};

/** Compare authenticated job executions, not GitHub's mutable attempt/job/check
 * labels: partial reruns can copy retained jobs with new IDs and attempt labels.
 * Missing execution identity throws, so inequality cannot turn an unknown
 * execution into proof of a new producer. Callers must separately authenticate
 * complete inventories, success and the claimed producing attempt.
 */
export const sameJobExecution = (first, second) => {
  const identity = executionIdentity(first);
  const other = executionIdentity(second);
  if (identity === null || other === null)
    throw new Error("Native job execution identity is unavailable.");
  return isDeepStrictEqual(identity, other);
};

export async function originalExecution(job, run, read) {
  let producer;
  for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
    const inventory = await read(
      `/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`,
    );
    assert.equal(inventory.total_count, inventory.jobs.length);
    assert.equal(
      new Set(inventory.jobs.map((value) => value.name)).size,
      inventory.jobs.length,
    );
    assert.ok(
      inventory.jobs.every(
        (value) =>
          value.run_id === run.id &&
          value.head_sha === run.head_sha &&
          value.run_attempt === attempt,
      ),
    );
    const original = inventory.jobs.find((value) => value.name === job.name);
    if (!original) continue;
    if (original.conclusion === "skipped") {
      assert.ok(!producer, "A later skipped job superseded this execution");
      continue;
    }
    if (sameJobExecution(original, job)) {
      assert.equal(original.status, "completed");
      assert.equal(original.conclusion, "success");
      producer ??= {
        runAttempt: attempt,
        job: Object.fromEntries(
          [
            "name",
            "run_id",
            "head_sha",
            "runner_id",
            "started_at",
            "completed_at",
          ].map((key) => [key, original[key]]),
        ),
      };
    } else assert.ok(!producer, "A later job superseded this execution");
  }
  if (producer) return producer;
  throw new Error("No authenticated original job execution");
}

/** Bind a retained artifact to its original successful job, including partial reruns. */
export function selectQualificationArtifact(inventory, name, execution) {
  const matches = inventory.filter((artifact) => artifact.name === name);
  assert.equal(matches.length, 1, `Missing or ambiguous retained ${name}`);
  const artifact = matches[0];
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  const created = Date.parse(artifact.created_at);
  assert.ok(
    created >= Date.parse(execution.job.started_at) &&
      created <= Date.parse(execution.job.completed_at),
    `Retained ${name} differs from the original producing execution`,
  );
  return artifact;
}
