// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileNativeSbom,
  reconcileMergedSbom,
  verifyRecipientSbom,
} from "../scripts/distribution-sbom.js";

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
