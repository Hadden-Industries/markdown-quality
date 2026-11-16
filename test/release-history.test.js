// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { releaseFixture } from "./release-fixture.js";
import { native } from "../scripts/commands.js";
import { hash } from "../scripts/release-bytes.js";
import { encodeHistoryCheckpoint } from "../scripts/release-history-format.js";
import {
  readWriterIntents,
  verifyWriterInventory,
} from "../scripts/release-writer-inventory.js";
import {
  verifySignedCheckpoint,
  mergeWriterHistory,
  verifyActiveOperations,
  collectWriterHistory,
  recoveryLineage,
  writerNeverRequested,
  legacyArchiveSettled,
  checkpointTargets,
  admitRetiredQualification,
} from "../scripts/release-history.js";
import {
  retainedArtifact,
  restoreRetainedFiles,
  verifyRetainedFiles,
  assertRetainedArtifactIdentity,
  authenticateArtifact,
} from "../scripts/release-retained-artifacts.js";
import { verifySettlementObservation } from "../scripts/release-effects.js";
import { stagedUpload } from "./publication-history-fixture.js";
import { verifyRecoveryAttribution } from "../scripts/release-history.js";
import { releasePackages } from "../scripts/release-coordinates.js";
import {
  retainedCheckpointTargets,
  retainedQualificationFiles,
} from "../scripts/prepare-release-history.js";

test("a second interrupted continuation preserves ancestor requests and the active operation chain", () => {
  const labels = (version) =>
    Object.fromEntries(releasePackages.map((name) => [name, version]));
  const approved = {
    operationId: "A",
    operation: "promote",
    label: "latest",
    manifestSha256: "a".repeat(64),
    priors: labels("1.0.1"),
    targets: labels("1.0.2"),
    targetIntegrities: labels("integrity"),
    scope: { npm: [...releasePackages], github: true },
  };
  const parent = (decision, run, name) => {
    const raw = Buffer.from(JSON.stringify(decision)),
      bytes = Buffer.from(`journal-${run}`);
    return {
      entry: {
        run: { id: run },
        attempt: 1,
        job: { id: run, name: "npm" },
        files: {
          "operation.json": {
            sha256: hash(raw),
            base64: raw.toString("base64"),
          },
        },
      },
      context: {
        operationId: decision.operationId,
        decisionSha256: hash(raw),
        workflow: ".github/workflows/promote-release.yml",
      },
      bytes,
      effects: [
        {
          provider: "npm",
          subject: name,
          prior: "1.0.1",
          target: "1.0.2",
          outcome: "acknowledged",
        },
      ],
    };
  };
  const a = parent(approved, 80, releasePackages[0]);
  const refs = (original) => ({
    originalWriter: {
      run: original.entry.run.id,
      attempt: 1,
      job: original.entry.job.id,
    },
    originalJournalSha256: hash(original.bytes),
    originalOperationId: original.context.operationId,
    originalDecisionSha256: original.context.decisionSha256,
  });
  const decisionB = {
    ...approved,
    operationId: "B",
    operation: "continue",
    ...refs(a),
    scope: { npm: releasePackages.slice(1), github: true },
    priors: { ...approved.priors, [releasePackages[0]]: "1.0.2" },
  };
  const b = parent(decisionB, 81, releasePackages[1]);
  const decisionC = {
    ...approved,
    operationId: "C",
    operation: "continue",
    ...refs(b),
    scope: { npm: releasePackages.slice(2), github: true },
    priors: { ...decisionB.priors, [releasePackages[1]]: "1.0.2" },
  };
  assert.equal(recoveryLineage(decisionC, [a, b]).length, 2);
  verifyRecoveryAttribution(decisionC, [a, b]);
  verifyActiveOperations(decisionC, "new-sha", [], [a, b]);
  assert.throws(
    () =>
      verifyRecoveryAttribution(
        { ...decisionC, scope: { npm: [...releasePackages], github: true } },
        [a, b],
      ),
    /cannot repeat/u,
  );
  assert.throws(() => recoveryLineage(decisionC, [b]), /Missing original/u);
});

test("a legacy failed archive needs its exact signed native release ID, complete inventory and original source", () => {
  const qualified = {
    version: "4.0.0",
    source: "a".repeat(40),
    manifestSha256: "b".repeat(64),
  };
  const assets = [
    {
      name: "release-manifest.json",
      size: 100,
      digest: `sha256:${qualified.manifestSha256}`,
    },
  ];
  const file = (value) => {
    const raw = Buffer.from(JSON.stringify(value));
    return { sha256: hash(raw), base64: raw.toString("base64") };
  };
  const entry = {
    attempt: 1,
    run: { id: 80, path: ".github/workflows/github-release.yml" },
    job: { id: 90, name: "archive" },
    inventory: { total_count: 0, jobs: [] },
    artifact: { id: 200 },
    files: {
      "release.txt": file({
        id: 70,
        tag_name: "v4.0.0",
        draft: false,
        immutable: true,
        assets,
      }),
      "tag.txt": file({
        tag: "v4.0.0",
        object: { sha: qualified.source, type: "commit" },
        verification: { verified: true, reason: "valid" },
      }),
    },
  };
  const checkpoint = {
    writers: [entry],
    targetQualification: {
      qualified,
      archive: { releaseId: 70, immutable: true, assets },
    },
  };
  assert.equal(legacyArchiveSettled(entry, [checkpoint]), true);
  assert.equal(
    legacyArchiveSettled(entry, [
      {
        ...checkpoint,
        targetQualification: {
          ...checkpoint.targetQualification,
          archive: { ...checkpoint.targetQualification.archive, releaseId: 71 },
        },
      },
    ]),
    false,
  );
  assert.equal(
    legacyArchiveSettled(
      { ...entry, files: { "tag.txt": entry.files["tag.txt"] } },
      [checkpoint],
    ),
    false,
  );
});

test("an archive with effects stays pending until its own read-only terminal proof", () => {
  const context = {
    operationId: "archive-A",
    decisionSha256: "a".repeat(64),
    workflow: ".github/workflows/github-release.yml",
  };
  const original = {
    context,
    entry: { job: { name: "archive" } },
    effects: [{ provider: "github" }],
  };
  const next = { operationId: "stage-B", operation: "stage" };
  assert.throws(
    () => verifyActiveOperations(next, "b".repeat(64), [], [original]),
    /earlier release operation/u,
  );
  const bytes = Buffer.from(
    JSON.stringify({ status: "complete", originalWriter: context }),
  );
  const completion = {
    job: { name: "Read-only archive completion", conclusion: "success" },
    files: { "completion.json": { base64: bytes.toString("base64") } },
  };
  verifyActiveOperations(next, "b".repeat(64), [completion], [original]);
});

test("a complete native skipped request inventory proves setup failed before effects", () => {
  const job = {
    name: "npm",
    steps: [
      {
        name: "Change only approved npm labels, natives first",
        status: "completed",
        conclusion: "skipped",
      },
    ],
  };
  assert.equal(writerNeverRequested(job), true);
  assert.equal(writerNeverRequested({ ...job, steps: [] }), false);
  assert.equal(
    writerNeverRequested({
      ...job,
      steps: [{ ...job.steps[0], conclusion: "failure" }],
    }),
    false,
  );
});

test("native history retains inherited original executions and signed missing attempts without accepting metadata conflicts", async () => {
  const repository = "Hadden-Industries/markdown-quality",
    sha = "a".repeat(40);
  const run = {
    id: 80,
    run_attempt: 2,
    run_number: 1,
    workflow_id: 387091671,
    head_branch: "main",
    event: "workflow_dispatch",
    created_at: "2020-01-01T00:00:00Z",
    path: ".github/workflows/promote-release.yml",
    head_sha: sha,
    status: "completed",
    conclusion: "success",
    repository: { id: 1, full_name: repository, description: "updated" },
    head_repository: { id: 1, full_name: repository },
  };
  const job = {
    id: 901,
    name: "npm",
    run_id: 80,
    run_attempt: 1,
    head_sha: sha,
    status: "completed",
    conclusion: "success",
    runner_id: 77,
    started_at: "2026-11-13T00:00:00Z",
    completed_at: "2026-11-13T00:01:00Z",
    steps: [],
  };
  const artifact = {
    id: 200,
    name: "npm-operation-1",
    size_in_bytes: 100,
    digest: `sha256:${"b".repeat(64)}`,
    workflow_run: {
      id: 80,
      repository_id: 1,
      head_repository_id: 1,
      head_sha: sha,
    },
  };
  let listed = true,
    branch = "main",
    originalSha = sha;
  let missing = false,
    denial = false,
    downloads = 0;
  const gh = (args) => {
    const path = args[1];
    if (path.includes("/actions/workflows/"))
      return JSON.stringify([
        {
          total_count: Number(listed && path.includes("promote-release.yml")),
          workflow_runs:
            listed && path.includes("promote-release.yml")
              ? [{ ...run, head_branch: branch }]
              : [],
        },
      ]);
    if (path.includes("/artifacts?"))
      return JSON.stringify([
        { artifacts: [{ ...artifact, expired: missing }] },
      ]);
    const attempt = Number(/attempts\/(\d+)/u.exec(path)?.[1]);
    assert.ok(attempt);
    if (missing && attempt === 1)
      throw Object.assign(new Error("original unavailable"), {
        httpStatus: denial ? 403 : 404,
      });
    return JSON.stringify(
      path.includes("/jobs?")
        ? {
            total_count: 1,
            jobs: [{ ...job, id: 900 + attempt, run_attempt: attempt }],
          }
        : { ...run, head_sha: originalSha, run_attempt: attempt },
    );
  };
  const download = async ({ destination }) => {
    downloads++;
    mkdirSync(destination);
    writeFileSync(join(destination, "original.txt"), "original bytes");
  };
  const options = {
    env: { GH_TOKEN: "fixture" },
    gh,
    download,
    approvedControllers: new Set([sha]),
    intents: [],
    baseline: {
      publish: { runs: [] },
      "github-release": { runs: [] },
      "promote-release": { workflowId: run.workflow_id, runs: [] },
    },
  };
  const live = await collectWriterHistory(options);
  assert.equal(live.writers.length, 1);
  assert.equal(live.missing.length, 0);
  assert.equal(downloads, 1);
  missing = true;
  const signed = structuredClone(live.writers[0]);
  signed.run.repository.description = "before edit";
  const retained = await collectWriterHistory({
    ...options,
    checkpoints: [{ writers: [signed] }],
  });
  assert.equal(retained.writers.length, 1);
  assert.equal(retained.missing.length, 0);
  assert.equal(downloads, 1);
  assert.equal(mergeWriterHistory(live.writers, [signed]).length, 1);
  denial = true;
  await assert.rejects(
    collectWriterHistory({ ...options, checkpoints: [{ writers: [signed] }] }),
    /original unavailable/u,
  );
  missing = false;
  branch = "feature";
  assert.equal((await collectWriterHistory(options)).writers.length, 0);
  assert.equal(downloads, 1);
  branch = "main";
  await assert.rejects(
    collectWriterHistory({ ...options, approvedControllers: new Set() }),
    /protected main history/u,
  );
  originalSha = "b".repeat(40);
  await assert.rejects(collectWriterHistory(options), /identity changed/u);
  originalSha = sha;
  listed = false;
  const intent = {
    workflow: "promote-release",
    number: 1,
    attempt: 1,
    controller: sha,
    decision: "d".repeat(64),
  };
  await assert.rejects(
    collectWriterHistory({ ...options, intents: [intent] }),
    /Expected release run is missing/u,
  );
  const recovered = await collectWriterHistory({
    ...options,
    intents: [intent],
    checkpoints: [{ writers: [signed], writerAttempts: live.writerAttempts }],
  });
  assert.equal(recovered.writers.length, 1);
  assert.equal(recovered.writerAttempts.length, 2);
  const legacy = {
    ...options.baseline,
    "promote-release": { workflowId: run.workflow_id, runs: [run.id] },
  };
  const checkpoint = {
    writers: [signed],
    writerAttempts: live.writerAttempts,
    closedWriterRuns: live.closedWriterRuns,
  };
  const restoreLegacy = (record) =>
    collectWriterHistory({
      ...options,
      baseline: legacy,
      checkpoints: [record],
    });
  await restoreLegacy(checkpoint);
  await assert.rejects(
    restoreLegacy({ ...checkpoint, closedWriterRuns: [] }),
    /rerun window/u,
  );
  await assert.rejects(
    restoreLegacy({
      ...checkpoint,
      writerAttempts: checkpoint.writerAttempts.slice(0, 1),
    }),
    /omits a legacy writer attempt/u,
  );
  listed = true;
  branch = "feature";
  const collision = await collectWriterHistory({
    ...options,
    intents: [intent],
  });
  assert.equal(collision.nonWriterRuns.length, 1);
  listed = false;
  assert.equal(
    (
      await collectWriterHistory({
        ...options,
        intents: [intent],
        checkpoints: [{ writers: [], nonWriterRuns: collision.nonWriterRuns }],
      })
    ).writers.length,
    0,
  );
  const env = {
    GITHUB_WORKFLOW_REF: `${repository}/${run.path}@refs/heads/main`,
    GITHUB_RUN_ID: String(run.id),
    GITHUB_RUN_ATTEMPT: "2",
    GITHUB_RUN_NUMBER: "1",
    GITHUB_SHA: sha,
    OPERATION_SHA: intent.decision,
  };
  const valid = { ...intent, attempt: 2 };
  const verify = (intents) =>
    verifyWriterInventory(
      "promote-release",
      [run],
      [],
      intents,
      env,
      true,
      options.baseline,
    );
  verify([valid]);
  for (const change of [
    { controller: "b".repeat(40) },
    { decision: "c".repeat(64) },
    { attempt: 1 },
    { workflow: "publish" },
  ]) {
    assert.throws(
      () => verify([{ ...valid, ...change }]),
      /owner-signed intent/u,
    );
  }
  assert.throws(() => verify([]), /owner-signed intent/u);
});

test("a failed native staging writer whose requests completed is exported with its original evidence and never inferred without it", async () => {
  const repository = "Hadden-Industries/markdown-quality",
    sha = "c".repeat(40);
  // Mirrors E-03: both native requests completed, then the evidence step failed.
  const run = {
    id: 456,
    run_attempt: 1,
    run_number: 1,
    workflow_id: 375858484,
    head_branch: "main",
    event: "workflow_dispatch",
    created_at: new Date().toISOString(),
    path: ".github/workflows/publish.yml",
    head_sha: sha,
    status: "completed",
    conclusion: "failure",
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
  };
  const stage = {
    id: 9001,
    name: "stage",
    run_id: run.id,
    run_attempt: 1,
    head_sha: sha,
    status: "completed",
    conclusion: "failure",
    runner_id: 41,
    started_at: "2026-11-14T00:00:00Z",
    completed_at: "2026-11-14T00:05:00Z",
    steps: [
      ["Stage Windows package under reviewed channel", "success"],
      ["Stage Linux package under reviewed channel", "success"],
      ["Verify both native archives before core staging", "skipped"],
      ["Stage coherent core under reviewed channel", "skipped"],
    ].map(([name, conclusion]) => ({ name, status: "completed", conclusion })),
  };
  const artifact = {
    id: 3001,
    name: "publication-source-and-manifest-1",
    size_in_bytes: 512,
    digest: `sha256:${"e".repeat(64)}`,
    expired: false,
    workflow_run: {
      id: run.id,
      repository_id: 1,
      head_repository_id: 1,
      head_sha: sha,
    },
  };
  const receipt = stagedUpload(stage, artifact, "failure");
  stage.steps.push(receipt.step);
  let artifacts = [artifact],
    downloads = 0;
  const gh = (args) => {
    const path = args[1];
    if (path.includes("/actions/workflows/"))
      return JSON.stringify([
        {
          total_count: Number(path.includes("publish.yml")),
          workflow_runs: path.includes("publish.yml") ? [run] : [],
        },
      ]);
    if (path.includes("/artifacts?"))
      return JSON.stringify([{ artifacts: structuredClone(artifacts) }]);
    if (path.endsWith("/jobs?per_page=100"))
      return JSON.stringify({ total_count: 1, jobs: [stage] });
    return JSON.stringify(run);
  };
  const options = {
    env: { GH_TOKEN: "fixture" },
    gh,
    readEvidence: async (path) => {
      assert.equal(path, `/actions/jobs/${stage.id}/logs`);
      return receipt.log;
    },
    download: async ({ id, destination }) => {
      assert.equal(id, artifact.id);
      downloads++;
      mkdirSync(join(destination, "staging-journal"), { recursive: true });
      writeFileSync(
        join(destination, "staging-journal", "win32-x64.jsonl"),
        '{"state":"attempted"}\n{"state":"staged-awaiting-owner"}\n',
      );
    },
    approvedControllers: new Set([sha]),
    intents: [],
    baseline: {
      publish: { workflowId: run.workflow_id, runs: [] },
      "github-release": { runs: [] },
      "promote-release": { runs: [] },
    },
  };
  const exported = await collectWriterHistory(options);
  assert.equal(downloads, 1);
  assert.deepEqual(exported.missing, []);
  assert.equal(exported.writers.length, 1);
  const [writer] = exported.writers;
  assert.equal(writer.run.conclusion, "failure", "Original failure retained");
  assert.equal(writer.job.conclusion, "failure");
  assert.deepEqual(Object.keys(writer.files), [
    "staging-journal/win32-x64.jsonl",
  ]);
  assert.deepEqual(exported.writerAttempts, [
    { run, inventory: { total_count: 1, jobs: [stage] } },
  ]);
  artifacts = [];
  const unproven = await collectWriterHistory(options);
  assert.equal(downloads, 1, "No evidence is fabricated for a missing writer");
  assert.deepEqual(unproven.writers, []);
  assert.deepEqual(unproven.missing, [
    {
      workflow: run.path,
      run: run.id,
      attempt: 1,
      job: stage.id,
      reason: "missing-original-writer-artifact",
    },
  ]);
});

test("intent refs bind the protected tag name and exact annotated controller to the owner signature", () => {
  const controller = "a".repeat(40),
    tagSha = "b".repeat(40),
    digest = "c".repeat(64);
  const name = `release-history-intent-publish-17-1-${digest}`;
  const ref = {
    ref: `refs/tags/${name}`,
    object: { type: "tag", sha: tagSha },
  };
  const annotation = {
    tag: name,
    sha: tagSha,
    object: { type: "commit", sha: controller },
  };
  const read = (args) =>
    JSON.stringify(args[1].includes("/matching-refs/") ? [[ref]] : annotation);
  let verified = 0;
  assert.deepEqual(
    readWriterIntents(read, (tag) => {
      assert.deepEqual(tag, annotation);
      verified++;
    }),
    [
      {
        workflow: "publish",
        number: 17,
        attempt: 1,
        decision: digest,
        controller,
      },
    ],
  );
  assert.equal(verified, 1);
  assert.throws(
    () =>
      readWriterIntents(read, () => {
        throw Error("signature refused");
      }),
    /signature refused/u,
  );
  annotation.tag += "-other";
  assert.throws(() =>
    readWriterIntents(read, () => assert.fail("Wrong tag identity")),
  );
});

test("deleted original artifacts, runs and jobs require exact signed evidence; ordinary denials and conflicts never fall back", async () => {
  const repository = "Hadden-Industries/markdown-quality",
    sha = "a".repeat(40);
  const run = {
    id: 80,
    run_attempt: 1,
    head_sha: sha,
    path: ".github/workflows/promote-release.yml",
    event: "workflow_dispatch",
    head_branch: "main",
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
  };
  const job = {
    id: 90,
    name: "npm",
    run_id: 80,
    run_attempt: 1,
    head_sha: sha,
    status: "completed",
    conclusion: "success",
  };
  const artifact = {
    id: 200,
    name: "npm-operation-1",
    size_in_bytes: 100,
    digest: `sha256:${"b".repeat(64)}`,
    workflow_run: {
      id: 80,
      head_sha: sha,
      repository_id: 1,
      head_repository_id: 1,
    },
  };
  const original = {
    run,
    attempt: 1,
    job,
    artifact,
    inventory: { total_count: 1, jobs: [job] },
    files: {},
  };
  const expected = {
    name: artifact.name,
    run: "80",
    attempt: "1",
    controller: sha,
    workflow: run.path,
    job: "npm",
  };
  const missing = async () => {
    throw Object.assign(new Error("missing"), { httpStatus: 404 });
  };
  const result = await authenticateArtifact(200, expected, {
    api: missing,
    checkpoints: [{ writers: [original] }],
  });
  assert.equal(result.artifact.expired, true);
  assert.equal(result.retained.job.id, 90);
  await assert.rejects(
    authenticateArtifact(200, expected, { api: missing }),
    /complete signed/u,
  );
  await assert.rejects(
    authenticateArtifact(200, expected, {
      api: async () => {
        throw Object.assign(new Error("denied"), { httpStatus: 403 });
      },
      checkpoints: [{ writers: [original] }],
    }),
    /denied/u,
  );
  await assert.rejects(
    authenticateArtifact(200, expected, {
      api: async () => ({
        ...artifact,
        expired: true,
        digest: `sha256:${"c".repeat(64)}`,
      }),
      checkpoints: [{ writers: [original] }],
    }),
    /identities disagree/u,
  );
});

test("a pending family operation blocks a new ID until authenticated completion or explicit recovery", () => {
  const context = {
    operationId: "old",
    decisionSha256: "old-sha",
    workflow: ".github/workflows/promote-release.yml",
  };
  const writers = ["npm", "github"].map((name) => ({
    context: { ...context, job: name },
    entry: { job: { name } },
    effects: name === "npm" ? [{}] : [],
  }));
  assert.throws(
    () =>
      verifyActiveOperations(
        { operationId: "new", operation: "promote" },
        "new-sha",
        [],
        writers,
      ),
    /earlier release operation/u,
  );
  assert.throws(() =>
    verifyActiveOperations(
      {
        operationId: "new",
        operation: "partial",
        originalOperationId: "old",
        originalDecisionSha256: "old-sha",
      },
      "new-sha",
      [],
      writers,
    ),
  );
  const completion = {
    status: "complete",
    operationId: "old",
    decisionSha256: "old-sha",
    operation: { operationId: "old", operation: "promote" },
    originalWriters: Object.fromEntries(
      writers.map((value) => [value.entry.job.name, value.context]),
    ),
  };
  const entry = {
    job: { name: "Read-only release completion", conclusion: "success" },
    files: {
      "completion.json": {
        base64: Buffer.from(JSON.stringify(completion)).toString("base64"),
      },
    },
  };
  verifyActiveOperations(
    { operationId: "new", operation: "promote" },
    "new-sha",
    [entry],
    writers,
  );
  assert.throws(() =>
    verifyActiveOperations(
      { operationId: "new", operation: "promote" },
      "new-sha",
      [{ ...entry, job: { ...entry.job, conclusion: "failure" } }],
      writers,
    ),
  );
});

test("an npm-only retirement completes without a GitHub writer while other operations still require theirs", () => {
  const context = {
    operationId: "retire",
    decisionSha256: "retire-sha",
    workflow: ".github/workflows/promote-release.yml",
    job: "npm",
  };
  const writers = [{ context, entry: { job: { name: "npm" } }, effects: [{}] }];
  const completed = (operation) => ({
    job: { name: "Read-only release completion", conclusion: "success" },
    files: {
      "completion.json": {
        base64: Buffer.from(
          JSON.stringify({
            status: "complete",
            operationId: "retire",
            decisionSha256: "retire-sha",
            operation: { operationId: "retire", operation },
            originalWriters: { npm: context, github: null },
          }),
        ).toString("base64"),
      },
    },
  });
  const next = { operationId: "next", operation: "promote" };
  verifyActiveOperations(
    next,
    "next-sha",
    [completed("retire-pilot")],
    writers,
  );
  assert.throws(
    () =>
      verifyActiveOperations(next, "next-sha", [completed("promote")], writers),
    /missing its exact original writer/u,
  );
});

test("settlements require a structured independent original-effect observation; public absence is not a negative receipt", () => {
  const effect = {
    provider: "npm",
    subject: "@hadden-industries/markdown-quality",
    operation: "set-label",
    step: "npm/core",
    prior: "3.0.1",
    target: "4.0.0",
    sequence: 1,
  };
  const context = { operationId: "original" },
    settlement = { disposition: "applied", journalSha256: "a".repeat(64) };
  const producer = {
    run: {
      path: ".github/workflows/promote-release.yml",
      event: "workflow_dispatch",
      head_branch: "main",
      head_sha: "b".repeat(40),
    },
    job: { name: "reconcile", status: "completed", conclusion: "success" },
  };
  const observation = {
    schemaVersion: 1,
    kind: "release-effect-observation",
    readerController: producer.run.head_sha,
    originalContext: context,
    journalSha256: settlement.journalSha256,
    sequence: 1,
    observedAt: new Date().toISOString(),
    effect,
    observedState: "target-visible",
    observation: { npm: { [effect.subject]: "4.0.0" } },
  };
  verifySettlementObservation(
    settlement,
    effect,
    context,
    observation,
    producer,
  );
  assert.throws(
    () =>
      verifySettlementObservation(
        { ...settlement, disposition: "not-applied" },
        effect,
        context,
        observation,
        producer,
      ),
    /cannot prove/u,
  );
  assert.throws(() =>
    verifySettlementObservation(settlement, effect, context, observation, {
      ...producer,
      job: { ...producer.job, name: "npm" },
    }),
  );
  assert.throws(() =>
    verifySettlementObservation(
      settlement,
      effect,
      context,
      { ...observation, originalContext: { operationId: "unrelated" } },
      producer,
    ),
  );
});

/** Build an owner-signed single-target checkpoint and its real signature verifier. */
function signedCheckpointHarness(t) {
  const f = releaseFixture(t),
    root = dirname(f.directory),
    key = join(root, "history-key");
  native("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
  const policy = {
    principal: "history@example.test",
    activeKeys: [
      readFileSync(`${key}.pub`, "utf8")
        .trim()
        .split(/\s+/u)
        .slice(0, 2)
        .join(" "),
    ],
    historicalTags: {},
  };
  const file = (bytes) => ({
    base64: bytes.toString("base64"),
    sha256: hash(bytes),
  });
  const qualifiedBytes = Buffer.from(
    JSON.stringify(f.qualified, null, 2) + "\n",
  );
  const files = Object.fromEntries(
    readdirSync(f.input)
      .filter((name) => !name.endsWith(".tgz"))
      .map((name) => [name, file(readFileSync(join(f.input, name)))]),
  );
  const run = {
    id: 80,
    repository: { id: 1, full_name: "Hadden-Industries/markdown-quality" },
    head_repository: { id: 1, full_name: "Hadden-Industries/markdown-quality" },
    run_attempt: 1,
    run_number: 1,
    workflow_id: 387091671,
    head_branch: "main",
    event: "workflow_dispatch",
    head_sha: f.qualified.source,
    path: ".github/workflows/promote-release.yml",
  };
  const job = {
    id: 900,
    name: "npm",
    head_sha: run.head_sha,
    run_id: 80,
    run_attempt: 1,
    status: "completed",
    conclusion: "success",
  };
  const writer = {
    run,
    attempt: 1,
    job,
    inventory: { total_count: 1, jobs: [job] },
    artifact: {
      id: 200,
      name: "npm-operation-1",
      digest: `sha256:${"a".repeat(64)}`,
      size_in_bytes: 100,
    },
    files: { "effects.jsonl": file(Buffer.from("original writer bytes\n")) },
  };
  Object.assign(job, {
    runner_id: 77,
    started_at: "2026-11-10T00:00:00Z",
    completed_at: "2026-11-10T00:01:00Z",
    steps: [],
  });
  const checkpoint = {
    schemaVersion: 1,
    repository: run.repository.full_name,
    complete: true,
    writers: [writer],
    writerAttempts: [{ run, inventory: writer.inventory }],
    targetQualification: {
      qualified: f.qualified,
      qualificationBase64: qualifiedBytes.toString("base64"),
      qualificationSha256: hash(qualifiedBytes),
      files,
      archive: { releaseId: 70, immutable: true, assets: f.assets },
      providers: [f.candidate, f.publication].map(
        ({ data, expected }, index) => ({
          ...data,
          artifacts: [
            {
              id: 100 + index,
              digest: `sha256:${"b".repeat(64)}`,
              workflow_run: {
                id: Number(expected.run),
                head_sha: expected.source,
              },
            },
          ],
        }),
      ),
    },
  };
  const reference = {
    ref: "refs/tags/release-history-fixture",
    object: { type: "tag", sha: "c".repeat(40) },
  };
  const payload = `object ${"d".repeat(40)}\ntype commit\ntag release-history-fixture\ntagger History <history@example.test> 1 +0000\n\nRetained original evidence\n`;
  const annotation = {
    sha: reference.object.sha,
    tag: "release-history-fixture",
    object: { type: "commit", sha: "d".repeat(40) },
    verification: {
      verified: true,
      reason: "valid",
      payload,
      signature: native("ssh-keygen", ["-Y", "sign", "-f", key, "-n", "git"], {
        input: payload,
      }),
    },
  };
  const verify = (
    value,
    serialize = (record) => Buffer.from(JSON.stringify(record)),
  ) => {
    const bytes = serialize(value);
    return verifySignedCheckpoint(bytes, {
      reference,
      annotation,
      signerPolicy: policy,
      command: () => bytes,
    });
  };
  /** A complete original target record for another qualified fixture. */
  const target = (fixture) => {
    const bytes = Buffer.from(
      JSON.stringify(fixture.qualified, null, 2) + "\n",
    );
    return {
      qualified: fixture.qualified,
      qualificationBase64: bytes.toString("base64"),
      qualificationSha256: hash(bytes),
      files: Object.fromEntries(
        readdirSync(fixture.input)
          .filter((name) => !name.endsWith(".tgz"))
          .map((name) => [name, file(readFileSync(join(fixture.input, name)))]),
      ),
      archive: { releaseId: 60, immutable: true, assets: fixture.assets },
      providers: [fixture.candidate, fixture.publication].map(
        ({ data, expected }, index) => ({
          ...data,
          artifacts: [
            {
              id: 300 + index,
              digest: `sha256:${"b".repeat(64)}`,
              workflow_run: {
                id: Number(expected.run),
                head_sha: expected.source,
              },
            },
          ],
        }),
      ),
    };
  };
  return {
    f,
    root,
    policy,
    file,
    run,
    writer,
    checkpoint,
    reference,
    annotation,
    verify,
    target,
  };
}

test("compressed signed history admits the complete original target and writer evidence", (t) => {
  const h = signedCheckpointHarness(t);
  assert.deepEqual(
    h.verify(h.checkpoint, encodeHistoryCheckpoint),
    h.checkpoint,
  );
});

test("history retains admission receipts and locks without copying immutable verbose evidence", (t) => {
  const h = signedCheckpointHarness(t);
  const directory = join(h.root, "retention-selection");
  mkdirSync(directory);
  const required = [
    "release-manifest.json",
    "publication-origins.json",
    "signed-tag.json",
    "registry-lane.json",
    "public-recipient-root-package-lock.json",
    "stage-core-reconciliation.json",
  ];
  const omitted = [
    "package.tgz",
    "source.tar",
    "performance-driver.stdout.txt",
    "performance-qualification.json",
  ];
  for (const name of [...required, ...omitted])
    writeFileSync(join(directory, name), name);
  const files = retainedQualificationFiles(
    {
      reports: { "registry-lane.json": {} },
      evidence: Object.fromEntries(
        [...required.slice(4), ...omitted].map((name) => [
          name,
          "a".repeat(64),
        ]),
      ),
    },
    directory,
  );
  assert.deepEqual(Object.keys(files).sort(), required.sort());
  for (const [name, file] of Object.entries(files))
    assert.equal(Buffer.from(file.base64, "base64").toString(), name);
});

test("expiry fallback requires a complete owner-signed history AND separate original target qualification", (t) => {
  const {
    f,
    root,
    policy,
    file,
    run,
    writer,
    checkpoint,
    reference,
    annotation,
    verify,
  } = signedCheckpointHarness(t);
  const admitted = verify(checkpoint);
  const original = retainedArtifact([admitted], 200, {
    name: "npm-operation-1",
    run: "80",
    attempt: "1",
    controller: run.head_sha,
    workflow: run.path,
    job: "npm",
  });
  const restored = join(root, "restored");
  restoreRetainedFiles(restored, original);
  verifyRetainedFiles(restored, original);
  assertRetainedArtifactIdentity({ ...writer.artifact, expired: true }, writer);
  assert.throws(() =>
    assertRetainedArtifactIdentity(
      { ...writer.artifact, digest: `sha256:${"c".repeat(64)}` },
      writer,
    ),
  );
  for (const mutate of [
    (value) => {
      delete value.targetQualification;
    },
    (value) => {
      value.writers = [];
    },
    (value) => {
      const second = { ...value.writers[0].job, id: 901, name: "github" };
      value.writerAttempts[0].inventory = {
        total_count: 2,
        jobs: [value.writers[0].job, second],
      };
      value.writers[0].inventory = value.writerAttempts[0].inventory;
    },
    (value) => {
      value.complete = false;
    },
    (value) => {
      delete value.targetQualification.files[
        Object.keys(value.targetQualification.qualified.evidence).find((name) =>
          name.endsWith("-package-lock.json"),
        )
      ];
    },
    (value) => {
      value.targetQualification.providers[0].jobs.jobs.pop();
    },
  ]) {
    const changed = structuredClone(checkpoint);
    mutate(changed);
    assert.throws(() => verify(changed), String(mutate));
  }
  assert.throws(() =>
    verifySignedCheckpoint(Buffer.from(JSON.stringify(checkpoint)), {
      reference,
      annotation,
      signerPolicy: { ...policy, activeKeys: [] },
      command: () => Buffer.from(JSON.stringify(checkpoint)),
    }),
  );
  const conflict = structuredClone(writer);
  conflict.files["effects.jsonl"] = file(Buffer.from("replacement snapshot\n"));
  assert.throws(() => mergeWriterHistory([writer], [conflict]), /Conflicting/u);
});

test("an extended checkpoint keeps distinct stable and retired subjects attributable and replays both after expiry", async (t) => {
  const h = signedCheckpointHarness(t);
  const older = releaseFixture(t, true, undefined, "1.0.1");
  const stable = h.checkpoint.targetQualification;
  const retired = h.target(older);
  retired.archive.tagSha = "9".repeat(40);
  const extended = structuredClone(h.checkpoint);
  delete extended.targetQualification;
  Object.assign(extended, {
    schemaVersion: 2,
    targetQualifications: [stable, retired],
  });
  const admitted = h.verify(extended);
  assert.deepEqual(
    checkpointTargets(admitted).map((target) => target.qualified.version),
    ["1.0.2", "1.0.1"],
  );
  assert.deepEqual(
    checkpointTargets(h.verify(h.checkpoint)).map(
      (target) => target.qualificationSha256,
    ),
    [stable.qualificationSha256],
    "Single-target checkpoints keep their original reader",
  );
  // Replay uses only signed bytes and current immutable identities: no
  // Actions artifact or run is read for the retired subject.
  const reads = [];
  const api = async (path) => {
    reads.push(path);
    if (path === "git/ref/tags/v1.0.1")
      return { object: { type: "tag", sha: "9".repeat(40) } };
    if (path.startsWith("git/tags/")) return {};
    if (path === "releases/60")
      return {
        id: 60,
        tag_name: "v1.0.1",
        immutable: true,
        draft: false,
        prerelease: false,
        assets: structuredClone(retired.archive.assets),
      };
    throw new Error(`Unexpected replay read: ${path}`);
  };
  const identity = await admitRetiredQualification(
    {
      retired: {
        version: "1.0.1",
        source: older.qualified.source,
        manifestSha256: older.qualified.manifestSha256,
        qualificationSha256: retired.qualificationSha256,
        releaseId: 60,
        prerelease: false,
      },
    },
    {
      admitted: {
        qualified: stable.qualified,
        qualificationSha256: stable.qualificationSha256,
      },
      checkpoints: [admitted],
      api,
      verifyTag: () => {},
    },
  );
  assert.equal(identity.tagSha, "9".repeat(40));
  assert.deepEqual(reads, [
    "git/ref/tags/v1.0.1",
    `git/tags/${"9".repeat(40)}`,
    "releases/60",
  ]);
  for (const [reason, mutate] of [
    [
      "a subject stored twice",
      (value) => (value.targetQualifications = [stable, stable]),
    ],
    [
      "a mixed single and extended format",
      (value) => (value.targetQualification = stable),
    ],
    ["an empty target inventory", (value) => (value.targetQualifications = [])],
    [
      "an incomplete retired subject",
      (value) =>
        delete value.targetQualifications[1].files["release-manifest.json"],
    ],
    ["an unknown checkpoint format", (value) => (value.schemaVersion = 3)],
  ]) {
    const changed = structuredClone(extended);
    mutate(changed);
    assert.throws(() => h.verify(changed), undefined, reason);
  }
});

test("re-export preserves an authenticated subject despite a smaller current receipt selection", (t) => {
  const h = signedCheckpointHarness(t);
  const original = h.checkpoint.targetQualification;
  const current = structuredClone(original);
  current.files = Object.fromEntries(
    Object.entries(current.files).filter(
      ([name]) =>
        [
          "release-manifest.json",
          "publication-origins.json",
          "signed-tag.json",
        ].includes(name) ||
        Object.hasOwn(current.qualified.reports, name) ||
        name.endsWith("-package-lock.json"),
    ),
  );
  const selected = retainedCheckpointTargets(
    current,
    [h.verify(h.checkpoint)],
    [],
  );
  assert.equal(
    hash(Buffer.from(JSON.stringify(selected.targets[0]))),
    hash(Buffer.from(JSON.stringify(original))),
  );
  const exported = h.verify({
    ...h.checkpoint,
    targetQualification: selected.targets[0],
  });
  assert.deepEqual(exported.targetQualification, original);
  for (const mutate of [
    (value) => {
      value.qualificationBase64 += "AA==";
    },
    (value) => {
      value.archive.releaseId++;
    },
    (value) => {
      value.archive.assets = [];
    },
  ]) {
    const changed = structuredClone(current);
    mutate(changed);
    assert.throws(() =>
      retainedCheckpointTargets(changed, [h.verify(h.checkpoint)], []),
    );
  }
});

test("a new checkpoint carries requested earlier subjects once each and reports unavailable ones", (t) => {
  const h = signedCheckpointHarness(t);
  const older = h.target(releaseFixture(t, true, undefined, "1.0.1"));
  const current = h.checkpoint.targetQualification;
  const earlier = structuredClone(h.checkpoint);
  earlier.targetQualification = older;
  const signed = [h.verify(earlier), h.verify(h.checkpoint)];
  const unknown = "0".repeat(64);
  const selected = retainedCheckpointTargets(current, signed, [
    older.qualificationSha256,
    current.qualificationSha256,
    older.qualificationSha256,
    unknown,
  ]);
  assert.deepEqual(
    selected.targets.map((target) => target.qualificationSha256),
    [current.qualificationSha256, older.qualificationSha256],
  );
  assert.deepEqual(selected.missing, [
    {
      qualificationSha256: unknown,
      reason: "retained-target-qualification-unavailable",
    },
  ]);
  assert.deepEqual(retainedCheckpointTargets(current, signed, []), {
    targets: [current],
    missing: [],
  });
  const conflicting = structuredClone(earlier);
  conflicting.targetQualification.archive.releaseId = 61;
  assert.throws(
    () =>
      retainedCheckpointTargets(
        current,
        [...signed, conflicting],
        [older.qualificationSha256],
      ),
    /Conflicting retained subjects/u,
  );
  assert.throws(() => retainedCheckpointTargets(current, signed, ["F00"]));
});
