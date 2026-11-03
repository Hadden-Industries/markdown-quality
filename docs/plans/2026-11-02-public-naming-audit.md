# Public naming audit and implementation dispositions

Date: 2026-11-02, Europe/Bucharest.
Source: `b67601c0d027307fb15416392a91af650335d14e`, package `1.0.3`.
Status: source-backed recommendations incorporated into revision 4 of the [implementation plan](2026-11-02-zero-config-opinionated-policy-implementation-plan.md); no product interfaces changed by this audit.

## 1. Method, coverage and precedent

Compare each name with its owner, accepted inputs, effects, output representation, scope and units at actual use sites.
A short established name is acceptable when its context supplies the meaning; this is not a campaign to lengthen every identifier.
The [Swift API guidelines](https://www.swift.org/documentation/api-design-guidelines/) support clarity at use sites and distinguishing effects; their language-specific spelling conventions are not imposed on JavaScript.
HISEW NAM-01 supplies the project's semantic naming requirement.
[Node package entry-point documentation](https://nodejs.org/api/packages.html#package-entry-points) informs the distinction between supported exports and merely shipped implementation files.

The [JSON Quality chat](codex://threads/01a1989e-faee-7ab1-be14-343b091c7dd7), its actual naming audit and revision-3 plan were inspected.
Carry forward its distinction between a rename, a declaration correction and a changed contract, and its requirement to preserve counting thresholds unless a behavior change is explicit.
Its `maximumTotalValues` decision illustrates that a name must follow the intended population; it is not a reason to import a JSON-specific count into Markdown.
Its implementation and merge history remain recorded in the main plan.

| Exposed surface                 | Inventory inspected and disposition                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package entry points            | Package name, two platform companion names, both bins, root exports and five subpaths in [package.json](../../package.json); retain product/platform names and supported schema/observer roles except NAME-004/005        |
| All ten root JavaScript exports | `runQuality`, `inspectSelection`, `processDocument`, `createResult`, `executeQuality`, `readExecutionProfile`, `validateQualityResult`, `compareQualityReports`, `stageCandidate`, `qualifyCandidate`; dispositions below |
| Operation inputs and CLI        | Every parsed option in [cli.js](../../src/cli.js), qualification arguments, supplied-document framing, execution options, staging inputs and profile reader                                                               |
| Configuration and results       | All authored and generated configuration/result/execution fields, migration schema, rule severities, selection decisions, result validation and comparison behavior                                                       |
| Limits and measurements         | Every leaf in [analyzer-limits.js](../../src/analyzer-limits.js), execution-profile limits, observed sample/window fields, staging counts and hash preimages                                                              |
| Diagnostics and native boundary | Package rule IDs, source/severity labels, operational error-code branches, upstream ESLint IDs, Snapper options/report mapping and the proposed rules/normalization vocabulary                                            |
| Environment and workflow        | Packaged code's OS/GitHub environment inputs; reusable trusted-qualification inputs and `MQ_*` mappings; qualification observer positional arguments and receipt consumers                                                |
| Maintainer interfaces           | Every npm script key/command, documented comparison harness and relevant shared-qualification/CI/evidence readers; workflow/action/provider-required names remain externally owned                                        |
| Proposed interfaces             | Plan revisions 1/2, including provenance, normalization flags, proposed-change records, status/basis fields and graph quotas                                                                                              |

Private functions are not public SDK exports merely because their modules use JavaScript `export` or ship in the archive.
Nevertheless, misleading internal names on the changed public path are included where their meaning affects implementation, notably `nativeLintRules` and advisory-only terminology.
Unrelated private helper spelling and every internal local variable are outside this public audit.
No TypeScript declaration entry point is currently advertised; do not claim a nonexistent declaration audit or add a type system as naming work.

Classification: **R** changes names while retaining behavior; **D** corrects explanations/declarations; **B** changes exposure, representation or behavior and needs the detailed contract below.
All public replacements are recommendations for the planned breaking release, not instructions to silently reinterpret old installed contracts.

## 2. Findings and required dispositions

| ID       | Current or proposed name                                                                                           | Evidence and required action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAME-001 | `executeQuality`                                                                                                   | **R/B:** [execution.js](../../src/execution.js) currently runs a finite child request and refuses physical writes. Use `executeQualityRequest`; revision 4 supersedes `executeBoundedQuality` because package ceilings can be disabled. Retain framing, cancellation and checkout-write restrictions; resource changes follow plan section 4.12, not a sandbox promise. Keep `runQuality` as the direct operation.                                                                                                                           |
| NAME-002 | `processDocument`                                                                                                  | **R:** [quality.js](../../src/quality.js) uses supplied bytes at a logical path and never replaces checkout files. Rename to `processLogicalDocument`, retaining Buffer input, request identity, default format operation and returned result shape except other declared migrations. Define logical document in the API guide.                                                                                                                                                                                                              |
| NAME-003 | Root-exported `createResult`                                                                                       | **B:** It creates a provisional failure-shaped record with empty errors, not a completed validated result. Stop exporting this construction helper from the root; use internal `createInitialQualityResult`. CLI error construction still records an actual failure before publication. Tests must reject an initial record presented as a completed result.                                                                                                                                                                                 |
| NAME-004 | `compareQualityReports`, `./migration-schema`                                                                      | **R:** [migration.js](https://github.com/Hadden-Industries/markdown-quality/blob/b67601c0d027307fb15416392a91af650335d14e/src/migration.js) compares separately captured complete check reports; it does not compare repair receipts or perform migration. Use `compareCheckReports`, `./comparison-schema`, `schemas/comparison.schema.json`, `scripts/compare-check-reports.js` and a `report-comparison.js` owner. Keep `incumbent`/`candidate` roles. Update schema identity and readers; historical migration reports remain unchanged. |
| NAME-005 | `stageCandidate`, `qualifyCandidate`, `markdown-quality-qualify consumer`                                          | **R:** Staging copies candidate data under trusted policy; qualification checks immutable Git Markdown repeatedly with an observer, not arbitrary consumer/product fitness. Use `stageCandidateData`, `qualifyGitMarkdown`, and bin `markdown-quality-qualify-git` with direct flags, removing the redundant `consumer` token. Keep the observer subpath; it accurately names its role.                                                                                                                                                      |
| NAME-006 | Qualification `*Sha`, `git`, `python`, `sourceRoot`, abbreviated archive flags                                     | **R:** Use the exact commit/path/archive mapping in section 4. Git object identities are not interchangeable with SHA-256 content digests. Keep actual supported object formats and verification behavior; renaming does not add SHA-256 Git support to a SHA-1-only provider path.                                                                                                                                                                                                                                                          |
| NAME-007 | `links.localFiles`, `links.rootRelative: "root"`                                                                   | **R:** [analysis.js](../../src/analysis.js) admits local directories as well as files. Use `links.checkLocalTargets`; use `"consumer-root"` instead of `"root"`, retaining `"reject"`. Do not change directory acceptance, containment or root-relative meaning during the rename. New fragment/case behavior remains a separately specified change.                                                                                                                                                                                         |
| NAME-008 | `inventory`, `selection.inventory`, `selection.exclusions`                                                         | **R:** [documents.js](../../src/documents.js) reconciles supplemental Git/path inventory with filesystem discovery; it is not a tracked-files-only selector. Use request `reconciliationInventory`, CLI `--reconcile-inventory`, result `selection.reconciliationDecisions`, and `selection.omissions` because the latter includes `not-included` as well as excluded paths. Preserve explicit-empty selection and current reconciliation behavior.                                                                                          |
| NAME-009 | `--diagnostic-level`, `--no-limits`, comparison `--no-limits`                                                      | **R:** Use `--diagnostic-display-level` for the human-only filter and `--no-analyzer-limits` for analyzer bypass. The comparison harness uses `--no-input-size-limit` because it bypasses only its input-file ceiling. No option may imply transport/runtime/OS limits disappeared.                                                                                                                                                                                                                                                          |
| NAME-010 | `limits` and abbreviated analyzer leaves                                                                           | **R/B:** Use `analyzerLimits` consistently in input configuration, invocation, resolved policy and execution profile. Section 3 names every leaf and preserves default values, bypass semantics and existing accounting; expanded graph-read accounting is explicitly B, not an accidental rename. Rename internal default constant to `defaultAnalyzerLimits`, retaining one generator authority.                                                                                                                                           |
| NAME-011 | Execution/profile limits and measurements                                                                          | **R/B:** Use section-3 names/units with unchanged configured defaults. Revision 4 adds nullable ceilings and complete resourceLimitMode support; sample counts stay finite work quantities with a separate overridable ceiling.                                                                                                                                                                                                                                                                                                              |
| NAME-012 | `observedNearestRankP95Ms`                                                                                         | **R/D:** [observe.py](../../assets/qualification/observe.py) calculates `max`, while profile admission permits up to 100 samples. Rename to `maxObservedCheckDurationMs` and preserve the all-samples acceptance rule. For sorted samples 1..20 the current value is 20, whereas nearest-rank P95 is 19. Do not change to a percentile calculation and thereby weaken maximum-latency admission.                                                                                                                                             |
| NAME-013 | `peakObservedBytes`, `samplePolls`, `python` in observation reports                                                | **R/D:** Use `peakObservedMemoryBytes`, `observationPollCount`, `pythonVersionDetails`. Keep `checkerElapsedMs` and `outerElapsedMsIncludingStaging`, which identify actual measured intervals. Preserve the required `memoryMetric` explanation: Windows Job peak committed memory includes Python and is cumulative; Linux sampled process-group RSS excludes Python and can miss peaks. Do not rename both metrics to RSS or add false per-sample independence.                                                                           |
| NAME-014 | `outcome` and revised operation/quality status                                                                     | **B:** Revision 2 correctly separates operation success from quality. Implement `operationStatus`, `qualityStatus`, `qualityBasis` as specified in plan section 4.10. A successful repair with residual findings is not clean, and inspection is not analysis. No old live `outcome` alias.                                                                                                                                                                                                                                                  |
| NAME-015 | `written`, `unchanged`, `unprocessed`                                                                              | **B:** Fully checked failures remain `unprocessed`, and successful logical formatting can return changed bytes while listing the path as `unchanged`. Replace admission-overloaded accounting with explicit analysis/write states in section 5; do not merely append `Paths` to misleading semantics.                                                                                                                                                                                                                                        |
| NAME-016 | `tools.markdown`, `policy.lint`, `policy.sentence`                                                                 | **R:** They mean the installed ESLint Markdown plugin version, effective upstream ESLint rule settings and Snapper sentence-layout options. Use `tools.eslintMarkdown`, `policy.eslintRules`, `policy.sentenceLayout`. Retain `configuration.lint` as the complete package rule-severity map; its scope differs from the upstream projection, including `info` to `warn` adaptation.                                                                                                                                                         |
| NAME-017 | `configDigest`, comparison `inputDigest`/`selectionDigest`, staging count/hash labels                              | **R/B:** The plan's exact configuration provenance replaces `configDigest` (B). Use comparison `inputManifestSha256` and `selectionSha256` with explicitly retained preimages (R). Use staging `candidateEntryCount`, `candidateFileBytes`, `trustedConfigurationSnapshotSha256`; retain `stagedDataSha256` for the complete staged tree identity including the trusted overlay. Do not describe pre-overlay counts as staged totals.                                                                                                        |
| NAME-018 | Comparison `wouldFormat`                                                                                           | **R:** It collects paths carrying formatter-layout diagnostics, even when unrelated errors would prevent any format write. Rename to `formattingDriftPaths`, with incumbent/candidate arrays unchanged. It is neither write eligibility nor a prediction that formatting will succeed.                                                                                                                                                                                                                                                       |
| NAME-019 | `advisoryDefaults`, `checkAdvisories`, `advisory-diagnostics.js`, `nativeLintRules`                                | **R/D:** Advisories already permit error severity; ESLint is JavaScript, not the packaged native Snapper process. Adopt `qualityRuleDefaults`, `checkQualityRules`, `quality-diagnostics.js`, and `eslintRuleSettings`. Retain `prose-diagnostics.js` for its distinct native sentence-layout responsibility.                                                                                                                                                                                                                                |
| NAME-020 | Proposed `quality/unsafe-html`, `quality/html-image-alt`, `quality/local-path-case`, `quality/local-link-fragment` | **R/D before publication:** Use `quality/disallowed-html-construct`, `quality/missing-html-image-alt`, `quality/local-path-case-mismatch`, `quality/unresolved-local-fragment`. The first is the finite forbidden-construct policy, not a security guarantee; the last includes missing or ambiguous supported targets. Keep image-only-link labeling separate from a missing HTML `alt` attribute.                                                                                                                                          |
| NAME-021 | npm `inspect:json`, `format:json:check`, `format:check`, `check:security`                                          | **R/B exposure:** `inspect:json` invokes check; `format:json:check` also invokes the full JSON check. Remove these two misleading duplicate script names and use `check:json`. Rename the aggregate `format:check` to `check:formatting-and-markdown` with its commands unchanged; rename `check:security` to `check:dependency-audit` because its owner runs npm audit. Keep actual format scripts, `format:code:check` and `normalize:json`; no behavior change to the JSON dependency.                                                    |
| NAME-022 | Reusable workflow Boolean `qualification-evidence`                                                                 | **R:** It selects longer retention, not whether qualification evidence exists. Use `retain-qualification-evidence`; retain current 30-day extended / 14-day failure / 7-day routine-success behavior and approval protection. Do not rename GitHub-owned context fields or protected environment identities as cosmetic cleanup.                                                                                                                                                                                                             |
| NAME-023 | CLI catch-all message `Invalid files JSON.`                                                                        | **B/D:** The catch branch can also see invalid supplied-document JSON; guessing the input kind from the parser message is false attribution. Classify at the actual parse boundary with `INVALID_FILES_JSON` or `INVALID_DOCUMENT_REQUEST_JSON` and bounded actionable text. Keep exit 2 and zero writes, without echoing payloads. Other operational codes remain meaningful broad categories unless a changed branch requires a specific new code.                                                                                         |
| NAME-024 | Proposed change-list coordinates and hashes                                                                        | **D/B specification:** Make section 4.9's representation explicit: `sourceByteStart`, `sourceByteEndExclusive`, `sourceLine`, `sourceColumn`, `beforeByteLength`, `afterByteLength`, `beforeSha256`, `afterSha256`. Bytes are original UTF-8 offsets; line/column are original one-based parser coordinates with column units declared. Zero-based byte spans are not interchangeable with UTF-16 offsets or rendered glyphs.                                                                                                                |
| NAME-025 | Finite-only profiles and hidden ceilings despite general override wording                                          | **B:** Implement plan section 4.12: resourceLimitMode configured/unlimited, every individually adjustable/nullable package ceiling, sparse persistent profiles and bootstrap overrides covering stdin/Git/profile/cache/evidence/cleanup. Preserve identity, quality and write safety; disclose runtime/provider limits.                                                                                                                                                                                                                     |

The concrete defects are false scope/representation claims, not merely a preference for longer words.
NAME-001/002/004/005 additionally improve precision across distant use sites.
Where a package brand or established command supplies the context, retain it rather than redundantly prefix every field with Markdown Quality.

## 3. Resource contracts: populations, units and thresholds

All ordinary analyzer values retain positive-safe-integer/null behavior; `analyzerLimits: false` expands to individually bypassed analyzer ceilings.
Revision 4 permits consumer/trusted-owner overrides, including null and global unlimited mode, under plan section 4.12.
Finite-only qualification remains an explicit acceptance policy; candidate data cannot relax it.
Do not reinterpret a missing value as zero or change a null bypass into a default.
The right-hand names below are the complete proposed analyzer vocabulary.

| Current leaf          | Replacement                          | Preserved default | Population or boundary                                                                                                                                                                             |
| --------------------- | ------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fileBytes`           | `maxDocumentBytes`                   | 2,097,152         | Each selected input and each proposed output separately; graph extension also admits each required Markdown dependency                                                                             |
| `totalBytes`          | `maxTotalDocumentBytes`              | 33,554,432        | Current input and proposed-output totals are independent ceilings, not their sum; graph extension below defines the added read population                                                          |
| `files`               | `maxPathsPerSelectionStage`          | 10,000            | Independently caps explicit input length before deduplication, reconciliation inventory length and final selected-document count; not one summed count                                             |
| `entries`             | `maxEnumeratedEntries`               | 100,000           | Enumerated directory entries, including entries inspected then skipped; do not count only Markdown leaves                                                                                          |
| `configBytes`         | `maxConfigurationBytes`              | 262,144           | Input configuration bytes; default/snapshot controls and pre-read admission follow the main resolver contract                                                                                      |
| `nativeMs`            | `nativeInvocationTimeoutMs`          | 15,000            | Each native process invocation, including a grouped invocation; not a per-document allowance multiplied by batch size                                                                              |
| `nativeOutputBytes`   | `maxNativeOutputBytes`               | 8,388,608         | Existing native report/output bounds and batching reservations; preserve current stream/counting behavior                                                                                          |
| `diagnostics`         | `maxTotalDiagnostics`                | 10,000            | Batch diagnostic count                                                                                                                                                                             |
| `documentDiagnostics` | `maxDocumentDiagnostics`             | 1,000             | Each document's diagnostic count                                                                                                                                                                   |
| `diagnosticBytes`     | `maxDiagnosticJsonBytes`             | 4,194,304         | UTF-8 JSON array bytes, including brackets/separators, independently at document and batch collection boundaries                                                                                   |
| `selectionBytes`      | `maxInventoryBytes`                  | 4,194,304         | Independent inventory-output and candidate-path bytes, counting absolute spellings/duplicates as before; revision 4 removes the Git null-to-4-MiB fallback through an explicit downstream override |
| `analysisMs`          | `documentAnalysisTimeoutMs`          | 30,000            | Existing per-document analysis budget and remaining-time forwarding across phases; retain the current scheduling/accounting oracle                                                                 |
| `workerHeapMb`        | `maxWorkerOldGenerationMiB`          | 128               | Worker V8 old generation, not total heap, external buffers, native memory or whole-process RSS                                                                                                     |
| `workerStackMb`       | `workerStackMiB`                     | 4                 | Worker stack allocation setting passed to the runtime                                                                                                                                              |
| `stagingMs`           | `nativeStagingAccessTimeoutMs`       | 1,000             | Windows identity/ACL establishment deadline for owned native scratch storage, not candidate checkout staging                                                                                       |
| `stagingOutputBytes`  | `maxNativeStagingCommandOutputBytes` | 65,536            | Output of native scratch-access setup commands                                                                                                                                                     |
| `patterns`            | `maxPatternsPerList`                 | 100               | Include and exclude lengths independently, not their combined count                                                                                                                                |
| `patternLength`       | `maxPatternCodePoints`               | 512               | JavaScript string iteration count, not UTF-8 bytes, UTF-16 units or grapheme clusters                                                                                                              |
| `lintRules`           | `maxRuleOverrideCount`               | 60                | Supplied lint-map entries, not the total effective/default rule count                                                                                                                              |

The graph expansion already planned is a behavior change: add `maxReadDependencyDocuments`, default 10,000, to bound unique additional Markdown documents read for targets/reverse references.
Do not silently repurpose `maxPathsPerSelectionStage` to count different objects.
Read each unique selected/dependency path into the aggregate input-byte account once; proposed selected output totals remain a separate ceiling of the same numeric `maxTotalDocumentBytes`.
Re-reading for freshness consumes time/I/O but does not create a second logical document in that retained-content count.
New graph/source-map/preview storage still needs independent bounded admission where document bytes do not bound it; settle any additional exact quotas in the existing resource gate before implementation.
Reserve required work before allocation; a new name is not evidence that resource safety has been implemented.

| Execution/profile input | Replacement                  | Meaning and migration                                                                                                                                                 |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `samples`               | `requiredConsecutiveSamples` | Finite positive requested count; revision 4 exposes maxQualificationSamples with default 100 and finite/null overrides; report samples stays an observed-record array |
| `checkerMs`             | `executionTimeoutMs`         | Configured child deadline, default 180,000; null/unlimited omits the package deadline while observed duration is still recorded                                       |
| `windowMs`              | `sampleTimeoutMs`            | Per-sample outer window including staging/observation, not total duration across all samples                                                                          |
| `memoryBytes`           | `maxObservedMemoryBytes`     | Observer rejection threshold for its declared platform metric; not an OS allocation ceiling                                                                           |
| `nodeOldSpaceMb`        | `maxNodeOldGenerationMiB`    | Preserve execute API default 256 and numeric runtime argument                                                                                                         |
| `reportBytes`           | `maxOutputBytes`             | Preserve execute API default 8,388,608; separate stdout/stderr bounds and individually bounded reports/receipts, not a combined output sum                            |
| `requestBytes`          | `maxRequestBytes`            | Preserve execute API default 8,388,608; UTF-8 serialized request framing                                                                                              |
| `stagingBytes`          | `maxStagedDataBytes`         | Candidate/trusted checkout admission, trusted archive reads and candidate-plus-overlay admission retain their existing separately applied byte bound                  |
| `stagingEntries`        | `maxStagedEntries`           | Files/directories enumerated for admission, including reserved overlay entries where currently counted                                                                |
| `limits`                | `analyzerLimits`             | One resolved analyzer profile overriding consumer configuration; nullable ceilings and global mode follow plan section 4.12                                           |

Keep `processGroup: "owned" | "inherit"` as an advanced execution control with explicit ownership/cancellation documentation; neither mode means sandboxed execution.
Keep `signal` as the standard AbortSignal input.
Keep `toolchain`, `runtimes`, `declarations`, `profilePath` and `profileSha256` in their existing qualified contexts; explain that runtime declarations resolve to versions, not executable paths.

[Node's CLI documentation](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib) defines the old-generation argument in MiB.
[Node worker implementation](https://github.com/nodejs/node/blob/v26.13.0/src/node_worker.cc) uses a 1024-by-1024 multiplier for the worker resource units; the [worker contract](https://nodejs.org/api/worker_threads.html) limits JavaScript engine resources, not all memory.
Keep Node's externally fixed `maxOldGenerationSizeMb` and `stackSizeMb` spelling only at the adapter boundary.
Prove identical numeric forwarding; do not multiply the new MiB value a second time.
Retain the actual supported-runtime qualification matrix, including the effect of inherited runtime options on effective worker limits.

## 4. Qualification identities and digest preimages

Project these mappings together across SDK, bin, observer request/receipt, reusable workflow, local callers, CodeQL models, validators and documentation.
Provider-owned `job.workflow_sha` and GitHub action input `ref` stay unchanged at their boundary.

| Current owned spelling                                                          | Replacement                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `candidateSha` / `--candidate-sha` / input `candidate-sha` / `MQ_CANDIDATE_SHA` | `candidateCommitId` / `--candidate-commit-id` / `candidate-commit-id` / `MQ_CANDIDATE_COMMIT_ID`   |
| `trustedSha` / `--trusted-sha` / input `trusted-sha` / `MQ_TRUSTED_SHA`         | `trustedCommitId` / `--trusted-commit-id` / `trusted-commit-id` / `MQ_TRUSTED_COMMIT_ID`           |
| `producer.sourceSha` / `--producer-sha`                                         | `producer.sourceCommitId` / `--producer-commit-id`                                                 |
| `workflow.producerSha` / `--workflow-sha` / `MQ_WORKFLOW_SHA`                   | `workflow.producerCommitId` / `--workflow-commit-id` / `MQ_WORKFLOW_COMMIT_ID`                     |
| Qualification `sourceRoot` / `--source-root`                                    | `candidateRoot` / `--candidate-root`; retain trusted/output root roles                             |
| `git` / `--git`; `python` / `--python`                                          | `gitExecutablePath` / `--git-executable-path`; `pythonExecutablePath` / `--python-executable-path` |
| Analyzer request `gitExecutable`                                                | `gitExecutablePath`; same trusted host-executable binding, never candidate-relative search         |
| `--core-sha256`; `--native-sha256`; `--output`                                  | `--core-archive-sha256`; `--native-archive-sha256`; `--output-root`                                |
| Checkout identity `head`, `tree`, `committedDataSha256`                         | `commitId`, `treeId`, `trackedTreeRecordsSha256`                                                   |

`trackedTreeRecordsSha256` hashes the ordered Git tree records plus their NUL separators after verifying file bytes against blob IDs; it is not SHA-256 of concatenated file contents.
Do not change that preimage or claim that a digest alone authenticates the checkout.
For comparison, `inputManifestSha256` retains the UTF-8 serialization of path-sorted `{path, bytes, sha256}` records; `selectionSha256` retains the selection-object serialization for the applicable schema.
The manifest's `bytes` is a numeric byte count; `sha256` is the exact file-byte digest.
Publish these preimages and independent vectors; neither hash denotes semantic Markdown equivalence.
New configuration-origin/default/resolver/effective hashes use the main plan's distinct preimages, never a synthetic absent-file hash.
The trusted snapshot digest is distinct from original configuration provenance.

Git ID length/algorithm validation remains owned by the actual path: local checkout checks accept their currently supported full formats, while provider/producer paths presently require full 40-character IDs.
Replan support expansion separately; do not loosen validators merely because the new suffix is `CommitId`.
Staging entry/file-byte counts keep their pre-overlay candidate population; add separately named staged totals only if a consumer actually needs them.

## 5. Result accounting and preview contracts

NAME-015 replaces the three overloaded arrays in result schema 4 with `documentResults` and `writtenPaths`.
There is exactly one `documentResults` record per selected path in deterministic selection order.
Each record has `path`, `analysisStatus` (`not-requested`, `completed`, `incomplete`) and `writeStatus` (`not-requested`, `unchanged`, `refused`, `written`, `pending`).
These describe analysis and checkout effects independently, not whether the document is clean.

| Situation                                              | Analysis state                   | Write state                                                                  |
| ------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------- |
| Inspect selection/policy                               | `not-requested`                  | `not-requested`                                                              |
| Complete check, including quality failure              | `completed`                      | `not-requested`                                                              |
| Complete preview, including refusal                    | `completed` if analyzed          | `not-requested`                                                              |
| Successful supplied-document repair                    | `completed`                      | `not-requested`; returned content may differ                                 |
| Accepted physical repair with byte-identical candidate | `completed`                      | `unchanged`                                                                  |
| Known batch refusal before replacement                 | `completed` for analyzed members | `refused` for requested physical repair; no written members                  |
| Accepted physical replacement                          | `completed`                      | `written` only after confirmed replacement                                   |
| Later replacement failure                              | Preserve actual analysis state   | Completed writes stay `written`; unapplied changed candidates stay `pending` |

When analysis is not requested because an early known policy refusal precedes content work, use `not-requested`; when requested analysis cannot finish, use `incomplete`.
Never infer completed analysis from file selection or admission.
`writtenPaths` is a derived projection of confirmed `written` records, not a second mutable source of truth; validation requires equality and no duplicates.
Preview/logical/check/inspect results have an empty `writtenPaths`.
Retain actual `proposedChanges` independently of effects; candidate preparation is not proof of a write.
If replacement outcome is uncertain, retain an explicit operational error naming that uncertainty; never guess `written` from a planned edit.
Excluded logical input is returned unchanged and remains outside the selected-path records, with its omission decision retained in `document`.

Use `qualityBasis: "input" | "candidate" | "applied" | null` and the status/exit table in the main plan.
Candidate-quality observations cannot certify a partially applied batch.
The validator, CLI summary, comparison reader, qualification observer and CI acceptance must use these contracts together.
Historical result schemas keep their explicit historical readers and bytes; no reinterpretation of old `unprocessed` as missing analysis.

NAME-024 edits use half-open original UTF-8 byte spans with exact before/after span hashes and lengths.
Parser line/column units are one-based lines and UTF-16 code-unit columns, with source maps tested against astral and combining characters; display grapheme positions are not promised.
Use `kind: "prose-nfc" | "local-fragment"`; keep `dryRun` and `updateLinks` because their CLI purpose is explicit.
Define each anchor change with target path, original node lineage and `oldAnchor`/`newAnchor`; no inference from text normalization alone.

## 6. Retained names, diagnostic identity and documentation corrections

Retain `check`, `format`, `inspect`, `inspect-profile` and proposed `normalize`.
They are conventional operation names; explicitly document that normalize means eligible prose NFC plus flag-authorized dependent fragments, not arbitrary text cleanup.
Keep CLI `--json`: it emits one JSON object, unlike JSON Quality's event stream where `--ndjson` was appropriate.
Keep `--files-json`, `--root`, `--config`, `--concurrency`, `--strict`, `--execution-profile` and `--stdin-request`; document stdin as one bounded JSON request, never raw Markdown stdin.
Keep request `mode`, `root`, `config`, `files`, `concurrency` and `strict` with their explicit operation/path/selection contracts; `mode` is the requested operation and result `operation` records the admitted operation.
Keep `runQuality`, `inspectSelection`, `readExecutionProfile` and `validateQualityResult`; their primary roles are accurate.
Inspection returns policy and selection together, and validation returns the original validated report rather than a clone or immutable snapshot.
Do not claim authentication, ownership transfer or snapshot semantics from validation alone.

Retain configuration `include`, `exclude`, `lint`, `syntax.frontmatter`, `layout.endOfLine`, `layout.tabWidth`, `preset` and `schemaVersion`.
Keep `warn` in the package's ESLint-compatible severity configuration vocabulary and `warning` in diagnostic severity, with the adapter explicitly documented; neither is a new alias.
Keep `full` versus `explicit` selection: full means policy-selected authored files under the bounded root, not every file regardless of exclusions.
Keep `path`, `pattern`, `matchedPath`, `decision`, `reason`, `requestId`, `contentBase64`, package name/version and tool-brand names in their typed contexts.
No scalar count is hidden behind an array name after the specified measurement/count migrations.

Retain existing upstream `markdown/*` IDs and native Snapper keys/kinds at their owned boundaries.
The [native policy adapter](../../src/native-policy.js) intentionally uses upstream `max_width`/`clause_breaks` and command spelling.
Keep package `quality/non-nfc-prose`, generic-link-text, duplicate-sibling-heading, heading-trailing-punctuation, long-prose-line and formatter/links diagnostic identities whose scopes remain accurate.
The explicit punctuation set and long-line exemptions belong in rule documentation; the names need not encode every predicate.
Update severity-dependent messages: a long-line diagnostic must not assert it is informational when configured as an error, and NFC text must not claim no normalization occurred after an explicit repair.
Report the actual basis and residual condition instead.
Retain broad operational categories such as `NATIVE_FAILURE`, `SELECTION_LIMIT`, `INVALID_RESULT`, `PRESERVATION` and `PREIMAGE_CHANGED`; their messages/codes do not promise a diagnosis narrower than the detected condition.

Rename package-owned diagnostic IDs only where NAME-020 or NAME-023 specifies it.
Use an explicit old/new identity map for migration comparisons; distinguish a renamed rule from an added/resolved finding.
Do not rewrite frozen corpus pins, snapshots, PR evidence or published schema URNs to manufacture equivalence.
Keep OS environment names, Node option names and GitHub-owned `GITHUB_*`/context fields at their required boundaries.
There is no new ambient environment variable for ordinary zero-config policy.
Keep the existing protected qualification environment, workflow file identity and provider check names unless a functional migration explicitly requires a change; update their descriptions to the new callable names.

## 7. Implementation, acceptance and compatibility

Perform each rename through its owning source/schema and every current caller, not a global textual replacement.
Keep the current value/population/default when the disposition is R; a changed accepted input, new source population, reordered effect or new refusal is B and must have its own oracle.
Integrate this audit through plan `SLICE-010` and the producing resolver, graph, normalization and installed-consumer slices; do not leave main temporarily accepting mismatched report fields.

Use configuration schema 3, result schema 4 and `authored-gfm@2` as already proposed; advance execution profile schema 1 to 2, comparison report schema 2 to 3, and changed observer/sample-receipt schemas 1 to 2.
Move the current comparison schema's identity to `urn:hadden-industries:markdown-quality:comparison:3`; do not edit archived migration-schema evidence.
Advance any enclosing live evidence contract that embeds changed receipts without accepting both silently; enumerate exact CI/release/admission readers before landing the producing slice.
The exported input-configuration schema describes sparse input; the plan's generated resolved/effective representation must have a distinct schema identity and accurate documentation.
No blanket new major for unchanged internal artifacts is required.

The package's planned major release carries these incompatible public names, consistent with [Semantic Versioning](https://semver.org/).
Closed API/CLI/schema admissions must reject removed spellings explicitly, including old SDK object keys that JavaScript might otherwise ignore.
Do not allow an ignored `inventory`, old quota or old profile key to silently broaden source selection or restore a default bound.
A deprecated compatibility bridge is a separate explicit owner decision under NSH-01; none is established here.
Remove misleading npm aliases, update scripts/docs together, and leave genuine unchanged conventional names alone.

Acceptance evidence must include:

- An inventory matching actual packed root exports, bin/subpath declarations, parser options, generated schema properties and workflow inputs; unexplained exposed names are a failure, not an implicit keep.
- Before/after R fixtures with translated controls: same selected paths, admitted/refused inputs, default thresholds, outputs, hashes where preimages are unchanged, effects and cleanup.
- Exact-limit/one-over tests for each distinct quota population, including include/exclude separately, explicit duplicates, inventory/path bytes, UTF-8 diagnostic JSON and Unicode code-point pattern lengths.
- Runtime adapter checks that forward identical MiB values and disclose effective old-generation limits without a total-memory claim.
- Known complete failed-check, logical changed-output, preview, early refusal and late-write-failure records with truthful independent analysis/write states.
- Independent metric examples for sample counts 1, 20 and 100 proving maximum semantics; metric discriminator/limitations retained across both platforms.
- Old-name refusal through real installed CLI/SDK/profile input, plus check-only CI receipt admission, updated CodeQL vocabulary and preserved approval gates.
- Exact declared diagnostic/provenance deltas and no stale current readers; historical evidence remains intact.

This audit does not claim runtime tests, hosted qualification, source publication or package release.
Its source inspections and document validation are planning evidence only.
