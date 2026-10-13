// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { resolve, sep } from "node:path";
import { contained } from "../src/path-containment.js";
import { fingerprint } from "../src/stat-fingerprint.js";
import { listRecheckSnippet } from "../src/prose-diagnostics.js";
import { checkNativePolicy } from "../scripts/generate-native-policy.js";
import { sentenceToml, nativeFormatArguments } from "../src/native-policy.js";
import {
  nativeGroupCapacity,
  nativeInputName,
  isNativeInputName,
} from "../src/native-protocol.js";
test("native policy and capacity preserve independently specified boundaries", () => {
  checkNativePolicy();
  assert.equal(
    sentenceToml(true),
    'format = "markdown"\nmax_width = 0\nclause_breaks = false\nlong_threshold = 2097153\n',
  );
  assert.deepEqual(nativeFormatArguments(), [
    "--format",
    "markdown",
    "--max-width",
    "0",
    "--color",
    "never",
  ]);
  assert.equal(nativeGroupCapacity, 32);
  assert.equal(nativeInputName(31), "input-31.md");
  for (const name of ["input-0.md", "input-31.md"])
    assert.equal(isNativeInputName(name), true);
  for (const name of ["input-32.md", "input-01.md", "../input-0.md"])
    assert.equal(isNativeInputName(name), false);
});
test("list snippets retain quote and continuation boundaries", () => {
  const cases = [
    [
      ["> 1. Alpha.", "> 2. Beta.", ">    Continued.", ">", ">    Later."],
      { line: 2, rule: "fused" },
      "Beta.\nContinued.\n",
    ],
    [
      ["- Alpha.", "- Beta.", "  Continued.", "- Next."],
      { line: 2, rule: "wrap" },
      "Beta.\nContinued.\n",
    ],
    [["- Alpha.", "1. Beta."], { line: 2, rule: "wrap" }, null],
    [["> - Alpha.", ">> - Beta."], { line: 2, rule: "wrap" }, null],
    [["Plain."], { line: 1, rule: "fused" }, null],
  ];
  for (const [lines, finding, expected] of cases)
    assert.equal(listRecheckSnippet(lines, finding), expected);
});
test("containment and all five stat components retain their distinct semantics", () => {
  const root = resolve("fixture");
  for (const [path, expected] of [
    [root, true],
    [root + sep + "child", true],
    [root + "-sibling", false],
    [resolve(root, ".."), false],
  ])
    assert.equal(contained(root, path), expected);
  const stat = {
    dev: 1,
    ino: 2,
    size: 3,
    mtimeMs: 4,
    ctimeMs: 5,
    birthtimeMs: 6,
  };
  assert.equal(fingerprint(stat), "1:2:3:4:5");
  for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"])
    assert.notEqual(fingerprint({ ...stat, [key]: 99 }), fingerprint(stat));
  assert.equal(fingerprint({ ...stat, birthtimeMs: 99 }), fingerprint(stat));
});

test(
  "Windows containment rejects other drives and UNC shares",
  { skip: process.platform !== "win32" },
  () => {
    assert.equal(contained("C:\\owned", "C:\\owned\\child"), true);
    assert.equal(contained("C:\\owned", "D:\\owned\\child"), false);
    assert.equal(contained("C:\\owned", "C:\\owned-other"), false);
    assert.equal(
      contained("\\\\server\\share\\owned", "\\\\server\\other\\owned"),
      false,
    );
  },
);
