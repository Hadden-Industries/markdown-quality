// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatePublicationAttempts,
  verifyFirstStagingAttempt,
  readPublicationAttempts,
  verifyNoPublicationEffects,
} from "../scripts/publication-attempts.js";
import {
  admitStagingAttempt,
  readPublicationHistory,
  verifyPublicationHistory,
} from "../scripts/publication-history.js";
import { downloadPublicationArtifact } from "../scripts/publication-artifact.js";
import { publicationHistoryFixture } from "./publication-history-fixture.js";
import { providerFor } from "../scripts/release-continuation.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

test("prewrite continuation admits only complete native proof and an authenticated admission artifact", async () => {
  const f = publicationHistoryFixture(1);
  Object.assign(f.run, { status: "completed", conclusion: "failure" });
  f.attempts[0].run = { ...f.run };
  f.set(1, [{ ...f.job(1, "skipped"), steps: [] }]);
  const request = { run: 11, attempt: 1, source: f.run.head_sha };
  verifyNoPublicationEffects(f, request);
  let downloaded = 0;
  const input = {
    run: f.run,
    attempt: 1,
    destination: "fixture",
    prewrite: f,
    read: async () => ({
      total_count: 1,
      artifacts: [{ id: 77, name: "publication-admission-1" }],
    }),
    download: async ({ id }) => {
      assert.equal(id, 77);
      downloaded++;
    },
  };
  assert.equal((await downloadPublicationArtifact(input)).admissionOnly, true);
  assert.equal(downloaded, 1);
  f.set(1, [f.job(1, "failure")]);
  await assert.rejects(
    () => downloadPublicationArtifact(input),
    /possible prior request/u,
  );
  assert.equal(
    downloaded,
    1,
    "A possible request cannot acquire admission-only evidence",
  );
  assert.throws(() =>
    verifyNoPublicationEffects(f, { ...request, attempt: 2 }),
  );
});

const context = (f) => ({
  repository: f.run.repository.full_name,
  event: "workflow_dispatch",
  ref: "refs/heads/main",
  workflowRef: `${f.run.repository.full_name}/${f.run.path}@refs/heads/main`,
  head: f.run.head_sha,
  publicationRun: String(f.run.id),
  publicationAttempt: String(f.run.run_attempt),
  job: "stage",
});

for (const attempt of [1, 2, 3])
  test(`attempt ${attempt} may make its first request after authenticated upstream/pre-write failures`, () => {
    const f = publicationHistoryFixture(attempt);
    if (attempt > 1) f.set(1, [{ ...f.job(1, "skipped"), steps: [] }]);
    if (attempt > 2)
      f.set(2, [{ ...f.job(2, "skipped"), conclusion: "failure" }]);
    verifyFirstStagingAttempt(f, context(f));
  });

for (const conclusion of ["success", "failure", "cancelled", "timed_out"])
  test(`a previous ${conclusion} request cannot be replayed even if the registry is absent`, () => {
    const f = publicationHistoryFixture();
    f.set(1, [f.job(1, conclusion)]);
    assert.throws(
      () => verifyFirstStagingAttempt(f, context(f)),
      /explicit recovery/u,
    );
  });

for (const fault of [
  "missing attempt",
  "truncated jobs",
  "duplicate jobs",
  "wrong source",
  "wrong run",
  "wrong workflow",
  "wrong repository",
  "unclosed attempt",
  "unresolved job",
  "missing steps",
  "contradictory skipped",
  "unresolved skipped step",
  "unknown outcome",
  "missing origin",
  "wrong attempt",
  "unbounded attempts",
  "missing current publisher",
  "wrong current publisher",
  "missing job name",
  "changed branch",
])
  test(`incomplete or uncertain attempt history fails closed: ${fault}`, () => {
    const f = publicationHistoryFixture();
    f.set(1, [{ ...f.job(1, "skipped"), conclusion: "failure" }]);
    const j = f.attempts[0].jobs.jobs[0];
    if (fault === "missing attempt") f.attempts.shift();
    if (fault === "truncated jobs") f.attempts[0].jobs.total_count++;
    if (fault === "duplicate jobs") f.set(1, [j, { ...j }]);
    if (fault === "wrong source") j.head_sha = "a".repeat(40);
    if (fault === "wrong run") j.run_id++;
    if (fault === "wrong workflow") f.run.path = ".github/workflows/ci.yml";
    if (fault === "wrong repository")
      f.run.repository = { full_name: "other/repo" };
    if (fault === "unclosed attempt") f.attempts[0].run.status = "in_progress";
    if (fault === "unresolved job") j.status = "in_progress";
    if (fault === "missing steps") j.steps.pop();
    if (fault === "contradictory skipped") {
      j.conclusion = "skipped";
      j.steps[0].conclusion = "success";
    }
    if (fault === "unresolved skipped step") j.steps[0].status = "in_progress";
    if (fault === "unknown outcome") j.steps[0].conclusion = null;
    if (fault === "missing origin") {
      j.steps[0].conclusion = "failure";
      delete j.runner_id;
    }
    if (fault === "wrong attempt") j.run_attempt = 2;
    if (fault === "unbounded attempts") f.run.run_attempt = 51;
    if (fault === "missing current publisher") f.set(2, []);
    if (fault === "wrong current publisher")
      f.attempts[1].jobs.jobs[0].name = "other";
    if (fault === "missing job name") delete j.name;
    if (fault === "changed branch") f.attempts[0].run.head_branch = "other";
    assert.throws(() => verifyFirstStagingAttempt(f, context(f)));
  });

test("retained copies keep the actual publishing attempt and latest failed prerequisites cannot hide", () => {
  const f = publicationHistoryFixture(3);
  const original = f.job(2);
  f.set(2, [original]);
  f.set(3, [{ ...original, id: 999, run_attempt: 3 }]);
  const observed = authenticatePublicationAttempts(f.run, f.attempts);
  assert.equal(observed.executions.length, 1);
  assert.equal(observed.jobs.jobs[0].run_attempt, 2);
  f.set(3, [f.job(3, "failure")]);
  assert.equal(
    authenticatePublicationAttempts(f.run, f.attempts).jobs.jobs[0].conclusion,
    "failure",
  );
  f.set(3, [
    {
      ...original,
      id: 999,
      run_attempt: 3,
      steps: original.steps.map((step, index) =>
        index ? step : { ...step, conclusion: "failure" },
      ),
    },
  ]);
  assert.throws(
    () => authenticatePublicationAttempts(f.run, f.attempts),
    /Retained.*changed/u,
  );
});

test("an upstream failure before runner allocation does not consume the publication opportunity", () => {
  const f = publicationHistoryFixture();
  f.set(1, [
    {
      ...f.job(1, "failure", "admit"),
      runner_id: 0,
      started_at: null,
      completed_at: null,
      steps: [],
    },
  ]);
  verifyFirstStagingAttempt(f, context(f));
});

test("later first writes rebind only planned origins while retaining native approvals and old sources", () => {
  const f = publicationHistoryFixture(2);
  const archives = ["win32-x64", "linux-x64", "core"].map((name) => ({
    name,
    package:
      "@hadden-industries/markdown-quality" +
      (name === "core" ? "" : `-${name}`),
    version: "2.0.0",
    filename: `hadden-industries-markdown-quality${name === "core" ? "" : `-${name}`}-2.0.0.tgz`,
    sha256: "a".repeat(64),
    integrity: "sha512-" + "a".repeat(86) + "==",
  }));
  const release = {
    version: "2.0.0",
    source: { head: "a".repeat(40) },
    archives,
  };
  const manifestSha = "c".repeat(64);
  const recovery = { run: "9", attempt: "1", originsSha256: "d".repeat(64) };
  const map = {
    schemaVersion: 1,
    version: release.version,
    artifactSource: release.source.head,
    manifestSha,
    candidateRun: "7",
    controlSource: f.run.head_sha,
    run: "11",
    attempt: "1",
    recovery,
    records: archives.map(({ package: name }, index) => ({
      package: name,
      source: index < 2 ? release.source.head : f.run.head_sha,
      run: index < 2 ? "9" : "11",
      attempt: "1",
      state: index < 2 ? "retained" : "planned",
    })),
  };
  const input = {
    release,
    map,
    manifestSha,
    history: [f],
    context: {
      ...context(f),
      runId: "7",
      phase: "core",
      recoveryRun: recovery.run,
      recoveryAttempt: recovery.attempt,
      recoveryOriginsSha: recovery.originsSha256,
    },
  };
  const admitted = admitStagingAttempt(input);
  assert.equal(admitted.attempt, "2");
  assert.deepEqual(admitted.records.slice(0, 2), map.records.slice(0, 2));
  assert.equal(admitted.records[2].attempt, "2");
  assert.equal(map.records[2].attempt, "1", "Original admission is preserved");
  f.set(1, [f.job(1)]);
  assert.throws(() => admitStagingAttempt(input), /explicit recovery/u);
  f.set(1, []);
  const previousJob = f.job(1, "failure");
  previousJob.run_id = 77;
  previousJob.steps[0].conclusion = previousJob.steps[1].conclusion = "skipped";
  assert.throws(
    () =>
      admitStagingAttempt({
        ...input,
        history: [
          f,
          {
            run: { ...f.run, id: 77, status: "completed" },
            jobs: { total_count: 1, jobs: [previousJob] },
            manifestBytes: Buffer.from(JSON.stringify(release)),
          },
        ],
      }),
    /replay/u,
    "A retained admission cannot hide a newer dispatch's request",
  );
});

test("successful mixed-attempt staging prerequisites retain their actual origins and newer failures block", () => {
  const f = publicationHistoryFixture(2);
  f.run.status = "completed";
  f.run.conclusion = "success";
  f.attempts[1].run = { ...f.run };
  const names = [
    "admit",
    "review",
    "retained (windows-latest)",
    "retained (ubuntu-24.04)",
    "stage",
  ];
  const earlier = names.slice(0, -1).map((name, index) => ({
    ...f.job(1, "success", name),
    id: 100 + index,
    labels: name === "retained (ubuntu-24.04)" ? ["ubuntu-24.04"] : [],
  }));
  f.set(1, earlier);
  f.set(2, [
    ...earlier.map((job) => ({ ...job, id: job.id + 400, run_attempt: 2 })),
    f.job(2),
  ]);
  let observed = authenticatePublicationAttempts(f.run, f.attempts);
  providerFor(f.run, observed.jobs, f.run.path, names, f.attempts);
  assert.equal(
    observed.jobs.jobs.find((job) => job.name === "review").run_attempt,
    1,
  );
  assert.equal(
    observed.jobs.jobs.find((job) => job.name === "stage").run_attempt,
    2,
  );
  f.attempts[1].jobs.jobs[1] = { ...f.job(2, "failure", "review"), id: 201 };
  observed = authenticatePublicationAttempts(f.run, f.attempts);
  assert.throws(
    () => providerFor(f.run, observed.jobs, f.run.path, names, f.attempts),
    /latest prerequisite/u,
  );
});

for (const fault of [
  "missing",
  "conditional",
  "soft failure",
  "late",
  "wrong token",
  "attempt counter",
  "mutable admission",
  "mutable review",
])
  test(`workflow refuses publication-history bypass: ${fault}`, () => {
    const document = parse(
      readFileSync(
        new URL("../.github/workflows/publish.yml", import.meta.url),
        "utf8",
      ),
    );
    const steps = document.jobs.stage.steps;
    const guard = steps.find((step) => step.id === "staging_history");
    if (fault === "missing") steps.splice(steps.indexOf(guard), 1);
    if (fault === "conditional") guard.if = "github.run_attempt == 1";
    if (fault === "soft failure") guard["continue-on-error"] = true;
    if (fault === "late") {
      steps.splice(steps.indexOf(guard), 1);
      steps.push(guard);
    }
    if (fault === "wrong token") guard.env.GH_TOKEN = "foreign";
    if (fault === "attempt counter")
      steps.find(
        (step) => step.name === "Stage coherent core under reviewed channel",
      ).if = "github.run_attempt == 1";
    if (fault === "mutable admission") {
      const transfer = steps.find(
        (step) =>
          step.with?.["artifact-ids"] ===
          "${{ needs.admit.outputs.artifact-id }}",
      );
      delete transfer.with["artifact-ids"];
      transfer.with.name = "publication-admission-${{ github.run_attempt }}";
    }
    if (fault === "mutable review")
      document.jobs.decision.outputs["artifact-id"] =
        "${{ github.run_attempt }}";
    assert.throws(() =>
      checkWorkflows({
        overrides: { ".github/workflows/publish.yml": stringify(document) },
      }),
    );
  });

test("attempt collection uses bounded attempt-specific inventories and detects a changed run", () => {
  const f = publicationHistoryFixture();
  const gh = (args) => {
    const match = /attempts\/(\d+)(\/jobs\?per_page=100)?$/u.exec(args[1]);
    return JSON.stringify(
      match
        ? match[2]
          ? f.attempts[Number(match[1]) - 1].jobs
          : f.attempts[Number(match[1]) - 1].run
        : f.run,
    );
  };
  assert.equal(readPublicationAttempts(11, undefined, gh).attempts.length, 2);
  let calls = 0;
  assert.throws(() =>
    readPublicationAttempts(11, undefined, (args) => {
      if (args[1].endsWith("runs/11") && ++calls === 2)
        return JSON.stringify({ ...f.run, run_attempt: 3 });
      return gh(args);
    }),
  );
});

test("cross-run history downloads the original write even after retained copies or newer pre-write failures", async () => {
  const current = publicationHistoryFixture(1);
  current.run = { ...current.run, id: 44 };
  const previous = publicationHistoryFixture(3);
  previous.run.status = "completed";
  previous.run.conclusion = "success";
  previous.attempts[2].run = { ...previous.run };
  const original = previous.job(2);
  previous.set(2, [original]);
  const gh = (args) => {
    if (args[1].includes("workflows/publish.yml/runs"))
      return JSON.stringify([
        { total_count: 2, workflow_runs: [current.run, previous.run] },
      ]);
    const match =
      /runs\/(\d+)(?:\/attempts\/(\d+))?(\/jobs\?per_page=100)?$/u.exec(
        args[1],
      );
    assert.ok(match, args[1]);
    const selected = Number(match[1]) === current.run.id ? current : previous;
    if (match[3])
      return JSON.stringify(
        Number(match[1]) === current.run.id
          ? { total_count: 0, jobs: [] }
          : selected.attempts[Number(match[2]) - 1].jobs,
      );
    return JSON.stringify(
      match[2] ? selected.attempts[Number(match[2]) - 1].run : selected.run,
    );
  };
  for (const retained of [true, false]) {
    previous.set(3, [
      retained
        ? { ...original, id: 999, run_attempt: 3 }
        : { ...previous.job(3, "skipped"), conclusion: "failure" },
    ]);
    let origin;
    const history = await readPublicationHistory(
      44,
      gh,
      async ({ attempt, destination }) => {
        origin = attempt;
        mkdirSync(join(destination, "frozen-release"), { recursive: true });
        writeFileSync(
          join(destination, "frozen-release/release-manifest.json"),
          '{"version":"2.0.0"}',
        );
      },
    );
    assert.equal(origin, 2);
    assert.equal(
      history.find(({ run }) => run.id === 11).jobs.jobs[0].run_attempt,
      2,
    );
  }
  previous.set(1, [previous.job(1)]);
  await assert.rejects(
    readPublicationHistory(44, gh, async () =>
      assert.fail("Ambiguous writes cannot acquire artifacts"),
    ),
    /Multiple publication/u,
  );
});

test("completed off-branch no-write dispatches do not block later main staging", async () => {
  const current = publicationHistoryFixture(1);
  const other = publicationHistoryFixture(1);
  Object.assign(other.run, {
    id: 12,
    head_branch: "feature/no-publication",
    status: "completed",
    conclusion: "success",
  });
  other.attempts[0].run = { ...other.run };
  other.set(
    1,
    ["admit", "review", "stage"].map((name, index) => ({
      ...other.job(1, "skipped", name),
      id: 100 + index,
      runner_id: 0,
      steps: [],
    })),
  );
  const gh = (args) => {
    if (args[1].includes("workflows/publish.yml/runs"))
      return JSON.stringify([
        { total_count: 2, workflow_runs: [current.run, other.run] },
      ]);
    const selected = args[1].includes("/runs/12") ? other : current;
    return JSON.stringify(
      args[1].includes("/jobs?") ? selected.attempts[0].jobs : selected.run,
    );
  };
  const download = async () =>
    assert.fail("No-write histories have no publication artifact to acquire");
  const history = await readPublicationHistory(11, gh, download);
  verifyPublicationHistory(
    { version: "2.0.0", archives: [] },
    {
      run: "11",
      attempt: "1",
      controlSource: current.run.head_sha,
      records: [],
    },
    history,
  );
  other.set(1, [other.job(1, "failure")]);
  await assert.rejects(
    readPublicationHistory(11, gh, download),
    /Historical writes require main/u,
  );
  current.run.head_branch = "feature/no-publication";
  current.attempts[0].run.head_branch = current.run.head_branch;
  assert.throws(
    () => verifyFirstStagingAttempt(current, context(current)),
    /Current publisher requires main/u,
  );
});

test("artifact selection preserves original attempt names and legacy recovery with authenticated download", async () => {
  const f = publicationHistoryFixture();
  for (const name of [
    "publication-source-and-manifest-2",
    "publication-source-and-manifest",
  ]) {
    let downloaded;
    await downloadPublicationArtifact({
      run: f.run,
      attempt: 2,
      destination: "fixture",
      read: async () => ({ total_count: 1, artifacts: [{ id: 7, name }] }),
      download: async (input) => {
        downloaded = input;
      },
    });
    assert.equal(downloaded.id, 7);
    assert.equal(downloaded.runId, 11);
    assert.equal(downloaded.headSha, f.run.head_sha);
    assert.equal(downloaded.repositoryId, 3);
  }
  for (const result of [
    { total_count: 1, artifacts: [] },
    { total_count: 0, artifacts: [] },
    {
      total_count: 1,
      artifacts: [{ id: 7, name: "publication-source-and-manifest-1" }],
    },
    {
      total_count: 2,
      artifacts: [
        { id: 7, name: "publication-source-and-manifest-2" },
        { id: 8, name: "publication-source-and-manifest-2" },
      ],
    },
  ])
    await assert.rejects(
      downloadPublicationArtifact({
        run: f.run,
        attempt: 2,
        destination: "fixture",
        read: async () => result,
        download: async () =>
          assert.fail("Uncertain artifact must not download"),
      }),
    );
});

test("publication artifact lookup handles complete multi-page histories without name fallback on download failure", async () => {
  const f = publicationHistoryFixture();
  const first = Array.from({ length: 100 }, (_, index) => ({
    id: index + 100,
    name: `prior-${index}`,
  }));
  const selected = { id: 7, name: "publication-source-and-manifest-2" };
  const paths = [];
  let actual;
  await downloadPublicationArtifact({
    run: f.run,
    attempt: 2,
    destination: "fixture",
    read: async (path) => {
      paths.push(path);
      return {
        total_count: 101,
        artifacts: path.endsWith("page=1") ? first : [selected],
      };
    },
    download: async (input) => {
      actual = input.id;
    },
  });
  assert.equal(paths.length, 2);
  assert.equal(actual, 7);
  let downloads = 0;
  await assert.rejects(
    downloadPublicationArtifact({
      run: f.run,
      attempt: 2,
      destination: "fixture",
      read: async () => ({
        total_count: 2,
        artifacts: [
          selected,
          { id: 8, name: "publication-source-and-manifest" },
        ],
      }),
      download: async () => {
        downloads++;
        throw new Error("expired or digest mismatch");
      },
    }),
    /expired or digest/u,
  );
  assert.equal(
    downloads,
    1,
    "A conflicting modern artifact cannot fall back to older ownership",
  );
});
