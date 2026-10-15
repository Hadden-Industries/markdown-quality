// SPDX-License-Identifier: AGPL-3.0-only
/** Re-present admitted historical reports while retaining their established full-result oracles. */
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { readDocument } from "../src/documents.js";
import { replaceDocument } from "../src/replacement.js";
import { digest } from "../src/contracts.js";
import { formatJsonSource } from "../tooling/json/public-api.mjs";
import { provideRepositoryJson } from "./native-json-documents.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const admitted = provideRepositoryJson({ root });
const changes = [];
for (const name of ["owlapi", "webvowl"]) {
  const path = `test/fixtures/performance-incumbents/${name}.json.gz`;
  const document = admitted.documents.find(
    (item) => item.path === `${path}!/${name}.json`,
  );
  if (!document) throw new Error("Required admitted incumbent is missing.");
  const original = readDocument(root, path);
  const source = admitted.inventory.find(
    (item) => item.path === document.path,
  ).source;
  if (
    digest(original.bytes) !== source.sha256 ||
    original.bytes.length !== source.byteLength
  )
    throw new Error("Incumbent changed after native admission.");
  const formatted = await formatJsonSource(document.bytes.toString("utf8"));
  changes.push({
    path,
    original,
    formatted: gzipSync(Buffer.from(formatted), { level: 9 }),
  });
}
// Finish presentation and admission of both reports before replacing either.
for (const change of changes) {
  const current = readDocument(root, change.path);
  if (
    current.stat.dev !== change.original.stat.dev ||
    current.stat.ino !== change.original.stat.ino ||
    current.stat.nlink !== 1n ||
    current.stat.mode !== change.original.stat.mode ||
    !current.bytes.equals(change.original.bytes)
  )
    throw new Error("Incumbent changed before its owning writer.");
}
const written = [];
try {
  for (const change of changes) {
    if (change.original.bytes.equals(change.formatted)) continue;
    // Reuse the product's identity-checked, mode-preserving atomic replacement.
    replaceDocument(root, change.original, change.formatted);
    written.push(change.path);
  }
  // The existing native owner rechecks the unchanged, independently established
  // semantic oracles; this operation creates no new performance observations.
  provideRepositoryJson({ root });
} catch (error) {
  console.error(
    "Incumbent presentation stopped; completed paths: " +
      JSON.stringify(written),
  );
  throw error;
}
console.log(
  "Presented both incumbent reports; original full-result oracle hashes are unchanged.",
);
