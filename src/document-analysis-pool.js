// SPDX-License-Identifier: AGPL-3.0-only
import { OperationError } from "./contracts.js";

/** Reuse analysis workers, preserving document order and one native batch coordinator. */
export function createDocumentAnalyzerPool(createAnalyzer, concurrency) {
  const analyzers = [];
  let closed = false,
    preparing = false,
    termination;
  const stopped = () =>
    new OperationError("ANALYSIS_FAILURE", "Document analysis is unavailable.");
  function analyzerAt(index) {
    if (closed) throw stopped();
    while (analyzers.length <= index) analyzers.push(createAnalyzer());
    return analyzers[index];
  }
  async function coordinated(method, args) {
    if (closed || preparing) throw stopped();
    return analyzerAt(0)[method](...args);
  }
  async function prepareGroup(jobs) {
    if (closed || preparing) throw stopped();
    preparing = true;
    let next = 0,
      stopAt = jobs.length;
    const results = new Array(jobs.length);
    try {
      // The requested count is never capped; create only workers with available work.
      const lanes = [];
      for (let index = 0; index < Math.min(concurrency, jobs.length); index++)
        lanes.push(analyzerAt(index));
      await Promise.all(
        lanes.map(async (analyzer) => {
          while (!closed && next < stopAt) {
            const index = next++,
              { data, milliseconds } = jobs[index],
              started = performance.now();
            try {
              const formatted = await analyzer.prepare(data, milliseconds);
              results[index] = {
                formatted,
                elapsedMs: performance.now() - started,
              };
              if (formatted.deferredError) stopAt = Math.min(stopAt, index + 1);
            } catch (error) {
              results[index] = { error };
              stopAt = Math.min(stopAt, index);
            }
          }
        }),
      );
      if (closed) throw stopped();
      return results;
    } finally {
      preparing = false;
    }
  }
  function close() {
    closed = true;
    return (termination ??= Promise.allSettled(
      analyzers.map(async (analyzer) => analyzer.close()),
    ).then((results) => {
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected) throw rejected.reason;
    }));
  }
  return {
    prepare: (...args) => coordinated("prepare", args),
    precheck: (...args) => coordinated("precheck", args),
    verify: (...args) => coordinated("verify", args),
    prepareGroup,
    close,
  };
}
