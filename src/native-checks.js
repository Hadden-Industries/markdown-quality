// SPDX-License-Identifier: AGPL-3.0-only
import { runNative } from "./native-tool.js";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, fail, limits, exceeds } from "./contracts.js";
import {
  removeStagedFile,
  nativeCheckConfig,
  verifyNativeStaging,
  writeStagedFile,
} from "./native-staging.js";

/** Bind an admitted check to its exact bytes, executable identity and owned policy. */
export function bindNativeCheck(tool, input, report) {
  return {
    input,
    toolSha256: tool.sha256,
    configuration: nativeCheckConfig,
    report,
  };
}
export function matchesNativeCheck(tool, input, check) {
  return (
    check?.input === input &&
    check.toolSha256 === tool.sha256 &&
    check.configuration === nativeCheckConfig &&
    typeof check.report?.wouldReformat === "boolean" &&
    Array.isArray(check.report.diagnostics)
  );
}
function reportBound(text, staging) {
  return (
    3200 * text.split("\n").length +
    512 +
    (staging
      ? Buffer.byteLength(JSON.stringify(join(staging.path, "input-31.md")))
      : 0)
  );
}
/** Avoid speculative checking where the qualified file protocol cannot apply. */
export function nativeFileCheckEligible(text, staging, budgets = limits) {
  return (
    Boolean(staging) &&
    !exceeds(Buffer.byteLength(text), budgets.fileBytes) &&
    !exceeds(reportBound(text, staging) + 2, budgets.nativeOutputBytes)
  );
}

/** Check bounded exact snapshots; partition before invocation, never retry failed groups. */
export function runNativeChecks(
  tool,
  texts,
  staging,
  observer,
  budgets = limits,
) {
  const results = [];
  let pending = [],
    bound = 2,
    bytes = 0;
  function observe(indices, operation) {
    observer?.start(indices);
    const started = performance.now();
    try {
      return operation();
    } finally {
      observer?.finish(indices, performance.now() - started);
    }
  }
  function flush() {
    if (!pending.length) return;
    const group = pending;
    pending = [];
    bound = 2;
    bytes = 0;
    results.push(
      ...observe(
        group.map((item) => item.index),
        () =>
          checkFiles(
            tool,
            group.map((item) => item.text),
            staging,
            budgets,
          ),
      ),
    );
  }
  for (const [index, text] of texts.entries()) {
    const inputBytes = Buffer.byteLength(text);
    if (exceeds(inputBytes, budgets.fileBytes))
      fail("DOCUMENT_LIMIT", "Native input exceeds the size limit.");
    // Pinned check.rs emits at most two retained findings per source line and
    // at most 203 excerpt characters. Include worst JSON escaping, pretty-print
    // overhead and the complete staged pathname; keep large cases on stdin.
    const outputBound = reportBound(text, staging);
    if (!staging || exceeds(outputBound + 2, budgets.nativeOutputBytes)) {
      flush();
      results.push(
        observe([index], () => ({
          diagnostics: runNative(tool, text, true, budgets),
          wouldReformat: null,
        })),
      );
      continue;
    }
    if (
      pending.length === 32 ||
      bytes + inputBytes > 4_194_304 ||
      exceeds(bound + outputBound, budgets.nativeOutputBytes)
    )
      flush();
    pending.push({ index, text });
    bytes += inputBytes;
    bound += outputBound;
  }
  flush();
  return results;
}

function checkFiles(tool, texts, staging, budgets) {
  verifyNativeStaging(staging);
  const files = [];
  try {
    for (const [index, text] of texts.entries())
      files.push(writeStagedFile(staging, `input-${index}.md`, text));
    verifyNativeStaging(staging);
    for (const [index, file] of files.entries()) {
      const stat = lstatSync(file.path, { bigint: true });
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.nlink !== 1n ||
        Object.keys(file.identity).some(
          (key) => stat[key] !== file.identity[key],
        ) ||
        stat.size !== BigInt(Buffer.byteLength(texts[index])) ||
        readFileSync(file.path, "utf8") !== texts[index]
      )
        fail("NATIVE_STAGING", "Private native input changed before checking.");
    }
    const result = spawnSync(
      tool.executable,
      [
        "--native",
        "--config",
        join(staging.path, "snapper-check.toml"),
        "--format",
        "markdown",
        "--max-width",
        "0",
        "--color",
        "never",
        "--check",
        "--output-format",
        "json",
        ...files.map((file) => file.path),
      ],
      {
        cwd: fileURLToPath(new URL("../assets/", import.meta.url)),
        env: {
          ...Object.fromEntries(
            ["SystemRoot", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL"]
              .filter((key) => process.env[key])
              .map((key) => [key, process.env[key]]),
          ),
          RAYON_NUM_THREADS: "1",
        },
        shell: false,
        timeout: budgets.nativeMs ?? 0,
        maxBuffer: budgets.nativeOutputBytes ?? Infinity,
        windowsHide: true,
      },
    );
    return readReports(result, files, texts);
  } finally {
    for (const file of files) removeStagedFile(staging, file);
  }
}

function readReports(result, files, texts) {
  if (result.error || result.signal || ![0, 1].includes(result.status))
    fail("NATIVE_FAILURE", "Native check failed or exceeded resource limits.");
  let reports;
  try {
    reports = JSON.parse(decode(result.stdout));
  } catch {
    fail("NATIVE_REPORT", "Malformed native JSON.");
  }
  if (!Array.isArray(reports) || reports.length > files.length)
    fail("NATIVE_REPORT", "Invalid native group report.");
  // Source/binary fixtures qualify omitted clean records: every eligible owned
  // file is processed before JSON is emitted, and all I/O failures exit fatally.
  const checked = texts.map(() => ({ diagnostics: [], wouldReformat: false }));
  const paths = new Map(files.map((file, index) => [file.path, index]));
  const seen = new Set();
  for (const report of reports) {
    if (
      !report ||
      typeof report !== "object" ||
      Array.isArray(report) ||
      Object.keys(report).length !== 5 ||
      !paths.has(report.file) ||
      seen.has(report.file)
    )
      fail("NATIVE_REPORT", "Invalid native group attribution.");
    const index = paths.get(report.file),
      text = texts[index];
    const sourceLines =
      text === "" ? 0 : text.split("\n").length - Number(text.endsWith("\n"));
    if (
      report.original_lines !== sourceLines ||
      !Number.isSafeInteger(report.formatted_lines) ||
      report.formatted_lines < 0 ||
      typeof report.would_reformat !== "boolean" ||
      !Array.isArray(report.diagnostics) ||
      (!report.would_reformat && !report.diagnostics.length)
    )
      fail("NATIVE_REPORT", "Invalid native group coverage.");
    seen.add(report.file);
    const findings = new Set();
    for (const diagnostic of report.diagnostics) {
      if (
        !diagnostic ||
        Object.keys(diagnostic).length !== 3 ||
        !["fused", "wrap", "long"].includes(diagnostic.kind) ||
        !Number.isSafeInteger(diagnostic.line) ||
        diagnostic.line < 1 ||
        diagnostic.line > sourceLines ||
        typeof diagnostic.excerpt !== "string" ||
        [...diagnostic.excerpt].length > 203 ||
        findings.has(`${diagnostic.kind}:${diagnostic.line}`)
      )
        fail("NATIVE_REPORT", "Invalid or unknown native diagnostic.");
      findings.add(`${diagnostic.kind}:${diagnostic.line}`);
      if (diagnostic.kind !== "long")
        checked[index].diagnostics.push({
          source: "snapper",
          rule: diagnostic.kind,
          line: diagnostic.line,
          column: 1,
          message: `Sentence layout: ${diagnostic.kind}.`,
          severity: "error",
        });
    }
    checked[index].wouldReformat = report.would_reformat;
  }
  if (result.status !== Number(checked.some((item) => item.wouldReformat)))
    fail("NATIVE_REPORT", "Inconsistent native failure report.");
  return checked;
}
