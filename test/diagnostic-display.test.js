// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { consumer } from "./helpers.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
function run(root, ...args) {
  const child = spawnSync(
    process.execPath,
    [cli, args[0], "--root", root, ...args.slice(1)],
    {
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(child.error, undefined);
  return child;
}

test("display thresholds preserve complete JSON results, exit behavior and default output", (t) => {
  const root = consumer(t, {
    "a.md": "# Title.\n\n[here](target.md)\n\n" + "x".repeat(121) + "\n",
    "target.md": "Target.\n",
  });
  const complete = run(root, "check", "--json");
  assert.equal(complete.status, 0, complete.stdout);
  const report = JSON.parse(complete.stdout);
  assert.deepEqual(report.diagnostics.map((d) => d.severity).sort(), [
    "info",
    "info",
    "warning",
  ]);
  const defaultText = run(root, "check");
  for (const level of ["info", "warning", "error"]) {
    const json = run(root, "check", "--json", "--diagnostic-level", level);
    assert.equal(json.status, complete.status, json.stdout);
    assert.deepEqual(JSON.parse(json.stdout), report);
    const text = run(root, "check", "--diagnostic-level", level);
    assert.equal(text.status, 0, text.stdout);
    assert.equal(
      text.stdout.includes("a.md:1:1: quality/heading-trailing-punctuation:"),
      level === "info",
    );
    assert.equal(
      text.stdout.includes("quality/generic-link-text:"),
      level !== "error",
    );
    if (level === "info") assert.equal(text.stdout, defaultText.stdout);
    else assert.match(text.stdout, /2 information diagnostics hidden/u);
    if (level === "error")
      assert.match(text.stdout, /1 warning diagnostic hidden/u);
  }
});

test("hidden warnings enforce strict write admission and permit ordinary formatting", (t) => {
  const original = "# Title.\n\n[here](target.md) and _text_.\n";
  const root = consumer(t, { "a.md": original, "target.md": "Target.\n" });
  const strict = run(root, "format", "--strict", "--diagnostic-level", "error");
  assert.equal(strict.status, 1, strict.stdout);
  assert.ok(!strict.stdout.includes("quality/generic-link-text:"));
  assert.match(strict.stdout, /Strict mode blocked on 1 hidden warning/u);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), original);
  const ordinary = run(root, "format", "--diagnostic-level", "error");
  assert.equal(ordinary.status, 0, ordinary.stdout);
  assert.equal(
    readFileSync(join(root, "a.md"), "utf8"),
    original.replace("_text_", "*text*"),
  );
});

test("errors and operational failures remain visible and invalid display levels cannot write", (t) => {
  const original = "_text_\n\n```\nvalue\n```\n";
  const root = consumer(t, { "a.md": original });
  const errors = run(root, "format", "--diagnostic-level", "error");
  assert.equal(errors.status, 1, errors.stdout);
  assert.match(errors.stdout, /markdown\/fenced-code-language:/u);
  const invalidRoot = consumer(t, { "a.md": "_text_\n" });
  const invalid = run(
    invalidRoot,
    "format",
    "--diagnostic-level",
    "silent",
    "--json",
  );
  assert.equal(invalid.status, 2, invalid.stdout);
  assert.equal(JSON.parse(invalid.stdout).errors[0].code, "CLI_INPUT");
  assert.deepEqual(JSON.parse(invalid.stdout).written, []);
  assert.equal(readFileSync(join(invalidRoot, "a.md"), "utf8"), "_text_\n");
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), original);
  const limitedRoot = consumer(
    t,
    { "a.md": "# Title.\n\n" + "x".repeat(121) + "\n" },
    { limits: { documentDiagnostics: 1 } },
  );
  const operational = run(limitedRoot, "check", "--diagnostic-level", "error");
  assert.equal(operational.status, 2, operational.stdout);
  assert.match(operational.stdout, /DIAGNOSTIC_LIMIT:/u);
});
