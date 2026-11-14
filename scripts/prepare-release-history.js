// SPDX-License-Identifier: AGPL-3.0-only
/** Prepare a complete public-safe checkpoint; the owner signs a fresh history ref separately. */
import assert from "node:assert/strict";
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
  collectWriterHistory,
  readSignedHistoryRefs,
} from "./release-history.js";
import { requireManualControl } from "./release-continuation.js";

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
      source: { head: qualified.source },
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
    const observed = await history({
      env,
      gh,
      checkpoints: readSignedHistoryRefs(
        JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
        gh,
      ),
    });
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
    const files = {};
    for (const name of readdirSync(logical)) {
      if (
        name.endsWith(".tgz") ||
        name.endsWith(".tar") ||
        name.endsWith(".tar.gz")
      )
        continue;
      const bytes = regularBytes(join(logical, name));
      files[name] = { sha256: hash(bytes), base64: bytes.toString("base64") };
    }
    const missing = [...observed.missing];
    for (const provider of providers)
      for (const artifact of provider.artifacts)
        if (artifact.expired)
          missing.push({
            artifact: artifact.id,
            reason: "original-qualification-artifact-expired",
          });
    const checkpoint = {
      schemaVersion: 1,
      repository,
      complete: missing.length === 0,
      preparedAt: new Date().toISOString(),
      writers: observed.writers,
      writerAttempts: observed.writerAttempts,
      closedWriterRuns: observed.closedWriterRuns,
      nonWriterRuns: observed.nonWriterRuns,
      targetQualification: {
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
      },
      missing,
    };
    mkdirSync(output);
    const bytes = Buffer.from(JSON.stringify(checkpoint, null, 2) + "\n");
    assert.ok(
      bytes.length <= 48 * 1024 * 1024,
      "Checkpoint exceeds the 48 MiB Git transport budget; retain prior signed history separately before exporting another range",
    );
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
      complete: checkpoint.complete,
      missing,
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
