// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import { consumer, moduleMockExportOption } from "./helpers.js";
import { defaultAnalyzerLimits as defaults } from "../src/analyzer-limits.js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { execFileSync } from "node:child_process";
const validate = new Ajv({ strict: true }).compile(
  JSON.parse(
    readFileSync(
      new URL("../schemas/result.schema.json", import.meta.url),
      "utf8",
    ),
  ),
);
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("consumer can disable diagnostic budgets without disabling findings or write admission", async (t) => {
  const input =
    Array.from({ length: 1001 }, (_, i) => `[Missing ${i}](missing.md)`).join(
      "\n\n",
    ) + "\n";
  const root = consumer(t, { "a.md": input });
  const result = await runQuality({
    root,
    mode: "format",
    analyzerLimits: false,
  });
  assert.equal(result.exitCode, 1, JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
  assert.equal(
    result.diagnostics.filter((d) => d.source === "links").length,
    1001,
  );
  assert.deepEqual(result.writtenPaths, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
});

test("raised and individual unlimited diagnostic limits keep info nonblocking and calls isolated", async (t) => {
  const input = ("x".repeat(121) + "\n\n").repeat(1001);
  const root = consumer(
    t,
    { "a.md": input },
    { analyzerLimits: { maxDocumentDiagnostics: 2 } },
  );
  const capped = await runQuality({ root });
  assert.equal(capped.errors[0].code, "DIAGNOSTIC_LIMIT");
  for (const overrides of [
    { maxDocumentDiagnostics: 2000 },
    { maxDocumentDiagnostics: null },
  ]) {
    const result = await runQuality({ root, analyzerLimits: overrides });
    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    assert.equal(
      result.diagnostics.filter((d) => d.rule === "quality/long-prose-line")
        .length,
      1001,
    );
    // Last paragraph has one extra blank line, so layout drift still blocks check.
    assert.equal(result.exitCode, 1);
    assert.ok(validate(result), JSON.stringify(validate.errors));
    assert.equal(
      result.configuration.analyzerLimits.maxDocumentDiagnostics,
      overrides.maxDocumentDiagnostics,
    );
    assert.equal(
      result.configuration.analyzerLimits.maxTotalDiagnostics,
      defaults.maxTotalDiagnostics,
    );
    assert.deepEqual(
      result.policy.analyzerLimits,
      result.configuration.analyzerLimits,
    );
  }
  assert.equal((await runQuality({ root })).errors[0].code, "DIAGNOSTIC_LIMIT");
  const formatted = await runQuality({
    root,
    mode: "format",
    analyzerLimits: false,
  });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted.errors));
  assert.equal(formatted.diagnostics.length, 1001);
  assert.ok(formatted.diagnostics.every((d) => d.severity === "info"));
});

test("every selection/acquisition budget can be raised or bypassed without bypassing path safety", async (t) => {
  for (const [field, code] of [
    ["maxDocumentBytes", "DOCUMENT_LIMIT"],
    ["maxTotalDocumentBytes", "BATCH_LIMIT"],
    ["maxPathsPerSelectionStage", "SELECTION_LIMIT"],
    ["maxEnumeratedEntries", "SELECTION_LIMIT"],
    ["maxInventoryBytes", "SELECTION_LIMIT"],
    ["maxConfigurationBytes", "CONFIG_LIMIT"],
    ["maxPatternCodePoints", "CONFIG_LIMIT"],
  ]) {
    const root = consumer(
      t,
      { "a.md": "Alpha.\n", "b.md": "Beta.\n" },
      { analyzerLimits: { [field]: 1 } },
    );
    const capped = await runQuality({ root });
    assert.equal(capped.errors[0]?.code, code, field + JSON.stringify(capped));
    const raised = await runQuality({
      root,
      analyzerLimits: { [field]: 100000 },
    });
    assert.equal(raised.exitCode, 0, field + JSON.stringify(raised.errors));
    const bypass = await runQuality({
      root,
      analyzerLimits: { [field]: null },
    });
    assert.equal(bypass.exitCode, 0, field + JSON.stringify(bypass.errors));
    const unsafe = await runQuality({
      root,
      analyzerLimits: false,
      files: ["../outside.md"],
    });
    assert.equal(unsafe.errors[0]?.code, "UNSAFE_PATH");
  }
});

test("CLI/configuration unlimited settings expose resolved values and reject malformed overrides", async (t) => {
  const root = consumer(
    t,
    { "a.md": "Alpha.\n" },
    { analyzerLimits: { maxConfigurationBytes: 1 } },
  );
  const command = spawnSync(
    process.execPath,
    [cli, "check", "--root", root, "--json", "--no-analyzer-limits"],
    { encoding: "utf8", timeout: 30000 },
  );
  assert.equal(command.status, 0, command.stdout + command.stderr);
  const report = JSON.parse(command.stdout);
  assert.ok(validate(report), JSON.stringify(validate.errors));
  assert.ok(
    Object.values(report.configuration.analyzerLimits).every(
      (value) => value === null,
    ),
  );
  const configured = consumer(t, {}, { analyzerLimits: false });
  const inspected = await runQuality({ root: configured, mode: "inspect" });
  assert.equal(inspected.exitCode, 0);
  assert.ok(
    Object.values(inspected.configuration.analyzerLimits).every(
      (value) => value === null,
    ),
  );
  for (const [invalid, code] of [
    [null, "INVALID_OPTION"],
    [true, "INVALID_OPTION"],
    [[], "INVALID_OPTION"],
    [{ maxDocumentBytes: 0 }, "INVALID_RESOURCE_POLICY"],
    [{ documentAnalysisTimeoutMs: -1 }, "INVALID_RESOURCE_POLICY"],
    [{ maxTotalDiagnostics: 1.5 }, "INVALID_RESOURCE_POLICY"],
    [
      { maxPathsPerSelectionStage: Number.MAX_SAFE_INTEGER + 1 },
      "INVALID_RESOURCE_POLICY",
    ],
    [{ unknown: null }, "INVALID_RESOURCE_POLICY"],
  ]) {
    const rejected = await runQuality({ root, analyzerLimits: invalid });
    assert.equal(rejected.exitCode, 2, JSON.stringify(invalid));
    assert.equal(rejected.errors[0]?.code, code, JSON.stringify(invalid));
  }
});

test("byte and batch diagnostic ceilings remain independently overridable", async (t) => {
  const root = consumer(t, {
    "a.md": "[Missing](missing.md)\n",
    "b.md": "[Absent](absent.md)\n",
  });
  for (const field of ["maxDiagnosticJsonBytes", "maxTotalDiagnostics"]) {
    const capped = await runQuality({ root, analyzerLimits: { [field]: 1 } });
    assert.equal(capped.errors[0]?.code, "DIAGNOSTIC_LIMIT");
    const complete = await runQuality({
      root,
      analyzerLimits: { [field]: null },
    });
    assert.equal(complete.exitCode, 1);
    assert.deepEqual(complete.errors, []);
    assert.equal(
      complete.diagnostics.filter((d) => d.source === "links").length,
      2,
    );
  }
});

test("native output and analysis time budgets propagate through real analysis", async (t) => {
  const root = consumer(t, { "a.md": "Alpha.\n" });
  for (const [field, code] of [
    ["maxNativeOutputBytes", "NATIVE_FAILURE"],
    ["documentAnalysisTimeoutMs", "ANALYSIS_TIMEOUT"],
  ]) {
    const capped = await runQuality({ root, analyzerLimits: { [field]: 1 } });
    assert.equal(capped.errors[0]?.code, code, JSON.stringify(capped.errors));
    const complete = await runQuality({
      root,
      analyzerLimits: { [field]: null },
    });
    assert.equal(complete.exitCode, 0, JSON.stringify(complete.errors));
  }
  const huge = await runQuality({
    root,
    analyzerLimits: { documentAnalysisTimeoutMs: Number.MAX_SAFE_INTEGER },
  });
  assert.equal(huge.exitCode, 0, JSON.stringify(huge.errors));
});

test("unlimited native lint and whitespace producers retain more than a thousand findings", async (t) => {
  for (const [input, source, mode] of [
    ["```\nx\n```\n\n".repeat(1001), "eslint", "format"],
    ["Alpha. \n\n".repeat(1001), "formatter", "check"],
  ]) {
    const root = consumer(t, { "a.md": input });
    const result = await runQuality({ root, mode, analyzerLimits: false });
    assert.equal(result.exitCode, 1, JSON.stringify(result.errors));
    assert.deepEqual(result.errors, []);
    assert.ok(
      result.diagnostics.filter((d) => d.source === source).length >= 1001,
    );
    assert.deepEqual(result.writtenPaths, []);
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
  }
});

test("unlimited aggregate diagnostics exceed the old batch count and validate as a complete report", async (t) => {
  const input = "[Missing](missing.md)\n\n".repeat(2501);
  const root = consumer(
    t,
    Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`${i}.md`, input]),
    ),
  );
  const result = await runQuality({ root, analyzerLimits: false });
  assert.equal(result.exitCode, 1, JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
  assert.equal(
    result.diagnostics.filter((d) => d.source === "links").length,
    27511,
  );
  assert.ok(
    Buffer.byteLength(JSON.stringify(result.diagnostics)) >
      defaults.maxDiagnosticJsonBytes,
  );
  assert.ok(validate(result), JSON.stringify(validate.errors));
});

test("unlimited resource settings preserve strict warning admission", async (t) => {
  const root = consumer(t, {
    "a.md": "# Title\n\n## Same\n\n## Same\n\nAlpha. Beta.\n",
  });
  const strict = await runQuality({
    root,
    mode: "format",
    strict: true,
    analyzerLimits: false,
  });
  assert.equal(strict.exitCode, 1, JSON.stringify(strict.errors));
  assert.deepEqual(strict.errors, []);
  assert.ok(strict.diagnostics.some((d) => d.severity === "warning"));
  assert.deepEqual(strict.writtenPaths, []);
  const ordinary = await runQuality({
    root,
    mode: "format",
    analyzerLimits: false,
  });
  assert.equal(ordinary.exitCode, 0, JSON.stringify(ordinary.errors));
  assert.deepEqual(ordinary.writtenPaths, ["a.md"]);
});

test("large literal documents can bypass the original file ceiling without changing their bytes", async (t) => {
  const input = "```text\n" + "x".repeat(defaults.maxDocumentBytes) + "\n```\n";
  const root = consumer(t, { "a.md": input });
  assert.equal((await runQuality({ root })).errors[0]?.code, "DOCUMENT_LIMIT");
  const complete = await runQuality({ root, analyzerLimits: false });
  assert.equal(complete.exitCode, 0, JSON.stringify(complete.errors));
  assert.deepEqual(complete.errors, []);
  assert.deepEqual(complete.diagnostics, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
});

test("formatting replacement rechecks use the consumer file ceiling", async (t) => {
  const input = "~~~text\n" + "x".repeat(defaults.maxDocumentBytes) + "\n~~~\n";
  const expected =
    "```text\n" + "x".repeat(defaults.maxDocumentBytes) + "\n```\n";
  const root = consumer(t, { "a.md": input });
  for (const overrides of [
    { maxDocumentBytes: defaults.maxDocumentBytes * 2 },
    false,
  ]) {
    writeFileSync(join(root, "a.md"), input);
    const formatted = await runQuality({
      root,
      mode: "format",
      analyzerLimits: overrides,
    });
    assert.equal(formatted.exitCode, 0, JSON.stringify(formatted.errors));
    assert.deepEqual(formatted.writtenPaths, ["a.md"]);
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
    assert.deepEqual(
      (await runQuality({ root, mode: "format", analyzerLimits: overrides }))
        .writtenPaths,
      [],
    );
  }
});

test("configuration cannot raise its own byte ceiling but can bypass its entry defaults", async (t) => {
  const root = consumer(
    t,
    { "a.md": "Alpha.\n" },
    { include: Array(101).fill("**/*.md"), analyzerLimits: false },
  );
  const path = join(root, ".markdown-quality.json");
  writeFileSync(
    path,
    readFileSync(path, "utf8") + " ".repeat(defaults.maxConfigurationBytes),
  );
  // The file is read under the invocation/profile ceiling, so its own
  // analyzerLimits cannot admit its oversized bytes.
  assert.equal((await runQuality({ root })).errors[0]?.code, "CONFIG_LIMIT");
  const complete = await runQuality({
    root,
    analyzerLimits: { maxConfigurationBytes: null },
  });
  assert.equal(complete.exitCode, 0, JSON.stringify(complete.errors));
  assert.equal(
    complete.configuration.analyzerLimits.maxConfigurationBytes,
    null,
  );
  assert.equal(complete.configuration.analyzerLimits.maxPatternsPerList, null);
  const capped = await runQuality({
    root,
    analyzerLimits: { maxConfigurationBytes: defaults.maxConfigurationBytes },
  });
  assert.equal(capped.errors[0]?.code, "CONFIG_LIMIT");
});

test("configuration entry counts honour individual overrides; ignore files are not policy inputs", async (t) => {
  for (const field of ["maxPatternsPerList", "maxRuleOverrideCount"]) {
    const root = consumer(
      t,
      { "a.md": "Alpha.\n" },
      {
        include: ["*.md", "docs/*.md"],
        lint: { "markdown/no-html": "off", "markdown/no-empty-links": "error" },
        analyzerLimits: { [field]: 1 },
      },
    );
    assert.equal(
      (await runQuality({ root })).errors[0]?.code,
      "CONFIG_LIMIT",
      field,
    );
    for (const value of [3, null]) {
      const complete = await runQuality({
        root,
        analyzerLimits: { [field]: value },
      });
      assert.equal(
        complete.exitCode,
        0,
        field + JSON.stringify(complete.errors),
      );
    }
  }
  const root = consumer(t, {
    "a.md": "Alpha.\n",
    ".gitignore": "#" + "x".repeat(defaults.maxConfigurationBytes),
  });
  assert.equal((await runQuality({ root })).exitCode, 0);
  assert.equal(
    (
      await runQuality({
        root,
        analyzerLimits: { maxConfigurationBytes: null },
      })
    ).exitCode,
    0,
  );
});

test("native/staging budgets and worker memory reach actual runtime calls with finite and unlimited settings", (t) => {
  const root = consumer(t);
  const modules = Object.fromEntries(
    [
      "configuration",
      "native-tool",
      "native-checks",
      "native-staging",
      "document-analysis",
    ].map((name) => [name, new URL(`../src/${name}.js`, import.meta.url).href]),
  );
  const script = join(root, "runtime-budgets.mjs");
  writeFileSync(
    script,
    `
    import { mock } from "node:test";
    import * as childProcess from "node:child_process";
    import * as threads from "node:worker_threads";
    const calls = [], workers = [];
    const mockExports = ${JSON.stringify(moduleMockExportOption)};
    mock.module("node:child_process", { [mockExports]: { execFileSync: childProcess.execFileSync, spawnSync: (...args) => {
      const options = args[2];
      calls.push({ command: args[0], args: args[1], timeout: options.timeout, maxBuffer: options.maxBuffer === Infinity ? "unlimited" : options.maxBuffer });
      return childProcess.spawnSync(...args);
    } } });
    mock.module("node:worker_threads", { [mockExports]: { Worker: class extends threads.Worker {
      constructor(url, options) {
        super(url, options);
        const record = { requested: options.resourceLimits };
        workers.push(record);
        this.once("online", () => { record.actual = this.resourceLimits; });
      }
    } } });
    const { loadConfiguration } = await import(${JSON.stringify(modules.configuration)});
    const { resolveTool, runNative } = await import(${JSON.stringify(modules["native-tool"])});
    const { runNativeChecks } = await import(${JSON.stringify(modules["native-checks"])});
    const { createNativeStaging } = await import(${JSON.stringify(modules["native-staging"])});
    const { createDocumentAnalyzer } = await import(${JSON.stringify(modules["document-analysis"])});
    const tool = resolveTool();
    for (const selected of [{ nativeInvocationTimeoutMs: 60000, maxNativeOutputBytes: 16777216, nativeStagingAccessTimeoutMs: 10000, maxNativeStagingCommandOutputBytes: 131072, maxWorkerOldGenerationMiB: 64, workerStackMiB: 8 }, false]) {
      const context = loadConfiguration({ root: ${JSON.stringify(root)}, analyzerLimits: selected });
      const start = calls.length;
      const staging = createNativeStaging(context.root, context.config.analyzerLimits);
      if (!staging) throw Error("Supported staging unavailable");
      try {
        runNative(tool, "Alpha. Beta.\\n", false, context.config.analyzerLimits);
        runNative(tool, "Alpha. Beta.\\n", true, context.config.analyzerLimits);
        runNativeChecks(tool, ["Alpha. Beta.\\n", "Gamma.\\n"], staging.token, undefined, context.config.analyzerLimits);
        const analyzer = createDocumentAnalyzer(context, tool);
        try { await analyzer.prepare({text:"Alpha.\\n",file:"a.md",mode:"check"}); }
        finally { await analyzer.close(); }
      } finally { staging.close(); }
      workers.at(-1).calls = calls.slice(start);
    }
    console.log(JSON.stringify(workers));
  `,
  );
  const observed = JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-test-module-mocks", script],
      { encoding: "utf8", timeout: 30000, windowsHide: true },
    ),
  );
  assert.equal(observed.length, 2);
  assert.deepEqual(observed[0].requested, {
    maxOldGenerationSizeMb: 64,
    stackSizeMb: 8,
  });
  assert.equal(observed[0].actual.maxOldGenerationSizeMb, 64);
  assert.equal(observed[0].actual.stackSizeMb, 8);
  assert.deepEqual(observed[1].requested, {});
  for (const [index, worker] of observed.entries()) {
    const native = worker.calls.filter((call) =>
      call.args.includes("--native"),
    );
    assert.ok(native.length >= 3);
    assert.ok(
      native.every((call) => call.timeout === (index === 0 ? 60000 : 0)),
    );
    assert.ok(
      native.every(
        (call) => call.maxBuffer === (index === 0 ? 16777216 : "unlimited"),
      ),
    );
    if (process.platform === "win32") {
      const helpers = worker.calls.filter((call) => !native.includes(call));
      assert.equal(helpers.length, 3);
      assert.ok(
        helpers.every(
          (call) =>
            call.timeout >= 0 && call.timeout <= (index === 0 ? 10000 : 0),
        ),
      );
      assert.ok(
        helpers.every(
          (call) => call.maxBuffer === (index === 0 ? 131072 : "unlimited"),
        ),
      );
    }
  }
});
