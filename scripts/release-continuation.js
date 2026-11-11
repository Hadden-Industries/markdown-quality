// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only admission of a public tuple after the owner's staged approvals. */
import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import {
  assertUbuntuJobLabel,
  ubuntuRunner,
  ubuntuRunnerPattern,
} from "./runner-policy.js";
import {
  hash,
  readJson,
  repository,
  verifyProvider,
} from "./release-assets.js";
import {
  releaseQualificationJobNames,
  releaseQualificationWorkflow,
  registryWorkflow,
} from "./release-qualification.js";
import {
  validatePublicationOrigins,
  stagingSteps,
} from "./publication-origins.js";
import { verifyArchiveBytes } from "./release-bytes.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import {
  authenticatePublicationAttempts,
  readPublicationAttempts,
  publicationWorkflow,
} from "./publication-attempts.js";

export function requireManualControl(env, workflow) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(
    env.GITHUB_WORKFLOW_REF,
    `${repository}/${workflow}@refs/heads/main`,
  );
  assert.match(env.GITHUB_SHA, /^[a-f0-9]{40}$/u);
}

export function providerFor(run, jobs, workflow, names, attempts) {
  const expected = {
    run: String(run.id),
    attempt: String(run.run_attempt),
    source: run.head_sha,
    workflow,
    event: "workflow_dispatch",
    jobs: names,
  };
  if (workflow === publicationWorkflow && attempts) {
    const observed = authenticatePublicationAttempts(run, attempts);
    assert.equal(run.head_branch, "main");
    assert.equal(run.event, expected.event);
    assert.deepEqual(
      jobs,
      observed.jobs,
      "Staging jobs differ from authenticated attempt history",
    );
    assert.equal(run.status, "completed");
    assert.equal(run.conclusion, "success");
    for (const job of jobs.jobs) {
      assert.equal(job.status, "completed");
      assert.equal(
        job.conclusion,
        "success",
        "The latest prerequisite execution must succeed",
      );
    }
  } else verifyProvider({ run, jobs }, expected);
  assert.deepEqual(
    jobs.jobs.map(({ name }) => name).sort(),
    [...names].sort(),
    "Unexpected or omitted release jobs",
  );
  for (const job of jobs.jobs) assert.equal(job.head_sha, run.head_sha);
  if (workflow === publicationWorkflow)
    for (const job of jobs.jobs) assertUbuntuJobLabel(job);
  return expected;
}

/** A green staging run is only evidence of requests; public approvals are checked separately. */
export function verifyStagingContinuation({
  release,
  manifestSha,
  origins,
  originsSha,
  candidate,
  stage,
}) {
  assert.equal(hash(Buffer.from(origins.bytes)), originsSha);
  const map = JSON.parse(origins.bytes);
  assert.equal(release.source.clean, true);
  assert.equal(release.source.head, candidate.run.head_sha);
  const qualification = providerFor(
    candidate.run,
    candidate.jobs,
    releaseQualificationWorkflow,
    releaseQualificationJobNames(
      release.qualificationMatrix,
      release.runtimePolicy,
    ),
  );
  assert.equal(stage.runnerPolicy?.source, stage.run.head_sha);
  assert.match(stage.runnerPolicy.ubuntu, ubuntuRunnerPattern);
  const staging = providerFor(
    stage.run,
    stage.jobs,
    ".github/workflows/publish.yml",
    [
      "admit",
      "review",
      "retained (windows-latest)",
      `retained (${stage.runnerPolicy.ubuntu})`,
      "stage",
    ],
    stage.attempts,
  );
  validatePublicationOrigins(
    map,
    {
      version: release.version,
      artifactSource: release.source.head,
      manifestSha,
      candidateRun: qualification.run,
      controlSource: staging.source,
      run: staging.run,
      attempt: staging.attempt,
      recovery: map.recovery,
    },
    release.archives,
  );
  assert.ok(
    map.recovery?.originsSha256,
    "Finalization requires the deliberate core continuation",
  );
  assert.deepEqual(
    map.records.slice(0, 2).map(({ state }) => state),
    ["retained", "retained"],
  );
  const effect = stage.jobs.jobs.find(({ name }) => name === "stage");
  const core = effect.steps.filter(({ name }) => name === stagingSteps[2]);
  assert.equal(core.length, 1);
  assert.equal(
    core[0].conclusion,
    map.records[2].state === "retained" ? "skipped" : "success",
    "Core stage must succeed once or be retained after public reconciliation",
  );
  return {
    schemaVersion: 2,
    qualification,
    staging,
    manifestSha256: manifestSha,
    originsSha256: originsSha,
    origins: map,
  };
}

export function readProvider(
  runId,
  attempt,
  gh = (args) => native("gh", args),
) {
  assert.match(String(runId), /^[1-9]\d{0,15}$/u);
  if (attempt) assert.match(String(attempt), /^[1-9]\d{0,15}$/u);
  const path = `repos/${repository}/actions/runs/${runId}${attempt ? `/attempts/${attempt}` : ""}`;
  const run = JSON.parse(gh(["api", path]));
  assert.equal(String(run.id), String(runId));
  if (run.path === publicationWorkflow) {
    const publication = readPublicationAttempts(runId, attempt, gh);
    const source = publication.run.head_sha;
    assert.match(source, /^[a-f0-9]{40}$/u);
    const path = "assets/node-support.json";
    const file = JSON.parse(
      gh(["api", `repos/${repository}/contents/${path}?ref=${source}`]),
    );
    assert.equal(file.path, path);
    assert.equal(file.encoding, "base64");
    const policy = JSON.parse(
      Buffer.from(file.content, "base64").toString("utf8"),
    );
    return {
      ...publication,
      runnerPolicy: { source, ubuntu: ubuntuRunner(policy) },
    };
  }
  const jobs = JSON.parse(
    gh([
      "api",
      `repos/${repository}/actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`,
    ]),
  );
  return { run, jobs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: release-continuation.js ARCHIVES PREVIOUS_STAGE",
  );
  requireManualControl(process.env, registryWorkflow);
  const [directory, previous] = process.argv
    .slice(2)
    .map((path) => resolve(path));
  const bytes = readFileSync(join(directory, "release-manifest.json"));
  assert.match(process.env.MANIFEST_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(hash(bytes), process.env.MANIFEST_SHA);
  const release = JSON.parse(bytes);
  assert.deepEqual(
    readFileSync(join(previous, "frozen-release/release-manifest.json")),
    bytes,
  );
  for (const archive of release.archives)
    verifyArchiveBytes(
      readFileSync(join(directory, archive.filename)),
      archive,
    );
  const candidate = readProvider(process.env.CANDIDATE_RUN);
  const stage = readProvider(
    process.env.STAGING_RUN,
    process.env.STAGING_ATTEMPT,
  );
  const originBytes = readFileSync(
    join(previous, "frozen-release/publication-origins.json"),
  );
  const context = verifyStagingContinuation({
    release,
    manifestSha: hash(bytes),
    origins: { bytes: originBytes },
    originsSha: process.env.ORIGINS_SHA,
    candidate,
    stage,
  });
  const api = (path) =>
    JSON.parse(native("gh", ["api", `repos/${repository}/${path}`]));
  assert.equal(
    api("git/ref/heads/main").object.sha,
    process.env.GITHUB_SHA,
    "Control branch advanced after dispatch",
  );
  const reference = api(`git/ref/tags/v${release.version}`);
  assert.equal(reference.object.type, "tag");
  const annotation = api(`git/tags/${reference.object.sha}`);
  verifyReleaseTag(reference, annotation, release);
  for (const [name, value] of Object.entries({
    "continuation.json": context,
    "candidate-provider.json": candidate,
    "staging-provider.json": stage,
    "signed-tag.json": { reference, annotation },
  }))
    writeFileSync(
      join(directory, name),
      JSON.stringify(value, null, 2) + "\n",
      { flag: "wx" },
    );
  writeFileSync(join(directory, "publication-origins.json"), originBytes, {
    flag: "wx",
  });
  for (const [name, value] of Object.entries({
    runtimes: JSON.stringify(release.qualificationMatrix),
    reference: release.runtimePolicy.reference,
    "consumer-npm": release.runtimePolicy.consumerNpm,
    source: release.source.head,
  }))
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
