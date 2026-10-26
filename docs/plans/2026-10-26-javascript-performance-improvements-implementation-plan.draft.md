# Markdown Quality JavaScript performance improvements: draft implementation plan

Date: 2026-10-26, Europe/Bucharest.
Revision: 1.
Status: accepted for conditional implementation by the owner on 2026-10-26; R2 execution 767493e5-ee3b-4ac6-a9c1-67c06a892e5b.
Implementation decisions and measured limits: [execution report](../javascript-performance-improvements.md).
Planning and acceptance owner: Maksym Shostak / Hadden Industries.
Intended repository destination: docs/plans/2026-10-26-javascript-performance-improvements-implementation-plan.md.
Repository inspected: C:/Users/maksy/GitHub/markdown-quality.
Inspected HEAD: 7e24e6f806d9d532c1425f76c52fdd0923af985a.

## 1. Purpose, authority, and draft boundary

Reduce unnecessary JavaScript work during complete Markdown checks while preserving diagnostics, selected documents, formatting bytes, resource limits, process boundaries, and failure behavior.
The intended higher outcome is faster, dependable author and CI feedback without transferring cost into unsafe reads, excessive memory, incomplete checks, or additional maintenance.

This plan synthesizes the supplied *Production Performance Audit: @hadden-industries/markdown-quality*.
The source is C:/Users/maksy/Downloads/markdown-quality-javascript-performance-improvements.md, SHA-256 d087602963905a4b83cb29a5c05cd482a97b331b2adc1781f4d2e59a5f33279d.
The original remains the authority for its reported observations and exact illustrative patches.
This plan preserves their intent, evidence, numbers, priorities, exclusions, and uncertainties without treating them as newly reproduced results.

The user originally requested a detailed HISEW plan in docs/plans/.
After the repository reported another chat's retained execution, the user explicitly selected: "Keep the execution; prepare the draft only."
The original drafting activity placed this draft beside the source document, outside the worktree.
It did not adopt, resume, close, or amend execution ea593464-65aa-4a83-8936-d44c7177e838, observed paused at generation 6.
That execution concerns native Prettier selection and verification alignment, with tests and workflow dispatches deferred.
On 2026-10-26 the owner authorized implementation, then explicitly authorized adopting and administratively closing that retained execution.
Its evidence was preserved; no verification or completion was claimed for it.
The first implementation checkpoint committed this plan as 4818e535244475aa068b03a0be998e93314f0b49 before code changes.
Relative repository links below are written for that intended destination.

This drafting activity inspected source and documentation only.
It did not run product tests, benchmarks, dependency installation, formatters, workflow dispatches, commits, publication, or execution lifecycle mutations.
An available tool, a proposed command, or a source audit's activity log is not evidence that this draft executed it.

The source did not supply accepted REQ/AC/QA identifiers, a risk route, independent raw profiles, or an accepted design baseline.
The identifiers and design below therefore form a proposed dossier.
The owner must accept the applicable requirements, risk, security obligations, performance criteria, and open decisions before the affected implementation begins.
Draft preparation does not approve or baseline them.

The existing [performance plan](performance-implementation-plan.md), [centralized contracts](../centralized-contracts.md), [performance qualification](../performance-qualification.md), [support policy](../support-and-release.md), and [security policy](../../SECURITY.md) remain governing inputs.
This follow-up neither reopens completed historical performance slices nor turns their release evidence into evidence for a new candidate.

## 2. Evidence classification and current repository reconciliation

### 2.1 What was inspected

The worktree was clean at the initial inspection.
The inspected package version is 1.0.3; package version alone does not identify the current development source or an authorized future release.
The local Node executable reports v24.22.1.
Runtime/native/environment identities still need freezing for any future performance experiment.

| Area                          | Current source fact                                                                                                      | Planning implication                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Prose advisory scan           | src/advisory-diagnostics.js converts codePointAt results through String.fromCodePoint solely to obtain UTF-16 width      | PERF-01's proposed substitution still targets existing code                 |
| Emphasis normalization        | src/policy-formatting.js calls canonicalize without an underscore-presence guard                                         | PERF-02 remains applicable; account for the existing document memo          |
| Selection                     | src/documents.js validates selected inventory entries in accounting and again in the sorted, deduplicated candidate loop | PERF-03 is plausible, but failure order and validation timing require proof |
| Reads                         | readDocument allocates a 65,536-byte zeroed buffer before every read, including the terminal zero-byte read              | PERF-05 describes a real allocation site; the proposed remedy is incomplete |
| Public concurrency            | src/quality.js defaults to 1; the CLI documents 1 and accepts an explicit positive integer                               | Preserve the public default; any repository script choice is separate       |
| Worker coordination           | src/document-analysis-pool.js reuses workers, orders results, stops queued work on known failure, and closes analyzers   | Reuse the pool and its failure contracts                                    |
| Repository check              | package.json check:markdown has no concurrency argument                                                                  | A measured repository-only setting is possible                              |
| Full verification             | scripts/verify.js invokes the Markdown CLI directly                                                                      | Editing only package.json does not change this invocation                   |
| Installed tooling             | package-lock.json resolves dependency-cruiser 18.7.0; node_modules contains 18.6.0                                       | The audit's mismatch is still observable; no repair was attempted           |
| Existing identity enforcement | scripts/dependency-graph.js analyzerIdentity rejects an installation/lock mismatch                                       | Reuse this authority; do not add a duplicate dependency-cruiser check       |
| Performance driver            | scripts/performance-check.mjs invokes the installed public runQuality API and forwards its result/exit code              | It is not currently the owner of timing or memory acceptance                |
| Performance observer          | scripts/qualify-performance.py owns corpus identities, retained oracles, measurements, and qualification gates           | Extend or reuse the existing observation boundary where appropriate         |
| CI installation               | Existing workflows use npm ci, including script-disabled acquisition paths                                               | A general lock/install check needs a demonstrated residual gap              |
| Public corpora                | Pinned OwlAPI/WebVOWL revisions and retained full-result fixtures already exist                                          | Missing local clones do not imply missing qualification infrastructure      |

### 2.2 Corrections required before implementation

1. String.fromCodePoint returns a primitive string value; the language contract does not promise a fresh heap object on every call.
   The source's allocation/GC explanation is a hypothesis supported by its reported measurements, not proof of a specific V8 allocation strategy.
   Measure the actual worker and retain allocation evidence.
2. The long-line loop stops when the 121st non-exempt code point is found and skips exempt spans.
   It does not necessarily inspect every character in every paragraph.
   Define workload size in terms of visited code points and traversed spans, not total file bytes alone.
3. Searching for an absent underscore requires scanning the string in the usual worst-case model: O(N), not the source's O(1).
   It can avoid a parse/cache lookup and AST walk, but the existing memo may already avoid parsing.
   Measure parses and visits separately.
4. A selection-only simplification does not halve all filesystem work.
   The removed calls concern selected inventory entries; readDocument and other trust boundaries still validate paths.
   Directory walking, exclusion accounting, Git inventory, and candidate deduplication remain.
5. The accounting validation precedes candidate-byte accounting for that item and precedes sorted candidate processing.
   Removing it can change which of several missing, unsafe, or over-budget inputs fails first.
   Existing success tests alone cannot establish equivalence.
6. readSync needs a destination buffer before it can return a byte count.
   "Delay allocation until non-zero read" is not a complete implementation strategy.
   A reuse/copy or bounded growth strategy must preserve read-through-EOF, growth detection, ownership, and cleanup.
7. The audit's 2,462 ms concurrency result includes PERF-01..03 patches.
   Its unmodified concurrency-4 observation is 3,368.91 ms.
   Do not attribute the combined 57% reduction to concurrency alone.
8. The proposed 3,800 ms and 250 MB gates concern an unspecified repository/runner profile. They cannot replace accepted full-corpus 30-second/512 MiB gates.
   JavaScript heap growth is not whole-process-tree committed memory.
9. Asterisks around one word, as in *bold*, express emphasis rather than strong emphasis.
   Test plain text, single-asterisk emphasis, and double-asterisk strong emphasis separately.
   String equality alone cannot prove that parsing was skipped.
10. The disabled-advisory split test observes no split when long-line work is disabled and some split when enabled.
    It is a work-avoidance regression check, not an immutable public requirement to use split forever.
    Replacing split remains excluded here because no measured benefit justifies it.
11. The source's 18/18 advisory, 6/6 formatting, 8/8 selection, and 57-test claims describe its own asserted runs.
    Current static inspection finds two top-level disabled-advisory tests, six formatting tests, and eight selection tests.
    Future evidence must record actual commands, discovered tests, outcomes, and runtime rather than force historical counts.
12. "No risk" in the source is not accepted assurance.
    Unicode boundaries, memo lifecycle, path failure precedence, buffer ownership, and capacity limits remain relevant even for small edits.

The language interpretation above follows the [ECMAScript string operations](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.codepointat) and [includes operation](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.includes).
The buffer prerequisite follows the [Node readSync API](https://nodejs.org/docs/latest-v24.x/api/fs.html#fsreadsyncfd-buffer-offset-length-position).
These references support semantics, not a measured speedup.

## 3. Preserved source audit evidence

All numbers in this section are source-reported, unverified by this drafting activity.
No raw CPU profiles, heap artifacts, timed command output, source commit identity, or experiment manifest accompanied the Markdown report.
Its classifications "MEASURED" and "High confidence" are retained as the author's labels.

### 3.1 Reported environment and workloads

| Item                | Source report                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Runtime             | Node.js v24.22.1; V8 13.4.114.21-node.27                                                                             |
| Platform            | Windows 11 Pro x64, build 10.0.26100; narrative refers to an 8-core machine                                          |
| Dependencies        | ESLint 10.13.0; @eslint/markdown 8.0.3; mdast-util-from-markdown 2.1.0; Prettier 3.9.10; Ajv 8.20.0                  |
| Native component    | Win32 x64 Snapper                                                                                                    |
| Serial command      | node src/cli.js check --root . --inventory git                                                                       |
| Parallel command    | node src/cli.js check --root . --inventory git --concurrency 4                                                       |
| Repository workload | 31 documents; 2,244 diagnostics                                                                                      |
| Focused suites      | contracts, central-selection, formatting, disabled-advisories, and quality; reported 57 passing tests                |
| Timing method       | Five consecutive runs with warm filesystem caches; PowerShell Measure-Command wall time                              |
| Missing evidence    | Live HTTP/batch-worker production telemetry unspecified; local maintainer corpus clones not supplied as Git contents |

The report's preamble records edits to documents.js, central-selection and affected-test runs, repeated task polling, CLI measurements, diff review, an architecture check exiting 1, inspection of architecture/dependency tooling and versions, scratch cleanup, and reset to a pristine workspace.
These are provenance statements from the supplied report.
They do not establish a surviving patch, an accepted execution, or independently verified tests.

### 3.2 Reported baseline and stage measurements

| Metric                                                |                             Source value |
| ----------------------------------------------------- | ---------------------------------------: |
| Unmodified serial CLI check                           |                              5,723.88 ms |
| Unmodified CLI check with concurrency 4               |                              3,368.91 ms |
| In-process runQuality                                 |                              5,378.20 ms |
| Native precheck, 31 files                             |                                887.00 ms |
| Document preparation, worker                          |                              3,648.20 ms |
| Verified prose phase                                  |                                  6.18 ms |
| Configuration and ESLint setup                        |                                120.90 ms |
| Discovery and Git inventory                           |                                 83.60 ms |
| Heap growth during a three-pass batch                 | 24.9 MB to 202.2 MB; +177.3 MB transient |
| canonicalizeEmphasis across repository files          |                                422.91 ms |
| checkAdvisories over 1,001 paragraphs, ten iterations |              84.49 MB reported allocated |
| Prose loop, 10,000 paragraphs, original               |             6.19 ms; 0.18 MB heap growth |
| Prose loop, scalar version                            |             2.61 ms; 0.01 MB heap growth |
| Formatting suite, original/candidate                  |                     10,750 ms / 6,424 ms |
| Patched serial CLI, example run                       |                              3,344.15 ms |
| Patched concurrency-4 CLI, example run                |                              2,462.00 ms |

The report associates the scalar loop with a 58% reduction and 18-fold lower measured heap growth, formatting tests with 40.2% improvement, patched serial checking with 41.6%, and the combined concurrency result with 57.0%.
It also cites an OwlAPI workload of 5,799 long lines and more than 700,000 transient string operations.
The exact corpus identity and instrumentation needed to substantiate those allocation claims remain missing.
The listed in-process stages do not account for the entire API duration; retain the remainder instead of inventing stage attribution.

### 3.3 Complete reported five-run series

| Run                | Baseline main |                 PERF-01..03 | PERF-01..03 plus concurrency 4 |
| ------------------ | ------------: | --------------------------: | -----------------------------: |
| 1                  |   5,723.88 ms |                 3,344.15 ms |                    2,462.00 ms |
| 2                  |   5,690.12 ms |                 3,312.40 ms |                    2,448.15 ms |
| 3                  |   5,741.05 ms |                 3,328.90 ms |                    2,470.30 ms |
| 4                  |   5,711.20 ms |                 3,339.80 ms |                    2,455.60 ms |
| 5                  |   5,715.40 ms |                 3,331.20 ms |                    2,459.10 ms |
| Reported mean      |   5,716.33 ms |                 3,331.29 ms |                    2,459.03 ms |
| Reported reduction |      Baseline | 41.7%; approximately 2.38 s |    57.0%; approximately 3.26 s |

These five warm-cache samples are not a hosted-runner p95 qualification.
Their combined effects cannot establish each patch's individual contribution.
The audit's greater-than-40% full-check target in its selection recommendation concerns the combined patch evidence, not an isolated demonstrated gain from selection.

### 3.4 Findings and disposition

| ID      | Source classification, priority, confidence | Mechanism and proposed change                                                                             | Source impact, effort, risk                                   | Draft disposition                                                          |
| ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| PERF-01 | MEASURED; high; high                        | Remove the code-point-to-string round trip in checkAdvisories; derive UTF-16 width from the numeric value | 58% loop reduction; 18-fold heap-growth reduction; small; low | First optimization after a trustworthy baseline                            |
| PERF-02 | MEASURED; medium; high                      | Return unchanged text from canonicalizeEmphasis when no underscore occurs                                 | Approximately 400 ms per batch; small; low/none               | Second optimization; prove output and memo behavior                        |
| PERF-03 | MEASURED; medium; high                      | Remove accounting-loop selectedPath when final selected candidates are validated                          | Duplicate stat/realpath work removed; small; low/none         | Third optimization only after failure-order and boundary proof             |
| PERF-04 | MEASURED; high; high                        | Add explicit concurrency 4 to repository check scripts                                                    | Reported 41.6% check improvement; small; low                  | Conditional capacity experiment; source impact attribution corrected above |
| PERF-05 | MEASURED; low; high                         | Avoid a discarded 64 KiB allocation on the EOF probe                                                      | Less buffer churn; small; low                                 | Optional measured follow-up; design unresolved                             |

The source's roadmap is preserved: PERF-01, PERF-02, and PERF-03 first; repository concurrency and dependency installation reconciliation next.
PERF-05 and the proposed CI gates remain explicitly represented even though they were not among the source's three illustrative patches.

### 3.5 Complexity and cost model

| Area        | Source model                                                                                                      | Reconciled planning model                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prose scan  | O(C) time and O(C) transient strings become O(C) time and O(1) scalar storage                                     | Define C as visited code points; threshold short-circuiting and exempt-span traversal also matter. The change removes the conversion operation, while actual allocation savings depend on V8 and the workload |
| Emphasis    | O(V + M), with V AST nodes and M memo lookup cost; proposed no-underscore path called O(1)                        | A no-underscore guard is O(N) in input length and avoids that invocation's memo/parse/walk; underscore-bearing input adds a scan before the original path                                                     |
| Selection   | Two times S selectedPath calls become one times S, each traversing depth D with lstat/realpath work; O(S times D) | This is a within-selection constant-factor reduction for selected inventory members, not a complexity-class change or permission to remove later read-time checks                                             |
| Concurrency | N document preparations dispatched serially                                                                       | Parallel elapsed time depends on preparation cost, available cores, startup, serial/native coordination and memory; do not assume a fourfold speedup                                                          |
| EOF buffer  | One discarded 64 KiB destination per readDocument call, or 64 KiB times N documents                               | A replacement must account for scratch retention, copies and partial/growing reads; savings do not imply lower peak process-tree memory                                                                       |

## 4. Scope, risk hypothesis, and invariants

### 4.1 Proposed scope and exclusions

In scope after acceptance: the five findings, reproducible baseline experiments, a bounded repository check concurrency decision, installation-identity reconciliation, and measurement/gating integration justified by those experiments.
PERF-05 may be closed with a documented no-change result if its cost is immaterial.
A broad dependency-sync implementation is conditional on demonstrating a gap beyond existing native package-manager and analyzer checks.

Excluded: changing Markdown policy, advisory thresholds or severities, selection include/exclude authority, diagnostic suppression, public default concurrency, automatic CPU selection, worker-count caps, global caches, alternative runtimes, compilation, asynchronous native redesign, dependency upgrades unrelated to identity repair, new telemetry services, and consumer repository modification.
Do not replace text.split or remove process/worker boundaries as part of this plan.
Do not use higher limits or fewer diagnostics to manufacture a performance improvement.
Do not change Markdown/JSON formatter ownership or absorb the retained Prettier execution.

### 4.2 Proposed risk route

The document-only activity has no product execution authority.
For a future combined implementation, propose R2 until the router and owner resolve path safety, bounded reads, concurrency capacity, and qualification changes.
Isolated PERF-01/02 edits may qualify as R1 when their interfaces and proofs are settled.
The small size of PERF-03/05 does not remove the security relevance of their file-boundary behavior.
No R3 trigger is established by the supplied evidence.

The owner accepts scope, risk, new gates, and any observable behavior change.
A designated implementing coordinator owns integration.
An independent reviewer covers ordinary correctness and affected security/resource boundaries as required by the accepted route.
This draft does not assign a review provider, invoke a scan, or authorize agent delegation.

### 4.3 Retained invariants

| ID      | Invariant                                                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| INV-001 | Complete public findings, fields, ordering, severity, locations, selection accounting, outcome, and exits remain unchanged except an independently accepted change |
| INV-002 | Formatting preserves literal and semantic content, reaches the existing fixed point, and retains guarded per-file replacement and truthful partial results         |
| INV-003 | Selected physical paths remain contained and admissible; missing selected documents fail; excluded paths are not read merely to validate an optimization           |
| INV-004 | UTF-16 columns and code-point counting retain current meaning, including the 120-code-point threshold and first report at 121                                      |
| INV-005 | Disabled advisories still avoid their own work; unchanged document memo boundaries remain request/document owned                                                   |
| INV-006 | Public CLI/API concurrency defaults to 1; explicit concurrency preserves ordering, failure selection, worker cleanup, and one native batch coordinator             |
| INV-007 | File, selection, output, diagnostic, time, and worker budgets retain their enforcement and failure meaning                                                         |
| INV-008 | Checking is read-only and offline; untrusted document content does not grant executable configuration or tool acquisition                                          |
| INV-009 | Complete corpus results and formatting bytes remain independent correctness oracles; candidate-generated expectations do not approve themselves                    |
| INV-010 | Source completion, local verification, hosted qualification, release approval, and consumer activation remain distinct states                                      |

## 5. Draft requirements, acceptance criteria, and quality scenarios

IDs in this document are local to this draft and do not renumber the historical PERF-REQ/PERF-SLICE records.
All new acceptance criteria await owner acceptance where they define policy or a performance target.

| Requirement | Proposed requirement                                              | Acceptance criterion                                                                                                                                      |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001     | Preserve observable quality behavior                              | AC-001: complete baseline/candidate results and formatted bytes agree on accepted workloads; any allowed normalization is explicit                        |
| REQ-002     | Remove avoidable prose-loop string conversion                     | AC-002: exact Unicode/threshold/exemption parity and measured removal of the conversion site; timing/allocation evidence states uncertainty               |
| REQ-003     | Avoid emphasis-only AST work when impossible to change text       | AC-003: no-underscore input is unchanged without emphasis parse/walk work; underscore inputs retain correct normalization and failures                    |
| REQ-004     | Reduce redundant selection validation without weakening admission | AC-004: successful inventory/accounting and invalid-input/error-order contracts remain accepted; no selected path bypasses final/read-time checks         |
| REQ-005     | Evaluate repository-only parallel checking                        | AC-005: selected worker count has complete serial/parallel result parity, cleanup proof, and measured host headroom; public default stays 1               |
| REQ-006     | Reduce EOF buffer churn only if valuable                          | AC-006: empty/boundary/growing/shrinking reads preserve exact bytes, limits, ownership, and closure; evidence justifies extra complexity                  |
| REQ-007     | Make performance claims reproducible                              | AC-007: frozen identities, paired raw observations, measured contexts, exact result manifests, and retained failures support each accepted claim          |
| REQ-008     | Prevent installation drift from invalidating evidence             | AC-008: the installed dependency graph matches the accepted lock before qualification; existing analyzer identity denial remains effective                |
| REQ-009     | Keep CI gates owned and interpretable                             | AC-009: any new threshold identifies its workload, runner, metric, units, sample method, owner, and failure behavior; existing corpus gates are preserved |
| REQ-010     | Deliver recoverably within existing ownership                     | AC-010: each included slice has review, targeted evidence, rollback/forward-fix disposition, cleanup, and separately authorized delivery                  |

| Scenario | Stimulus and environment                                                                                                                              | Observable response and proof                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| QA-001   | Prose around 119/120/121 code points with BMP, supplementary characters, combining marks, and lone surrogates where accepted by the direct string API | Same report/no-report, UTF-16 column, severity and message; no grapheme-policy change                             |
| QA-002   | Long prose containing links, images, inline code, HTML, references, multiline containers, LF/CRLF/CR endings                                          | Same exemptions, offsets, first finding, and bounded traversal                                                    |
| QA-003   | No underscores, escaped underscores, underscores in literals/URLs, real underscore emphasis, nested emphasis, clean/dirty documents                   | Exact output and second-pass parity; guard eligibility/call counts explain skipped work                           |
| QA-004   | Missing tracked files, symlinks/junctions, path escapes, unsafe ancestors, duplicates, excluded entries, literal wildcard and Unicode filenames       | Existing containment/error contracts, full accounting, no excluded-byte reads, and bounded candidate growth       |
| QA-005   | Multiple invalid paths and exhausted selection-byte/entry budgets                                                                                     | Deterministic accepted failure precedence; optimization does not silently change reported failure                 |
| QA-006   | Same immutable workload under concurrency 1 and candidate 2/4, including empty/small batches, delayed failures, cancellation, and worker crash        | Ordered complete results, truthful earliest failure, all workers/descendants closed, no budget inflation          |
| QA-007   | Zero, one, 65,535, 65,536, and 65,537 bytes; multiple chunks; partial reads; growth/shrink after initial stat                                         | Exact preimage and byte ownership, read-through-EOF, size denial, regular-file checks, descriptor closure         |
| QA-008   | Warm/cold host conditions, many tiny files, deep directories, large/adversarial documents and frozen public corpora                                   | Paired wall/CPU and correct memory metric with all attempts retained; no correctness trade-off                    |
| QA-009   | Lock/install mismatch, corrupted or missing oracle, unexpected exit, timeout, or memory/gate breach                                                   | Qualification denies or reports invalid evidence rather than success; diagnostic artifacts survive                |
| QA-010   | Approved candidate delivery followed by diagnostic drift, unsafe read, excessive memory, or interrupted formatting                                    | Stop affected rollout; restore accepted preimages where applicable; restrict operation or deliver an assessed fix |

## 6. Draft design decisions, seams, and reuse

### 6.1 Decisions

| Decision | Proposed disposition and condition                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001  | Keep this document a draft; preserve the unrelated execution and defer repository placement                                                           |
| DEC-002  | Freeze a current source/environment baseline before measuring; preserve source-reported numbers as historical hypotheses                              |
| DEC-003  | Replace the prose loop's numeric-to-string width derivation with scalar width determination, keeping loop policy and position reporting               |
| DEC-004  | Add a narrow absence-of-underscore guard only to emphasis normalization; preserve full policy canonicalization and the maintained parser              |
| DEC-005  | Remove only provably redundant accounting validation; preserve final/read-time validation and accepted failure precedence, or retain the call         |
| DEC-006  | Assess explicit repository concurrency 4 after testing 1/2/4 under real budgets; do not change public defaults or auto-select resources               |
| DEC-007  | Keep EOF-buffer work optional until a safe, bounded design demonstrates a material benefit                                                            |
| DEC-008  | Restore installation/lock consistency through supported acquisition; reuse analyzerIdentity and native npm checks before inventing general sync logic |
| DEC-009  | Keep a proposed repository speed gate separate from full-corpus qualification; do not change the measurement driver's responsibility casually         |
| DEC-010  | Release and consumer adoption need their own current decisions; prior publication holds and support rules must be rechecked                           |

### 6.2 Architectural seams and DRY-01 assessment

Likely files below are predictions, not a mandatory edit inventory.
The implementer must recheck latest consumers and actual responsibilities at the implementation baseline.

| Rule and authority                                                                                                          | Latest inspected consumers and boundary                                        | Reuse strategy, deliberate separation, and drift control                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advisory threshold/exemptions: src/advisory-diagnostics.js and src/preset.js                                                | Document analysis, public quality results, opinionated-default tests           | Keep one rule owner; use scalar width locally rather than a new generic Unicode abstraction; independent fixture expectations remain separate              |
| Emphasis policy: src/policy-formatting.js                                                                                   | Formatting pipeline and document memo                                          | Reuse maintained mdast and request-local memo; add only the necessary eligibility predicate; policy and emphasis-only modes keep distinct responsibilities |
| Selection decision: createPathDecision and selectedPath in src/documents.js; physical checks via configuration/path helpers | Filesystem discovery, Git/supplied inventory, explicit files, and readDocument | Deduplicate work within selection only; repeated enforcement at later trust boundaries is intentional because filesystem state can change                  |
| Concurrency meaning: src/quality.js and pool contract                                                                       | CLI, library, repository scripts, direct verifier call                         | Keep one public meaning; decide whether repository npm check and full-verifier check share a resource policy before consolidating arguments                |
| Read ownership/bounds: readDocument and contracts                                                                           | Document decoding, staging and guarded replacement preimages                   | Preserve current exact-byte ownership and post-stat growth handling; do not create cross-request filesystem caches                                         |
| Lock identity: package-lock.json plus npm installation semantics                                                            | Architecture graph, affected tests, verification and CI                        | Reuse analyzerIdentity and existing CI acquisition; any general graph check needs a proved gap and correct nested/optional/link treatment                  |
| Performance acceptance: existing qualifier and accepted corpus policy                                                       | Installed driver, platform observers, CI artifact consumers                    | Reuse metric collection and evidence formats; a new repository workload may intentionally have distinct thresholds and oracle, owned by the maintainer     |
| Historical correctness reports                                                                                              | Frozen fixtures and independent candidate comparison                           | Preserve immutable historical evidence; never regenerate expectations from the optimized candidate                                                         |

The two potential repository check entry points currently have separate call sites.
If both are meant to share a concurrency choice, use an existing coherent invocation seam or an explicit conformance check.
Do not build a policy service or copy a growing command policy into unrelated files.
If full verification intentionally remains serial, record the different purpose and measured resource envelope instead of labeling it drift.

No new dependency, runtime, service, native replacement, or compatibility shim is proposed for PERF-01..05.
Internal reuse of the memo, worker pool, path decisions, native parser/printer, npm acquisition, and qualification observer addresses the expected work.
A new generic benchmark or dependency-validation capability is blocked until its residual gap, current maintained alternatives, supported consumer validator, and rights are established.
The audit's versions describe its baseline, not an assertion that they are the latest acceptable adoption targets.
Any new adoption must recheck current stable/applicable LTS identity and actual license/terms clearance.

Retain AGPL-3.0-only and existing component notices.
No license clearance for an unselected tool is claimed.
No prior no-shim exception has been identified; none is inferred.
NAM-01 applies to new names and changed responsibilities: distinguish code point from code unit, elapsed time from CPU, heap from tree memory, and repository regression checks from installed-corpus qualification.

## 7. Vertical implementation slices

Each slice combines its behavior change, focused proof, documentation/evidence, and recovery disposition.
No slice is authorized merely because it appears here.

### SLICE-001: Establish a trustworthy current baseline

Outcome: an implementer can reproduce the accepted workload and identify which costs each change can affect.
Links: REQ-007/008, AC-007/008, QA-008/009, DEC-002/008.

Reconcile execution ownership before product work.
Freeze source, lockfile, actual installed tools, native binary identity, Node/V8, OS/CPU, configuration, worker count, corpus content, selected inventory, and expected diagnostics.
Use an isolated authorized installation to repair the observed 18.6.0/18.7.0 mismatch rather than modifying the retained execution's environment.
Recheck architecture identity admission after acquisition.
Do not upgrade the dependency graph solely because the local installation is stale.

Capture the repository workload actually selected at that baseline.
The historical 31-document/2,244-diagnostic counts are comparison clues, not an admission rule.
Prepare representative Unicode/underscore/selection fixtures and reference results independently of the candidate.
Use existing frozen public corpus data when cross-corpus qualification is authorized.

Proof: identity manifest, complete baseline results, source/corpus hashes, valid timing samples, and observer evidence with all failures retained.
Dependencies: current owner/route decisions and an admissible environment.
Likely seams: existing performance observer, dependency identity tooling, fixture metadata, external evidence store.
Recovery: discard only owned experimental copies; retain manifests and failed attempts.
No release is produced by this slice.

### SLICE-002: Remove prose-loop string conversion

Outcome: long-line advisories preserve every finding while avoiding conversion solely to discover character width.
Links: REQ-001/002, AC-001/002, QA-001/002, DEC-003.

Apply the intent of source Patch 1 inside checkAdvisories.
Read the numeric code point once and advance two UTF-16 code units for values above 0xFFFF, otherwise one.
Preserve length increments, exemption jumps, first-threshold reporting, line offsets, disabled-rule behavior, and existing bounds.
Do not combine this with a line-splitting or advisory-policy refactor.

Proof: independently specified 119/120/121 boundary cases including emoji and supplementary CJK, combining sequences, valid surrogate pairs and accepted lone-surrogate inputs; exact line/column and exemption parity across newline styles.
Compare complete real-parser/public results, not just loop return values.
Measure allocation/CPU in the actual worker separately from timing runs, then obtain bounded paired end-to-end evidence.
The source's 58% and 18-fold values are hypotheses, not required universal gains.

Focused checks: disabled-advisories, opinionated-defaults, and directly affected quality/contracts coverage.
Likely change: src/advisory-diagnostics.js and existing relevant test fixtures.
Dependency: SLICE-001.
Rollback: revert this isolated source change before release if any diagnostic/location drift occurs; after release use the assessed delivery recovery route.

### SLICE-003: Skip impossible emphasis normalization

Outcome: documents without underscores avoid emphasis-only AST work while all formatting contracts remain intact.
Links: REQ-001/003, AC-001/003, QA-003, DEC-004.

Apply the intent of source Patch 2 at canonicalizeEmphasis only.
A negative underscore-presence check returns unchanged text.
Documents containing underscores take the existing canonicalization path, even when an underscore ultimately belongs to a literal or escaped sequence.
Full canonicalizePolicy behavior remains owned by its existing function.

Prove the no-work claim with the existing memo statistics or a narrowly scoped observation seam, alongside real parser/formatter integration.
A strict equality assertion on strings proves output equality, not parse avoidance.
Resolve whether skipping a disposed/invalid memo's validation is reachable through supported callers; preserve accepted errors or explicitly constrain the optimization to valid lifecycle states.

Proof: plain text, empty input, asterisk emphasis/strong emphasis, real and escaped underscores, code/HTML/URLs, mixed/nested emphasis, CRLF, frontmatter, clean/dirty inputs, preservation and second-pass convergence.
Measure parse misses, cache hits, walk cost, guard eligibility rate, and the added scan cost on underscore-rich inputs.
Treat the reported 422.91 ms saving and under-seven-second formatting-suite target as baseline-specific experiments.

Focused checks: formatting, document-memo, literal-protection/layout, and affected quality coverage.
Likely change: src/policy-formatting.js plus focused cases in existing tests.
Dependency: SLICE-001; may be evaluated independently of SLICE-002, but integrate sequentially.
Rollback: restore unconditional emphasis canonicalization if semantic or supported lifecycle behavior diverges.

### SLICE-004: Eliminate only redundant selection validation

Outcome: selected inventory members avoid duplicate validation within one discovery pass without weaker path safety or altered accepted failures.
Links: REQ-001/004, AC-001/004, QA-004/005, DEC-005.

Evaluate source Patch 3 against explicit, filesystem, Git, and supplied-inventory paths.
Trace the accounting loop, candidate-byte admission, deduplication/sort, final selectedPath validation, and later readDocument validation.
The simple deletion is acceptable only if the accepted error and timing contract permits it.
If preserving the original contract requires substantial new bookkeeping or caching, retain the existing check and re-plan rather than smuggle in a larger redesign.

Proof: unchanged files/exclusions/inventory, missing selected tracked files still producing MISSING_DOCUMENT, unsafe link/ancestor denial, excluded invalid bytes unread, canonical Unicode/literal wildcard paths, duplicate inventory rejection, and unchanged resource-budget enforcement.
Add discriminating cases combining multiple invalid paths or a missing entry with exhausted selectionBytes to expose the ordering difference.
Use real temporary filesystem/Git fixtures; controlled races may exercise the actual external filesystem boundary.
Count validation calls/syscalls only as supporting performance evidence, never as the sole safety oracle.

Focused checks: central-selection, contracts, regular-file, security-remediation, and impacted resource-limit/quality tests.
Likely change: src/documents.js and selection fixtures.
Dependencies: SLICE-001 and the owner/reviewer decision on error precedence.
Rollback: retain or restore the early validation if containment, error selection, or bounded discovery changes unexpectedly.
No claim of a 40% isolated speedup is permitted without new evidence.

### SLICE-005: Decide repository check concurrency from capacity evidence

Outcome: repository checking has an explicit, justified resource choice without changing public API/CLI defaults.
Links: REQ-001/005, AC-001/005, QA-006/008, DEC-006.

Compare the same frozen candidate at concurrency 1, 2, and 4 under the real intended local and CI budgets.
The audit's recommended package.json check:markdown argument is the initial candidate, not a preaccepted setting.
Keep one native batch coordinator and existing worker cleanup behavior.
Do not infer memory headroom from elapsed time or a parent-process heap sample.

Trace format:check, full/product verification, and applicable workflows to decide which invocations should share the repository resource policy.
Coordinate with the owner of the retained Prettier/verify.js work before touching either overlapping file.
If four workers exceed bounds or regress small/loaded hosts, keep serial behavior or propose another explicit measured count for owner acceptance.
Do not silently alter the installed-corpus driver's serial policy.

Proof: full serial/parallel result and formatted-byte parity, failure ordering, queued-work stopping, empty/small jobs, cancellation/crashes, and quiescent cleanup, with wall time and whole-tree memory at each count.
Focused checks: document-analysis-pool, document-analysis, quality, CLI, execution, and resource-limits.
Likely change if accepted: package.json; scripts/verify.js or an existing invocation seam only if the scope decision includes it.
Dependencies: SLICE-001; combined measurement follows integration of the chosen optimization slices.
Rollback: restore the repository invocation to concurrency 1; retain the public option and its existing semantics.

### SLICE-006: Resolve the EOF-buffer opportunity

Outcome: either a measured safe reduction in discarded read buffers or a documented decision to keep the simple current loop.
Links: REQ-001/006, AC-001/006, QA-007, DEC-007.

Quantify allocation churn for many tiny files and chunk-aligned large files before designing a change.
Compare bounded destination reuse/copying or another native read strategy against the current implementation.
Any reused scratch buffer must not remain aliased by retained chunks.
Do not stop at initial stat.size, assume a short read is EOF, allocate the entire configured maximum, or switch to unsafe buffers without an independently justified safety proof.

Proof: exact bytes/preimages, empty and chunk-boundary files, partial reads, growth/shrink, budget crossing, I/O exceptions and descriptor closure.
Measure copying, peak retention and CPU as well as eliminated allocations; reducing one EOF allocation can be outweighed by extra copies.
Focused checks: contracts, regular-file, replacement, and resource-limits.
Likely change: readDocument in src/documents.js only if the experiment supports it.
Dependencies: SLICE-001 and a selected read/ownership strategy; sequence after SLICE-004 because both share the same module.
Rollback: restore the prior read loop and assess any already affected file preimages through the ordinary replacement recovery route.

### SLICE-007: Integrate evidence and any accepted regression gate

Outcome: reviewers can determine both correctness and performance for one frozen candidate, and CI enforces only meaningful accepted gates.
Links: REQ-007/008/009/010, AC-007/008/009/010, QA-008/009/010, DEC-008/009/010.

Reuse current installed-package qualification, platform observation, retained corpus oracles, and CI artifact retention.
Keep the proposed repository 3,800 ms/250 MB limits separate from corpus qualification.
Before enforcing either, name the host profile, actual workload, concurrency, units, sampling method, expected exits, noise handling, responsible observer, and maintenance/rebaseline policy.
Do not put wall-time measurement in scripts/performance-check.mjs merely because the source suggested that filename; preserve its installed-API driver role unless a coherent redesign is accepted.

For dependency drift, first prove that existing analyzer identity checks and supported npm acquisition close the reported problem.
Only if a wider gap remains should the implementer assess native npm graph inspection and the handling of nested versions, optional platform packages, local links, bundled dependencies and omissions.
Avoid a naive top-level node_modules/* comparison.

Proof: focused failure cases for any changed observer/gate, current final verification profiles, independently reviewed candidate results, supported-platform installed-package evidence, and an explicit disposition for every included or deferred finding.
Likely seams: scripts/qualify-performance.py, performance observer tests, existing qualification integration/workflows, and performance documentation.
Dependencies: accepted optimization set, current route, calibrated criteria, and a frozen final source/tool/corpus manifest.
Recovery: abort promotion on invalid or regressing evidence; retain failed observations and revert an unaccepted repository-only gate rather than weakening product contracts.

## 8. Traceability and ordering

| Slice     | Requirements / acceptance / scenarios / decisions                        | Falsifiable proof                                             | Release and cleanup implication                                                    |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SLICE-001 | REQ-007/008; AC-007/008; QA-008/009; DEC-002/008                         | Admitted identities and reproducible raw baseline             | No release; retained manifests and controlled experiment copies                    |
| SLICE-002 | REQ-001/002; AC-001/002; QA-001/002; DEC-003                             | Exact Unicode diagnostics and measured conversion removal     | Isolated reversible source delta; remove scratch profiles after retention decision |
| SLICE-003 | REQ-001/003; AC-001/003; QA-003; DEC-004                                 | Same bytes/errors with observed emphasis work avoidance       | Independent source delta; preserve parser/memo authority                           |
| SLICE-004 | REQ-001/004; AC-001/004; QA-004/005; DEC-005                             | Real filesystem/Git safety and accepted error precedence      | Security review required by route; preserve all later validation                   |
| SLICE-005 | REQ-001/005; AC-001/005; QA-006/008; DEC-006                             | Serial/parallel parity plus capacity/cleanup evidence         | Repository-only choice; serial setting is configuration recovery                   |
| SLICE-006 | REQ-001/006; AC-001/006; QA-007; DEC-007                                 | Exact bounded read/preimage ownership and measured benefit    | Optional inclusion; close descriptors and remove only owned fixtures               |
| SLICE-007 | REQ-007/008/009/010; AC-007/008/009/010; QA-008/009/010; DEC-008/009/010 | Final candidate, accepted gates, retained failures and review | Delivery remains separately authorized; retain canonical evidence                  |

Preferred sequence: SLICE-001, then SLICE-002, SLICE-003, and the conditionally accepted SLICE-004; evaluate SLICE-005; include SLICE-006 only if justified; finish with SLICE-007.
This retains the source's first-three priority while placing evidence and safety admission ahead of optimization.

Read-only Unicode fixture design, emphasis fixture design, and benchmark methodology analysis are semantically independent.
No parallel agent work is authorized by this document.
If later authorized, writers still need distinct ownership and resolved integration contracts.
Selection and buffer changes share documents.js; package/verify changes also overlap the unrelated retained execution and must be serialized or explicitly coordinated.
The implementing coordinator owns the integrated result and final source identity.

## 9. Verification and benchmark protocol

### 9.1 Test oracles and mocking boundaries

The maintainer owns reviewed expected diagnostics, bytes, selection/failure contracts, and threshold decisions.
The test author derives expected Unicode positions and failure outcomes independently of the candidate algorithm.
Consumers own real deployment scope, configuration, capacity choices and acceptance.
An independent reviewer must resolve material path/error-order or resource-contract changes.

Use real mdast, ESLint, Prettier, Git and supported-platform execution for integration.
Mocks may control genuine external native I/O, worker failure, and filesystem-race boundaries.
Observation spies can demonstrate skipped work, but they do not replace semantic oracles.
Do not duplicate the proposed implementation in a test helper or regenerate frozen reports from the candidate.

### 9.2 Candidate commands, not executed during drafting

Use the actual HISEW-selected focused, affected and final profiles once execution is authorized and environment admission succeeds.
Current repository commands include:

```text
node --test test/disabled-advisories.test.js test/opinionated-defaults.test.js
node --test test/formatting.test.js test/document-memo.test.js
node --test test/central-selection.test.js test/contracts.test.js
node --test test/document-analysis-pool.test.js test/quality.test.js test/cli.test.js
node --test test/regular-file.test.js test/replacement.test.js test/resource-limits.test.js
npm run check:affected
npm run check:architecture
npm run check:product
npm run check:full
```

These are a selection menu tied to impact, not instructions to run every expensive profile after each edit.
The current full verifier includes product and JSON integration obligations; do not treat a focused Node suite as its substitute.
Resolve the actual affected-test invocation/base and current HISEW profile at execution time.
Do not dispatch hosted qualification or install dependencies merely to prepare this plan.

### 9.3 Measurement design

Freeze the same source inputs, policy, dependency/native identities, runtime, selected documents, diagnostic allowance, concurrency, host and cache conditions for each comparison.
A plan file or additional documentation can change a repository-wide Markdown workload; hash the complete selected corpus and rebaseline if it changes.
Do not trim historical findings or alter include/exclude rules to reproduce the source's timing.

Use fresh processes and paired AB/BA order, with declared warmup/cache policy.
Begin with a bounded experiment; extend to 15–30 pairs when noise or decision significance requires it, consistent with the existing performance plan.
Retain each observation, unexpected exit, timeout and invalid attempt with its cause.
Report sample count, mean/median, spread, effect size and uncertainty rather than only the best run.
Never relabel five warm runs as a stable runner p95.

Separate instrumentation from uninstrumented timing.
Capture actual worker CPU/heap/GC, parse/cache/walk counts, conversion counts, selectedPath/syscall counts where observable, reads/copies, native calls, worker count, wall/user/kernel time and appropriate process-tree memory.
Parent-only heapUsed cannot establish total memory.
For Node buffers include external/array-buffer retention where available, with metric boundaries stated.

Measure four distinct axes: baseline serial; each optimization independently; the selected combined candidate serial; and that same candidate at concurrency 2/4.
Use both eligible and ineligible emphasis documents, prose with exemptions, deep inventories, tiny-file batches and near-limit inputs.
A speedup in a microbenchmark must not hide a regression in full checking or a supported Node/runtime profile.
Expected quality exit 1 can be a valid timing sample when findings match the oracle; operation failure exit 2 cannot be counted as a successful speedup.

### 9.4 Acceptance gates

| Gate                                                                       | Status and required handling                                                                                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete results, selection, bytes, no-write checks and failure semantics  | Mandatory compatibility evidence for the affected paths                                                                                              |
| Source's 58%, 18-fold, approximately 400 ms, 40.2%, 41.7% and 57.0% claims | Hypotheses to reproduce or refute; not universal acceptance promises                                                                                 |
| Source's formatting-suite target below seven seconds                       | Diagnostic experiment on the frozen reference host, not a portable unit-test timeout                                                                 |
| Source's repository p95 at most 3,800 ms                                   | Proposed; blocked on runner/workload/method calibration and owner acceptance                                                                         |
| Source's peak tree memory at most 250 MB, candidate below 210 MB           | Proposed and unverified; define decimal MB versus MiB and platform-specific measure before adoption                                                  |
| Existing public corpus gate                                                | Preserve six valid consecutive full observations per frozen corpus/platform; nearest-rank observed p95 at most 30 seconds and memory at most 512 MiB |
| Windows corpus memory                                                      | Peak Job Object committed bytes including driver and descendants                                                                                     |
| Linux corpus memory                                                        | Sampled whole-process-tree/process-group RSS under existing observer semantics, with missed peaks/shared-page limitations declared                   |
| Correctness oracle admission                                               | Missing/corrupt/mismatched retained reports deny qualification; do not rewrite them to pass                                                          |
| Installation identity                                                      | Lock/install mismatch invalidates the applicable tooling evidence; repair through supported acquisition                                              |

The existing corpus gates and measurements are specified by the repository's accepted performance documents and qualifier.
Six observations make nearest-rank observed p95 the sample maximum, not a population-percentile guarantee.
Repository and corpus gates can coexist only with separate workload identities and clear owners.

## 10. Compatibility, security, observability, and operational recovery

### 10.1 Compatibility and migration

No public API, result/configuration schema, data format, preset, native protocol, package split, persistent cache, database or backfill is intended.
No consumer migration is required for the scalar/guard changes if behavioral parity holds.
Changing a repository script's explicit resource choice does not authorize changing a consumer default.
If any error shape/order is an intentional externally observable change, stop and obtain compatibility/versioning acceptance first.

The only anticipated environment reconciliation is installing the already accepted lock graph in an authorized isolated context.
According to [npm ci documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/), it validates package/lock agreement, installs the whole project, and replaces an existing node_modules directory.
That explains why it must not be used casually against another execution's environment.
Follow the repository's established script-disabled acquisition/native admission controls and recheck identity afterward.

On interruption, preserve the exact source/tool/corpus manifest and completed evidence.
Resume only after checking ownership, retained processes, input identities and proof applicability.
A changed generation or environment does not inherit a prior pass automatically.
Do not combine pre-change and post-change samples into a single baseline.

### 10.2 Security and privacy ownership

The selected maintainer/security reviewer owns assessment of PERF-03's validation timing, PERF-05's bounded read/ownership, and PERF-04's worker/resource changes.
No new native component is selected, but existing Snapper identity, process isolation, staging and cleanup obligations remain.
Do not infer native security approval from JavaScript tests.

Preserve root containment, symlink/junction restrictions, regular-file checks, exact preimage ownership, read-only checking, guarded writes and meaningful failure exits.
Do not add global realpath caches or remove later validation because discovery once passed.
No remote profiling uploads, private corpus publication, external messages, or telemetry service are authorized.
Retain only task-relevant measurements and keep document bodies/private paths out of published summaries unless specifically permitted.

### 10.3 Observability and production acceptance

The source leaves live HTTP/batch-worker telemetry unspecified.
This package's CLI/library context does not justify inventing a production service or unattended monitor.
The implementing coordinator must identify the actual owner who observes the first authorized repository/CI use.

Required questions: which stage improves, how often is each guard eligible, do underscore-rich documents regress, does selection save meaningful work, how does memory scale with workers, do failures/cleanup change, and do real repository checks retain complete results?
Use existing observation/evidence outputs where possible.
New production counters or public result fields would require separate compatibility acceptance.
Stop claiming operational benefit when only a microbenchmark has improved.

### 10.4 Rollout, abort, and recovery

Before merge or release, each included change must have its accepted route, focused and affected proof, independent review where required, and final verification against the frozen candidate.
Run supported-platform installed-package/corpus qualification at the actual delivery boundary selected by the current release policy.
Recheck release/version/publication authority; this plan does not lift any hold or choose a version.

Prefer separable source changes for scalar traversal, emphasis guard, selection, script concurrency and optional buffer work.
The observer aborts rollout on unexplained result/byte drift, unsafe path admission, altered unaccepted failure precedence, unexpected operation failures, orphaned workers, memory breach, or non-reproducible claimed benefit.
An unqualified new threshold is not grounds for weakening existing controls.

Before publication, revert the affected isolated source/configuration delta and rerun impacted verification.
For script concurrency, restoring the explicit serial invocation is an immediate configuration recovery candidate.
For formatting corruption, retain and restore authorized per-file preimages through the existing guarded mechanism; a batch is not transactional.
After publication, use an assessed supported fix or restrict the affected operation, and coordinate consumer acceptance.
Do not rewrite immutable archives or assume an older downloadable version is still supported or safe.
The accepted historical restoration-within-60-minutes obligation remains applicable where the current pilot policy requires it; this draft supplies no new measured restoration claim.

Keep canonical evidence in the current external HISEW evidence store once a new execution is admitted.
Do not invent execution IDs, fabricate receipts or add temporary profiler outputs under historical repository-local workflow folders.
Dispose only owned scratch corpora, profiles and manifests according to accepted retention; preserve raw failed observations and independent oracle history.
The original source audit and this draft remain available for review.

## 11. Original open decisions and cheapest discriminating evidence

The table preserves the draft's original questions.
The linked execution report records their implementation dispositions and the remaining delivery boundary.

| ID       | Decision owner and unresolved issue                                                            | Minimum evidence / effect on implementation                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OPEN-001 | Owner: preserve, continue or close the retained worktree execution; current choice is preserve | A later explicit ownership/placement decision is required before repository placement or new execution work                                |
| OPEN-002 | Owner/router: risk, scope, REQ/AC/QA/DEC acceptance and security review                        | Review this dossier; no accepted implementation route is inferred                                                                          |
| OPEN-003 | Implementer: provenance of the source's measurements                                           | Obtain original manifests/profiles if available; otherwise reproduce a new clearly labeled current baseline                                |
| OPEN-004 | Maintainer: installed graph mismatch                                                           | Read current lock/install identities, perform authorized isolated acquisition, and observe existing identity admission                     |
| OPEN-005 | Maintainer/security reviewer: error precedence for selection                                   | Small real fixtures with multiple missing/unsafe paths and selection-byte exhaustion; blocks PERF-03 deletion if semantics remain disputed |
| OPEN-006 | Maintainer: emphasis memo lifecycle                                                            | Trace all current callers and test the relevant valid/disposed states; determine which failures are supported behavior                     |
| OPEN-007 | Owner/CI maintainer: repository concurrency and verifier scope                                 | Same-candidate 1/2/4 result/capacity matrix plus inspection of invocation consumers; blocks an unmeasured default script change            |
| OPEN-008 | Implementer/reviewer: safe EOF strategy                                                        | Tiny-file/chunk-boundary allocation experiment and ownership/growth proof; may end in no change                                            |
| OPEN-009 | Owner/CI maintainer: 3,800 ms and 250 MB proposals                                             | Defined runner/corpus/units, repeated data, noise policy and observed headroom; blocks new enforced thresholds                             |
| OPEN-010 | Maintainer: residual general dependency-sync gap                                               | Show a failure not already prevented by npm acquisition and analyzerIdentity; otherwise omit custom gate                                   |
| OPEN-011 | Release owner: future delivery, supported versions and observer                                | Current release policy/hold, accepted candidate and named observer; no publication or consumer change follows from this draft              |
| OPEN-012 | Maintainer: actual missing telemetry/corpus needs                                              | Identify intended operational context and authorized immutable corpus acquisition; no speculative service work                             |

Re-plan or rebaseline when source/lock/native/runtime/corpus identity changes, a new plan changes selected repository content, a correctness oracle changes, path/error semantics prove incompatible, a fast path alters memo lifecycle, measured memory contradicts concurrency assumptions, or new code would duplicate existing policy.
Also re-plan if the read optimization requires a larger ownership redesign, any public default/schema changes, an alternative runtime/dependency is proposed, or a benchmark target can only be met by suppressing findings or raising limits.

## 12. Source coverage and handoff completeness

| Source content                                                                                     | Preserved treatment                                                                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Opening action log and reset claim                                                                 | Section 3.1, attributed without inventing execution evidence                                      |
| Executive diagnosis, ranked bottlenecks and immediate sequence                                     | Sections 2, 3.4, 7 and 8                                                                          |
| Environment, commands, document/diagnostic counts, phase times and heap numbers                    | Sections 3.1 and 3.2                                                                              |
| PERF-01..05 classifications, risks, effort and recommendations                                     | Section 3.4 and corresponding slices                                                              |
| Complexity discussion                                                                              | Sections 2 and 3.5, with slice-level cost/measurement requirements                                |
| Detailed PERF-01/02/03 findings and three illustrative patches                                     | Patch intent, narrow seam, proof and rollback in SLICE-002..004; exact source retained externally |
| Five-run data, means and percentage reductions                                                     | Section 3.3 in full                                                                               |
| Unicode, emphasis bypass and missing-inventory test suggestions                                    | QA-001..005, slice proofs and independent-oracle rules                                            |
| 3,800 ms, 250 MB, below-210-MB and dependency-sync proposals                                       | Sections 9.4 and 11, with explicit acceptance gaps                                                |
| Roadmap and top-three success claims, including historical test counts and under-seven-second goal | Sections 2, 3, 7, 8 and 9                                                                         |
| Missing production telemetry and local corpus clones                                               | Sections 3.1, 10.3 and OPEN-012; existing corpus infrastructure reconciled                        |
| Split replacement and worker-boundary exclusions                                                   | Section 2.2 item 10 and section 4.1                                                               |
| Source's "no risk" and constant-time claims                                                        | Preserved as attributed claims with explicit corrections, not silently adopted                    |

The handoff is complete as a draft when all source findings have a disposition, each selected slice has a proof and recovery path, current facts are separated from reported measurements, and unresolved decisions remain visible.
The draft boundary above records the original preparation context.
The execution report records the later accepted implementation and verification separately; release and package publication require their own authority.
