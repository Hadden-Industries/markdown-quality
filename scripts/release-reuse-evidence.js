// SPDX-License-Identifier: AGPL-3.0-only
/** Verify retained evidence against its original subject before composing promotion evidence. */
import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { verifyPromotion } from "./release-qualification.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Original package and qualification records remain independently hash-addressable. */
export function verifyBuildEvidence(release, directory) {
  verifyPromotion(release, release.promotion.releaseCommit);
  const build = readFileSync(join(directory, "build-manifest.json"));
  const proof = readFileSync(join(directory, "build-qualification.json"));
  assert.equal(hash(build), release.promotion.buildManifestSha256);
  assert.equal(hash(proof), release.promotion.proofSha256);
  const { promotion, ...original } = release;
  assert.deepEqual(JSON.parse(build), original);
  const receipt = JSON.parse(proof);
  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.runId, promotion.run);
  assert.equal(receipt.runAttempt, promotion.attempt);
  assert.equal(receipt.pullRequest, promotion.pullRequest);
  assert.equal(receipt.snapshot.commit, promotion.buildCommit);
  assert.equal(receipt.snapshot.tree, promotion.tree);
  assert.deepEqual(receipt.snapshot.parents, promotion.parents);
  assert.deepEqual(receipt.matrix, release.qualificationMatrix);
  assert.equal(receipt.mode, "FULL");
  assert.equal(receipt.repository, "Hadden-Industries/markdown-quality");
  return receipt;
}

/** Reuse immutable inventory bytes; only the enclosing promotion subject changes. */
export function reuseDistributionEvidence(directory, output) {
  const bytes = readFileSync(join(directory, "release-manifest.json"));
  const release = JSON.parse(bytes);
  const receipt = verifyBuildEvidence(release, directory);
  const producing = receipt.executions.find(
    (item) => item.job.name === "Distribution",
  );
  assert.ok(producing);
  const originalDirectory = join(
    directory,
    "qualification-evidence",
    `release-distribution-${producing.runAttempt}`,
  );
  const evidenceBytes = readFileSync(
    join(originalDirectory, "distribution-evidence.json"),
  );
  const original = JSON.parse(evidenceBytes);
  assert.equal(original.source, release.source.head);
  assert.equal(original.version, release.version);
  assert.equal(original.manifestSha256, release.promotion.buildManifestSha256);
  mkdirSync(output);
  for (const payload of original.payloads) {
    assert.match(payload.name, /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u);
    const payloadBytes = readFileSync(join(originalDirectory, payload.name));
    assert.equal(hash(payloadBytes), payload.sha256);
    writeFileSync(join(output, payload.name), payloadBytes, { flag: "wx" });
  }
  writeFileSync(
    join(output, "build-distribution-evidence.json"),
    evidenceBytes,
    { flag: "wx" },
  );
  writeFileSync(
    join(output, "distribution-evidence.json"),
    JSON.stringify(
      {
        ...original,
        manifestSha256: hash(bytes),
        reused: {
          run: release.promotion.run,
          attempt: producing.runAttempt,
          manifestSha256: original.manifestSha256,
          evidenceSha256: hash(evidenceBytes),
        },
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

/** Copy only the admitted platform's original recipient observations, never execute them. */
export function retainRecipientEvidence(directory, output) {
  const release = JSON.parse(
    readFileSync(join(directory, "release-manifest.json")),
  );
  const receipt = verifyBuildEvidence(release, directory);
  mkdirSync(output);
  for (const os of release.qualificationMatrix.os) {
    assert.match(os, /^[a-z0-9.-]+$/u);
    const name = `recipient-${os}`;
    const input = join(directory, "qualification-evidence", name);
    assert.ok(readdirSync(input).includes("root-package-lock.json"));
    const reference = receipt.lanes.find(
      (lane) =>
        lane.lane.os === os &&
        lane.lane.node === release.runtimePolicy.reference,
    );
    assert.ok(reference, "Missing original recipient lane");
    for (const layout of ["root", "isolated"]) {
      const observation = reference.consumer.records.find(
        (record) => record.layout === layout,
      );
      assert.ok(observation);
      assert.equal(
        hash(readFileSync(join(input, `${layout}-package-lock.json`))),
        observation.lockSha256,
        "Retained recipient lock changed",
      );
    }
    cpSync(input, join(output, name), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5);
  const [mode, directory, output] = process.argv.slice(2);
  if (mode === "recipients")
    retainRecipientEvidence(resolve(directory), resolve(output));
  else {
    assert.equal(mode, "distribution");
    reuseDistributionEvidence(resolve(directory), resolve(output));
  }
}
