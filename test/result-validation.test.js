// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
  processLogicalDocument,
  runQuality,
  validateQualityResult,
} from "../src/quality.js";
import { admitCheckEvidence } from "../src/result-validation.js";
import { createInitialQualityResult } from "../src/result-construction.js";
import { consumer } from "./helpers.js";

test("request identity binds every report except a failure before admission", async (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" });
  const content = Buffer.from("Alpha.\n");
  const identity = { code: "RESULT_IDENTITY" };

  const logical = await processLogicalDocument({
    root,
    path: "new.md",
    requestId: "r1",
    content,
  });
  assert.equal(validateQualityResult(logical, { requestId: "r1" }), logical);
  assert.throws(
    () => validateQualityResult(logical, { requestId: "other" }),
    identity,
  );

  const unrelated = await runQuality({ root });
  assert.equal(unrelated.document, null);
  assert.throws(
    () => validateQualityResult(unrelated, { requestId: "r1" }),
    identity,
  );

  const refused = await processLogicalDocument({
    root,
    path: "../outside.md",
    requestId: "r1",
    content,
  });
  assert.equal(refused.operationStatus, "failed");
  assert.equal(refused.document, null);
  assert.equal(refused.errors[0].code, "UNSAFE_PATH");
  assert.equal(validateQualityResult(refused, { requestId: "r1" }), refused);
});

test("supported validator rejects semantic lies and permits complete advisory success", async (t) => {
  const root = consumer(t, { "a.md": "# Heading!\n\nAlpha.\n" });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 0);
  assert.equal(result.operationStatus, "completed");
  assert.equal(result.qualityStatus, "findings");
  assert.equal(result.qualityBasis, "input");
  assert.ok(result.diagnostics.length);
  assert.ok(result.diagnostics.every((d) => d.severity !== "error"));
  assert.equal(validateQualityResult(result), result);
  assert.equal(admitCheckEvidence(result), result);
  for (const change of [
    (report) => {
      delete report.tools.eslintMarkdown;
    },
    (report) => {
      report.exitCode = 1;
    },
    // writtenPaths must be the projection of confirmed document writes.
    (report) => {
      report.writtenPaths = ["a.md"];
    },
    (report) => {
      report.documentResults[0].writeStatus = "written";
      report.writtenPaths = ["a.md"];
    },
    (report) => {
      report.documentResults = [];
    },
    (report) => {
      report.qualityBasis = "candidate";
    },
    (report) => {
      report.qualityStatus = "clean";
    },
    (report) => {
      report.documentResults[0].analysisStatus = "incomplete";
    },
    // Exit 0 cannot coexist with a blocking error-severity diagnostic.
    (report) => {
      report.diagnostics[0].severity = "error";
    },
    // An operational failure must carry its errors.
    (report) => {
      report.exitCode = 2;
      report.operationStatus = "failed";
      report.qualityStatus = "incomplete";
      report.qualityBasis = null;
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
  const inspected = await runQuality({ root, mode: "inspect" });
  assert.equal(validateQualityResult(inspected), inspected);
  for (const change of [
    (report) => {
      report.diagnostics = structuredClone(result.diagnostics);
      report.qualityStatus = "findings";
    },
    (report) => {
      report.qualityStatus = "clean";
      report.qualityBasis = "input";
    },
  ]) {
    const report = structuredClone(inspected);
    change(report);
    assert.throws(() => validateQualityResult(report));
  }
  assert.throws(() => admitCheckEvidence(inspected));
  // The provisional failure-shaped record is never a valid result.
  assert.throws(() => validateQualityResult(createInitialQualityResult()));
  assert.throws(() =>
    validateQualityResult(createInitialQualityResult("format")),
  );
});

test("successful repair results are never admitted as check evidence", async (t) => {
  const root = consumer(t, { "a.md": "Alpha. Beta.\n", "b.md": "Gamma.\n" });
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted.errors));
  assert.equal(formatted.qualityBasis, "applied");
  assert.deepEqual(formatted.writtenPaths, ["a.md"]);
  assert.equal(validateQualityResult(formatted), formatted);
  assert.throws(() => admitCheckEvidence(formatted), {
    code: "INVALID_RESULT",
  });
  const unchanged = await runQuality({ root, mode: "format" });
  assert.deepEqual(unchanged.writtenPaths, []);
  assert.throws(() => admitCheckEvidence(unchanged), {
    code: "INVALID_RESULT",
  });
  const relabelled = structuredClone(unchanged);
  relabelled.qualityBasis = "input";
  assert.throws(() => validateQualityResult(relabelled));
  assert.equal(admitCheckEvidence(await runQuality({ root })).exitCode, 0);
});

test("reported tools match independent installed package and native manifest metadata", async (t) => {
  const root = consumer(t);
  const result = await runQuality({ root, files: [] });
  const require = createRequire(import.meta.url);
  for (const [name, dependency] of [
    ["prettier", "prettier"],
    ["eslint", "eslint"],
    ["eslintMarkdown", "@eslint/markdown"],
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
