// SPDX-License-Identifier: AGPL-3.0-only
import { parse } from "./analysis.js";
import { advisoryDefaults } from "./preset.js";
import { diagnosticCollector } from "./contracts.js";

/** Advisory editorial observations, never fixes or accessibility certification.
 * Disabled rules skip their own work; a fully disabled advisory set does not parse.
 */
export function checkAdvisories(text, config, memo) {
  const enabled = (rule) =>
    (config.lint[rule] ?? advisoryDefaults[rule]) !== "off";
  const duplicateHeadingsEnabled = enabled("quality/duplicate-sibling-heading"),
    headingPunctuationEnabled = enabled("quality/heading-trailing-punctuation"),
    genericLinksEnabled = enabled("quality/generic-link-text"),
    nfcEnabled = enabled("quality/non-nfc-prose"),
    longLinesEnabled = enabled("quality/long-prose-line");
  if (!Object.keys(advisoryDefaults).some(enabled)) return [];
  const collector = diagnosticCollector(config.limits);
  const lines = longLinesEnabled ? text.split(/\r\n|\r|\n/u) : undefined;
  const lineOffsets = longLinesEnabled ? [0] : undefined;
  if (longLinesEnabled)
    for (const match of text.matchAll(/\r\n|\r|\n/gu))
      lineOffsets.push(match.index + match[0].length);
  function report(rule, node, message, position = node.position.start) {
    const selected = config.lint[rule] ?? advisoryDefaults[rule];
    if (selected === "off") return;
    collector.push({
      source: "quality",
      rule,
      severity: selected === "warn" ? "warning" : selected,
      line: position.line,
      column: position.column,
      message,
    });
  }
  function label(node) {
    return node.value ?? (node.children ?? []).map(label).join("");
  }
  function visit(node) {
    if (
      ["code", "inlineCode", "html", "yaml", "toml", "json", "table"].includes(
        node.type,
      )
    )
      return;
    if (node.children) {
      // Lesser-depth headings own sections; containers have independent scopes.
      const ancestors = duplicateHeadingsEnabled ? [] : undefined,
        scopes = duplicateHeadingsEnabled ? new Map() : undefined;
      for (const child of node.children) {
        if (duplicateHeadingsEnabled && child.type === "heading") {
          while (ancestors.length && ancestors.at(-1).depth >= child.depth)
            ancestors.pop();
          const owner = ancestors.at(-1) ?? node;
          let seen = scopes.get(owner);
          if (!seen) scopes.set(owner, (seen = new Set()));
          const key = `${child.depth}:${label(child).trim().toLocaleLowerCase("en")}`;
          if (seen.has(key))
            report(
              "quality/duplicate-sibling-heading",
              child,
              "Duplicate heading in the same parent section.",
            );
          seen.add(key);
          ancestors.push(child);
        }
        visit(child);
      }
    }
    if (
      headingPunctuationEnabled &&
      node.type === "heading" &&
      /[.!,:;]$/u.test(label(node).trim())
    )
      report(
        "quality/heading-trailing-punctuation",
        node,
        "Consider omitting trailing heading punctuation; questions are allowed.",
      );
    if (
      genericLinksEnabled &&
      ["link", "linkReference"].includes(node.type) &&
      /^(?:click here|here|read more|more|link)$/iu.test(label(node).trim())
    )
      report(
        "quality/generic-link-text",
        node,
        "Consider descriptive link text instead of a generic label.",
      );
    if (
      nfcEnabled &&
      node.type === "text" &&
      node.value !== node.value.normalize("NFC")
    )
      report(
        "quality/non-nfc-prose",
        node,
        "Prose contains non-NFC Unicode; no normalization is performed.",
      );
    if (longLinesEnabled && node.type === "paragraph") {
      const exempt = [];
      function exclusions(child) {
        if (
          [
            "inlineCode",
            "html",
            "link",
            "image",
            "linkReference",
            "imageReference",
          ].includes(child.type)
        ) {
          exempt.push([child.position.start.offset, child.position.end.offset]);
          return;
        }
        for (const descendant of child.children ?? []) exclusions(descendant);
      }
      exclusions(node);
      // Source-order traversal yields disjoint, ordered exempt spans. Advance
      // once through them rather than rescanning all links for every character.
      let exemptIndex = 0;
      for (
        let line = node.position.start.line;
        line <= node.position.end.line;
        line++
      ) {
        let length = 0;
        for (let column = 0; column < lines[line - 1].length;) {
          const offset = lineOffsets[line - 1] + column;
          while (
            exemptIndex < exempt.length &&
            exempt[exemptIndex][1] <= offset
          )
            exemptIndex++;
          if (exemptIndex < exempt.length && exempt[exemptIndex][0] <= offset) {
            column = Math.min(
              lines[line - 1].length,
              exempt[exemptIndex][1] - lineOffsets[line - 1],
            );
            continue;
          }
          const character = String.fromCodePoint(
            lines[line - 1].codePointAt(column),
          );
          length++;
          if (length === 121) {
            report(
              "quality/long-prose-line",
              node,
              "Prose line exceeds the informational 120-character threshold.",
              { line, column: column + 1 },
            );
            break;
          }
          column += character.length;
        }
      }
    }
  }
  visit(memo ? memo.parse(text) : parse(text));
  return collector.diagnostics;
}
