// SPDX-License-Identifier: AGPL-3.0-only
import { createRequire } from "node:module";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { decode, digest, fail, limits, metadata } from "./contracts.js";
const require = createRequire(import.meta.url);
export const manifest = JSON.parse(
  readFileSync(
    new URL("../assets/tool-manifest.json", import.meta.url),
    "utf8",
  ),
);
export function resolveTool() {
  const key = `${process.platform}-${process.arch}`;
  const spec = manifest.platforms[key];
  if (
    !spec ||
    (process.platform === "linux" &&
      !process.report.getReport().header.glibcVersionRuntime)
  )
    fail(
      "UNSUPPORTED_PLATFORM",
      "Only Windows x64 and glibc Linux x64 are supported.",
    );
  let pkg;
  try {
    pkg = require.resolve(spec.package + "/package.json");
  } catch {
    fail(
      "MISSING_TOOL",
      "Install the matching optional platform package with lifecycle scripts disabled.",
    );
  }
  if (JSON.parse(readFileSync(pkg, "utf8")).version !== metadata.version)
    fail("TOOL_VERSION", "Core and native package versions differ.");
  const executable = join(dirname(pkg), spec.executable);
  if (!lstatSync(executable).isFile() || lstatSync(executable).isSymbolicLink())
    fail("TOOL_IDENTITY", "Native executable must be a regular file.");
  if (digest(readFileSync(executable)) !== spec.sha256)
    fail("TOOL_IDENTITY", "Native executable digest mismatch.");
  return {
    executable: realpathSync(executable),
    key,
    version: manifest.snapperVersion,
    sha256: spec.sha256,
  };
}
export function validateDiagnostics(result, text) {
  if (result.error || result.signal || ![0, 1].includes(result.status))
    fail("NATIVE_FAILURE", "Native check failed or exceeded resource limits.");
  let reports;
  try {
    reports = JSON.parse(decode(result.stdout));
  } catch {
    fail("NATIVE_REPORT", "Malformed native JSON.");
  }
  if (Array.isArray(reports) && reports.length === 0 && result.status === 0)
    return [];
  if (
    !Array.isArray(reports) ||
    reports.length !== 1 ||
    typeof reports[0]?.would_reformat !== "boolean" ||
    !Array.isArray(reports[0].diagnostics)
  )
    fail("NATIVE_REPORT", "Invalid single-document native report.");
  const lines = text.split("\n").length;
  for (const d of reports[0].diagnostics)
    if (
      !d ||
      !["fused", "wrap", "long"].includes(d.kind) ||
      !Number.isSafeInteger(d.line) ||
      d.line < 1 ||
      d.line > lines ||
      typeof d.excerpt !== "string"
    )
      fail("NATIVE_REPORT", "Invalid or unknown native diagnostic.");
  if (
    result.status === 1 &&
    reports[0].diagnostics.length === 0 &&
    !reports[0].would_reformat
  )
    fail("NATIVE_REPORT", "Inconsistent native failure report.");
  // Snapper's documented advisory length threshold is independent of wrapping.
  // This preset has no sentence-length policy; validate but omit that advisory.
  return reports[0].diagnostics
    .filter((d) => d.kind !== "long")
    .map((d) => ({
      source: "snapper",
      rule: d.kind,
      line: d.line,
      column: 1,
      message: `Sentence layout: ${d.kind}.`,
      severity: "error",
    }));
}
export function runNative(tool, text, check = false) {
  const args = [
    "--native",
    "--config",
    fileURLToPath(new URL("../assets/snapper.toml", import.meta.url)),
    "--format",
    "markdown",
    "--stdin-filepath",
    "document.md",
    "--max-width",
    "0",
    "--color",
    "never",
  ];
  if (check) args.push("--check", "--output-format", "json");
  // A fixed working directory and virtual filename keep consumer configuration out.
  const env = Object.fromEntries(
    ["SystemRoot", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL"]
      .filter((k) => process.env[k])
      .map((k) => [k, process.env[k]]),
  );
  const result = spawnSync(tool.executable, args, {
    input: Buffer.from(text),
    cwd: fileURLToPath(new URL("../assets/", import.meta.url)),
    env,
    shell: false,
    timeout: limits.nativeMs,
    maxBuffer: limits.nativeOutputBytes,
    windowsHide: true,
  });
  if (check) return validateDiagnostics(result, text);
  if (result.error || result.signal || result.status !== 0)
    fail(
      "NATIVE_FAILURE",
      "Native formatter failed or exceeded resource limits.",
    );
  return decode(result.stdout);
}
