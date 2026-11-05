// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { consumer } from "./helpers.js";
import { stagedDataDigest } from "../src/candidate-staging.js";
import { packageQualificationEvidence } from "../src/qualification-evidence.js";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (root, name) => JSON.parse(readFileSync(join(root, name), "utf8"));
function fixture(t, passed = true) {
  const scratch = consumer(t);
  const evidenceRoot = join(scratch, "original");
  mkdirSync(evidenceRoot);
  const profile = {
    requiredConsecutiveSamples: passed ? 2 : 3,
    maxOutputBytes: 1048576,
    maxStagedDataBytes: 1048576,
    maxStagedEntries: 100,
    maxRequestBytes: 1048576,
    maxQualificationSamples: 100,
  };
  const request = {
    profile,
    candidateCommitId: "a".repeat(40),
    trustedCommitId: "b".repeat(40),
    producer: { source: { sourceRevision: "c".repeat(40) } },
    workflow: { sha: "d".repeat(40) },
  };
  writeFileSync(join(evidenceRoot, "request.json"), JSON.stringify(request));
  const samples = [];
  for (const index of [1, 2]) {
    const sample = join(evidenceRoot, `sample-${index}`);
    mkdirSync(join(sample, "data", "empty"), { recursive: true });
    writeFileSync(join(sample, "data", ".hidden"), "hello");
    writeFileSync(join(sample, "data", "README.md"), "# Alpha\n");
    writeFileSync(join(sample, "stdout.txt"), "diagnostic\n");
    writeFileSync(join(sample, "stderr.txt"), "");
    const receipt = {
      schemaVersion: 2,
      staging: {
        stagedDataSha256: stagedDataDigest(join(sample, "data"), profile),
        profile,
      },
      candidate: { commitId: request.candidateCommitId },
      trusted: { commitId: request.trustedCommitId },
      producer: request.producer,
      workflow: request.workflow,
    };
    const bytes = JSON.stringify(receipt);
    writeFileSync(join(sample, "receipt.json"), bytes);
    samples.push({
      index,
      receiptPath: `sample-${index}/receipt.json`,
      receiptSha256: sha(bytes),
    });
  }
  writeFileSync(
    join(evidenceRoot, "window.json"),
    JSON.stringify({
      schemaVersion: 2,
      passed,
      samples,
      enforcedProfile: profile,
    }),
  );
  return { evidenceRoot, outputRoot: join(scratch, "compact") };
}

test("hosted projection retains byte-exact reports and one complete manifest without staged payloads", (t) => {
  const paths = fixture(t);
  const original = readFileSync(
    join(paths.evidenceRoot, "sample-1/receipt.json"),
  );
  packageQualificationEvidence(paths);
  assert.equal(existsSync(join(paths.outputRoot, "sample-1/data")), false);
  assert.deepEqual(
    readFileSync(join(paths.outputRoot, "sample-1/receipt.json")),
    original,
  );
  assert.deepEqual(
    readFileSync(join(paths.evidenceRoot, "sample-1/receipt.json")),
    original,
  );
  assert.equal(
    readFileSync(join(paths.evidenceRoot, "sample-1/data/.hidden"), "utf8"),
    "hello",
  );
  const index = json(paths.outputRoot, "artifact-index.json");
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.samples.length, 2);
  assert.equal(index.samples[0].manifestPath, index.samples[1].manifestPath);
  assert.equal(readdirSync(join(paths.outputRoot, "manifests")).length, 1);
  const bytes = readFileSync(
    join(paths.outputRoot, index.samples[0].manifestPath),
  );
  assert.equal(sha(bytes), index.samples[0].manifestSha256);
  const manifest = JSON.parse(bytes);
  assert.deepEqual(
    manifest.records.map(({ path, type }) => ({ path, type })),
    [
      { path: ".hidden", type: "file" },
      { path: "README.md", type: "file" },
      { path: "empty", type: "directory" },
    ],
  );
  assert.equal(
    manifest.records[0].sha256,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
  assert.equal(index.payloadRetention, "reconstruct-from-immutable-inputs");
});

test("projection rejects changed successful stage bytes and receipt tampering", (t) => {
  for (const change of ["stage", "receipt"]) {
    const paths = fixture(t);
    writeFileSync(
      join(
        paths.evidenceRoot,
        change === "stage" ? "sample-1/data/.hidden" : "sample-1/receipt.json",
      ),
      "changed",
    );
    assert.throws(
      () => packageQualificationEvidence(paths),
      /changed|digest|receipt/iu,
    );
  }
});

test("failed qualification retains original diagnostics and explicitly incomplete samples", (t) => {
  const paths = fixture(t, false);
  mkdirSync(join(paths.evidenceRoot, "sample-3"));
  writeFileSync(
    join(paths.evidenceRoot, "sample-3/stderr.txt"),
    "CHECKOUT_CHANGED\n",
  );
  packageQualificationEvidence(paths);
  assert.equal(json(paths.outputRoot, "artifact-index.json").passed, false);
  assert.equal(
    readFileSync(join(paths.outputRoot, "sample-3/stderr.txt"), "utf8"),
    "CHECKOUT_CHANGED\n",
  );
  assert.equal(existsSync(join(paths.outputRoot, "sample-3/data")), false);
});

test("successful projection refuses missing samples, hidden data, and logs", (t) => {
  for (const target of ["sample", "hidden", "log"]) {
    const paths = fixture(t);
    const window = json(paths.evidenceRoot, "window.json");
    if (target === "sample") {
      window.samples.pop();
      writeFileSync(
        join(paths.evidenceRoot, "window.json"),
        JSON.stringify(window),
      );
    } else {
      // Deletion is confined to this disposable test-owned fixture.
      unlinkSync(
        join(
          paths.evidenceRoot,
          target === "hidden" ? "sample-1/data/.hidden" : "sample-1/stdout.txt",
        ),
      );
    }
    assert.throws(
      () => packageQualificationEvidence(paths),
      /sample|digest|report|log/iu,
    );
  }
});

test("failed projection preserves diagnostics when a completed receipt is damaged", (t) => {
  const paths = fixture(t, false);
  writeFileSync(join(paths.evidenceRoot, "sample-1/receipt.json"), "damaged");
  const index = packageQualificationEvidence(paths);
  assert.equal(index.passed, false);
  assert.equal(index.samples[0].complete, false);
  assert.ok(index.problems.some((item) => /digest/iu.test(item.message)));
  assert.equal(
    readFileSync(join(paths.outputRoot, "sample-1/stdout.txt"), "utf8"),
    "diagnostic\n",
  );
});

test("large repeated native payloads do not increase compact evidence size proportionally", (t) => {
  const paths = fixture(t);
  const window = json(paths.evidenceRoot, "window.json");
  for (const sample of window.samples) {
    const data = join(paths.evidenceRoot, `sample-${sample.index}/data`);
    const payload = Buffer.alloc(262144, 0xab);
    writeFileSync(join(data, "native.tgz"), payload);
    const receiptPath = join(paths.evidenceRoot, sample.receiptPath);
    const receipt = JSON.parse(readFileSync(receiptPath));
    receipt.staging.stagedDataSha256 = stagedDataDigest(
      data,
      receipt.staging.profile,
    );
    const bytes = JSON.stringify(receipt);
    writeFileSync(receiptPath, bytes);
    sample.receiptSha256 = sha(bytes);
  }
  writeFileSync(
    join(paths.evidenceRoot, "window.json"),
    JSON.stringify(window),
  );
  const index = packageQualificationEvidence(paths);
  assert.ok(index.files.reduce((total, file) => total + file.size, 0) < 16384);
  assert.equal(readdirSync(join(paths.outputRoot, "manifests")).length, 1);
  const manifest = json(paths.outputRoot, index.samples[0].manifestPath);
  assert.equal(
    manifest.records.find((item) => item.path === "native.tgz").size,
    262144,
  );
  assert.equal(
    existsSync(join(paths.outputRoot, "sample-1/data/native.tgz")),
    false,
  );
});

test("projection rejects overlap, existing output and reports above the trusted bound", (t) => {
  for (const target of ["overlap", "existing", "bound"]) {
    const paths = fixture(t);
    if (target === "overlap")
      paths.outputRoot = join(paths.evidenceRoot, "compact");
    if (target === "existing") mkdirSync(paths.outputRoot);
    if (target === "bound")
      writeFileSync(
        join(paths.evidenceRoot, "sample-1/stdout.txt"),
        Buffer.alloc(1048577),
      );
    assert.throws(
      () => packageQualificationEvidence(paths),
      /fresh|disjoint|bound/iu,
    );
  }
});

test("failed oversized diagnostics retain a bounded prefix with explicit truncation", (t) => {
  const paths = fixture(t, false);
  const original = Buffer.alloc(1048577, 0x61);
  for (const file of ["stdout.txt", "stderr.txt"])
    writeFileSync(join(paths.evidenceRoot, "sample-1", file), original);
  const index = packageQualificationEvidence(paths);
  assert.equal(index.passed, false);
  assert.equal(index.samples[0].complete, false);
  for (const file of ["stdout.txt", "stderr.txt"]) {
    const path = `sample-1/${file}`;
    const entry = index.files.find((item) => item.path === path);
    assert.equal(entry.truncated, true);
    assert.equal(entry.originalSize, 1048577);
    assert.equal(entry.size, 1048576);
    const retained = readFileSync(join(paths.outputRoot, path));
    assert.deepEqual(retained, original.subarray(0, 1048576));
    assert.equal(entry.sha256, sha(retained));
    assert.deepEqual(readFileSync(join(paths.evidenceRoot, path)), original);
  }
  assert.ok(index.problems.some((item) => /truncat/iu.test(item.message)));
});

test("successful projection reconciles immutable request identities with receipts", (t) => {
  for (const field of [
    "candidateCommitId",
    "trustedCommitId",
    "producer",
    "workflow",
  ]) {
    const paths = fixture(t);
    const request = json(paths.evidenceRoot, "request.json");
    request[field] = field.endsWith("CommitId")
      ? "e".repeat(40)
      : { changed: true };
    writeFileSync(
      join(paths.evidenceRoot, "request.json"),
      JSON.stringify(request),
    );
    assert.throws(() => packageQualificationEvidence(paths), /identit/iu);
  }
});

test("unbound failed evidence uses only the caller's finite or null input ceiling", (t) => {
  const scratch = consumer(t),
    evidenceRoot = join(scratch, "original");
  mkdirSync(join(evidenceRoot, "sample-1"), { recursive: true });
  writeFileSync(
    join(evidenceRoot, "window.json"),
    JSON.stringify({ schemaVersion: 2, passed: false, samples: [] }),
  );
  const original = Buffer.alloc(8388609, 0x61);
  writeFileSync(join(evidenceRoot, "sample-1", "stdout.txt"), original);
  // A 1-KiB total ceiling cannot hold the index itself: retain that finite refusal.
  assert.throws(
    () =>
      packageQualificationEvidence({
        evidenceRoot,
        outputRoot: join(scratch, "too-small"),
        maxEvidenceInputBytes: 1024,
      }),
    { code: "EVIDENCE_LIMIT" },
  );
  for (const [name, maxEvidenceInputBytes] of [
    ["raised", 16777216],
    ["disabled", null],
    ["finite", 4096],
  ]) {
    const outputRoot = join(scratch, name),
      index = packageQualificationEvidence({
        evidenceRoot,
        outputRoot,
        maxEvidenceInputBytes,
      });
    const file = index.files.find(
      (file) => file.path === "sample-1/stdout.txt",
    );
    assert.equal(
      file.size,
      maxEvidenceInputBytes === 4096 ? 4096 : original.length,
    );
    assert.equal(file.truncated === true, maxEvidenceInputBytes === 4096);
    assert.equal(index.passed, false);
    assert.equal(index.samples[0].complete, false);
    assert.deepEqual(
      readFileSync(join(outputRoot, file.path)),
      original.subarray(0, file.size),
    );
  }
});
