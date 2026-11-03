// SPDX-License-Identifier: AGPL-3.0-only
// Repository-local link targets: containment, existence, exact path spelling and
// fragment references. Nothing is fetched; site routes, directory index files and
// extensionless targets are never inferred.
import { lstatSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { safePath } from "./consumer-root.js";
import { exceeds, fail } from "./contracts.js";
import { collectAnchors, resolveFragment } from "./anchors.js";
import { qualityRuleDefaults } from "./preset.js";

const slash = (path) => path.split(sep).join("/");
const bounded = (value, length = 200) =>
  value.length > length ? value.slice(0, length) + "…" : value;

/** Split URL structure first: the fragment begins at the first `#`; a query is only
 * a `?` before it. Path and fragment are each percent-decoded exactly once.
 */
export function parseLocalTarget(url) {
  if (
    typeof url !== "string" ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/u.test(url) ||
    url.startsWith("//")
  )
    return null;
  const hash = url.indexOf("#");
  const beforeFragment = hash < 0 ? url : url.slice(0, hash);
  const rawPath = beforeFragment.split("?")[0];
  const rawFragment = hash < 0 ? null : url.slice(hash + 1);
  let fragment = null,
    malformedFragment = false;
  if (rawFragment !== null)
    try {
      fragment = decodeURIComponent(rawFragment);
    } catch {
      malformedFragment = true;
    }
  return { rawPath, rawFragment, fragment, malformedFragment };
}

/** Observe exact directory-entry spelling for every component under the root. */
export function createSpellingObserver(root, budgets) {
  const entries = new Map();
  let observed = 0;
  function list(directory) {
    if (!entries.has(directory)) {
      const names = readdirSync(directory);
      observed += names.length;
      if (exceeds(observed, budgets.maxEnumeratedEntries))
        fail(
          "LINK_LIMIT",
          "Link target spelling observation exceeds the entry limit.",
        );
      entries.set(directory, names);
    }
    return entries.get(directory);
  }
  /** Return null for exact spelling, the expected root-relative spelling for a
   * unique case-insensitive match, or undefined when no entry matches.
   */
  return function spelling(relativePath) {
    const parts = relativePath.split("/").filter(Boolean);
    let directory = root;
    const expected = [];
    let mismatch = false;
    for (const [index, part] of parts.entries()) {
      const names = list(directory);
      if (names.includes(part)) expected.push(part);
      else {
        const folded = names.filter(
          (name) => name.toLowerCase() === part.toLowerCase(),
        );
        if (folded.length !== 1) return undefined;
        expected.push(folded[0]);
        mismatch = true;
      }
      directory = join(directory, expected.at(-1));
      // Never observe through a linked or non-directory component, even when it
      // was reached by a case-insensitive match the literal path check skipped.
      const stat = lstatSync(directory);
      if (
        stat.isSymbolicLink() ||
        (index < parts.length - 1 && !stat.isDirectory())
      )
        return undefined;
    }
    return mismatch ? expected.join("/") : null;
  };
}

function severity(config, rule) {
  const selected = config.lint?.[rule] ?? qualityRuleDefaults[rule];
  return selected === "warn" ? "warning" : selected;
}

/** Check local targets and same-document fragments in one parsed document. Returns
 * cross-document fragment references for the invocation graph owner to resolve
 * against proposed batch outputs or captured dependency content.
 */
export function checkLocalLinks(context, tree, file, collector, spelling) {
  const { config, root } = context;
  const filesystem = config.links.checkLocalTargets;
  const fragmentRule = severity(config, "quality/unresolved-local-fragment");
  const caseRule = severity(config, "quality/local-path-case-mismatch");
  const anchors = collectAnchors(tree);
  const references = [];
  const push = (rule, level, node, message, at = node.position.start) => {
    if (level === "off") return;
    collector.push({
      source: rule.startsWith("quality/") ? "quality" : "links",
      rule: rule.startsWith("links/") ? rule.slice(6) : rule,
      line: at.line,
      column: at.column,
      message,
      severity: level,
    });
  };
  function fragmentFinding(node, target, fragment, verdict, at) {
    push(
      "quality/unresolved-local-fragment",
      fragmentRule,
      node,
      verdict === "ambiguous"
        ? `Local fragment #${bounded(fragment)} matches more than one explicit anchor in ${bounded(target)}.`
        : `Local fragment #${bounded(fragment)} does not match a heading or supported anchor in ${bounded(target)}.`,
      at,
    );
  }
  function visit(node) {
    if (["code", "inlineCode", "yaml", "toml", "json"].includes(node.type))
      return;
    if (["link", "image", "definition"].includes(node.type) && node.url) {
      const target = parseLocalTarget(node.url);
      if (target) {
        const links = node.type !== "image";
        if (target.rawPath === "") {
          // Same-document fragments are checked even without filesystem checks.
          if (links && target.rawFragment !== null) {
            if (target.malformedFragment)
              push(
                "quality/unresolved-local-fragment",
                fragmentRule,
                node,
                "Local fragment has malformed percent-encoding.",
              );
            else {
              const verdict = resolveFragment(anchors, target.fragment);
              if (verdict !== "resolved")
                fragmentFinding(
                  node,
                  "this document",
                  target.fragment,
                  verdict,
                );
            }
          }
        } else if (filesystem) checkTarget(node, target, links);
      }
    }
    for (const child of node.children ?? []) visit(child);
  }
  function checkTarget(node, target, links) {
    let relativePath;
    try {
      const decoded = decodeURIComponent(target.rawPath);
      if (decoded.includes("\\") || decoded.includes("\0"))
        throw new Error("Invalid target.");
      if (decoded.startsWith("/") && config.links.rootRelative === "reject")
        throw new Error("Root-relative links require explicit root policy.");
      const absolute = decoded.startsWith("/")
        ? resolve(root, "." + decoded)
        : resolve(root, dirname(file), decoded);
      // Containment and link refusal use the literal spelling; a wrong-case path
      // is diagnosed below instead of being reported as missing.
      const path = safePath(root, absolute, { missing: true });
      relativePath = slash(relative(root, path));
      const expected = spelling(relativePath);
      if (expected === undefined) throw new Error("Missing target.");
      if (expected !== null) {
        push(
          "quality/local-path-case-mismatch",
          caseRule,
          node,
          `Local target spelling differs from the directory entry; expected ${bounded(expected, 300)}.`,
        );
        return;
      }
      const stat = lstatSync(path);
      if (!stat.isFile() && !stat.isDirectory())
        throw new Error("Target is not a file or directory.");
      if (
        links &&
        target.rawFragment !== null &&
        stat.isFile() &&
        relativePath.endsWith(".md")
      ) {
        if (target.malformedFragment)
          push(
            "quality/unresolved-local-fragment",
            fragmentRule,
            node,
            "Local fragment has malformed percent-encoding.",
          );
        else if (target.fragment !== "" && fragmentRule !== "off")
          references.push({
            target: relativePath,
            fragment: target.fragment,
            line: node.position.start.line,
            column: node.position.start.column,
          });
      }
    } catch {
      push(
        "links/local-target",
        "error",
        node,
        "Local target is missing, invalid, linked, or outside the root.",
      );
    }
  }
  visit(tree);
  return { anchors, references };
}
