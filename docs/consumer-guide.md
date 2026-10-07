# Consumer guide

Install an exact coordinated public release after registry availability is verified.
Acquisition needs no npm account or token; disable lifecycle scripts.

```sh
npm install --save-dev --save-exact --ignore-scripts @hadden-industries/markdown-quality@1.0.3
npm ci --ignore-scripts
```

The source candidate is `1.0.3`; confirm its registry availability and exact tuple qualification before using the command above.
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
Lint overrides accept only `off`, `warn`, or `error` for installed `markdown/` rules.
Warnings are unresolved findings and block formatting.
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
Per-document, native, selection and aggregate output limits remain active.

Exit `0` means clean or completed.
Exit `1` means content findings.
Exit `2` means configuration, tool, input, or operation failure.
Machine output follows the shipped result schema even for CLI input failures.
No excerpts, document bodies, or absolute root paths are emitted by default.

Limits are 2 MiB per document, 32 MiB per batch, 10,000 selected documents, 100,000 enumerated entries, and 256 KiB per configuration or ignore file.
Native invocations have a 15-second deadline and an 8 MiB output cap.
Each analysis worker has a 128 MiB old-generation JavaScript heap limit and 4 MiB stack limit; document analysis retains its 30-second deadline.
These heap limits do not bound native processes, external buffers or total process memory.
Discovered path bytes are capped at 4 MiB.
Diagnostics are capped at 1,000 records per document, 10,000 records across the batch, and 4 MiB per document and batch.
Exceeding a limit returns exit `2` before any formatting writes.
Text diagnostics escape terminal control characters; JSON retains structured relative filenames.
Lint messages describe the violated rule without quoting document content.
These are conservative operational limits; benchmark and platform acceptance remains part of candidate qualification.

Formatting compares maintained parsed structure and literals before replacement and verifies convergence.
The owner-approved stricter whitespace policy updates `authored-gfm@1` directly; no second preset is provided.
This change is currently unreleased; existing published npm archives retain their original behavior.
Trailing spaces and tabs are errors everywhere except inside fenced and indented code blocks.
This includes blank lines, headings, lists, tables, and opening or closing fence lines.
Space-based hard breaks are forbidden; formatting replaces actual parsed hard breaks with an explicit backslash followed by a newline, preserving the break.
The whitespace policy cannot be disabled through lint overrides or editor settings.
Fenced and indented code retain literal whitespace, including whitespace-only lines and trailing spaces; embedded code formatting remains disabled.
Inline code compares [CommonMark code-span semantics](https://spec.commonmark.org/0.31.2/#code-spans): each line ending means one space, while interior spaces, tabs and other literal characters remain significant.
Delimiter padding is already handled by the maintained parser; the comparison does not collapse or trim additional whitespace.
The parsed comparison is an additional backstop, not a universal rendered-equivalence guarantee.
It conservatively refuses unsupported semantic or literal changes.
Inline code and raw HTML have no blanket trailing-whitespace exemption.
When trimming would change their interpreted content, or otherwise change parsed meaning, the operation reports the whitespace findings for manual correction and leaves the whole batch untouched.
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

CI acquisition uses the exact public release and a trusted reviewed graph without registry credentials.
The checking process receives no publication, repository-write or OIDC credentials.
The package itself needs no registry credentials at runtime.
Fork content cannot supply the executable, dependency graph, workflow, scripts, or trusted policy.
An unavailable check is a blocked required check, not a successful skip.
The [CI trust decision](ci-trust.md) records the actual pilot constraints.
