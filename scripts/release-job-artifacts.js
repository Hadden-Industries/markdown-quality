// SPDX-License-Identifier: AGPL-3.0-only
/** Read immutable release artifacts from the successful job execution that produced them. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  originalExecution,
  selectQualificationArtifact,
} from "./github-job-execution.js";
import { downloadEvidence } from "./download-evidence.js";
import { createReleaseCollectionReader } from "./github-evidence.js";
import { repository } from "./release-identity.js";
import { readProvider, requireManualControl } from "./release-continuation.js";
import {
  registryWorkflow,
  releaseQualificationWorkflow,
} from "./release-qualification.js";

const recipientStep = "Retain recipient security inputs for this execution";

export function producedArtifacts(
  { run, jobs },
  { read, download = downloadEvidence },
) {
  assert.ok(
    [registryWorkflow, releaseQualificationWorkflow].includes(run.path),
  );
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0);
  assert.ok(Number.isSafeInteger(run.repository.id) && run.repository.id > 0);
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.head_repository.full_name, repository);
  assert.equal(run.head_repository.id, run.repository.id);
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.head_branch, "main");
  assert.ok(
    Number.isSafeInteger(run.run_attempt) &&
      run.run_attempt >= 1 &&
      run.run_attempt <= 50,
  );
  assert.equal(jobs.total_count, jobs.jobs.length);
  assert.equal(
    new Set(jobs.jobs.map((job) => job.name)).size,
    jobs.jobs.length,
  );
  assert.ok(
    jobs.jobs.every(
      (job) =>
        job.run_id === run.id &&
        job.head_sha === run.head_sha &&
        job.run_attempt === run.run_attempt,
    ),
  );
  const base = `/actions/runs/${run.id}`;
  const jobPath = (attempt) => `${base}/attempts/${attempt}/jobs?per_page=100`;
  const inventories = new Map([[jobPath(run.run_attempt), jobs]]);
  const history = async (path) => {
    if (!inventories.has(path)) inventories.set(path, await read(path));
    return inventories.get(path);
  };
  return async (jobName, stem, destination, { recipient = false } = {}) => {
    const matches = jobs.jobs.filter((job) => job.name === jobName);
    assert.equal(
      matches.length,
      1,
      "Missing or ambiguous release artifact producer",
    );
    const job = matches[0];
    assert.equal(job.status, "completed");
    assert.equal(
      job.conclusion,
      "success",
      "Latest release artifact producer did not succeed",
    );
    const original = await originalExecution(job, run, history);
    const originalJob = (await history(jobPath(original.runAttempt))).jobs.find(
      (entry) => entry.name === jobName,
    );
    let name = `${stem}-${original.runAttempt}`;
    if (recipient) {
      const steps = originalJob.steps.filter(
        (step) => step.name === recipientStep,
      );
      if (steps.length) {
        assert.equal(steps.length, 1);
        assert.equal(steps[0].status, "completed");
        assert.equal(steps[0].conclusion, "success");
      } else {
        // Historical registry workflows used two unnamed pinned uploads
        // (qualification report, then the reference lane's recipient inputs).
        const uploads = originalJob.steps.filter((step) =>
          step.name.startsWith("Run actions/upload-artifact@"),
        );
        assert.equal(
          uploads.length,
          2,
          "Unrecognized original recipient upload",
        );
        assert.ok(
          uploads.every(
            (step) =>
              step.status === "completed" && step.conclusion === "success",
          ),
        );
        name = stem;
      }
    }
    const listed = await read(
      `${base}/artifacts?name=${encodeURIComponent(name)}&per_page=100`,
    );
    assert.equal(
      listed.total_count,
      1,
      "Missing or ambiguous original release artifact",
    );
    assert.equal(listed.artifacts.length, 1);
    const artifact = selectQualificationArtifact(
      listed.artifacts,
      name,
      original,
    );
    await download({
      id: artifact.id,
      expectedArtifact: artifact,
      destination,
      read,
      runId: run.id,
      repositoryId: run.repository.id,
      headRepositoryId: run.head_repository.id,
      headSha: run.head_sha,
    });
    return destination;
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  requireManualControl(process.env, registryWorkflow);
  const observed = readProvider(
    process.env.GITHUB_RUN_ID,
    process.env.GITHUB_RUN_ATTEMPT,
  );
  assert.equal(observed.run.head_sha, process.env.GITHUB_SHA);
  assert.equal(observed.run.path, registryWorkflow);
  assert.equal(
    observed.run.run_attempt,
    Number(process.env.GITHUB_RUN_ATTEMPT),
  );
  const release = JSON.parse(
    readFileSync("frozen-release/release-manifest.json", "utf8"),
  );
  const acquire = producedArtifacts(observed, {
    read: createReleaseCollectionReader(process.env.GH_TOKEN),
  });
  for (const os of release.qualificationMatrix.os) {
    assert.match(os, /^[a-z0-9][a-z0-9.-]*$/u);
    const name = `recipient-${os}`;
    await acquire(
      `registry (${os}, ${release.runtimePolicy.reference})`,
      name,
      join("recipient-security", name),
      { recipient: true },
    );
  }
}
