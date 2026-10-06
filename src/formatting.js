// SPDX-License-Identifier: AGPL-3.0-only
import { formatLayout } from "./literal-layout.js";
import { parse } from "./analysis.js";
import { runNative } from "./native-tool.js";
import { checkProse } from "./prose-diagnostics.js";
import { normalizeTrailingWhitespace } from "./whitespace.js";
import { fail } from "./contracts.js";
import { matchesNativeCheck } from "./native-checks.js";
function semantic(node) {
  const value = {};
  for (const [key, item] of Object.entries(node)) {
    if (key === "position") continue;
    if (key === "children") value.children = item.map(semantic);
    else if (key === "value" && node.type === "text")
      value.value = item.replace(/\s+/gu, " ");
    // CommonMark code spans turn each line ending into one space. The parser
    // already strips delimiter padding; preserve all other literal characters.
    else if (key === "value" && node.type === "inlineCode")
      value.value = item.replace(/\r\n|\r|\n/gu, " ");
    else value[key] = item;
  }
  return value;
}
/** Prepare guarded candidate bytes; callers must independently verify prose before admission. */
export async function prepareFormattedDocument(
  text,
  context,
  tool,
  memo,
  precheck,
) {
  const tree = (source) => (memo ? memo.parse(source) : parse(source));
  const normalized = normalizeTrailingWhitespace(text, memo);
  // A lint violation is not authority to erase literal content (inline code or
  // raw HTML) or accidentally create a hard break by trimming beside a slash.
  // Return the original for reporting; batch validation will prevent all writes.
  if (
    normalized !== text &&
    JSON.stringify(semantic(tree(text))) !==
      JSON.stringify(semantic(tree(normalized)))
  )
    return { output: text };
  const endOfLine =
    context.config.layout.endOfLine === "preserve"
      ? text.includes("\r\n")
        ? "crlf"
        : "lf"
      : context.config.layout.endOfLine;
  const options = {
    parser: "markdown",
    proseWrap: "preserve",
    embeddedLanguageFormatting: "off",
    endOfLine,
    tabWidth: context.config.layout.tabWidth,
    plugins: [],
  };
  const layout = await formatLayout(normalized, options, memo);
  if (
    layout === text &&
    matchesNativeCheck(tool, text, precheck) &&
    precheck.report.wouldReformat === false
  )
    // Layout byte identity and the admitted native identity prove a composed
    // fixed point. The exact check still supplies prose findings and rechecks.
    return { output: text, prechecked: true };
  const result = await formatLayout(
    normalizeTrailingWhitespace(runNative(tool, layout), memo),
    options,
    memo,
  );
  // Byte identity proves preservation and an observed fixed point of the entire
  // deterministic formatter pipeline. The independent prose check still runs.
  if (result === text) return { output: result };
  if (
    JSON.stringify(semantic(tree(text))) !==
    JSON.stringify(semantic(tree(result)))
  )
    fail("PRESERVATION", "Formatting changed parsed meaning or a literal.");
  const second = await formatLayout(
    normalizeTrailingWhitespace(runNative(tool, result), memo),
    options,
    memo,
  );
  if (result !== second)
    fail("CONVERGENCE", "Formatter pipeline did not converge.");
  return { output: result };
}

/** Format one document with its independent prose check, for ungrouped callers. */
export async function formatDocument(text, context, tool, memo) {
  const formatted = await prepareFormattedDocument(text, context, tool, memo);
  return { ...formatted, diagnostics: checkProse(tool, formatted.output) };
}
