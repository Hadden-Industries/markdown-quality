// SPDX-License-Identifier: AGPL-3.0-only
import { formatLayout } from "./literal-layout.js";
import { parse } from "./analysis.js";
import { runNative } from "./native-tool.js";
import { checkProse } from "./prose-diagnostics.js";
import { normalizeTrailingWhitespace } from "./whitespace.js";
import { fail } from "./contracts.js";
import { matchesNativeCheck } from "./native-checks.js";
import { formatterDefaults } from "./preset.js";
import { canonicalizeEmphasis, canonicalizePolicy } from "./policy-formatting.js";
import { protectOpaqueLiterals } from "./literal-protection.js";
import { createDocumentMemo } from "./document-memo.js";
function semantic(node) {
  const value = {};
  for (const [key, item] of Object.entries(node)) {
    if (key === "position") continue;
    if (key === "children") value.children = item.map(semantic);
    else if (key === "value" && node.type === "text")
      value.value = item.replace(/[ \t\r\n]+/gu, " ");
    // CommonMark code spans turn each line ending into one space. The parser
    // already strips delimiter padding; preserve all other literal characters.
    else if (key === "value" && node.type === "inlineCode")
      value.value = item.replace(/\r\n|\r|\n/gu, " ");
    else if (
      key === "value" &&
      ["code", "html", "yaml", "toml", "json"].includes(node.type)
    )
      value.value = item.replace(/\r\n|\r/gu, "\n");
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
  memo ??= createDocumentMemo(context.config.syntax);
  const tree = (source) =>
    memo ? memo.parse(source) : parse(source, context.config.syntax);
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
    ...formatterDefaults,
    endOfLine,
    tabWidth: context.config.layout.tabWidth,
    plugins: [],
  };
  async function layoutPolicy(source) {
    const protectedLiterals = protectOpaqueLiterals(source, memo, endOfLine);
    return canonicalizePolicy(
      protectedLiterals.restore(
        await formatLayout(protectedLiterals.text, options, memo),
      ),
      memo,
    );
  }
  function nativePolicy(source) {
    const protectedLiterals = protectOpaqueLiterals(source, memo, endOfLine);
    return protectedLiterals.restore(
      runNative(tool, protectedLiterals.text, false, context.config.limits),
    );
  }
  // Equal-width emphasis repairs can avoid a second full printer pass. Admit
  // them only when parsed meaning agrees; list/fence/heading edits stay after
  // printing because their source spans can change container indentation.
  let layoutInput = canonicalizeEmphasis(normalized, memo);
  if (
    layoutInput !== normalized &&
    JSON.stringify(semantic(tree(normalized))) !==
      JSON.stringify(semantic(tree(layoutInput)))
  )
    layoutInput = normalized;
  const layout = await layoutPolicy(layoutInput);
  if (
    layout === text &&
    matchesNativeCheck(tool, text, precheck) &&
    precheck.report.wouldReformat === false
  )
    // Layout byte identity and the admitted native identity prove a composed
    // fixed point. The exact check still supplies prose findings and rechecks.
    return { output: text, prechecked: true };
  const result = await layoutPolicy(
    normalizeTrailingWhitespace(nativePolicy(layout), memo),
  );
  // Byte identity proves preservation and an observed fixed point of the entire
  // deterministic formatter pipeline. The independent prose check still runs.
  if (result === text) return { output: result };
  if (
    JSON.stringify(semantic(tree(text))) !==
    JSON.stringify(semantic(tree(result)))
  )
    fail("PRESERVATION", "Formatting changed parsed meaning or a literal.");
  if (endOfLine === "lf" && result.includes("\r"))
    fail("PRESERVATION", "LF output contains a physical carriage return.");
  const second = await layoutPolicy(
    normalizeTrailingWhitespace(nativePolicy(result), memo),
  );
  if (result !== second)
    fail("CONVERGENCE", "Formatter pipeline did not converge.");
  return { output: result };
}

/** Format one document with its independent prose check, for ungrouped callers. */
export async function formatDocument(text, context, tool, memo) {
  const formatted = await prepareFormattedDocument(text, context, tool, memo);
  return {
    ...formatted,
    diagnostics: checkProse(
      tool,
      formatted.output,
      context.config.syntax,
      context.config.limits,
    ),
  };
}
