# Third-party notices

Package-owned implementation is AGPL-3.0-only.
The original repository license is retained byte-for-byte.
The narrow list-boundary recheck in `src/prose-diagnostics.js` adapts OwlAPI's approach at `1cdc5a33b9538cce8ced88f21af18138da7a8923`, originally from universal-ontology at `58a306013d3701f59dfe34341e96fac5a011e3ed`.
Copyright 2026 Hadden Industries Ltd; original MIT terms are retained in `LICENSES/MIT-universal-ontology.txt`.
The qualification tests are authored here.

The repository's [Code of Conduct](CODE_OF_CONDUCT.md) adapts the [Steam Community BBCode policy](https://github.com/MaksymShostak/steam-community-bbcode/blob/9db3103d71a4b3a608b9609dba10280890d873d7/CODE_OF_CONDUCT.md), derived from OwlAPI and Contributor Covenant 3.0.
That policy text retains CC BY-SA 4.0, its attribution and the indicated changes; it does not change the code's AGPL-3.0-only license.

| Direct runtime dependency       | Version | Declared license                  |
| ------------------------------- | ------- | --------------------------------- |
| Prettier                        | 3.9.9   | MIT                               |
| ESLint                          | 10.12.0 | MIT                               |
| ESLint Markdown                 | 8.0.3   | MIT                               |
| Ajv                             | 8.20.0  | MIT                               |
| mdast-util-from-markdown        | 2.1.0   | MIT                               |
| mdast-util-gfm                  | 3.1.0   | MIT                               |
| mdast-util-frontmatter          | 2.0.1   | MIT, Titus Wormer                 |
| micromark-extension-frontmatter | 2.0.0   | MIT, Titus Wormer                 |
| micromark-extension-gfm         | 3.0.0   | MIT                               |
| picomatch                       | 4.0.7   | MIT                               |
| Snapper upstream executable     | 0.11.9  | MIT, Copyright 2026 Rohit Goswami |

Installed npm packages retain their upstream license files.
Development analysis uses dependency-cruiser 18.5.0 under MIT, copyright 2016-2026 Sander Verweij.
Its installed `LICENSE` retains the original permission and copyright notice; no analyzer source is vendored or modified.
The exact developer dependency graph and its integrity identities are frozen in the lockfile, and installed transitive components retain their own upstream notices.
Acorn is reused through dependency-cruiser's declared dependency solely for a conservative syntax guard.
Developer scripts and analyzer code are excluded from consumer archives and runtime dependencies; packed development metadata can remain visible.
This personal development adoption does not claim organizational rights clearance or change the package's AGPL-3.0-only terms.
The directly adopted front-matter extensions retain their original MIT copyright and permission notices in their installed `license` files.
Their terms permit use, modification and distribution subject to retaining those notices; this implementation imports them without vendoring or changing their source.
The lockfile freezes their exact integrity identities.
The producer's scoped dependency override resolves KaTeX 0.19.0 and its Commander 15.0.0 dependency.
Their installed `LICENSE` files retain the original MIT terms and copyright notices: Khan Academy and other contributors (KaTeX), and TJ Holowaychuk (Commander).
Those terms permit use and redistribution subject to retaining the notices; no upstream source is vendored or modified here.
The override applies only to the producer root, as described in the [support and release boundary](docs/support-and-release.md).
Native packages retain `LICENSE.snapper` and a fixed executable/repack component record.
The AGPL declaration applies to the packaging implementation and does not relabel upstream executable bytes.

Controlled native build run `37274204161` binds Snapper source, Cargo inputs, Rust toolchain and the exact Windows/Linux executable hashes.
Both native packages retain the original component inventories, complete harvested notices, official Rust runtime copyright report and unchanged MPL-2.0 `webpki-roots` 0.25.4 source.
The separately recorded [rights supplement](assets/native-rights.json) restores original notices omitted from published crate archives, including native per-file copyright comments.
Every native archive and package includes its exact `rights-evidence.json` and readable `SUPPLEMENTAL-NOTICES.txt`.
Independent reconciliation cleared the identified attribution gaps; the original hosted evidence remains unchanged.
Registry distribution still requires actual platform and packed-consumer qualification, restricted publication and readback.
No complete rights clearance or SLSA level is claimed from a hash or upstream MIT declaration alone.

Primary authorities: [Snapper license](https://github.com/TurtleTech-ehf/snapper/blob/v0.11.9/LICENSE), [Snapper source manifest](https://github.com/TurtleTech-ehf/snapper/blob/v0.11.9/Cargo.toml), [npm lock semantics](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json/), and [AGPL text](https://www.gnu.org/licenses/agpl.en.html).
