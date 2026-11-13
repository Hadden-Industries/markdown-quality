// SPDX-License-Identifier: AGPL-3.0-only
/** Authenticate expired artifacts only against complete owner-signed native observations. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { hash, releaseBytes } from "./release-bytes.js";

/** Provider presentation metadata may drift; original executions, artifacts and bytes may not. */
export function retainedObservationIdentity(entry) {
  const job = (value) =>
    Object.fromEntries(
      [
        "id",
        "name",
        "run_id",
        "run_attempt",
        "head_sha",
        "status",
        "conclusion",
        "runner_id",
        "started_at",
        "completed_at",
        "steps",
      ].map((name) => [name, value[name]]),
    );
  return {
    attempt: entry.attempt,
    files: entry.files,
    job: job(entry.job),
    inventory: {
      total_count: entry.inventory.total_count,
      jobs: entry.inventory.jobs.map(job).sort((a, b) => a.id - b.id),
    },
    run: Object.fromEntries(
      [
        "id",
        "run_attempt",
        "head_sha",
        "path",
        "event",
        "head_branch",
        "status",
        "conclusion",
      ].map((name) => [name, entry.run[name]]),
    ),
    repository: {
      id: entry.run.repository?.id,
      full_name: entry.run.repository?.full_name,
    },
    headRepository: {
      id: entry.run.head_repository?.id,
      full_name: entry.run.head_repository?.full_name,
    },
    artifact: Object.fromEntries(
      ["id", "name", "size_in_bytes", "digest", "workflow_run"].map((name) => [
        name,
        entry.artifact[name],
      ]),
    ),
  };
}

export function retainedArtifact(checkpoints, id, expected) {
  const matches = checkpoints
    .flatMap((checkpoint) => checkpoint.writers)
    .filter((entry) => entry.artifact.id === Number(id));
  assert.ok(
    matches.length > 0,
    "Expired artifact requires complete signed original history and qualification",
  );
  for (const match of matches)
    assert.deepEqual(
      retainedObservationIdentity(match),
      retainedObservationIdentity(matches[0]),
      "Conflicting retained artifact observations",
    );
  const entry = matches[0];
  assert.equal(entry.artifact.name, expected.name);
  assert.equal(String(entry.run.id), String(expected.run));
  assert.equal(entry.attempt, Number(expected.attempt));
  assert.equal(entry.run.head_sha, expected.controller);
  assert.equal(entry.run.path, expected.workflow);
  assert.equal(entry.job.name, expected.job);
  if (!expected.allowFailedJob) assert.equal(entry.job.conclusion, "success");
  else
    assert.ok(
      ["success", "failure", "cancelled", "timed_out"].includes(
        entry.job.conclusion,
      ),
    );
  return entry;
}

export function verifyRetainedFiles(directory, entry) {
  for (const [name, file] of Object.entries(entry.files))
    assert.equal(
      hash(releaseBytes(join(directory, name), 64 * 1024 * 1024)),
      file.sha256,
      "Retained artifact bytes differ",
    );
}

export function restoreRetainedFiles(directory, entry) {
  mkdirSync(directory);
  for (const [name, file] of Object.entries(entry.files)) {
    assert.match(name, /^[A-Za-z0-9][A-Za-z0-9._/-]{0,240}$/u);
    assert.ok(!name.split("/").some((part) => ["", ".", ".."].includes(part)));
    const bytes = Buffer.from(file.base64, "base64");
    assert.equal(hash(bytes), file.sha256);
    mkdirSync(dirname(join(directory, name)), { recursive: true });
    writeFileSync(join(directory, name), bytes, { flag: "wx" });
  }
}

export function assertRetainedArtifactIdentity(live, retained) {
  for (const name of ["id", "name", "size_in_bytes", "digest", "workflow_run"])
    assert.deepEqual(
      live[name],
      retained.artifact[name],
      "Live and signed artifact identities disagree",
    );
}

/** A missing native record is recoverable only from the exact signed original. Denials never fall back. */
export async function authenticateArtifact(
  id,
  expected,
  { api, checkpoints = [], directory } = {},
) {
  let retained;
  const original = () =>
    (retained ??= retainedArtifact(checkpoints, id, expected));
  const read = async (path, fallback) => {
    try {
      return await api(path);
    } catch (error) {
      if (error.httpStatus !== 404) throw error;
      return fallback(original());
    }
  };
  const artifact = await read(`actions/artifacts/${id}`, (entry) => ({
    ...entry.artifact,
    expired: true,
  }));
  assert.equal(artifact.id, Number(id));
  assert.equal(artifact.name, expected.name);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  if (artifact.expired) {
    assertRetainedArtifactIdentity(artifact, original());
    if (directory) verifyRetainedFiles(directory, original());
  }
  const run = await read(
    `actions/runs/${expected.run}/attempts/${expected.attempt}`,
    (entry) => entry.run,
  );
  assert.equal(run.id, Number(expected.run));
  assert.equal(run.run_attempt, Number(expected.attempt));
  assert.equal(run.path, expected.workflow);
  assert.equal(run.head_sha, expected.controller);
  assert.equal(run.repository.full_name, "Hadden-Industries/markdown-quality");
  assert.equal(run.head_repository.full_name, run.repository.full_name);
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.head_branch, "main");
  assert.equal(artifact.workflow_run.id, run.id);
  assert.equal(artifact.workflow_run.head_sha, run.head_sha);
  assert.equal(artifact.workflow_run.repository_id, run.repository.id);
  assert.equal(
    artifact.workflow_run.head_repository_id,
    run.head_repository.id,
  );
  const jobs = await read(
    `actions/runs/${expected.run}/attempts/${expected.attempt}/jobs?per_page=100`,
    (entry) => entry.inventory,
  );
  assert.equal(jobs.total_count, jobs.jobs.length);
  const matches = jobs.jobs.filter((entry) => entry.name === expected.job);
  assert.equal(matches.length, 1);
  const job = matches[0];
  assert.equal(job.run_id, run.id);
  assert.equal(job.run_attempt, Number(expected.attempt));
  assert.equal(job.head_sha, run.head_sha);
  assert.equal(job.status, "completed");
  if (!expected.allowFailedJob) assert.equal(job.conclusion, "success");
  else
    assert.ok(
      ["success", "failure", "cancelled", "timed_out"].includes(job.conclusion),
    );
  if (retained) {
    assert.equal(job.id, retained.job.id);
    if (directory) verifyRetainedFiles(directory, retained);
  }
  return { artifact, run, jobs, retained };
}
