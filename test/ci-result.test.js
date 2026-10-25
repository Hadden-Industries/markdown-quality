// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";

const moduleUrl = new URL("../scripts/ci-result.js", import.meta.url).href;
function report(title, facts, summaryPath, log = true) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {reportCiResult} from ${JSON.stringify(moduleUrl)}; reportCiResult(...JSON.parse(process.argv[1]));`,
      JSON.stringify([title, facts, { summaryPath, log }]),
    ],
    { encoding: "utf8", timeout: fixtureCommandTimeoutMs, windowsHide: true },
  );
}

test("public facts remain one JSON log record and inert fenced summary content", (t) => {
  const summary = join(consumer(t), "summary.md");
  writeFileSync(summary, "Earlier step\n");
  const facts = {
    Status: "passed",
    Samples: 6,
    Parity: true,
    Label:
      "\n::error::forged\n```\n<script>alert(1)</script>\n![external](https://example.invalid)",
  };
  const result = report("Performance qualification", facts, summary);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    title: "Performance qualification",
    facts,
  });
  assert.equal(
    result.stdout.split("\n").length,
    2,
    "Data cannot introduce a workflow command line",
  );
  const text = readFileSync(summary, "utf8");
  assert.ok(text.startsWith("Earlier step\n### Performance qualification\n"));
  assert.equal(
    text.split("\n").filter((line) => line.startsWith("```")).length,
    2,
  );
  assert.ok(!text.includes("\n::error::"));
  assert.ok(!text.includes("\n<script>"));
  assert.ok(!text.includes("\n![external]"));
});

test("invalid or excessive facts fail before writing logs or changing a summary", (t) => {
  const summary = join(consumer(t), "summary.md");
  for (const [title, facts] of [
    ["Injected\n::error::text", { Status: "passed" }],
    ["Result", { RawReport: { payload: "not a public fact" } }],
    ["Result", { Payload: "x".repeat(9000) }],
    [
      "Result",
      Object.fromEntries(
        Array.from({ length: 33 }, (_, i) => [`Field${i}`, i]),
      ),
    ],
  ]) {
    writeFileSync(summary, "sentinel");
    const result = report(title, facts, summary);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(readFileSync(summary, "utf8"), "sentinel");
  }
});

test("an unavailable summary fails reporting; local runs can explicitly use only the log", (t) => {
  const directory = join(consumer(t), "directory");
  mkdirSync(directory);
  const failed = report("Qualification", { Status: "passed" }, directory);
  assert.notEqual(failed.status, 0);
  const local = report("Qualification", { Status: "passed" }, null);
  assert.equal(local.status, 0, local.stderr);
  assert.deepEqual(JSON.parse(local.stdout).facts, { Status: "passed" });
});

test("summary-only reporting preserves an existing machine-readable stdout contract", (t) => {
  const summary = join(consumer(t), "summary.md");
  const result = report(
    "Package qualification",
    { Status: "passed" },
    summary,
    false,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.ok(readFileSync(summary, "utf8").includes('"Status": "passed"'));
});
