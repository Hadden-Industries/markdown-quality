// SPDX-License-Identifier: AGPL-3.0-only
/** Reviewed policy values. Upstream recommended configurations are never inputs. */
export const lintDefaults = Object.freeze({
  "markdown/fenced-code-language": ["error", { required: [] }],
  "markdown/heading-increment": ["error", { frontmatterTitle: "(?!)" }],
  "markdown/no-duplicate-definitions": [
    "error",
    {
      allowDefinitions: ["//"],
      allowFootnoteDefinitions: [],
      checkFootnoteDefinitions: true,
    },
  ],
  "markdown/no-empty-definitions": [
    "error",
    {
      allowDefinitions: ["//"],
      allowFootnoteDefinitions: [],
      checkFootnoteDefinitions: true,
    },
  ],
  "markdown/no-empty-images": "error",
  "markdown/no-empty-links": "error",
  "markdown/no-invalid-label-refs": "error",
  "markdown/no-missing-atx-heading-space": [
    "error",
    { checkClosedHeadings: false },
  ],
  "markdown/no-missing-label-refs": [
    "error",
    { allowLabels: ["!NOTE", "!TIP", "!IMPORTANT", "!WARNING", "!CAUTION"] },
  ],
  "markdown/no-missing-link-fragments": [
    "error",
    { ignoreCase: true, allowPattern: "" },
  ],
  "markdown/no-multiple-h1": ["error", { frontmatterTitle: "(?!)" }],
  "markdown/no-reference-like-urls": "error",
  "markdown/no-reversed-media-syntax": "error",
  "markdown/no-space-in-emphasis": ["error", { checkStrikethrough: false }],
  "markdown/no-unused-definitions": [
    "error",
    {
      allowDefinitions: ["//"],
      allowFootnoteDefinitions: [],
      checkFootnoteDefinitions: true,
    },
  ],
  "markdown/require-alt-text": "error",
  "markdown/table-column-count": ["error", { checkMissingCells: true }],
  "markdown/no-html": ["off", { allowed: [], allowedIgnoreCase: false }],
  "markdown/no-bare-urls": "off",
});
export const advisoryDefaults = Object.freeze({
  "quality/duplicate-sibling-heading": "warn",
  "quality/generic-link-text": "warn",
  "quality/heading-trailing-punctuation": "info",
  "quality/long-prose-line": "info",
  "quality/non-nfc-prose": "info",
});
export const formatterDefaults = Object.freeze({
  parser: "markdown",
  proseWrap: "preserve",
  embeddedLanguageFormatting: "off",
  endOfLine: "lf",
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  singleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  semi: true,
  arrowParens: "always",
  htmlWhitespaceSensitivity: "css",
});
export const sentenceDefaults = Object.freeze({
  format: "markdown",
  max_width: 0,
  clause_breaks: false,
});

/** Effective native rule settings, with info mapped to ESLint's supported warn. */
export function nativeLintRules(config) {
  const rules = {};
  for (const [rule, selected] of Object.entries(config.lint)) {
    if (!rule.startsWith("markdown/")) continue;
    const severity = selected === "info" ? "warn" : selected;
    const defaults = lintDefaults[rule];
    rules[rule] = Array.isArray(defaults)
      ? [severity, ...defaults.slice(1)]
      : severity;
  }
  return rules;
}
export function effectivePolicy(config) {
  return {
    dialect: "gfm",
    frontmatter: config.syntax.frontmatter,
    lint: nativeLintRules(config),
    formatter: { ...formatterDefaults, ...config.layout, plugins: [] },
    sentence: sentenceDefaults,
    limits: { ...config.limits },
  };
}
