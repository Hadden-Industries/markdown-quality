// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileNativeSbom,
  reconcileMergedSbom,
  verifyRecipientSbom,
  bindCoreSbom,
} from "../scripts/distribution-sbom.js";

test("bundled SBOM coverage rejects missing, substituted and unexplained components", () => {
  const archive = {
    package: "core",
    version: "1.0.0",
    sha256: "a".repeat(64),
    files: [{ path: "package.json", sha256: "b".repeat(64) }],
  };
  const pkg = {
    path: "node_modules/katex",
    name: "katex",
    version: "0.19.0",
    license: "MIT",
    manifestSha256: "c".repeat(64),
    resolved: "https://registry.npmjs.org/katex/-/katex-0.19.0.tgz",
    integrity: "sha512-" + Buffer.alloc(64, 1).toString("base64"),
  };
  const inventory = { packages: [pkg] };
  const components = [
    { name: "core", version: "1.0.0", path: "", hash: "b".repeat(64) },
    {
      name: pkg.name,
      version: pkg.version,
      path: pkg.path,
      hash: pkg.manifestSha256,
    },
  ].flatMap(({ name, version, path, hash }) => {
    const location = "/" + (path ? path + "/" : "") + "package.json";
    return [
      {
        type: "library",
        name,
        version,
        properties: [{ name: "syft:location:0:path", value: location }],
      },
      {
        type: "file",
        name: "/private/stage" + location,
        hashes: [{ alg: "SHA-256", content: hash }],
      },
    ];
  });
  const native = { metadata: { component: {} }, components };
  const valid = bindCoreSbom(structuredClone(native), { archive, inventory });
  assert.equal(valid.components[2].licenses[0].expression, "MIT");
  assert.equal(
    valid.components[3].name,
    "package/node_modules/katex/package.json",
  );
  for (const mutate of [
    (bom) => bom.components.splice(2, 1),
    (bom) => bom.components.splice(3, 1),
    (bom) => {
      bom.components[2].version = "0.16.0";
    },
    (bom) => {
      bom.components[2].properties[0].value =
        "/node_modules/other/package.json";
    },
    (bom) => {
      bom.components[3].hashes[0].content = "d".repeat(64);
    },
    (bom) => bom.components.push(structuredClone(bom.components[2])),
  ]) {
    const corrupt = structuredClone(native);
    mutate(corrupt);
    assert.throws(() => bindCoreSbom(corrupt, { archive, inventory }));
  }
});

test("a valid-looking native BOM missing a shipped crate cannot satisfy coverage", () => {
  const embedded = {
    packages: [
      { name: "aho-corasick", version: "1.1.5" },
      { name: "syn", version: "2.0.106", kind: "build" },
    ],
  };
  const bom = {
    components: [
      {
        name: "aho-corasick",
        version: "1.1.5",
        purl: "pkg:cargo/aho-corasick@1.1.5",
      },
    ],
  };
  reconcileNativeSbom(bom, embedded);
  bom.components = [];
  assert.throws(() => reconcileNativeSbom(bom, embedded), /runtime/u);
});

test("native composition cannot lose rights or an embedded dependency relationship", () => {
  const input = {
    metadata: {
      component: { "bom-ref": "root", name: "native", version: "1" },
    },
    components: [
      {
        "bom-ref": "crate",
        name: "crate",
        version: "2",
        type: "library",
        licenses: [{ expression: "MIT" }],
      },
    ],
    dependencies: [{ ref: "root", dependsOn: ["crate"] }],
  };
  const merged = {
    metadata: { component: { "bom-ref": "distribution" } },
    components: [
      {
        "bom-ref": "new-root",
        name: "native",
        version: "1",
        components: [{ ...input.components[0], "bom-ref": "new-crate" }],
      },
    ],
    dependencies: [{ ref: "new-root", dependsOn: ["new-crate"] }],
  };
  reconcileMergedSbom(merged, [input]);
  const missingRights = structuredClone(merged);
  delete missingRights.components[0].components[0].licenses;
  assert.throws(() => reconcileMergedSbom(missingRights, [input]), /rights/u);
  merged.dependencies[0].dependsOn = [];
  assert.throws(() => reconcileMergedSbom(merged, [input]), /relationships/u);
});

test("hierarchical composition preserves location-distinct copies of the same version", () => {
  const components = [
    "node_modules/example",
    "node_modules/nested/node_modules/example",
  ].map((path, index) => ({
    "bom-ref": `copy-${index}`,
    name: "example",
    version: "1.0.0",
    type: "library",
    purl: "pkg:npm/example@1.0.0",
    properties: [
      { name: "syft:location:0:path", value: `/${path}/package.json` },
    ],
    licenses: [{ expression: "MIT" }],
  }));
  const input = {
    metadata: { component: { "bom-ref": "root", name: "core", version: "1" } },
    components,
    dependencies: [{ ref: "root", dependsOn: ["copy-0", "copy-1"] }],
  };
  const merged = {
    metadata: { component: { "bom-ref": "distribution" } },
    components: [
      {
        "bom-ref": "new-root",
        name: "core",
        version: "1",
        components: components.map((c, index) => ({
          ...c,
          "bom-ref": `new-${index}`,
        })),
      },
    ],
    dependencies: [{ ref: "new-root", dependsOn: ["new-0", "new-1"] }],
  };
  reconcileMergedSbom(merged, [input]);
  merged.components[0].components[1].properties =
    merged.components[0].components[0].properties;
  assert.throws(() => reconcileMergedSbom(merged, [input]), /ambiguous/u);
});

test("recipient inventories must bind the archive digest, not just package name and version", () => {
  const integrity = "sha512-" + Buffer.alloc(64, 1).toString("base64");
  const release = {
    version: "2.0.0",
    archives: [
      {
        name: "core",
        package: "@hadden-industries/markdown-quality",
        integrity,
      },
      {
        name: "win32-x64",
        package: "@hadden-industries/markdown-quality-win32-x64",
        integrity,
      },
    ],
  };
  const bom = {
    bomFormat: "CycloneDX",
    components: release.archives.map(({ package: name }) => ({
      name,
      version: "2.0.0",
      hashes: [{ alg: "SHA-512", content: "01".repeat(64) }],
    })),
  };
  verifyRecipientSbom(bom, release, "win32-x64");
  bom.components[1].hashes[0].content = "02".repeat(64);
  assert.throws(
    () => verifyRecipientSbom(bom, release, "win32-x64"),
    /identity/u,
  );
});
