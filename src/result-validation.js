// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { fail, metadata } from "./contracts.js";

const schema = JSON.parse(
  readFileSync(
    new URL("../schemas/result.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
const samePaths = (a, b) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** Validate the actual shipped schema and semantic admission, optionally binding a transport request. */
export function validateQualityResult(report, expected = {}) {
  if (!validate(report))
    fail(
      "INVALID_RESULT",
      "Quality result does not match the installed schema.",
    );
  if (
    report.package.name !== metadata.name ||
    report.package.version !== metadata.version
  )
    fail(
      "RESULT_IDENTITY",
      "Quality result package identity differs from the installed package.",
    );
  for (const [key, actual] of Object.entries({
    operation: report.operation,
    exitCode: report.exitCode,
    configDigest: report.configDigest,
    selectionMode: report.selection.mode,
    requestId: report.document?.requestId ?? null,
  }))
    if (Object.hasOwn(expected, key) && expected[key] !== actual)
      fail(
        "RESULT_IDENTITY",
        "Quality result does not match the requested " + key + ".",
      );
  const blockers = report.diagnostics.some(
    (d) =>
      d.severity === "error" || (report.strict && d.severity === "warning"),
  );
  if (
    new Set(report.selection.files).size !== report.selection.files.length ||
    new Set(report.selection.inventory.map((d) => d.path)).size !==
      report.selection.inventory.length
  )
    fail("INVALID_RESULT", "Selection contains duplicate identities.");
  if (
    report.diagnostics.some(
      (finding) => !report.selection.files.includes(finding.path),
    )
  )
    fail("INVALID_RESULT", "Diagnostic does not belong to the selected scope.");
  const processed = [
    ...report.written,
    ...report.unchanged,
    ...report.unprocessed,
  ];
  if (
    new Set(processed).size !== processed.length ||
    processed.some((path) => !report.selection.files.includes(path))
  )
    fail(
      "INVALID_RESULT",
      "Processing contains duplicate or unselected identities.",
    );
  if (
    report.selection.exclusions.some((item) =>
      report.selection.files.includes(item.path),
    )
  )
    fail("INVALID_RESULT", "A selected path is also reported excluded.");
  if (report.operation !== "format" && report.written.length)
    fail("INVALID_RESULT", "Read-only operation reported document writes.");
  if (report.document && report.written.length)
    fail(
      "INVALID_RESULT",
      "Logical-document operation wrote repository files.",
    );
  if (report.exitCode === 2) {
    if (report.outcome !== "error" || !report.errors.length)
      fail("INVALID_RESULT", "Operational failure lacks failure evidence.");
    return report;
  }
  if (
    report.errors.length ||
    report.outcome !== (report.diagnostics.length ? "findings" : "clean") ||
    report.exitCode !== (blockers ? 1 : 0)
  )
    fail("INVALID_RESULT", "Outcome, severity and exit code disagree.");
  if (
    report.exitCode === 0 &&
    (report.unprocessed.length ||
      !samePaths(
        [...report.written, ...report.unchanged],
        report.selection.files,
      ))
  )
    fail(
      "INVALID_RESULT",
      "Successful result does not account for complete processing.",
    );
  if (
    report.exitCode === 1 &&
    (report.written.length ||
      report.unchanged.length ||
      !samePaths(report.unprocessed, report.selection.files))
  )
    fail("INVALID_RESULT", "Blocked result does not preserve batch admission.");
  for (const decision of report.selection.inventory)
    if (
      (decision.decision === "selected") !==
      report.selection.files.includes(decision.path)
    )
      fail(
        "INVALID_RESULT",
        "Tracked path decision differs from actual selection.",
      );
  return report;
}
