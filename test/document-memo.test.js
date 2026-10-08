// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDocumentMemo,
  documentMemoLimits,
} from "../src/document-memo.js";
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

test("memo bounds evict older values and disposal forbids stale reuse", async () => {
  const memo = createDocumentMemo();
  const source = "X".repeat(documentMemoLimits.parseBytes);
  const first = memo.parse(source);
  assert.equal(memo.parse(source), first);
  assert.equal(memo.statistics.retainedBytes, documentMemoLimits.parseBytes);
  const small = "Alpha.\n";
  const one = memo.parse(small);
  assert.equal(memo.parse(small), one);
  assert.equal(
    await formatLayout(small, options, memo),
    await formatLayout(small, options),
  );
  assert.ok(memo.statistics.retainedBytes < limits.fileBytes);
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

test("large layouts reuse independently of parsed source retention", async () => {
  const memo = createDocumentMemo();
  try {
    const source = "a".repeat(limits.fileBytes / 2 + 1024) + "😀 before\n";
    const expected = source.slice(0, -7) + "after\n";
    memo.parse(source);
    let calls = 0;
    const compute = async () => {
      calls++;
      return expected;
    };
    assert.equal(await memo.layout(source, options, compute), expected);
    assert.equal(await memo.layout(source, options, compute), expected);
    assert.equal(calls, 1);
    const tree = memo.parse(expected);
    assert.equal(memo.parse(expected), tree);
    assert.equal(await memo.layout(source, options, compute), expected);
    assert.equal(calls, 1);
    assert.ok(memo.statistics.parseBytes <= documentMemoLimits.parseBytes);
    assert.ok(memo.statistics.layoutBytes <= documentMemoLimits.layoutBytes);
  } finally {
    memo.dispose();
  }
});

test("stage entry limits evict the least recently used values", async (t) => {
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const original = memo.parse("Original.\n");
  const evicted = memo.parse("Evicted.\n");
  memo.parse("Third.\n");
  memo.parse("Fourth.\n");
  assert.equal(memo.parse("Original.\n"), original);
  memo.parse("Fifth.\n");
  assert.equal(memo.parse("Original.\n"), original);
  assert.notEqual(memo.parse("Evicted.\n"), evicted);
  let calls = 0;
  const layout = (text) =>
    memo.layout(text, options, async () => {
      calls++;
      return text + "\n";
    });
  for (const text of ["Original", "Evicted", "Third", "Fourth"])
    await layout(text);
  await layout("Original");
  await layout("Fifth");
  await layout("Original");
  assert.equal(calls, 5);
  await layout("Evicted");
  assert.equal(calls, 6);
  assert.ok(memo.statistics.layoutBytes <= documentMemoLimits.layoutBytes);
});

test("pending layouts cannot repopulate disposed or duplicate cache entries", async () => {
  const memo = createDocumentMemo();
  let finish;
  const pending = memo.layout(
    "Pending",
    options,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  assert.equal(memo.statistics.layoutBytes, 0);
  assert.equal(
    await memo.layout("Pending", options, async () => "Complete"),
    "Complete",
  );
  const bytes = memo.statistics.layoutBytes;
  finish("Complete");
  assert.equal(await pending, "Complete");
  assert.equal(memo.statistics.layoutBytes, bytes);
  const late = memo.layout(
    "Late",
    options,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  memo.dispose();
  finish("Late result");
  assert.equal(await late, "Late result");
  assert.equal(memo.statistics.retainedBytes, 0);
  await assert.rejects(
    memo.layout("Late", options, async () => "Unexpected"),
    {
      code: "ANALYSIS_FAILURE",
    },
  );
});

test("oversized and executable-option layouts never enter the cache", async (t) => {
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const source = "x".repeat(documentMemoLimits.layoutBytes / 2 + 1);
  for (let index = 0; index < 2; index++)
    assert.equal(
      await memo.layout(source, options, async () => source),
      source,
    );
  let getters = 0;
  const opaque = {
    ...options,
    get executable() {
      getters++;
      return "opaque";
    },
  };
  for (let index = 0; index < 2; index++)
    await memo.layout("Safe", opaque, async () => "Safe result");
  assert.equal(getters, 0);
  assert.equal(memo.statistics.layoutHits, 0);
  assert.equal(memo.statistics.layoutBytes, 0);
});

test("layout byte eviction removes only the expired option variant", async (t) => {
  const memo = createDocumentMemo();
  t.after(() => memo.dispose());
  const source = "x".repeat(documentMemoLimits.layoutBytes / 4 + 1);
  let calls = 0;
  const compute = async () => {
    calls++;
    return source;
  };
  await memo.layout(source, options, compute);
  await memo.layout(source, { ...options, tabWidth: 4 }, compute);
  assert.equal(calls, 2);
  await memo.layout(source, { ...options, tabWidth: 4 }, compute);
  assert.equal(calls, 2);
  await memo.layout(source, options, compute);
  assert.equal(calls, 3);
  assert.equal(memo.statistics.layoutBytes, Buffer.byteLength(source) * 2);
});
