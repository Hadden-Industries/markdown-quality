// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import {
  readExecutionProfile,
  qualifyGitMarkdown,
  validateQualityResult,
} from "../src/quality.js";
import { consumer } from "./helpers.js";
import { packageQualificationEvidence } from "../src/qualification-evidence.js";

import {
  git,
  python,
  pythonVersion as version,
  freezeFixture,
} from "./qualification-host.js";
const freeze = (root) => freezeFixture(root, "fixture");

test("bundled Windows/Linux observer runs real full trusted staging and detects blockers", (t) => {
  const trustedRoot = consumer(t, {
    ".node-version": process.versions.node,
    ".python-version": version,
  });
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify({
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
    }),
  );
  const trustedCommitId = freeze(trustedRoot);
  const candidateRoot = consumer(t, {
    "README.md": "# Heading!\n\nAlpha.\n",
    "candidate.mjs": "throw new Error('Never execute this');",
  });
  const candidateCommitId = freeze(candidateRoot);
  const profile = readExecutionProfile({
    root: trustedRoot,
    purpose: "qualification",
  });
  const scratch = consumer(t);
  const request = {
    candidateRoot,
    trustedRoot,
    candidateCommitId,
    trustedCommitId,
    gitExecutablePath: git,
    profile,
    producer: { sourceCommitId: "a".repeat(40) },
  };
  for (const [name, mutation] of [
    ["passing", false],
    ["modified", true],
    ["replaced-object", "replacement"],
  ]) {
    if (mutation === true)
      writeFileSync(join(candidateRoot, "README.md"), "Alpha. Beta.\n");
    if (mutation === "replacement") {
      writeFileSync(join(candidateRoot, "README.md"), "Replacement.\n");
      const replacement = freeze(candidateRoot);
      execFileSync(git, [
        "-C",
        candidateRoot,
        "update-ref",
        "HEAD",
        candidateCommitId,
      ]);
      execFileSync(git, [
        "-C",
        candidateRoot,
        "replace",
        candidateCommitId,
        replacement,
      ]);
    }
    const output = join(scratch, name);
    mkdirSync(output);
    const requestPath = join(output, "request.json");
    writeFileSync(requestPath, JSON.stringify(request));
    const execution = spawnSync(
      python,
      [
        "-I",
        "-B",
        "assets/qualification/observe.py",
        process.execPath,
        fileURLToPath(
          new URL("../src/qualification-runner.js", import.meta.url),
        ),
        requestPath,
        output,
      ],
      { timeout: 120000, encoding: "utf8", windowsHide: true },
    );
    const report = JSON.parse(
      readFileSync(join(output, "window.json"), "utf8"),
    );
    assert.equal(
      report.passed,
      !mutation,
      execution.stderr + JSON.stringify(report),
    );
    if (!mutation) {
      assert.equal(execution.status, 0);
      assert.equal(report.schemaVersion, 2);
      assert.equal(report.samples.length, 2);
      assert.equal(
        report.maxObservedCheckDurationMs,
        Math.max(...report.samples.map((sample) => sample.checkerElapsedMs)),
      );
      for (const sample of report.samples) {
        const receipt = JSON.parse(
          readFileSync(join(output, sample.receiptPath), "utf8"),
        );
        assert.equal(sample.activeDescendants, 0);
        assert.ok(sample.peakObservedMemoryBytes > 0);
        assert.deepEqual(receipt.result.selection.files, ["README.md"]);
        assert.equal(receipt.schemaVersion, 2);
        assert.equal(receipt.candidate.commitId, candidateCommitId);
        assert.equal(receipt.trusted.commitId, trustedCommitId);
        assert.equal(receipt.result.operationStatus, "completed");
        assert.equal(receipt.result.qualityStatus, "findings");
        assert.equal(receipt.result.qualityBasis, "input");
        assert.equal(
          receipt.result.configurationOrigin.kind,
          "trusted-snapshot",
        );
        assert.ok(
          receipt.result.diagnostics.every((item) => item.severity === "info"),
        );
        assert.deepEqual(
          receipt.result.selection.reconciliationDecisions.map(
            (item) => item.path,
          ),
          ["README.md"],
        );
        validateQualityResult(receipt.result);
      }
      const compact = join(scratch, "compact-real-window");
      const packaged = packageQualificationEvidence({
        evidenceRoot: output,
        outputRoot: compact,
      });
      assert.equal(packaged.passed, true);
      assert.equal(packaged.samples.length, 2);
      assert.equal(
        packaged.samples[0].manifestPath,
        packaged.samples[1].manifestPath,
      );
    } else {
      assert.notEqual(execution.status, 0);
      assert.match(
        readFileSync(join(output, "sample-1", "stderr.txt"), "utf8"),
        /CHECKOUT_CHANGED/u,
      );
      assert.equal(report.failureCleanup, "quiescent");
    }
  }
});
test("public qualifier rejects overlapping trusted/candidate/output roots before acceptance", async (t) => {
  const root = consumer(t);
  await assert.rejects(
    qualifyGitMarkdown({
      candidateRoot: root,
      trustedRoot: root,
      outputRoot: join(root, "out"),
    }),
    { code: "UNSAFE_STAGING" },
  );
});

test("Linux observer retains failed qualification while waiting for descendant cleanup", () => {
  const result = spawnSync(
    python,
    ["-I", "-B", "test/qualification-observer.py"],
    { timeout: 30000, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("observer refuses delayed descendants and retains attributable cleanup failure evidence", (t) => {
  const scratch = consumer(t);
  const output = join(scratch, "observation");
  mkdirSync(output);
  const requestPath = join(output, "request.json");
  writeFileSync(
    requestPath,
    JSON.stringify({
      profile: {
        requiredConsecutiveSamples: 1,
        sampleTimeoutMs: 15000,
        maxObservedMemoryBytes: 536870912,
        maxNodeOldGenerationMiB: 256,
        maxOutputBytes: 8388608,
        executionTimeoutMs: 10000,
        cleanupTimeoutMs: null,
        resourceLimitMode: "configured",
        profileSha256: "a".repeat(64),
      },
    }),
  );
  const script = join(scratch, "delayed.mjs");
  // Windows libuv normally kills its non-detached children with the parent;
  // detachment proves the outer native Job still observes the delayed process.
  writeFileSync(
    script,
    "import {spawn} from 'node:child_process'; const child=spawn(process.execPath,['-e','setTimeout(()=>{},10000)'],{stdio:'ignore',windowsHide:true,detached:process.platform==='win32'}); child.unref(); setTimeout(()=>process.exit(0),150);",
  );
  const execution = spawnSync(
    python,
    [
      "-I",
      "-B",
      "assets/qualification/observe.py",
      process.execPath,
      script,
      requestPath,
      output,
    ],
    { timeout: 30000, encoding: "utf8", windowsHide: true },
  );
  const report = JSON.parse(readFileSync(join(output, "window.json"), "utf8"));
  assert.notEqual(execution.status, 0);
  assert.equal(report.passed, false);
  assert.match(
    report.failure,
    /Descendants did not quiesce/u,
    readFileSync(join(output, "sample-1/stderr.txt"), "utf8"),
  );
  assert.ok(
    ["quiescent", "pending-job-abort"].includes(report.failureCleanup),
    JSON.stringify(report),
  );
  assert.equal(report.samples.length, 0);
});
