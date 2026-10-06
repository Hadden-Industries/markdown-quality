// SPDX-License-Identifier: AGPL-3.0-only
import { parse } from "./analysis.js";
import { fail, limits } from "./contracts.js";

/** Reuse pure owned results for one document; never retain filesystem validity. */
export function createDocumentMemo() {
  const trees = new Map();
  const layouts = new Map();
  let retainedBytes = 0,
    disposed = false,
    layoutEntries = 0;
  const counts = { parses: 0, parseHits: 0, layouts: 0, layoutHits: 0 };
  function active() {
    if (disposed) fail("ANALYSIS_FAILURE", "Document analysis is unavailable.");
  }
  function reserve(bytes, entries) {
    if (entries >= 4 || retainedBytes + bytes > limits.fileBytes) return false;
    retainedBytes += bytes;
    return true;
  }
  return {
    parse(text) {
      active();
      if (trees.has(text)) {
        counts.parseHits++;
        return trees.get(text);
      }
      counts.parses++;
      const tree = parse(text);
      if (reserve(Buffer.byteLength(text), trees.size)) trees.set(text, tree);
      return tree;
    },
    async layout(text, options, compute) {
      active();
      const identity = layoutIdentity(options);
      const variants = layouts.get(text);
      if (identity !== null && variants?.has(identity)) {
        counts.layoutHits++;
        return variants.get(identity);
      }
      counts.layouts++;
      const result = await compute();
      // Retain only completed values: failed or pending work is never admission.
      if (
        identity !== null &&
        reserve(
          Buffer.byteLength(text) + Buffer.byteLength(result),
          layoutEntries,
        )
      ) {
        const entries = variants ?? new Map();
        entries.set(identity, result);
        layouts.set(text, entries);
        layoutEntries++;
      }
      return result;
    },
    get statistics() {
      return { ...counts, retainedBytes, disposed };
    },
    dispose() {
      trees.clear();
      layouts.clear();
      retainedBytes = 0;
      layoutEntries = 0;
      disposed = true;
    },
  };
}

// Capture every own option, including explicit undefined/null and plugin order.
// Opaque or executable plugin/options bypass reuse rather than assert purity.
function layoutIdentity(options) {
  if (
    options === null ||
    typeof options !== "object" ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(options))
  )
    return null;
  const keys = Reflect.ownKeys(options);
  if (keys.some((key) => typeof key !== "string")) return null;
  const identity = [];
  for (const key of keys.sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!Object.hasOwn(descriptor, "value")) return null;
    const value = descriptor.value;
    if (key === "plugins" && Array.isArray(value) && value.length === 0)
      identity.push([key, "empty-plugins"]);
    else if (value === null) identity.push([key, "null"]);
    else if (["string", "boolean", "undefined"].includes(typeof value))
      identity.push([key, typeof value, value]);
    else if (typeof value === "number" && Number.isFinite(value))
      identity.push([key, "number", Object.is(value, -0) ? "-0" : value]);
    else return null;
  }
  return JSON.stringify(identity);
}
