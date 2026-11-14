# Release controller hardening and pilot retirement

## Direction and implementation baseline

Draft HISEW R2 implementation plan, prepared on 2026-11-14.
The purpose is to complete releases and recover interrupted availability changes with attributable evidence and fewer repeated operations.
Implementation should deliver the same decision through the actual admission, writer, completion and historical readers.
Implementation and live registry or GitHub mutations require the subsequent accepted change and applicable owner decisions.

The inspected Markdown Quality baseline is `a152cedcc8a7ab3448fe055cf4dc927527ed1255` on `fix/release-controller`.
It includes `9adf81d`, which authenticates historical controller evidence, independently accounts for expected writer runs and restricts current decisions from mutable drafts.
Preserve those controls throughout this work.
The inspected JSON Quality baseline is `c8c74cc6847d1c34c1d86de861d1a6a6b4d26317`, matching that repository's remote main at inspection.
The source observations and acceptance contracts below supply the handoff without requiring any chat history.

Use the accepted R2 route for release authority, original evidence, cross-service effects and recovery.
The release maintainer owns integration and the release owner accepts operational preimages and external permission changes.
The security reviewer owns review of evidence admission and credential boundaries.
The native maintainer owns binary provenance, rights and platform acceptance.
Planning inspected active personal HISEW applicability and reused the existing execution context.

Extend the existing release modules in vertical slices.
Keep the current package-source identity and all three archive digests bound to each decision.
Route pilot retirement through an explicit owner operation in the existing protected promotion workflow.
Use current stable qualification for the stable target and authenticated historical qualification for an older retired target.
Treat recorded request outcomes, provider readback, artifact transport and final operation completion as separately observable states.

## Current facts and existing companion plans

Public readback on 2026-11-14 found `latest = 3.0.1` and `pilot = 3.0.1` for the core, Windows and Linux packages.
GitHub latest was immutable stable release `438708271`, tagged `v3.0.1`.
These observations establish the planning example; a live operation must obtain fresh values and owner approval.
The three package names are `@hadden-industries/markdown-quality`, `@hadden-industries/markdown-quality-win32-x64` and `@hadden-industries/markdown-quality-linux-x64`.

`scripts/family-labels.js` already maps an absent target to native `npm dist-tag rm`, and `scripts/release-operation.js` admits explicitly reviewed deletions during partial recovery.
Its operation vocabulary has no dedicated `retire-pilot` variant.
The missing capability is ordinary guarded retirement with stable-family protection and complete recovery, so this plan reuses the existing removal executor.

The 3.0.2 qualification used source `39d80c30df1a19869f7cdb7fc0109eb3111d790b` and manifest SHA-256 `5ccc73608c9fd683a883b4dab0e524ae16ce401719104b0432edf9945bb578fb`.
A reviewed controller correction can operate on that original qualification only through the existing source/controller delta contract.
A change to shipped source or package contents requires the appropriate new packaging and qualification decision.
[Qualified release run](https://github.com/Hadden-Industries/markdown-quality/actions/runs/43520981158).

The existing [release convergence plan](2026-11-13-release-ci-convergence-implementation-plan.md) supplies the broader release contracts.
This plan controls the additional incident responses, optimisations and retirement operation described here.
The [qualification evidence reuse plan](2026-11-14-release-qualification-evidence-reuse.md) owns possible future reuse of PR checks during release qualification.
Its discovery and activation gates remain prerequisites to skipping any release checks under that proposal.
Maintain the existing public CLI/API, coordinated package versions, minimum Node contract, native rights, archive inventory, recipient and performance-corpus obligations.

### Existing recovery prerequisite

At inspection, historical Markdown publisher `37393670535` had zero Actions artifacts.
Its original Windows publication step failed after being attempted, and the repository's historical implementation record describes an accepted Windows 1.0.0 publication.
No remote `release-history-*` tag was returned by the inspection.
An absence of artifacts cannot establish an absence of effects.
Recover independently admissible original evidence or a supported settlement before a release admission depends on that writer being resolved.
Keep this reconciliation explicit in rollout readiness.
[Original run](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37393670535) and [recorded historical publication](../implementation-status.md).

## Incident evidence and applicability

The source commits and runs below were inspected directly.
Successes describe those particular runs and qualified subjects.
Source inspection establishes candidate applicability; the planned regressions establish the Markdown result.

### E-01 — Frozen install and historical format failures

JSON Quality removed `devDependencies` before `npm ci`, which changed override resolution and rejected the committed lock with `Missing: fast-uri@3.1.9`.
Its history collector also applied current runtime floors, export counts and security-language expectations to authentic earlier manifests and recipient reports.
An earlier cancelled archival writer had later valid readback that also needed attribution.
The repair retained the original acquisition manifest and lock until install admission, and selected explicit historical readers while preserving current security refresh.
[Repair `194f5b1`](https://github.com/Hadden-Industries/json-quality/commit/194f5b15cb3b2a718f8531b0f7dcbb1cb784df9c) and [failed qualification](https://github.com/Hadden-Industries/json-quality/actions/runs/43437168265).

Markdown already retains the original declarations and overrides in `stageBundledDependencies` and asserts unchanged lock bytes after the frozen install.
Its release readers already distinguish historical qualification and indexed/flat evidence formats.
Preserve those implementations and close uncovered original-format journeys using authentic fixtures.
Historical proof identifies what was accepted for that historical subject; the selected current target still receives its required fresh security checks.
Likely owners are `scripts/bundled-dependencies.js`, `scripts/release-assets.js`, `scripts/release-archive-reader.js`, `scripts/release-history.js` and `scripts/qualify-release-security.js`.

### E-02 — Native upload and skipped-job representations

JSON's writer compared a REST `sha256:` digest with an upload action's bare hexadecimal digest and stopped before requesting a stage.
GitHub also retained an unevaluated matrix display expression when skipping the native-public job before core staging.
The repair validated each transport's exact representation and admitted that known skipped identity only in its intended staging phase.
[Repair `4d9cef5`](https://github.com/Hadden-Industries/json-quality/commit/4d9cef5cb8f6033f38543beb392d48d2fdc5c868) and [original writer failure](https://github.com/Hadden-Industries/json-quality/actions/runs/43470321972).

Markdown's `canonicalArtifactDigest` already accepts the two documented SHA-256 forms, and its workflow uses a different retained-native job graph.
Carry the actual Markdown producer outputs through each real consumer before proposing an additional alias or parser.
Keep exact successful core and public-native job requirements.
Likely owners are `scripts/upload-evidence.js`, `scripts/download-evidence.js`, `scripts/publication-artifact.js`, `scripts/publication-attempts.js` and `scripts/release-continuation.js`.

### E-03 — Successful stage requests followed by transport failure

Both JSON native stage requests completed, then REST lookup of acknowledged artifact `14064186016` returned 404 and failed the upload/readback step.
The repair bounded retries of that exact acknowledged immutable ID and accepted completed native request evidence from the original failed workflow.
Its failure conclusion and original journals remained historical facts.
Core continuation still required public native verification.
[Repair `3593a33`](https://github.com/Hadden-Industries/json-quality/commit/3593a33805836ba468ffe885d84739ac15c6a100), [failed post-stage transport](https://github.com/Hadden-Industries/json-quality/actions/runs/43476557013) and [successful continuation](https://github.com/Hadden-Industries/json-quality/actions/runs/43494040933).

Markdown has recoverable upload and staging reconciliation support, but `providerFor` still requires a successful staging workflow and successful prerequisite jobs in its publication-attempt path.
Exercise the failed-after-request case through native retention, core continuation, public registry qualification and checkpoint export.
Success at a journal helper alone cannot establish that journey.

### E-04 — Missing archive settings and premature history collection

JSON archive run `43496957949` reached `verifyArchiveSettings` with an undefined settings record and failed with a TypeError.
The subsequent history preparation also encountered HTTP 404 while assembling the unfinished operation.
A later archival run on the same controller succeeded after the required inputs were supplied.
Treat this as input completeness and recovery evidence, without attributing a source repair that the inspected commits do not show.
[Failed archive](https://github.com/Hadden-Industries/json-quality/actions/runs/43496957949), [failed history collection](https://github.com/Hadden-Industries/json-quality/actions/runs/43497311823) and [successful archive](https://github.com/Hadden-Industries/json-quality/actions/runs/43497914009).

Markdown already validates an `immutabilityObservation` and supports owner-authenticated refresh bytes.
Prove that missing, misplaced, stale or mismatched settings fail before an effect and that immutable readback can complete an already published archive.
History preparation must report the exact missing source and original state until its evidence is available.

### E-05 — Pilot retirement exposed permission and rejection-recovery gaps

JSON added guarded retirement, then the first Windows pilot removal received HTTP 401 because that native package lacked the promotion trusted-publisher binding.
The original request remained unknown to recovery even after the permission problem was fixed.
The follow-up admitted a narrow native rejection settlement, linked it to a fresh owner decision and completed retirement through a new dispatch.
The earlier rejected request and the successful operation were retained independently.
[Retirement `9d5d96b`](https://github.com/Hadden-Industries/json-quality/commit/9d5d96bd0c1b0763323f3141926d0dc41c3db77b), [401 run](https://github.com/Hadden-Industries/json-quality/actions/runs/43539440243), [recovery `f3c0a7a`](https://github.com/Hadden-Industries/json-quality/commit/f3c0a7aaed8d2fda9577757bef880e2b5823426a) and [successful retirement](https://github.com/Hadden-Industries/json-quality/actions/runs/43550162672).

JSON's successful retirement had successful admission, npm and completion jobs; its GitHub writer was skipped.
Its subsequent checkpoint retained the rejected attempt and retirement outcome alongside previous qualified targets.
That final consumer is part of Markdown's required proof too.
[Checkpoint preparation](https://github.com/Hadden-Industries/json-quality/actions/runs/43550774434) and [signed retained history](https://github.com/Hadden-Industries/json-quality/tree/release-history-20261114-pilot-retirement).

### E-06 — Source-policy and verification cost lessons

The rejection regression initially used order-sensitive JSON text comparisons and failed source admission.
The correction compares a retained structured record with an independent deep copy while preserving intentional original-byte assertions.
[Correction `7911335`](https://github.com/Hadden-Industries/json-quality/commit/791133562abf08bd1e0367acd644933f9f0db08a) and [failed source admission](https://github.com/Hadden-Industries/json-quality/actions/runs/43547127880).

JSON also observed a local full-verification timeout, later a process-observer failure despite a successful command, and a successful full CodeQL scan after overlay analysis was unavailable for manual C++ builds.
Classify the actual producer outcome, evidence-admission outcome and optional acceleration separately.
Reuse evidence that still matches the candidate and scope.
Choose any changed execution budget from the measured workload and its existing owner.
The package's request observation deadline and HISEW's local verification timeout have separate owners.
[Qualified JSON release run](https://github.com/Hadden-Industries/json-quality/actions/runs/43461802637).

## Reuse decisions and optimisation scope

### DEC-01 — Keep native platform operations and repository policy ownership

Use the maintained npm CLI for dist-tag changes, native Git/OpenSSH for owner signatures and the existing GitHub reader and Actions artifact transport.
The inspected producer policy pins npm `12.2.2`, Node `26.13.0`, Python `3.15.2` and the two explicit x64 runner labels in `assets/node-support.json`.
Recheck versions and supported interfaces at implementation freeze through their existing owners.
Record an independently justified compatibility decision before changing a pin.

npm supplies tag removal and package-specific trusted publishing.
The residual repository rule is coherent three-package guards, exact writer custody and recovery across separate provider requests.
The existing family controller supplies that rule's implementation seam.
A second registry mutation client or external release orchestrator would duplicate accepted policy and require additional interoperability work.
Select the current native CLI and existing adapter for this increment.
[npm tag commands](https://docs.npmjs.com/cli/v12/commands/npm-dist-tag/) and [trusted-publisher tag permissions](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

Both repository manifests declare AGPL-3.0-only.
For adapted repository-owned code, retain its SPDX header, relevant authorship and exact source commit in the change record.
Reassess file-level terms before copying any external implementation.
This selection introduces no new runtime dependency.

### DEC-02 — Preserve the existing authorities under DRY-01

`scripts/release-operation.js` owns operation meaning, scope and approved preimages.
`scripts/family-labels.js` owns ordered native npm label requests and bounded observation.
`scripts/release-effects.js` owns original durable intent and outcome journals.
`scripts/release-history.js` and `scripts/release-retained-artifacts.js` own original producer authentication and retained replay.
`scripts/release-controller.js` owns read-only admission and service handoffs.
`scripts/qualify-release-security.js` owns fresh security refresh.
The workflows schedule those owners and assign service permissions.

Keep the protected-main and owner-signature checks at every consuming trust boundary.
Extend existing pure policy helpers when callers share the same rule.
Keep transport representation checks local to the transport owner and share the canonical result downstream.
The exact historical provider vocabulary and present operation semantics can have deliberate separate readers with fixtures preventing drift.
An old reader's accepted subject cannot silently acquire the authority of a current decision.

### DEC-03 — Preserve and extend existing cost reductions

JSON's convergence implementation separated full read-only validation from narrow writers, retained original acknowledgements and provided bounded observation and checkpoint recovery.
Those changes reduce repeated installation, qualification and mutation work even on a successful path.
[Controller implementation](https://github.com/Hadden-Industries/json-quality/commit/a905df9037514e02bb087727ddd7e8a17e4698fe) and [workflow integration](https://github.com/Hadden-Industries/json-quality/commit/4040c437e3c5b0b4f805941327d39bf6286e5d1a).

Markdown already has compact indexed evidence, raw artifact transport, manual main qualification fallback, read-only admission and immutable archive checks in narrow writers.
Preserve those paths and measure any remaining duplicate work through the real consumer.
For one immutable qualified subject in an operation, acquire, hash and materialize its logical evidence once where lifetime and ownership allow.
Reuse an already verified current-stable snapshot when the retired target is the same subject.
Retain current audit and native-rights obligations for the selected release.
Read original accepted qualification for an older retired subject without executing its retired code again.

Cache or coalesce only immutable observations within the admitted operation lifetime.
Keys must include repository, source/controller, original run and attempt, artifact ID/digest and the applicable reader contract.
Evict failed transient lookups so an initial 404 cannot poison later acknowledgement readback.
Keep live label, current-main, stage, release classification and permission observations fresh at their required boundaries.
Release any large materialized tree when its actual consumers finish.

Let H be historical attempts, U distinct immutable subjects, B their verified bytes, L matrix lanes and P package writes.
Measure provider calls and bytes against H, U and B, and recipient audit work against each distinct retained lock and its policy.
Fresh per-write guards grow with P and the three-package family.
Batching metadata cannot remove a required guard or merge distinct lock identities.
Report cold and reused counts, materializations, hashed bytes, subprocesses, elapsed workflow time, runner time and retained size.
Set performance acceptance from the baseline observation and a repeatable comparison before dependent optimisation.

### DEC-04 — Channel lifecycle

Use `pilot` for an actively evaluated candidate and permit its absence between candidates.
Retire an evaluated alias only after explicit owner admission for the observed stable and retired subjects.
Use the existing manual promotion workflow and an explicit `retire-pilot` operation.
Keep the existing default staging channel and support policy under their current contracts.
Version-pinned historical installs and immutable release assets continue to identify their original versions.
An explicit `@pilot` request can be unavailable after retirement; explain that lifecycle in consumer-facing channel guidance.

### DEC-05 — Separate recovery from permission repair and mutation

Preserve the exact failed journal and original provider conclusion.
Read-only recovery may establish acknowledgement, application, or an admissible explicit rejection.
An unresolved network response remains unknown until supported evidence settles it.
Permission repair requires the owner's external decision.
A fresh operation binds the remaining requested scope and any original settlement before another mutation.
Changing the controller, current labels, source or approved operation bytes requires the corresponding new admission and signature.

## Requirements, acceptance and independent oracles

| Requirement                                                                   | Acceptance and quality scenario                                                                                                                                                                                                                      | Independent oracle                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| REQ-01 / AC-01 / QA-01 — Acquire the frozen graph faithfully                  | Install with original declarations and unchanged lock bytes, then observe the intended production closure. Original historical formats pass their specific reader; a missing floor, substituted source, changed lock or invented export still fails. | Committed manifests and locks, native npm validation, archived original consumer contract and subject digests.                    |
| REQ-02 / AC-02 / QA-02 — Admit actual transport identities                    | Bare and prefixed valid upload digests bind to the same expected SHA-256. Known phase-specific skipped jobs are accepted only when their execution is optional. Malformed digests, conflicting IDs and omitted successful lanes fail.                | Native upload outputs, authenticated REST metadata and actual job inventories from E-02.                                          |
| REQ-03 / AC-03 / QA-03 — Preserve completed effects through transport failure | A completed native request followed by artifact-readback failure can reach core continuation, public qualification and retained history with the original failed conclusion and zero repeated requests.                                              | Original stage IDs, journal bytes, provenance, native attempt/job inventories and independently downloaded tarballs.              |
| REQ-04 / AC-04 / QA-04 — Complete validated archive admission                 | Missing or stale immutability input stops before writes with a useful reason. Already immutable readback completes without replay. A premature checkpoint reports its exact incomplete obligations.                                                  | Provider release settings, signed tag object, immutable release ID, asset inventories and original effect journal.                |
| REQ-05 / AC-05 / QA-05 — Retire only the intended pilot family                | Remove approved pilot aliases in native-first order, preserve all three stable labels and GitHub identities, and make explicitly approved absent aliases read-only no-ops. A newer candidate or changed guard stops further writes.                  | Native registry tag responses, semver ordering, owner decision and independently verified stable/retired qualification.           |
| REQ-06 / AC-06 / QA-06 — Recover a rejected request conservatively            | An exact admissible native 401 rejection can settle its original request, but only a fresh decision naming that settlement can issue remaining requests. A timeout, missing log, wrong endpoint or conflicting acknowledgement fails admission.      | Original authenticated job/step log, journal and acknowledgement custody, original operation and fresh owner-reviewed settlement. |
| REQ-07 / AC-07 / QA-07 — Bound operational cost and retain proof              | Cold and repeated admission preserve equivalent decisions while reducing any demonstrated redundant immutable work. History export includes failed, completed and retired operations and replays after Actions expiry.                               | Counted real reader/native calls, independently verified result equality, signed checkpoint and restored final-consumer journey.  |
| REQ-08 / AC-08 / QA-08 — Preserve release trust                               | Every new path keeps protected-main source checks, expected writer intents, authenticated owners, current security refresh and service-isolated credentials. Mutation count is zero on any pre-effect refusal.                                       | Existing `9adf81d` adversarial expectations, trusted native provider identities and source security policy.                       |

The three-package operation is a sequence of independent writes.
Every test and report must expose the actually changed prefix and observed values after interruption.
Treat a green helper, matching current value or overall workflow conclusion as insufficient proof of original writer attribution.

## Delivery slices and dependencies

### SLICE-001 — Freeze a representative failure through the final reader

Trace REQ-01 through REQ-04 and REQ-08 from `publish.yml` and `github-release.yml` into their validators and history consumers.
Compare each observed JSON failure against the exact Markdown path and record whether an existing implementation already closes it.
Use the current original-format fixtures where they are authoritative.
Add a compact fixture for a completed native request whose workflow later failed, including its real producer identity and evidence transport shape.
Keep expected acceptance derived from the original protocol and product contract.

Prove the fixture through normal core admission and history export before selecting a patch boundary.
If a protected caller already accepts it correctly, add only a missing meaningful regression.
If current code rejects it, isolate the source of rejection and continue SLICE-002 against that boundary.
For the historical writer lacking artifacts, produce an explicit missing-proof inventory and supported reconciliation choice.
Other slices can proceed against isolated authenticated fixtures while that live prerequisite is investigated.

Likely existing test owners are `test/publication-attempts.test.js`, `test/release-continuation.test.js`, `test/publication.test.js`, `test/release-history.test.js`, `test/release-runtime.test.js` and `test/github-release.test.js`.
Any new fixture or test path is a prediction until its owning suite is established.
Completion is the demonstrated normal consumer outcome and the exact recorded residual gaps.

### SLICE-002 — Complete failed-after-request staging and bounded readback

Implements REQ-02, REQ-03, REQ-04 and REQ-08.
Adapt `providerFor`, publication attempt authentication and the relevant callers to reason about the required completed request rather than requiring unrelated workflow success.
Retain the original repository, protected controller, original producing attempt, job, stage ID, source, review/channel, manifest and archive digest bindings.
Require public Windows and Linux installation/provenance before the later core request.
An earlier failed attempt's already completed native requests keep their original identities in the core origin map.

At acknowledged artifact visibility, retry only the exact native ID within the existing read budget and authenticated expected identity.
Use the existing retry classification and provider hints.
Unacknowledged upload recovery follows its existing distinct transport-name rules.
Digest, size, source or job mismatches stop immediately.
Every provider read observes the shared remaining deadline.

Demonstrate both native requests followed by a readback 404, delayed successful metadata, core-only continuation, fresh public qualification and signed history replay.
Demonstrate a missing stage, an unsuccessful required native check, changed digest, contradictory attempt and permanent denied read.
Count native stage invocations before and after recovery.
Completion requires exactly the original requests and no replay.
Keep archive settings validation before the first irreversible request and test recovery from an immutable archive after a lost completion response.

### SLICE-003 — Deliver guarded pilot retirement through completion

Implements REQ-05 and REQ-08 using the existing operation parser, family label executor and promotion workflow.
Add the explicit `retire-pilot` variant to the current operation vocabulary and update all current admission, writer, completion and retained-history readers together.
Keep historical operation records under their original semantics.
Earlier readers must refuse the unknown variant until the new readers are deployed.
Any new retained subrecord must declare its format and exact original subject.

The admitted retirement decision binds the current stable qualification and the retired version, source, signed tag, manifest and immutable release identity.
Require a fully accepted stable family, coherent three-package `latest` and the corresponding stable immutable GitHub release.
Require the retired version to be no later than the stable version under the existing semver implementation.
For an older retired release, authenticate original accepted qualification through signed history and current immutable identities.
When both subjects are identical, reuse the verified stable evidence within this admission.

The selected label is `pilot`.
Include all three package prior values, explicit deletion approvals for each selected removal and explicit no-op approvals for already absent values.
Targets are absent aliases.
Freeze all three `latest` values, the stable GitHub latest ID and relevant retired/stable release classifications as excluded guards.
Set GitHub mutation scope to false.
An npm-only operation must reach completion without requiring a successful GitHub writer or acquiring its write permission.

Immediately before each selected native-first removal, recheck the full pilot family, full stable family, protected controller, required stage guards and GitHub marker.
Use `npm dist-tag rm PACKAGE pilot --registry=https://registry.npmjs.org/` through the existing isolated npm adapter.
Retain the adapter's one-shot mutation semantics.
Record intent before entry, acknowledgement after the native response and bounded independent readback after it.
Refuse any unexpected third value, including a newly introduced pilot candidate.

Tests must cover all three removals, all-absent no-ops, missing deletion approval, newer pilot, changed stable marker, mutation after the first and second package, propagation timeout and duplicate invocation.
Read-only completion must authenticate the exact selected-label evidence and verify stable values at the same boundary.
An interrupted prefix is incomplete until the admitted original evidence and current state establish the appropriate terminal result.
Read-only admission and isolated complete-entry tests establish this slice's result.
Enable live retirement after the recovery and retained-history readers from SLICE-004 and SLICE-005 are integrated.

### SLICE-004 — Settle definitive rejection and re-admit remaining scope

Implements REQ-06 and REQ-08 and depends on the retirement variant.
Extend existing reconciliation and effect-settlement contracts at `scripts/release-effects.js`, `scripts/reconcile-release-effect.js`, `scripts/release-history.js` and their controller consumers.
Choose the narrow proven native 401 case from E-05 as the first supported rejection class.
Retain a separate settlement record without editing the original journal.

Bind the settlement to the original operation and decision digest, journal SHA-256, package/label endpoint, request sequence, protected source/controller, original run/attempt, failed job/step and its time-bounded native log digest.
Require a single matching rejection with an unsuccessful native exit, complete step evidence and no conflicting acknowledgement.
Validate structured native diagnostics through their existing producer boundary.
Use independent public guards as additional observations.
A current matching label or an error substring cannot establish the rejection.
Missing, expired or contradictory proof leaves the original request unresolved.

The fresh retirement decision must name this exact settlement and original effect.
Its signature and admission bind the actual remaining scope, observed priors and stable guards.
Repairing a trusted publisher alone supplies no release-operation authority.
Timeouts, connection loss and other ambiguous outcomes retain their current reconciliation rules.

Demonstrate the original 401, independent read-only settlement, a fresh remaining-scope decision, successful completion and checkpoint export after the failed run.
Adverse tests replace the source, endpoint, package, step time, journal digest, original operation or fresh settlement reference.
Also test an acknowledgement beside the claimed rejection and a second request in the supposed single-request proof.
Use `structuredClone` and structural assertions for object-preservation expectations; keep byte equality at journal and signature boundaries.

### SLICE-005 — Retain complete history with fewer duplicate reads

Implements REQ-07 and preserves REQ-08 after the new operation shapes are settled.
Profile one normal admission and one interrupted retirement through final completion and retained replay.
Apply DEC-03 where distinct callers repeat acquisition, logical materialization, source verification or immutable attempt reads for the same admitted subject.
Coalesce within the operation's lifetime and keep fresh mutable checks at each required boundary.
Record measured work before selecting an optimisation and compare complete semantic results afterward.

Extend `scripts/prepare-release-history.js` and its readers to retain the retirement's current stable target and any distinct older retired qualification.
Preserve writer-attempt inventories, closed legacy runs, reservation collisions, original journals and rejection settlements from the current controller.
Readers select old single-target checkpoints or an explicitly versioned extended target inventory by their actual format.
Different target subjects and histories must remain attributable even when their bytes are stored once.
Expose exact missing identities and earliest expiry in the existing summary.

Consider an automatic read-only checkpoint preparation after the existing archive and family-operation workflow names, alongside the manual path.
Implement it only if the original operation can be selected and authenticated through the maintained reader.
Authenticate repository, branch, workflow identity, original run and attempt before consuming artifacts from a workflow-run event.
Inspect the trigger name declarations together with the runtime selector and contract tests.
Keep signing and publication under owner authority.
A collector encountering an unfinished writer produces a truthful incomplete result and a supported read-only retry path.

Replay a checkpoint with Actions artifacts unavailable and verify both the retired and stable original subjects through the ordinary reader.
Remove one original attempt or its executed writer record and verify refusal.
A newest-run deletion remains detectable through the independent owner-signed intent inventory.
Legacy final-attempt coverage retains the current closed-rerun-window rule.
[GitHub rerun identity and window](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

### SLICE-006 — Integrate operating guidance and prove the complete path

Links REQ-01 through REQ-08 to the owner-facing release journey.
Update `docs/release-operations.md`, `docs/support-and-release.md` and the relevant channel guidance with the lifecycle, explicit operation shape, permission matrix, preimages, interruption decisions and verification-only recovery.
Continue using the existing reviewed-stage tarball comparison before owner approvals.
Describe the original request state and next admissible action in workflow summaries.
Keep credentials, OTPs and restricted logs out of public records.

Finish isolated full-entry journeys with realistic native-provider responses and explicit mutation counts.
Then run the dependency-guided affected tests and the final route-selected source, package and hosted checks on the frozen candidate.
Review the release-permission and evidence boundaries with Codex Security and the selected independent review route.
Reuse passing evidence when its exact candidate and scope still match.
Record a process-observer or evidence-admission failure alongside the actual producer result and diagnose that boundary before selecting a rerun.

The owner decides separately whether to perform a live retirement for the fresh observed family.
Read back all three pilot absences, all three stable values and both relevant GitHub release identities.
Publish and independently verify the complete signed history before normal evidence expiry.
Completion of code delivery and completion of that external operation are separate recorded milestones.

## Verification design and existing entry points

Select tests through the maintained dependency graph and the changed consumers.
The focused suite mapping is a starting prediction, refined by the actual implementation diff.

| Area                                | Existing check or suite                                                                                                   | Claim                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Frozen installation and metadata    | `test/bundled-dependencies.test.js`, `test/packed-qualification.test.js`                                                  | Original graph and lock admitted, correct packed production contents.                                                          |
| Upload and core continuation        | `test/publication-attempts.test.js`, `test/release-continuation.test.js`, `test/publication.test.js`                      | Real artifact representations and original failed-after-request staging remain attributable through core.                      |
| Family operation and guards         | `test/release-controller.test.js`, `test/release-controls.test.js`, `test/release-promotion.test.js`                      | Explicit retirement, correct scope, latest/GitHub guards, ordered requests and no-op decisions.                                |
| Recovery and history                | `test/release-history.test.js`, `test/release-signing.test.js`, retained-artifact and controller suites                   | Exact original effects, conservative rejection, complete signed replay and expected-run detection.                             |
| Archive entry and runtime isolation | `test/github-release.test.js`, `test/release-runtime.test.js`                                                             | Required settings before effects, immutable recovery and execution without project-installed dependencies in narrow writers.   |
| Workflow and source policy          | `npm run check:ci`, `npm run check:source`                                                                                | Real job dependencies, selected service permissions, trigger identity, structural JSON comparison and repository source rules. |
| Impacted and full acceptance        | `npm run check:affected`, `npm run check:full`, deliberate hosted release qualification when required by shipped subjects | Closure of the actual dependency impact and the required final release contract.                                               |

Validate planned commands against `package.json` and the maintained test selector at the implementation freeze.
The installed graph exports `check:focused`, `check:affected`, `check:source`, `check:full` and `check:ci` at this baseline.
This planning activity executes only documentation checks.
Keep unit fixtures independent of production decision helpers for their expected answers.
Mock GitHub/npm response and credential boundaries; keep native argument construction, hashing, signature validation, archive extraction and record parsing real where their contracts are under test.
Perform a meaningful guard-removal negative control in an isolated copy for the stable-preimage and original-writer refusals.

Keep the floor and maintained compatibility runtime checks unless a separate support-policy decision changes their obligations.
The current matrix includes minimum `22.13.0`, compatibility pins `22.23.4` and `24.22.2`, and reference `26.13.0` on both explicit x64 platforms.
Removing a parallel lane can save runner work without reducing release latency.
Measure both quantities before changing coverage.

CodeQL's unavailable overlay acceleration on manual native builds still permits the required full analysis.
Preserve the accepted native build model and report the actual full-scan result.
Any future build-mode change needs equivalent extraction evidence through the existing security owner.
[CodeQL incremental-analysis prerequisites](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/scan-from-the-command-line/incremental-analysis).

## Permission and deployment readiness

The existing npm promotion job uses `npm-promotion` and the isolated npm runtime.
Before a live retirement, the owner verifies a matching trusted-publisher configuration for each of the three packages with the exact repository, promotion workflow and environment and dist-tag permission enabled.
Direct publication permission is independently configured.
Read-only inspection and `npm whoami` cannot establish the intended OIDC mutation authority.
Stage approval and rejection continue to require the owner's interactive authentication.
Capture permission readiness as a public-safe observation of the configured binding, and retain a failing operation's original native outcome if the actual request is refused.
[Official trusted-publisher permission contract](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

Preserve the existing service credential separation and shared publication concurrency group.
Keep archived targets, current main, source tag and owner-signed intent validation before release effects.
Reader deployment precedes any new emitted record format.
Include indexed and supported flat archives, current and historical decisions, partial reruns and deleted/expired provider records in compatibility acceptance.

## Rollout, recovery and ownership

Integrate SLICE-001 and SLICE-002 first, then the retirement and rejection paths, then the history extension and measured optimisations.
Transport inspection and pure operation-contract design can proceed independently once their shared evidence shape is agreed.
The integration owner controls edits to shared controller, history and workflow contracts across slices.
Keep this as a single coordinated ownership boundary when parallel implementation would otherwise redefine the same journal or operation semantics.

Recheck the integration head, remote writer activity and the 19-run baseline before enabling new writers.
Resolve the existing missing historical publication proof as an explicit release-readiness item.
Qualify each newly emitted record through its final consumer before activating the corresponding producer.
Read-only fixtures and complete-entry tests establish code readiness before the owner chooses the live target.

Abort further requests on an unexpected package value, a newer pilot, mismatched source/digest, changed GitHub marker, exhausted observation deadline or failed producer authentication.
Retain a precise last-confirmed state and original request identity.
A failed-after-write workflow uses original evidence and read-only completion or an explicitly admitted recovery decision.
Restoring a removed alias is a new owner-reviewed availability operation with its own preimage and source evidence.
An acknowledged provider request continues to require completion or settlement even if the controller deployment is reverted.

Preserve the original qualification and tarballs for a controller-only correction when the existing delta admission permits it.
Repack and requalify when shipped package bytes change.
The future PR-evidence reuse plan can proceed independently through its discovery phase; activation of that feature follows its own measured proof.

## Open evidence and reconsideration triggers

The release owner must establish whether a pilot candidate is still actively evaluated before live retirement.
Refresh the current registry and GitHub observations at that decision.
If a newer candidate is present, narrow or defer the operation under the same lifecycle policy.

The historical Markdown writer with missing artifacts needs a supported evidence source or settlement.
Investigate local retained records and independently verifiable public custody before proposing a new recovery contract.
Preserve the explicit gap until that contract's oracle and original authority are established.

A failed native-stage fixture may already be accepted by a different current caller.
Select the smallest missing end-to-end boundary after SLICE-001, and preserve valid existing entry points.
An optimisation that adds recurring remote observations or retained state without reducing measured work should be narrowed or omitted.

Revisit any selected representation when the installed native CLI, GitHub artifact API or supported workflow job graph changes.
Revisit the checkpoint schema when an older reader cannot select the exact subject it needs from the proposed extended record.
Revisit rejection support when real diagnostics cannot prove the narrow authenticated refusal without exposing restricted data.
Continue independent work while that evidence-dependent slice is unresolved.

## Planning completion and handoff

The deliverable of this task is this draft implementation plan.
Its baseline and source observations were inspected directly, including the later JSON retirement and rejection-recovery changes.
Implementation, external permission changes and live operations follow their subsequent accepted change and owner decisions.
At implementation acceptance, carry the REQ/AC/QA and DEC identifiers into the existing R2 change record and record each slice's actual proof and remaining gaps.
