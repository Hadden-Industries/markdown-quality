// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { npmCommand } from "./commands.js";
import { readOwned, safePath, sha256, limits } from "./dependency-graph.js";

export const bundleInventoryPath = "assets/bundled-dependencies.json";

/** Build from npm's integrity-checked lock/cache, never an ambient installed tree. */
export function stageBundledDependencies(root, core, metadata) {
  if (!metadata.bundleDependencies) return;
  assert.deepEqual(metadata.bundleDependencies, ["@eslint/markdown"]);
  const lockBytes = readOwned(root, "package-lock.json");
  const lock = JSON.parse(lockBytes);
  // The original producer manifest and lock are the native npm ci inputs.
  writeFileSync(join(core, "package.json"), readOwned(root, "package.json"));
  writeFileSync(join(core, "package-lock.json"), lockBytes);
  npmCommand(
    [
      "ci",
      "--offline",
      "--ignore-scripts",
      "--omit=dev",
      "--omit=optional",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: core },
  );

  // npm deliberately rejects bundling a root-only override. Make the one
  // dependency declaration truthful in this disclosed vendored copy instead.
  // No third-party executable source changes; retain its original MIT notice.
  const path = "node_modules/micromark-extension-math/package.json";
  const before = readOwned(core, path);
  const math = JSON.parse(before);
  assert.equal(math.name, "micromark-extension-math");
  assert.equal(math.version, "3.1.0");
  assert.equal(math.dependencies.katex, "^0.16.0");
  assert.equal(lock.packages["node_modules/katex"].version, "0.19.0");
  assert.deepEqual(metadata.overrides, {
    "micromark-extension-math": { katex: "0.19.0" },
  });
  math.dependencies.katex = "0.19.0";
  const after = JSON.stringify(math, null, 2) + "\n";
  writeFileSync(join(core, path), after);
  delete metadata.overrides;
  writeFileSync(
    join(core, "package.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  const response = JSON.parse(
    npmCommand(["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: core,
    }),
  );
  const records = Array.isArray(response) ? response : Object.values(response);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, metadata.name);
  const files = records[0].files
    .filter(({ path }) => path.startsWith("node_modules/"))
    .map(({ path, size }) => {
      safePath(path);
      const bytes = readOwned(core, path);
      assert.equal(bytes.length, size);
      return { path, size, sha256: sha256(bytes) };
    })
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
  assert.ok(files.length > 0 && files.length < limits.files);
  assert.ok(files.reduce((sum, file) => sum + file.size, 0) <= limits.bytes);
  const packages = files
    .filter(({ path }) =>
      /(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/u.test(path),
    )
    .map(({ path, sha256: manifestSha256 }) => {
      const location = path.slice(0, -"/package.json".length);
      const installed = JSON.parse(readOwned(core, path));
      const source = lock.packages[location];
      assert.equal(installed.version, source?.version, location);
      assert.ok(
        source.resolved?.startsWith("https://registry.npmjs.org/"),
        location,
      );
      assert.match(source.integrity, /^sha512-[A-Za-z0-9+/]+=*$/u);
      const license =
        installed.license ??
        (installed.name === "format" &&
        installed.version === "0.2.2" &&
        installed.licenses?.length === 1
          ? installed.licenses[0].type
          : undefined);
      assert.ok(typeof license === "string" && license.length > 0, location);
      const notices = files
        .filter(
          ({ path }) =>
            path.startsWith(location + "/") &&
            !path.slice(location.length + 1).includes("/") &&
            /^(?:licen[sc]e|copying|notice)(?:[.-]|$)/iu.test(
              path.slice(location.length + 1),
            ),
        )
        .map(({ path }) => path);
      if (installed.name === "format" && installed.version === "0.2.2") {
        assert.equal(license, "MIT");
        assert.equal(
          sha256(readOwned(core, "LICENSES/MIT-format.txt")),
          "0b2c94863590ca2aed327e89642b7e74b1608ec423bfec1d8f1beba2945fc4ba",
        );
        notices.push("LICENSES/MIT-format.txt");
      }
      assert.ok(notices.length > 0, `Missing bundled license: ${location}`);
      return {
        path: location,
        name: installed.name,
        version: installed.version,
        license,
        resolved: source.resolved,
        integrity: source.integrity,
        manifestSha256,
        notices,
      };
    });
  assert.ok(packages.some(({ name }) => name === "@eslint/markdown"));
  assert.ok(
    packages.some(
      ({ name, version }) => name === "katex" && version === "0.19.0",
    ),
  );
  const inventory = {
    schemaVersion: 1,
    roots: metadata.bundleDependencies,
    sourceLockSha256: sha256(lockBytes),
    acquisition:
      "npm ci --offline --ignore-scripts --omit=dev --omit=optional; native lock integrity admission",
    supplementalNotice: {
      path: "LICENSES/MIT-format.txt",
      source:
        "https://github.com/samsonjs/format/blob/0094c51372790ca342da4b90c519edd3380deee1/License.md",
      sha256:
        "0b2c94863590ca2aed327e89642b7e74b1608ec423bfec1d8f1beba2945fc4ba",
    },
    repairs: [
      {
        path,
        field: "dependencies.katex",
        before: "^0.16.0",
        after: "0.19.0",
        originalSha256: sha256(before),
        modifiedSha256: sha256(after),
        reason:
          "GHSA-238p-pmpm-9mq7; producer overrides do not constrain recipients",
      },
    ],
    packages,
    files,
  };
  writeFileSync(
    join(core, bundleInventoryPath),
    JSON.stringify(inventory, null, 2) + "\n",
  );
}

/** A dependency exception admits only the exact npm-produced, hash-bound closure. */
export function verifyBundledShipment(core, files, metadata, lockSha256) {
  const bundled = files.filter(({ path }) => path.startsWith("node_modules/"));
  if (!metadata.bundleDependencies) {
    assert.equal(bundled.length, 0, "Unrequested bundled dependency");
    return;
  }
  const inventory = JSON.parse(readOwned(core, bundleInventoryPath));
  assert.equal(inventory.schemaVersion, 1);
  assert.deepEqual(metadata.bundleDependencies, ["@eslint/markdown"]);
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
  assert.equal(
    sha256(readOwned(core, inventory.supplementalNotice.path)),
    inventory.supplementalNotice.sha256,
  );
  for (const repair of inventory.repairs)
    assert.equal(sha256(readOwned(core, repair.path)), repair.modifiedSha256);
}
