// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createDocumentMemo } from "../src/document-memo.js";
import { checkLinks } from "../src/analysis.js";
import { formatLayout } from "../src/literal-layout.js";
import { normalizeTrailingWhitespace } from "../src/whitespace.js";
import { limits } from "../src/contracts.js";
import { consumer } from "./helpers.js";

const options = {
  parser: "markdown",
  proseWrap: "preserve",
  embeddedLanguageFormatting: "off",
  endOfLine: "lf",
  tabWidth: 2,
  plugins: [],
};

test("exact document reuse preserves literals/options and fresh physical targets", async (t) => {
  const source = "[Target](target.md)\n\n```text\nvalue  \n```\n";
  const root = consumer(t, { "source.md": source, "target.md": "Target.\n" });
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const tree = memo.parse(source);
  const preimage = JSON.stringify(tree);
  assert.equal(memo.parse(source), tree);
  assert.notEqual(memo.parse(source + "\n"), tree);
  const first = await formatLayout(source, options, memo);
  assert.equal(
    first,
    await formatLayout(source, { ...options, plugins: [] }, memo),
  );
  assert.equal(first, await formatLayout(source, options));
  assert.ok(first.includes("value  \n"));
  assert.equal(normalizeTrailingWhitespace(source, memo), source);
  const context = {
    root,
    config: { links: { localFiles: true, rootRelative: "reject" } },
  };
  assert.deepEqual(checkLinks(context, source, "source.md", memo), []);
  unlinkSync(join(root, "target.md"));
  assert.equal(
    checkLinks(context, source, "source.md", memo)[0].rule,
    "local-target",
  );
  writeFileSync(join(root, "target.md"), "Restored.\n");
  assert.deepEqual(checkLinks(context, source, "source.md", memo), []);
  assert.equal(JSON.stringify(tree), preimage);
  assert.ok(memo.statistics.parseHits >= 4);
  assert.equal(memo.statistics.layoutHits, 1);
});

test("layout reuse tracks changed source/options and does not admit failed work", async (t) => {
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const source = "# Title\n\nAlpha.\n";
  const mutable = { ...options, plugins: [] };
  const lf = await formatLayout(source, mutable, memo);
  mutable.endOfLine = "crlf";
  const crlf = await formatLayout(source, mutable, memo);
  assert.equal(crlf, lf.replaceAll("\n", "\r\n"));
  assert.equal(
    await formatLayout(source + "Beta.\n", mutable, memo),
    await formatLayout(source + "Beta.\n", mutable),
  );
  assert.equal(memo.statistics.layoutHits, 0);
  for (let attempt = 0; attempt < 2; attempt++)
    await assert.rejects(
      formatLayout(source, { ...options, parser: "missing-parser" }, memo),
    );
  assert.equal(memo.statistics.layoutHits, 0);
  assert.equal(await formatLayout(source, options, memo), lf);
  assert.equal(memo.statistics.layoutHits, 1);
});

test("memo bounds fall back to complete analysis and disposal forbids stale reuse", async () => {
  const memo = createDocumentMemo();
  const source = "X".repeat(limits.fileBytes);
  const first = memo.parse(source);
  assert.equal(memo.parse(source), first);
  assert.equal(memo.statistics.retainedBytes, limits.fileBytes);
  const small = "Alpha.\n";
  const one = memo.parse(small);
  assert.notEqual(memo.parse(small), one);
  assert.equal(
    await formatLayout(small, options, memo),
    await formatLayout(small, options),
  );
  assert.equal(memo.statistics.retainedBytes, limits.fileBytes);
  memo.dispose();
  assert.equal(memo.statistics.retainedBytes, 0);
  assert.throws(() => memo.parse(small), { code: "ANALYSIS_FAILURE" });
  await assert.rejects(formatLayout(small, options, memo), {
    code: "ANALYSIS_FAILURE",
  });
  const next = createDocumentMemo();
  assert.notEqual(next.parse(small), one);
  next.dispose();
});
