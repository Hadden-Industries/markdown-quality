# JSON development checks

Markdown Quality uses the public `@hadden-industries/json-quality` package in the private [tooling installation](../tooling/json/package.json).
Its Git source is pinned to `e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5` and acquired through the package's generated bootstrap and native npm lock.
It is development tooling, outside product dependencies, exports and npm contents.
The package's public API owns discovery, parsing, quality rules, formatting, normalization, budgets, guarded writes and result accounting.
Repository Python owners supply original admitted compressed/archive bytes and provenance, without implementing a second JSON checker.

Use the reference Node 24.21.0 or supported Node 26 starting at 26.12.0.
Product consumers retain Node `^22.23.3 || ^24.21.0 || >=26.12.0`; JSON tooling has its narrower declared runtime support.
The ten root runtime dependencies were checked against npm's current latest tags on 2026-10-15 and already matched them.
The source-only adoption does not republish immutable npm 1.0.3.

```sh
npm run install:json
npm run inventory:json
npm run lint:json
npm run format:json:check
npm run check:json
npm run lint:json:identity
npm run test:json
npm run qualify:json:packages
```

Inventory reports discovery, not a quality pass.
The canonical formatter check is `format --check`, and protected checking is `check --scope protected` through the repository adapter.
Unsupported spellings such as `check-format`, `format-check` and `producers` fail rather than silently selecting a different operation.
The adapter fixes the repository root.

`npm run format:json` and `npm run normalize:json` are explicit guarded writers.
An invalid included peer blocks the batch before otherwise eligible files are changed.
Native locks, provenance authorities and original archive members remain protected from generic writes.
Repairs belong in their actual producer, followed by re-admission and quality checking.
The source identity lint uses the isolated public ESLint rule; semantic object comparisons use structural equality, while the established candidate digest retains its explicitly documented ordered encoding.

## Scope and exact preservation

The owner's only directory exclusion is every `node_modules` directory.
Hidden, ignored, untracked, generated, repository-administrative and newly added JSON remains in scope elsewhere.
Repository-owned tracked installation JSON remains checked and write-protected rather than disappearing behind that exclusion.
The policy has no `docs/releases/*.json` exemption: both existing release documents and new peers receive ordinary strict checks and presentation.
Published archives remain immutable independently of the mutable repository documentation describing them.

The only source-presentation preservation covers these exact unmodified MPL source members:

- `packages/linux-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`
- `packages/win32-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`

Both are 94 bytes with SHA-256 `555820648728561eac884844e331dd2612e40e257637734b51bb4976bc1307e6`.
Their containing source archive is SHA-256 `252156d485d814a0b00d4ae9a6ea1a8dc704c8dcd5f0e4a8398f971ac616f371`.
Membership and bytes were independently verified inside the registry-SRI-checked immutable [Linux npm 1.0.3 archive](https://registry.npmjs.org/@hadden-industries/markdown-quality-linux-x64/-/markdown-quality-linux-x64-1.0.3.tgz) and [Windows npm 1.0.3 archive](https://registry.npmjs.org/@hadden-industries/markdown-quality-win32-x64/-/markdown-quality-win32-x64-1.0.3.tgz).
Semantic checks still apply to these original members; the native supplier rejects changed identity.
No directory wildcard grants historical immunity.

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
The native archive reader reconciles complete tar membership, member sizes and hashes against the actual staged inventory before forwarding JSON buffers to the shared analyzer.
It rejects traversal, links, case aliases, duplicates and excessive compressed or expanded input.
The native supplier also has a separate 60-second process deadline and 64 MiB output-transport ceiling, including base64 overhead.
Per-source limits do not promise that every maximum-sized source combination fits the transport or shared aggregate budget; exceeding any boundary fails the complete check.
The shipped nested MPL source must equal the separately admitted original source archive.
A missing archive, changed authority or incomplete native census cannot become a physical-only pass.

`check:full` requires the actual package check and a final complete-root result after product generators.
Hosted package jobs acquire the isolated source on the reference runtime, restore the exact product matrix runtime, and run every product check.
The Node 24 and 26 lanes additionally require identity lint, isolated consumer tests and JSON checking after those producers.
The transported candidate job requires actual packed JSON quality before uploading its tuple.
Workflow regression tests reject removed, conditional or tolerated mandatory gates; optional reuse metadata cannot convert a failed JSON gate into successful package qualification.
