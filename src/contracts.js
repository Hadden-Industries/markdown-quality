// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defaultAnalyzerLimits } from "./analyzer-limits.js";
export const packageRoot = new URL("../", import.meta.url);
export const metadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
/** Null is an explicit bypass, never a request to restore defaults. */
export const exceeds = (value, ceiling) => ceiling !== null && value > ceiling;
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
/** Deterministic JSON for identity preimages: object keys in code-unit order, arrays
 * in their own order, no insignificant whitespace. Only plain JSON data is admitted.
 */
export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_IDENTITY", "Identity data must be finite JSON.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (
    typeof value === "object" &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    return (
      "{" +
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  fail("INVALID_IDENTITY", "Identity data must be plain JSON.");
}
/** Deep-freeze plain data so a resolved snapshot cannot be mutated by a consumer. */
export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}
export class OperationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function fail(code, message) {
  throw new OperationError(code, message);
}
/** Closed SDK object admission: removed spellings name their replacement, and any
 * other unknown key is refused instead of being silently ignored.
 */
export function admitKeys(
  value,
  allowed,
  removed = {},
  code = "INVALID_OPTION",
) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code, "Options must be a plain object.");
  for (const key of Object.keys(value)) {
    if (Object.hasOwn(removed, key))
      fail(code, `Option ${key} was removed; use ${removed[key]}.`);
    if (!allowed.includes(key)) fail(code, "Unknown option: " + key);
  }
  return value;
}
export function diagnosticBudget(diagnostics, budgets = defaultAnalyzerLimits) {
  if (
    exceeds(diagnostics.length, budgets.maxDocumentDiagnostics) ||
    (budgets.maxDiagnosticJsonBytes !== null &&
      exceeds(
        Buffer.byteLength(JSON.stringify(diagnostics)),
        budgets.maxDiagnosticJsonBytes,
      ))
  )
    fail(
      "DIAGNOSTIC_LIMIT",
      "Diagnostic count or output bytes exceed the limit.",
    );
}
/** Collect incrementally so a large permitted report does not require quadratic serialization. */
export function diagnosticCollector(
  budgets = defaultAnalyzerLimits,
  batch = false,
) {
  const diagnostics = [];
  let bytes = 2;
  return {
    diagnostics,
    push(diagnostic) {
      const nextBytes =
        budgets.maxDiagnosticJsonBytes === null
          ? 0
          : bytes +
            Buffer.byteLength(JSON.stringify(diagnostic)) +
            Number(diagnostics.length > 0);
      if (
        exceeds(
          diagnostics.length + 1,
          batch ? budgets.maxTotalDiagnostics : budgets.maxDocumentDiagnostics,
        ) ||
        exceeds(nextBytes, budgets.maxDiagnosticJsonBytes)
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
/** A presentation ceiling never splits a Unicode scalar. Null retains the full
 * excerpt; aggregate diagnostic and output quotas still apply afterward. */
export function diagnosticExcerpt(value, maximum) {
  if (maximum === null) return value;
  let end = 0,
    count = 0;
  for (const character of value) {
    if (count++ === maximum) return value.slice(0, end) + "…";
    end += character.length;
  }
  return value;
}
export function decode(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8", "Input is not valid UTF-8.");
  }
}
