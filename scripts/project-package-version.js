// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  releaseDocumentationProjection,
  releaseVersionPattern,
} from "./release-documentation.js";
import { corePackage, nativeReleasePackages } from "./release-identity.js";
const repository = fileURLToPath(new URL("../", import.meta.url));

/** Compute the complete version-only projection before any writes. */
export function packageVersionProjection(root = repository) {
  const readText = (name) => {
    const path = join(root, name);
    assert.ok(
      lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
      `Regular version input required: ${name}`,
    );
    return readFileSync(path, "utf8");
  };
  const read = (name) => JSON.parse(readText(name));
  const core = read("package.json"),
    lock = read("package-lock.json");
  assert.equal(core.name, corePackage);
  assert.match(core.version, releaseVersionPattern);
  assert.equal(lock.name, core.name);
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[""].name, core.name);
  const projection = new Map();
  lock.version = lock.packages[""].version = core.version;
  for (const [platform, packageName] of Object.entries(nativeReleasePackages)) {
    const directory = `packages/${platform}`;
    const path = `${directory}/package.json`,
      companion = read(path);
    assert.equal(companion.name, packageName);
    assert.equal(
      core.optionalDependencies[companion.name],
      `file:${directory}`,
    );
    assert.equal(
      lock.packages[""].optionalDependencies[companion.name],
      `file:${directory}`,
    );
    assert.equal(
      lock.packages[`node_modules/${companion.name}`].resolved,
      directory,
    );
    assert.equal(lock.packages[`node_modules/${companion.name}`].link, true);
    assert.ok(lock.packages[directory]);
    companion.version = core.version;
    lock.packages[directory].version = core.version;
    projection.set(path, companion);
  }
  projection.set("package-lock.json", lock);
  // Attribution exceptions bind exact archive members. Project their version
  // with the package family without broadening the pinned value identities.
  const jsonPolicy = read(".json-quality.json");
  const packedNotices = jsonPolicy.exceptions.filter(
    (rule) =>
      rule.nfcExemptStringValues &&
      rule.paths.some((path) =>
        /^dist\/json-qualification\/hadden-industries-markdown-quality-linux-x64-[^/]+\.tgz!\/package\/cargo-notices\.json$/u.test(
          path,
        ),
      ),
  );
  assert.equal(
    packedNotices.length,
    1,
    "One packed attribution exception is required",
  );
  assert.equal(packedNotices[0].paths.length, 1);
  packedNotices[0].paths = [
    `dist/json-qualification/hadden-industries-markdown-quality-linux-x64-${core.version}.tgz!/package/cargo-notices.json`,
  ];
  projection.set(".json-quality.json", jsonPolicy);
  for (const [path, text] of releaseDocumentationProjection(
    core.version,
    readText,
  ))
    projection.set(path, text);
  return projection;
}
export function checkPackageVersions(root = repository) {
  for (const [path, value] of packageVersionProjection(root)) {
    const text = readFileSync(join(root, path), "utf8");
    assert.deepEqual(
      typeof value === "string" ? text : JSON.parse(text),
      value,
      `Stale version projection: ${path}. Run npm run sync:version.`,
    );
  }
}
export function syncPackageVersions(root = repository) {
  const projection = packageVersionProjection(root);
  for (const [path, value] of projection) {
    const text = readFileSync(join(root, path), "utf8");
    const expected =
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n";
    const current = typeof value === "string" ? text : JSON.parse(text);
    if (!isDeepStrictEqual(current, value))
      writeFileSync(join(root, path), expected);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  if (process.argv[2] === "--check") checkPackageVersions();
  else {
    assert.equal(process.argv[2], "--write");
    syncPackageVersions();
  }
}
