# Consumer guide

Install an exact coordinated public release after registry availability is verified.
Acquisition needs no npm account or token; disable lifecycle scripts.

```sh
npm install --save-dev --save-exact --ignore-scripts @hadden-industries/markdown-quality@1.0.3
npm ci --ignore-scripts
```

The installation command selects the existing published `1.0.3` release.
Development source replaces its `authored-gfm@1` defaults in place; adoption requires a subsequently qualified major release.
No `authored-gfm@2` or selectable legacy policy is introduced.
General pilot availability and stable `latest` designation are separate decisions.
The owner explicitly authorized 1.0.3 to be published as `latest`, subject to its complete archive, registry/provenance and immutable-release verification.
The previously qualified alpha.4 tuple remains immutable historical evidence.
That release decision does not accept or change either consumer's separately paused migration; both still require their exact scope and trusted-run acceptance before cutover.
Keep the consumer lockfile.
An isolated `tooling/markdown` npm project supports consumers that do not use Node for their application.
Its commands must pass the actual repository root.

Place this bounded JSON policy at the repository root.

```json
{
  "schemaVersion": 1,
  "preset": "authored-gfm@1",
  "include": ["*.md", "docs/**/*.md"],
  "exclude": ["docs/reviews/**", "docs/generated/**"],
  "ignoreFiles": [".gitignore", ".prettierignore"],
  "lint": {},
  "links": { "localFiles": true, "rootRelative": "reject" },
  "layout": { "endOfLine": "preserve", "tabWidth": 2 }
}
```

Include and exclude entries are relative slash-separated globs supplied to picomatch.
Explicit exclusions win.
Prettier owns the configured ignore files' native semantics.
Missing optional default ignore files are allowed.
Dependency, Git, and tooling directories cannot become document inputs.
Directory traversal never follows symbolic links or Windows junctions.
Explicit linked paths fail.
Formatting hard-linked files is unsupported.

Unknown fields, versions, and lint rules fail.
Lint overrides accept `off`, `info`, `warn`, or `error` for installed `markdown/` rules and package `quality/` advisories.
Warnings are unresolved findings and block formatting under `--strict`.
GitHub alert labels are allowed.
Consumer JavaScript configs, arbitrary plugins, inline ESLint disable comments, and native executable overrides are not execution authority.

Local Markdown links, images, and definitions are parsed with maintained mdast/GFM libraries.
Percent-encoded filenames resolve after decoding.
Contained files and directories are valid targets.
External schemes are classified without network access.
Same-document fragments use the native ESLint Markdown rule.
Cross-document heading fragments and remote availability are outside this version's contract.

The library exports `runQuality({ root, config, mode, files, concurrency })`.
Omit `files` for full discovery.
An explicit empty array selects nothing.
CLI literal filenames follow `--`; `--files-json` accepts the JSON array directly.
Results identify the package, preset, tools, config digest, selection, diagnostics, written paths, unchanged paths, unprocessed paths, and operational errors.
Text and JSON share the same result.

## Opt-in concurrency in current source

The `concurrency` option is implemented in development source and is not available in published `1.0.3`.
Its default is `1`, retaining serial analysis.
Use a positive integer to request a maximum number of simultaneous document preparations; there is no configured upper bound or automatic CPU/memory tuning.
The same setting is available as CLI `--concurrency N` and library `runQuality({ concurrency: N })`.
It is an execution option, not a field in `.markdown-quality.json` or a different Markdown preset.
For example, against current source:

```sh
node src/cli.js check --root . --concurrency 2
node src/cli.js format --root . --concurrency 2
```

Workers are reused and created only for available work in the existing bounded batches.
Grouped native prechecks and final independent prose verification remain coordinated; native formatting within concurrent preparations can overlap, and Snapper can also use its own internal threads.
The count therefore controls JavaScript preparation concurrency rather than the total number of operating-system threads or native processes.
Diagnostics and failure selection retain document order, all analysis workers stop before private staging is removed, and formatting replacement remains serial after successful validation of the complete batch.
Consumer-selected concurrency may increase memory use or reduce throughput; the consumer owns performance and capacity choices.
The serial producer qualification budgets do not certify any selected parallel count.
Resource defaults apply unless overridden by the consumer.

Exit `0` means no blocking findings, including completed formatting with warnings/information.
Exit `1` means errors or read-only formatting drift; `--strict` also blocks on warnings.
Information never affects exit or write admission.
The library accepts `strict: true` with the same behavior.
Exit `2` means configuration, tool, input, or operation failure.
Machine output follows the shipped result schema even for CLI input failures.
Development source emits result `schemaVersion: 2`; configuration remains `schemaVersion: 1`.
`outcome: findings` can coexist with exit `0`; machine callers use `exitCode` and retain diagnostics.
Inspection includes effective configuration, native formatter/lint options and sentence-layout policy, including empty selections.
No excerpts, document bodies, or absolute root paths are emitted by default.

## Diagnostic display in current source

`--diagnostic-level info|warning|error` selects the minimum severity displayed in human-readable output.
The default is `info`, which retains the existing complete text output.
For example, against current source:

```sh
node src/cli.js check --root . --diagnostic-level warning
node src/cli.js format --root . --strict --diagnostic-level error
```

The summary reports hidden information and warning counts.
Under `--strict`, hidden warnings still block and the summary explicitly explains that decision.
Errors and operational failures are always reported.
Invalid levels fail before analysis or writes.

This option changes presentation only: rules still run, diagnostic budgets still count every finding, and exit codes and guarded formatting decisions are unchanged.
With `--json`, the complete structured result is retained at every valid display level.
The library returns the same complete result; it does not log findings or accept a display-level option.

Rule disabling is an explicit checking choice through existing `lint` settings.
To disable the three default information advisories:

```json
{
  "quality/heading-trailing-punctuation": "off",
  "quality/long-prose-line": "off",
  "quality/non-nfc-prose": "off"
}
```

Place these entries in the configuration's `lint` object.
Disabled advisories skip their rule-specific work; when every advisory is disabled, the advisory checker skips syntax parsing and traversal entirely.
Formatting, native linting, local-link checks and preservation guards continue according to their own configured contracts.
No global rule-execution suppression option is introduced.

## Operational resource budgets

Default limits are 2 MiB per document, 32 MiB per batch, 10,000 selected documents, 100,000 enumerated entries, and 256 KiB per configuration or ignore file.
Native invocations have a 15-second deadline and an 8 MiB output cap.
Each analysis worker has a 128 MiB old-generation JavaScript heap limit and 4 MiB stack limit; document analysis retains its 30-second deadline.
These heap limits do not bound native processes, external buffers or total process memory.
Discovered path bytes are capped at 4 MiB.
Diagnostics are capped at 1,000 records per document, 10,000 records across the batch, and 4 MiB per document and batch.
Exceeding a selected finite limit returns exit `2` before any formatting writes.
Text diagnostics escape terminal control characters; JSON retains structured relative filenames.
Lint messages describe the violated rule without quoting document content.
These are conservative operational limits; benchmark and platform acceptance remains part of candidate qualification.

Every package operational resource ceiling is consumer-controlled.
Set `"limits": false` in configuration, pass `limits: false` to `runQuality`, or use `--no-limits` to bypass all ceilings.
Set an individual field to `null` to bypass only that ceiling, or to a positive safe integer to raise or lower it without a package policy maximum.
For example, `"limits": { "documentDiagnostics": null, "diagnostics": 50000 }` permits unlimited findings per document while retaining a batch count ceiling.
Invocation fields override configuration fields; omitted fields retain the configuration choice or explicit package default.
Inspection and JSON reports expose the resolved limits, including `null` values; `configDigest` still identifies the original configuration bytes.

```javascript
const result = await runQuality({ root, limits: false });
```

```sh
markdown-quality check --root . --no-limits --json
```

Supported fields and default values are:

| Field                 |  Default | Unit or scope                                          |
| --------------------- | -------: | ------------------------------------------------------ |
| `fileBytes`           |  2097152 | Each input and formatted document                      |
| `totalBytes`          | 33554432 | Input and formatted batch totals                       |
| `files`               |    10000 | Explicit selection and selected documents              |
| `entries`             |   100000 | Enumerated directory entries                           |
| `selectionBytes`      |  4194304 | Discovered path bytes                                  |
| `configBytes`         |   262144 | Configuration and each ignore file                     |
| `patterns`            |      100 | Each include/exclude array                             |
| `patternLength`       |      512 | Characters per glob or ignore filename                 |
| `ignoreFiles`         |       10 | Configured ignore files                                |
| `lintRules`           |       60 | Configured rule overrides                              |
| `documentDiagnostics` |     1000 | Findings per document                                  |
| `diagnostics`         |    10000 | Findings per operation                                 |
| `diagnosticBytes`     |  4194304 | Serialized diagnostic array per document and operation |
| `nativeMs`            |    15000 | Milliseconds per native invocation                     |
| `nativeOutputBytes`   |  8388608 | Output bytes per native invocation                     |
| `analysisMs`          |    30000 | Milliseconds per document across analysis phases       |
| `workerHeapMb`        |      128 | Worker old-generation heap MiB                         |
| `workerStackMb`       |        4 | Worker stack MiB                                       |
| `stagingMs`           |     1000 | Milliseconds to establish private Windows staging      |
| `stagingOutputBytes`  |    65536 | Output bytes per staging helper                        |

The configuration is read before applying its resolved size ceiling so it can declare its own bypass.
Unlimited removes package ceilings; available memory, OS limits, and Node/native runtime constraints still apply.
For worker memory, `null` omits the package resource setting and uses the runtime's intrinsic allocation limits; a finite value explicitly requests the corresponding worker setting.
Internal group partitioning and memo cache retention continue to divide work or skip caching; they do not reject inputs.
Resource overrides preserve quality rules, path safety, semantic preservation, convergence and complete-batch write admission.
The consumer owns the capacity consequences of its choices.
The report-comparison harness likewise accepts `--no-limits` before its six input paths to bypass its default 8 MiB input-file ceiling; the library imposes no manifest/report size ceiling.

Formatting compares maintained parsed structure and literals before replacement and verifies convergence.
When canonical dots would merge adjacent ordered lists, or an ATX heading cannot retain a literal or hard break, formatting stops before writing.
Consolidate the lists or add a separating block explicitly; edit the heading explicitly rather than relying on an invented separator or lost content.
The owner-approved stricter whitespace policy updates `authored-gfm@1` directly; no second preset is provided.
This change is currently unreleased; existing published npm archives retain their original behavior.
Trailing spaces and tabs are errors outside parsed literal payloads.
This includes blank lines, headings, lists, tables, and opening or closing fence lines.
Space-based hard breaks are forbidden; formatting replaces actual parsed hard breaks with an explicit backslash followed by a newline, preserving the break.
The whitespace policy cannot be disabled through lint overrides or editor settings.
Code, raw HTML and recognized front matter retain literal content under the selected EOL policy, including whitespace-only lines and trailing spaces; embedded code formatting remains disabled.
The default normalizes physical CRLF and lone CR to LF throughout every selected file, including literal payloads.
Written `\r\n` escape sequences, Unicode normalization and Unicode separators are unchanged.
Explicit `layout.endOfLine: "crlf"` selects file-wide CRLF; `"preserve"` selects CRLF when the input contains CRLF, otherwise LF, rather than preserving mixed separators byte-for-byte.
Formatting uses open ATX headings, star emphasis, sequential ordered markers retaining the start, hyphen bullets, lowercase task markers and safe backtick fences.
Indented code converts to fences; the required language must come from its author, so unlabeled conversions block the complete batch without inserting a label.
Inline code compares [CommonMark code-span semantics](https://spec.commonmark.org/0.31.2/#code-spans): each line ending means one space, while interior spaces, tabs and other literal characters remain significant.
Delimiter padding is already handled by the maintained parser; the comparison does not collapse or trim additional whitespace.
The parsed comparison is an additional backstop, not a universal rendered-equivalence guarantee.
It conservatively refuses unsupported semantic or literal changes.
YAML front matter is recognized only at the leading boundary and is preserved without interpreting its metadata.
`syntax.frontmatter` explicitly selects `"yaml"` (default), `"toml"`, `"json"`, or `false`.
TOML uses `+++` fences; JSON uses `---` fences around JSON content, matching the native ESLint parser.
Recognition supplies no site schema validation or metadata execution.
GitHub alerts, HTML, bare URLs, Unicode emoji, emoji shortcodes, and author punctuation remain allowed.
The default advisory rules report duplicate sibling headings and generic link text at warning, and heading punctuation, prose lines over 120 characters and non-NFC prose at information.
URLs, literals, tables and code are excluded from prose-width observations; question-mark headings are legitimate.
Each advisory is individually disableable or severity-selectable in `lint`; no advisory rewrites author content.
Meaningful image descriptions remain an author judgement; missing-alt checks cannot certify accessibility.
Check first prepares the guarded candidate; drifting inputs defer structural lint until canonical source exists, avoiding candidate coordinates attributed to original bytes.
Both checking and formatting validate the selected documents; checking never changes checkout files, and formatting writes only after every candidate passes validation.
Native checks may group exact document snapshots and complete list-item continuations in a private temporary directory outside the checkout.
Groups have at most 32 independent files and 4 MiB of input, with the existing native deadline and output cap.
The package supplies its own immutable native configuration and EditorConfig boundary; consumer settings do not control these checks.
If private staging cannot be established, checking uses the original standard-input path.
Payloads are removed after each native invocation, and the owned directory is removed after all analysis workers stop, before any formatting replacement.
Changed staging identities or incomplete cleanup cause an operational failure and block formatting writes.
Abrupt process or host termination can leave private temporary files for operating-system or owner cleanup; deletion does not promise secure erasure.
No persistent syntax, formatting or filesystem-validity cache is created.
Use explicit selection exclusions for signed, byte-sensitive, or verbatim upstream documents that must remain unchanged.
Git whitespace checks can supplement this policy but do not replace full-document checking.
Ordinary file permission bits are preserved; ownership changes, alternate streams, ACL inheritance, arbitrary metadata, and adversarial filesystem races are not promised as preserved.
Use a clean baseline or retained preimages when original uncommitted bytes must be recoverable.

## Adopting the replacement defaults

Capture incumbent package/lock/configuration/workflow identities, the authored selection and exact document preimages before upgrading.
Keep consumer scopes and exclusions, especially generated, vendor, signed, verbatim or byte-sensitive documents; upgrading the producer does not expand them.
On the same original files, capture read-only incumbent and candidate JSON reports with their shipped schemas and path/byte-count/SHA-256 manifests.
The library's `compareQualityReports` and maintainer `scripts/compare-quality-reports.js` validate those supplied reports and require identical source identities and selections.
The harness never acquires or executes a package from report data and never changes documents.
It identifies added/resolved/retained findings, reworded messages, explicit would-format paths and both effective report/configuration/policy identities.
Incumbent reports that predate policy inspection retain a `null` policy identity; the harness does not reconstruct dependency defaults.
Errored or unaccounted reports are rejected.
For a completely checked batch blocked by findings, `unprocessed` records paths whose writes were not admitted; this is a valid read-only comparison input.
Input manifests are reported evidence, not authenticated attestations.
Review changed formatting and findings, then make mechanical formatting and content fixes reviewable separately.
Run canonical drift/correctness checks before optional strict editorial checks and retain the consumer's complete product checks.
An upgrade or read-only check does not automatically format files.
Restore every recorded package/lock/configuration/workflow/document preimage on an aborted migration and rerun incumbent checks; downgrading the package alone cannot restore document bytes.

CI acquisition uses the exact public release and a trusted reviewed graph without registry credentials.
The checking process receives no publication, repository-write or OIDC credentials.
The package itself needs no registry credentials at runtime.
Fork content cannot supply the executable, dependency graph, workflow, scripts, or trusted policy.
An unavailable check is a blocked required check, not a successful skip.
The [CI trust decision](ci-trust.md) records the actual pilot constraints.
