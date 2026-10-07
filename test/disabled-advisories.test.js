// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { checkAdvisories } from "../src/advisory-diagnostics.js";
import { advisoryDefaults } from "../src/preset.js";
import { limits } from "../src/contracts.js";
import { createDocumentMemo } from "../src/document-memo.js";

test("all disabled advisories skip parsing while enabled rules still detect their findings", () => {
  const input = "# Title.\n\n" + "x".repeat(121) + "\n";
  const memo = createDocumentMemo();
  memo.dispose();
  const lint = Object.fromEntries(
    Object.keys(advisoryDefaults).map((rule) => [rule, "off"]),
  );
  assert.deepEqual(checkAdvisories(input, { lint, limits }, memo), []);
  assert.equal(checkAdvisories(input, { lint: {}, limits }).length, 2);
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
  const result = checkAdvisories(
    input,
    {
      limits,
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
  assert.equal(checkAdvisories(input, { lint: {}, limits }, memo).length, 2);
  assert.ok(normalized.mock.callCount() > 0);
  assert.ok(split.mock.callCount() > 0);
});
