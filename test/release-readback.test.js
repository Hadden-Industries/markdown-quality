// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { verifyReleaseCompletion } from "../scripts/release-readback.js";
import { releasePackages } from "../scripts/release-coordinates.js";
import { native } from "../scripts/commands.js";
import { createRepositoryReader } from "../scripts/github-evidence.js";

test("native GitHub rate-limit deadline retains the earliest useful retry", async () => {
  let requests = 0;
  const read = createRepositoryReader({
    repository: "Hadden-Industries/markdown-quality",
    token: "fixture",
    now: () => 0,
    random: () => 0,
    fetchImpl: async () => {
      requests++;
      return new Response("limited", {
        status: 429,
        headers: { "retry-after": "400" },
      });
    },
  });
  const result = await verifyReleaseCompletion({
    operation,
    now: () => 0,
    readFamily: async () => operation.targets,
    readGithub: () => read("/releases/latest"),
  });
  assert.equal(requests, 1);
  assert.equal(result.status, "completion-unconfirmed");
  assert.equal(result.retryAt, 400000);
});
import { transientProviderRead } from "../scripts/release-readback.js";

test("native provider failures retain stdout, HTTP status and ordinary denial classification", () => {
  for (const status of [403, 503]) {
    let failure;
    try {
      native(process.execPath, [
        "-e",
        `process.stdout.write(JSON.stringify({status:${status}})); process.stderr.write('gh: request failed (HTTP ${status})'); process.exit(1);`,
      ]);
    } catch (error) {
      failure = error;
    }
    assert.equal(failure.httpStatus, status);
    assert.equal(JSON.parse(failure.stdout).status, status);
    assert.equal(Boolean(transientProviderRead(failure)), status === 503);
  }
});

const labels = (version) =>
  Object.fromEntries(releasePackages.map((name) => [name, version]));
const operation = {
  version: "4.0.0",
  releaseId: 42,
  priors: labels("3.0.1"),
  targets: labels("4.0.0"),
  priorGithubLatest: 12,
  targetGithubLatest: 42,
  priorPrerelease: true,
  targetPrerelease: false,
};
const github = (latest, prerelease) => ({
  release: {
    id: 42,
    tag_name: "v4.0.0",
    draft: false,
    immutable: true,
    prerelease,
  },
  latest: { id: latest },
});

test("initial stale reads and a transport reset converge inside one read-only family budget", async () => {
  let elapsed = 0,
    reads = 0;
  const deadlines = [];
  const result = await verifyReleaseCompletion({
    operation,
    now: () => elapsed,
    random: () => 0,
    sleep: async (ms) => {
      elapsed += ms;
    },
    readFamily: async (deadline) => {
      deadlines.push(deadline);
      elapsed += 100;
      if (++reads === 2)
        throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
      return labels(reads < 3 ? "3.0.1" : "4.0.0");
    },
    readGithub: async (deadline) => {
      deadlines.push(deadline);
      elapsed += 200;
      return github(reads < 3 ? 12 : 42, reads < 3);
    },
  });
  assert.equal(result.status, "complete");
  assert.equal(new Set(deadlines).size, 1);
  assert.ok(elapsed < 300000);
});

test("ordinary denial and a third value stop immediately; rate limits never restart the deadline", async () => {
  for (const error of [
    Object.assign(new Error("denied"), { httpStatus: 403 }),
    null,
  ]) {
    let calls = 0;
    await assert.rejects(
      verifyReleaseCompletion({
        operation,
        readFamily: async () => {
          calls++;
          if (error) throw error;
          return labels("5.0.0");
        },
        readGithub: async () =>
          assert.fail("Admission must stop before another provider read"),
      }),
    );
    assert.equal(calls, 1);
  }
  let calls = 0,
    elapsed = 0;
  const result = await verifyReleaseCompletion({
    operation,
    now: () => elapsed,
    random: () => 0,
    sleep: async (ms) => {
      elapsed += ms;
    },
    readFamily: async () => {
      calls++;
      elapsed += 1000;
      throw Object.assign(new Error("rate limit"), {
        httpStatus: 429,
        headers: { "retry-after": "400" },
      });
    },
    readGithub: async () =>
      assert.fail("No GitHub call after the exhausted rate limit"),
  });
  assert.equal(result.status, "completion-unconfirmed");
  assert.equal(calls, 1);
  assert.ok(elapsed <= 300000);
});
