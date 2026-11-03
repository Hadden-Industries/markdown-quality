// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as api from "../src/quality.js";
import { canonicalJson } from "../src/contracts.js";
import { consumer } from "./helpers.js";

const profile = {
  schemaVersion: 2,
  requiredConsecutiveSamples: 2,
  executionTimeoutMs: 30000,
  sampleTimeoutMs: 60000,
  maxObservedMemoryBytes: 536870912,
  maxNodeOldGenerationMiB: 256,
  maxOutputBytes: 8388608,
  maxRequestBytes: 8388608,
  maxStagedDataBytes: 134217728,
  maxStagedEntries: 100000,
  analyzerLimits: {},
  runtimes: {
    node: { file: ".node-version" },
    python: { file: ".python-version" },
  },
};

test("trusted staging treats candidate code/config as data and binds every staged byte", async (t) => {
  assert.equal(typeof api.stageCandidateData, "function");
  assert.equal(api.stageCandidate, undefined);
  const trustedRoot = consumer(
    t,
    { ".node-version": process.versions.node, ".python-version": "3.15.0" },
    { exclude: ["docs/reviews/*"] },
  );
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  const candidateRoot = consumer(t, {
    "README.md": "Alpha.\n",
    "docs/reviews/nested/bad.md": Buffer.from([0xff]),
    "candidate.js": "throw new Error('Candidate script ran');",
    ".gitignore": "README.md\n",
  });
  writeFileSync(
    join(candidateRoot, ".markdown-quality.json"),
    "candidate controls must not parse",
  );
  const scratch = consumer(t);
  const outputRoot = join(scratch, "staged");
  const staging = api.stageCandidateData({
    candidateRoot,
    trustedRoot,
    outputRoot,
  });
  assert.equal(
    staging.configPath,
    ".markdown-quality-trusted-inputs/policy.json",
  );
  assert.equal(staging.configurationSource.kind, "file");
  const snapshot = readFileSync(join(outputRoot, staging.configPath), "utf8");
  // The snapshot is the canonical complete effective trusted configuration, not a byte copy.
  assert.notEqual(
    snapshot,
    readFileSync(join(trustedRoot, ".markdown-quality.json"), "utf8"),
  );
  const effective = JSON.parse(snapshot);
  assert.equal(snapshot, canonicalJson(effective) + "\n");
  assert.equal(effective.schemaVersion, 3);
  assert.deepEqual(effective.exclude, ["docs/reviews/*"]);
  const result = await api.executeQualityRequest({
    mode: "check",
    root: outputRoot,
    config: staging.configPath,
    analyzerLimits: staging.profile.analyzerLimits,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.operationStatus, "completed");
  assert.deepEqual(result.selection.files, ["README.md"]);
  assert.equal(
    result.selection.omissions[0].path,
    "docs/reviews/nested/bad.md",
  );
  assert.equal(
    readFileSync(join(outputRoot, "candidate.js"), "utf8"),
    "throw new Error('Candidate script ran');",
  );
  assert.equal(
    existsSync(join(candidateRoot, ".markdown-quality-trusted-inputs")),
    false,
  );
  assert.throws(
    () =>
      api.stageCandidateData({
        candidateRoot,
        trustedRoot,
        outputRoot: join(candidateRoot, "staged"),
      }),
    { code: "UNSAFE_STAGING" },
  );
});

test("trusted absence of configuration stages package defaults and keeps candidate policy as data", async (t) => {
  const trustedRoot = mkdtempSync(join(tmpdir(), "markdown-quality-trusted-"));
  t.after(() => rmSync(trustedRoot, { recursive: true, force: true }));
  writeFileSync(join(trustedRoot, ".node-version"), process.versions.node);
  writeFileSync(join(trustedRoot, ".python-version"), "3.15.0");
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  // json-identity-contract: bytes; owner: candidate staging fixture; reason: The staged candidate file must retain these exact serialized bytes as data.
  const candidateConfig = JSON.stringify({
    lint: { "quality/non-nfc-prose": "off" },
  });
  const candidateRoot = consumer(t, { "README.md": "Alpha.\n" });
  writeFileSync(join(candidateRoot, ".markdown-quality.json"), candidateConfig);
  const reference = mkdtempSync(join(tmpdir(), "markdown-quality-default-"));
  t.after(() => rmSync(reference, { recursive: true, force: true }));
  writeFileSync(join(reference, "package.json"), "{}");
  const defaults = await api.executeQualityRequest({
    mode: "inspect",
    root: reference,
  });
  const scratch = consumer(t);
  const outputRoot = join(scratch, "staged");
  const staging = api.stageCandidateData({
    candidateRoot,
    trustedRoot,
    outputRoot,
  });
  assert.equal(staging.configurationSource.kind, "default-absent");
  assert.equal(staging.configurationSource.bytesSha256, null);
  const snapshot = readFileSync(join(outputRoot, staging.configPath), "utf8");
  assert.deepEqual(JSON.parse(snapshot), defaults.configuration);
  // The candidate file is staged only as opaque data, never as policy.
  assert.equal(
    readFileSync(join(outputRoot, ".markdown-quality.json"), "utf8"),
    candidateConfig,
  );
  const result = await api.executeQualityRequest({
    mode: "check",
    root: outputRoot,
    config: staging.configPath,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(
    result.effectiveConfigurationSha256,
    defaults.effectiveConfigurationSha256,
  );
});

test("trusted staging rejects reserved inputs, links and admission overflow before checking", (t) => {
  assert.equal(typeof api.stageCandidateData, "function");
  const trustedRoot = consumer(t, {
    ".node-version": process.versions.node,
    ".python-version": "3.15.0",
  });
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify({ ...profile, maxStagedDataBytes: 4 }),
  );
  const candidateRoot = consumer(t, { "README.md": "Alpha.\n" });
  const scratch = consumer(t);
  assert.throws(
    () =>
      api.stageCandidateData({
        candidateRoot,
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
  mkdirSync(join(candidateRoot, ".markdown-quality-trusted-inputs"));
  assert.throws(
    () =>
      api.stageCandidateData({
        candidateRoot,
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
      api.stageCandidateData({
        candidateRoot: linkedSource,
        trustedRoot,
        outputRoot: join(scratch, "linked"),
      }),
    { code: "UNSAFE_STAGING" },
  );
});
