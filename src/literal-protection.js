// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { parse } from "./analysis.js";
import { fail } from "./contracts.js";

/** Keep opaque metadata/HTML and whitespace-sensitive code spans out of printers. */
export function protectOpaqueLiterals(text, memo, endOfLine) {
  const tree = memo ? memo.parse(text) : parse(text);
  const records = [];
  const seed = "MQ_OPAQUE_" + createHash("sha256").update(text).digest("hex");
  if (text.includes(seed))
    fail("PRESERVATION", "Literal protection collision.");
  function visit(node, inline = false) {
    const inlineContext =
      inline || ["paragraph", "heading", "tableCell"].includes(node.type);
    const start = node.position.start.offset,
      end = node.position.end.offset;
    const raw = text.slice(start, end);
    if (
      ["yaml", "toml", "json", "html"].includes(node.type) ||
      (node.type === "inlineCode" && /[ \t](?:\r\n|\r|\n)/u.test(raw))
    ) {
      const marker = seed + "_" + records.length;
      const replacement =
        node.type === "inlineCode"
          ? `\`${marker}\``
          : node.type === "html"
            ? // A comment placeholder can become a block in a loose list and
              // split a continued paragraph. Keep inline HTML inline for printers.
              inline
              ? `<span data-mq="${marker}"></span>`
              : `<!-- ${marker} -->`
            : `${node.type === "toml" ? "+++" : "---"}\n${marker}\n${node.type === "toml" ? "+++" : "---"}`;
      records.push({ start, end, marker, replacement, raw });
      return;
    }
    for (const child of node.children ?? []) visit(child, inlineContext);
  }
  visit(tree);
  // Source-order spans permit one assembly. Rebuilding a megabyte document per
  // inline HTML node made retained real corpora exceed the analysis deadline.
  const protectedPieces = [];
  let offset = 0;
  for (const record of records) {
    protectedPieces.push(text.slice(offset, record.start), record.replacement);
    offset = record.end;
  }
  protectedPieces.push(text.slice(offset));
  return {
    text: protectedPieces.join(""),
    restore(output) {
      const eol = endOfLine === "crlf" ? "\r\n" : "\n";
      const pieces = [],
        seen = new Set();
      let offset = 0;
      // Scan the collision-checked seed once; require every complete wrapper
      // exactly once, including markers a printer duplicated outside a wrapper.
      for (const match of output.matchAll(new RegExp(seed + "_(\\d+)", "gu"))) {
        const index = Number(match[1]);
        const record = records[index];
        if (!record || seen.has(index) || match[0] !== record.marker)
          fail("PRESERVATION", "Formatting changed opaque literal protection.");
        const needle = record.replacement.replace(/\r\n|\r|\n/gu, eol);
        const start = match.index - needle.indexOf(record.marker);
        const end = start + needle.length;
        if (start < offset || output.slice(start, end) !== needle)
          fail("PRESERVATION", "Formatting changed opaque literal protection.");
        seen.add(index);
        pieces.push(
          output.slice(offset, start),
          record.raw.replace(/\r\n|\r|\n/gu, eol),
        );
        offset = end;
      }
      if (seen.size !== records.length)
        fail("PRESERVATION", "Formatting changed opaque literal protection.");
      pieces.push(output.slice(offset));
      return pieces.join("");
    },
  };
}
