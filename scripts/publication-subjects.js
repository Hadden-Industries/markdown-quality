// SPDX-License-Identifier: AGPL-3.0-only
/** Derive version lookups from authenticated publication evidence, never display names. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { releaseBytes, hash } from "./release-bytes.js";
import { sameJobExecution } from "./github-job-execution.js";
import { releaseVersion } from "./release-coordinates.js";
import { acquireIndexedRelease } from "./release-archive-reader.js";
import {
  authenticatePublicationAttempts,
  attemptedPublicationJobs,
} from "./publication-attempts.js";

export function publicationSubject(bytes) {
  const manifest = JSON.parse(bytes);
  releaseVersion(manifest.version);
  return { version: manifest.version, manifestSha256: hash(bytes) };
}

const effects = (entry) =>
  authenticatePublicationAttempts(entry.run, entry.attempts).executions.filter(
    (job) => attemptedPublicationJobs({ total_count: 1, jobs: [job] }).length,
  );

/** New attempts, contradictory steps and different executions cannot inherit a version claim. */
export function matchPublicationSubject(cached, current) {
  for (const key of [
    "id",
    "head_sha",
    "run_attempt",
    "event",
    "path",
    "head_branch",
  ])
    if (cached.run[key] !== current.run[key]) return false;
  assert.equal(
    cached.run.repository.full_name,
    current.run.repository.full_name,
  );
  const previous = effects(cached),
    actual = effects(current);
  return (
    previous.length === actual.length &&
    actual.every((job) => {
      const matches = previous.filter((prior) => sameJobExecution(prior, job));
      return (
        matches.length === 1 &&
        matches[0].run_attempt === job.run_attempt &&
        matches[0].conclusion === job.conclusion &&
        isDeepStrictEqual(matches[0].steps, job.steps)
      );
    })
  );
}

function originalBytes(value) {
  assert.equal(value?.type, "Buffer");
  assert.ok(Array.isArray(value.data) && value.data.length <= 1_048_576);
  assert.ok(
    value.data.every(
      (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
    ),
  );
  return Buffer.from(value.data);
}

/** The caller must first authenticate the owning publication artifact or immutable release. */
export function readPublicationSubjects(
  directory,
  owner,
  manifestBytes,
  { providerDirectory = join(directory, "provider") } = {},
) {
  const path = join(providerDirectory, "publication-history.json");
  if (!existsSync(path)) return [];
  const receipt = JSON.parse(releaseBytes(path, 16 * 1024 * 1024));
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(String(receipt.run), String(owner.run.id));
  if (String(receipt.attempt) !== String(owner.attempt)) {
    const observed = authenticatePublicationAttempts(owner.run, owner.attempts);
    const admission = observed.jobs.jobs.find((job) => job.name === "admit");
    assert.equal(admission?.status, "completed");
    assert.equal(admission?.conclusion, "success");
    assert.equal(String(receipt.attempt), String(admission.run_attempt));
  }
  assert.equal(receipt.manifestSha256, hash(manifestBytes));
  assert.ok(Array.isArray(receipt.history));
  assert.equal(
    new Set(receipt.history.map((entry) => entry.run.id)).size,
    receipt.history.length,
  );
  const snapshotPath = join(providerDirectory, "staging-history.json");
  const snapshots = existsSync(snapshotPath)
    ? JSON.parse(releaseBytes(snapshotPath, 64 * 1024 * 1024))
    : [];
  assert.ok(Array.isArray(snapshots));
  assert.equal(
    new Set(snapshots.map((entry) => entry.run.id)).size,
    snapshots.length,
  );
  return receipt.history.flatMap((entry) => {
    if (entry.run.id === owner.run.id) return [];
    let subject = entry.subject;
    const snapshot = snapshots.find(
      (candidate) => candidate.run.id === entry.run.id,
    );
    if (snapshot?.manifestBytes) {
      assert.ok(
        matchPublicationSubject(snapshot, entry),
        "Retained subject executions differ",
      );
      const original = publicationSubject(
        originalBytes(snapshot.manifestBytes),
      );
      assert.equal(original.manifestSha256, entry.manifestSha256);
      if (subject) assert.deepEqual(subject, original);
      subject = original;
    }
    if (!subject) return [];
    releaseVersion(subject.version);
    assert.match(subject.manifestSha256, /^[a-f0-9]{64}$/u);
    assert.equal(subject.manifestSha256, entry.manifestSha256);
    // Authenticate the complete original attempt inventory before exposing this derived lookup.
    effects(entry);
    return [{ ...entry, subject }];
  });
}

/** Only cryptographically verified immutable release assets can replace expired transport copies. */
export function readArchivedPublicationSubjects(gh, scratch) {
  const repository = "Hadden-Industries/markdown-quality";
  const releases = JSON.parse(
    gh([
      "api",
      `repos/${repository}/releases?per_page=100`,
      "--paginate",
      "--slurp",
    ]),
  ).flat();
  const subjects = [];
  for (const release of releases) {
    let version;
    try {
      version = releaseVersion(release.tag_name?.slice(1));
    } catch {
      continue;
    }
    if (
      release.draft ||
      !release.immutable ||
      release.tag_name !== `v${version}` ||
      !release.assets.some((asset) =>
        ["publication-history.json", "release-evidence.zip"].includes(
          asset.name,
        ),
      )
    )
      continue;
    assert.ok(Number.isSafeInteger(release.id) && release.id > 0);
    let directory = join(scratch, `release-${release.id}`);
    mkdirSync(directory);
    if (release.assets.some((asset) => asset.name === "release-evidence.zip")) {
      directory = acquireIndexedRelease(release, directory, gh).logical;
      const manifestBytes = releaseBytes(
        join(directory, "release-manifest.json"),
        1_048_576,
      );
      const provider = JSON.parse(
        releaseBytes(
          join(directory, "staging-provider.json"),
          16 * 1024 * 1024,
        ),
      );
      effects(provider);
      subjects.push(
        ...readPublicationSubjects(
          directory,
          {
            run: provider.run,
            attempt: provider.run.run_attempt,
            attempts: provider.attempts,
          },
          manifestBytes,
          { providerDirectory: directory },
        ),
      );
      subjects.push({
        ...provider,
        subject: publicationSubject(manifestBytes),
      });
      continue;
    }
    gh([
      "release",
      "verify",
      release.tag_name,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    const names = [
      "publication-history.json",
      "release-manifest.json",
      "staging-provider.json",
    ];
    for (const name of names) {
      const assets = release.assets.filter((asset) => asset.name === name);
      assert.equal(
        assets.length,
        1,
        "Incomplete or ambiguous archived publication subject evidence",
      );
      assert.ok(assets[0].size > 0 && assets[0].size <= 16 * 1024 * 1024);
      assert.match(assets[0].digest, /^sha256:[a-f0-9]{64}$/u);
      gh([
        "release",
        "download",
        release.tag_name,
        "--repo",
        repository,
        "--pattern",
        name,
        "--dir",
        directory,
      ]);
      const bytes = releaseBytes(join(directory, name), 16 * 1024 * 1024);
      assert.equal(`sha256:${hash(bytes)}`, assets[0].digest);
      gh([
        "release",
        "verify-asset",
        release.tag_name,
        join(directory, name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    }
    const manifestBytes = releaseBytes(
      join(directory, "release-manifest.json"),
      1_048_576,
    );
    const subject = publicationSubject(manifestBytes);
    assert.equal(`v${subject.version}`, release.tag_name);
    const provider = JSON.parse(
      releaseBytes(join(directory, "staging-provider.json"), 16 * 1024 * 1024),
    );
    assert.equal(provider.run.repository.full_name, repository);
    assert.equal(provider.run.path, ".github/workflows/publish.yml");
    assert.equal(provider.run.head_branch, "main");
    assert.equal(provider.run.status, "completed");
    assert.equal(provider.run.conclusion, "success");
    effects(provider);
    subjects.push(
      ...readPublicationSubjects(
        directory,
        {
          run: provider.run,
          attempt: provider.run.run_attempt,
          attempts: provider.attempts,
        },
        manifestBytes,
        { providerDirectory: directory },
      ),
    );
    subjects.push({ ...provider, subject });
  }
  return subjects;
}
