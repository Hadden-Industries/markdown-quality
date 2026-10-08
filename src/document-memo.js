// SPDX-License-Identifier: AGPL-3.0-only
import { parse } from "./analysis.js";
import { fail, limits } from "./contracts.js";

// Independent stage budgets avoid starving layout reuse behind a retained AST.
// These account for source/result bytes, not total JavaScript heap allocation.
export const documentMemoLimits = Object.freeze({
  parseBytes: limits.fileBytes * 2,
  layoutBytes: limits.fileBytes * 2,
  entriesPerStage: 4,
});

/** Reuse pure owned results for one document; never retain filesystem validity. */
export function createDocumentMemo(syntax = { frontmatter: "yaml" }) {
  const trees = new Map();
  const layouts = new Map();
  const stages = {
    parse: { order: new Map(), bytes: 0, limit: documentMemoLimits.parseBytes },
    layout: {
      order: new Map(),
      bytes: 0,
      limit: documentMemoLimits.layoutBytes,
    },
  };
  let disposed = false;
  const counts = { parses: 0, parseHits: 0, layouts: 0, layoutHits: 0 };
  function active() {
    if (disposed) fail("ANALYSIS_FAILURE", "Document analysis is unavailable.");
  }
  function touch(stage, entry) {
    stage.order.delete(entry);
    stage.order.set(entry, true);
    return entry.value;
  }
  function admit(stage, bytes, value, remove) {
    if (bytes > stage.limit) return null;
    while (
      stage.order.size >= documentMemoLimits.entriesPerStage ||
      stage.bytes + bytes > stage.limit
    ) {
      const oldest = stage.order.keys().next().value;
      stage.order.delete(oldest);
      stage.bytes -= oldest.bytes;
      oldest.remove();
    }
    const entry = { bytes, value, remove };
    stage.bytes += bytes;
    stage.order.set(entry, true);
    return entry;
  }
  return {
    parse(text, retain = true) {
      active();
      if (trees.has(text)) {
        counts.parseHits++;
        return touch(stages.parse, trees.get(text));
      }
      counts.parses++;
      const tree = parse(text, syntax);
      if (retain) {
        const entry = admit(stages.parse, Buffer.byteLength(text), tree, () =>
          trees.delete(text),
        );
        if (entry) trees.set(text, entry);
      }
      return tree;
    },
    async layout(text, options, compute) {
      active();
      const identity = layoutIdentity(options);
      const variants = layouts.get(text);
      if (identity !== null && variants?.has(identity)) {
        counts.layoutHits++;
        return touch(stages.layout, variants.get(identity));
      }
      counts.layouts++;
      const result = await compute();
      // Retain only completed values: failed or pending work is never admission.
      if (identity !== null && !disposed && !layouts.get(text)?.has(identity)) {
        const entry = admit(
          stages.layout,
          Buffer.byteLength(text) + Buffer.byteLength(result),
          result,
          () => {
            const entries = layouts.get(text);
            entries?.delete(identity);
            if (entries?.size === 0) layouts.delete(text);
          },
        );
        if (entry) {
          const entries = layouts.get(text) ?? new Map();
          entries.set(identity, entry);
          layouts.set(text, entries);
        }
      }
      return result;
    },
    get statistics() {
      return {
        ...counts,
        retainedBytes: stages.parse.bytes + stages.layout.bytes,
        parseBytes: stages.parse.bytes,
        layoutBytes: stages.layout.bytes,
        disposed,
      };
    },
    dispose() {
      trees.clear();
      layouts.clear();
      for (const stage of Object.values(stages)) {
        stage.order.clear();
        stage.bytes = 0;
      }
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
