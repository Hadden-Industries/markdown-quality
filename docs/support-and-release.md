# Support and release

Latest-commit adoption does not require a new npm release.
Qualify and freeze the full producer commit, exact transported core/native archives, installed JavaScript graph, shared assets and paired reusable workflow revision.
Packing includes a clean/dirty source identity; trusted qualification refuses a dirty or mismatched source tuple.
Public release, semver selection, registry qualification and `latest` promotion remain separate effects.
The [centralized contracts guide](centralized-contracts.md) describes configuration schema 2, result schema 3 and the shared trusted qualification/profile contract.
Local source tests do not establish hosted Windows/Linux qualification or downstream acceptance of a new tuple.

Development source targets the consumer minima in the [canonical Node policy](https://github.com/Hadden-Industries/markdown-quality/blob/main/assets/node-support.json).
Other major families, including future majors, are excluded until qualified.
The [runtime compatibility record](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/node-runtime-compatibility.md) explains the lower bounds and distinguishes compatibility from security patch recommendations.
The qualification matrix covers Node 22/24/26 on Windows x64 and Ubuntu 24.04 x64 with glibc.
Each workflow resolves the declared minimum and latest stable release of each line from official Node release metadata, collapsing equal versions.
It additionally retains the pinned reference even when that version is neither a minimum nor latest.
It fails rather than silently dropping a missing minimum or reference.
All lanes run product source checks and real CLI/native consumer probes in root and isolated layouts, with exact formatting bytes, fenced literal preservation, convergence, local-link failure and operational-error contracts.
Fresh installation and offline lockfile replay enforce package engines.
The package workflow records the actual product runtime before switching to the reference runtime for the mandatory isolated JSON tooling checks.
The transported lanes install the same frozen archives produced once on the reference runtime; unchanged native executables are not rebuilt for each Node version.
Performance measurements remain on the reference runtime.
The candidate manifest freezes the runtime policy and resolved matrix alongside archive hashes.
Publication admission requires every matching provider job to succeed for that exact source and run attempt; release evidence retains the snapshot as `candidate.runtimePolicy` and `candidate.matrix`.
Historical candidates without a matrix retain their original two-platform read-only evidence contract; current publishing requires the complete deliberate qualification.
Only observed passing platform evidence can establish support.
Use the latest security-patched release in a supported family for ordinary operation; the compatibility minimum is not a security recommendation.
Published 1.0.3 retains its immutable `>=24.21.0 <25` engine declaration and Node 24.21.0 qualification.
This source compatibility change does not republish 1.0.3 or authorize a new release; Node 22/26 consumer support requires qualification of the adopted source/archive tuple or a subsequent release.
macOS, ARM, and musl are unqualified.
Controlled Linux builds require glibc 2.39, as supplied by Ubuntu 24.04.
Windows requires the installed x64 Microsoft Visual C++ runtime (`VCRUNTIME140.dll` and UCRT).
No system runtime installer or runtime download is shipped.
Core and platform packages share one immutable release version.
Consumers pin the package, preset, and lockfile.

The public contract includes CLI, library API, schemas, exit meanings, formatter output, and default diagnostics.
A compatible repair may use a patch version.
An opt-in compatible feature may use a minor version.
The owner-approved opinionated-defaults change replaces `authored-gfm@1` in place and requires a new package major because existing invocations change.
The [current compatibility contract](centralized-contracts.md#current-source-compatibility) owns schema admission, advisory severities, strict admission and effective native policy.
Do not republish existing archives or describe this development source as the published 1.0.3 behavior.
Exact coordinated package version selection and publication remain release decisions.
Dependency upgrades are classified from observed corpus and consumer deltas.
Never overwrite a published version.
After npm accepts publication, allow up to five minutes for anonymous version metadata and both installer metadata representations to expose the exact approved integrity.
Only a processing 404 is retried; mismatched integrity and other failures stop delivery.
Publication is never repeated by this availability check.
The three bounded waits fit within the publisher's thirty-minute job limit.

Version 1.0.2 is published under the pilot tag and passed complete Windows/Linux registry qualification in run `37417063198`; stable promotion remains gated.
General stable promotion requires the same qualified tuple on both platforms, public registry readback and unauthenticated installation, both pilot acceptances, and a timed restoration exercise; the explicit 1.0.3 exception below preserves qualification while separating the paused consumer migrations.
The 1.0.1 corrective candidate restores checking and formatting of literal code lines containing trailing or whitespace-only spaces.
The original 1.0.1 tuple is published under `pilot` and passed both-platform complete registry qualification in recovery run `37413673170`, without republishing any package.
The 1.0.2 correction compares inline-code line endings as spaces under CommonMark, retaining meaningful interior whitespace and the strict fenced/indented-code guard.
This repair changes shipped JavaScript and therefore requires a new coordinated patch version; the unchanged 1.0.0 tuple completed registry qualification separately in recovery run `37409484508`.
The earlier literal-preservation releases retained their exact platform, registry and pilot gates; their qualification does not establish delivery or consumer adoption of a later version.
Changed/referrer mode and later fleet adoptions remain deferred.

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
All three packages declare public access and share the source candidate version 1.0.3.
The tuple retains alpha.4's qualified native executable/source/notice bytes and adds bounded request-local reuse, native checking batches and exact-input check-first formatting while retaining independent prose checks and preservation/convergence checks.
The first alpha.3 hosted OWLAPI shadow checks passed correctness but exceeded the accepted 30-second budget on both platforms.
Alpha.3 and alpha.4 remain immutable historical evidence.
Every new source tuple requires transported-archive qualification; registry qualification applies when that tuple is publicly published.
Exact-version public pilot qualification remains governed by the applicable owner release decision.
The public alpha.2 archives remain immutable historical delivery evidence and are unqualified for Linux execution.
The packer normalizes the Linux npm member's executable mode with Python tarfile, verifies all member bytes are unchanged, and recomputes the final archive integrity.
Qualify the exact transported release archives on both platforms, rather than each platform's independently generated package.
The unpublished private alpha.1 candidate and all rejected attempts remain historical evidence.
The current supported path is the [deliberate release operation](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/release-operations.md).
Ordinary direct-main development remains available after local tests.
A manual release qualification composes fresh product, JSON, architecture, transported matrix, performance, exact-source CodeQL, actual recipient audit and distribution SBOM gates.
Ordinary CI success alone cannot authorize staging.

The owner prepares a verified signed exact-source tag and a draft with the archive-bound review decisions.
The stage-only npm connection uses publish.yml and the main-only npm-publication environment.
Native packages are staged under pilot, inspected and approved by the owner with 2FA, then publicly verified on both platforms before a manual continuation can stage core.
Core requires another owner approval.
No long-lived publishing token, direct publish fallback, automatic approval or implicit latest label is used.

A separate manual public-qualification workflow exercises every frozen runtime lane and both layouts with anonymous acquisition, frozen lock replay and native provenance verification.
A later manual archival run requires its completed provider evidence and exact consumer/restoration acceptance.
It verifies the complete draft, publishes an immutable GitHub prerelease and verifies every asset.
Stable promotion is separately dispatched: native npm latest labels first, core last, then the same GitHub release stable/latest, with final readback across both services.
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
The general pilot-promotion path requires one pilot rehearsal; the owner's exact 1.0.3 release decision leaves those consumer restoration exercises with their separately gated migrations.

Security reports use GitHub's private vulnerability reporting route when enabled; otherwise contact the repository owner through the project's existing private channel.
No unattended observation service is assumed.
During this authorized session, critical/high reports block promotion immediately.
The owner accepted maintained support targets on 2026-10-05; see [the security policy](../SECURITY.md).
Maksym Shostak / Hadden Industries owns manual report handling and dependency/advisory review.
Private reporting is enabled for this repository, as read back from GitHub on 2026-10-05; the existing organization security mailbox is the fallback.
Review dependency/advisory health at each release preparation and monthly while maintained.
Retain release source, build inputs, notices, recipient delivery/qualification evidence, and accepted recovery inputs for the maintained release lifetime plus three years after support ends, honoring any applicable license obligations requiring more.
This is an operational retention floor, not a legal interpretation.
Before stable promotion, only the candidate designated by `pilot` is maintained; after stable promotion, only the latest stable release designated by `latest` is maintained unless another line is explicitly accepted.
Consumers remain exactly pinned and upgrades individually qualified; older downloadable releases have no implied support or backport promise.

Pilot qualification uses six consecutive valid full checks per frozen corpus/platform, excluding installation, with observed nearest-rank sample p95 at most 30 seconds.
With six samples, that is the observed maximum; it is not a statistical tail or arbitrary-repository guarantee.
The memory budgets are 512 MiB Windows Job Object committed memory and 512 MiB Linux whole-process-tree resident memory, reported separately as different metrics.
These qualification budgets do not impose OS runtime limits or select consumer resource ceilings.
Consumers can raise or bypass package resource defaults as documented in the consumer guide; qualification records must identify any selected override.
Require zero unexpected errors or adjudicated false positives in the window and accepted fixture/probe corpus, retaining expected negative probes separately.
Rehearse one task-owned pilot restoration within 60 minutes through byte/sentinel readback and incumbent local checks; hosted required-status recovery remains separate acceptance evidence.
The alpha.4 pilot cutovers passed both hosted platform windows and scoped restoration; those records do not establish acceptance of a later exact tuple.
Version 1.0.2 requires fresh per-consumer scope, hosted platform windows, restoration and exact trusted-run acceptance before promotion.

Provide AGPL corresponding source and build materials alongside object-code delivery to actual recipients.
Preserve third-party license texts and attribution.
Public registry access does not waive source obligations.
The repository's original `LICENSE` bytes are verified by the full check.

The producer uses a root-only `micromark-extension-math` override to KaTeX 0.19.0.
[npm applies overrides only from the root project](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#overrides); that alone does not protect a fresh library consumer.
The authorized qualification repair therefore uses [native bundled dependencies](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#bundledependencies) to ship ESLint Markdown's complete runtime closure, including the fixed KaTeX version.
Staging obtains this closure through an offline, script-disabled `npm ci` using the producer manifest, frozen lock and npm's integrity-checked cache.
It never copies the ambient `node_modules` tree.
The staged `micromark-extension-math` 3.1.0 manifest declares KaTeX 0.19.0 explicitly; executable upstream source remains unchanged.
The original root override is removed from the published manifest, and native `npm pack` validates the resulting dependency edges.
The generated `assets/bundled-dependencies.json` binds the exact files, source lock, original registry identities, retained notices and the single metadata repair.
Packing and architecture qualification verify that inventory; development tools remain excluded.
Fresh root and isolated consumers must install without lifecycle scripts or overrides, have a valid native dependency tree, pass malicious-input and legitimate-rendering probes, and reinstall offline from their own frozen lock.
Release qualification additionally requires the actual installed-recipient audit and distribution SBOM.
This changes candidate source and packaging only; immutable release 1.0.3 remains unchanged until a separately authorized new version is qualified and released.
Remove the vendored metadata repair and bundling when a maintained upstream release declares a safe KaTeX range and the same recipient checks pass without them.

Production qualification allows five minutes per npm install or ci operation, thirty minutes per Node test suite, and forty-five minutes per enclosing product, candidate or registry qualification job.
The same shared commands supply these budgets to normal CI and deliberate release qualification, without requiring the diagnostic observation profile.
Other npm commands retain their two-minute ceiling, and explicit shorter fixture timeouts remain authoritative.
Acquisition requests use a 15-second timeout and two native retries, with bounded backoff, so npm's default five-minute request timeout cannot consume the entire command deadline before recovery starts.
Only npm's idempotent fetch recovery is used; the outer install command is not retried.
A sustained registry outage still fails qualification.
The 30-second corpus gate and 512-MiB process-tree budgets also remain unchanged.
These are measured project acceptance criteria, not durations prescribed by an external standard.
The owner adopted the larger execution budgets after a successful instrumented Windows run left about thirty seconds of headroom under the former ten-minute suite ceiling.
This decision provides execution headroom; it does not establish that the intermittent installation slowdown is fixed.
See the [qualification repair evidence](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/research/2026-10-17-release-qualification-repair.md) for observed failures, limits, diagnosis and validation boundaries.
