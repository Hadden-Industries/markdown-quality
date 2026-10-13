// SPDX-License-Identifier: AGPL-3.0-only
/** Preserve supplied metadata decoding; callers own paths and classification. */
export function declaredTargets(metadata) {
  const exports = metadata.exports ?? {};
  if (typeof exports !== "object" || Array.isArray(exports))
    throw new Error("Unsupported export shape");
  const bins =
    typeof metadata.bin === "string"
      ? [metadata.bin]
      : Object.values(metadata.bin ?? {});
  const targets = [...bins, ...Object.values(exports)];
  for (const target of targets)
    if (typeof target !== "string" || target.includes("*"))
      throw new Error("Unsupported entrypoint shape");
  return targets;
}
