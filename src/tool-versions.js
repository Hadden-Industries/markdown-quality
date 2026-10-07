// SPDX-License-Identifier: AGPL-3.0-only
import * as prettier from "prettier";
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import { fail } from "./contracts.js";

/** Actual installed maintained components expose their own version metadata. */
export function installedToolVersions(snapper) {
  const versions = {
    prettier: prettier.version,
    eslint: ESLint.version,
    markdown: markdown.meta.version,
    snapper,
  };
  if (
    Object.values(versions).some(
      (version) => typeof version !== "string" || !version,
    )
  )
    fail("TOOL_METADATA", "Installed tool version metadata is incomplete.");
  return versions;
}
