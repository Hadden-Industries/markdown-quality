// SPDX-License-Identifier: AGPL-3.0-only
/** Sentence formatting authority; the long threshold belongs only to check staging. */
export const sentenceDefaults = Object.freeze({
  format: "markdown",
  max_width: 0,
  clause_breaks: false,
});
export function sentenceToml(check = false) {
  return (
    Object.entries({
      ...sentenceDefaults,
      ...(check ? { long_threshold: 2097153 } : {}),
    })
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}\n`)
      .join("") + (check ? "" : "\n")
  );
}
export const nativeFormatArguments = () => [
  "--format",
  sentenceDefaults.format,
  "--max-width",
  String(sentenceDefaults.max_width),
  "--color",
  "never",
];
