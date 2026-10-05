// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// The module mock controls only native I/O. Real Prettier and the formatting
// decision remain under test; the existing integration suite uses real Snapper.
function observeFormatting(input, behavior = "identity") {
  const native = new URL("../src/native-tool.js", import.meta.url).href;
  const formatting = new URL("../src/formatting.js", import.meta.url).href;
  const contracts = new URL("../src/contracts.js", import.meta.url).href;
  const source = `
    import { mock } from "node:test";
    const { OperationError } = await import(${JSON.stringify(contracts)});
    const calls = [];
    const behavior = ${JSON.stringify(behavior)};
    mock.module(${JSON.stringify(native)}, { exports: {
      runNative(_tool, text, check = false) {
        calls.push(check ? "check" : "format");
        if (check && behavior === "failed-check")
          throw new OperationError("NATIVE_FAILURE", "Independent check failed.");
        if (check && behavior === "finding")
          return [{source: "snapper", rule: "fused", line: 1, column: 1,
            severity: "error", message: "Sentence layout: fused."}];
        if (check) return [];
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
