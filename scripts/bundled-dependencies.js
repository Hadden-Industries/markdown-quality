// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { readOwned, safePath, sha256, limits } from "./dependency-graph.js";

export const bundleInventoryPath = "assets/bundled-dependencies.json";
const bundleRoots = ["@eslint/markdown"];
const legacyBundleRoots = [...bundleRoots, "eslint"];

/** Verify the exact dependency inventory of a retained bundled archive. */
export function verifyBundledShipment(core, files, metadata, lockSha256) {
  const bundled = files.filter(({ path }) => path.startsWith("node_modules/"));
  if (!metadata.bundleDependencies) {
    assert.equal(bundled.length, 0, "Unrequested bundled dependency");
    assert.ok(
      !files.some(({ path }) => path === bundleInventoryPath),
      "Unexpected bundle inventory",
    );
    return null;
  }
  const inventory = JSON.parse(readOwned(core, bundleInventoryPath));
  assert.equal(inventory.schemaVersion, 1);
  // Retained release archives can still contain the earlier ESLint bundle.
  assert.ok(
    isDeepStrictEqual(metadata.bundleDependencies, bundleRoots) ||
      isDeepStrictEqual(metadata.bundleDependencies, legacyBundleRoots),
    "Unknown bundle roots",
  );
  assert.deepEqual(inventory.roots, metadata.bundleDependencies);
  assert.equal(inventory.sourceLockSha256, lockSha256);
  assert.ok(
    inventory.files.length > 0 && inventory.files.length < limits.files,
  );
  assert.ok(
    inventory.files.reduce((sum, file) => sum + file.size, 0) <= limits.bytes,
  );
  assert.deepEqual(
    bundled
      .map(({ path, size }) => ({ path, size }))
      .sort((a, b) => a.path.localeCompare(b.path, "en")),
    inventory.files.map(({ path, size }) => ({ path, size })),
  );
  for (const { path, sha256: expected } of inventory.files)
    assert.equal(
      sha256(readOwned(core, safePath(path))),
      expected,
      `Bundled file drift: ${path}`,
    );
  for (const pkg of inventory.packages) {
    assert.equal(
      sha256(readOwned(core, pkg.path + "/package.json")),
      pkg.manifestSha256,
    );
    for (const notice of pkg.notices)
      assert.ok(readOwned(core, notice).length > 0);
  }
  for (const notice of inventory.supplementalNotices)
    assert.equal(sha256(readOwned(core, notice.path)), notice.sha256);
  for (const repair of inventory.repairs)
    assert.equal(sha256(readOwned(core, repair.path)), repair.modifiedSha256);
  return inventory;
}
