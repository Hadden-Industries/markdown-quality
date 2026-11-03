// SPDX-License-Identifier: AGPL-3.0-only
/** Hard operational boundaries: never enumerated, selected, read as link targets or
 * staged as candidate data. They are not ordinary exclusions, so `exclude: []`
 * cannot erase them. Tracked members remain visible as operational omissions.
 */
export const operationalDirectories = Object.freeze(
  new Set([".git", "node_modules", ".venv", "venv", ".hi"]),
);

/** Package-owned trusted staging inputs inside a qualification staging root. */
export const trustedStagingDirectory = ".markdown-quality-trusted-inputs";

/** Directory names pruned by discovery and refused for document reads. */
export const discoveryBoundaries = Object.freeze(
  new Set([...operationalDirectories, trustedStagingDirectory]),
);

/** The first boundary component of a canonical relative path, or undefined. */
export function operationalBoundary(path) {
  const parts = path.split("/");
  const index = parts.findIndex((part) => discoveryBoundaries.has(part));
  return index < 0 ? undefined : parts.slice(0, index + 1).join("/") + "/";
}
