# Reuse full PR package qualification on main

Accepted by the owner ("I approve"), 10 October 2026.
Baseline: `47febbe1b6f3282814e77db7ea13eac72b4928ed`, matching local and fetched `origin/main`.
Originating request: reuse successful PR testing when the tested integration lands on the default branch, following OwlAPI's conservative approach.
This document records the accepted requirement baseline; it does not establish completed verification.

## Recommended boundary

Add authenticated PR evidence reuse to `.github/workflows/check.yml`.
Every PR still executes the entire package matrix and `npm run check:full` in each lane.
A single ordinary two-parent merge to `main` may reuse the complete successful PR qualification only after independently establishing the same tested tree, ordered parents, workflow and resolved runtime matrix.
Missing, ambiguous, stale or invalid evidence selects full qualification.
The main result explicitly reports `FULL` or `REUSED` and links the original run and attempt.

Keep transported-candidate qualification fresh in this first change.
`scripts/pack.js` records the source commit and tree in its release manifest.
`scripts/verify-publication.js` requires a successful main-push candidate run, its exact source commit, complete job inventory and original artifacts.
`scripts/release-assets.js` also binds release assets to their source.
Tree equivalence alone cannot replace those commit-bound contracts.
Reusing PR candidate artifacts would require a separately accepted design for publication and release lineage, or an explicit fresh-candidate acquisition route before publication.
Do not silently skip the candidate workflow or relabel a PR archive as built from main.

Native builds, registry checks, publication, reusable consumer qualification, branch rules and external consumers retain their current behavior.
No dependency upgrade, new CI service, package caching project, workflow dispatch, release or publication is part of this proposal.

## Risk route

Risk class: R2, inferred from changing the cross-system CI evidence trust boundary.

Decision owner: repository owner, through acceptance of this exact requirement baseline.

Reasoning: an incorrect reuse decision could report qualification success without complete applicable testing.
The existing workflows execute full tests on both PR and main; the proposal changes that assurance decision.

Potential blast radius: package CI conclusions and users relying on those conclusions.
The candidate/publication boundary stays outside reuse.

Reversibility: restore unconditional package execution through a forward workflow change; retain historical receipts as evidence.

Principal unknowns: achievable reuse frequency under dynamic Node releases and hosted runner image changes; live required-check configuration; first hosted proof of receipt production and consumption.
These affect availability of the optimization, never permission to grant success.

Required artifacts: this accepted requirement baseline, compact versioned receipts, exact route record and verification/review evidence.

Required specialist lenses: CI graph and GitHub artifact trust; security review of receipt admission and untrusted data handling.
No delegation, provider invocation or security scan is authorized merely by naming these obligations.

Required verification: focused adversarial admission tests, actual workflow governance tests and syntax validation, affected regressions, configured full profile and final independent assurance of the frozen candidate.
Hosted PR receipt and ordinary-main reuse observations establish deployment behavior separately from local tests.

Required human approvals: accept this exact R2 baseline before implementation; subsequent commit, push, merge or review-provider effects require their applicable existing authority.

Maximum sensible autonomy: complete research and draft planning now; after baseline acceptance, implement and verify the bounded change without repeated phase prompts.

Next lifecycle step: capture the accepted requirement snapshot and implement the scoped execution using current worktree applicability.

## Requirements and acceptance

| Requirement                            | Acceptance and quality scenario                                                                                                                                                      | Decision                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| REQ-001 Preserve full PR testing       | AC-001 / QA-001: every PR executes all expected package lanes; failed, skipped, cancelled or missing lanes prevent qualification success                                             | DEC-001: no PR test selection or reuse                                                                  |
| REQ-002 Prove integration equivalence  | AC-002 / QA-002: only a same-repository PR merged onto the push's previous main tip, with matching ordered parents, tree, workflow and runtime matrix, is reusable                   | DEC-002: ordinary single merge only; direct, squash, rebase, forced and multi-commit pushes run full CI |
| REQ-003 Authenticate complete evidence | AC-003 / QA-003: GitHub independently confirms run/workflow/repository, latest attempt, exact complete successful job inventory and retained receipt artifact ID/digest              | DEC-003: receipt JSON alone or a green run summary never grants success                                 |
| REQ-004 Fail safely to full testing    | AC-004 / QA-004: API errors, bounded-inventory overflow, missing/expired/deleted evidence, transport/digest/schema failures and changed runtime or host inputs select full execution | DEC-004: only optimization transport may tolerate failure; test failures remain failures                |
| REQ-005 Explain the result             | AC-005 / QA-005: main emits FULL or REUSED, fallback reason, original run/attempt and immutable evidence identity                                                                    | DEC-005: reused tests are never reported as fresh execution                                             |
| REQ-006 Preserve release evidence      | AC-006 / QA-006: candidate packing, consumer/performance qualification and publication admission still demand their existing fresh source-bound evidence                             | DEC-006: no change to candidate or publication workflows/contracts in this scope                        |

Resolve the current Node minimum/latest matrix on main before considering reuse and compare it with the exact PR matrix.
A newly released selected Node version requires fresh qualification.
Record concrete lane runtimes and hosted image identities; any unproved relevant environment equivalence requires full qualification.
Use cheap lane identity probes if necessary to compare hosted images without installing dependencies or rerunning tests.
Recheck mutable source run/attempt and artifact state after downloading proof to detect rerun or deletion races.
Require retained, unexpired evidence and coherent timestamps; do not invent a blanket age cutoff.
Do not chain reused receipts: the original source must be a fully executed PR qualification.

## Native capability and reuse selection

Source comparison on 10 October 2026 used OwlAPI remote main `6825c56381554d4ae24f0618ad64c5ce9ae66474`.
Its `scripts/ci-verification.mjs` blob is `4ddfdae282b3820737d54ac34b49530c23717db2` and its current receipt format is schema 5.
The local OwlAPI checkout was ahead of that remote baseline and is not treated as the published source identity.
Reuse the demonstrated admission policy, not OwlAPI's Java, browser, installed-OWL or release-specific job registry and schema.
OwlAPI's AGPLv3 license text was inspected; any incorporated code must retain its applicable notices and attribution in this AGPL-3.0-only repository.
This plan incorporates no donor implementation bytes.

Reuse Node's built-in Git subprocess, JSON and bounded HTTP functionality, GitHub's read-only run/job/commit/artifact APIs, and this repository's pinned official upload/download actions.
Use the existing runtime-matrix implementation and policy rather than maintaining another Node selector.
GitHub's ordinary dependency cache is not authoritative test evidence.
The residual custom gap is this repository's integration-equivalence policy, receipt schema and complete package-job inventory.
Do not copy OwlAPI's larger qualification framework or add third-party dependencies solely for this boundary.
Implementation must confirm actual rights for any incorporated source and current applicable provider capabilities before adoption.

Primary documentation checked on 10 October 2026:

- [PR merge checkout semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).
- [GitHub artifact identities and acquisition](https://docs.github.com/en/rest/actions/artifacts).
- [Workflow jobs and attempt inventory](https://docs.github.com/en/rest/actions/workflow-jobs).

## Slices and proof

| Slice                                     | Traceability                                                     | Predicted seams                                                                    | Falsifiable proof and recovery                                                                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 Retain full successful PR proof | REQ-001/003/005, AC-001/003/005, QA-001/003/005, DEC-001/003/005 | Package workflow aggregate, receipt writer, runtime matrix, lane identity metadata | Refuse missing/skipped/failed lanes and wrong event/checkout identity; receipt upload failure leaves tests authoritative and later main selects full fallback                                                                             |
| SLICE-002 Admit proof on main             | REQ-002/003/004, AC-002/003/004, QA-002/003/004, DEC-002/003/004 | Dependency-free selector/verifier, bounded GitHub reader, exact artifact download  | Real Git fixtures and provider-shaped API fixtures reject wrong parents/base/tree/workflow/repository/attempt/matrix/image, malformed or incomplete inventories, rerun races, invalid timing, expired artifacts and API/download failures |
| SLICE-003 Govern and explain both paths   | All REQ/AC/QA/DEC IDs                                            | Job dependencies/conditions, unconditional final aggregate, CI trust documentation | Workflow mutation tests reject PR bypass, broadened permissions, missing dependencies or false success from skipped/failed tests; syntax check and full profile; verify candidate/publication contracts unchanged                         |

Execute sequentially because all slices share one evidence schema and workflow graph.
The task owns integration and test oracles; mock only the external GitHub service boundary, and exercise real Git parent/tree/workflow extraction.
Use focused tests during implementation; format, inspect and freeze the final candidate before the configured full profile and final assurance.
Discover the current independent reviewer capability before claiming review coverage; unavailable mandatory assurance remains a named blocker.
No new persistent product data or backfill is needed; historical runs without the new receipt fall back to full qualification.

## Rollout, observation and replanning

The owner subsequently requested updating every `actions/*` pin across repository workflows to the latest release while retaining full commit SHAs.
Release/tag API readback on 10 October 2026 confirms checkout v7.0.1, setup-node v7.1.0, setup-python v7.0.0 and upload-artifact v7.0.2 already match; download-artifact advances from v8.0.1 to v8.0.2 (`9000827ccba6bdab643e8b6fd33ac0654aef8333`) in all consuming workflows.
This maintenance extends the changed workflow paths without extending evidence reuse into candidate or publication jobs.

Optional probe/strategy failures select fresh package execution even when dependencies were skipped.
Lost execution metadata only prevents receipt creation; successful tests remain authoritative.
Intermediate artifacts include the current run attempt to prevent immutable-name conflicts and stale metadata acquisition during reruns.

The introducing PR runs full package qualification and emits the first receipt.
Its eligible ordinary merge can demonstrate reuse, subject to unchanged external runtime/environment inputs.
The hosted observer is the repository owner; inspect the source PR run and main strategy/aggregate summary separately.
A source change, failed test, absent receipt or unverifiable host input must never be hidden to obtain an optimization hit.
Abort reuse on any uncertainty and restore unconditional execution if admission proves unreliable.
Keep compact receipts in GitHub artifacts and task verification evidence in the configured external HISEW store.
Replan if the owner wants candidate/performance reuse, fork evidence reuse, squash/rebase/fast-forward support, merge queues, broader push ranges, branch-dependent behavior or publication consuming PR artifacts.
Success is fewer repeated package test executions with unchanged qualification assurance, measured from actual FULL/REUSED decisions; no runtime or cost saving is claimed before observation.
