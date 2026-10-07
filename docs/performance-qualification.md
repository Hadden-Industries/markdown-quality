# Performance candidate qualification

Date: 2026-10-06.
Candidate tuple: 1.0.3; publication and pilot adoption remain separate decisions.

The [accepted performance plan](plans/performance-implementation-plan.md) selects exact document reuse, bounded native checks and independent list rechecks first.
The conditional check-first slice is included because it demonstrated additional benefit with complete result and formatted-byte parity.
The implementation retains one analysis worker, the current native executables and dependency graph, AGPL-3.0-only, and the existing `authored-gfm@1` whitespace and local-link policies.

## Windows observations

The current-policy baseline is source `df9f6650011fda4f66c1ce15ef3c118c2f34208f`, rather than the older published whitespace policy.
All observations used Node 24.21.0, fresh processes, warm filesystem caches, complete frozen pilot trees and no installation or acquisition in the measured operation.
Six paired blocks per corpus alternated baseline/candidate order.
All observations, setup failures, source/corpus manifests and full result JSON remain in the task's external evidence store under `performance-implementation-20261006`.

| Comparison                                              | OwlAPI mean paired reduction | WebVOWL mean paired reduction |
| ------------------------------------------------------- | ---------------------------: | ----------------------------: |
| Memo and native batching versus current-policy baseline |                        36.5% |                         38.0% |
| Conditional check-first versus memo and batching        |                        12.9% |                         16.8% |

Percentile bootstrap intervals for the first comparison were 35.3–37.5% and 34.3–40.3%; intervals for the second were 9.3–16.0% and 11.2–22.3%.
These use 10,000 resamples with a fixed seed and six paired blocks; they describe these observations rather than a population guarantee.
Host load was higher in the first four check-first blocks; all samples were retained.
The two experiments have different host conditions, so their reductions must not be added or presented as a direct combined paired measurement.

The maximum observed check-first duration was 16.980 seconds for OwlAPI and 12.851 seconds for WebVOWL.
Peak Windows Job Object committed memory, including the fresh Python driver and all descendants, was 470,163,456 and 447,041,536 bytes respectively.
Both fit the accepted 30-second observed p95 and 512 MiB platform-specific budgets.
Six observations make the nearest-rank observed p95 the sample maximum; this is not a population percentile estimate.

Instrumented runs separately observed the actual analysis worker and retained its CPU and heap profiles.
Owned parse counts fell from 196 to 68 for OwlAPI and 208 to 75 for WebVOWL.
Native calls fell from 190 to 19 and 194 to 27, including complete independent list/continuation rechecks.
The check-first shortcut applied to 57 of 63 and 59 of 67 selected documents.
Actual native-stable reports still contribute their findings; native stability alone never authorizes suppression of prose diagnostics.
Whole-process counts fell from 382/390 to 46/62, including the measurement driver and Windows staging-access setup.

## Correctness and corpus identity

Every paired check produced the same complete public JSON bytes as the strict-policy baseline.
OwlAPI's three retained findings are a layout finding and trailing whitespace at lines 350 and 357 of its pinned Java CI rights review.
WebVOWL's four findings are a layout finding and trailing whitespace at lines 3–5 of its pre-registry decoupling design.
These are genuine existing strict-policy violations, rather than clean-corpus or false-positive claims.

Full baseline/candidate formatting on separate owned copies produced identical public results and all formatted file bytes across 4,386 OwlAPI and 2,466 WebVOWL files.
Only those two documents changed; a second formatting pass made no writes.
Original frozen corpora and consumer checkouts were preserved.
Fault tests exercise protocol attribution, unknown/duplicate findings, native/process bounds, staging configuration and identity changes, cleanup refusal, exhausted document budgets, and cancellation.
Existing semantic, literal, whitespace, physical local-link and replacement regression oracles remain active.

## Packed and hosted qualification

The [transported candidate workflow](../.github/workflows/candidate.yml) packs one exact tuple and installs those same archives on Windows x64 and glibc Linux x64 in both root and isolated layouts.
Its full-corpus performance checks use complete public OwlAPI and WebVOWL revisions `073beefb7805130bc0452472d1a9c801471fbaf1` and `b0fe00404eedf12a59084871863500869474bd3a` as data.
No consumer code, configuration JavaScript, lifecycle scripts or private pilot overlay is executed or published.
Those public corpora differ from the separately frozen pilot proposals in nine/two metadata paths and one selected OwlAPI Markdown file; the Windows paired evidence above remains a separate workload.

The maintainer observer records six full runs per corpus/platform, every raw result, source revision and physical tracked-file manifest, before/after corpus identity, descendant quiescence, CPU and platform-specific memory measurements.
Authored resource reports, qualification summaries and driver JSON status explicitly use UTF-8 with LF on every platform.
Raw child stdout and stderr retain the actual captured bytes; result identities hash those retained bytes.
Each result must match the independently frozen current-policy baseline oracle, allowing only the package version to differ.
It enforces the existing accepted timing and memory budgets and retains observations on failure without automatic retries.
Windows uses Job Object peak committed bytes; Linux samples summed process-group RSS every 10 ms, which may miss brief peaks and count shared pages more than once.
These metrics are declared independently and must not be compared as identical measures.
Hosted receipts and actual independent review reports gate delivery; this source record does not claim that merely defining the workflow qualifies the archives.

## Selected and deferred work

The shipped candidate contains request-local owned syntax/layout reuse, private ephemeral external staging, bounded whole-document and list-item native checking, suppressed discarded long-line advisories, and the exact-input check-first shortcut.
Changing or unproven inputs retain the existing guarded formatting, semantic preservation and convergence pipeline.
Private staging is cleaned and the worker stopped before document replacement; inability to establish private staging retains the stdin path.
Abrupt host termination can leave private temporary files, as described in the [consumer guide](consumer-guide.md).

Further marker/layout allocation work is deferred because the remaining measured cost includes maintained formatter/linter parsing; no new marker algorithm is justified here.
A second analysis worker is not included: the largest observed Windows tree leaves only about 64 MiB under the accepted memory budget, less than one additional worker's configured heap allowance before its other allocations.
Lower-order selection/semantic/bookkeeping changes and compilation remain separate evidence-led follow-ups.
Recovery is the retained serial/per-document source baseline and each consumer's accepted preimage, rather than rewriting existing published archives or changing a pinned consumer via `latest`.
