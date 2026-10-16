// SPDX-License-Identifier: AGPL-3.0-only
/** Repository-specific coverage reconciliation after native CycloneDX validation. */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

/** Reconcile every native core component against exact shipped package metadata. */
export function bindCoreSbom(bom, { archive, inventory }) {
  const rootFile = archive.files.find(({ path }) => path === "package.json");
  assert.ok(rootFile);
  const expected = [
    {
      path: "",
      name: archive.package,
      version: archive.version,
      license: "AGPL-3.0-only",
      manifestSha256: rootFile.sha256,
    },
    ...inventory.packages,
  ];
  const seen = new Set(),
    seenFiles = new Set();
  for (const component of bom.components) {
    if (component.type === "file") {
      const matches = expected.filter((pkg) => {
        const path = pkg.path ? `${pkg.path}/package.json` : "package.json";
        return (
          component.name.replaceAll("\\", "/").endsWith(`/${path}`) &&
          component.hashes?.some(
            ({ alg, content }) =>
              alg === "SHA-256" && content === pkg.manifestSha256,
          )
        );
      });
      assert.equal(matches.length, 1, "Unmapped core file component");
      const pkg = matches[0];
      assert.ok(!seenFiles.has(pkg.path), "Duplicate core file component");
      seenFiles.add(pkg.path);
      component.name = `package/${pkg.path ? pkg.path + "/" : ""}package.json`;
      continue;
    }
    assert.equal(component.type, "library", "Unexpected core component type");
    const locations = component.properties
      ?.filter(({ name }) => /^syft:location:\d+:path$/u.test(name))
      .map(({ value }) => value);
    assert.equal(locations?.length, 1, "Ambiguous core component location");
    const matches = expected.filter(
      (pkg) =>
        locations[0] === `/${pkg.path ? pkg.path + "/" : ""}package.json`,
    );
    assert.equal(
      matches.length,
      1,
      "Unexplained bundled component in core scan",
    );
    const pkg = matches[0];
    assert.equal(component.name, pkg.name);
    assert.equal(component.version, pkg.version);
    assert.ok(!seen.has(pkg.path), "Duplicate bundled component");
    seen.add(pkg.path);
    component.licenses = [{ expression: pkg.license }];
    if (pkg.path) {
      component.externalReferences = [
        ...(component.externalReferences ?? []),
        {
          type: "distribution",
          url: pkg.resolved,
          comment:
            "Original registry source archive; declared metadata repair is recorded separately in the shipped bundle inventory.",
          hashes: [
            {
              alg: "SHA-512",
              content: Buffer.from(
                pkg.integrity.slice("sha512-".length),
                "base64",
              ).toString("hex"),
            },
          ],
        },
      ];
      component.properties.push({
        name: "markdown-quality:shipped-manifest-sha256",
        value: pkg.manifestSha256,
      });
    }
  }
  const paths = expected.map(({ path }) => path).sort();
  assert.deepEqual(
    [...seen].sort(),
    paths,
    "Core scan omitted a shipped package",
  );
  assert.deepEqual(
    [...seenFiles].sort(),
    paths,
    "Core scan omitted shipped metadata",
  );
  Object.assign(bom.metadata.component, {
    type: "application",
    name: archive.package,
    version: archive.version,
    hashes: [{ alg: "SHA-256", content: archive.sha256 }],
    licenses: [{ expression: "AGPL-3.0-only" }],
    properties: [
      {
        name: "markdown-quality:coverage",
        value:
          "Exact core archive, including all inventoried bundled npm packages and metadata repairs. External dependencies are separate observed recipient resolutions.",
      },
    ],
  });
  return bom;
}

/** Native hierarchical composition must conserve components, rights and graph edges. */
export function reconcileMergedSbom(merged, inputs) {
  assert.equal(merged.components.length, inputs.length);
  const allRefs = new Set([merged.metadata.component["bom-ref"]]);
  for (const input of inputs) {
    const root = input.metadata.component;
    const matches = merged.components.filter(
      (component) =>
        component.name === root.name && component.version === root.version,
    );
    assert.equal(
      matches.length,
      1,
      "Merged package root is missing or duplicated",
    );
    const result = matches[0];
    const withoutReferences = ({ "bom-ref": ref, components, ...value }) =>
      value;
    assert.deepEqual(
      withoutReferences(result),
      withoutReferences(root),
      "Composition changed package attribution",
    );
    assert.equal(
      result.components.length,
      input.components.length,
      "Composition lost component coverage",
    );
    const refs = new Map([[root["bom-ref"], result["bom-ref"]]]);
    allRefs.add(result["bom-ref"]);
    for (const component of input.components) {
      const candidates = result.components.filter(
        (item) =>
          item.name === component.name &&
          item.version === component.version &&
          item.purl === component.purl &&
          item.type === component.type &&
          isDeepStrictEqual(item.properties ?? [], component.properties ?? []),
      );
      assert.equal(
        candidates.length,
        1,
        "Merged component identity is ambiguous",
      );
      assert.deepEqual(
        withoutReferences(candidates[0]),
        withoutReferences(component),
        "Composition lost component fields or rights",
      );
      refs.set(component["bom-ref"], candidates[0]["bom-ref"]);
      assert.ok(
        !allRefs.has(candidates[0]["bom-ref"]),
        "Duplicate merged component reference",
      );
      allRefs.add(candidates[0]["bom-ref"]);
    }
    for (const edge of input.dependencies ?? []) {
      const observed = merged.dependencies.filter(
        (item) => item.ref === refs.get(edge.ref),
      );
      assert.equal(observed.length, 1, "Composition lost a dependency node");
      assert.deepEqual(
        [...(observed[0].dependsOn ?? [])].sort(),
        (edge.dependsOn ?? [])
          .map((ref) => {
            assert.ok(refs.has(ref));
            return refs.get(ref);
          })
          .sort(),
        "Composition changed dependency relationships",
      );
    }
  }
  for (const edge of merged.dependencies ?? []) {
    assert.ok(allRefs.has(edge.ref), "Dangling merged dependency source");
    for (const ref of edge.dependsOn ?? [])
      assert.ok(allRefs.has(ref), "Dangling merged dependency target");
  }
}

/** An observed recipient BOM must contain the actual core and installed native archive. */
export function verifyRecipientSbom(bom, release, platform) {
  assert.equal(bom.bomFormat, "CycloneDX");
  for (const archive of release.archives.filter(
    ({ name }) => name === "core" || name === platform,
  )) {
    const found = bom.components.filter(({ name }) => name === archive.package);
    assert.equal(found.length, 1, "Recipient BOM omits an installed package");
    assert.equal(found[0].version, release.version);
    const digest = Buffer.from(
      archive.integrity.slice("sha512-".length),
      "base64",
    ).toString("hex");
    assert.ok(
      found[0].hashes?.some(
        ({ alg, content }) => alg === "SHA-512" && content === digest,
      ),
      "Recipient BOM archive identity mismatch",
    );
  }
}

/** Require every embedded runtime crate; build-only dependencies are not distribution claims. */
export function reconcileNativeSbom(bom, embedded) {
  assert.ok(Array.isArray(bom.components));
  assert.ok(Array.isArray(embedded.packages));
  const expected = embedded.packages
    .filter((component) => component.kind !== "build")
    .map(({ name, version }) => `${name}@${version}`)
    .sort();
  const actual = bom.components
    .filter((component) => component.purl?.startsWith("pkg:cargo/"))
    .map(({ name, version }) => `${name}@${version}`)
    .sort();
  assert.ok(expected.length, "Embedded runtime inventory is empty");
  assert.deepEqual(
    actual,
    expected,
    "Native runtime component coverage differs from the embedded build inventory",
  );
  return bom;
}

/** Add existing reviewed package/build identities to a native scanner's validated inventory. */
export function bindNativeSbom(
  bom,
  { archive, native, embedded, inventory, build },
) {
  reconcileNativeSbom(bom, embedded);
  const platform = native.platforms[archive.name];
  assert.equal(inventory.binarySha256, platform.sha256);
  assert.equal(build.binarySha256, platform.sha256);
  assert.equal(build.source, native.source.commit);
  for (const component of bom.components) {
    if (component.purl?.startsWith("pkg:cargo/")) {
      const rights = inventory.packages.filter(
        (item) =>
          item.name === component.name && item.version === component.version,
      );
      assert.equal(
        rights.length,
        1,
        "Native runtime crate lacks unique source/rights evidence",
      );
      const evidence = rights[0];
      assert.ok(evidence.license);
      component.licenses = [{ expression: evidence.license }];
      if (
        component.name === "snapper-fmt" &&
        component.version === native.snapperVersion
      ) {
        assert.equal(
          evidence.source,
          null,
          "Snapper is the qualified source root, not a registry dependency",
        );
        component.externalReferences = [
          {
            type: "vcs",
            url: `${native.source.repository}/tree/${native.source.commit}`,
          },
        ];
      } else {
        assert.match(evidence.sourceArchiveSha256, /^[a-f0-9]{64}$/u);
        component.externalReferences = [
          {
            type: "distribution",
            url: evidence.sourceArchiveUrl,
            hashes: [{ alg: "SHA-256", content: evidence.sourceArchiveSha256 }],
          },
        ];
      }
    } else if (component.type === "file") {
      // Syft's file component name is host-absolute. Its digest, not the host
      // path, binds it to the one packaged executable before path minimization.
      assert.ok(
        component.hashes.some(
          ({ alg, content }) =>
            alg === "SHA-256" && content === platform.sha256,
        ),
      );
      component.name = `package/${platform.executable}`;
    } else if (
      component.type === "application" &&
      component.name === "snapper-fmt"
    ) {
      component.version = native.snapperVersion;
    } else {
      assert.fail("Unreconciled native scanner component");
    }
  }
  const root = bom.metadata.component;
  Object.assign(root, {
    type: "application",
    name: archive.package,
    version: archive.version,
    purl: `pkg:npm/${archive.package.replace("@", "%40")}@${archive.version}`,
    hashes: [{ alg: "SHA-256", content: archive.sha256 }],
    licenses: [{ expression: "AGPL-3.0-only" }],
  });
  const rustVersion = /^rustc (\d+\.\d+\.\d+) /u.exec(build.rust)?.[1];
  assert.ok(rustVersion, "Missing qualified Rust runtime identity");
  const runtimeRef = `${archive.name}:rust-standard-library@${rustVersion}`;
  bom.components.push({
    "bom-ref": runtimeRef,
    type: "library",
    name: "Rust standard library",
    version: rustVersion,
    licenses: [
      {
        license: {
          name: "Rust runtime licenses and third-party notices in the packaged COPYRIGHT-library.html",
        },
      },
    ],
    externalReferences: build.rustRuntimeLicenseInputs.map(
      ({ url, sha256 }) => ({
        type: "license",
        url,
        hashes: [{ alg: "SHA-256", content: sha256 }],
      }),
    ),
    properties: [
      {
        name: "markdown-quality:coverage",
        value:
          "Qualified Rust runtime and official COPYRIGHT-library.html inventory; individual linked standard-library object attribution and a single license expression for the aggregate are not asserted",
      },
    ],
  });
  const dependencies = (bom.dependencies ??= []);
  let rootDependencies = dependencies.find(
    (item) => item.ref === root["bom-ref"],
  );
  if (!rootDependencies)
    dependencies.push(
      (rootDependencies = { ref: root["bom-ref"], dependsOn: [] }),
    );
  rootDependencies.dependsOn.push(runtimeRef);
  root.properties = [
    {
      name: "markdown-quality:coverage",
      value:
        "Embedded runtime crates reconciled against auditable binary metadata. Build-only crates excluded. Host-supplied operating-system libraries are not redistributed or versioned here; source/build/notice records retain that boundary.",
    },
  ];
  return bom;
}
