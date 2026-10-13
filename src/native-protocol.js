// SPDX-License-Identifier: AGPL-3.0-only
export const nativeGroupCapacity = 32;
export const nativeGroupInputBytes = 4_194_304;
export const nativeInputName = (index) => `input-${index}.md`;
const inputNames = new Set(
  Array.from({ length: nativeGroupCapacity }, (_, index) =>
    nativeInputName(index),
  ),
);
export const isNativeInputName = (name) => inputNames.has(name);
export const nativeDiagnosticKinds = Object.freeze(["fused", "wrap", "long"]);
/** Called only after the owning stdin/file protocol has admitted the report. */
export function nativeDiagnostic(diagnostic) {
  return diagnostic.kind === "long"
    ? null
    : {
        source: "snapper",
        rule: diagnostic.kind,
        line: diagnostic.line,
        column: 1,
        message: `Sentence layout: ${diagnostic.kind}.`,
        severity: "error",
      };
}
