// SPDX-License-Identifier: AGPL-3.0-only
/** Acquire original Actions inputs, or an immutable target backed by complete signed recovery evidence. */
import assert from "node:assert/strict";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash } from "./release-bytes.js";
import { downloadEvidence } from "./download-evidence.js";
import { createRepositoryReader } from "./github-evidence.js";
import { readSignedHistoryRefs } from "./release-history.js";
import { acquireIndexedRelease } from "./release-archive-reader.js";
import { budgets } from "./qualification-budgets.js";

export async function acquireReleaseInputs(
  output,
  {
    env = process.env,
    gh = (args) => native("gh", args),
    download = downloadEvidence,
    read: suppliedRead,
  } = {},
) {
  const repository = "Hadden-Industries/markdown-quality";
  for (const key of ["ARCHIVE_RUN", "ARCHIVE_ATTEMPT"])
    assert.match(env[key], /^[1-9]\d{0,15}$/u);
  assert.match(env.QUALIFICATION_SHA, /^[a-f0-9]{64}$/u);
  const read =
    suppliedRead ??
    createRepositoryReader({
      repository,
      token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
      budgetMs: budgets.collection,
    });
  let run;
  try {
    run = await read(
      `/actions/runs/${env.ARCHIVE_RUN}/attempts/${env.ARCHIVE_ATTEMPT}`,
    );
  } catch (error) {
    if (error.httpStatus !== 404) throw error;
    run = null;
  }
  if (run) {
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.path, ".github/workflows/github-release.yml");
    assert.equal(run.head_branch, "main");
    assert.equal(run.event, "workflow_dispatch");
    assert.equal(run.status, "completed");
  }
  const artifacts = [];
  for (let page = 1; run; page++) {
    const inventory = await read(
      `/actions/runs/${run.id}/artifacts?per_page=100&page=${page}`,
    );
    artifacts.push(...inventory.artifacts);
    if (artifacts.length >= inventory.total_count) {
      assert.equal(artifacts.length, inventory.total_count);
      break;
    }
    assert.equal(
      inventory.artifacts.length,
      100,
      "Truncated archival artifact inventory",
    );
  }
  const selected = artifacts.filter(
    (artifact) => artifact.name === `archive-inputs-${env.ARCHIVE_ATTEMPT}`,
  );
  assert.ok(selected.length <= 1, "Ambiguous original archival input");
  if (selected.length && !selected[0].expired) {
    await download({
      id: selected[0].id,
      destination: output,
      read,
      runId: run.id,
      repositoryId: run.repository.id,
      headRepositoryId: run.head_repository.id,
      headSha: run.head_sha,
    });
    return { source: "original-actions-artifact", artifact: selected[0].id };
  }
  const checkpoints = readSignedHistoryRefs(
    JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
    gh,
  );
  const matches = checkpoints.filter(
    (checkpoint) =>
      checkpoint.targetQualification.qualificationSha256 ===
      env.QUALIFICATION_SHA,
  );
  assert.equal(
    matches.length,
    1,
    "Expired source artifacts need complete signed original qualification and writer history",
  );
  const target = matches[0].targetQualification;
  const original = target.archival;
  assert.ok(
    original,
    "Signed fallback must retain the original archival provider and input artifact",
  );
  assert.equal(String(original.run.id), env.ARCHIVE_RUN);
  assert.equal(String(original.attempt), env.ARCHIVE_ATTEMPT);
  assert.equal(original.run.path, ".github/workflows/github-release.yml");
  assert.equal(original.run.repository.full_name, repository);
  assert.equal(original.run.event, "workflow_dispatch");
  assert.equal(original.run.head_branch, "main");
  if (run)
    for (const key of ["id", "path", "head_sha", "event", "head_branch"])
      assert.deepEqual(
        run[key],
        original.run[key],
        "Surviving archival metadata conflicts with signed original",
      );
  if (run)
    for (const name of ["repository", "head_repository"])
      for (const field of ["id", "full_name"])
        assert.equal(
          run[name][field],
          original.run[name][field],
          "Surviving archival repository identity changed",
        );
  if (selected.length)
    for (const field of [
      "id",
      "name",
      "digest",
      "size_in_bytes",
      "workflow_run",
    ])
      assert.deepEqual(
        selected[0][field],
        original.artifact[field],
        "Expired archival artifact conflicts with signed original",
      );
  const release = JSON.parse(
    gh(["api", `repos/${repository}/releases/${target.archive.releaseId}`]),
  );
  assert.deepEqual(
    release.assets.map(({ id, name, size, digest }) => ({
      id,
      name,
      size,
      digest,
    })),
    target.archive.assets.map(({ id, name, size, digest }) => ({
      id,
      name,
      size,
      digest,
    })),
  );
  mkdirSync(output);
  const acquired = acquireIndexedRelease(release, output, gh, {
    materialize: false,
    retainedQualification: target.qualified,
  });
  assert.deepEqual(acquired.qualified, target.qualified);
  const bytes = Buffer.from(target.qualificationBase64, "base64");
  assert.equal(hash(bytes), env.QUALIFICATION_SHA);
  writeFileSync(join(output, "qualification.json"), bytes, { flag: "wx" });
  renameSync(acquired.directory, join(output, "bundle"));
  return {
    source: "signed-original-history-and-qualification",
    releaseId: release.id,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    3,
    "Usage: acquire-release-inputs.js NEW_OUTPUT",
  );
  process.stdout.write(
    JSON.stringify(await acquireReleaseInputs(resolve(process.argv[2]))) + "\n",
  );
}
