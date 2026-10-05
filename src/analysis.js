// SPDX-License-Identifier: AGPL-3.0-only
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { safePath } from "./configuration.js";
import { fail, limits } from "./contracts.js";
export const parse = (text) =>
  fromMarkdown(text, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
export function createLinter(context) {
  const defaults = {
    ...markdown.configs.recommended[0].rules,
    "markdown/table-column-count": "error",
    "markdown/no-missing-label-refs": [
      "error",
      { allowLabels: ["!NOTE", "!TIP", "!IMPORTANT", "!WARNING", "!CAUTION"] },
    ],
  };
  const rules = { ...defaults };
  for (const [rule, severity] of Object.entries(context.config.lint))
    rules[rule] = Array.isArray(defaults[rule])
      ? [severity, ...defaults[rule].slice(1)]
      : severity;
  return new ESLint({
    cwd: context.root,
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.md"],
        plugins: { markdown },
        language: "markdown/gfm",
        linterOptions: { noInlineConfig: true },
        rules,
      },
    ],
  });
}
export async function lintDocument(linter, text, file) {
  const [result] = await linter.lintText(text, { filePath: file });
  if (result.messages.length > limits.documentDiagnostics)
    fail(
      "DIAGNOSTIC_LIMIT",
      "Diagnostic count or output bytes exceed the limit.",
    );
  return result.messages.map((d) => ({
    source: "eslint",
    rule: d.ruleId ?? "parse",
    line: d.line ?? 1,
    column: d.column ?? 1,
    message: d.ruleId
      ? (markdown.rules[d.ruleId.slice(9)]?.meta.docs.description ??
        "Markdown rule violation.")
      : "Markdown parsing failed.",
    severity: d.severity === 2 ? "error" : "warning",
  }));
}
export function checkLinks(context, text, file) {
  if (!context.config.links.localFiles) return [];
  const diagnostics = [];
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
          if (diagnostics.length >= limits.documentDiagnostics)
            fail(
              "DIAGNOSTIC_LIMIT",
              "Diagnostic count or output bytes exceed the limit.",
            );
          diagnostics.push({
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
  walk(parse(text));
  return diagnostics;
}
