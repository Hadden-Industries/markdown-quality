// SPDX-License-Identifier: AGPL-3.0-only
/** Resolve the immutable archive from its actual staging attempt, including legacy names. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { publicationRepository } from "./publication-context.js";
import { publicationWorkflow } from "./publication-attempts.js";

export const publicationArtifactName = (attempt) => {
  assert.match(String(attempt), /^[1-9]\d{0,15}$/u);
  return `publication-source-and-manifest-${attempt}`;
};

export async function downloadPublicationArtifact({
  run,
  attempt,
  destination,
  read = createRepositoryReader({
    repository: publicationRepository,
    token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
  }),
  download = downloadEvidence,
}) {
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0);
  assert.equal(run.repository?.full_name, publicationRepository);
  assert.equal(run.path, publicationWorkflow);
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.ok(Number(attempt) <= run.run_attempt);
  const name = publicationArtifactName(attempt);
  const artifacts = [];
  let total;
  for (let page = 1; page <= 5; page++) {
    const result = await read(
      `/actions/runs/${run.id}/artifacts?per_page=100&page=${page}`,
    );
    assert.ok(
      Array.isArray(result.artifacts) && result.artifacts.length <= 100,
    );
    assert.ok(
      Number.isSafeInteger(result.total_count) &&
        result.total_count >= 0 &&
        result.total_count <= 500,
    );
    total ??= result.total_count;
    assert.equal(
      result.total_count,
      total,
      "Publication artifact inventory changed",
    );
    artifacts.push(...result.artifacts);
    assert.ok(
      artifacts.length <= total,
      "Publication artifact inventory duplicated entries",
    );
    if (artifacts.length === total) break;
    assert.ok(
      result.artifacts.length > 0 && page < 5,
      "Incomplete publication artifact inventory",
    );
  }
  assert.equal(
    new Set(artifacts.map((artifact) => artifact.id)).size,
    artifacts.length,
    "Duplicate publication artifact IDs",
  );
  const matching = (value) =>
    artifacts.filter((artifact) => artifact.name === value);
  const modern = matching(name);
  const matches = modern.length
    ? modern
    : matching("publication-source-and-manifest");
  assert.equal(
    matches.length,
    1,
    "Missing or ambiguous original publication artifact",
  );
  await download({
    id: matches[0].id,
    destination,
    read,
    runId: run.id,
    repositoryId: run.repository.id,
    headRepositoryId: run.head_repository?.id ?? run.repository.id,
    headSha: run.head_sha,
    maximum: 64 * 1024 * 1024,
  });
  return matches[0];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: publication-artifact.js RUN ATTEMPT DIRECTORY",
  );
  const [runId, attempt, destination] = process.argv.slice(2);
  assert.match(runId, /^[1-9]\d{0,15}$/u);
  publicationArtifactName(attempt);
  const read = createRepositoryReader({
    repository: publicationRepository,
    token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
  });
  const run = await read(`/actions/runs/${runId}/attempts/${attempt}`);
  assert.equal(String(run.id), runId);
  assert.equal(String(run.run_attempt), attempt);
  await downloadPublicationArtifact({
    run,
    attempt,
    destination: resolve(destination),
    read,
  });
}
