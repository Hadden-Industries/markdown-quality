// SPDX-License-Identifier: AGPL-3.0-only
/** Read native provider history before granting any new staging effect. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash } from "./release-bytes.js";
import { legacyPublicationSteps, stagingSteps } from "./publication-origins.js";

const repository = "Hadden-Industries/markdown-quality";
const effectNames = new Set([...legacyPublicationSteps, ...stagingSteps]);
export function attemptedPublicationJobs(jobs) {
  assert.equal(
    jobs.total_count,
    jobs.jobs.length,
    "Truncated publication history",
  );
  return jobs.jobs.filter((job) => {
    if (
      !["stage", "publish"].includes(job.name) ||
      job.conclusion === "skipped"
    )
      return false;
    if (job.status === "queued" && !job.steps?.length) return false;
    assert.ok(Array.isArray(job.steps), "Missing publication step history");
    const names = job.name === "stage" ? stagingSteps : legacyPublicationSteps;
    for (const name of names)
      assert.equal(
        job.steps.filter((step) => step.name === name).length,
        1,
        "Incomplete publication step history",
      );
    return job.steps.some(
      (step) => effectNames.has(step.name) && step.conclusion !== "skipped",
    );
  });
}

export function verifyPublicationHistory(release, map, history) {
  assert.equal(
    String(map.attempt),
    "1",
    "Use a new dispatch; never rerun a staging workflow",
  );
  for (const entry of history) {
    const { run, jobs, manifestBytes, originsBytes } = entry;
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
        job.name === "stage" ? stagingSteps : legacyPublicationSteps;
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

export function readPublicationHistory(
  currentRun,
  gh = (args) => native("gh", args),
) {
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
  const scratch = mkdtempSync(join(tmpdir(), "publication-history-"));
  try {
    return runs
      .filter((run) => String(run.id) !== String(currentRun))
      .map((run) => {
        const pages = JSON.parse(
          gh([
            "api",
            `repos/${repository}/actions/runs/${run.id}/jobs?filter=all&per_page=100`,
            "--paginate",
            "--slurp",
          ]),
        );
        const jobs = {
          total_count: pages[0].total_count,
          jobs: pages.flatMap((page) => page.jobs),
        };
        const entry = { run, jobs };
        if (attemptedPublicationJobs(jobs).length) {
          const directory = join(scratch, String(run.id));
          gh([
            "run",
            "download",
            String(run.id),
            "--repo",
            repository,
            "--name",
            "publication-source-and-manifest",
            "--dir",
            directory,
          ]);
          entry.manifestBytes = readFileSync(
            join(directory, "frozen-release/release-manifest.json"),
          );
          // Historical direct publications may predate origin maps.
          try {
            entry.originsBytes = readFileSync(
              join(directory, "frozen-release/publication-origins.json"),
            );
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }
        return entry;
      });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
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
  const history = readPublicationHistory(map.run);
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
        history: history.map(({ run, jobs, manifestBytes, originsBytes }) => ({
          run,
          jobs,
          manifestSha256: manifestBytes ? hash(manifestBytes) : null,
          originsSha256: originsBytes ? hash(originsBytes) : null,
        })),
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}
