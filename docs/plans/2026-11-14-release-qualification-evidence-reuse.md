# Reusing PR evidence during release qualification

**Status.**
Draft HISEW R2 implementation plan for a subsequent release.
The release owner decides whether to enable reuse after the comparison described below.
The baseline is merge commit `39d80c30df1a19869f7cdb7fc0109eb3111d790b`.
Markdown Quality 3.0.2 follows the existing fresh qualification contract.

**Decision.**
Reuse a successful check only when its original producer is trusted and its complete inputs and acceptance criteria can be shown equivalent.
First test this proposition on source presentation checks.
Evaluate the two native platforms separately.
Continue to pack the merged commit once and exercise those exact tarballs on the supported matrix.
If the measurable saving is too small to justify maintaining a second admission path, retain fresh execution.

## What the three runs established

| Run                                                                                                  | Observation                                                                                                                                                                                                                                                                      | Consequence for the design                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [PR qualification](https://github.com/Hadden-Industries/markdown-quality/actions/runs/43517485933)   | All 19 jobs passed. The PR head was `13a11af`. Its receipt identifies the tested synthetic merge as `13cc433`.                                                                                                                                                                   | The original producing run, job and attempt supply the evidence. The PR head alone does not identify the checkout tested.                                                                                                                              |
| [Main push](https://github.com/Hadden-Industries/markdown-quality/actions/runs/43520871220)          | On `39d80c3`, the Linux and Windows probes took 19 and 33 seconds. The reuse decision took 23 seconds and reported `REUSED` from the PR. Full qualification was skipped. The two artifacts were host observations.                                                               | Main already avoids the expensive repeat. Its summary can help locate the original PR. It cannot grant release admission.                                                                                                                              |
| [Deliberate release](https://github.com/Hadden-Industries/markdown-quality/actions/runs/43520981158) | The release producer packed a clean `39d80c3` tree. The core embeds the source commit. The manifest for all three archives has SHA-256 `5ccc73608c9fd683a883b4dab0e524ae16ce401719104b0432edf9945bb578fb`. The Linux and Windows native jobs took 28 and 79 seconds in parallel. | The large runtime matrix exercises the tarballs recipients will install. The standalone native jobs together used 107 elapsed job-seconds, an upper bound before scheduling and validation overhead. Their removal need not shorten the critical path. |

These timings describe one release attempt.
Measure both elapsed workflow time and summed runner time.
Attribute runner cost by OS if reporting financial savings.
Parallel job durations do not add up to time saved by the owner.

## Scope and source of authority

The [current CI trust contract](../ci-trust.md), [PR reuse design](ci-verification-reuse.md) and [release runbook](../release-operations.md) govern deployed behavior.
The [release convergence plan](2026-11-13-release-ci-convergence-implementation-plan.md) calls for a fresh graph.
This proposal would amend only the admitted source and native obligations when a new reader explicitly selects the new contract.
Existing release records keep their original semantics.

This is consistent with provenance-based verification.
GitHub exposes run artifacts and provider identities, and SLSA identifies subjects, producers and resolved inputs for downstream verification.
Neither establishes that two test environments are equivalent.
The project owns that decision per check.
Use the existing GitHub REST reader, Git object identities, SHA-pinned Actions and artifact digest checks.
Dependency caches may accelerate installs but cannot establish a successful run.
This design introduces no new service, signing key, dependency or licence.
A proposed external attestation service would need its own security, version, rights and operating-cost assessment.
[GitHub workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) and [SLSA build provenance](https://slsa.dev/spec/v1.2/build-provenance).

### Obligations and invalidation

| Obligation                                                                                                                        | Proposed execution                                                                 | Evidence or reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source presentation and static checks within `scripts/verify.js --source`                                                         | First candidate for reuse. Inspect individual commands before admitting the group. | Same source tree and ordered parents, checked-out workflows and actions, check definitions, installed tool graph and effective runtime/configuration. Any member reading generated files, Git identity, host state or an unfrozen input must be split out or rerun. Release version admission and fresh matrix resolution still execute.                                                                                                                                                                   |
| Source unit tests                                                                                                                 | Add only individually demonstrated groups after the first slice.                   | Classify Git-, network-, clock-, platform-, environment- and package-sensitive cases explicitly. A file named “unit” or a green producer job is insufficient evidence that the group ran. Preserve suite discovery and detection of added tests.                                                                                                                                                                                                                                                           |
| Linux and Windows native validation                                                                                               | Candidate per platform, after command-level input tracing.                         | Bind executable, upstream source, rights records, acquisition and staging scripts, Python/Node/npm, architecture, toolchain and image dependencies. Trace `acquire-native.py`, the three Python checks and both JS test files. Fixture archive assertions may qualify; checks over actual release artifacts run fresh. A new image build may satisfy the existing CI platform contract yet invalidate a tool-sensitive native result. Retain fresh execution unless the narrower equivalence is evidenced. |
| Core/native pack, generated manifest/JSON, root and isolated installs, runtime behavior and both performance corpora              | Fresh on the release merge and its exact archives.                                 | Preserve source identity, SHA-256 and SHA-512 SRI, frozen Node matrix, tool versions, archive evidence and pinned corpus inputs. A matching source tree cannot authenticate bytes containing another commit.                                                                                                                                                                                                                                                                                               |
| CodeQL, dependency and recipient audits, distribution SBOM, release rights decision, public registry and immutable archive checks | Fresh under their current contracts.                                               | Time-dependent advisories, exact-source analyses, per-recipient lockfiles and artifact-specific inventories have different subjects or freshness rules. Reuse of native tests does not constitute an independent release rights decision.                                                                                                                                                                                                                                                                  |

**DRY-01.** `scripts/ci-proof.js` owns original PR proof selection, authenticity, complete job inventory, attempt lineage and tree/parent checks.
`scripts/ci-command.js` adapts real event inputs.
`scripts/release-qualification.js` owns release obligations and allowed ways to satisfy them.
The release YAML schedules work and reports observations.
`scripts/verify-publication.js` and `scripts/release-assets.js` consume the same release rules.
Keep the provider-result vocabulary distinct from the release decision.
A GitHub job skipped by a conditional remains skipped.
It can count only if an independently successful decision job proves that specific obligation through an admitted original execution.

## Requirements and proof

| Requirement                                         | Acceptance scenario and independent oracle                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-01. Authenticate the original execution.        | AC-01 / QA-01. Accept one eligible same-repository merge with a successful original PR execution. Verify checkout tree, ordered parents, PR association, repository IDs, workflow identity, artifact bytes and digest, job ID and producing attempt using Git objects and GitHub records. Reject a fork, altered receipt, changed parent, substituted workflow, stale attempt, ambiguous PR or chained reuse claim. |
| REQ-02. Decide per obligation.                      | AC-02 / QA-02. Change a check definition, dependency lock, tool version, runner contract or native acquisition digest. Each affected check executes fresh. Equal inputs for a separately admitted group may still reuse evidence. Missing or unclassified input defaults to fresh.                                                                                                                                  |
| REQ-03. Preserve release identity.                  | AC-03 / QA-03. Construct two commits with the same tree and ordered parents but different SHAs. Reuse a proven source result and reject the PR archive as the release subject. Recompute the expected release archive digest from downloaded bytes. A wrong manifest, wrong archive or missing current-release lane blocks admission.                                                                               |
| REQ-04. Preserve recovery, retention and authority. | AC-04 / QA-04. A missing, expired or unavailable PR record before selection falls back to a real fresh job. A newer attempt, changed digest or vanished artifact after selection cannot produce a successful admission. Prove historical replay from retained, authenticated evidence after the Actions artifact expires. A read-only decision has no stage, tag or publication authority.                          |
| REQ-05. Demonstrate savings.                        | AC-05 / QA-05. Compare fresh and shadow decisions on identical candidates. Record lookup time, runner-seconds avoided, PR overhead, critical path and fallback frequency. Enable a group only when outcomes agree and its net benefit justifies ongoing cost.                                                                                                                                                       |

## Delivery slices

### SLICE-001 — Establish equivalence in shadow mode

The CI maintainer traces each command in `check:source`, the native workflow and the mixed reference producer to its actual inputs and outputs.
Start with one source check whose inputs can be completely enumerated.
Read the real PR, main-push and release records above.
Determine whether current receipts prove the particular check executed with the claimed toolchain.
Missing group-level evidence is an explicit discovery result.
Measure the fresh job step, the cost of extending the PR receipt, and critical-path overlap.

Exercise the read-only path from a genuine release dispatch to a simulated publication admission.
`selectProof` presently admits a real push event with an exact before/after.
A manual dispatch supplies different facts.
Verify its main ref, selected source, provider-recorded ordinary merge and original PR identity through the existing GitHub reader.
Keep push-specific checks at the push entry point.
Never synthesize a push payload or widen a rejected fork to support dispatch.
A scoped main-push observation may locate the PR; the release verifier reauthenticates the original proof.
If that chain cannot be established, choose fresh.

Deliver a shadow summary and the measured eligibility table.
All jobs still execute.
A changed lock and a forged green receipt must both yield ineligible.
Compare the prediction with the actual fresh results.
Owner decision after discovery: continue with the qualifying subset, narrow it, or close the enhancement if the savings are immaterial.
Covers REQ-01, REQ-02 and REQ-05.

### SLICE-002 — Ship the smallest source-check path end to end

The CI maintainer isolates the selected command group at the existing verification entry point so PR and release use one check definition.
The PR producer records the fresh group outcome and subject.
The release verifier compares the original provider records to its expected inputs.
Prefer extending an existing receipt when the current one cannot prove the group.
Keep new PR artifacts bounded and public-safe.
Release resolution still verifies the requested version and resolves the matrix.

Version the release proof and its reader together.
For each eligible obligation record executed or reused, original repo/workflow/run/attempt/job, tested commit/tree, effective input identity, artifact ID/digest and the read-only release decision that validated it.
Fresh obligations bind the release run and attempt.
Retain the proof bytes and provider evidence needed for archival within the existing digest-bound release bundle.
The retained bytes must still support the historical trust model after expiry.
An old receipt that lacks required inputs selects fresh.
Introduce readers before enabling a new producer format.
No historical backfill.

Run the same candidate through forced-fresh and eligible modes.
Both must pack the release SHA, complete all eight archive lanes and reach the same read-only publication admission result.
Remove the successful original job, substitute its digest, or replace a fresh release result with “skipped” and admission must fail or execute fresh before it can pass.
Exercise the retained archive verifier too.
Covers REQ-01 through REQ-04.

### SLICE-003 — Evaluate and enable native checks independently

After SLICE-001, the native maintainer can gather input evidence in parallel with SLICE-002.
Enablement depends on the versioned release verifier.
Test Windows and Linux independently.
For each platform bind the original executable and source digests to verified acquisition records and bind the actual host/toolchain of the native job.
A runtime-matrix host receipt from a different job cannot identify the native job's environment.
Keep unpinned external inputs and release-byte checks fresh.
Avoid adding an entire native evidence pipeline to save a short job.

Prove that a changed Windows image/toolchain invalidates Windows reuse, a changed shared native source invalidates both platforms, and an unchanged eligible Linux result remains attributable to its original attempt.
Compare each prediction with a fresh native run.
If the existing evidence cannot establish equivalence economically, leave that platform fresh and deliver the source-only improvement.
Covers REQ-02, REQ-04 and REQ-05.

### SLICE-004 — Roll out, retain and observe

The release maintainer first exercises shadow and forced-fresh paths on a later release candidate using read-only admission.
Compare its resulting obligation inventory, archive subjects and adverse outcomes with the existing full path.
Include rerun after partial execution, expired PR artifacts, repository API errors and restoration of a retained release record.
A transient lookup may fall back to fresh within existing time budgets.
Loss of the release's own evidence leaves admission blocked.
Concurrent runs must select and finish against their own attempt and digests.

Expose decisions and fallback reasons in the existing Actions summary and release evidence.
Distinguish original execution time from time of verification.
A fallback storm, unexpected accepted negative case, discrepancy in shadow results, changed consumer schema or loss of retained proof triggers forced-fresh for subsequent candidates.
Preserve already accepted records under their original contract.
If a candidate changes mid-operation, restart admission under a new frozen decision.
Existing publication recovery governs any external effects already taken.

Update the release runbook, CI trust guide and workflow contract alongside activation.
Retire shadow-only instrumentation after the owner can reproduce the cost and correctness decision from retained summaries.
Keep an explicit full-fresh route.
Covers REQ-03 through REQ-05.

## Verification and release ownership

At implementation start freeze the integration head, record the R2 baseline and capture the workflow, policy and actual tool versions.
The CI maintainer owns proof collection and scheduling; the release maintainer owns admission, retention and rollback; the native maintainer determines which platform inputs are material.
The release owner accepts the measured trade-off and rollout scope.
These roles can be held by existing maintainers.

Use the maintained focused, affected and full profiles, plus `npm run check:ci` for workflow structure.
Extend `test/ci-proof.test.js` for original execution and equivalence, `test/workflows.test.js` for scheduling, and `test/publication.test.js` and the release archive tests for admission and replay.
Drive the normal release verifier with captured or isolated GitHub API responses.
Keep Git object construction, hashing and receipt parsing real.
A successful helper call is insufficient if the publication or archive reader still rejects the valid form or admits an invalid one.
The required hosted comparison is read-only and does not require a live npm stage.

Revisit the design if a supported provider or existing receipt supplies equivalent per-obligation verification more cheaply, if runner provenance becomes unobservable, if archive identity changes, or if measured benefit disappears under normal parallelism.
Unresolved coverage stays on the fresh path.
This plan authorizes neither implementation nor a change to the qualification decision for 3.0.2.
