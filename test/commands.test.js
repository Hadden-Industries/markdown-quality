// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  native,
  npmCommand,
  npmCliPath,
  producerNpmCommand,
  producerToolchain,
} from "../scripts/commands.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { consumer } from "./helpers.js";

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

test("producer selection refuses incomplete or relative retained identities", () => {
  assert.deepEqual(producerToolchain({}), {
    executable: process.execPath,
    cli: npmCliPath(),
  });
  for (const environment of [
    { MARKDOWN_QUALITY_PRODUCER_NODE: process.execPath },
    { MARKDOWN_QUALITY_PRODUCER_NPM: npmCliPath() },
    {
      MARKDOWN_QUALITY_PRODUCER_NODE: "node",
      MARKDOWN_QUALITY_PRODUCER_NPM: npmCliPath(),
    },
    {
      MARKDOWN_QUALITY_PRODUCER_NODE: process.execPath,
      MARKDOWN_QUALITY_PRODUCER_NPM: "npm-cli.js",
    },
  ])
    assert.throws(
      () => producerToolchain(environment),
      /complete absolute pair/u,
    );
});

test("fixture packing retains producer npm while consumer selection remains independent", (t) => {
  const root = consumer(t, {
    "package.json": JSON.stringify({
      name: "mq-producer-fixture",
      version: "1.0.0",
    }),
  });
  const before = process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
  try {
    process.env.MARKDOWN_QUALITY_CONSUMER_NPM = "missing-consumer-npm-cli.js";
    const packed = JSON.parse(
      producerNpmCommand(["pack", "--json", "--ignore-scripts"], { cwd: root }),
    );
    const records = Array.isArray(packed) ? packed : Object.values(packed);
    assert.equal(records.length, 1);
    assert.equal(records[0].name, "mq-producer-fixture");
    assert.ok(readFileSync(join(root, records[0].filename)).length > 0);
    assert.throws(() => npmCommand(["--version"]));
  } finally {
    if (before === undefined) delete process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
    else process.env.MARKDOWN_QUALITY_CONSUMER_NPM = before;
  }
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
