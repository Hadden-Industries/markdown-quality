# Controlled native builds

The owner approved hosted builds of frozen Snapper 0.11.9 on 2026-10-05.
The original repository license remains AGPL-3.0-only.
Snapper and its dependencies retain their own licenses and attribution.
The owned pipeline does not install Rust in the local development environment.

The [build manifest](../assets/native-build.json) pins the source commit, Cargo input hashes, Rust toolchain, default feature set, profile, targets, and helper archive hashes.
The [workflow](../.github/workflows/native.yml) runs on Windows 2022 x64 and Ubuntu 24.04 x64 with a 60-minute job limit.
It uses pinned Actions, read-only repository access, and no registry secrets or OIDC authority.
Only the implementation branch's native build changes trigger it automatically.
Explicit dispatch becomes available when GitHub registers the workflow on the default branch.

The build preserves the upstream default features and `dist` profile.
It compiles the native executable with cargo-auditable 0.7.7 and extracts the embedded dependency graph using the checksum-pinned rust-audit-info 0.5.4 crate and its packaged lock.
The upstream audit tool Git checkout's stale standalone lock was rejected by the first build; the verified published crate preserves locked compilation.
The source and extractor locks must remain frozen.
The declared features are passed explicitly to metadata, compilation, and notice generation after checking the frozen source defaults.
Rust's source revision and runtime license texts are checksum-pinned separately.
No upstream installer script runs.

The embedded stable-Cargo graph is conservative and does not prove exact linker reachability.
The builder separately retains target-filtered Cargo component metadata, original nested license and notice files, cargo-about 0.9.2 output, and the toolchain's official `COPYRIGHT-library.html`.
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
It emits a candidate manifest without approving rights or mutating the accepted manifest.
Independent review must reconcile native code, embedded data, Rust runtime, and system linkage before private release.
Cargo-about can supply generic license text when a crate omits its original license file.
That text alone does not establish original copyright attribution.
Repack qualification must retain any missing original notices from the exact crate's source revision in a separately reviewed rights supplement.
The supplement is bound to source archive checksums and both binary hashes, and included in each delivered `component.json` as well as the core tool manifest.
Both acquisition archives and native packages also deliver `rights-evidence.json` and readable original notices in `SUPPLEMENTAL-NOTICES.txt`.
Original hosted files and build evidence remain unchanged; this supplement records a separate repack step.
The freeze command's `--rights` input includes the supplement without issuing rights approval.
Authored build configuration, JSON reports, package metadata and command status use explicit UTF-8 and LF on both platforms.
The builder serializes the cargo-about JSON report itself so dependency defaults cannot select its physical line endings.
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
