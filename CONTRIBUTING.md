# Contributing

Markdown Quality is AGPL-3.0-only.
Preserve the original `LICENSE` bytes, component attribution and corresponding source/build materials; do not add an "or later" grant.
The adapted [Code of Conduct](CODE_OF_CONDUCT.md) retains its separate CC BY-SA 4.0 terms and governs community interactions.
Vulnerabilities use the private reporting channel in [SECURITY.md](SECURITY.md), not public issues or pull requests.

## Development setup

Use the reference Node version in [node-support.json](https://github.com/Hadden-Industries/markdown-quality/blob/main/assets/node-support.json) and an existing stable Python interpreter at least as new as [.python-version](https://github.com/Hadden-Industries/markdown-quality/blob/main/.python-version) for explicit native asset preparation.
Change Node selections in that policy and run `npm run sync:node`; `npm run check:node` verifies the generated declarations.
The [support policy](docs/support-and-release.md) records the qualified source matrix and explains why published 1.0.3 still has different immutable runtime metadata.
Do not assume an unreleased source qualification changes an installed npm release.

```sh
npm ci --ignore-scripts
npm run install:json
# Use the repository .venv interpreter, or the explicitly activated CI environment.
.venv/bin/python scripts/acquire-native.py
npm run check:markdown
npm test
```

Asset acquisition downloads only frozen manifest inputs and verifies their identities before preparation.
Create `.venv` with the declared stable Python version before native preparation.
On Windows its interpreter is `.venv/Scripts/python.exe`; on Linux it is `.venv/bin/python`.
The verification driver selects that interpreter explicitly, or uses the hosted action's activated `VIRTUAL_ENV`.
To use already verified archives offline, run `python scripts/prepare-native.py --archives /path/to/verified/archives` instead.
Check and format operations never acquire native executables; consumers do not need Python.
Retain the lockfile and follow [native build requirements](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/native-builds.md) for an actual native upgrade.

## Changes and verification

Use JavaScript ES modules and repository-native parser, schema and CLI boundaries.
Describe the consumer problem and scope before a substantive change; keep unrelated edits separate.
Preserve meaningful independent fixtures for changed behavior, including exact output, native exit meanings, real paths, literal content and operational failures.
Do not mock formatter output as proof of integration, relax failing assertions or add local compatibility shims.

```sh
npm run format:code
npm run format:markdown
npm run check:markdown
npm run check:focused
npm run check:architecture
npm run check:affected
npm run check:full
```

Run the focused checks while iterating and affected checks for the final change.
Use the full profile for a consolidated source candidate; installed/transported package checks remain separate evidence where packaging is affected.
Record commands, results and actual gaps in the PR or task; a local pass is not hosted, release or consumer acceptance.
The maintainer may iterate directly on `main`; these instructions do not require a PR or change branch controls.

Development-only [dependency graphs and affected JavaScript tests](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/dependency-graph-and-tests.md) support explicit baseline inspection, selected execution and shadow comparisons.
Without an explicit baseline, `check:affected` runs the full JavaScript inventory.
Keep the complete `npm test` and `check:full` paths for final assurance.

## Markdown ownership

Use semantic sentence lines and the existing `authored-gfm@1` policy.
`format:markdown` and `check:markdown` invoke this source CLI directly; no self-dependency is installed.
`format` combines `format:code` and guarded Markdown formatting; Prettier's generic invocation excludes Markdown.
The `prettier` package script declares the generic formatting scope once: the repository root with `.gitignore` and `.prettierignore` boundaries, including every supported file under `.github`.
`format:code` and `format:code:check` reuse that script with `--write` and `--check`; the full verifier delegates to `format:code:check`.
`format:check` combines that read-only check with `check:markdown`, matching the two owners used by `format`.
New workflow files enter both formatting and verification automatically; Markdown and JSON-family exclusions keep their dedicated tools responsible for presentation and guarded writes.
The checked authored scope is declared in `.markdown-quality.json`, including `.github` Markdown templates; retained review evidence and literal test fixtures remain outside that scope.
Keep its explicit `ignoreFiles: [".gitignore"]`: Markdown checks must not inherit `.prettierignore`, whose `**/*.md` entry separates generic Prettier ownership from this native Markdown pipeline.

Physical local link targets must exist.
Trailing spaces and two-space hard breaks are disallowed outside the documented literal-code exceptions; use explicit backslash breaks where needed.
Fenced and indented code preserve their content; sensitive inline/HTML cases can require manual correction instead of an unsafe rewrite.
Review any actual formatting diff and rerun the check for convergence.

## JSON ownership

Use the isolated, source-locked JSON Quality package through `npm run install:json` on supported Node 24 or 26.
Follow [JSON development checks](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/json-quality.md) for complete discovery, protected native evidence, real package qualification and guarded formatting.
Generic Prettier excludes JSON; `npm run check:full` composes product checks, source identity lint, isolated consumer tests, actual packed JSON and the final complete-root JSON check.
`check:product` retains the product suite on Node 22 and future declared product runtimes; it does not claim JSON-tool qualification there.
Architecture inspection still needs the isolated package's source installation, acquired beforehand on the reference tooling runtime.

## Proposals and release boundaries

For a bug, provide the exact package/source identity, OS, Node version, invocation and smallest non-sensitive input showing expected and actual behavior.
For a feature, describe the use case, existing alternatives and compatibility implications.
Use the repository issue forms or concise PR template; do not upload credentials or private documents.

Dependabot proposes npm and Action updates for review; it does not merge them or upgrade frozen native assets automatically.
Native upgrades require fresh source/component, rights, parity and platform evidence.
Follow [release operations](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/release-operations.md) for coordinated immutable archives and recoverable publication.
Changing source metadata or guidance does not republish 1.0.3, promote tags or authorize a new release.
