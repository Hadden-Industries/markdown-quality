# Software selection for the proposed Markdown quality package

Initial assessment: 2026-10-03.
Record extracted and selected release metadata refreshed: 2026-10-04, Europe/Bucharest.
This research record supports the [draft implementation plan](implementation-plan.md).
The provisional npm identity is `@hadden-industries/markdown-quality`; its exact name and registry availability are not accepted or allocated.

## Capability, decisions, and research status

The user wants one centrally maintained Markdown formatting/linting capability with repository-specific authored-document locations, generated/evidence exclusions, and justified policy differences.
The original selection was a dedicated repository, private npm distribution, and AGPL-3.0-only licensing subject to dependency and donor review.
On 2026-10-05, after an authenticated private upload returned E402, the owner selected public npm distribution instead.
The same cleared native inputs and AGPL-3.0-only implementation remain selected; all three packages now declare public access and fresh anonymous acquisition is required.
This amendment removes paid-private entitlement and recipient credentials, while preserving publisher authentication, independent assurance, event/policy isolation, platform proof, pilot acceptance and recovery.
Those product directions remain accepted; exact technical adoption, source incorporation, platform support, and release are conditional on the implementation plan's gates.

This document owns the comparative software research, dated donor observations, release identities, supported consumer interfaces, rights evidence and gaps, and residual custom work.
The implementation plan owns REQ/AC/QA/DEC IDs, architecture, slices, migration, and acceptance gates.
This separation avoids maintaining two independent versions of the same software-selection assessment.

Research questions:

1. Which maintained tools already supply Markdown layout, sentence lines, GFM linting, local-link parsing, ignored-file decisions, and schema validation?
2. Can an existing formatter/linter or a configuration-only bundle meet the complete required contract with less custom code?
3. Which donor behaviors and tests provide the strongest evidence, and what exact provenance and rights review would incorporation require?
4. Does standalone Snapper distribution reduce consumer setup enough to justify native-platform package maintenance?
5. What remains custom after native analysis, parsing, configuration, package-manager, and CI mechanisms are reused?

Status:

- Comparative research: sufficient for the conditional draft; native runtime/extraction/parity experiments remain open.
- Release identities: selected core metadata refreshed on 2026-10-04 as described below; integration at those exact versions is unverified.
- Rights: registry declarations and donor notices are inventory evidence.
  Exact selected-component licence text, bundled/transitive notices, source-delivery obligations, and accountable clearance remain open at GATE-03.
- Source identity: donor HEADs and exploratory checks are historical observations from 2026-10-03; refresh actual branch, dirty working bytes, file hashes, and notices before extraction or migration.
- Effects: this follow-up writes planning documents only.
  No package installation, newly acquired executable execution, security scan, source-repository creation, credential/configuration change, publication, or consumer migration occurred.

## Observed donor capabilities (2026-10-03)

All paths in this table are relative to `C:/Users/maksy/GitHub`.
Observed checkout HEADs are identities for source inspection, not qualification receipts.
Concurrent user-owned changes were present in some checkouts and were not modified.

| Repository and inspected HEAD                                            | Reusable behavior                                                                                       | Source locations                                                                                                                                | Migration caveat                                                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OwlAPI `4cf278d82b0c23275ad439195ab9c051358dfa6a`                        | Composed formatting, strict diagnostics, bounded subprocesses, recursive selection, GFM lint.           | `owlapi/scripts/documentation-quality.mjs`, `documentation-files.mjs`, their tests, `repository-python-tools.mjs`, `eslint.config.js`.          | Separate consumer root from installed-module root; package-owned ESLint rules must not load the consumer's JS configuration implicitly.                      |
| Universal Ontology `1489362d54b1c2a614a780e16e8190cca6416d88`            | Shared formatter chain, native ignore semantics, changed-document selection, minimal tool installation. | `universal-ontology/scripts/formatDocumentation.js`, `prepareDocumentationTools.js`, prose/documentation-tool tests, `development-checks.yml`.  | Package-root document scope differs from recursive package discovery; preserve retained policy/evidence exclusions.                                          |
| WebVOWL `1d91eb30ba12386e0b58bc7b41552814afdddc99`                       | Quote/list regressions, indentation ownership, safe literal selection, dedicated selective CI.          | `webvowl/tooling/prose/`, `util/checkDocumentation.mjs`, `selectCiChecks.mjs`, `prepareDocumentationTools.mjs`, CI/tool tests.                  | Inspected feature branch; refresh exact sources at pilot time rather than claim these are unchanged main sources.                                            |
| Software Engineering Workflow `7b792bd81cb7bba32e53db5d6a3f3c330378e855` | Simpler semantic wrapper, ignore delegation, preservation fixtures, package verification discipline.    | `software-engineering-workflow/tooling/prose/`, `scripts/runRepositoryPython.js`, `python/pyproject.toml`, `test/format-configuration.test.js`. | Semantic selection currently excludes skill directories while broad Prettier includes other Markdown; expansion needs a consumer decision.                   |
| Steam Community BBCode `9db3103d71a4b3a608b9609dba10280890d873d7`        | AST local-link checks, retained supply-chain/prose evidence, generator/example consistency.             | `steam-community-bbcode/scripts/check-documentation-links.js`, `test/documentation.test.js`, `tooling/prose/`, package and CI files.            | Existing check writes a report; shared check instead writes JSON only to stdout unless an explicit output is requested. Product example checks remain local. |

Earlier in this chat, exploratory local tests passed: OwlAPI 28 formatter/selection tests and lint of 56 documents; WebVOWL 16 prose tests; Universal Ontology 10; Software Engineering Workflow 9; Steam 6 prose and 2 documentation tests.
Those runs preceded this refreshed census and were not HISEW package verification.
They establish useful candidate regression coverage, not current-HEAD acceptance or standalone-asset parity.

## Maintained software assessment

The original registry/documentation assessment was performed on 2026-10-03.
On 2026-10-04, the npm releases below, Snapper PyPI/GitHub release identities, mdformat PyPI identity, Node LTS identity, and the two Snapper archive metadata entries were refreshed and remained unchanged.
Prettier, ESLint Markdown, Snapper CLI, and private-npm documentation were also revisited.
The uv/CPython alternative identities and donor checkout observations remain dated 2026-10-03; they were not refreshed in this follow-up.
No newly selected candidate was installed or executed.
Registry license declarations are inventory evidence, not completed rights clearance.
All versions must be refreshed before actual adoption under VER-01; a changed release requires qualification against the accepted corpus.

| Candidate                   | Checked release                                                                                         | Fit, limitations, and proposed disposition                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier                    | `3.9.9`, registry MIT                                                                                   | Supported formatting and ignore interfaces already match the layout role. Keep prose wrapping preserved and embedded language formatting off. No new Markdown layout printer is justified.                                          |
| ESLint / `@eslint/markdown` | `10.12.0` / `8.0.3`, registry MIT                                                                       | Native GFM parsing/rule validation and recommended structure checks; includes a same-document fragment rule. Keep this structural-lint path instead of reimplementing rules. New ESLint release still needs integration validation. |
| Snapper                     | `0.11.7`, PyPI MIT and GitHub stable tag `v0.11.7`                                                      | Existing native CLI covers sentence layout. Direct release assets exist for initial Windows/Linux targets. Actual binary parity, linked-runtime requirements, and report compatibility remain unverified.                           |
| markdownlint-cli2           | `0.23.3`, registry MIT                                                                                  | Credible configurable linter with fix mode. Does not itself demonstrate the accepted sentence-formatting chain; adding it alongside ESLint duplicates lint-policy ownership. Reconsider if native rule gaps are reproduced.         |
| remark-cli / remark-lint    | CLI `12.0.1`, registry MIT; lint project primary docs inspected                                         | Maintained AST/plugin ecosystem. Credible alternative for unified lint/transform ownership, but migration from proven Prettier/Snapper output requires a corpus experiment before replacement. No complete parity claim.            |
| mdformat                    | `1.0.0`, PyPI MIT expression                                                                            | CommonMark formatter with extensions; GFM-specific behavior requires plugins. Replacing the existing layout policy creates an output migration and does not establish sentence-line parity. Not selected for the first candidate.   |
| mdast utilities             | `mdast-util-from-markdown 2.1.0`, `mdast-util-gfm 3.1.0`, `micromark-extension-gfm 3.0.0`, registry MIT | Supported AST interfaces for local targets; reuse rather than regex parsing Markdown. Do not invent a second Markdown grammar.                                                                                                      |
| Ajv                         | `8.20.0`, registry MIT                                                                                  | Candidate maintained validator for the package's own JSON contracts; use native ESLint schemas/validation for upstream rule options.                                                                                                |
| uv / Python alternative     | uv `0.12.23`; CPython newest stable feature line patch observed `3.14.8`                                | Isolated locked-wheel distribution remains an alternative if native packaging fails its gates. Existing donor pins are not the new default. It is not a silent runtime fallback.                                                    |

Node `24.21.0` is the observed latest patch of the newest current LTS line and is the proposed initial package qualification runtime.
Support ranges must express tested guarantees; do not infer support for every version accepted by a dependency's `engines` field.

The residual custom work is orchestration of the formatter chain, one document policy, cross-repository installation/selection/report contracts, bounded process and file effects, and migration evidence.
It is not a new sentence detector, Markdown parser, formatting printer, general installer framework, or dependency resolver.

## Source rights gate

OwlAPI's formatter records MIT-derived Universal Ontology provenance, while other source/test material carries AGPL-3.0-only notices.
Steam's link-checker source and WebVOWL regression files explicitly carry AGPL notices.
Copyright ownership, any separate grants, and the exact proposed package distribution model must be established file by file before copying.
Do not infer a permissive package license from individual upstream dependencies or a shared author name.
The owner has selected AGPL-3.0-only for the package-owned implementation, subject to dependency and donor review at GATE-03.
Review the exact upstream dependency/asset terms, donor provenance, notices, and source-delivery obligations for the intended private distribution and authorized recipients.
Package-private registry access does not replace that review or alter applicable license terms.
Third-party native assets retain their own licenses; do not label every bundled byte AGPL solely because the new implementation uses AGPL.
If the review finds a conflict, stop the affected adoption and seek the owner's decision rather than silently changing the selected license or removing notices.

## Primary references

- [Prettier supported interfaces](https://prettier.io/docs/api): layout and native ignore handling.
- [ESLint Markdown](https://github.com/eslint/markdown): GFM configuration and native structural rules.
- [Snapper release v0.11.7](https://github.com/TurtleTech-ehf/snapper/releases/tag/v0.11.7) and [release metadata](https://api.github.com/repos/TurtleTech-ehf/snapper/releases/tags/v0.11.7): native artifact identities.
- [Snapper CLI reference](https://snapper.turtletech.us/docs/reference/cli): explicit native backend and machine-readable diagnostics; published documentation identifies itself as 0.11.6, so selected-release source/help must resolve differences.
- [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2), [remark-lint](https://github.com/remarkjs/remark-lint), and [mdformat](https://github.com/hukkin/mdformat): assessed alternatives.
- [mdast parser](https://github.com/syntax-tree/mdast-util-from-markdown): supported AST parsing.
- [npm lockfile semantics](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json/): consumer graph identity; dependency package lockfiles are not automatically applied.
- [uv synchronization](https://docs.astral.sh/uv/concepts/projects/sync/): alternative locked environment behavior.
- [GitHub composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action): reusable CI steps.
- [Node release policy](https://nodejs.org/en/about/previous-releases) and [official release index](https://nodejs.org/dist/index.json): current LTS selection.
- [Python release inventory](https://www.python.org/api/v2/downloads/release/): alternative runtime refresh.
- [Snapper PyPI metadata](https://pypi.org/pypi/snapper-fmt/json): wheel version and declared Python/license metadata.
- [npm private-package publication](https://docs.npmjs.com/creating-and-publishing-private-packages/) and [private packages in CI](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/): restricted distribution and credential roles.
- [GitHub workflow event behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): fork PR credential limitations and event trust.

No examined candidate was installed during planning.
The package-specific npm Snapper names queried returned E404, including the `@turtletech/snapper-mcp` name read from upstream's npm source manifest.
That source wrapper also declares a postinstall script; source existence is not proof of registry availability or suitable offline runtime behavior.

## Supported consumer interfaces and remaining proof

- [Prettier API](https://prettier.io/docs/api): use `format`/`check` for layout and `getFileInfo` with explicit `ignorePath` and `resolveConfig: false` for native ignored-file decisions.
  Pass accepted formatting options directly.
  Do not trigger automatic consumer JavaScript configuration or plugin loading.
  An API's accepting a path does not prove filesystem containment or ownership; those remain package responsibilities.
- [ESLint Markdown](https://github.com/eslint/markdown): reuse native GFM parsing, rule option validation, and diagnostics.
  The candidate includes same-document fragment checks; cross-document heading validation remains outside v1.
  Recommended defaults and the additional table rule must be exercised at the frozen release, rather than copied from a moving main branch.
- [Snapper CLI](https://snapper.turtletech.us/docs/reference/cli): the documented native backend and JSON diagnostics are the candidate sentence-formatting interface.
  Published docs identify 0.11.6 while the selected release is 0.11.7; inspect tagged source/help and actual binary diagnostics before acceptance.
  Exit success or unchanged text does not establish absence of findings.
- [mdast parser](https://github.com/syntax-tree/mdast-util-from-markdown), [GFM AST extension](https://github.com/syntax-tree/mdast-util-gfm), and [GFM tokenizer extension](https://github.com/micromark/micromark-extension-gfm): parse links, images, and reference definitions using maintained syntax.
  Filesystem target resolution, containment, and impact accounting are the residual contract, rather than another Markdown grammar.
- [Ajv](https://ajv.js.org/guide/getting-started.html): validate shipped package configuration/result schemas. Resolve only shipped schema references and reject unknown fields/versions without silent coercion.
  Native ESLint validation still owns upstream rule-option contracts.
- [npm installation](https://docs.npmjs.com/cli/v12/commands/npm-ci/) and [lockfile semantics](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json/): consumers own the installed graph.
  A dependency's source lockfile is not automatically the consumer's lock.
  Qualify packed root and isolated-tooling consumers with lifecycle scripts disabled and matching optional platform packages.
- [GitHub composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action): compose native installation/invocation steps without a second lint implementation.
  Private-package access, fork-event trust, Action sharing, and actual hosted outcomes need separate qualification at GATE-11.

Core version metadata authorities: [Prettier](https://registry.npmjs.org/prettier/latest), [ESLint](https://registry.npmjs.org/eslint/latest), [ESLint Markdown](https://registry.npmjs.org/@eslint%2Fmarkdown/latest), [Ajv](https://registry.npmjs.org/ajv/latest), [mdast parser](https://registry.npmjs.org/mdast-util-from-markdown/latest), [mdast GFM](https://registry.npmjs.org/mdast-util-gfm/latest), and [micromark GFM](https://registry.npmjs.org/micromark-extension-gfm/latest).
Alternative release authorities: [markdownlint-cli2](https://registry.npmjs.org/markdownlint-cli2/latest), [remark-cli](https://registry.npmjs.org/remark-cli/latest), and [mdformat](https://pypi.org/pypi/mdformat/json).
These moving endpoints document the discovery source; freeze exact archive/integrity and source identities before adoption.

## Bundle and delivery alternatives

| Approach                                     | Native capability worth reusing                                                          | Remaining cost or mismatch                                                                                                                 | Disposition                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Shared Prettier/ESLint configuration only    | Supported layout and structural policy distribution                                      | Does not itself supply the complete sentence chain, contained local-link checks, common selection/report contract, or native-tool delivery | Reuse configuration interfaces; insufficient as the entire capability       |
| Prettier + Snapper + ESLint Markdown + mdast | Existing donor layout, sentence formatting, structural rules, and maintained link syntax | Needs bounded orchestration, one document policy, native packaging, and consumer qualification                                             | Proposed first composition; exact adoption remains conditional              |
| markdownlint-cli2-centered bundle            | Native configurable lint/fix and CLI file selection                                      | Requires sentence formatting and local-link policy qualification; adding it beside ESLint creates overlapping structural policy            | Alternative if a concrete rule/maintenance gap justifies replacement        |
| remark-centered bundle                       | Maintained AST/plugin transformation and lint ecosystem                                  | Existing output, GFM/literal preservation, sentence-line expectations, and diagnostics need a comparative corpus experiment                | Credible alternative, without established complete parity                   |
| mdformat-centered Python bundle              | Native CommonMark layout and extension ecosystem                                         | GFM/plugin parity and sentence lines still need proof; adds Python environment delivery and output migration                               | Not selected for the first candidate                                        |
| Matching public npm native asset packages    | Native npm platform selection; standalone Snapper assets exist                           | Redistribution review, executable/DLL identities, extraction tooling, platform parity, and package coherence remain open                   | Proposed first delivery; no runtime downloads or Python fallback            |
| Isolated uv/Python wheel tool project        | Proven donor installation model and native locking/synchronization                       | Additional interpreter/environment acquisition and lifecycle ownership                                                                     | Explicit rebaseline option if native assets fail; not an automatic fallback |
| Thin Action without a shared CLI             | Reusable hosted steps                                                                    | Leaves local and CI execution/reporting ownership split                                                                                    | Action invokes the same installed capability instead                        |
| Copied scripts or Git submodule              | Can expose the current source quickly                                                    | Preserves duplicated ownership or adds independent checkout/update state                                                                   | Not selected for consumer deployment                                        |

The selected composition is a proposal based on observed fit, not proof that every alternative is incapable of meeting the requirements.
Measure output/diagnostic deltas and lifecycle cost against owner-reviewed fixtures before replacing a proven native capability or adding overlapping lint engines.

## Standalone asset candidates

The inspected Snapper archive digests are:

| Asset                                         | SHA-256 from GitHub release metadata                               |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `snapper-fmt-x86_64-pc-windows-msvc.zip`      | `69b1bd1421466d19eccddf071964233882fc0e2337b16dca8ee0d1e97102f3bf` |
| `snapper-fmt-x86_64-unknown-linux-gnu.tar.xz` | `19dfa83a42e5e9901d6efd7918dd7d3fa16fcf9e8a24d8069bd379d64b5597de` |

These identify upstream archives, not an authenticated publisher decision or the extracted executable bytes.
The release builder must retain source/tag provenance, extraction inventory, actual executable/DLL digests, notices, and qualification output.
Extraction uses a maintained archive consumer with limits on entry count, expanded size, and paths; no bespoke generic archive parser or installer script execution.
The supported extraction implementation is an explicit research gate, not a hidden hand-written helper.

## Exact residual custom work

The package needs a small CLI/library orchestration layer for the layout/prose/layout chain, one declarative document policy, literal/full/changed selection, containment and optimistic file replacement, bounded native execution/report validation, and stable text/JSON outcomes.
Local-link target resolution and unchanged-referrer impact accounting remain shared organizational behavior around the maintained parser.
Release tooling must package reviewed native assets coherently and prove real root/isolated consumers; the Action adds only bounded native acquisition/invocation.

Do not implement a sentence detector, Markdown parser/printer, glob/ignore grammar, JSON-schema interpreter, generic archive parser, dependency resolver, registry client, hook manager, or general repository workflow engine.
Use maintained archive extraction with explicit bounds; choosing that dependency and reviewing its exact rights is still an open research item.
Known donor suppressions must be requalified at the selected Snapper release; prefer upstream resolution and obtain any required exact NSH-01 decision before shipping a remaining workaround.
Existing donor approvals do not automatically apply to this new package.

## Adoption experiments and refresh conditions

Before incorporation or implementation of the affected seam:

1. Refresh exact donor working-file identities/provenance and selected stable/LTS releases; freeze the resulting candidate tuple and package/archive hashes.
2. Inspect exact licence texts and resolved native/runtime/transitive notices; record the accountable AGPL/private-distribution rights decision at GATE-03.
3. Inspect Windows/Linux archives and runtime dependencies using a reviewed extraction tool; compare standalone and wheel diagnostics/output on the representative adversarial corpus at GATE-04.
4. Exercise supported native ignore semantics, literal filenames, package/consumer root separation, hard breaks/literals, tables, quotes/lists, Unicode, and unknown native diagnostics through packed consumers.
5. Qualify matching private platform-package installs, offline runtime behavior, authorized/unauthorized access, and credential isolation before CI cutover at GATE-11.

The [implementation plan](implementation-plan.md) owns gate status, experiment acceptance, slice dependencies, and migration authority.
This record does not close those gates or supply a package verification receipt.

Refresh selection before first adoption/publication and when versions, intended scope, platforms, distribution, rights, diagnostics, or native interfaces change.
Reopen it if a maintained component eliminates residual custom work, native packaging cannot meet parity/runtime/rights constraints, or two pilots reveal unaccepted policy differences or excessive lifecycle cost.
Keep original dated observations distinguishable from fresh evidence; reorganizing this record does not refresh donor source or turn historical tests into current acceptance.
