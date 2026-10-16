// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { verifyStagingContinuation } from "../scripts/release-continuation.js";
import { releaseQualificationJobNames } from "../scripts/release-qualification.js";
import { hash } from "../scripts/release-bytes.js";
import { nodeSupport } from "../scripts/node-matrix.js";

function fixture() {
  const source = "a".repeat(40),
    control = "b".repeat(40),
    manifestSha = "c".repeat(64);
  const matrix = {
    os: ["windows-latest", "ubuntu-24.04"],
    node: ["22.13.0", "24.0.0", "24.21.0", "26.0.0"],
  };
  const archives = ["win32-x64", "linux-x64", "core"].map((name) => ({
    name,
    package:
      "@hadden-industries/markdown-quality" +
      (name === "core" ? "" : `-${name}`),
  }));
  const release = {
    version: "2.0.0",
    source: { head: source, clean: true },
    qualificationMatrix: matrix,
    runtimePolicy: nodeSupport,
    archives,
  };
  const provider = (id, path, head, names) => ({
    run: {
      id,
      run_attempt: 1,
      head_sha: head,
      path,
      event: "workflow_dispatch",
      head_branch: "main",
      status: "completed",
      conclusion: "success",
      repository: { full_name: "Hadden-Industries/markdown-quality" },
    },
    jobs: {
      total_count: names.length,
      jobs: names.map((name) => ({
        name,
        run_id: id,
        run_attempt: 1,
        head_sha: head,
        status: "completed",
        conclusion: name === "candidate / shared" ? "skipped" : "success",
        steps:
          name === "stage"
            ? [
                {
                  name: "Stage coherent core under pilot",
                  conclusion: "success",
                },
              ]
            : [],
      })),
    },
  });
  const map = {
    schemaVersion: 1,
    version: release.version,
    artifactSource: source,
    manifestSha,
    candidateRun: "10",
    controlSource: control,
    run: "11",
    attempt: "1",
    recovery: { run: "9", attempt: "1", originsSha256: "d".repeat(64) },
    records: archives.map(({ package: packageName }, index) => ({
      package: packageName,
      source: index === 2 ? control : source,
      run: index === 2 ? "11" : "9",
      attempt: "1",
      state: index === 2 ? "planned" : "retained",
    })),
  };
  const bytes = Buffer.from(JSON.stringify(map));
  return {
    release,
    manifestSha,
    origins: { bytes },
    originsSha: hash(bytes),
    candidate: provider(
      10,
      ".github/workflows/release-qualification.yml",
      source,
      releaseQualificationJobNames(matrix, nodeSupport),
    ),
    stage: provider(11, ".github/workflows/publish.yml", control, [
      "admit",
      "retained (windows-latest)",
      "retained (ubuntu-24.04)",
      "stage",
    ]),
  };
}

test("public qualification admits the original source through a later reviewed core continuation", () => {
  const input = fixture(),
    result = verifyStagingContinuation(input);
  assert.equal(result.qualification.source, "a".repeat(40));
  assert.equal(result.staging.source, "b".repeat(40));
  assert.deepEqual(
    result.origins.records.map(({ run }) => run),
    ["9", "9", "11"],
  );
});

test("ordinary CI, skipped gates, missing core requests and substituted origins cannot qualify public release", () => {
  for (const change of [
    (f) => (f.candidate.run.event = "push"),
    (f) =>
      (f.candidate.jobs.jobs.find(
        ({ name }) => name === "security",
      ).conclusion = "skipped"),
    (f) =>
      (f.stage.jobs.jobs.find(
        ({ name }) => name === "stage",
      ).steps[0].conclusion = "skipped"),
    (f) => (f.stage.jobs.jobs[1].head_sha = "f".repeat(40)),
    (f) => (f.originsSha = "e".repeat(64)),
    (f) => (f.stage.run.status = "in_progress"),
  ]) {
    const input = fixture();
    change(input);
    assert.throws(() => verifyStagingContinuation(input));
  }
});

test("a successful reconciliation retains an already approved core without staging it again", () => {
  const input = fixture();
  const map = JSON.parse(input.origins.bytes);
  map.records[2] = { ...map.records[2], state: "retained", run: "9" };
  input.origins.bytes = Buffer.from(JSON.stringify(map));
  input.originsSha = hash(input.origins.bytes);
  const effect = input.stage.jobs.jobs.find(({ name }) => name === "stage");
  effect.steps[0].conclusion = "skipped";
  assert.equal(verifyStagingContinuation(input).origins.records[2].run, "9");
  effect.steps[0].conclusion = "success";
  assert.throws(() => verifyStagingContinuation(input), /retained/u);
});
