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
  const sourceRoot = join(scratch, "original");
  mkdirSync(sourceRoot);
  const profile = {
    samples: passed ? 2 : 3,
    reportBytes: 1048576,
    stagingBytes: 1048576,
    stagingEntries: 100,
    requestBytes: 1048576,
  };
  writeFileSync(join(sourceRoot, "request.json"), JSON.stringify({ profile }));
  const samples = [];
  for (const index of [1, 2]) {
    const sample = join(sourceRoot, `sample-${index}`);
    mkdirSync(join(sample, "data", "empty"), { recursive: true });
    writeFileSync(join(sample, "data", ".hidden"), "hello");
    writeFileSync(join(sample, "data", "README.md"), "# Alpha\n");
    writeFileSync(join(sample, "stdout.txt"), "diagnostic\n");
    writeFileSync(join(sample, "stderr.txt"), "");
    const receipt = {
      schemaVersion: 1,
      staging: {
        stagedDataSha256: stagedDataDigest(join(sample, "data"), profile),
        profile,
      },
      candidate: { sha: "a".repeat(40) },
      trusted: { sha: "b".repeat(40) },
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
    join(sourceRoot, "window.json"),
    JSON.stringify({
      schemaVersion: 1,
      passed,
      samples,
      enforcedProfile: profile,
    }),
  );
  return { sourceRoot, outputRoot: join(scratch, "compact") };
}

test("hosted projection retains byte-exact reports and one complete manifest without staged payloads", (t) => {
  const paths = fixture(t);
  const original = readFileSync(
    join(paths.sourceRoot, "sample-1/receipt.json"),
  );
  packageQualificationEvidence(paths);
  assert.equal(existsSync(join(paths.outputRoot, "sample-1/data")), false);
  assert.deepEqual(
    readFileSync(join(paths.outputRoot, "sample-1/receipt.json")),
    original,
  );
  assert.deepEqual(
    readFileSync(join(paths.sourceRoot, "sample-1/receipt.json")),
    original,
  );
  assert.equal(
    readFileSync(join(paths.sourceRoot, "sample-1/data/.hidden"), "utf8"),
    "hello",
  );
  const index = json(paths.outputRoot, "artifact-index.json");
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
        paths.sourceRoot,
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
  mkdirSync(join(paths.sourceRoot, "sample-3"));
  writeFileSync(
    join(paths.sourceRoot, "sample-3/stderr.txt"),
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
    const window = json(paths.sourceRoot, "window.json");
    if (target === "sample") {
      window.samples.pop();
      writeFileSync(
        join(paths.sourceRoot, "window.json"),
        JSON.stringify(window),
      );
    } else {
      // Deletion is confined to this disposable test-owned fixture.
      unlinkSync(
        join(
          paths.sourceRoot,
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
  writeFileSync(join(paths.sourceRoot, "sample-1/receipt.json"), "damaged");
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
  const window = json(paths.sourceRoot, "window.json");
  for (const sample of window.samples) {
    const data = join(paths.sourceRoot, `sample-${sample.index}/data`);
    const payload = Buffer.alloc(262144, 0xab);
    writeFileSync(join(data, "native.tgz"), payload);
    const receiptPath = join(paths.sourceRoot, sample.receiptPath);
    const receipt = JSON.parse(readFileSync(receiptPath));
    receipt.staging.stagedDataSha256 = stagedDataDigest(
      data,
      receipt.staging.profile,
    );
    const bytes = JSON.stringify(receipt);
    writeFileSync(receiptPath, bytes);
    sample.receiptSha256 = sha(bytes);
  }
  writeFileSync(join(paths.sourceRoot, "window.json"), JSON.stringify(window));
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
      paths.outputRoot = join(paths.sourceRoot, "compact");
    if (target === "existing") mkdirSync(paths.outputRoot);
    if (target === "bound")
      writeFileSync(
        join(paths.sourceRoot, "sample-1/stdout.txt"),
        Buffer.alloc(1048577),
      );
    assert.throws(
      () => packageQualificationEvidence(paths),
      /fresh|disjoint|bound/iu,
    );
  }
});
