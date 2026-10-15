# Node runtime compatibility

Consumer compatibility, current-version testing and the development/release runtime serve different purposes.
The consumer minimum is the oldest version justified by the product and its dependencies and qualified with real installed consumers.
Use the latest security-patched release in a supported family for ordinary operation.
Admitting an older compatible patch does not recommend its security posture.

## Consumer bounds

| Family  | Candidate minimum | Lower-bound reason                                                                                                       |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node 22 | 22.17.0           | Dependencies permit 22.13.0, but Windows native staging needs the libuv 1.51.0 identity fixes first included in 22.17.0. |
| Node 24 | 24.2.0            | Dependencies permit 24.0.0, but Windows native staging needs the libuv 1.51.0 identity fixes first included in 24.2.0.   |
| Node 26 | 26.0.0            | Every locked production dependency admits the first release in this family.                                              |

The 2026-10-15 inspection covered all 158 locked production dependency entries.
All three candidates satisfy their declared engines; Node 22.12.0 does not satisfy the ESLint graph.
[ESLint's documented runtime support](https://eslint.org/docs/latest/use/migrate-to-10.0.0#nodejs--v2019-v21-v23-are-no-longer-supported) independently confirms its Node 22.13.0 and Node 24.0.0 boundaries.
The dependency-only candidates 22.13.0 and 24.0.0 passed the original single-document installed probes but failed real native batch staging on Windows.
A minimal exclusive-file reproduction showed `fstat()` returning a nonzero device identity while `lstat()` returned zero for that same file.
The existing staging guard correctly refused to clean a file whose identity appeared changed.
The relevant upstream fixes correct [Windows stat structure fields](https://github.com/libuv/libuv/commit/abe59d6319973cbff0686f41869cf8ae50bab1d2) and [volume serial-number consistency](https://github.com/libuv/libuv/pull/4698).
Official Node release metadata first includes libuv 1.51.0 at Node 22.17.0 and 24.2.0; Node 26.0.0 already has libuv 1.52.1.
The exact immediate predecessors, Node 22.16.0 and 24.1.0, fail the identity reproduction; 22.17.0, 24.2.0 and 26.0.0 pass it.
The identity guard is preserved.
The packed consumer corpus now also exercises multi-document native batch staging, so a single-document pass cannot hide this incompatibility.
The supported families remain 22, 24 and 26; odd and future major releases require their own decision and qualification.

## CI and tooling

[The runtime policy](../assets/node-support.json) owns consumer minima and the pinned reference.
The existing matrix resolver includes each minimum, the latest stable release in its family from official Node metadata, and reference Node 24.21.0, deduplicating equal versions.
The reference is independently admitted within a supported family; it need not equal a minimum.
The matrix is frozen into candidate evidence and every resulting Windows/Linux consumer job is required for publication admission.
Reference performance jobs and artifact names retain their existing identities.

Product lanes execute checks on their selected runtime and record that exact identity.
They then select reference Node 24.21.0 for isolated JSON tooling checks.
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
