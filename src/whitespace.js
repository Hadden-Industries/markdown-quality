// SPDX-License-Identifier: AGPL-3.0-only
// Authored Markdown whitespace policy; literal code bodies are the only exemption.
import { parse } from "./analysis.js";
import { codeBodyRows } from "./literal-layout.js";
import { fail, limits } from "./contracts.js";

/** Find every non-code trailing space/tab, or fail at the document diagnostic bound. */
export function checkTrailingWhitespace(text) {
  if (!/[ \t](?:\r\n|\r|\n|$)/u.test(text)) return [];
  const rows = text.split(/(\r\n|\r|\n)/u);
  const codeRows = codeBodyRows(text);
  const diagnostics = [];
  for (let row = 0; row < rows.length; row += 2) {
    if (codeRows.has(row)) continue;
    const trailing = /[ \t]+$/u.exec(rows[row]);
    if (!trailing) continue;
    if (diagnostics.length >= limits.documentDiagnostics)
      fail(
        "DIAGNOSTIC_LIMIT",
        "Diagnostic count or output bytes exceed the limit.",
      );
    diagnostics.push({
      source: "formatter",
      rule: "trailing-whitespace",
      line: row / 2 + 1,
      column: trailing.index + 1,
      severity: "error",
      message:
        "Trailing spaces and tabs are forbidden outside code-block contents; literal-sensitive fixes require manual editing.",
    });
  }
  return diagnostics;
}

/** Propose trimming with parsed hard breaks made explicit; caller must verify semantics. */
export function normalizeTrailingWhitespace(text) {
  // Most documents need no policy repair. Avoid another Markdown parse there.
  if (!/[ \t](?:\r\n|\r|\n|$)/u.test(text)) return text;
  const tree = parse(text);
  const rows = text.split(/(\r\n|\r|\n)/u);
  const codeRows = codeBodyRows(text, tree);
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
