// SPDX-License-Identifier: AGPL-3.0-only
// Trusted reusable-workflow driver. Candidate input is never interpolated as code.
import { readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { readExecutionProfile } from "../src/execution-profile.js";
import { safePath } from "../src/configuration.js";
import { digest, fail } from "../src/contracts.js";
import { npmCommand } from "./commands.js";

const trustedRoot = resolve(process.env.MQ_TRUSTED_ROOT);
const profile = readExecutionProfile({
  root: trustedRoot,
  profile: process.env.MQ_PROFILE,
});
if (!profile.toolchain)
  fail(
    "PRODUCER_IDENTITY",
    "Qualification requires profile-owned locked archives.",
  );
const lockFile = safePath(trustedRoot, profile.toolchain.lockFile, {
  file: true,
});
if (process.argv[2] === "bootstrap") {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `node=${profile.runtimes.node}\npython=${profile.runtimes.python}\n`,
  );
} else if (process.argv[2] === "run") {
  const graphRoot = dirname(lockFile);
  const lockBefore = readFileSync(lockFile);
  // Only reviewed trusted graph acquisition runs, with every lifecycle disabled.
  npmCommand(["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: graphRoot,
  });
  if (!lockBefore.equals(readFileSync(lockFile)))
    fail("LOCK_CHANGED", "Frozen trusted lock changed during acquisition.");
  const require = createRequire(join(graphRoot, "package.json"));
  const entry = require.resolve("@hadden-industries/markdown-quality");
  const { qualifyCandidate } = await import(pathToFileURL(entry));
  const nativeArchive = safePath(
    trustedRoot,
    profile.toolchain.nativeArchives[`${process.platform}-${process.arch}`],
    { file: true },
  );
  const coreArchive = safePath(trustedRoot, profile.toolchain.coreArchive, {
    file: true,
  });
  const python = execFileSync(
    "python",
    ["-c", "import sys; print(sys.executable)"],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  ).trim();
  const git = execFileSync(
    process.platform === "win32" ? "where.exe" : "which",
    ["git"],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  )
    .trim()
    .split(/\r?\n/u)[0];
  if (
    !/^[a-f0-9]{40}$/u.test(process.env.MQ_WORKFLOW_SHA ?? "") ||
    process.env.MQ_WORKFLOW_REPOSITORY !== "Hadden-Industries/markdown-quality"
  )
    fail(
      "WORKFLOW_IDENTITY",
      "Producer workflow identity is unavailable or inconsistent.",
    );
  const report = await qualifyCandidate({
    sourceRoot: resolve(process.env.MQ_CANDIDATE_ROOT),
    trustedRoot,
    profile: process.env.MQ_PROFILE,
    candidateSha: process.env.MQ_CANDIDATE_SHA,
    trustedSha: process.env.MQ_TRUSTED_SHA,
    git,
    python,
    outputRoot: join(process.env.RUNNER_TEMP, "shared-markdown-evidence"),
    producer: {
      sourceSha: process.env.MQ_WORKFLOW_SHA,
      coreArchiveSha256: digest(readFileSync(coreArchive)),
      nativeArchiveSha256: digest(readFileSync(nativeArchive)),
    },
    workflow: {
      producerSha: process.env.MQ_WORKFLOW_SHA,
      producerRef: process.env.MQ_WORKFLOW_REF,
      producerRepository: process.env.MQ_WORKFLOW_REPOSITORY,
      callerRef: process.env.GITHUB_WORKFLOW_REF,
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      job: process.env.GITHUB_JOB,
      checkRunId: process.env.MQ_CHECK_RUN_ID,
    },
  });
  process.stdout.write(
    JSON.stringify({ passed: report.passed, failure: report.failure }) + "\n",
  );
  process.exitCode = report.passed ? 0 : 1;
} else
  fail(
    "INVALID_OPERATION",
    "Shared driver operation must be bootstrap or run.",
  );
