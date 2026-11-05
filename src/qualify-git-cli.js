#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import {
  admitCli,
  isEntrypoint,
  packageVersion,
  usage,
} from "./cli-admission.js";
import { writeFailure } from "./cli-streams.js";

export async function main(args = process.argv.slice(2)) {
  try {
    const admitted = admitCli(args, true);
    if (admitted.discovery !== undefined || admitted.version) {
      const { writeOutput } = await import("./cli-streams.js");
      await writeOutput(
        process.stdout,
        admitted.version ? packageVersion() : admitted.discovery,
      );
      return;
    }
    const { values } = admitted;
    const { qualifyGitMarkdown } = await import("./qualification.js");
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
    const { writeOutput } = await import("./cli-streams.js");
    await writeOutput(
      process.stdout,
      JSON.stringify({
        passed: report.passed,
        failure: report.failure,
        profileSha256: report.profileSha256,
      }) + "\n",
    );
    process.exitCode = report.passed ? 0 : 1;
  } catch (error) {
    const input =
      error.code === "CLI_INPUT" ||
      String(error.code).startsWith("ERR_PARSE_ARGS");
    await writeFailure(
      (input ? "CLI_INPUT" : (error.code ?? "QUALIFICATION_FAILED")) +
        ": " +
        (input
          ? JSON.stringify(error.message).slice(1, -1)
          : "trusted qualification failed.") +
        "\n" +
        (input ? usage(null, true) : ""),
    );
    process.exitCode = 2;
  }
}
if (isEntrypoint(import.meta.url)) await main();
