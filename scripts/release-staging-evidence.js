// SPDX-License-Identifier: AGPL-3.0-only
/** Bind an unchanged request journal to the independently verified public tuple. */
import assert from "node:assert/strict";
import { hash } from "./release-bytes.js";

export function bindStagingReconciliation(journal, archive, origin, qualified) {
  const records = journal
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(
    records.length === 1 || records.length === 2,
    "Invalid staging journal length",
  );
  assert.equal(records[0].state, "attempted");
  if (records.length === 2)
    assert.ok(
      ["outcome-unknown", "staged-awaiting-owner"].includes(records[1].state),
    );
  for (const record of records) {
    for (const key of ["package", "version", "sha256", "integrity"])
      assert.equal(
        record[key],
        archive[key],
        `Staging journal ${key} mismatch`,
      );
    assert.equal(record.tag, "pilot");
    for (const key of ["source", "run", "attempt"])
      assert.equal(String(record.origin[key]), String(origin[key]));
    if (record.state === "staged-awaiting-owner")
      assert.ok(
        typeof record.stageId === "string" && record.stageId.length > 0,
      );
  }
  // Callers first verify the complete public reports and their successful native
  // provider jobs. This binding retains that proof without rewriting lost-response
  // history or implementing another signature verifier.
  const reports = Object.fromEntries(
    Object.entries(qualified.reports)
      .filter(([, report]) => report.qualification === "public registry")
      .map(([name, report]) => [name, report.sha256]),
  );
  assert.ok(
    Object.keys(reports).length > 0,
    "Public reconciliation evidence is required",
  );
  return {
    schemaVersion: 1,
    package: archive.package,
    version: archive.version,
    sha256: archive.sha256,
    integrity: archive.integrity,
    origin: {
      source: origin.source,
      run: String(origin.run),
      attempt: String(origin.attempt),
    },
    journalSha256: hash(journal),
    requestState: records.at(-1).state,
    publicQualification: qualified.publication,
    reports,
  };
}
