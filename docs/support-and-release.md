# Support and release

For an installation decision, start with [supported runtimes and platforms](#supported-runtimes-and-platforms).
To prepare or promote a package, follow the [release runbook](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/release-operations.md).

Latest-commit adoption does not require a new npm release.
Qualify and freeze the full producer commit, exact transported core/native archives, installed JavaScript graph, shared assets and paired reusable workflow revision.
Packing includes a clean/dirty source identity; trusted qualification refuses a dirty or mismatched source tuple.
Public release, semver selection, registry qualification and `latest` promotion remain separate effects.

The [centralized contracts guide](centralized-contracts.md) describes configuration schema 3, result schema 5, execution schema 2, comparison schema 3 and the shared trusted qualification/profile contract.
Local source tests do not establish hosted Windows/Linux qualification or downstream acceptance of a new tuple.

## Version 3.0.2

The core package and both native packages share version 3.0.2.
This patch retains the CLI, SDK, configuration and schema contracts described in the [3.0.2 migration notes](migration-guide.md#from-301-to-302).
It preserves the runtime floor and retained Snapper executable bytes.

The release includes updated Markdown and HTML tooling, refreshed dependency locks and an explicit `fast-xml-parser >=5.12.0` development override.
Release CI adds coordinated family operations and retained release evidence, with aligned CodeQL Actions and query packs.
Owner approval includes an independent comparison of each downloaded staged tarball with the approved qualification manifest.
The report-validation and performance repairs from 3.0.1 carry forward.
The development lockfile selects JSON Quality 1.0.1 and matching native packages under the `>=1.0.1` development dependency.

Every release requires qualification of its exact source and transported package family.
Qualification and acceptance evidence remains bound to its original candidate.

## Supported runtimes and platforms

Development source targets the consumer floor in the [canonical Node policy](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/assets/node-support.json).
Other engine-compatible major releases receive best-effort support without a mandatory qualification claim.
The [runtime compatibility record](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/node-runtime-compatibility.md) explains the lower bounds and distinguishes compatibility from security patch recommendations.
The qualification matrix covers the Node policy's declared LTS families and supported platforms.

The coordinator constructs the 3.0.2 matrix from the minimum, compatibility pins and producer reference recorded in the release's Node policy.
It checks the policy against the locked production dependency engines and requires one compatibility pin for each supported major outside the reference family.

Routine CI, release construction and qualification use the same exact producer Node/npm selection.
Contributor npm eligibility and packed-package consumer npm remain separate; see [the runtime guide](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/node-runtime-compatibility.md#contributor-and-consumer-npm) for their purpose and the limits of local verification.

All lanes run product source checks and real CLI/native consumer probes in root and isolated layouts, with exact formatting bytes, fenced literal preservation, convergence, local-link failure and operational-error contracts.
Fresh installation and offline lockfile replay enforce package engines.

The reference producer owns the mandatory isolated JSON checks; consumer lanes record their own actual Node/npm/Python identities without rerunning producer policy.
The transported lanes install the same frozen archives produced once on the reference runtime; unchanged native executables are not rebuilt for each Node version.

Performance measurements remain on the reference runtime.
The candidate manifest freezes the runtime policy and resolved matrix alongside archive hashes.
Publication admission requires every matching provider job to succeed for that exact source and run attempt; release evidence retains the snapshot as `candidate.runtimePolicy` and `candidate.matrix`.

Historical candidates without a matrix retain their original two-platform read-only evidence contract; current publishing requires the complete deliberate qualification.
Only observed passing platform evidence can establish support.
Use the latest security-patched release in a supported family for ordinary operation; the compatibility minimum is not a security recommendation.

Published 1.0.3 retains its immutable `>=24.21.0 <25` engine declaration and Node 24.21.0 qualification.
Version 3.0.2 retains the Node `>=22.13.0` floor introduced in 2.0.0.
Its qualification matrix covers Node 22, 24 and 26 on Windows and Linux x64.
macOS, ARM, and musl are unqualified.

The Linux x64 executable targets a glibc 2.39 floor.
Windows requires the installed x64 Microsoft Visual C++ runtime (`VCRUNTIME140.dll` and UCRT).
No system runtime installer or runtime download is shipped.
Core and platform packages share one immutable release version.
Consumers pin the package, preset, and lockfile.

## Compatibility and versioning

The public contract includes CLI, library API, schemas, exit meanings, formatter output, and default diagnostics.
A compatible repair may use a patch version.
An opt-in compatible feature may use a minor version.
Version 2.0.0 introduced breaking changes to configurations, API names, flags and default verdicts.

It introduced zero-config operation, replaced `authored-gfm@1` with the stricter `authored-gfm@2` defaults, rejected configuration schemas 1 and 2 with migration guidance, and added the `normalize` command for NFC repair.
Explicitly named files are checked whatever their extension, `include` patterns can opt in other extensions, and MDX is refused.

It added `parse5` 8.1.0 (MIT) and `github-slugger` 2.0.0 (ISC) as direct runtime dependencies.
Published 1.0.3 remains unchanged; its schemas, preset and behavior are history, not the 2.0 contract.
The [contract versions](centralized-contracts.md#contract-versions) section owns schema admission, resource ceilings and the result, execution and comparison versions.

Do not republish existing archives or describe 2.0 behavior as the published 1.0.3 behavior.
For 3.0.2 the owner reviews the staging channel before publication.
The default is `pilot`, and the owner may explicitly select `latest`.
Dependency upgrades are classified from observed corpus and consumer deltas.
Never overwrite a published version.

When qualifying a public archive, allow up to five minutes per package for anonymous version metadata and both installer metadata representations to expose the exact approved integrity.
Only a processing 404 is retried; mismatched integrity and other failures stop delivery.
Publication is never repeated by this availability check.

## Historical pilot evidence

Version 1.0.2 was published under the pilot tag and passed complete Windows/Linux registry qualification in run `37417063198`.
Its stable promotion policy required the same qualified tuple on both platforms, public registry readback and unauthenticated installation, both pilot acceptances, and a timed restoration exercise.
The explicit 1.0.3 exception below preserved qualification while separating the paused consumer migrations.

The 1.0.1 corrective candidate restored checking and formatting of literal code lines containing trailing or whitespace-only spaces.
The original 1.0.1 tuple was published under `pilot` and passed both-platform complete registry qualification in recovery run `37413673170`, without republishing any package.

The 1.0.2 correction compared inline-code line endings as spaces under CommonMark, retaining meaningful interior whitespace and the strict fenced/indented-code guard.
This repair changed shipped JavaScript and required a new coordinated patch version.
The unchanged 1.0.0 tuple completed registry qualification separately in recovery run `37409484508`.

The earlier literal-preservation releases retained their exact platform, registry and pilot gates; their qualification does not establish delivery or consumer adoption of a later version.
Changed/referrer mode and later fleet adoptions remain deferred.

## Prepare and inspect the package family

Prepare assets explicitly from their frozen manifest.
Install source dependencies with `npm ci --ignore-scripts`.
Complete formatting and cheap syntax checks before freezing a candidate.
Run relevant tests and packed root/isolated consumers.
Retain independent correctness, security, platform, and rights review.
Recheck only affected questions after repairs.

```sh
node scripts/pack.js /approved/evidence/release
npm sbom --sbom-format cyclonedx
```

The packer emits coordinated archives and a digest-bound release manifest.
Its core manifest replaces development file dependencies with exact release versions.
The source lock does not become the consumer lock.

The source JS SBOM is accompanied by a distribution SBOM reconciled against the exact native/runtime components and separate observed recipient resolution inventories.
An upstream Cargo lock is a superset of features and development inputs and does not prove exact shipped component coverage.
The original upstream license and per-asset repack identity are retained.

The owner selected public distribution after npm rejected the private publication with E402.
All three packages declare public access and share version 3.0.2.
Its native packages carry the `snapper-0.11.9-build.2` executables from native run `38742809829`: the Linux executable is byte-identical to its reconciled predecessor and the Windows rebuild keeps the same system DLL imports.

The published 1.0.3 tuple retained alpha.4's qualified native executable/source/notice bytes and added bounded request-local reuse, native checking batches and exact-input check-first formatting while retaining independent prose checks and preservation/convergence checks.
The first alpha.3 hosted OWLAPI shadow checks passed correctness but exceeded the accepted 30-second budget on both platforms.

Alpha.3 and alpha.4 remain immutable historical evidence.
Every new source tuple requires transported-archive qualification; registry qualification applies when that tuple is publicly published.
Exact-version public pilot qualification remains governed by the applicable owner release decision.
The public alpha.2 archives remain immutable historical delivery evidence and are unqualified for Linux execution.

The packer normalizes the Linux npm member's executable mode with Python tarfile, verifies all member bytes are unchanged, and recomputes the final archive integrity.
Qualify the exact transported release archives on both platforms, rather than each platform's independently generated package.
The unpublished private alpha.1 candidate and all rejected attempts remain historical evidence.

## Release approval and promotion

The current supported path is the [deliberate release operation](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/release-operations.md).
Ordinary direct-main development remains available after local tests.
A manual release qualification composes fresh product, JSON, architecture, transported matrix, performance, exact-source CodeQL, actual recipient audit and distribution SBOM gates.
Ordinary CI success alone cannot authorize staging.

The owner prepares a verified signed exact-source tag and exact archive-bound review decisions through authenticated dispatch bytes.
The stage-only npm connection uses publish.yml and the main-only npm-publication environment.

Release qualification admits the final `3.0.2` coordinate from `main`.
It requires a three-part numeric version with a positive major and accepts no prerelease suffix.
Native packages are staged under the reviewed channel (`pilot` by default or explicitly `latest`), inspected and approved by the owner with 2FA, then publicly verified on both platforms before a manual continuation can stage core.
Core requires another owner approval.
Before each native or core approval, follow the [staged-tarball inspection procedure](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/release-operations.md#inspect-a-staged-tarball-before-approval).
The owner verifies the original stage identity and reviewed channel, downloads its actual tarball, and checks both SHA-256 and SHA-512 SRI before the separate 2FA approval.
No long-lived publishing token, direct publish fallback, automatic approval or implicit latest label is used.

A separate manual public-qualification workflow exercises every frozen runtime lane and both layouts with anonymous acquisition, frozen lock replay and native provenance verification.
A later manual archival run requires its completed provider evidence and exact owner acceptance.
OwlAPI/WebVOWL trials and timed recovery rehearsals are optional; both performance corpora remain mandatory.
It verifies the complete logical archive, publishes an immutable release and verifies every outer asset and indexed member.

Stable promotion, companion alignment and whole-family restoration use an owner-scoped operation with native npm labels first, core last where included, a sealed handoff to the separate GitHub writer, and independent read-only completion.
Direct stable latest staging classifies the same immutable GitHub release stable/latest after public qualification.
The downstream classification rules also handle an already qualified RC as npm's default while GitHub retains its prior stable release.
The current control source can advance during an owner pause without changing original package bytes, provided the explicit continuation retains and verifies all original identities.

An attempted or unknown staging outcome requires reconciliation; a 404 never authorizes replay.
Use original run/attempt/manifest/origin identities in a new manual continuation.
Read bounded native provider state before any repeat label or draft operation.
Changed package bytes require a new version.

Release transport artifacts request 90-day retention; export every required record before its actual expiry and retain it for the maintained lifetime plus three years after support ends.
Historical direct-publish evidence and the owner-authorized 1.0.3 exception remain read-only history and grant no current publishing authority.

For recovery, retain the exact consumer base revision, old manifest and lock, workflows, selected document preimages, and unrelated-file sentinels.
Restore only migration-owned changes.
Verify byte identities and required checks, then record elapsed restoration time.

Downgrading a package cannot restore formatted document bytes.
Current release decisions may elect a consumer rehearsal; its absence does not waive package, matrix, corpus, provenance, security or rights gates.
The owner's exact 1.0.3 waiver remains historical evidence.

Security reports use GitHub's private vulnerability reporting route when enabled; otherwise contact the repository owner through the project's existing private channel.
No unattended observation service is assumed.
Suspected critical or high severity issues block affected promotions under the [security policy](../SECURITY.md).
The owner accepted the support targets on 2026-10-05.

Maksym Shostak / Hadden Industries owns manual report handling and dependency/advisory review.
Private reporting is enabled for this repository, as read back from GitHub on 2026-10-05; the existing organization security mailbox is the fallback.
Review dependency/advisory health at each release preparation and monthly while maintained.

Retain release source, build inputs, notices, recipient delivery/qualification evidence, and accepted recovery inputs for the maintained release lifetime plus three years after support ends, honoring any applicable license obligations requiring more.
This is an operational retention floor, not a legal interpretation.

Before the first stable release, the explicitly designated candidate is maintained, normally under `pilot`.
Thereafter the accepted stable GitHub release defines the maintained security line; an npm default RC does not replace it unless another support line is explicitly accepted.
Consumers remain exactly pinned and upgrades individually qualified; older downloadable releases have no implied support or backport promise.

Pilot qualification uses six consecutive valid full checks per frozen corpus/platform, excluding installation, with observed nearest-rank sample p95 at most 30 seconds.
With six samples, that is the observed maximum; it is not a statistical tail or arbitrary-repository guarantee.

The memory budgets are 512 MiB Windows Job Object committed memory and 512 MiB Linux whole-process-tree resident memory, reported separately as different metrics.
These qualification budgets do not impose OS runtime limits or select consumer resource ceilings.

Consumers can raise or bypass package resource defaults as documented in the consumer guide; qualification records must identify any selected override.
Require zero unexpected errors or adjudicated false positives in the window and accepted fixture/probe corpus, retaining expected negative probes separately.
If a maintainer elects a recovery rehearsal, record its actual elapsed time through byte/sentinel readback and incumbent local checks; hosted required-status recovery remains separate evidence.

The alpha.4 pilot cutovers passed both hosted platform windows and scoped restoration; those records do not establish acceptance of a later exact tuple.
For 1.0.2 the owner required fresh per-consumer scope, hosted platform windows, restoration and exact trusted-run acceptance before promotion.

Provide AGPL corresponding source and build materials alongside object-code delivery to actual recipients.
Preserve third-party license texts and attribution.
Public registry access does not waive source obligations.
The repository's original `LICENSE` bytes are verified by the full check.

The producer's overrides in [the repository manifest](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/package.json) select patched KaTeX, glob and minimatch releases to resolve known dependency advisories.
[npm applies overrides only from the root project](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#overrides); that alone does not protect a fresh library consumer.
The qualification repair therefore uses [native bundled dependencies](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#bundledependencies) to ship ESLint Markdown's and ESLint's complete runtime closures, including the fixed KaTeX and minimatch versions.

Staging obtains this closure through an offline, script-disabled `npm ci` using the producer manifest, frozen lock and npm's integrity-checked cache.
It never copies the ambient `node_modules` tree.
The staged math extension, ESLint and config-array manifests explicitly declare those selected patched dependencies; executable upstream source remains unchanged.

The original root override is removed from the published manifest, and native `npm pack` validates the resulting dependency edges.
The generated `assets/bundled-dependencies.json` binds the exact files, source lock, original registry identities, retained notices and those metadata repairs.
Packing and architecture qualification verify that inventory; development tools remain excluded.

Fresh root and isolated consumers must install without lifecycle scripts or overrides, have a valid native dependency tree, pass malicious-input and legitimate-rendering probes, and reinstall offline from their own frozen lock.
Release qualification additionally requires the actual installed-recipient audit and distribution SBOM.

Immutable release 1.0.3 omitted these closures.
Version 3.0.2 retains the bundled dependency repair introduced in 2.0.0.
Remove each vendored metadata repair when maintained upstream releases declare safe dependency ranges and the same recipient checks pass without it; remove bundling when all repairs are unnecessary.

Tooling qualification allows twenty minutes per npm install or ci operation, thirty minutes per Node test suite and up to 120 minutes per enclosing job.
Evidence uploads have a five-minute step budget; bounded acquisition and extraction have a fifteen-minute collection budget.

These tooling deadlines do not change the product's public resource ceilings or corpus thresholds.
The same shared commands supply these budgets to normal CI and deliberate release qualification, without requiring the diagnostic observation profile.
Other npm commands retain their two-minute ceiling, and explicit shorter fixture timeouts remain authoritative.

Acquisition requests use a 15-second timeout and two native retries, with bounded backoff, so npm's default five-minute request timeout cannot consume the entire command deadline before recovery starts.
Only npm's idempotent fetch recovery is used; the outer install command is not retried.

A sustained registry outage still fails qualification.
The 30-second corpus gate and 512-MiB process-tree budgets also remain unchanged.
These are measured project acceptance criteria, not durations prescribed by an external standard.

The owner adopted the larger execution budgets after a successful instrumented Windows run left about thirty seconds of headroom under the former ten-minute suite ceiling.
This decision provides execution headroom; it does not establish that the intermittent installation slowdown is fixed.
See the [qualification repair evidence](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/research/2026-10-17-release-qualification-repair.md) for observed failures, limits, diagnosis and validation boundaries.
