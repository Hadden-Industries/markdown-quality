// SPDX-License-Identifier: AGPL-3.0-only
import { Worker } from "node:worker_threads";
import { OperationError } from "./contracts.js";
export function createDocumentAnalyzer(context, tool) {
  const worker = new Worker(new URL("./document-worker.js", import.meta.url), {
    workerData: { context, tool },
    resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
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
    pending.timer = setTimeout(() => {
      settle(
        new OperationError(
          "ANALYSIS_TIMEOUT",
          "Document analysis exceeded 30 seconds.",
        ),
      );
      void close();
    }, milliseconds);
  }
  worker.on("message", (value) => {
    if (value.progress) {
      if (!pending) return;
      if (
        !Number.isFinite(value.remainingMs) ||
        value.remainingMs <= 0 ||
        value.remainingMs > 30_000
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
  function request(data, milliseconds = 30_000) {
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
    prepare(data, milliseconds = 30_000) {
      if (
        !Number.isFinite(milliseconds) ||
        milliseconds <= 0 ||
        milliseconds > 30_000
      )
        return Promise.reject(
          new OperationError(
            "ANALYSIS_TIMEOUT",
            "Document analysis exceeded 30 seconds.",
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
