// SPDX-License-Identifier: AGPL-3.0-only
import { loadConfiguration } from "./configuration.js";
import { selectDocuments, readDocument } from "./documents.js";
import { resolveTool, manifest } from "./native-tool.js";
import { createDocumentAnalyzer } from "./document-analysis.js";
import { createDocumentAnalyzerPool } from "./document-analysis-pool.js";
import { replaceDocument } from "./replacement.js";
import { createNativeStaging } from "./native-staging.js";
import { effectivePolicy } from "./preset.js";
import { createLinter } from "./analysis.js";
import { join } from "node:path";
export { compareQualityReports } from "./migration.js";
import {
  decode,
  fail,
  metadata,
  OperationError,
  diagnosticBudget,
  diagnosticCollector,
  exceeds,
} from "./contracts.js";
export function createResult(mode = "check", explicit = false) {
  return {
    schemaVersion: 2,
    package: { name: metadata.name, version: metadata.version },
    preset: "authored-gfm@1",
    tools: {
      prettier: "3.9.9",
      eslint: "10.12.0",
      markdown: "8.0.3",
      snapper: manifest.snapperVersion,
    },
    operation: ["check", "format", "inspect"].includes(mode) ? mode : "unknown",
    configDigest: null,
    configuration: null,
    policy: null,
    strict: false,
    selection: {
      mode: explicit ? "explicit" : "full",
      files: [],
      exclusions: [],
    },
    diagnostics: [],
    outcome: "error",
    exitCode: 2,
    written: [],
    unchanged: [],
    unprocessed: [],
    errors: [],
  };
}
/** Run checking, inspection, or guarded formatting. Invocation limits override configuration;
 * false removes package resource ceilings, and individual null values bypass that ceiling.
 */
export async function runQuality(options = {}) {
  const mode = options.mode ?? "check";
  const concurrency =
    options.concurrency === undefined ? 1 : options.concurrency;
  const result = createResult(mode, options.files !== undefined);
  let analyzer,
    staging,
    stagingAttempted = false;
  async function closeAnalysis() {
    if (analyzer) {
      const owned = analyzer;
      analyzer = undefined;
      await owned.close();
    }
    if (staging) {
      const owned = staging;
      staging = undefined;
      owned.close();
    }
  }
  try {
    if (options.strict !== undefined && typeof options.strict !== "boolean")
      fail("INVALID_STRICT", "Strict must be a boolean.");
    result.strict = options.strict ?? false;
    if (!["check", "format", "inspect"].includes(mode))
      fail("INVALID_OPERATION", "Unknown operation.");
    if (!Number.isInteger(concurrency) || concurrency < 1)
      fail(
        "INVALID_CONCURRENCY",
        "Concurrency must be an integer of at least 1.",
      );
    const context = loadConfiguration(options);
    result.policy = effectivePolicy(context.config);
    await createLinter(context).calculateConfigForFile(
      join(context.root, "document.md"),
    );
    result.configDigest = context.configDigest;
    result.configuration = context.config;
    result.selection = await selectDocuments(context, options.files);
    result.unprocessed = [...result.selection.files];
    // No native process or tool resolution is necessary for a zero selection.
    if (result.selection.files.length === 0) {
      result.outcome = "clean";
      result.exitCode = 0;
      return result;
    }
    const tool = resolveTool();
    if (mode === "inspect") {
      result.unprocessed = [];
      result.outcome = "clean";
      result.exitCode = 0;
      return result;
    }
    analyzer =
      concurrency === 1
        ? createDocumentAnalyzer(context, tool)
        : createDocumentAnalyzerPool(
            () => createDocumentAnalyzer(context, tool),
            concurrency,
          );
    const candidates = [];
    const budgets = context.config.limits;
    const collector = diagnosticCollector(budgets, true);
    result.diagnostics = collector.diagnostics;
    let total = 0,
      outputTotal = 0;
    let prepared = [],
      preparedBytes = 0;
    let inputs = [],
      inputBytes = 0;
    async function flushPrepared() {
      if (!prepared.length) return;
      const group = prepared;
      prepared = [];
      preparedBytes = 0;
      if (group.length > 1 && !stagingAttempted) {
        stagingAttempted = true;
        const started = performance.now();
        staging = createNativeStaging(context.root, budgets);
        const elapsed = performance.now() - started;
        for (const record of group) record.elapsedMs += elapsed;
      }
      const verified = await analyzer.verify(
        group.map(({ formatted, elapsedMs, precheck }) => ({
          output: formatted.output,
          elapsedMs,
          precheck: formatted.prechecked ? precheck : undefined,
        })),
        staging?.token,
      );
      for (const [index, { file, item, formatted }] of group.entries()) {
        if (formatted.deferredError)
          fail(formatted.deferredError.code, formatted.deferredError.message);
        const outputBytes = Buffer.byteLength(formatted.output);
        if (exceeds(outputBytes, budgets.fileBytes))
          fail("DOCUMENT_LIMIT", "Formatted document exceeds the size limit.");
        outputTotal += outputBytes;
        if (exceeds(outputTotal, budgets.totalBytes))
          fail(
            "BATCH_LIMIT",
            "Total formatted document bytes exceed the limit.",
          );
        const diagnostics = [
          ...formatted.diagnostics.slice(0, formatted.whitespaceCount),
          ...verified.diagnostics[index],
          ...formatted.diagnostics.slice(formatted.whitespaceCount),
        ];
        if (
          mode === "check" &&
          !item.bytes.equals(Buffer.from(formatted.output))
        )
          diagnostics.push({
            source: "formatter",
            rule: "layout",
            line: 1,
            column: 1,
            severity: "error",
            message: "Document requires formatting.",
          });
        diagnosticBudget(diagnostics, budgets);
        for (const d of diagnostics) {
          const diagnostic = { path: file, ...d };
          collector.push(diagnostic);
        }
        if (mode === "format")
          candidates.push({ file, item, output: formatted.output });
      }
    }
    async function flushInputs() {
      if (!inputs.length) return;
      const group = inputs;
      inputs = [];
      inputBytes = 0;
      let setupMs = 0;
      if (group.length > 1 && !stagingAttempted) {
        stagingAttempted = true;
        const started = performance.now();
        staging = createNativeStaging(context.root, budgets);
        setupMs = performance.now() - started;
      }
      let checks;
      let overheadMs = setupMs;
      if (staging) {
        const started = performance.now();
        checks = await analyzer.precheck(
          group.map((record) => record.original),
          staging.token,
        );
        overheadMs += Math.max(
          0,
          performance.now() - started - checks.workerMs,
        );
      }
      const parallel =
        concurrency > 1
          ? await analyzer.prepareGroup(
              group.map(({ original, file }, index) => ({
                data: {
                  text: original,
                  file,
                  mode,
                  precheck: checks?.checks[index],
                },
                milliseconds:
                  budgets.analysisMs === null
                    ? null
                    : budgets.analysisMs -
                      overheadMs -
                      (checks?.elapsedMs[index] ?? 0),
              })),
            )
          : undefined;
      for (const [index, { file, item, original }] of group.entries()) {
        const precheck = checks?.checks[index];
        let elapsedMs = overheadMs + (checks?.elapsedMs[index] ?? 0);
        let formatted;
        try {
          if (parallel) {
            if (parallel[index].error) throw parallel[index].error;
            formatted = parallel[index].formatted;
            elapsedMs += parallel[index].elapsedMs;
          } else {
            const started = performance.now();
            formatted = await analyzer.prepare(
              { text: original, file, mode, precheck },
              budgets.analysisMs === null
                ? null
                : budgets.analysisMs - elapsedMs,
            );
            elapsedMs += performance.now() - started;
          }
        } catch (error) {
          await flushPrepared();
          throw error;
        }
        const retainedBytes =
          item.bytes.length + Buffer.byteLength(formatted.output);
        if (
          prepared.length >= 32 ||
          preparedBytes + retainedBytes > 4 * 1024 * 1024 ||
          formatted.deferredError
        )
          await flushPrepared();
        prepared.push({ file, item, formatted, elapsedMs, precheck });
        preparedBytes += retainedBytes;
        if (formatted.deferredError) await flushPrepared();
      }
      await flushPrepared();
    }
    for (const file of result.selection.files) {
      let item, original;
      try {
        item = readDocument(context.root, file, budgets);
        if (mode === "format" && item.stat.nlink !== 1n)
          fail("HARD_LINK", "Hard-linked documents cannot be formatted.");
        total += item.bytes.length;
        if (exceeds(total, budgets.totalBytes))
          fail("BATCH_LIMIT", "Total document bytes exceed the limit.");
        original = decode(item.bytes);
      } catch (error) {
        await flushInputs();
        throw error;
      }
      if (
        inputs.length >= 32 ||
        inputBytes + item.bytes.length > 4 * 1024 * 1024
      )
        await flushInputs();
      inputs.push({ file, item, original });
      inputBytes += item.bytes.length;
    }
    await flushInputs();
    await flushPrepared();
    // Quiesce the worker and remove private payloads before admitting any write.
    await closeAnalysis();
    result.diagnostics.sort((a, b) =>
      a.path < b.path
        ? -1
        : a.path > b.path
          ? 1
          : a.line - b.line ||
            a.column - b.column ||
            a.rule.localeCompare(b.rule, "en"),
    );
    if (
      result.diagnostics.some(
        (d) =>
          d.severity === "error" ||
          (options.strict && d.severity === "warning"),
      )
    ) {
      result.outcome = "findings";
      result.exitCode = 1;
      return result;
    }
    if (mode === "format")
      for (const candidate of candidates) {
        if (candidate.item.bytes.equals(Buffer.from(candidate.output)))
          result.unchanged.push(candidate.file);
        else {
          replaceDocument(
            context.root,
            candidate.item,
            candidate.output,
            budgets,
          );
          result.written.push(candidate.file);
        }
        result.unprocessed.shift();
      }
    else {
      result.unchanged = [...result.selection.files];
      result.unprocessed = [];
    }
    result.outcome = result.diagnostics.length ? "findings" : "clean";
    result.exitCode = 0;
  } catch (error) {
    result.errors.push({
      code: error instanceof OperationError ? error.code : "OPERATION_FAILED",
      message:
        error instanceof OperationError ? error.message : "Operation failed.",
    });
  } finally {
    try {
      await closeAnalysis();
    } catch (error) {
      result.outcome = "error";
      result.exitCode = 2;
      result.errors.push({
        code: error instanceof OperationError ? error.code : "OPERATION_FAILED",
        message:
          error instanceof OperationError ? error.message : "Operation failed.",
      });
    }
  }
  return result;
}
