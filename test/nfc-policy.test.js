// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality, inspectSelection } from "../src/quality.js";
import { admitCheckEvidence } from "../src/result-validation.js";
import { consumer } from "./helpers.js";

// Independent decomposed spellings; the composed forms are written separately.
const decomposed = "Café";
// Presentation drift in table fixtures is the separate formatter rule.
const rules = (report) =>
  report.diagnostics
    .filter((d) => d.source !== "formatter")
    .map((d) => `${d.path}:${d.line}:${d.column}:${d.rule}`);

test("decomposed prose fails ordinary check in every declared prose context", async (t) => {
  const files = {
    "paragraph.md": `# Title\n\n${decomposed} opens.\n`,
    "heading.md": `# ${decomposed}\n`,
    "table.md": `# Title\n\n| Name | Note |\n| ---- | ---- |\n| ${decomposed} | x |\n`,
    "label.md": `# Title\n\nSee [${decomposed}](paragraph.md).\n`,
    "alt.md": `# Title\n\n![${decomposed} sign](paragraph.md)\n`,
    "reference-alt.md": `# Title\n\n![${decomposed}][sign]\n\n[sign]: paragraph.md\n`,
    "entity.md": "# Title\n\nCafe&#x301; opens.\n",
    "split.md": "# Title\n\nCafe*́* opens.\n",
  };
  const root = consumer(t, files);
  const report = await runQuality({ root });
  assert.equal(report.exitCode, 1);
  assert.equal(report.strict, false);
  assert.deepEqual(rules(report).sort(), [
    "alt.md:3:1:quality/non-nfc-prose",
    "entity.md:3:1:quality/non-nfc-prose",
    "heading.md:1:3:quality/non-nfc-prose",
    "label.md:3:6:quality/non-nfc-prose",
    "paragraph.md:3:1:quality/non-nfc-prose",
    "reference-alt.md:3:1:quality/non-nfc-prose",
    "split.md:3:1:quality/non-nfc-prose",
    "table.md:5:3:quality/non-nfc-prose",
  ]);
  assert.ok(report.diagnostics.every((d) => d.severity === "error"));
  assert.match(report.diagnostics[0].message, /run normalize/u);
  assert.equal(typeof report.runtime.unicode, "string");
});

test("literal and identifier contexts are outside the NFC prose population", async (t) => {
  const root = consumer(t, {
    "a.md": [
      "---",
      `title: ${decomposed}`,
      "---",
      "",
      "# Title",
      "",
      `Use \`${decomposed}\` and <span title="${decomposed}">x</span>.`,
      "",
      "```text",
      decomposed,
      "```",
      "",
      `See [target](${encodeURI("b.md")}).`,
      "",
    ].join("\n"),
    "b.md": "# B\n",
  });
  const report = await runQuality({ root });
  assert.equal(report.exitCode, 0, JSON.stringify(report.diagnostics));
});

test("format preserves decomposed prose and reports it as the only allowed residual", async (t) => {
  const source = `# Title\n\n*   ${decomposed} item\n`;
  const root = consumer(t, { "a.md": source });
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted.diagnostics));
  assert.equal(formatted.operationStatus, "completed");
  assert.equal(formatted.qualityStatus, "findings");
  assert.equal(formatted.qualityBasis, "applied");
  assert.deepEqual(formatted.writtenPaths, ["a.md"]);
  assert.deepEqual(rules(formatted), ["a.md:3:3:quality/non-nfc-prose"]);
  const bytes = readFileSync(join(root, "a.md"), "utf8");
  assert.equal(bytes, `# Title\n\n- ${decomposed} item\n`);
  assert.ok(bytes.includes("é"), "format must not normalize Unicode");
  // A successful repair is not check evidence, and check still fails for NFC.
  assert.throws(
    () => admitCheckEvidence(formatted),
    /complete read-only check/u,
  );
  const checked = await runQuality({ root });
  assert.equal(checked.exitCode, 1);
  assert.deepEqual(rules(checked), ["a.md:3:3:quality/non-nfc-prose"]);
  assert.equal(admitCheckEvidence(checked), checked);
  // Strict mode still admits only that residual; other warnings keep blocking.
  const strict = await runQuality({ root, mode: "format", strict: true });
  assert.equal(strict.exitCode, 0);
});

test("unrelated blockers still refuse a format that would otherwise only leave NFC", async (t) => {
  const root = consumer(t, {
    "a.md": `# Title\n\n*   ${decomposed} item\n`,
    "b.md": "# B\n\nSee [missing](missing.md).\n",
  });
  const before = readFileSync(join(root, "a.md"), "utf8");
  const report = await runQuality({ root, mode: "format" });
  assert.equal(report.exitCode, 1);
  assert.equal(report.operationStatus, "refused");
  assert.deepEqual(report.writtenPaths, []);
  assert.ok(report.documentResults.every((r) => r.writeStatus === "refused"));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), before);
});

test("an explicit NFC override is legal, inspectable and not the default", async (t) => {
  const root = consumer(
    t,
    { "a.md": `# Title\n\n${decomposed} opens.\n` },
    { lint: { "quality/non-nfc-prose": "off" } },
  );
  const checked = await runQuality({ root });
  assert.equal(checked.exitCode, 0);
  const inspected = await inspectSelection({ root });
  assert.equal(inspected.configuration.lint["quality/non-nfc-prose"], "off");
  const warned = consumer(
    t,
    { "a.md": `# Title\n\n${decomposed} opens.\n` },
    { lint: { "quality/non-nfc-prose": "warn" } },
  );
  assert.equal((await runQuality({ root: warned })).exitCode, 0);
  assert.equal((await runQuality({ root: warned, strict: true })).exitCode, 1);
});

test("stronger link, heading and URL defaults keep questions and autolinks legal", async (t) => {
  const root = consumer(t, {
    "a.md": [
      "# Title",
      "",
      "## Why use it?",
      "",
      "Read <https://example.test/autolink> for details.",
      "",
      "| Topic | Link |",
      "| ----- | ---- |",
      "| Docs | [learn more](b.md) |",
      "",
    ].join("\n"),
    "b.md":
      "# Overview.\n\nVisit https://example.test/bare now.\n\n## Part\n\n## Part\n",
  });
  const report = await runQuality({ root });
  const found = report.diagnostics
    .filter((d) => d.source !== "formatter")
    .map((d) => [d.path, d.line, d.rule, d.severity]);
  assert.deepEqual(found, [
    ["a.md", 9, "quality/generic-link-text", "error"],
    ["b.md", 1, "quality/heading-trailing-punctuation", "warning"],
    ["b.md", 3, "markdown/no-bare-urls", "error"],
    ["b.md", 7, "quality/duplicate-sibling-heading", "error"],
  ]);
  assert.equal(report.exitCode, 1);
});

// Hand-authored vectors with independently stated NFC results. They cover
// composition, Hangul, canonical reordering and singleton decompositions that
// produce ASCII punctuation; supported runtimes must agree before release.
const vectors = [
  ["0065 0301", "00E9"],
  ["1100 1161 11A8", "AC01"],
  ["0061 0302 0323", "1EAD"],
  ["212B", "00C5"],
  ["037E", "003B"],
  ["1FEF", "0060"],
  ["00E9", "00E9"],
];
const text = (hex) =>
  String.fromCodePoint(...hex.split(" ").map((part) => parseInt(part, 16)));

test("the runtime normalization primitive matches the reviewed vector corpus", async (t) => {
  for (const [input, expected] of vectors)
    assert.equal(
      text(input).normalize("NFC"),
      text(expected),
      `${input} -> ${expected} on ICU ${process.versions.icu}`,
    );
  const root = consumer(
    t,
    Object.fromEntries(
      vectors.map(([input], index) => [
        `v${index}.md`,
        `# Title\n\nValue ${text(input)} here.\n`,
      ]),
    ),
  );
  const report = await runQuality({ root });
  assert.deepEqual(
    report.diagnostics
      .filter((d) => d.rule === "quality/non-nfc-prose")
      .map((d) => d.path),
    ["v0.md", "v1.md", "v2.md", "v3.md", "v4.md", "v5.md"],
  );
});
