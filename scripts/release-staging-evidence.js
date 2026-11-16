// SPDX-License-Identifier: AGPL-3.0-only
/** Bind an unchanged request journal to the independently verified public tuple. */
import assert from "node:assert/strict";
import { hash } from "./release-bytes.js";
import { stagingStepNames } from "./publication-steps.js";
import { publicationUploadStep } from "./publication-upload.js";

/** Validate the original request independently of later public reconciliation. */
export function readStagingJournal(journal, archive, origin, qualified) {
  const records = journal
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(
    records.length === 1 || records.length === 2,
    "Invalid staging journal length",
  );
  assert.equal(records[0].state, "attempted");
  if (records.length === 2)
    assert.ok(
      ["outcome-unknown", "staged-awaiting-owner"].includes(records[1].state),
    );
  for (const record of records) {
    for (const key of ["package", "version", "sha256", "integrity"])
      assert.equal(
        record[key],
        archive[key],
        `Staging journal ${key} mismatch`,
      );
    assert.equal(record.tag, qualified.channel ?? "pilot");
    if (qualified.decision) {
      assert.equal(record.decision.reviewSha256, origin.reviewSha256);
      assert.equal(record.decision.operationId, qualified.decision.operationId);
      assert.equal(record.decision.channel, qualified.channel);
    }
    for (const key of ["source", "run", "attempt"])
      assert.equal(String(record.origin[key]), String(origin[key]));
    if (record.state === "staged-awaiting-owner")
      assert.ok(
        typeof record.stageId === "string" &&
          record.stageId.length > 0 &&
          record.stageId.length <= 256 &&
          !/[\r\n]/u.test(record.stageId),
      );
  }
  return records;
}

/** A failed native-only stage may carry completed effects solely after the upload boundary. */
export function verifyFailedNativeStage({
  run,
  jobs,
  release,
  origins,
  journalFor,
}) {
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "failure");
  assert.equal(jobs.total_count, jobs.jobs.length);
  assert.equal(
    origins.recovery,
    null,
    "Expected the original native staging dispatch",
  );
  const roles = [
    "admit",
    origins.schemaVersion === 2 ? "decision" : "review",
    "retained",
    "stage",
  ];
  assert.deepEqual(jobs.jobs.map(({ name }) => name).sort(), roles.sort());
  for (const job of jobs.jobs) {
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, run.run_attempt);
    assert.equal(job.head_sha, run.head_sha);
    assert.equal(job.status, "completed");
    if (job.name === "retained") {
      assert.equal(job.conclusion, "skipped");
      assert.ok(
        !job.steps?.length,
        "Skipped retained job cannot contain effects",
      );
    } else if (job.name !== "stage") assert.equal(job.conclusion, "success");
  }
  const stage = jobs.jobs.find(({ name }) => name === "stage");
  assert.equal(stage.conclusion, "failure");
  const upload = publicationUploadStep(stage);
  assert.ok(upload, "Original staging evidence upload is missing");
  assert.equal(
    upload.conclusion,
    "failure",
    "Stage failed for a reason other than evidence upload",
  );
  const failedAfterRequests = stage.steps.indexOf(upload);
  const steps = stagingStepNames(stage).map((name, index) => {
    const matches = stage.steps.filter((step) => step.name === name);
    assert.equal(matches.length, 1, "Incomplete native request steps");
    assert.equal(matches[0].conclusion, index < 2 ? "success" : "skipped");
    assert.ok(stage.steps.indexOf(matches[0]) < failedAfterRequests);
    return matches[0];
  });
  assert.ok(stage.steps.indexOf(steps[0]) < stage.steps.indexOf(steps[1]));
  for (const step of stage.steps) {
    assert.equal(step.status, "completed");
    assert.ok(
      step === upload || ["success", "skipped"].includes(step.conclusion),
    );
  }
  assert.equal(origins.artifactSource, release.source.head);
  assert.equal(origins.version, release.version);
  assert.equal(origins.controlSource, run.head_sha);
  assert.equal(String(origins.run), String(run.id));
  assert.equal(String(origins.attempt), String(run.run_attempt));
  const ids = new Set();
  for (const archive of release.archives.slice(0, 2)) {
    const origin = origins.records.find(
      ({ package: name }) => name === archive.package,
    );
    assert.equal(origin?.state, "planned");
    assert.equal(origin.source, run.head_sha);
    assert.equal(String(origin.run), String(run.id));
    assert.equal(String(origin.attempt), String(run.run_attempt));
    if (origins.decision)
      assert.equal(origin.reviewSha256, origins.decision.reviewSha256);
    const journal = journalFor?.(archive.name);
    assert.ok(
      journal?.at(-1) === 10,
      `Missing complete original native receipt for ${archive.name}`,
    );
    const records = readStagingJournal(journal, archive, origin, {
      decision: origins.decision,
      channel: origins.decision?.channel,
    });
    assert.equal(
      records[1]?.state,
      "staged-awaiting-owner",
      "Native staging request is unresolved",
    );
    assert.ok(
      !ids.has(records[1].stageId),
      "Duplicate native staging receipt ID",
    );
    ids.add(records[1].stageId);
  }
}

/** Revalidate failed original native evidence at the downstream consumer. */
export function verifyNativeOriginArtifact({
  release,
  manifestSha,
  continued,
  original,
  file,
}) {
  const { run, inventory: jobs } = original;
  if (
    run.conclusion !== "failure" ||
    !jobs.jobs.some(({ name }) => name === "stage")
  )
    return;
  const origins = JSON.parse(file("frozen-release/publication-origins.json"));
  if (origins.recovery !== null) return;
  assert.equal(hash(file("frozen-release/release-manifest.json")), manifestSha);
  assert.equal(origins.manifestSha, manifestSha);
  assert.equal(String(origins.candidateRun), String(continued.candidateRun));
  verifyFailedNativeStage({
    run,
    jobs,
    release,
    origins,
    journalFor: (name) => file(`staging-journal/${name}.jsonl`),
  });
  for (const origin of origins.records.slice(0, 2))
    assert.deepEqual(
      continued.records.find(({ package: name }) => name === origin.package),
      { ...origin, state: "retained" },
      "Continuation replaced an original native origin",
    );
}

export function bindStagingReconciliation(journal, archive, origin, qualified) {
  const records = readStagingJournal(journal, archive, origin, qualified);
  // Callers first verify the complete public reports and their successful native
  // provider jobs. This binding retains that proof without rewriting lost-response
  // history or implementing another signature verifier.
  const reports = Object.fromEntries(
    Object.entries(qualified.reports)
      .filter(([, report]) => report.qualification === "public registry")
      .map(([name, report]) => [name, report.sha256]),
  );
  assert.ok(
    Object.keys(reports).length > 0,
    "Public reconciliation evidence is required",
  );
  return {
    schemaVersion: 1,
    package: archive.package,
    version: archive.version,
    sha256: archive.sha256,
    integrity: archive.integrity,
    origin: {
      source: origin.source,
      run: String(origin.run),
      attempt: String(origin.attempt),
    },
    journalSha256: hash(journal),
    requestState: records.at(-1).state,
    publicQualification: qualified.publication,
    reports,
  };
}
