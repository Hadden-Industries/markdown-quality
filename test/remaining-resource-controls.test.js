// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { consumer } from "./helpers.js";
import { loadConfiguration } from "../src/configuration.js";
import { parse } from "../src/analysis.js";
import { checkLocalLinks } from "../src/local-links.js";
import { createLinkGraph } from "../src/link-graph.js";
import { diagnosticCollector, diagnosticExcerpt } from "../src/contracts.js";
import { nativeThreadEnvironment } from "../src/native-policy.js";
import { runQuality } from "../src/quality.js";

test("diagnostic excerpts honor finite, raised and unlimited caller controls without splitting scalars", (t) => {
  const root = consumer(t),
    marker = "x".repeat(700);
  for (const maximum of [20, 900, null]) {
    const context = loadConfiguration({
      root,
      analyzerLimits: { maxLinkDiagnosticCodePoints: maximum },
    });
    const findings = [];
    checkLocalLinks(
      context,
      parse(`[link](#${marker})\n`),
      "virtual.md",
      findings,
    );
    assert.equal(findings.length, 1);
    assert.equal(
      findings[0].message.includes(marker),
      maximum === null || maximum >= 700,
    );
    const graph = createLinkGraph(context, {
      admitBytes() {
        throw new Error("Batch member must not be reread");
      },
    });
    graph.addDocument("target.md", new Map(), []);
    graph.addDocument("virtual.md", new Map(), [
      { target: "target.md", fragment: marker, line: 1, column: 1 },
    ]);
    const crossed = [];
    graph.resolve((finding) => crossed.push(finding));
    assert.equal(
      crossed[0].message.includes(marker),
      maximum === null || maximum >= 700,
    );
  }
  assert.equal(diagnosticExcerpt("😀😀x", 1), "😀…");
  assert.equal(diagnosticExcerpt("😀😀x", null), "😀😀x");
  const context = loadConfiguration({ root, resourceLimitMode: "unlimited" });
  const collector = diagnosticCollector({
    ...context.config.analyzerLimits,
    maxDocumentDiagnostics: 1,
  });
  assert.throws(
    () =>
      checkLocalLinks(
        context,
        parse(`[one](#${marker}) [two](#${marker})\n`),
        "virtual.md",
        collector,
      ),
    /Diagnostic count/u,
  );
});

test("native thread selection is caller owned and unlimited mode removes the environment constraint", (t) => {
  const root = consumer(t);
  for (const nativeThreads of [1, 3, null]) {
    const context = loadConfiguration({
      root,
      analyzerLimits: { nativeThreads },
    });
    assert.deepEqual(
      nativeThreadEnvironment(context.config.analyzerLimits),
      nativeThreads === null
        ? {}
        : { RAYON_NUM_THREADS: String(nativeThreads) },
    );
  }
  const context = loadConfiguration({ root, resourceLimitMode: "unlimited" });
  assert.deepEqual(nativeThreadEnvironment(context.config.analyzerLimits), {});
  assert.equal(context.config.analyzerLimits.maxLinkDiagnosticCodePoints, null);
  assert.equal(context.config.analyzerLimits.maxPathDiagnosticCodePoints, null);
  for (const key of [
    "nativeThreads",
    "maxLinkDiagnosticCodePoints",
    "maxPathDiagnosticCodePoints",
  ])
    assert.throws(
      () => loadConfiguration({ root, analyzerLimits: { [key]: 0 } }),
      /positive safe integer/u,
    );
});

test("real native file checks preserve raised and unlimited thread selections", async (t) => {
  const root = consumer(t);
  writeFileSync(join(root, "README.md"), "# Heading\n\nOne sentence.\n");
  for (const nativeThreads of [2, null]) {
    const result = await runQuality({
      root,
      files: ["README.md"],
      analyzerLimits: { nativeThreads },
    });
    assert.equal(result.exitCode, 0, JSON.stringify(result.errors));
    assert.equal(
      result.configuration.analyzerLimits.nativeThreads,
      nativeThreads,
    );
  }
});
