# Deliberate release operations

The sole maintainer can commit directly to main after local tests pass.
Releases use the manual workflows below.
A push, tag, successful ordinary CI run, or staging result does not publish a stable release.
The [accepted plan](plans/2026-10-16-release-publishing-assurance-implementation-plan.md) and [research record](research/2026-10-16-release-publishing-assurance-evidence.md) retain the decisions, authoritative sources and historical baseline.

No next version is selected by this implementation.
The opinionated-defaults change requires the SemVer decision described in [support and release](support-and-release.md).
Changed bytes cannot reuse the published 1.0.3 identity.

## Manual workflow sequence

| Operation            | Workflow                       | Required evidence and result                                                                                                                                         |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualify              | `release-qualification.yml`    | Owner-selected committed version; fresh product, JSON, architecture, frozen archive/runtime matrix, performance, CodeQL, recipient audit and distribution SBOM gates |
| Stage natives        | `publish.yml`, phase `natives` | Exact qualification run, manifest digest, signed source tag, draft and approved review record; two staged requests under `pilot`                                     |
| Approve natives      | Native npm UI or `npm stage`   | Owner inspects each stage identity and digest, then approves each with 2FA                                                                                           |
| Stage core           | `publish.yml`, phase `core`    | Same original qualification and manifest; previous run/attempt/origin digest; both public natives and provenance verified first                                      |
| Approve core         | Native npm UI or `npm stage`   | Owner inspects and approves the exact staged core with 2FA                                                                                                           |
| Qualify public tuple | `release-registry.yml`         | Original inputs and completed core staging run/attempt/origin digest; every frozen OS/Node lane, both layouts, signatures/provenance and actual recipient audit      |
| Archive pilot        | `github-release.yml`           | Completed public qualification, manifest, review and pilot-acceptance digests; verified complete draft becomes an immutable prerelease                               |
| Promote stable       | `promote-release.yml`          | Completed archival run/attempt, qualification digest and expected prior npm/GitHub latest identities; native npm labels first, core last, then GitHub stable/latest  |

Use GitHub's Run workflow interface on main for each deliberate operation.
Use a new manual dispatch for continuation or recovery, preserving the original identities.
Admission inspects native GitHub publication history independently of the chosen recovery run.
An attempted package/version must retain its original bytes and origin; omitting a recovery input or choosing an older native-only run cannot authorize another request.
Staging workflow reruns are rejected.
Missing, expired, truncated or ambiguous prior effect evidence blocks staging and requires evidence recovery; public metadata absence is not proof that no pending stage exists.
Do not delete publication runs or their recovery evidence while they remain relevant.
Never blindly rerun a job that attempted an external effect.
Publishing operations share a non-cancelling concurrency group.
Ordinary development and read-only qualification do not acquire publishing credentials.

Public qualification and archival use separate manual runs so archival can require a completed, successful provider run for every registry lane.
An in-progress workflow cannot attest to its own eventual success.
No daemon waits for owner approval.

## Qualify and freeze

Commit the coordinated version, source and lockfile before qualification.
The manual workflow resolves one minimum/latest/reference matrix and passes it to the existing product and candidate workflows at the same source commit.
Release qualification does not reuse the ordinary push-CI shortcut.
One candidate pack produces the three archives used by every consumer lane.
Windows and Ubuntu 24.04 exercise root and isolated layouts, installed file hashes, offline lock replay and runtime contracts.
Performance retains the pinned OwlAPI/WebVOWL corpora and reference-runtime budgets.

Inspect the terminal required jobs and `candidate-release/release-manifest.json`.
Retain its SHA-256 independently; later dispatches require that digest.
The source SBOM describes source dependencies.
The distribution SBOM describes the shipped archives, with native runtime crates reconciled against embedded build inventories and separately scoped recipient SBOMs.
Syft and CycloneDX CLI are pinned by source/version and asset digest in `scripts/release-sbom-tools.json`; neither tool is shipped in the npm packages.
Native CycloneDX validates the format; repository checks require conservation of package identities, components, rights and dependency edges after composition.
Rust runtime notices and host-supplied operating-system libraries have explicit coverage boundaries.

The security gate requires exact-source CodeQL analyses for Actions, JavaScript/TypeScript and Python, with native query-pack identities and rule inventory.
It refuses failures, warnings, missing analyses and open alerts.
It audits the installed recipient graph, including the product installed as a development dependency.
The automatic recipient policy currently requires zero findings at every severity.
There is no generic severity bypass or silent exception file.
A proposed advisory disposition needs a reviewed policy change with concrete reachability evidence.
Public artifacts retain query identities, scan digests and bounded alert dispositions; retain sensitive raw review evidence in the restricted store.

The 2026-10-16 integration probe detected GHSA-238p-pmpm-9mq7 in the clean recipient graph through KaTeX.
The root-only development override does not fix that graph.
The release gate remains closed until the dependency or an explicitly reviewed disposition is resolved.
That frozen 1.0.3 probe does not qualify a future release.

## Review, signed tag and draft

After qualification, use the existing qualified local signing route to create an annotated signed `vVERSION` tag at the exact package-source commit and push that exact tag.
Do not upload a personal signing key to Actions.
Hosted admission requires GitHub signature verification to report `verified: true` and `reason: valid` for that annotation and commit.

Create a draft prerelease for the existing tag with latest disabled.
Attach `release-review.json` after reviewing its public contents.
Staging reads this draft without release-write permission and binds the record to the independently supplied `review-sha256` input.
This avoids committing a self-referential approval file that would change the source being approved.

The record contains:

```json
{
  "schemaVersion": 1,
  "phase": "review",
  "version": "OWNER_SELECTED_VERSION",
  "source": "EXACT_40_CHARACTER_PACKAGE_SOURCE",
  "manifestSha256": "EXACT_64_CHARACTER_MANIFEST_DIGEST",
  "owner": "maksymshostak",
  "acceptedAt": "OWNER_DECISION_UTC_TIMESTAMP",
  "decisions": {
    "semver": {},
    "security": {},
    "nativeRights": {},
    "retention": {}
  }
}
```

Each decision requires `outcome: "accepted"`, a meaningful `rationale`, named `reviewer`, and at least one `evidence` entry containing an HTTPS `url` and the SHA-256 of retained evidence bytes.
Security and native-rights decisions also require `independent: true`.
These are attributable owner records, not cryptographic proof of review adequacy; inspect the referenced substantive reports.
Do not invent reviews or copy acceptance from an older tuple.
Private reports stay in their restricted store; public records contain safe references and digests.

For a sole maintainer, npm's 2FA approval is the human-presence gate.
No second human or mandatory PR is required.
Independent technical assurance may come from the configured review provider; it does not authorize release effects.

## Staging and owner approval

Only the `stage` job in `publish.yml` can request npm OIDC, through the main-only `npm-publication` environment.
It uses pinned npm 12.2.0, isolated configuration, disabled lifecycle scripts, explicit public access, explicit `pilot`, and provenance.
It invokes `npm stage publish` once per eligible frozen archive.
Staging does not run direct publication, automated stage approval, rebuilding or latest promotion.

Retain `publication-source-and-manifest`, especially the manifest, origin map and per-package staging journals.
The journal records intent before the request, returned stage identity and integrity, or an unknown outcome.
A green staging run means owner action is pending.
Use native npm inspection/download and compare the exact version, stage identity and bytes before 2FA approval.
Keep owner credentials, security-key sessions and codes out of Actions and artifacts.

After approving both natives, dispatch phase `core` with the original `candidate-run`, `manifest-sha256` and `review-sha256`, plus previous `recovery-run`, exact `recovery-attempt` and independently checked `recovery-origins-sha256`.
Windows and Linux qualify the retained native packages and original provenance before core staging is eligible.
Core staging creates another owner approval boundary.

An unknown request or unavailable attempted version never becomes eligible merely because the registry returns 404.
Inspect native npm stage state and prior provider evidence first.
A rejected stage permanently consumes its version under npm's rules; rejected or changed bytes require a new coordinated version.
Origins distinguish original package source from a later reviewed continuation-control commit.

## Public qualification and immutable archival

After core approval, dispatch `release-registry.yml` with the original qualification run and manifest digest, completed core staging run/attempt and its origin-map digest.
Every frozen lane anonymously acquires all public bytes and installs the supported native package plus core in both layouts.
Native npm signature/attestation verification binds installed packages to their original workflow run, attempt and control source.
Opposite-platform archives receive byte verification; the combined OS reports provide installed-platform coverage for both.

Before archival, attach `release-acceptance.json` to the draft.
It has the same identity, owner and timestamp fields as the review record, with `phase: "pilot"`, `reviewSha256`, `publicQualificationRun`, `publicQualificationAttempt`, and exactly three decisions: `owlapi`, `webvowl`, `restoration`.
Each uses the accepted/rationale/reviewer/evidence fields above.
Both consumer decisions also declare `subject: "exact public npm pilot"` and reference their accepted scope and platform windows.
Restoration retains timed recovery, original manifests/locks, document preimages, unrelated-file sentinels and verified final state.
Release implementation does not authorize consumer migrations in other repositories.

Dispatch `github-release.yml` with the public run/attempt, manifest digest and both decision digests.
Read-only preparation requires every matrix report and a closed inventory containing original archives, source/notices, SBOMs, origins, staging identities, recipient locks/audits and performance observations.
The unchanged native corresponding-source archive is reused from its verified immutable release through `scripts/release-materials.json`; another native source requires a reviewed new pin.

The separate `archive` job has contents-write permission through main-only `github-release` and no npm OIDC.
The existing writer checks fresh registry bytes, signed tag, completed providers and repository immutability.
It uploads only missing matching draft assets, downloads every draft asset for byte verification, then publishes an immutable prerelease with latest disabled.
It requires native `gh release verify` and `gh release verify-asset` for every asset plus complete final readback.
Unexpected or changed assets stop delivery; no clobber operation exists.
Keep `qualification.json` and its digest from `archive-inputs-ATTEMPT` for promotion.

Historical [1.0.2](releases/1.0.2.json) and [1.0.3](releases/1.0.3.json) schema-1 evidence remains verifiable read-only.
It cannot authorize current writes.
The 1.0.3 latest-on-publication exception is historical and is not inherited.

## Stable promotion and recovery

Dispatch `promote-release.yml` with the completed archival run/attempt, approved qualification digest, expected prior coherent npm latest version and expected prior GitHub latest release numeric ID.
Prior identities are deliberate inputs, not values silently accepted from current provider state.
Promotion must advance the previous stable version.

Admission revalidates the bundle, owner decisions, completed archival provider, immutable release, tag and every asset.
Only the `npm` job has OIDC, through `npm-promotion`; it has no release-write permission.
The promotion connection enables dist-tag management and disables direct publication.
npm may inherently allow staging on that connection, so it is not technically tag-only.
The workflow changes only latest labels on already qualified versions.

Before each effect, re-read all three tags.
Each must equal the approved previous version or intended target.
Update Windows, Linux, then core; core requires both native labels verified at the target.
The separate contents-write `github` job rechecks every npm latest label, classifies the same immutable GitHub release stable/latest, and performs native asset verification and complete cross-service readback.
Only that final success is a completed stable release.

Partial or uncertain promotion is recoverable, not atomic.
Preserve journals and use the original inputs in a new manual dispatch.
Already verified target labels are observed without repeat writes.
A different latest version/release stops the operation for reconciliation.
Never automatically roll back to an unqualified label, unpublish, replace an immutable version or move its signed tag.
Correct faulty published bytes with a new qualified version; label rollback does not restore consumer files.

## Configuration and retention

Inventory all three packages and every npm publisher connection before cutover.
Require owner 2FA and disallow alternative publishing tokens.
The staging connection binds this repository, `publish.yml` and `npm-publication`, with direct publishing and dist-tag management disabled.
The promotion connection binds `promote-release.yml` and `npm-promotion`, with direct publishing disabled and dist-tag management enabled.
A replacement may have npm's first-use window; configure it when an authorized first use can be completed, then read back all connections.
Do not preserve a permissive old connection as rollback.

Set default workflow permission read-only, disable Actions PR-review approval when unused, retain explicit job permissions and full commit-SHA action pins.
Environments permit exactly main.
No PR rule, Enterprise dependency or public-preview dependency lockfile is introduced.
Do not enable `actions.lock`, `gh actions-lock` or Require lockfile.

New release evidence artifacts request 90-day transport retention; ordinary CI artifacts may expire sooner.
Actions storage is not the release retention policy.
Human-readable diagnostics use logs and job summaries; summaries do not replace the exact files consumed by release qualification and archival.
Performance uploads retain their top-level JSON observations and text driver logs, excluding copied corpus trees.
The routine registry check has no report artifact; deliberate release-registry qualification retains its machine-consumed report.
Native original license evidence, SBOMs, security records, package archives and recovery journals remain retained.
Export required raw provider/review/recovery records before expiry.
Preserve original staging journals even when a request ends with an unknown outcome.
After owner approval, the complete successful public qualification supplies a separate reconciliation record bound to the journal digest, archive bytes, original invocation and public reports.
Archival verifies both records; it does not rewrite the original request result or issue a replacement staging request.
Retain them, source/build inputs, notices, decisions and archives for the maintained lifetime plus three years after support ends.
Public release material and restricted account/security evidence have separate stores.
Source delivery, local verification, hosted qualification, configuration activation, owner approval and stable publication are separate completion claims.
