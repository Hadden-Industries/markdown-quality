// SPDX-License-Identifier: AGPL-3.0-only
/** Re-present admitted historical reports while retaining their established full-result oracles. */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
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
  const original = readFileSync(new URL(`../${path}`, import.meta.url));
  const formatted = await formatJsonSource(document.bytes.toString("utf8"));
  changes.push({
    path,
    original,
    formatted: gzipSync(Buffer.from(formatted), { level: 9 }),
  });
}
// Finish presentation and admission of both reports before replacing either.
for (const change of changes)
  if (
    !readFileSync(new URL(`../${change.path}`, import.meta.url)).equals(
      change.original,
    )
  )
    throw new Error("Incumbent changed before its owning writer.");
for (const change of changes)
  writeFileSync(
    new URL(`../${change.path}`, import.meta.url),
    change.formatted,
  );
// The existing native owner rechecks the unchanged, independently established
// semantic oracles; this operation creates no new performance observations.
provideRepositoryJson({ root });
console.log(
  "Presented both incumbent reports; original full-result oracle hashes are unchanged.",
);
