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

## Hosted follow-up: offline bundle acquisition

The first exact-commit manual run, `38973289280` at `994b660ffe163989fec47e0b1ea27edc1f120049`, retained a further Windows Node 24.22.0 failure: native offline `npm ci` in bundle staging exceeded the unchanged 120000 ms deadline (120140 ms observed).
This is separate from the original stalled registry read; offline acquisition cannot be repaired by network retry settings.
The staging manifest unnecessarily requested every production dependency, although the archive bundles only the `@eslint/markdown` closure.
The revised staging manifest requests only that declared root while retaining the original complete producer lockfile, native npm integrity admission, fixed override, disabled scripts and offline mode.
The final consumer manifest still declares every original runtime dependency; the existing actual archive, root/isolated recipient, audit, SBOM and inventory gates remain mandatory.
A focused native probe installed 79 packages including KaTeX 0.19.0 in 812 ms; it did not install unrelated ESLint, Prettier or Ajv.
The new regression test checks that exclusion, the unchanged lock bytes and preservation of the complete final consumer dependencies.
Hosted qualification of this follow-up remains a separate required result; the earlier failed run is not a pass.

## Hosted follow-up: test lifecycle and SBOM interoperability

The same run stopped older Windows product lanes after the native tests and reached the existing ten-minute suite deadline without reporting the registry fixture result.
An isolated Node 22.13.0 distribution, verified against the official SHA-256 manifest, passed the stalled-read fixture both alone and during a diagnostic full-suite invocation.
The hosted hang therefore remains a separate confirmation obligation.
A minimized child-process probe did establish a cleanup defect: registering an exit listener after the child has already exited leaves cleanup waiting indefinitely.
The fixture now captures completion immediately, bounds startup to five seconds, reports startup stderr and tests premature exit explicitly.
The actual install recovery still has its original thirty-second fixture deadline and per-representation stalled-read assertions.
The normal suite deadline and production install deadline are unchanged.
The diagnostic full-suite invocation was not full verification: its shorter per-file diagnostic timeout interrupted packaging, and it omitted the approved Python environment; a concurrent source edit also invalidated architecture snapshot identity.
Only the subsequent frozen-candidate native full profile can establish that result.

The exact-source CodeQL gate correctly rejected one incomplete string-sanitization result in the native package PURL builder.
The builder now encodes each namespace/name segment and the version with the native URI encoder, retaining slash separators and scoped-package identity.
This repairs the representation without suppressing the finding or relaxing the zero-result gate; a fresh hosted CodeQL result remains required.

Native npm CycloneDX output copied Windows resolved filesystem specs such as `file:D:\\a\\...` verbatim into distribution URLs.
The strict CycloneDX 1.5 validator rejected those backslashes.
Inspection of [npm's native serializer](https://github.com/npm/cli/blob/latest/lib/utils/sbom-cyclonedx.js) confirms that it emits `node.resolved` directly.
Native probes showed that forward-slash and file-URL input spellings still produce Windows paths; percent-encoded spaces also prevented npm installation.
The correction therefore leaves npm installation and its raw SBOM intact, then binds only the core and active native archive references to file URLs using Node's `pathToFileURL`.
Before that conversion, package/version/SHA-512 identity and the exact transported archive path must match; missing, duplicated or substituted references fail.
This follows the [file URI syntax and encoding boundary](https://www.rfc-editor.org/rfc/rfc8089.html), with no component, license, hash or dependency-edge removal.
Both failed Windows recipient reports from the hosted run passed native CycloneDX validation after replaying this binding against their exact candidate manifest.
Native command failures now expose bounded stdout as well as stderr, because CycloneDX writes its validation diagnosis to stdout.

## Hosted performance and artifact retention

Both performance jobs in run `38973289280` passed the unchanged limits and full parity checks.
The six Linux OwlAPI observations had a maximum of 17290.80 ms and peak process-tree memory of 482848768 bytes; WebVOWL had a maximum of 12656.43 ms and peak memory of 417710080 bytes.
These are observed finite-sample results, not population percentile estimates.
The overall release qualification still failed on the independent product, security and distribution gates above.

The owner's artifact question repeats the earlier preference to keep diagnostic text in logs and concise job summaries.
GitHub supports [artifacts for retained files and job handoff](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) and [job summaries for readable results](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary); it does not require a downloadable document for each check.
This repository's collector does consume exact package archives, qualification records and security/SBOM evidence, so those uses require a file contract.
However, the Linux performance upload also contained 231389341 bytes of copied OwlAPI/WebVOWL input trees that the collector never reads; it only retains top-level performance files.
That unnecessary retention should be removed in a scoped evidence-contract follow-up, applying the existing [compact evidence design](../plans/compact-qualification-evidence.md).
This repair does not redesign artifact retention or replace machine-consumed evidence with log scraping.
