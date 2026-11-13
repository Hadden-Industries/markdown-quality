# Deliberate release operations

Release 3.0.2 comprises the core package, Linux x64 native package and Windows x64 native package.
Qualification and release decisions bind that exact version and source tuple.
The [release CI convergence plan](plans/2026-11-13-release-ci-convergence-implementation-plan.md) governs new operations.
The [previous guide at its integration baseline](https://github.com/Hadden-Industries/markdown-quality/blob/e62b95aa648679cd37b2d70a3463d96c5e17edce/docs/release-operations.md) describes historical draft decisions and schema-1 pilot acceptance.

## Admission and governance

Ordinary contributors use a PR targeting main and the strict `CI / acceptance` gate.
The sole owner retains the declared direct-main bypass after appropriate local verification.
Inspect with `node scripts/github-governance.js` before a release.
The source policy declares selected SHA-pinned Actions, fork approval, main acceptance, owner-only creation of `v*` and `release-history-*` tags, and separate update/deletion restrictions without bypass.
GitHub user ID 6131830 identifies the release owner.
Activate these policies through an owner-authorized provider cutover before a release.

Before a live writer, verify main-only protected environments and all three package-specific staging/promotion OIDC bindings.
No alternate npm token, personal signing key, automatic stage approval or direct-publish fallback belongs in Actions.
Keep one pending release decision across approval boundaries.
Before superseding it, stop the old run, inspect outstanding npm stages that could still move defaults on late approval, and reconcile every possible effect.
Actions concurrency alone cannot revoke a pending npm approval.
A changed preimage requires a new owner review.

## Qualify once and choose the channel

Set the coordinated version in root package.json, project it with `npm run sync:version`, and check version consistency before freezing.
Run `release-qualification.yml` for the exact committed source.
It requires source/product/architecture/JSON checks, the frozen Windows 2025 and Ubuntu 26.04 Node matrix, both installed layouts, exact-source Actions/JavaScript/Python CodeQL, recipient audit, native/rights/distribution evidence and both pinned OwlAPI/WebVOWL performance corpora.
One producer packs the exact core, Windows and Linux archives used by all lanes.
Ordinary CI, an installed-only diagnostic and earlier release evidence cannot replace this qualification.

Choose `pilot` by default, or explicitly select `latest`, for a stable version or a canonical prerelease such as an RC.
Npm channel selection is independent of GitHub classification.
A direct RC may become the npm default while GitHub latest remains the prior stable security line.
Both channels retain native-first staging, separate owner 2FA approvals, public qualification of the exact tuple and immutable archival.

Sign an annotated `vVERSION` tag at the package-source commit using the owner's local signing route.
Do not rewrite a published tag.
Admission checks GitHub's verified annotation, exact tag/source payload and an actual OpenSSH verification against `scripts/release-signers.json`.
Key rotation must retain exact historical tag-object exceptions; a signature by another GitHub-verified key is insufficient.

## Exact owner decisions

New staging uses schema-2 `release-review.json`.
Pass its exact public-safe bytes as `review-json` and their SHA-256 as `review-sha256`.
Authenticated actor and triggering actor must both be the owner.
The read-only decision job needs no draft or contents-write token.
Never place credentials or embargoed finding details in these records.

The review binds repository, owner, acceptedAt, operationId, version, package source, manifestSha256, candidate run/attempt, controller and controllerDeltaSha256.
The delta is SHA-256 of native `git diff --binary --no-ext-diff --no-textconv SOURCE CONTROLLER` bytes.
It permits a reviewed controller correction without relabelling original packages.
The record includes `channel` and `guards`: exact selectedLabels and defaults for all three packages, plus GitHub latest release ID or explicit null.
An absent label is an approved preimage, not an inference from a failed read.

Its `decisions` contains semver, security, nativeRights and retention.
Each accepted decision names its reviewer, meaningful rationale and HTTPS evidence/digest; security and nativeRights declare independent review.
Existing schema-1 records retain their original stricter contract and do not gain authority from schema-2 defaults.

Before archival, supply the same raw review plus schema-2 `release-acceptance.json` and its digest.
Acceptance binds that review, source/controller/candidate/channel/guards and completed publicQualificationRun/Attempt.
Its trials may record OwlAPI, WebVOWL or restoration as accepted with the exact tuple/evidence, or skipped with a reason.
Downstream adoption and timed rehearsal are optional.
Both performance corpora remain mandatory release evidence.
The retained 3.0.1 waiver and earlier schema-1 acceptances remain historical records.

Acceptance includes an `immutabilityObservation`: repository URL, immutable-releases API endpoint, checkedAt, exact candidate version/source/manifest digest, raw responseBytes and their SHA-256.
The response must report enabled immutability and be no older than one hour at every draft-effect checkpoint.
A future or stale observation blocks those effects.
Verification of an already immutable archive does not require a fresh repository-settings observation.

Before a staging dispatch, the owner captures `npm stage list --json --registry=https://registry.npmjs.org/` for each of the three package names with the native CLI's package selection.
Bind that private observation in `stageInventory`: `checkedAt`, the exact command above, and `packages[packageName]` containing the exact JSON array `responseBytes` and its `sha256`.
The snapshot must be no older than one hour and postdate every other publication attempt.
Terminal approved, published and rejected entries are permitted; another pending request blocks further effects until the owner settles it with native npm and 2FA.
Only an earlier package's original attributable stage in the same operation is allowed during the stage sequence.
OIDC publication credentials do not grant private account inventory access; Actions does not acquire an account-token fallback.
Archive acceptance and every family operation carry a fresh empty-pending `stageInventory` as well.

After a delayed archival approval, retain the frozen review and acceptance bytes.
Supply optional `preflight-json` and `preflight-sha256` to refresh only the live stage inventory and immutability observation.
The exact owner-authenticated schema-1 preflight object contains repository, owner, version, source, manifestSha256, reviewSha256, acceptanceSha256, stageInventory and immutabilityObservation.
It must identify the original qualification; it cannot replace its acceptance or trial dispositions.

## Manual workflow sequence

| Operation              | Workflow                     | Result                                                                                              |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Qualify source         | release-qualification.yml    | Fresh exact-source obligations and frozen tuple                                                     |
| Stage natives          | publish.yml, phase natives   | Windows then Linux requests under the reviewed channel                                              |
| Approve natives        | Owner's authenticated npm    | [Inspect each staged tarball](#inspect-a-staged-tarball-before-approval), then approve with 2FA     |
| Stage core             | publish.yml, phase core      | New dispatch retains original origins and verifies both public natives first                        |
| Approve core           | Owner's authenticated npm    | [Inspect the staged core tarball](#inspect-a-staged-tarball-before-approval), then approve with 2FA |
| Qualify public tuple   | release-registry.yml         | Anonymous exact-version acquisition, all frozen lanes/layouts, provenance and recipient audits      |
| Archive                | github-release.yml           | Exact decisions, complete immutable logical evidence and native verification of every outer asset   |
| Complete               | Read-only archive completion | Selected npm labels, guarded defaults, tag/assets/classification and GitHub latest                  |
| Change stable defaults | promote-release.yml          | Read-only admission, isolated npm/GitHub writers, independent completion                            |
| Retain history         | release-history.yml          | Public-safe export; recovery eligibility remains unproven until owner signing                       |

### Inspect a staged tarball before approval

Apply this procedure independently to `win32-x64`, `linux-x64` and then `core`, for the reviewed `pilot` or `latest` channel.
Keep the owner-signed source tag before staging and the existing public verification of both native packages before core staging.
When both native stages are available, complete their byte checks before approving either; approve Windows, then Linux.
The core stage receives the same independent check after the public-native gate admits its staging.

1. Obtain `release-manifest.json` from the original successful `release-qualification.yml` run and attempt named in the authenticated owner review.
   Take the approved `manifestSha256`, version and channel from that review, not from a new manifest or a latest-run search.
   Compare the SHA-256 of the original manifest's exact bytes with `manifestSha256` before trusting its entries; the local command below enforces this comparison again.
   Select exactly one `archives[]` entry by member `name` and retain its full `package`, `version`, `sha256` and `integrity`.

2. Obtain `stageId` from that member's `staging-journal/<member>.jsonl` record in state `staged-awaiting-owner`, in the original producing `publish.yml` run and attempt's `publication-source-and-manifest-<attempt>` artifact.
   Require exactly one such record, matching the selected manifest package, version and digests, and `tag` equal to the reviewed channel.
   Match its `origin` to the member's admitted `publication-origins.json` record and the actual producing run, attempt and controller source; the map must bind the same qualified candidate and manifest.
   Retained native origins remain their original producing attempts when a later dispatch stages core.
   A package/version search, the latest run and npm's upload acknowledgement do not establish the bytes under review.

3. In the owner's authenticated npm session, inspect that exact private stage on the official registry.
   The PowerShell examples use `$stageId` from the journal and `$channel` from the owner review; preserve a separate set of inputs and evidence for each member.

   ```powershell
   $stageId = "ORIGINAL_JOURNAL_STAGE_ID"
   $channel = "pilot" # Use latest only when the owner review selects latest.
   npm stage view $stageId --json --registry=https://registry.npmjs.org/
   if ($LASTEXITCODE -ne 0) { throw "Stop: stage inspection failed" }
   ```

   Confirm the stage is pending and its full package name, version and dist-tag match the authenticated manifest entry and reviewed channel.
   After those fields match, enter a separate empty inspection directory and download that same stage using [npm stage download](https://docs.npmjs.com/cli/v11/commands/npm-stage/#npm-stage-download).

   ```powershell
   if (@(Get-ChildItem -LiteralPath . -Force).Count -ne 0) {
     throw "Use an empty inspection directory for this stage"
   }
   npm stage download $stageId --registry=https://registry.npmjs.org/
   if ($LASTEXITCODE -ne 0) { throw "Stop: stage download failed" }
   ```

4. Run the local checker on the actual downloaded `.tgz`, without unpacking, repacking or substituting the producer's local archive.
   Replace the paths and approved manifest SHA-256 below, and choose the matching member name; keep `$stageId` and `$channel` from the inspection above.
   The checker reuses `verifyArchiveBytes` and exits nonzero unless both SHA-256 and SHA-512 SRI match the uniquely selected member of the digest-authenticated manifest.
   It checks local bytes; the owner authenticates the run, journal and npm stage fields in the preceding steps.

   ```powershell
   node "C:/path/to/markdown-quality/scripts/verify-staged-tarball.js" `
     "C:/approved/evidence/release-manifest.json" "APPROVED_MANIFEST_SHA256" `
     "win32-x64" $stageId $channel "./ACTUAL_DOWNLOADED_FILENAME.tgz" `
     > "./staged-tarball-check.json"
   if ($LASTEXITCODE -ne 0) { throw "Stop: do not approve this stage" }
   ```

5. Only after the identity, channel and byte checks succeed may the owner run this separate interactive 2FA command for the same checked stage ID.
   Complete both native checks before either native approval when both stages are available, preserving each checked ID; repeat the procedure for the later core stage.

   ```powershell
   npm stage approve $stageId --registry=https://registry.npmjs.org/
   ```

For a missing, ambiguous, unreadable or mismatched stage, a wrong channel or any digest mismatch, stop before approval and use the original stage's owner rejection and [reconciliation procedure](#interruption-partial-recovery-and-retained-proof).
Keep the stage ID, original run/attempt identities, manifest binding and expected/observed digests, including `staged-tarball-check.json`, in the existing release evidence; mark unavailable observations explicitly and exclude credentials and OTPs.
Never automatically restage or approve a request.
Private npm credentials and interactive approval remain outside Actions.
The upload-time local archive and npm JSON receipt checks in `stage-release-package.js` remain separate from this owner-side comparison of downloaded bytes.

### Continue the release sequence

Staging reruns are refused.
Use a new dispatch with exact original run, attempt, manifest and origin-map digests.
Each stage rechecks all approved defaults and earlier attributable approvals immediately before requesting the next package.
A later default, foreign origin or incomplete provider history blocks the request.
An attempted stage remains pending or outcome-unknown until original provider evidence settles it; a public 404 does not authorize another request.

The archival workflow's new decision route is read-only.
The protected legacy-decisions job exists only for historical draft records.
New indexed archives keep packages, corresponding source, rights/notices and essential identity records standalone.
An indexed ZIP binds every other logical path, size and SHA-256, including real empty stderr.
Bounded native packing/extraction rejects duplicate, missing, extra, oversized, linked or traversing members.
The reader retains historical flat schema-1 and current flat schema-2 qualification semantics.

Every asset is verified natively, and the full logical inventory is admitted at archival and fresh operation admission.
The writers subsequently recheck fixed release ID, signed tag identity and asset IDs/names/sizes/digests.
They do not repeatedly parse the entire archive.
Direct stable latest publication classifies that same immutable release stable/latest after authenticated staging/public qualification and fresh default guards.
Pilot and direct RC archival preserve the prior GitHub latest and the target prerelease flag.
Final cross-provider proof is produced by read-only credentials.

## Family operations and bounded completion

Dispatch `promote-release.yml` with original archive run/attempt, exact qualification SHA-256, operation-json and its exact SHA-256.
The operation is schema 1 and authenticates the owner, current controller, source, version, manifest/qualification digests, acceptedAt and operationId.
It declares releaseId, label, per-package priors/targets/targetIntegrities, prior/target GitHub latest IDs and prerelease flags, scope.npm and scope.github.
All three package keys are mandatory; null means explicitly observed absence.
Already-at-target scoped labels require explicit noops.
An unchanged scoped GitHub classification requires githubNoop.

| Operation | Admitted scope                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| promote   | Strictly newer stable version; coherent prior family; Windows, Linux, core and GitHub                                   |
| align     | Core and GitHub already identify the qualified stable target; only divergent companions change                          |
| restore   | Previously qualified immutable stable family; full family plus GitHub; older version is allowed                         |
| direct    | Reviewed latest staging already changed npm; no redundant npm requests; RC preserves prior GitHub stable line           |
| continue  | Reconciled original effects stay guarded; only never-requested npm labels and outstanding GitHub classification proceed |
| partial   | Exactly the interrupted operation's attributable labels, restored to their individually qualified original priors       |
| verify    | Explicitly scoped no-effect observation; does not authorize a prior writer                                              |

Fresh admission verifies original public qualification/provenance, source/rights/distribution evidence, exact-source scans, current alert state, retained recipient-lock audits and current public package bytes.
It authenticates all surviving and signed retained writer observations as one consistent union.
Missing writer history or target qualification blocks the dependent effect.
An earlier family operation with effects blocks a different operation until authenticated read-only completion, reconciliation of the complete target state, or explicit partial recovery/continuation settles it.
Successful partial recovery retires the interrupted operation; its old decision cannot be reactivated.

The npm job has OIDC and read-only GitHub access.
It appends and flushes exact intent before each request, then records acknowledgement or unknown outcome.
Windows precedes Linux and core.
A matching provider value alone does not prove attribution.
The GitHub job has contents-write and no npm identity.
It authenticates the sealed npm artifact by immutable ID/digest/original run, attempt, job, decision, scope and individual effects.
A green needs result alone is insufficient.

The independent read-only completion command authenticates original writer attempts before provider observation.
One five-minute deadline covers preliminary family/release/latest reads, child timeouts, internal fetch retries and sleeps.
Approved prior-to-target propagation, transient resets/timeouts, temporary server failures and identified rate limits may retry idempotent reads with capped jittered backoff and provider hints.
A third value, identity/digest/schema failure or ordinary authorization denial stops immediately.
At expiry, completion.json records completion-unconfirmed, last confirmed observations, original writers and earliest useful retry where known.

To rerun only final observation, select mode verify with the **original operation bytes/digest** and continuation-json containing admissionId, npmId, githubId, writerRun and writerAttempt.
The writer jobs are skipped and no OIDC or contents-write authority is granted.
Original successful writers are not replayed.
Authenticated retained artifacts may supply expired inputs; conflicts with surviving native metadata block reuse.

## Interruption, partial recovery and retained proof

Preserve every startup record, original job/step inventory, provider readback, exact intent and unknown response.
Do not retry a request merely because its label still looks old.
Reconcile an unknown effect with an explicit owner settlement bound to the original journal hash, sequence and independently retained provider observations.
The disposition and rationale belong in the next reviewed operation.
A 404 alone is never settlement.
The next owner decision can carry settlements against the original decision and journal without rewriting those original bytes.
Verified retained decisions preserve those settlements for later operations; conflicting dispositions or evidence remain blocking.
Continuation follows the original decision chain through further interruptions and aggregates every already-requested label.
It cannot replay an ancestor's Windows or Linux request, change its channel, or substitute another target.

Archive effects retain a native release ID in archive-identity.json, and every dependent write rechecks that same draft ID and current main controller.
A different draft at the same tag is a displacement, even if some assets match.
If a lost creation response leaves the original native release ID unproven, preserve the receipt and stop; matching a tag alone cannot authorize recovery.
Failed legacy archive recovery needs its exact signed original writer plus complete native immutable release/source/inventory proof or its authenticated terminal receipt.

For an unknown family writer, dispatch mode `reconcile` with its original operation bytes/digest and continuation-json containing artifactId, writerRun, writerAttempt, service (`npm` or `github`), sequence and journalSha256.
The read-only job authenticates the exact original artifact and records a typed `provider-observation.json` for that effect.
Reference that job's URL and the observation file's SHA-256 in the next operation's `settlements[].providerEvidence`, together with schemaVersion 1, owner, operationId, journalSha256, sequence, disposition `applied` and an explicit rationale.
Only an independent target-visible observation can support this applied settlement.
An old label or public absence cannot establish `not-applied`; unresolved requests remain blocked.

For partial recovery, bind originalOperationId, originalDecisionSha256, originalJournalSha256 and originalWriter run/attempt/job.
Admission derives affected labels from that journal and current approved preimages.
Each non-null target names its separate signed original qualification digest in targetQualifications.
For interrupted native staging, select a previous fully qualified immutable archive as the normal controller input.
Bind the affected unfinished candidate separately with affectedManifestSha256, the original review's digest in originalDecisionSha256, and originalJournals mapping every scoped package to its raw journal SHA-256.
The original stage job, native provenance, exact affected manifest/review and observed public native archives establish attribution without requiring a complete public archive of the unfinished candidate.
The admitted target archive may supply its own target qualification; other versions require their separately signed original qualification.
An originally absent label requires an approvedDeletions preview naming package, current value and proposed null target.
Excluded npm labels and GitHub remain exact guards.
A completed stable family cannot be repaired by rolling core alone back to an RC; restore the qualified stable family or publish corrected bytes.

If npm succeeded and GitHub failed, continue admits the exact original sealed npm result and outstanding GitHub scope.
If classification already succeeded, run verification only.
An unknown GitHub request requires settlement before further effects.
Changed package bytes require a new qualified version.

Run release-history.yml before the earliest real Actions artifact expiry.
The export retains original writer attempts/artifact identities separately from original source/public qualification, reports, recipient locks and immutable archive identities.
A snapshot or admission result cannot stand in for a writer journal.
Inspect summary.json for completeness, missing proof and earliestExpiry.
A successful immediate archive verification is different from recovery eligibility after expiry.

Sign the exact complete export through a fresh annotated release-history-* tag whose commit contains release-history.json at its root.
Prepare that commit in a disposable directory or through the owner's existing evidence-signing route, preserving the current development checkout.
Verify the tag locally with the owner's allowed signer and read it back after separately authorized publication.
Pass the immutable ref names as a JSON array in history-checkpoints.
Protect history refs against update and deletion; do not place a signing key in Actions.
Retain public-safe exports under the maintained lifetime plus three years after support ends.
Unsigned, incomplete, conflicting or untrusted exports leave recovery after expiry unproven.
Legacy records lacking complete proof remain inspectable; they cannot authorize an unsupported effect.

Consumer restoration is separate: restore only migration-owned manifest/lock/workflow/document preimages and check unrelated-file sentinels.
A provider label rollback cannot restore formatted document bytes.
Consumer trials and timed rehearsals remain optional.

## Diagnostics and native coverage

Manual main-qualification.yml offers full or installed-only.
The diagnostic packs once, transports exact archives, verifies both root/isolated layouts on both OS families, runs the selected native/CLI corpus and offline replay, and reports a distinct installed-only scope.
It cannot satisfy PR acceptance or release admission.
FULL_REQUIRED links to deliberate full qualification; a main observation launches no product suite.

The [released Snapper coverage assessment](research/2026-11-13-native-security-coverage.md) records the exact source/lock, supported Rust CodeQL mode, missing local extraction evidence and evaluated lock-advisory route.
Rust source coverage remains unproven until actual extraction can be compared with shipped configurations.
Existing native payload, glibc, rights, provenance and distribution gates remain required.
