// SPDX-License-Identifier: AGPL-3.0-only
// Batch preparation for explicit normalization: prose edits per member, generated
// anchor impact, the bounded reverse-reference inventory and dependent fragment edits
// within the selected write set. Nothing here writes; the operation owner admits the
// complete proposed batch before any replacement.
import { dirname, join, relative, resolve, sep } from "node:path";
import { parse } from "./analysis.js";
import { collectAnchors } from "./anchors.js";
import { decode, digest, exceeds, fail } from "./contracts.js";
import { readDocument } from "./documents.js";
import { htmlFacts, htmlPosition } from "./html-policy.js";
import { parseLocalTarget } from "./local-links.js";
import {
  applyEdits,
  anchorChanges,
  prepareNormalization,
  verifyNormalization,
} from "./normalization.js";

const slash = (path) => path.split(sep).join("/");
const lineReference = /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/u;

/** Map a decoded fragment to the original generated heading it identifies, if any. */
function headingFor(inventory, fragment) {
  if (lineReference.test(fragment) || fragment === "" || fragment === "top")
    return undefined;
  if (inventory.explicit.some(([id]) => id === fragment)) return undefined;
  const folded = fragment.toLowerCase();
  return inventory.headings.find((heading) => heading.anchor === folded);
}

/** Resolve a local link URL to a root-relative target path from one document. */
function targetPath(root, from, url, policy) {
  const target = parseLocalTarget(url);
  if (!target || target.malformedFragment || target.rawFragment === null)
    return undefined;
  if (target.rawPath === "") return { path: from, ...target };
  let decoded;
  try {
    decoded = decodeURIComponent(target.rawPath);
  } catch {
    return undefined;
  }
  if (decoded.startsWith("/") && policy.rootRelative === "reject")
    return undefined;
  const absolute = decoded.startsWith("/")
    ? resolve(root, "." + decoded)
    : resolve(root, dirname(from), decoded);
  const path = slash(relative(root, absolute));
  if (path.startsWith("..") || !path.endsWith(".md")) return undefined;
  return { path, ...target };
}

/** Encode a new anchor the way the original fragment was spelled. */
function encodeFragment(original, anchor) {
  return /%[0-9A-Fa-f]{2}/u.test(original)
    ? encodeURIComponent(anchor)
    : anchor;
}

/** Locate the unique original raw fragment inside a link or definition destination. */
function fragmentSpan(text, node, rawFragment) {
  const source = text.slice(
    node.position.start.offset,
    node.position.end.offset,
  );
  const needle = "#" + rawFragment;
  const first = source.lastIndexOf(needle);
  if (first < 0 || source.indexOf(needle) !== first) return undefined;
  const start = node.position.start.offset + first + 1;
  const end = start + rawFragment.length;
  // The fragment must end the destination: a closing delimiter, space or title follows.
  if (!/^(?:$|[)>\s"'(])/u.test(text.slice(end, end + 1))) return undefined;
  return { start, end };
}

/** Prepare every member's normalization and, when generated anchors change, the
 * dependent fragment edits. Returns per-member plans plus batch-level refusals and
 * the reverse-inventory observations that must be rechecked before success or writes.
 */
export function prepareNormalizeBatch(context, members, options) {
  const { root, config } = context;
  const syntax = config.syntax;
  const refusals = [];
  const plans = new Map();
  for (const member of members) {
    const plan = prepareNormalization(member.text, syntax);
    for (const refusal of plan.refusals)
      refusals.push({ ...refusal, path: member.path });
    plans.set(member.path, { ...member, ...plan, fragmentEdits: [] });
  }
  const anchors = [];
  for (const plan of plans.values())
    if (plan.candidate)
      anchors.push(...anchorChanges(plan.path, plan.tree, plan.candidate));
  const result = {
    plans,
    refusals,
    anchorChanges: anchors,
    observations: [],
    inventoriedDocuments: 0,
  };
  if (!anchors.length || refusals.length) return result;
  if (!options.updateLinks) {
    refusals.push({
      code: "ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS",
      message:
        "Normalization changes generated heading anchors; review the anchor changes and rerun with --update-links to permit them.",
      path: anchors[0].path,
      line: anchors[0].sourceLine,
      column: anchors[0].sourceColumn,
    });
    return result;
  }
  // Original inventories identify the particular target heading for every reference.
  const changed = new Map();
  for (const change of anchors) {
    if (!changed.has(change.path))
      changed.set(change.path, {
        inventory: collectAnchors(plans.get(change.path).tree),
        byOrdinal: new Map(),
      });
    changed.get(change.path).byOrdinal.set(change.headingOrdinal, change);
  }
  const budgets = config.analyzerLimits;
  const paths = options.listReverseInventory();
  result.inventoriedDocuments = paths.length;
  for (const path of paths) {
    let text, tree;
    const member = plans.get(path);
    if (member) ({ text, tree } = member);
    else {
      if (
        exceeds(
          result.observations.length + 1,
          budgets.maxReadDependencyDocuments,
        )
      )
        fail(
          "DEPENDENCY_LIMIT",
          "Reverse-reference inventory exceeds maxReadDependencyDocuments.",
        );
      const { bytes } = readDocument(root, path, budgets);
      options.admitBytes(bytes.length);
      text = decode(bytes);
      tree = parse(text, syntax);
      result.observations.push({
        role: "dependency",
        kind: "file",
        path: join(root, path),
        sha256: digest(bytes),
      });
    }
    const visit = (node) => {
      if (["code", "inlineCode", "yaml", "toml", "json"].includes(node.type))
        return;
      if (node.type === "html") {
        for (const href of htmlFacts(node.value).hrefs) {
          const target = targetPath(root, path, href.href, config.links);
          const impact = target && changed.get(target.path);
          if (impact && target.fragment !== null) {
            const heading = headingFor(impact.inventory, target.fragment);
            if (heading && impact.byOrdinal.has(heading.ordinal)) {
              const at = htmlPosition(node, href);
              refusals.push({
                code: "PROTECTED_HTML_REFERENCE",
                message:
                  "A raw HTML link depends on a changed anchor; normalize does not edit raw HTML.",
                path,
                line: at.line,
                column: at.column,
              });
            }
          }
        }
        return;
      }
      if (["link", "definition"].includes(node.type) && node.url) {
        const target = targetPath(root, path, node.url, config.links);
        const impact = target && changed.get(target.path);
        if (impact) {
          const heading = headingFor(impact.inventory, target.fragment);
          const change = heading && impact.byOrdinal.get(heading.ordinal);
          if (change) {
            const at = node.position.start;
            if (!member)
              refusals.push({
                code: "OUT_OF_SCOPE_REFERENCE",
                message:
                  "A reference outside the selected write set depends on a changed anchor; adjust selection or scope and rerun.",
                path,
                line: at.line,
                column: at.column,
              });
            else {
              const span = fragmentSpan(text, node, target.rawFragment);
              if (!span)
                refusals.push({
                  code: "UNREPRESENTABLE_FRAGMENT_EDIT",
                  message:
                    "The dependent fragment cannot be located uniquely in its destination.",
                  path,
                  line: at.line,
                  column: at.column,
                });
              else
                member.fragmentEdits.push({
                  ...span,
                  replacement: encodeFragment(
                    target.rawFragment,
                    change.newAnchor,
                  ),
                  kind: "local-fragment",
                  url:
                    node.url.slice(
                      0,
                      node.url.length - target.rawFragment.length,
                    ) + encodeFragment(target.rawFragment, change.newAnchor),
                  offset: node.position.start.offset,
                });
            }
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  }
  if (refusals.length) return result;
  for (const plan of plans.values()) {
    if (!plan.fragmentEdits.length) continue;
    const combined = applyEdits(plan.text, [
      ...plan.edits,
      ...plan.fragmentEdits,
    ]);
    if (combined.refusal) {
      refusals.push({ ...combined.refusal, path: plan.path });
      continue;
    }
    const verified = verifyNormalization(
      plan.tree,
      combined.output,
      syntax,
      new Map(plan.fragmentEdits.map((edit) => [edit.offset, edit.url])),
    );
    if (!verified) {
      refusals.push({
        code: "STRUCTURE_CHANGED",
        message:
          "Fragment updates would change Markdown structure or bindings.",
        path: plan.path,
        line: 1,
        column: 1,
      });
      continue;
    }
    plan.output = combined.output;
    plan.edits = combined.edits;
    plan.candidate = verified;
  }
  return result;
}
