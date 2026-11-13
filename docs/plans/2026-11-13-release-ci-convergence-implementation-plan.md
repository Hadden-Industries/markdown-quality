# Markdown Quality release CI convergence implementation plan

**Implementation plan revised 13 November 2026 with the owner's cross-repository release decisions.**
The owner can stage the family under npm `pilot` (the default) or explicitly select `latest` for any release version, including an RC.
Both routes keep native-first staging, owner 2FA, fresh public qualification of the exact three packages and verified immutable archival.
OwlAPI and WebVOWL supply required performance corpora.
Their maintainers can also elect to trial a release or rehearse recovery in their own checkouts.
Enforce the declared PR policy, keep privileged entry points dependency-free, and give the sole release maintainer a verified next action after an interrupted write or expired Actions run.

## Baseline and scope

The inspected checkout is `fix/ci` at `b1c345dc077514a903672a27ec6b53266cf57031`, matching its remote.
Local and remote `main` are `c00e7f9e1b94e74509e18e780698889fc2ab9cbc`.
Package source for signed `v3.0.1` is `39205c6f479da1db72243ed3a2a41629e45371b5`.
The later successful hosted archive verification ran at the main revision.
JSON Quality’s comparison used controller revision `6c037cb`.
Its subsequent plan-only commit `69d206d` records the agreed release contracts applied here.
[Markdown checkout](https://github.com/Hadden-Industries/markdown-quality/tree/b1c345dc077514a903672a27ec6b53266cf57031) · [JSON checkout](https://github.com/Hadden-Industries/json-quality/tree/6c037cb425613b1c57543156d0b2048d4f3ac97c)

- `411a3e5` froze Node 22.13.0, 22.23.4, 24.22.2 and 26.13.0.
  Producer npm is 12.2.2, consumer npm 11.21.2.
  Markdown retains its source contributor minimum `>=12.2.2`.
  `b1c345d` pins Ubuntu 26.04, fixes matching of historical providers against the producing runner policy and checks the binary’s glibc requirements.
  Product qualification uses Windows 2025, while the controlled native producer uses Windows 2022.
  Correct the remaining present-tense Ubuntu 24.04 sentence in the runtime guide through normal integration.
  Its recorded Windows/npm 11 check used both packed layouts and 81 CLI cases on one Node version.
  Neither topic-branch commit has fresh hosted release qualification.
  [Runtime guide](../node-runtime-compatibility.md) · [Controlled native build](../../.github/workflows/native.yml)
- Live on 13 November, GitHub returned no applicable branch or tag rulesets, no classic main protection, all Actions allowed, SHA pin enforcement off, and first-time-contributor approval.
  The default workflow token is read-only and Actions PR approvals are disabled.
  The three release environments each restrict deployments to `main`.
  The additional approved shared-qualification environment has its own reviewer boundary.
  Source already declares the desired branch rules and Actions policy.
  [Governance policy](../../.github/governance.json) · [CI trust](../ci-trust.md) · [Effective main rules](https://api.github.com/repos/Hadden-Industries/markdown-quality/rules/branches/main)
- GitHub latest was immutable release **438708271**, `v3.0.1`, with 165 assets totalling 180,354,859 bytes by provider metadata.
  All three anonymous npm `pilot` and `latest` labels were 3.0.1.
  The two natives’ public provenance names run 42589874800/1 and core’s names 42590905801/1.
  All three SHA-512 subjects matched registry integrity.
  Historical archive recovery verified a release already made immutable after a hosted 403.
  Promotion took 31.85 elapsed / 31.58 summed job minutes.
  Treat these as observed workloads.
  [Release](https://github.com/Hadden-Industries/markdown-quality/releases/tag/v3.0.1) · [Initial archive](https://github.com/Hadden-Industries/markdown-quality/actions/runs/42685663582) · [Archive recovery](https://github.com/Hadden-Industries/markdown-quality/actions/runs/42692343399) · [Promotion](https://github.com/Hadden-Industries/markdown-quality/actions/runs/42696314580)

Use HISEW **R2** for the controller change to public contracts, permissions, cross-service writes and recovery, consistent with the October release dossier and the agreed JSON Quality route.
The sole maintainer owns integration and human release approval.
Independent verification of the frozen controller and the scoped security and native-rights assessments each identify their verifier, evidence, scope and disposition.
Governance activation, real credential changes and any production operation have separate owner decisions.
Controller acceptance can use isolated providers and the available hosted checks.
At cutover, update the release runbook, the support and release guide, and the [security policy](../../SECURITY.md#supported-releases) together.
The runbook and support guide currently prescribe pilot-only staging, accepted downstream decisions and a timed rehearsal.
Adopt the later CI policy for main and preserve dated release decisions, including the 1.0.3 exception and 3.0.1 evidence.
Preserve public CLI/API, family version projection, Snapper rights, installed-recipient and performance contracts, and the approved reusable-workflow security model.
[October CI plan](2026-10-29-github-actions-convergence-implementation-plan.md) · [October release dossier](2026-10-16-release-publishing-assurance-implementation-plan.md) · [Operating sequence](../release-operations.md) · [Support and release policy](../support-and-release.md)

## Release contracts

1. **REQ-01 · PR and ref integrity.**
   Only the native Actions app’s `CI / acceptance` on the current up-to-date PR can satisfy merge admission.
   The release owner signs the qualified source and explicitly approves the channel, affected labels and expected prior values in the operation's digest-bound decision.
   Protect the tag between draft creation and immutable publication.
2. **REQ-02 · One candidate, two npm routes.**
   Freeze the signed source, three tarball integrities and matrix once.
   Preserve each package's original staging workflow, controller, run and attempt across retries.
   Omission selects `pilot`.
   An explicit `latest` selection in the same owner review needs no waiver.
   Both routes require owner inspection and 2FA for the stages, public native bytes, original provenance and working binaries on both OS families before core staging, then fresh anonymous public qualification of all three packages after core approval.
   On direct `latest`, unversioned installs can see each package from its stage approval onward.
   If family qualification fails, report which npm defaults moved and hold GitHub stable classification.
   A pilot stays an immutable GitHub prerelease with GitHub latest unchanged until a separate stable promotion.
   Direct stable `latest` finishes on the same verified immutable release as GitHub stable/latest.
   Any prerelease version on either npm channel remains a GitHub prerelease and leaves GitHub latest at its approved prior ID or absence.
   Once a stable release has been promoted, it remains the maintained security line until a qualified stable replacement or family restoration completes.
   Putting an RC on npm `latest` changes what an unversioned install receives.
   Adding a second maintained line requires an explicit support decision.
   Keep the pinned OwlAPI and WebVOWL corpus runs in qualification.
   A live downstream trial and its sign-off are recommended and optional.
   A timed restoration rehearsal is always optional.
   Automated recovery tests and qualification of a real restoration target are required.
   [npm staged publishing](https://docs.npmjs.com/staged-publishing/) · [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
3. **REQ-03 · Durable, scoped effects.**
   Bind operation, scope, per-package prior values (including explicit absence), target integrities, target release ID and prior GitHub latest ID or absence.
   Use fresh candidate and draft identities for staging before an immutable archive exists.
   A writer may change only its approved provider and subject.
   The same person can authorize npm and GitHub.
   Separate job credentials constrain the software that can make each change.
   Journal intent before the request.
   Reconcile prior writers by original run, attempt, subject, operation and authenticated record.
   Seal npm completion for GitHub.
   A separately runnable read-only job authenticates the original writer results and verifies the family and GitHub state before reporting completion.
   After a completed release, restore the qualified stable family together or publish a corrected version.
   Partial rollback is reserved for settling an interrupted operation.
4. **REQ-04 · Transport and verification.**
   Keep the existing logical evidence, including zero-length logs.
   Authenticate the outer asset and each logical member.
   Reuse verified immutable identity through a single operation and re-read mutable state before every effect.
   Use native npm, GitHub and signed Git mechanisms already present in the two repositories.
   Retain both writer history and original public target qualification before provider expiry.
   Keep project-specific admission in Markdown Quality.
   [SLSA verification](https://slsa.dev/spec/v1.2/verifying-artifacts) · [JSON release operations](https://github.com/Hadden-Industries/json-quality/blob/6c037cb425613b1c57543156d0b2048d4f3ac97c/docs/release-operations.md)

## Delivery slices

### SLICE-001 — Activate the declared PR gate and protect signing refs

**REQ-01.**
Use `scripts/github-governance.js` and the existing `governance:inspect` command.
Record the current effective settings and every difference, including inherited rules.
The existing apply path requires clean signed published main and a native app-identified acceptance check from the reviewed workflow.
Use an existing qualifying PR when available.
The administrator then applies the reviewed policy through its existing cutover path and runs `npm run governance:inspect -- --check`.
Retain merge commits, stale review dismissal, resolved threads, zero required additional approving reviews, no bypass, read-only workflow defaults and all-external-contributor approval.
Allow GitHub-owned actions, the project namespace and the pinned `astral-sh/setup-uv` dependency.
Confirm that actual refs use full SHAs.

Add separately managed tag creation and update/deletion rules for `refs/tags/v*` and, with the checkpoint exporter, `refs/tags/release-history-*`.
Creation authority belongs to the designated signing route.
Give the creator no update/deletion bypass.
`verify-release-tag.js` currently checks GitHub's valid-signature result, the tag object and source commit.
Extend admission to verify the approved owner's signing identity for both release tags and signed history refs. A valid signature by another identity must fail even if the owner pushed it.
Reuse the owner's local signing route and keep its private key outside Actions.
Retain historical trust information on key rotation.
Renew a checkpoint with a new signed ref and give a mistaken release tag a fresh candidate identity.
Reconcile direct-main wording in `docs/release-operations.md` and pending-activation wording in `docs/ci-trust.md` after provider readback.
[Governance command](../../scripts/github-governance.js) · [GitHub tag rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

**Acceptance.**
A successful ready-for-review PR satisfies the expected app check.
Changing its head requires fresh qualification.
A wrong app with the same check name, an omitted job, direct push, disallowed action or tag movement must fail at the owning boundary.
Exercise restrictions, an unapproved signer and approved key rotation in isolated fixtures.
Read back managed provider settings after separately authorized activation.
A successful main observer returning `FULL_REQUIRED` names its reason and the manual full workflow.
Abort activation on a missing authentic check or ambiguous managed ruleset.
After partial application inspect each setting before retrying.
Extend `test/governance.test.js`, `test/workflows.test.js` and `test/ci-proof.test.js`.

### SLICE-002 — Stage and archive the owner-selected channel

**REQ-01, REQ-02, REQ-04.**
Currently `publish.yml` uses a `contents: write` review job for private draft visibility.
Have the owner authorize exact public-safe decision bytes for the candidate via authenticated dispatch.
Bind actual dispatch authority to the owner or a verifiable owner signature over the referenced decision, independent of who supplied its hash.
A self-asserted owner field plus a matching caller-supplied digest is insufficient.
Send the bounded original bytes and SHA-256 to read-only admission.
Verify the raw bytes before parsing with `verifyReleaseAcceptance`, bind the signed tag/source, manifest and reviewed source-to-controller delta.
Preserve explicit approval of the current controller when source differs.
If dispatch size or visibility is unsuitable, use an owner-signed immutable reference plus digest and read it without credentials for draft access.
Validate the chosen transport through the staging CLI before retiring the old job.

Removing the privileged draft reader intentionally transfers the staging decision’s authority from a private draft lookup to the authenticated owner and exact signed source.
Require prior draft identification in the decision if relied upon, and require the real matching draft before archival.
If read-only admission cannot establish the required authority or draft identity, retain the existing narrowly scoped protected reader for that case.
Version the expected job inventory in `release-continuation.js` and staging-attempt admission.
Historical runs with `review` must remain verifiable.
Keep rejecting a changed digest or unaccepted independent rights/security review.
The schema-1 pilot record requires three accepted decisions and an exact pilot subject for each consumer.
Keep that validator intact for historical evidence.
For new releases, version the review and acceptance records.
Bind the chosen channel at review, then bind the public qualification run/attempt, prior review digest and actual downstream/rehearsal outcomes at acceptance.
A real trial cites its exact public family and results.
Omission or a recorded skip carries no waiver or fabricated acceptance.
Triage any defect found under the ordinary release criteria.
Update the producer and readers together in `read-release-decisions.js`, `collect-release-evidence.js`, `release-assets.js` and the owner-facing runbook and support policy.
Optional adoption by a downstream repository still follows that repository's own migration and trusted-event controls.
[Existing staging graph](../../.github/workflows/publish.yml) · [Decision validator](../../scripts/release-acceptance.js)

Carry the reviewed channel through both `publish.yml` phases, the native npm stage command, evidence and replay admission.
`stage-release-package.js` currently emits `--tag=pilot` and `release-staging-evidence.js` requires that literal.
The step names in `publication-steps.js` identify original attempts.
Preserve those names and their meaning for older runs.
Bind each selected label's prior value and the three npm defaults and prior GitHub latest in review.
Check live guards immediately before each request and have the owner recheck the stage identity, digest, channel and current defaults before 2FA approval.
For a pilot, read back all three pilot labels and the unchanged defaults.
For direct `latest`, read back the approved default changes.
Record approval and public observation separately from the original stage request.
The version projector already permits prerelease syntax.
Tag verification, package and tarball admission, staging history and the scan of release subjects still contain stable-only checks.
Follow an RC from `project-package-version.js` through `verify-publication.js`, `prepare-publication-environment.js`, `verify-release-tag.js`, both stage phases, `publication-history.js` and `publication-subjects.js` into the archive and offline readers.
Accept exact canonical npm release coordinates, preserve exact basename/package/source binding, and retain the stable-only constraint for ordinary stable promotion.
An RC with the wrong archive name or origin must still fail.
Keep both real native checks and the per-package origination map through `release-registry.yml`.
A successful install that silently omits an optional native cannot qualify core.
After core approval, qualify the original version and bytes in both install layouts on the frozen matrix.
Direct stable classification consumes authenticated stage outcomes and confirmed defaults with zero redundant dist-tag requests.

For a draft archive, have the owner collect the GitHub immutability response, exact repository URL, check time and SHA-256.
Bind the bytes and candidate identity into the new release acceptance.
Apply JSON’s one-hour freshness check at publication, and reject future timestamps, mismatched identities, disabled settings or stale evidence before writing.
Read and verify the draft, all assets and matching signed tag with the protected release job.
After publication require positive provider immutability and byte verification.
Retain prerelease-first archival and verify the immutable release, tag, assets and attestation before any stable classification.
On direct stable `latest`, the approved operation can then finish through the GitHub writer and the read-only verifier in SLICE-005.
An RC or a pilot preserves the prior GitHub latest ID or absence.
An already immutable release follows a verify-only archival path even after the settings observation expires.
Update `github-release.js`, `prepare-github-release.js`, `release-attestation.js` and draft decision recovery to recognize the expected classification at each phase, including an already completed direct stable release.
Keep any privileged reads limited to genuine draft visibility.
No Administration credential belongs in Actions.
If the holder’s permissions or provider result change between the observation and publication, stop and reconcile a mutable or ambiguous release.
[Immutability endpoint](https://docs.github.com/en/rest/repos/repos#check-if-immutable-releases-are-enabled-for-a-repository) · [Current archive](../../scripts/github-release.js)

**Acceptance.**
Exercise stable and RC coordinates with both omitted and explicit channels from projection to terminal readback, with exact original native and core origins.
One native approval, a skipped platform, a foreign run or native-operation failure must produce zero core requests.
After a failed public matrix on direct `latest`, report changed defaults and preserve GitHub latest.
On a successful direct stable release, verify all three defaults and the immutable GitHub latest.
On either RC route prove GitHub latest stayed at its preimage.
Show that a skipped downstream trial and timed exercise admit the new record, missing security/rights acceptance fails, and old schema-1 decisions still enforce their original contract.
Tampered/oversized input, wrong actor or controller, replayed old decision, displaced draft, or missing approval fails before the relevant effect.
In a fixture deny the settings endpoint to the writer.
Fresh owner evidence permits the hosted draft path and a final immutable read.
A stale/false observation causes zero draft writes.
An existing immutable release with missing or extra assets fails verification and causes zero requests to edit the release.
Extend `test/release-staging.test.js`, `test/release-continuation.test.js`, `test/github-release.test.js` and `test/release-runtime.test.js`.

### SLICE-003 — Retain authenticated writer attempts and settlements

**REQ-03, REQ-04.**
Extend `publication-attempts.js` and `publication-history.js`, which already authenticate bounded original staging attempts, preserve per-package origins and reject unsafe replay.
Extend coverage to draft uploads/publication, npm label effects and GitHub classification.
Distinguish read operations from write intents in the current promotion journal.
Record repository, controller/source, workflow, run/attempt, job/step, package or release ID, prior/target and decision/manifest digest.
Record a pre-request startup marker, attempted request and confirmed native readback or unknown outcome.
Bind any approved resolution to the exact original journal bytes and provider evidence.
Never replace an unresolved journal with a synthetic success.

Adapt the JSON exporter/checkpoint semantics to this repository’s workflow names and separate native/core origins.
Preserve complete original inventories and exact records, union checkpoints with live provider history by identity and compare overlapping observations.
Retain a second evidence set for target eligibility.
Capture the original successful public qualification workflow/run/attempt, job and artifact identities, verified report bytes for the frozen matrix, origin map and recipient locks.
Bind these to the signed source tag, manifest, three public integrities and immutable release/asset inventory.
A writer journal alone cannot prove a family was qualified.
Have CI prepare the complete checkpoint at release or recovery, report missing items and the earliest expiry, and present its digest to the owner for one signature on a protected history ref. Renew under a fresh ref when needed.
The owner signs the source tag when freezing the candidate and the history ref when sealing evidence.
Routine job transitions use authenticated provider evidence.
Use a read-only preflight before dispatch.
Report immediate release verification and long-term recovery eligibility separately.
An unsigned or incomplete export leaves recovery after expiry unproven.
A legacy run without complete history can be inspected or reconciled using surviving independent records.
Missing proof remains an explicit block on the dependent effect.

**Acceptance.**
Record a successful attempt, cancelled-before-request, lost acknowledgement and an ambiguous interrupted run.
A stale prior npm label or a public 404 must never authorize a second request after intent.
Remove the provider artifacts in a fixture.
Complete signed writer records, matching settlements and the signed original qualification evidence permit recovery after fresh target checks.
Omit just the qualification or just the writer history, substitute a snapshot or use an untrusted signature and the dependent write must stop.
Preserve the narrower historical reader and missing-evidence diagnosis.
Exercise races with a later dispatch and preserve original origins in a partial rerun.
Run `test/publication-attempts.test.js`, `test/release-staging.test.js`, plus new archive and promotion scenarios against recording transports.
[Existing history](../../scripts/publication-history.js) · [JSON recovery implementation](https://github.com/Hadden-Industries/json-quality/blob/6c037cb425613b1c57543156d0b2048d4f3ac97c/scripts/release-recovery.js)

### SLICE-004 — Compact the immutable archive without losing evidence

**REQ-02, REQ-04.**
Extend `collect-release-evidence.js`, `release-assets.js`, `github-release.js` and their downstream promotion readers.
Deploy the reader first.
Keep schema-1 historical releases verification-only, and support the current schema-2 flat inventory, including the 3.0.1 logical-empty convention.
Emit a distinct version for new indexed bundles.
Keep core plus both native tarballs, accessible corresponding source, notices/rights and essential identity records as standalone assets.
Group high-cardinality reports, logs, locks, SBOMs and recovery records into an indexed ZIP.
Bind the outer archive’s size and digest and each logical member’s path, size and SHA-256.
Preserve the complete distribution SBOM, source/recipient SBOMs, both perf corpora’s evidence and empty stderr.
Reuse bounded regular-file, ZIP and extraction controls from the evidence transport.
Size the limits against measured existing contents and future growth before enabling the writer.
[Flat archive verifier](../../scripts/release-assets.js) · [JSON indexed format](https://github.com/Hadden-Industries/json-quality/blob/6c037cb425613b1c57543156d0b2048d4f3ac97c/scripts/release-assets.js)

**Acceptance.**
Compare the full set of logical names, sizes and hashes in a 3.0.1-shaped fixture with the new representation.
Include a genuine zero-byte log.
Refuse duplicate, extra, missing, oversized, linked or traversing members, digest substitution and a correct outer ZIP with the wrong logical inventory.
Verify outer assets natively and verify every member at archive completion and fresh promotion admission.
Measure assets, bytes, peak unpacked size, verifier invocations and elapsed/job minutes at equivalent coverage.
Count full verification once per fresh admission, then bounded identity/mutability reads per writer.
A changed release ID, signed tag, asset identity or evidence digest invalidates reuse.
Do not rewrite old assets.
The older compact-qualification proposal concerns CI transport and has a different reader.
[CI transport plan](compact-qualification-evidence.md)

### SLICE-005 — Promote, align, restore and independently verify the family

**REQ-02–04.**
Extend the operation accepted by `promote-release.yml`.
Ordinary forward promotion still advances a stable version and uses a coherent approved prior family.
Alignment and restoration have distinct owner-reviewed scopes and per-package preimages.
Direct stable publication arrives with authenticated approvals that already moved npm defaults.
In read-only admission, re-admit the recorded exact-source CodeQL/security evidence, refresh current security observations and audit the exact retained recipient locks.
Extend `qualify-release-security.js` and reuse the verified archive identity from SLICE-004.
Pass the read-only result by immutable artifact ID, digest and producing attempt.
The npm writer rechecks approved priors and earlier targets immediately before Windows, Linux and core writes.
Admit an already-at-target value only as an explicitly approved no-op or as the authenticated result of the original operation.
A matching label alone cannot establish who moved it.
Seal the npm journal, three package integrities and label readbacks, operation, scope, decisions, archive/release IDs and run/attempt for the GitHub writer.
A green `needs: npm` is insufficient.

Keep npm OIDC plus read-only GitHub access in the npm job.
Give the separate GitHub job contents-write access and no npm promotion identity.
One owner dispatch authorizes both jobs.
GitHub requires the sealed npm result and fresh reads of all defaults before it changes classification.
For a stable promotion, restore or direct stable completion, verify that the selected immutable release is stable/latest.
Edit classification only when required.
Pilot and prerelease publication preserve the prior GitHub default and the target's prerelease flag.
A separately runnable read-only completion job verifies the three selected npm labels and any guarded defaults, target release ID, signed tag, asset inventory, prerelease flag and GitHub latest ID or approved absence.
An npm RC can be the default while GitHub still points to the prior stable release.
Remove repeated full-archive verification from writers only after this handoff and effect-time identity checks pass.
Keep the real command entry points loadable without the project dependency graph.
[Current promotion controller](../../scripts/promote-release.js) · [JSON handoff](https://github.com/Hadden-Industries/json-quality/blob/6c037cb425613b1c57543156d0b2048d4f3ac97c/scripts/promotion-handoff.js)

**Alignment and restoration.**
Support alignment before the next release when core and GitHub already identify the same qualified immutable stable release.
Verify its original public qualification and per-package provenance, then run fresh security and retained-lock checks.
Bind each companion's actual prior version or explicit absence, core's current version and GitHub's current release ID.
Change only divergent companion defaults, and read back all four defaults.
If core and GitHub disagree, require a promotion or restoration decision.
The observed `3.0.1` family was already aligned.
Use it as the zero-write case, and an isolated fixture with one or two divergent native labels for the repair case.
The next completed stable release must align both natives, core and GitHub.

For ordinary restoration, target a previously qualified immutable stable family, including verifiable original bytes, security, rights and public qualification.
Bind the affected and target manifests, per-package preimages/integrities and prior/target GitHub IDs.
Use the native-first sequence, fresh audit, sealed handoff and independent completion.
Keep `semver.gt` for forward promotion.
An explicitly approved restore may select an older target.
For partial recovery, use the original journal and provider readback to identify exactly which effects are attributable to the interrupted operation.
If two native defaults changed before core staging failed, validate the original targets and restore only those affected defaults to their individually qualified priors.
Recheck core, GitHub and any other excluded labels as guards.
An originally absent label requires a preview naming the package, current value and proposed deletion and explicit owner approval before removal.
If a core defect is discovered after stable completion, the owner can restore the previously qualified stable family or publish a corrected version.
Admission must reject a standalone request to roll only core back to an RC after completion, even if the RC was qualified.
Reconcile an unknown request before any new effect.
Correct defective published bytes with a new qualified version.
Restore consumer files from their own preimages.

**Bounded readback and resumption.**
Today `promoteNpmLabels()` starts a new five-minute window on each observation, and the command's shared preamble and GitHub phase also call `readNpmLabels()` without that deadline.
The GitHub writer currently performs its own terminal verification.
Move final verification to the read-only command and cover every preliminary read on that path, including the initial release/latest and family reads, so an early stale value cannot reject a settled write.
Authenticate the decision and exact writer attempts first.
For acknowledged writes, allow propagation only from the approved prior to the approved target.
Apply one five-minute deadline across terminal family and GitHub reads, including child process timeouts, npm's internal fetch retries and sleep.
Accept object and singleton-array npm responses.
Treat a missing label as absence only when the operation expressly allows it and the provider observation establishes it.
Reuse the transient-error classification and provider hints in `github-evidence.js` and the existing registry visibility checks.
Use capped exponential backoff with jitter for idempotent reads of a known prior, network timeout/reset, temporary server error or identified rate limit. Honor Retry-After/reset within the remaining budget.
A third value, wrong release ID outside the approved transition, invalid signature, digest or schema, or ordinary authorization denial stops immediately.
A public 404 alone cannot settle an attempted write.
At expiry record **completion unconfirmed**, the last confirmed observation per provider, earliest useful retry if known, and original writer evidence.
The owner can rerun verification alone by operation, digest and original run/attempt with read-only credentials.
A writer with an unknown effect enters reconciliation.
Successful writers awaiting propagation enter verification only.
Neither path automatically retries writes or reverses labels.
[GitHub reader](../../scripts/github-evidence.js) · [Registry visibility checks](../../scripts/wait-registry-integrity.js) · [GitHub rate-limit guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#handle-rate-limit-errors-appropriately)

**Acceptance.**
Drive the real command with an initial stale prior and later convergence, a transport reset, an ordinary 403, a rate limit exceeding the shared deadline and an unexpected third version.
Under a fake clock confirm that CLI calls plus waits respect the family budget.
A subsequent verification-only run must settle the original successful writers with zero mutations.
Exercise coherent forward promotion, an aligned no-op, split companions, a stable family restore, loss of a core or GitHub acknowledgement, explicitly approved deletion versus undeclared absence, foreign npm handoff, failed audit and expired source artifacts.
Verify one request per changed label, zero writes to excluded targets and zero blind retries.
Use the same qualified RC in two fixtures.
After a completed stable release, a request to roll back only core must fail before either provider receives a write.
After an interrupted operation, allow restoration of an originally observed RC default only for a label the journal and provider readback prove that operation changed.
Check the operator guidance against a direct RC publication with a prior stable release.
It must identify the RC as the npm default and the prior stable as the maintained security line.
After a GitHub failure with sealed npm success, only the outstanding GitHub effect may resume after reconciliation.
If that effect already succeeded, only readback remains.
Final proof comes from read-only credentials.
Compare against the historical 31.85/31.58-minute promotion, reporting asset count, verification calls, workflow attempt and any changed workload.
Extend `test/release-promotion.test.js`, `test/release-security.test.js`, `test/github-release.test.js` and the CLI import/permissions test.

### SLICE-006 — Qualify Snapper source coverage and installed-only diagnostics

**REQ-02, REQ-04.**
Two independent read-only experiments can proceed with the governance work.
For Snapper, the native maintainer uses the released build input in `assets/native-build.json` (source `407c2be` at this baseline) and the selected Cargo lock, target and features in `scripts/build-native.py`.
The separately pinned next-build input is a different subject.
`cargo metadata --locked`, locked rights generation and `cargo auditable build --locked` already exist.
Inspect real Rust CodeQL extraction against the selected upstream source, use its supported analysis mode, and establish which crates/files and configurations are represented.
Compare against actual linked crates and the embedded inventory.
Admit a repeatable source-security result bound to the producer and distribution evidence only if that correspondence can be shown.
Otherwise retain the present rights, glibc, payload and distribution gates, document the uncovered scope and evaluate a supported advisory check against that exact lock before selecting another tool.
Preserve existing Actions query inventory/model tests.
[Native build owner](../../scripts/build-native.py) · [GitHub CodeQL language support](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)

For diagnostics, extend manual `main-qualification.yml` with a full/installed-only choice if a real packed failure can be isolated at materially lower cost.
Reuse the existing package producer, frozen matrix and installed recipients.
Pack once, verify exact transported bytes in root and isolated layouts on both OS families, run the relevant native/CLI corpus and offline replay, and report under a separate diagnostic check name.
Exercise a real mismatch in a package member or native result and prove the diagnostic detects it.
A missing lane, or the diagnostic’s success on its own, must never satisfy PR acceptance or release admission.
Keep the existing Windows observation and historical registry smoke path.
Compare job minutes and time to first useful failure with manual full qualification.
[Product qualifier](../../.github/workflows/qualification.yml) · [JSON installed-only graph](https://github.com/Hadden-Industries/json-quality/blob/6c037cb425613b1c57543156d0b2048d4f3ac97c/.github/workflows/installed-qualification.yml)

## Integration, rollout and recovery

The release maintainer integrates new decision, step-inventory, history and bundle readers before any new-format write.
Deploy both channel paths through staging, archive and read-only completion as one compatible change.
An old producer may keep using its original format while the new readers roll out.
SLICE-001 gates production activation.
Its isolated governance checks can proceed while provider activation awaits a separate decision.
SLICE-002, SLICE-003 and SLICE-004 can develop fixtures independently once the decision, origin and archive identities agree.
SLICE-005 consumes those three contracts.
SLICE-006 is independent of the label cutover.
Keep fixtures in each repository until both readers can authenticate old and new evidence using the same semantics.
A new runtime or shared library needs a documented capability or licensing reason.

Capture the prior full HISEW baseline on the exact integration commit for R2 and compare it with the frozen candidate.
Configured profiles are `npm run check:focused`, `npm run check:affected` and `npm run check:full`.
Use slice-specific tests as well as `npm run check:ci` for workflow structure.
For controller acceptance, exercise the normal workflow entry points against isolated providers for staging, promotion, alignment, restoration, expiry and verification-only retries.
Record available hosted checks, independent verification on the frozen revision, and scoped independent security/rights evidence under their actual providers.
For an authorized release, require the full exact-source release graph, native/rights/distribution and security jobs, eight frozen public registry lanes, both installed layouts, original provenance and two pinned performance corpora.
Report what was proven in fixtures, observed on hosted infrastructure and observed on a real release.
Controller acceptance does not require a live publication, label move, downstream migration or timed exercise.
Stop the dependent operation on a missing or skipped required job, untrusted bundle, unexpected provider label or incomplete history.

Before a live writer, the owner verifies the three package-specific staging and promotion OIDC bindings, allowed actions, main-only environments and absence of alternate publishing credentials.
Private npm trust settings were outside the planning readback.
Allow one pending release decision across manual approval boundaries until completion or explicit owner supersession.
An urgent replacement must stop the old operation, reconcile outstanding npm stages that could still move defaults upon approval, and settle any labels already changed.
A later retry needs a new review against then-current defaults.
Test a late native approval and a stale retry after a replacement has advanced.
Default Actions concurrency can replace a pending run.
Retain the operation's own pre-write and history guards.
[npm trust scope](https://docs.npmjs.com/trusted-publishers/) · [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

For the next authorized release, observe the source-to-tarball chain, both native approvals, the separate core approval, fresh public family qualification, immutable classification and read-only completion for the selected channel.
The owner signs the prepared evidence checkpoint before provider retention expires.
Offer OwlAPI and WebVOWL maintainers a trial of the exact public tuple on a selected consumer revision.
If a maintainer elects to rehearse consumer recovery, exercise manifest/lock and document preimages with unrelated-file sentinels in a disposable copy.
A simulated provider label restore measures a different operation and can be recorded separately.
Both timed rehearsals and downstream sign-off stay optional at every stage.
Preserve the historical 3.0.1 waiver as part of that release's record.
After an unknown write, preserve its journal, stop further effects and reconcile with original provider evidence.
Before any request a failed admission leaves the candidate available for inspection.
After an approval on direct `latest`, expose the observed defaults and hold further effects until the owner chooses a qualified continuation or scoped recovery.
Reopen the dependent design if owner authority cannot survive decision transport, retained proof cannot establish target eligibility, or compaction weakens rights or logical-member verification.
