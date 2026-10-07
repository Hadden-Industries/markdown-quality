// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, linkSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import { consumer } from "./helpers.js";
import { limits } from "../src/contracts.js";
test("opt-in concurrency preserves real native findings, exact formatted bytes and convergence", async (t) => {
  const files = {
    "a.md": "# Heading\n\nAlpha. Beta.\n",
    "b.md": "> 1. First.\n>    Continuation.\n> 2. Second.\n",
    "c.md": "```diff\n first  \n \n```\n",
    "d.md": "[Local](a.md)\n",
  };
  const serialRoot = consumer(t, files),
    parallelRoot = consumer(t, files);
  const serial = await runQuality({ root: serialRoot });
  const parallel = await runQuality({ root: parallelRoot, concurrency: 2 });
  assert.deepEqual(parallel, serial);
  for (const [file, bytes] of Object.entries(files))
    assert.equal(readFileSync(join(parallelRoot, file), "utf8"), bytes);
  const serialFormat = await runQuality({ root: serialRoot, mode: "format" });
  const parallelFormat = await runQuality({
    root: parallelRoot,
    mode: "format",
    concurrency: 2,
  });
  assert.equal(serialFormat.exitCode, 0, JSON.stringify(serialFormat));
  assert.deepEqual(parallelFormat, serialFormat);
  for (const file of Object.keys(files))
    assert.deepEqual(
      readFileSync(join(parallelRoot, file)),
      readFileSync(join(serialRoot, file)),
    );
  assert.deepEqual(
    (await runQuality({ root: parallelRoot, mode: "format", concurrency: 2 }))
      .written,
    [],
  );
});

test("concurrent validation still blocks all writes on a real missing local target", async (t) => {
  const files = {
    "a.md": "Alpha. Beta.\n",
    "b.md": "[Missing](missing.md)\n",
    "c.md": "Gamma.\n",
  };
  const root = consumer(t, files);
  const result = await runQuality({ root, mode: "format", concurrency: 2 });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  assert.ok(
    result.diagnostics.some((diagnostic) => diagnostic.path === "b.md"),
  );
  assert.deepEqual(result.written, []);
  for (const [file, bytes] of Object.entries(files))
    assert.equal(readFileSync(join(root, file), "utf8"), bytes);
});
test("real native wrapping preserves inline-code meaning and reaches a fixed point", async (t) => {
  const input =
    "> While `GameplayActivationState != Active`, every provisional or residual Temperature Limit gameplay patch is behaviorally neutral.\n";
  const expected =
    "> While `GameplayActivationState !=\nActive`, every provisional or residual Temperature Limit gameplay patch is behaviorally neutral.\n";
  const root = consumer(t, { "a.md": input });
  const checked = await runQuality({ root });
  assert.equal(checked.exitCode, 1, JSON.stringify(checked));
  assert.deepEqual(checked.errors, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), input);
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), expected);
  assert.equal((await runQuality({ root })).exitCode, 0);
  assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
});
test("valid fenced examples retain whitespace-only lines and trailing literal spaces through real checks and formatting", async (t) => {
  for (const text of [
    "```diff\n first\n \n second  \n```\n",
    "```python\ndef sample():\n    pass\n    \n    return 1  \n```\n",
    "```diff\r\n first\r\n \r\n second  \r\n```\r\n",
    "> ```diff\n>  first\n>  \n>  second  \n> ```\n",
  ]) {
    const root = consumer(t, { "a.md": text });
    const checked = await runQuality({ root });
    assert.equal(checked.exitCode, 0, JSON.stringify(checked));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), text);
    const formatted = await runQuality({ root, mode: "format" });
    assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
    assert.equal(readFileSync(join(root, "a.md"), "utf8"), text);
    assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
  }
});
test("real native chain checks read-only, formats independently chosen bytes and converges", async (t) => {
  const root = consumer(t, { "a.md": "# Heading\n\nAlpha. Beta.\n" });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  assert.equal(
    readFileSync(join(root, "a.md"), "utf8"),
    "# Heading\n\nAlpha. Beta.\n",
  );
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
  assert.equal(
    readFileSync(join(root, "a.md"), "utf8"),
    "# Heading\n\nAlpha.\nBeta.\n",
  );
  const second = await runQuality({ root, mode: "format" });
  assert.equal(second.exitCode, 0);
  assert.deepEqual(second.written, []);
  assert.equal((await runQuality({ root })).exitCode, 0);
});
test("selection honors native ignore negation, exclusions, Unicode and literal brackets", async (t) => {
  const root = consumer(
    t,
    {
      "a.md": "Alpha.\n",
      "ignored/no.md": "Alpha.\n",
      "ignored/yes.md": "Alpha.\n",
      "résumé [1].md": "Alpha.\n",
      "retained/a.md": "Alpha.\n",
      ".gitignore": "ignored/*.md\n!ignored/yes.md\n",
    },
    { exclude: ["retained/**"] },
  );
  const result = await runQuality({ root, mode: "inspect" });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(result.selection.files, [
    "a.md",
    "ignored/yes.md",
    "résumé [1].md",
  ]);
  const literal = await runQuality({
    root,
    mode: "inspect",
    files: ["résumé [1].md"],
  });
  assert.deepEqual(literal.selection.files, ["résumé [1].md"]);
});
test("structure, fragments, labels, tables and local links use maintained analysis", async (t) => {
  const root = consumer(t, {
    "a.md":
      "# Heading\n\n### Jump\n\n[Missing](absent.md)\n\n[Bad](#absent)\n\n[Label][undefined]\n\n| A | B |\n| - | - |\n| 1 | 2 | 3 |\n",
  });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 1, JSON.stringify(result));
  for (const rule of [
    "markdown/heading-increment",
    "markdown/no-missing-link-fragments",
    "markdown/no-missing-label-refs",
    "markdown/table-column-count",
    "local-target",
  ])
    assert.ok(
      result.diagnostics.some((d) => d.rule === rule),
      rule + JSON.stringify(result),
    );
});
test("candidate validation blocks all writes when any local target is missing", async (t) => {
  const root = consumer(t, {
    "a.md": "Alpha. Beta.\n",
    "b.md": "[Missing](absent.md)\n",
  });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.written, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Alpha. Beta.\n");
});
test("links classify encoded filenames and schemes without fetching", async (t) => {
  const root = consumer(t, {
    "a.md":
      "[File](résumé%20%5B1%5D.txt)\n\n![Image](image.png)\n\n[Remote](https://example.invalid)\n\n[Email](mailto:author@example.invalid)\n",
    "résumé [1].txt": "literal",
    "image.png": "image",
  });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  writeFileSync(join(root, "a.md"), "[Escape](../outside.txt)\n");
  const bad = await runQuality({ root });
  assert.ok(bad.diagnostics.some((d) => d.rule === "local-target"));
});
test("hard links reject formatting; linked parents cannot become explicit input", async (t) => {
  const root = consumer(t, { "a.md": "Alpha. Beta.\n" });
  linkSync(join(root, "a.md"), join(root, "copy.md"));
  const result = await runQuality({ root, mode: "format", files: ["a.md"] });
  assert.equal(result.exitCode, 2);
  assert.equal(result.errors[0].code, "HARD_LINK");
  symlinkSync(root, join(root, "linked"), "junction");
  const link = await runQuality({ root, files: ["linked/a.md"] });
  assert.equal(link.exitCode, 2);
  assert.equal(link.errors[0].code, "UNSAFE_PATH");
});
test("literal code, explicit hard breaks, HTML, tasks and nested quotes remain exact", async (t) => {
  const text =
    '# Heading\n\n```js\nconst text = "Alpha. Beta.";\n```\n\n`Alpha. Beta.`\n\nAlpha.\\\nBeta.\n\n<div>Alpha. Beta.</div>\n\n- [x] Task.\n\n> Quote.\n>\n> > Nested.\n';
  const root = consumer(t, { "a.md": text });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), text);
});
test("consumer JS and native configs cannot execute or change policy", async (t) => {
  const root = consumer(t, {
    "a.md": "Alpha. Beta.\n",
    "prettier.config.js": 'throw new Error("consumer JS executed")',
    "eslint.config.js": 'throw new Error("consumer JS executed")',
    ".snapperrc.toml": "clause_breaks = true\nmax_width = 8\n",
  });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Alpha.\nBeta.\n");
});
test("single-star selection stays at root while globstar includes only the configured subtree", async (t) => {
  const root = consumer(
    t,
    {
      "a.md": "Alpha.\n",
      "docs/deep/a.md": "Alpha.\n",
      "retained/a.md": "Alpha. Beta.\n",
    },
    { include: ["*.md", "docs/**/*.md"] },
  );
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(result.selection.files, ["a.md", "docs/deep/a.md"]);
  assert.equal(
    readFileSync(join(root, "retained/a.md"), "utf8"),
    "Alpha. Beta.\n",
  );
});
test("check detects BOM removal and agrees with subsequent formatting bytes", async (t) => {
  const bytes = Buffer.from("\uFEFFAlpha.\n");
  const root = consumer(t, { "a.md": bytes });
  const check = await runQuality({ root });
  assert.equal(check.exitCode, 1, JSON.stringify(check));
  assert.deepEqual(readFileSync(join(root, "a.md")), bytes);
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
  assert.deepEqual(formatted.written, ["a.md"]);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Alpha.\n");
  assert.equal((await runQuality({ root })).exitCode, 0);
});
test("severity-only overrides preserve the preset's allowed alert labels", async (t) => {
  const root = consumer(
    t,
    { "a.md": "> [!NOTE]\n> Alpha.\n" },
    { lint: { "markdown/no-missing-label-refs": "warn" } },
  );
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
});
test("excessive local-link diagnostics fail within the output budget without writes", async (t) => {
  const text =
    Array.from(
      { length: limits.documentDiagnostics + 1 },
      () => "[x](missing)",
    ).join("\n\n") + "\n";
  const root = consumer(t, { "a.md": text });
  const result = await runQuality({ root, mode: "format" });
  assert.equal(result.exitCode, 2, JSON.stringify(result).slice(0, 500));
  assert.equal(result.errors[0].code, "DIAGNOSTIC_LIMIT");
  assert.deepEqual(result.written, []);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < limits.diagnosticBytes);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), text);
});
test("individually bounded documents cannot overflow the aggregate finding budget", async (t) => {
  const text =
    Array.from(
      { length: limits.documentDiagnostics },
      () => "[x](missing)",
    ).join("\n\n") + "\n";
  const files = Object.fromEntries(
    Array.from({ length: 11 }, (_, index) => [`${index}.md`, text]),
  );
  const root = consumer(t, files);
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 2);
  assert.equal(result.errors[0].code, "DIAGNOSTIC_LIMIT");
  assert.equal(result.diagnostics.length, limits.diagnostics);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < limits.diagnosticBytes);
});
test("layout findings count toward the complete document diagnostic budget", async (t) => {
  const text = Array.from(
    { length: limits.documentDiagnostics },
    () => "[x](missing)",
  ).join("\n\n");
  const root = consumer(t, { "a.md": text });
  const result = await runQuality({ root });
  assert.equal(result.exitCode, 2);
  assert.equal(result.errors[0].code, "DIAGNOSTIC_LIMIT");
  assert.deepEqual(result.diagnostics, []);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), text);
});
