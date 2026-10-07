// SPDX-License-Identifier: AGPL-3.0-only
import { parentPort, workerData } from "node:worker_threads";
import { prepareFormattedDocument } from "./formatting.js";
import { createLinter, lintDocument, checkLinks } from "./analysis.js";
import { diagnosticBudget, OperationError } from "./contracts.js";
import { checkTrailingWhitespace } from "./whitespace.js";
import { checkAdvisories } from "./advisory-diagnostics.js";
import { createDocumentMemo } from "./document-memo.js";
import { checkProseGroup } from "./prose-diagnostics.js";
import {
  runNativeChecks,
  bindNativeCheck,
  matchesNativeCheck,
  nativeFileCheckEligible,
} from "./native-checks.js";
const { context, tool } = workerData;
const linter = createLinter(context);
function reported(error) {
  return {
    code: error instanceof OperationError ? error.code : "ANALYSIS_FAILURE",
    message:
      error instanceof OperationError
        ? error.message
        : "Document analysis failed.",
  };
}
function budgetObserver(elapsed) {
  return {
    start(indices) {
      const remainingMs =
        context.config.limits.analysisMs === null
          ? null
          : Math.min(
              ...indices.map(
                (index) => context.config.limits.analysisMs - elapsed[index],
              ),
            );
      if (remainingMs !== null && remainingMs <= 0)
        throw new OperationError(
          "ANALYSIS_TIMEOUT",
          "Document analysis exceeded the selected time limit.",
        );
      parentPort.postMessage({ progress: true, remainingMs });
    },
    finish(indices, milliseconds) {
      for (const index of indices) elapsed[index] += milliseconds;
      this.start(indices);
    },
  };
}
parentPort.on(
  "message",
  async ({ text, file, mode, action, documents, staging, precheck }) => {
    let memo;
    try {
      if (action === "precheck") {
        const elapsedMs = documents.map(() => 0),
          observer = budgetObserver(elapsedMs);
        const started = performance.now();
        let nativeMs = 0;
        const eligible = documents
          .map((text, index) => ({ text, index }))
          .filter(({ text }) =>
            nativeFileCheckEligible(text, staging, context.config.limits),
          );
        const reports = runNativeChecks(
          tool,
          eligible.map(({ text }) => text),
          staging,
          {
            start: (indices) =>
              observer.start(indices.map((index) => eligible[index].index)),
            finish: (indices, milliseconds) => {
              nativeMs += milliseconds;
              observer.finish(
                indices.map((index) => eligible[index].index),
                milliseconds,
              );
            },
          },
          context.config.limits,
        );
        const workerMs = performance.now() - started;
        observer.finish(
          documents.map((_, index) => index),
          Math.max(0, workerMs - nativeMs),
        );
        const checks = new Array(documents.length);
        for (const [index, report] of reports.entries())
          checks[eligible[index].index] = bindNativeCheck(
            tool,
            eligible[index].text,
            report,
          );
        parentPort.postMessage({
          checks,
          elapsedMs,
          workerMs,
        });
        return;
      }
      if (action === "verify") {
        const elapsed = documents.map((document) => document.elapsedMs);
        if (
          elapsed.some(
            (milliseconds) =>
              !Number.isFinite(milliseconds) || milliseconds < 0,
          )
        )
          throw new OperationError(
            "ANALYSIS_FAILURE",
            "Invalid analysis deadline.",
          );
        const observer = budgetObserver(elapsed);
        const diagnostics = checkProseGroup(
          tool,
          documents.map((document) => document.output),
          staging,
          observer,
          documents.map((document) =>
            matchesNativeCheck(tool, document.output, document.precheck)
              ? document.precheck.report
              : undefined,
          ),
          context.config.syntax,
          context.config.limits,
        );
        parentPort.postMessage({ diagnostics });
        return;
      }
      memo = createDocumentMemo(context.config.syntax);
      const formatted = await prepareFormattedDocument(
        text,
        context,
        tool,
        memo,
        precheck,
      );
      const proposed = mode === "format" ? formatted.output : text;
      const canonical = mode === "format" || formatted.output === text;
      try {
        const whitespace = checkTrailingWhitespace(
          proposed,
          memo,
          context.config.limits,
        );
        const diagnostics = [
          ...whitespace,
          ...(canonical
            ? await lintDocument(linter, proposed, file, context.config)
            : []),
          ...checkLinks(context, proposed, file, memo),
          ...checkAdvisories(proposed, context.config, memo),
        ];
        diagnosticBudget(diagnostics, context.config.limits);
        parentPort.postMessage({
          output: formatted.output,
          diagnostics,
          whitespaceCount: whitespace.length,
          prechecked: formatted.prechecked,
        });
      } catch (error) {
        // Preserve prose-before-lint failure order; no provisional result is admitted.
        parentPort.postMessage({
          output: formatted.output,
          deferredError: reported(error),
          prechecked: formatted.prechecked,
        });
      }
    } catch (error) {
      parentPort.postMessage({ error: reported(error) });
    } finally {
      memo?.dispose();
    }
  },
);
