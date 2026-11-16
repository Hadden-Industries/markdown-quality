// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  releaseFixture,
  interruptedStagingFixture,
  stageInventory,
} from "./release-fixture.js";
import { authenticateStagingRecovery } from "../scripts/release-staging-recovery.js";
import {
  nativeReleaseProvider,
  runReleaseController,
} from "../scripts/release-controller.js";
import { releasePackages } from "../scripts/release-coordinates.js";
import { hash } from "../scripts/release-bytes.js";
import { admitServiceArtifact } from "../scripts/promotion-handoff.js";
import {
  verifyRecoveryAttribution,
  verifyActiveOperations,
  completedStagingRecovery,
  admitRetiredQualification,
} from "../scripts/release-history.js";
import {
  pilotTagDeleteEndpoint,
  verifyEffectJournal,
  verifyEffectSettlement,
  verifySettlementObservation,
} from "../scripts/release-effects.js";
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
  // The stable `latest` family observed beside a retired `pilot` family.
  const stable = Object.fromEntries(
    releasePackages.map((name) => [name, f.qualified.version]),
  );
  const checkpoints = [];
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
    deadlines = [],
    releases = { 70: release },
    tags = {};
  const api = async (path, deadline) => {
    if (path === "git/ref/heads/main")
      return { object: { sha: operation.controller } };
    if (deadline !== undefined) deadlines.push(deadline);
    if (path.startsWith("git/ref/"))
      return { object: { type: "tag", sha: tags[path] ?? "d".repeat(40) } };
    if (path.startsWith("git/tags/")) return {};
    if (/^releases\/\d+$/u.test(path) && releases[path.slice(9)])
      return structuredClone(releases[path.slice(9)]);
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
    labelSets: async (names, deadline) => {
      deadlines.push(deadline);
      reads++;
      return Object.fromEntries(
        names.map((name) => [
          name,
          { ...(name === operation.label ? labels : stable) },
        ]),
      );
    },
    retired: (selected, admitted, deadline) =>
      admitRetiredQualification(selected, {
        admitted,
        checkpoints,
        api: (path) => api(path, deadline),
        verifyTag: () => {},
      }),
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
    stable,
    checkpoints,
    releases,
    tags,
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

const absentFamily = () =>
  Object.fromEntries(releasePackages.map((name) => [name, null]));

/** An owner-shaped retirement of the stable subject's pilot aliases. */
function retirement(t, change = () => {}) {
  return fixture(t, (operation, labels) => {
    for (const name of releasePackages) labels[name] = operation.version;
    Object.assign(operation, {
      operation: "retire-pilot",
      operationId: "retire-pilot-test",
      label: "pilot",
      priorGithubLatest: 70,
      targetGithubLatest: 70,
      priorPrerelease: false,
      targetPrerelease: false,
      scope: { npm: [...releasePackages], github: false },
      priors: { ...labels },
      targets: absentFamily(),
      targetIntegrities: absentFamily(),
      approvedDeletions: releasePackages.map((name) => ({
        package: name,
        current: operation.version,
        target: null,
      })),
      noops: [],
      guards: {
        latest: Object.fromEntries(
          releasePackages.map((name) => [name, operation.version]),
        ),
      },
      retired: {
        version: operation.version,
        source: operation.source,
        manifestSha256: operation.manifestSha256,
        qualificationSha256: operation.qualificationSha256,
        releaseId: 70,
        prerelease: false,
      },
    });
    change(operation, labels);
  });
}

const removal = (name) => [
  "dist-tag",
  "rm",
  name,
  "pilot",
  "--registry=https://registry.npmjs.org/",
  "--fetch-retries=0",
  "--json",
];

test("pilot retirement removes the three aliases natives first, preserves the stable family and completes without a GitHub writer", async (t) => {
  const f = retirement(t);
  const admission = await f.runPhase("admit");
  assert.equal(admission.retired.qualificationSha256, f.env.QUALIFICATION_SHA);
  assert.equal(f.checks().securityChecks, 1, "Current stable gets fresh audit");
  await f.runPhase("npm");
  assert.deepEqual(
    f.writes.map((write) => write.args),
    releasePackages.map(removal),
  );
  assert.deepEqual(f.labels, absentFamily());
  await assert.rejects(f.runPhase("github"), /GitHub writer/u);
  delete f.env.RELEASE_GITHUB_RESULT_ID;
  assert.equal((await f.runPhase("verify")).status, "complete");
  const completion = JSON.parse(
    readFileSync(join(f.root, "verify", "completion.json")),
  );
  assert.equal(completion.originalWriters.github, null);
  assert.equal(completion.originalWriters.npm.job, "npm");
  assert.equal(f.writes.length, 3, "Completion is read-only");
  assert.ok(f.writes.every((write) => write.provider === "npm"));
  assert.deepEqual(
    f.stable,
    Object.fromEntries(releasePackages.map((name) => [name, "1.0.2"])),
  );
  // A completion cannot borrow a GitHub writer that the operation excludes.
  f.env.RELEASE_GITHUB_RESULT_ID = "103";
  await assert.rejects(
    f.runPhase("verify", join(f.root, "verify-with-github")),
    /GitHub writer/u,
  );
});

test("already absent pilot aliases are explicitly approved read-only no-ops", async (t) => {
  const f = retirement(t, (operation, labels) => {
    labels[releasePackages[2]] = null;
    operation.priors = { ...labels };
    operation.noops = [releasePackages[2]];
    operation.approvedDeletions = operation.approvedDeletions.slice(0, 2);
  });
  await f.runPhase("admit");
  await f.runPhase("npm");
  delete f.env.RELEASE_GITHUB_RESULT_ID;
  assert.equal((await f.runPhase("verify")).status, "complete");
  assert.deepEqual(
    f.writes.map((write) => write.args),
    releasePackages.slice(0, 2).map(removal),
  );
  const none = retirement(t, (operation, labels) => {
    Object.assign(labels, absentFamily());
    operation.priors = absentFamily();
    operation.noops = [...releasePackages];
    operation.approvedDeletions = [];
  });
  await none.runPhase("admit");
  await none.runPhase("npm");
  delete none.env.RELEASE_GITHUB_RESULT_ID;
  assert.equal((await none.runPhase("verify")).status, "complete");
  assert.equal(none.writes.length, 0);
});

test("retirement decisions refuse missing approvals, newer candidates, GitHub scope and unbound subjects", (t) => {
  const f = retirement(t);
  const read = (change) => {
    const operation = structuredClone(f.operation);
    change(operation);
    const bytes = Buffer.from(JSON.stringify(operation));
    return readReleaseOperation(
      {
        ...f.env,
        OPERATION_JSON: bytes.toString(),
        OPERATION_SHA: hash(bytes),
      },
      f.f.qualified,
    );
  };
  read(() => {});
  for (const [reason, change, pattern] of [
    [
      "missing deletion approval",
      (op) => op.approvedDeletions.pop(),
      /deletion/u,
    ],
    [
      "unapproved absent alias",
      (op) => (op.priors[releasePackages[0]] = null),
      /no-op/u,
    ],
    ["no-op for a present alias", (op) => op.noops.push(releasePackages[0])],
    [
      "newer pilot candidate",
      (op) => {
        op.retired.version = "1.1.0-rc.1";
        op.priors[releasePackages[0]] = "1.1.0-rc.1";
        op.approvedDeletions[0].current = "1.1.0-rc.1";
      },
    ],
    ["GitHub mutation scope", (op) => (op.scope.github = true)],
    ["latest label", (op) => (op.label = "latest")],
    [
      "replacement target",
      (op) => {
        op.targets[releasePackages[0]] = "1.0.2";
        op.targetIntegrities[releasePackages[0]] =
          f.f.qualified.archives[0].integrity;
      },
    ],
    [
      "partial package scope",
      (op) => (op.scope.npm = releasePackages.slice(0, 2)),
    ],
    [
      "changed stable latest guard",
      (op) => (op.guards.latest[releasePackages[1]] = "1.0.1"),
    ],
    ["stable is not GitHub latest", (op) => (op.priorGithubLatest = 60)],
    [
      "stable release is a prerelease",
      (op) => (op.priorPrerelease = op.targetPrerelease = true),
    ],
    [
      "identical subject with another qualification",
      (op) => (op.retired.qualificationSha256 = "f".repeat(64)),
    ],
    [
      "identical subject with another release",
      (op) => (op.retired.releaseId = 69),
    ],
  ])
    assert.throws(() => read(change), pattern, reason);
});

test("a newer pilot, changed stable family or GitHub marker stops retirement at the exact changed prefix", async (t) => {
  const newer = retirement(t, (_operation, labels) => {
    labels[releasePackages[1]] = "1.1.0-rc.1";
  });
  await assert.rejects(newer.runPhase("admit"), /Unapproved npm preimage/u);
  assert.equal(newer.writes.length, 0);
  for (const [after, interfere, pattern] of [
    [1, (f) => (f.labels[releasePackages[1]] = "1.1.0-rc.1"), /Unexpected/u],
    [1, (f) => (f.stable[releasePackages[2]] = "1.1.0"), /Stable latest/u],
    [2, (f) => (f.stable[releasePackages[0]] = "1.0.1"), /Stable latest/u],
    [1, (f) => f.setLatest(71), /GitHub latest/u],
  ]) {
    const f = retirement(t);
    await f.runPhase("admit");
    const npm = f.provider.npm;
    f.provider.npm = (args) => {
      const result = npm(args);
      if (f.writes.length === after) interfere(f);
      return result;
    };
    await assert.rejects(f.runPhase("npm"), pattern);
    assert.equal(f.writes.length, after, "No request after the change");
    const journal = readFileSync(join(f.root, "npm", "effects.jsonl"), "utf8");
    assert.equal(journal.match(/"state":"acknowledged"/gu).length, after);
    assert.doesNotMatch(journal, /outcome-unknown/u);
  }
});

test("an unpropagated removal and a duplicate invocation never repeat a retirement request", async (t) => {
  const f = retirement(t);
  await f.runPhase("admit");
  f.provider.npm = (args) => {
    f.writes.push({ provider: "npm", args });
    return "ack";
  };
  await assert.rejects(f.runPhase("npm"), /Completion unconfirmed/u);
  assert.equal(f.writes.length, 1);
  const journal = readFileSync(join(f.root, "npm", "effects.jsonl"), "utf8");
  assert.match(journal, /"state":"acknowledged"/u);
  await assert.rejects(f.runPhase("npm"));
  assert.equal(f.writes.length, 1, "Duplicate invocation sends nothing");
});

test("an older retired pilot needs its signed original qualification and unchanged immutable identity", async (t) => {
  const f = retirement(t, (operation, labels) => {
    for (const name of releasePackages) labels[name] = "1.0.1";
    operation.priors = { ...labels };
    operation.approvedDeletions = releasePackages.map((name) => ({
      package: name,
      current: "1.0.1",
      target: null,
    }));
    operation.retired = {
      version: "1.0.1",
      source: "e".repeat(40),
      manifestSha256: "a".repeat(64),
      qualificationSha256: "b".repeat(64),
      releaseId: 60,
      prerelease: false,
    };
  });
  await assert.rejects(f.runPhase("admit"), /signed original qualification/u);
  const assets = [
    { id: 600, name: "release-manifest.json", size: 1, digest: "x" },
  ];
  f.checkpoints.push({
    targetQualification: {
      qualified: {
        version: "1.0.1",
        source: "e".repeat(40),
        manifestSha256: "a".repeat(64),
      },
      qualificationSha256: "b".repeat(64),
      archive: {
        releaseId: 60,
        immutable: true,
        tagSha: "9".repeat(40),
        assets,
      },
    },
  });
  f.tags["git/ref/tags/v1.0.1"] = "9".repeat(40);
  f.releases[60] = {
    id: 60,
    tag_name: "v1.0.1",
    immutable: true,
    draft: false,
    prerelease: false,
    assets: structuredClone(assets),
  };
  const admission = await f.runPhase("admit", join(f.root, "older"));
  assert.equal(admission.retired.version, "1.0.1");
  assert.equal(admission.retired.tagSha, "9".repeat(40));
  assert.equal(
    f.checks().securityChecks,
    1,
    "Only the stable subject is audited",
  );
  f.tags["git/ref/tags/v1.0.1"] = "8".repeat(40);
  await assert.rejects(
    f.runPhase("admit", join(f.root, "moved-tag")),
    /tag identity/u,
  );
  f.tags["git/ref/tags/v1.0.1"] = "9".repeat(40);
  f.releases[60].assets[0].id++;
  await assert.rejects(f.runPhase("admit", join(f.root, "changed-assets")));
  assert.equal(f.writes.length, 0);
});

test("completion binds the GitHub writer only when the admitted operation produced one", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "completion-inputs-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let invocation = 0;
  const bind = (mode, results, continuation = "") => {
    const files = ["env", "output"].map((name) =>
      join(directory, `${name}-${++invocation}`),
    );
    for (const file of files) writeFileSync(file, "");
    const child = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../scripts/release-controller-inputs.js", import.meta.url),
        ),
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          RELEASE_MODE: mode,
          NATIVE_RESULTS: JSON.stringify(results),
          CONTINUATION_JSON: continuation,
          GITHUB_RUN_ID: "80",
          GITHUB_ENV: files[0],
          GITHUB_OUTPUT: files[1],
        },
      },
    );
    return {
      status: child.status,
      env: readFileSync(files[0], "utf8"),
    };
  };
  const results = (writer, github) => ({
    admit: {
      result: "success",
      outputs: { "artifact-id": "101", "github-writer": writer },
    },
    npm: { result: "success", outputs: { "artifact-id": "102" } },
    github:
      github === "success"
        ? { result: "success", outputs: { "artifact-id": "103" } }
        : { result: github, outputs: {} },
  });
  const promoted = bind("execute", results("true", "success"));
  assert.equal(promoted.status, 0);
  assert.match(promoted.env, /^RELEASE_GITHUB_RESULT_ID=103$/mu);
  const retired = bind("execute", results("false", "skipped"));
  assert.equal(retired.status, 0);
  assert.match(retired.env, /^NPM_RESULT_ID=102$/mu);
  assert.doesNotMatch(retired.env, /RELEASE_GITHUB_RESULT_ID/u);
  assert.notEqual(bind("execute", results("true", "skipped")).status, 0);
  assert.notEqual(bind("execute", results("false", "success")).status, 0);
  assert.notEqual(bind("execute", results(undefined, "skipped")).status, 0);
  const verified = bind(
    "verify",
    {},
    JSON.stringify({
      admissionId: "101",
      npmId: "102",
      writerRun: "80",
      writerAttempt: "1",
    }),
  );
  assert.equal(verified.status, 0);
  assert.doesNotMatch(verified.env, /RELEASE_GITHUB_RESULT_ID/u);
});

const npmStep = "Change only approved npm labels, natives first";

/** npm's own `--json` error body for a refused registry request. */
const originalPilotDelete = {
  method: "DELETE",
  status: 401,
  endpoint: pilotTagDeleteEndpoint(releasePackages[1]),
};
const rejectedRequest = (summary) =>
  Object.assign(new Error("npm failed (status=1, signal=null)"), {
    status: 1,
    signal: null,
    stdout: JSON.stringify({
      error: { code: "E401", summary, detail: "" },
    }),
  });

/** Run an interrupted retirement whose Linux removal npm refuses with 401. */
async function rejectedRetirement(
  t,
  summary = `401 Unauthorized - DELETE ${originalPilotDelete.endpoint}`,
) {
  const f = retirement(t);
  await f.runPhase("admit");
  const npm = f.provider.npm;
  f.provider.npm = (args) => {
    if (args[2] !== releasePackages[1]) return npm(args);
    f.writes.push({ provider: "npm", args });
    throw rejectedRequest(summary);
  };
  await assert.rejects(f.runPhase("npm"), /npm failed/u);
  f.provider.npm = npm;
  const journal = readFileSync(join(f.root, "npm", "effects.jsonl"));
  const context = JSON.parse(journal.toString().split("\n")[0]).context;
  const job = {
    id: 901,
    name: "npm",
    run_id: 80,
    run_attempt: 1,
    status: "completed",
    conclusion: "failure",
    started_at: "2026-11-14T10:00:00Z",
    completed_at: "2026-11-14T10:02:00Z",
    steps: [
      {
        name: npmStep,
        status: "completed",
        conclusion: "failure",
        started_at: "2026-11-14T10:00:30Z",
        completed_at: "2026-11-14T10:01:30Z",
      },
    ],
  };
  const log = Buffer.from("2026-11-14T10:01:29Z npm error code E401\n");
  let reconciliations = 0;
  const observe = ({
    sequence = "2",
    jobs = { total_count: 1, jobs: [job] },
    journalBytes = journal,
  } = {}) => {
    const input = join(f.root, `reconcile-input-${++reconciliations}`);
    mkdirSync(input);
    writeFileSync(join(input, "effects.jsonl"), journalBytes);
    // A simulated clock lets an unresolved observation reach its deadline.
    let clock = 0;
    return reconcileReleaseEffect(
      input,
      join(f.root, `reconcile-${reconciliations}`),
      {
        env: {
          ...f.env,
          CONTINUATION_JSON: JSON.stringify({
            artifactId: "102",
            writerRun: "80",
            writerAttempt: "1",
            service: "npm",
            sequence,
            journalSha256: hash(journalBytes),
          }),
        },
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
        random: () => 0,
        authenticate: async () => ({ jobs }),
        labels: f.provider.labels,
        verifyTag: () => {},
        api: (path) => f.provider.api(path.slice(1)),
        gh: f.provider.gh,
        jobLog: async (id) => {
          assert.equal(id, job.id);
          return log;
        },
      },
    );
  };
  return { f, journal, context, job, log, observe };
}

test("a structured native 401 is retained beside an unknown request and observed read-only as one exact rejection", async (t) => {
  const r = await rejectedRetirement(t);
  assert.deepEqual(
    r.f.writes.map((write) => write.args),
    releasePackages.slice(0, 2).map((name) => [...removal(name)]),
  );
  const effects = verifyEffectJournal(r.journal, r.context);
  assert.deepEqual(
    effects.map((effect) => effect.outcome),
    ["acknowledged", "outcome-unknown"],
  );
  assert.deepEqual(effects[1].diagnostic, {
    exitStatus: 1,
    npmErrorCode: "E401",
    refusal: originalPilotDelete,
  });
  const writes = r.f.writes.length;
  const observation = await r.observe();
  assert.equal(r.f.writes.length, writes, "Reconciliation is read-only");
  assert.equal(observation.observedState, "rejected");
  assert.deepEqual(observation.rejection, {
    package: releasePackages[1],
    label: "pilot",
    job: r.job.id,
    step: npmStep,
    stepCompletedAt: r.job.steps[0].completed_at,
    diagnostic: {
      exitStatus: 1,
      npmErrorCode: "E401",
      refusal: originalPilotDelete,
    },
    logSha256: hash(r.log),
    logBytes: r.log.length,
    observedPrior: "1.0.2",
  });
  // A request with no structured refusal stays unknown: never a rejection.
  const acknowledged = await r.observe({ sequence: "1" });
  assert.notEqual(acknowledged.observedState, "rejected");
  for (const [reason, change] of [
    ["successful native step", (job) => (job.steps[0].conclusion = "success")],
    ["incomplete step evidence", (job) => (job.steps = [])],
    ["successful writer job", (job) => (job.conclusion = "success")],
  ]) {
    const job = structuredClone(r.job);
    change(job);
    const observed = await r.observe({ jobs: { total_count: 1, jobs: [job] } });
    assert.notEqual(observed.observedState, "rejected", reason);
  }
  // A later request after the claimed refusal contradicts single-request proof.
  const lines = r.journal.toString().trimEnd().split("\n");
  const intent = JSON.parse(lines[3]);
  const extended = Buffer.from(
    [
      ...lines,
      JSON.stringify({
        ...intent,
        sequence: 3,
        subject: releasePackages[2],
        step: `npm/${releasePackages[2]}`,
      }),
    ].join("\n") + "\n",
  );
  verifyEffectJournal(extended, r.context);
  const second = await r.observe({ journalBytes: extended });
  assert.notEqual(second.observedState, "rejected");
  // An acknowledgement beside the claimed refusal is a malformed journal.
  const conflicting = Buffer.from(
    [
      ...lines,
      JSON.stringify({
        state: "acknowledged",
        sequence: 2,
        intentSha256: JSON.parse(lines[4]).intentSha256,
        resultSha256: "0".repeat(64),
      }),
    ].join("\n") + "\n",
  );
  assert.throws(() => verifyEffectJournal(conflicting, r.context));
});

test("only a fresh decision naming the exact rejection settlement repeats the refused request and completes the remaining scope", async (t) => {
  const r = await rejectedRetirement(t);
  const observation = await r.observe();
  const observationBytes = readFileSync(
    join(r.f.root, "reconcile-1", "provider-observation.json"),
  );
  const producer = {
    run: {
      id: 90,
      path: ".github/workflows/promote-release.yml",
      event: "workflow_dispatch",
      head_branch: "main",
      head_sha: observation.readerController,
    },
    job: {
      id: 990,
      name: "reconcile",
      status: "completed",
      conclusion: "success",
    },
  };
  const settlement = {
    schemaVersion: 1,
    owner: "maksymshostak",
    operationId: r.context.operationId,
    decisionSha256: r.context.decisionSha256,
    journalSha256: hash(r.journal),
    sequence: 2,
    disposition: "rejected",
    rationale: "npm refused the Linux removal with HTTP 401 before applying it",
    providerEvidence: [
      {
        url: `${"https://github.com/"}${repository}/actions/runs/90/job/990`,
        sha256: hash(observationBytes),
      },
    ],
    rejection: {
      package: releasePackages[1],
      label: "pilot",
      source: r.context.source,
      controller: r.context.controller,
      run: r.context.run,
      attempt: r.context.attempt,
      job: r.job.id,
      step: npmStep,
      stepCompletedAt: r.job.steps[0].completed_at,
      logSha256: hash(r.log),
      npmErrorCode: "E401",
      refusal: originalPilotDelete,
    },
  };
  const effect = verifyEffectSettlement(settlement, r.journal, r.context);
  verifySettlementObservation(
    settlement,
    effect,
    r.context,
    observation,
    producer,
  );
  for (const [reason, change] of [
    ["source", (value) => (value.rejection.source = "f".repeat(40))],
    ["endpoint label", (value) => (value.rejection.label = "latest")],
    [
      "wrong endpoint proof",
      (value) =>
        (value.rejection.refusal = {
          ...originalPilotDelete,
          endpoint: pilotTagDeleteEndpoint(releasePackages[0]),
        }),
    ],
    ["package", (value) => (value.rejection.package = releasePackages[2])],
    [
      "step time",
      (value) => (value.rejection.stepCompletedAt = "2026-11-14T10:01:31Z"),
    ],
    ["log digest", (value) => (value.rejection.logSha256 = "0".repeat(64))],
    ["journal digest", (value) => (value.journalSha256 = "0".repeat(64))],
    ["original operation", (value) => (value.operationId = "other")],
    ["original decision", (value) => (value.decisionSha256 = "0".repeat(64))],
    ["applied disposition", (value) => (value.disposition = "applied")],
  ]) {
    const changed = structuredClone(settlement);
    change(changed);
    assert.throws(
      () => {
        const selected = verifyEffectSettlement(changed, r.journal, r.context);
        verifySettlementObservation(
          changed,
          selected,
          r.context,
          observation,
          producer,
        );
      },
      undefined,
      reason,
    );
  }
  const originalDecision = Buffer.from(r.f.env.OPERATION_JSON);
  const effects = verifyEffectJournal(r.journal, r.context);
  effects[1].outcome = "settled-rejected";
  const original = {
    entry: {
      run: { id: 79 },
      attempt: 1,
      job: { id: 891, name: "npm", conclusion: "failure" },
      files: {
        "operation.json": {
          sha256: hash(originalDecision),
          base64: originalDecision.toString("base64"),
        },
      },
    },
    bytes: r.journal,
    context: r.context,
    effects,
  };
  const fresh = (change = () => {}) => {
    const operation = structuredClone(r.f.operation);
    Object.assign(operation, {
      operationId: "retire-pilot-resumed",
      priors: { ...r.f.labels },
      noops: [releasePackages[0]],
      approvedDeletions: releasePackages.slice(1).map((name) => ({
        package: name,
        current: "1.0.2",
        target: null,
      })),
      originalOperationId: r.context.operationId,
      originalDecisionSha256: hash(originalDecision),
      originalJournalSha256: hash(r.journal),
      originalWriter: { run: "79", attempt: "1", job: "891" },
      settlements: [settlement],
    });
    change(operation);
    return operation;
  };
  const decide = (operation) => {
    const raw = JSON.stringify(operation);
    Object.assign(r.f.env, {
      OPERATION_JSON: raw,
      OPERATION_SHA: hash(Buffer.from(raw)),
      ADMISSION_DIRECTORY: join(r.f.root, `admission-${operation.operationId}`),
      NPM_DIRECTORY: join(r.f.root, `npm-${operation.operationId}`),
    });
    return operation;
  };
  r.f.provider.history = async (operation) => {
    verifyRecoveryAttribution(operation, [original]);
    return { writers: [], settled: {} };
  };
  assert.throws(
    () =>
      verifyRecoveryAttribution(
        fresh((operation) => delete operation.settlements),
        [original],
      ),
    /settlement/u,
  );
  // An acknowledged removal is never requested again.
  const repeated = fresh((operation) => {
    operation.priors[releasePackages[0]] = "1.0.2";
    operation.noops = [];
    operation.approvedDeletions.unshift({
      package: releasePackages[0],
      current: "1.0.2",
      target: null,
    });
  });
  assert.throws(
    () => verifyRecoveryAttribution(repeated, [original]),
    /repeat/u,
  );
  const resumed = decide(fresh());
  await r.f.runPhase("admit", r.f.env.ADMISSION_DIRECTORY);
  await r.f.runPhase("npm", r.f.env.NPM_DIRECTORY);
  delete r.f.env.RELEASE_GITHUB_RESULT_ID;
  assert.equal(
    (await r.f.runPhase("verify", join(r.f.root, "verify-resumed"))).status,
    "complete",
  );
  assert.deepEqual(
    r.f.writes.slice(2).map((write) => write.args),
    releasePackages.slice(1).map(removal),
  );
  assert.deepEqual(r.f.labels, absentFamily());
  const authenticatedOriginal = [{ ...original, effects }];
  verifyActiveOperations(
    resumed,
    r.f.env.OPERATION_SHA,
    [],
    authenticatedOriginal,
  );
  assert.throws(
    () =>
      verifyActiveOperations(
        { operationId: "unrelated", operation: "promote" },
        "unrelated-sha",
        [],
        authenticatedOriginal,
      ),
    /earlier release operation/u,
  );
});

test("one admission authenticates the selected signed history once for the retired subject and prior effects", async () => {
  let authentications = 0;
  const signed = [{ writers: [] }],
    deadlines = [];
  const provider = nativeReleaseProvider(
    {
      HISTORY_CHECKPOINT: JSON.stringify(["release-history-fixture"]),
      GH_TOKEN: "fixture",
    },
    {
      readHistory: (refs, _gh, { deadline }) => {
        assert.deepEqual(refs, ["release-history-fixture"]);
        authentications++;
        deadlines.push(deadline);
        return signed;
      },
      admitHistory: async (_operation, options) => options,
    },
  );
  const qualified = {
    version: "1.0.2",
    source: "a".repeat(40),
    manifestSha256: "b".repeat(64),
  };
  const operation = {
    retired: {
      ...qualified,
      qualificationSha256: "c".repeat(64),
      releaseId: 70,
      prerelease: false,
    },
  };
  const admissionDeadline = Date.now() + 900000;
  await provider.retired(
    operation,
    { qualified, qualificationSha256: "c".repeat(64), tagSha: "d".repeat(40) },
    admissionDeadline,
  );
  const options = await provider.history(operation, "[]", {});
  assert.equal(authentications, 1, "Cold admission reads signed history once");
  assert.equal(options.checkpoints, signed);
  assert.deepEqual(deadlines, [admissionDeadline]);
  // A later writer authentication in the same process reuses the same bytes.
  provider.checkpoints(Date.now() + 1000);
  assert.equal(authentications, 1);
});
