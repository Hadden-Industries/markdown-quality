// SPDX-License-Identifier: AGPL-3.0-only
import { writeSync } from "node:fs";
let sequence = 0;

/** This provisional profile is deliberately unavailable to hosted release gates. */
export function observationEnabled(environment = process.env) {
  const profile = environment.MARKDOWN_QUALITY_OBSERVATION;
  if (!profile) return false;
  if (
    profile !== "windows-ci" ||
    (environment.GITHUB_ACTIONS === "true" &&
      (environment.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
        environment.GITHUB_WORKFLOW !== "Observe Windows CI"))
  )
    throw new Error(
      "Windows observation requires its dedicated manual workflow.",
    );
  return true;
}

export function observationTimeout(
  kind,
  ordinaryMs,
  environment = process.env,
) {
  if (!observationEnabled(environment)) return ordinaryMs;
  if (kind === "npm-acquisition") return 300_000;
  if (kind === "node-suite") return 1_800_000;
  return ordinaryMs;
}

/** Emit process boundaries even when a synchronous command blocks the event loop. */
export function observeCommand(command, originalLimitMs, limitMs, facts = {}) {
  if (!observationEnabled()) return () => {};
  const id = `${process.pid}-${++sequence}`;
  const started = performance.now();
  const emit = (event, details) =>
    writeSync(
      2,
      JSON.stringify({
        observation: "windows-ci",
        id,
        command,
        event,
        utc: new Date().toISOString(),
        ...details,
      }) + "\n",
    );
  emit("start", { originalLimitMs, limitMs, ...facts });
  return (result, details = {}) => {
    const elapsedMs = Math.round(performance.now() - started);
    emit("end", {
      elapsedMs,
      originalLimitMs,
      limitMs,
      exceededOriginalLimit: elapsedMs > originalLimitMs,
      status: result.status,
      signal: result.signal,
      error: result.error?.code ?? null,
      ...details,
    });
  };
}
