// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import {
  readExecutionProfile,
  qualifyCandidate,
  validateQualityResult,
} from "../src/quality.js";
import { consumer } from "./helpers.js";
import { packageQualificationEvidence } from "../src/qualification-evidence.js";

const git = execFileSync(
  process.platform === "win32" ? "where.exe" : "which",
  ["git"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/u)[0];
const python = execFileSync(
  "python",
  ["-c", "import sys; print(sys.executable)"],
  { encoding: "utf8" },
).trim();
const version = execFileSync(python, ["--version"], { encoding: "utf8" })
  .trim()
  .replace("Python ", "");
function freeze(root) {
  const run = (...args) =>
    execFileSync(git, ["-c", "core.autocrlf=false", "-C", root, ...args], {
      windowsHide: true,
    });
  run("init", "-q");
  run("add", "--all");
  run(
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
  return run("rev-parse", "HEAD").toString().trim();
}
test("bundled Windows/Linux observer runs real full trusted staging and detects blockers", (t) => {
  const trustedRoot = consumer(t, {
    ".node-version": process.versions.node,
    ".python-version": version,
  });
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify({
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
    }),
  );
  const trustedSha = freeze(trustedRoot);
  const sourceRoot = consumer(t, {
    "README.md": "# Heading!\n\nAlpha.\n",
    "candidate.mjs": "throw new Error('Never execute this');",
  });
  const candidateSha = freeze(sourceRoot);
  const profile = readExecutionProfile({ root: trustedRoot });
  const scratch = consumer(t);
  const request = {
    sourceRoot,
    trustedRoot,
    candidateSha,
    trustedSha,
    git,
    profile,
    producer: { sourceSha: "a".repeat(40) },
  };
  for (const [name, mutation] of [
    ["passing", false],
    ["modified", true],
    ["replaced-object", "replacement"],
  ]) {
    if (mutation === true)
      writeFileSync(join(sourceRoot, "README.md"), "Alpha. Beta.\n");
    if (mutation === "replacement") {
      writeFileSync(join(sourceRoot, "README.md"), "Replacement.\n");
      const replacement = freeze(sourceRoot);
      execFileSync(git, ["-C", sourceRoot, "update-ref", "HEAD", candidateSha]);
      execFileSync(git, [
        "-C",
        sourceRoot,
        "replace",
        candidateSha,
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
      assert.equal(report.samples.length, 2);
      for (const sample of report.samples) {
        const receipt = JSON.parse(
          readFileSync(join(output, sample.receiptPath), "utf8"),
        );
        assert.equal(sample.activeDescendants, 0);
        assert.ok(sample.peakObservedBytes > 0);
        assert.deepEqual(receipt.result.selection.files, ["README.md"]);
        assert.equal(receipt.result.outcome, "findings");
        assert.ok(
          receipt.result.diagnostics.every((item) => item.severity === "info"),
        );
        assert.deepEqual(
          receipt.result.selection.inventory.map((item) => item.path),
          ["README.md"],
        );
        validateQualityResult(receipt.result);
      }
      const compact = join(scratch, "compact-real-window");
      const packaged = packageQualificationEvidence({
        sourceRoot: output,
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
    qualifyCandidate({
      sourceRoot: root,
      trustedRoot: root,
      outputRoot: join(root, "out"),
    }),
    { code: "UNSAFE_STAGING" },
  );
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
        samples: 1,
        windowMs: 15000,
        memoryBytes: 536870912,
        nodeOldSpaceMb: 256,
        reportBytes: 8388608,
        checkerMs: 10000,
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
  assert.ok(["quiescent", "pending-job-abort"].includes(report.failureCleanup));
  assert.equal(report.samples.length, 0);
});
