// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentAnalyzer } from "../src/document-analysis.js";
import { loadConfiguration } from "../src/configuration.js";
import { resolveTool } from "../src/native-tool.js";
import { consumer } from "./helpers.js";

test("group verification cannot renew an exhausted or invalid document deadline", async (t) => {
  const context = loadConfiguration({ root: consumer(t) });
  const analyzer = createDocumentAnalyzer(context, resolveTool());
  t.after(() => analyzer.close());
  for (const [elapsedMs, code] of [
    [30_001, "ANALYSIS_TIMEOUT"],
    [NaN, "ANALYSIS_FAILURE"],
    [-1, "ANALYSIS_FAILURE"],
  ]) {
    await assert.rejects(analyzer.verify([{ output: "Alpha.\n", elapsedMs }]), {
      code,
    });
  }
  const prepared = await analyzer.prepare({
    text: "Alpha.\n",
    file: "a.md",
    mode: "check",
  });
  assert.equal(prepared.output, "Alpha.\n");
  const verified = await analyzer.verify([
    { output: prepared.output, elapsedMs: 0 },
  ]);
  assert.deepEqual(verified.diagnostics, [[]]);
});

test("closing analysis rejects pending and queued requests without admitting provisional bytes", async (t) => {
  const analyzer = createDocumentAnalyzer(
    loadConfiguration({ root: consumer(t) }),
    resolveTool(),
  );
  const pending = assert.rejects(
    analyzer.prepare({ text: "Alpha. Beta.\n", file: "a.md", mode: "format" }),
    { code: "ANALYSIS_FAILURE" },
  );
  await assert.rejects(
    analyzer.verify([{ output: "Alpha.\n", elapsedMs: 0 }]),
    { code: "ANALYSIS_FAILURE" },
  );
  await analyzer.close();
  await pending;
  await assert.rejects(
    analyzer.prepare({ text: "Alpha.\n", file: "a.md", mode: "check" }),
    { code: "ANALYSIS_FAILURE" },
  );
  await analyzer.close();
});

test("check-first retains quoted-item and continuation verification and shares its budget", async (t) => {
  const root = consumer(t);
  const { createNativeStaging } = await import("../src/native-staging.js");
  const staging = createNativeStaging(root);
  assert.ok(staging);
  const analyzer = createDocumentAnalyzer(
    loadConfiguration({ root }),
    resolveTool(),
  );
  t.after(async () => {
    await analyzer.close();
    staging.close();
  });
  const texts = [
    "> 1. First.\n>    Continuation.\n> 2. Second.\n",
    "Alpha.\n",
    "Alpha. Beta.\n",
  ];
  const checked = await analyzer.precheck(texts, staging.token);
  assert.equal(checked.checks[1].report.wouldReformat, false);
  const outputs = [];
  for (const [index, text] of texts.entries()) {
    const prepared = await analyzer.prepare(
      {
        text,
        file: `${index}.md`,
        mode: "check",
        precheck: checked.checks[index],
      },
      30_000 - checked.elapsedMs[index],
    );
    if (index === 1) assert.equal(prepared.prechecked, true);
    if (index === 2) assert.equal(prepared.prechecked, undefined);
    outputs.push({
      output: prepared.output,
      precheck: prepared.prechecked ? checked.checks[index] : undefined,
      elapsedMs: checked.elapsedMs[index],
    });
  }
  assert.deepEqual(
    (await analyzer.verify(outputs, staging.token)).diagnostics,
    [[], [], []],
  );
  await assert.rejects(
    analyzer.prepare({ text: "Alpha.\n", file: "a.md", mode: "check" }, 0),
    { code: "ANALYSIS_TIMEOUT" },
  );
});
