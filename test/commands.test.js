// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { native, npmCommand, npmCliPath } from "../scripts/commands.js";

test("native failures retain bounded stdout diagnostics and their exit status", () => {
  assert.throws(
    () =>
      native(process.execPath, [
        "-e",
        'console.error("stderr detail"); console.log("x".repeat(5000) + "schema validation failed"); process.exit(7)',
      ]),
    (error) => {
      assert.equal(error.status, 7);
      assert.match(error.message, /stderr detail/u);
      assert.match(error.message, /schema validation failed/u);
      assert.ok(error.message.length < 2500);
      return true;
    },
  );
});

test("an explicit provenance executable keeps native npm even when it equals the consumer Node", () => {
  const before = process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
  try {
    process.env.MARKDOWN_QUALITY_CONSUMER_NPM = "missing-consumer-npm-cli.js";
    const expected = native(process.execPath, [
      npmCliPath(),
      "--version",
    ]).trim();
    assert.equal(
      npmCommand(["--version"], {}, process.execPath).trim(),
      expected,
    );
    assert.throws(() => npmCommand(["--version"]));
  } finally {
    if (before === undefined) delete process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
    else process.env.MARKDOWN_QUALITY_CONSUMER_NPM = before;
  }
});
