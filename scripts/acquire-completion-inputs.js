// SPDX-License-Identifier: AGPL-3.0-only
/** Restore the three original read-only completion inputs by immutable ID, including signed expiry fallback. */
import assert from "node:assert/strict";
import { native } from "./commands.js";
import { downloadEvidence } from "./download-evidence.js";
import { createRepositoryReader } from "./github-evidence.js";
import { readSignedHistoryRefs } from "./release-history.js";
import {
  authenticateArtifact,
  retainedArtifact,
  restoreRetainedFiles,
  assertRetainedArtifactIdentity,
} from "./release-retained-artifacts.js";
import { budgets } from "./qualification-budgets.js";

const env = process.env,
  repository = "Hadden-Industries/markdown-quality";
const read = createRepositoryReader({
  repository,
  token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
  budgetMs: budgets.collection,
});
let checkpoints;
const operation = JSON.parse(env.OPERATION_JSON);
for (const [id, name, job, directory] of [
  [env.ADMISSION_ID, "promotion-admission", "admit", "promotion-admission"],
  [env.NPM_RESULT_ID, "npm-operation", "npm", "npm-operation"],
  [
    env.RELEASE_GITHUB_RESULT_ID,
    "github-operation",
    "github",
    "github-operation",
  ],
]) {
  assert.match(String(id), /^[1-9]\d{0,15}$/u);
  checkpoints ??= readSignedHistoryRefs(
    JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
  );
  const expected = {
    name: `${name}-${env.WRITER_ATTEMPT}`,
    job,
    run: env.WRITER_RUN,
    attempt: env.WRITER_ATTEMPT,
    controller: operation.controller,
    workflow: ".github/workflows/promote-release.yml",
  };
  const { artifact, retained } = await authenticateArtifact(id, expected, {
    api: (path) => read(`/${path}`),
    checkpoints,
  });
  if (!artifact.expired) {
    await downloadEvidence({
      id: Number(id),
      destination: directory,
      read,
      runId: Number(env.WRITER_RUN),
      repositoryId: artifact.workflow_run.repository_id,
      headRepositoryId: artifact.workflow_run.head_repository_id,
      headSha: operation.controller,
    });
  } else {
    assertRetainedArtifactIdentity(artifact, retained);
    restoreRetainedFiles(directory, retained);
  }
}
