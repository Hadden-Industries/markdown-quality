// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { verifyReleaseQualificationJobs } from "../scripts/release-qualification.js";
import { nodeSupport } from "../scripts/node-matrix.js";
import { nodeMatrixFixture, fixtureJobLabels } from "./node-matrix-fixture.js";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  createReleaseReuseReader,
  selectQualificationArtifact,
} from "../scripts/release-reuse.js";
import {
  verifyBuildEvidence,
  reuseDistributionEvidence,
  retainRecipientEvidence,
  qualificationArtifactDirectory,
} from "../scripts/release-reuse-evidence.js";

test("release evidence collection has a finite request and time budget", async () => {
  const { budgets } = await import("../scripts/qualification-budgets.js");
  let time = 0;
  const read = createReleaseReuseReader("fixture", {
    now: () => time,
    fetchImpl: async () => {
      time += budgets.read + 1;
      return Response.json({ retained: true });
    },
  });
  assert.deepEqual(await read("/actions/runs/1"), { retained: true });
  time = budgets.collection;
  await assert.rejects(read("/actions/runs/1"), /budget exhausted/u);
  const count = createReleaseReuseReader("fixture", {
    now: () => 0,
    fetchImpl: async () => Response.json({ retained: true }),
  });
  for (let index = 0; index < 128; index++) await count("/actions/runs/1");
  await assert.rejects(count("/actions/runs/1"), /budget exhausted/u);
});

test("archival consumes promoted evidence after original CI artifacts expire", (t) => {
  const f = retained(t);
  const download = () => {
    throw new Error("Original CI artifact expired");
  };
  for (const name of [
    "candidate-ubuntu-26.04",
    "recipient-ubuntu-26.04",
    "performance-ubuntu-26.04",
  ])
    assert.equal(
      qualificationArtifactDirectory({
        release: f.release,
        frozen: f.directory,
        run: "20",
        name,
        download,
      }),
      join(f.directory, "qualification-evidence", name),
    );
  assert.equal(
    qualificationArtifactDirectory({
      release: {},
      frozen: f.directory,
      run: "42",
      name: "candidate-linux",
      download: (run, name) => `${run}/${name}`,
    }),
    "42/candidate-linux",
  );
});
import { verifyTagMetadata } from "../scripts/verify-release-tag.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function promoted() {
  const run = {
    id: 42,
    run_attempt: 1,
    head_sha: "a".repeat(40),
  };
  const release = {
    source: { head: "b".repeat(40), tree: "c".repeat(40), clean: true },
    qualificationMatrix: nodeMatrixFixture(),
    runtimePolicy: nodeSupport,
    promotion: {
      schemaVersion: 1,
      releaseCommit: run.head_sha,
      buildCommit: "b".repeat(40),
      tree: "c".repeat(40),
      parents: ["d".repeat(40), "e".repeat(40)],
      buildManifestSha256: "f".repeat(64),
      proofSha256: "1".repeat(64),
      run: 20,
      attempt: 1,
      pullRequest: 5,
    },
  };
  const names = ["resolve", "fresh", "security", "distribution", "qualified"];
  const jobs = {
    total_count: names.length,
    jobs: names.map((name) => ({
      name,
      head_sha: run.head_sha,
      run_id: run.id,
      run_attempt: run.run_attempt,
      status: "completed",
      conclusion: name === "fresh" ? "skipped" : "success",
      labels: fixtureJobLabels(name),
    })),
  };
  return { run, release, jobs };
}

test("promotion admits a complete verified reuse gate without duplicate matrices", () => {
  const { run, jobs, release } = promoted();
  assert.doesNotThrow(() => verifyReleaseQualificationJobs(run, jobs, release));
});

test("promotion refuses missing, failed, forged-source and duplicate gates", () => {
  for (const mutate of [
    (f) => (f.jobs.jobs[0].conclusion = "skipped"),
    (f) => (f.jobs.jobs[2].conclusion = "failure"),
    (f) => (f.release.promotion.releaseCommit = "0".repeat(40)),
    (f) => (f.release.promotion.buildCommit = "0".repeat(40)),
    (f) => (f.release.promotion.tree = "0".repeat(40)),
    (f) => (f.jobs.jobs[1].name = "resolve"),
    (f) => f.jobs.jobs.pop(),
  ]) {
    const f = promoted();
    mutate(f);
    assert.throws(() =>
      verifyReleaseQualificationJobs(f.run, f.jobs, f.release),
    );
  }
});

test("retained artifacts must belong to the original producing interval", () => {
  const execution = {
    job: {
      started_at: "2026-11-16T10:00:00Z",
      completed_at: "2026-11-16T10:05:00Z",
    },
  };
  const artifact = {
    id: 1,
    name: "candidate-linux",
    expired: false,
    digest: "sha256:" + "a".repeat(64),
    created_at: "2026-11-16T10:04:00Z",
  };
  assert.equal(
    selectQualificationArtifact([artifact], artifact.name, execution).id,
    1,
  );
  assert.throws(() =>
    selectQualificationArtifact([artifact, artifact], artifact.name, execution),
  );
  for (const change of [
    { expired: true },
    { created_at: "2026-11-16T10:06:00Z" },
    { digest: "substituted" },
  ])
    assert.throws(() =>
      selectQualificationArtifact(
        [{ ...artifact, ...change }],
        artifact.name,
        execution,
      ),
    );
});

function retained(t) {
  const directory = mkdtempSync(join(tmpdir(), "release-reuse-evidence-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const { release } = promoted();
  release.version = "3.0.3";
  const { promotion, ...build } = release;
  const buildBytes = Buffer.from(JSON.stringify(build) + "\n");
  const lock = Buffer.from('{"lockfileVersion":3,"packages":{"":{}}}\n');
  const receipt = {
    schemaVersion: 2,
    mode: "FULL",
    repository: "Hadden-Industries/markdown-quality",
    runId: promotion.run,
    runAttempt: promotion.attempt,
    pullRequest: promotion.pullRequest,
    snapshot: {
      commit: promotion.buildCommit,
      tree: promotion.tree,
      parents: promotion.parents,
    },
    matrix: release.qualificationMatrix,
    executions: [{ job: { name: "Distribution" }, runAttempt: 1 }],
    lanes: release.qualificationMatrix.os.map((os) => ({
      lane: { os, node: release.runtimePolicy.reference },
      consumer: {
        records: ["root", "isolated"].map((layout) => ({
          layout,
          lockSha256: hash(lock),
        })),
      },
    })),
  };
  const proofBytes = Buffer.from(JSON.stringify(receipt) + "\n");
  promotion.buildManifestSha256 = hash(buildBytes);
  promotion.proofSha256 = hash(proofBytes);
  for (const [name, bytes] of [
    ["build-manifest.json", buildBytes],
    ["build-qualification.json", proofBytes],
    ["release-manifest.json", Buffer.from(JSON.stringify(release) + "\n")],
  ])
    writeFileSync(join(directory, name), bytes);
  const inventory = join(
    directory,
    "qualification-evidence",
    "release-distribution-1",
  );
  mkdirSync(inventory, { recursive: true });
  const payload = Buffer.from('{"bomFormat":"CycloneDX"}\n');
  writeFileSync(join(inventory, "distribution-sbom.cdx.json"), payload);
  writeFileSync(
    join(inventory, "distribution-evidence.json"),
    JSON.stringify({
      schemaVersion: 1,
      source: release.source.head,
      version: release.version,
      manifestSha256: promotion.buildManifestSha256,
      payloads: [{ name: "distribution-sbom.cdx.json", sha256: hash(payload) }],
    }),
  );
  for (const os of release.qualificationMatrix.os) {
    const input = join(directory, "qualification-evidence", `recipient-${os}`);
    mkdirSync(input);
    for (const layout of ["root", "isolated"])
      writeFileSync(join(input, `${layout}-package-lock.json`), lock);
  }
  return { directory, release, payload, inventory };
}

test("distribution promotion preserves inventories and authenticates the original manifest", (t) => {
  const f = retained(t);
  assert.equal(verifyBuildEvidence(f.release, f.directory).runId, 20);
  const output = join(f.directory, "distribution");
  reuseDistributionEvidence(f.directory, output);
  assert.deepEqual(
    readFileSync(join(output, "distribution-sbom.cdx.json")),
    f.payload,
  );
  const evidence = JSON.parse(
    readFileSync(join(output, "distribution-evidence.json")),
  );
  assert.equal(evidence.source, f.release.source.head);
  assert.equal(
    evidence.manifestSha256,
    hash(readFileSync(join(f.directory, "release-manifest.json"))),
  );
  assert.equal(
    evidence.reused.manifestSha256,
    f.release.promotion.buildManifestSha256,
  );
  writeFileSync(join(f.inventory, "distribution-sbom.cdx.json"), "substituted");
  assert.throws(() =>
    reuseDistributionEvidence(f.directory, join(f.directory, "refused")),
  );
  writeFileSync(join(f.directory, "build-qualification.json"), "{}");
  assert.throws(() => verifyBuildEvidence(f.release, f.directory));
});

test("recipient reuse verifies the original reference lane's exact locks", (t) => {
  const f = retained(t);
  retainRecipientEvidence(f.directory, join(f.directory, "recipients"));
  const os = f.release.qualificationMatrix.os[0];
  writeFileSync(
    join(
      f.directory,
      "qualification-evidence",
      `recipient-${os}`,
      "root-package-lock.json",
    ),
    "{}",
  );
  assert.throws(
    () => retainRecipientEvidence(f.directory, join(f.directory, "refused")),
    /Retained recipient lock changed/u,
  );
});

test("the signed release tag names the landed commit while package identity keeps the build", () => {
  const { release, run } = promoted();
  release.version = "3.0.3";
  const reference = {
    ref: "refs/tags/v3.0.3",
    object: { type: "tag", sha: "9".repeat(40) },
  };
  const annotation = {
    sha: reference.object.sha,
    tag: "v3.0.3",
    object: { type: "commit", sha: run.head_sha },
    verification: { verified: true, reason: "valid" },
  };
  assert.doesNotThrow(() => verifyTagMetadata(reference, annotation, release));
  annotation.object.sha = release.source.head;
  assert.throws(() => verifyTagMetadata(reference, annotation, release));
});
