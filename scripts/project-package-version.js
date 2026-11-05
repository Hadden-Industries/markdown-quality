// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const repository = fileURLToPath(new URL("../", import.meta.url));

/** Compute the complete version-only projection before any writes. */
export function packageVersionProjection(root = repository) {
  const read = (name) => {
    const path = join(root, name);
    assert.ok(
      lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
      `Regular version input required: ${name}`,
    );
    return JSON.parse(readFileSync(path, "utf8"));
  };
  const core = read("package.json"),
    lock = read("package-lock.json");
  assert.equal(core.name, "@hadden-industries/markdown-quality");
  assert.match(
    core.version,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u,
  );
  assert.equal(lock.name, core.name);
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[""].name, core.name);
  const projection = new Map();
  lock.version = lock.packages[""].version = core.version;
  for (const platform of ["linux-x64", "win32-x64"]) {
    const path = `packages/${platform}/package.json`,
      companion = read(path);
    assert.equal(companion.name, core.name + "-" + platform);
    assert.equal(
      core.optionalDependencies[companion.name],
      `file:packages/${platform}`,
    );
    assert.equal(
      lock.packages[""].optionalDependencies[companion.name],
      `file:packages/${platform}`,
    );
    assert.equal(
      lock.packages[`node_modules/${companion.name}`].resolved,
      `packages/${platform}`,
    );
    assert.equal(lock.packages[`node_modules/${companion.name}`].link, true);
    assert.ok(lock.packages[`packages/${platform}`]);
    companion.version = core.version;
    lock.packages[`packages/${platform}`].version = core.version;
    projection.set(path, companion);
  }
  projection.set("package-lock.json", lock);
  return projection;
}
export function checkPackageVersions(root = repository) {
  for (const [path, value] of packageVersionProjection(root))
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, path))),
      value,
      `Stale package version: ${path}`,
    );
}
export function syncPackageVersions(root = repository) {
  const projection = packageVersionProjection(root);
  for (const [path, value] of projection)
    if (
      JSON.stringify(JSON.parse(readFileSync(join(root, path)))) !==
      JSON.stringify(value)
    )
      writeFileSync(join(root, path), JSON.stringify(value, null, 2) + "\n");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  if (process.argv[2] === "--check") checkPackageVersions();
  else {
    assert.equal(process.argv[2], "--write");
    syncPackageVersions();
  }
}
