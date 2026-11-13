// SPDX-License-Identifier: AGPL-3.0-only
/** Packed-recipient diagnostics reuse production packing and byte admission without minting release proof. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateFrozenMatrix, nodeSupport } from "./node-matrix.js";
import { verifyPublicationArchiveBytes } from "./prepare-publication-environment.js";

/** The exact transported tuple must pass before any recipient installation. */
export function verifyInstalledDiagnosticArchives(manifest, directory) {
  validateFrozenMatrix(manifest.qualificationMatrix, manifest.runtimePolicy);
  assert.equal(manifest.source.clean, true);
  assert.deepEqual(
    manifest.archives.map((archive) => archive.name),
    ["win32-x64", "linux-x64", "core"],
  );
  verifyPublicationArchiveBytes(directory, manifest);
}

/** A diagnostic retains its actual outcome but can never satisfy release/PR evidence admission. */
export function installedDiagnosticReport(report) {
  assert.equal(typeof report.passed, "boolean");
  return {
    ...report,
    scope: "installed-only diagnostic",
    admission: "not-release-or-pr-qualification",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, path] = process.argv.slice(2);
  if (mode === "pack") {
    const matrix = validateFrozenMatrix(
      JSON.parse(process.env.FROZEN_MATRIX),
      nodeSupport,
    );
    const { packRelease } = await import("./pack.js");
    packRelease(path, matrix);
  } else if (mode === "verify") {
    verifyInstalledDiagnosticArchives(
      JSON.parse(readFileSync(join(path, "release-manifest.json"))),
      path,
    );
  } else {
    assert.equal(mode, "report");
    const report = installedDiagnosticReport(JSON.parse(readFileSync(path)));
    writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
  }
}
