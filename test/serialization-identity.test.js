// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentMemo } from "../src/document-memo.js";
import { formatDocument } from "../src/formatting.js";
import { resolveTool } from "../src/native-tool.js";

const input = "#   Title\n\nAlpha.\n";
const expected = "# Title\n\nAlpha.\n";
const context = { config: { layout: { endOfLine: "lf", tabWidth: 2 } } };

function decorateRealTrees(t, mutation) {
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const parse = memo.parse;
  memo.parse = (source) => {
    const tree = structuredClone(parse(source));
    if (source === input) return tree;
    return mutation(tree);
  };
  return memo;
}

test("format preservation ignores object insertion order in actual parsed trees", async (t) => {
  const reorder = (value) => {
    if (Array.isArray(value)) return value.map(reorder);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, item]) => [key, reorder(item)]),
    );
  };
  const memo = decorateRealTrees(t, reorder);
  // The native formatter and parser remain real; only object member insertion
  // order varies. The expected Markdown is independently authored above.
  const result = await formatDocument(input, context, resolveTool(), memo);
  assert.equal(result.output, expected);
});

for (const mutation of ["changed value", "ordered children"])
  test(`format preservation still rejects ${mutation} in an actual parsed tree`, async (t) => {
    const memo = decorateRealTrees(t, (tree) => {
      if (mutation === "changed value")
        tree.children[1].children[0].value = "Different.";
      else tree.children.reverse();
      return tree;
    });
    await assert.rejects(formatDocument(input, context, resolveTool(), memo), {
      code: "PRESERVATION",
    });
  });
