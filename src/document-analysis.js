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
  worker.on("message", (value) =>
    value.error
      ? settle(new OperationError(value.error.code, value.error.message))
      : settle(null, value),
  );
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
  return {
    analyze(data) {
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
          timer: setTimeout(() => {
            settle(
              new OperationError(
                "ANALYSIS_TIMEOUT",
                "Document analysis exceeded 30 seconds.",
              ),
            );
            void close();
          }, 30_000),
        };
        worker.postMessage(data);
      });
    },
    close,
  };
}
