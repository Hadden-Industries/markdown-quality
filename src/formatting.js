// SPDX-License-Identifier: AGPL-3.0-only
import { formatLayout } from "./literal-layout.js";
import { parse } from "./analysis.js";
import { runNative } from "./native-tool.js";
import { checkProse } from "./prose-diagnostics.js";
import { normalizeTrailingWhitespace } from "./whitespace.js";
import { fail } from "./contracts.js";
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
export async function formatDocument(text, context, tool) {
  const normalized = normalizeTrailingWhitespace(text);
  // A lint violation is not authority to erase literal content (inline code or
  // raw HTML) or accidentally create a hard break by trimming beside a slash.
  // Return the original for reporting; batch validation will prevent all writes.
  if (
    normalized !== text &&
    JSON.stringify(semantic(parse(text))) !==
      JSON.stringify(semantic(parse(normalized)))
  )
    return { output: text, diagnostics: checkProse(tool, text) };
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
  const layout = await formatLayout(normalized, options);
  const result = await formatLayout(
    normalizeTrailingWhitespace(runNative(tool, layout)),
    options,
  );
  // Byte identity proves preservation and an observed fixed point of the entire
  // deterministic formatter pipeline. The independent prose check still runs.
  if (result === text)
    return { output: result, diagnostics: checkProse(tool, result) };
  if (
    JSON.stringify(semantic(parse(text))) !==
    JSON.stringify(semantic(parse(result)))
  )
    fail("PRESERVATION", "Formatting changed parsed meaning or a literal.");
  const second = await formatLayout(
    normalizeTrailingWhitespace(runNative(tool, result)),
    options,
  );
  if (result !== second)
    fail("CONVERGENCE", "Formatter pipeline did not converge.");
  return { output: result, diagnostics: checkProse(tool, result) };
}
