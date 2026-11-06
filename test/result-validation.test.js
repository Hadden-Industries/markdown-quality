// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Ajv from "ajv";
import { dirname, join } from "node:path";
import {
  processLogicalDocument,
  runQuality,
  validateQualityResult,
} from "../src/quality.js";
import { admitCheckEvidence } from "../src/result-validation.js";
import { createInitialQualityResult } from "../src/result-construction.js";
import { consumer } from "./helpers.js";

test("completed results require policy and resource evidence in the exported schema and SDK", async (t) => {
  const root = consumer(t);
  const schema = JSON.parse(
    readFileSync(new URL("../schemas/result.schema.json", import.meta.url)),
  );
  const validate = new Ajv({ strict: true }).compile(schema);
  for (const options of [
    {},
    { mode: "inspect" },
    { mode: "format", dryRun: true },
    { mode: "normalize" },
  ]) {
    const result = await runQuality({ root, files: [], ...options });
    assert.equal(result.exitCode, 0);
    assert.equal(validate(result), true, JSON.stringify(validate.errors));
    for (const key of [
      "configurationOrigin",
      "defaultConfigurationSha256",
      "policyResolverInputsSha256",
      "effectiveConfigurationSha256",
      "configuration",
      "policy",
      "resourcePolicy",
    ]) {
      const incomplete = structuredClone(result);
      incomplete[key] = null;
      assert.equal(validate(incomplete), false, `${result.operation}: ${key}`);
      assert.throws(() => validateQualityResult(incomplete), {
        code: "INVALID_RESULT",
      });
    }
  }
  // Input admission can fail before any policy is available; keep that real error.
  const failed = await runQuality({ root, config: "missing.json" });
  assert.equal(failed.exitCode, 2);
  assert.equal(failed.configuration, null);
  assert.equal(validate(failed), true, JSON.stringify(validate.errors));
  assert.equal(validateQualityResult(failed), failed);
  assert.equal(schema.$id, "urn:hadden-industries:markdown-quality:result:5");
});

test("large reconciled reports retain exact scope and reject late contradictions", async (t) => {
  const root = consumer(t);
  const result = await runQuality({ root, files: [] });
  for (const count of [3000, 6000, 12000]) {
    const report = structuredClone(result);
    report.selection.files = Array.from(
      { length: count },
      (_, index) => `docs/${index}.md`,
    );
    report.selection.reconciliationDecisions = report.selection.files.map(
      (path) => ({
        path,
        decision: "selected",
        pattern: null,
        matchedPath: null,
      }),
    );
    report.documentResults = report.selection.files.map((path) => ({
      path,
      analysisStatus: "completed",
      writeStatus: "not-requested",
      candidate: null,
    }));
    const started = performance.now();
    assert.equal(validateQualityResult(report), report);
    t.diagnostic(
      `${count} reconciled paths: ${Math.round(performance.now() - started)} ms`,
    );
    const last = report.selection.reconciliationDecisions.at(-1);
    last.decision = "excluded";
    assert.throws(() => validateQualityResult(report), {
      code: "INVALID_RESULT",
    });
    last.decision = "selected";
    report.documentResults.at(-1).path = "unselected.md";
    assert.throws(() => validateQualityResult(report), {
      code: "INVALID_RESULT",
    });
  }
});

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
