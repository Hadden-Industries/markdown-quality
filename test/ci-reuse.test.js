// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  createReceipt,
  jobNames,
  requireResults,
  selectProof,
  verifyProof,
} from "../scripts/ci-reuse.js";
import {
  gitSnapshot,
  readLaneArtifacts,
  readProofArtifact,
  repositoryReader,
} from "../scripts/ci-reuse-command.js";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sha = (letter) => letter.repeat(40);
const matrix = {
  os: ["windows-latest", "ubuntu-24.04"],
  node: ["22.23.3", "24.21.0", "26.10.0"],
};
const expectedJobs = [
  "matrix",
  "probe (windows-latest, 22.23.3)",
  "probe (windows-latest, 24.21.0)",
  "probe (windows-latest, 26.10.0)",
  "probe (ubuntu-24.04, 22.23.3)",
  "probe (ubuntu-24.04, 24.21.0)",
  "probe (ubuntu-24.04, 26.10.0)",
  "strategy",
  "package (windows-latest, 22.23.3)",
  "package (windows-latest, 24.21.0)",
  "package (windows-latest, 26.10.0)",
  "package (ubuntu-24.04, 22.23.3)",
  "package (ubuntu-24.04, 24.21.0)",
  "package (ubuntu-24.04, 26.10.0)",
  "required",
];
const context = {
  repository: "Hadden-Industries/markdown-quality",
  repositoryId: 123,
  runId: 100,
  runAttempt: 1,
  eventName: "pull_request",
  sha: sha("a"),
  snapshot: {
    commit: sha("a"),
    tree: sha("b"),
    parents: [sha("c"), sha("d")],
    workflow: sha("e"),
  },
  event: {
    number: 7,
    pull_request: {
      head: {
        sha: sha("d"),
        repo: { id: 123, full_name: "Hadden-Industries/markdown-quality" },
      },
      base: {
        sha: sha("c"),
        ref: "main",
        repo: { id: 123, full_name: "Hadden-Industries/markdown-quality" },
      },
    },
  },
};
const lanes = () =>
  matrix.os.flatMap((os) =>
    matrix.node.map((node) => ({
      schemaVersion: 1,
      repository: context.repository,
      repositoryId: 123,
      runId: 100,
      runAttempt: 1,
      snapshot: context.snapshot,
      lane: { os, node },
      host: {
        os: os === "windows-latest" ? "Windows" : "Linux",
        arch: "X64",
        image: os === "windows-latest" ? "win25" : "ubuntu24",
        imageVersion: "20261001.1.0",
        node: `v${node}`,
        npm: "12.2.0",
        python: "Python 3.14.8",
      },
    })),
  );

test("full PR qualification produces a receipt only for a complete successful lane set", () => {
  const receipt = createReceipt({
    context,
    matrix,
    lanes: lanes(),
    needs: {
      matrix: { result: "success" },
      probe: { result: "success" },
      strategy: { result: "success" },
      package: { result: "success" },
    },
    now: Date.parse("2026-10-10T10:00:00Z"),
  });
  assert.equal(receipt.mode, "FULL");
  assert.equal(receipt.pullRequest, 7);
  assert.deepEqual(receipt.matrix, matrix);
  assert.equal(receipt.lanes.length, 6);
  assert.deepEqual(receipt.jobs, expectedJobs);
  assert.deepEqual(jobNames(matrix), expectedJobs);
});

function fixture() {
  const now = Date.parse("2026-10-10T11:00:00Z");
  const needs = {
    matrix: { result: "success" },
    probe: { result: "success" },
    strategy: { result: "success" },
    package: { result: "success" },
  };
  // Admission uses an independently authored wire record, not the production writer as its oracle.
  const receipt = structuredClone({
    schemaVersion: 1,
    mode: "FULL",
    repository: context.repository,
    repositoryId: 123,
    runId: 100,
    runAttempt: 1,
    pullRequest: 7,
    recordedAt: "2026-10-10T10:00:00.000Z",
    snapshot: context.snapshot,
    matrix,
    lanes: lanes(),
    jobs: expectedJobs,
  });
  const current = {
    ...structuredClone(context),
    runId: 200,
    sha: sha("f"),
    snapshot: { ...structuredClone(context.snapshot), commit: sha("f") },
    eventName: "push",
    event: {
      ref: "refs/heads/main",
      before: sha("c"),
      after: sha("f"),
      forced: false,
      created: false,
      deleted: false,
      repository: {
        id: 123,
        full_name: context.repository,
        default_branch: "main",
      },
    },
  };
  const hosts = lanes().map((record) => ({
    ...record,
    runId: 200,
    snapshot: current.snapshot,
  }));
  const pr = {
    ...context.event.pull_request,
    number: 7,
    merged: true,
    merge_commit_sha: sha("f"),
  };
  const run = {
    id: 100,
    run_attempt: 1,
    repository: pr.base.repo,
    head_repository: pr.head.repo,
    event: "pull_request",
    path: ".github/workflows/check.yml",
    head_sha: sha("d"),
    head_branch: "ci-reuse",
    status: "completed",
    conclusion: "success",
    created_at: "2026-10-10T09:00:00Z",
    run_started_at: "2026-10-10T09:01:00Z",
    updated_at: "2026-10-10T10:02:00Z",
  };
  const artifact = {
    id: 300,
    name: "package-proof-100-1",
    digest: `sha256:${"a".repeat(64)}`,
    expired: false,
    created_at: "2026-10-10T10:01:00Z",
    expires_at: "2026-11-10T10:01:00Z",
    workflow_run: {
      id: 100,
      repository_id: 123,
      head_repository_id: 123,
      head_branch: "ci-reuse",
      head_sha: sha("d"),
    },
  };
  const jobs = {
    total_count: expectedJobs.length,
    jobs: expectedJobs.map((name, index) => ({
      id: index + 1,
      name,
      run_id: 100,
      run_attempt: 1,
      head_sha: sha("d"),
      status: "completed",
      conclusion: "success",
    })),
  };
  const tested = {
    sha: sha("a"),
    tree: { sha: sha("b") },
    parents: [{ sha: sha("c") }, { sha: sha("d") }],
  };
  // The commit-associated list uses pull-request-simple, not the detailed PR object.
  // GitHub actions/download-artifact commit9000827.../pulls readback has merged_at but no merged.
  const { merged, ...prSummary } = pr;
  assert.equal(merged, true);
  prSummary.merged_at = "2026-10-10T10:30:00Z";
  const routes = {
    [`/commits/${sha("f")}/pulls?per_page=100`]: [prSummary],
    "/pulls/7": pr,
    [`/actions/workflows/check.yml/runs?event=pull_request&head_sha=${sha("d")}&per_page=100`]:
      { total_count: 1, workflow_runs: [run] },
    "/actions/runs/100/artifacts?per_page=100": {
      total_count: 1,
      artifacts: [artifact],
    },
    "/actions/runs/100": run,
    "/actions/artifacts/300": artifact,
    [`/git/commits/${sha("a")}`]: tested,
    "/actions/runs/100/jobs?filter=latest&per_page=100": jobs,
  };
  const read = async (path) => {
    assert.ok(Object.hasOwn(routes, path), path);
    return structuredClone(routes[path]);
  };
  return {
    context: current,
    matrix: structuredClone(matrix),
    hosts,
    receipt,
    selection: { pr, run, artifact },
    read,
    routes,
    now,
    needs,
    run,
    artifact,
    jobs,
    tested,
  };
}

test("an ordinary merge reuses complete authenticated PR evidence, recording its original identity", async () => {
  const input = fixture();
  assert.equal(
    Object.hasOwn(
      input.routes[`/commits/${sha("f")}/pulls?per_page=100`][0],
      "merged",
    ),
    false,
  );
  const selection = await selectProof(input);
  const result = await verifyProof({ ...input, selection });
  assert.deepEqual(result, {
    mode: "REUSED",
    sourceRun: 100,
    sourceAttempt: 1,
    sourceCommit: sha("a"),
    artifactId: 300,
    artifactDigest: `sha256:${"a".repeat(64)}`,
  });
});

for (const [name, change] of [
  ["missing lane", (input) => input.receipt.lanes.pop()],
  [
    "duplicate lane",
    (input) => (input.receipt.lanes[0] = input.receipt.lanes[1]),
  ],
  [
    "foreign repository",
    (input) =>
      (input.run.repository = { id: 456, full_name: "elsewhere/repo" }),
  ],
  [
    "foreign artifact",
    (input) => (input.artifact.workflow_run.repository_id = 456),
  ],
  [
    "wrong workflow",
    (input) => (input.run.path = ".github/workflows/candidate.yml"),
  ],
  ["failed source", (input) => (input.run.conclusion = "failure")],
  ["pending source", (input) => (input.run.status = "in_progress")],
  ["source rerun", (input) => (input.run.run_attempt = 2)],
  ["missing job", (input) => input.jobs.jobs.pop()],
  [
    "duplicate job",
    (input) => (input.jobs.jobs[0].name = input.jobs.jobs[1].name),
  ],
  ["skipped job", (input) => (input.jobs.jobs[0].conclusion = "skipped")],
  ["cancelled job", (input) => (input.jobs.jobs[0].conclusion = "cancelled")],
  ["mixed attempt", (input) => (input.jobs.jobs[0].run_attempt = 2)],
  ["wrong job source", (input) => (input.jobs.jobs[0].head_sha = sha("f"))],
  ["wrong tree", (input) => (input.tested.tree.sha = sha("f"))],
  ["wrong parents", (input) => input.tested.parents.reverse()],
  [
    "wrong workflow blob",
    (input) => (input.receipt.snapshot.workflow = sha("f")),
  ],
  ["changed Node selection", (input) => input.matrix.node.push("26.11.1")],
  [
    "changed image",
    (input) =>
      (input.hosts[0].host = {
        ...input.hosts[0].host,
        imageVersion: "20261010.1.0",
      }),
  ],
  [
    "changed Python",
    (input) =>
      (input.hosts[0].host = {
        ...input.hosts[0].host,
        python: "Python 3.14.9",
      }),
  ],
  [
    "changed npm",
    (input) =>
      (input.hosts[0].host = { ...input.hosts[0].host, npm: "12.3.0" }),
  ],
  ["expired artifact", (input) => (input.artifact.expired = true)],
  [
    "past expiry",
    (input) => (input.artifact.expires_at = "2026-10-09T10:00:00Z"),
  ],
  [
    "changed digest",
    (input) => (input.artifact.digest = `sha256:${"b".repeat(64)}`),
  ],
  ["missing digest", (input) => delete input.artifact.digest],
  ["unknown receipt schema", (input) => (input.receipt.schemaVersion = 2)],
  ["reuse chain", (input) => (input.receipt.mode = "REUSED")],
  [
    "future receipt",
    (input) => (input.receipt.recordedAt = "2026-10-11T10:00:00Z"),
  ],
  [
    "receipt predates attempt",
    (input) => (input.receipt.recordedAt = "2026-10-10T09:00:00Z"),
  ],
  [
    "foreign PR head",
    (input) =>
      (input.selection.pr.head.repo = { id: 456, full_name: "elsewhere/repo" }),
  ],
])
  test(`proof admission refuses ${name}`, async () => {
    const input = fixture();
    // Selection is a frozen observation, independent of mutable provider responses.
    input.selection = structuredClone(input.selection);
    change(input);
    if (name === "foreign PR head")
      input.routes["/pulls/7"] = input.selection.pr;
    await assert.rejects(verifyProof(input));
  });

for (const [name, change] of [
  ["PR event", (input) => (input.context.eventName = "pull_request")],
  ["forced push", (input) => (input.context.event.forced = true)],
  ["direct or squash commit", (input) => input.context.snapshot.parents.pop()],
  ["multiple merge push", (input) => (input.context.event.before = sha("a"))],
  ["branch creation", (input) => (input.context.event.created = true)],
  [
    "unmerged PR summary",
    (input) =>
      (input.routes[`/commits/${sha("f")}/pulls?per_page=100`][0].merged_at =
        null),
  ],
  ["unmerged PR detail", (input) => (input.routes["/pulls/7"].merged = false)],
  [
    "ambiguous PRs",
    (input) =>
      input.routes[`/commits/${sha("f")}/pulls?per_page=100`].push(
        structuredClone(
          input.routes[`/commits/${sha("f")}/pulls?per_page=100`][0],
        ),
      ),
  ],
  [
    "truncated run inventory",
    (input) =>
      (input.routes[
        `/actions/workflows/check.yml/runs?event=pull_request&head_sha=${sha("d")}&per_page=100`
      ].total_count = 101),
  ],
  [
    "truncated artifact inventory",
    (input) =>
      (input.routes["/actions/runs/100/artifacts?per_page=100"].total_count =
        101),
  ],
])
  test(`discovery refuses ${name}`, async () => {
    const input = fixture();
    change(input);
    await assert.rejects(selectProof(input));
  });

test("source state is rechecked after job admission", async () => {
  for (const path of ["/actions/runs/100", "/actions/artifacts/300"]) {
    const input = fixture();
    let visits = 0;
    const read = async (requested) => {
      const result = await input.read(requested);
      if (requested === path && ++visits === 2) {
        if (path.endsWith("100")) result.run_attempt++;
        else result.expired = true;
      }
      return result;
    };
    await assert.rejects(verifyProof({ ...input, read }));
  }
});

test("retained evidence older than one day has no arbitrary age cutoff", async () => {
  const input = fixture();
  input.now = Date.parse("2026-10-12T11:00:00Z");
  assert.equal((await verifyProof(input)).mode, "REUSED");
});

test("failed tests cannot pass, while optional evidence failures permit only fresh qualification", () => {
  for (const reused of [false, true]) {
    const input = fixture();
    input.needs.package.result = reused ? "skipped" : "success";
    requireResults(input.needs, reused);
    for (const name of reused
      ? ["matrix", "probe", "strategy", "package"]
      : ["matrix", "package"]) {
      for (const result of ["failure", "cancelled"]) {
        const needs = structuredClone(input.needs);
        needs[name].result = result;
        assert.throws(() => requireResults(needs, reused));
      }
    }
  }
  for (const name of ["probe", "strategy"]) {
    for (const result of ["failure", "cancelled", "skipped"]) {
      const input = fixture();
      input.needs[name].result = result;
      requireResults(input.needs);
      assert.throws(
        () =>
          createReceipt({
            context,
            matrix,
            lanes: lanes(),
            needs: input.needs,
          }),
        /Optional evidence graph/u,
      );
    }
  }
});

test("artifact readers refuse extra files, missing lanes and symbolic-link-shaped inventories", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ci-reuse-artifacts-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "receipt.json"),
    JSON.stringify({ schemaVersion: 1 }),
  );
  assert.equal(readProofArtifact(root, "package-proof-100-1").schemaVersion, 1);
  writeFileSync(join(root, "extra.json"), "{}");
  assert.throws(() => readProofArtifact(root, "package-proof-100-1"));
  assert.throws(() => readLaneArtifacts(root, matrix, "probe", 1));
});

test("lane artifact acquisition reads only the selected run attempt", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ci-reuse-attempt-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const input = fixture();
  for (const record of input.hosts) {
    const directory = join(
      root,
      `probe-${record.lane.os}-${record.lane.node}-attempt-2`,
    );
    mkdirSync(directory);
    writeFileSync(join(directory, "lane.json"), JSON.stringify(record));
  }
  const byLane = (records) =>
    records.map((record) => JSON.stringify(record)).sort();
  assert.deepEqual(
    byLane(readLaneArtifacts(root, matrix, "probe", 2)),
    byLane(input.hosts),
  );
  assert.throws(() => readLaneArtifacts(root, matrix, "probe", 1));
});

test("Git extraction reads the real parent and workflow identities even from raw commits", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ci-reuse-git-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  git("init", "-q");
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github", "workflows", "check.yml"),
    "name: fixture\n",
  );
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  );
  const first = git("rev-parse", "HEAD");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--allow-empty",
    "-qm",
    "second",
  );
  const snapshot = gitSnapshot(root);
  assert.deepEqual(snapshot.parents, [first]);
  assert.equal(
    snapshot.workflow,
    git("rev-parse", "HEAD:.github/workflows/check.yml"),
  );
  assert.equal(snapshot.tree, git("rev-parse", "HEAD^{tree}"));
});

test("GitHub reader refuses redirects, errors, oversized input, path escape and excessive calls", async () => {
  const read = repositoryReader("fixture-token", async (url, options) => {
    assert.equal(
      url,
      "https://api.github.com/repos/Hadden-Industries/markdown-quality/pulls/7",
    );
    assert.equal(options.redirect, "error");
    return new Response('{"number":7}');
  });
  assert.deepEqual(await read("/pulls/7"), { number: 7 });
  await assert.rejects(read("https://elsewhere.invalid"));
  for (const response of [
    new Response("{}", { status: 403 }),
    new Response("x".repeat(2_097_153)),
  ])
    await assert.rejects(
      repositoryReader("fixture-token", async () => response)("/pulls/7"),
    );
  for (let index = 0; index < 28; index++) await read("/pulls/7");
  await assert.rejects(read("/pulls/7"));
});

test("real command selects full testing on missing API authority or failed proof transport and rejects failed tests", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ci-reuse-command-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = gitSnapshot();
  const input = fixture();
  const event = {
    ...input.context.event,
    after: snapshot.commit,
    before: snapshot.parents[0],
  };
  writeFileSync(join(root, "event.json"), JSON.stringify(event));
  const env = {
    ...process.env,
    RUNNER_TEMP: root,
    GH_TOKEN: "",
    GITHUB_REPOSITORY: context.repository,
    GITHUB_REPOSITORY_ID: "123",
    GITHUB_RUN_ID: "200",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: snapshot.commit,
    GITHUB_EVENT_NAME: "push",
    GITHUB_EVENT_PATH: join(root, "event.json"),
    GITHUB_OUTPUT: join(root, "outputs"),
    GITHUB_STEP_SUMMARY: join(root, "summary"),
    QUALIFICATION_MATRIX: JSON.stringify(matrix),
    PROOF_DOWNLOAD_OUTCOME: "failure",
    NEEDS_JSON: JSON.stringify({
      ...input.needs,
      package: { result: "failure" },
    }),
    REUSE: "false",
  };
  const command = fileURLToPath(
    new URL("../scripts/ci-reuse-command.js", import.meta.url),
  );
  for (const mode of ["select", "verify"]) {
    const result = spawnSync(process.execPath, [command, mode], {
      env,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
  }
  const outputs = readFileSync(env.GITHUB_OUTPUT, "utf8");
  assert.match(outputs, /available=false/u);
  assert.match(outputs, /reuse=false/u);
  assert.ok(!outputs.includes("reuse=true"));
  assert.match(
    readFileSync(env.GITHUB_STEP_SUMMARY, "utf8"),
    /Read-only GitHub token unavailable/u,
  );
  const failed = spawnSync(process.execPath, [command, "required"], {
    env,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Package jobs did not establish/u);
  // Optional evidence must never prevent a successful fresh test graph from passing.
  for (const broken of [
    { GITHUB_EVENT_PATH: join(root, "missing-event.json") },
    { QUALIFICATION_MATRIX: "invalid-json" },
    {}, // Executed lane artifacts are absent.
  ]) {
    const fresh = spawnSync(process.execPath, [command, "required"], {
      env: {
        ...env,
        NEEDS_JSON: JSON.stringify(input.needs),
        FALLBACK_REASON: "Missing retained receipt",
        ...broken,
      },
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(fresh.status, 0, fresh.stderr);
    assert.match(readFileSync(env.GITHUB_OUTPUT, "utf8"), /mode=FULL/u);
    assert.match(
      readFileSync(env.GITHUB_STEP_SUMMARY, "utf8"),
      /Reason: Missing retained receipt/u,
    );
    assert.ok(!existsSync(join(root, "package-ci-reuse", "receipt.json")));
  }
  const optional = spawnSync(process.execPath, [command, "select"], {
    env: { ...env, GITHUB_EVENT_PATH: join(root, "missing-event.json") },
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(optional.status, 0, optional.stderr);
});
