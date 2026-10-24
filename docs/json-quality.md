# JSON development checks

Markdown Quality uses the public `@hadden-industries/json-quality` package in the private [tooling installation](../tooling/json/package.json).
Its exact registry version is selected only in that manifest and acquired through the package's generated bootstrap and native npm lock.
Native npm installs its matching optional platform package.
It is development tooling, outside product dependencies, exports and npm contents.
The package's public API owns discovery, parsing, quality rules, formatting, normalization, budgets, guarded writes and streamed completion.
Repository Python owners supply original admitted compressed/archive bytes and provenance, without implementing a second JSON checker.

Use the reference runtime in [node-support.json](../assets/node-support.json) or supported Node 26 starting at 26.12.0.
Product consumer minima are specified in that same policy; JSON tooling has its narrower declared runtime support.
The [runtime compatibility record](node-runtime-compatibility.md) separates consumer minima from development tooling.
The ten root runtime dependencies were checked against npm's current latest tags on 2026-10-15 and already matched them.
The source-only adoption does not republish immutable npm 1.0.3.

```sh
npm run install:json
npm run inspect:json -- --json
npm run check:json
npm run lint:json:identity
npm run test:json
npm run qualify:json:packages
```

`inspect:json` and `format:json:check` delegate to complete `check`, including protected presentation.
The retired `inventory`, `lint`, `check-format`, `format-check` and `producers` operations fail without aliases.
The adapter fixes the repository root.

The isolated engine uses configuration/event cohort 2 and newline-delimited events with `--json`.
The adapter's `openRepositoryJsonSession()` streams `events()`; consume the final `execution-terminal` and close the session in `finally`.
Whole-document aggregate results and request/response envelopes are retired.
Supplied bytes use `openJsonSourceSession()` with a trusted source opener and source contract.
Literal writer selection follows `--`; normalization requires a nonempty writable selection.
Checking always covers complete owned physical/native scope and cannot be filtered through the retired `--files` option.
These JSON-tool spellings do not change Markdown Quality's own CLI.

Policy and API `capacityLimits` correspond to CLI `--capacity-limits` / `--no-capacity-limits`.
For example, `npm run check:json -- --max-file-bytes 67108864 --json` checks the complete scope with a finite source-admission override.
`capacityLimits: false` / `--no-capacity-limits` removes admission ceilings while preserving finite runtime controls, quality rules and write safeguards; it cannot be combined with individual admission overrides.
The ordinary managed-memory target remains 32 MiB, with separate finite scratch, nesting, elapsed-time and concurrency controls.
The generated bootstrap uses `JSON_QUALITY_CAPACITY_LIMITS` for acquisition overrides and `JSON_QUALITY_CLEANUP` for cleanup retry options.
Use the installed package's `docs/resource-limits.md` for the complete settings and defaults.

`npm run format:json` and `npm run normalize:json` are explicit guarded writers.
An invalid included peer blocks the batch before otherwise eligible files are changed.
Native locks, provenance authorities and original archive members remain protected from generic writes.
Repairs belong in their actual producer, followed by re-admission and quality checking.
The source identity lint uses the isolated public ESLint rule; semantic object comparisons use structural equality, while the established candidate digest retains its explicitly documented ordered encoding.

## Scope and exact preservation

The owner's directory exclusions cover the root and `tooling/json` npm installation trees, including their nested dependencies.
Archive member identities use their archive path and remain mandatory even when their member name contains `node_modules`.
Hidden, ignored, untracked, generated, repository-administrative and newly added JSON remains in scope elsewhere.
Repository-owned tracked installation JSON remains checked and write-protected rather than disappearing behind that exclusion.
The policy has no `docs/releases/*.json` exemption: both existing release documents and new peers receive ordinary strict checks and presentation.
Published archives remain immutable independently of the mutable repository documentation describing them.

The original MPL source-presentation preservation covers these exact unmodified source members:

- `packages/linux-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`
- `packages/win32-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`

Both are 94 bytes with SHA-256 `555820648728561eac884844e331dd2612e40e257637734b51bb4976bc1307e6`.
Their containing source archive is SHA-256 `252156d485d814a0b00d4ae9a6ea1a8dc704c8dcd5f0e4a8398f971ac616f371`.
Membership and bytes were independently verified inside the registry-SRI-checked immutable [Linux npm 1.0.3 archive](https://registry.npmjs.org/@hadden-industries/markdown-quality-linux-x64/-/markdown-quality-linux-x64-1.0.3.tgz) and [Windows npm 1.0.3 archive](https://registry.npmjs.org/@hadden-industries/markdown-quality-win32-x64/-/markdown-quality-win32-x64-1.0.3.tgz).
Semantic checks still apply to these original members; the native supplier rejects changed identity.
Bundled dependency JSON in the actual core archive also retains upstream presentation after complete native archive membership, size and hash reconciliation with the staged inventory.
This preserves original publisher bytes while keeping every strict semantic check; it grants no check exclusion or generic write authority.

Exact generated native documents use their producer's JSON indentation contract and receive all semantic checks.
Two original Linux crate-author strings retain their exact decoded NFC exceptions by JSON pointer, UTF-8 byte length and SHA-256; no whole-file normalization waiver applies.
The Windows reports contain no corresponding non-NFC strings, so they receive no speculative exception.
A new non-NFC value fails checking; native documents cannot be changed by the generic writers.
Native npm locks retain their own writer and the required root-package empty key.
Historical compressed correctness reports receive ordinary JSON presentation; their native reader verifies the pre-existing full-result hashes without regenerating correctness or performance claims.

## Producers and mandatory gates

The [native build owner](native-builds.md) rejects duplicate keys before materialization, except repeated identical boolean `doctest` fields from the pinned cargo-about producer.
It retains the raw source separately and records original/output hashes and duplicate counts.
Conflicting values, other duplicate names and non-JSON constants fail before replacement.
Fresh artifacts must be built, frozen, reconciled and qualified; previously published archives are never edited in place.

The real package qualifier packs the core and both native packages into `dist/json-qualification`.
The native archive reader reconciles complete tar membership, member sizes and hashes against the actual staged inventory before streaming JSON payloads to the shared analyzer.
It rejects traversal, links, case aliases, duplicates and excessive compressed or expanded input.
The supplier has separate authority, inventory and document streams, with one child process active at a time.
Each phase has a 60-second deadline; metadata/payload frames are at most 64 KiB, pending framing bytes at most 256 KiB and stderr at most 64 KiB.
Explicit phase/document completion, successful child exit and native census closure are required; EOF alone cannot pass.
No base64 envelope or growing complete-document array crosses this boundary.
Existing native owners retain their finite archive/oracle admission bounds; their domain allocations are distinct from the shared managed ledger.
Per-source limits do not promise that every maximum-sized combination fits the shared aggregate budget; exceeding a boundary fails the complete check.
The shipped nested MPL source must equal the separately admitted original source archive.
A missing archive, changed authority or incomplete native census cannot become a physical-only pass.

The explicit frozen-report presentation command retains only its two selected inputs under the shared 2 MiB finite writer capability, then closes native admission before formatting.
Its measured largest input has 87,991 indexed values and requires 408,759,816 accounted formatter bytes; that owning command explicitly selects a 512 MiB managed workspace.
It verifies the original full-result oracles before and after guarded replacement, without regenerating answers or performance observations.
This explicit writer allowance does not change ordinary checker defaults or permit generic writes to archived evidence.

`check:full` requires the actual package check and a final complete-root result after product generators.
Hosted package jobs acquire the isolated source on the reference runtime, restore the exact product matrix runtime, and run every product check.
Every lane records its product runtime, switches back to the reference runtime, then requires identity lint, isolated consumer tests and JSON checking after those producers.
The transported candidate job requires actual packed JSON quality before uploading its tuple.
Workflow regression tests reject removed, conditional or tolerated mandatory gates; optional reuse metadata cannot convert a failed JSON gate into successful package qualification.
