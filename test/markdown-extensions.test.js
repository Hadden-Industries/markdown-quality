// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runQuality, processLogicalDocument } from "../src/quality.js";
import { consumer } from "./helpers.js";

const D = "é";
const C = "é";
// One linter finding (skipped heading level) and one prose finding (decomposed e).
const flawed = `# Title\n\n### Skipped\n\nCaf${D}.\n`;
const rules = (report, path) =>
  report.diagnostics
    .filter((diagnostic) => diagnostic.path === path)
    .map(({ rule }) => rule)
    .sort();

test("explicitly named files are checked as Markdown whatever their extension", async (t) => {
  const names = ["notes.markdown", "UPPER.MD", "plain.txt", "LICENSE"];
  const root = consumer(
    t,
    Object.fromEntries(names.map((name) => [name, flawed])),
  );
  const full = await runQuality({ root });
  assert.deepEqual(full.selection.files, []);
  const explicit = await runQuality({ root, files: names });
  assert.equal(explicit.exitCode, 1);
  assert.deepEqual(explicit.selection.files, [...names].sort());
  for (const name of names)
    assert.deepEqual(rules(explicit, name), [
      "markdown/heading-increment",
      "quality/non-nfc-prose",
    ]);
  writeFileSync(join(root, "plain.txt"), "# Title\n\n*   item\n");
  const formatted = await runQuality({
    root,
    mode: "format",
    files: ["plain.txt"],
  });
  assert.deepEqual(formatted.writtenPaths, ["plain.txt"]);
  assert.equal(
    readFileSync(join(root, "plain.txt"), "utf8"),
    "# Title\n\n- item\n",
  );
});

test("a named file ignores include but an exclusion still omits it", async (t) => {
  const root = consumer(
    t,
    { "README.md": flawed, "drafts/notes.txt": flawed },
    { include: ["docs/**"], exclude: ["drafts/**"] },
  );
  const report = await runQuality({
    root,
    files: ["README.md", "drafts/notes.txt"],
  });
  assert.equal(report.exitCode, 1);
  assert.deepEqual(report.selection.files, ["README.md"]);
  assert.deepEqual(
    report.selection.omissions.map(({ path, reason }) => [path, reason]),
    [["drafts/notes.txt", "excluded"]],
  );
});

test("named MDX is refused instead of being checked or silently omitted", async (t) => {
  const root = consumer(t, {
    "page.mdx": "# Page\n",
    "Other.MDX": "# Other\n",
  });
  for (const file of ["page.mdx", "Other.MDX"]) {
    const report = await runQuality({ root, files: [file] });
    assert.equal(report.exitCode, 2);
    assert.equal(report.errors[0].code, "UNSUPPORTED_DIALECT");
  }
  const logical = await processLogicalDocument({
    root,
    path: "page.mdx",
    content: Buffer.from("# Page\n"),
  });
  assert.equal(logical.exitCode, 2);
  assert.equal(logical.errors[0].code, "UNSUPPORTED_DIALECT");
  // Broad discovery never reaches MDX, so a full run neither checks nor refuses it.
  assert.equal((await runQuality({ root })).exitCode, 0);
  const broad = consumer(
    t,
    { "docs/page.mdx": "# Page\n" },
    { include: ["docs/**"] },
  );
  assert.deepEqual((await runQuality({ root: broad })).selection.files, []);
  // An include pattern that names MDX asks for it, so it is refused too.
  const named = consumer(
    t,
    { "page.mdx": "# Page\n" },
    { include: ["**/*.mdx"] },
  );
  const report = await runQuality({ root: named });
  assert.equal(report.exitCode, 2);
  assert.equal(report.errors[0].code, "UNSUPPORTED_DIALECT");
  // An exclusion still omits a named MDX file instead of refusing it.
  const excluded = consumer(
    t,
    { "page.mdx": "# Page\n" },
    { exclude: ["*.mdx"] },
  );
  const omitted = await runQuality({ root: excluded, files: ["page.mdx"] });
  assert.equal(omitted.exitCode, 0);
  assert.equal(omitted.selection.omissions[0].reason, "excluded");
});

test("a logical document is checked at any non-MDX path", async (t) => {
  const root = consumer(t);
  const logical = await processLogicalDocument({
    root,
    mode: "normalize",
    path: "generated/notes.markdown",
    content: Buffer.from(`# Notes\n\nCaf${D}.\n`),
  });
  assert.equal(logical.exitCode, 0, JSON.stringify(logical.errors));
  assert.equal(logical.document.decision, "selected");
  assert.equal(
    Buffer.from(logical.document.contentBase64, "base64").toString(),
    `# Notes\n\nCaf${C}.\n`,
  );
});

test("include patterns that name another extension opt it in; broad patterns read only .md", async (t) => {
  const files = {
    "a.md": flawed,
    "b.markdown": flawed,
    "c.MD": flawed,
    LICENSE: flawed,
    "docs/guide.md": flawed,
    "docs/image.png": "not markdown",
    "docs/notes.txt": flawed,
  };
  for (const [include, selected] of [
    [["docs/**"], ["docs/guide.md"]],
    [["**/*"], ["a.md", "docs/guide.md"]],
    [
      ["**/*.md", "**/*.markdown"],
      ["a.md", "b.markdown", "docs/guide.md"],
    ],
    [["**/*.{md,markdown}"], ["a.md", "b.markdown", "docs/guide.md"]],
    [
      ["**/*.MD", "LICENSE"],
      ["LICENSE", "c.MD"],
    ],
    [["docs/*.txt"], ["docs/notes.txt"]],
  ]) {
    const report = await runQuality({ root: consumer(t, files, { include }) });
    assert.notEqual(report.exitCode, 2, JSON.stringify(report.errors));
    assert.deepEqual(report.selection.files, selected, JSON.stringify(include));
  }
});

test("opted-in extensions govern Git inventory accounting", async (t) => {
  const root = consumer(
    t,
    { "README.md": "# Readme\n", "guide.markdown": "# Guide\n" },
    { include: ["**/*.md", "**/*.markdown"] },
  );
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "add", "--", "."]);
  const report = await runQuality({
    root,
    mode: "inspect",
    reconciliationInventory: "git",
  });
  assert.equal(report.exitCode, 0, JSON.stringify(report.errors));
  assert.deepEqual(
    report.selection.reconciliationDecisions.map(({ path, decision }) => [
      path,
      decision,
    ]),
    [
      ["README.md", "selected"],
      ["guide.markdown", "selected"],
    ],
  );
});

test("cross-document fragments are validated in files with opted-in extensions", async (t) => {
  const links = "# Links\n\n[a](guide.markdown#missing)\n";
  const unchecked = consumer(t, {
    "README.md": links,
    "guide.markdown": "# Guide\n",
  });
  assert.equal((await runQuality({ root: unchecked })).exitCode, 0);
  const checked = consumer(
    t,
    { "README.md": links, "guide.markdown": "# Guide\n" },
    { include: ["**/*.md", "**/*.markdown"] },
  );
  const report = await runQuality({ root: checked });
  assert.equal(report.exitCode, 1);
  assert.deepEqual(rules(report, "README.md"), [
    "quality/unresolved-local-fragment",
  ]);
});

test("normalize updates links into a member with another extension", async (t) => {
  const files = {
    "guide.markdown": `# Caf${D}\n`,
    "README.md": `# Readme\n\nSee [guide](guide.markdown#caf${D}).\n`,
  };
  const expected = `# Readme\n\nSee [guide](guide.markdown#caf${C}).\n`;
  const included = consumer(t, files, {
    include: ["**/*.md", "**/*.markdown"],
  });
  // Without the opt-in, a named member is still part of the write set.
  const named = consumer(t, files);
  for (const [root, selection] of [
    [included, {}],
    [named, { files: ["README.md", "guide.markdown"] }],
  ]) {
    const report = await runQuality({
      root,
      mode: "normalize",
      updateLinks: true,
      ...selection,
    });
    assert.equal(report.exitCode, 0, JSON.stringify(report.refusals));
    assert.deepEqual(report.writtenPaths, ["README.md", "guide.markdown"]);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), expected);
  }
});
