# Consumer guide

This guide describes the 3.0.0 source candidate: configuration schema 3, preset `authored-gfm@2` and result schema 5.
Publication and complete supported-platform qualification remain separate release steps.
Published 1.x archives are immutable and keep their previous behavior; the [migration guide](migration-guide.md) maps old names to these contracts.

## Installation

```sh
npm install --save-dev --save-exact @hadden-industries/markdown-quality@3.0.0
npm exec -- markdown-quality check --root .
```

Use this example after 3.0.0 is released; pin the exact qualified version rather than relying on mutable `pilot` or `latest` tags.
No configuration file is required.
A local dependency does not put a bare `markdown-quality` executable on every shell's PATH; use [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/) or an npm script.
Keep the consumer lockfile, and disable lifecycle scripts with `--ignore-scripts` where your acquisition policy requires it.
An isolated `tooling/markdown` npm project supports consumers that do not use Node for their application; pass the actual repository root to its commands.
Version 2.0 adds `parse5` 8.1.0 (MIT) and `github-slugger` 2.0.0 (ISC) as direct runtime dependencies; the [third-party notices](../THIRD-PARTY-NOTICES.md) list them all.

## Root discovery

Raw editor buffers use `format --stdin --stdin-filepath docs/buffer.md --root .` with input piped or redirected from a separate file.
For a report, use `check --stdin --stdin-filepath docs/buffer.md --root . --json`.
The supplied strict UTF-8 bytes are authoritative over disk content; safe absent virtual files and named self-links are supported.
The virtual filename is canonical and root-relative, including from nested directories, and retains ordinary root policy and bounded dependency reads.
Normalization requires `--update-links` for changed anchors and refuses dependent edits outside the supplied buffer.
Raw transforms reject `--json`, `--write`, `--dry-run`, `--stdin-request` and filesystem selections; they emit only admitted source on stdout after cleanup.
The existing envelope retains full result details and excluded arbitrary-byte pass-through; raw input is always UTF-8, including excluded input.
Never redirect onto the input path: the shell can truncate it before reading starts.

Human findings and summaries use stderr, visibly including severity, rule and location.
Help, version, `inspect-profile` and complete `--json` reports use stdout.
`--quiet` suppresses routine successful summaries, preserving diagnostics, strict blockers and failure explanations.
Layout drift calls for `format --write`; `quality/non-nfc-prose` calls for `normalize --write`.
A missing link requires a content edit; `ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS` requires reviewing anchor impact; a hidden warning still blocks with `--strict`.
Repairs do not infer meaning, labels or alternative text.

Both physical repair commands require exactly one of `--write` or `--dry-run`, even for an empty selection.
Both previews report result-5 candidate hashes, byte counts and change decisions without changing sources; successful previews are not formatting-check verdicts.
Selected, empty and supplied-buffer checks establish only their actual scope, with dependency reads listed separately.
`maxRequestBytes` counts the actual internal JSON/base64 framing, and `maxOutputBytes` bounds complete reports and raw delivery.
One raw deadline covers stdin through complete output, with separate checker cleanup.
Delivery failure is exit 2: discard partial stdout, and inspect confirmed physical writes before retrying.

### Root resolution

An explicit `--root` or API `root` selects exactly that directory, including a subdirectory of a checkout.
Otherwise the root is the nearest Git checkout, verified through host Git, else the nearest directory with a regular `package.json`, else the current directory.
Git worktree and submodule `.git` files are verified by host Git rather than parsed.
Malformed or unverifiable Git metadata is an operational error, not a reason to search farther outward.
`.markdown-quality.json` is looked up only at the selected root, and `--config` never relocates the root.
A missing explicit `--config`, an unreadable or linked file, invalid JSON, schema errors and unsupported versions return exit `2`; none falls back to defaults.

## Sparse configuration

Every key is optional, and `{}` is equivalent to no file.
When present, `schemaVersion` must be `3` and `preset` must be `authored-gfm@2`; older markers fail with migration guidance.

| Key                       | Default                                              | Merge rule                                                         |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `include`                 | `["**/*.md"]`                                        | A supplied nonempty list replaces the default                      |
| `exclude`                 | `["**/vendor/**", "**/.cache/**", "**/coverage/**"]` | A supplied list replaces the default; `[]` clears these exclusions |
| `lint`                    | Complete package rule map                            | Supplied `off`, `info`, `warn` or `error` severities merge by rule |
| `syntax.frontmatter`      | `"yaml"`                                             | `false`, `"yaml"`, `"toml"` or `"json"` replaces it                |
| `links.checkLocalTargets` | `true`                                               | `false` disables filesystem target, case and cross-document checks |
| `links.rootRelative`      | `"reject"`                                           | `"consumer-root"` resolves `/path` links against the root          |
| `layout`                  | `{"endOfLine": "lf", "tabWidth": 2}`                 | Supplied fields merge; `endOfLine` also accepts `crlf`, `preserve` |
| `analyzerLimits`          | Package analyzer ceilings                            | Supplied leaves merge; `null` disables one, `false` disables all   |

Exclude only a generated area and keep everything else:

```json
{
  "exclude": ["docs/generated/**"]
}
```

Keep a narrow authored scope with one rule exemption and front matter disabled:

```json
{
  "schemaVersion": 3,
  "preset": "authored-gfm@2",
  "include": ["*.md", "docs/**/*.md"],
  "exclude": ["docs/reviews/**"],
  "lint": { "quality/long-prose-line": "off" },
  "syntax": { "frontmatter": false },
  "links": { "rootRelative": "consumer-root" }
}
```

Raise one analyzer ceiling and disable another:

```json
{
  "analyzerLimits": { "maxDocumentBytes": 8388608, "maxDocumentDiagnostics": null }
}
```

Unknown keys, versions and rules fail.
Patterns are relative slash-separated picomatch globs; absolute, backslash, `..` and NUL patterns fail.
Ignore files, EditorConfig, JavaScript configuration and inline disable comments have no Markdown policy authority.

## Rule defaults

| Rule                                    | Default | Notes                                                                                   |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `quality/non-nfc-prose`                 | `error` | Decomposed prose fails check; only `normalize` repairs it                               |
| `quality/generic-link-text`             | `error` | Exact labels listed below, in prose and tables                                          |
| `quality/duplicate-sibling-heading`     | `error` | Sibling headings within one section, not every repeated heading                         |
| `quality/heading-trailing-punctuation`  | `warn`  | Question marks are allowed; `--strict` makes warnings block                             |
| `quality/long-prose-line`               | `info`  | Prose lines over 120 characters; URLs, literals, tables and code are exempt             |
| `quality/placeholder-image-alt`         | `error` | Reviewed placeholder alternatives listed below                                          |
| `quality/unlabeled-image-link`          | `error` | Image-only links need a meaningful static label                                         |
| `quality/disallowed-html-construct`     | `error` | Finite construct list below; not a sanitizer                                            |
| `quality/missing-html-image-alt`        | `error` | Reported only when `markdown/require-alt-text` is off, which already reports absent alt |
| `quality/local-path-case-mismatch`      | `error` | Local path components must match directory-entry spelling exactly                       |
| `quality/unresolved-local-fragment`     | `error` | Missing or ambiguous same- and cross-document fragments                                 |
| `markdown/no-bare-urls`                 | `error` | Angle-bracket autolinks remain allowed                                                  |
| `markdown/no-missing-link-fragments`    | `off`   | Replaced by `quality/unresolved-local-fragment`; still selectable                       |
| `markdown/no-html`                      | `off`   | Raw HTML stays allowed and protected from rewrites                                      |
| `markdown/fenced-code-language`         | `error` | Code fences need an author-supplied language                                            |
| `markdown/heading-increment`            | `error` | Heading levels increase one at a time                                                   |
| `markdown/no-multiple-h1`               | `error` | At most one H1; an H1 is not mandatory                                                  |
| `markdown/no-duplicate-definitions`     | `error` | Including footnote definitions                                                          |
| `markdown/no-empty-definitions`         | `error` | Including footnote definitions                                                          |
| `markdown/no-unused-definitions`        | `error` | Including footnote definitions                                                          |
| `markdown/no-empty-images`              | `error` | Upstream rule                                                                           |
| `markdown/no-empty-links`               | `error` | Upstream rule                                                                           |
| `markdown/no-invalid-label-refs`        | `error` | Upstream rule                                                                           |
| `markdown/no-missing-atx-heading-space` | `error` | Upstream rule                                                                           |
| `markdown/no-missing-label-refs`        | `error` | GitHub alert labels are allowed                                                         |
| `markdown/no-reference-like-urls`       | `error` | Upstream rule                                                                           |
| `markdown/no-reversed-media-syntax`     | `error` | Upstream rule                                                                           |
| `markdown/no-space-in-emphasis`         | `error` | Upstream rule                                                                           |
| `markdown/require-alt-text`             | `error` | Markdown images need alternative text                                                   |
| `markdown/table-column-count`           | `error` | Including missing cells                                                                 |

Generic link labels, matched case-insensitively after trimming, are `click here`, `here`, `read more`, `more`, `link`, `learn more`, `this link`, `more info`, `more information` and `this page`.
Placeholder alternatives, matched after trimming, collapsing whitespace and lowercasing, are `image`, `img`, `photo`, `picture`, `screenshot`, `alt text`, `image description`, `alt`, `graphic`, `icon` and `logo`.
Every rule accepts `off`, `info`, `warn` or `error`; `info` reaches ESLint as `warn` but is reported and admitted as information.
Formatting whitespace policy, canonical layout and preservation guards are not lint rules and cannot be disabled.

## Selection, boundaries and omissions

Full selection discovers files that match `include`, including hidden authored directories and GitHub metadata.
A broad pattern such as `docs/**` or `**/*` discovers only lowercase `.md` files, so images and other data are never swept in.
A pattern that names another extension or file opts it in: `"include": ["**/*.md", "**/*.markdown"]`, `**/*.{md,markdown}`, `**/*.MD` or a literal `LICENSE`.
A pattern opts a file in when it would not also match that path with a different extension; matching is case-sensitive.
Literal arguments after `--` and `--files-json` select exactly those paths; `--files-json '[]'` selects nothing and succeeds.
An explicitly named file or logical document path is checked as GitHub Flavored Markdown whatever its extension and whether or not `include` matches it; only an exclusion omits it.
MDX is a different dialect: a named `.mdx` file or an include pattern that names MDX fails with `UNSUPPORTED_DIALECT`, and broad patterns never select it.
Exclusions are tested against a path and every ancestor directory identically in full, explicit and logical requests.
Hard operational boundaries `.git`, `node_modules`, `.venv`, `venv`, `.hi` and `.markdown-quality-trusted-inputs` can never be selected or read and are not erased by `exclude: []`.
Directory traversal never follows symbolic links or Windows junctions, and explicit linked paths fail.
Formatting hard-linked files is refused.

`selection.omissions` records each omitted discovered path with reason `excluded`, `not-included` or `operational-boundary`, plus the matching pattern and matched path or ancestor.
With `--reconcile-inventory git`, `selection.reconciliationDecisions` explains every tracked Markdown path, as discovery defines it, as `selected`, `excluded`, `not-included` or `operational-boundary`.
Selected tracked files must be present regular inputs.

## Links, fragments, path case and read dependencies

Local links, images and definitions are parsed with maintained mdast/GFM libraries; external URLs are classified without network access.
Path and fragment are percent-decoded separately exactly once; malformed encodings fail.
Contained files and directories are valid targets; root-relative `/path` links fail unless `links.rootRelative` is `"consumer-root"`.
Each local path component must match the directory entry's exact spelling on every platform, reported as `quality/local-path-case-mismatch`; files are never renamed.

Fragments are validated against `.md` targets and targets that `include` opts in, using one anchor model:

- Generated heading anchors use `github-slugger` over rendered heading text with source-order duplicate suffixes, matched case-insensitively.
- Explicit HTML `id` and anchor `name` values match exactly; duplicate explicit IDs are ambiguous.
- `top`, GitHub line references such as `L10` and a trailing `{#id}` heading suffix are retained compatibility choices, not GFM features.
- An empty fragment is a document link and passes when the path is valid.
- Fragments on other targets are not validated; their path still is.

A cross-document target inside the root and outside hard boundaries is read as a dependency even when it is unselected or excluded.
Dependencies are read once, never linted, formatted or crawled, and are listed in `selection.readDependencies`.
They are bounded by `maxReadDependencyDocuments` (default 10,000) and the shared `maxDocumentBytes` and `maxTotalDocumentBytes` accounts.

## Static accessibility and HTML policy

Markdown images are informational: empty `![](...)` alternatives fail.
Mark a decorative image with an HTML `<img>` that has `alt=""` or `aria-hidden="true"`.
Image-only Markdown links and HTML anchors need a meaningful static label from text or image alternatives.

`quality/disallowed-html-construct` reports this finite set, parsed with `parse5` rather than regular expressions:

- GFM tagfilter elements `title`, `textarea`, `style`, `xmp`, `iframe`, `noembed`, `noframes`, `script` and `plaintext`.
- Event-handler attributes.
- `javascript:` and `vbscript:` URLs in URL attributes after character-reference decoding.

It does not establish that other HTML is safe and is not a sanitizer.
The narrowed model parses each raw HTML node as one fragment and joins adjacent inline HTML nodes separated only by whitespace.
Dynamic `aria-labelledby`, CSS visibility, renderer sanitization and DOM accessibility are outside this static checker; passing checks do not certify accessibility.

## NFC policy and normalization

`quality/non-nfc-prose` inspects decoded prose in paragraphs, lists, blockquotes, headings, table cells, link labels and image alternatives, across emphasis boundaries.
Code, front matter, raw HTML, destinations and definition identifiers are outside the rule.
Check and format never normalize text.
Detection and repair use the runtime's ICU normalization; the repository tests both against the official Unicode `NormalizationTest.txt` data for the Unicode version of each supported Node line, and results record the runtime's Node, ICU and Unicode versions.
Intentionally decomposed prose can opt out with `{"lint": {"quality/non-nfc-prose": "off"}}`; a nonempty `normalize` then refuses with `NFC_RULE_DISABLED`, while `info` and `warn` still allow it.

`normalize` makes minimal source-span edits to eligible prose and preserves every other byte, including EOL layout.
It refuses, before any write, combining sequences split by inline boundaries that cannot be represented, new structural findings and overlapping edits.
If a generated heading anchor changes, including suffix cascades on later headings, it refuses with `ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS` and lists the `anchorChanges`.

Preview first, then authorize anchor changes:

```sh
npm exec -- markdown-quality normalize --root . --dry-run
npm exec -- markdown-quality normalize --root . --dry-run --update-links
npm exec -- markdown-quality normalize --write --root . --update-links
npm exec -- markdown-quality check --root .
```

With `--update-links`, normalize inventories reverse references across every `.md` file and every file that `include` opts in, in the root outside hard boundaries, and updates supported local fragments inside the selected write set.
For example, with `"exclude": ["archive/**"]` and `archive/old.md` linking to a changed heading in `docs/guide.md`, the preview reports `archive/old.md: OUT_OF_SCOPE_REFERENCE` and exits `1` with zero writes.
Adjust the selection or scope deliberately and rerun.
References inside raw HTML refuse with `PROTECTED_HTML_REFERENCE`, and edits that cannot be represented refuse with `UNREPRESENTABLE_FRAGMENT_EDIT`.
`backlinkCoverage` reports the inventoried document count and `externalReferences: "unverified"`; absence from the local inventory never proves there are no external callers.

A preview performs the same selection, edits, anchor mapping, inventory and freshness checks as a write, but returns `operationStatus: "previewed"`, `qualityBasis: "candidate"` and empty `writtenPaths`.
A later write reruns preparation; a preview is never a stored write token.

## Composable repairs

`format` may leave only `quality/non-nfc-prose`; `normalize` may leave only presentation drift that `format` repairs.
Either order reaches a passing check for otherwise valid input:

```sh
npm exec -- markdown-quality format --write --root .
npm exec -- markdown-quality normalize --write --root .
npm exec -- markdown-quality check --root .
```

A repair that exits `0` with residual findings reports `qualityStatus: "findings"` and says so in human output.
Only a complete `check` on the intended input establishes the verdict; CI gates must not accept a repair or preview result in its place.

## Partial-write recovery

Repairs validate the complete batch before the first replacement, so a known refusal writes nothing.
Replacement is per-file guarded, not a transaction: each file's identity and bytes are rechecked immediately before it is replaced.
If a later replacement fails, `documentResults` keeps `written` for completed files and `pending` for unapplied changes, and `qualityStatus` is `incomplete`.
Retain preimages or start from a clean commit; applying NFD cannot restore the original bytes of normalized text.
Reconcile recorded effects and rerun from current inputs rather than replaying a preview.

## Execution profiles and resource controls

Ordinary operations auto-discover an optional sparse `.markdown-quality-execution.json` at the root; `--execution-profile PATH` selects another file.
Its `schemaVersion`, when present, must be `2`.
Persist an unlimited default for one consumer:

```json
{
  "resourceLimitMode": "unlimited"
}
```

Resolution order is package defaults, configuration `analyzerLimits`, execution profile, then invocation options.
Every ceiling accepts a positive safe integer or `null`, which disables that ceiling.
`resourceLimitMode: "unlimited"` projects every package ceiling to `null`, including bootstrap reads; a finite value in the same layer is contradictory and fails.
`--no-analyzer-limits` or `analyzerLimits: false` disables analyzer ceilings only.
A file cannot authorize reading itself beyond its bootstrap ceiling, so use `--max-profile-bytes N` or invocation unlimited mode for an unusually large profile.
Unlimited mode cannot remove Node, V8, JavaScript representation, operating-system, filesystem or hosting-provider limits, and it is not a speed claim.
Inspection and results report each effective ceiling, its origin and `resourceLimitMode`.

Analyzer ceilings, in configuration `analyzerLimits`, the profile's `analyzerLimits` or invocation options:

| Key                                  |    Default | Unit and population                                                              |
| ------------------------------------ | ---------: | -------------------------------------------------------------------------------- |
| `maxDocumentBytes`                   |  2,097,152 | Bytes of each selected input, read dependency and proposed output                |
| `maxTotalDocumentBytes`              | 33,554,432 | Bytes of the unique input union, and separately of proposed outputs              |
| `maxPathsPerSelectionStage`          |     10,000 | Paths in each explicit input, reconciliation inventory and final selection stage |
| `maxEnumeratedEntries`               |    100,000 | Directory entries enumerated, including skipped entries                          |
| `maxConfigurationBytes`              |    262,144 | Configuration input bytes                                                        |
| `nativeInvocationTimeoutMs`          |     15,000 | Milliseconds per native process invocation, including grouped invocations        |
| `maxNativeOutputBytes`               |  8,388,608 | Output bytes per native invocation                                               |
| `maxTotalDiagnostics`                |     10,000 | Diagnostics per operation                                                        |
| `maxDocumentDiagnostics`             |      1,000 | Diagnostics per document                                                         |
| `maxDiagnosticJsonBytes`             |  4,194,304 | UTF-8 JSON array bytes, separately per document and per operation                |
| `maxInventoryBytes`                  |  4,194,304 | Inventory output and candidate path bytes                                        |
| `documentAnalysisTimeoutMs`          |     30,000 | Milliseconds per document across analysis phases                                 |
| `maxWorkerOldGenerationMiB`          |        128 | Worker V8 old generation in MiB, not total process memory                        |
| `workerStackMiB`                     |          4 | Worker stack in MiB                                                              |
| `nativeStagingAccessTimeoutMs`       |      1,000 | Milliseconds to establish private Windows native scratch access                  |
| `maxNativeStagingCommandOutputBytes` |     65,536 | Output bytes of native scratch-access setup commands                             |
| `maxPatternsPerList`                 |        100 | Entries in `include` and in `exclude`, independently                             |
| `maxPatternCodePoints`               |        512 | Unicode code points per glob                                                     |
| `maxRuleOverrideCount`               |         60 | Supplied `lint` entries                                                          |
| `maxReadDependencyDocuments`         |     10,000 | Unique additional Markdown documents read for targets or reverse references      |

Execution ceilings, as profile keys or SDK execution options:

| Key                          |    Default | Unit and population                                                             |
| ---------------------------- | ---------: | ------------------------------------------------------------------------------- |
| `executionTimeoutMs`         |    180,000 | Milliseconds per request-runner child                                           |
| `maxOutputBytes`             |  8,388,608 | Bytes per child stdout or stderr stream and per report                          |
| `maxRequestBytes`            |  8,388,608 | UTF-8 bytes of a serialized request, including CLI stdin requests               |
| `maxNodeOldGenerationMiB`    |        256 | Request-runner child old generation in MiB                                      |
| `maxProfileBytes`            |     65,536 | Execution profile bytes, admitted before the profile is read                    |
| `maxRuntimeDeclarationBytes` |     65,536 | Bytes of each runtime declaration file                                          |
| `gitTimeoutMs`               |     10,000 | Milliseconds per Git inventory or identity subprocess                           |
| `runtimeProbeTimeoutMs`      |     10,000 | Milliseconds per runtime probe                                                  |
| `maxRuntimeProbeOutputBytes` |      4,096 | Output bytes per runtime probe                                                  |
| `maxQualificationSamples`    |        100 | Ceiling on `requiredConsecutiveSamples`                                         |
| `maxEvidenceInputBytes`      | 67,108,864 | Evidence packaging input bytes                                                  |
| `maxUnboundEvidenceSamples`  |      1,000 | Samples collected without a complete trusted profile                            |
| `maxMemoParseBytes`          |  4,194,304 | Per-invocation parse memo bytes                                                 |
| `maxMemoLayoutBytes`         |  4,194,304 | Per-invocation layout memo bytes                                                |
| `maxMemoEntriesPerStage`     |          4 | Memo entries per stage                                                          |
| `cleanupTimeoutMs`           |      5,000 | Milliseconds to wait for package cleanup; null removes only the deadline        |
| `maxComparisonInputBytes`    |  8,388,608 | Bytes per comparison harness input file                                         |
| `maxGitInventoryOutputBytes` |    Derived | Bytes of Git inventory output; defaults to `maxInventoryBytes`                  |
| `maxGitTreeOutputBytes`      |    Derived | Bytes of qualification Git tree output; defaults to `maxStagedEntries` × 1024   |
| `sampleTimeoutMs`            |   Declared | Milliseconds per qualification sample window, including staging and observation |
| `maxObservedMemoryBytes`     |   Declared | Observer rejection threshold for its declared platform memory metric            |
| `maxStagedDataBytes`         |   Declared | Bytes of candidate and trusted data admitted for staging                        |
| `maxStagedEntries`           |   Declared | Files and directories enumerated for staging admission                          |

Trusted qualification declares `sampleTimeoutMs`, `maxObservedMemoryBytes`, `maxStagedDataBytes` and `maxStagedEntries` (a positive integer or null); ordinary operations have no package default for them.
Quality policy, NFC enforcement, containment, freshness and guarded replacement are not resource ceilings and stay enforced in every mode.

## Opt-in concurrency

`--concurrency N` and `runQuality({ concurrency: N })` request at most `N` simultaneous document preparations; the default is `1`.
It is an execution option, not a configuration field or a resource ceiling.
Diagnostics keep document order, and replacement remains serial after the complete batch validates.
Higher counts may increase memory use or reduce throughput; serial qualification budgets do not certify a parallel count.

## Library API

```javascript
import {
  runQuality,
  inspectSelection,
  processLogicalDocument,
  executeQualityRequest,
  readExecutionProfile,
  validateQualityResult,
  compareCheckReports,
  stageCandidateData,
  qualifyGitMarkdown,
} from "@hadden-industries/markdown-quality";

const result = await runQuality({ root: ".", mode: "check" });
```

- `runQuality(options)` runs `check`, `format`, `normalize` or `inspect` in process, including guarded physical repairs; options are `mode`, `root`, `config`, `files`, `reconciliationInventory`, `concurrency`, `strict`, `analyzerLimits`, `executionProfile`, `executionLimits`, `resourceLimitMode`, `gitExecutablePath`, `dryRun` and `updateLinks`.
- `inspectSelection(options)` returns policy and selection with `qualityStatus: "not-checked"`.
- `processLogicalDocument({ content, path, requestId, ...options })` processes supplied Buffer bytes at a logical path, defaulting to `format`, and never writes the checkout; excluded input is returned unchanged.
- `executeQualityRequest(request, options)` runs one request in a fresh Node process with `signal`, `processGroup`, `resourceLimitMode` and execution ceilings; it refuses physical repairs and is not a sandbox.
- `readExecutionProfile({ root, profile, invocation, purpose })` resolves a profile's resource policy without analysis.
- `validateQualityResult(report, expected)` validates a result against schema 4 and returns the original report.
- `compareCheckReports({ incumbent, candidate, incumbentSchema, candidateSchema, incumbentInputs, candidateInputs })` compares complete read-only check reports and refuses repair or preview receipts.
- `stageCandidateData` and `qualifyGitMarkdown` support trusted qualification; see the [centralized contracts guide](centralized-contracts.md) and [CI trust guide](ci-trust.md).

Unknown and removed option keys fail rather than restoring defaults.
Schemas are exported as `./configuration-schema`, `./effective-configuration-schema`, `./result-schema`, `./execution-schema` and `./comparison-schema`.

## Result schema 4 essentials

| Field              | Meaning                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `operationStatus`  | `completed`, `previewed`, `refused` or `failed`                                                                                               |
| `qualityStatus`    | `clean`, `findings`, `incomplete` or `not-checked` over the complete selected scope                                                           |
| `qualityBasis`     | `input`, `candidate`, `applied` or null                                                                                                       |
| `documentResults`  | One record per selected path with `analysisStatus` and `writeStatus`                                                                          |
| `writtenPaths`     | Confirmed `written` paths only; empty for check, inspect, preview and logical documents                                                       |
| `proposedChanges`  | Kind `prose-nfc` or `local-fragment`, original UTF-8 half-open byte span, one-based line and UTF-16 column, before/after lengths and SHA-256  |
| `anchorChanges`    | Path, heading ordinal, source position, `oldAnchor` and `newAnchor`                                                                           |
| `backlinkCoverage` | Inventoried documents and `externalReferences: "unverified"`, or null                                                                         |
| `refusals`         | Code, message and optional location for each refusal                                                                                          |
| Provenance hashes  | `configurationOrigin`, `configurationBytesSha256`, `defaultConfigurationSha256`, `policyResolverInputsSha256`, `effectiveConfigurationSha256` |
| `resourcePolicy`   | Limit mode, effective execution ceilings, origins, profile identity and external constraints                                                  |
| `runtime`          | Node, ICU and Unicode versions                                                                                                                |
| `root`             | The resolved root, reported by `inspect`                                                                                                      |

`analysisStatus` is `not-requested`, `completed` or `incomplete`; `writeStatus` is `not-requested`, `unchanged`, `refused`, `written` or `pending`.
Absent, `{}` and equivalent explicit configurations share `effectiveConfigurationSha256` while keeping distinct origins.
No excerpts, document bodies or absolute root paths are emitted by default, except the root in inspection.
Machine output follows the result schema even for CLI input failures.
