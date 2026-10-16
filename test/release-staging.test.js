// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageReleaseArchive } from "../scripts/stage-release-package.js";
import { verifyReleaseTag } from "../scripts/verify-release-tag.js";
import { bindStagingReconciliation } from "../scripts/release-staging-evidence.js";
import {
  verifyPublicationHistory,
  attemptedPublicationJobs,
  readPublicationHistory,
} from "../scripts/publication-history.js";
import { stagingSteps } from "../scripts/publication-origins.js";

test("an unsigned source tag cannot authorize staging", () => {
  const release = { version: "2.0.0", source: { head: "a".repeat(40) } };
  const reference = {
    ref: "refs/tags/v2.0.0",
    object: { type: "tag", sha: "b".repeat(40) },
  };
  const annotation = {
    sha: "b".repeat(40),
    tag: "v2.0.0",
    object: { type: "commit", sha: release.source.head },
    verification: { verified: true, reason: "valid" },
  };
  verifyReleaseTag(reference, annotation, release);
  annotation.verification = { verified: false, reason: "unsigned" };
  assert.throws(() => verifyReleaseTag(reference, annotation, release));
});

for (const outcome of [
  "returned",
  "timeout",
  "wrong-integrity",
  "missing-stage-id",
])
  test(`one staging request retains a durable ${outcome} result and cannot replay`, (t) => {
    const directory = mkdtempSync(join(tmpdir(), "release-stage-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const archive = {
      name: "core",
      package: "@hadden-industries/markdown-quality",
      version: "2.0.0",
      sha256: createHash("sha256").update("approved").digest("hex"),
      integrity: `sha512-${createHash("sha512").update("approved").digest("base64")}`,
    };
    const path = join(directory, "archive.tgz");
    writeFileSync(path, "approved");
    const journalDirectory = join(directory, "journal");
    let calls = 0;
    const input = {
      archive,
      path,
      journalDirectory,
      origin: { source: "a".repeat(40), run: "123", attempt: "2" },
      command(args) {
        calls++;
        assert.deepEqual(args, [
          "stage",
          "publish",
          path,
          "--ignore-scripts",
          "--access=public",
          "--tag=pilot",
          "--provenance",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ]);
        assert.equal(
          JSON.parse(
            readFileSync(join(journalDirectory, "core.jsonl"), "utf8").trim(),
          ).state,
          "attempted",
          "Intent is durable before the external effect",
        );
        if (outcome === "timeout") throw new Error("provider outcome unknown");
        return JSON.stringify({
          [archive.package]: {
            name: archive.package,
            version: archive.version,
            integrity:
              outcome === "wrong-integrity" ? "different" : archive.integrity,
            ...(outcome === "missing-stage-id"
              ? {}
              : { stageId: "provider-stage-123" }),
          },
        });
      },
    };
    if (outcome === "returned")
      assert.equal(stageReleaseArchive(input).state, "staged-awaiting-owner");
    else assert.throws(() => stageReleaseArchive(input));
    assert.equal(calls, 1);
    const original = readFileSync(join(journalDirectory, "core.jsonl"));
    const reconciliation = bindStagingReconciliation(
      original,
      archive,
      input.origin,
      {
        publication: { run: "999", attempt: "1" },
        reports: {
          "registry.json": {
            qualification: "public registry",
            sha256: "b".repeat(64),
          },
        },
      },
    );
    assert.equal(
      reconciliation.journalSha256,
      createHash("sha256").update(original).digest("hex"),
    );
    assert.equal(reconciliation.origin.run, "123");
    assert.throws(() =>
      bindStagingReconciliation(
        original,
        { ...archive, integrity: "replaced" },
        input.origin,
        {},
      ),
    );
    const journal = readFileSync(join(journalDirectory, "core.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      journal.map(({ state }) => state),
      [
        "attempted",
        outcome === "returned" ? "staged-awaiting-owner" : "outcome-unknown",
      ],
    );
    assert.throws(() => stageReleaseArchive(input));
    assert.equal(calls, 1);
  });

test("a replaced archive is rejected before any registry stage request", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "release-stage-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const archive = {
    name: "win32-x64",
    package: "@hadden-industries/markdown-quality-win32-x64",
    version: "2.0.0",
    sha256: createHash("sha256").update("approved").digest("hex"),
    integrity: `sha512-${createHash("sha512").update("approved").digest("base64")}`,
  };
  const path = join(directory, "archive.tgz");
  writeFileSync(path, "replacement");
  let calls = 0;
  assert.throws(() =>
    stageReleaseArchive({
      archive,
      path,
      journalDirectory: join(directory, "journal"),
      origin: { source: "a".repeat(40), run: "123", attempt: "1" },
      command: () => {
        calls++;
        return "{}";
      },
    }),
  );
  assert.equal(calls, 0, "No stage effect is authorized for different bytes");
});

test("new dispatches cannot omit prior requests, replace bytes or reuse stale core recovery", () => {
  const release = {
    version: "2.0.0",
    archives: ["win32-x64", "linux-x64", "core"].map((name) => ({
      package: name,
      sha256: "a".repeat(64),
      integrity: "original",
    })),
  };
  const map = {
    attempt: "1",
    records: release.archives.map(({ package: name }) => ({
      package: name,
      source: "b".repeat(40),
      run: "10",
      attempt: "1",
      state: "retained",
    })),
  };
  const run = {
    id: 10,
    run_number: 1,
    head_sha: "b".repeat(40),
    status: "completed",
    event: "workflow_dispatch",
    path: ".github/workflows/publish.yml",
    head_branch: "main",
    repository: { full_name: "Hadden-Industries/markdown-quality" },
  };
  const job = {
    name: "stage",
    run_id: 10,
    run_attempt: 1,
    head_sha: run.head_sha,
    status: "completed",
    conclusion: "failure",
    steps: stagingSteps.map((name) => ({
      name,
      status: "completed",
      conclusion: "failure",
    })),
  };
  const history = [
    {
      run,
      jobs: { total_count: 1, jobs: [job] },
      manifestBytes: Buffer.from(JSON.stringify(release)),
    },
  ];
  verifyPublicationHistory(release, map, history);
  for (const index of [0, 1, 2]) {
    const changed = structuredClone(map);
    changed.records[index].state = "planned";
    assert.throws(
      () => verifyPublicationHistory(release, changed, history),
      /replay/u,
    );
    changed.records[index] = { ...map.records[index], run: "9" };
    assert.throws(
      () => verifyPublicationHistory(release, changed, history),
      /origin/u,
    );
  }
  assert.throws(
    () => verifyPublicationHistory(release, { ...map, attempt: "2" }, history),
    /never rerun/u,
  );
  assert.throws(
    () =>
      verifyPublicationHistory(release, map, [
        { ...history[0], manifestBytes: null },
      ]),
    /Missing prior/u,
  );
  assert.throws(
    () => attemptedPublicationJobs({ total_count: 2, jobs: [job] }),
    /Truncated/u,
  );
  verifyPublicationHistory(release, map, [
    {
      run: { ...run, event: "push", head_branch: "old-branch" },
      jobs: { total_count: 0, jobs: [] },
    },
  ]);
  verifyPublicationHistory(release, map, [
    { run: { ...run, status: "queued" }, jobs: { total_count: 0, jobs: [] } },
  ]);
  assert.throws(
    () =>
      verifyPublicationHistory(release, map, [
        {
          run: { ...run, status: "in_progress" },
          jobs: { total_count: 0, jobs: [] },
        },
      ]),
    /still execute/u,
  );
  const changed = structuredClone(release);
  changed.archives[2].sha256 = "c".repeat(64);
  assert.throws(
    () => verifyPublicationHistory(changed, map, history),
    /change bytes/u,
  );
  job.steps.forEach((step) => {
    step.conclusion = "skipped";
  });
  verifyPublicationHistory(
    release,
    {
      ...map,
      records: map.records.map((record) => ({ ...record, state: "planned" })),
    },
    history,
  );
});

test("native workflow inventory must be complete before any history can authorize effects", () => {
  assert.throws(
    () =>
      readPublicationHistory("11", () =>
        JSON.stringify([
          { total_count: 2, workflow_runs: [{ id: 11, run_number: 2 }] },
        ]),
      ),
    /Incomplete/u,
  );
});

test("history includes later dispatches because concurrency does not guarantee dispatch order", () => {
  const calls = [];
  const history = readPublicationHistory("11", (args) => {
    calls.push(args);
    if (args[1].includes("workflows/publish.yml/runs"))
      return JSON.stringify([
        {
          total_count: 2,
          workflow_runs: [
            { id: 11, run_number: 2 },
            { id: 12, run_number: 3 },
          ],
        },
      ]);
    assert.ok(args[1].includes("runs/12/jobs?filter=all"));
    return JSON.stringify([{ total_count: 0, jobs: [] }]);
  });
  assert.deepEqual(
    history.map(({ run }) => run.id),
    [12],
  );
  assert.equal(calls.length, 2);
});

test("public consumer lanes keep their Node runtime while provenance uses compatible pinned tooling", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release-registry.yml", import.meta.url),
    "utf8",
  );
  const steps = workflow.slice(
    workflow.indexOf("  registry:\n"),
    workflow.indexOf("  security:\n"),
  );
  const tool = steps.indexOf("- id: provenance-tool");
  const consumer = steps.indexOf("node-version: ${{ matrix.node }}");
  assert.ok(tool > 0 && consumer > tool);
  assert.ok(
    steps
      .slice(0, tool)
      .includes("node-version: ${{ needs.admit.outputs.reference }}"),
  );
  assert.ok(steps.indexOf("verify-public-tuple.js") > consumer);
  assert.ok(
    steps.includes(
      "PROVENANCE_NODE: ${{ steps.provenance-tool.outputs.node-executable }}",
    ),
  );
});
