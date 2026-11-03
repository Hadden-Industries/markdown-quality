// SPDX-License-Identifier: AGPL-3.0-only
// One prose population for NFC checking and explicit normalization. Rendered text runs
// join across emphasis, strong and delete boundaries, so a combining mark split by
// emphasis cannot evade the check; runs never join across block, hard-break, inline
// code, raw HTML, link or image boundaries. Literals, front matter, destinations,
// definition identifiers and code-like metadata are outside this population.
const literal = new Set([
  "code",
  "inlineCode",
  "html",
  "yaml",
  "toml",
  "json",
  "definition",
]);
const transparent = new Set(["emphasis", "strong", "delete"]);

/** Return ordered prose units: `{kind: "text", parts: [textNode...]}` runs and
 * `{kind: "alt", node}` image alternatives (inline and reference images).
 */
export function collectProse(tree) {
  const units = [];
  let run = null;
  const close = () => {
    if (run?.parts.length) units.push(run);
    run = null;
  };
  function phrasing(node) {
    if (node.type === "text") {
      (run ??= { kind: "text", parts: [] }).parts.push(node);
      return;
    }
    if (transparent.has(node.type)) {
      for (const child of node.children) phrasing(child);
      return;
    }
    close();
    if (["image", "imageReference"].includes(node.type) && node.alt)
      units.push({ kind: "alt", node });
    else if (!literal.has(node.type) && node.children)
      for (const child of node.children) phrasing(child);
    close();
  }
  function block(node) {
    if (literal.has(node.type)) return;
    if (
      ["paragraph", "heading", "tableCell"].includes(node.type) ||
      (node.children ?? []).some((child) =>
        ["text", "emphasis", "strong", "delete", "link"].includes(child.type),
      )
    ) {
      for (const child of node.children) phrasing(child);
      close();
      return;
    }
    for (const child of node.children ?? []) block(child);
  }
  block(tree);
  return units;
}

/** Decoded rendered text of one prose unit. */
export const proseValue = (unit) =>
  unit.kind === "alt"
    ? unit.node.alt
    : unit.parts.map((part) => part.value).join("");

/** The runtime's maintained normalization primitive; no custom Unicode tables. */
export const isNfc = (value) => value === value.normalize("NFC");
