// SPDX-License-Identifier: AGPL-3.0-only
// Explicit source-aware NFC repair of the same prose population the checker reports.
// Edits are minimal nonoverlapping spans against the captured original text; every
// byte outside them, including EOL bytes and final-newline state, is preserved. The
// candidate is reparsed and must have the same Markdown structure with only the
// intended NFC prose changes; anything that cannot be proven is refused.
import { isDeepStrictEqual } from "node:util";
import { parse } from "./analysis.js";
import { collectAnchors } from "./anchors.js";
import { collectProse, proseValue, isNfc } from "./prose-runs.js";
import { digest } from "./contracts.js";

const asciiPunctuation = /[!-/:-@[-`{-~]/u;
const reference =
  /^&(?:#[xX]([0-9a-fA-F]{1,6});|#([0-9]{1,7});|([A-Za-z][A-Za-z0-9]{1,31});)/u;
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

/** Decode one character reference with the same parser that produced the prose,
 * used only to align decoded values with source; undefined when it is not one.
 */
function decodeReference(match) {
  const tree = parse(match[0], { frontmatter: false });
  const node = tree.children[0]?.children;
  return node?.length === 1 && node[0].type === "text"
    ? node[0].value
    : undefined;
}

/** Align a parser-decoded value with its source slice. Segments record literal,
 * escaped, reference and line-ending sources; container prefixes, indentation and
 * stripped line-end whitespace are skipped. Null means no proven alignment.
 */
export function alignProse(text, start, end, value) {
  const segments = [];
  let i = start,
    j = 0,
    lineStart = false;
  while (j < value.length) {
    if (i >= end) return null;
    const c = text[i];
    if (lineStart && (c === " " || c === "\t" || c === ">")) {
      i++;
      continue;
    }
    lineStart = false;
    if (
      c === "\\" &&
      i + 1 < end &&
      asciiPunctuation.test(text[i + 1]) &&
      value[j] === text[i + 1]
    ) {
      segments.push({
        from: i,
        to: i + 2,
        valueFrom: j,
        valueTo: j + 1,
        kind: "escape",
      });
      i += 2;
      j += 1;
      continue;
    }
    if (c === "&") {
      const match = reference.exec(text.slice(i, Math.min(end, i + 40)));
      const decoded = match && decodeReference(match);
      if (decoded !== undefined && decoded && value.startsWith(decoded, j)) {
        segments.push({
          from: i,
          to: i + match[0].length,
          valueFrom: j,
          valueTo: j + decoded.length,
          kind: "reference",
        });
        i += match[0].length;
        j += decoded.length;
        continue;
      }
    }
    if (c === value[j]) {
      const line = c === "\n" || c === "\r";
      segments.push({
        from: i,
        to: i + 1,
        valueFrom: j,
        valueTo: j + 1,
        kind: line ? "line" : "literal",
      });
      if (line && !(c === "\r" && text[i + 1] === "\n")) lineStart = true;
      i++;
      j++;
      continue;
    }
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    return null;
  }
  return segments;
}

/** Escape ASCII punctuation introduced by NFC so it cannot become Markdown syntax. */
const escapeProse = (value) =>
  [...value].map((c) => (asciiPunctuation.test(c) ? "\\" + c : c)).join("");

/** Plan NFC edits for one decoded value whose source is [start, end). */
function planValue(text, start, end, value, at, refuse) {
  const normalized = value.normalize("NFC");
  if (normalized === value) return [];
  const segments = alignProse(text, start, end, value);
  if (!segments) {
    refuse(
      at,
      "UNMAPPABLE_PROSE",
      "Non-NFC prose cannot be mapped to its source safely.",
    );
    return [];
  }
  const changes = [];
  let offset = 0,
    rebuilt = "";
  for (const { segment } of graphemes.segment(value)) {
    const next = segment.normalize("NFC");
    if (next !== segment)
      changes.push({
        valueFrom: offset,
        valueTo: offset + segment.length,
        next,
      });
    rebuilt += next;
    offset += segment.length;
  }
  if (rebuilt !== normalized) {
    refuse(
      at,
      "UNREPAIRABLE_NORMALIZATION_BOUNDARY",
      "NFC composition crosses a grapheme boundary that cannot be repaired locally.",
    );
    return [];
  }
  const edits = [];
  for (const change of changes) {
    const covering = segments.filter(
      (segment) =>
        segment.valueTo > change.valueFrom &&
        segment.valueFrom < change.valueTo,
    );
    if (
      !covering.length ||
      covering[0].valueFrom !== change.valueFrom ||
      covering.at(-1).valueTo !== change.valueTo ||
      covering.some(
        (segment, index) =>
          segment.kind === "line" ||
          (index && covering[index - 1].to !== segment.from),
      )
    ) {
      refuse(
        at,
        "UNREPAIRABLE_NORMALIZATION_BOUNDARY",
        "Non-NFC prose spans Markdown structure and cannot be repaired without moving markup.",
      );
      continue;
    }
    edits.push({
      start: covering[0].from,
      end: covering.at(-1).to,
      replacement: escapeProse(change.next),
    });
  }
  return edits;
}

/** Locate an image alternative's label source between `![` and its closing bracket. */
function labelSource(text, node) {
  const from = node.position.start.offset + 2;
  const end = node.position.end.offset;
  let depth = 1;
  for (let i = from; i < end; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "`") {
      let run = 1;
      while (text[i + run] === "`") run++;
      const close = text.indexOf("`".repeat(run), i + run);
      if (close >= 0 && close < end) i = close + run - 1;
      else i += run - 1;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return { from, to: i };
  }
  return null;
}

/** Positions-free structure; optionally with eligible prose replaced by its NFC form. */
export function proseStructure(node, normalize) {
  const value = {};
  for (const [key, item] of Object.entries(node)) {
    if (key === "position") continue;
    if (key === "children")
      value.children = item.map((child) => proseStructure(child, normalize));
    else if (normalize && key === "value" && node.type === "text")
      value.value = item.normalize("NFC");
    else if (
      normalize &&
      key === "alt" &&
      ["image", "imageReference"].includes(node.type) &&
      typeof item === "string"
    )
      value.alt = item.normalize("NFC");
    else if (item && typeof item === "object" && !Array.isArray(item))
      value[key] = proseStructure(item, false);
    else value[key] = item;
  }
  return value;
}

const lineBreak = /\r\n|\r|\n/gu;
function coordinates(text, index) {
  let line = 1,
    lineStart = 0;
  for (const match of text.slice(0, index).matchAll(lineBreak)) {
    line++;
    lineStart = match.index + match[0].length;
  }
  return { line, column: index - lineStart + 1 };
}

/** Prepare NFC normalization of one document. Returns the candidate text, original
 * UTF-16 edit spans and refusals; a refused document returns its original text.
 */
export function prepareNormalization(text, syntax) {
  const tree = parse(text, syntax);
  const refusals = [];
  const refuse = (at, code, message) =>
    refusals.push({ code, message, line: at.line, column: at.column });
  const edits = [];
  for (const unit of collectProse(tree)) {
    const value = proseValue(unit);
    if (
      isNfc(value) &&
      (unit.kind === "alt" || unit.parts.every((part) => isNfc(part.value)))
    )
      continue;
    if (unit.kind === "alt") {
      const label = labelSource(text, unit.node);
      const at = unit.node.position.start;
      if (!label) {
        refuse(
          at,
          "UNMAPPABLE_PROSE",
          "Image alternative text cannot be located in source.",
        );
        continue;
      }
      const sub = parse(text.slice(label.from, label.to), syntax);
      const units = collectProse(sub);
      if (units.map(proseValue).join("") !== unit.node.alt) {
        refuse(
          at,
          "UNMAPPABLE_PROSE",
          "Image alternative text cannot be mapped to its source safely.",
        );
        continue;
      }
      for (const inner of units)
        for (const part of inner.parts ?? [])
          edits.push(
            ...planValue(
              text,
              label.from + part.position.start.offset,
              label.from + part.position.end.offset,
              part.value,
              at,
              refuse,
            ),
          );
      continue;
    }
    // Per-node repair must also make the joined rendered run NFC; otherwise a mark is
    // split from its base by formatting ownership and cannot be represented safely.
    const repaired = unit.parts
      .map((part) => part.value.normalize("NFC"))
      .join("");
    if (!isNfc(repaired)) {
      refuse(
        unit.parts[0].position.start,
        "UNREPAIRABLE_NORMALIZATION_BOUNDARY",
        "A combining sequence is split by inline formatting; normalize would have to move markup.",
      );
      continue;
    }
    for (const part of unit.parts)
      edits.push(
        ...planValue(
          text,
          part.position.start.offset,
          part.position.end.offset,
          part.value,
          part.position.start,
          refuse,
        ),
      );
  }
  if (refusals.length) return { output: text, edits: [], refusals, tree };
  const applied = applyEdits(text, edits);
  if (applied.refusal)
    return { output: text, edits: [], refusals: [applied.refusal], tree };
  const candidate = verifyNormalization(tree, applied.output, syntax);
  if (!candidate)
    return {
      output: text,
      edits: [],
      refusals: [
        {
          code: "STRUCTURE_CHANGED",
          message:
            "Normalization would change Markdown structure, bindings or literals.",
          line: 1,
          column: 1,
        },
      ],
      tree,
    };
  return {
    output: applied.output,
    edits: applied.edits,
    refusals,
    tree,
    candidate,
  };
}

/** Apply nonoverlapping edits once against the original coordinate basis. */
export function applyEdits(text, edits) {
  const ordered = [...edits].sort((a, b) => a.start - b.start);
  for (let index = 1; index < ordered.length; index++)
    if (ordered[index].start < ordered[index - 1].end) {
      const at = coordinates(text, ordered[index].start);
      return {
        refusal: {
          code: "OVERLAPPING_EDITS",
          message: "Normalization edits overlap and cannot be applied safely.",
          line: at.line,
          column: at.column,
        },
      };
    }
  let output = "",
    cursor = 0;
  for (const edit of ordered) {
    output += text.slice(cursor, edit.start) + edit.replacement;
    cursor = edit.end;
  }
  return { output: output + text.slice(cursor), edits: ordered };
}

/** Reparse a candidate and prove identical structure, bindings, literals and
 * destinations, allowing only NFC prose and the admitted destination substitutions
 * (keyed by the original node's source offset). Returns the candidate tree or null.
 */
export function verifyNormalization(
  tree,
  output,
  syntax,
  destinations = new Map(),
) {
  const candidate = parse(output, syntax);
  const expected = structuredClone(tree);
  if (destinations.size) {
    const substitute = (node) => {
      const url = destinations.get(node.position?.start.offset);
      if (url !== undefined && ["link", "definition"].includes(node.type))
        node.url = url;
      for (const child of node.children ?? []) substitute(child);
    };
    substitute(expected);
  }
  return isDeepStrictEqual(
    proseStructure(expected, true),
    proseStructure(candidate, false),
  )
    ? candidate
    : null;
}

/** Byte-exact proposed-change records with original UTF-8 half-open spans. */
export function changeRecords(path, text, edits, kind = "prose-nfc") {
  return edits.map((edit) => {
    const before = Buffer.from(text.slice(edit.start, edit.end));
    const after = Buffer.from(edit.replacement);
    const sourceByteStart = Buffer.byteLength(text.slice(0, edit.start));
    const at = coordinates(text, edit.start);
    return {
      path,
      kind: edit.kind ?? kind,
      sourceByteStart,
      sourceByteEndExclusive: sourceByteStart + before.length,
      sourceLine: at.line,
      sourceColumn: at.column,
      beforeByteLength: before.length,
      afterByteLength: after.length,
      beforeSha256: digest(before),
      afterSha256: digest(after),
    };
  });
}

/** Old/new generated anchors for headings matched by preserved structural order. */
export function anchorChanges(path, tree, candidate) {
  const before = collectAnchors(tree).headings;
  const after = collectAnchors(candidate).headings;
  return before
    .map((heading, index) => ({ heading, next: after[index] }))
    .filter(({ heading, next }) => next && heading.anchor !== next.anchor)
    .map(({ heading, next }) => ({
      path,
      headingOrdinal: heading.ordinal,
      sourceLine: heading.line,
      sourceColumn: heading.column,
      oldAnchor: heading.anchor,
      newAnchor: next.anchor,
    }));
}
