// SPDX-License-Identifier: AGPL-3.0-only
import { Worker } from "node:worker_threads";
import { OperationError } from "./contracts.js";
import { defaultAnalyzerLimits } from "./analyzer-limits.js";
export function createDocumentAnalyzer(context, tool) {
  const budgets = context.config.analyzerLimits ?? defaultAnalyzerLimits;
  const worker = new Worker(new URL("./document-worker.js", import.meta.url), {
    workerData: { context, tool },
    // Omission removes the package request. An explicit negative old-generation
    // value is clamped by Node to a tiny finite heap, not treated as unlimited.
    resourceLimits: {
      ...(budgets.maxWorkerOldGenerationMiB === null
        ? {}
        : { maxOldGenerationSizeMb: budgets.maxWorkerOldGenerationMiB }),
      ...(budgets.workerStackMiB === null
        ? {}
        : { stackSizeMb: budgets.workerStackMiB }),
    },
    env: {},
  });
  let pending,
    closed = false,
    termination;
  function settle(error, value) {
    if (!pending) return;
    const request = pending;
    pending = undefined;
    clearTimeout(request.timer);
    if (error) request.reject(error);
    else request.resolve(value);
  }
  function close() {
    closed = true;
    settle(
      new OperationError("ANALYSIS_FAILURE", "Document analysis stopped."),
    );
    return (termination ??= worker.terminate());
  }
  function deadline(milliseconds) {
    clearTimeout(pending.timer);
    if (milliseconds === null) return;
    const end = performance.now() + milliseconds;
    function expire() {
      const remaining = end - performance.now();
      if (remaining > 0) {
        pending.timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
        return;
      }
      settle(
        new OperationError(
          "ANALYSIS_TIMEOUT",
          "Document analysis exceeded the selected time limit.",
        ),
      );
      void close();
    }
    pending.timer = setTimeout(expire, Math.min(milliseconds, 2_147_483_647));
  }
  worker.on("message", (value) => {
    if (value.progress) {
      if (!pending) return;
      if (
        !(
          budgets.documentAnalysisTimeoutMs === null &&
          value.remainingMs === null
        ) &&
        (!Number.isFinite(value.remainingMs) ||
          value.remainingMs <= 0 ||
          (budgets.documentAnalysisTimeoutMs !== null &&
            value.remainingMs > budgets.documentAnalysisTimeoutMs))
      ) {
        settle(
          new OperationError("ANALYSIS_FAILURE", "Invalid analysis deadline."),
        );
        void close();
      } else deadline(value.remainingMs);
      return;
    }
    value.error
      ? settle(new OperationError(value.error.code, value.error.message))
      : settle(null, value);
  });
  worker.on("error", () => {
    closed = true;
    settle(
      new OperationError(
        "ANALYSIS_FAILURE",
        "Document analysis failed or exceeded its memory limit.",
      ),
    );
  });
  worker.on("exit", () => {
    closed = true;
    settle(
      new OperationError(
        "ANALYSIS_FAILURE",
        "Document worker exited without a result.",
      ),
    );
  });
  function request(data, milliseconds = budgets.documentAnalysisTimeoutMs) {
    if (closed || pending)
      return Promise.reject(
        new OperationError(
          "ANALYSIS_FAILURE",
          "Document analysis is unavailable.",
        ),
      );
    return new Promise((resolve, reject) => {
      pending = {
        resolve,
        reject,
      };
      deadline(milliseconds);
      worker.postMessage(data);
    });
  }
  return {
    prepare(data, milliseconds = budgets.documentAnalysisTimeoutMs) {
      if (
        !(
          budgets.documentAnalysisTimeoutMs === null && milliseconds === null
        ) &&
        (!Number.isFinite(milliseconds) ||
          milliseconds <= 0 ||
          (budgets.documentAnalysisTimeoutMs !== null &&
            milliseconds > budgets.documentAnalysisTimeoutMs))
      )
        return Promise.reject(
          new OperationError(
            "ANALYSIS_TIMEOUT",
            "Document analysis exceeded the selected time limit.",
          ),
        );
      return request({ ...data, action: "prepare" }, milliseconds);
    },
    precheck(documents, staging) {
      return request({ documents, staging, action: "precheck" });
    },
    verify(documents, staging) {
      return request({ documents, staging, action: "verify" });
    },
    close,
  };
}
