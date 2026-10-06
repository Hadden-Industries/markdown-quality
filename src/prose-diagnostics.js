// SPDX-License-Identifier: AGPL-3.0-only
// List-boundary recheck adapted from OwlAPI at 1cdc5a33b9538cce8ced88f21af18138da7a8923,
// scripts/documentation-quality.mjs, originally from universal-ontology at
// 58a306013d3701f59dfe34341e96fac5a011e3ed. Copyright 2026 Hadden Industries Ltd.
// Original MIT terms retained in LICENSES/MIT-universal-ontology.txt.
import { runNative } from "./native-tool.js";
import { runNativeChecks } from "./native-checks.js";
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

/** Recheck complete independent list items in bounded groups, retaining finding order. */
export function checkProseGroup(
  tool,
  texts,
  staging,
  observer,
  admittedChecks,
) {
  let checkMilliseconds = 0;
  function check(inputs) {
    const owners = inputs.map((input) => input.owner);
    const uniqueOwners = [...new Set(owners)];
    observer?.start(uniqueOwners);
    const started = performance.now();
    let nativeMilliseconds = 0;
    try {
      return runNativeChecks(
        tool,
        inputs.map((input) => input.text),
        staging,
        observer && {
          start: (indices) =>
            observer.start([...new Set(indices.map((index) => owners[index]))]),
          finish: (indices, elapsed) => {
            nativeMilliseconds += elapsed;
            observer.finish(
              [...new Set(indices.map((index) => owners[index]))],
              elapsed,
            );
          },
        },
      );
    } finally {
      const elapsed = performance.now() - started;
      checkMilliseconds += elapsed;
      observer?.finish(uniqueOwners, Math.max(0, elapsed - nativeMilliseconds));
    }
  }
  const checked = new Array(texts.length);
  const unchecked = [];
  for (const [owner, text] of texts.entries()) {
    const admitted = admittedChecks?.[owner];
    if (admitted) checked[owner] = admitted;
    else unchecked.push({ text, owner });
  }
  if (unchecked.length) {
    const results = check(unchecked);
    for (const [index, input] of unchecked.entries())
      checked[input.owner] = results[index];
  }
  const keep = checked.map((entry) => entry.diagnostics.map(() => true));
  let pending = [],
    pendingBytes = 0;
  function flush() {
    if (!pending.length) return;
    const items = pending;
    pending = [];
    pendingBytes = 0;
    const results = check(items);
    for (const [index, result] of results.entries())
      keep[items[index].owner][items[index].finding] =
        result.diagnostics.length !== 0;
  }
  for (const [owner, text] of texts.entries()) {
    observer?.start([owner]);
    const started = performance.now(),
      previousChecks = checkMilliseconds;
    try {
      const lines = text.split(/\r?\n/u);
      for (const [finding, diagnostic] of checked[
        owner
      ].diagnostics.entries()) {
        const index = diagnostic.line - 1,
          item = listItem(lines[index]);
        if (!item) continue;
        const previous = listItem(lines[index - 1]);
        const quotedNumber =
          diagnostic.rule === "fused" && item.quotes > 0 && item.ordered;
        const adjacent =
          diagnostic.rule === "wrap" &&
          previous &&
          previous.prefix === item.prefix &&
          previous.indent === item.indent &&
          previous.ordered === item.ordered;
        if (!quotedNumber && !adjacent) continue;
        const prose = [item.prose];
        for (let next = index + 1; next < lines.length; next++) {
          const line = lines[next];
          if (!line.startsWith(item.prefix) || listItem(line)) break;
          const content = line.slice(item.prefix.length),
            indent = item.contentOffset - item.prefix.length;
          if (!content.startsWith(" ".repeat(indent))) break;
          prose.push(content.slice(indent));
        }
        const snippet = prose.join("\n") + "\n",
          bytes = Buffer.byteLength(snippet);
        if (pending.length === 32 || pendingBytes + bytes > 4_194_304) flush();
        pending.push({ text: snippet, owner, finding });
        pendingBytes += bytes;
      }
    } finally {
      // Native groups already charge their participants. Attribute owned snippet
      // extraction separately, including time between successive rechecks.
      observer?.finish(
        [owner],
        Math.max(
          0,
          performance.now() - started - (checkMilliseconds - previousChecks),
        ),
      );
    }
  }
  flush();
  return checked.map((entry, owner) =>
    entry.diagnostics.filter((_, index) => keep[owner][index]),
  );
}
