# Release qualification repair evidence

The owner authorized diagnosis and repair of the install timeout, performance failure and recipient dependency advisory, followed by nonpublishing release qualification.
HISEW execution `75f78ddd-67a5-47f1-adcc-8c52c6486235` carries this R2 scope.
The signed baseline is `ff9d7099bd24e01002d74f8197b59e58be79adcb`.
The earlier [release assurance research](2026-10-16-release-publishing-assurance-evidence.md) remains historical evidence.
Direct-main delivery follows passing local checks; no PR, version bump, tag, registry staging, release or promotion is authorized here.

## Failure and limit assessment

Manual qualification run `38961318924` at `a74d46f0ba0c8f469b417c2155417ccebba5121c` failed a Windows Node 26.12.0 fresh installation after 120068 ms.
Its retained error does not identify the stalled network request, so a particular registry incident is not established.
[npm's documented request timeout](https://docs.npmjs.com/cli/v12/using-npm/config/) defaults to 300000 ms, longer than this project's 120000-ms process deadline.
That mismatch prevents native recovery from a stalled request before the outer deadline.
The baseline fresh anonymous recipient installation on this workstation took 8748 ms.
A native HTTP fixture that stalls both initial metadata requests reproduced the timeout at 30012 ms under a deliberately tighter test deadline.
With a 15000-ms fetch timeout, two retries, factor 2 and 1000-to-4000-ms backoff, it passed in 16672 ms.
No outer install retry or timeout increase was introduced.
Persistent failures still fail the command.

The Windows reference-consumer job retained all six OwlAPI durations: 30567.6402, 31798.1364, 28703.8165, 24818.9938, 26173.5267 and 27541.7756 ms.
Two exceeded 30000 ms; all selected 63 documents and stayed below 512 MiB.
Replaying the actual qualification assertion against these observations reproduced the performance failure.
Profiling the full pinned corpus locally found repeated Markdown parsing and garbage collection in the document worker, including a later literal-line classification parse after the document-local memo had been discarded.
The candidate carries only that classification forward, bound to exact output bytes and syntax; changed or malformed evidence falls back to parsing.
The independent native prose check, complete diagnostics, source selection and ordering remain required.
Classification bytes count against the existing prepared-document retention budget.
An experimental change to semantic comparison was removed after inconclusive timing results.

Neither 120 seconds nor 30 seconds is a universal best-practice value.
[AWS timeout guidance](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) recommends choosing deadlines from observed latency and acceptable false-timeout rates, with bounded recovery.
[GitHub documents runner resources and changing hosted images](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), rather than promising a task duration.
The install ceiling is reasonable as a bounded acquisition gate with recoverable requests, subject to continued measurement.
The performance ceiling is an explicit project acceptance budget for these frozen corpora; six observations do not establish a population p95.
Both limits, the 512-MiB process-tree gate and the 128-MiB worker heap remain unchanged.
Local results cannot substitute for qualification on the exact hosted candidate.

## Recipient dependency boundary

[GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) affects KaTeX versions from 0.11.0 through versions below 0.18.2.
The producer override to 0.19.0 did not constrain a fresh recipient; the baseline native audit reported four low-severity findings across that dependency chain.
Public Markdown Quality API exploit reachability was not established: its parser does not enable math HTML rendering.
The concrete repair obligation is the installed recipient graph, with direct inherited-option malicious-input probes as additional validation.

The core package bundles ESLint Markdown's runtime closure through native npm packaging.
An offline `npm ci` admits frozen registry artifacts using npm integrity verification and disabled scripts.
The sole vendored metadata change declares KaTeX 0.19.0 in `micromark-extension-math` 3.1.0.
This is necessary because npm 12 correctly rejects a bundle with override-induced invalid dependency edges (`EBUNDLEOVERRIDE`), while [root overrides](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#overrides) do not apply to consumers.
The published root manifest has no override, and `npm ls --all` must find no invalid edges.
An experiment with the repaired closure installed with zero audit findings and retained working math rendering.
The actual product archive subsequently installed in a fresh anonymous consumer in 8096 ms, with zero audit findings, a valid native dependency tree, successful offline frozen-lock reinstallation and passing malicious-input/control probes.
The native Syft inventory reconciled all 79 bundled packages plus the core package, with 160 package and metadata-file components; native CycloneDX 1.7 validation passed.
These local checks are not hosted release evidence.

Native package inventories bind the source lock, all bundled files, registry origins, licenses and repair hashes.
Executable third-party source remains unchanged.
Original notices are retained, with the missing `format` 0.2.2 MIT text restored unchanged from its pinned upstream commit, as recorded in [third-party notices](../../THIRD-PARTY-NOTICES.md).
Architecture and packing reject missing, unexpected or changed bundle members.
The distribution SBOM must reconcile the bundled packages, while recipient SBOMs retain their separate installed-graph scope.
Remove the repair when a maintained upstream range and the same qualification checks make bundling unnecessary.

## Validation record

The original qualifier passed all twelve fresh-process observations for the actual installed candidate on this Windows workstation, with full incumbent diagnostic and selected-source parity.
Each comparison below contains all six observations, without retries; acquisition and installation are outside the measurement.

| Corpus and candidate | Median time (ms) | Observed maximum (ms) | Peak Windows Job memory (MiB) |
| --- | ---: | ---: | ---: |
| OwlAPI baseline | 10914.06 | 12434.68 | 413.53 |
| OwlAPI repaired recipient | 9922.97 | 10087.15 | 398.34 |
| WebVOWL baseline | 7744.59 | 8330.22 | 349.46 |
| WebVOWL repaired recipient | 7587.16 | 8356.28 | 373.73 |

OwlAPI's median improved by about 9%; WebVOWL's maximum was essentially unchanged and its memory increased within the existing budget.
These are local observations, not a causal claim about hosted machine variance or a guarantee of future timings.

Focused document-analysis, memo and native-check tests passed after classification reuse.
Fresh packed root and isolated consumer tests exercise installation without scripts or overrides, dependency validity, offline reinstallation, byte identity and public behavior.
Security probes reject inherited `trust`/`strict` options for both JavaScript hyperlinks and images while preserving explicitly trusted HTTPS links and inline/display math.
Final local verification, independent review and exact-source hosted qualification remain separate gates recorded by HISEW and GitHub; none is implied by this diagnosis record.

Independent review identified and the candidate repaired three integration defects.
Core archive admission now requires the complete packer-declared member set, sizes and hashes, within the existing architecture envelope of 4096 files, 64 MiB total and 8 MiB per file.
The native-package reader keeps its original 100-member limit; compressed-size, expansion, unsafe-path, link and case-collision checks still apply.
SBOM composition preserves location-distinct copies of the same package version and all dependency edges; native hierarchical composition retained all 160 core components and reconciled successfully.
The registry fixture stalls the first request of each metadata representation, so npm versions that request metadata serially can demonstrate recovery under the same 30-second test deadline.
The production 120-second deadline is unchanged.
The first full verification passed 513 Node tests, skipped three unsupported host fixtures, passed 27 Python tests and 14 JSON adapter tests, then correctly failed at the oversized-core admission boundary.
After the focused repairs, actual packed JSON qualification passed; final full verification must cover the repaired tree.

The unanchored `__pycache__/` ignore rule covers Python bytecode caches at every depth.
The observed `scripts/__pycache__/qualify-performance.cpython-315.pyc` was untracked; no committed file needed removal.
