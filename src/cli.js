#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { analyzeOperation } from "./operation.js";
import { runQualityRequest } from "./execution.js";
import {
  loadExecutionProfile,
  profileLayer,
  readExecutionProfile,
} from "./execution-profile.js";
import { createInitialQualityResult } from "./result-construction.js";
import { resolveResourcePolicy } from "./resource-controls.js";
import { terminalText, OperationError } from "./contracts.js";
import { resolveConsumerRoot } from "./consumer-root.js";

const usage = `Usage: markdown-quality <check|format|normalize|inspect|inspect-profile> [--root PATH] [--config PATH] [--concurrency N] [--strict] [--reconcile-inventory git] [--execution-profile PATH] [--resource-limit-mode configured|unlimited] [--max-profile-bytes N] [--no-analyzer-limits] [--diagnostic-display-level info|warning|error] [--json] [--files-json JSON] [-- literal.md ...]
normalize repairs eligible prose to NFC with source-aware edits; --dry-run previews the same edits and refusals without writing, and --update-links permits changed heading anchors and updates supported local fragments inside the selected write set. External or unsupported backlinks stay unverified.
No configuration file is required: the root is the explicit --root, else the nearest Git checkout, package root or current directory, and package defaults apply when .markdown-quality.json is absent there.
format --stdin-request reads one bounded JSON request {path,requestId,contentBase64} from stdin and formats the supplied bytes without checkout writes. inspect-profile resolves the selected execution profile without running qualification or document analysis.
Resource ceilings resolve from package defaults, configuration analyzerLimits, the execution profile (default .markdown-quality-execution.json at the root) and then invocation flags. --resource-limit-mode unlimited removes every package-imposed ceiling, including bootstrap reads; runtime, OS and provider limits still apply. --max-profile-bytes sets the profile bootstrap ceiling before the profile is read. --no-analyzer-limits removes only analyzer ceilings.
Diagnostic display defaults to info; filtering changes only human-readable output. JSON results, checks, budgets and exit/write decisions remain complete.
Exit: 0 operation completed without blockers, 1 completed with blocking findings or a refused repair, 2 operational failure. A successful repair can leave reported findings; only check establishes the policy verdict.
`;
const removedFlags = Object.freeze({
  "--inventory": "--reconcile-inventory",
  "--no-limits": "--no-analyzer-limits",
  "--diagnostic-level": "--diagnostic-display-level",
});

class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function readStdinRequest(ceiling) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (ceiling !== null && bytes > ceiling)
      throw new CliError(
        "REQUEST_LIMIT",
        "Logical document request exceeds the selected maxRequestBytes framing bound.",
      );
    chunks.push(chunk);
  }
  let document;
  try {
    document = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
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
    throw new CliError("INVALID_DOCUMENT", "Invalid logical document fields.");
  return document;
}

function summary(result, diagnosticLevel) {
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
  for (const r of result.refusals)
    process.stdout.write(
      `${r.path === null ? "" : terminalText(r.path) + ": "}${r.code}: ${terminalText(r.message)}\n`,
    );
  for (const e of result.errors)
    process.stdout.write(`${e.code}: ${terminalText(e.message)}\n`);
  process.stdout.write(
    `${result.operation} ${result.operationStatus}; quality ${result.qualityStatus}${result.qualityBasis ? ` (${result.qualityBasis})` : ""}; ${result.selection.mode} selection; ${result.selection.files.length} documents; ${result.writtenPaths.length} written.\n`,
  );
  if (
    ["format", "normalize"].includes(result.operation) &&
    result.exitCode === 0 &&
    result.qualityStatus === "findings"
  )
    process.stdout.write(
      `The requested ${result.operation} repair completed, but reported findings remain; run check for the complete policy verdict.\n`,
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
  if (result.operation === "inspect")
    process.stdout.write(
      JSON.stringify({
        package: result.package,
        preset: result.preset,
        tools: result.tools,
        runtime: result.runtime,
        root: result.root,
        configurationOrigin: result.configurationOrigin,
        configurationBytesSha256: result.configurationBytesSha256,
        defaultConfigurationSha256: result.defaultConfigurationSha256,
        policyResolverInputsSha256: result.policyResolverInputsSha256,
        effectiveConfigurationSha256: result.effectiveConfigurationSha256,
        configuration: result.configuration,
        policy: result.policy,
        resourcePolicy: result.resourcePolicy,
        strict: result.strict,
        selection: result.selection,
      }) + "\n",
    );
}

const args = process.argv.slice(2);
if (args.length === 0 || ["--help", "-h"].includes(args[0])) {
  process.stdout.write(usage);
} else {
  const terminator = args.indexOf("--");
  const options = args.slice(0, terminator < 0 ? args.length : terminator);
  let json = options.includes("--json");
  try {
    for (const [flag, replacement] of Object.entries(removedFlags))
      if (options.some((arg) => arg === flag || arg.startsWith(flag + "=")))
        throw new CliError(
          "CLI_INPUT",
          `${flag} was removed; use ${replacement}.`,
        );
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: "string" },
        config: { type: "string" },
        "reconcile-inventory": { type: "string" },
        concurrency: { type: "string" },
        json: { type: "boolean" },
        strict: { type: "boolean" },
        "files-json": { type: "string" },
        "no-analyzer-limits": { type: "boolean" },
        "diagnostic-display-level": { type: "string" },
        "execution-profile": { type: "string" },
        "resource-limit-mode": { type: "string" },
        "max-profile-bytes": { type: "string" },
        "stdin-request": { type: "boolean" },
        "dry-run": { type: "boolean" },
        "update-links": { type: "boolean" },
      },
    });
    const hasTerminator = args.includes("--");
    if (
      positionals.length !== (hasTerminator ? args.length - terminator - 1 : 0)
    )
      throw new CliError("CLI_INPUT", "Literal filenames must follow --.");
    json = values.json ?? false;
    const command = args[0];
    if (
      !["check", "format", "normalize", "inspect", "inspect-profile"].includes(
        command,
      )
    )
      throw new CliError("CLI_INPUT", "Unknown command; use --help.");
    if (
      command !== "normalize" &&
      (values["dry-run"] !== undefined || values["update-links"] !== undefined)
    )
      throw new CliError(
        "CLI_INPUT",
        "--dry-run and --update-links apply only to normalize.",
      );
    const mode = values["resource-limit-mode"];
    if (mode !== undefined && !["configured", "unlimited"].includes(mode))
      throw new CliError(
        "CLI_INPUT",
        "Resource limit mode must be configured or unlimited.",
      );
    let maxProfileBytes;
    if (values["max-profile-bytes"] !== undefined) {
      maxProfileBytes = Number(values["max-profile-bytes"]);
      if (!Number.isSafeInteger(maxProfileBytes) || maxProfileBytes < 1)
        throw new CliError(
          "CLI_INPUT",
          "--max-profile-bytes requires a positive safe integer.",
        );
    }
    const invocation = {
      origin: "invocation",
      resourceLimitMode: mode,
      executionLimits: maxProfileBytes === undefined ? {} : { maxProfileBytes },
      analyzerLimits: values["no-analyzer-limits"] ? false : undefined,
    };
    const root = resolveConsumerRoot(values.root);
    if (command === "inspect-profile") {
      if (
        positionals.length ||
        Object.keys(values).some(
          (key) =>
            ![
              "root",
              "execution-profile",
              "json",
              "resource-limit-mode",
              "max-profile-bytes",
            ].includes(key),
        )
      )
        throw new CliError(
          "CLI_INPUT",
          "inspect-profile accepts only root, execution-profile, resource-limit-mode, max-profile-bytes and json.",
        );
      // Profile resolution has no analyzer request or measured qualification result.
      process.stdout.write(
        JSON.stringify(
          readExecutionProfile({
            root,
            profile: values["execution-profile"],
            invocation,
          }),
        ) + "\n",
      );
      process.exitCode = 0;
    } else {
      const suppliedDocument = values["stdin-request"] === true;
      if (suppliedDocument && !["format", "normalize"].includes(command))
        throw new CliError(
          "CLI_INPUT",
          "--stdin-request requires format or normalize.",
        );
      if (
        suppliedDocument &&
        (hasTerminator ||
          values["files-json"] !== undefined ||
          values["reconcile-inventory"] !== undefined)
      )
        throw new CliError(
          "CLI_INPUT",
          "A supplied document cannot use checkout selection options.",
        );
      const diagnosticLevel = values["diagnostic-display-level"] ?? "info";
      if (!["info", "warning", "error"].includes(diagnosticLevel))
        throw new CliError(
          "CLI_INPUT",
          "Diagnostic display level must be info, warning, or error.",
        );
      if (values["files-json"] !== undefined && hasTerminator)
        throw new CliError(
          "CLI_INPUT",
          "Use only one explicit selection mode.",
        );
      let files;
      if (values["files-json"] !== undefined)
        try {
          files = JSON.parse(values["files-json"]);
        } catch {
          throw new CliError(
            "INVALID_FILES_JSON",
            "--files-json is not valid JSON.",
          );
        }
      else if (hasTerminator) files = positionals;
      if (
        values["reconcile-inventory"] !== undefined &&
        values["reconcile-inventory"] !== "git"
      )
        throw new CliError(
          "CLI_INPUT",
          "Reconciliation inventory must be git.",
        );
      // The profile resolves before stdin or configuration bytes are consumed.
      const profileSnapshot = loadExecutionProfile({
        root,
        profile: values["execution-profile"],
        invocation,
      });
      if (profileSnapshot.value.runtimes) {
        const declared = readExecutionProfile({
          root,
          profile: values["execution-profile"],
          invocation,
        });
        if (declared.runtimes.node !== process.versions.node)
          throw new CliError(
            "RUNTIME_MISMATCH",
            "Installed Node differs from the execution profile.",
          );
      }
      const limits = resolveResourcePolicy([
        profileLayer(profileSnapshot.value),
        invocation,
      ]).executionLimits;
      const document = suppliedDocument
        ? await readStdinRequest(limits.maxRequestBytes)
        : undefined;
      const request = {
        mode: command,
        ...(values["dry-run"] ? { dryRun: true } : {}),
        ...(values["update-links"] ? { updateLinks: true } : {}),
        ...(suppliedDocument ? { document } : {}),
        root,
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
      // Checkout replacement remains in this process so guarded partial writes are
      // reported by the canonical analyzer, never guessed after a killed worker.
      let result;
      const physicalRepair =
        !suppliedDocument &&
        (command === "format" ||
          (command === "normalize" && !values["dry-run"]));
      if (physicalRepair)
        result = await analyzeOperation(
          {
            ...request,
            ...(mode === undefined ? {} : { resourceLimitMode: mode }),
            executionLimits: invocation.executionLimits,
          },
          null,
          trusted,
        );
      else {
        const cancellation = new AbortController();
        const cancel = () => cancellation.abort();
        process.once("SIGINT", cancel);
        process.once("SIGTERM", cancel);
        try {
          result = await runQualityRequest(
            request,
            {
              ...(mode === undefined ? {} : { resourceLimitMode: mode }),
              ...invocation.executionLimits,
              signal: cancellation.signal,
            },
            trusted,
          );
        } finally {
          process.removeListener("SIGINT", cancel);
          process.removeListener("SIGTERM", cancel);
        }
      }
      if (json) process.stdout.write(JSON.stringify(result) + "\n");
      else summary(result, diagnosticLevel);
      process.exitCode = result.exitCode;
    }
  } catch (error) {
    // Classified at the actual boundary; parser messages are never echoed as input.
    const code =
      error instanceof CliError || error instanceof OperationError
        ? error.code
        : error.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" ||
            String(error.code ?? "").startsWith("ERR_PARSE_ARGS")
          ? "CLI_INPUT"
          : (error.code ?? "CLI_INPUT");
    const message = error.message;
    let result;
    try {
      result = createInitialQualityResult(args[0]);
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
