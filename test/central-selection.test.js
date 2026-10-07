// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  runQuality,
  executeQuality,
  validateQualityResult,
} from "../src/quality.js";
import { consumer } from "./helpers.js";

test("ancestor single-star exclusions explain the same nested path in full and explicit requests", async (t) => {
  const root = consumer(
    t,
    {
      "README.md": "Alpha.\n",
      "docs/reviews/editing-policy-design/README.md": "Alpha.\n",
    },
    { exclude: ["docs/reviews/*"] },
  );
  const full = await runQuality({ root, mode: "inspect" });
  const explicit = await runQuality({
    root,
    mode: "inspect",
    files: ["docs/reviews/editing-policy-design/README.md"],
  });
  assert.equal(full.exitCode, 0);
  assert.equal(explicit.exitCode, 0);
  assert.deepEqual(explicit.selection.files, []);
  assert.deepEqual(full.selection.exclusions, explicit.selection.exclusions);
  assert.equal(explicit.selection.exclusions[0].pattern, "docs/reviews/*");
});

test("tracked authored dot directories are selected and every tracked Markdown path is accounted", async (t) => {
  const root = consumer(
    t,
    {
      "README.md": "Alpha.\n",
      ".sdlc/notes.md": "Alpha.\n",
      "excluded/unsafe.md": "Alpha.\n",
    },
    { exclude: ["excluded/*"] },
  );
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "add", "--", "."]);
  const report = await runQuality({ root, mode: "inspect", inventory: "git" });
  assert.equal(report.exitCode, 0, JSON.stringify(report.errors));
  assert.deepEqual(report.selection.files, [".sdlc/notes.md", "README.md"]);
  assert.deepEqual(
    report.selection.inventory.map(({ path, decision }) => [path, decision]),
    [
      [".sdlc/notes.md", "selected"],
      ["README.md", "selected"],
      ["excluded/unsafe.md", "excluded"],
    ],
  );
  const bounded = await executeQuality({
    root,
    mode: "inspect",
    inventory: "git",
  });
  assert.deepEqual(bounded.selection, report.selection);
});

test("ignore files have no policy authority and obsolete ignoreFiles configurations are rejected", async (t) => {
  const root = consumer(t, {
    "README.md": "Alpha.\n",
    ".gitignore": "README.md\n",
  });
  const report = await runQuality({ root, mode: "inspect" });
  assert.deepEqual(report.selection.files, ["README.md"]);
  const policy = JSON.parse(
    await import("node:fs").then(({ readFileSync }) =>
      readFileSync(join(root, ".markdown-quality.json"), "utf8"),
    ),
  );
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({ ...policy, ignoreFiles: [] }),
  );
  assert.equal((await runQuality({ root, mode: "inspect" })).exitCode, 2);
});

test("duplicate supplied inventory is rejected consistently before processing", async (t) => {
  const root = consumer(t, { "README.md": "Alpha.\n" });
  const request = {
    root,
    mode: "inspect",
    inventory: ["README.md", "README.md"],
  };
  const report = await runQuality(request);
  assert.equal(report.exitCode, 2);
  assert.equal(report.errors[0].code, "INVALID_INVENTORY");
  validateQualityResult(report);
  const bounded = await executeQuality(request);
  assert.equal(bounded.exitCode, 2);
  assert.equal(bounded.errors[0].code, "INVALID_INVENTORY");
});

test("full Git checkout requests automatically account for tracked pruned domains", async (t) => {
  const root = consumer(t, { "docs/venv/hidden.md": "Alpha.\n" });
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "add", "--", "."]);
  for (const invoke of [runQuality, executeQuality]) {
    const report = await invoke({ root, mode: "inspect" });
    assert.equal(report.exitCode, 2);
    assert.equal(report.errors[0].code, "UNSAFE_SELECTION");
  }
});

test("full subdirectory roots reconcile tracked members from their parent repository", async (t) => {
  const root = consumer(t, {
    "docs/.markdown-quality.json": JSON.stringify({
      schemaVersion: 2,
      preset: "authored-gfm@1",
      include: ["**/*.md"],
    }),
    "docs/venv/hidden.md": "Alpha.\n",
  });
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "add", "--", "."]);
  for (const invoke of [runQuality, executeQuality]) {
    const report = await invoke({ root: join(root, "docs"), mode: "inspect" });
    assert.equal(report.exitCode, 2);
    assert.equal(report.errors[0].code, "UNSAFE_SELECTION");
  }
});

test("literal wildcard and Unicode path decisions retain absent-member safety", async (t) => {
  const root = consumer(
    t,
    { "space [é].md": "Alpha.\n" },
    { exclude: ["docs/[*]/*"] },
  );
  const excludedPath = "docs/*/nested [é].md";
  for (const invoke of [runQuality, executeQuality]) {
    const selected = await invoke({
      root,
      mode: "inspect",
      files: ["space [é].md"],
    });
    assert.deepEqual(selected.selection.files, ["space [é].md"]);
    const excluded = await invoke({
      root,
      mode: "inspect",
      files: [excludedPath],
    });
    assert.equal(excluded.exitCode, 0);
    assert.deepEqual(excluded.selection.files, []);
    assert.equal(excluded.selection.exclusions[0].pattern, "docs/[*]/*");
    const inventory = await invoke({
      root,
      mode: "inspect",
      inventory: [excludedPath, "space [é].md"],
    });
    assert.deepEqual(
      inventory.selection.inventory.map(({ path, decision }) => [
        path,
        decision,
      ]),
      [
        [excludedPath, "excluded"],
        ["space [é].md", "selected"],
      ],
    );
    const absent = await invoke({
      root,
      mode: "inspect",
      files: ["absent [é].md"],
    });
    assert.equal(absent.exitCode, 2);
    assert.equal(absent.errors[0].code, "MISSING_DOCUMENT");
    assert.ok(absent.errors[0].message.includes("absent [é].md"));
  }
});

test("excluded directory names consume the finite discovery budget without reading their bytes", async (t) => {
  const root = consumer(
    t,
    {
      "README.md": "Alpha.\n",
      "excluded/a.md": Buffer.from([255]),
      "excluded/b.md": Buffer.from([255]),
    },
    { exclude: ["excluded/*"] },
  );
  const report = await runQuality({
    root,
    mode: "inspect",
    limits: { entries: 2 },
  });
  assert.equal(report.exitCode, 2);
  assert.equal(report.errors[0].code, "SELECTION_LIMIT");
});
