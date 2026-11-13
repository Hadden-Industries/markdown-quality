// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { releaseFixture } from "./release-fixture.js";
import { native } from "../scripts/commands.js";
import { hash } from "../scripts/release-bytes.js";
import {
  verifySignedCheckpoint,
  mergeWriterHistory,
  verifyActiveOperations,
  collectWriterHistory,
  recoveryLineage,
  writerNeverRequested,
  legacyArchiveSettled,
} from "../scripts/release-history.js";
import {
  retainedArtifact,
  restoreRetainedFiles,
  verifyRetainedFiles,
  assertRetainedArtifactIdentity,
  authenticateArtifact,
} from "../scripts/release-retained-artifacts.js";
import { verifySettlementObservation } from "../scripts/release-effects.js";
import { verifyRecoveryAttribution } from "../scripts/release-history.js";
import { releasePackages } from "../scripts/release-coordinates.js";

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
  let missing = false,
    denial = false,
    downloads = 0;
  const gh = (args) => {
    const path = args[1];
    if (path.includes("/actions/workflows/"))
      return JSON.stringify([
        { workflow_runs: path.includes("promote-release.yml") ? [run] : [] },
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
        : { ...run, run_attempt: attempt },
    );
  };
  const download = async ({ destination }) => {
    downloads++;
    mkdirSync(destination);
    writeFileSync(join(destination, "original.txt"), "original bytes");
  };
  const options = { env: { GH_TOKEN: "fixture" }, gh, download };
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

test("expiry fallback requires a complete owner-signed history AND separate original target qualification", (t) => {
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
    repository: { full_name: "Hadden-Industries/markdown-quality" },
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
  const checkpoint = {
    schemaVersion: 1,
    repository: run.repository.full_name,
    complete: true,
    writers: [writer],
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
  const verify = (value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    return verifySignedCheckpoint(bytes, {
      reference,
      annotation,
      signerPolicy: policy,
      command: () => bytes,
    });
  };
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
