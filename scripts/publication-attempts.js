// SPDX-License-Identifier: AGPL-3.0-only
/** Authenticate complete attempts and retain original job execution identities. */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { native } from "./commands.js";
import { sameJobExecution } from "./github-job-execution.js";
import { publicationRepository } from "./publication-context.js";
import {
  legacyPublicationSteps,
  stagingStepNames,
} from "./publication-steps.js";

const positive = (value) => Number.isSafeInteger(value) && value > 0;
export const publicationWorkflow = ".github/workflows/publish.yml";

/** A control-only continuation may reuse admission evidence only before any possible request. */
export function verifyNoPublicationEffects(history, { run, attempt, source }) {
  const observed = authenticatePublicationAttempts(
    history.run,
    history.attempts,
  );
  assert.equal(String(observed.run.id), String(run));
  assert.equal(String(observed.run.run_attempt), String(attempt));
  assert.equal(observed.run.head_sha, source);
  assert.equal(observed.run.head_branch, "main");
  assert.equal(observed.run.event, "workflow_dispatch");
  assert.equal(observed.run.status, "completed");
  for (const prior of observed.attempts)
    assert.equal(
      attemptedPublicationJobs(prior.jobs).length,
      0,
      "A possible prior request requires its original publication artifact",
    );
  return observed;
}

function authenticateRun(run, expected, attempt) {
  assert.ok(positive(run.id));
  assert.equal(run.id, expected.id);
  assert.equal(run.repository?.full_name, publicationRepository);
  assert.equal(run.head_repository?.full_name, publicationRepository);
  assert.equal(run.path, publicationWorkflow);
  assert.ok(typeof run.head_branch === "string" && run.head_branch.length > 0);
  assert.equal(run.head_branch, expected.head_branch);
  assert.ok(["workflow_dispatch", "push"].includes(run.event));
  assert.equal(run.event, expected.event);
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.equal(run.head_sha, expected.head_sha);
  assert.equal(run.run_attempt, attempt);
}

/** Unknown or contradictory steps cannot establish that no request occurred. */
export function attemptedPublicationJobs(jobs) {
  assert.ok(Array.isArray(jobs.jobs));
  assert.equal(
    jobs.total_count,
    jobs.jobs.length,
    "Truncated publication history",
  );
  return jobs.jobs.filter((job) => {
    if (!["stage", "publish"].includes(job.name)) return false;
    if (job.status === "queued" && !job.steps?.length) return false;
    if (job.conclusion === "skipped") {
      assert.equal(job.status, "completed");
      assert.ok(
        (job.steps ?? []).every(
          (step) =>
            step.status === "completed" && step.conclusion === "skipped",
        ),
        "Skipped publisher contains a possible write",
      );
      return false;
    }
    const names =
      job.name === "stage" ? stagingStepNames(job) : legacyPublicationSteps;
    assert.equal(
      job.status,
      "completed",
      "Publication execution is unresolved",
    );
    assert.ok(Array.isArray(job.steps), "Missing publication step history");
    for (const name of names) {
      const matches = job.steps.filter((step) => step.name === name);
      assert.equal(matches.length, 1, "Incomplete publication step history");
      assert.equal(
        matches[0].status,
        "completed",
        "Publication step is unresolved",
      );
      assert.ok(
        ["success", "failure", "cancelled", "timed_out", "skipped"].includes(
          matches[0].conclusion,
        ),
        "Publication step outcome is unavailable",
      );
    }
    return job.steps.some(
      (step) => names.includes(step.name) && step.conclusion !== "skipped",
    );
  });
}

/** Select the latest observed prerequisites without relabelling retained jobs. */
export function authenticatePublicationAttempts(run, attempts) {
  assert.ok(
    positive(run.run_attempt) && run.run_attempt <= 50,
    "Publication attempt bound exceeded",
  );
  authenticateRun(run, run, run.run_attempt);
  assert.ok(Array.isArray(attempts));
  assert.equal(
    attempts.length,
    run.run_attempt,
    "Incomplete publication attempts",
  );
  const executions = [],
    latest = new Map();
  for (let index = 0; index < attempts.length; index++) {
    const { run: observed, jobs } = attempts[index];
    const attempt = index + 1;
    authenticateRun(observed, run, attempt);
    if (attempt < run.run_attempt)
      assert.equal(
        observed.status,
        "completed",
        "Previous attempt is unresolved",
      );
    else assert.equal(observed.status, run.status);
    assert.ok(
      Array.isArray(jobs.jobs) && jobs.jobs.length < 100,
      "Publication inventory exceeds its bound",
    );
    assert.equal(
      jobs.total_count,
      jobs.jobs.length,
      "Incomplete publication job inventory",
    );
    assert.equal(
      new Set(jobs.jobs.map((job) => job.id)).size,
      jobs.jobs.length,
      "Duplicate publication job IDs",
    );
    assert.equal(
      new Set(jobs.jobs.map((job) => job.name)).size,
      jobs.jobs.length,
      "Ambiguous publication jobs",
    );
    for (const job of jobs.jobs) {
      assert.ok(positive(job.id));
      assert.ok(
        typeof job.name === "string" && job.name.length > 0,
        "Missing publication job identity",
      );
      assert.equal(job.run_id, run.id);
      assert.equal(job.head_sha, run.head_sha);
      assert.equal(job.run_attempt, attempt);
      if (attempt < run.run_attempt)
        assert.equal(job.status, "completed", "Previous job is unresolved");
      let original = job;
      const possibleWrite =
        ["stage", "publish"].includes(job.name) &&
        job.status === "completed" &&
        attemptedPublicationJobs({ total_count: 1, jobs: [job] }).length > 0;
      if (
        job.status === "completed" &&
        (job.conclusion === "success" || possibleWrite)
      ) {
        sameJobExecution(job, job);
        const retained = executions.find((prior) =>
          sameJobExecution(prior, job),
        );
        if (retained) {
          assert.ok(
            retained.conclusion === job.conclusion &&
              isDeepStrictEqual(retained.steps, job.steps),
            "Retained publication execution changed",
          );
          original = retained;
        } else executions.push(job);
      }
      latest.set(job.name, original);
    }
  }
  const jobs = [...latest.values()];
  return {
    run,
    attempts,
    jobs: { total_count: jobs.length, jobs },
    executions,
  };
}

export function readPublicationAttempts(
  runId,
  attempt,
  gh = (args) => native("gh", args),
) {
  assert.match(String(runId), /^[1-9]\d{0,15}$/u);
  if (attempt) assert.match(String(attempt), /^[1-9]\d{0,15}$/u);
  const path = `repos/${publicationRepository}/actions/runs/${runId}`;
  const target = attempt ? `${path}/attempts/${attempt}` : path;
  const run = JSON.parse(gh(["api", target]));
  assert.equal(String(run.id), String(runId));
  assert.ok(
    positive(run.run_attempt) && run.run_attempt <= 50,
    "Publication attempt bound exceeded",
  );
  if (attempt) assert.equal(String(run.run_attempt), String(attempt));
  const attempts = [];
  for (let n = 1; n <= run.run_attempt; n++) {
    attempts.push({
      run:
        n === run.run_attempt
          ? run
          : JSON.parse(gh(["api", `${path}/attempts/${n}`])),
      jobs: JSON.parse(gh(["api", `${path}/attempts/${n}/jobs?per_page=100`])),
    });
  }
  const result = authenticatePublicationAttempts(run, attempts);
  const final = JSON.parse(gh(["api", target]));
  authenticateRun(final, run, run.run_attempt);
  assert.equal(
    final.status,
    run.status,
    "Publication run changed during observation",
  );
  return result;
}

export function verifyFirstStagingAttempt(history, context) {
  const observed = authenticatePublicationAttempts(
    history.run,
    history.attempts,
  );
  assert.equal(String(observed.run.id), String(context.publicationRun));
  assert.equal(
    String(observed.run.run_attempt),
    String(context.publicationAttempt),
  );
  assert.equal(observed.run.head_sha, context.head);
  assert.equal(
    observed.run.head_branch,
    "main",
    "Current publisher requires main",
  );
  assert.equal(observed.run.event, "workflow_dispatch");
  assert.equal(observed.run.status, "in_progress");
  if (context.job === "stage") {
    const current = history.attempts
      .at(-1)
      .jobs.jobs.filter((job) => job.name === "stage");
    assert.equal(current.length, 1, "Current publisher is absent or ambiguous");
    assert.equal(
      current[0].status,
      "in_progress",
      "Admission must run inside the current publisher",
    );
  }
  for (const previous of observed.attempts.slice(0, -1)) {
    assert.equal(
      attemptedPublicationJobs(previous.jobs).length,
      0,
      "A prior possible staging write requires explicit recovery; never replay it on a rerun",
    );
  }
  return observed;
}
