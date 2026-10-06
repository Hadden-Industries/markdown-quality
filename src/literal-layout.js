// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import * as prettier from "prettier";
import { parse } from "./analysis.js";
import { fail } from "./contracts.js";

/** Return split-array code-body row indices, optionally collecting empty indented rows. */
export function codeBodyRows(
  text,
  tree = parse(text),
  emptyIndentedRows = null,
) {
  const rows = text.split(/(\r\n|\r|\n)/u);
  const selected = new Set();
  function visit(node, quoteDepth = 0) {
    if (node.type === "blockquote") quoteDepth++;
    if (node.type === "code") {
      // mdast locates actual opening fences at their marker; indented code
      // starts at its indentation, even if its literal text resembles a fence.
      const opening = /^(`{3,}|~{3,})/u.exec(
        text.slice(node.position.start.offset),
      );
      let closing = rows[(node.position.end.line - 1) * 2];
      for (let quote = 0; quote < quoteDepth; quote++) {
        const prefix = /^[ \t]*>[ \t]?/u.exec(closing);
        if (!prefix) {
          closing = "";
          break;
        }
        closing = closing.slice(prefix[0].length);
      }
      closing = closing.replace(/^[ \t]+|[ \t]+$/gu, "");
      const closed =
        opening &&
        closing.length >= opening[1].length &&
        [...closing].every((character) => character === opening[1][0]) &&
        // A fence-shaped line can itself be literal content. The maintained
        // parser omits a real closer from its value; compare source/value line
        // counts rather than inferring valid closing indentation ourselves.
        (node.value === "" ||
          node.position.end.line -
            node.position.start.line -
            (node.position.end.column === 1 ? 1 : 0) >
            node.value.split(/\r\n|\r|\n/u).length);
      // An EOF position at column one names the following empty source row,
      // not another literal line. Marking it would add a newline to the value.
      const endLine =
        node.position.end.line -
        (closed || node.position.end.column === 1 ? 1 : 0);
      const valueRows =
        !opening && emptyIndentedRows ? node.value.split(/\r\n|\r|\n/u) : null;
      for (
        let line = node.position.start.line - (opening ? 0 : 1);
        line < endLine;
        line++
      ) {
        if (rows[line * 2] !== undefined) selected.add(line * 2);
        if (valueRows?.[line - node.position.start.line + 1] === "")
          emptyIndentedRows.add(line * 2);
      }
    }
    for (const child of node.children ?? []) visit(child, quoteDepth);
  }
  visit(tree);
  return selected;
}

// embeddedLanguageFormatting: off still allows Prettier to trim code-line
// whitespace. Keep those lines nonempty until layout finishes, then remove the
// absent marker before native analysis or the unchanged semantic guard runs.
export async function formatLayout(text, options) {
  const rows = text.split(/(\r\n|\r|\n)/u);
  const emptyIndentedRows = new Set();
  const codeRows = codeBodyRows(text, parse(text), emptyIndentedRows);
  const selected = new Set(
    [...codeRows].filter(
      // An empty indented-code value needs no protection. A marker without its
      // missing indentation would become prose and split the code block.
      (line) =>
        !emptyIndentedRows.has(line) &&
        (rows[line] === "" || /\s$/u.test(rows[line])),
    ),
  );
  if (!selected.size) return prettier.format(text, options);
  let marker;
  for (let code = 0xe000; code < 0xe100; code++) {
    const candidate = String.fromCharCode(code);
    if (!text.includes(candidate)) {
      marker = candidate;
      break;
    }
  }
  marker ??= `MQ_LITERAL_${createHash("sha256").update(text).digest("hex")}`;
  if (text.includes(marker))
    fail("PRESERVATION", "Cannot protect literal layout without a collision.");
  for (const line of selected) rows[line] += marker;
  const formatted = await prettier.format(rows.join(""), options);
  if (formatted.split(marker).length - 1 !== selected.size)
    fail("PRESERVATION", "Formatting changed literal layout protection.");
  return formatted.replaceAll(marker, "");
}
