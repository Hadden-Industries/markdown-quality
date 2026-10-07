# Markdown Quality performance implementation plan

Date: 2026-10-07, Europe/Bucharest.
Revision: 1, expanding the existing temporary performance plan with the owner's supplied research response.
Completion annotation: 2026-10-07; accepted requirements and revision identity unchanged.
Planning and acceptance owner: Maksym Shostak.
Status: implementation complete by owner decision, including the opt-in concurrency source follow-up; 1.0.3 delivery complete and later source publication held.
The original plan body is retained below the current disposition.

## Current completion and disposition

The accepted primary performance implementation is delivered in the coherent immutable `1.0.3` release, source `92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0`.
The [release record](../releases/1.0.3.json) and [implementation status](../implementation-status.md) bind shipped archives, qualification and the completed consumer rollout.
The earlier implementation handoff at source `165ed1c8ed97b20934917bce2103dbc2ec556409` retains its own transported-candidate identity; it is not relabelled as the final released source.
The owner considers implementation complete notwithstanding optional deferred enhancements, now tracked through [the main plan's issue lineage](implementation-plan.md#deferred-enhancement-lineage).
The separately authorized opt-in `concurrency` follow-up is complete on remote `main` at signed source [603a2b3](https://github.com/Hadden-Industries/markdown-quality/commit/603a2b34268a6447e01e8dce6678ffca92ff3b81).
Its [package](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37603471445), [transported candidate](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37603471451) and [CodeQL](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37603471096) checks all passed; it remains unreleased under the existing hold.
No parallel-count performance or capacity acceptance is inferred from that correctness/delivery evidence.

| Slice          | Final disposition                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-SLICE-001 | Complete: frozen current-policy baseline, actual worker/native profiling and full-result/formatted-byte oracles retained.                                                                                                                                                                                                                                                             |
| PERF-SLICE-002 | Delivered: exact request-local parse/layout reuse, retaining independent diagnostics and fresh filesystem observations.                                                                                                                                                                                                                                                               |
| PERF-SLICE-003 | Delivered: bounded whole-document native checks with complete attribution, owned policy and fail-closed isolation/protocol/resource checks.                                                                                                                                                                                                                                           |
| PERF-SLICE-004 | Delivered: eligible independent list/item and continuation rechecks use the qualified batching adapter; the narrow Snapper exception remains qualified.                                                                                                                                                                                                                               |
| PERF-SLICE-005 | Delivered: check-first formatting for an unchanged guarded layout and exact native-stable snapshot; changing or unproven inputs retain the guarded fallback.                                                                                                                                                                                                                          |
| PERF-SLICE-006 | Deferred enhancement: literal-layout marker/allocation work is tracked in [#4](https://github.com/Hadden-Industries/markdown-quality/issues/4); existing preservation guards remain.                                                                                                                                                                                                  |
| PERF-SLICE-007 | Original 1.0.3 remains serial. The separately owner-accepted CLI/library opt-in concurrency follow-up is complete in current source; default remains 1 and publication is held.                                                                                                                                                                                                       |
| PERF-SLICE-008 | Deferred enhancements: semantic comparison [#5](https://github.com/Hadden-Industries/markdown-quality/issues/5), residual reads [#6](https://github.com/Hadden-Industries/markdown-quality/issues/6), bookkeeping [#7](https://github.com/Hadden-Industries/markdown-quality/issues/7) and selection scheduling [#8](https://github.com/Hadden-Industries/markdown-quality/issues/8). |
| PERF-SLICE-009 | Complete: independent assurance, full source and transported qualification, immutable GitHub/npm `latest` delivery, followed by separately governed consumer integrations.                                                                                                                                                                                                            |

Conditional slices are dispositioned, not incomplete prerequisites for this release.
Retained paired experiments measured separate memo/batch and check-first improvements; their percentages are not added across different host conditions or represented as an SLA.
Both-platform six-run corpus windows met the accepted 30-second and platform-specific 512 MiB producer budgets; consumer-specific later budgets retain their own authority.
Further asynchronous native execution is tracked in [#9](https://github.com/Hadden-Industries/markdown-quality/issues/9), and supported ESLint caching in [#10](https://github.com/Hadden-Industries/markdown-quality/issues/10).
Compilation and an alternative runtime remain lower-priority research options in [#11](https://github.com/Hadden-Industries/markdown-quality/issues/11), not accepted implementation follow-ups.
Node-matrix, community/dogfooding and opt-in concurrency source changes made after `1.0.3` remain unreleased under the owner's publication hold.

The sections below preserve the original accepted plan, research inputs and proof obligations.
Their earlier baseline, staged-file preservation and paused-delivery statements describe that execution stage; they do not reopen superseded proposals or authorize another release.

## 1. Purpose, baseline, and authority

### Owner-accepted opt-in concurrency follow-up

On 2026-10-07, the owner requested implementation and ordinary main delivery of `concurrency`, retaining serial execution as default and excluding performance-gain testing or worker-count range qualification.
This supersedes the earlier research-only restriction in PERF-DEC-007 and PERF-SLICE-007 for this specific unreleased follow-up; it does not retroactively change the serial `1.0.3` release or its measurements.
CLI `--concurrency N` and library `runQuality({ concurrency: N })` accept positive integer counts without a maximum or automatic resource selection.
There is no new profile, declarative policy field, dependency, runtime, native rebuild or package publication.
Existing bounded work groups determine how many requested workers have available work; the parameter is not capped by a numeric admission range.
Reuse persistent preparation workers, retain ordered outcomes and the batch coordinator, stop queued work after the earliest known preparation failure, and terminate every worker before staging cleanup or guarded serial writes.
Correctness and failure/cleanup verification remain required, with real serial/parallel findings and byte/convergence parity plus injected scheduling/cancellation boundaries.
Consumers own performance and capacity assessment; no parallel-count timing or memory acceptance is inferred from the original 30-second/512 MiB serial qualification.
The existing hold on a new release remains in force, so this setting requires a future authorized version before npm consumers can use it.

### Retained original performance purpose

Reduce the work needed for a complete Markdown check while preserving its formatting, prose, GFM, whitespace, local-link, filesystem, and failure contracts.
Start with measured repeated work and supported native batching.
This is the durable elaboration of the temporary plan in the 6 October performance investigation, `performance-diagnosis-20261006/findings.md`, retained in the external task-evidence store.
It carries forward the earlier discussion: exact per-document reuse and native document/list batching are the primary work; bounded workers follow only after reducing repeated work, and compilation stays deferred.
The temporary record now points to this document for implementation detail while preserving the original measurements and recommendations as historical evidence.
The [main implementation plan](implementation-plan.md), its REQ/AC-001 to 016 and QA-001 to 013, and the [software-selection record](software-selection.md) remain governing inputs.
This document extends their performance implementation detail without replacing accepted requirements, approving its own execution baseline, or resuming paused registry/pilot delivery.
The owner requested this planning revision after receiving the research response; implementation, baseline amendments, publication, and exact consumer acceptance remain separate effects.
Preserve the six independently staged release-operation files and every unrelated checkout edit.

The response analyzed package source at `74b63165fec9974d407c30c6573eaca06d07863b`, whose runtime matched published 1.0.2 source `183fd4ee75cdf5a7f053e00c1032e5d7891d075d`.
Current source includes the separately implemented whitespace change at [df9f6650011fda4f66c1ce15ef3c118c2f34208f](https://github.com/Hadden-Industries/markdown-quality/commit/df9f6650011fda4f66c1ce15ef3c118c2f34208f).
That change overwrites `authored-gfm@1`: trailing ASCII spaces/tabs and space-based hard breaks are findings outside fenced and indented code bodies.
Formatting makes hard breaks explicit and refuses changes to meaningful inline-code or raw-HTML content; unresolved findings prevent batch writes.
The response's additional inline-code/HTML exemptions are superseded by that owner-selected contract, described in the [consumer guide](../consumer-guide.md).
Do not add another profile, reintroduce those exemptions, or treat already shipped byte-identity admission as a new optimization.

Freeze the actual runtime source, configuration, graph, native hashes, and corpus manifests before performance implementation.
Collect a fresh baseline on that source; retain the earlier 1.0.2 observations only as historical diagnosis.
Do not compare an optimized strict-policy candidate against an older policy and attribute the whole difference to performance.

## 2. Research inputs and what they establish

The initial investigation and the owner's subsequent batching/compilation questions established the temporary improvement order before the research handoff.
The response extends that order with document-scoped memo design, independent list batching, conditional check-first formatting/layout work, and explicit benchmark/protocol proof.
It does not replace the earlier plan with a compilation project or turn observed stage opportunities into achieved savings.

The owner supplied `markdown-quality-performance-research-brief-2026-10-06-response.md`, titled _Performance Research Report: markdown-quality_.
Its exact supplied bytes have SHA-256 `58fe1ecac7461292dd30b5bead889e8cc6fa658ab53ee11657b17e2dd37169e2`.
The original compact handoff is `markdown-quality-performance-research-brief-2026-10-06.zip`, with `research-brief.md`, `evidence/current/findings.md`, `baseline.json`, `profile-summary.json`, `repeated-work/summary.json`, `native-control.json`, and `batch-check-control.json`.
Those native artifacts, source manifests, full result JSON, and preservation records remain retained in the existing external task-evidence store.
Keep the original response beside them; its generated citation tokens are not independently resolvable references.
The authoritative references below replace those tokens for implementation decisions.
Private source excerpts and corpus overlays remain external evidence; this plan does not publish them.

The researcher reported Node 22 in their execution environment and did not produce qualifying Node 24.21.0 benchmark results or a qualified optimized implementation.
Their numeric performance claims use the retained Windows evidence or engineering estimates.
Planning reconciliation inspected current package sources and the exact upstream Snapper source and checked maintained API documentation on 6 October.
This does not establish new performance measurements or independent execution of a prototype.

| Historical observation, Windows x64 / Node 24.21.0           | OwlAPI, 63 selected documents | WebVOWL, 67 selected documents | Interpretation                                        |
| ------------------------------------------------------------ | ----------------------------: | -----------------------------: | ----------------------------------------------------- |
| Uninstrumented whole check, one sample                       |                      17.302 s |                       13.438 s | Exploratory baseline, not hosted p95                  |
| Profiled whole check, one sample                             |                      17.203 s |                       13.662 s | Instrumentation perturbs execution                    |
| Layout/literal protection, excluding explicitly timed parses |                       5.752 s |                        4.140 s | Largest measured owned pipeline stage                 |
| Explicit GFM parses                                          |                       4.285 s |                        3.129 s | Excludes ESLint/Prettier internal parses              |
| All native calls                                             |                       4.835 s |                        4.355 s | Launch, initialization, computation, and I/O combined |
| ESLint                                                       |                       1.495 s |                        1.105 s | One persistent linter already exists                  |
| Observed duplicate layout plus link parse work               |                       5.009 s |                        3.223 s | Reusable-work opportunity, not achieved saving        |
| Separate whole-document native checks                        |                       1.889 s |                        1.731 s | Native-only control                                   |
| One multiple-file native check                               |                       0.416 s |                        0.173 s | Same non-advisory rule/line findings in that control  |

Historical layout call counts were 126/134, explicit parse counts 189/201, and native call counts 189/193.
The batch control covered neither complete package parity nor independent list rechecks, returned 62/66 reports for 63/67 inputs, and included 5,577/3,707 raw diagnostics before advisory filtering.
Batching can amortize initialization and use Snapper's internal parallel file path; it is not evidence that OS launch alone dominates.
The response's 15–25% memo estimate, 8–12% document-batch estimate, 5–8% list-batch estimate, and 1.5–1.6× combined opportunity are hypotheses or arithmetic ceilings.
Do not sum them into a forecast, require each small slice to achieve them, or substitute them for measurements.
Historical alpha.3 incumbent comparisons used different policy/corpus snapshots; they do not isolate packaging overhead or quantify current-source performance.

## 3. Requirements and retained invariants

| Performance requirement                                  | Acceptance criterion                                                                                                                                                                                              | Main-plan obligations                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PERF-REQ-001: Remove exact duplicate owned work          | PERF-AC-001: Observable results and golden formatted bytes match the current-source baseline; counters demonstrate avoided parses/layout calls, and measured whole-operation benefit exceeds observed uncertainty | REQ/AC-003, 006, 007, 010; QA-002, 009, 010          |
| PERF-REQ-002: Coarsen native checks safely               | PERF-AC-002: Each document/snippet remains independently attributed; malformed, missing-coverage, duplicate, unknown, failed, or exceeded-bound cases fail closed with no document writes                         | REQ/AC-004, 005, 008, 010; QA-001, 003, 004, 007     |
| PERF-REQ-003: Preserve resource and trust boundaries     | PERF-AC-003: Existing size/output/watchdog/heap bounds remain effective; both supported platforms meet the accepted platform-specific memory and timing budgets                                                   | REQ/AC-004, 008, 011; QA-004, 005, 009               |
| PERF-REQ-004: Make improvement and delivery attributable | PERF-AC-004: Retain paired observations, exact source/corpus/tool identities, independent review, frozen archive qualification, and recoverable consumer adoption                                                 | REQ/AC-001, 012, 014 to 016; QA-005, 008, 010 to 013 |

Keep complete selected scope, actual physical local-link existence/containment checks, deterministic path/diagnostic order, JSON schema and exit semantics, empty-selection termination, independent ESLint and prose verification, semantic/literal preservation, and convergence.
Reuse parsed syntax, never filesystem-validity results across requests.
Check remains free of checkout mutation, installation, network access, consumer configuration execution, persistent caches, and runtime reports.
The native-batching proposal adds private ephemeral staging outside the checkout; PERF-DEC-002 requires an explicit contract disposition before that behavior ships.
Formatting still validates every candidate before any replacement and preserves concurrent-preimage and truthful partial-outcome behavior.

Retain the 2 MiB per-document and 32 MiB aggregate input/output limits, 10,000-document and 100,000-entry bounds, existing selection/diagnostic bounds, 15-second native deadline, 8 MiB native output bound, 30-second per-document analysis watchdog, 128 MiB worker old-generation limit, and 4 MiB worker stack limit.
The per-document watchdog and full-corpus qualification ceiling are distinct despite both being 30 seconds.
Do not silently replace document deadlines with a longer batch deadline or multiply heap limits by an automatically sized pool.
AGPL-3.0-only, original license bytes, notices, native identities, and corresponding-source obligations remain unchanged.

## 4. Recommendation dispositions and decisions

| Decision     | Research recommendation                                                                  | Planning disposition and decisive evidence                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-DEC-001 | Request-local owned parse/layout memoization                                             | First product slice. Share exact-input mdast and pure layout results across current whitespace, literal, semantic, and link consumers; retain supported Prettier/ESLint APIs                              |
| PERF-DEC-002 | Bounded multiple-file native checking                                                    | Second product slice, conditional on protocol/isolation/resource proof and acceptance of ephemeral external staging; never pass consumer-controlled paths/configuration directly                          |
| PERF-DEC-003 | Batch eligible list-item rechecks                                                        | Extend the same qualified adapter; one complete item plus continuations per staged document, preserving the existing narrow exception and upgrade requalification                                         |
| PERF-DEC-004 | Check-first native fast path                                                             | Conditional after batch parity. Measure the eligible clean fraction; only reuse checks bound to the exact snapshot, tool, and options, with exact fallback and unchanged semantic/convergence obligations |
| PERF-DEC-005 | Suppress discarded `long` advisories                                                     | Controlled batch experiment before deciding scalable group sizes. Adopt only after exact retained-diagnostic and formatter-byte parity, including threshold/Unicode boundary fixtures                     |
| PERF-DEC-006 | Layout marker/allocation improvements                                                    | Profile layout components first; one-pass PUA detection and allocation-free marker counting are bounded follow-ups with collision/preservation proof                                                      |
| PERF-DEC-007 | Two-worker JavaScript pool                                                               | Deferred until deduplication/batching are measured. A research-only two-worker candidate must preserve deadline, ordering, cleanup, and whole-process-tree memory; reject if headroom is inadequate       |
| PERF-DEC-008 | Smaller buffers, direct semantic comparison, cursor bookkeeping, selection concurrency   | Separate evidence-led follow-ups. Preserve read races, exact semantic normalization, partial results, and selection scope; no automatic bundling with the first release                                   |
| PERF-DEC-009 | Async subprocess conversion, ESLint file-cache redesign, compilation/runtime replacement | Defer. Async alone offers no demonstrated gain in the current serial worker; retain `lintText` semantics. Compilation gets only a later isolated startup experiment if remaining cost justifies it        |

No new package/profile/layout, alternative runtime, dependency upgrade, native rebuild, selective checking, hardware purchase, or fleet migration is part of the initial performance implementation.
Compilation is deliberately last; do not rewrite the whole stack to optimize an unmeasured startup component.
The response's engineering-day estimates are omitted: execution follows dependencies and proof, not staffing or calendar assumptions.

## 5. Vertical slices and proof

Module names below identify likely seams, not complete proposed code or guaranteed final file sets.
The implementation agent owns integration and evidence; Maksym Shostak owns changed contract/scope and consumer acceptance decisions.
Consolidate each demonstrable candidate before review; do not run parallel writers across coupled formatting/worker/native seams.

### PERF-SLICE-001: Reproduce the current-policy baseline

Outcome: one reproducible complete check distinguishes current policy cost, repeated work, native batching opportunity, and memory constraints.
Use the original frozen complete OwlAPI/WebVOWL trees, base commits `073beefb7805130bc0452472d1a9c801471fbaf1` and `b0fe00404eedf12a59084871863500869474bd3a`, and their retained nine/two-file overlays and hash maps.
Keep real local targets and traversal inputs; a Markdown-only corpus is insufficient.
Freeze current runtime identities independently of unrelated staged release files.
If the strict whitespace policy changes the old clean outcome, retain its exact diagnostics and classify that workload honestly; create a separately named, manifest-bound clean variant when needed, without editing consumers or concealing the policy delta.
Measure parse/layout/native counts, layout components, native raw/retained output, clean/dirty fraction, and process-tree memory on existing supported runtimes.
Use existing external benchmark recipes; they currently permit only one to six runs per invocation, so larger paired experiments need separately retained blocks or a bounded harness extension, not an unsupported `--runs 30` claim.
Proof: reproducible results and source/corpus preimages; instrumented and uninstrumented public results match; all samples and setup failures are retained.
Exit: usable current-policy baseline and explicit unresolved measurements; no optimized product or release claim.
First commit point: after this baseline and focused document checks, sign the plan documents while preserving the independently staged release work; retain benchmark observations externally.

### PERF-SLICE-002: Reuse owned results within one document analysis

Outcome: a full check and guarded format produce identical public results/bytes while computing the same owned parse/layout fewer times.
Likely seams: `src/analysis.js`, `src/literal-layout.js`, `src/whitespace.js`, `src/formatting.js`, and `src/document-worker.js`; a package-private document memo may be added.
Create and discard the memo within one document request, including exceptional completion.
Key syntax by the exact immutable source string and layout by exact source plus all effective options, including parser, line endings, tab width, wrapping, embedded formatting, and plugin identity/order.
Do not normalize cache keys, omit options from a hand-written partial key, mutate shared trees, reuse Prettier/ESLint private ASTs, or retain requests globally.
Route whitespace/code-row detection, literal protection, semantic comparison, and link syntax through the owned memo where inputs actually match; retain the clean-input whitespace fast path.
Bound retained variants/input bytes and prove memory behavior on large/changed inputs; bypass memoization safely when its bound is reached rather than weakening analysis.
Fresh physical target checks and independent native checks still run.
Proof: exact public parity and literal/no-write fixtures, deliberately different text/options, changed/failed requests, no cross-request stale reuse, lower actual call counts, and paired whole-check/memory results.
Dependencies: PERF-SLICE-001.
Release implication: independently demonstrable/reversible without a consumer configuration change; preserve versioned release admission.

### PERF-SLICE-003: Batch independent whole-document native checks

Outcome: the full package checks a bounded group using fewer native processes while preserving exact document diagnostics and fail-closed behavior.
Likely seams: `src/native-tool.js`, `src/prose-diagnostics.js`, `src/document-analysis.js`, `src/document-worker.js`, and `src/quality.js`; a private staging adapter may be added.
Keep native formatting per document initially; batch the independent prose check of the exact final formatter result, which is the current input even in check mode.
Lint, links, and whitespace continue to use original text for check and proposed text for format.
Prepare bounded groups with per-document memos discarded promptly; do not retain every corpus AST to enable batching.
Publish completed group results through the existing logical order and diagnostic budgets; qualify mixed content/operational failures and partial-result reporting rather than letting worker completion order choose the error.

Initial experiment ceilings are 32 staged documents and 4 MiB combined staged UTF-8 per group, with the existing 15-second native deadline and 8 MiB output bound.
These are prototype parameters, not approved product limits or proof that all legal input groups fit.
Choose smaller groups or preventive singleton handling from demonstrated input/output/deadline bounds; preserve original per-document watchdog accounting, including shared work.
If a previously valid input fails solely because of grouping, stop and revise the grouping design.
Do not raise limits or repeatedly split/retry a timed-out or malformed invocation until it appears successful.

Create private operation-owned staging outside the checkout, with exclusive files, short package-selected names, exact snapshot bytes, and a bijection to logical consumer paths.
Never concatenate documents or expose arbitrary native path/configuration arguments.
Retain shell-disabled execution, fixed executable/configuration/cwd, controlled environment, color disabled, and bounded stdout/stderr handling.
Account for Windows access controls, path casing/serialization, staged file identity, and bounded cleanup on success, failure, cancellation, worker termination, and interruption; errors must not disclose staged absolute paths or document excerpts.
Temporary Markdown can contain private data: keep access private, remove only owned resources, and report incomplete cleanup without claiming secure erasure or silently converting it to success.

The pinned [Snapper file-check implementation](https://github.com/TurtleTech-ehf/snapper/blob/407c2beb04607f6ccb421e6f6418dcc00e4c1e94/src/main.rs) filters ignored inputs, processes eligible files before structured output, and omits wholly clean records.
It also consults EditorConfig for width when CLI/config width is zero; `--max-width 0` alone does not isolate the new file path.
Prove no staged input is skipped and ancestor/consumer EditorConfig cannot affect it; qualify a package-owned staging configuration boundary without changing consumer files.
Validate complete exit/JSON/field/path/line attribution, duplicates, unexpected records, and aggregate consistency before admission.
Omission is clean only after pinned-source/binary and executable fixture proof establish complete eligible-input processing; otherwise use the existing single-document path for unresolved coverage or retain a blocker.
Never infer clean from an arbitrary missing report; an upstream all-input reporting mode is a possible later proposal, not a dependency silently assumed available.

Measure whether `long_threshold = 2097153` can suppress already discarded advisories without changing retained findings, formatted bytes, or exit handling.
This is a candidate package-owned setting only; if parity fails, retain the existing setting and design groups against actual worst-case raw output.
Proof: real supported-platform single/batch parity, configuration sentinels, empty/all-clean/mixed groups, missing/unreadable/skipped inputs, unknown/duplicate/truncated reports, crashes/timeouts/output overflow, staging races/interruption, and zero checkout/network mutation.
Dependencies: PERF-SLICE-001/002 and PERF-DEC-002 contract disposition; advisory experiment is part of selecting safe bounds.
Release implication: new trust boundary requires positive independent correctness/security review before delivery.

### PERF-SLICE-004: Batch only eligible independent list rechecks

Outcome: quoted-number and adjacent-list false findings are suppressed under exactly the current qualified exception, with fewer launches.
Each eligible complete item and its continuation prose becomes a separate staged document; preserve quote/container/ordered-list boundaries and original finding attribution.
Unknown diagnostics and failed rechecks remain failures; real defects in continuations must still prevent suppression.
Cap aggregate snippets/bytes/output and preserve document/operation budgets; reuse the qualified adapter rather than introduce a second native protocol.
Proof: exact current/batched findings on ordered/unordered/quoted/nested/adjacent items, duplicates, continuations with real defects, boundary-ending code/prose, and failed rechecks.
Dependencies: PERF-SLICE-003.
Release implication: requalify the approved Snapper 0.11.9 exception; no broader suppression or native upgrade.

### PERF-SLICE-005: Qualify a check-first native fast path

Outcome: a native-stable snapshot can avoid a separate native format call without losing independent checking or fixed-point assurance.
Measure the eligible post-layout `would_reformat` fraction first; the historical approximately 1.55-second native-format stage is an upper-bound opportunity, not a demonstrated saving.
Only use an admitted check bound to exact staged text, tool/configuration and complete processing.
Apply current normalization/layout semantics and preserve comparison against the original text; changes introduced before native checking still require semantic and convergence proof.
Retain exact current formatting fallback for changing or unproven inputs; unsafe-whitespace early returns remain findings with no destructive repair.
Do not reuse a check of an earlier intermediate after bytes change or skip genuine native diagnostics because layout is clean.
Proof: current/fast-path full-result and formatted-byte parity, independent prose findings on unchanged output, normalization/line-ending/literal transitions, changing-native fallback, preservation and convergence failures, and honest native-call savings.
Dependencies: PERF-SLICE-002/003/004; proceed only when measured eligible fraction and review support it.
Release implication: separate conditional candidate; batching does not automatically authorize removing a formatting step.

### PERF-SLICE-006: Reduce measured literal-layout overhead

Outcome: literal-heavy and adversarial documents preserve exact bytes with less owned scanning/allocation.
Split measurement into source indexing, owned parse, code-row walk, marker selection/insertion, Prettier, marker validation, and restoration before selecting edits.
Likely seam: `src/literal-layout.js`.
Candidate changes are one-pass discovery of occupied PUA marker characters and counting occurrences without allocating `split(marker)` arrays.
Retain collision detection/hash fallback, marker-count checks, exact fenced/indented literal restoration, and the empty-indented-row repair from the whitespace commit.
Larger row-representation changes require measured self-cost beyond Prettier.
Proof: expected literal/EOF/container/CRLF bytes, all 256 marker candidates, fallback/collision/count failures, and representative plus adversarial CPU/memory observations.
Dependencies: PERF-SLICE-001/002; may be demonstrated separately from the native adapter.
Release implication: bounded reversible follow-up; no formatter replacement.

### PERF-SLICE-007: Evaluate two workers only with remaining headroom

Outcome: an optional research candidate reduces remaining CPU-bound elapsed time without endangering memory or failure behavior.
Start with two persistent analysis workers; keep native batch concurrency at one initially to avoid multiplying outer concurrency with Snapper's internal parallelism.
Keep environment isolation, per-worker heap/stack and document deadlines, deterministic aggregation, abort/termination, and validated-before-write behavior.
Do not expose a new consumer setting or ship a research environment switch by default.
Proof: both frozen corpora and worst-case literal/lint/near-limit workloads meet whole-tree memory and timing bounds with declared measurement granularity/headroom; worker crash, timeout, queued/in-flight cancellation, and ordering parity pass.
Dependencies: measured consolidated PERF-SLICE-002/003/004, and 005/006 if adopted.
Release implication: reject the candidate if memory benefit/risk does not justify it; serial operation remains valid.

### PERF-SLICE-008: Select independent lower-order follow-ups

Outcome: a measured scalability problem is resolved without broadening the primary candidate unnecessarily.
Likely seams are `src/formatting.js` for direct semantic-tree comparison, `src/documents.js` for exact-sized reads/bounded selection scheduling, and `src/quality.js` for cursor-based `unprocessed` bookkeeping.
Any direct comparator must preserve every compared scalar/child and the exact current text and inline-code normalization, ignoring only what the current oracle ignores.
Keep the old comparator as a differential test oracle while also using independently specified semantic fixtures; do not accept structural parity alone as proof of meaning.
Any smaller read allocation must detect short reads, concurrent growth/shrink and identity changes, expose no uninitialized bytes, and retain later replacement verification.
Cursor bookkeeping must preserve exact `written`, `unchanged`, and `unprocessed` results during mid-batch interruption.
Selection scheduling must preserve exclusions, safe paths, byte/entry limits, ordering and failures.
Proof: focused external race/failure and semantic oracles plus measured affected large/dirty workloads; each follow-up is independently revertible.
Dependencies: PERF-SLICE-001 measurements; no prerequisite for the first deduplication/batching release.

### PERF-SLICE-009: Qualify one consolidated release candidate

Outcome: demonstrated performance gains reach the actual packed product with retained correctness, rights, recovery, and owner acceptance.
Consolidate only successful justified slices, then run route-required final verification, independent review, exact transported-archive checks on Windows x64/glibc Linux x64, and the benchmark gates below.
The owner's subsequent review selection is Claude Opus 5.5 with medium reasoning; use the installed CLI for a declared bounded consolidated review and independently required verification.
If that selected provider cannot be admitted, retain the actual gap and use an already authorized alternative: Antigravity 3.8 Flash/high with at least 15 minutes available inside a bounded run, or the authorized Codex fallback.
Unavailable/failed review does not justify repeated broad reviews or setup changes.
Use narrowly scoped follow-up review for actual repairs; do not treat denied reads or empty output as a pass.
Freeze source/graph/native/config/corpus and all public result/oracle identities before expensive qualification.
No new binary build is implied; preserve existing native provenance while binding changed JS/config source to its own future coherent tuple.
Any delivered source changes require a new unused package version selected under the accepted release policy; immutable 1.0.2 archives cannot gain the optimization by republishing.
Keep the accepted unchanged-version recovery for partially delivered, unchanged frozen archives.
Registry publication, immutable GitHub release/tag and coordinated `latest` effects follow the existing release plan and their still-applicable authority; no automatic promotion is part of this planning task.
Each pilot retains exact scope/delta approval, attributable hosted proof, separately accepted trusted run and retained-preimage recovery before adoption.
Dependencies: successful primary slices plus only conditional slices justified by evidence.
Release implication: a faster source checkout is not packed/registry/consumer acceptance.

## 6. Benchmark acceptance and oracle ownership

Benchmark whole-operation check on identical complete frozen corpus bytes, selected policy, graph/native identity, host and Node runtime, excluding installation/download.
Preserve single-run historical evidence; use a current-source baseline and candidate for every optimization comparison.
Alternate AB/BA order, state warm/cold behavior, retain every individual result and invalid attempt, and report effect size with uncertainty rather than a selected favorable ratio.
Start with a bounded paired experiment; extend to 15–30 paired repetitions when noise/decision significance requires it and report the method/sample count honestly.
Instrumented CPU/heap runs are separate from qualification timing.
Capture the actual analysis worker and native descendants, not only the benchmark parent or idle main thread; verify worker profile artifacts exist and name the observed execution contexts.

Retain wall/user/kernel CPU, appropriate whole-process-tree memory, worker heap/GC, parse/layout/Prettier/native invocation counts, memo hit/miss/retained variants, group/snippet sizes, native input/output/advisory counts, and fast-path eligible/fallback counts.
Measure selection, reads, physical target checks and startup separately before promoting low-order or compilation work.
Do not equate JavaScript heap with complete memory or sampled RSS with a guaranteed transient peak.

The accepted release/pilot gate stays six consecutive valid full runs per frozen corpus/platform: nearest-rank observed p95 at most 30 seconds, which for six samples is the observed maximum.
Windows uses peak Job Object committed memory including driver/descendants; Linux uses measured whole-process-tree resident memory with sampling limitations declared.
Both remain at most 512 MiB; these are measured qualification budgets, not OS runtime caps.
Require zero unexpected operational failures and independently adjudicated false positives in those windows; retain the accepted restoration-within-60-minutes gate for actual pilot delivery.
Do not discard legitimate slow/failing samples or relax correctness to meet timing.

The researcher's approximately 20% repeatable end-to-end improvement on both corpora is a working engineering objective for a substantial architectural change, not an owner-approved SLA or a new mandatory product gate.
Evaluate uncertainty, actual complexity, and memory headroom before accepting expensive architecture; smaller isolated improvements may be justified by measured affected-workload value.
If the target is unattainable, report the result and revise scope with the owner; do not force concurrency/compilation or silently accept a regression.

| Workload/oracle                                                    | Required evidence                                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen OwlAPI/WebVOWL, current policy                              | Complete result JSON and selected/source hashes; timings and memory separately; normalize only an intentionally changed package version field in cross-version comparisons   |
| Clean, dirty, and unsafe-whitespace inputs                         | Exact expected findings/locations/output bytes; no-write and second-pass proof; backslash hard breaks and code-body exemption preserved                                      |
| Lists and continuations                                            | Independently chosen true/false finding cases; exact rule/line attribution; narrow exception parity                                                                          |
| Fenced/indented/inline-code and raw HTML literals                  | Exact meaningful bytes, empty/whitespace-only rows, EOF/containers, tabs/Unicode/CRLF and escaped-slash cases                                                                |
| Physical local links                                               | Real existing/missing/linked/escaping targets; invalidate filesystem observations between requests without changing source text                                              |
| Native/staging faults                                              | Real controlled process failures plus native-I/O mocks for protocol boundaries; skipped/missing/extra/duplicate/path-mismatched records and cleanup/deadline/output failures |
| Near-limit files, thousands of tiny documents, adversarial markers | Same limits/order/error/write semantics; worst-case process-tree memory and cost; no resource-limit inflation                                                                |
| Replacement races/interruption                                     | Exact preimages and truthful partial result; unrelated sentinels unchanged                                                                                                   |

The package owns reviewed golden byte/result fixtures and the current-source differential oracle; consumers own their real scope, targets, incumbent product checks, and acceptance.
Mocks control external native process, worker failure and filesystem-race boundaries; they do not replace real Prettier/ESLint/mdast or supported-platform packed execution.
Existing contracts, formatting, literal, whitespace, list, replacement, packaging and source-policy tests remain relevant; add tests only for the changed seam and independently specified failures.
Use focused checks while editing, affected regressions at integration points, then the actual HISEW full profile and separate packed/hosted evidence on the frozen final candidate.
Resolve staging/commit order before the canonical run; retain receipts against their actual identities instead of repeating suites merely to decorate a commit.

## 7. Traceability, stop conditions, and recovery

| Slice          | Requirements / decisions                               | Demonstrable proof                                                       | Release / cleanup implication                                  |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| PERF-SLICE-001 | PERF-REQ-001 to 004; QA-009; baseline decision         | Current-policy corpus/result identity, fine profile, preserved originals | Research evidence only; retain all attempts                    |
| PERF-SLICE-002 | PERF-REQ-001/003; PERF-DEC-001; QA-002/009/010         | Exact-input reuse with full observable parity and memory results         | Independent reversible source increment                        |
| PERF-SLICE-003 | PERF-REQ-002/003; PERF-DEC-002/005; QA-001/003/004/009 | Complete attributed native group and isolation/fault evidence            | External staging contract and independent security disposition |
| PERF-SLICE-004 | PERF-REQ-002; PERF-DEC-003; QA-002/003                 | Complete independent item/continuation parity                            | Retain narrow exception qualification                          |
| PERF-SLICE-005 | PERF-REQ-001/002; PERF-DEC-004; QA-002/003             | Measured eligible fraction, exact fallback and fixed point               | Conditional release inclusion                                  |
| PERF-SLICE-006 | PERF-REQ-001/003; PERF-DEC-006; QA-002/009             | Literal/marker equivalence and affected cost                             | Retain collision/empty-row guards                              |
| PERF-SLICE-007 | PERF-REQ-002/003; PERF-DEC-007; QA-004/009/010         | Two-worker memory/deadline/order/failure proof                           | Reject safely if headroom is insufficient                      |
| PERF-SLICE-008 | PERF-REQ-001/003; PERF-DEC-008; QA-002/007/009         | Semantic/race/partial-result/selection oracles                           | Separate small reversible follow-ups                           |
| PERF-SLICE-009 | PERF-REQ-004; QA-005/008/010 to 013                    | Frozen full, independent, packed and hosted qualification                | Versioned coherent delivery and exact pilot recovery           |

Re-plan when current-policy outcomes differ, owned AST consumers mutate shared data, options escape memo identity, worker memory lacks headroom, protocol omission cannot prove coverage, ancestor configuration leaks, staging cannot remain private/owned, or batching alone invalidates formerly valid timeout/output cases.
An upstream/native/runtime/dependency change requires fresh software-selection, rights/source, protocol and qualification assessment; do not mix it into a performance-only delta.
Stop a failed experiment, identify the cause, make at most one justified correction and one narrow retest per unchanged hypothesis; a second failure closes that hypothesis pending new evidence or design.
Investigate every failed assurance run before retrying; timeouts, denied reads and unavailable profilers remain explicit limitations.
Review retries remain bounded by the accepted task, with no unlimited broad iterations.

Restore a failed local slice from retained exact preimages using normal authorized source changes while preserving unrelated staging; do not rewrite published history or run blanket reset/cleanup.
Ship only demonstrated slices; the current serial/per-document implementation is the recovery baseline until a new coherent release is accepted.
If delivered, restore a consumer's recorded package/config/lock/workflow identity through its accepted recovery scope, and verify its complete incumbent checks and unrelated sentinels.
Changing npm `latest` does not restore a pinned consumer or replace immutable archives.
Retain source/corpus manifests, profiles, raw observations, review reports, failed hypotheses and recovery inputs under existing evidence retention; delete only proven operation-owned temporary staging.

## 8. Authoritative implementation references

These references were checked on 6 October 2026; exact source/lock/native identities govern reproducibility.

- [Node 24 worker threads](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html): CPU-bound worker pooling, resource-limit scope and worker profiling APIs; concurrency is conditional on measured whole-tree headroom.
- [Node 24 child processes](https://nodejs.org/docs/latest-v24.x/api/child_process.html): synchronous execution, shell/timeout/output controls; asynchronous substitution alone is not evidence of reduced work.
- [Node 24 command-line profiling](https://nodejs.org/docs/latest-v24.x/api/cli.html#--cpu-prof): separate CPU/heap observations from uninstrumented timing and verify the worker's own coverage.
- [Prettier public API](https://prettier.io/docs/api): supported formatting boundary; reuse owned results rather than depend on private formatter ASTs.
- [ESLint Node API](https://eslint.org/docs/latest/integrate/nodejs-api): preserve snapshot-based `lintText`; file caching applies to `lintFiles`, not `lintText`.
- [Snapper 0.11.9 exact source](https://github.com/TurtleTech-ehf/snapper/tree/407c2beb04607f6ccb421e6f6418dcc00e4c1e94): qualify multi-file processing, config/EditorConfig, omission, diagnostics and exit semantics against this pinned implementation.
- [CommonMark 0.31.2 hard breaks and literal semantics](https://spec.commonmark.org/0.31.2/): preserve meaning while enforcing the owner's explicit whitespace policy.

Platform WPR/WPA or Linux perf observations are optional corroboration where already permitted; profiler unavailability is not authority to install tools or weaken host security settings.
The original implementation entry was PERF-SLICE-001, followed by exact-input reuse and independently proved native batching; current outcomes and conditional deferrals are recorded above.
