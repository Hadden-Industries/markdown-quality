// SPDX-License-Identifier: AGPL-3.0-only
/** Attribute a partial recovery to original staging before the candidate has a complete public archive. */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native, npmCommand } from "./commands.js";
import { hash } from "./release-bytes.js";
import { releasePackages } from "./release-coordinates.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { verifyReleaseProvenance } from "./provenance.js";

const repository = "Hadden-Industries/markdown-quality";
/** npm owns tarball integrity and cryptographic provenance verification; no candidate code executes. */
export function verifyPublishedStageOrigins(
  manifest,
  origins,
  archives,
  command = npmCommand,
) {
  const directory = mkdtempSync(
    join(tmpdir(), "markdown-quality-stage-reconciliation-"),
  );
  try {
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        private: true,
        name: "stage-reconciliation",
        version: "1.0.0",
        dependencies: Object.fromEntries(
          archives.map((archive) => [archive.package, manifest.version]),
        ),
      }),
    );
    command(
      [
        "install",
        "--force",
        "--ignore-scripts",
        "--no-audit",
        "--fund=false",
        "--registry=https://registry.npmjs.org/",
      ],
      { cwd: directory },
    );
    const lock = JSON.parse(readFileSync(join(directory, "package-lock.json")));
    for (const archive of archives)
      assert.equal(
        lock.packages[`node_modules/${archive.package}`].integrity,
        archive.integrity,
      );
    const raw = command(
      ["audit", "signatures", "--json", "--include-attestations"],
      { cwd: directory },
    );
    const audit = JSON.parse(raw);
    verifyReleaseProvenance(audit, archives, {
      version: manifest.version,
      source: manifest.source.head,
      publicationOrigins: origins,
    });
    return {
      audit,
      auditSha256: hash(Buffer.from(raw)),
      lockSha256: hash(readFileSync(join(directory, "package-lock.json"))),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Original provider metadata has already been authenticated by collectWriterHistory. */
export async function authenticateStagingRecovery(
  entry,
  operation,
  {
    gh = (args) => native("gh", args),
    verifyTag = verifyReleaseTag,
    publicProof = verifyPublishedStageOrigins,
  } = {},
) {
  assert.equal(entry.job.name, "stage");
  assert.equal(entry.run.path, ".github/workflows/publish.yml");
  assert.equal(entry.run.event, "workflow_dispatch");
  assert.equal(entry.run.head_branch, "main");
  assert.equal(entry.run.status, "completed");
  assert.equal(entry.job.run_id, entry.run.id);
  assert.equal(entry.job.run_attempt, entry.attempt);
  assert.equal(entry.job.head_sha, entry.run.head_sha);
  assert.equal(entry.job.status, "completed");
  assert.equal(entry.run.actor.login.toLowerCase(), "maksymshostak");
  const file = (name) => {
    const retained = entry.files[name];
    assert.ok(retained, `Missing original staging member: ${name}`);
    const bytes = Buffer.from(retained.base64, "base64");
    assert.equal(hash(bytes), retained.sha256);
    return bytes;
  };
  const manifestBytes = file("frozen-release/release-manifest.json"),
    manifest = JSON.parse(manifestBytes);
  assert.equal(
    hash(manifestBytes),
    operation.affectedManifestSha256,
    "Bind the affected candidate separately from recovery target qualification",
  );
  const reviewBytes = file("provider/release-review.json");
  const review = verifyReleaseAcceptance(
    reviewBytes,
    operation.originalDecisionSha256,
    manifest,
    hash(manifestBytes),
    "review",
  );
  assert.equal(review.schemaVersion, 2);
  assert.equal(review.controller, entry.run.head_sha);
  assert.equal(review.operationId, operation.originalOperationId);
  assert.equal(review.channel, operation.label);
  const origins = JSON.parse(file("frozen-release/publication-origins.json"));
  assert.equal(origins.manifestSha, hash(manifestBytes));
  const api = (path) => JSON.parse(gh(["api", `repos/${repository}/${path}`]));
  const reference = api(`git/ref/tags/v${manifest.version}`);
  verifyTag(reference, api(`git/tags/${reference.object.sha}`), manifest);
  try {
    const release = api(`releases/tags/v${manifest.version}`);
    assert.ok(
      !(release.immutable && !release.draft && release.prerelease === false),
      "Completed stable releases require a whole-family restore",
    );
  } catch (error) {
    if (error.httpStatus !== 404) throw error;
  }
  assert.deepEqual(
    Object.keys(operation.originalJournals).sort(),
    [...operation.scope.npm].sort(),
  );
  const archives = manifest.archives.filter((archive) =>
    operation.scope.npm.includes(archive.package),
  );
  assert.equal(archives.length, operation.scope.npm.length);
  assert.ok(archives.length > 0);
  const effects = [],
    journals = [];
  for (const archive of archives) {
    assert.ok(releasePackages.includes(archive.package));
    const bytes = file(`staging-journal/${archive.name}.jsonl`);
    assert.equal(hash(bytes), operation.originalJournals[archive.package]);
    journals.push(bytes);
    const records = bytes
      .toString("utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(records[0].state, "attempted");
    assert.ok(records.length <= 2);
    for (const record of records) {
      for (const name of ["package", "version", "sha256", "integrity"])
        assert.equal(record[name], archive[name]);
      assert.equal(record.tag, operation.label);
      assert.deepEqual(record.decision, origins.decision);
      assert.equal(record.origin.run, String(entry.run.id));
      assert.equal(record.origin.attempt, String(entry.attempt));
      assert.equal(record.origin.source, entry.run.head_sha);
    }
    assert.equal(operation.priors[archive.package], manifest.version);
    assert.equal(
      operation.targets[archive.package],
      review.guards.selectedLabels[archive.package],
    );
    effects.push({
      provider: "npm",
      subject: archive.package,
      prior: review.guards.selectedLabels[archive.package],
      target: manifest.version,
      outcome: "acknowledged",
    });
  }
  assert.equal(hash(journals[0]), operation.originalJournalSha256);
  const observation = await publicProof(manifest, origins, archives);
  return {
    entry: {
      ...entry,
      files: {
        ...entry.files,
        "operation.json": {
          sha256: hash(reviewBytes),
          base64: reviewBytes.toString("base64"),
        },
      },
    },
    bytes: journals[0],
    context: {
      operationId: review.operationId,
      decisionSha256: hash(reviewBytes),
      manifestSha256: hash(manifestBytes),
    },
    effects,
    observation,
  };
}
