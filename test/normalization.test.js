// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  prepareNormalization,
  changeRecords,
  anchorChanges,
} from "../src/normalization.js";

const syntax = { frontmatter: "yaml" };
// Independent spellings: D is decomposed e + combining acute, C its composed form.
const D = "é";
const C = "é";
const sha = (text) => createHash("sha256").update(text).digest("hex");

test("source-aware NFC edits change only eligible prose spans", () => {
  const cases = [
    [`# T\n\nCaf${D} opens.\n`, `# T\n\nCaf${C} opens.\n`],
    [`# T\r\n\r\nCaf${D}\r\n`, `# T\r\n\r\nCaf${C}\r\n`],
    [`Caf${D}`, `Caf${C}`],
    ["Cafe&#x301; &amp; y\n", `Caf${C} &amp; y\n`],
    [`\\*Caf${D}\\* \\[x\\]\n`, `\\*Caf${C}\\* \\[x\\]\n`],
    [`> one ${D}\n> two ${D}\n`, `> one ${C}\n> two ${C}\n`],
    [`- a ${D}\n  b ${D}\n`, `- a ${C}\n  b ${C}\n`],
    [`| A |\n| - |\n| ${D} |\n`, `| A |\n| - |\n| ${C} |\n`],
    [`![${D} *x*](p.png)\n`, `![${C} *x*](p.png)\n`],
    [`![${D}][r]\n\n[r]: p.png\n`, `![${C}][r]\n\n[r]: p.png\n`],
    [`\u{1F600} ${D}\n`, `\u{1F600} ${C}\n`],
    ["각\n", "각\n"],
    // Canonical singletons that become ASCII punctuation are escaped, not markup.
    ["a`b\n", "a\\`b\n"],
    ["&amp; x\n", "&amp\\; x\n"],
  ];
  for (const [input, expected] of cases) {
    const result = prepareNormalization(input, syntax);
    assert.deepEqual(result.refusals, [], JSON.stringify(input));
    assert.equal(result.output, expected, JSON.stringify(input));
    // Source-level idempotence: the second run proposes no edits.
    const second = prepareNormalization(result.output, syntax);
    assert.equal(second.edits.length, 0);
    assert.equal(second.output, result.output);
  }
});

test("literals, identifiers and destinations are never normalized", () => {
  const input = [
    "---",
    `title: ${D}`,
    "---",
    "",
    `Inline \`${D}\` and <span title="${D}">x</span>.`,
    "",
    "```text",
    D,
    "```",
    "",
    `[label](${D}.md)`,
    "",
  ].join("\n");
  const result = prepareNormalization(input, syntax);
  assert.deepEqual(result.refusals, []);
  assert.equal(result.output, input);
  assert.equal(result.edits.length, 0);
});

test("unsafe mappings refuse instead of moving markup or rebinding references", () => {
  const split = prepareNormalization("Cafe*́*\n", syntax);
  assert.equal(split.refusals[0].code, "UNREPAIRABLE_NORMALIZATION_BOUNDARY");
  assert.equal(split.output, "Cafe*́*\n");
  const reference = prepareNormalization(`[${D}][]\n\n[${D}]: x.md\n`, syntax);
  assert.equal(reference.refusals[0].code, "STRUCTURE_CHANGED");
  assert.equal(reference.edits.length, 0);
});

test("change records use original UTF-8 half-open spans and exact hashes", () => {
  const input = `# T\r\n\r\n\u{1F600} Caf${D}\r\n`;
  const result = prepareNormalization(input, syntax);
  const [record] = changeRecords("a.md", input, result.edits);
  // "# T\r\n\r\n" is 7 bytes, the emoji 4 bytes, the space and "Caf" 4 bytes.
  assert.deepEqual(record, {
    path: "a.md",
    kind: "prose-nfc",
    sourceByteStart: 15,
    sourceByteEndExclusive: 18,
    sourceLine: 3,
    // Columns are one-based UTF-16 code units: emoji (2), space, C, a, f.
    sourceColumn: 7,
    beforeByteLength: 3,
    afterByteLength: 2,
    beforeSha256: sha(D),
    afterSha256: sha(C),
  });
  assert.equal(
    Buffer.from(input).subarray(15, 18).toString(),
    D,
    "byte span addresses the original bytes",
  );
});

test("heading normalization reports old and new generated anchors with suffix cascades", () => {
  const input = `# Caf${D}\n\n## Caf${C}\n\n## Other\n`;
  const result = prepareNormalization(input, syntax);
  const changes = anchorChanges("a.md", result.tree, result.candidate);
  // Before: "café" (decomposed) and "café" (composed) are distinct slugs; after
  // both are composed, so the later heading gains the -1 duplicate suffix.
  assert.deepEqual(
    changes.map(({ headingOrdinal, oldAnchor, newAnchor }) => [
      headingOrdinal,
      oldAnchor,
      newAnchor,
    ]),
    [
      [1, `caf${D}`, `caf${C}`],
      [2, `caf${C}`, `caf${C}-1`],
    ],
  );
});

test("dense NFC edits retain source alignment across references and container lines", () => {
  const source = `> ${"e&#x301; ".repeat(64)}\r\n> ${"\\*e\u0301\\* ".repeat(64)}\r\n`;
  const expected = `> ${"é ".repeat(64)}\r\n> ${"\\*é\\* ".repeat(64)}\r\n`;
  const result = prepareNormalization(source, syntax);
  assert.deepEqual(result.refusals, []);
  assert.equal(result.output, expected);
  assert.equal(result.edits.length, 128);
  assert.ok(result.edits.every((edit) => edit.replacement === "é"));
  assert.equal(prepareNormalization(result.output, syntax).edits.length, 0);
});

test("change coordinates preserve unsorted/repeated starts and UTF-16 boundary semantics", () => {
  // UTF-16 offsets: A=0, emoji=1..2, CR=3, LF=4, é=5, CR=6, Z=7,
  // LF=8, lone high surrogate=9, Q=10, lone low surrogate=11.
  const source = "A😀\r\né\rZ\n\ud800Q\udc00";
  const starts = [12, 2, 4, 5, 7, 9, 10, 11, 1, 3, 0, 8, 6, 2];
  const positions = [
    [19, 4, 4],
    [4, 1, 3],
    [6, 2, 1],
    [7, 2, 1],
    [10, 3, 1],
    [12, 4, 1],
    [15, 4, 2],
    [16, 4, 3],
    [1, 1, 2],
    [5, 1, 4],
    [0, 1, 1],
    [11, 3, 2],
    [9, 2, 2],
    [4, 1, 3],
  ];
  const edits = starts.map((start) => ({
    start,
    end: start,
    replacement: "é",
  }));
  const records = changeRecords("a.md", source, edits, "link-fragment");
  assert.deepEqual(
    records.map((record) => [
      record.sourceByteStart,
      record.sourceLine,
      record.sourceColumn,
    ]),
    positions,
  );
  assert.ok(
    records.every(
      (record) =>
        record.kind === "link-fragment" &&
        record.beforeByteLength === 0 &&
        record.afterByteLength === 2,
    ),
  );
  assert.deepEqual(changeRecords("a.md", source, []), []);
});
