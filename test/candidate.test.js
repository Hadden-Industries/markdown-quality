// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import * as api from "../src/quality.js";
import { consumer } from "./helpers.js";

const profile = {
  schemaVersion: 1,
  samples: 2,
  checkerMs: 30000,
  windowMs: 60000,
  memoryBytes: 536870912,
  nodeOldSpaceMb: 256,
  reportBytes: 8388608,
  requestBytes: 8388608,
  stagingBytes: 134217728,
  stagingEntries: 100000,
  limits: {},
  runtimes: {
    node: { file: ".node-version" },
    python: { file: ".python-version" },
  },
};

test("trusted staging treats candidate code/config as data and binds every staged byte", async (t) => {
  assert.equal(typeof api.stageCandidate, "function");
  const trustedRoot = consumer(
    t,
    { ".node-version": process.versions.node, ".python-version": "3.15.0" },
    { exclude: ["docs/reviews/*"] },
  );
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  const sourceRoot = consumer(t, {
    "README.md": "Alpha.\n",
    "docs/reviews/nested/bad.md": Buffer.from([0xff]),
    "candidate.js": "throw new Error('Candidate script ran');",
    ".gitignore": "README.md\n",
  });
  writeFileSync(
    join(sourceRoot, ".markdown-quality.json"),
    "candidate controls must not parse",
  );
  const scratch = consumer(t);
  const outputRoot = join(scratch, "staged");
  const staging = api.stageCandidate({ sourceRoot, trustedRoot, outputRoot });
  assert.equal(
    staging.configPath,
    ".markdown-quality-trusted-inputs/policy.json",
  );
  assert.deepEqual(
    readFileSync(join(outputRoot, staging.configPath)),
    readFileSync(join(trustedRoot, ".markdown-quality.json")),
  );
  const result = await api.executeQuality({
    mode: "check",
    root: outputRoot,
    config: staging.configPath,
    limits: staging.profile.limits,
  });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.selection.files, ["README.md"]);
  assert.equal(
    result.selection.exclusions[0].path,
    "docs/reviews/nested/bad.md",
  );
  assert.equal(
    readFileSync(join(outputRoot, "candidate.js"), "utf8"),
    "throw new Error('Candidate script ran');",
  );
  assert.equal(
    existsSync(join(sourceRoot, ".markdown-quality-trusted-inputs")),
    false,
  );
  assert.throws(
    () =>
      api.stageCandidate({
        sourceRoot,
        trustedRoot,
        outputRoot: join(sourceRoot, "staged"),
      }),
    { code: "UNSAFE_STAGING" },
  );
});

test("trusted staging rejects reserved inputs, links and admission overflow before checking", (t) => {
  assert.equal(typeof api.stageCandidate, "function");
  const trustedRoot = consumer(t, {
    ".node-version": process.versions.node,
    ".python-version": "3.15.0",
  });
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify({ ...profile, stagingBytes: 4 }),
  );
  const sourceRoot = consumer(t, { "README.md": "Alpha.\n" });
  const scratch = consumer(t);
  assert.throws(
    () =>
      api.stageCandidate({
        sourceRoot,
        trustedRoot,
        outputRoot: join(scratch, "staged"),
      }),
    { code: "STAGING_LIMIT" },
  );
  assert.equal(existsSync(join(scratch, "staged")), false);
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  mkdirSync(join(sourceRoot, ".markdown-quality-trusted-inputs"));
  assert.throws(
    () =>
      api.stageCandidate({
        sourceRoot,
        trustedRoot,
        outputRoot: join(scratch, "reserved"),
      }),
    { code: "RESERVED_PATH" },
  );
  const linkedSource = consumer(t, { "README.md": "Alpha.\n" });
  symlinkSync(
    trustedRoot,
    join(linkedSource, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () =>
      api.stageCandidate({
        sourceRoot: linkedSource,
        trustedRoot,
        outputRoot: join(scratch, "linked"),
      }),
    { code: "UNSAFE_STAGING" },
  );
});
