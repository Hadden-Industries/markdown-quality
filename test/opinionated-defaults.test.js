// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
test("inline HTML anchors keep a continued list paragraph intact through literal protection", async (t) => {
  const input =
    '- <a id="test"></a> **`ID` Label.**\n  Verify baseline.\n\n- <a id="next"></a> **`NEXT` Label.**\n  Verify baseline.\n';
  const root = consumer(t, { "a.md": input });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 0, JSON.stringify(result.errors));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
  assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
});
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { runQuality } from "../src/quality.js";
import { loadConfiguration } from "../src/configuration.js";
import { createLinter } from "../src/analysis.js";
import { parse } from "../src/analysis.js";
import { consumer } from "./helpers.js";
import markdown from "@eslint/markdown";
import { checkAdvisories } from "../src/advisory-diagnostics.js";
import { formatDocument } from "../src/formatting.js";
import { resolveTool } from "../src/native-tool.js";

test("current configurations inspect explicit replacement defaults and report schema 3", async (t) => {
  const root = consumer(t);
  const result = await runQuality({ root, mode: "inspect", files: [] });
  assert.equal(result.exitCode, 0);
  assert.equal(result.schemaVersion, 3);
  assert.equal(result.preset, "authored-gfm@1");
  assert.equal(result.configuration.layout.endOfLine, "lf");
  assert.equal(result.configuration.syntax.frontmatter, "yaml");
  const native = await createLinter(
    loadConfiguration({ root }),
  ).calculateConfigForFile(join(root, "a.md"));
  assert.deepEqual(native.rules["markdown/fenced-code-language"], [
    2,
    { required: [] },
  ]);
  assert.deepEqual(native.rules["markdown/heading-increment"], [
    2,
    { frontmatterTitle: "(?!)" },
  ]);
  assert.equal(native.languageOptions.frontmatter, "yaml");
  const schema = JSON.parse(
    readFileSync(new URL("../schemas/result.schema.json", import.meta.url)),
  );
  const validate = new Ajv({ strict: true }).compile(schema);
  assert.equal(validate(result), true, JSON.stringify(validate.errors));
});

test("LF applies only to physical separators while all other YAML, HTML and code content survives", async (t) => {
  const source =
    "---\n# metadata comment\ntitle: A\nscalar: |\n  One. Two.  \n\n  e\u0301 \\r\\n\n---\n\n# A\n\n<pre>\nraw  \n\n</pre>\n\n```text\nfirst  \n\t\n\\r\\n\n```\n";
  for (const eol of ["\n", "\r\n", "\r"]) {
    const root = consumer(t, { "a.md": source.replaceAll("\n", eol) });
    const result = await runQuality({ root, mode: "format" });
    assert.equal(result.exitCode, 0, JSON.stringify(result));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), source);
    const again = await runQuality({ root, mode: "format" });
    assert.equal(again.exitCode, 0, JSON.stringify(again));
    assert.deepEqual(again.written, []);
  }
});

test("warning format admits writes ordinarily and strict prevents the whole batch", async (t) => {
  const root = consumer(t, {
    "a.md": "# A\n\n## Same\n\n## Same\n",
    "b.md": "# B\n\n_text_\n",
  });
  const blocked = await runQuality({ root, mode: "format", strict: true });
  assert.equal(blocked.exitCode, 1, JSON.stringify(blocked));
  assert.deepEqual(blocked.written, []);
  assert.ok(
    blocked.diagnostics.some(
      (d) =>
        d.rule === "quality/duplicate-sibling-heading" &&
        d.severity === "warning",
    ),
  );
  const admitted = await runQuality({ root, mode: "format" });
  assert.equal(admitted.exitCode, 0, JSON.stringify(admitted));
  assert.equal(admitted.outcome, "findings");
  assert.ok(admitted.written.includes("b.md"));
  assert.equal(readFileSync(join(root, "b.md"), "utf8"), "# B\n\n*text*\n");
});

test("canonical style covers headings, emphasis, numbering, tasks, safe fences and hard breaks", async (t) => {
  const input =
    "Title\n=====\n\n## Sub ##\n\n_text_ and __strong__.  \nNext.\n\n7) Seven\n7) Eight\n\n+ [X] Done\n\n~~~text\nvalue\n```\n~~~\n";
  const expected =
    "# Title\n\n## Sub\n\n*text* and **strong**.\\\nNext.\n\n7. Seven\n8. Eight\n\n- [x] Done\n\n````text\nvalue\n```\n````\n";
  const root = consumer(t, { "a.md": input });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
  const again = await runQuality({ root, mode: "format" });
  assert.equal(again.exitCode, 0, JSON.stringify(again));
  assert.deepEqual(again.written, []);
});

test("indented code converts without guessing a language and blocks all writes", async (t) => {
  const original = "# A\n\n    exact  \n    value\n";
  const root = consumer(t, { "a.md": original, "b.md": "_prose_\n" });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  assert.ok(
    result.diagnostics.some((d) => d.rule === "markdown/fenced-code-language"),
  );
  assert.deepEqual(result.written, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), original);
});

test("info survives strict, editorial literals stay excluded, hierarchy errors block", async (t) => {
  const root = consumer(t, {
    "a.md":
      "# Question?\n\n## Punctuation.\n\ne\u0301 prose.\n\n```text\ne\u0301\n```\n",
  });
  const result = await runQuality({ root, strict: true });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(
    result.diagnostics.map((d) => [d.rule, d.line]),
    [
      ["quality/heading-trailing-punctuation", 3],
      ["quality/non-nfc-prose", 5],
    ],
  );
  const invalid = consumer(t, { "a.md": "# A\n\n### Skip\n" });
  const blocked = await runQuality({ root: invalid, mode: "format" });
  assert.equal(blocked.exitCode, 1, JSON.stringify(blocked));
  assert.ok(
    blocked.diagnostics.some((d) => d.rule === "markdown/heading-increment"),
  );
});

test("mixed EOL, Unicode separators and explicit file-level overrides", async (t) => {
  const source =
    "# A\r\n\r```text\nvalue\u0085\u2028\u2029 \\u000d  \r\n\r```\n";
  const expected = source.replace(/\r\n|\r/gu, "\n");
  for (const endOfLine of ["lf", "crlf", "preserve"]) {
    const root = consumer(t, { "a.md": source }, { layout: { endOfLine } });
    const result = await runQuality({ root, mode: "format" });
    assert.equal(result.exitCode, 0, JSON.stringify(result));
    assert.equal(
      readFileSync(join(root, "a.md"), "utf8"),
      endOfLine === "lf" ? expected : expected.replaceAll("\n", "\r\n"),
    );
  }
});

test("front matter selection has consistent native and literal recognition", async (t) => {
  for (const [frontmatter, metadata] of [
    ["yaml", "---\n# comment\ntitle: A  \n---"],
    ["toml", "+++\n# comment\ntitle = 'A'  \n+++"],
    ["json", '---\n{\n  "title": "A"  \n}\n---'],
  ]) {
    const source = metadata + "\n\n# A\n";
    const root = consumer(t, { "a.md": source }, { syntax: { frontmatter } });
    assert.equal(parse(source, { frontmatter }).children[0].type, frontmatter);
    const formatted = await runQuality({ root, mode: "format" });
    assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), source);
    const standalone = await formatDocument(
      source,
      loadConfiguration({ root }),
      resolveTool(),
    );
    assert.equal(standalone.output, source);
    assert.deepEqual(standalone.diagnostics, []);
  }
  const body = "# A\n\n---\n\nBody.\n";
  assert.equal(parse(body).children[1].type, "thematicBreak");
});

test("drifting checks defer native structural findings and preserve source coordinates", async (t) => {
  const source = "Title\n=====\n\n### Jump\n";
  const root = consumer(t, { "a.md": source });
  const checked = await runQuality({ root });
  assert.equal(checked.exitCode, 1);
  assert.ok(!checked.diagnostics.some((d) => d.source === "eslint"));
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 1);
  assert.ok(
    formatted.diagnostics.some(
      (d) => d.rule === "markdown/heading-increment" && d.line === 3,
    ),
  );
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), source);
});

test("nested numbering across digit widths and indented conversions preserve list meaning", async (t) => {
  for (const [source, expected] of [
    [
      "> 9. _Nine_.\n> 9. Ten.\n>    Continuation.\n",
      "> 9. *Nine*.\n> 10. Ten.\n>     Continuation.\n",
    ],
    [">     exact  \n>     value\n", "> ```\n> exact  \n> value\n> ```\n"],
    [
      "- Item\n\n      exact  \n      value\n",
      "- Item\n\n  ```\n  exact  \n  value\n  ```\n",
    ],
  ]) {
    const root = consumer(
      t,
      { "a.md": source },
      { lint: { "markdown/fenced-code-language": "off" } },
    );
    const formatted = await runQuality({ root, mode: "format" });
    assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
    assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
  }
});

test("native recommendations cannot add package rules and inspection exposes their options", async (t) => {
  const root = consumer(t);
  const recommended = markdown.configs.recommended;
  markdown.configs.recommended = {
    rules: {
      "markdown/no-bare-urls": "error",
      "markdown/invented-rule": "error",
    },
  };
  t.after(() => {
    markdown.configs.recommended = recommended;
  });
  const result = await runQuality({ root, mode: "inspect", files: [] });
  assert.equal(result.policy.formatter.endOfLine, "lf");
  assert.equal(result.policy.formatter.embeddedLanguageFormatting, "off");
  assert.deepEqual(result.policy.sentence, {
    format: "markdown",
    max_width: 0,
    clause_breaks: false,
  });
  assert.equal(result.policy.lint["markdown/no-bare-urls"], "off");
  assert.equal(result.policy.lint["markdown/no-duplicate-headings"], undefined);
  assert.equal(result.policy.lint["markdown/invented-rule"], undefined);
  const native = await createLinter(
    loadConfiguration({ root }),
  ).calculateConfigForFile(join(root, "a.md"));
  assert.equal(native.rules["markdown/no-bare-urls"][0], 0);
  assert.equal(native.rules["markdown/invented-rule"], undefined);
  assert.deepEqual(result.policy.lint["markdown/table-column-count"], [
    "error",
    { checkMissingCells: true },
  ]);
});

test("multiline headings and first-block list literals preserve meaning", async (t) => {
  for (const [source, expected] of [
    [
      "First line\nsecond _line_\n===========\n",
      "# First line second *line*\n",
    ],
    [
      "Heading `first  \nsecond`\n========================\n",
      "# Heading `first   second`\n",
    ],
    [
      "> First line\n> second line\n> ===========\n",
      "> # First line second line\n",
    ],
    ["-     exact  \n      value\n", "- ```\n  exact  \n  value\n  ```\n"],
  ]) {
    const root = consumer(
      t,
      { "a.md": source },
      { lint: { "markdown/fenced-code-language": "off" } },
    );
    const result = await runQuality({ root, mode: "format" });
    assert.equal(result.exitCode, 0, JSON.stringify(result));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
    assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
  }
  const root = consumer(t, { "a.md": "1. First\n\n1) Second\n" });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 2);
  assert.match(result.errors[0].message, /adjacent ordered lists/u);
  assert.equal(
    readFileSync(join(root, "a.md"), "utf8"),
    "1. First\n\n1) Second\n",
  );
});

test("strict failure identity and informational line positions remain accurate", async (t) => {
  const root = consumer(t, {}, { schemaVersion: 99 });
  const failed = await runQuality({ root, strict: true });
  assert.equal(failed.exitCode, 2);
  assert.equal(failed.strict, true);
  for (const options of [{ mode: "invalid" }, { concurrency: 0 }]) {
    const invalid = await runQuality({ root, strict: true, ...options });
    assert.equal(invalid.exitCode, 2);
    assert.equal(invalid.strict, true);
  }
  const config = { lint: {} };
  assert.deepEqual(checkAdvisories("x".repeat(120) + "\n", config), []);
  const source =
    "[Long](https://example.invalid/" +
    "x".repeat(200) +
    ") " +
    "😀".repeat(120) +
    "x\n";
  const findings = checkAdvisories(source, config);
  assert.deepEqual(
    findings.map(({ rule, line, column }) => [rule, line, column]),
    [["quality/long-prose-line", 1, source.indexOf("😀") + 239]],
  );
  const linkHeavy = "[a](https://example.invalid/x)".repeat(10000) + "\n";
  assert.deepEqual(checkAdvisories(linkHeavy, config), []);
});

test("editorial scope excludes literal width and separates sibling parents", async (t) => {
  const long = "Word ".repeat(25).trim() + ".";
  const url = "https://example.invalid/" + "x".repeat(160);
  const source = `# A\n\n## One\n\n### Same\n\n## Two\n\n### Same\n\n${long}\n\n${url}\n\n[click here](https://example.invalid)\n\n\`\`\`text\n${long}\n\`\`\`\n`;
  const root = consumer(t, { "a.md": source });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(
    result.diagnostics.map((d) => [d.rule, d.line, d.severity]),
    [
      ["quality/long-prose-line", 11, "info"],
      ["quality/generic-link-text", 15, "warning"],
    ],
  );
  const strict = await runQuality({ root, strict: true });
  assert.equal(strict.exitCode, 1);
});

test("native info overrides and disabled advisories retain accurate severities", async (t) => {
  for (const severity of ["off", "info", "warn", "error"]) {
    const root = consumer(
      t,
      { "a.md": "# A\n\n### Jump\n" },
      { lint: { "markdown/heading-increment": severity } },
    );
    const ordinary = await runQuality({ root, mode: "format" });
    assert.equal(
      ordinary.exitCode,
      severity === "error" ? 1 : 0,
      JSON.stringify(ordinary),
    );
    if (severity !== "off")
      assert.equal(
        ordinary.diagnostics[0].severity,
        severity === "warn" ? "warning" : severity,
      );
    const strict = await runQuality({ root, strict: true });
    assert.equal(
      strict.exitCode,
      ["warn", "error"].includes(severity) ? 1 : 0,
      JSON.stringify(strict),
    );
  }
});
