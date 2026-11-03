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
  // The package's quality/unresolved-local-fragment rule owns same- and
  // cross-document fragments; the upstream rule stays explicitly selectable.
  "markdown/no-missing-link-fragments": [
    "off",
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
  // Angle-bracket autolinks remain allowed by the upstream rule.
  "markdown/no-bare-urls": "error",
});
/** Package quality-rule severities; any rule can be configured from off to error. */
export const qualityRuleDefaults = Object.freeze({
  "quality/duplicate-sibling-heading": "error",
  "quality/generic-link-text": "error",
  "quality/heading-trailing-punctuation": "warn",
  "quality/long-prose-line": "info",
  // Owner-selected default: decomposed prose blocks; only normalize repairs it.
  "quality/non-nfc-prose": "error",
  "quality/placeholder-image-alt": "error",
  "quality/unlabeled-image-link": "error",
  "quality/disallowed-html-construct": "error",
  "quality/missing-html-image-alt": "error",
  "quality/local-path-case-mismatch": "error",
  "quality/unresolved-local-fragment": "error",
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
export { sentenceDefaults } from "./native-policy.js";
import { sentenceDefaults } from "./native-policy.js";
import { deepFreeze } from "./contracts.js";

export const presetIdentity = "authored-gfm@2";
export const configurationSchemaVersion = 3;

/** Package-owned declarative defaults. Sparse consumer input describes exceptions. */
export const packageConfigurationDefaults = deepFreeze({
  include: ["**/*.md"],
  exclude: ["**/vendor/**", "**/.cache/**", "**/coverage/**"],
  lint: {
    ...Object.fromEntries(
      Object.entries(lintDefaults).map(([rule, setting]) => [
        rule,
        Array.isArray(setting) ? setting[0] : setting,
      ]),
    ),
    ...qualityRuleDefaults,
  },
  syntax: { frontmatter: "yaml" },
  links: { checkLocalTargets: true, rootRelative: "reject" },
  layout: { endOfLine: "lf", tabWidth: 2 },
});

/** Effective upstream ESLint rule settings, with info mapped to ESLint's supported warn. */
export function eslintRuleSettings(config) {
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
    eslintRules: eslintRuleSettings(config),
    formatter: { ...formatterDefaults, ...config.layout, plugins: [] },
    sentenceLayout: sentenceDefaults,
    analyzerLimits: { ...config.analyzerLimits },
  };
}
