// SPDX-License-Identifier: AGPL-3.0-only
// One package anchor model for same- and cross-document fragment checks and for
// normalization's anchor impact. GFM itself defines no heading identifiers; this is
// the package's documented renderer-compatible contract.
import GithubSlugger from "github-slugger";
import { htmlFacts } from "./html-policy.js";

/** A trailing `{#id}` heading suffix is a package extension retained for parity
 * with the previous default fragment rule; GFM does not define it.
 */
const customHeadingId = /\{#(?<id>[^}\s]+)\}\s*$/u;
/** GitHub line references such as L10 or L10C2-L12 are compatibility anchors. */
const lineReference = /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/u;

/** Rendered heading text: parser-decoded text and code values, excluding raw HTML. */
export function headingText(node) {
  if (node.type === "html") return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(headingText).join("");
}

/** Collect generated and explicit anchors in source order. Generated heading anchors
 * use maintained github-slugger duplicate allocation; explicit HTML id/name values
 * keep their exact spelling in a separate namespace and duplicates are ambiguous.
 */
export function collectAnchors(tree) {
  const slugger = new GithubSlugger();
  const generated = new Set(["top"]);
  const explicit = new Map();
  const headings = [];
  function visit(node) {
    if (node.type === "heading") {
      const text = headingText(node);
      const custom = customHeadingId.exec(text);
      const anchor = slugger.slug(custom ? custom.groups.id : text);
      generated.add(anchor);
      headings.push({
        ordinal: headings.length + 1,
        line: node.position.start.line,
        column: node.position.start.column,
        anchor,
      });
    } else if (node.type === "html") {
      const facts = htmlFacts(node.value);
      for (const id of facts.ids) explicit.set(id, (explicit.get(id) ?? 0) + 1);
      for (const text of facts.headingTexts) generated.add(slugger.slug(text));
      return;
    }
    if (["code", "inlineCode", "yaml", "toml", "json"].includes(node.type))
      return;
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  return { generated: [...generated], explicit: [...explicit], headings };
}

/** Resolve a decoded fragment against a compact anchor inventory. Generated heading
 * anchors retain case-insensitive matching; explicit HTML identifiers match exactly.
 */
export function resolveFragment(inventory, fragment) {
  if (fragment === "" || lineReference.test(fragment)) return "resolved";
  const explicit = new Map(inventory.explicit);
  const count = explicit.get(fragment);
  if (count > 1) return "ambiguous";
  if (count === 1) return "resolved";
  return new Set(inventory.generated).has(fragment.toLowerCase())
    ? "resolved"
    : "missing";
}
