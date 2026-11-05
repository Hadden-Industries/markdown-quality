// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  runQuality,
  processLogicalDocument,
  executeQualityRequest,
} from "../src/quality.js";
import { admitCheckEvidence } from "../src/result-validation.js";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
// Independent spellings: decomposed and composed forms of é.
const D = "é";
const C = "é";
const read = (root, path) => readFileSync(join(root, path), "utf8");

test("preview and write share preparation; preview never writes and writes are idempotent", async (t) => {
  const source = `# Notes\n\nCaf${D} prose and ![Caf${D} sign](notes.md).\n`;
  const root = consumer(t, { "notes.md": source });
  const preview = await runQuality({ root, mode: "normalize", dryRun: true });
  assert.equal(preview.exitCode, 0, JSON.stringify(preview.diagnostics));
  assert.equal(preview.operationStatus, "previewed");
  assert.equal(preview.qualityBasis, "candidate");
  assert.deepEqual(preview.writtenPaths, []);
  assert.deepEqual(
    preview.documentResults.map((r) => r.writeStatus),
    ["not-requested"],
  );
  assert.equal(read(root, "notes.md"), source);
  assert.throws(() => admitCheckEvidence(preview), /read-only check/u);
  const applied = await runQuality({ root, mode: "normalize" });
  assert.equal(applied.exitCode, 0);
  assert.equal(applied.qualityBasis, "applied");
  assert.deepEqual(applied.writtenPaths, ["notes.md"]);
  // The preview is not write authority, but identical preimages propose identical edits.
  assert.deepEqual(applied.proposedChanges, preview.proposedChanges);
  assert.deepEqual(
    applied.proposedChanges.map((c) => [c.kind, c.sourceLine, c.sourceColumn]),
    [
      ["prose-nfc", 3, 4],
      // Columns count UTF-16 units; the earlier decomposed é occupies two.
      ["prose-nfc", 3, 22],
    ],
  );
  assert.equal(
    read(root, "notes.md"),
    `# Notes\n\nCaf${C} prose and ![Caf${C} sign](notes.md).\n`,
  );
  const again = await runQuality({ root, mode: "normalize" });
  assert.deepEqual(again.writtenPaths, []);
  assert.deepEqual(again.proposedChanges, []);
  assert.equal((await runQuality({ root })).exitCode, 0);
});

test("format and normalize compose in either order and check stays authoritative", async (t) => {
  const mixed = `# Notes\n\n*   Caf${D} item\n`;
  const canonical = `# Notes\n\n- Caf${C} item\n`;
  for (const order of [
    ["format", "normalize"],
    ["normalize", "format"],
  ]) {
    const root = consumer(t, { "a.md": mixed });
    const first = await runQuality({ root, mode: order[0] });
    assert.equal(
      first.exitCode,
      0,
      `${order[0]} ${JSON.stringify(first.diagnostics)}`,
    );
    assert.equal(first.qualityStatus, "findings");
    // The other condition remains reported at its original severity.
    const between = await runQuality({ root });
    assert.equal(between.exitCode, 1);
    assert.deepEqual(
      between.diagnostics.map((d) => d.rule),
      [order[0] === "format" ? "quality/non-nfc-prose" : "layout"],
    );
    const second = await runQuality({ root, mode: order[1] });
    assert.equal(second.exitCode, 0);
    assert.equal(read(root, "a.md"), canonical);
    assert.equal((await runQuality({ root })).exitCode, 0);
    for (const mode of order)
      assert.deepEqual((await runQuality({ root, mode })).writtenPaths, []);
  }
});

test("normalize refuses unrelated blockers, strict warnings and disabled NFC policy", async (t) => {
  const blocked = consumer(t, {
    "a.md": `# A\n\nCaf${D} [gone](missing.md).\n`,
  });
  const refused = await runQuality({ root: blocked, mode: "normalize" });
  assert.equal(refused.exitCode, 1);
  assert.equal(refused.operationStatus, "refused");
  assert.equal(refused.documentResults[0].writeStatus, "refused");
  assert.equal(read(blocked, "a.md"), `# A\n\nCaf${D} [gone](missing.md).\n`);
  const strict = consumer(t, { "a.md": `# A.\n\nCaf${D}.\n` });
  assert.equal(
    (await runQuality({ root: strict, mode: "normalize", strict: true }))
      .exitCode,
    1,
  );
  assert.equal(
    (await runQuality({ root: strict, mode: "normalize" })).exitCode,
    0,
  );
  const off = consumer(
    t,
    { "a.md": `# A\n\nCaf${D}.\n` },
    { lint: { "quality/non-nfc-prose": "off" } },
  );
  const policy = await runQuality({ root: off, mode: "normalize" });
  assert.equal(policy.exitCode, 1);
  assert.equal(policy.refusals[0].code, "NFC_RULE_DISABLED");
  assert.equal(policy.qualityStatus, "not-checked");
  assert.equal(read(off, "a.md"), `# A\n\nCaf${D}.\n`);
  // Info and warn severities still permit an explicit request.
  const info = consumer(
    t,
    { "a.md": `# A\n\nCaf${D}.\n` },
    { lint: { "quality/non-nfc-prose": "info" } },
  );
  assert.equal(
    (await runQuality({ root: info, mode: "normalize" })).exitCode,
    0,
  );
  assert.equal(read(info, "a.md"), `# A\n\nCaf${C}.\n`);
});

test("anchor changes require update-links and repair only selected supported references", async (t) => {
  const files = {
    "a.md": `# Caf${D}\n\n## Caf${C}\n\nSee [first](#caf${D}) and [second](#caf${C}).\n`,
    "b.md": `# B\n\n[ref][a]\n\n[a]: a.md#caf${D}\n`,
    "notes/c.md": `# C\n\nLink to [a](../a.md#cafe%CC%81) uses encoding.\n`,
  };
  const root = consumer(t, files);
  const unflagged = await runQuality({ root, mode: "normalize" });
  assert.equal(unflagged.exitCode, 1);
  assert.equal(
    unflagged.refusals[0].code,
    "ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS",
  );
  // Old and new anchors include the suffix cascade on the unchanged heading.
  assert.deepEqual(
    unflagged.anchorChanges.map((a) => [a.headingOrdinal, a.newAnchor]),
    [
      [1, `caf${C}`],
      [2, `caf${C}-1`],
    ],
  );
  assert.equal(unflagged.backlinkCoverage.externalReferences, "unverified");
  for (const [path, bytes] of Object.entries(files))
    assert.equal(read(root, path), bytes);
  // A required edit outside the selected write set refuses the whole batch.
  const scoped = await runQuality({
    root,
    mode: "normalize",
    updateLinks: true,
    files: ["a.md", "b.md"],
  });
  assert.equal(scoped.exitCode, 1);
  assert.deepEqual(
    scoped.refusals.map((r) => [r.code, r.path]),
    [["OUT_OF_SCOPE_REFERENCE", "notes/c.md"]],
  );
  const updated = await runQuality({
    root,
    mode: "normalize",
    updateLinks: true,
  });
  assert.equal(updated.exitCode, 0, JSON.stringify(updated.refusals));
  assert.deepEqual(updated.writtenPaths, ["a.md", "b.md", "notes/c.md"]);
  assert.equal(
    read(root, "a.md"),
    `# Caf${C}\n\n## Caf${C}\n\nSee [first](#caf${C}) and [second](#caf${C}-1).\n`,
  );
  assert.equal(read(root, "b.md"), `# B\n\n[ref][a]\n\n[a]: a.md#caf${C}\n`);
  assert.equal(
    read(root, "notes/c.md"),
    `# C\n\nLink to [a](../a.md#caf%C3%A9) uses encoding.\n`,
  );
  assert.deepEqual(
    [...new Set(updated.proposedChanges.map((c) => c.kind))].sort(),
    ["local-fragment", "prose-nfc"],
  );
  assert.equal((await runQuality({ root })).exitCode, 0);
});

test("raw HTML dependencies on changed anchors are recognized but never rewritten", async (t) => {
  const root = consumer(t, {
    "a.md": `# Caf${D}\n`,
    "b.md": `# B\n\n<a href="a.md#caf${D}">menu</a>\n`,
  });
  const report = await runQuality({
    root,
    mode: "normalize",
    updateLinks: true,
  });
  assert.equal(report.exitCode, 1);
  assert.deepEqual(
    report.refusals.map((r) => [r.code, r.path, r.line]),
    [["PROTECTED_HTML_REFERENCE", "b.md", 3]],
  );
  assert.equal(read(root, "a.md"), `# Caf${D}\n`);
});

test("logical normalization returns candidate bytes and never writes the checkout", async (t) => {
  const root = consumer(t, { "doc.md": "# Placeholder\n" });
  const content = Buffer.from(`# Doc\n\nCaf${D}.\n`);
  const logical = await processLogicalDocument({
    root,
    mode: "normalize",
    path: "doc.md",
    content,
  });
  assert.equal(logical.exitCode, 0, JSON.stringify(logical.diagnostics));
  assert.equal(
    Buffer.from(logical.document.contentBase64, "base64").toString(),
    `# Doc\n\nCaf${C}.\n`,
  );
  assert.deepEqual(logical.writtenPaths, []);
  assert.equal(read(root, "doc.md"), "# Placeholder\n");
  const preview = await executeQualityRequest({
    root,
    mode: "normalize",
    dryRun: true,
    document: {
      path: "doc.md",
      requestId: "r1",
      contentBase64: content.toString("base64"),
    },
  });
  assert.equal(preview.operationStatus, "previewed");
  assert.equal(
    Buffer.from(preview.document.contentBase64, "base64").toString(),
    content.toString(),
  );
  await assert.rejects(
    executeQualityRequest({ root, mode: "normalize" }),
    /never writes checkouts/u,
  );
});

test("the CLI exposes normalize, preview and update-links with explicit flag admission", (t) => {
  const root = consumer(t, {
    "package.json": "{}\n",
    "a.md": `# A\n\nCaf${D}.\n`,
  });
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: fixtureCommandTimeoutMs,
    });
  const preview = run("normalize", "--dry-run", "--json");
  assert.equal(preview.status, 0, preview.stdout);
  assert.equal(JSON.parse(preview.stdout).operationStatus, "previewed");
  assert.equal(read(root, "a.md"), `# A\n\nCaf${D}.\n`);
  const rejected = run("check", "--update-links", "--json");
  assert.equal(rejected.status, 2);
  assert.match(
    JSON.parse(rejected.stdout).errors[0].message,
    /only to normalize/u,
  );
  const human = run("normalize", "--write");
  assert.equal(human.status, 0, human.stdout);
  assert.match(human.stderr, /normalize completed; quality clean \(applied\)/u);
  assert.equal(read(root, "a.md"), `# A\n\nCaf${C}.\n`);
  const empty = run("normalize", "--write", "--files-json", "[]", "--json");
  assert.equal(JSON.parse(empty.stdout).exitCode, 0);
  writeFileSync(join(root, "b.md"), `# B\n\nCaf${D}.\n`);
  const literal = run("normalize", "--write", "--json", "--", "b.md");
  assert.deepEqual(JSON.parse(literal.stdout).writtenPaths, ["b.md"]);
  const stdin = spawnSync(
    process.execPath,
    [cli, "normalize", "--stdin-request", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: fixtureCommandTimeoutMs,
      input: JSON.stringify({
        path: "generated.md",
        requestId: "stdin",
        contentBase64: Buffer.from(`# G\n\nCaf${D}.\n`).toString("base64"),
      }),
    },
  );
  assert.equal(stdin.status, 0, stdin.stdout);
  const supplied = JSON.parse(stdin.stdout);
  assert.equal(
    Buffer.from(supplied.document.contentBase64, "base64").toString(),
    `# G\n\nCaf${C}.\n`,
  );
  assert.deepEqual(supplied.writtenPaths, []);
});
