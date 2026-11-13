// SPDX-License-Identifier: AGPL-3.0-only
/** Retain native writer observations and original target qualification under owner-signed history refs. */
import assert from "node:assert/strict";
import { sameJobExecution } from "./github-job-execution.js";
import { isDeepStrictEqual } from "node:util";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "./commands.js";
import { hash, releaseBytes } from "./release-bytes.js";
import { verifyOwnerTagSignature } from "./release-signature.js";
import { verifyQualification, verifyProvider } from "./release-assets.js";
import {
  verifyEffectJournal,
  verifyEffectSettlement,
  verifySettlementObservation,
  archiveEffectObserved,
} from "./release-effects.js";
import { acquireIndexedRelease } from "./release-archive-reader.js";
import { refreshReleaseSecurity } from "./qualify-release-security.js";
import { verifyPublicRegistryArchives } from "./github-release.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { authenticateStagingRecovery } from "./release-staging-recovery.js";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { budgets } from "./qualification-budgets.js";
import { retainedObservationIdentity } from "./release-retained-artifacts.js";
import {
  legacyPublicationSteps,
  stagingStepNames,
} from "./publication-steps.js";

const repository = "Hadden-Industries/markdown-quality";
const key = (entry) =>
  `${entry.run.path}/${entry.run.id}/${entry.attempt}/${entry.job.id}`;
const jobIdentity = (job) =>
  Object.fromEntries(
    [
      "id",
      "name",
      "run_id",
      "run_attempt",
      "head_sha",
      "status",
      "conclusion",
      "runner_id",
      "started_at",
      "completed_at",
      "steps",
    ].map((name) => [name, job[name]]),
  );
const inventoryIdentity = (inventory) => ({
  total_count: inventory.total_count,
  jobs: inventory.jobs.map(jobIdentity).sort((a, b) => a.id - b.id),
});
export const writerObservationIdentity = retainedObservationIdentity;

/** Overlap is a consistency check, never a preference for whichever record permits a write. */
export function mergeWriterHistory(...inventories) {
  const merged = new Map();
  for (const inventory of inventories)
    for (const entry of inventory) {
      const identity = key(entry),
        prior = merged.get(identity);
      assert.ok(
        !prior ||
          isDeepStrictEqual(
            writerObservationIdentity(prior),
            writerObservationIdentity(entry),
          ),
        "Conflicting live/checkpoint writer observations",
      );
      merged.set(identity, entry);
    }
  return [...merged.values()];
}

/** Signed Git authenticates exact checkpoint bytes and permits no self-asserted signer identity. */
export function verifySignedCheckpoint(
  bytes,
  { reference, annotation, command = native, signerPolicy } = {},
) {
  assert.ok(
    bytes.length <= 48 * 1024 * 1024,
    "Signed checkpoint exceeds the bounded Git transport",
  );
  assert.match(reference.ref, /^refs\/tags\/release-history-[A-Za-z0-9._-]+$/u);
  assert.equal(reference.object.type, "tag");
  assert.equal(reference.object.sha, annotation.sha);
  assert.equal(annotation.tag, reference.ref.slice("refs/tags/".length));
  assert.equal(annotation.object.type, "commit");
  verifyOwnerTagSignature(annotation, signerPolicy, command);
  const original = command(
    "git",
    ["show", `${annotation.object.sha}:release-history.json`],
    { encoding: null },
  );
  assert.ok(
    Buffer.from(original).equals(bytes),
    "Checkpoint bytes differ from the signed history commit",
  );
  const checkpoint = JSON.parse(bytes);
  assert.equal(checkpoint.schemaVersion, 1);
  assert.equal(checkpoint.repository, repository);
  assert.equal(
    checkpoint.complete,
    true,
    "Incomplete checkpoint cannot authorize recovery",
  );
  assert.ok(checkpoint.writers?.length > 0, "Writer history is missing");
  assert.ok(
    checkpoint.targetQualification,
    "Original target qualification is missing",
  );
  const { qualified, files, archive } = checkpoint.targetQualification;
  verifyQualification(qualified);
  const qualificationBytes = Buffer.from(
    checkpoint.targetQualification.qualificationBase64,
    "base64",
  );
  assert.equal(
    hash(qualificationBytes),
    checkpoint.targetQualification.qualificationSha256,
  );
  assert.deepEqual(JSON.parse(qualificationBytes), qualified);
  if (checkpoint.targetQualification.archival) {
    const original = checkpoint.targetQualification.archival;
    assert.equal(original.run.repository.full_name, repository);
    assert.equal(original.run.path, ".github/workflows/github-release.yml");
    assert.equal(original.run.event, "workflow_dispatch");
    assert.equal(original.run.head_branch, "main");
    assert.equal(
      original.inventory.total_count,
      original.inventory.jobs.length,
    );
    const jobs = original.inventory.jobs.filter(
      (job) => job.name === "prepare",
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].conclusion, "success");
    assert.equal(jobs[0].run_attempt, original.attempt);
    assert.equal(jobs[0].run_id, original.run.id);
    assert.equal(jobs[0].head_sha, original.run.head_sha);
    assert.equal(original.artifact.name, `archive-inputs-${original.attempt}`);
    assert.equal(original.artifact.workflow_run.id, original.run.id);
    assert.equal(
      original.artifact.workflow_run.head_sha,
      original.run.head_sha,
    );
    assert.match(original.artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  }
  assert.equal(checkpoint.targetQualification.providers.length, 2);
  for (const [index, expected] of [
    qualified.candidate,
    qualified.publication,
  ].entries()) {
    const provider = checkpoint.targetQualification.providers[index];
    verifyProvider(provider, expected);
    assert.ok(
      provider.artifacts.length > 0,
      "Original qualification artifacts are missing",
    );
    for (const artifact of provider.artifacts) {
      assert.equal(artifact.workflow_run.id, Number(expected.run));
      assert.equal(artifact.workflow_run.head_sha, expected.source);
      assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
    }
  }
  assert.ok(
    Number.isSafeInteger(archive.releaseId) &&
      archive.releaseId > 0 &&
      archive.immutable === true,
  );
  assert.ok(Array.isArray(archive.assets) && archive.assets.length > 0);
  const locks =
    qualified.schemaVersion === 2
      ? qualified.candidate.matrix.os.flatMap((platform) =>
          ["root", "isolated"].map(
            (layout) =>
              `public-recipient-${platform}-${layout}-package-lock.json`,
          ),
        )
      : [];
  for (const name of locks)
    assert.match(
      qualified.evidence[name],
      /^[a-f0-9]{64}$/u,
      "Missing retained recipient lock identity",
    );
  for (const name of [
    "release-manifest.json",
    "publication-origins.json",
    "signed-tag.json",
    ...Object.keys(qualified.reports),
    ...locks,
  ]) {
    assert.ok(files[name], `Missing original qualification member: ${name}`);
    const raw = Buffer.from(files[name].base64, "base64");
    assert.equal(raw.toString("base64"), files[name].base64);
    assert.equal(hash(raw), files[name].sha256);
    const expected =
      qualified.reports[name]?.sha256 ??
      qualified.evidence[name] ??
      (name === "release-manifest.json"
        ? qualified.manifestSha256
        : name === "publication-origins.json"
          ? qualified.originsSha256
          : null);
    if (expected) assert.equal(hash(raw), expected);
  }
  for (const entry of checkpoint.writers) {
    assert.equal(entry.run.repository.full_name, repository);
    assert.equal(entry.run.head_sha, entry.job.head_sha);
    assert.equal(entry.job.run_id, entry.run.id);
    assert.equal(entry.job.run_attempt, entry.attempt);
    assert.equal(entry.job.status, "completed");
    assert.ok(entry.files && entry.artifact?.digest);
    for (const file of Object.values(entry.files)) {
      const raw = Buffer.from(file.base64, "base64");
      assert.equal(raw.toString("base64"), file.base64);
      assert.equal(hash(raw), file.sha256);
    }
  }
  return checkpoint;
}

/** Explicit immutable ref selections are authenticated before any checkpoint fields are consumed. */
export function readSignedHistoryRefs(
  refs,
  gh = (args, options) => native("gh", args, options),
  { deadline = Date.now() + budgets.collection } = {},
) {
  assert.ok(Array.isArray(refs));
  const command = (executable, args, options = {}) => {
    const remaining = deadline - Date.now();
    assert.ok(remaining > 0, "Signed-history read budget exhausted");
    return native(executable, args, { ...options, timeout: remaining });
  };
  const read = (args) => {
    const remaining = deadline - Date.now();
    assert.ok(remaining > 0);
    return gh(args, { timeout: remaining });
  };
  return refs.map((ref) => {
    assert.match(ref, /^release-history-[A-Za-z0-9._-]+$/u);
    const reference = JSON.parse(
      read(["api", `repos/${repository}/git/ref/tags/${ref}`]),
    );
    const annotation = JSON.parse(
      read(["api", `repos/${repository}/git/tags/${reference.object.sha}`]),
    );
    const bytes = command(
      "git",
      ["show", `${annotation.object.sha}:release-history.json`],
      { encoding: null },
    );
    return verifySignedCheckpoint(bytes, { reference, annotation, command });
  });
}

function retainedFiles(root) {
  const files = {};
  const visit = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      assert.ok(!entry.isSymbolicLink());
      // The immutable release already retains these exact payloads. The native
      // readback receipts/inventory stay at the journal root; do not base64-copy
      // hundreds of megabytes of packages into a single Git evidence blob.
      if (name === "draft-readback" || name.startsWith("draft-readback/"))
        continue;
      if (entry.isDirectory()) visit(join(directory, entry.name), `${name}/`);
      else {
        const bytes = releaseBytes(
          join(directory, entry.name),
          64 * 1024 * 1024,
        );
        files[name] = { sha256: hash(bytes), base64: bytes.toString("base64") };
      }
    }
  };
  visit(root);
  return files;
}

/** Only complete native skipped effect inventories prove a setup failure made no request. */
export function writerNeverRequested(job) {
  let names;
  if (job.name === "stage") {
    try {
      names = stagingStepNames(job);
    } catch {
      return false;
    }
  } else
    names = {
      publish: legacyPublicationSteps,
      archive: [
        "Verify evidence and publish immutable selected-channel archive",
      ],
      npm: ["Change only approved npm labels, natives first"],
      github: [
        "Authenticate the sealed npm result before the isolated GitHub effect",
      ],
    }[job.name];
  return (
    names?.every((name) => {
      const matches = job.steps?.filter((step) => step.name === name) ?? [];
      return (
        matches.length === 1 &&
        matches[0].status === "completed" &&
        matches[0].conclusion === "skipped"
      );
    }) ?? false
  );
}

/** A failed legacy run needs its own complete terminal receipt and the exact signed writer, never a matching tag alone. */
export function legacyArchiveSettled(entry, checkpoints) {
  if (entry.job.name !== "archive") return false;
  const records = Object.values(entry.files).flatMap((file) => {
    try {
      const value = JSON.parse(Buffer.from(file.base64, "base64"));
      return value && typeof value === "object" && !Array.isArray(value)
        ? [value]
        : [];
    } catch {
      return [];
    }
  });
  const assets = (items) =>
    items
      .map((asset) => ({
        name: asset.name,
        size: asset.size,
        digest: asset.digest ?? `sha256:${asset.sha256}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  return checkpoints.some((checkpoint) => {
    const target = checkpoint.targetQualification,
      tag = `v${target.qualified.version}`;
    const original = checkpoint.writers.some(
      (writer) =>
        key(writer) === key(entry) &&
        isDeepStrictEqual(
          writerObservationIdentity(writer),
          writerObservationIdentity(entry),
        ),
    );
    if (!original || target.archive.immutable !== true) return false;
    const qualificationSha256 = hash(
      Buffer.from(
        // Historical terminal receipts hash this exact serialized qualification envelope.
        JSON.stringify(target.qualified),
      ),
    );
    const summary = records.some(
      (record) =>
        record.nativeReleaseAndEveryAssetVerified === true &&
        record.immutable === true &&
        record.source === target.qualified.source &&
        record.tag === tag &&
        record.releaseId === target.archive.releaseId &&
        record.qualificationSha256 === qualificationSha256 &&
        isDeepStrictEqual(assets(record.assets), assets(target.archive.assets)),
    );
    const nativeRelease = records.some(
      (record) =>
        record.id === target.archive.releaseId &&
        record.tag_name === tag &&
        record.draft === false &&
        record.immutable === true &&
        Array.isArray(record.assets) &&
        isDeepStrictEqual(
          assets(record.assets),
          assets(target.archive.assets),
        ) &&
        record.assets.some(
          (asset) =>
            asset.name === "release-manifest.json" &&
            asset.digest === `sha256:${target.qualified.manifestSha256}`,
        ),
    );
    const nativeTag = records.some(
      (record) =>
        record.tag === tag &&
        record.object?.sha === target.qualified.source &&
        record.object.type === "commit" &&
        record.verification?.verified === true &&
        record.verification.reason === "valid",
    );
    return summary || (nativeRelease && nativeTag);
  });
}

/** Capture complete original inventories and authenticated artifact bytes before retention expires. */
export async function collectWriterHistory({
  env = process.env,
  checkpoints = [],
  gh = (args) => native("gh", args),
  download = downloadEvidence,
} = {}) {
  const retained = mergeWriterHistory(
    ...checkpoints.map((checkpoint) => checkpoint.writers),
  );
  const live = [],
    missing = [];
  const scratch = mkdtempSync(
    join(env.RUNNER_TEMP ?? tmpdir(), "markdown-quality-writer-history-"),
  );
  try {
    for (const workflow of [
      "publish.yml",
      "github-release.yml",
      "promote-release.yml",
    ]) {
      const pages = JSON.parse(
        gh([
          "api",
          `repos/${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=100`,
          "--paginate",
          "--slurp",
        ]),
      );
      const runs = pages.flatMap((page) => page.workflow_runs);
      for (const run of runs) {
        const executions = [];
        assert.equal(run.repository.full_name, repository);
        assert.equal(run.path, `.github/workflows/${workflow}`);
        assert.ok(
          Number.isInteger(run.run_attempt) &&
            run.run_attempt > 0 &&
            run.run_attempt <= 50,
        );
        const current = String(run.id) === String(env.GITHUB_RUN_ID);
        if (!current)
          assert.equal(
            run.status,
            "completed",
            "Another release operation can still execute; stop/supersede and reconcile it first",
          );
        const last = current
          ? Number(env.GITHUB_RUN_ATTEMPT) - 1
          : run.run_attempt;
        for (let attempt = 1; attempt <= last; attempt++) {
          const retainedAttempt = retained.filter(
            (entry) =>
              String(entry.run.id) === String(run.id) &&
              entry.attempt === attempt,
          );
          const readOriginal = (args, fallback) => {
            try {
              return JSON.parse(gh(args));
            } catch (error) {
              if (error.httpStatus !== 404) throw error;
              assert.ok(
                retainedAttempt.length,
                "Deleted original attempt requires complete signed history",
              );
              assert.ok(
                retainedAttempt.every(
                  (entry) =>
                    entry.run.head_sha === run.head_sha &&
                    entry.run.path === run.path,
                ),
              );
              return fallback(retainedAttempt);
            }
          };
          const original = readOriginal(
            [
              "api",
              `repos/${repository}/actions/runs/${run.id}/attempts/${attempt}`,
            ],
            (entries) => entries[0].run,
          );
          const jobs = readOriginal(
            [
              "api",
              `repos/${repository}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`,
            ],
            (entries) => entries[0].inventory,
          );
          assert.equal(jobs.total_count, jobs.jobs.length);
          const artifactPages = readOriginal(
            [
              "api",
              `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
              "--paginate",
              "--slurp",
            ],
            (entries) => [
              {
                artifacts: entries.map((entry) => ({
                  ...entry.artifact,
                  expired: true,
                })),
              },
            ],
          );
          const artifacts = artifactPages.flatMap((page) => page.artifacts);
          for (const job of jobs.jobs.filter(
            (entry) =>
              ["stage", "publish", "archive", "npm", "github"].includes(
                entry.name,
              ) ||
              (workflow === "promote-release.yml" &&
                ["admit", "Read-only release completion", "reconcile"].includes(
                  entry.name,
                )) ||
              (workflow === "github-release.yml" &&
                entry.name === "Read-only archive completion"),
          )) {
            assert.equal(job.run_id, original.id);
            assert.equal(job.run_attempt, attempt);
            assert.equal(job.head_sha, original.head_sha);
            if (
              job.status === "completed" &&
              job.runner_id === 0 &&
              !job.runner_name &&
              Array.isArray(job.steps) &&
              job.steps.length === 0
            )
              continue;
            if (
              job.conclusion === "skipped" ||
              (job.status === "queued" && !job.steps?.length)
            )
              continue;
            assert.equal(
              job.status,
              "completed",
              "Original writer is unresolved",
            );
            sameJobExecution(job, job);
            const inherited = executions.find((prior) =>
              sameJobExecution(prior, job),
            );
            if (inherited) {
              assert.equal(job.conclusion, inherited.conclusion);
              assert.deepEqual(
                job.steps,
                inherited.steps,
                "Inherited writer execution changed",
              );
              continue;
            }
            executions.push(job);
            const base = { run: original, attempt, job, inventory: jobs };
            const names =
              job.name === "stage" || job.name === "publish"
                ? [`publication-source-and-manifest-${attempt}`]
                : job.name === "archive"
                  ? [`archive-journal-${attempt}`]
                  : job.name === "admit"
                    ? [`promotion-admission-${attempt}`]
                    : job.name === "reconcile"
                      ? [`release-reconciliation-${attempt}`]
                      : job.name === "Read-only release completion"
                        ? [`release-completion-${attempt}`]
                        : job.name === "Read-only archive completion"
                          ? [`archive-completion-${attempt}`]
                          : [
                              `${job.name}-operation-${attempt}`,
                              `${job.name}-promotion-journal-${attempt}`,
                            ];
            const matches = artifacts.filter((artifact) =>
              names.includes(artifact.name),
            );
            assert.ok(matches.length <= 1, "Ambiguous writer artifact");
            const old = retained.find((entry) => key(entry) === key(base));
            if (!matches.length && !old && writerNeverRequested(job)) continue;
            const readOnly = [
              "admit",
              "Read-only release completion",
              "Read-only archive completion",
              "reconcile",
            ].includes(job.name);
            if (readOnly && (!matches.length || matches[0].expired) && !old)
              continue;
            if (!matches.length || matches[0].expired) {
              assert.ok(
                !old ||
                  isDeepStrictEqual(
                    inventoryIdentity(old.inventory),
                    inventoryIdentity(jobs),
                  ),
                "Checkpoint original inventory changed",
              );
              if (old && matches.length) {
                for (const name of [
                  "id",
                  "name",
                  "size_in_bytes",
                  "digest",
                  "workflow_run",
                ])
                  assert.deepEqual(
                    old.artifact[name],
                    matches[0][name],
                    "Checkpoint artifact identity changed",
                  );
              }
              if (!old)
                missing.push({
                  workflow: original.path,
                  run: run.id,
                  attempt,
                  job: job.id,
                  reason: "missing-original-writer-artifact",
                });
              continue;
            }
            const artifact = matches[0],
              destination = join(scratch, `${run.id}-${attempt}-${job.id}`);
            const read = createRepositoryReader({
              repository,
              token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
              budgetMs: budgets.collection,
            });
            await download({
              id: artifact.id,
              destination,
              read,
              runId: run.id,
              repositoryId: run.repository.id,
              headRepositoryId: run.head_repository.id,
              headSha: run.head_sha,
            });
            live.push({ ...base, artifact, files: retainedFiles(destination) });
          }
        }
      }
    }
    return { writers: mergeWriterHistory(retained, live), missing };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Follow authenticated parent decisions so a continuation cannot forget an earlier writer. */
export function recoveryLineage(
  operation,
  authenticated,
  { completed = false } = {},
) {
  const lineage = [],
    seen = new Set();
  let selected = operation;
  while (["partial", "continue"].includes(selected.operation)) {
    const key = `${selected.originalOperationId}/${selected.originalDecisionSha256}`;
    assert.ok(
      !seen.has(key) && seen.size < 50,
      "Cyclic or excessive recovery lineage",
    );
    seen.add(key);
    const parent = authenticated.find(
      (writer) =>
        writer.context.operationId === selected.originalOperationId &&
        writer.context.decisionSha256 === selected.originalDecisionSha256 &&
        String(writer.entry.run.id) === String(selected.originalWriter.run) &&
        String(writer.entry.attempt) ===
          String(selected.originalWriter.attempt) &&
        String(writer.entry.job.id) === String(selected.originalWriter.job) &&
        hash(writer.bytes) === selected.originalJournalSha256,
    );
    // A successful native partial completion already authenticated this terminal
    // staging root before its recovery effects. It is not a new authority to write.
    if (
      !parent &&
      completed &&
      selected.operation === "partial" &&
      selected.affectedManifestSha256 &&
      selected.originalJournals
    )
      break;
    assert.ok(parent, "Missing original recovery ancestor");
    const file = parent.entry.files["operation.json"];
    assert.equal(file?.sha256, selected.originalDecisionSha256);
    const decision = JSON.parse(Buffer.from(file.base64, "base64"));
    assert.equal(decision.operationId, selected.originalOperationId);
    lineage.push(parent);
    selected = decision;
  }
  return lineage;
}

/** Fresh operations refuse ambiguous predecessors; checkpoint fallback must carry both histories and qualification. */
export function verifyActiveOperations(
  operation,
  decisionSha256,
  writers,
  authenticated,
) {
  const completed = new Set(),
    recovered = new Set();
  const operationKey = (id, digest) => `${id}/${digest}`;
  const allowed = ["partial", "continue"].includes(operation.operation)
    ? recoveryLineage(operation, authenticated)
    : [];
  for (const entry of writers) {
    if (entry.job.conclusion !== "success") continue;
    if (
      entry.job.name === "Read-only release completion" &&
      entry.files["completion.json"]
    ) {
      const record = JSON.parse(
        Buffer.from(entry.files["completion.json"].base64, "base64"),
      );
      if (record.status !== "complete") continue;
      const original = record.operation;
      assert.equal(original.operationId, record.operationId);
      for (const service of ["npm", "github"]) {
        const context = record.originalWriters[service];
        assert.ok(
          authenticated.some(
            (writer) =>
              writer.entry.job.name === service &&
              writer.context.operationId === record.operationId &&
              writer.context.decisionSha256 === record.decisionSha256 &&
              isDeepStrictEqual(writer.context, context),
          ),
          "Completion is missing its exact original writer",
        );
      }
      completed.add(operationKey(record.operationId, record.decisionSha256));
      if (["partial", "continue"].includes(original.operation)) {
        const key = operationKey(
          original.originalOperationId,
          original.originalDecisionSha256,
        );
        const destination =
          original.operation === "partial" ? recovered : completed;
        destination.add(key);
        for (const ancestor of recoveryLineage(original, authenticated, {
          completed: true,
        }))
          destination.add(
            operationKey(
              ancestor.context.operationId,
              ancestor.context.decisionSha256,
            ),
          );
      }
    }
    if (
      entry.job.name === "Read-only archive completion" &&
      entry.files["completion.json"]
    ) {
      const record = JSON.parse(
        Buffer.from(entry.files["completion.json"].base64, "base64"),
      );
      if (record.status === "complete") {
        const original = authenticated.find((writer) =>
          isDeepStrictEqual(writer.context, record.originalWriter),
        );
        assert.ok(original, "Archive completion lacks its original writer");
        completed.add(
          operationKey(
            original.context.operationId,
            original.context.decisionSha256,
          ),
        );
      }
    }
    if (
      entry.job.name === "reconcile" &&
      entry.files["provider-observation.json"]
    ) {
      const record = JSON.parse(
        Buffer.from(entry.files["provider-observation.json"].base64, "base64"),
      );
      if (
        record.wholeOperationComplete === true &&
        record.readerController === entry.run.head_sha
      ) {
        const original = authenticated.find(
          (writer) =>
            isDeepStrictEqual(writer.context, record.originalContext) &&
            hash(writer.bytes) === record.journalSha256,
        );
        assert.ok(
          original,
          "Whole-operation observation lacks its exact original writer",
        );
        completed.add(
          operationKey(
            original.context.operationId,
            original.context.decisionSha256,
          ),
        );
      }
    }
  }
  assert.ok(
    !recovered.has(operationKey(operation.operationId, decisionSha256)),
    "This interrupted operation was recovered; do not reactivate it",
  );
  for (const original of authenticated) {
    if (
      ![
        ".github/workflows/promote-release.yml",
        ".github/workflows/github-release.yml",
      ].includes(original.context.workflow) ||
      !original.effects.length
    )
      continue;
    const key = operationKey(
      original.context.operationId,
      original.context.decisionSha256,
    );
    if (completed.has(key) || recovered.has(key)) continue;
    if (original.context.operationId === operation.operationId) {
      assert.equal(original.context.decisionSha256, decisionSha256);
      continue;
    }
    assert.ok(
      allowed.some(
        (ancestor) =>
          ancestor.context.operationId === original.context.operationId &&
          ancestor.context.decisionSha256 === original.context.decisionSha256,
      ),
      "An earlier release operation awaits read-only completion, reconciliation or explicit recovery",
    );
  }
}

export function completedStagingRecovery(entry, journalSha256, writers) {
  return writers.some((candidate) => {
    if (
      candidate.job.name !== "Read-only release completion" ||
      candidate.job.conclusion !== "success" ||
      !candidate.files["completion.json"]
    )
      return false;
    const completion = JSON.parse(
        Buffer.from(candidate.files["completion.json"].base64, "base64"),
      ),
      prior = completion.operation;
    if (
      completion.status !== "complete" ||
      prior?.operation !== "partial" ||
      !prior.affectedManifestSha256
    )
      return false;
    return (
      String(prior.originalWriter.run) === String(entry.run.id) &&
      String(prior.originalWriter.attempt) === String(entry.attempt) &&
      String(prior.originalWriter.job) === String(entry.job.id) &&
      prior.affectedManifestSha256 ===
        entry.files["frozen-release/release-manifest.json"]?.sha256 &&
      prior.originalDecisionSha256 ===
        entry.files["provider/release-review.json"]?.sha256 &&
      Object.values(prior.originalJournals).includes(journalSha256)
    );
  });
}

export async function admitPriorReleaseEffects(
  operation,
  {
    env = process.env,
    checkpoint,
    gh = (args) => native("gh", args),
    admittedTarget,
    archiveObservation,
  } = {},
) {
  const checkpoints = readSignedHistoryRefs(
    checkpoint ? JSON.parse(checkpoint) : [],
    gh,
  );
  const observed = await collectWriterHistory({ env, checkpoints, gh });
  assert.equal(
    observed.missing.length,
    0,
    "Original writer evidence expired; retain complete signed history and qualification before continuing",
  );
  const settled = {},
    settledGithub = [];
  const authenticated = [];
  const stagingReconciliations = [];
  const settlements = [...(operation.settlements ?? [])];
  for (const entry of observed.writers) {
    const file = entry.files["operation.json"],
      journal = entry.files["effects.jsonl"];
    if (!file || !journal) continue;
    const context = JSON.parse(
      Buffer.from(journal.base64, "base64").toString("utf8").split("\n")[0],
    ).context;
    assert.equal(file.sha256, context.decisionSha256);
    const decision = JSON.parse(Buffer.from(file.base64, "base64"));
    assert.equal(decision.operationId, context.operationId);
    settlements.push(...(decision.settlements ?? []));
  }
  for (const entry of observed.writers) {
    if (
      [
        "admit",
        "Read-only release completion",
        "Read-only archive completion",
        "reconcile",
      ].includes(entry.job.name)
    )
      continue;
    if (
      operation.operation === "partial" &&
      entry.job.name === "stage" &&
      String(entry.run.id) === String(operation.originalWriter?.run) &&
      String(entry.attempt) === String(operation.originalWriter.attempt) &&
      String(entry.job.id) === String(operation.originalWriter.job)
    ) {
      const original = await authenticateStagingRecovery(entry, operation, {
        gh,
      });
      authenticated.push(original);
      stagingReconciliations.push(original.observation);
      continue;
    }
    const journal = entry.files["effects.jsonl"];
    if (!journal) {
      // Historical staging retains its original narrower format. Unknown
      // responses remain inspection/reconciliation cases, never synthetic success.
      for (const [name, file] of Object.entries(entry.files))
        if (name.endsWith(".jsonl")) {
          const records = Buffer.from(file.base64, "base64")
            .toString("utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
          if (
            records.some((record) =>
              ["outcome-unknown", "failed-or-unknown"].includes(record.state),
            )
          ) {
            const completedPartial = completedStagingRecovery(
              entry,
              file.sha256,
              observed.writers,
            );
            const reconciled =
              completedPartial ||
              checkpoints.some((checkpoint) =>
                Object.entries(checkpoint.targetQualification.files).some(
                  ([proofName, proof]) => {
                    if (!proofName.endsWith("-reconciliation.json"))
                      return false;
                    const record = JSON.parse(
                      Buffer.from(proof.base64, "base64"),
                    );
                    return (
                      record.journalSha256 === file.sha256 &&
                      record.publicQualification?.run ===
                        checkpoint.targetQualification.qualified.publication
                          .run &&
                      Object.keys(record.reports ?? {}).length > 0 &&
                      Object.keys(record.reports).length ===
                        Object.keys(
                          checkpoint.targetQualification.qualified.reports,
                        ).filter((value) => value.startsWith("registry-"))
                          .length &&
                      Object.entries(record.reports).every(
                        ([reportName, digest]) =>
                          checkpoint.targetQualification.qualified.reports[
                            reportName
                          ]?.sha256 === digest,
                      )
                    );
                  },
                ),
              );
            assert.ok(
              reconciled,
              "A historical writer needs exact independent public reconciliation retained in a complete signed checkpoint",
            );
          }
        }
      continue;
    }
    const bytes = Buffer.from(journal.base64, "base64");
    const first = JSON.parse(bytes.toString("utf8").split("\n")[0]);
    if (first.schemaVersion !== 2) {
      if (entry.job.conclusion !== "success") {
        const records = bytes
          .toString("utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        assert.ok(
          entry.job.name === "archive" &&
            checkpoints.some(
              (checkpoint) =>
                legacyArchiveSettled(entry, [checkpoint]) &&
                records.every(
                  (record) =>
                    !record.args ||
                    record.args.includes(
                      `v${checkpoint.targetQualification.qualified.version}`,
                    ) ||
                    record.args[0] === "api",
                ),
            ),
          "Legacy failed writer requires independently verified immutable evidence in complete signed history",
        );
      }
      continue;
    }
    const effects = verifyEffectJournal(bytes, first.context);
    if (
      first.context.workflow === ".github/workflows/github-release.yml" &&
      effects.length
    ) {
      const file = entry.files["archive-identity.json"];
      assert.ok(
        file,
        "Original archive release ID is unproven; preserve the original receipt and reconcile its native identity before recovery",
      );
      const identity = JSON.parse(Buffer.from(file.base64, "base64"));
      assert.equal(identity.operationId, first.context.operationId);
      assert.equal(identity.source, first.context.source);
      assert.equal(identity.manifestSha256, first.context.manifestSha256);
      assert.ok(Number.isSafeInteger(identity.releaseId));
      for (const effect of effects) {
        if (effect.operation === "create")
          effect.releaseId = identity.releaseId;
        else assert.equal(effect.releaseId, identity.releaseId);
      }
      if (
        operation.operation === "archive" &&
        operation.manifestSha256 === first.context.manifestSha256
      )
        assert.equal(
          archiveObservation?.archive.id,
          identity.releaseId,
          "Original archive draft was displaced or disappeared",
        );
    }
    for (const [name, expected] of Object.entries({
      repository,
      controller: entry.run.head_sha,
      workflow: entry.run.path,
      run: String(entry.run.id),
      attempt: String(entry.attempt),
      job: entry.job.name,
    }))
      assert.equal(
        first.context[name],
        expected,
        "Journal identity differs from its original native producer",
      );
    for (const effect of effects)
      if (effect.outcome !== "acknowledged") {
        const proofs = [
          archiveObservation,
          ...checkpoints.map(({ targetQualification: target }) => ({
            qualified: target.qualified,
            archive: {
              ...target.archive,
              id: target.archive.releaseId,
              tag_name: `v${target.qualified.version}`,
              draft: false,
            },
            expectedAssets: target.archive.assets,
            latestId: target.archive.latestId,
          })),
        ];
        if (
          proofs.some((proof) =>
            archiveEffectObserved(effect, first.context, proof),
          )
        ) {
          effect.outcome = "acknowledged";
          continue;
        }
        const candidates = settlements.filter(
          (value) =>
            value.journalSha256 === hash(bytes) &&
            value.sequence === effect.sequence,
        );
        const settlement = candidates[0];
        for (const candidate of candidates)
          assert.deepEqual(
            candidate,
            settlement,
            "Conflicting retained effect settlements",
          );
        assert.ok(
          settlement,
          "An unknown prior effect must be reconciled before another request",
        );
        verifyEffectSettlement(settlement, bytes, first.context);
        for (const evidence of settlement.providerEvidence) {
          const proof = observed.writers.find(
            (candidate) =>
              candidate.job.id !== entry.job.id &&
              candidate.job.name === "reconcile" &&
              evidence.url ===
                `https://github.com/${repository}/actions/runs/${candidate.run.id}/job/${candidate.job.id}` &&
              candidate.files["provider-observation.json"]?.sha256 ===
                evidence.sha256,
          );
          assert.ok(
            proof,
            "Settlement observations must survive in authenticated original provider artifacts",
          );
          verifySettlementObservation(
            settlement,
            effect,
            first.context,
            JSON.parse(
              Buffer.from(
                proof.files["provider-observation.json"].base64,
                "base64",
              ),
            ),
            proof,
          );
        }
        effect.outcome =
          settlement.disposition === "applied"
            ? "acknowledged"
            : "settled-not-applied";
      }
    authenticated.push({ entry, bytes, context: first.context, effects });
    for (const effect of effects)
      if (effect.provider === "github" && effect.outcome === "acknowledged")
        settledGithub.push(effect);
    if (first.context.operationId === operation.operationId) {
      assert.equal(first.context.decisionSha256, env.OPERATION_SHA);
      for (const effect of effects)
        if (effect.provider === "npm" && effect.outcome === "acknowledged")
          settled[effect.subject] = effect.target;
    }
  }
  if (["partial", "continue"].includes(operation.operation)) {
    verifyRecoveryAttribution(operation, authenticated);
    if (operation.operation === "partial")
      await admitRecoveryTargets(operation, checkpoints, gh, admittedTarget);
  }
  verifyActiveOperations(
    operation,
    env.OPERATION_SHA,
    observed.writers,
    authenticated,
  );
  return {
    writers: observed.writers.map((entry) => ({
      workflow: entry.run.path,
      run: entry.run.id,
      attempt: entry.attempt,
      job: entry.job.id,
      artifact: entry.artifact,
    })),
    settled,
    settledGithub,
    stagingReconciliations,
    latestStageWriteAt: observed.writers
      .filter((entry) => entry.run.path === ".github/workflows/publish.yml")
      .map((entry) => entry.run.updated_at)
      .sort()
      .at(-1),
  };
}

/** A recovery scope is derived from authenticated original effects, never from matching live defaults alone. */
export function verifyRecoveryAttribution(operation, authenticated) {
  const originals = authenticated.filter(
    ({ entry, bytes, context }) =>
      String(entry.run.id) === String(operation.originalWriter.run) &&
      String(entry.attempt) === String(operation.originalWriter.attempt) &&
      String(entry.job.id) === String(operation.originalWriter.job) &&
      hash(bytes) === operation.originalJournalSha256 &&
      context.operationId === operation.originalOperationId &&
      context.decisionSha256 === operation.originalDecisionSha256,
  );
  assert.equal(
    originals.length,
    1,
    "Missing exact original writer and journal",
  );
  const original = originals[0];
  const decision = original.entry.files["operation.json"];
  assert.equal(
    decision?.sha256,
    operation.originalDecisionSha256,
    "Original decision bytes are required",
  );
  const approved = JSON.parse(Buffer.from(decision.base64, "base64"));
  assert.equal(approved.operationId, operation.originalOperationId);
  assert.equal(
    operation.label,
    original.entry.job.name === "stage" ? approved.channel : approved.label,
    "Recovery must preserve the original npm label",
  );
  assert.equal(
    approved.manifestSha256,
    operation.affectedManifestSha256 ?? operation.manifestSha256,
  );
  const completed = authenticated.some(
    ({ context, effects }) =>
      (context.operationId === approved.operationId ||
        context.manifestSha256 ===
          (operation.affectedManifestSha256 ?? operation.manifestSha256)) &&
      effects.some(
        (effect) =>
          effect.provider === "github" &&
          effect.outcome === "acknowledged" &&
          (effect.target?.prerelease === false ||
            effect.target?.includes?.("--prerelease=false")),
      ),
  );
  if (operation.operation === "partial") {
    assert.ok(
      !completed &&
        !(
          operation.priorGithubLatest === approved.releaseId &&
          operation.priorPrerelease === false
        ),
      "Completed stable releases require a whole-family restore",
    );
    for (const name of operation.scope.npm) {
      const matches = original.effects.filter(
        (effect) =>
          effect.provider === "npm" &&
          effect.subject === name &&
          effect.outcome === "acknowledged",
      );
      assert.equal(
        matches.length,
        1,
        "Partial scope is not attributable to the interrupted operation",
      );
      assert.equal(operation.priors[name], matches[0].target);
      assert.equal(
        operation.targets[name],
        matches[0].prior,
        "Partial recovery must restore the originally observed prior",
      );
    }
  } else {
    assert.equal(original.entry.job.name, "npm");
    const ancestors = recoveryLineage(operation, authenticated),
      allEffects = ancestors.flatMap((parent) => parent.effects);
    assert.ok(
      allEffects.every(
        (effect) =>
          effect.provider === "npm" && effect.outcome === "acknowledged",
      ),
      "Outstanding npm effects must be reconciled before continuation",
    );
    for (const name of Object.keys(operation.targets)) {
      assert.equal(approved.targets[name], operation.targets[name]);
      assert.equal(
        approved.targetIntegrities[name],
        operation.targetIntegrities[name],
      );
      const priorEffects = allEffects.filter(
        (effect) => effect.provider === "npm" && effect.subject === name,
      );
      if (operation.scope.npm.includes(name)) {
        assert.equal(
          priorEffects.length,
          0,
          "Continuation cannot repeat a requested effect",
        );
        assert.ok(!approved.noops?.includes(name));
        assert.ok(approved.scope.npm.includes(name));
        assert.equal(operation.priors[name], approved.priors[name]);
        continue;
      }
      assert.ok(
        approved.noops?.includes(name) ||
          allEffects.some(
            (effect) =>
              effect.provider === "npm" &&
              effect.subject === name &&
              effect.outcome === "acknowledged" &&
              effect.target === operation.targets[name],
          ),
      );
    }
    assert.ok(
      !completed,
      "The original GitHub effect already succeeded; run verification only",
    );
  }
}

async function admitRecoveryTargets(
  operation,
  checkpoints,
  gh,
  admittedTarget,
) {
  const admitted = new Map();
  for (const name of operation.scope.npm) {
    if (operation.targets[name] === null) continue;
    const expected = operation.targetQualifications[name];
    if (
      admittedTarget?.qualificationSha256 === expected &&
      admittedTarget.qualified.version === operation.targets[name]
    ) {
      assert.equal(
        admittedTarget.qualified.archives.find(
          (entry) => entry.package === name,
        ).integrity,
        operation.targetIntegrities[name],
      );
      continue;
    }
    const target = checkpoints.find(
      (checkpoint) =>
        checkpoint.targetQualification.qualified.version ===
          operation.targets[name] &&
        checkpoint.targetQualification.qualificationSha256 === expected,
    );
    assert.ok(
      target,
      "Recovery target lacks signed original public qualification",
    );
    const { qualified, archive } = target.targetQualification;
    assert.equal(
      qualified.archives.find((entry) => entry.package === name).integrity,
      operation.targetIntegrities[name],
    );
    if (admitted.has(expected)) continue;
    const scratch = mkdtempSync(
      join(tmpdir(), "markdown-quality-recovery-target-"),
    );
    try {
      const api = (path) =>
        JSON.parse(gh(["api", `repos/${repository}/${path}`]));
      const ref = api(`git/ref/tags/v${qualified.version}`);
      assert.equal(ref.object.sha, archive.tagSha);
      verifyReleaseTag(ref, api(`git/tags/${ref.object.sha}`), {
        version: qualified.version,
        source: { head: qualified.source },
      });
      const release = api(`releases/${archive.releaseId}`);
      const identity = (assets) =>
        assets
          .map(({ id, name, size, digest }) => ({ id, name, size, digest }))
          .sort((a, b) => a.id - b.id);
      assert.deepEqual(identity(release.assets), identity(archive.assets));
      const acquired = acquireIndexedRelease(release, scratch, gh, {
        retainedQualification: qualified,
      });
      assert.deepEqual(acquired.qualified, qualified);
      refreshReleaseSecurity(qualified, acquired.logical, { gh });
      await verifyPublicRegistryArchives(qualified);
      admitted.set(expected, true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}
