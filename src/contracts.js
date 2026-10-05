// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export const packageRoot = new URL("../", import.meta.url);
export const metadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
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
});
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
export function diagnosticBudget(diagnostics) {
  if (
    diagnostics.length > limits.documentDiagnostics ||
    Buffer.byteLength(JSON.stringify(diagnostics)) > limits.diagnosticBytes
  )
    fail(
      "DIAGNOSTIC_LIMIT",
      "Diagnostic count or output bytes exceed the limit.",
    );
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
