// SPDX-License-Identifier: AGPL-3.0-only
// Invocation-owned graph of cross-document fragment references. A link from A to B
// is checked against B's proposed output when B is in the batch and against captured
// original content otherwise. Targets are read as dependencies only: they are never
// linted, formatted or recursively traversed, and graph cycles cannot cause a crawl.
import { join } from "node:path";
import { parse } from "./analysis.js";
import { collectAnchors, createFragmentResolver } from "./anchors.js";
import {
  decode,
  digest,
  exceeds,
  fail,
  diagnosticExcerpt,
} from "./contracts.js";
import { readDocument } from "./documents.js";
import { qualityRuleDefaults } from "./preset.js";

export function createLinkGraph(context, { admitBytes }) {
  const { root, config } = context;
  const budgets = config.analyzerLimits;
  const bounded = (value) =>
    diagnosticExcerpt(value, budgets.maxLinkDiagnosticCodePoints);
  const batch = new Map();
  const dependencies = new Map();
  const pending = [];
  const observations = [];
  function documentFor(path) {
    if (batch.has(path)) return batch.get(path);
    if (dependencies.has(path)) return dependencies.get(path);
    if (exceeds(dependencies.size + 1, budgets.maxReadDependencyDocuments))
      fail(
        "DEPENDENCY_LIMIT",
        "Unique link-target dependencies exceed maxReadDependencyDocuments.",
      );
    // Hard operational boundaries and size ceilings apply to dependency reads too.
    const { bytes } = readDocument(root, path, budgets);
    admitBytes(bytes.length);
    const anchors = collectAnchors(parse(decode(bytes), config.syntax));
    const document = { anchors, resolveFragment: undefined };
    dependencies.set(path, document);
    observations.push({
      role: "dependency",
      kind: "file",
      path: join(root, path),
      sha256: digest(bytes),
    });
    return document;
  }
  return {
    /** Register a batch member's anchors from the content this operation proposes. */
    addDocument(path, anchors, references) {
      batch.set(path, { anchors, resolveFragment: undefined });
      if (references.length) pending.push({ path, references });
    },
    /** Resolve every pending reference once the whole batch is known. */
    resolve(report) {
      const severity =
        config.lint["quality/unresolved-local-fragment"] ??
        qualityRuleDefaults["quality/unresolved-local-fragment"];
      for (const { path, references } of pending)
        for (const reference of references) {
          const document = documentFor(reference.target);
          // Index only referenced targets; many selected documents have no inbound links.
          document.resolveFragment ??= createFragmentResolver(document.anchors);
          const verdict = document.resolveFragment(reference.fragment);
          if (verdict === "resolved" || severity === "off") continue;
          report({
            path,
            source: "quality",
            rule: "quality/unresolved-local-fragment",
            line: reference.line,
            column: reference.column,
            severity: severity === "warn" ? "warning" : severity,
            message:
              verdict === "ambiguous"
                ? `Local fragment #${bounded(reference.fragment)} matches more than one explicit anchor in ${bounded(reference.target)}.`
                : `Local fragment #${bounded(reference.fragment)} does not match a heading or supported anchor in ${bounded(reference.target)}.`,
          });
        }
    },
    get readDependencies() {
      return [...dependencies.keys()].sort();
    },
    observations,
  };
}
