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
      records.push({ start, end, replacement, raw });
      return;
    }
    for (const child of node.children ?? []) visit(child, inlineContext);
  }
  visit(tree);
  let protectedText = text;
  for (const record of [...records].reverse())
    protectedText =
      protectedText.slice(0, record.start) +
      record.replacement +
      protectedText.slice(record.end);
  return {
    text: protectedText,
    restore(output) {
      const eol = endOfLine === "crlf" ? "\r\n" : "\n";
      for (const record of records) {
        const needle = record.replacement.replace(/\r\n|\r|\n/gu, eol);
        if (output.split(needle).length !== 2)
          fail("PRESERVATION", "Formatting changed opaque literal protection.");
        output = output.replace(needle, () =>
          record.raw.replace(/\r\n|\r|\n/gu, eol),
        );
      }
      return output;
    },
  };
}
