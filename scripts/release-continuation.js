// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only admission of a public tuple after the owner's staged approvals. */
import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import {
  assertMatrixJobLabel,
  legacyWindowsRunner,
  ubuntuRunner,
  ubuntuRunnerPattern,
  windowsRunner,
  windowsRunnerPattern,
} from "./runner-policy.js";
import {
  hash,
  readJson,
  repository,
  verifyProvider,
} from "./release-assets.js";
import {
  releaseQualificationJobNames,
  releaseQualificationWorkflow,
  registryWorkflow,
} from "./release-qualification.js";
import {
  validatePublicationOrigins,
  stagingSteps,
} from "./publication-origins.js";
import { verifyArchiveBytes } from "./release-bytes.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { stagingStepNames } from "./publication-steps.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";
import { readPackageTags } from "./release-labels.js";
import { acquirePublicationArtifact } from "./publication-artifact.js";
import { readSignedHistoryRefs } from "./release-history.js";
import { verifyNativeOriginArtifact } from "./release-staging-evidence.js";
import {
  assertPublicationRequestsCompleted,
  authenticatePublicationAttempts,
  readPublicationAttempts,
  publicationWorkflow,
} from "./publication-attempts.js";

export function requireManualControl(env, workflow) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(
    env.GITHUB_WORKFLOW_REF,
    `${repository}/${workflow}@refs/heads/main`,
  );
  assert.match(env.GITHUB_SHA, /^[a-f0-9]{40}$/u);
}

export function providerFor(run, jobs, workflow, names, attempts) {
  const expected = {
    run: String(run.id),
    attempt: String(run.run_attempt),
    source: run.head_sha,
    workflow,
    event: "workflow_dispatch",
    jobs: names,
  };
  if (workflow === publicationWorkflow && attempts) {
    const observed = authenticatePublicationAttempts(run, attempts);
    assert.equal(run.head_branch, "main");
    assert.equal(run.event, expected.event);
    assert.deepEqual(
      jobs,
      observed.jobs,
      "Staging jobs differ from authenticated attempt history",
    );
    assertPublicationRequestsCompleted(run, jobs);
  } else verifyProvider({ run, jobs }, expected);
  assert.deepEqual(
    jobs.jobs.map(({ name }) => name).sort(),
    [...names].sort(),
    "Unexpected or omitted release jobs",
  );
  for (const job of jobs.jobs) assert.equal(job.head_sha, run.head_sha);
  if (workflow === publicationWorkflow)
    for (const job of jobs.jobs) assertMatrixJobLabel(job);
  return expected;
}

/** A green staging run is only evidence of requests; public approvals are checked separately. */
export function verifyStagingContinuation({
  release,
  manifestSha,
  origins,
  originsSha,
  candidate,
  stage,
}) {
  assert.equal(hash(Buffer.from(origins.bytes)), originsSha);
  const map = JSON.parse(origins.bytes);
  assert.equal(release.source.clean, true);
  assert.equal(release.source.head, candidate.run.head_sha);
  const qualification = providerFor(
    candidate.run,
    candidate.jobs,
    releaseQualificationWorkflow,
    releaseQualificationJobNames(
      release.qualificationMatrix,
      release.runtimePolicy,
    ),
  );
  assert.equal(stage.runnerPolicy?.source, stage.run.head_sha);
  assert.match(stage.runnerPolicy.ubuntu, ubuntuRunnerPattern);
  assert.match(stage.runnerPolicy.windows, windowsRunnerPattern);
  // The original windows-2025 policy used windows-latest for this staging job.
  const retainedWindows =
    stage.runnerPolicy.windows === legacyWindowsRunner
      ? "windows-latest"
      : stage.runnerPolicy.windows;
  const staging = providerFor(
    stage.run,
    stage.jobs,
    ".github/workflows/publish.yml",
    [
      "admit",
      map.schemaVersion === 2 ? "decision" : "review",
      `retained (${retainedWindows})`,
      `retained (${stage.runnerPolicy.ubuntu})`,
      "stage",
    ],
    stage.attempts,
  );
  validatePublicationOrigins(
    map,
    {
      version: release.version,
      artifactSource: release.source.head,
      manifestSha,
      candidateRun: qualification.run,
      controlSource: staging.source,
      run: staging.run,
      attempt: staging.attempt,
      recovery: map.recovery,
      ...(map.schemaVersion === 2 ? { decision: map.decision } : {}),
    },
    release.archives,
  );
  assert.ok(
    map.recovery?.originsSha256,
    "Finalization requires the deliberate core continuation",
  );
  assert.deepEqual(
    map.records.slice(0, 2).map(({ state }) => state),
    ["retained", "retained"],
  );
  const effect = stage.jobs.jobs.find(({ name }) => name === "stage");
  const core = effect.steps.filter(
    ({ name }) => name === stagingStepNames(effect)[2],
  );
  assert.equal(core.length, 1);
  assert.equal(
    core[0].conclusion,
    map.records[2].state === "retained" ? "skipped" : "success",
    "Core stage must succeed once or be retained after public reconciliation",
  );
  return {
    schemaVersion: 2,
    qualification,
    staging,
    manifestSha256: manifestSha,
    originsSha256: originsSha,
    origins: map,
  };
}

export function readProvider(
  runId,
  attempt,
  gh = (args) => native("gh", args),
  retained,
) {
  assert.match(String(runId), /^[1-9]\d{0,15}$/u);
  if (attempt) assert.match(String(attempt), /^[1-9]\d{0,15}$/u);
  if (retained) {
    assert.equal(String(retained.run.id), String(runId));
    assert.equal(String(retained.run.run_attempt), String(attempt));
    return publicationRunnerPolicy(
      authenticatePublicationAttempts(retained.run, retained.attempts),
      gh,
    );
  }
  const path = `repos/${repository}/actions/runs/${runId}${attempt ? `/attempts/${attempt}` : ""}`;
  const run = JSON.parse(gh(["api", path]));
  assert.equal(String(run.id), String(runId));
  if (run.path === publicationWorkflow) {
    return publicationRunnerPolicy(
      readPublicationAttempts(runId, attempt, gh),
      gh,
    );
  }
  const jobs = JSON.parse(
    gh([
      "api",
      `repos/${repository}/actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`,
    ]),
  );
  return { run, jobs };
}

function publicationRunnerPolicy(publication, gh) {
  const source = publication.run.head_sha;
  assert.match(source, /^[a-f0-9]{40}$/u);
  const path = "assets/node-support.json";
  const file = JSON.parse(
    gh(["api", `repos/${repository}/contents/${path}?ref=${source}`]),
  );
  assert.equal(file.path, path);
  assert.equal(file.encoding, "base64");
  const policy = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8"),
  );
  return {
    ...publication,
    runnerPolicy: {
      source,
      ubuntu: ubuntuRunner(policy),
      windows: windowsRunner(policy),
    },
  };
}

/** Each retained native writer is authenticated once before public qualification. */
export async function verifyRetainedNativeOrigins({
  release,
  context,
  acquire,
}) {
  const originals = new Map();
  for (const origin of context.origins.records.slice(0, 2)) {
    assert.equal(origin.state, "retained");
    originals.set(`${origin.run}/${origin.attempt}`, origin);
  }
  for (const origin of originals.values()) {
    const { original, file } = await acquire(origin);
    assert.equal(original.run.head_sha, origin.source);
    verifyNativeOriginArtifact({
      release,
      manifestSha: context.manifestSha256,
      continued: context.origins,
      original,
      file,
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: release-continuation.js ARCHIVES PREVIOUS_STAGE PROVIDER_DIRECTORY",
  );
  requireManualControl(process.env, registryWorkflow);
  const [directory, previous, providerDirectory] = process.argv
    .slice(2)
    .map((path) => resolve(path));
  const bytes = readFileSync(join(directory, "release-manifest.json"));
  assert.match(process.env.MANIFEST_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(hash(bytes), process.env.MANIFEST_SHA);
  const release = JSON.parse(bytes);
  assert.deepEqual(
    readFileSync(join(previous, "frozen-release/release-manifest.json")),
    bytes,
  );
  for (const archive of release.archives)
    verifyArchiveBytes(
      readFileSync(join(directory, archive.filename)),
      archive,
    );
  const candidate = readProvider(process.env.CANDIDATE_RUN);
  const retainedPath = join(
    providerDirectory,
    "previous-publication-provider.json",
  );
  const stage = readProvider(
    process.env.STAGING_RUN,
    process.env.STAGING_ATTEMPT,
    undefined,
    existsSync(retainedPath) ? readJson(retainedPath) : undefined,
  );
  const originBytes = readFileSync(
    join(previous, "frozen-release/publication-origins.json"),
  );
  const context = verifyStagingContinuation({
    release,
    manifestSha: hash(bytes),
    origins: { bytes: originBytes },
    originsSha: process.env.ORIGINS_SHA,
    candidate,
    stage,
  });
  const scratch = mkdtempSync(
    join(tmpdir(), "markdown-quality-retained-stages-"),
  );
  try {
    let signed;
    await verifyRetainedNativeOrigins({
      release,
      context,
      acquire: async (origin) => {
        const destination = join(scratch, `${origin.run}-${origin.attempt}`);
        const original = await acquirePublicationArtifact({
          runId: origin.run,
          attempt: origin.attempt,
          destination,
          checkpoints: () =>
            (signed ??= readSignedHistoryRefs(
              JSON.parse(process.env.HISTORY_CHECKPOINT || "[]"),
            )),
        });
        return {
          original,
          file: (name) => readFileSync(join(destination, name)),
        };
      },
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const api = (path) =>
    JSON.parse(native("gh", ["api", `repos/${repository}/${path}`]));
  assert.equal(
    api("git/ref/heads/main").object.sha,
    process.env.GITHUB_SHA,
    "Control branch advanced after dispatch",
  );
  const reference = api(`git/ref/tags/v${release.version}`);
  assert.equal(reference.object.type, "tag");
  const annotation = api(`git/tags/${reference.object.sha}`);
  verifyReleaseTag(reference, annotation, release);
  if (context.origins.decision) {
    const reviewBytes = readFileSync(
      join(previous, "provider/release-review.json"),
    );
    const review = verifyReleaseAcceptance(
      reviewBytes,
      context.origins.decision.reviewSha256,
      release,
      hash(bytes),
      "review",
    );
    assert.equal(review.channel ?? "pilot", context.origins.decision.channel);
    const deadline = performance.now() + 300000;
    for (const archive of release.archives) {
      const tags = readPackageTags(archive.package, { deadline });
      assert.equal(
        tags[context.origins.decision.channel],
        release.version,
        "Owner approval is not publicly visible",
      );
      assert.equal(
        tags.latest ?? null,
        context.origins.decision.channel === "latest"
          ? release.version
          : review.guards.defaults[archive.package],
        "Unexpected npm default after staging",
      );
    }
    writeFileSync(join(directory, "release-review.json"), reviewBytes, {
      flag: "wx",
    });
  }
  for (const [name, value] of Object.entries({
    "continuation.json": context,
    "candidate-provider.json": candidate,
    "staging-provider.json": stage,
    "signed-tag.json": { reference, annotation },
  }))
    writeFileSync(
      join(directory, name),
      JSON.stringify(value, null, 2) + "\n",
      { flag: "wx" },
    );
  writeFileSync(join(directory, "publication-origins.json"), originBytes, {
    flag: "wx",
  });
  for (const [name, value] of Object.entries({
    runtimes: JSON.stringify(release.qualificationMatrix),
    reference: release.runtimePolicy.reference,
    "consumer-npm": release.runtimePolicy.consumerNpm,
    source: release.source.head,
  }))
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
