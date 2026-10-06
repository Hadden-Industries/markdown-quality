// SPDX-License-Identifier: AGPL-3.0-only
import { formatLayout } from "./literal-layout.js";
import { parse } from "./analysis.js";
import { runNative } from "./native-tool.js";
import { checkProse } from "./prose-diagnostics.js";
import { fail } from "./contracts.js";
function semantic(node) {
  const value = {};
  for (const [key, item] of Object.entries(node)) {
    if (key === "position") continue;
    if (key === "children") value.children = item.map(semantic);
    else if (key === "value" && node.type === "text")
      value.value = item.replace(/\s+/gu, " ");
    else value[key] = item;
  }
  return value;
}
export async function formatDocument(text, context, tool) {
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
  const layout = await formatLayout(text, options);
  const result = await formatLayout(runNative(tool, layout), options);
  // Byte identity proves preservation and an observed fixed point of the entire
  // deterministic formatter pipeline. The independent prose check still runs.
  if (result === text)
    return { output: result, diagnostics: checkProse(tool, result) };
  if (
    JSON.stringify(semantic(parse(text))) !==
    JSON.stringify(semantic(parse(result)))
  )
    fail("PRESERVATION", "Formatting changed parsed meaning or a literal.");
  const second = await formatLayout(runNative(tool, result), options);
  if (result !== second)
    fail("CONVERGENCE", "Formatter pipeline did not converge.");
  return { output: result, diagnostics: checkProse(tool, result) };
}
