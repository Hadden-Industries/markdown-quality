// SPDX-License-Identifier: AGPL-3.0-only
// Authored Markdown whitespace policy; parsed literal payloads are exempt.
import { parse } from "./analysis.js";
import { protectedLiteralRows } from "./literal-layout.js";
import { diagnosticCollector } from "./contracts.js";

/** Find trailing spaces/tabs outside literal payloads, respecting consumer diagnostic budgets. */
export function checkTrailingWhitespace(text, memo, budgets) {
  if (!/[ \t](?:\r\n|\r|\n|$)/u.test(text)) return [];
  const rows = text.split(/(\r\n|\r|\n)/u);
  const codeRows = protectedLiteralRows(
    text,
    memo ? memo.parse(text) : parse(text),
  );
  const collector = diagnosticCollector(budgets);
  for (let row = 0; row < rows.length; row += 2) {
    if (codeRows.has(row)) continue;
    const trailing = /[ \t]+$/u.exec(rows[row]);
    if (!trailing) continue;
    collector.push({
      source: "formatter",
      rule: "trailing-whitespace",
      line: row / 2 + 1,
      column: trailing.index + 1,
      severity: "error",
      message:
        "Trailing spaces and tabs are forbidden outside literal payloads; literal-sensitive fixes require manual editing.",
    });
  }
  return collector.diagnostics;
}

/** Propose trimming with parsed hard breaks made explicit; caller must verify semantics. */
export function normalizeTrailingWhitespace(text, memo) {
  // Most documents need no policy repair. Avoid another Markdown parse there.
  if (!/[ \t](?:\r\n|\r|\n|$)/u.test(text)) return text;
  const tree = memo ? memo.parse(text) : parse(text);
  const rows = text.split(/(\r\n|\r|\n)/u);
  const codeRows = protectedLiteralRows(text, tree);
  const hardBreakRows = new Set();
  function visit(node) {
    // Only the parser can distinguish an actual hard break from spaces at a
    // paragraph end, in a literal, or beside escaped punctuation.
    if (node.type === "break" && text[node.position.start.offset] === " ")
      hardBreakRows.add((node.position.start.line - 1) * 2);
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  for (let row = 0; row < rows.length; row += 2) {
    if (codeRows.has(row) || !/[ \t]+$/u.test(rows[row])) continue;
    rows[row] = rows[row].replace(/[ \t]+$/u, "");
    if (hardBreakRows.has(row)) rows[row] += "\\";
  }
  return rows.join("");
}
