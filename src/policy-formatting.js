// SPDX-License-Identifier: AGPL-3.0-only
import { parse } from "./analysis.js";
import { fail } from "./contracts.js";

/** Narrow source-span fixes for policy choices the maintained printer does not expose. */
export function canonicalizePolicy(text, memo) {
  const tree = memo ? memo.parse(text) : parse(text);
  const edits = [];
  const replace = (start, end, value) => {
    if (text.slice(start, end) !== value) edits.push({ start, end, value });
  };
  function visit(node, inHeading = false) {
    const start = node.position?.start.offset,
      end = node.position?.end.offset;
    if (node.type === "emphasis" && text[start] === "_") {
      replace(start, start + 1, "*");
      replace(end - 1, end, "*");
    }
    if (node.type === "heading") {
      const first = node.children[0]?.position.start.offset;
      const last = node.children.at(-1)?.position.end.offset;
      if (first !== undefined) {
        replace(start, first, "#".repeat(node.depth) + " ");
        replace(last, end, "");
      }
      inHeading = true;
    }
    if (inHeading && node.type === "inlineCode")
      replace(start, end, text.slice(start, end).replace(/\r\n|\r|\n/gu, " "));
    if (inHeading && node.type === "text")
      replace(
        start,
        end,
        text
          .slice(start, end)
          .replace(/[ \t]*(?:\r\n|\r|\n)(?:[ \t]{0,3}>[ \t]?)*[ \t]*/gu, " "),
      );
    if (
      inHeading &&
      (node.type === "break" ||
        (node.type === "html" && /[\r\n]/u.test(text.slice(start, end))))
    )
      fail(
        "PRESERVATION",
        "A multiline heading literal or hard break cannot be represented by an ATX heading; edit the heading explicitly.",
      );
    // Delimiter differences separate CommonMark lists. Changing both to dots
    // would merge them; inserting an unrequested HTML separator changes content.
    for (let index = 1; index < (node.children?.length ?? 0); index++) {
      const before = node.children[index - 1],
        after = node.children[index];
      if (
        before.type === "list" &&
        before.ordered &&
        after.type === "list" &&
        after.ordered
      )
        fail(
          "PRESERVATION",
          "Canonical dots would merge adjacent ordered lists; consolidate them or add an explicit separating block.",
        );
    }
    if (node.type === "list" && node.ordered) {
      for (const [index, item] of node.children.entries()) {
        const offset = item.position.start.offset;
        const marker = /^\d+[.)][ \t]+/u.exec(text.slice(offset));
        if (marker)
          replace(offset, offset + marker[0].length, `${node.start + index}. `);
      }
    }
    if (node.type === "code" && !/^(`{3,}|~{3,})/u.test(text.slice(start))) {
      const lineStart =
        Math.max(
          text.lastIndexOf("\n", start - 1),
          text.lastIndexOf("\r", start - 1),
        ) + 1;
      const prefix = text.slice(lineStart, start);
      const continuation = prefix.replace(
        /(?:\d+[.)]|[-+*])(?=[ \t])/gu,
        (marker) => " ".repeat(marker.length),
      );
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      const longest = Math.max(
        2,
        ...Array.from(node.value.matchAll(/`+/gu), (match) => match[0].length),
      );
      const fence = "`".repeat(longest + 1);
      const body = node.value.replace(/\r\n|\r|\n/gu, eol + continuation);
      replace(
        start,
        end,
        `${fence}${eol}${continuation}${body}${eol}${continuation}${fence}`,
      );
      return;
    }
    for (const child of node.children ?? []) visit(child, inHeading);
  }
  visit(tree);
  const pieces = [];
  let offset = 0;
  for (const edit of edits.sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (edit.start < offset)
      fail("PRESERVATION", "Canonical policy edits overlap.");
    pieces.push(text.slice(offset, edit.start), edit.value);
    offset = edit.end;
  }
  pieces.push(text.slice(offset));
  return pieces.join("");
}
