// SPDX-License-Identifier: AGPL-3.0-only
/** Resolve the immutable archive from its actual staging attempt, including legacy names. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { publicationRepository } from "./publication-context.js";
import { publicationUploadAcknowledgment } from "./publication-upload.js";
import { budgets } from "./qualification-budgets.js";
import { sameWriterRun } from "./release-writer-inventory.js";
import {
  authenticateArtifact,
  assertRetainedArtifactIdentity,
  restoreRetainedFiles,
  retainedObservationIdentity,
} from "./release-retained-artifacts.js";
import {
  authenticatePublicationAttempts,
  publicationWorkflow,
  readPublicationAttempts,
  verifyNoPublicationEffects,
} from "./publication-attempts.js";

export const publicationArtifactName = (attempt) => {
  assert.match(String(attempt), /^[1-9]\d{0,15}$/u);
  return `publication-source-and-manifest-${attempt}`;
};

const publicationReader = () =>
  createRepositoryReader({
    repository: publicationRepository,
    token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
    budgetMs: budgets.collection,
  });

const unavailable = (message) =>
  Object.assign(new Error(message), {
    code: "PUBLICATION_ARTIFACT_MISSING",
  });

function originalPublicationJob(run, attempt, inventory) {
  assert.equal(inventory.total_count, inventory.jobs.length);
  const writers = inventory.jobs.filter(({ name }) =>
    ["stage", "publish"].includes(name),
  );
  assert.ok(writers.length <= 1, "Ambiguous original publication writer");
  const [job] = writers;
  if (job) {
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, Number(attempt));
    assert.equal(job.head_sha, run.head_sha);
    assert.equal(job.status, "completed");
  }
  return job;
}

export async function downloadPublicationArtifact({
  run,
  attempt,
  destination,
  read = publicationReader(),
  download = downloadEvidence,
  prewrite,
  inventory,
}) {
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0);
  assert.equal(run.repository?.full_name, publicationRepository);
  assert.equal(run.head_repository?.full_name, publicationRepository);
  assert.equal(run.path, publicationWorkflow);
  assert.equal(run.head_branch, "main");
  assert.equal(run.status, "completed");
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.ok(Number(attempt) <= run.run_attempt);
  const name = publicationArtifactName(attempt);
  const jobs =
    inventory ??
    (await read(
      `/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`,
    ));
  const writer = originalPublicationJob(run, attempt, jobs);
  const readArtifact = (artifact) =>
    download({
      id: artifact.id,
      destination,
      read,
      runId: run.id,
      repositoryId: run.repository.id,
      headRepositoryId: run.head_repository.id,
      headSha: run.head_sha,
      maximum: 64 * 1024 * 1024,
      expectedArtifact: artifact,
    });
  if (writer?.name === "stage") {
    assert.equal(run.event, "workflow_dispatch");
    const acknowledgment = await publicationUploadAcknowledgment(
      writer,
      name,
      read,
    );
    if (acknowledgment) {
      try {
        const artifact = await readArtifact(acknowledgment);
        return { ...artifact, admissionOnly: false };
      } catch (error) {
        error.originalArtifact = acknowledgment;
        throw error;
      }
    }
  }

  // Only historical publish jobs used name-based artifact discovery. A modern
  // upload with an unknown acknowledgment cannot fall back to a namesake.
  if (writer?.name !== "publish" && !prewrite)
    throw unavailable(
      `Missing original publication artifact for run ${run.id} attempt ${attempt}`,
    );
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
  const versioned = writer?.name === "publish" ? matching(name) : [];
  let matches = versioned;
  if (!matches.length && writer?.name === "publish" && Number(attempt) === 1)
    matches = matching("publication-source-and-manifest");
  let admissionOnly = false;
  if (matches.length === 0 && prewrite) {
    const proof = typeof prewrite === "function" ? prewrite() : prewrite;
    verifyNoPublicationEffects(proof, {
      run: run.id,
      attempt,
      source: run.head_sha,
    });
    matches = matching(`publication-admission-${attempt}`);
    admissionOnly = matches.length > 0;
  }
  if (matches.length === 0)
    throw unavailable(
      `Missing original publication artifact for run ${run.id} attempt ${attempt}`,
    );
  assert.equal(
    matches.length,
    1,
    "Missing or ambiguous original publication artifact",
  );
  await readArtifact(matches[0]);
  return { ...matches[0], admissionOnly };
}

/** Acquire one exact attempted publication, with a signed original for expiry. */
export async function acquirePublicationArtifact({
  runId,
  attempt,
  destination,
  read = publicationReader(),
  download = downloadEvidence,
  checkpoints = () => [],
  prewrite,
  observed,
}) {
  assert.match(String(runId), /^[1-9]\d{0,15}$/u);
  const name = publicationArtifactName(attempt);
  const path = `/actions/runs/${runId}/attempts/${attempt}`;
  const readOriginal = async (endpoint) => {
    try {
      return await read(endpoint);
    } catch (error) {
      if (error.httpStatus !== 404) throw error;
      return undefined;
    }
  };
  const run = observed?.run ?? (await readOriginal(path));
  const inventory =
    observed?.inventory ?? (await readOriginal(`${path}/jobs?per_page=100`));
  if (run) {
    assert.equal(run.id, Number(runId));
    assert.equal(run.run_attempt, Number(attempt));
  }
  if (run && inventory) {
    try {
      const artifact = await downloadPublicationArtifact({
        run,
        attempt,
        destination,
        read,
        download,
        inventory,
        prewrite,
      });
      return { artifact, run, inventory };
    } catch (error) {
      if (
        error.httpStatus !== 404 &&
        error.httpStatus !== 410 &&
        !["PUBLICATION_ARTIFACT_MISSING", "EVIDENCE_ARTIFACT_EXPIRED"].includes(
          error.code,
        )
      )
        throw error;
      return restoreOriginal(error);
    }
  }
  return restoreOriginal(
    unavailable(
      `Original publication run ${runId} attempt ${attempt} is unavailable`,
    ),
  );

  async function restoreOriginal(cause) {
    const signed = checkpoints();
    const candidates = signed
      .flatMap(({ writers }) => writers)
      .filter(
        (entry) =>
          entry.run.id === Number(runId) &&
          entry.attempt === Number(attempt) &&
          entry.run.path === publicationWorkflow &&
          entry.job.name === "stage" &&
          entry.artifact.name === name,
      );
    if (!candidates.length) throw cause;
    const [entry] = candidates;
    const original = retainedObservationIdentity(entry);
    for (const candidate of candidates)
      assert.deepEqual(
        retainedObservationIdentity(candidate),
        original,
        "Conflicting signed publication artifacts",
      );
    if (run) sameWriterRun(run, entry.run);
    if (run) assert.equal(run.conclusion, entry.run.conclusion);
    if (cause.originalArtifact) {
      for (const key of ["id", "name", "digest"])
        assert.equal(
          entry.artifact[key],
          cause.originalArtifact[key],
          "Signed evidence differs from the native upload acknowledgment",
        );
    }
    if (inventory) {
      const job = originalPublicationJob(entry.run, attempt, inventory);
      assert.ok(
        job,
        "Original staging job disappeared from the live inventory",
      );
      assert.deepEqual(
        retainedObservationIdentity({ ...entry, job, inventory }),
        original,
        "Live and signed staging executions disagree",
      );
    }
    const verified = await authenticateArtifact(
      entry.artifact.id,
      {
        name,
        run: runId,
        attempt,
        controller: entry.run.head_sha,
        workflow: publicationWorkflow,
        job: "stage",
        allowFailedJob: true,
      },
      { api: (endpoint) => read(`/${endpoint}`), checkpoints: signed },
    );
    assertRetainedArtifactIdentity(verified.artifact, entry);
    sameWriterRun(verified.run, entry.run);
    assert.equal(verified.run.conclusion, entry.run.conclusion);
    const verifiedJob = originalPublicationJob(
      entry.run,
      attempt,
      verified.jobs,
    );
    assert.ok(verifiedJob);
    assert.deepEqual(
      retainedObservationIdentity({
        ...entry,
        job: verifiedJob,
        inventory: verified.jobs,
      }),
      original,
      "Live and signed staging executions disagree",
    );
    const attempts = new Map([
      [entry.attempt, { run: entry.run, jobs: entry.inventory }],
    ]);
    for (const { run: observed, inventory: jobs } of signed.flatMap(
      (checkpoint) => checkpoint.writerAttempts ?? [],
    )) {
      if (observed.id !== entry.run.id || observed.run_attempt > entry.attempt)
        continue;
      const prior = attempts.get(observed.run_attempt);
      if (prior) {
        sameWriterRun(observed, prior.run);
        assert.equal(observed.conclusion, prior.run.conclusion);
        assert.deepEqual(
          jobs,
          prior.jobs,
          "Conflicting signed publication attempt inventories",
        );
      } else attempts.set(observed.run_attempt, { run: observed, jobs });
    }
    const publication = authenticatePublicationAttempts(
      entry.run,
      [...attempts.values()].sort(
        (a, b) => a.run.run_attempt - b.run.run_attempt,
      ),
    );
    restoreRetainedFiles(destination, entry);
    return {
      artifact: verified.artifact,
      run: entry.run,
      inventory: entry.inventory,
      publication,
    };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length === 6 ||
      (process.argv.length === 7 &&
        process.argv[6] === "--allow-prewrite-admission"),
    true,
    "Usage: publication-artifact.js RUN ATTEMPT DIRECTORY PROVIDER_DIRECTORY [--allow-prewrite-admission]",
  );
  const [runId, attempt, destination, provider] = process.argv.slice(2);
  const { readSignedHistoryRefs } = await import("./release-history.js");
  let proof;
  const original = await acquirePublicationArtifact({
    runId,
    attempt,
    destination: resolve(destination),
    checkpoints: () =>
      readSignedHistoryRefs(JSON.parse(process.env.HISTORY_CHECKPOINT || "[]")),
    prewrite: process.argv[6]
      ? () => (proof = readPublicationAttempts(runId))
      : undefined,
  }).catch((error) => {
    const artifact = error.originalArtifact
      ? `, artifact ${error.originalArtifact.id}`
      : "";
    throw new Error(
      `Publication evidence unconfirmed for run ${runId} attempt ${attempt}${artifact}: ${error.message}`,
      { cause: error },
    );
  });
  mkdirSync(provider, { recursive: true });
  for (const [name, value] of Object.entries({
    "previous-run.json": original.run,
    "previous-jobs.json": original.inventory,
  }))
    writeFileSync(join(provider, name), JSON.stringify(value) + "\n", {
      flag: "wx",
    });
  if (original.publication)
    writeFileSync(
      join(provider, "previous-publication-provider.json"),
      JSON.stringify(original.publication) + "\n",
      { flag: "wx" },
    );
  if (original.artifact.admissionOnly)
    writeFileSync(
      join(resolve(destination), "prewrite-provider.json"),
      JSON.stringify(proof, null, 2) + "\n",
      { flag: "wx" },
    );
}
