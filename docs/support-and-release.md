# Support and release

The initial contract targets Node 24.21.0, Windows x64, and Ubuntu 24.04 x64 with glibc.
Only observed passing platform evidence can establish support.
Other Node majors, macOS, ARM, and musl are unqualified.
Controlled Linux builds require glibc 2.39, as supplied by Ubuntu 24.04.
Windows requires the installed x64 Microsoft Visual C++ runtime (`VCRUNTIME140.dll` and UCRT).
No system runtime installer or runtime download is shipped.
Core and platform packages share one immutable release version.
Consumers pin the package, preset, and lockfile.

The public contract includes CLI, library API, schemas, exit meanings, formatter output, and default diagnostics.
A compatible repair may use a patch version.
An opt-in compatible feature may use a minor version.
Changed defaults require a new preset major, and a package major when existing invocations change.
Dependency upgrades are classified from observed corpus and consumer deltas.
Never overwrite a published version.

The current alpha is not stable v1.0.
Stable promotion requires the same qualified tuple on both platforms, public registry readback and unauthenticated installation, both pilot acceptances, and a timed restoration exercise.
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
All three packages declare public access and share the candidate version 0.1.0-alpha.4.
The alpha.4 candidate avoids duplicate formatting of byte-identical documents while retaining independent prose checks and the changed-document preservation/convergence checks.
The first alpha.3 hosted OWLAPI shadow checks passed correctness but exceeded the accepted 30-second budget on both platforms.
Alpha.3 remains immutable historical evidence; alpha.4 requires fresh transported-archive, registry, and pilot qualification before promotion.
The public alpha.2 archives remain immutable historical delivery evidence and are unqualified for Linux execution.
The packer normalizes the Linux npm member's executable mode with Python tarfile, verifies all member bytes are unchanged, and recomputes the final archive integrity.
Qualify the exact transported release archives on both platforms, rather than each platform's independently generated package.
The unpublished private alpha.1 candidate and all rejected attempts remain historical evidence.
Direct first publication uses explicit public access; a staged placeholder is unnecessary.
OIDC publication is preferred after actual package/workflow eligibility is configured.
Public installation needs no registry token, subscription, or OIDC authority.
Public npm provenance is eligible only through a qualified supported publisher; do not claim it for the local bootstrap.
Retain attributable source/build/repack evidence and qualify attestations separately.

Publish native packages first under a pilot tag and publish the core only when the tuple is coherent.
Read back hashes, public visibility, and fresh unauthenticated archive acquisition for every package.
Qualify root and isolated consumers on both supported platforms from the registry, without credentials.
Do not perform registry publication while rights, publisher authentication, independent assurance, or platform evidence remains missing.
A partial publication stays unpromoted and receives a new corrective version if bytes change.

For recovery, retain the exact consumer base revision, old manifest and lock, workflows, selected document preimages, and unrelated-file sentinels.
Restore only migration-owned changes.
Verify byte identities and required checks, then record elapsed restoration time.
Downgrading a package cannot restore formatted document bytes.
One pilot rehearsal is required before stable promotion.

Security reports use GitHub's private vulnerability reporting route when enabled; otherwise contact the repository owner through the project's existing private channel.
No unattended observation service is assumed.
During this authorized session, critical/high reports block promotion immediately.
The owner accepted maintained support targets on 2026-10-05; see [the security policy](../SECURITY.md).
Maksym Shostak / Hadden Industries owns manual report handling and dependency/advisory review.
Private reporting is enabled for this repository, as read back from GitHub on 2026-10-05; the existing organization security mailbox is the fallback.
Review dependency/advisory health at each release preparation and monthly while maintained.
Retain release source, build inputs, notices, recipient delivery/qualification evidence, and accepted recovery inputs for the maintained release lifetime plus three years after support ends, honoring any applicable license obligations requiring more.
This is an operational retention floor, not a legal interpretation.
Before stable, only the prerelease designated by `pilot` is maintained; after stable, only the latest stable release designated by `latest` is maintained unless another line is explicitly accepted.
Consumers remain exactly pinned and upgrades individually qualified; older downloadable releases have no implied support or backport promise.

Pilot qualification uses six consecutive valid full checks per frozen corpus/platform, excluding installation, with observed nearest-rank sample p95 at most 30 seconds.
With six samples, that is the observed maximum; it is not a statistical tail or arbitrary-repository guarantee.
The memory budgets are 512 MiB Windows Job Object committed memory and 512 MiB Linux whole-process-tree resident memory, reported separately as different metrics.
These budgets do not impose OS runtime limits or raise existing package limits.
Require zero unexpected errors or adjudicated false positives in the window and accepted fixture/probe corpus, retaining expected negative probes separately.
Rehearse one task-owned pilot restoration within 60 minutes through byte/sentinel readback and incumbent local checks; hosted required-status recovery remains separate acceptance evidence.
Accepted budgets do not establish that the pending Linux corpus, hosted pilots, or restoration have passed.

Provide AGPL corresponding source and build materials alongside object-code delivery to actual recipients.
Preserve third-party license texts and attribution.
Public registry access does not waive source obligations.
The repository's original `LICENSE` bytes are verified by the full check.
