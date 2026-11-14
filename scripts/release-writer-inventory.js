// SPDX-License-Identifier: AGPL-3.0-only
/** Independent writer expectations from protected main and immutable owner-signed intent tags. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { native } from "./commands.js";
import { verifyOwnerTagSignature } from "./release-signature.js";

export const writerBaseline = JSON.parse(
  readFileSync(new URL("./release-writer-baseline.json", import.meta.url)),
);
const repository = "Hadden-Industries/markdown-quality";
export const writerJobs = {
  publish: ["stage", "publish"],
  "github-release": ["archive", "Read-only archive completion"],
  "promote-release": [
    "admit",
    "npm",
    "github",
    "Read-only release completion",
    "reconcile",
  ],
};
const intentPrefix = "refs/tags/release-history-intent-";
const positive = (n) => Number.isSafeInteger(n) && n > 0;

function workflowIdentity(run) {
  const name = /^\.github\/workflows\/([a-z-]+)\.yml$/u.exec(run.path)?.[1];
  assert.ok(Object.hasOwn(writerBaseline, name), "Unknown release workflow");
  assert.equal(run.workflow_id, writerBaseline[name].workflowId);
  assert.equal(run.repository.full_name, repository);
  assert.ok(positive(run.repository.id));
  assert.ok([run.id, run.run_number, run.run_attempt].every(positive));
  assert.match(run.head_sha, /^[0-9a-f]{40}$/u);
  return name;
}

export function outsideWriterRef(run) {
  workflowIdentity(run);
  assert.ok(typeof run.head_branch === "string" && run.head_branch.length);
  assert.ok(typeof run.head_repository?.full_name === "string");
  return (
    run.head_branch !== "main" || run.head_repository.full_name !== repository
  );
}

export function writerWorkflow(run) {
  const name = workflowIdentity(run);
  assert.equal(run.head_repository.full_name, repository);
  assert.equal(run.head_repository.id, run.repository.id);
  assert.equal(
    run.head_branch,
    "main",
    "Release evidence requires protected main",
  );
  assert.ok(
    run.event === "workflow_dispatch" ||
      (name === "publish" &&
        run.event === "push" &&
        writerBaseline[name].runs[run.run_number - 1] === run.id),
  );
  return name;
}

export function sameWriterRun(left, right) {
  for (const key of [
    "id",
    "workflow_id",
    "run_number",
    "head_sha",
    "event",
    "path",
    "head_branch",
  ])
    assert.equal(
      left[key],
      right[key],
      "Original workflow run identity changed",
    );
  assert.equal(left.repository.id, right.repository.id);
  assert.equal(left.head_repository.id, right.head_repository.id);
}

export function readWriterIntents(gh, verify = verifyOwnerTagSignature) {
  const pages = JSON.parse(
    gh([
      "api",
      `repos/${repository}/git/matching-refs/${intentPrefix.slice(5)}?per_page=100`,
      "--paginate",
      "--slurp",
    ]),
  );
  const intents = [];
  assert.ok(
    Array.isArray(pages) && pages.length > 0 && pages.every(Array.isArray),
    "Missing protected intent ref inventory",
  );
  for (const reference of pages.flat()) {
    assert.ok(reference.ref.startsWith(intentPrefix));
    const fields = /^([a-z-]+)-([1-9]\d*)-([1-9]\d*)-([0-9a-f]{64})$/u.exec(
      reference.ref.slice(intentPrefix.length),
    );
    assert.ok(fields, "Malformed protected release intent");
    const [, workflow, number, attempt, decision] = fields;
    assert.ok(Object.hasOwn(writerBaseline, workflow));
    assert.ok([Number(number), Number(attempt)].every(positive));
    assert.equal(reference.object.type, "tag");
    assert.match(reference.object.sha, /^[0-9a-f]{40}$/u);
    const tag = JSON.parse(
      gh(["api", `repos/${repository}/git/tags/${reference.object.sha}`]),
    );
    assert.equal(tag.sha, reference.object.sha);
    assert.equal(tag.tag, reference.ref.slice("refs/tags/".length));
    assert.equal(tag.object.type, "commit");
    assert.match(tag.object.sha, /^[0-9a-f]{40}$/u);
    verify(tag);
    intents.push({
      workflow,
      number: Number(number),
      attempt: Number(attempt),
      decision,
      controller: tag.object.sha,
    });
  }
  return intents;
}

export function protectedControllerHistory(sha, command = native) {
  assert.match(sha, /^[0-9a-f]{40}$/u);
  return new Set(
    command("git", ["rev-list", "--first-parent", sha]).trim().split(/\s+/u),
  );
}

// GitHub permits reruns for 30 days after initial creation. A signed snapshot
// taken while the original controller could still be rerun cannot close it.
export function legacyRunClosed(run, observedAt) {
  const created = Date.parse(run.created_at);
  return (
    run.status === "completed" &&
    Number.isFinite(created) &&
    observedAt > created + 30 * 24 * 60 * 60 * 1000
  );
}

/** Account for every reserved attempt, even if its run is absent from all live workflow pages. */
export function verifyWriterInventory(
  workflow,
  runs,
  checkpoints,
  intents,
  env,
  requireIntent,
  baseline = writerBaseline,
) {
  const visible = new Map();
  for (const run of runs) {
    assert.ok(
      positive(run.run_number) && !visible.has(run.run_number),
      "Ambiguous workflow run number",
    );
    visible.set(run.run_number, run);
  }
  const observations = checkpoints.flatMap(
    (checkpoint) => checkpoint.writerAttempts ?? [],
  );
  const reservations = intents.filter((entry) => entry.workflow === workflow);
  const current = runs.find((run) => String(run.id) === env.GITHUB_RUN_ID);
  const expected = baseline[workflow].runs.map((id, index) => ({
    number: index + 1,
    attempt: 1,
    id,
  }));
  for (const entry of [...expected, ...reservations]) {
    const run = visible.get(entry.number);
    if (run) {
      assert.ok(
        run.run_attempt >= entry.attempt,
        "Reserved release attempt has not run",
      );
      assert.equal(run.workflow_id, baseline[workflow].workflowId);
      if (entry.id) {
        assert.equal(run.id, entry.id);
        writerWorkflow(run);
      }
      // A dispatch on another ref can consume a reserved number. Its actual
      // producer is still checked by the collector and it cannot use this intent.
      continue;
    }
    if (entry.id) {
      const closures = checkpoints
        .flatMap((checkpoint) => checkpoint.closedWriterRuns ?? [])
        .filter(({ run }) => run.id === entry.id);
      assert.ok(
        closures.length,
        "Missing legacy run needs a signed inventory collected after its rerun window",
      );
      for (const { run: final, observedAt } of closures) {
        writerWorkflow(final);
        assert.ok(
          legacyRunClosed(final, observedAt) &&
            final.run_number === entry.number &&
            final.path === `.github/workflows/${workflow}.yml`,
        );
        const attempts = observations.filter(({ run }) => run.id === final.id);
        for (let attempt = 1; attempt <= final.run_attempt; attempt++) {
          const original = attempts.find(
            ({ run }) => run.run_attempt === attempt,
          );
          assert.ok(original, "Signed history omits a legacy writer attempt");
          sameWriterRun(final, original.run);
        }
      }
    } else if (
      checkpoints.some((checkpoint) =>
        (checkpoint.nonWriterRuns ?? []).some(
          (run) =>
            outsideWriterRef(run) &&
            run.path === `.github/workflows/${workflow}.yml` &&
            run.run_number === entry.number,
        ),
      )
    )
      continue;
    const proof = observations
      .map((record) => record.run)
      .filter(
        (r) =>
          r.path === `.github/workflows/${workflow}.yml` &&
          r.run_number === entry.number &&
          r.run_attempt === entry.attempt,
      );
    assert.ok(
      proof.length,
      "Expected release run is missing; supply its complete signed attempt inventory",
    );
    for (const original of proof) {
      writerWorkflow(original);
      assert.equal(original.id, entry.id ?? proof[0].id);
      sameWriterRun(original, proof[0]);
    }
  }
  if (
    requireIntent &&
    env.GITHUB_WORKFLOW_REF ===
      `${repository}/.github/workflows/${workflow}.yml@refs/heads/main`
  ) {
    assert.ok(
      current &&
        current.head_sha === env.GITHUB_SHA &&
        current.run_attempt === Number(env.GITHUB_RUN_ATTEMPT) &&
        current.run_number === Number(env.GITHUB_RUN_NUMBER),
      "Missing current protected writer attempt",
    );
    writerWorkflow(current);
    assert.ok(
      reservations.some(
        (intent) =>
          intent.number === current.run_number &&
          intent.attempt === current.run_attempt &&
          intent.controller === current.head_sha &&
          intent.decision === env.OPERATION_SHA,
      ),
      "Writer requires an owner-signed intent for this controller, decision and attempt",
    );
  }
}
