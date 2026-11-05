// SPDX-License-Identifier: AGPL-3.0-only
// Discovery and syntactic admission deliberately depend only on Node builtins.
import { parseArgs } from "node:util";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultExecutionLimits } from "./execution-defaults.js";

export class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function isEntrypoint(url) {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}
export function packageVersion() {
  const metadata = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (typeof metadata.version !== "string" || !metadata.version.length)
    throw new CliError(
      "PACKAGE_METADATA",
      "Installed package version is unavailable.",
    );
  return metadata.version + "\n";
}
export const commands = [
  "check",
  "format",
  "normalize",
  "inspect",
  "inspect-profile",
];
export const qualificationFlags = [
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
const resourceFlags = {
  "max-profile-bytes": "maxProfileBytes",
  "max-output-bytes": "maxOutputBytes",
  "cleanup-timeout-ms": "cleanupTimeoutMs",
};
const resourceOptions = Object.fromEntries(
  ["resource-limit-mode", ...Object.keys(resourceFlags)].map((key) => [
    key,
    { type: "string" },
  ]),
);

/** Admit only independent caller controls before command/profile admission.
 * Unknown command arguments remain errors in admitCli and grant no work. */
export function cliResourceInvocation(args, qualification = false) {
  const end = args.indexOf("--");
  const { values, tokens } = parseArgs({
    args: args.slice(qualification ? 0 : 1, end < 0 ? args.length : end),
    options: resourceOptions,
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  const seen = new Map();
  for (const token of tokens.filter(
    (token) =>
      token.kind === "option" && Object.hasOwn(resourceOptions, token.name),
  )) {
    if (seen.has(token.name) && seen.get(token.name) !== token.value)
      throw new CliError(
        "CLI_INPUT",
        `Conflicting repeated --${token.name}; supply one value.`,
      );
    seen.set(token.name, token.value);
  }
  const mode = values["resource-limit-mode"];
  if (mode !== undefined && !["configured", "unlimited"].includes(mode))
    throw new CliError(
      "CLI_INPUT",
      "Resource limit mode must be configured or unlimited.",
    );
  const executionLimits = {};
  for (const [flag, key] of Object.entries(resourceFlags))
    if (Object.hasOwn(values, flag)) {
      const value = values[flag] === "null" ? null : Number(values[flag]);
      if (value !== null && (!Number.isSafeInteger(value) || value < 1))
        throw new CliError(
          "CLI_INPUT",
          `--${flag} requires a positive safe integer or null.`,
        );
      if (mode === "unlimited" && value !== null)
        throw new CliError(
          "INVALID_RESOURCE_POLICY",
          `Unlimited mode contradicts the finite ${key} in the same invocation layer.`,
        );
      executionLimits[key] = value;
    }
  return { origin: "invocation", resourceLimitMode: mode, executionLimits };
}
/** Pure projection for errors before operational metadata can be imported. */
export function cliFailureControls(invocation = {}) {
  return Object.fromEntries(
    ["cleanupTimeoutMs", "maxOutputBytes"].map((key) => [
      key,
      Object.hasOwn(invocation.executionLimits ?? {}, key)
        ? invocation.executionLimits[key]
        : invocation.resourceLimitMode === "unlimited"
          ? null
          : defaultExecutionLimits[key],
    ]),
  );
}
export function usage(command, qualification = false) {
  if (qualification)
    return `Usage: markdown-quality-qualify-git ${qualificationFlags.map((flag) => `--${flag} ${flag.endsWith("sha256") ? "HEX" : "VALUE"}`).join(" ")} [--resource-limit-mode configured|unlimited] [--max-profile-bytes N|null] [--max-output-bytes N|null] [--cleanup-timeout-ms N|null]\nRepeatedly checks immutable Git Markdown under trusted policy. Caller resource overrides apply before trusted profile reads and remain bound through staging and observation. Use markdown-quality inspect-profile for profile inspection.\n`;
  const operation = commands.includes(command)
    ? command
    : "<check|format|normalize|inspect|inspect-profile>";
  return `Usage: markdown-quality ${operation} [options] [-- root-relative/path ...]\n
Discovery: --help, -h, --version. Command help: markdown-quality ${commands.includes(command) ? command : "check"} --help.
Repairs: format and normalize require exactly one of --write or --dry-run for filesystem input, including empty selections. Preview prepares real candidates without writes; run check for the policy verdict.
Input: --root PATH, --config PATH, --files-json JSON, --reconcile-inventory git. Paths after -- are literal, canonical root-relative forward-slash paths, even from nested directories. Explicit [] or an empty -- deliberately selects nothing.
Full discovery uses include (.md by default); explicit paths bypass include, retain exclusions and refuse .mdx. Selected success is not complete-repository acceptance.
Root defaults to the nearest verified Git checkout, then package root, then cwd. Configuration is read only from that root or --config.
Raw UTF-8: check|format|normalize --stdin --stdin-filepath docs/a.md [--root PATH]. Pipe or redirect input; raw transforms emit only source on stdout, reject --json and repair modes, and never write checkout files. Raw check supports --json.
Envelope: format|normalize --stdin-request [--dry-run] [--json] reads bounded JSON {path,requestId,contentBase64}; no checkout writes. normalize --update-links permits anchor changes only within the selected edit scope.
Output: --json emits one complete result on stdout; human findings and summaries use stderr. --quiet suppresses routine success summaries, never findings or failures. --diagnostic-display-level info|warning|error filters only human presentation; --strict makes warnings block.
Execution: --concurrency N, --execution-profile PATH, --resource-limit-mode configured|unlimited, --max-profile-bytes N|null, --max-output-bytes N|null, --cleanup-timeout-ms N|null, --no-analyzer-limits. Caller overrides also govern early failure delivery. Profile defaults to .markdown-quality-execution.json at the root. Limits include actual JSON/base64 framing and complete result bytes. Unlimited removes package ceilings, not OS/runtime limits.
inspect-profile emits profile JSON without analysis and accepts only root, execution-profile, resource-limit-mode, max-profile-bytes, max-output-bytes, cleanup-timeout-ms and json.
Exit: 0 completed operation (preview/repair is not check evidence), 1 completed policy failure or refused repair, 2 invalid input, incomplete operation, cleanup or delivery failure. Discard partial stdout after failure.\n`;
}
const strings = [
  "root",
  "config",
  "reconcile-inventory",
  "concurrency",
  "files-json",
  "diagnostic-display-level",
  "execution-profile",
  "resource-limit-mode",
  "max-profile-bytes",
  "max-output-bytes",
  "cleanup-timeout-ms",
  "stdin-filepath",
];
const booleans = [
  "json",
  "strict",
  "no-analyzer-limits",
  "stdin-request",
  "stdin",
  "dry-run",
  "write",
  "update-links",
  "quiet",
];
export function admitCli(args, qualification = false) {
  const command = qualification ? null : args[0];
  if (!args.length || (args.length === 1 && ["--help", "-h"].includes(args[0])))
    return { discovery: usage(null, qualification) };
  if (args.length === 1 && args[0] === "--version") return { version: true };
  if (
    !qualification &&
    commands.includes(command) &&
    args.length === 2 &&
    ["--help", "-h"].includes(args[1])
  )
    return { discovery: usage(command) };
  const bad = (message) => {
    throw new CliError("CLI_INPUT", message);
  };
  if (!qualification && !commands.includes(command))
    bad("Unknown command; use --help.");
  const terminator = args.indexOf("--");
  const prefix = args.slice(
    qualification ? 0 : 1,
    terminator < 0 ? args.length : terminator,
  );
  for (const [old, replacement] of Object.entries({
    "--inventory": "--reconcile-inventory",
    "--no-limits": "--no-analyzer-limits",
    "--diagnostic-level": "--diagnostic-display-level",
  }))
    if (prefix.some((token) => token === old || token.startsWith(old + "=")))
      bad(`${old} was removed; use ${replacement}.`);
  const parsed = parseArgs({
    args: qualification ? args : args.slice(1),
    allowPositionals: true,
    strict: true,
    tokens: true,
    options: Object.fromEntries([
      ...(qualification
        ? [...qualificationFlags, ...Object.keys(resourceOptions)]
        : strings
      ).map((name) => [name, { type: "string" }]),
      ...(qualification
        ? []
        : booleans.map((name) => [name, { type: "boolean" }])),
    ]),
  });
  const { values, positionals, tokens } = parsed;
  cliResourceInvocation(args, qualification);
  const seen = new Map();
  for (const token of tokens.filter((t) => t.kind === "option")) {
    if (token.name === "stdin-filepath" && seen.has(token.name))
      bad("Raw stdin requires exactly one --stdin-filepath.");
    if (seen.has(token.name) && seen.get(token.name) !== token.value)
      bad(`Conflicting repeated --${token.name}; supply one value.`);
    seen.set(token.name, token.value);
  }
  if (qualification) {
    if (positionals.length || terminator >= 0)
      bad(
        "markdown-quality-qualify-git accepts flags only; the consumer token was removed.",
      );
    return { values };
  }
  if (
    positionals.length !== (terminator < 0 ? 0 : args.length - terminator - 1)
  )
    bad("Literal filenames must follow --.");
  const repair = ["format", "normalize"].includes(command);
  const raw = values.stdin === true,
    envelope = values["stdin-request"] === true;
  const has = (key) => Object.hasOwn(values, key);
  if (
    command === "inspect-profile" &&
    (terminator >= 0 ||
      Object.keys(values).some(
        (key) =>
          ![
            "root",
            "execution-profile",
            "resource-limit-mode",
            "max-profile-bytes",
            "max-output-bytes",
            "cleanup-timeout-ms",
            "json",
          ].includes(key),
      ))
  )
    bad(
      "inspect-profile accepts only root, execution-profile, resource-limit-mode, max-profile-bytes, max-output-bytes, cleanup-timeout-ms and json.",
    );
  if (!repair && (has("write") || has("dry-run")))
    bad("--write and --dry-run apply only to format or normalize.");
  if (has("update-links") && command !== "normalize")
    bad("--update-links applies only to normalize.");
  if (raw && envelope) bad("Use either --stdin or --stdin-request.");
  if (has("stdin-filepath") !== raw)
    bad("Raw stdin requires --stdin and exactly one --stdin-filepath.");
  if (
    raw &&
    (!["check", "format", "normalize"].includes(command) ||
      has("write") ||
      has("dry-run"))
  )
    bad(
      "Raw stdin accepts check, format or normalize without --write or --dry-run.",
    );
  if (raw && repair && values.json)
    bad("Raw transforms emit source; remove --json or use --stdin-request.");
  if (envelope && (!repair || has("write")))
    bad("--stdin-request requires format or normalize without --write.");
  if (
    (raw || envelope) &&
    (terminator >= 0 || has("files-json") || has("reconcile-inventory"))
  )
    bad("A supplied document cannot use checkout selection options.");
  if (
    repair &&
    !raw &&
    !envelope &&
    Boolean(values.write) === Boolean(values["dry-run"])
  )
    bad("Filesystem repairs require exactly one of --write or --dry-run.");
  if (has("files-json") && terminator >= 0)
    bad("Use only one explicit selection mode.");
  let files;
  if (has("files-json")) {
    try {
      files = JSON.parse(values["files-json"]);
    } catch {
      throw new CliError(
        "INVALID_FILES_JSON",
        "--files-json is not valid JSON.",
      );
    }
    if (!Array.isArray(files) || files.some((path) => typeof path !== "string"))
      bad("--files-json requires an array of strings.");
  } else if (terminator >= 0) files = positionals;
  if (has("reconcile-inventory") && values["reconcile-inventory"] !== "git")
    bad("Reconciliation inventory must be git.");
  if (
    has("resource-limit-mode") &&
    !["configured", "unlimited"].includes(values["resource-limit-mode"])
  )
    bad("Resource limit mode must be configured or unlimited.");
  if (
    has("diagnostic-display-level") &&
    !["info", "warning", "error"].includes(values["diagnostic-display-level"])
  )
    bad("Diagnostic display level must be info, warning, or error.");
  for (const key of ["concurrency"])
    if (
      has(key) &&
      (!Number.isSafeInteger(Number(values[key])) || Number(values[key]) < 1)
    )
      bad(`--${key} requires a positive safe integer.`);
  return { command, values, files, raw, envelope };
}
