# Markdown quality

This package supplies one CLI and library for Markdown layout, sentence lines, GFM linting, and contained local links.
Consumers declare their authored-document scope in `.markdown-quality.json`.
The package preserves the existing AGPL-3.0-only license.

The current version is a candidate for public alpha distribution.
Controlled native component clearance and Windows/Linux packed qualification passed for the retained binaries.
The public package tuple requires fresh registry qualification before use; both accepted pilots and recovery evidence still block stable v1.0.

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

Development uses Node 24.21.0 and an existing Python 3.14 interpreter for asset preparation.
Consumers need no Python interpreter.

```sh
npm ci --ignore-scripts
python scripts/prepare-native.py --archives /path/to/verified/archives
npm test
npm run check:full
node scripts/pack.js /path/to/output
```

The builder accepts the frozen `snapper-windows.zip` and `snapper-linux.tar.xz` archives.
It verifies archive and executable hashes before copying fixed regular members.
Build acquisition is explicit; product operations never acquire executables.

Changed-document checking and a shared GitHub Action are deferred.
Required v1.0 checks always inspect the full authored scope.
