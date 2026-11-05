// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultAnalyzerLimits } from "../src/analyzer-limits.js";
import {
  defaultExecutionLimits,
  derivedExecutionLimits,
  qualificationLimitKeys,
  resolveResourcePolicy,
} from "../src/resource-controls.js";

const guide = readFileSync(
  fileURLToPath(new URL("../docs/consumer-guide.md", import.meta.url)),
  "utf8",
);
const row = (key) =>
  guide.split("\n").find((line) => line.startsWith(`| \`${key}\``));
const spelled = (value) =>
  new RegExp(
    `\\b${value.toLocaleString("en-US").replaceAll(",", ",?")}\\b`,
    "u",
  );

test("the consumer guide documents every package resource ceiling and its default", () => {
  for (const [key, value] of Object.entries({
    ...defaultAnalyzerLimits,
    ...defaultExecutionLimits,
  })) {
    const line = row(key);
    assert.ok(line, `undocumented ceiling ${key}`);
    assert.match(line, spelled(value), `${key} default ${value}`);
  }
  for (const key of [
    ...Object.keys(derivedExecutionLimits),
    ...qualificationLimitKeys,
  ])
    assert.ok(row(key), `undocumented ceiling ${key}`);
});

test("unlimited mode projects every inventoried ceiling to null without exceptions", () => {
  const policy = resolveResourcePolicy([
    { origin: "invocation", resourceLimitMode: "unlimited" },
  ]);
  for (const [key, value] of Object.entries(policy.analyzerLimits))
    assert.equal(value, null, key);
  for (const [key, value] of Object.entries(policy.executionLimits))
    assert.equal(value, null, key);
});

test("every inventoried ceiling accepts individual finite and null overrides", () => {
  for (const [scope, keys] of [
    ["analyzerLimits", Object.keys(defaultAnalyzerLimits)],
    [
      "executionLimits",
      [
        ...Object.keys(defaultExecutionLimits),
        ...Object.keys(derivedExecutionLimits),
        ...qualificationLimitKeys,
      ],
    ],
  ])
    for (const key of keys)
      for (const value of [123, null]) {
        const policy = resolveResourcePolicy([
          { origin: "invocation", [scope]: { [key]: value } },
        ]);
        assert.equal(policy[scope][key], value, key);
      }
});
