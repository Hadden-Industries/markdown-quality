#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { readExecutionProfile } from "./execution-profile.js";
import { qualifyCandidate } from "./qualification.js";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(
      [
        "root",
        "profile",
        "source-root",
        "trusted-root",
        "candidate-sha",
        "trusted-sha",
        "producer-sha",
        "core-sha256",
        "native-sha256",
        "workflow-sha",
        "git",
        "python",
        "output",
      ].map((name) => [name, { type: "string" }]),
    ),
  });
  if (
    positionals.length !== 1 ||
    !["profile", "candidate"].includes(positionals[0])
  )
    throw new Error(
      "Usage: markdown-quality-qualify <profile|candidate> with explicit trusted inputs.",
    );
  if (positionals[0] === "profile")
    process.stdout.write(
      JSON.stringify(
        readExecutionProfile({ root: values.root, profile: values.profile }),
      ) + "\n",
    );
  else {
    if (!/^[a-f0-9]{40}$/u.test(values["workflow-sha"] ?? ""))
      throw new Error(
        "Qualification requires the producer workflow's immutable SHA.",
      );
    const report = await qualifyCandidate({
      sourceRoot: values["source-root"],
      trustedRoot: values["trusted-root"],
      candidateSha: values["candidate-sha"],
      trustedSha: values["trusted-sha"],
      git: values.git,
      python: values.python,
      outputRoot: values.output,
      profile: values.profile,
      producer: {
        sourceSha: values["producer-sha"],
        coreArchiveSha256: values["core-sha256"],
        nativeArchiveSha256: values["native-sha256"],
      },
      workflow: {
        producerSha: values["workflow-sha"],
        callerRef: process.env.GITHUB_WORKFLOW_REF ?? null,
        runId: process.env.GITHUB_RUN_ID ?? null,
        attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
        job: process.env.GITHUB_JOB ?? null,
      },
    });
    process.stdout.write(
      JSON.stringify({
        passed: report.passed,
        failure: report.failure,
        profileSha256: report.profileSha256,
      }) + "\n",
    );
    process.exitCode = report.passed ? 0 : 1;
  }
} catch (error) {
  process.stderr.write(
    (error.code ?? "QUALIFICATION_FAILED") +
      ": trusted qualification failed.\n",
  );
  process.exitCode = 2;
}
