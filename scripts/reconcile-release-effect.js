// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only independent observations for an owner's exact unknown original effect. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash, releaseBytes } from "./release-bytes.js";
import { ownerDispatchBytes } from "./release-decision-transport.js";
import { readFamilyLabels } from "./release-labels.js";
import { releasePackages, releaseVersion } from "./release-coordinates.js";
import { verifyEffectJournal } from "./release-effects.js";
import {
  authenticateArtifact,
  restoreRetainedFiles,
} from "./release-retained-artifacts.js";
import { readSignedHistoryRefs } from "./release-history.js";
import { downloadEvidence } from "./download-evidence.js";
import { createRepositoryReader } from "./github-evidence.js";
import { verifyReleaseCompletion } from "./release-readback.js";
import { budgets } from "./qualification-budgets.js";
import { verifyReleaseTag } from "./verify-release-tag.js";

const repository = "Hadden-Industries/markdown-quality";
export function reconciliationSelection(env) {
  const operation = JSON.parse(
    ownerDispatchBytes({
      ...env,
      REVIEW_JSON: env.OPERATION_JSON,
      REVIEW_SHA: env.OPERATION_SHA,
    }),
  );
  assert.equal(operation.repository, repository);
  for (const name of ["source", "controller"])
    assert.match(operation[name], /^[a-f0-9]{40}$/u);
  assert.match(operation.manifestSha256, /^[a-f0-9]{64}$/u);
  releaseVersion(operation.version);
  assert.ok(["latest", "pilot"].includes(operation.label));
  assert.ok(
    Number.isSafeInteger(operation.releaseId) && operation.releaseId > 0,
  );
  assert.ok(Buffer.byteLength(env.CONTINUATION_JSON ?? "") <= 4096);
  const selected = JSON.parse(env.CONTINUATION_JSON);
  assert.deepEqual(
    Object.keys(selected).sort(),
    [
      "artifactId",
      "writerRun",
      "writerAttempt",
      "service",
      "sequence",
      "journalSha256",
    ].sort(),
  );
  for (const name of ["artifactId", "writerRun", "writerAttempt", "sequence"])
    assert.match(String(selected[name]), /^[1-9]\d{0,15}$/u);
  assert.ok(["npm", "github"].includes(selected.service));
  assert.match(selected.journalSha256, /^[a-f0-9]{64}$/u);
  return {
    operation,
    selected,
    expected: {
      repository,
      controller: operation.controller,
      run: String(selected.writerRun),
      attempt: String(selected.writerAttempt),
      workflow: ".github/workflows/promote-release.yml",
      job: selected.service,
      name: `${selected.service}-operation-${selected.writerAttempt}`,
      allowFailedJob: true,
    },
  };
}

export async function acquireReconciliation(
  output,
  { env = process.env } = {},
) {
  const { selected, expected } = reconciliationSelection(env);
  const read = createRepositoryReader({
    repository,
    token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
    budgetMs: budgets.collection,
  });
  const checkpoints = readSignedHistoryRefs(
    JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
  );
  const original = await authenticateArtifact(selected.artifactId, expected, {
    api: (path) => read(`/${path}`),
    checkpoints,
  });
  if (original.artifact.expired)
    restoreRetainedFiles(output, original.retained);
  else
    await downloadEvidence({
      id: Number(selected.artifactId),
      destination: output,
      read,
      runId: Number(selected.writerRun),
      repositoryId: original.run.repository.id,
      headRepositoryId: original.run.head_repository.id,
      headSha: expected.controller,
    });
}

export async function reconcileReleaseEffect(
  input,
  output,
  {
    env = process.env,
    now = Date.now,
    sleep,
    random,
    labels = (label, deadline) => readFamilyLabels(label, { deadline, now }),
    api: suppliedApi,
    authenticate,
    verifyTag = verifyReleaseTag,
    gh = (args, options) => native("gh", args, options),
  } = {},
) {
  const { operation, selected, expected } = reconciliationSelection(env),
    deadline = now() + 300000;
  const read =
    suppliedApi ??
    createRepositoryReader({
      repository,
      token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
      deadline,
      budgetMs: budgets.collection,
    });
  const api = (path) => read(path.startsWith("/") ? path : `/${path}`);
  if (authenticate) await authenticate();
  else
    await authenticateArtifact(selected.artifactId, expected, {
      api,
      checkpoints: readSignedHistoryRefs(
        JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
      ),
      directory: input,
    });
  const bytes = releaseBytes(join(input, "effects.jsonl"), 16 * 1024 * 1024);
  assert.equal(hash(bytes), selected.journalSha256);
  const context = JSON.parse(bytes.toString("utf8").split("\n")[0]).context;
  for (const [name, value] of Object.entries({
    repository,
    controller: operation.controller,
    source: operation.source,
    workflow: expected.workflow,
    run: expected.run,
    attempt: expected.attempt,
    job: selected.service,
    operationId: operation.operationId,
    decisionSha256: env.OPERATION_SHA,
    manifestSha256: operation.manifestSha256,
  }))
    assert.equal(context[name], value);
  const effect = verifyEffectJournal(bytes, context).find(
    (record) => record.sequence === Number(selected.sequence),
  );
  assert.ok(["outcome-unknown", "acknowledged"].includes(effect?.outcome));
  assert.equal(effect.provider, selected.service);
  const reference = await api(`/git/ref/tags/v${operation.version}`);
  verifyTag(reference, await api(`/git/tags/${reference.object.sha}`), {
    version: operation.version,
    source: { head: operation.source },
  });
  assert.ok(now() < deadline);
  gh(
    [
      "release",
      "verify",
      `v${operation.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ],
    { timeout: Math.max(1, deadline - now()) },
  );
  const initial = await labels(operation.label, deadline);
  for (const name of releasePackages)
    assert.ok(
      [operation.priors[name], operation.targets[name]].includes(initial[name]),
      "Unexpected provider value during reconciliation",
    );
  const observedOperation = {
    ...operation,
    targets:
      effect.provider === "npm"
        ? { ...initial, [effect.subject]: effect.target }
        : operation.targets,
    targetGithubLatest:
      effect.provider === "npm"
        ? operation.priorGithubLatest
        : operation.targetGithubLatest,
    targetPrerelease:
      effect.provider === "npm"
        ? operation.priorPrerelease
        : operation.targetPrerelease,
  };
  const result = await verifyReleaseCompletion({
    operation: observedOperation,
    now,
    sleep,
    random,
    deadline,
    readFamily: (end) => labels(operation.label, end),
    readGithub: async () => {
      const release = await api(`/releases/${operation.releaseId}`);
      assert.ok(
        release.assets.some(
          (asset) =>
            asset.name === "release-manifest.json" &&
            asset.digest === `sha256:${operation.manifestSha256}`,
        ),
      );
      let latest;
      try {
        latest = await api("/releases/latest");
      } catch (error) {
        if (
          error.httpStatus !== 404 ||
          (operation.priorGithubLatest !== null &&
            operation.targetGithubLatest !== null)
        )
          throw error;
        latest = null;
      }
      return { release, latest };
    },
  });
  const observation = result.lastConfirmed;
  const targetVisible =
    effect.provider === "npm"
      ? observation.npm?.[effect.subject] === effect.target
      : observation.github?.release.prerelease === effect.target.prerelease &&
        (observation.github.latest?.id ?? null) === effect.target.latest;
  const wholeOperationComplete =
    releasePackages.every(
      (name) => observation.npm?.[name] === operation.targets[name],
    ) &&
    observation.github?.release.prerelease === operation.targetPrerelease &&
    (observation.github.latest?.id ?? null) === operation.targetGithubLatest;
  const record = {
    schemaVersion: 1,
    kind: "release-effect-observation",
    readerController: env.GITHUB_SHA,
    observedAt: new Date().toISOString(),
    originalContext: context,
    journalSha256: hash(bytes),
    sequence: effect.sequence,
    effect,
    observation,
    observedState: targetVisible ? "target-visible" : "completion-unconfirmed",
    wholeOperationComplete,
    completion: result,
  };
  mkdirSync(output);
  writeFileSync(
    join(output, "provider-observation.json"),
    JSON.stringify(record, null, 2) + "\n",
    { flag: "wx" },
  );
  return record;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "acquire")
    await acquireReconciliation(resolve(process.argv[3]));
  else {
    assert.equal(
      process.argv.length,
      4,
      "Usage: reconcile-release-effect.js INPUT NEW_OUTPUT",
    );
    await reconcileReleaseEffect(
      resolve(process.argv[2]),
      resolve(process.argv[3]),
    );
  }
}
