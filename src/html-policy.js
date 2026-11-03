// SPDX-License-Identifier: AGPL-3.0-only
// Static facts from raw HTML in Markdown, using the maintained parse5 HTML fragment
// parser. Nothing is executed, fetched, sanitized or rewritten. Supported model: each
// parsed Markdown HTML node is one independent fragment; constructs split across
// Markdown boundaries (an inline open tag, Markdown content, then a close tag) are
// evaluated per node, so an anchor's label is assessed only when the anchor closes
// inside the same node. This is not a sanitizer or accessibility certification.
import { parseFragment } from "parse5";

/** GFM tagfilter elements. */
export const disallowedElements = Object.freeze(
  new Set([
    "title",
    "textarea",
    "style",
    "xmp",
    "iframe",
    "noembed",
    "noframes",
    "script",
    "plaintext",
  ]),
);
/** Attributes whose values are URLs for this finite scheme policy. */
const urlAttributes = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "poster",
  "background",
  "cite",
  "longdesc",
  "data",
  "codebase",
  "xlink:href",
  "srcset",
]);
/** Reviewed placeholder alternatives; matched after trimming, collapsing whitespace
 * and lowercasing. Filename-like labels are not rejected generally.
 */
export const placeholderAlternatives = Object.freeze(
  new Set([
    "image",
    "img",
    "photo",
    "picture",
    "screenshot",
    "alt text",
    "image description",
    "alt",
    "graphic",
    "icon",
    "logo",
  ]),
);

export const normalizedLabel = (value) =>
  value.replace(/\s+/gu, " ").trim().toLowerCase();
export const meaningfulLabel = (value) => {
  const label = normalizedLabel(value);
  return label !== "" && !placeholderAlternatives.has(label);
};

/** URL scheme after the URL parser's ASCII tab/newline removal and C0/space trim. */
function scheme(value) {
  const stripped = value
    .replace(/[\t\n\r]/gu, "")
    .replace(/^[\u0000- ]+|[\u0000- ]+$/gu, "");
  return /^([a-z][a-z0-9+.-]*):/iu.exec(stripped)?.[1].toLowerCase();
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value;
  if (node.nodeName === "#comment") return "";
  const own =
    node.tagName === "img"
      ? (node.attrs.find((attribute) => attribute.name === "alt")?.value ?? "")
      : "";
  const children = node.content?.childNodes ?? node.childNodes ?? [];
  return own + children.map(textContent).join("");
}

/** Parse one raw HTML node into bounded static facts with fragment-relative positions. */
export function htmlFacts(value) {
  const facts = {
    ids: [],
    headingTexts: [],
    disallowed: [],
    missingAlt: [],
    unlabeledLinks: [],
    hrefs: [],
  };
  const fragment = parseFragment(value, { sourceCodeLocationInfo: true });
  const visit = (node) => {
    if (node.nodeName === "#comment" || node.nodeName === "#text") return;
    if (node.tagName) {
      const location = node.sourceCodeLocation;
      const at = location
        ? { line: location.startLine, column: location.startCol }
        : { line: 1, column: 1 };
      const attributes = new Map(
        node.attrs.map((attribute) => [attribute.name, attribute.value]),
      );
      if (disallowedElements.has(node.tagName))
        facts.disallowed.push({ ...at, construct: `<${node.tagName}>` });
      for (const [name, attributeValue] of attributes) {
        if (/^on./iu.test(name))
          facts.disallowed.push({ ...at, construct: `${name} attribute` });
        if (urlAttributes.has(name)) {
          const candidates =
            name === "srcset"
              ? attributeValue
                  .split(",")
                  .map((part) => part.trim().split(/\s+/u)[0])
              : [attributeValue];
          if (
            candidates.some((url) =>
              ["javascript", "vbscript"].includes(scheme(url)),
            )
          )
            facts.disallowed.push({ ...at, construct: `${name} URL scheme` });
        }
      }
      if (attributes.has("id") && attributes.get("id") !== "")
        facts.ids.push(attributes.get("id"));
      if (
        node.tagName === "a" &&
        attributes.has("name") &&
        attributes.get("name") !== ""
      )
        facts.ids.push(attributes.get("name"));
      if (/^h[1-6]$/u.test(node.tagName) && location?.endTag)
        facts.headingTexts.push(textContent(node));
      // aria-hidden images are explicitly decorative to assistive technology.
      if (
        node.tagName === "img" &&
        !attributes.has("alt") &&
        attributes.get("aria-hidden")?.toLowerCase() !== "true"
      )
        facts.missingAlt.push(at);
      if (node.tagName === "a" && attributes.has("href")) {
        facts.hrefs.push({ ...at, href: attributes.get("href") });
        const containsImage = (child) =>
          child.tagName === "img" ||
          (child.childNodes ?? []).some(containsImage);
        if (
          location?.endTag &&
          node.childNodes.some(containsImage) &&
          !meaningfulLabel(textContent(node)) &&
          !meaningfulLabel(attributes.get("aria-label") ?? "")
        )
          facts.unlabeledLinks.push(at);
      }
    }
    for (const child of node.content?.childNodes ?? node.childNodes ?? [])
      visit(child);
  };
  visit(fragment);
  return facts;
}

/** Map a fragment-relative position onto the Markdown node's source position. */
export function htmlPosition(node, at) {
  return at.line === 1
    ? {
        line: node.position.start.line,
        column: node.position.start.column + at.column - 1,
      }
    : { line: node.position.start.line + at.line - 1, column: at.column };
}
