// SPDX-License-Identifier: AGPL-3.0-only
/** Canonical repository JSON entry; shared code owns parsing, CLI and result accounting. */
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  openJsonRepositorySession,
  runJsonQualityCli,
} from "../tooling/json/public-api.mjs";
import { provideRepositoryJson } from "./native-json-documents.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeProviders = { repositoryEvidence: provideRepositoryJson };

/** Fixed repository root; checking and source-write authority remain separate. */
export function openRepositoryJsonSession(options = {}) {
  return openJsonRepositorySession({ ...options, root, nativeProviders });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  process.exitCode = await runJsonQualityCli(process.argv.slice(2), () => ({
    root,
    nativeProviders: { repositoryEvidence: provideRepositoryJson },
  }));
