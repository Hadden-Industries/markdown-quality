# Contributing

Markdown Quality is AGPL-3.0-only.
Preserve the original `LICENSE` bytes, component attribution and corresponding source/build materials; do not add an "or later" grant.
The adapted [Code of Conduct](CODE_OF_CONDUCT.md) retains its separate CC BY-SA 4.0 terms and governs community interactions.
Vulnerabilities use the private reporting channel in [SECURITY.md](SECURITY.md), not public issues or pull requests.

## Development setup

Use reference Node 24.21.0 and an existing Python 3.14 interpreter for explicit native asset preparation.
The [support policy](docs/support-and-release.md) records the qualified source matrix and explains why published 1.0.3 still has different immutable runtime metadata.
Do not assume an unreleased source qualification changes an installed npm release.

```sh
npm ci --ignore-scripts
python scripts/acquire-native.py
npm run check:markdown
npm test
```

Asset acquisition downloads only frozen manifest inputs and verifies their identities before preparation.
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
npm run check:affected
npm run check:full
```

Run the focused checks while iterating and affected checks for the final change.
Use the full profile for a consolidated source candidate; installed/transported package checks remain separate evidence where packaging is affected.
Record commands, results and actual gaps in the PR or task; a local pass is not hosted, release or consumer acceptance.
The maintainer may iterate directly on `main`; these instructions do not require a PR or change branch controls.

## Markdown ownership

Use semantic sentence lines and the existing `authored-gfm@1` policy.
`format:markdown` and `check:markdown` invoke this source CLI directly; no self-dependency is installed.
`format` combines `format:code` and guarded Markdown formatting; Prettier's generic invocation excludes Markdown.
The checked authored scope is declared in `.markdown-quality.json`, including `.github` Markdown templates; retained review evidence and literal test fixtures remain outside that scope.
Keep its explicit `ignoreFiles: [".gitignore"]`: Markdown checks must not inherit `.prettierignore`, whose `**/*.md` entry separates generic Prettier ownership from this native Markdown pipeline.

Physical local link targets must exist.
Trailing spaces and two-space hard breaks are disallowed outside the documented literal-code exceptions; use explicit backslash breaks where needed.
Fenced and indented code preserve their content; sensitive inline/HTML cases can require manual correction instead of an unsafe rewrite.
Review any actual formatting diff and rerun the check for convergence.

## Proposals and release boundaries

For a bug, provide the exact package/source identity, OS, Node version, invocation and smallest non-sensitive input showing expected and actual behavior.
For a feature, describe the use case, existing alternatives and compatibility implications.
Use the repository issue forms or concise PR template; do not upload credentials or private documents.

Dependabot proposes npm and Action updates for review; it does not merge them or upgrade frozen native assets automatically.
Native upgrades require fresh source/component, rights, parity and platform evidence.
Follow [release operations](https://github.com/Hadden-Industries/markdown-quality/blob/main/docs/release-operations.md) for coordinated immutable archives and recoverable publication.
Changing source metadata or guidance does not republish 1.0.3, promote tags or authorize a new release.
