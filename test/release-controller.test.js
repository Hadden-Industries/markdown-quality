// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  releaseFixture,
  interruptedStagingFixture,
  stageInventory,
} from "./release-fixture.js";
import { authenticateStagingRecovery } from "../scripts/release-staging-recovery.js";
import { runReleaseController } from "../scripts/release-controller.js";
import { releasePackages } from "../scripts/release-coordinates.js";
import { hash } from "../scripts/release-bytes.js";
import { admitServiceArtifact } from "../scripts/promotion-handoff.js";
import {
  verifyRecoveryAttribution,
  verifyActiveOperations,
  completedStagingRecovery,
} from "../scripts/release-history.js";
import { verifyEffectJournal } from "../scripts/release-effects.js";
import { readReleaseOperation } from "../scripts/release-operation.js";
import { reconcileReleaseEffect } from "../scripts/reconcile-release-effect.js";

const repository = "Hadden-Industries/markdown-quality";
function fixture(t, change = () => {}, version) {
  const f = releaseFixture(t, true, version ? "latest" : undefined, version),
    root = dirname(f.directory),
    input = join(root, "archive-inputs");
  mkdirSync(input);
  cpSync(f.directory, join(input, "bundle"), { recursive: true });
  const qualifiedBytes = Buffer.from(
    JSON.stringify(f.qualified, null, 2) + "\n",
  );
  writeFileSync(join(input, "qualification.json"), qualifiedBytes);
  const labels = Object.fromEntries(
    releasePackages.map((name) => [name, "1.0.1"]),
  );
  const operation = {
    schemaVersion: 1,
    repository,
    owner: "maksymshostak",
    controller: f.qualified.source,
    source: f.qualified.source,
    version: f.qualified.version,
    manifestSha256: f.qualified.manifestSha256,
    qualificationSha256: hash(qualifiedBytes),
    operationId: "test-family",
    acceptedAt: "2026-11-13T00:00:00Z",
    operation: "promote",
    releaseId: 70,
    priorGithubLatest: 60,
    targetGithubLatest: 70,
    priorPrerelease: true,
    targetPrerelease: false,
    label: "latest",
    priors: { ...labels },
    targets: Object.fromEntries(
      releasePackages.map((name) => [name, f.qualified.version]),
    ),
    targetIntegrities: Object.fromEntries(
      f.qualified.archives.map((archive) => [
        archive.package,
        archive.integrity,
      ]),
    ),
    scope: { npm: [...releasePackages], github: true },
    stageInventory: stageInventory(),
  };
  change(operation, labels);
  const raw = JSON.stringify(operation),
    env = {
      GITHUB_REPOSITORY: repository,
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_REF: "refs/heads/main",
      GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/promote-release.yml@refs/heads/main`,
      GITHUB_SHA: f.qualified.source,
      GITHUB_ACTOR: "maksymshostak",
      GITHUB_TRIGGERING_ACTOR: "maksymshostak",
      GITHUB_RUN_ID: "80",
      GITHUB_RUN_ATTEMPT: "1",
      OPERATION_JSON: raw,
      OPERATION_SHA: hash(Buffer.from(raw)),
      QUALIFICATION_SHA: hash(qualifiedBytes),
      ADMISSION_ID: "101",
      NPM_RESULT_ID: "102",
      RELEASE_GITHUB_RESULT_ID: "103",
      ADMISSION_DIRECTORY: join(root, "admission"),
      NPM_DIRECTORY: join(root, "npm"),
      RELEASE_GITHUB_DIRECTORY: join(root, "github"),
    };
  const release = {
    id: 70,
    tag_name: `v${f.qualified.version}`,
    immutable: true,
    draft: false,
    prerelease: operation.priorPrerelease,
    assets: f.assets.map((asset, index) => ({
      id: index + 1000,
      state: "uploaded",
      name: asset.name,
      size: asset.size,
      digest: `sha256:${asset.sha256}`,
    })),
  };
  const run = {
    id: 80,
    run_attempt: 1,
    path: ".github/workflows/promote-release.yml",
    head_sha: operation.controller,
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
    head_branch: "main",
    event: "workflow_dispatch",
  };
  const jobs = {
    total_count: 3,
    jobs: ["admit", "npm", "github"].map((name, index) => ({
      id: 900 + index,
      name,
      run_id: 80,
      run_attempt: 1,
      head_sha: operation.controller,
      status: "completed",
      conclusion: "success",
    })),
  };
  const artifacts = Object.fromEntries(
    ["promotion-admission", "npm-operation", "github-operation"].map(
      (name, index) => [
        101 + index,
        {
          id: 101 + index,
          name: `${name}-1`,
          digest: `sha256:${"a".repeat(64)}`,
          expired: false,
          workflow_run: {
            id: 80,
            repository_id: 1,
            head_repository_id: 1,
            head_sha: operation.controller,
          },
        },
      ],
    ),
  );
  let latest = operation.priorGithubLatest,
    clock = 0,
    reads = 0,
    securityChecks = 0,
    byteChecks = 0;
  const writes = [],
    deadlines = [];
  const api = async (path, deadline) => {
    if (path === "git/ref/heads/main")
      return { object: { sha: operation.controller } };
    if (deadline !== undefined) deadlines.push(deadline);
    if (path.startsWith("git/ref/"))
      return { object: { type: "tag", sha: "d".repeat(40) } };
    if (path.startsWith("git/tags/")) return {};
    if (path === "releases/70") return structuredClone(release);
    if (path === "releases/latest")
      return latest === null ? null : { id: latest };
    if (path.startsWith("actions/artifacts/"))
      return structuredClone(artifacts[path.split("/").at(-1)]);
    if (path.endsWith("/jobs?per_page=100")) return structuredClone(jobs);
    if (path === "actions/runs/80/attempts/1") return structuredClone(run);
    throw new Error(`Unexpected fixture API: ${path}`);
  };
  const gh = (args) => {
    if (args[0] === "api") {
      const path = args[1].slice(`repos/${repository}/`.length);
      if (path.startsWith("actions/artifacts/"))
        return JSON.stringify(artifacts[path.split("/").at(-1)]);
      if (path.endsWith("/jobs?per_page=100")) return JSON.stringify(jobs);
      if (path === "actions/runs/80/attempts/1") return JSON.stringify(run);
      throw new Error(`Unexpected fixture gh API: ${path}`);
    }
    if (args[0] === "release" && args[1] === "edit") {
      writes.push({ provider: "github", args });
      release.prerelease = operation.targetPrerelease;
      latest = operation.targetGithubLatest;
    } else
      assert.ok(
        args[0] === "release" && ["verify", "verify-asset"].includes(args[1]),
      );
    return "{}";
  };
  const provider = {
    api,
    gh,
    verifyTag: () => {},
    security: () => {
      securityChecks++;
      return { audits: [] };
    },
    publicBytes: () => {
      byteChecks++;
    },
    history: async () => ({ writers: [], settled: {} }),
    labels: async (_label, deadline) => {
      deadlines.push(deadline);
      reads++;
      return { ...labels };
    },
    npm: (args) => {
      writes.push({ provider: "npm", args });
      if (args[1] === "add") {
        const spec = args[2],
          split = spec.lastIndexOf("@");
        labels[spec.slice(0, split)] = spec.slice(split + 1);
      } else labels[args[2]] = null;
      return "ack";
    },
    service: admitServiceArtifact,
  };
  const runPhase = (
    phase,
    output = join(root, phase === "admit" ? "admission" : phase),
  ) =>
    runReleaseController({
      phase,
      input: phase === "admit" ? input : env.ADMISSION_DIRECTORY,
      output,
      env,
      provider,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      random: () => 0,
    });
  return {
    f,
    operation,
    env,
    labels,
    artifacts,
    provider,
    runPhase,
    root,
    release,
    writes,
    deadlines,
    checks: () => ({ securityChecks, byteChecks, reads }),
    setLatest: (value) => {
      latest = value;
    },
  };
}

test("read-only reconciliation distinguishes one visible effect from whole-operation completion", async (t) => {
  const f = fixture(t);
  await f.runPhase("admit");
  await f.runPhase("npm");
  const bytes = readFileSync(join(f.env.NPM_DIRECTORY, "effects.jsonl"));
  f.env.CONTINUATION_JSON = JSON.stringify({
    artifactId: "102",
    writerRun: "80",
    writerAttempt: "1",
    service: "npm",
    sequence: "1",
    journalSha256: hash(bytes),
  });
  const before = f.writes.length;
  const result = await reconcileReleaseEffect(
    f.env.NPM_DIRECTORY,
    join(f.root, "reconcile"),
    {
      env: f.env,
      now: () => 0,
      authenticate: async () => {},
      labels: f.provider.labels,
      verifyTag: () => {},
      api: (path) => f.provider.api(path.slice(1)),
      gh: f.provider.gh,
    },
  );
  assert.equal(result.observedState, "target-visible");
  assert.equal(result.wholeOperationComplete, false);
  assert.equal(f.writes.length, before);
});

test("real family controller admits once, seals native-first effects, classifies separately and re-verifies with zero writes", async (t) => {
  const f = fixture(t);
  await f.runPhase("admit");
  await f.runPhase("npm");
  assert.deepEqual(
    f.writes.map((write) => write.args[2]),
    releasePackages.map((name) => `${name}@1.0.2`),
  );
  // An acknowledged write may still be visible as its approved prior. The GitHub
  // preamble shares the same convergence loop and deadline as final verification.
  let lag = true;
  const labels = f.provider.labels;
  f.provider.labels = async (...args) => {
    const result = await labels(...args);
    if (lag) {
      lag = false;
      result[releasePackages[0]] = "1.0.1";
    }
    return result;
  };
  await f.runPhase("github");
  assert.equal(
    f.writes.filter((write) => write.provider === "github").length,
    1,
  );
  assert.equal((await f.runPhase("verify")).status, "complete");
  const before = f.writes.length;
  f.env.GITHUB_RUN_ID = "81";
  f.env.WRITER_RUN = "80";
  f.env.WRITER_ATTEMPT = "1";
  assert.equal(
    (await f.runPhase("verify", join(f.root, "verify-again"))).status,
    "complete",
  );
  assert.equal(f.writes.length, before);
  assert.equal(f.checks().securityChecks, 1);
  assert.equal(f.checks().byteChecks, 1);
});

test("acknowledged effects with stale priors wait without a second request and seal their inherited proof", async (t) => {
  const f = fixture(t);
  f.provider.history = async () => ({
    writers: [],
    settled: { ...f.operation.targets },
  });
  await f.runPhase("admit");
  let observations = 0;
  f.provider.labels = async () =>
    ++observations < 3 ? { ...f.operation.priors } : { ...f.operation.targets };
  f.provider.npm = () =>
    assert.fail("An acknowledged effect must never replay");
  await f.runPhase("npm");
  await f.runPhase("github");
  assert.equal((await f.runPhase("verify")).status, "complete");
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].provider, "github");
});

test("fresh-workspace writer reruns cannot reuse pre-failure admission", async (t) => {
  const f = fixture(t);
  await f.runPhase("admit");
  f.env.GITHUB_RUN_ATTEMPT = "2";
  await assert.rejects(
    f.runPhase("npm", join(f.root, "fresh-runner-npm")),
    /Writer reruns/u,
  );
  await assert.rejects(
    f.runPhase("github", join(f.root, "fresh-runner-github")),
    /Writer reruns/u,
  );
  assert.equal(f.writes.length, 0);
});

test("interrupted native latest staging restores qualified RC priors through the real family controller without an incomplete candidate archive", async (t) => {
  const staged = interruptedStagingFixture(t),
    rc = "1.0.1-rc.1";
  const f = fixture(
    t,
    (operation, labels) => {
      Object.assign(operation, staged.recovery, {
        operation: "partial",
        label: "latest",
        scope: { npm: staged.scope, github: false },
        targetGithubLatest: operation.priorGithubLatest,
        targetPrerelease: true,
      });
      for (const name of releasePackages)
        labels[name] = staged.scope.includes(name)
          ? staged.manifest.version
          : rc;
      operation.priors = { ...labels };
      operation.targets = Object.fromEntries(
        releasePackages.map((name) => [name, rc]),
      );
      operation.targetQualifications = Object.fromEntries(
        staged.scope.map((name) => [name, operation.qualificationSha256]),
      );
    },
    rc,
  );
  f.provider.history = async (operation) => {
    const original = await authenticateStagingRecovery(
      staged.entry,
      operation,
      staged.provider,
    );
    verifyRecoveryAttribution(operation, [original]);
    return {
      writers: [],
      settled: {},
      stagingReconciliations: [original.observation],
    };
  };
  await f.runPhase("admit");
  await f.runPhase("npm");
  await f.runPhase("github");
  assert.equal((await f.runPhase("verify")).status, "complete");
  assert.deepEqual(
    f.writes.map((write) => write.args[2]),
    staged.scope.map((name) => `${name}@${rc}`),
  );
  const completionBytes = readFileSync(
    join(f.root, "verify", "completion.json"),
  );
  const completed = {
    job: { name: "Read-only release completion", conclusion: "success" },
    files: {
      "completion.json": { base64: completionBytes.toString("base64") },
    },
  };
  const writers = ["npm", "github"].map((name) => {
    const bytes = readFileSync(join(f.root, name, "effects.jsonl")),
      context = JSON.parse(bytes.toString().split("\n")[0]).context;
    return {
      entry: { job: { name } },
      context,
      bytes,
      effects: verifyEffectJournal(bytes, context),
    };
  });
  assert.ok(
    completedStagingRecovery(staged.entry, f.operation.originalJournalSha256, [
      completed,
    ]),
  );
  verifyActiveOperations(
    { operation: "stage", operationId: "next-stage" },
    "new-decision",
    [completed],
    writers,
  );
  assert.throws(
    () =>
      verifyActiveOperations(
        { operation: "stage", operationId: "next-stage" },
        "new-decision",
        [],
        writers,
      ),
    /earlier release operation/u,
  );
  const originalGh = staged.provider.gh;
  staged.provider.gh = (args) =>
    args[1].includes("releases/tags/")
      ? JSON.stringify({ immutable: true, draft: false, prerelease: false })
      : originalGh(args);
  await assert.rejects(
    authenticateStagingRecovery(staged.entry, f.operation, staged.provider),
    /whole-family restore/u,
  );
});

test("foreign handoff and changed immutable inventory stop before GitHub writes", async (t) => {
  const f = fixture(t);
  await f.runPhase("admit");
  await f.runPhase("npm");
  f.artifacts[102].workflow_run.head_repository_id = 99;
  await assert.rejects(f.runPhase("github"));
  assert.equal(f.writes.length, 3);
  f.artifacts[102].workflow_run.head_repository_id = 1;
  f.release.assets[0].id++;
  await assert.rejects(f.runPhase("github"));
  assert.equal(f.writes.length, 3);
});

test("a lost npm acknowledgement records unknown and cannot supply a sealed handoff or blind retry", async (t) => {
  const f = fixture(t);
  await f.runPhase("admit");
  const npm = f.provider.npm;
  f.provider.npm = (args) => {
    npm(args);
    throw new Error("lost acknowledgement");
  };
  await assert.rejects(f.runPhase("npm"), /lost acknowledgement/u);
  assert.equal(f.writes.length, 1);
  assert.match(
    readFileSync(join(f.root, "npm", "effects.jsonl"), "utf8"),
    /outcome-unknown/u,
  );
  await assert.rejects(f.runPhase("npm"));
  await assert.rejects(f.runPhase("github"));
  assert.equal(f.writes.length, 1);
});

test("alignment changes divergent companions only and whole-family restore permits an older target", async (t) => {
  const aligned = fixture(t, (op, labels) => {
    op.operation = "align";
    op.scope = { npm: [releasePackages[0]], github: false };
    op.priorGithubLatest = 70;
    op.priorPrerelease = false;
    labels[releasePackages[1]] = labels[releasePackages[2]] = "1.0.2";
    op.priors = { ...labels };
  });
  await aligned.runPhase("admit");
  await aligned.runPhase("npm");
  await aligned.runPhase("github");
  assert.equal((await aligned.runPhase("verify")).status, "complete");
  assert.equal(aligned.writes.length, 1);
  const restore = fixture(t, (op, labels) => {
    op.operation = "restore";
    for (const name of releasePackages) labels[name] = "2.0.0";
    op.priors = { ...labels };
  });
  await restore.runPhase("admit");
  await restore.runPhase("npm");
  await restore.runPhase("github");
  assert.equal((await restore.runPhase("verify")).status, "complete");
  assert.equal(restore.writes.length, 4);
});

test("forward continuation after a reconciled native effect changes only never-requested labels", async (t) => {
  const f = fixture(t, (op, labels) => {
    op.operation = "continue";
    op.operationId = "forward";
    labels[releasePackages[0]] = op.targets[releasePackages[0]];
    op.priors = { ...labels };
    op.scope.npm = releasePackages.slice(1);
    op.originalWriter = { run: "79", attempt: "1", job: "891" };
    op.originalOperationId = "interrupted";
    op.originalJournalSha256 = hash(Buffer.from("original"));
    op.originalDecisionSha256 = "a".repeat(64);
  });
  const approved = {
    ...f.operation,
    operation: "promote",
    operationId: "interrupted",
    scope: { npm: [...releasePackages], github: true },
    priors: Object.fromEntries(releasePackages.map((name) => [name, "1.0.1"])),
  };
  const raw = Buffer.from(JSON.stringify(approved));
  f.operation.originalDecisionSha256 = hash(raw);
  f.env.OPERATION_JSON = JSON.stringify(f.operation);
  f.env.OPERATION_SHA = hash(Buffer.from(f.env.OPERATION_JSON));
  const original = {
    entry: {
      run: { id: 79 },
      attempt: 1,
      job: { id: 891, name: "npm", conclusion: "failure" },
      files: {
        "operation.json": { sha256: hash(raw), base64: raw.toString("base64") },
      },
    },
    bytes: Buffer.from("original"),
    context: { operationId: "interrupted", decisionSha256: hash(raw) },
    effects: [
      {
        provider: "npm",
        subject: releasePackages[0],
        prior: "1.0.1",
        target: "1.0.2",
        outcome: "acknowledged",
      },
    ],
  };
  f.provider.history = async (op) => {
    verifyRecoveryAttribution(op, [original]);
    return { writers: [], settled: {} };
  };
  await f.runPhase("admit");
  await f.runPhase("npm");
  await f.runPhase("github");
  assert.equal((await f.runPhase("verify")).status, "complete");
  assert.deepEqual(
    f.writes
      .filter((write) => write.provider === "npm")
      .map((write) => write.args[2]),
    releasePackages.slice(1).map((name) => `${name}@1.0.2`),
  );
  assert.throws(
    () =>
      verifyRecoveryAttribution(
        { ...f.operation, scope: { npm: [...releasePackages], github: true } },
        [original],
      ),
    /cannot repeat/u,
  );
});

test("failed fresh security and unauthenticated at-target labels produce zero requests", async (t) => {
  const f = fixture(t);
  f.provider.security = () => {
    throw new Error("audit failed");
  };
  await assert.rejects(f.runPhase("admit"), /audit failed/u);
  assert.equal(f.writes.length, 0);
  const g = fixture(t);
  await g.runPhase("admit");
  g.labels[releasePackages[0]] = "1.0.2";
  await assert.rejects(g.runPhase("npm"), /no authenticated writer/u);
  assert.equal(g.writes.length, 0);
});

test("partial recovery is bound to the original changed labels and cannot roll core back after stable completion", (t) => {
  const f = fixture(t),
    op = {
      ...f.operation,
      operation: "partial",
      scope: { npm: [releasePackages[0]], github: false },
      originalWriter: { run: "80", attempt: "1", job: "901" },
      originalOperationId: "original",
      originalJournalSha256: hash(Buffer.from("journal")),
      originalDecisionSha256: hash(Buffer.from("decision")),
      priorGithubLatest: 60,
      targetGithubLatest: 60,
      targetPrerelease: true,
    };
  const approved = { ...f.operation, operationId: "original" },
    raw = Buffer.from(JSON.stringify(approved));
  op.originalDecisionSha256 = hash(raw);
  op.priors = { ...op.priors, [releasePackages[0]]: "1.0.2" };
  op.targets = { ...op.priors, [releasePackages[0]]: "1.0.1-rc.1" };
  const original = {
    entry: {
      run: { id: 80 },
      attempt: 1,
      job: { id: 901, name: "npm", conclusion: "failure" },
      files: {
        "operation.json": { sha256: hash(raw), base64: raw.toString("base64") },
      },
    },
    bytes: Buffer.from("journal"),
    context: { operationId: "original", decisionSha256: hash(raw) },
    effects: [
      {
        provider: "npm",
        subject: releasePackages[0],
        prior: "1.0.1-rc.1",
        target: "1.0.2",
        outcome: "acknowledged",
      },
    ],
  };
  verifyRecoveryAttribution(op, [original]);
  assert.throws(
    () => verifyRecoveryAttribution({ ...op, label: "pilot" }, [original]),
    /original npm label/u,
  );
  assert.throws(
    () =>
      verifyRecoveryAttribution(
        { ...op, priorGithubLatest: 70, priorPrerelease: false },
        [original],
      ),
    /whole-family restore/u,
  );
  assert.throws(
    () =>
      verifyRecoveryAttribution(
        { ...op, scope: { npm: [releasePackages[2]], github: false } },
        [original],
      ),
    /not attributable/u,
  );
  // Schema admission alone also rejects a narrowed ordinary stable restore.
  const narrowed = {
    ...f.operation,
    operation: "restore",
    scope: { npm: [releasePackages[2]], github: true },
  };
  const bytes = Buffer.from(JSON.stringify(narrowed));
  assert.throws(
    () =>
      readReleaseOperation(
        {
          ...f.env,
          OPERATION_JSON: bytes.toString(),
          OPERATION_SHA: hash(bytes),
        },
        f.f.qualified,
      ),
    /whole family/u,
  );
});
