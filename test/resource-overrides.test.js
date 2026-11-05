// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";
import { qualifyGitMarkdown, stageCandidateData } from "../src/quality.js";
import {
  cliResourceInvocation,
  cliFailureControls,
  admitCli,
} from "../src/cli-admission.js";
import {
  resolveResourcePolicy,
  resourceInvocation,
} from "../src/resource-controls.js";
import { defaultExecutionLimits } from "../src/execution-defaults.js";
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const qualifier = fileURLToPath(
  new URL("../src/qualify-git-cli.js", import.meta.url),
);
const run = (bin, args) =>
  spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: fixtureCommandTimeoutMs,
    maxBuffer: 24 * 1024 * 1024,
  });

function qualificationFixture(t) {
  const root = consumer(t),
    candidateRoot = join(root, "candidate"),
    trustedRoot = join(root, "trusted");
  mkdirSync(candidateRoot);
  mkdirSync(trustedRoot);
  writeFileSync(join(candidateRoot, "payload.txt"), "Candidate data.\n");
  writeFileSync(join(trustedRoot, ".node-version"), process.versions.node);
  writeFileSync(join(trustedRoot, ".python-version"), "3.15.2");
  const profile = {
    requiredConsecutiveSamples: 1,
    sampleTimeoutMs: null,
    maxObservedMemoryBytes: null,
    maxStagedDataBytes: null,
    maxStagedEntries: null,
    runtimes: {
      node: { file: ".node-version" },
      python: { file: ".python-version" },
    },
  };
  const profilePath = join(trustedRoot, "profile.json");
  // One actual profile exceeds the former 64-KiB bootstrap, with valid JSON whitespace.
  writeFileSync(profilePath, JSON.stringify(profile) + " ".repeat(65537));
  return {
    root,
    candidateRoot,
    trustedRoot,
    profile: "profile.json",
    profilePath,
  };
}
test("independent CLI resource controls agree with the owning resolver and reject malformed controls", () => {
  for (const args of [
    [],
    ["--resource-limit-mode", "unlimited"],
    [
      "--max-profile-bytes",
      "null",
      "--cleanup-timeout-ms",
      "null",
      "--max-output-bytes",
      "null",
    ],
    [
      "--max-profile-bytes",
      "131072",
      "--cleanup-timeout-ms",
      "9000",
      "--max-output-bytes",
      "99",
    ],
  ]) {
    const invocation = cliResourceInvocation(["check", ...args]),
      expected = resolveResourcePolicy([invocation]).executionLimits;
    assert.deepEqual(cliFailureControls(invocation), {
      cleanupTimeoutMs: expected.cleanupTimeoutMs,
      maxOutputBytes: expected.maxOutputBytes,
    });
    admitCli([...args], true);
  }
  for (const args of [
    ["--cleanup-timeout-ms", "0"],
    ["--max-output-bytes", "-1"],
    ["--max-profile-bytes", "garbage"],
    ["--resource-limit-mode", "unlimited", "--max-output-bytes", "100"],
    ["--max-output-bytes", "1", "--max-output-bytes", "2"],
  ])
    assert.throws(() => cliResourceInvocation(["check", ...args]));
  assert.equal(
    cliFailureControls(
      cliResourceInvocation([
        "check",
        "--",
        "--resource-limit-mode",
        "unlimited",
      ]),
    ).maxOutputBytes,
    8388608,
  );
  assert.throws(() => resourceInvocation({ executionLimits: { unknown: 1 } }));
  assert.throws(() => resourceInvocation({ executionLimits: null }));
});
test("public qualifier bootstrap admits raised and null caller ceilings but never its unread profile's own grant", async (t) => {
  const fixture = qualificationFixture(t);
  writeFileSync(join(fixture.trustedRoot, ".node-version"), "99.0.0");
  const options = {
    candidateRoot: fixture.candidateRoot,
    trustedRoot: fixture.trustedRoot,
    outputRoot: join(fixture.root, "output"),
    profile: fixture.profile,
  };
  await assert.rejects(qualifyGitMarkdown(options), { code: "PROFILE_LIMIT" });
  for (const override of [
    { executionLimits: { maxProfileBytes: 131072 } },
    { executionLimits: { maxProfileBytes: null } },
    { resourceLimitMode: "unlimited" },
  ])
    await assert.rejects(qualifyGitMarkdown({ ...options, ...override }), {
      code: "RUNTIME_MISMATCH",
    });
  const value = JSON.parse(readFileSync(fixture.profilePath));
  value.resourceLimitMode = "unlimited";
  writeFileSync(fixture.profilePath, JSON.stringify(value) + " ".repeat(65537));
  await assert.rejects(qualifyGitMarkdown(options), { code: "PROFILE_LIMIT" });
  assert.equal(existsSync(options.outputRoot), false);
  const args = [
    "--candidate-root",
    fixture.candidateRoot,
    "--trusted-root",
    fixture.trustedRoot,
    "--output-root",
    options.outputRoot,
    "--profile",
    fixture.profile,
    "--workflow-commit-id",
    "a".repeat(40),
  ];
  assert.match(run(qualifier, args).stderr, /PROFILE_LIMIT/u);
  const raised = run(qualifier, [...args, "--max-profile-bytes", "null"]);
  assert.equal(raised.status, 2);
  assert.match(raised.stderr, /RUNTIME_MISMATCH/u);
});
test("staging reapplies caller overrides and candidate settings cannot relax trusted limits", (t) => {
  const fixture = qualificationFixture(t);
  const options = {
    candidateRoot: fixture.candidateRoot,
    trustedRoot: fixture.trustedRoot,
    profile: fixture.profile,
  };
  assert.throws(
    () =>
      stageCandidateData({
        ...options,
        outputRoot: join(fixture.root, "default"),
      }),
    { code: "PROFILE_LIMIT" },
  );
  const raised = stageCandidateData({
    ...options,
    outputRoot: join(fixture.root, "raised"),
    executionLimits: {
      maxProfileBytes: null,
      maxOutputBytes: null,
      cleanupTimeoutMs: 9000,
    },
  });
  assert.equal(raised.profile.maxProfileBytes, null);
  assert.equal(raised.profile.maxOutputBytes, null);
  assert.equal(raised.profile.cleanupTimeoutMs, 9000);
  const unlimited = stageCandidateData({
    ...options,
    outputRoot: join(fixture.root, "unlimited"),
    resourceLimitMode: "unlimited",
  });
  assert.equal(unlimited.profile.maxStagedDataBytes, null);
  assert.equal(unlimited.profile.analyzerLimits.maxConfigurationBytes, null);
  const mixed = JSON.parse(readFileSync(fixture.profilePath));
  mixed.resourceLimitMode = "unlimited";
  writeFileSync(fixture.profilePath, JSON.stringify(mixed) + " ".repeat(65537));
  const explicit = stageCandidateData({
    ...options,
    outputRoot: join(fixture.root, "mixed"),
    executionLimits: { maxProfileBytes: null, maxOutputBytes: 1024 },
  });
  assert.equal(explicit.profile.resourceLimitMode, "unlimited");
  assert.equal(explicit.profile.maxOutputBytes, 1024);
  writeFileSync(
    join(fixture.candidateRoot, ".markdown-quality-execution.json"),
    JSON.stringify({ resourceLimitMode: "unlimited" }),
  );
  assert.throws(
    () =>
      stageCandidateData({
        ...options,
        outputRoot: join(fixture.root, "refused"),
        executionLimits: { maxProfileBytes: null, maxStagedDataBytes: 1 },
      }),
    { code: "STAGING_LIMIT" },
  );
  assert.equal(existsSync(join(fixture.root, "refused")), false);
});
test("early malformed-profile reporting honors output overrides before profile admission", (t) => {
  const root = consumer(t);
  const name = "x".repeat(8388609);
  writeFileSync(join(root, "bad.json"), JSON.stringify({ [name]: true }));
  const args = [
    "check",
    "--root",
    root,
    "--execution-profile",
    "bad.json",
    "--max-profile-bytes",
    "16777216",
  ];
  const bounded = run(cli, args);
  assert.equal(bounded.status, 2);
  assert.equal(bounded.stderr, "");
  for (const controls of [
    ["--max-output-bytes", "null"],
    ["--resource-limit-mode", "unlimited"],
  ]) {
    const result = run(cli, [
      ...(controls[0] === "--resource-limit-mode" ? args.slice(0, -2) : args),
      ...controls,
    ]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^INVALID_PROFILE:/u);
    assert.ok(Buffer.byteLength(result.stderr) > 8388608);
  }
});
test("both bins honor early finite and disabled cleanup budgets on a genuine blocked error pipe", async () => {
  // Use one argument generated inside the host process rather than exceeding the OS argv limit.
  for (const bin of [cli, qualifier])
    for (const budget of ["40", "null"]) {
      const result = await new Promise((resolve, reject) => {
        const source = `const {main}=await import(${JSON.stringify(new URL("file:///" + bin.replaceAll("\\", "/")).href)});await main(${bin === cli ? "['check'," : "["}'--'+'x'.repeat(1048576),'--cleanup-timeout-ms',${JSON.stringify(budget)},'--max-output-bytes','null']);`;
        const child = spawn(
          process.execPath,
          ["--input-type=module", "-e", source],
          { windowsHide: true },
        );
        let bytes = 0,
          exited = false,
          release;
        const timeout = setTimeout(() => {
          child.kill();
          child.stderr.resume();
          reject(new Error("Error-delivery fixture exceeded its outer bound."));
        }, 15000);
        child.on("error", reject);
        child.stdin.end();
        child.stdout.resume();
        child.stderr.once("data", (chunk) => {
          bytes += chunk.length;
          child.stderr.pause();
          release = setTimeout(
            () => {
              if (budget === "null")
                assert.equal(
                  exited,
                  false,
                  "Null must not restore the finite package cleanup default",
                );
              child.stderr.resume();
            },
            budget === "null"
              ? defaultExecutionLimits.cleanupTimeoutMs + 100
              : 120,
          );
        });
        child.on("exit", () => {
          exited = true;
          child.stderr.resume();
        });
        child.on("close", (code) => {
          clearTimeout(timeout);
          clearTimeout(release);
          resolve({ code, bytes });
        });
      });
      assert.equal(result.code, 2);
      if (budget === "null")
        assert.ok(
          result.bytes > 0,
          "Disabled timeout must reach actual output",
        );
    }
});
