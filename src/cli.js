#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import {
  executeQuality,
  runQuality,
  readExecutionProfile,
  createResult,
} from "./quality.js";
import { terminalText } from "./contracts.js";
import { resolveConsumerRoot } from "./configuration.js";
const args = process.argv.slice(2);
if (args.length === 0 || ["--help", "-h"].includes(args[0])) {
  process.stdout.write(
    "Usage: markdown-quality <check|format|inspect|document> [--root PATH] [--config PATH] [--concurrency N] [--strict] [--no-limits] [--inventory git] [--execution-profile PATH] [--diagnostic-level info|warning|error] [--json] [--files-json JSON] [-- literal.md ...]\nDocument reads bounded JSON {path,requestId,contentBase64} from stdin and formats supplied bytes without checkout writes. Full selection is the default, with automatic tracked inventory at Git checkout roots. Checkout format runs guarded replacement in this process; bounded checking, inspection and document operations accept a finite execution profile. Concurrency defaults to 1. Diagnostic display defaults to info; filtering changes only human-readable output, with hidden counts in the summary. JSON results, checks, diagnostic budgets and exit/write decisions remain complete. --no-limits removes analyzer ceilings; bounded operations retain finite external framing/deadline unless a finite execution profile sets them. Exit: 0 no blockers, 1 errors/drift (warnings under --strict), 2 operation failure. Information never blocks. Comparison uses separately captured reports.\n",
  );
} else {
  const terminator = args.indexOf("--");
  let json = args
    .slice(0, terminator < 0 ? args.length : terminator)
    .includes("--json");
  try {
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: "string" },
        config: { type: "string" },
        inventory: { type: "string" },
        concurrency: { type: "string" },
        json: { type: "boolean" },
        strict: { type: "boolean" },
        "files-json": { type: "string" },
        "no-limits": { type: "boolean" },
        "diagnostic-level": { type: "string" },
        "execution-profile": { type: "string" },
      },
    });
    const hasTerminator = args.includes("--");
    if (
      positionals.length !== (hasTerminator ? args.length - terminator - 1 : 0)
    )
      throw new Error("Literal filenames must follow --.");
    json = values.json ?? false;
    const diagnosticLevel = values["diagnostic-level"] ?? "info";
    if (!["info", "warning", "error"].includes(diagnosticLevel))
      throw new Error("Diagnostic level must be info, warning, or error.");
    if (values["files-json"] !== undefined && hasTerminator)
      throw new Error("Use only one explicit selection mode.");
    const files =
      values["files-json"] !== undefined
        ? JSON.parse(values["files-json"])
        : hasTerminator
          ? positionals
          : undefined;
    if (values.inventory !== undefined && values.inventory !== "git")
      throw new Error("Inventory must be git.");
    let document;
    if (args[0] === "document") {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of process.stdin) {
        bytes += chunk.length;
        if (bytes > 8388608)
          throw new Error(
            "Logical document request exceeds the 8 MiB framing bound.",
          );
        chunks.push(chunk);
      }
      document = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        !document ||
        typeof document !== "object" ||
        Object.keys(document).some(
          (key) => !["path", "requestId", "contentBase64"].includes(key),
        )
      )
        throw new Error("Invalid logical document fields.");
    }
    const request = {
      mode: args[0] === "document" ? "format" : args[0],
      ...(args[0] === "document" ? { document } : {}),
      root: values.root,
      config: values.config,
      concurrency:
        values.concurrency === undefined
          ? undefined
          : Number(values.concurrency),
      files,
      inventory: values.inventory,
      strict: values.strict,
      limits: values["no-limits"] ? false : undefined,
    };
    let bounds;
    if (values["execution-profile"] !== undefined) {
      if (args[0] === "format" || values["no-limits"])
        throw new Error(
          "Execution profiles require a read-only or logical operation with finite limits.",
        );
      const profile = readExecutionProfile({
        root: resolveConsumerRoot(values.root),
        profile: values["execution-profile"],
      });
      if (profile.runtimes.node !== process.versions.node)
        throw new Error("Installed Node differs from the execution profile.");
      bounds = profile;
      request.limits = profile.limits;
    }
    // Checkout replacement remains in this process so guarded partial writes are
    // reported by the canonical analyzer, never guessed after a killed worker.
    let result;
    if (args[0] === "format") result = await runQuality(request);
    else {
      const cancellation = new AbortController();
      const cancel = () => cancellation.abort();
      process.once("SIGINT", cancel);
      process.once("SIGTERM", cancel);
      try {
        result = await executeQuality(request, {
          ...bounds,
          signal: cancellation.signal,
        });
      } finally {
        process.removeListener("SIGINT", cancel);
        process.removeListener("SIGTERM", cancel);
      }
    }
    if (json) process.stdout.write(JSON.stringify(result) + "\n");
    else {
      // This threshold is presentation only. Admission and structured results
      // have already been decided using every finding, including hidden ones.
      const hidden = { info: 0, warning: 0 };
      for (const d of result.diagnostics) {
        if (
          (d.severity === "info" && diagnosticLevel !== "info") ||
          (d.severity === "warning" && diagnosticLevel === "error")
        ) {
          hidden[d.severity]++;
          continue;
        }
        process.stdout.write(
          `${terminalText(d.path)}:${d.line}:${d.column}: ${d.rule.startsWith(d.source + "/") ? d.rule : d.source + "/" + d.rule}: ${terminalText(d.message)}\n`,
        );
      }
      for (const e of result.errors)
        process.stdout.write(`${e.code}: ${terminalText(e.message)}\n`);
      process.stdout.write(
        `${result.outcome}; ${result.selection.mode} selection; ${result.selection.files.length} documents; ${result.written.length} written.\n`,
      );
      for (const [severity, count] of Object.entries(hidden))
        if (count)
          process.stdout.write(
            `${count} ${severity === "info" ? "information" : "warning"} diagnostic${count === 1 ? "" : "s"} hidden.\n`,
          );
      if (result.strict && result.exitCode === 1 && hidden.warning)
        process.stdout.write(
          `Strict mode blocked on ${hidden.warning} hidden warning diagnostic${hidden.warning === 1 ? "" : "s"}.\n`,
        );
      if (args[0] === "inspect")
        process.stdout.write(
          JSON.stringify({
            package: result.package,
            preset: result.preset,
            tools: result.tools,
            configDigest: result.configDigest,
            configuration: result.configuration,
            policy: result.policy,
            strict: result.strict,
            selection: result.selection,
          }) + "\n",
        );
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    const message = error.message.startsWith("Unexpected token")
      ? "Invalid files JSON."
      : error.message;
    const code = error.code ?? "CLI_INPUT";
    let result;
    try {
      result = createResult(args[0]);
    } catch (metadataError) {
      // An installed metadata failure cannot truthfully produce a schema-valid
      // report. Retain its named failure and operational exit, with no fake keys.
      process.stderr.write(
        `${metadataError.code ?? "CLI_FAILURE"}: Cannot construct installed result metadata.\n`,
      );
    }
    if (result) {
      result.errors = [{ code, message }];
      process.stdout.write(
        json
          ? JSON.stringify(result) + "\n"
          : `${code}: ${terminalText(message)}\n`,
      );
    }
    process.exitCode = 2;
  }
}
