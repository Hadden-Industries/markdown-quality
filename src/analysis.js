// SPDX-License-Identifier: AGPL-3.0-only
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { checkLocalLinks, createSpellingObserver } from "./local-links.js";
import { diagnosticBudget, diagnosticCollector } from "./contracts.js";
import { eslintRuleSettings } from "./preset.js";
/** Parse selected front matter as opaque metadata, with original source positions. */
export function parse(text, syntax = { frontmatter: "yaml" }) {
  const matters =
    syntax.frontmatter === false
      ? []
      : syntax.frontmatter === "json"
        ? [{ type: "json", marker: "-", anywhere: false }]
        : [
            {
              type: syntax.frontmatter,
              marker: syntax.frontmatter === "toml" ? "+" : "-",
              anywhere: false,
            },
          ];
  return fromMarkdown(text, {
    extensions: [gfm({ singleTilde: true }), frontmatter(matters)],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(matters)],
  });
}
export function createLinter(context) {
  const rules = eslintRuleSettings(context.config);
  return new ESLint({
    cwd: context.root,
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.md"],
        plugins: { markdown },
        language: "markdown/gfm",
        languageOptions: {
          frontmatter: context.config.syntax?.frontmatter ?? "yaml",
        },
        linterOptions: { noInlineConfig: true },
        rules,
      },
    ],
  });
}
export async function lintDocument(linter, text, file, config) {
  const [result] = await linter.lintText(text, { filePath: file });
  const diagnostics = result.messages.map((d) => ({
    source: "eslint",
    rule: d.ruleId ?? "parse",
    line: d.line ?? 1,
    column: d.column ?? 1,
    message: d.ruleId
      ? (markdown.rules[d.ruleId.slice(9)]?.meta.docs.description ??
        "Markdown rule violation.")
      : "Markdown parsing failed.",
    severity:
      config?.lint[d.ruleId] === "info"
        ? "info"
        : d.severity === 2
          ? "error"
          : "warning",
  }));
  diagnosticBudget(diagnostics, config?.analyzerLimits);
  return diagnostics;
}
/** Check local targets, exact path spelling and same-document fragments. Returns
 * diagnostics plus the document's anchors and cross-document references for the
 * invocation graph owner.
 */
export function checkLinks(context, text, file, memo, spelling) {
  const collector = diagnosticCollector(context.config.analyzerLimits);
  const tree = memo ? memo.parse(text) : parse(text, context.config.syntax);
  const links = checkLocalLinks(
    context,
    tree,
    file,
    collector,
    spelling ??
      createSpellingObserver(context.root, context.config.analyzerLimits ?? {}),
  );
  return { diagnostics: collector.diagnostics, ...links };
}
