# Consumer guide

Install an exact coordinated public release after registry availability is verified.
Acquisition needs no npm account or token; disable lifecycle scripts.

```sh
npm install --save-dev --save-exact --ignore-scripts @hadden-industries/markdown-quality@0.1.0-alpha.2
npm ci --ignore-scripts
```

The version above identifies the candidate; it is not currently a published registry promise.
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

The library exports `runQuality({ root, config, mode, files })`.
Omit `files` for full discovery.
An explicit empty array selects nothing.
CLI literal filenames follow `--`; `--files-json` accepts the JSON array directly.
Results identify the package, preset, tools, config digest, selection, diagnostics, written paths, unchanged paths, unprocessed paths, and operational errors.
Text and JSON share the same result.

Exit `0` means clean or completed.
Exit `1` means content findings.
Exit `2` means configuration, tool, input, or operation failure.
Machine output follows the shipped result schema even for CLI input failures.
No excerpts, document bodies, or absolute root paths are emitted by default.

Limits are 2 MiB per document, 32 MiB per batch, 10,000 selected documents, 100,000 enumerated entries, and 256 KiB per configuration or ignore file.
Native invocations have a 15-second deadline and an 8 MiB output cap.
Document analysis runs in a 128 MiB worker with a 30-second deadline.
Discovered path bytes are capped at 4 MiB.
Diagnostics are capped at 1,000 records per document, 10,000 records across the batch, and 4 MiB per document and batch.
Exceeding a limit returns exit `2` before any formatting writes.
Text diagnostics escape terminal control characters; JSON retains structured relative filenames.
Lint messages describe the violated rule without quoting document content.
These are conservative operational limits; benchmark and platform acceptance remains part of candidate qualification.

Formatting compares maintained parsed structure and literals before replacement and verifies convergence.
The parsed comparison is an additional backstop, not a universal rendered-equivalence guarantee.
It conservatively refuses unsupported semantic or literal changes.
Ordinary file permission bits are preserved; ownership changes, alternate streams, ACL inheritance, arbitrary metadata, and adversarial filesystem races are not promised as preserved.
Use a clean baseline or retained preimages when original uncommitted bytes must be recoverable.

CI acquisition uses the exact public release and a trusted reviewed graph without registry credentials.
The checking process receives no publication, repository-write or OIDC credentials.
The package itself needs no registry credentials at runtime.
Fork content cannot supply the executable, dependency graph, workflow, scripts, or trusted policy.
An unavailable check is a blocked required check, not a successful skip.
The [CI trust decision](ci-trust.md) records the actual pilot constraints.
