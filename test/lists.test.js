// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { runQuality } from "../src/quality.js";
import { consumer } from "./helpers.js";
import { checkProse } from "../src/prose-diagnostics.js";
import { resolveTool } from "../src/native-tool.js";
test("adjacent, quoted ordered and continued task items preserve valid prose", async (t) => {
  for (const text of [
    "- First.\n- Second.\n",
    "> 1. First.\n> 2. Second.\n",
    "- [x] First.\n  Continuation.\n- [ ] Second.\n",
  ]) {
    const root = consumer(t, { "a.md": text });
    const result = await runQuality({ root, mode: "format" });
    assert.equal(result.exitCode, 0, JSON.stringify(result));
  }
});
test("quoted item exceptions retain genuine fused item and continuation prose", () => {
  const tool = resolveTool();
  for (const text of [
    "> 1. First. Second.\n",
    "> 1. First.\n>    Continuation. Another.\n",
    "> 1. First.\r\n>    Continuation. Another.\r\n",
  ]) {
    assert.ok(
      checkProse(tool, text).some((d) => d.rule === "fused"),
      text,
    );
  }
  assert.deepEqual(
    checkProse(tool, "> 1. First.\n>    Continuation.\n> 2. Second.\n"),
    [],
  );
});
