// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const publicationSteps = [
  "Publish Windows package under pilot and verify integrity",
  "Publish Linux package under pilot and verify integrity",
  "Publish coherent core under pilot and verify integrity",
];
const repository = "Hadden-Industries/markdown-quality";
const keys = (value, expected) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
};
const oid = (value) => assert.match(value, /^[a-f0-9]{40}$/u);
const id = (value) => assert.match(String(value), /^[1-9]\d{0,15}$/u);
export const invocation = ({ run, attempt }) =>
  `https://github.com/${repository}/actions/runs/${run}/attempts/${attempt}`;

export function validatePublicationOrigins(map, expected, archives) {
  keys(map, [
    "schemaVersion",
    "version",
    "artifactSource",
    "manifestSha",
    "candidateRun",
    "controlSource",
    "run",
    "attempt",
    "recovery",
    "records",
  ]);
  assert.equal(map.schemaVersion, 1);
  for (const name of [
    "version",
    "artifactSource",
    "manifestSha",
    "candidateRun",
    "controlSource",
    "run",
    "attempt",
  ])
    assert.equal(
      String(map[name]),
      String(expected[name]),
      `Publication map ${name} mismatch`,
    );
  oid(map.artifactSource);
  oid(map.controlSource);
  assert.match(map.manifestSha, /^[a-f0-9]{64}$/u);
  for (const name of ["candidateRun", "run", "attempt"]) id(map[name]);
  assert.deepEqual(map.recovery, expected.recovery);
  if (map.recovery !== null) {
    keys(map.recovery, ["run", "attempt", "originsSha256"]);
    id(map.recovery.run);
    id(map.recovery.attempt);
    assert.notEqual(String(map.recovery.run), String(map.run));
    assert.match(map.recovery.originsSha256, /^(?:|[a-f0-9]{64})$/u);
  }
  assert.ok(Array.isArray(map.records));
  assert.equal(map.records.length, archives.length);
  assert.deepEqual(
    map.records.map((record) => record.package),
    archives.map((archive) => archive.package),
  );
  for (const record of map.records) {
    keys(record, ["package", "source", "run", "attempt", "state"]);
    oid(record.source);
    id(record.run);
    id(record.attempt);
    assert.ok(["planned", "retained"].includes(record.state));
    if (record.state === "planned") {
      assert.equal(record.source, map.controlSource);
      assert.equal(String(record.run), String(map.run));
      assert.equal(String(record.attempt), String(map.attempt));
    } else {
      assert.ok(
        map.recovery,
        "Ordinary publication cannot admit mixed origins",
      );
      assert.notEqual(String(record.run), String(map.run));
    }
  }
  return map;
}

export function planPublicationOrigins({
  release,
  manifestSha,
  candidateRun,
  context,
  previous,
}) {
  const recovery = context.recoveryRun
    ? {
        run: String(context.recoveryRun),
        attempt: String(context.recoveryAttempt),
        originsSha256: context.recoveryOriginsSha ?? "",
      }
    : null;
  const expected = {
    version: release.version,
    artifactSource: release.source.head,
    manifestSha,
    candidateRun: String(candidateRun),
    controlSource: context.head,
    run: String(context.publicationRun),
    attempt: String(context.publicationAttempt),
    recovery,
  };
  let retained = [];
  if (recovery) {
    assert.ok(
      previous,
      "Recovery requires retained provider and manifest evidence",
    );
    const { run, jobs, manifestBytes, originsBytes } = previous;
    assert.equal(String(run.id), recovery.run);
    assert.equal(String(run.run_attempt), recovery.attempt);
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.path, ".github/workflows/publish.yml");
    assert.equal(run.event, "workflow_dispatch");
    assert.equal(run.head_branch, "main");
    assert.equal(
      run.status,
      "completed",
      "Previous publication must be quiescent",
    );
    oid(run.head_sha);
    assert.equal(
      createHash("sha256").update(manifestBytes).digest("hex"),
      manifestSha,
    );
    assert.ok(Array.isArray(jobs.jobs));
    assert.equal(
      jobs.total_count,
      jobs.jobs.length,
      "Truncated previous job evidence",
    );
    const publishJobs = jobs.jobs.filter((job) => job.name === "publish");
    assert.equal(publishJobs.length, 1);
    const job = publishJobs[0];
    assert.equal(job.status, "completed");
    assert.equal(String(job.run_id), recovery.run);
    assert.equal(String(job.run_attempt), recovery.attempt);
    assert.equal(job.head_sha, run.head_sha);
    let priorRecords;
    if (originsBytes) {
      assert.match(
        recovery.originsSha256,
        /^[a-f0-9]{64}$/u,
        "Approve the previous origin-map digest before recovery",
      );
      assert.equal(
        createHash("sha256").update(originsBytes).digest("hex"),
        recovery.originsSha256,
      );
      const prior = JSON.parse(originsBytes);
      validatePublicationOrigins(
        prior,
        {
          ...expected,
          controlSource: run.head_sha,
          run: recovery.run,
          attempt: recovery.attempt,
          recovery: prior.recovery,
        },
        release.archives,
      );
      priorRecords = prior.records;
    } else {
      assert.equal(recovery.originsSha256, "");
      assert.equal(
        run.head_sha,
        release.source.head,
        "Legacy recovery requires the original same-source publisher",
      );
      priorRecords = release.archives.map((archive) => ({
        package: archive.package,
        source: run.head_sha,
        run: recovery.run,
        attempt: recovery.attempt,
        state: "planned",
      }));
    }
    for (let index = 0; index < release.archives.length; index++) {
      const record = priorRecords[index];
      const steps = job.steps.filter(
        (step) => step.name === publicationSteps[index],
      );
      assert.equal(
        steps.length,
        1,
        "Missing or duplicate publication-effect step",
      );
      const step = steps[0];
      assert.equal(step.status, "completed");
      assert.ok(
        ["success", "failure", "cancelled", "skipped", "timed_out"].includes(
          step.conclusion,
        ),
      );
      // Only a never-executed planned effect is eligible for first publication.
      // Any attempted or previously retained effect needs exact registry proof;
      // a 404 cannot turn an unknown outcome into permission to publish again.
      if (record.state === "retained" || step.conclusion !== "skipped")
        retained.push({ ...record, state: "retained" });
    }
  } else {
    assert.ok(!previous);
    assert.ok(!context.recoveryAttempt && !context.recoveryOriginsSha);
    assert.equal(release.source.head, context.head);
  }
  const map = {
    schemaVersion: 1,
    ...expected,
    records: release.archives.map(
      (archive) =>
        retained.find((record) => record.package === archive.package) ?? {
          package: archive.package,
          source: context.head,
          run: expected.run,
          attempt: expected.attempt,
          state: "planned",
        },
    ),
  };
  return validatePublicationOrigins(map, expected, release.archives);
}
