// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
export const hash = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
/** Release-local bounded acquisition. Runtime identity-aware readers stay separate. */
export function releaseBytes(path, maximum, message) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.size <= maximum,
    message,
  );
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= maximum);
  return bytes;
}
export function archiveDigests(bytes) {
  return {
    sha256: hash(bytes),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}

export function verifyArchiveDigests(observed, archive) {
  assert.equal(observed.sha256, archive.sha256);
  assert.equal(observed.integrity, archive.integrity);
}

export function verifyArchiveBytes(bytes, archive) {
  verifyArchiveDigests(archiveDigests(bytes), archive);
}
