# Markdown quality

This package supplies one CLI and library for Markdown layout, sentence lines, GFM linting, and contained local links.
Consumers declare their authored-document scope in `.markdown-quality.json`.
Development source uses configuration schema 2 and result schema 3 with the agreed opinionated `authored-gfm@1` defaults.
Code-block languages remain required.
Native options and lint settings are explicitly package-owned; upstream recommended configurations do not select policy.
This is a breaking change for the next major release; published 1.0.3 archives retain their previous behavior.
The package preserves the existing AGPL-3.0-only license.

Core and platform packages share one exact release version.
Adopt the latest producer commit after its exact core/native/archive/workflow tuple passes qualification, regardless of release status.
Keep its full source SHA, archive hashes and frozen lock; the reused package version alone cannot identify development source.
Public npm release adoption retains its separate coordinated registry qualification.
Registry publication and promotion to `latest` are separate outcomes.

```sh
markdown-quality check --root /path/to/repository
markdown-quality check --root /path/to/repository --strict
markdown-quality format --root /path/to/repository
markdown-quality inspect --root /path/to/repository --json
markdown-quality check --root /path/to/repository -- "docs/literal [1].md"
markdown-quality check --root /path/to/repository --files-json '[]'
```

Checks never install tools or write documents.
Formatting validates the complete selected batch before any replacement.
Errors block; warnings block only under `--strict`; information never blocks.
Read-only checks also fail on formatting drift.
Reports retain advisory findings even when exit is zero.
Current source supports `--diagnostic-level info|warning|error` for human-readable findings, defaulting to `info`.
Filtered output reports hidden counts; complete JSON results, exit decisions and formatting admission are unaffected.
Operational resource limits are defaults the consumer can raise or bypass through configuration, library options, or CLI `--no-limits`.
Overrides preserve quality rules and guarded formatting; the consumer owns capacity choices.
It checks each file's original identity and bytes immediately before replacing it.
A failure after earlier replacements reports the completed and unprocessed paths.
Formatting is not a whole-batch transaction.

Read the [consumer guide](docs/consumer-guide.md) for configuration and installation.
The [support and release guide](docs/support-and-release.md) describes compatibility and release gates.
The [third-party notices](THIRD-PARTY-NOTICES.md) distinguish package code from upstream assets.
For development and proposals, read [Contributing](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
Report vulnerabilities through the private channel in the [security policy](SECURITY.md).

Reference builds use Node 24.21.0 and an existing Python >=3.15.0 interpreter for asset preparation.
Source and transported-package CI qualify Node 22/24/26 at each declared minimum and latest patch on Windows x64 and Ubuntu 24.04 x64.
See the [support policy](docs/support-and-release.md) for exact minima and the distinction between development compatibility and published releases.
Ordinary checks and logical-document operations need no Python interpreter.
Trusted candidate qualification additionally needs the Python version declared in its accepted execution profile.

```sh
npm ci --ignore-scripts
python scripts/prepare-native.py --archives /path/to/verified/archives
npm test
npm run format
npm run check:markdown
npm run check:full
node scripts/pack.js /path/to/output
```

The builder accepts the frozen `snapper-windows.zip` and `snapper-linux.tar.xz` archives.
It verifies archive and executable hashes before copying fixed regular members.
Build acquisition is explicit; product operations never acquire executables.

This repository dogfoods its current source directly: `format:markdown` performs guarded formatting and `check:markdown` checks the full authored scope, including Markdown PR templates.
`format` combines non-Markdown Prettier formatting with that native Markdown pipeline; `check:full` retains both checks and the independent regression suite.
It does not install a dependency on itself or use documentation success as the sole correctness oracle.

Full, explicit and logical-document selection share the root policy, including ancestor exclusions.
Ignore files have no Markdown policy authority.
Use `--inventory git` to explain every tracked Markdown path under a full check.
The public `processDocument` and `executeQuality` APIs support generated content without checkout writes.
The package ships trusted staging, a Windows/Linux observer, and a reusable workflow; see the [CI trust guide](docs/ci-trust.md).
Source tests and workflow definitions alone do not establish hosted or consumer adoption acceptance.
