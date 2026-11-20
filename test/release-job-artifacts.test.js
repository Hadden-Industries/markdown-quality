// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { producedArtifacts } from "../scripts/release-job-artifacts.js";

function fixture() {
  const repo = { id: 77, full_name: "Hadden-Industries/markdown-quality" };
  const run = {
    id: 123,
    run_attempt: 2,
    repository: repo,
    head_repository: repo,
    head_sha: "a".repeat(40),
    head_branch: "main",
    event: "workflow_dispatch",
    path: ".github/workflows/release-registry.yml",
  };
  const rows = (attempt) =>
    ["admit", "registry (windows, 26)", "security"].map((name, i) => {
      const original = i === 0 ? 1 : attempt;
      return {
        id: attempt * 10 + i,
        name,
        run_id: 123,
        run_attempt: attempt,
        head_sha: run.head_sha,
        runner_id: original * 10 + i,
        started_at: `2026-11-01T00:0${original}:00Z`,
        completed_at: `2026-11-01T00:0${original}:10Z`,
        status: "completed",
        conclusion: "success",
        steps: [
          {
            name: "Retain recipient security inputs for this execution",
            status: "completed",
            conclusion: "success",
          },
        ],
      };
    });
  const earlier = { jobs: rows(1), total_count: 3 },
    latest = { jobs: rows(2), total_count: 3 };
  const assets = new Map([
    ["public-release-inputs-1", 100],
    ["recipient-windows-2", 101],
    ["public-release-security-2", 102],
    ["recipient-windows", 103],
  ]);
  const acquired = [];
  const read = async (path) => {
    if (path === "/actions/runs/123/attempts/1/jobs?per_page=100")
      return earlier;
    const name = new URL(path, "https://api.github.com").searchParams.get(
      "name",
    );
    if (!assets.has(name)) return { total_count: 0, artifacts: [] };
    return {
      total_count: 1,
      artifacts: [
        {
          name,
          id: assets.get(name),
          expired: false,
          digest: "sha256:" + "a".repeat(64),
          created_at:
            name === "public-release-inputs-1"
              ? "2026-11-01T00:01:04Z"
              : "2026-11-01T00:02:04Z",
        },
      ],
    };
  };
  const acquire = () =>
    producedArtifacts(
      { run, jobs: latest },
      {
        read,
        download: async (options) => {
          acquired.push([
            options.id,
            options.expectedArtifact.name,
            options.runId,
            options.headSha,
          ]);
        },
      },
    );
  return { run, earlier, latest, assets, acquired, acquire };
}

test("registry evidence selects the original immutable artifact for each latest successful job", async () => {
  const f = fixture(),
    acquire = f.acquire();
  await acquire("admit", "public-release-inputs", "frozen");
  await acquire("registry (windows, 26)", "recipient-windows", "inputs", {
    recipient: true,
  });
  await acquire("security", "public-release-security", "security");
  assert.deepEqual(
    f.acquired.map((a) => a.slice(0, 2)),
    [
      [100, "public-release-inputs-1"],
      [101, "recipient-windows-2"],
      [102, "public-release-security-2"],
    ],
  );
  assert.ok(f.acquired.every((a) => a[2] === 123 && a[3] === f.run.head_sha));
});

test("an absent modern recipient artifact cannot fall back to a stale legacy name", async () => {
  const f = fixture();
  f.assets.delete("recipient-windows-2");
  await assert.rejects(
    f.acquire()("registry (windows, 26)", "recipient-windows", "unused", {
      recipient: true,
    }),
    /original release artifact/u,
  );
  assert.equal(f.acquired.length, 0);
});

test("a relabelled success cannot obscure an intervening failed execution", async () => {
  const f = fixture();
  const third = structuredClone(f.latest);
  for (const job of third.jobs) job.run_attempt = 3;
  const failed = f.latest.jobs[0];
  failed.conclusion = "failure";
  failed.runner_id++;
  const acquire = producedArtifacts(
    { run: { ...f.run, run_attempt: 3 }, jobs: third },
    {
      read: async (path) => {
        if (path.endsWith("/attempts/1/jobs?per_page=100")) return f.earlier;
        if (path.endsWith("/attempts/2/jobs?per_page=100")) return f.latest;
        assert.fail("Superseded job cannot authorize an artifact read");
      },
    },
  );
  await assert.rejects(
    acquire("admit", "public-release-inputs", "unused"),
    /superseded/u,
  );
});

test("the original two successful legacy uploads keep their historic recipient name", async () => {
  const f = fixture();
  const steps = Array.from({ length: 2 }, () => ({
    name: "Run actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9",
    status: "completed",
    conclusion: "success",
  }));
  f.latest.jobs[1].steps = steps;
  await f.acquire()("registry (windows, 26)", "recipient-windows", "inputs", {
    recipient: true,
  });
  assert.equal(f.acquired[0][0], 103);
  steps.pop();
  await assert.rejects(
    f.acquire()("registry (windows, 26)", "recipient-windows", "inputs", {
      recipient: true,
    }),
    /Unrecognized/u,
  );
});

test("an older successful producer cannot replace missing, failed, ambiguous or foreign release evidence", async () => {
  for (const fault of [
    "missing",
    "failed",
    "duplicate",
    "foreign",
    "truncated",
    "unobservable",
  ]) {
    const f = fixture();
    if (fault === "missing") f.latest.jobs.splice(2, 1);
    if (fault === "failed") f.latest.jobs[2].conclusion = "failure";
    if (fault === "duplicate") {
      f.latest.jobs.push(f.latest.jobs[2]);
      f.latest.total_count++;
    }
    if (fault === "foreign") f.latest.jobs[2].head_sha = "b".repeat(40);
    if (fault === "truncated") f.earlier.total_count++;
    if (fault === "unobservable") delete f.latest.jobs[2].runner_id;
    await assert.rejects(async () =>
      f.acquire()("security", "public-release-security", "unused"),
    );
    assert.equal(f.acquired.length, 0);
  }
});
