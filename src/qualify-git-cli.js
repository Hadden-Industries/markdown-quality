#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { qualifyGitMarkdown } from "./qualification.js";

const usage =
  "Usage: markdown-quality-qualify-git --profile PATH --candidate-root PATH --trusted-root PATH --candidate-commit-id ID --trusted-commit-id ID --producer-commit-id ID --core-archive-sha256 HEX --native-archive-sha256 HEX --workflow-commit-id ID --git-executable-path PATH --python-executable-path PATH --output-root PATH\nRepeatedly checks immutable Git Markdown under trusted policy. Profile inspection: markdown-quality inspect-profile.\n";
const flags = [
  "profile",
  "candidate-root",
  "trusted-root",
  "candidate-commit-id",
  "trusted-commit-id",
  "producer-commit-id",
  "core-archive-sha256",
  "native-archive-sha256",
  "workflow-commit-id",
  "git-executable-path",
  "python-executable-path",
  "output-root",
];
const args = process.argv.slice(2);
if (!args.length || (args.length === 1 && ["--help", "-h"].includes(args[0])))
  process.stdout.write(usage);
else
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: Object.fromEntries(
        flags.map((name) => [name, { type: "string" }]),
      ),
    });
    if (positionals.length)
      throw new Error(
        "markdown-quality-qualify-git accepts flags only; the consumer token was removed.",
      );
    if (!/^[a-f0-9]{40}$/u.test(values["workflow-commit-id"] ?? ""))
      throw new Error(
        "Qualification requires the producer workflow's immutable commit ID.",
      );
    const report = await qualifyGitMarkdown({
      candidateRoot: values["candidate-root"],
      trustedRoot: values["trusted-root"],
      candidateCommitId: values["candidate-commit-id"],
      trustedCommitId: values["trusted-commit-id"],
      gitExecutablePath: values["git-executable-path"],
      pythonExecutablePath: values["python-executable-path"],
      outputRoot: values["output-root"],
      profile: values.profile,
      producer: {
        sourceCommitId: values["producer-commit-id"],
        coreArchiveSha256: values["core-archive-sha256"],
        nativeArchiveSha256: values["native-archive-sha256"],
      },
      workflow: {
        producerCommitId: values["workflow-commit-id"],
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
  } catch (error) {
    process.stderr.write(
      (error.code ?? "QUALIFICATION_FAILED") +
        ": trusted qualification failed.\n",
    );
    process.exitCode = 2;
  }
