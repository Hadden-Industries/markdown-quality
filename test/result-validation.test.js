// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runQuality, validateQualityResult } from "../src/quality.js";
import { consumer } from "./helpers.js";

test("supported validator rejects semantic lies and permits complete advisory success", async (t) => {
  const root = consumer(t, { "a.md": "# Heading!\n\nAlpha.\n" });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 0);
  assert.ok(result.diagnostics.length);
  assert.equal(validateQualityResult(result), result);
  for (const change of [
    (report) => {
      delete report.tools.markdown;
    },
    (report) => {
      report.exitCode = 1;
    },
    (report) => {
      report.unchanged = [];
    },
    (report) => {
      report.written = ["a.md"];
    },
    (report) => {
      report.package.version = "9.9.9";
    },
    (report) => {
      report.diagnostics[0].path = "other.md";
    },
  ]) {
    const report = structuredClone(result);
    change(report);
    assert.throws(() => validateQualityResult(report));
  }
});

test("reported tools match independent installed package and native manifest metadata", async (t) => {
  const root = consumer(t);
  const result = await runQuality({ root, files: [] });
  const require = createRequire(import.meta.url);
  for (const [name, dependency] of [
    ["prettier", "prettier"],
    ["eslint", "eslint"],
    ["markdown", "@eslint/markdown"],
  ]) {
    let directory = dirname(require.resolve(dependency));
    let metadata;
    while (!metadata) {
      try {
        const candidate = JSON.parse(
          readFileSync(join(directory, "package.json"), "utf8"),
        );
        if (candidate.name === dependency) metadata = candidate;
      } catch {}
      if (metadata) break;
      const parent = dirname(directory);
      assert.notEqual(
        parent,
        directory,
        "Installed package metadata must exist",
      );
      directory = parent;
    }
    assert.equal(result.tools[name], metadata.version);
  }
  const manifest = JSON.parse(
    readFileSync(
      new URL("../assets/tool-manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(result.tools.snapper, manifest.snapperVersion);
});
