// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import { consumer } from "./helpers.js";
import { checkTrailingWhitespace } from "../src/whitespace.js";
import Ajv from "ajv";

const resultSchema = JSON.parse(
  readFileSync(
    new URL("../schemas/result.schema.json", import.meta.url),
    "utf8",
  ),
);
const validateResult = new Ajv({ strict: true }).compile(resultSchema);

test("space-based hard breaks are findings and format to explicit preserved breaks", async (t) => {
  for (const [input, expected] of [
    ["Alpha.  \nBeta.\n", "Alpha.\\\nBeta.\n"],
    ["Alpha.   \r\nBeta.\r\n", "Alpha.\\\r\nBeta.\r\n"],
    ["> Alpha.  \n> Beta.\n", "> Alpha.\\\n> Beta.\n"],
    ["- Alpha.  \n  Beta.\n", "- Alpha.\\\n  Beta.\n"],
  ]) {
    const root = consumer(t, { "a.md": input });
    const checked = await runQuality({ root });
    assert.equal(checked.preset, "authored-gfm@1");
    assert.ok(validateResult(checked), JSON.stringify(validateResult.errors));
    assert.equal(checked.exitCode, 1, JSON.stringify(checked));
    assert.deepEqual(checked.errors, []);
    assert.ok(
      checked.diagnostics.some((d) => d.rule === "trailing-whitespace"),
    );
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
    const formatted = await runQuality({ root, mode: "format" });
    assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
    assert.equal((await runQuality({ root })).exitCode, 0);
    assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
  }
});

test("the existing preset owns the strict policy and other presets fail closed", async (t) => {
  const input = "Alpha.  \nBeta.\n";
  const root = consumer(t, { "a.md": input }, { preset: "authored-gfm@1" });
  for (const mode of ["check", "inspect"]) {
    const result = await runQuality({ root, mode });
    assert.equal(
      result.exitCode,
      mode === "check" ? 1 : 0,
      JSON.stringify(result),
    );
    assert.equal(result.preset, "authored-gfm@1");
    assert.ok(validateResult(result), JSON.stringify(validateResult.errors));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
  }
  const unknownRoot = consumer(
    t,
    { "a.md": input },
    { preset: "authored-gfm@2" },
  );
  const rejected = await runQuality({ root: unknownRoot });
  assert.equal(rejected.exitCode, 2);
  assert.equal(rejected.errors[0].code, "INVALID_CONFIG");
  assert.ok(validateResult(rejected), JSON.stringify(validateResult.errors));
});

test("all selected non-code trailing whitespace receives exact locations", async (t) => {
  const input = "# Heading  \n\nAlpha.\t\n \t\n```text  \nbody  \n```  \n";
  const root = consumer(t, { "a.md": input, "b.md": "Beta. \n" });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.diagnostics
      .filter((d) => d.rule === "trailing-whitespace")
      .map(({ path, line, column }) => ({ path, line, column })),
    [
      { path: "a.md", line: 1, column: 10 },
      { path: "a.md", line: 3, column: 7 },
      { path: "a.md", line: 4, column: 1 },
      { path: "a.md", line: 5, column: 8 },
      { path: "a.md", line: 7, column: 4 },
      { path: "b.md", line: 1, column: 6 },
    ],
  );
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
  assert.equal((await runQuality({ root, mode: "format" })).exitCode, 0);
  assert.equal(
    readFileSync(join(root, "a.md"), "utf8"),
    "# Heading\n\nAlpha.\n\n```text\nbody  \n```\n",
  );
});

test("literal-sensitive inline code and HTML remain findings without destructive writes", async (t) => {
  for (const input of [
    "`first \nsecond`\n",
    "<pre>\nfirst  \nsecond\n</pre>\n",
    "<div>\nfirst  \n</div>\n",
  ]) {
    const root = consumer(t, { "a.md": input, "b.md": "Alpha. Beta.\n" });
    for (const mode of ["check", "format"]) {
      const result = await runQuality({ root, mode });
      assert.equal(result.exitCode, 1, JSON.stringify(result));
      assert.deepEqual(result.errors, []);
      assert.ok(
        result.diagnostics.some((d) => d.rule === "trailing-whitespace"),
      );
      assert.deepEqual(result.written, []);
      assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
      assert.equal(readFileSync(join(root, "b.md"), "utf8"), "Alpha. Beta.\n");
    }
  }
});

test("literal code bodies and explicit file exclusions remain supported", async (t) => {
  for (const input of [
    "```text\na  \n \t\n```\n",
    "    a  \n    b\t\n",
    "    first  \n\n    second  \n",
    "> ```text\n> a  \n>  \n> ```\n",
  ]) {
    const root = consumer(
      t,
      { "a.md": input, "upstream.md": "Alpha.  \nBeta.\n" },
      { exclude: ["upstream.md"] },
    );
    for (const mode of ["check", "format"]) {
      const result = await runQuality({ root, mode });
      assert.equal(result.exitCode, 0, JSON.stringify(result));
      assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
      assert.equal(
        readFileSync(join(root, "upstream.md"), "utf8"),
        "Alpha.  \nBeta.\n",
      );
    }
  }
});

test("unclosed fences retain literal whitespace while ordinary layout adds the closer", async (t) => {
  const input = "```text\na  \n";
  const root = consumer(t, { "a.md": input });
  const checked = await runQuality({ root });
  assert.equal(checked.exitCode, 1, JSON.stringify(checked));
  assert.deepEqual(
    checked.diagnostics.map((d) => d.rule),
    ["layout"],
  );
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "```text\na  \n```\n");
});

test("code-shaped literals cannot exempt real fence delimiters or surrounding prose", () => {
  for (const [input, lines] of [
    ["```text  \na  \n    ```   \n", [1]],
    ["```text  \na  \n``` \n", [1, 3]],
    [" ```text  \na  \n ``` \n", [1, 3]],
    ["  ```text  \na  \n  ``` \n", [1, 3]],
    ["   ```text  \na  \n   ``` \n", [1, 3]],
    ["> > ```text  \n> > a  \n> > ``` \n", [1, 3]],
    ["100. ```text  \n     a  \n     ``` \n", [1, 3]],
    ["    ```  \n    a  \n    ```  \n", []],
    ["Alpha. \rBeta.\t", [1, 2]],
  ]) {
    assert.deepEqual(
      checkTrailingWhitespace(input).map((d) => d.line),
      lines,
      input,
    );
  }
});

test("trimming beside an escaped slash must not manufacture a new hard break", async (t) => {
  const input = "Alpha.\\ \nBeta.\n";
  const root = consumer(t, { "a.md": input });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  assert.deepEqual(result.errors, []);
  assert.ok(result.diagnostics.some((d) => d.rule === "trailing-whitespace"));
  assert.deepEqual(result.written, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
});
