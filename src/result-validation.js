// SPDX-License-Identifier: AGPL-3.0-only
import { isDeepStrictEqual } from "node:util";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { fail, metadata, digest } from "./contracts.js";

const schema = JSON.parse(
  readFileSync(
    new URL("../schemas/result.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
const invalid = (message) => fail("INVALID_RESULT", message);

/** Repairs may leave only their declared residual condition unblocked: format the
 * ordinary NFC finding, normalize the presentation drift that format repairs.
 */
function blocking(report, diagnostic) {
  if (
    report.operation === "format" &&
    diagnostic.source === "quality" &&
    diagnostic.rule === "quality/non-nfc-prose"
  )
    return false;
  if (
    report.operation === "normalize" &&
    ["formatter", "snapper"].includes(diagnostic.source)
  )
    return false;
  return (
    diagnostic.severity === "error" ||
    (report.strict && diagnostic.severity === "warning")
  );
}

/** Validate the shipped schema and semantic admission, optionally binding a request.
 * Returns the original validated report; validation is not a snapshot or attestation.
 */
export function validateQualityResult(report, expected = {}) {
  if (!validate(report))
    invalid("Quality result does not match the installed schema.");
  if (
    report.package.name !== metadata.name ||
    report.package.version !== metadata.version
  )
    fail(
      "RESULT_IDENTITY",
      "Quality result package identity differs from the installed package.",
    );
  // A request that failed before admission has no document to bind; its caller
  // needs the real error. Every other report must prove its request identity.
  const unadmitted =
    report.document === null && report.operationStatus === "failed";
  for (const [key, actual] of Object.entries({
    operation: report.operation,
    exitCode: report.exitCode,
    configurationBytesSha256: report.configurationBytesSha256,
    effectiveConfigurationSha256: report.effectiveConfigurationSha256,
    selectionMode: report.selection.mode,
    documentPath: report.document?.path ?? null,
    ...(unadmitted ? {} : { requestId: report.document?.requestId ?? null }),
    dryRun: report.dryRun,
    updateLinks: report.updateLinks,
  }))
    if (Object.hasOwn(expected, key) && expected[key] !== actual)
      fail(
        "RESULT_IDENTITY",
        "Quality result does not match the requested " + key + ".",
      );
  const { selection, documentResults } = report;
  const repair = ["format", "normalize"].includes(report.operation);
  if (
    (!repair && report.dryRun) ||
    (report.operation !== "normalize" && report.updateLinks)
  )
    invalid("Repair controls do not belong to this operation.");
  if (report.document !== null) {
    const selected = report.document.decision === "selected";
    if (
      selection.mode !== "explicit" ||
      selection.reconciliationDecisions.length ||
      !isDeepStrictEqual(
        selection.files,
        selected ? [report.document.path] : [],
      ) ||
      (!selected &&
        !selection.omissions.some(
          (item) =>
            item.path === report.document.path &&
            item.reason === report.document.decision,
        )) ||
      report.writtenPaths.length
    )
      invalid("Logical identity and selection disagree.");
  }
  for (const record of documentResults) {
    const candidate = record.candidate;
    if (candidate === null) {
      if (repair && ["completed", "previewed"].includes(report.operationStatus))
        invalid("Completed repair lacks a verified candidate.");
      continue;
    }
    if (
      !repair ||
      record.analysisStatus !== "completed" ||
      candidate.changed !==
        (candidate.inputSha256 !== candidate.outputSha256) ||
      (!candidate.changed && candidate.inputBytes !== candidate.outputBytes) ||
      (record.writeStatus === "written" && !candidate.changed) ||
      (record.writeStatus === "unchanged" && candidate.changed)
    )
      invalid("Candidate identity contradicts analysis or write effects.");
    if (
      report.document &&
      ["completed", "previewed", "refused"].includes(report.operationStatus)
    ) {
      const bytes = Buffer.from(report.document.contentBase64, "base64");
      const side =
        report.dryRun || report.operationStatus === "refused"
          ? "input"
          : "output";
      if (
        candidate[side + "Sha256"] !== digest(bytes) ||
        candidate[side + "Bytes"] !== bytes.length
      )
        invalid("Logical content disagrees with its candidate identity.");
    }
  }
  if (
    new Set(selection.files).size !== selection.files.length ||
    new Set(selection.reconciliationDecisions.map((d) => d.path)).size !==
      selection.reconciliationDecisions.length
  )
    invalid("Selection contains duplicate identities.");
  if (report.diagnostics.some((d) => !selection.files.includes(d.path)))
    invalid("Diagnostic does not belong to the selected scope.");
  if (selection.omissions.some((item) => selection.files.includes(item.path)))
    invalid("A selected path is also reported omitted.");
  for (const decision of selection.reconciliationDecisions)
    if (
      (decision.decision === "selected") !==
      selection.files.includes(decision.path)
    )
      invalid("Tracked path decision differs from actual selection.");
  if (
    report.operationStatus !== "failed" &&
    !isDeepStrictEqual(
      documentResults.map((record) => record.path),
      selection.files,
    )
  )
    invalid("Document results must describe every selected path in order.");
  if (
    new Set(documentResults.map((record) => record.path)).size !==
      documentResults.length ||
    documentResults.some((record) => !selection.files.includes(record.path))
  )
    invalid("Document results contain duplicate or unselected identities.");
  // writtenPaths is a projection of confirmed writes, never a second source of truth.
  if (
    !isDeepStrictEqual(
      report.writtenPaths,
      documentResults
        .filter((record) => record.writeStatus === "written")
        .map((record) => record.path),
    )
  )
    invalid("Written paths disagree with confirmed document writes.");
  const physical =
    ["format", "normalize"].includes(report.operation) &&
    !report.document &&
    !report.dryRun;
  if (
    !physical &&
    documentResults.some((record) => record.writeStatus !== "not-requested")
  )
    invalid(
      "A read-only, preview or logical operation reported write effects.",
    );
  if (report.exitCode === 2) {
    if (
      report.operationStatus !== "failed" ||
      !report.errors.length ||
      !["incomplete", "not-checked"].includes(report.qualityStatus) ||
      report.qualityBasis !== null
    )
      invalid("Operational failure lacks consistent failure evidence.");
    if (
      physical &&
      documentResults.some((record) => record.writeStatus === "not-requested")
    )
      invalid("A failed physical repair has unaccounted write state.");
    return report;
  }
  if (report.errors.length || report.operationStatus === "failed")
    invalid("Completed result carries operational failure evidence.");
  if (report.operation === "inspect") {
    if (
      report.operationStatus !== "completed" ||
      report.qualityStatus !== "not-checked" ||
      report.qualityBasis !== null ||
      report.exitCode !== 0 ||
      report.diagnostics.length ||
      documentResults.some(
        (record) => record.analysisStatus !== "not-requested",
      )
    )
      invalid("Inspection cannot claim a content verdict.");
    return report;
  }
  if (report.operation === "unknown")
    invalid("An unknown operation cannot complete.");
  const normalize = report.operation === "normalize";
  if (
    !normalize &&
    (report.refusals.length ||
      report.proposedChanges.length ||
      report.anchorChanges.length)
  )
    invalid("Only normalization reports refusals, proposed edits or anchors.");
  if ((report.backlinkCoverage !== null) !== report.anchorChanges.length > 0)
    invalid("Backlink coverage must accompany exactly the anchor changes.");
  if (
    report.proposedChanges.some(
      (change) =>
        !selection.files.includes(change.path) ||
        change.sourceByteEndExclusive - change.sourceByteStart !==
          change.beforeByteLength,
    )
  )
    invalid("A proposed edit has an inconsistent span or path.");
  // An early known policy refusal precedes content analysis.
  if (report.qualityStatus === "not-checked") {
    if (
      !normalize ||
      report.operationStatus !== "refused" ||
      report.exitCode !== 1 ||
      !report.refusals.length ||
      report.diagnostics.length ||
      report.qualityBasis !== null ||
      documentResults.some(
        (record) => record.analysisStatus !== "not-requested",
      ) ||
      (physical &&
        documentResults.some((record) => record.writeStatus !== "refused"))
    )
      invalid("An unanalyzed result must be a complete early policy refusal.");
    return report;
  }
  if (
    report.qualityStatus !== (report.diagnostics.length ? "findings" : "clean")
  )
    invalid("Quality status disagrees with the complete diagnostics.");
  if (documentResults.some((record) => record.analysisStatus !== "completed"))
    invalid("A completed verdict requires completed document analysis.");
  const blocked =
    report.refusals.length > 0 ||
    report.diagnostics.some((d) => blocking(report, d));
  if (report.exitCode !== (blocked ? 1 : 0))
    invalid("Exit code and blocking diagnostics disagree.");
  const basis =
    report.operation === "check"
      ? "input"
      : physical && report.exitCode === 0
        ? "applied"
        : "candidate";
  if (report.qualityBasis !== basis)
    invalid("Quality basis disagrees with the operation and its effects.");
  if (report.operation === "check") {
    if (report.operationStatus !== "completed")
      invalid("A complete check reports completed operation status.");
    return report;
  }
  const status = report.dryRun
    ? "previewed"
    : blocked
      ? "refused"
      : "completed";
  if (report.dryRun && blocked) {
    if (report.operationStatus !== "refused")
      invalid("A blocked preview reports refusal.");
  } else if (report.operationStatus !== status)
    invalid("Repair operation status disagrees with its blockers.");
  if (physical) {
    const allowed = blocked ? ["refused"] : ["unchanged", "written"];
    if (documentResults.some((record) => !allowed.includes(record.writeStatus)))
      invalid("Physical repair write states disagree with admission.");
  }
  return report;
}

/** Quality gates admit only a complete check of the intended input; a successful
 * repair, preview or inspection receipt is never substitute check evidence.
 */
export function admitCheckEvidence(report, expected = {}) {
  validateQualityResult(report, expected);
  if (
    report.operation !== "check" ||
    report.document !== null ||
    report.dryRun ||
    report.updateLinks ||
    report.operationStatus !== "completed" ||
    report.qualityBasis !== "input" ||
    report.exitCode === 2 ||
    report.writtenPaths.length
  )
    fail(
      "INVALID_RESULT",
      "Quality acceptance requires a complete read-only check result.",
    );
  if (
    Object.hasOwn(expected, "files") &&
    !isDeepStrictEqual(report.selection.files, expected.files)
  )
    invalid("Check evidence differs from the intended physical selection.");
  return report;
}
