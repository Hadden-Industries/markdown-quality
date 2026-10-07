# Support and release

Development source admits Node 22.23.3+, Node 24.21.0+, and Node 26.10.0 or newer, excluding the unsupported Node 23/25 lines and with no upper major-version bound.
The qualification matrix covers Node 22/24/26 on Windows x64 and Ubuntu 24.04 x64 with glibc.
Each workflow resolves the declared minimum and latest stable patch of each line from official Node release metadata, collapsing equal versions.
It fails rather than silently dropping a missing minimum.
All lanes run source checks and real CLI/native consumer probes in root and isolated layouts, with exact formatting bytes, fenced literal preservation, convergence, local-link failure and operational-error contracts.
The transported lanes install the same frozen archives produced once on reference Node 24.21.0; unchanged native executables are not rebuilt for each Node version.
Performance measurements remain on the reference runtime.
The candidate manifest freezes the runtime policy and resolved matrix alongside archive hashes.
Publication admission requires every matching provider job to succeed for that exact source and run attempt; release evidence retains the snapshot as `candidate.runtimePolicy` and `candidate.matrix`.
Historical candidates without a matrix retain their original two-platform admission contract.
Only observed passing platform evidence can establish support.
Newer Node majors are permitted by the package metadata; they remain unqualified until tested.
Published 1.0.3 retains its immutable `>=24.21.0 <25` engine declaration and Node 24.21.0 qualification.
This source compatibility change does not republish 1.0.3 or authorize a new release; Node 22/26 consumer support requires a subsequent qualified release.
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
Configuration schema 1 remains loadable; result schema 2 distinguishes advisory severities, strict admission and effective native policy.
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
The JS SBOM must be reconciled with every compiled native/runtime component before release.
An upstream Cargo lock is a superset of features and development inputs and does not prove exact shipped component coverage.
The original upstream license and per-asset repack identity are retained.

The owner selected public distribution after npm rejected the private publication with E402.
All three packages declare public access and share the source candidate version 1.0.3.
The tuple retains alpha.4's qualified native executable/source/notice bytes and adds bounded request-local reuse, native checking batches and exact-input check-first formatting while retaining independent prose checks and preservation/convergence checks.
The first alpha.3 hosted OWLAPI shadow checks passed correctness but exceeded the accepted 30-second budget on both platforms.
Alpha.3 and alpha.4 remain immutable historical evidence; every new tuple requires fresh transported-archive and registry qualification, with exact-version pilot qualification governed by the applicable owner release decision.
The public alpha.2 archives remain immutable historical delivery evidence and are unqualified for Linux execution.
The packer normalizes the Linux npm member's executable mode with Python tarfile, verifies all member bytes are unchanged, and recomputes the final archive integrity.
Qualify the exact transported release archives on both platforms, rather than each platform's independently generated package.
The unpublished private alpha.1 candidate and all rejected attempts remain historical evidence.
Direct first publication uses explicit public access; a staged placeholder is unnecessary.
The manual publisher uses npm 12.2.0 in hosted CI and requires all three npm trusted-publisher mappings for this repository, publish.yml and the npm-publication environment.
That environment must permit exactly the main branch.
Ordinary publication verifies a successful same-source candidate run, all same-attempt jobs bound by the candidate manifest's runtime matrix, the approved manifest digest and exact frozen archive bytes.
Historical candidates require `pack` and their two platform consumers.
Recovery preserves the original candidate's source and archives separately from the current reviewed publishing-control source.
An admission job without OIDC binds a complete three-package origin map before effects; both platform jobs qualify previously attempted packages before the publisher may run.
Only a prior planned effect with an explicitly skipped publication step is eligible for first publication; an attempted or unknown outcome must be verified in the registry and cannot become eligible through a 404.
Each downstream job rehashes its downloaded archives against the admitted manifest.
The publisher rechecks current main, all three local archive hashes and version absence immediately before each single eligible publication and verifies both native archives before core.
Its explicit `distribution-tag` dispatch choice accepts only `pilot` or `latest` and defaults to `pilot`; select `latest` only for an owner-authorized stable release.
Publication step names retain their historical "under pilot" wording because their exact identifiers are required to reconcile earlier interrupted runs; the selected input controls the actual npm label.
Only the publication job has OIDC issuance permission; no long-lived npm token is supplied.
Both registry jobs use native npm signature/attestation verification and bind each installed package to its admitted source, workflow, exact publication run and attempt.
Their explicit non-cancellation and successful-publication condition prevents a skipped recovery ancestor from suppressing final qualification after ordinary publication.
Successful publication alone does not establish complete registry qualification; retain both actual terminal platform reports.
Each platform installs and cryptographically verifies its supported native package and core; opposite-platform native archives receive anonymous raw-byte verification, with the combined platform records covering the complete tuple.
Structural provenance fixtures do not establish cryptographic acceptance.
The workflow does not move labels on existing packages or grant npm tag-management permission.
The owner's explicit 1.0.3 stable/latest decision in [plan revision 8](https://github.com/Hadden-Industries/markdown-quality/blob/v1.0.3/docs/plans/implementation-plan.md#1-status-authority-and-purpose) supersedes the pilot-promotion hold for that release only; consumer adoption remains separate.
GitHub artifacts expire after 30 days, so export the complete frozen source, manifest, archives and verification bundles to the retained evidence store before expiry, for the security policy's maintained-lifetime-plus-three-years floor.
Public installation needs no registry token, subscription, or OIDC authority.
Public npm provenance is eligible only through a qualified supported publisher; do not claim it for the local bootstrap.
Retain attributable source/build/repack evidence and qualify attestations separately.

Publish native packages first under the explicitly accepted availability label and publish the core only when the tuple is coherent.
Read back hashes, public visibility, and fresh unauthenticated archive acquisition for every package.
Qualify root and isolated consumers on both supported platforms from the registry, without credentials.
Do not perform registry publication while rights, publisher authentication, independent assurance, or platform evidence remains missing.
A partial publication is not a completed coordinated release, even when individual package labels are visible; preserve its exact outcomes and use the unchanged-version recovery procedure below.
Changed bytes require a new corrective version.

For unchanged-version recovery, manually dispatch `publish.yml` with the original `candidate-run` and `manifest-sha256`, plus the terminal prior `recovery-run` and exact `recovery-attempt`.
The original legacy publication can omit `recovery-origins-sha256` only when its source is the original artifact source and its retained manifest matches exactly.
For a later recovery, independently approve the prior admission map's SHA-256 and pass it as `recovery-origins-sha256`; never infer expected origins from the attestation being verified.
Retain the actual dispatch inputs, original candidate/manifest, admission artifact, per-package map, provider attempts/jobs, effect outcomes and both registry reports.
Use a new manual dispatch rather than blindly rerunning a partial publication.
After known acceptance, availability polling retries metadata 404 or an installer metadata document whose version map has not yet acquired the target version for at most five minutes with bounded requests; it never invokes publication again.
The version endpoint, abbreviated installer metadata and full installer metadata share that deadline; every visible target must match the approved name, version and integrity.
Anonymous qualification repeats this admission before installing; malformed metadata, mismatched bytes and access failures are terminal.
The publication job is bounded to 30 minutes to accommodate three independent visibility waits and native verification; failed or cancelled jobs require evidence reconciliation, not automatic publication retries.
An unavailable attempted package, mismatched bytes/origin, non-404 registry failure or unresolved live producer stops delivery until its outcome is established.

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
