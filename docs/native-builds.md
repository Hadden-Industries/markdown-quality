# Controlled native builds

The owner approved hosted builds of frozen Snapper 0.11.9 on 2026-10-05.
The original repository license remains AGPL-3.0-only.
Snapper and its dependencies retain their own licenses and attribution.
The owned pipeline does not install Rust in the local development environment.

## Identify the accepted build inputs

The [build manifest](../assets/native-build.json) pins the source commit, Cargo input hashes, Rust toolchain, default feature set, profile, targets, and helper archive hashes.
It remains the frozen input for the accepted Snapper 0.11.9 artifacts.

The separate [next-build input](../scripts/native-build-next.json) prepares Snapper 0.11.10, Rust 1.99.1 and cargo-about 0.9.3; cargo-auditable 0.7.7 and rust-audit-info 0.5.4 remain current.
These candidate inputs do not update shipped binaries, existing rights evidence or acquisition URLs.
Snapper 0.11.10 still contains [issue 530](https://github.com/TurtleTech-ehf/snapper/issues/530): Markdown slash pairs, intraword underscores and plus signs can hide sentence boundaries and produce a false clean check.

The fix in [PR 531](https://github.com/TurtleTech-ehf/snapper/pull/531) merged on 26 October, after the [0.11.10 release](https://github.com/TurtleTech-ehf/snapper/releases/tag/v0.11.10) on 11 October.
Direct probes of the verified 0.11.10 Windows release still reproduce that failure; a plain-text control detects the fused sentences.

## Run the hosted producer

The [native build workflow](../.github/workflows/native.yml) builds each x64 target on the Windows or Linux runner selected by [the runtime policy](../assets/node-support.json), with a 60-minute limit per job.
On Linux the builder checks the executable's required glibc symbols against the supported 2.39 floor.
It uses pinned Actions, read-only repository access, and no registry secrets or OIDC authority.
It runs only by explicit dispatch, with a choice of the accepted or next-build input.

The workflow describes that exact input, selects its reviewed literal checkout pin, and passes the same input to the builder.
Those conditional checkout steps are checked projections of the build configurations, so no runtime output or dispatch value supplies an upstream revision.

After an approved build-input change, run `python scripts/build-native.py --write-workflow`; `--check-workflow` and the native evidence suite reject drift.
`python scripts/build-native.py --config scripts/native-build-next.json --describe-config` inspects its identity locally without acquiring tools or enabling a local build.
Dispatching hosted native builds, adopting their output, and publishing replacement native artifacts require separate authority; source publication and PR CI do not perform those actions.

## Verify dependencies and notices

The build preserves the upstream default features and `dist` profile.
It compiles the native executable with cargo-auditable 0.7.7 and extracts the embedded dependency graph using the checksum-pinned rust-audit-info 0.5.4 crate and its packaged lock.
The upstream audit tool Git checkout's stale standalone lock was rejected by the first build; the verified published crate preserves locked compilation.

The source and extractor locks must remain frozen.
The declared features are passed explicitly to metadata, compilation, and notice generation after checking the frozen source defaults.
Rust's source revision and runtime license texts are checksum-pinned separately.
No upstream installer script runs.

The embedded stable-Cargo graph is conservative and does not prove exact linker reachability.
The builder separately retains target-filtered Cargo component metadata, original nested license and notice files, the selected cargo-about tool's output, and the toolchain's official `COPYRIGHT-library.html`.

This includes native C and grammar notices found in crate source trees, and Rust standard-library material outside the application Cargo graph.
Build-only dependencies may appear in the conservative notices.
Registry source archives are checked against Cargo.lock in Cargo's ordinary cache.
The collector hashes the actual source files directly; it does not assume a cargo-vendor checksum file exists.

Runtime model acquisition and dynamically loaded external programs are not represented as shipped files.
Their absence from package contents must be independently checked.
The compiled `webpki-roots` 0.25.4 dependency is MPL-2.0.
The pipeline accepts that exact component's license, retains its notices, and delivers its unchanged source in `MPL-SOURCE.tar.xz`.

The source remains under MPL-2.0, and the wrapper's AGPL-3.0-only license is preserved.
Changed MPL components fail qualification.
This implements the recipient source notice and availability required by [Mozilla's distribution guidance](https://www.mozilla.org/en-US/MPL/2.0/FAQ/), rather than waiving the license gate.

Each hosted artifact binds its executable, notice files, inventory, and embedded metadata by SHA-256 to the source, toolchain, target, workflow commit, and run.
The freeze script checks those identities and creates deterministic acquisition archives.
New build evidence includes the verified Snapper version and exact build-configuration digest; freezing checks both before assigning the candidate version.

Only the accepted historical configuration can use old evidence without those fields.
For the next-build run, supply `--config scripts/native-build-next.json` to `scripts/freeze-native.py` so its candidate manifest binds the new source, version and configuration bytes.
Omitting that option retains the accepted build input and rejects evidence from a different source.

It emits a candidate manifest without approving rights or mutating the accepted manifest.
Independent review must reconcile native code, embedded data, Rust runtime, and system linkage before release.
Cargo-about can supply generic license text when a crate omits its original license file.
That text alone does not establish original copyright attribution.

Repack qualification must retain any missing original notices from the exact crate's source revision in a separately reviewed rights supplement.
The supplement is bound to source archive checksums and both binary hashes, and included in each delivered `component.json` as well as the core tool manifest.
Both acquisition archives and native packages also deliver `rights-evidence.json` and readable original notices in `SUPPLEMENTAL-NOTICES.txt`.

Original hosted files and build evidence remain unchanged; this supplement records a separate repack step.
The freeze command's `--rights` input includes the supplement without issuing rights approval.
Authored build configuration, JSON reports, package metadata and command status use explicit UTF-8 and LF on both platforms.

The builder serializes the cargo-about JSON report itself so dependency defaults cannot select its physical line endings.
Before materialization, the owning reader inspects every object pair and removes only repeated identical boolean `doctest` fields emitted by cargo-about 0.9.2.

Differing values, non-boolean duplicates, all other repeated names and non-JSON numeric constants fail without replacing the raw report.
The retained platform reports independently established 3,598 Linux and 3,586 Windows occurrences with no conflicting values; no licence text, component or array entry is removed.
New hosted runs retain original cargo-about bytes in a separate native-originals artifact outside recipient output, with raw/output identities and counts in build evidence.

The original artifact remains evidence even when its raw redundant fields fail strict JSON checking; it is not shipped as a consumer document or relabelled as a passing strict report.
Readable `THIRD-PARTY-NOTICES.txt` and `SUPPLEMENTAL-NOTICES.txt` render physical CRLF and lone CR as LF.

Original notice text and original-file hashes remain in the inventories and rights supplement; acquired licenses, runtime copyright files and source archives retain their original bytes.
The producer regression suite checks physical output bytes, including generated files outside Git tracking, before their hashes are bound into evidence.
These producer changes apply to newly generated artifacts.

Existing frozen hosted files, manifests and acquisition archives retain their established identities; applying the new build serialization requires a fresh build, freeze and qualification rather than editing retained evidence.
New binaries must pass both platform suites, packed consumers, the bounded quoted-list exception regressions, and semantic and literal preservation checks.

Keep the original failed build proof before a diagnosed retry.
Do not rerun unchanged failures or start another broad review after a narrow repair.
Notice and source collection runs before compilation so a collection failure stops the inexpensive preflight.

Retain frozen source and dependency checksums, notices, acquisition archives, build identities, review decisions, and release evidence for the maintained release lifetime.
The hosted artifact's 30-day expiry is transport storage; the maintainer must retain the accepted evidence and recipient source materials independently.

References: [auditable metadata and limitations](https://github.com/rust-secure-code/cargo-auditable), [cargo-about license harvesting](https://github.com/EmbarkStudios/cargo-about/tree/0.9.2), and [Rust copyright tracking](https://github.com/rust-lang/rust/blob/1.98.1/COPYRIGHT).
