// SPDX-License-Identifier: AGPL-3.0-only
/** Inventory every conditional export branch, not only this host's resolution. */
function exportTargets(value) {
  if (value === null) return [];
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || Array.isArray(value))
    throw new Error("Unsupported entrypoint shape");
  return Object.values(value).flatMap(exportTargets);
}

/** Collect concrete bin/export targets; callers own paths and classification. */
export function declaredTargets(metadata) {
  const exports = metadata.exports ?? {};
  if (typeof exports !== "object" || Array.isArray(exports))
    throw new Error("Unsupported export shape");
  const bins =
    typeof metadata.bin === "string"
      ? [metadata.bin]
      : Object.values(metadata.bin ?? {});
  const targets = [...bins, ...exportTargets(exports)];
  for (const target of targets)
    if (typeof target !== "string" || target.includes("*"))
      throw new Error("Unsupported entrypoint shape");
  return targets;
}
