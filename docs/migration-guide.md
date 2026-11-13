# Migration guide

Choose the section for the version you are upgrading **from**.

- **3.0.1 consumers** keep their CLI, SDK and configuration contracts.
  See [the 3.0.2 update](#from-301-to-302).
- **3.0.0 consumers** retain their CLI, SDK and configuration contracts.
  Apply [the 3.0.1 repairs](#from-300-to-301), then read [the 3.0.2 update](#from-301-to-302).
- **2.x consumers** can keep configuration schema 3.
  Start with [CLI, SDK and report changes in 3.0](#from-20-to-30).
- **1.x consumers and users of development schema 2** should apply the [2.0 configuration and contract changes](#from-1x-to-20) first.
  If your destination is 3.0, continue with [the 3.0 changes](#from-20-to-30).

## From 3.0.1 to 3.0.2

Version 3.0.2 is a compatible patch release.
Use the [installation example](consumer-guide.md#installation) to upgrade.
No CLI, SDK, configuration, preset or schema-version migration is required from 3.0.1.
Configuration schema 3, preset `authored-gfm@2`, result schema 5, execution schema 2 and comparison schema 3 are retained.

The patch updates Markdown and HTML tooling, dependency locks and release CI.
Repository development also enforces `fast-xml-parser >=5.12.0`; the source lock resolves 5.12.0.
Release maintainers should use the [current release runbook](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/release-operations.md) for coordinated family staging, qualification, archival and promotion.

## From 3.0.0 to 3.0.1

Version 3.0.1 introduced the compatible repairs below.
No CLI, SDK, configuration, preset or contract-version migration is required from 3.0.0.
Successful and quality-refused reports require complete policy and resource evidence; failed admission can still report unavailable policy metadata.
The result schema remains version 5, with its logical identifier corrected to that version.
Fragment resolution, NFC planning, change reporting and path spelling avoid repeated work while retaining their existing findings and preservation rules.

Repository contributors now use JSON Quality 1.0.0 with configuration schema 4, event schema 5 and cohort 6.
See [JSON development checks](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/json-quality.md) for the repository tooling migration.

## From 2.0 to 3.0

The 3.0 CLI and SDK contracts introduced the following major-version changes, retained by 3.0.2.
Configuration schema 3, `authored-gfm@2`, execution schema 2, comparison schema 3 and Snapper 0.11.9 are retained.

- Import the SDK from Node.js code only; the package root now explicitly rejects browser and unmatched resolver environments.
  Frontend projects can continue running the CLI and SDK in Node.js development, build and CI tooling.
  Node.js bundlers must select the `node` condition; JSON schemas and the qualification-observer resource keep their existing exports.
  Browser execution remains unsupported and is a separate future feature.
- Add `--write` to physical `format` and `normalize` invocations, or select `--dry-run` for a real preview.
  Missing/conflicting modes fail before policy, stdin or source effects, including empty selections.
  SDK `runQuality` repair calls keep their existing write semantics; logical envelope calls do not accept `--write`.
- Consume result schema 5: each selected document has a nullable `candidate` with exact input/output SHA-256, byte counts and `changed`.
  A completed nonempty repair requires candidates; confirmed writes remain separately reported.
  Historical comparisons retain schemas 1 through 4 and accept 5 without rewriting old reports.
- Human operation output moves to stderr; `--json`, help and version stay on stdout.
  `--quiet` changes presentation only, preserving findings, strict blockers and failure explanations.
- Editors may use `--stdin --stdin-filepath docs/buffer.md` with `check`, `format` or `normalize` under normal root policy.
  Raw transforms return source only, and reject `--json`, `--dry-run`, `--write` and filesystem selections.
  The virtual filename is canonical and root-relative, even when invoked from a nested directory.
  Supplied UTF-8 is authoritative over different disk bytes; absent safe parents and virtual self-links are supported.
  Existing JSON/base64 `--stdin-request` remains available, including excluded arbitrary bytes; raw input is always strict UTF-8.
- Continue using `check` for the actual selected policy verdict.
  Successful preview, repair, selected-file, empty or logical checks never certify complete repository acceptance.
  Required link dependencies remain bounded, fresh and separately reported.
- Internal JSON/base64 overhead counts against `maxRequestBytes`; complete reports and raw output count against `maxOutputBytes`.
  One raw execution deadline covers stdin through output completion, with separate owned checker cleanup.
  Exit 2 after delivery begins requires discarding partial stdout; physical writes already confirmed are not restored automatically.

Do not redirect transformed output over its input file; use a separate destination and inspect the process exit.
Consumers using open-ended dependency ranges such as `>=2.0.0` must migrate commands before refreshing locks to 3.0.0.
No other repository's dependency range is changed by this implementation.

## From 1.x to 2.0

The following tables describe **the 2.0 destination** for published 1.x releases and unreleased configuration schema 2.
Version 2.0 uses configuration schema 3, preset `authored-gfm@2` and result schema 4.

Old names in the tables below come from 1.0.3 or from that unreleased development source.
The new names are not aliases: removed keys, flags, markers and options fail with guidance instead of being ignored.
The [consumer guide](consumer-guide.md) describes the current contracts in full.

## What published 1.0.3 keeps

Published 1.0.3 archives are immutable and keep their behavior: configuration schema 1 with `ignoreFiles`, preset `authored-gfm@1`, result schema 1, the `check`, `format` and `inspect` commands, and the `runQuality` and `createResult` exports.
Pinning `1.0.3` continues to select that behavior.
Archived release records, reports and their schema identities are not rewritten.

## Schema family

| Contract                | Before 2.0                     | In 2.0                                       |
| ----------------------- | ------------------------------ | -------------------------------------------- |
| Configuration input     | 1 (1.0.3) or 2 (development)   | 3, sparse, export `./configuration-schema`   |
| Effective configuration | Not exported                   | 3, export `./effective-configuration-schema` |
| Preset                  | `authored-gfm@1`               | `authored-gfm@2`                             |
| Result                  | 1 (1.0.3) or 3 (development)   | 4, export `./result-schema`                  |
| Execution profile       | 1                              | 2, export `./execution-schema`               |
| Report comparison       | 2, export `./migration-schema` | 3, export `./comparison-schema`              |
| Observer window/receipt | 1                              | 2                                            |
| Evidence artifact index | 1                              | 2                                            |

## Configuration

| Old                                                | Current                                                        |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `"schemaVersion": 1` or `2`                        | Omit it, or use `3`                                            |
| `"preset": "authored-gfm@1"`                       | Omit it, or use `"authored-gfm@2"`                             |
| `ignoreFiles` (schema 1)                           | Removed; translate intended ignores into `exclude`             |
| `limits`                                           | `analyzerLimits`                                               |
| `links.localFiles`                                 | `links.checkLocalTargets`                                      |
| `links.rootRelative: "root"`                       | `links.rootRelative: "consumer-root"`; `"reject"` is unchanged |
| `"markdown/no-missing-link-fragments": <severity>` | `"quality/unresolved-local-fragment": <severity>`              |

The upstream `markdown/no-missing-link-fragments` rule is now `off` by default but remains selectable; it is not an alias for the package rule.
Translate an intentional old override of it to `quality/unresolved-local-fragment`, which also checks cross-document fragments.
For example, an old `{"lint": {"markdown/no-missing-link-fragments": "warn"}}` becomes `{"lint": {"quality/unresolved-local-fragment": "warn"}}`.

Analyzer limit leaves keep their defaults, populations and `null` meaning:

| Old leaf              | Current leaf                         |    Default |
| --------------------- | ------------------------------------ | ---------: |
| `fileBytes`           | `maxDocumentBytes`                   |  2,097,152 |
| `totalBytes`          | `maxTotalDocumentBytes`              | 33,554,432 |
| `files`               | `maxPathsPerSelectionStage`          |     10,000 |
| `entries`             | `maxEnumeratedEntries`               |    100,000 |
| `configBytes`         | `maxConfigurationBytes`              |    262,144 |
| `nativeMs`            | `nativeInvocationTimeoutMs`          |     15,000 |
| `nativeOutputBytes`   | `maxNativeOutputBytes`               |  8,388,608 |
| `diagnostics`         | `maxTotalDiagnostics`                |     10,000 |
| `documentDiagnostics` | `maxDocumentDiagnostics`             |      1,000 |
| `diagnosticBytes`     | `maxDiagnosticJsonBytes`             |  4,194,304 |
| `selectionBytes`      | `maxInventoryBytes`                  |  4,194,304 |
| `analysisMs`          | `documentAnalysisTimeoutMs`          |     30,000 |
| `workerHeapMb`        | `maxWorkerOldGenerationMiB`          |        128 |
| `workerStackMb`       | `workerStackMiB`                     |          4 |
| `stagingMs`           | `nativeStagingAccessTimeoutMs`       |      1,000 |
| `stagingOutputBytes`  | `maxNativeStagingCommandOutputBytes` |     65,536 |
| `patterns`            | `maxPatternsPerList`                 |        100 |
| `patternLength`       | `maxPatternCodePoints`               |        512 |
| `lintRules`           | `maxRuleOverrideCount`               |         60 |
| None                  | `maxReadDependencyDocuments`         |     10,000 |

`maxReadDependencyDocuments` is new: it bounds the cross-document targets read as dependencies, which also count once toward the shared byte totals.

## Simplifying a configuration without broadening scope

Compare effective configurations with `inspect --json` before and after each edit; `effectiveConfigurationSha256` must stay equal unless a change is intended.
Remove markers and values only where they equal the new defaults.
An old narrow `include` must stay: removing it selects every `**/*.md` file under the root.

A supplied `exclude` replaces the defaults `**/vendor/**`, `**/.cache/**` and `**/coverage/**`, so add any of those you still need; `[]` clears ordinary exclusions but never the hard boundaries `.git`, `node_modules`, `.venv`, `venv`, `.hi` and `.markdown-quality-trusted-inputs`.
Keep explicit exclusions for generated, vendored, signed or byte-sensitive documents.

Files named on the command line, in `files` or as a logical document path are now checked whatever their extension and whether or not `include` matches them, instead of being omitted as `not-included`; only an exclusion omits them, and a named `.mdx` file fails with `UNSUPPORTED_DIALECT`.

An `include` pattern that names another extension, such as `**/*.markdown`, now selects those files; broad patterns such as `docs/**` still select only `.md`.
Note that the default `layout.endOfLine` is `"lf"`; keep an explicit `"preserve"` or `"crlf"` if you relied on one.

For example, this schema 2 configuration:

```json
{
  "schemaVersion": 2,
  "preset": "authored-gfm@1",
  "include": ["*.md", "docs/**/*.md"],
  "exclude": ["docs/generated/**"],
  "lint": {},
  "links": { "localFiles": true, "rootRelative": "reject" },
  "layout": { "endOfLine": "lf", "tabWidth": 2 }
}
```

simplifies to:

```json
{
  "include": ["*.md", "docs/**/*.md"],
  "exclude": ["docs/generated/**"]
}
```

## CLI

| Old                                          | Current                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `--inventory git`                            | `--reconcile-inventory git`                                                            |
| `--no-limits`                                | `--no-analyzer-limits`, or `--resource-limit-mode unlimited` for every package ceiling |
| `--diagnostic-level`                         | `--diagnostic-display-level`                                                           |
| `markdown-quality-qualify consumer`          | `markdown-quality-qualify-git` with flags only                                         |
| Comparison harness `--no-limits`             | `--no-input-size-limit` or `--max-comparison-input-bytes N`                            |
| Bare `markdown-quality` from a local install | `npm exec -- markdown-quality`                                                         |

Published 1.0.3 offers only `check`, `format` and `inspect` with `--root`, `--config`, `--json`, `--files-json` and literal paths after `--`.
Relative to 1.0.3, the `normalize` and `inspect-profile` commands are new, as are `--reconcile-inventory`, `--concurrency`, `--strict`, `--no-analyzer-limits`, `--diagnostic-display-level`, `--execution-profile`, `--resource-limit-mode`, `--max-profile-bytes`, `--stdin-request`, `--dry-run` and `--update-links`.
The development-source `document`, qualifier `profile` and qualifier `candidate` commands remain removed.

## SDK exports and options

| Old                        | Current                   |
| -------------------------- | ------------------------- |
| `processDocument`          | `processLogicalDocument`  |
| `executeQuality`           | `executeQualityRequest`   |
| `createResult`             | Not exported              |
| `compareQualityReports`    | `compareCheckReports`     |
| `stageCandidate`           | `stageCandidateData`      |
| `qualifyCandidate`         | `qualifyGitMarkdown`      |
| Option `inventory`         | `reconciliationInventory` |
| Option `limits`            | `analyzerLimits`          |
| Option `gitExecutable`     | `gitExecutablePath`       |
| Execution `checkerMs`      | `executionTimeoutMs`      |
| Execution `reportBytes`    | `maxOutputBytes`          |
| Execution `requestBytes`   | `maxRequestBytes`         |
| Execution `nodeOldSpaceMb` | `maxNodeOldGenerationMiB` |

Published 1.0.3 exports only `runQuality` and `createResult`.
`runQuality` keeps its name; `inspectSelection`, `readExecutionProfile` and `validateQualityResult` keep their development-source names, and the other exports in the [library API](consumer-guide.md#library-api) are new relative to 1.0.3.
Relative to the development source, the new operation options are `executionProfile`, `executionLimits`, `resourceLimitMode`, `dryRun` and `updateLinks`.

## Execution profile keys

| Old (schema 1)   | Current (schema 2)           |
| ---------------- | ---------------------------- |
| `samples`        | `requiredConsecutiveSamples` |
| `checkerMs`      | `executionTimeoutMs`         |
| `windowMs`       | `sampleTimeoutMs`            |
| `memoryBytes`    | `maxObservedMemoryBytes`     |
| `nodeOldSpaceMb` | `maxNodeOldGenerationMiB`    |
| `reportBytes`    | `maxOutputBytes`             |
| `requestBytes`   | `maxRequestBytes`            |
| `stagingBytes`   | `maxStagedDataBytes`         |
| `stagingEntries` | `maxStagedEntries`           |
| `limits`         | `analyzerLimits`             |

Profiles are now sparse; ordinary operations need no runtime, toolchain or sample declarations.
`resourceLimitMode` and the execution ceilings in the consumer guide are new keys.

## Result fields

| Old                        | Current                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `outcome`                  | `operationStatus`, `qualityStatus` and `qualityBasis`                                                                                         |
| `written`                  | `writtenPaths`, plus `documentResults[].writeStatus` of `written`                                                                             |
| `unchanged`, `unprocessed` | `documentResults[].analysisStatus` and `documentResults[].writeStatus`                                                                        |
| `configDigest`             | `configurationOrigin`, `configurationBytesSha256`, `defaultConfigurationSha256`, `policyResolverInputsSha256`, `effectiveConfigurationSha256` |
| `selection.inventory`      | `selection.reconciliationDecisions`                                                                                                           |
| `selection.exclusions`     | `selection.omissions`, which also records `not-included` and boundary paths                                                                   |
| `tools.markdown`           | `tools.eslintMarkdown`                                                                                                                        |
| `policy.lint`              | `policy.eslintRules`                                                                                                                          |
| `policy.sentence`          | `policy.sentenceLayout`                                                                                                                       |
| `policy.limits`            | `policy.analyzerLimits`                                                                                                                       |

New fields include `dryRun`, `updateLinks`, `runtime`, `root`, `resourcePolicy`, `selection.readDependencies`, `proposedChanges`, `anchorChanges`, `backlinkCoverage` and `refusals`.
Scripts that read `outcome` or treat any exit `0` as clean must instead require a complete `check` result with `operationStatus: "completed"` and the expected `qualityStatus`.
A successful format, normalize or preview result is never check evidence, even when it exits `0`.

## Report comparison

| Old (schema 2)                       | Current (schema 3)                 |
| ------------------------------------ | ---------------------------------- |
| `inputDigest`                        | `inputManifestSha256`              |
| `selectionDigest`                    | `selectionSha256`                  |
| `wouldFormat`                        | `formattingDriftPaths`             |
| `scripts/compare-quality-reports.js` | `scripts/compare-check-reports.js` |

`compareCheckReports` reads result schemas 1 through 4 and refuses repair or preview receipts.
`formattingDriftPaths` lists paths with formatter-layout diagnostics; it does not predict that formatting will succeed.

## Qualification identities, workflow inputs and environment

| Old                                                                          | Current                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `candidateSha`, `--candidate-sha`, input `candidate-sha`, `MQ_CANDIDATE_SHA` | `candidateCommitId`, `--candidate-commit-id`, input `candidate-commit-id`, `MQ_CANDIDATE_COMMIT_ID` |
| `trustedSha`, `--trusted-sha`, input `trusted-sha`, `MQ_TRUSTED_SHA`         | `trustedCommitId`, `--trusted-commit-id`, input `trusted-commit-id`, `MQ_TRUSTED_COMMIT_ID`         |
| `producer.sourceSha`, `--producer-sha`                                       | `producer.sourceCommitId`, `--producer-commit-id`                                                   |
| `workflow.producerSha`, `--workflow-sha`, `MQ_WORKFLOW_SHA`                  | `workflow.producerCommitId`, `--workflow-commit-id`, `MQ_WORKFLOW_COMMIT_ID`                        |
| `sourceRoot`, `--source-root`                                                | `candidateRoot`, `--candidate-root`                                                                 |
| `git`, `--git`; `python`, `--python`                                         | `gitExecutablePath`, `--git-executable-path`; `pythonExecutablePath`, `--python-executable-path`    |
| `--core-sha256`, `--native-sha256`, `--output`                               | `--core-archive-sha256`, `--native-archive-sha256`, `--output-root`                                 |
| Checkout `head`, `tree`, `committedDataSha256`                               | `commitId`, `treeId`, `trackedTreeRecordsSha256`                                                    |
| Workflow input `qualification-evidence`                                      | `retain-qualification-evidence`                                                                     |

Commit-ID validation and retention periods are unchanged.

## Observer fields

| Old                        | Current                      |
| -------------------------- | ---------------------------- |
| `observedNearestRankP95Ms` | `maxObservedCheckDurationMs` |
| `peakObservedBytes`        | `peakObservedMemoryBytes`    |
| `samplePolls`              | `observationPollCount`       |
| `python`                   | `pythonVersionDetails`       |

`maxObservedCheckDurationMs` is the maximum over all samples, not a P95 value; the calculation is unchanged.

## npm scripts in this repository

| Old                 | Current                         |
| ------------------- | ------------------------------- |
| `format:check`      | `check:formatting-and-markdown` |
| `check:security`    | `check:dependency-audit`        |
| `inspect:json`      | Removed; use `check:json`       |
| `format:json:check` | Removed; use `check:json`       |

## Adopting the stricter defaults

Capture package, lock, configuration and workflow identities and exact document preimages before upgrading.
Then run each step and review its result before the next:

```sh
npm install --save-dev --save-exact @hadden-industries/markdown-quality@2.0.0
npm exec -- markdown-quality inspect --root . --json
npm exec -- markdown-quality check --root .
npm exec -- markdown-quality normalize --root . --dry-run
npm exec -- markdown-quality normalize --write --root .
npm exec -- markdown-quality format --write --root .
npm exec -- markdown-quality check --root .
```

The install pins 2.0.0 exactly in the manifest and lock; while it is under npm's `pilot` tag, an unversioned install selects the `latest` 1.x release.
`inspect` confirms the root, selection, omissions and effective policy.

The first `check` reports the new default errors: non-NFC prose, generic link text, duplicate sibling headings, bare URLs, unresolved fragments, path case, image alternatives and disallowed HTML.
Fix semantic findings by editing content; no repair command rewrites link text, alternatives or HTML.

Preview normalization, and add `--update-links` only after reviewing `anchorChanges` and the unverified external backlink coverage.
Keep mechanical normalization and formatting changes reviewable separately from content fixes.
To abort, restore every recorded preimage together and rerun the incumbent checks; downgrading the package alone cannot restore document bytes.
