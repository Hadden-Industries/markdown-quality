// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
function cli(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/runRepositoryJsonQuality.mjs", ...args, "--json"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  assert.equal(result.error, undefined);
  return { ...result, body: JSON.parse(result.stdout) };
}

test("the real canonical inventory includes protected native documents without claiming a quality pass", () => {
  const result = cli(["inventory"]);
  assert.equal(result.status, 0);
  assert.equal(result.body.status, "passed");
  assert.equal(result.body.operation, "inventory");
  assert.equal(result.body.schemaVersion, 4);
  assert.equal(result.body.counts.checked, 0);
  assert.equal(result.body.complete, true);
  assert.ok(
    result.body.documents.some(
      (entry) => entry.path === "docs/releases/1.0.3.json",
    ),
  );
  assert.ok(
    result.body.documents.some(
      (entry) =>
        entry.path ===
        "test/fixtures/performance-incumbents/owlapi.json.gz!/owlapi.json",
    ),
  );
  assert.ok(
    result.body.documents.some(
      (entry) =>
        entry.path.endsWith("!/.cargo_vcs_info.json") ||
        entry.path.includes("/webpki-roots-0.25.4/.cargo_vcs_info.json"),
    ),
  );
});

test("the repository CLI admits canonical file selection and the capacity bypass", () => {
  const result = cli(["inventory", "--files", "[]", "--no-capacity-limits"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.body.schemaVersion, 4);
  assert.equal(result.body.operation, "inventory");
  assert.deepEqual(result.body.selection.files, []);
  assert.equal(result.body.counts.checked, 0);
});

for (const spelling of ["check-format", "format-check", "producers"])
  test(`the real CLI rejects the unsupported ${spelling} spelling`, () => {
    const result = cli([spelling]);
    assert.notEqual(result.status, 0);
    assert.equal(result.body.complete, false);
    assert.equal(result.body.status, "error");
    assert.equal(result.body.operation, "invalid");
  });

test("a caller cannot redirect the repository adapter to a different root", () => {
  const result = cli(["inventory", "--root", "tooling/json"]);
  assert.notEqual(result.status, 0);
  assert.equal(result.body.complete, false);
});
