// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export const packageRoot = new URL("../", import.meta.url);
export const metadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
/** Explicit resource defaults; consumers may override any field or select null (unlimited). */
export const limits = Object.freeze({
  fileBytes: 2_097_152,
  totalBytes: 33_554_432,
  files: 10_000,
  entries: 100_000,
  configBytes: 262_144,
  nativeMs: 15_000,
  nativeOutputBytes: 8_388_608,
  diagnostics: 10_000,
  documentDiagnostics: 1_000,
  diagnosticBytes: 4_194_304,
  selectionBytes: 4_194_304,
  analysisMs: 30_000,
  workerHeapMb: 128,
  workerStackMb: 4,
  stagingMs: 1_000,
  stagingOutputBytes: 65_536,
  patterns: 100,
  patternLength: 512,
  ignoreFiles: 10,
  lintRules: 60,
});
/** Null is an explicit bypass, never a request to restore defaults. */
export const exceeds = (value, ceiling) => ceiling !== null && value > ceiling;
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export class OperationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function fail(code, message) {
  throw new OperationError(code, message);
}
export function diagnosticBudget(diagnostics, budgets = limits) {
  if (
    exceeds(diagnostics.length, budgets.documentDiagnostics) ||
    (budgets.diagnosticBytes !== null &&
      exceeds(
        Buffer.byteLength(JSON.stringify(diagnostics)),
        budgets.diagnosticBytes,
      ))
  )
    fail(
      "DIAGNOSTIC_LIMIT",
      "Diagnostic count or output bytes exceed the limit.",
    );
}
/** Collect incrementally so a large permitted report does not require quadratic serialization. */
export function diagnosticCollector(budgets = limits, batch = false) {
  const diagnostics = [];
  let bytes = 2;
  return {
    diagnostics,
    push(diagnostic) {
      const nextBytes =
        budgets.diagnosticBytes === null
          ? 0
          : bytes +
            Buffer.byteLength(JSON.stringify(diagnostic)) +
            Number(diagnostics.length > 0);
      if (
        exceeds(
          diagnostics.length + 1,
          batch ? budgets.diagnostics : budgets.documentDiagnostics,
        ) ||
        exceeds(nextBytes, budgets.diagnosticBytes)
      )
        fail(
          "DIAGNOSTIC_LIMIT",
          "Diagnostic count or output bytes exceed the limit.",
        );
      bytes = nextBytes;
      diagnostics.push(diagnostic);
    },
  };
}
export function terminalText(value) {
  return String(value).replace(
    /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/gu,
    (character) =>
      "\\u" + character.codePointAt(0).toString(16).padStart(4, "0"),
  );
}
export function decode(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8", "Input is not valid UTF-8.");
  }
}
