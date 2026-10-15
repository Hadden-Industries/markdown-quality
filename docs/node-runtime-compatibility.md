# Node runtime compatibility

Consumer compatibility, current-version testing and the development/release runtime serve different purposes.
The consumer minimum is the oldest version justified by the product and its dependencies and qualified with real installed consumers.
Use the latest security-patched release in a supported family for ordinary operation.
Admitting an older compatible patch does not recommend its security posture.

## Consumer bounds

<!-- node-support:start -->

- Node 22: 22.13.0
- Node 24: 24.0.0
- Node 26: 26.0.0

Development/release reference: 24.21.0.

<!-- node-support:end -->

The 2026-10-15 inspection covered all 158 locked production dependency entries.
All three candidates satisfy their declared engines; Node 22.12.0 does not satisfy the ESLint graph.
[ESLint's documented runtime support](https://eslint.org/docs/latest/use/migrate-to-10.0.0#nodejs--v2019-v21-v23-are-no-longer-supported) independently confirms its Node 22.13.0 and Node 24.0.0 boundaries.
The dependency-only candidates 22.13.0 and 24.0.0 passed the original single-document installed probes but failed real native batch staging on Windows.
A minimal exclusive-file reproduction showed `fstat()` returning a nonzero device identity while `lstat()` returned zero for that same file.
The original staging guard refused to clean a file whose identity appeared changed.
The relevant upstream fixes correct [Windows stat structure fields](https://github.com/libuv/libuv/commit/abe59d6319973cbff0686f41869cf8ae50bab1d2) and [volume serial-number consistency](https://github.com/libuv/libuv/pull/4698).
Official Node release metadata first includes libuv 1.51.0 at Node 22.17.0 and 24.2.0; Node 26.0.0 already has libuv 1.52.1.
The exact immediate predecessors, Node 22.16.0 and 24.1.0, fail the identity reproduction; 22.17.0, 24.2.0 and 26.0.0 pass it.
The identity guard is preserved.
The repair obtains authoritative file identity and fingerprints from native handles consistently across native staging, trusted candidate staging and qualification evidence.
Path observations independently reject non-files, links, multiple hard links and changes across opening; full device identity remains part of handle-to-handle comparisons.
The original created-file handle identity protects cleanup against replacement, and callers retain their root/ancestor admission and bounded reads.
Descriptors close on validation failure as well as successful observations.
These observations detect changes; they do not lock files or promise an atomic filesystem snapshot.
The packed consumer corpus also exercises multi-document native batch staging, so a single-document pass cannot hide this incompatibility.
The supported families remain 22, 24 and 26; odd and future major releases require their own decision and qualification.

## CI and tooling

[The runtime policy](../assets/node-support.json) owns consumer minima and the pinned reference.
Change version values there, then run `npm run sync:node`.
The checked projections update npm engines and lock metadata, workflow bootstrap selections, the generated bootstrap JSON and the version list above.
`npm run check:node` and both full/product verification reject drift.
This follows OwlAPI's canonical runtime policy and checked workflow projections; frozen release evidence and deliberately synthetic test policies retain their own recorded versions.
The matrix resolver includes each minimum, the latest stable release in its family from official Node metadata, and the pinned reference, deduplicating equal versions.
The reference is independently admitted within a supported family; it need not equal a minimum.
The matrix is frozen into candidate evidence and every resulting Windows/Linux consumer job is required for publication admission.
Reference performance jobs and artifact names retain their existing identities.

Product lanes execute checks on their selected runtime and record that exact identity.
They then select the reference runtime for isolated JSON tooling checks.
This permits older consumer runtimes without changing JSON Quality's separate support contract or bypassing its final checks.
Build, packing and release controls retain their pinned reference.
Their tooling requirements do not establish the consumer minimum.

## Qualification and scope

Use official Node distributions with their published SHA-256 identities.
Qualify real transported core/native archives in root and isolated installations, including fresh engine-strict installation and offline engine-strict lockfile replay.
The existing consumer corpus exercises public exports and schemas, bounded logical-document execution, exact formatting bytes, check-without-write behavior, convergence, literal preservation and failure preservation.
Run product source checks on each exact minimum and latest version on Windows x64 and Ubuntu 24.04 x64.
The [qualification plan](plans/2026-10-15-node-runtime-compatibility-qualification.md) records completion evidence.

Tests use the native module-mock option supported by the selected runtime: `namedExports` on Node 22 and Node 24 before 24.15, and `exports` on newer supported runtimes.
This test-runner API distinction does not raise the product floor.

These source requirements do not change immutable published npm 1.0.3 metadata.
No npm, tag or release publication is included in the compatibility change.
