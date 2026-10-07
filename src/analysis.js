// SPDX-License-Identifier: AGPL-3.0-only
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { safePath } from "./configuration.js";
import { diagnosticBudget, diagnosticCollector } from "./contracts.js";
import { nativeLintRules } from "./preset.js";
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
  const rules = nativeLintRules(context.config);
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
  diagnosticBudget(diagnostics, config?.limits);
  return diagnostics;
}
export function checkLinks(context, text, file, memo) {
  if (!context.config.links.localFiles) return [];
  const collector = diagnosticCollector(context.config.limits);
  function walk(node) {
    if (["link", "image", "definition"].includes(node.type)) {
      const target = node.url;
      if (
        target &&
        !target.startsWith("#") &&
        !/^[a-zA-Z][a-zA-Z\d+.-]*:/u.test(target) &&
        !target.startsWith("//")
      ) {
        try {
          const raw = target.split(/[?#]/u)[0];
          const decoded = decodeURIComponent(raw);
          if (decoded.includes("\\") || decoded.includes("\0"))
            throw new Error("Invalid target.");
          if (
            decoded.startsWith("/") &&
            context.config.links.rootRelative === "reject"
          )
            throw new Error(
              "Root-relative links require explicit root policy.",
            );
          const path = safePath(
            context.root,
            decoded.startsWith("/")
              ? resolve(context.root, "." + decoded)
              : resolve(context.root, dirname(file), decoded),
          );
          const stat = lstatSync(path);
          if (!stat.isFile() && !stat.isDirectory())
            throw new Error("Target is not a file or directory.");
        } catch (error) {
          collector.push({
            source: "links",
            rule: "local-target",
            line: node.position.start.line,
            column: node.position.start.column,
            message:
              "Local target is missing, invalid, linked, or outside the root.",
            severity: "error",
          });
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(memo ? memo.parse(text) : parse(text));
  return collector.diagnostics;
}
