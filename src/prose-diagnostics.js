// SPDX-License-Identifier: AGPL-3.0-only
// List-boundary recheck adapted from OwlAPI at 1cdc5a33b9538cce8ced88f21af18138da7a8923,
// scripts/documentation-quality.mjs, originally from universal-ontology at
// 58a306013d3701f59dfe34341e96fac5a011e3ed. Copyright 2026 Hadden Industries Ltd.
// Original MIT terms retained in LICENSES/MIT-universal-ontology.txt.
import { runNative } from "./native-tool.js";
// Requalified against 0.11.9. Owner approval: this chat, 2026-10-05.
// Mirrors OwlAPI's narrow container boundary and continuation recheck approach.
function listItem(line = "") {
  let offset = 0,
    quotes = 0;
  while (true) {
    const match = /^[ ]{0,3}> ?/u.exec(line.slice(offset));
    if (!match) break;
    offset += match[0].length;
    quotes++;
  }
  const match = /^( {0,3})(\d{1,9}[.)]|[-+*]) +(\S.*)$/u.exec(
    line.slice(offset),
  );
  if (!match) return undefined;
  return {
    prefix: line.slice(0, offset),
    quotes,
    indent: match[1].length,
    ordered: /^\d/u.test(match[2]),
    contentOffset: line.length - match[3].length,
    prose: match[3],
  };
}
export function checkProse(tool, text) {
  const lines = text.split(/\r?\n/u);
  return runNative(tool, text, true).filter((d) => {
    const index = d.line - 1,
      item = listItem(lines[index]);
    if (!item) return true;
    const previous = listItem(lines[index - 1]);
    const quotedNumber = d.rule === "fused" && item.quotes > 0 && item.ordered;
    const adjacent =
      d.rule === "wrap" &&
      previous &&
      previous.prefix === item.prefix &&
      previous.indent === item.indent &&
      previous.ordered === item.ordered;
    if (!quotedNumber && !adjacent) return true;
    const prose = [item.prose];
    for (let next = index + 1; next < lines.length; next++) {
      const line = lines[next];
      if (!line.startsWith(item.prefix) || listItem(line)) break;
      const content = line.slice(item.prefix.length),
        indent = item.contentOffset - item.prefix.length;
      if (!content.startsWith(" ".repeat(indent))) break;
      prose.push(content.slice(indent));
    }
    // Malformed output, unknown findings, crashes, and timeouts still fail closed.
    return runNative(tool, prose.join("\n") + "\n", true).length !== 0;
  });
}
