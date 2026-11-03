// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { checkQualityRules } from "../src/quality-diagnostics.js";
import { qualityRuleDefaults } from "../src/preset.js";
import { defaultAnalyzerLimits as analyzerLimits } from "../src/analyzer-limits.js";
import { createDocumentMemo } from "../src/document-memo.js";

test("all disabled quality rules skip parsing while enabled rules still detect their findings", () => {
  const input = "# Title.\n\n" + "x".repeat(121) + "\n";
  const memo = createDocumentMemo();
  memo.dispose();
  const lint = Object.fromEntries(
    Object.keys(qualityRuleDefaults).map((rule) => [rule, "off"]),
  );
  assert.deepEqual(
    checkQualityRules(input, { lint, analyzerLimits }, memo),
    [],
  );
  assert.equal(
    checkQualityRules(input, { lint: {}, analyzerLimits }).length,
    2,
  );
});

test("disabled NFC and long-line rules skip normalization and line indexing without skipping enabled checks", (t) => {
  const input = "# Title.\n\ne\u0301 prose.\n";
  const memo = createDocumentMemo();
  memo.parse(input);
  t.after(() => memo.dispose());
  // The real syntax is cached before observing avoidable rule-specific work;
  // parser/dependency implementation details are outside this measurement.
  const normalized = t.mock.method(String.prototype, "normalize");
  const split = t.mock.method(String.prototype, "split");
  const result = checkQualityRules(
    input,
    {
      analyzerLimits,
      lint: {
        "quality/non-nfc-prose": "off",
        "quality/long-prose-line": "off",
      },
    },
    memo,
  );
  assert.deepEqual(
    result.map((d) => d.rule),
    ["quality/heading-trailing-punctuation"],
  );
  assert.equal(normalized.mock.callCount(), 0);
  assert.equal(split.mock.callCount(), 0);
  assert.equal(
    checkQualityRules(input, { lint: {}, analyzerLimits }, memo).length,
    2,
  );
  assert.ok(normalized.mock.callCount() > 0);
  assert.ok(split.mock.callCount() > 0);
});

test("long prose counts code points and reports UTF-16 columns across newline styles", () => {
  const lint = Object.fromEntries(
    Object.keys(qualityRuleDefaults).map((rule) => [rule, "off"]),
  );
  lint["quality/long-prose-line"] = "info";
  const cases = [
    ["a".repeat(119), null],
    ["😀".repeat(120), null],
    ["a".repeat(121), 121],
    ["😀".repeat(121), 241],
    ["𠀀".repeat(121), 241],
    ["a".repeat(119) + "😀z", 122],
    ["e\u0301".repeat(60) + "z", 121],
    ["\ud800".repeat(121), 121],
    ["\udc00".repeat(121), 121],
    ["`code` " + "a".repeat(120), 127],
    ["`" + "a".repeat(150) + "`", null],
  ];
  for (const eol of ["\n", "\r\n", "\r"])
    for (const [line, column] of cases) {
      const diagnostics = checkQualityRules(
        "# Heading" + eol + eol + line + eol,
        { lint, analyzerLimits },
      );
      assert.deepEqual(
        diagnostics.map(({ rule, line, column }) => [rule, line, column]),
        column === null ? [] : [["quality/long-prose-line", 3, column]],
        JSON.stringify({ eol, line }),
      );
    }
});

test("long prose traversal avoids code-point string conversions", (t) => {
  const input = "😀".repeat(121) + "\n";
  const memo = createDocumentMemo();
  memo.parse(input);
  t.after(() => memo.dispose());
  // Cache the real parser result so the spy observes only the quality-rule scan.
  const conversions = t.mock.method(String, "fromCodePoint");
  const result = checkQualityRules(input, { lint: {}, analyzerLimits }, memo);
  assert.equal(result[0].column, 241);
  assert.equal(conversions.mock.callCount(), 0);
});
