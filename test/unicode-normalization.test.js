// SPDX-License-Identifier: AGPL-3.0-only
// Official Unicode NormalizationTest.txt conformance for the runtime primitive and for
// this package's NFC checker and source-aware normalizer. Expected NFC values come
// from the official columns, never from the implementation under test. Fixtures are
// the unchanged Unicode data files (Unicode License V3, see the adjacent license).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { checkQualityRules } from "../src/quality-diagnostics.js";
import { prepareNormalization } from "../src/normalization.js";
import { collectProse, proseValue } from "../src/prose-runs.js";
import { parse } from "../src/analysis.js";

const directory = new URL("./fixtures/unicode/", import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL("normalization-tests.json", directory), "utf8"),
);

function load(entry) {
  const bytes = gunzipSync(readFileSync(new URL(entry.fixture, directory)));
  assert.equal(bytes.length, entry.bytes, entry.fixture);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    entry.sha256,
    entry.fixture,
  );
  return bytes.toString("utf8");
}

const text = (field) =>
  String.fromCodePoint(
    ...field
      .trim()
      .split(" ")
      .map((hex) => parseInt(hex, 16)),
  );

/** Parse official lines: c1 source, c2 NFC, c3 NFD, c4 NFKC, c5 NFKD. */
function parseTests(data) {
  const cases = [];
  let part;
  for (const line of data.split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body) continue;
    if (body.startsWith("@")) {
      part = body;
      continue;
    }
    const fields = body.split(";").slice(0, 5).map(text);
    assert.equal(fields.length, 5, line);
    cases.push({ part, fields });
  }
  return cases;
}

test("official normalization fixtures are the unchanged Unicode data files", () => {
  assert.deepEqual(
    manifest.map((entry) => entry.unicodeVersion),
    ["16.0.0", "17.0.0"],
  );
  for (const entry of manifest) {
    const data = load(entry);
    assert.ok(
      data.startsWith(`# NormalizationTest-${entry.unicodeVersion}.txt\n`),
      entry.fixture,
    );
    assert.match(data, /^@Part1 /mu);
  }
});

// Supported Node lines bundle different ICU releases: 22.13.0 has Unicode 16.0, and
// the latest 22.x, 24.x and 26.x have Unicode 17.0. A runtime must match a fixture.
const runtimeUnicode = process.versions.unicode;
const entry = manifest.find(
  (candidate) => candidate.unicodeVersion === `${runtimeUnicode}.0`,
);

test(`runtime NFC conforms to official Unicode ${runtimeUnicode} tests (ICU ${process.versions.icu})`, () => {
  assert.ok(
    entry,
    `No official normalization fixture for Unicode ${runtimeUnicode}; add the matching NormalizationTest file.`,
  );
  const cases = parseTests(load(entry));
  const part1 = new Set();
  for (const { part, fields } of cases) {
    const [c1, c2, c3, c4, c5] = fields;
    if (part.startsWith("@Part1")) part1.add(c1.codePointAt(0));
    assert.equal(c1.normalize("NFC"), c2);
    assert.equal(c2.normalize("NFC"), c2);
    assert.equal(c3.normalize("NFC"), c2);
    assert.equal(c4.normalize("NFC"), c4);
    assert.equal(c5.normalize("NFC"), c4);
  }
  assert.ok(part1.size > 10_000);
  // Every code point not listed in Part 1 is unchanged by normalization.
  for (let code = 0; code <= 0x10ffff; code++) {
    if ((code >= 0xd800 && code <= 0xdfff) || part1.has(code)) continue;
    const character = String.fromCodePoint(code);
    if (character.normalize("NFC") !== character)
      assert.fail(`U+${code.toString(16).toUpperCase()} changed under NFC`);
  }
});

test(`the NFC checker and normalizer agree with every official Unicode ${runtimeUnicode} string in prose`, () => {
  assert.ok(
    entry,
    `No official normalization fixture for Unicode ${runtimeUnicode}.`,
  );
  // Each distinct official string with its official NFC form (c2 for c1-c3, c4 for c4-c5).
  const expected = new Map();
  for (const { fields } of parseTests(load(entry))) {
    const [c1, c2, c3, c4, c5] = fields;
    for (const [value, nfc] of [
      [c1, c2],
      [c2, c2],
      [c3, c2],
      [c4, c4],
      [c5, c4],
    ]) {
      assert.equal(expected.get(value) ?? nfc, nfc);
      expected.set(value, nfc);
    }
  }
  const strings = [...expected.keys()];
  // ASCII punctuation is escaped so each string is literal prose in its paragraph.
  const escape = (value) =>
    [...value]
      .map((character) =>
        /[!-/:-@[-`{-~]/u.test(character) ? "\\" + character : character,
      )
      .join("");
  const config = {
    lint: { "quality/non-nfc-prose": "error" },
    analyzerLimits: {
      maxDocumentDiagnostics: null,
      maxDiagnosticJsonBytes: null,
    },
  };
  const syntax = { frontmatter: false };
  let changed = 0;
  for (let start = 0; start < strings.length; start += 2000) {
    const group = strings.slice(start, start + 2000);
    const source =
      group.map((value) => `Value ${escape(value)} end.`).join("\n\n") + "\n";
    const flagged = new Set(
      checkQualityRules(source, config).map((diagnostic) => diagnostic.line),
    );
    group.forEach((value, index) =>
      assert.equal(
        flagged.has(index * 2 + 1),
        value !== expected.get(value),
        `detection of ${[...value].map((c) => c.codePointAt(0).toString(16)).join(" ")}`,
      ),
    );
    const result = prepareNormalization(source, syntax);
    assert.deepEqual(result.refusals, [], `refusals in batch at ${start}`);
    const values = collectProse(parse(result.output, syntax)).map(proseValue);
    assert.equal(values.length, group.length);
    group.forEach((value, index) => {
      assert.equal(values[index], `Value ${expected.get(value)} end.`);
      if (value !== expected.get(value)) changed++;
    });
    // Source-level idempotence: a second pass proposes no edits.
    assert.equal(prepareNormalization(result.output, syntax).edits.length, 0);
  }
  assert.ok(changed > 10_000, `only ${changed} official strings needed repair`);
});
