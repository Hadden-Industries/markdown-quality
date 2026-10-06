// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// The module mock controls only native I/O. Real Prettier and the formatting
// decision remain under test; the existing integration suite uses real Snapper.
function observeFormatting(input, behavior = "identity", replacement = null) {
  const native = new URL("../src/native-tool.js", import.meta.url).href;
  const formatting = new URL("../src/formatting.js", import.meta.url).href;
  const contracts = new URL("../src/contracts.js", import.meta.url).href;
  const source = `
    import { mock } from "node:test";
    const { OperationError } = await import(${JSON.stringify(contracts)});
    const calls = [];
    const behavior = ${JSON.stringify(behavior)};
    const replacement = ${JSON.stringify(replacement)};
    mock.module(${JSON.stringify(native)}, { exports: {
      runNative(_tool, text, check = false) {
        calls.push(check ? "check" : "format");
        if (check && behavior === "failed-check")
          throw new OperationError("NATIVE_FAILURE", "Independent check failed.");
        if (check && behavior === "finding")
          return [{source: "snapper", rule: "fused", line: 1, column: 1,
            severity: "error", message: "Sentence layout: fused."}];
        if (check) return [];
        if (replacement) return text.replace(...replacement);
        if (behavior === "literal-mutation") return text.replace("first", "changed");
        return behavior === "sentence-layout"
          ? text.replace("Alpha. Beta.", "Alpha.\\nBeta.") : text;
      }
    }});
    const { formatDocument } = await import(${JSON.stringify(formatting)});
    let result, error;
    try {
      result = await formatDocument(${JSON.stringify(input)},
        {config: {layout: {endOfLine: "lf", tabWidth: 2}}}, {});
    } catch (failure) { error = {code: failure.code, message: failure.message}; }
    console.log(JSON.stringify({calls, result, error}));
  `;
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-test-module-mocks", "--input-type=module", "-e", source],
      { encoding: "utf8", timeout: 15000, windowsHide: true },
    ),
  );
}

test("an already stable document needs one native formatting pass and its independent check", () => {
  const input = "# Stable\n\nAlpha.\n";
  const observed = observeFormatting(input);
  assert.equal(observed.result.output, input);
  assert.deepEqual(observed.result.diagnostics, []);
  assert.deepEqual(observed.calls, ["format", "check"]);
});

test("byte identity never suppresses independent prose findings or check failures", () => {
  const finding = observeFormatting("Alpha.\n", "finding");
  assert.equal(finding.result.diagnostics[0].rule, "fused");
  const failed = observeFormatting("Alpha.\n", "failed-check");
  assert.equal(failed.error.code, "NATIVE_FAILURE");
});

test("changed sentence layout still requires convergence and the independent check", () => {
  const observed = observeFormatting("Alpha. Beta.\n", "sentence-layout");
  assert.equal(observed.result.output, "Alpha.\nBeta.\n");
  assert.deepEqual(observed.calls, ["format", "format", "check"]);
});

test("literal layout repair retains the independent semantic preservation guard", () => {
  const observed = observeFormatting(
    "```diff\n first\n \n second\n```\n",
    "literal-mutation",
  );
  assert.equal(observed.error.code, "PRESERVATION");
});

test("inline code compares CommonMark line-ending semantics without collapsing literal whitespace", () => {
  for (const lineEnding of ["\n", "\r\n", "\r"]) {
    const accepted = observeFormatting("`first second`\n", "identity", [
      "first second",
      "first" + lineEnding + "second",
    ]);
    assert.equal(accepted.error, undefined, JSON.stringify(accepted));
    assert.equal(accepted.result.output, "`first\nsecond`\n");
    assert.deepEqual(accepted.calls, ["format", "format", "check"]);
  }

  for (const [input, replacement] of [
    ["`first  second`\n", ["first  second", "first second"]],
    ["`first\tsecond`\n", ["first\tsecond", "first second"]],
    ["`first\u00a0second`\n", ["first\u00a0second", "first second"]],
    ["`first second`\n", ["first second", "changed second"]],
    ["```text\nfirst\nsecond\n```\n", ["first\nsecond", "first second"]],
  ]) {
    const rejected = observeFormatting(input, "identity", replacement);
    assert.equal(
      rejected.error?.code,
      "PRESERVATION",
      JSON.stringify(rejected),
    );
  }
});
