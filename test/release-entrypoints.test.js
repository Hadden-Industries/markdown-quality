// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { entryWorld } from "./release-entry-fixture.mjs";
import { budgets } from "../scripts/qualification-budgets.js";

const passed = (result) => assert.equal(result.status, 0, result.stderr);

test("cold stage executables authenticate native intent, ignore the large redundant snapshot and stage natives once", (t) => {
  const f = entryWorld(t, "stage", process.env.MQ_RELEASE_REHEARSAL_SOURCE);
  const journals = join(f.job, "staging-journal");
  passed(
    f.entry("prepare-publication-environment.js", ["--environment", f.bundle]),
  );
  assert.match(readFileSync(f.env.GITHUB_ENV, "utf8"), /STAGE_CORE=false/u);
  for (const platform of ["win32-x64", "linux-x64"])
    passed(f.entry("stage-release-package.js", [platform, f.bundle, journals]));
  assert.deepEqual(
    f.state().requests.map((item) => item.package),
    [
      "@hadden-industries/markdown-quality-win32-x64",
      "@hadden-industries/markdown-quality-linux-x64",
    ],
  );
  const replay = f.entry("stage-release-package.js", [
    "win32-x64",
    f.bundle,
    journals,
  ]);
  assert.notEqual(replay.status, 0);
  assert.equal(f.state().requests.length, 2);
  assert.notEqual(
    f.entry("stage-release-package.js", ["core", f.bundle, journals]).status,
    0,
  );
  assert.equal(f.state().requests.length, 2);
});

test("a lost stage acknowledgment remains unknown and the same workspace cannot replay it", (t) => {
  const f = entryWorld(t, "stage");
  f.change((state) => {
    state.dropStageAck = true;
  });
  const args = ["win32-x64", f.bundle, join(f.job, "staging-journal")];
  assert.notEqual(f.entry("stage-release-package.js", args).status, 0);
  assert.match(
    readFileSync(join(args[2], "win32-x64.jsonl"), "utf8"),
    /outcome-unknown/u,
  );
  assert.notEqual(f.entry("stage-release-package.js", args).status, 0);
  assert.deepEqual(
    f.state().requests.map(({ received, applied, acknowledged }) => ({
      received,
      applied,
      acknowledged,
    })),
    [{ received: true, applied: true, acknowledged: false }],
  );
});

test("an attributable published native is checked with native JSON integrity before the next stage", (t) => {
  const f = entryWorld(t, "stage");
  const journals = join(f.job, "staging-journal");
  passed(
    f.entry("stage-release-package.js", ["win32-x64", f.bundle, journals]),
  );
  const staged = readFileSync(join(journals, "win32-x64.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse)
    .at(-1);
  f.change((state) => {
    state.approvals = [
      {
        actor: "fixture-owner",
        stageId: staged.stageId,
        integrity: staged.integrity,
      },
    ];
    state.tags[staged.package].latest = f.manifest.version;
  });
  passed(
    f.entry("stage-release-package.js", ["linux-x64", f.bundle, journals]),
  );
  assert.equal(
    f
      .state()
      .calls.filter(
        (call) => call.args[1] === "view" && call.args[3] === "dist.integrity",
      ).length,
    1,
  );
  assert.equal(f.state().requests.length, 2);
});

test("cold archive CLI consumes exact decisions and native signatures, publishes 18 assets and completes latest without npm relabelling", (t) => {
  const f = entryWorld(t, "archive");
  passed(f.entry("read-release-decisions.js", [join(f.job, "decisions")]));
  assert.equal(
    readFileSync(join(f.job, "decisions/release-review.json"), "utf8"),
    f.env.REVIEW_JSON,
  );
  const qualification = join(f.job, "qualification.json");
  writeFileSync(qualification, JSON.stringify(f.qualified, null, 2) + "\n");
  passed(
    f.entry("github-release.js", [
      qualification,
      f.bundle,
      join(f.job, "archive-journal"),
    ]),
  );
  const state = f.state();
  assert.equal(state.assets.length, 18);
  assert.deepEqual(
    state.requests.map((item) => item.operation),
    ["create", ...Array(18).fill("upload"), "edit", "edit"],
  );
  assert.equal(state.release.prerelease, false);
  assert.equal(state.release.immutable, true);
  assert.equal(
    state.calls.filter((call) => call.args.includes("dist-tag")).length,
    0,
  );
  assert.ok(
    state.calls
      .filter((call) => call.args[1] === "upload")
      .every((call) => call.timeout === budgets.upload),
  );
  assert.ok(
    state.calls.some(
      (call) =>
        call.args[1] === "download" &&
        call.args[0] === "release" &&
        call.timeout === budgets.collection,
    ),
  );
  const inputs = join(f.job, "completion-inputs");
  mkdirSync(inputs);
  cpSync(f.bundle, join(inputs, "bundle"), { recursive: true });
  writeFileSync(
    join(inputs, "qualification.json"),
    readFileSync(qualification),
  );
  f.env.ARCHIVE_JOURNAL_ID = "555";
  f.change((world) => {
    const run = {
      ...world.routes[
        "actions/workflows/github-release.yml/runs?per_page=100"
      ][0].workflow_runs.at(-1),
      status: "completed",
      conclusion: "success",
    };
    world.routes["actions/runs/99002/attempts/1"] = run;
    world.routes["actions/runs/99002/attempts/1/jobs?per_page=100"] = {
      total_count: 1,
      jobs: [
        {
          id: 901,
          name: "archive",
          run_id: run.id,
          run_attempt: 1,
          head_sha: run.head_sha,
          status: "completed",
          conclusion: "success",
        },
      ],
    };
    world.routes["actions/artifacts/555"] = {
      id: 555,
      name: "archive-journal-1",
      expired: false,
      digest: `sha256:${"a".repeat(64)}`,
      workflow_run: {
        id: run.id,
        head_sha: run.head_sha,
        repository_id: 1,
        head_repository_id: 1,
      },
    };
  });
  passed(
    f.entry("verify-archive-completion.js", [
      inputs,
      join(f.job, "archive-journal"),
      join(f.job, "completion"),
    ]),
  );
  assert.equal(
    JSON.parse(readFileSync(join(f.job, "completion/completion.json"))).status,
    "complete",
  );
  assert.equal(
    f.state().requests.length,
    21,
    "Read-only completion performs no further writes",
  );
});

test("native archive verification failure stops classification and retry verifies the existing immutable archive without re-uploading", (t) => {
  const f = entryWorld(t, "archive");
  const qualification = join(f.job, "qualification.json");
  writeFileSync(qualification, JSON.stringify(f.qualified, null, 2) + "\n");
  f.change((state) => {
    state.failCrypto = true;
  });
  const failed = f.entry("github-release.js", [
    qualification,
    f.bundle,
    join(f.job, "failed-journal"),
  ]);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /native cryptographic refusal/u);
  assert.deepEqual(
    f.state().requests.map((item) => item.operation),
    ["create", ...Array(18).fill("upload"), "edit"],
  );
  assert.equal(f.state().release.prerelease, true);
  assert.equal(
    f
      .state()
      .calls.filter(
        (call) => call.args[0] === "release" && call.args[1] === "verify",
      ).length,
    1,
  );
  f.change((state) => {
    state.failCrypto = false;
  });
  passed(
    f.entry("github-release.js", [
      qualification,
      f.bundle,
      join(f.job, "continued-journal"),
    ]),
  );
  assert.deepEqual(
    f.state().requests.map((item) => item.operation),
    ["create", ...Array(18).fill("upload"), "edit", "edit"],
  );
});

test("an invalid owner intent signature refuses staging before any npm request", (t) => {
  const f = entryWorld(t, "stage");
  f.change((state) => {
    state.routes[`git/tags/${"e".repeat(40)}`].verification.payload +=
      "tampered";
  });
  const result = f.entry("stage-release-package.js", [
    "win32-x64",
    f.bundle,
    join(f.job, "staging-journal"),
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(f.state().requests.length, 0);
});

test("public tuple wrapper hands retained origins to its native qualifier under the registry deadline", (t) => {
  const f = entryWorld(t, "archive");
  const origins = JSON.parse(
    readFileSync(join(f.input, "publication-origins.json")),
  );
  Object.assign(origins, {
    schemaVersion: 2,
    controlSource: f.qualified.source,
    run: "901",
    attempt: "2",
  });
  origins.recovery = {
    run: "900",
    attempt: "1",
    originsSha256: "b".repeat(64),
  };
  writeFileSync(
    join(f.input, "continuation.json"),
    JSON.stringify({ schemaVersion: 2, origins }),
  );
  passed(
    f.entry("verify-public-tuple.js", [f.input, join(f.job, "report.json")]),
  );
  const handoff = f.state().qualifierHandoff;
  assert.equal(handoff.timeout, budgets.registry);
  assert.equal(handoff.candidate, String(origins.candidateRun));
  for (const [flag, value] of [
    ["--publication-source", origins.controlSource],
    ["--publication-run", origins.run],
    ["--publication-attempt", origins.attempt],
    ["--recovery-run", "900"],
    ["--recovery-origins-sha256", "b".repeat(64)],
  ])
    assert.equal(handoff.args[handoff.args.indexOf(flag) + 1], value);
  assert.equal(f.state().requests.length, 0);
});

test("local dispatch CLI checks the exact request before a workflow can be dispatched", (t) => {
  const f = entryWorld(t, "archive");
  const path = join(f.job, "dispatch.json");
  const request = {
    ref: "main",
    inputs: {
      "review-json": f.env.REVIEW_JSON,
      "acceptance-json": f.env.ACCEPTANCE_JSON,
      "preflight-json": "",
    },
  };
  writeFileSync(path, JSON.stringify(request));
  passed(f.entry("release-decision-transport.js", [path]));
  request.inputs["preflight-json"] = '"'.repeat(33000);
  writeFileSync(path, JSON.stringify(request));
  const rejected = f.entry("release-decision-transport.js", [path]);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Combined owner inputs/u);
  assert.equal(f.state().requests.length, 0);
});
