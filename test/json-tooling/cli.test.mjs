// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("the repository CLI checks its own root and includes required native evidence", () => {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/runRepositoryJsonQuality.mjs"),
      "check",
      "--ndjson",
    ],
    {
      cwd: tmpdir(),
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  assert.ifError(result.error);
  const lines = result.stdout.trim().split(/\r?\n/u);
  assert.equal(result.status, 0, result.stderr || lines.at(-1));
  const events = lines.map((line) => JSON.parse(line));
  const terminal = events.at(-1);
  assert.equal(terminal.type, "execution-terminal");
  assert.equal(terminal.root, resolve(root));
  assert.equal(terminal.inventoryComplete, true);
  assert.equal(terminal.contractSatisfied, true);

  const release = JSON.parse(
    readFileSync(
      resolve(root, "dist/json-qualification/release-manifest.json"),
      "utf8",
    ),
  );
  const core = release.archives.find((archive) => archive.name === "core");
  assert.ok(core, "The release manifest must identify the core archive.");
  const paths = new Set(
    events
      .filter((event) => event.type === "source")
      .map((event) => event.path),
  );
  for (const path of [
    "docs/releases/1.0.3.json",
    `dist/json-qualification/${core.filename}!/package/package.json`,
    `dist/json-qualification/${core.filename}!/package/assets/bundled-dependencies.json`,
    "test/fixtures/performance-incumbents/owlapi.json.gz!/owlapi.json",
    "test/fixtures/performance-incumbents/webvowl.json.gz!/webvowl.json",
    ...["linux-x64", "win32-x64"].map(
      (platform) =>
        `packages/${platform}/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`,
    ),
  ])
    assert.ok(paths.has(path), path);
});
