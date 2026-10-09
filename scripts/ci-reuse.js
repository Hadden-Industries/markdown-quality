// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { qualificationMatrix } from "./node-matrix.js";

export const repository = "Hadden-Industries/markdown-quality";
export const workflow = ".github/workflows/check.yml";
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const id = (value) => Number.isSafeInteger(value) && value > 0;
const digest = (value) => /^sha256:[a-f0-9]{64}$/u.test(value ?? "");
const equal = (left, right, message) =>
  assert.ok(isDeepStrictEqual(left, right), message);
const sameRepository = (value, context) =>
  value?.id === context.repositoryId && value.full_name === repository;
const time = (value) => {
  const result = Date.parse(value);
  assert.ok(Number.isFinite(result));
  return result;
};

/** Resolve the closed lane inventory from the existing Node-support policy. */
export function matrixLanes(matrix) {
  assert.ok(Array.isArray(matrix?.node) && matrix.node.length <= 12);
  equal(
    matrix,
    qualificationMatrix(matrix.node.map((node) => ({ version: `v${node}` }))),
  );
  assert.equal(new Set(matrix.node).size, matrix.node.length);
  return matrix.os.flatMap((os) => matrix.node.map((node) => ({ os, node })));
}

/** Explicit job names are shared by receipts, provider inventory and workflow governance. */
export function jobNames(matrix) {
  const lanes = matrixLanes(matrix);
  return [
    "matrix",
    ...lanes.map((lane) => `probe (${lane.os}, ${lane.node})`),
    "strategy",
    ...lanes.map((lane) => `package (${lane.os}, ${lane.node})`),
    "required",
  ];
}

function validateContext(context) {
  assert.equal(context.repository, repository);
  assert.ok(
    id(context.repositoryId) && id(context.runId) && id(context.runAttempt),
  );
  assert.equal(context.snapshot.commit, context.sha);
  for (const key of ["commit", "tree", "workflow"])
    assert.ok(sha(context.snapshot[key]));
  assert.ok(
    Array.isArray(context.snapshot.parents) &&
      context.snapshot.parents.every(sha),
  );
}

function validateHost(host, lane) {
  assert.equal(host?.node, `v${lane.node}`);
  assert.equal(host.os, lane.os === "windows-latest" ? "Windows" : "Linux");
  assert.equal(host.arch, "X64");
  assert.match(
    host.image,
    lane.os === "windows-latest" ? /^win\d+$/u : /^ubuntu24$/u,
  );
  assert.match(host.imageVersion, /^\d{8}\.\d+(?:\.\d+)?$/u);
  assert.match(host.npm, /^\d+\.\d+\.\d+$/u);
  assert.match(host.python, /^Python 3\.14\.\d+$/u);
}

/** Admit only bounded, complete lane records belonging to this checkout and attempt. */
export function validateLanes(lanes, context, matrix) {
  const expected = matrixLanes(matrix);
  assert.equal(lanes.length, expected.length, "Incomplete lane inventory");
  return expected.map((lane) => {
    const matches = lanes.filter((record) =>
      isDeepStrictEqual(record.lane, lane),
    );
    assert.equal(matches.length, 1, "Missing or duplicated lane");
    const record = matches[0];
    assert.equal(record.schemaVersion, 1);
    for (const key of ["repository", "repositoryId", "runId", "runAttempt"])
      assert.equal(record[key], context[key]);
    equal(record.snapshot, context.snapshot, "Lane checkout differs");
    validateHost(record.host, lane);
    return record;
  });
}

/** Successful local graph results are required independently of reuse selection. */
export function requireResults(needs, reused = false) {
  equal(Object.keys(needs).sort(), ["matrix", "package", "probe", "strategy"]);
  for (const name of reused ? ["matrix", "probe", "strategy"] : ["matrix"])
    assert.equal(needs[name].result, "success", `${name} did not succeed`);
  assert.equal(
    needs.package.result,
    reused ? "skipped" : "success",
    "Package jobs did not establish the selected mode",
  );
}

/** Retain only fresh, fully executed PR qualification; never produce a reuse chain. */
export function createReceipt({
  context,
  matrix,
  lanes,
  needs,
  now = Date.now(),
}) {
  validateContext(context);
  assert.equal(context.eventName, "pull_request");
  const pr = context.event.pull_request;
  assert.ok(id(context.event.number));
  assert.equal(pr.base.ref, "main");
  equal(
    context.snapshot.parents,
    [pr.base.sha, pr.head.sha],
    "Not the tested PR integration",
  );
  requireResults(needs);
  for (const name of ["probe", "strategy"])
    assert.equal(
      needs[name].result,
      "success",
      "Optional evidence graph cannot seed a receipt after failure",
    );
  return {
    schemaVersion: 1,
    mode: "FULL",
    repository,
    repositoryId: context.repositoryId,
    runId: context.runId,
    runAttempt: context.runAttempt,
    pullRequest: context.event.number,
    recordedAt: new Date(now).toISOString(),
    snapshot: context.snapshot,
    matrix,
    jobs: jobNames(matrix),
    lanes: validateLanes(lanes, context, matrix),
  };
}

function assertPush(context) {
  validateContext(context);
  assert.equal(
    context.eventName,
    "push",
    "PR events always require full package tests",
  );
  const event = context.event;
  assert.equal(event.ref, "refs/heads/main");
  assert.equal(event.repository.default_branch, "main");
  assert.ok(sameRepository(event.repository, context));
  assert.equal(event.after, context.sha);
  for (const flag of ["forced", "created", "deleted"])
    assert.equal(
      event[flag],
      false,
      `Push flag ${flag} requires full package tests`,
    );
  assert.equal(
    context.snapshot.parents.length,
    2,
    "Only ordinary PR merges are reusable",
  );
  assert.equal(
    context.snapshot.parents[0],
    event.before,
    "Push contains more than the single merge",
  );
}

function assertPull(pr, context) {
  assert.ok(id(pr.number));
  assert.equal(pr.merged, true);
  assert.equal(pr.merge_commit_sha, context.sha);
  assert.equal(pr.base.ref, "main");
  assert.equal(pr.base.sha, context.snapshot.parents[0]);
  assert.equal(pr.head.sha, context.snapshot.parents[1]);
  assert.ok(
    sameRepository(pr.base.repo, context) &&
      sameRepository(pr.head.repo, context),
    "Foreign repository evidence",
  );
}

function assertRun(run, context, pr, now) {
  assert.ok(id(run.id) && id(run.run_attempt));
  assert.ok(
    sameRepository(run.repository, context) &&
      sameRepository(run.head_repository, context),
  );
  assert.equal(run.event, "pull_request");
  assert.equal(run.path, workflow);
  assert.equal(run.head_sha, pr.head.sha);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.ok(time(run.created_at) <= time(run.run_started_at));
  assert.ok(
    time(run.run_started_at) <= time(run.updated_at) &&
      time(run.updated_at) <= now,
  );
}

function assertArtifact(artifact, run, context, now) {
  assert.ok(id(artifact.id) && digest(artifact.digest));
  assert.equal(artifact.name, `package-proof-${run.id}-${run.run_attempt}`);
  assert.equal(artifact.expired, false);
  assert.ok(
    time(artifact.created_at) >= time(run.run_started_at) &&
      time(artifact.created_at) <= time(run.updated_at),
  );
  assert.ok(time(artifact.expires_at) > now);
  equal(
    artifact.workflow_run,
    {
      id: run.id,
      repository_id: context.repositoryId,
      head_repository_id: context.repositoryId,
      head_branch: run.head_branch,
      head_sha: run.head_sha,
    },
    "Artifact owner differs",
  );
}

/** Bounded read-only discovery; callers turn all uncertainty into fresh testing. */
export async function selectProof({ context, read, now = Date.now() }) {
  assertPush(context);
  const prs = await read(`/commits/${context.sha}/pulls?per_page=100`);
  assert.ok(Array.isArray(prs) && prs.length < 100, "Ambiguous PR inventory");
  const matching = prs.filter(
    (pr) => pr.merged_at != null && pr.merge_commit_sha === context.sha,
  );
  assert.equal(matching.length, 1, "No unique merged PR matches this push");
  const pr = await read(`/pulls/${matching[0].number}`);
  assertPull(pr, context);
  const inventory = await read(
    `/actions/workflows/check.yml/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`,
  );
  assert.ok(
    Array.isArray(inventory.workflow_runs) &&
      inventory.total_count === inventory.workflow_runs.length &&
      inventory.total_count > 0 &&
      inventory.total_count < 100,
  );
  const run = [...inventory.workflow_runs].sort(
    (left, right) => right.id - left.id,
  )[0];
  assertRun(run, context, pr, now);
  const artifacts = await read(
    `/actions/runs/${run.id}/artifacts?per_page=100`,
  );
  assert.ok(
    Array.isArray(artifacts.artifacts) &&
      artifacts.total_count === artifacts.artifacts.length &&
      artifacts.total_count < 100,
  );
  const proof = artifacts.artifacts.filter(
    (artifact) =>
      artifact.name === `package-proof-${run.id}-${run.run_attempt}`,
  );
  assert.equal(proof.length, 1);
  assertArtifact(proof[0], run, context, now);
  return { pr, run, artifact: proof[0] };
}

/** Independently bind the transported receipt to current GitHub state and current hosts. */
export async function verifyProof({
  context,
  matrix,
  hosts,
  selection,
  receipt,
  read,
  now = Date.now(),
}) {
  assertPush(context);
  validateLanes(hosts, context, matrix);
  const pr = await read(`/pulls/${selection.pr.number}`);
  assertPull(pr, context);
  const run = await read(`/actions/runs/${selection.run.id}`);
  assertRun(run, context, pr, now);
  assert.equal(
    run.run_attempt,
    selection.run.run_attempt,
    "Source run was rerun",
  );
  const artifact = await read(`/actions/artifacts/${selection.artifact.id}`);
  assertArtifact(artifact, run, context, now);
  assert.equal(
    artifact.digest,
    selection.artifact.digest,
    "Artifact digest changed",
  );
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.mode, "FULL");
  for (const [key, expected] of Object.entries({
    repository,
    repositoryId: context.repositoryId,
    runId: run.id,
    runAttempt: run.run_attempt,
    pullRequest: pr.number,
  }))
    assert.equal(receipt[key], expected);
  assert.ok(
    time(receipt.recordedAt) >= time(run.run_started_at) &&
      time(receipt.recordedAt) <= time(artifact.created_at),
  );
  equal(receipt.matrix, matrix, "Selected runtime matrix changed");
  equal(receipt.jobs, jobNames(matrix), "Workflow job inventory differs");
  assert.ok(sha(receipt.snapshot?.commit));
  equal(
    { ...receipt.snapshot, commit: context.sha },
    context.snapshot,
    "Tree, parents or workflow differ",
  );
  const tested = await read(`/git/commits/${receipt.snapshot.commit}`);
  assert.equal(tested.sha, receipt.snapshot.commit);
  assert.equal(tested.tree?.sha, context.snapshot.tree);
  equal(
    tested.parents?.map((parent) => parent.sha),
    context.snapshot.parents,
    "Tested integration parents differ",
  );
  const proofContext = {
    ...context,
    sha: receipt.snapshot.commit,
    snapshot: receipt.snapshot,
    runId: run.id,
    runAttempt: run.run_attempt,
  };
  const executed = validateLanes(receipt.lanes, proofContext, matrix);
  for (const current of hosts)
    equal(
      executed.find((record) => isDeepStrictEqual(record.lane, current.lane))
        .host,
      current.host,
      "Hosted runtime or runner image changed",
    );
  const jobs = await read(
    `/actions/runs/${run.id}/jobs?filter=latest&per_page=100`,
  );
  assert.equal(jobs.total_count, receipt.jobs.length);
  assert.equal(jobs.jobs.length, jobs.total_count);
  equal(
    jobs.jobs.map((job) => job.name).sort(),
    [...receipt.jobs].sort(),
    "Missing or extra source jobs",
  );
  for (const job of jobs.jobs) {
    assert.ok(id(job.id));
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, run.run_attempt, "Mixed source attempts");
    assert.equal(job.head_sha, run.head_sha);
    assert.equal(job.status, "completed");
    assert.equal(
      job.conclusion,
      "success",
      "Source job did not execute successfully",
    );
  }
  const finalRun = await read(`/actions/runs/${run.id}`);
  assertRun(finalRun, context, pr, now);
  assert.equal(
    finalRun.run_attempt,
    run.run_attempt,
    "Source run changed during admission",
  );
  const finalArtifact = await read(`/actions/artifacts/${artifact.id}`);
  assertArtifact(finalArtifact, finalRun, context, now);
  assert.equal(finalArtifact.digest, artifact.digest);
  return {
    mode: "REUSED",
    sourceRun: run.id,
    sourceAttempt: run.run_attempt,
    sourceCommit: receipt.snapshot.commit,
    artifactId: artifact.id,
    artifactDigest: artifact.digest,
  };
}
