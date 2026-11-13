# Node runtime compatibility

**Running Markdown Quality in your project?**
Use a security-patched release in one of the tested LTS families listed under [consumer bounds](#consumer-bounds).
The compatibility floor is the oldest runtime qualified with installed consumers.

**Building or releasing Markdown Quality?**
Use the pinned development/release reference.
See [CI and tooling](#ci-and-tooling) to update the pin or reproduce the test matrix.

## Consumer bounds

<!-- node-support:start -->

Compatibility floor: Node >=22.13.0.
Tested LTS families: 22, 24, 26.
Other engine-compatible releases receive best-effort compatibility.
Producer npm: 12.2.2; consumer npm: 11.21.2.

Development/release reference: 26.13.0.

<!-- node-support:end -->

### Contributor and consumer npm

| Task                                          | Version source                                                           | Purpose                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Source development                            | Generated `devEngines.packageManager` in [package.json](../package.json) | Enforce the contributor npm minimum before install, clean install and scripts.                 |
| Routine CI, packing and release qualification | `producerNpm` in [the runtime policy](../assets/node-support.json)       | Select and verify one exact producer npm.                                                      |
| Packed-package consumer qualification         | `consumerNpm` in the same policy                                         | Exercise installation and public behavior with npm that also supports the consumer Node floor. |

The contributor floor is a conservative known-working requirement.
A source-lockfile dry run using the older consumer npm exhausted roughly 4 GiB of V8 heap, while the producer npm completed the same dry run.
That observation concerns the source development graph; it does not establish the lowest working npm version or a failure to install the packed product.
The older invocation also inherited npm-wrapper configuration warnings, so it does not isolate the underlying npm defect.

On 11 November 2026, the packed working checkout passed clean Windows x64 consumer checks with npm 11.21.2 and Node 26.13.0.
Both root and isolated installations passed installed-file hash verification, 81 public CLI cases in total, and offline `npm ci` replay with unchanged lockfiles; lifecycle scripts were disabled.
This was local transported-archive verification of an uncommitted checkout, not public-registry acquisition or hosted platform qualification.
It did not test Node 22.13.0 in that run, so the minimum-Node/npm pair still needs its own qualification for the candidate being accepted.

The packer removes contributor-only `devEngines` and `packageManager` declarations.
Keep the consumer npm separate unless real installed-package failures justify changing consumer support.

### Why the Windows staging checks matter

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

The published source engine range follows the minimum in the canonical policy, including other compatible major releases on a best-effort basis.
Only the policy's explicit tested families receive mandatory qualification; dependency engine restrictions can still prevent installation on a best-effort release such as Node 23.

## CI and tooling

[The runtime policy](../assets/node-support.json) owns one consumer floor, tested LTS families, the pinned producer reference and separate producer/consumer npm versions.
Change version values there, then run `npm run sync:node`.
The platform entries select the GitHub-hosted x64 runner images for Linux and Windows.
Run the same command after changing a runner label and include the regenerated workflows.
The checked projections update npm engines, workflow bootstrap selections, `.node-version`, bootstrap JSON and the version list above.

Refresh root lock metadata with native `npm install --package-lock-only --ignore-scripts`; the projector never rewrites the dependency graph.
`npm run check:node` and both full/product verification reject drift.
This follows OwlAPI's canonical runtime policy and checked workflow projections; frozen release evidence and deliberately synthetic test policies retain their own recorded versions.

Routine CI, release and qualification share the exact producer reference.
The compatibility matrix uses the exact floor, compatibility pins and producer reference in the repository's Node support policy.
An explicit imminent-LTS family exception remains policy-owned; parity alone does not designate an LTS family.

The reference is independently admitted within a supported family; it need not equal a minimum.
The matrix is frozen into candidate evidence and every resulting Windows/Linux consumer job is required for publication admission.
Reference performance jobs and artifact names retain their existing identities.

The producer performs source-wide checks and isolated JSON tooling on its reference runtime.
Consumer lanes run runtime-sensitive source regressions and both transported installation layouts on their selected runtime, using the separately pinned floor-compatible npm.

This permits older consumer runtimes without changing JSON Quality's separate support contract or bypassing its final checks.
Build, packing and release controls retain their pinned reference.
Their tooling requirements do not establish the consumer minimum.

## Qualification and scope

Use official Node distributions with their published SHA-256 identities.
Qualify real transported core/native archives in root and isolated installations, including fresh engine-strict installation and offline engine-strict lockfile replay.
The existing consumer corpus exercises public exports and schemas, bounded logical-document execution, exact formatting bytes, check-without-write behavior, convergence, literal preservation and failure preservation.

Run the runtime source checks at the Node floor, pinned compatibility endpoints and producer reference on both x64 runners listed in [the runtime policy](../assets/node-support.json).
The [qualification plan](plans/2026-10-15-node-runtime-compatibility-qualification.md) records completion evidence.

Tests use the native module-mock option supported by the selected runtime: `namedExports` on Node 22 and Node 24 before 24.15, and `exports` on newer supported runtimes.
This test-runner API distinction does not raise the product floor.

These source requirements do not change immutable published npm 1.0.3 metadata.
No npm, tag or release publication is included in the compatibility change.
