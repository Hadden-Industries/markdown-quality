// SPDX-License-Identifier: AGPL-3.0-only
import { loadConfiguration } from "./configuration.js";
import { selectDocuments, readDocument } from "./documents.js";
import { resolveTool, manifest } from "./native-tool.js";
import { createDocumentAnalyzer } from "./document-analysis.js";
import { replaceDocument } from "./replacement.js";
import {
  decode,
  fail,
  limits,
  metadata,
  OperationError,
  diagnosticBudget,
} from "./contracts.js";
export function createResult(mode = "check", explicit = false) {
  return {
    schemaVersion: 1,
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
/** Run full or explicit read-only checking, inspection, or guarded formatting. */
export async function runQuality(options = {}) {
  const mode = options.mode ?? "check";
  const result = createResult(mode, options.files !== undefined);
  let analyzer;
  try {
    if (!["check", "format", "inspect"].includes(mode))
      fail("INVALID_OPERATION", "Unknown operation.");
    const context = loadConfiguration(options);
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
    analyzer = createDocumentAnalyzer(context, tool);
    const candidates = [];
    let total = 0,
      outputTotal = 0,
      diagnosticBytes = 0;
    for (const file of result.selection.files) {
      const item = readDocument(context.root, file);
      if (mode === "format" && item.stat.nlink !== 1n)
        fail("HARD_LINK", "Hard-linked documents cannot be formatted.");
      total += item.bytes.length;
      if (total > limits.totalBytes)
        fail("BATCH_LIMIT", "Total document bytes exceed the limit.");
      const original = decode(item.bytes);
      const formatted = await analyzer.analyze({ text: original, file, mode });
      const outputBytes = Buffer.byteLength(formatted.output);
      if (outputBytes > limits.fileBytes)
        fail("DOCUMENT_LIMIT", "Formatted document exceeds the size limit.");
      outputTotal += outputBytes;
      if (outputTotal > limits.totalBytes)
        fail("BATCH_LIMIT", "Total formatted document bytes exceed the limit.");
      const diagnostics = formatted.diagnostics;
      if (mode === "check" && !item.bytes.equals(Buffer.from(formatted.output)))
        diagnostics.push({
          source: "formatter",
          rule: "layout",
          line: 1,
          column: 1,
          severity: "error",
          message: "Document requires formatting.",
        });
      diagnosticBudget(diagnostics);
      for (const d of diagnostics) {
        const diagnostic = { path: file, ...d };
        diagnosticBytes += Buffer.byteLength(JSON.stringify(diagnostic)) + 1;
        if (
          result.diagnostics.length >= limits.diagnostics ||
          diagnosticBytes > limits.diagnosticBytes
        )
          fail(
            "DIAGNOSTIC_LIMIT",
            "Diagnostic count or output bytes exceed the limit.",
          );
        result.diagnostics.push(diagnostic);
      }
      if (mode === "format")
        candidates.push({ file, item, output: formatted.output });
    }
    result.diagnostics.sort((a, b) =>
      a.path < b.path
        ? -1
        : a.path > b.path
          ? 1
          : a.line - b.line ||
            a.column - b.column ||
            a.rule.localeCompare(b.rule, "en"),
    );
    if (result.diagnostics.length) {
      result.outcome = "findings";
      result.exitCode = 1;
      return result;
    }
    if (mode === "format")
      for (const candidate of candidates) {
        if (candidate.item.bytes.equals(Buffer.from(candidate.output)))
          result.unchanged.push(candidate.file);
        else {
          replaceDocument(context.root, candidate.item, candidate.output);
          result.written.push(candidate.file);
        }
        result.unprocessed.shift();
      }
    else {
      result.unchanged = [...result.selection.files];
      result.unprocessed = [];
    }
    result.outcome = "clean";
    result.exitCode = 0;
  } catch (error) {
    result.errors.push({
      code: error instanceof OperationError ? error.code : "OPERATION_FAILED",
      message:
        error instanceof OperationError ? error.message : "Operation failed.",
    });
  } finally {
    if (analyzer) await analyzer.close();
  }
  return result;
}
