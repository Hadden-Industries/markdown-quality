// SPDX-License-Identifier: AGPL-3.0-only
/** Canonical repository JSON entry; shared code owns parsing, CLI and result accounting. */
import { fileURLToPath } from "node:url";
import { runJsonQualityCli } from "../tooling/json/public-api.mjs";
import { provideRepositoryJson } from "./native-json-documents.mjs";

process.exitCode = await runJsonQualityCli(process.argv.slice(2), {
  root: fileURLToPath(new URL("../", import.meta.url)),
  nativeProviders: { repositoryEvidence: provideRepositoryJson },
});
