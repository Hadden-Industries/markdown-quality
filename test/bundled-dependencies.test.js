// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stageCore } from "../scripts/core-package-stage.js";
import {
  bundleInventoryPath,
  verifyBundledShipment,
} from "../scripts/bundled-dependencies.js";
import { repositoryRoot, sha256 } from "../scripts/dependency-graph.js";
import { consumer } from "./helpers.js";

test("core staging preserves ordinary dependencies and strips producer overrides", (t) => {
  const core = join(consumer(t), "core");
  const manifest = readFileSync(join(repositoryRoot, "package.json"));
  const lock = readFileSync(join(repositoryRoot, "package-lock.json"));
  const { metadata, sourceIdentity } = stageCore(repositoryRoot, core);
  assert.deepEqual(metadata.dependencies, JSON.parse(manifest).dependencies);
  assert.equal(metadata.overrides, undefined);
  assert.equal(metadata.bundleDependencies, undefined);
  assert.equal(sourceIdentity.lockSha256, sha256(lock));
  assert.ok(!existsSync(join(core, "node_modules")));
  assert.ok(!existsSync(join(core, bundleInventoryPath)));
  assert.deepEqual(
    readFileSync(join(repositoryRoot, "package.json")),
    manifest,
  );
  assert.deepEqual(
    readFileSync(join(repositoryRoot, "package-lock.json")),
    lock,
  );

  assert.equal(
    verifyBundledShipment(core, [], metadata, sourceIdentity.lockSha256),
    null,
  );
  for (const path of [
    "node_modules/example/package.json",
    bundleInventoryPath,
  ]) {
    assert.throws(() =>
      verifyBundledShipment(
        core,
        [{ path, size: 0 }],
        metadata,
        sourceIdentity.lockSha256,
      ),
    );
  }
});

test("retained archives still verify the exact files in their historical bundle", (t) => {
  const path = "node_modules/katex/package.json";
  const bytes = Buffer.from('{"name":"katex","version":"0.19.1"}');
  const file = { path, size: bytes.length, sha256: sha256(bytes) };
  const metadata = { bundleDependencies: ["@eslint/markdown", "eslint"] };
  const lockSha256 = "a".repeat(64);
  const inventory = {
    schemaVersion: 1,
    roots: metadata.bundleDependencies,
    sourceLockSha256: lockSha256,
    files: [file],
    packages: [
      {
        path: "node_modules/katex",
        manifestSha256: file.sha256,
        notices: [],
      },
    ],
    repairs: [],
    supplementalNotices: [],
  };
  const core = consumer(t, {
    [path]: bytes,
    [bundleInventoryPath]: JSON.stringify(inventory),
  });
  assert.deepEqual(
    verifyBundledShipment(core, [file], metadata, lockSha256),
    inventory,
  );
  writeFileSync(join(core, path), Buffer.alloc(bytes.length));
  assert.throws(
    () => verifyBundledShipment(core, [file], metadata, lockSha256),
    /Bundled file drift/u,
  );
});
