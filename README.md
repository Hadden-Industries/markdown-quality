# Markdown quality

This package supplies one CLI and library for Markdown layout, sentence lines, GFM linting, and contained local links.
Consumers declare their authored-document scope in `.markdown-quality.json`.
The package preserves the existing AGPL-3.0-only license.

Core and platform packages share one exact release version.
Install a release after its coordinated tuple passes registry and consumer qualification.
Registry publication and promotion to `latest` are separate outcomes.

```sh
markdown-quality check --root /path/to/repository
markdown-quality format --root /path/to/repository
markdown-quality inspect --root /path/to/repository --json
markdown-quality check --root /path/to/repository -- "docs/literal [1].md"
markdown-quality check --root /path/to/repository --files-json '[]'
```

Checks never install tools or write documents.
Formatting validates the complete selected batch before any replacement.
It checks each file's original identity and bytes immediately before replacing it.
A failure after earlier replacements reports the completed and unprocessed paths.
Formatting is not a whole-batch transaction.

Read the [consumer guide](docs/consumer-guide.md) for configuration and installation.
The [support and release guide](docs/support-and-release.md) describes compatibility and release gates.
The [third-party notices](THIRD-PARTY-NOTICES.md) distinguish package code from upstream assets.
For development and proposals, read [Contributing](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
Report vulnerabilities through the private channel in the [security policy](SECURITY.md).

Reference builds use Node 24.21.0 and an existing Python 3.14 interpreter for asset preparation.
Source and transported-package CI qualify Node 22/24/26 at each declared minimum and latest patch on Windows x64 and Ubuntu 24.04 x64.
See the [support policy](docs/support-and-release.md) for exact minima and the distinction between development compatibility and published releases.
Consumers need no Python interpreter.

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

Changed-document checking and a shared GitHub Action are deferred.
Required v1.0 checks always inspect the full authored scope.
