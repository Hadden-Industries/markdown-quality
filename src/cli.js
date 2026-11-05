#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import {
  admitCli,
  CliError,
  isEntrypoint,
  packageVersion,
  usage,
} from "./cli-admission.js";
import { writeFailure } from "./cli-streams.js";

export async function main(args = process.argv.slice(2)) {
  const started = performance.now();
  let result,
    rawTransform = false,
    outputStarted = false,
    cancellation,
    timer;
  let outputCeiling = null;
  let failureDelivery;
  let json = args
    .slice(0, args.indexOf("--") < 0 ? args.length : args.indexOf("--"))
    .includes("--json");
  const cancel = () => cancellation?.abort();
  try {
    const admitted = admitCli(args);
    if (admitted.discovery !== undefined || admitted.version) {
      const { writeOutput } = await import("./cli-streams.js");
      await writeOutput(
        process.stdout,
        admitted.version ? packageVersion() : admitted.discovery,
      );
      return;
    }
    const { command, values, files, raw, envelope } = admitted;
    json = values.json ?? false;
    rawTransform = raw && command !== "check";
    const [
      { analyzeOperation },
      { runQualityRequest },
      profiles,
      { resolveConsumerRoot, safePath },
      { resolveResourcePolicy },
      { decode, digest },
      { validateQualityResult },
      { writeOutput, renderSummary },
    ] = await Promise.all([
      import("./operation.js"),
      import("./execution.js"),
      import("./execution-profile.js"),
      import("./consumer-root.js"),
      import("./resource-controls.js"),
      import("./contracts.js"),
      import("./result-validation.js"),
      import("./cli-output.js"),
    ]);
    const mode = values["resource-limit-mode"];
    const invocation = {
      origin: "invocation",
      resourceLimitMode: mode,
      executionLimits:
        values["max-profile-bytes"] === undefined
          ? {}
          : { maxProfileBytes: Number(values["max-profile-bytes"]) },
      analyzerLimits: values["no-analyzer-limits"] ? false : undefined,
    };
    const root = resolveConsumerRoot(values.root);
    if (command === "inspect-profile") {
      await writeOutput(
        process.stdout,
        JSON.stringify(
          profiles.readExecutionProfile({
            root,
            profile: values["execution-profile"],
            invocation,
          }),
        ) + "\n",
      );
      return;
    }
    const profileSnapshot = profiles.loadExecutionProfile({
      root,
      profile: values["execution-profile"],
      invocation,
    });
    if (
      profileSnapshot.value.runtimes &&
      profiles.readExecutionProfile({
        root,
        profile: values["execution-profile"],
        invocation,
      }).runtimes.node !== process.versions.node
    )
      throw new CliError(
        "RUNTIME_MISMATCH",
        "Installed Node differs from the execution profile.",
      );
    const limits = resolveResourcePolicy([
      profiles.profileLayer(profileSnapshot.value),
      invocation,
    ]).executionLimits;
    outputCeiling = limits.maxOutputBytes;
    failureDelivery = {
      cleanupTimeoutMs: limits.cleanupTimeoutMs,
      maxOutputBytes: limits.maxOutputBytes,
    };
    if (raw) {
      const { canonicalRelativePath } = await import("./documents.js");
      canonicalRelativePath(values["stdin-filepath"]);
      safePath(root, values["stdin-filepath"], { missing: true, file: true });
    }
    cancellation = new AbortController();
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    if (raw && limits.executionTimeoutMs !== null) {
      const end = started + limits.executionTimeoutMs;
      const expire = () => {
        const remaining = end - performance.now();
        if (remaining <= 0) cancel();
        else timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
      };
      expire();
    }
    let document;
    if (raw || envelope) {
      if (raw && process.stdin.isTTY)
        throw new CliError(
          "STDIN_TTY",
          "Pipe UTF-8 input: editor-output | markdown-quality format --stdin --stdin-filepath docs/a.md",
        );
      const chunks = [];
      let bytes = 0;
      const abortInput = () =>
        process.stdin.destroy(
          Object.assign(
            new Error("Input was cancelled or exceeded its deadline."),
            { code: "CANCELLED" },
          ),
        );
      cancellation.signal.addEventListener("abort", abortInput, { once: true });
      try {
        if (cancellation.signal.aborted)
          throw new CliError("CANCELLED", "Input was cancelled.");
        for await (const chunk of process.stdin) {
          bytes += chunk.length;
          if (limits.maxRequestBytes !== null && bytes > limits.maxRequestBytes)
            throw new CliError(
              "REQUEST_LIMIT",
              "Input exceeds maxRequestBytes; internal JSON/base64 overhead also counts.",
            );
          chunks.push(chunk);
        }
      } finally {
        cancellation.signal.removeEventListener("abort", abortInput);
      }
      const content = Buffer.concat(chunks);
      if (raw) {
        decode(content);
        document = {
          path: values["stdin-filepath"],
          requestId: null,
          contentBase64: content.toString("base64"),
        };
      } else {
        try {
          document = JSON.parse(decode(content));
        } catch (error) {
          if (error.code) throw error;
          throw new CliError(
            "INVALID_DOCUMENT_REQUEST_JSON",
            "The stdin document request is not valid JSON.",
          );
        }
        if (
          !document ||
          typeof document !== "object" ||
          Array.isArray(document) ||
          Object.keys(document).some(
            (key) => !["path", "requestId", "contentBase64"].includes(key),
          )
        )
          throw new CliError(
            "INVALID_DOCUMENT",
            "Invalid logical document fields.",
          );
      }
    }
    const request = {
      mode: command,
      root,
      ...(values["dry-run"] ? { dryRun: true } : {}),
      ...(values["update-links"] ? { updateLinks: true } : {}),
      ...(raw || envelope ? { document } : {}),
      ...(values.config === undefined ? {} : { config: values.config }),
      ...(values.concurrency === undefined
        ? {}
        : { concurrency: Number(values.concurrency) }),
      ...(files === undefined ? {} : { files }),
      ...(values["reconcile-inventory"] === undefined
        ? {}
        : { reconciliationInventory: values["reconcile-inventory"] }),
      ...(values.strict === undefined ? {} : { strict: values.strict }),
      ...(invocation.analyzerLimits === undefined
        ? {}
        : { analyzerLimits: false }),
    };
    const trusted = { profileSnapshot };
    const physicalWrite =
      !raw &&
      !envelope &&
      ["format", "normalize"].includes(command) &&
      !values["dry-run"];
    result = physicalWrite
      ? await analyzeOperation(
          {
            ...request,
            ...(mode === undefined ? {} : { resourceLimitMode: mode }),
            executionLimits: invocation.executionLimits,
          },
          null,
          trusted,
        )
      : await runQualityRequest(
          request,
          {
            ...invocation.executionLimits,
            ...(mode === undefined ? {} : { resourceLimitMode: mode }),
            ...(raw && limits.executionTimeoutMs !== null
              ? {
                  executionTimeoutMs: Math.max(
                    1,
                    Math.floor(
                      limits.executionTimeoutMs - (performance.now() - started),
                    ),
                  ),
                }
              : {}),
            signal: cancellation.signal,
          },
          trusted,
        );
    validateQualityResult(result);
    const delivery = {
      signal: cancellation.signal,
      maxOutputBytes:
        result.resourcePolicy?.executionLimits.maxOutputBytes ??
        limits.maxOutputBytes,
    };
    if (rawTransform && result.exitCode === 0) {
      const bytes = Buffer.from(result.document.contentBase64, "base64");
      const candidate = result.documentResults[0]?.candidate;
      if (
        result.document.decision === "selected" &&
        (!candidate ||
          candidate.outputSha256 !== digest(bytes) ||
          candidate.outputBytes !== bytes.length)
      )
        throw new CliError(
          "INVALID_RESULT",
          "Raw output differs from the verified candidate.",
        );
      // Explain exclusions and residual findings before exposing candidate bytes.
      const explanation = renderSummary(result, {
        diagnosticLevel: values["diagnostic-display-level"],
        quiet: values.quiet,
      });
      await writeOutput(process.stderr, explanation, delivery);
      outputStarted = true;
      await writeOutput(process.stdout, bytes, delivery);
    } else if (json) {
      outputStarted = true;
      await writeOutput(
        process.stdout,
        JSON.stringify(result) + "\n",
        delivery,
      );
    } else
      await writeOutput(
        process.stderr,
        renderSummary(result, {
          diagnosticLevel: values["diagnostic-display-level"],
          quiet: values.quiet,
        }),
        delivery,
      );
    process.exitCode = result.exitCode;
  } catch (error) {
    const code = String(error.code ?? "CLI_INPUT").startsWith("ERR_PARSE_ARGS")
      ? "CLI_INPUT"
      : (error.code ?? "CLI_INPUT");
    try {
      if (json && !outputStarted && !rawTransform) {
        const { createInitialQualityResult } =
          await import("./result-construction.js");
        const failure = createInitialQualityResult(args[0]);
        failure.errors = [{ code, message: error.message }];
        const { writeOutput } = await import("./cli-output.js");
        await writeOutput(process.stdout, JSON.stringify(failure) + "\n", {
          maxOutputBytes: outputCeiling,
        });
      } else {
        // Never mix an error report into a source stream or a partial JSON report.
        const { terminalText } = await import("./contracts.js");
        await writeFailure(
          `${code}: ${terminalText(error.message)}\n${code === "CLI_INPUT" ? usage(args[0]) : ""}${result?.writtenPaths.length ? "Confirmed filesystem writes remain applied.\n" : ""}`,
          failureDelivery,
        );
      }
    } catch (metadataError) {
      await writeFailure(
        `${metadataError.code ?? "CLI_FAILURE"}: Cannot deliver installed result metadata.\n`,
        failureDelivery,
      );
    }
    process.exitCode = 2;
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}
if (isEntrypoint(import.meta.url)) await main();
