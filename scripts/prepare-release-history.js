// SPDX-License-Identifier: AGPL-3.0-only
/** Prepare a complete public-safe checkpoint; the owner signs a fresh history ref separately. */
import assert from "node:assert/strict";
import { releaseCommit } from "./release-qualification.js";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import {
  hash,
  regularBytes,
  readJson,
  repository,
  materializeReleaseBundle,
  verifyInventory,
  verifyProvider,
} from "./release-assets.js";
import { gitSource } from "./github-release.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import {
  checkpointTargets,
  collectWriterHistory,
  readSignedHistoryRefs,
} from "./release-history.js";
import { requireManualControl } from "./release-continuation.js";
import { encodeHistoryCheckpoint } from "./release-history-format.js";

/**
 * Select the original qualified subjects a new checkpoint retains: the
 * current target first, then each owner-requested earlier subject copied from
 * the authenticated input checkpoints. Each subject is stored once and stays
 * attributable by its qualification digest; conflicting copies refuse, and a
 * requested subject that no input retains is reported missing.
 */
export function retainedCheckpointTargets(current, checkpoints, requested) {
  const previous = checkpoints
    .flatMap(checkpointTargets)
    .filter(
      (target) => target.qualificationSha256 === current.qualificationSha256,
    );
  for (const other of previous)
    assert.deepEqual(other, previous[0], "Conflicting retained subjects");
  if (previous.length) {
    const original = previous[0];
    assert.equal(original.qualificationBase64, current.qualificationBase64);
    assert.deepEqual(original.qualified, current.qualified);
    for (const name of ["releaseId", "tagSha", "assets", "immutable"])
      assert.deepEqual(
        original.archive[name],
        current.archive[name],
        "Original immutable target changed",
      );
    if (original.archival && current.archival) {
      assert.equal(original.archival.run.id, current.archival.run.id);
      assert.equal(original.archival.attempt, current.archival.attempt);
      assert.equal(
        original.archival.artifact.digest,
        current.archival.artifact.digest,
      );
    }
  }
  // Preserve the authenticated representation, including legacy file supersets,
  // so earlier and later signed refs remain byte-equivalent recovery subjects.
  const targets = [previous[0] ?? current],
    missing = [];
  for (const digest of requested) {
    assert.match(digest, /^[a-f0-9]{64}$/u);
    if (targets.some((target) => target.qualificationSha256 === digest))
      continue;
    const matches = checkpoints
      .flatMap(checkpointTargets)
      .filter((target) => target.qualificationSha256 === digest);
    for (const other of matches)
      assert.deepEqual(other, matches[0], "Conflicting retained subjects");
    if (matches.length) targets.push(matches[0]);
    else
      missing.push({
        qualificationSha256: digest,
        reason: "retained-target-qualification-unavailable",
      });
  }
  return { targets, missing };
}

/** Immutable assets keep verbose logs and build outputs; history retains admission receipts. */
export function retainedQualificationFiles(qualified, directory) {
  const names = new Set([
    "release-manifest.json",
    "publication-origins.json",
    "signed-tag.json",
    ...Object.keys(qualified.reports),
    ...Object.keys(qualified.evidence ?? {}).filter(
      (name) =>
        name.endsWith("-package-lock.json") ||
        name.endsWith("-reconciliation.json") ||
        [
          "release-review.json",
          "release-acceptance.json",
          "security-evidence.json",
          "distribution-evidence.json",
          "native-build.json",
          "native-rights.json",
        ].includes(name),
    ),
  ]);
  const files = {};
  for (const name of readdirSync(directory)) {
    if (!names.has(name)) continue;
    const bytes = regularBytes(join(directory, name));
    files[name] = { sha256: hash(bytes), base64: bytes.toString("base64") };
  }
  return files;
}

/** Source/native/registry bytes are retained separately from writer history so neither can substitute for the other. */
export async function prepareReleaseHistory(
  input,
  output,
  {
    env = process.env,
    gh = (args) => native("gh", args),
    history = collectWriterHistory,
    verifyTag = verifyReleaseTag,
  } = {},
) {
  const qualifiedBytes = regularBytes(join(input, "qualification.json"));
  assert.equal(hash(qualifiedBytes), env.QUALIFICATION_SHA);
  const qualified = JSON.parse(qualifiedBytes);
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-checkpoint-"));
  try {
    const logical = join(scratch, "logical");
    const assets = materializeReleaseBundle(
      qualified,
      join(input, "bundle"),
      logical,
      gitSource(qualified, process.cwd()),
    );
    const api = (path) =>
      JSON.parse(gh(["api", `repos/${repository}/${path}`]));
    const reference = api(`git/ref/tags/v${qualified.version}`);
    verifyTag(reference, api(`git/tags/${reference.object.sha}`), {
      version: qualified.version,
      source: { head: releaseCommit(qualified) },
    });
    const release = api(`releases/tags/v${qualified.version}`);
    assert.equal(release.immutable, true);
    assert.equal(release.draft, false);
    verifyInventory(release, assets);
    gh([
      "release",
      "verify",
      `v${qualified.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    for (const asset of assets)
      gh([
        "release",
        "verify-asset",
        `v${qualified.version}`,
        join(input, "bundle", asset.name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    const providers = [];
    for (const expected of [qualified.candidate, qualified.publication]) {
      const path = `actions/runs/${expected.run}/attempts/${expected.attempt}`;
      const provider = {
        run: api(path),
        jobs: api(`${path}/jobs?per_page=100`),
      };
      verifyProvider(provider, expected);
      const pages = JSON.parse(
        gh([
          "api",
          `repos/${repository}/actions/runs/${expected.run}/artifacts?per_page=100`,
          "--paginate",
          "--slurp",
        ]),
      );
      const artifacts = pages.flatMap((page) => page.artifacts);
      assert.ok(artifacts.length > 0);
      for (const artifact of artifacts) {
        assert.equal(artifact.workflow_run.id, Number(expected.run));
        assert.equal(artifact.workflow_run.head_sha, expected.source);
        assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
      }
      providers.push({ ...provider, artifacts });
    }
    // One authenticated read of the input checkpoints serves both the writer
    // history and the selection of earlier subjects to retain.
    const signed = readSignedHistoryRefs(
      JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
      gh,
    );
    const observed = await history({ env, gh, checkpoints: signed });
    const archiveRun = api(
      `actions/runs/${env.ARCHIVE_RUN}/attempts/${env.ARCHIVE_ATTEMPT}`,
    );
    const archiveJobs = api(
      `actions/runs/${env.ARCHIVE_RUN}/attempts/${env.ARCHIVE_ATTEMPT}/jobs?per_page=100`,
    );
    const archivePages = JSON.parse(
      gh([
        "api",
        `repos/${repository}/actions/runs/${env.ARCHIVE_RUN}/artifacts?per_page=100`,
        "--paginate",
        "--slurp",
      ]),
    );
    const archiveInputs = archivePages
      .flatMap((page) => page.artifacts)
      .filter(
        (artifact) => artifact.name === `archive-inputs-${env.ARCHIVE_ATTEMPT}`,
      );
    assert.equal(archiveInputs.length, 1);
    const archival = {
      run: archiveRun,
      attempt: Number(env.ARCHIVE_ATTEMPT),
      inventory: archiveJobs,
      artifact: archiveInputs[0],
    };
    const files = retainedQualificationFiles(qualified, logical);
    const missing = [...observed.missing];
    for (const provider of providers)
      for (const artifact of provider.artifacts)
        if (artifact.expired)
          missing.push({
            artifact: artifact.id,
            reason: "original-qualification-artifact-expired",
          });
    const current = {
      archival,
      qualified,
      qualificationBase64: qualifiedBytes.toString("base64"),
      qualificationSha256: hash(qualifiedBytes),
      providers,
      files,
      archive: {
        prerelease: release.prerelease,
        latestId: (() => {
          try {
            return api("releases/latest").id;
          } catch (error) {
            if (error.httpStatus !== 404) throw error;
            return null;
          }
        })(),
        releaseId: release.id,
        immutable: true,
        tagSha: reference.object.sha,
        assets: release.assets,
      },
    };
    // A retirement of an older pilot retains that subject beside the current
    // stable target; without a request the original single-target format stays.
    const retained = retainedCheckpointTargets(
      current,
      signed,
      JSON.parse(env.RETAINED_QUALIFICATIONS || "[]"),
    );
    missing.push(...retained.missing);
    const checkpoint = {
      schemaVersion: retained.targets.length === 1 ? 1 : 2,
      repository,
      complete: missing.length === 0,
      preparedAt: new Date().toISOString(),
      writers: observed.writers,
      writerAttempts: observed.writerAttempts,
      closedWriterRuns: observed.closedWriterRuns,
      nonWriterRuns: observed.nonWriterRuns,
      ...(retained.targets.length === 1
        ? { targetQualification: current }
        : { targetQualifications: retained.targets }),
      missing,
    };
    mkdirSync(output);
    const bytes = encodeHistoryCheckpoint(checkpoint);
    writeFileSync(join(output, "release-history.json"), bytes, { flag: "wx" });
    const expiries = [
      ...observed.writers.map((writer) => writer.artifact),
      ...providers.flatMap((provider) => provider.artifacts),
    ]
      .map((artifact) => artifact.expires_at)
      .filter((value) => Number.isFinite(Date.parse(value)))
      .sort();
    const summary = {
      checkpointSha256: hash(bytes),
      transportEncoding: "gzip+base64",
      checkpointBytes: bytes.length,
      complete: checkpoint.complete,
      missing,
      targets: retained.targets.map((target) => ({
        version: target.qualified.version,
        qualificationSha256: target.qualificationSha256,
      })),
      earliestExpiry: expiries[0] ?? null,
      immediateArchiveVerified: true,
      recoveryAfterExpiry: "unproven-until-owner-signs-a-complete-checkpoint",
    };
    writeFileSync(
      join(output, "summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
      { flag: "wx" },
    );
    return summary;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: prepare-release-history.js ARCHIVE_INPUTS NEW_OUTPUT",
  );
  requireManualControl(process.env, ".github/workflows/release-history.yml");
  const result = await prepareReleaseHistory(
    resolve(process.argv[2]),
    resolve(process.argv[3]),
  );
  process.stdout.write(JSON.stringify(result) + "\n");
  if (!result.complete) process.exitCode = 1;
}
