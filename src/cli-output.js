// SPDX-License-Identifier: AGPL-3.0-only
import { terminalText } from "./contracts.js";
export { writeOutput } from "./cli-streams.js";

export function renderSummary(
  result,
  { diagnosticLevel = "info", quiet = false } = {},
) {
  const lines = [],
    hidden = { info: 0, warning: 0 };
  for (const d of result.diagnostics) {
    if (
      (d.severity === "info" && diagnosticLevel !== "info") ||
      (d.severity === "warning" && diagnosticLevel === "error")
    ) {
      hidden[d.severity]++;
      continue;
    }
    lines.push(
      `${terminalText(d.path)}:${d.line}:${d.column}: ${d.severity}: ${d.rule.startsWith(d.source + "/") ? d.rule : d.source + "/" + d.rule}: ${terminalText(d.message)}`,
    );
  }
  for (const r of result.refusals)
    lines.push(
      `${r.path === null ? "" : terminalText(r.path) + ": "}${r.code}: ${terminalText(r.message)}`,
    );
  for (const e of result.errors)
    lines.push(`${e.code}: ${terminalText(e.message)}`);
  if (!quiet || result.exitCode !== 0) {
    lines.push(
      `${result.operation} ${result.operationStatus}; quality ${result.qualityStatus}${result.qualityBasis ? ` (${result.qualityBasis})` : ""}; ${result.document ? "supplied logical input" : result.selection.mode + " physical selection"}; ${result.selection.files.length} documents; ${result.selection.omissions.length} omitted; ${result.selection.readDependencies.length} dependencies read; ${result.writtenPaths.length} written.`,
    );
    if (result.dryRun)
      for (const record of result.documentResults)
        if (record.candidate)
          lines.push(
            `${terminalText(record.path)}: ${record.candidate.changed ? "changed" : "unchanged"}; ${record.candidate.inputBytes} -> ${record.candidate.outputBytes} bytes (preview).`,
          );
  }
  for (const omitted of result.selection.omissions)
    lines.push(
      `${terminalText(omitted.path)}: omitted (${omitted.reason}); not checked or repaired.`,
    );
  if (result.backlinkCoverage !== null)
    lines.push(
      `External backlinks: ${result.backlinkCoverage.externalReferences}; ${result.backlinkCoverage.inventoriedDocuments} local documents inventoried. No complete backlink coverage is claimed.`,
    );
  if (
    ["format", "normalize"].includes(result.operation) &&
    result.exitCode === 0 &&
    result.qualityStatus === "findings"
  )
    lines.push(
      `The requested ${result.operation} repair completed, but reported findings remain; run check for the complete policy verdict.`,
    );
  for (const [severity, count] of Object.entries(hidden))
    if (count)
      lines.push(
        `${count} ${severity === "info" ? "information" : "warning"} diagnostic${count === 1 ? "" : "s"} hidden.`,
      );
  if (result.strict && result.exitCode === 1 && hidden.warning)
    lines.push(
      `Strict mode blocked on ${hidden.warning} hidden warning diagnostic${hidden.warning === 1 ? "" : "s"}.`,
    );
  if (result.exitCode === 2 && result.writtenPaths.length)
    lines.push(
      `Partial repair: ${result.writtenPaths.length} confirmed writes remain applied; inspect pending files before retrying.`,
    );
  if (result.operation === "inspect" && !quiet)
    lines.push(JSON.stringify(result));
  return lines.length ? lines.join("\n") + "\n" : "";
}
