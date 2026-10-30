// SPDX-License-Identifier: AGPL-3.0-only
/** Resolve the original reference producer, never a name-only or latest-attempt archive. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { verifyProducingAttempt } from "./ci-proof.js";
const repository = "Hadden-Industries/markdown-quality";
const read = createRepositoryReader({
  repository,
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
});
const runId = Number(process.argv[2]);
assert.ok(Number.isSafeInteger(runId) && runId > 0);
const run = await read(`/actions/runs/${runId}`);
assert.equal(run.repository.full_name, repository);
assert.equal(run.head_repository.id, run.repository.id);
assert.equal(run.path, ".github/workflows/release-qualification.yml");
assert.equal(run.event, "workflow_dispatch");
assert.equal(run.head_branch, "main");
assert.ok(run.run_attempt <= 8);
// Within the active qualification run the consumers download the known ID
// directly; cross-run release effects require a completed successful source.
assert.equal(run.status, "completed");
assert.equal(run.conclusion, "success");
const jobs = await read(
  `/actions/runs/${runId}/jobs?filter=latest&per_page=100`,
);
assert.equal(jobs.total_count, jobs.jobs.length);
const producer = jobs.jobs.filter(
  (job) => job.name === "product / Reference producer",
);
assert.equal(producer.length, 1);
let producingAttempt;
for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
  try {
    await verifyProducingAttempt(producer[0], attempt, run, read);
    producingAttempt = attempt;
    break;
  } catch (error) {
    if (attempt === run.run_attempt) throw error;
  }
}
const inventory = await read(`/actions/runs/${runId}/artifacts?per_page=100`);
assert.equal(inventory.total_count, inventory.artifacts.length);
const selected = inventory.artifacts.filter((a) =>
  new RegExp(
    `^qualified-producer-${producingAttempt}(?:-recovery-[23])?\\.zip$`,
    "u",
  ).test(a.name),
);
assert.equal(selected.length, 1, "Missing or conflicting original archive");
await downloadEvidence({
  id: selected[0].id,
  destination: resolve(process.argv[3]),
  read,
  runId,
  repositoryId: run.repository.id,
  headSha: run.head_sha,
});
