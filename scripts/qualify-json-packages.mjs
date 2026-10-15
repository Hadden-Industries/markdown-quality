// SPDX-License-Identifier: AGPL-3.0-only
/** Qualify JSON from the actual staged/packed tuple before transporting archives. */
import { fileURLToPath } from "node:url";
import { packRelease } from "./pack.js";
import { runJsonQualityCli } from "../tooling/json/public-api.mjs";
import { provideRepositoryJson } from "./native-json-documents.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const matrix = process.env.NODE_QUALIFICATION_MATRIX
  ? JSON.parse(process.env.NODE_QUALIFICATION_MATRIX)
  : undefined;
packRelease(
  fileURLToPath(new URL("../dist/json-qualification/", import.meta.url)),
  matrix,
);
process.exitCode = await runJsonQualityCli(["check"], {
  root,
  requiredOutputs: [
    "dist/json-qualification/release-manifest.json",
    "dist/json-qualification/source-sbom.cdx.json",
  ],
  nativeProviders: { repositoryEvidence: provideRepositoryJson },
});
