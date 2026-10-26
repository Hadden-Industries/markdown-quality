# JavaScript performance implementation: 26 October 2026

The [accepted plan](plans/2026-10-26-javascript-performance-improvements-implementation-plan.draft.md) is implemented with two small work-avoidance changes and explicit no-change decisions for the conditional proposals.
Public diagnostics, formatting policy, default concurrency, selection safety, failure order and resource ceilings remain the compatibility contract.
These experiments do not reproduce the source audit's claimed whole-check speedup.

## Implementation decisions

| Finding                   | Result                                                                                    | Reason                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-01                   | Derive UTF-16 width from the numeric code point                                           | Avoid conversion to a string while retaining the first 121st-code-point position, exemptions and disabled-rule behavior                                                                      |
| PERF-02                   | Skip emphasis canonicalization when no underscore occurs and the memo is absent or active | Avoid a parse/cache lookup and AST walk; disposed or invalid memos continue through the existing failure path                                                                                |
| PERF-03                   | Preserve both selection validations                                                       | Deleting the accounting check changes which missing member fails first and can replace MISSING_DOCUMENT with SELECTION_LIMIT; later validation also retains its fresh filesystem observation |
| PERF-04                   | Keep repository and full verification serial                                              | Two and four workers improve local latency but exceed the existing 512 MiB corpus envelope in this experiment; hosted capacity is unqualified                                                |
| PERF-05                   | Keep the existing read loop                                                               | A scratch-buffer/copy prototype adds copying and showed inconsistent gains; it does not justify a new read-ownership strategy                                                                |
| Proposed repository gates | Add no timing or memory gate                                                              | The proposed 3,800 ms/250 MB limits lack an accepted runner baseline and are incompatible with these observations                                                                            |
| Dependency installation   | Use the locked graph through script-disabled npm ci                                       | Existing analyzerIdentity admits dependency-cruiser 18.7.0; no residual gap justified another graph validator or a lockfile change                                                           |

All five findings and seven slices have a disposition.
No dependency upgrade, new benchmark service, consumer change or public schema change is included.
The installed-corpus driver and existing qualification gates retain their roles.

## Frozen experimental workload

The independent baseline is plan checkpoint 4818e535244475aa068b03a0be998e93314f0b49, whose product code equals 7e24e6f806d9d532c1425f76c52fdd0923af985a.
It contains 32 selected Markdown documents and 2,357 diagnostics: one expected layout error in the unformatted draft plan and 2,356 informational findings.
The baseline quality exit is therefore 1, with no operational errors or writes.
Every candidate/concurrency observation matched the complete baseline result and every selected document hash exactly.
The same frozen clone supplied the corpus to both source versions; later report/plan formatting changes are outside these timing claims.

Environment: Windows x64 10.0.26300, Intel Core i9-12900K, 24 logical processors, Node 24.22.1, V8 13.6.233.17-node.58, locked dependencies installed with lifecycle scripts disabled.
Snapper 0.11.9 executable SHA-256: 11f8a035c85a3df479b07338b52b438e9e0160c3c0e7c1f3558bb4579230a9d2.
This environment differs from the source audit and does not establish Linux, other supported Node versions or hosted-runner performance.

Fresh-process serial pairs used alternating AB/BA order, warm filesystem caches, one prior untimed baseline check and five observations per source.
The same integrated candidate was then checked three times each at concurrency two and four.
Timing excludes experiment result serialization; memory reuses assets/qualification/observe.py Windows Job observation and includes its Python driver and descendants.
Each sample used a fresh Job; every sample had zero active descendants on completion.

| Source / concurrency     | Samples | Mean checker ms |          Range ms | Maximum Job committed MiB |
| ------------------------ | ------: | --------------: | ----------------: | ------------------------: |
| Baseline / 1             |       5 |        4,109.48 | 3,808.33–4,238.01 |                    342.07 |
| Integrated candidate / 1 |       5 |        4,148.52 | 3,986.30–4,372.26 |                    350.04 |
| Integrated candidate / 2 |       3 |        2,738.51 | 2,524.54–2,874.81 |                    542.19 |
| Integrated candidate / 4 |       3 |        2,295.19 | 2,189.23–2,456.26 |                    957.16 |

The serial mean is 0.95% slower in this small noisy sample; there is no demonstrated whole-check improvement or population-percentile claim.
The corpus 512 MiB gate is a comparison guardrail here, not a newly imposed repository threshold.
Keeping serial execution avoids accepting increased memory without a calibrated local and CI budget.

## Focused experiments and proof

Seven alternating worker rounds, ten calls per observation with a cached real parse, compared the changed functions separately from process startup and parsing.
For 1,000 long emoji paragraphs, mean advisory time was 34.00 ms before and 18.45 ms after.
For 1,000 underscore-free paragraphs, mean emphasis time was 3.65 ms before and 0.03 ms after; the candidate performed zero parse-cache lookups.
For underscore-bearing paragraphs, means were 3.98 ms and 5.20 ms with broad overlapping ranges; these small measurements do not establish a stable regression or portable speedup.
Eleven of the 32 repository documents were eligible for the emphasis guard.
Heap-used differences were retained as endpoint observations, not allocation counts or whole-tree peaks.
Separate instrumented complete checks retained CPU and sampled heap profiles from both the main thread and the actual analysis worker; instrumentation was excluded from timing samples.

The selection deletion was tested in the disposable baseline clone against two absent inventory members and an exhausted path-byte allowance.
The regression test failed at the intended missing-member-order assertion; production selection was left intact.
The buffer prototype used real reads of 0, 7, 65,536 and 131,072 bytes, five alternating rounds of 200 reads, and exact content/backing-store ownership assertions.
Mean baseline/prototype times in milliseconds were 48.06/51.30, 111.70/114.06, 132.69/124.31 and 138.42/160.13 respectively.
This limited prototype does not prove partial-read, growth or I/O-failure safety for a replacement strategy; no replacement was adopted.

The maintained regressions cover 119/120/121 code points, emoji, supplementary CJK, combining characters, accepted lone surrogates, inline-code exemptions, LF/CRLF/CR, exact UTF-16 columns, no conversion work, emphasis parse avoidance, underscore literals and disposed/invalid memo failures.
The conversion test observed 121 calls before the scalar change; the emphasis test observed four unnecessary parses before its guard.
After both changes, the focused formatting, memo, advisory and opinionated-default suites passed all 38 tests.
The new inventory precedence case passed through both direct and bounded APIs.

Raw experiments, original complete results, failed controls, profiles and identities are retained with HISEW execution 767493e5-ee3b-4ac6-a9c1-67c06a892e5b in the external evidence store.
They are supporting engineering observations rather than installed-package qualification or release approval.
Final external reviews are scoped to the consolidated implementation; final full verification follows resolution of their findings.
Supported-platform installed-package/corpus qualification remains required at the applicable package-delivery boundary.

## Recovery and observation

The scalar conversion and emphasis guard can each be reverted independently without a migration.
The regression cases should remain when diagnosing a reversal.
No new scratch dependency is required by builds or tests.
The maintainer owns observation of the next authorized CI or repository use and should rebaseline after any corpus, runtime, native tool or lockfile change.
A package release, version change and consumer rollout are separate decisions.
