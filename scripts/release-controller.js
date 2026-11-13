// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only admission, isolated writers, and independently rerunnable family completion. */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { native, npmCommand } from "./commands.js";
import {
  hash,
  readJson,
  regularBytes,
  repository,
  materializeReleaseBundle,
  verifyInventory,
} from "./release-assets.js";
import { gitSource, verifyPublicRegistryArchives } from "./github-release.js";
import { requireManualControl } from "./release-continuation.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { readReleaseOperation } from "./release-operation.js";
import { readFamilyLabels } from "./release-labels.js";
import { createEffectJournal } from "./release-effects.js";
import { admitServiceArtifact } from "./promotion-handoff.js";
import { executeFamilyLabels } from "./family-labels.js";
import { verifyReleaseCompletion } from "./release-readback.js";
import { refreshReleaseSecurity } from "./qualify-release-security.js";
import { createRepositoryReader } from "./github-evidence.js";
import { budgets } from "./qualification-budgets.js";
import { releasePackages } from "./release-coordinates.js";
import { verifyNoPendingStages } from "./release-stage-guards.js";
import {
  admitPriorReleaseEffects,
  readSignedHistoryRefs,
} from "./release-history.js";
import {
  retainedArtifact,
  verifyRetainedFiles,
  assertRetainedArtifactIdentity,
  authenticateArtifact,
} from "./release-retained-artifacts.js";

/** The provider interface keeps fixture transports outside the authorization and effect decisions. */
export function nativeReleaseProvider(env = process.env) {
  let retained;
  const checkpoints = (deadline = Date.now() + budgets.read) =>
    (retained ??= readSignedHistoryRefs(
      JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
      (args, options = {}) => {
        const remaining = deadline - Date.now();
        assert.ok(
          remaining > 0,
          "Completion deadline exhausted reading signed history",
        );
        return native("gh", args, { ...options, timeout: remaining });
      },
      { deadline },
    ));
  const readers = new Map();
  const api = (path, deadline = Date.now() + budgets.read) => {
    let reader = readers.get(deadline);
    if (!reader) {
      reader = createRepositoryReader({
        repository,
        token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
        budgetMs: budgets.collection,
        deadline,
      });
      readers.set(deadline, reader);
    }
    return reader(`/${path}`);
  };
  return {
    api,
    gh: (args, options) => native("gh", args, options),
    npm: npmCommand,
    labels: (label, deadline) =>
      readFamilyLabels(label, { deadline, now: Date.now }),
    verifyTag: verifyReleaseTag,
    security: refreshReleaseSecurity,
    publicBytes: verifyPublicRegistryArchives,
    history: (operation, checkpoint, admittedTarget) =>
      admitPriorReleaseEffects(operation, { env, checkpoint, admittedTarget }),
    checkpoints,
    service: (service, directory, id, expected, gh, deadline) =>
      admitServiceArtifact(service, directory, id, expected, gh, {
        checkpoints: checkpoints(deadline),
      }),
  };
}

const contextFor = (job, operation, env, origin = {}) => ({
  repository,
  controller: operation.controller,
  source: operation.source,
  workflow: ".github/workflows/promote-release.yml",
  run: String(origin.run ?? env.GITHUB_RUN_ID),
  attempt: String(origin.attempt ?? env.GITHUB_RUN_ATTEMPT),
  job,
  operationId: operation.operationId,
  manifestSha256: operation.manifestSha256,
  decisionSha256: env.OPERATION_SHA,
});

async function artifactIdentity(
  provider,
  id,
  name,
  job,
  context,
  directory,
  deadline,
) {
  return authenticateArtifact(
    id,
    { ...context, name, job },
    {
      api: (path) => provider.api(path, deadline),
      checkpoints: provider.checkpoints?.(deadline) ?? [],
      directory,
    },
  );
}

async function unchangedArchive(provider, admission, deadline) {
  const reference = await provider.api(
    `git/ref/tags/v${admission.operation.version}`,
    deadline,
  );
  assert.equal(
    reference.object.sha,
    admission.archive.tagSha,
    "Signed tag identity changed after admission",
  );
  const release = await provider.api(
    `releases/${admission.operation.releaseId}`,
    deadline,
  );
  assert.equal(release.id, admission.operation.releaseId);
  assert.equal(release.immutable, true);
  assert.equal(release.draft, false);
  assert.equal(release.tag_name, `v${admission.operation.version}`);
  assert.deepEqual(
    release.assets.map(({ id, name, size, digest }) => ({
      id,
      name,
      size,
      digest,
    })),
    admission.archive.inventory,
  );
  return release;
}

async function latestRelease(provider, expectedAbsence, deadline) {
  try {
    return await provider.api("releases/latest", deadline);
  } catch (error) {
    if (expectedAbsence && error.httpStatus === 404) return null;
    throw error;
  }
}

/** Admission is the only phase that parses/audits the full logical archive. Writers recheck its immutable identity. */
export async function runReleaseController({
  phase,
  input,
  output,
  env = process.env,
  provider = nativeReleaseProvider(env),
  now = Date.now,
  sleep,
  random,
}) {
  assert.ok(["admit", "npm", "github", "verify"].includes(phase));
  requireManualControl(env, ".github/workflows/promote-release.yml");
  const qualifiedBytes = regularBytes(join(input, "qualification.json"));
  assert.equal(hash(qualifiedBytes), env.QUALIFICATION_SHA);
  const qualified = JSON.parse(qualifiedBytes);
  assert.equal(qualified.schemaVersion, 2);
  const { operation, bytes: decisionBytes } = readReleaseOperation(
    env,
    qualified,
    { allowHistoricalController: phase === "verify" },
  );
  let writerEffects;
  if (["npm", "github"].includes(phase)) {
    writerEffects = createEffectJournal(
      output,
      contextFor(phase, operation, env),
    );
    writeFileSync(join(output, "operation.json"), decisionBytes, {
      flag: "wx",
      flush: true,
    });
    assert.equal(
      String(env.GITHUB_RUN_ATTEMPT),
      "1",
      "Writer reruns are forbidden; authenticate original effects in a fresh owner dispatch or rerun verification only",
    );
  }
  let deadline = now() + (phase === "admit" ? budgets.collection : 300000);
  const checkController = async () => {
    assert.equal(
      (await provider.api("git/ref/heads/main", deadline)).object.sha,
      env.GITHUB_SHA,
      "Control branch advanced after owner dispatch",
    );
  };
  if (phase === "admit") {
    const scratch = mkdtempSync(
      join(tmpdir(), "markdown-quality-release-admission-"),
    );
    try {
      const logical = join(scratch, "logical");
      const assets = materializeReleaseBundle(
        qualified,
        join(input, "bundle"),
        logical,
        gitSource(qualified, process.cwd()),
      );
      const reference = await provider.api(
        `git/ref/tags/v${qualified.version}`,
        deadline,
      );
      provider.verifyTag(
        reference,
        await provider.api(`git/tags/${reference.object.sha}`, deadline),
        { version: qualified.version, source: { head: qualified.source } },
      );
      const release = await provider.api(
        `releases/${operation.releaseId}`,
        deadline,
      );
      assert.equal(release.tag_name, `v${qualified.version}`);
      assert.equal(release.immutable, true);
      assert.equal(release.draft, false);
      verifyInventory(release, assets);
      provider.gh([
        "release",
        "verify",
        `v${qualified.version}`,
        "--repo",
        repository,
        "--format",
        "json",
      ]);
      for (const asset of assets)
        provider.gh([
          "release",
          "verify-asset",
          `v${qualified.version}`,
          join(input, "bundle", asset.name),
          "--repo",
          repository,
          "--format",
          "json",
        ]);
      const security = provider.security(qualified, logical);
      await provider.publicBytes(qualified);
      const history = await provider.history(
        operation,
        env.HISTORY_CHECKPOINT,
        { qualified, qualificationSha256: env.QUALIFICATION_SHA },
      );
      verifyNoPendingStages(operation.stageInventory, {
        latestStageWriteAt: history.latestStageWriteAt,
      });
      deadline = now() + 300000;
      await checkController();
      const latest = await latestRelease(
        provider,
        operation.priorGithubLatest === null,
        deadline,
      );
      assert.equal(
        latest?.id ?? null,
        operation.priorGithubLatest,
        "GitHub prior differs from owner approval",
      );
      assert.equal(release.prerelease, operation.priorPrerelease);
      const labels = await provider.labels(operation.label, deadline);
      for (const name of releasePackages) {
        const expected =
          operation.operation === "direct"
            ? operation.targets[name]
            : operation.priors[name];
        assert.ok(
          labels[name] === expected ||
            (history.settled?.[name] === operation.targets[name] &&
              labels[name] === operation.targets[name]),
          `Unapproved npm preimage for ${name}`,
        );
      }
      if (operation.operation === "direct") {
        assert.equal(
          qualified.decision.reviewSha256,
          qualified.evidence["release-review.json"],
        );
        assert.equal(qualified.channel, "latest");
      }
      mkdirSync(output);
      const admission = {
        schemaVersion: 1,
        operation,
        decisionSha256: hash(decisionBytes),
        qualificationSha256: hash(qualifiedBytes),
        context: contextFor("admit", operation, env),
        security,
        history,
        archive: {
          tagSha: reference.object.sha,
          inventory: release.assets.map(({ id, name, size, digest }) => ({
            id,
            name,
            size,
            digest,
          })),
        },
      };
      writeFileSync(
        join(output, "admission.json"),
        JSON.stringify(admission, null, 2) + "\n",
        { flag: "wx" },
      );
      writeFileSync(join(output, "qualification.json"), qualifiedBytes, {
        flag: "wx",
      });
      return admission;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
  const admission = readJson(
    join(env.ADMISSION_DIRECTORY ?? "promotion-admission", "admission.json"),
  );
  assert.deepEqual(admission.operation, operation);
  assert.equal(admission.decisionSha256, env.OPERATION_SHA);
  assert.equal(admission.qualificationSha256, env.QUALIFICATION_SHA);
  const admissionContext = contextFor(
    "admit",
    operation,
    env,
    admission.context,
  );
  assert.deepEqual(admission.context, admissionContext);
  assert.equal(
    admission.context.run,
    String(env.WRITER_RUN ?? env.GITHUB_RUN_ID),
  );
  await artifactIdentity(
    provider,
    env.ADMISSION_ID,
    `promotion-admission-${admission.context.attempt}`,
    "admit",
    admissionContext,
    env.ADMISSION_DIRECTORY ?? "promotion-admission",
    deadline,
  );
  const serviceResult = (service, directory, id) => {
    const record = readJson(join(directory, `${service}-result.json`));
    const context = contextFor(service, operation, env, record.context);
    assert.equal(context.run, String(env.WRITER_RUN ?? env.GITHUB_RUN_ID));
    assert.ok(
      Number(context.attempt) <=
        Number(env.WRITER_ATTEMPT ?? env.GITHUB_RUN_ATTEMPT),
    );
    return provider.service(
      service,
      directory,
      id,
      context,
      (args, options = {}) => {
        const remaining = Math.floor(deadline - now());
        assert.ok(
          remaining > 0,
          "Read-only completion budget exhausted during writer authentication",
        );
        return provider.gh(args, { ...options, timeout: remaining });
      },
      deadline,
    );
  };
  if (phase === "npm") {
    await checkController();
    verifyNoPendingStages(operation.stageInventory, {
      latestStageWriteAt: admission.history.latestStageWriteAt,
    });
    await unchangedArchive(provider, admission, deadline);
    const effects = writerEffects;
    const labels = await executeFamilyLabels({
      operation,
      readLabels: async (end) => {
        await checkController();
        return provider.labels(operation.label, end);
      },
      command: provider.npm,
      write: (effect, request) => effects.write(effect, request),
      now,
      sleep,
      random,
      settled: admission.history.settled ?? {},
      deadline,
    });
    return effects.seal("npm", {
      settled: admission.history.settled ?? {},
      operation,
      labels,
      archive: admission.archive,
      qualificationSha256: env.QUALIFICATION_SHA,
    });
  }
  const npm = await serviceResult(
    "npm",
    env.NPM_DIRECTORY ?? "npm-operation",
    env.NPM_RESULT_ID,
  );
  assert.deepEqual(npm.record.operation, operation);
  assert.deepEqual(npm.record.archive, admission.archive);
  assert.equal(npm.record.qualificationSha256, env.QUALIFICATION_SHA);
  assert.deepEqual(npm.record.labels, operation.targets);
  assert.ok(
    npm.effects.every((effect) => operation.scope.npm.includes(effect.subject)),
    "Unexpected npm effect outside approved scope",
  );
  for (const name of operation.scope.npm) {
    const writes = npm.effects.filter((effect) => effect.subject === name);
    assert.ok(
      writes.length === 1 ||
        (writes.length === 0 &&
          (operation.noops?.includes(name) ||
            admission.history.settled?.[name] === operation.targets[name])),
      "Missing or duplicate npm effect proof",
    );
    if (writes.length) {
      assert.equal(writes[0].prior, operation.priors[name]);
      assert.equal(writes[0].target, operation.targets[name]);
      assert.equal(writes[0].integrity, operation.targetIntegrities[name]);
      assert.equal(writes[0].step, `npm/${name}`);
      assert.equal(
        writes[0].operation,
        operation.targets[name] === null ? "delete-label" : "set-label",
      );
    }
  }
  if (phase === "github") {
    await checkController();
    verifyNoPendingStages(operation.stageInventory, {
      latestStageWriteAt: admission.history.latestStageWriteAt,
    });
    assert.ok(
      !(admission.history.settledGithub ?? []).some(
        (effect) =>
          effect.context?.operationId === operation.operationId &&
          effect.context?.decisionSha256 === env.OPERATION_SHA &&
          effect.operation === "classify-release" &&
          effect.subject === operation.releaseId,
      ),
      "The GitHub effect was acknowledged; use read-only verification or reconciliation instead of another writer",
    );
    const preflight = await verifyReleaseCompletion({
      operation: {
        ...operation,
        targetGithubLatest: operation.priorGithubLatest,
        targetPrerelease: operation.priorPrerelease,
      },
      now,
      sleep,
      random,
      deadline,
      readFamily: (end) => provider.labels(operation.label, end),
      readGithub: async (end) => ({
        release: await unchangedArchive(provider, admission, end),
        latest: await latestRelease(
          provider,
          operation.priorGithubLatest === null,
          end,
        ),
      }),
    });
    if (preflight.status !== "complete") return preflight;
    const effects = writerEffects;
    if (
      operation.scope.github &&
      (operation.priorPrerelease !== operation.targetPrerelease ||
        operation.priorGithubLatest !== operation.targetGithubLatest)
    ) {
      await checkController();
      assert.equal(operation.targetGithubLatest, operation.releaseId);
      effects.write(
        {
          provider: "github",
          subject: operation.releaseId,
          operation: "classify-release",
          step: "github/classification",
          prior: {
            latest: operation.priorGithubLatest,
            prerelease: operation.priorPrerelease,
          },
          target: {
            latest: operation.targetGithubLatest,
            prerelease: operation.targetPrerelease,
          },
        },
        () =>
          provider.gh([
            "release",
            "edit",
            `v${operation.version}`,
            "--repo",
            repository,
            `--prerelease=${operation.targetPrerelease}`,
            "--latest",
          ]),
      );
    }
    return effects.seal("github", {
      operation,
      npmResultSha256: hash(
        regularBytes(
          join(env.NPM_DIRECTORY ?? "npm-operation", "npm-result.json"),
        ),
      ),
      archive: admission.archive,
    });
  }
  const github = await serviceResult(
    "github",
    env.RELEASE_GITHUB_DIRECTORY ?? "github-operation",
    env.RELEASE_GITHUB_RESULT_ID,
  );
  assert.deepEqual(github.record.operation, operation);
  assert.deepEqual(github.record.archive, admission.archive);
  const expectedGithubWrites =
    operation.scope.github &&
    (operation.priorPrerelease !== operation.targetPrerelease ||
      operation.priorGithubLatest !== operation.targetGithubLatest)
      ? 1
      : 0;
  assert.equal(
    github.effects.length,
    expectedGithubWrites,
    "Missing or additional GitHub effects",
  );
  if (expectedGithubWrites) {
    assert.equal(github.effects[0].subject, operation.releaseId);
    assert.equal(github.effects[0].operation, "classify-release");
    assert.deepEqual(github.effects[0].prior, {
      latest: operation.priorGithubLatest,
      prerelease: operation.priorPrerelease,
    });
    assert.deepEqual(github.effects[0].target, {
      latest: operation.targetGithubLatest,
      prerelease: operation.targetPrerelease,
    });
  }
  assert.equal(
    github.record.npmResultSha256,
    hash(
      regularBytes(
        join(env.NPM_DIRECTORY ?? "npm-operation", "npm-result.json"),
      ),
    ),
  );
  const result = await verifyReleaseCompletion({
    operation,
    now,
    sleep,
    random,
    deadline,
    readFamily: (end) => provider.labels(operation.label, end),
    readGithub: async (end) => ({
      release: await unchangedArchive(provider, admission, end),
      latest: await latestRelease(
        provider,
        operation.targetGithubLatest === null ||
          operation.priorGithubLatest === null,
        end,
      ),
    }),
  });
  mkdirSync(output);
  writeFileSync(
    join(output, "completion.json"),
    JSON.stringify(
      {
        ...result,
        operation,
        operationId: operation.operationId,
        decisionSha256: env.OPERATION_SHA,
        originalWriters: {
          npm: npm.record.context,
          github: github.record.context,
        },
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  return result;
}
