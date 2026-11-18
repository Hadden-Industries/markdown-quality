// SPDX-License-Identifier: AGPL-3.0-only
/** Read native provider history before granting any new staging effect. */
import { repository } from "./release-identity.js";
import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash } from "./release-bytes.js";
import { releaseVersion } from "./release-coordinates.js";
import { legacyPublicationSteps, stagingSteps } from "./publication-origins.js";
import { stagingStepNames } from "./publication-steps.js";
import {
  publicationContext,
  validatePublicationContext,
} from "./publication-context.js";
import { preparePublicationEnvironment } from "./prepare-publication-environment.js";
import {
  attemptedPublicationJobs,
  readPublicationAttempts,
  verifyFirstStagingAttempt,
} from "./publication-attempts.js";
import { acquirePublicationArtifact } from "./publication-artifact.js";
import {
  publicationSubject,
  readPublicationSubjects,
  matchPublicationSubject,
  readArchivedPublicationSubjects,
} from "./publication-subjects.js";
import { readSignedHistoryRefs } from "./release-history.js";
import { retainedFileBytes } from "./release-retained-artifacts.js";
import { writerBaseline } from "./release-writer-inventory.js";
import {
  createLegacyProvenanceResolver,
  verifyRecoveredProvenanceWriter,
} from "./release-provenance-recovery.js";

export { attemptedPublicationJobs } from "./publication-attempts.js";

// Serialized subject fields are observations, not authority. Only this live
// authenticated collector can admit a lookup for the corresponding entry.
const admittedSubjects = new WeakMap();
const admitSubject = (entry, subject) => {
  entry.subject = Object.freeze({ ...subject });
  admittedSubjects.set(entry, entry.subject);
};
function mergePublicationSubject(left, right) {
  assert.equal(
    left.version,
    right.version,
    "Conflicting publication version evidence",
  );
  if (left.manifestSha256 && right.manifestSha256)
    assert.equal(
      left.manifestSha256,
      right.manifestSha256,
      "Conflicting publication version evidence",
    );
  return left.manifestSha256 ? left : right;
}
export function verifyPublicationHistory(release, map, history) {
  assert.match(String(map.attempt), /^[1-9]\d{0,15}$/u);
  const current = history.filter(
    ({ run }) => String(run.id) === String(map.run),
  );
  assert.equal(
    current.length,
    1,
    "Missing current publication attempt history",
  );
  verifyFirstStagingAttempt(current[0], {
    publicationRun: map.run,
    publicationAttempt: map.attempt,
    head: map.controlSource,
  });
  for (const entry of history) {
    const { run, jobs, manifestBytes, originsBytes } = entry;
    if (String(run.id) === String(map.run)) continue;
    assert.ok(
      ["completed", "queued"].includes(run.status),
      "Another publication may still execute effects",
    );
    const effects = attemptedPublicationJobs(jobs);
    if (!effects.length) continue;
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.path, ".github/workflows/publish.yml");
    assert.ok(
      ["workflow_dispatch", "push"].includes(run.event),
      "Unexpected historical publisher event",
    );
    assert.equal(run.head_branch, "main");
    assert.equal(
      run.status,
      "completed",
      "Prior publication must be quiescent",
    );
    const subject = admittedSubjects.get(entry);
    if (subject && subject.version !== release.version) {
      assert.deepEqual(entry.subject, subject);
      if (manifestBytes)
        assert.deepEqual(publicationSubject(manifestBytes), subject);
      continue;
    }
    assert.ok(
      manifestBytes,
      "Missing prior manifest; restore evidence before staging",
    );
    const previous = JSON.parse(manifestBytes);
    if (previous.version !== release.version) continue;
    const priorMap = originsBytes ? JSON.parse(originsBytes) : null;
    if (priorMap) {
      assert.equal(priorMap.manifestSha, hash(manifestBytes));
      assert.equal(priorMap.version, previous.version);
      assert.equal(String(priorMap.run), String(run.id));
    }
    for (const job of effects) {
      if (job.name === "stage") assert.equal(run.event, "workflow_dispatch");
      assert.equal(String(job.run_id), String(run.id));
      assert.equal(job.head_sha, run.head_sha);
      assert.equal(job.status, "completed");
      if (priorMap) {
        assert.equal(
          String(priorMap.attempt),
          String(job.run_attempt),
          "Ambiguous prior rerun requires preserved original evidence",
        );
        assert.equal(priorMap.controlSource, job.head_sha);
      }
      const names =
        job.name === "stage" ? stagingStepNames(job) : legacyPublicationSteps;
      for (let index = 0; index < release.archives.length; index++) {
        const steps = job.steps.filter((step) => step.name === names[index]);
        assert.equal(steps.length, 1, "Incomplete prior publication steps");
        const record = priorMap?.records[index];
        if (steps[0].conclusion === "skipped" && record?.state !== "retained")
          continue;
        const archive = release.archives[index];
        const previousArchive = previous.archives.find(
          (item) => item.package === archive.package,
        );
        assert.ok(previousArchive);
        for (const key of ["sha256", "integrity"])
          assert.equal(
            previousArchive[key],
            archive[key],
            "Previously attempted version cannot change bytes",
          );
        const original = record ?? {
          package: archive.package,
          source: run.head_sha,
          run: String(run.id),
          attempt: String(job.run_attempt),
        };
        assert.equal(original.package, archive.package);
        const current = map.records[index];
        assert.equal(
          current.state,
          "retained",
          "Prior stage attempt must be retained; omitting recovery cannot authorize replay",
        );
        for (const key of ["package", "source", "run", "attempt"])
          assert.equal(
            String(current[key]),
            String(original[key]),
            "Recovery omitted or replaced a prior stage origin",
          );
      }
    }
  }
}

function checkpointPublicationSubjects(signedCheckpoints, scratch) {
  const subjects = [];
  for (const checkpoint of signedCheckpoints) {
    const attemptsByRun = new Map();
    for (const attempt of checkpoint.writerAttempts ?? []) {
      const list = attemptsByRun.get(attempt.run.id) ?? [];
      list.push({ run: attempt.run, jobs: attempt.inventory });
      attemptsByRun.set(attempt.run.id, list);
    }
    for (const list of attemptsByRun.values())
      list.sort((a, b) => a.run.run_attempt - b.run.run_attempt);
    for (const entry of checkpoint.writers) {
      if (entry.run.path !== ".github/workflows/publish.yml") continue;
      const recoveryDoc = verifyRecoveredProvenanceWriter(entry);
      const attempts = attemptsByRun.get(entry.run.id) ?? [
        { run: entry.run, jobs: entry.inventory },
      ];
      if (recoveryDoc) {
        subjects.push({
          run: entry.run,
          attempts,
          subject: { version: recoveryDoc.version },
        });
        continue;
      }
      const manifestFile = entry.files["frozen-release/release-manifest.json"];
      if (!manifestFile) continue;
      const manifestBytes = Buffer.from(manifestFile.base64, "base64");
      subjects.push({
        run: entry.run,
        attempts,
        subject: publicationSubject(manifestBytes),
      });
      if (
        entry.run.status === "completed" &&
        entry.run.conclusion === "success" &&
        entry.files["provider/publication-history.json"]
      ) {
        const dir = mkdtempSync(join(scratch, "checkpoint-"));
        mkdirSync(join(dir, "frozen-release"), { recursive: true });
        mkdirSync(join(dir, "provider"), { recursive: true });
        writeFileSync(
          join(dir, "frozen-release/release-manifest.json"),
          manifestBytes,
        );
        writeFileSync(
          join(dir, "provider/publication-history.json"),
          Buffer.from(
            entry.files["provider/publication-history.json"].base64,
            "base64",
          ),
        );
        if (entry.files["provider/staging-history.json"])
          writeFileSync(
            join(dir, "provider/staging-history.json"),
            retainedFileBytes(entry.files["provider/staging-history.json"]),
          );
        subjects.push(
          ...readPublicationSubjects(
            dir,
            { run: entry.run, attempt: entry.attempt, attempts },
            manifestBytes,
          ),
        );
      }
    }
  }
  return subjects;
}

export async function readPublicationHistory(
  currentRun,
  gh = (args) => native("gh", args),
  download,
  {
    version,
    archives = readArchivedPublicationSubjects,
    env = process.env,
    checkpoints,
    baseline,
    npm,
    readPackument,
    recoverSubject,
  } = {},
) {
  if (version !== undefined) releaseVersion(version);
  const pages = JSON.parse(
    gh([
      "api",
      `repos/${repository}/actions/workflows/publish.yml/runs?per_page=100`,
      "--paginate",
      "--slurp",
    ]),
  );
  const runs = pages.flatMap((page) => page.workflow_runs);
  assert.equal(
    runs.length,
    pages[0].total_count,
    "Incomplete native workflow history",
  );
  assert.equal(new Set(runs.map((run) => run.id)).size, runs.length);
  const current = runs.find((run) => String(run.id) === String(currentRun));
  assert.ok(current, "Current run absent from native history");
  let signed = checkpoints;
  const originalCheckpoints = () =>
    (signed ??= env.HISTORY_CHECKPOINT
      ? readSignedHistoryRefs(JSON.parse(env.HISTORY_CHECKPOINT), gh)
      : []);
  const scratch = mkdtempSync(join(tmpdir(), "publication-history-"));
  try {
    const history = [];
    for (const listed of runs) {
      const observed = readPublicationAttempts(listed.id, undefined, gh);
      assert.equal(observed.run.head_sha, listed.head_sha);
      assert.equal(
        observed.run.run_attempt,
        listed.run_attempt,
        "Publication history changed during collection",
      );
      const { run } = observed;
      const entry = { ...observed };
      if (String(run.id) === String(currentRun)) {
        history.push(entry);
        continue;
      }
      for (const attempt of observed.attempts)
        attemptedPublicationJobs(attempt.jobs);
      const effects = observed.executions.filter(
        (job) =>
          attemptedPublicationJobs({ total_count: 1, jobs: [job] }).length,
      );
      // Keep every distinct possible write, even when a newer job failed before writing.
      entry.jobs = { total_count: effects.length, jobs: effects };
      if (effects.length) {
        assert.equal(run.head_branch, "main", "Historical writes require main");
        assert.equal(
          effects.length,
          1,
          "Multiple publication executions require reconciliation",
        );
      }
      history.push(entry);
    }
    const subjects = [],
      missing = new Map();
    const classify = (entry) => {
      const matches = subjects.filter((cached) =>
        matchPublicationSubject(cached, entry),
      );
      for (const cached of matches)
        admitSubject(
          entry,
          entry.subject
            ? mergePublicationSubject(entry.subject, cached.subject)
            : cached.subject,
        );
      return version && entry.subject && entry.subject.version !== version;
    };
    for (const entry of history) {
      if (
        String(entry.run.id) === String(currentRun) ||
        !entry.jobs.jobs.length ||
        !attemptedPublicationJobs(entry.jobs).length
      )
        continue;
      if (classify(entry)) continue;
      const directory = join(scratch, String(entry.run.id));
      const attempt = entry.jobs.jobs[0].run_attempt;
      let originalArtifact;
      try {
        if (download)
          originalArtifact = await download({
            run: entry.run,
            attempt,
            destination: directory,
          });
        else {
          const original = entry.attempts[attempt - 1];
          originalArtifact = await acquirePublicationArtifact({
            runId: entry.run.id,
            attempt,
            destination: directory,
            observed: { run: original.run, inventory: original.jobs },
            checkpoints: originalCheckpoints,
          });
        }
      } catch (error) {
        // Only authenticated unavailability can be discharged by an independently
        // verified other-version subject; digest/provider/ambiguity failures stop here.
        if (
          ![404, 410].includes(error.httpStatus) &&
          ![
            "PUBLICATION_ARTIFACT_MISSING",
            "EVIDENCE_ARTIFACT_EXPIRED",
          ].includes(error.code)
        )
          throw error;
        missing.set(entry, error);
        continue;
      }
      entry.manifestBytes = readFileSync(
        join(directory, "frozen-release/release-manifest.json"),
      );
      const reviewed = (
        baseline ?? writerBaseline
      ).publish.noRequestAttempts?.find(
        (record) => record.run === entry.run.id && record.attempt === attempt,
      );
      if (reviewed) {
        // This is an explicit reviewed recovery decision about one immutable
        // original artifact, not an inference from absent npm metadata or logs.
        const job = entry.jobs.jobs[0];
        const artifact = originalArtifact?.artifact;
        assert.ok(
          entry.run.status === "completed" &&
            entry.run.conclusion === "failure" &&
            entry.run.run_attempt === attempt &&
            entry.run.head_sha === reviewed.controller &&
            job.name === "stage" &&
            job.id === reviewed.job &&
            job.conclusion === "failure" &&
            artifact?.id === reviewed.artifactId &&
            artifact.name === `publication-source-and-manifest-${attempt}` &&
            artifact.digest === reviewed.artifactDigest &&
            hash(entry.manifestBytes) === reviewed.manifestSha256,
          "Original staging evidence differs from the reviewed no-request decision",
        );
        const names = stagingStepNames(job);
        for (const [index, name] of names.entries()) {
          const steps = job.steps.filter((step) => step.name === name);
          assert.ok(
            steps.length === 1 &&
              steps[0].status === "completed" &&
              steps[0].conclusion === (index === 0 ? "failure" : "skipped"),
            "Staging steps differ from the reviewed no-request decision",
          );
        }
        assert.ok(
          !existsSync(join(directory, "staging-journal")),
          "A staging intent cannot use no-request recovery",
        );
        entry.reviewedNoRequest = reviewed;
        // Preserve the complete failed attempt above. Only the possible-effect
        // projection changes; later reruns and other attempts cannot inherit it.
        entry.jobs = { total_count: 0, jobs: [] };
        // The exact manifest remains in its original authenticated artifact.
        // A settled no-request entry needs no duplicate package-source payload.
        delete entry.manifestBytes;
        continue;
      }
      const subject = publicationSubject(entry.manifestBytes);
      admitSubject(
        entry,
        entry.subject
          ? mergePublicationSubject(entry.subject, subject)
          : subject,
      );
      try {
        entry.originsBytes = readFileSync(
          join(directory, "frozen-release/publication-origins.json"),
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (
        entry.run.status === "completed" &&
        entry.run.conclusion === "success"
      )
        subjects.push(
          ...readPublicationSubjects(
            directory,
            { run: entry.run, attempt, attempts: entry.attempts },
            entry.manifestBytes,
          ),
        );
    }
    if (version && [...missing.keys()].some((entry) => !classify(entry)))
      subjects.push(...archives(gh, scratch));
    if (version && [...missing.keys()].some((entry) => !classify(entry))) {
      const signedCheckpoints = originalCheckpoints();
      if (signedCheckpoints.length)
        subjects.push(
          ...checkpointPublicationSubjects(signedCheckpoints, scratch),
        );
    }
    if (version && [...missing.keys()].some((entry) => !classify(entry))) {
      const resolveSubject =
        recoverSubject ??
        createLegacyProvenanceResolver({
          repository,
          baseline,
          runs: history.map((item) => item.run),
          gh,
          npm,
          readPackument,
          tempRoot: env.RUNNER_TEMP ?? tmpdir(),
        }).recoverSubject;
      for (const [entry] of missing) {
        if (classify(entry)) continue;
        const job = entry.jobs.jobs[0];
        const attemptRecord = entry.attempts.find(
          (candidate) => candidate.run.run_attempt === job.run_attempt,
        );
        const recovered = await resolveSubject({
          run: entry.run,
          attempt: job.run_attempt,
          job,
          inventory: attemptRecord?.jobs ?? entry.jobs,
          publishRuns: history.map((item) => item.run),
        });
        if (recovered)
          subjects.push({
            run: entry.run,
            attempts: entry.attempts,
            subject: recovered,
          });
      }
    }
    for (const entry of history)
      if (
        String(entry.run.id) !== String(currentRun) &&
        attemptedPublicationJobs(entry.jobs).length
      )
        classify(entry);
    for (const [entry, error] of missing) if (!classify(entry)) throw error;
    return history;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  if (process.argv[2] === "--admit-attempt") {
    const directory = resolve(process.argv[3]);
    const bytes = readFileSync(join(directory, "release-manifest.json"));
    assert.equal(hash(bytes), process.env.MANIFEST_SHA);
    const release = JSON.parse(bytes);
    const originalBytes = readFileSync(
      join(directory, "publication-origins.json"),
    );
    assert.ok(["stage", "retained"].includes(process.env.GITHUB_JOB));
    const context = {
      ...publicationContext(process.env),
      job: process.env.GITHUB_JOB,
    };
    const history = await readPublicationHistory(
      context.publicationRun,
      undefined,
      undefined,
      { version: release.version },
    );
    const map = admitStagingAttempt({
      release,
      map: JSON.parse(originalBytes),
      manifestSha: hash(bytes),
      context,
      history,
    });
    writeFileSync("provider/admission-origins.json", originalBytes, {
      flag: "wx",
    });
    writeFileSync(
      "provider/staging-history.json",
      JSON.stringify(history) + "\n",
      { flag: "wx" },
    );
    assert.deepEqual(
      readFileSync(join(directory, "publication-origins.json")),
      originalBytes,
    );
    writeFileSync(
      join(directory, "publication-origins.json"),
      JSON.stringify(map, null, 2) + "\n",
    );
    assert.ok(process.env.GITHUB_OUTPUT);
    appendFileSync(process.env.GITHUB_OUTPUT, "admitted=true\n");
  } else {
    const [directory, output] = process.argv
      .slice(2)
      .map((path) => resolve(path));
    const release = JSON.parse(
      readFileSync(join(directory, "release-manifest.json")),
    );
    const map = JSON.parse(
      readFileSync(join(directory, "publication-origins.json")),
    );
    assert.equal(map.run, process.env.GITHUB_RUN_ID);
    assert.equal(map.attempt, process.env.GITHUB_RUN_ATTEMPT);
    const history = await readPublicationHistory(
      map.run,
      undefined,
      undefined,
      { version: release.version },
    );
    verifyPublicationHistory(release, map, history);
    writeFileSync(
      output,
      JSON.stringify(
        {
          schemaVersion: 1,
          run: map.run,
          attempt: map.attempt,
          manifestSha256: hash(
            readFileSync(join(directory, "release-manifest.json")),
          ),
          originsSha256: hash(
            readFileSync(join(directory, "publication-origins.json")),
          ),
          history: history.map(
            ({
              run,
              jobs,
              attempts,
              subject,
              manifestBytes,
              originsBytes,
            }) => ({
              run,
              jobs,
              attempts,
              subject: subject?.manifestSha256 ? subject : null,
              manifestSha256: manifestBytes
                ? hash(manifestBytes)
                : (subject?.manifestSha256 ?? null),
              originsSha256: originsBytes ? hash(originsBytes) : null,
            }),
          ),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
  }
}

/** Rebind only never-attempted requests; retained package origins stay immutable. */
export function admitStagingAttempt({
  release,
  map,
  manifestSha,
  context,
  history,
}) {
  validatePublicationContext(context);
  const current = history.filter(
    ({ run }) => String(run.id) === String(context.publicationRun),
  );
  assert.equal(
    current.length,
    1,
    "Missing current publication attempt history",
  );
  verifyFirstStagingAttempt(current[0], context);
  assert.ok(Number(map.attempt) <= Number(context.publicationAttempt));
  preparePublicationEnvironment(release, manifestSha, map, {
    ...context,
    publicationAttempt: map.attempt,
  });
  const admitted = structuredClone(map);
  admitted.attempt = String(context.publicationAttempt);
  for (const record of admitted.records)
    if (record.state === "planned") record.attempt = admitted.attempt;
  preparePublicationEnvironment(release, manifestSha, admitted, context);
  // A retained admission can predate another dispatch: refresh cross-run history too.
  verifyPublicationHistory(release, admitted, history);
  return admitted;
}
