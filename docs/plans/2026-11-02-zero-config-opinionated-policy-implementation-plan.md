# Zero-config consumption and opinionated Markdown policy: implementation plan

Date: 2026-11-02, Europe/Bucharest.
Revision: 4; complete consumer resource overrides, sparse execution profiles and explicit unlimited mode, retaining the naming audit and NFC normalization design.
Status: draft implementation dossier with owner-accepted normalization direction; this task updates the plan, not product code.
Decision owner: Maksym Shostak / Hadden Industries.
Scope: `Hadden-Industries/markdown-quality`.
Inspected source: `b67601c0d027307fb15416392a91af650335d14e`, matching local `main`, `origin/main` and the remotely observed `main` during planning.
Source package version: `1.0.3`; configuration schema: `2`; result schema: `3`; preset: `authored-gfm@1`.

## 1. Purpose, authority and evidence

Make installation sufficient for ordinary authored Markdown checking, inspection, guarded formatting and explicit NFC normalization.
The package owns the default policy; repositories describe exceptions rather than repeat product constants.
Strengthen deterministic repository integrity and accessibility checks while preserving literal content, bounded defaults with consumer-controlled resource overrides, offline checking and truthful reports.

The owner explicitly requires **`quality/non-nfc-prose` to default to `error`**, overriding the research's warning recommendation.
This decision is settled and must not be reopened as an implementation preference.
It aligns the enforcement default with JSON Quality; it does not authorize silently normalizing Markdown source during `format`.

The owner subsequently accepted the recommendation to add an explicit `normalize` command, `normalize --dry-run`, optional `--update-links` for changed anchors, and independently composable format/normalize repairs.
Revision 2 replaces the earlier exclusion of normalization and the unconditional NFC blocker on `format`.
The command roles and scope decisions are accepted direction; the detailed source-edit, result and safety contracts below specify that direction for implementation review.
This approval authorizes revising the plan; it is not an instruction to implement, commit or publish the package now.
The subsequent request authorizes the exposed-name audit and its incorporation into this plan.
Revision 4 incorporates the owner's requirement for complete consumer-controlled resource overrides, including a single opt-in mode that can be saved as the consumer's default.
The [public naming audit](2026-11-02-public-naming-audit.md) is part of this implementation dossier: all NAME-001 through NAME-025 dispositions and their detailed contracts are required implementation inputs, not optional follow-up suggestions.
Its recommended names are proposed for review; the audit request does not claim blanket approval of every detailed breaking contract.

### 1.1 Source material and precedence

The supplied path was resolved to the existing file:

```text
C:\Users\maksy\Downloads\Deep research_ making @hadden-industries_markdown-quality genuinely zero-config and more opinionated.md
SHA-256: 7893dbbdb866368b898103317999e6deca23824200601ce1e32f8bf7ba6967f0
```

The owner's NFC instruction takes precedence over that report.
Current source and executable contracts take precedence over the report's descriptions of older behavior.
The prior [opinionated-defaults plan](opinionated-defaults-implementation-plan.md), [consumer guide](../consumer-guide.md), [centralized contracts](../centralized-contracts.md), [CI trust policy](../ci-trust.md), [performance qualification](../performance-qualification.md) and [security policy](../../SECURITY.md) supply existing invariants.
This dossier supersedes the old plan only for explicitly identified default, discovery and public-contract changes.

The precedent is [json-quality: Implement zero-config changes](codex://threads/01a1989e-faee-7ab1-be14-343b091c7dd7).
Planning inspected its actual revision-3 [implementation plan at the merged source](https://github.com/Hadden-Industries/json-quality/blob/91a529a0cceb647397792770d6b45c67eb6b4aa7/docs/plans/2026-11-01-zero-config-opinionated-policy-implementation-plan.md), implementation and repair commits, and [PR #15](https://github.com/Hadden-Industries/json-quality/pull/15).
The sibling checkout currently has a later local-only commit; the precedent used here is the merged source, not that unpushed work.

| JSON Quality evidence                                                     | What to carry into this implementation                                                                                                               |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4401fc346e0628c0ca71461f7849ffb385d67834`: accepted plan committed first | Preserve an accepted plan before product changes when implementation and committing are authorized                                                   |
| `f45d8122b72217ffe859d59ccb890fc7c298404e`: zero-config cohort 4          | Separate sparse input, immutable effective policy, input provenance and command effects; migrate coupled contracts together                          |
| `bffc41fc5c03318f949f8d4277ffdadad16dddfb`: final repairs                 | Account for queued and retained control data before allocation; verify generated locks and installed package bytes before executing the consumer CLI |
| `67bfccb1acf311037831cd7274357f207d1f184f`: dependency repairs            | Check all affected install graphs; repair advisories through actual caller compatibility checks without relaxing gates                               |
| `9af8285c3dd2949fbb79e1cf1288625c8caf4e9b`: CI fixture repair             | Pack test archives with the declared producer Node/npm; install and execute them with each selected consumer Node/npm                                |
| `91a529a0cceb647397792770d6b45c67eb6b4aa7`: normal merge                  | Bind acceptance to the final head, preserve signed source commits, verify merge parents/tree and observe post-merge acceptance                       |

The initial [CI run 41363863493](https://github.com/Hadden-Industries/json-quality/actions/runs/41363863493) failed in all eight consumer lanes because npm 11 fixture output reached the npm 12 producer-report parser.
The repair preserved both toolchain roles instead of weakening that parser.
The final [CI run 41365042250](https://github.com/Hadden-Industries/json-quality/actions/runs/41365042250) passed all 22 reported checks, including `CI / acceptance`; the PR is merged and remote `main` was observed at `91a529a`.
The chat also records successful post-merge checks.
These are source-delivery precedents, not evidence of an npm publication or Markdown Quality qualification.

The JSON Quality chat's implementation, delegation, commit and publication permissions were scoped to that task.
They are examples of process choices, not authorization to implement, commit, spawn agents, push, merge or publish this plan's change.
The present request authorizes creating, revising and checking this document.

### 1.2 HISEW observations and retained selection

The HISEW planning and management instructions were read from the loaded `hisew-dev/0.1.0-dev.29` plugin.
Read-only inspection through the selected native launcher reported personal applicability, `active: true`, profiles `focused`, `affected` and `full`, and no current execution in this worktree.

| Observation             | Value                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Loaded release          | `78d10f49862633eff7fb157c6709af0b11470209c5dfad9858b837ae402dfa06`                    |
| Selected release        | `a69680c5fa7d47f2ffb7a56d75747d7696e102ac61d3998a1481f66e5fb176fb`                    |
| Selected generation     | `14`                                                                                  |
| Selected runtime key    | `0.1.0.dev29-a69680c5-00`                                                             |
| Selected attempt        | `ecc9bed1-3350-435a-b1b6-dd276b09c332`                                                |
| Installation / host     | `3ea0be5b-1850-4be3-b18b-bf1cd6f90368` / `codex`                                      |
| Planning chat           | `01a19cbd-ba22-70a3-bfbb-62db0c605363`                                                |
| Loaded setup inspection | Requested artifact `setup-required`; selected runtime observed; activation unverified |

Retain the primary failure classification `selection-mismatch` / `HOOK_SELECTION_MISMATCH` at boundary `selection`, with `RETENTION_UNAVAILABLE` as the diagnostic-retention limitation.
Equal version labels do not establish equal releases.
This task changed no engine selection, execution ownership, registration, hook activation or assurance-owner state.
Before HISEW implementation dispatch, management must establish the intended release pairing and coordinate any transition with actual affected assurance owners using the supported generation-checked procedure.
Retain the existing selection until that coordination is complete.
Unrelated continuation, branch-cleanup and storage-inventory notices are outside this task.
Revisions 2 through 4 rechecked `personal` / `active: true` through the same selected launcher; the release/generation observations above remain the original inspection, not a new activation claim.

## 2. Research reconciled with current source

| Proposal                                                  | Inspected current behavior                                                                                                                                           | Planned disposition                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| No configuration required                                 | `resolveConsumerRoot` searches for `.markdown-quality.json`; `loadConfiguration` always reads it                                                                     | Implement independent root/config discovery and proven-absence defaulting                                   |
| Sparse exceptions                                         | Schema requires version, preset and include                                                                                                                          | Introduce sparse input and complete effective-configuration schemas                                         |
| Broad Markdown scope                                      | Caller supplies include patterns; repository policy selects three areas                                                                                              | Default to `**/*.md`, retaining accounting, containment and explicit selection                              |
| Package-owned boundaries                                  | `documents.js` blocks `.git`, `node_modules`, `.venv`, `venv`, `.hi`; staging maintains a related list                                                               | Centralize relevant boundary knowledge; separate hard operational boundaries from ordinary scope exclusions |
| Stronger severities                                       | Generic links and duplicate siblings warn; NFC and heading punctuation are informational                                                                             | NFC, generic links and duplicate siblings become errors; heading punctuation becomes a warning              |
| Bare URLs                                                 | Upstream rule exists but is off                                                                                                                                      | Enable as error, documenting its actual autolink semantics                                                  |
| Cross-document fragments                                  | `checkLinks` removes fragment/query and checks only filesystem existence; upstream fragment rule handles same-document links                                         | Add bounded repository-aware fragment validation and exact path casing                                      |
| Better image/link labels                                  | Upstream alt-text rule exists; custom generic-label list is narrow and skips tables                                                                                  | Complete a bounded static label policy and tests                                                            |
| HTML compatibility                                        | Raw HTML allowed; payload protected                                                                                                                                  | Keep HTML allowed; define narrow static unsafe-pattern checks, without sanitizer claims                     |
| ATX headings, markers, fences, task lists, tables and EOF | Existing formatter and policy transforms already cover much of this; tests assert `[x]`, `-`, ATX, sequential ordered numbering, safe fences and visible hard breaks | Preserve existing behavior; close only demonstrated corpus gaps                                             |
| Explicit Unicode repair                                   | Existing NFC rule reports only; formatter protects literals; no normalize operation exists                                                                           | Keep check/format free of Unicode mutation; add source-aware NFC repair through explicit normalize          |
| Minimal installed consumer                                | Qualification writes policy files and invokes the CLI with Node; richer API/runtime probes already exist                                                             | Add genuine installed `npm exec` cases without removing existing probes                                     |
| Explain effective policy                                  | Result includes complete configuration and a digest of file bytes                                                                                                    | Separate sparse input provenance from resolved configuration and package-policy identity                    |

Important source details:

- `checkAdvisories` currently skips entire tables and does not inspect image `alt` values for NFC; changing the severity alone leaves those coverage holes.
- Heading punctuation currently excludes question marks and matches terminal `.`, `!`, `,`, `:` and `;`; the selected warning policy retains legitimate questions.
- `markdown/no-bare-urls` accepts `<https://example.test>` as an explicit autolink.
  Enabling it does not mean every link has descriptive prose.
- Indented code conversion deliberately does not invent a language; missing-language errors can block the entire preflight before any writes.
- `format` validates candidates before replacement, then replaces files individually.
  Later I/O failures can leave completed writes; this is not an atomic batch transaction.
- Default inventory reconciles Git-tracked Markdown as well as walked files.
  Zero-config must preserve that completeness property.
- Candidate qualification overlays trusted policy and execution settings; candidate configuration never becomes the checking authority.

Included scope: zero-config CLI/API execution, sparse overrides, accurate provenance, broadened discovery, stronger quality defaults, explicit NFC normalization and preview, opt-in affected-fragment updates, composable repairs, cross-document fragments, path casing, bounded static accessibility/HTML checks, precise exposed names/resource units/measurements, coherent schema/preset migration, installed-consumer qualification, documentation and delivery readiness.

Non-goals: Unicode rewriting during check/format; NFKC, case folding, transliteration, smart typography or invisible-character removal; editorial heading/link-text repairs; filename renames or unrelated URL normalization; network URL checks; an HTML sanitizer or accessibility certification; MDX or a new default extension set; site-generator execution; blanket HTML prohibition; mandatory TOCs/H1 presence; fixed-width prose errors; new release infrastructure; unrelated dependency upgrades or cross-repository migrations.
Source-aware NFC edits to headings/labels and expressly selected dependent-fragment updates are in scope; inventing new wording or arbitrarily rewriting identifiers is not.
Do not port JSON Quality's native normalization, collision or resource subsystem wholesale: its source model and write commands differ.

## 3. Proposed risk route and owners

**Risk class:** R2, proposed for acceptance with this dossier.

**Decision owner:** Maksym Shostak / Hadden Industries; the implementation owner integrates the source; an independent verifier owns assurance conclusions; the delivery owner observes hosted CI and merge/release state.
Assign actual implementation and assurance actors before their work starts; this document does not impersonate them.

**Reasoning:** Public configuration/result contracts, broader discovery, stricter default failures, explicit Unicode mutation, dependent-link edits, additional filesystem reads, concurrent dependency observation and repair preflight are material R2 triggers.
Errors can hide authored files, read outside the intended scope, produce wrong link verdicts or allow writes based on stale policy/targets.
No R3 consequence is established by the supplied scope.

**Potential blast radius:** Every new/default consumer, existing configurations when upgraded, report validators, candidate qualification, CLI/library users and Windows/Linux package consumers.
Default format/normalize selection can include more files after migration, and normalized headings can change public anchor identities.

**Reversibility:** Unpublished source changes can be reverted coherently.
Consumer formatting and normalization require retained file preimages for restoration; installing an old package does not restore text or inbound fragments.
Published versions and prior evidence remain immutable.

**Principal unknowns:** Precise anchor compatibility, safe source-span representation across markup, complete bounded inbound-reference observations, HTML fragment parsing boundaries, runtime Unicode parity, graph cost, trusted-absence representation and downstream report consumers.

**Required artifacts:** This single accepted dossier with stable IDs; native source-bound test/review records; exact migration instructions; installed-consumer and hosted delivery evidence when those stages are authorized.
Do not duplicate the same facts into administrative evidence packets.

**Required specialist lenses:** Independent correctness review of resolution, graph/write safety and public contracts; native Codex Security assessment of changed untrusted-input, path, parser and evidence boundaries under the repository security policy.
External source sharing is not required by this plan.
No review or scan is claimed to have run during planning.

**Required verification:** Slice-specific tests, affected integration checks, relevant final full profile, preserved resource/performance gates and installed Windows/Linux runtime/layout matrix.
Re-run affected proof after repairs; staging or committing alone does not invalidate correct product evidence.

**Required human approvals:** Accept the proposed contract baseline and material design decisions before implementation; obtain only genuinely new rights, compatibility or externally visible delivery decisions.
The NFC error requirement and the revision-2 command/preview/link-update/composable-repair direction are already accepted; do not ask for them again.

**Maximum sensible autonomy:** Complete this draft and document checks now.
Later implementation authorization can cover routine reversible edits, tests and same-effects repairs; it does not implicitly change engine selection, downstream repositories or release authority.

**Next lifecycle step:** Resolve gates in section 12, retain this dossier and its naming audit as the baseline, then start `SLICE-010`.
Do not restart planning merely because a coherent source increment lands.

## 4. Decisions and observable contracts

The owner selected the NFC severity in `DEC-005` and the command roles in `DEC-013` through `DEC-016`.
Other decisions and the detailed implementation contracts remain proposed for review; those selected directions do not need another approval.

| ID      | Decision                                                                                                            | Consequence                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Root identity is independent of config presence                                                                     | Explicit root wins; otherwise nearest Git checkout, nearest package root, then current directory                                                                |
| DEC-002 | Only proven absence of the default config selects defaults                                                          | Explicit missing config, inaccessible files, malformed input and linked paths fail                                                                              |
| DEC-003 | Sparse input resolves into one immutable complete configuration                                                     | Deep merge known maps, replace ordinary lists, preserve mandatory operational boundaries                                                                        |
| DEC-004 | Use proposed configuration schema 3, result schema 4 and `authored-gfm@2`                                           | Current producers/readers migrate together; old explicit markers fail with migration guidance                                                                   |
| DEC-005 | Non-NFC prose is an error by default; only explicit normalize changes eligible Unicode text                         | Owner-selected severity; overrides remain explicit, inspectable exceptions                                                                                      |
| DEC-006 | Generic links and duplicate sibling headings are errors; heading punctuation warns; long lines remain informational | Strong defaults without fixed-width prose or question-heading prohibition                                                                                       |
| DEC-007 | Share an explicit anchor model for same- and cross-document fragment checks                                         | No hidden disagreement between two default fragment algorithms                                                                                                  |
| DEC-008 | Preserve canonical formatting and guarded replacement                                                               | No semantic repairs inferred from a lint error; revalidate policy and read dependencies before writes                                                           |
| DEC-009 | Add narrow static image/link/HTML checks                                                                            | Author-owned decorative intent remains expressible; HTML is never executed or sanitized                                                                         |
| DEC-010 | Installed CLI evidence must use the real dependency-only consumer                                                   | No hidden policy, wrapper, script, direct source import or globally resolved executable                                                                         |
| DEC-011 | Extend current qualification and evidence readers                                                                   | Preserve both layouts, producer/consumer toolchain separation and protected approval admission                                                                  |
| DEC-012 | Source delivery, npm release and downstream adoption are separate outcomes                                          | A green merge does not establish registry availability or consumer adoption                                                                                     |
| DEC-013 | Add source-aware NFC normalization of the same prose population checked by the rule                                 | Preserve protected bytes, Markdown structure and all presentation outside necessary NFC source edits                                                            |
| DEC-014 | Provide normalize --dry-run through the same preparation and admission path                                         | Preview all proposed changes without source writes; preview is not reusable write authorization                                                                 |
| DEC-015 | Require --update-links for normalization that changes generated anchor identities                                   | Repair only unambiguous supported references within the selected write set; report external-link uncertainty                                                    |
| DEC-016 | Separate requested repair success from whole-policy quality                                                         | Format may leave only ordinary NFC drift; normalize may leave only presentation drift; check remains authoritative                                              |
| DEC-017 | Apply every naming-audit disposition, preserving R behavior and specifying B contracts                              | Contextual meaning and consumer-visible effects determine names; no indiscriminate replacement or silent old-key acceptance                                     |
| DEC-018 | Distinguish analysis completion, candidate differences and physical write effects                                   | A fully checked failure is not unprocessed, logical changed output is not unchanged content, and a preview is not an applied edit                               |
| DEC-019 | Preserve resource/measurement semantics under accurate names except explicitly specified changes                    | Keep numeric defaults, units, independent populations and maximum-sample admission; graph expansion and complete override support are declared behavior changes |
| DEC-020 | Every package resource ceiling is overridable; one resourceLimitMode opt-in removes all package ceilings            | Owner-selected control, finite defaults, persistent sparse profiles and honest external-limit disclosure; candidate authority does not expand                   |

### 4.1 Root discovery

An explicit `--root` or API `root` selects exactly that directory, including a subdirectory of a checkout.
Resolve relative input against the invocation working directory; retain real-directory and linked-parent rejection.
`--config` never relocates the root, and all explicit file paths remain relative to the selected root.

Without an explicit root, walk ancestors from the invocation directory once, retaining the nearest regular `package.json` directory and stopping at the nearest valid Git checkout boundary.
Prefer that Git root over a nested package root; if there is no Git boundary use the saved nearest package root, otherwise the original current directory.
Support `.git` directories and normal Git worktree/submodule `.git` files through host Git's supported identity operation.
Do not interpret a `.git` pointer with a bespoke parser or execute package/configuration code.
Reuse the sanitized, bounded host-Git binding; never search for executables inside candidate inputs.
Malformed/inaccessible Git metadata or failure to verify an observed Git boundary is an operational error, not a reason to search farther outward.
A normal non-Git directory needs no Git executable to use package/cwd fallback.

Search for `.markdown-quality.json` only at the selected root.
Do not inherit another repository's configuration or change roots because a child/parent config exists.
Expose the resolved root in inspection without leaking unrelated host paths.
Test spaces, non-ASCII names, literal brackets, nested packages, bare/non-Git directories, worktrees and explicit subdirectory roots.

Root discovery must happen before the parent execution process sanitizes its child environment.
Pass the validated absolute root and bound Git executable to the child so it cannot choose a different root under an empty environment.

### 4.2 Sparse input, complete defaults and validation

The input schema accepts no file, `{}`, and exception-only objects.
When present, `schemaVersion` must be `3` and `preset` must be `authored-gfm@2`; omission selects the installed package contract, not an implicit legacy version.
The effective schema requires every runtime field and never treats sparse input as resolved output.
Pinning the installed version and lockfile supplies repeatability for markerless input.

Default values are owned by the package:

| Field                     | Proposed default and merge rule                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include`                 | `["**/*.md"]`; a supplied nonempty list replaces it                                                                                                         |
| `exclude`                 | `["**/vendor/**", "**/.cache/**", "**/coverage/**"]`; a supplied list replaces it; `[]` clears these ordinary exclusions                                    |
| `lint`                    | Complete package rule map; merge supplied supported severities by rule name                                                                                 |
| `syntax.frontmatter`      | `yaml`; supplied `false`, `yaml`, `toml` or `json` replaces it                                                                                              |
| `links.checkLocalTargets` | `true`; false disables filesystem-based local-target/case/cross-document checks, not same-document fragment checking                                        |
| `links.rootRelative`      | `reject`; explicit `consumer-root` retains contained-root semantics                                                                                         |
| `layout`                  | Existing LF/two-space values; merge supported fields without enabling embedded formatting                                                                   |
| `analyzerLimits`          | Renamed package limits, then declared config limits, then invocation overrides; retain current `null`/`false` meanings and documented hard execution bounds |

Mandatory operational boundaries are not entries that `exclude: []` can erase.
Do not concatenate user arrays invisibly, implement a generic recursive merge, accept unknown keys, coerce types, execute getters/config scripts, fetch schemas or create config files automatically.
Use Ajv's closed schemas without mutating defaults/coercion options.
Keep severity validation and upstream-rule existence checks at the admission boundary.

Represent package defaults once and deeply freeze them, including arrays and nested maps.
Each resolved result is a separately owned immutable snapshot; resolving consumer B cannot mutate consumer A or the package defaults.
CLI, library, logical-document, worker and trusted qualification paths use the same resolution semantics.
If a public pure resolver is added, its exact input and output names must distinguish sparse configuration from effective configuration, and its plain-data admission must be bounded; do not add an SDK surface solely for implementation convenience.

The current loader reads configuration before enforcing its declared byte ceiling.
Implementation must explicitly preserve or revise that contract rather than accidentally making config self-bypass impossible.
Use an invocation/default bootstrap admission ceiling for acquisition; a larger trusted invocation allowance can admit a larger config, and the file's declarations govern subsequent analysis.
Document this intentional safety change and test exact byte/entry limits before allocating merge work, including queued values and retained snapshots.
Do not copy JSON Quality's precise quota values into Markdown Quality; use its accounting lesson within the existing analyzer-limit authority.

Proven default absence means an `ENOENT` observation of the expected default member beneath the validated root.
Missing explicit `--config`, unreadable/nonregular/linked config, invalid JSON/schema, unsafe patterns and unsupported versions return exit `2`.
None may fall back to defaults.

### 4.3 Selection and complete accounting

Discover lowercase `.md` by default, including hidden authored directories, nested documentation and GitHub metadata.
Keep `.MD`, `.markdown`, `.mdx` and other dialect/extension choices outside this release's default expansion; do not claim all Markdown-like extensions are supported.
Preserve literal arguments after `--`, `--files-json`, explicit empty selection, deterministic ordering, missing-selected-file refusal and full Git inventory reconciliation.
`--files-json '[]'` is an intentional zero selection, never a full scan, and must not acquire a native tool.

Centralize the current operational directory set and the package-owned trusted staging directory for discovery/read decisions where their meanings match.
Different staging and runtime duties may retain separate policies when justified; do not blindly merge similarly named sets.
Hard boundaries prune enumeration and reject explicit attempts to select/read through them.
Tracked paths beneath hard boundaries remain visible in inventory accounting as operational omissions; they cannot silently become authored inputs or bypass protection.
Supply a schema-valid reason for each class of omission.

Ordinary exclusions remain visible in selection accounting and can be replaced by consumer overrides.
`vendor`, cache and coverage exclusions express the proposed default scope, not a claim that every such file is externally owned.
Do not blanket-exclude `build`, `dist` or `generated`: those names can contain authored Markdown; a repository can exclude its actual generated areas explicitly.
In particular, do not copy this repository's `docs/research/**` and `docs/reviews/**` exclusions into product defaults.

Root selection, filesystem walking, Git inventory, explicit files and logical-document admission must use consistent path decisions.
Preserve no-follow handling of symlinks/junctions and write restrictions on hard-linked files.
Case sensitivity of the `.md` contract and exact path spelling must be tested on both operating systems.

### 4.4 NFC and other rule severities

| Rule or family                                                                         | Default         | Required behavior                                                                                                    |
| -------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `quality/non-nfc-prose`                                                                | `error`         | Check fails without strict mode; format preserves the text and reports it; explicit normalize repairs eligible prose |
| `quality/generic-link-text`                                                            | `error`         | Flag the reviewed exact generic-label list, including `learn more`, in prose and tables                              |
| `quality/duplicate-sibling-heading`                                                    | `error`         | Keep section-scoped sibling semantics; do not ban every repeated heading across unrelated sections                   |
| `quality/heading-trailing-punctuation`                                                 | `warn`          | Retain the existing punctuation set and allow `?`; `--strict` makes warnings block                                   |
| `quality/long-prose-line`                                                              | `info`          | Retain informational 120-character observation and current exemptions                                                |
| `markdown/no-bare-urls`                                                                | `error`         | Reuse upstream detection; angle autolinks remain allowed by this rule                                                |
| Heading increments, multiple H1s, definitions, fence language, alt text, table columns | Existing errors | Preserve current structural requirements; multiple-H1 prohibition does not become mandatory-H1 presence              |
| `markdown/no-html`                                                                     | `off`           | Retain syntax compatibility; narrow checks below have separate meanings                                              |

For NFC, inspect decoded authored prose: paragraph/list/blockquote text, headings, table-cell text, link labels and image alt labels, including reference images.
Resolve reference-image labels from the image node rather than mistaking definition identifiers or destinations for prose.
Do not normalize source spellings before analysis; entity escapes that decode to decomposed prose must receive the same verdict.
Keep fenced/indented code, inline code, front matter, raw HTML, destinations, definition identifiers and code-like metadata outside this rule.

Check maximal adjacent rendered text runs across emphasis/strong/delete boundaries; do not concatenate across block, hard-break, inline-code or raw-HTML boundaries.
Otherwise a combining mark split by emphasis can evade a per-text-node check.
Map a reported run to its original source start/span and preserve existing line/column conventions.
Check and format never normalize prose, headings, anchors, filenames, URLs or definition names implicitly.
Explicit normalize owns eligible prose including headings; section 4.9 defines its limited dependent-fragment edits and protected identifiers.
Both manual and normalization-induced heading changes can affect anchors; cross-document validation must expose affected links.

Use the runtime's maintained normalization primitive and record Node/ICU/Unicode identities in qualification.
Test official normalization vectors applicable to each supported runtime plus a common cross-runtime corpus; do not claim JSON Quality's native Unicode implementation was reused.
If supported runtimes disagree on required prose cases, stop and select a single supported semantic baseline or maintained implementation before release; do not silently raise the engine floor or import a large native dependency.

Sparse severity overrides remain legal and explicit, for example `{"lint":{"quality/non-nfc-prose":"off"}}` for intentionally decomposed prose.
The override is not the default and must appear in effective policy/inspection.
Do not introduce inline lint-disable directives or a new path-exception framework as a shortcut.
An active `info` or `warn` NFC rule still permits explicitly requested normalization; `off` is an intentional exemption and a nonempty normalize request must refuse with an actionable policy reason rather than silently re-enable it.
An empty selection remains a successful no-op under any severity.

Default error promotion does not itself add a second normalization pass.
Expanded prose coverage and cross-run assembly do add work and need measurement.
Never claim that JSON Quality's benchmark numbers predict Markdown parsing or repository-link costs.

### 4.5 Static accessibility and HTML policy

Keep the existing Markdown image-alt error and make its assumption explicit: authored Markdown images are informational unless the author uses the supported decorative HTML representation.
An empty `![](...)` therefore fails; an explicit HTML image with `alt=""` may be decorative.
This distinction follows author intent, not a heuristic based on the filename.
The [W3C decorative-image guidance](https://www.w3.org/WAI/tutorials/images/decorative/) supports empty alternatives for decorative content and distinguishes them from a missing `alt` attribute.

Add proposed `quality/placeholder-image-alt` and `quality/unlabeled-image-link` error rules.
The first matches a finite reviewed list such as `image`, `img`, `photo`, `picture`, `screenshot`, `alt text` and `image description`, case-insensitively after trimming/collapsing whitespace.
Do not use subjective language models or reject every filename-like label.
The second computes the static accessible label of a Markdown link from meaningful text and image alt values; an image-only link must not pass with an empty/placeholder label.
Avoid redundant diagnostics when the same missing-alt source already supplies the actionable error.
Cover inline/reference images, mixed text-and-image links, badges with meaningful alt text and table cells.

Raw HTML stays permitted and protected from rewrites.
Add proposed `quality/disallowed-html-construct` and `quality/missing-html-image-alt` error rules using a maintained HTML fragment parser, never regular-expression sanitization.
The initial unsafe set is explicit: GFM tagfilter elements (`title`, `textarea`, `style`, `xmp`, `iframe`, `noembed`, `noframes`, `script`, `plaintext`), event-handler attributes, and `javascript:`/`vbscript:` URL attributes after HTML character-reference decoding and ASCII-control/whitespace handling.
Do not infer that every other HTML construct is safe.
HTML images require an `alt` attribute; empty alt is allowed for decoration, but an otherwise unlabeled image-only anchor fails unless it has a statically supported accessible label.
Use `quality/missing-html-image-alt` only for absent HTML alt attributes; use the separately scoped `quality/unlabeled-image-link` rule for supported Markdown links and HTML anchors with no meaningful static image-link label.
Allow ordinary semantic constructs such as `details`, `summary`, `kbd`, tables and explicit anchors.
Comments, literal code examples and quoted attribute text must not be interpreted as executable tags.

The parser must preserve source positions and parse relevant HTML fragments without executing scripts, loading resources or evaluating site templates.
The complete source bytes remain unchanged.
DOM accessibility, dynamic `aria-labelledby`, CSS visibility, renderer sanitization and general HTML security remain outside this static checker.
If reliable fragment reconstruction across Markdown boundaries is unavailable, close `GATE-003` with an explicit narrowed supported model before implementation; do not ship an undocumented regex approximation.

### 4.6 Repository-local paths and fragment semantics

Preserve existing local-target existence and containment checks, including percent-encoded filenames and root-relative rejection by default.
Decode path and fragment separately exactly once; reject malformed encodings and forbidden NUL/backslash path forms.
Split query before locating the fragment according to URL structure; `?` inside the fragment is not a path query.
Do not fetch external URLs, resolve site routes, infer directory index files or invent extensionless `.md` targets.

Require exact directory-entry spelling for each local path component on Windows and Linux.
An existing case-insensitive match does not establish canonical spelling.
Use bounded directory-entry observation, with optional Git spelling as corroboration, so untracked valid files are covered too.
Report `quality/local-path-case-mismatch` with the referring source location and bounded expected spelling; do not automatically rename files or repair links.
Retain the original URL spelling in source.

For fragments on contained regular `.md` targets, validate headings and explicitly supported HTML anchors.
Fragments on non-Markdown assets are outside this heading validator; their path still receives existence/case checks, and inspection must describe that coverage honestly.
An empty fragment is a document link and passes if the path is valid.
Do not decode and read linked documents through mandatory operational boundaries.

Use one package anchor model for same-document and cross-document checks:

- Reuse the existing GFM/front-matter parse and maintained `github-slugger` duplicate allocation; do not implement a new slug regex.
- Extract rendered heading text consistently, including code text and excluding HTML comments; use the parser's decoded text values.
- Preserve source-order suffix allocation.
  Distinct IDs such as `install` and `install-1` are not inherently ambiguous; sibling-heading policy is a separate finding.
- Support explicit HTML `id` and anchor `name` values with exact identity, and diagnose duplicate explicit target IDs as ambiguous.
- Retain documented virtual `top` and GitHub line-reference behavior only as an explicit compatibility choice verified against the existing supported corpus.
- Treat `{#custom-id}` according to a single documented package extension consistent across both paths; do not imply GFM itself defines this extension.
- Preserve existing case-insensitive fragment matching for generated headings initially; exact path-case enforcement is independent.
  Explicit HTML IDs retain their exact spelling.
  Test and document this distinction.
- Checking never NFC-normalizes targets or fragments to make a failing link pass; explicit normalize may patch a proven old-to-new fragment mapping only under section 4.9.

Proposed `quality/unresolved-local-fragment` owns these default same/cross-document checks, including missing or ambiguous supported anchors.
Turn off the overlapping upstream `markdown/no-missing-link-fragments` in the new preset once parity/deliberate-difference tests pass, preventing duplicate or conflicting default verdicts.
The upstream rule remains an explicitly selectable upstream rule, not a compatibility alias for the new one.
Migration must map intentional old overrides to the new rule explicitly.
The existing `local-target` failure identity remains for invalid/missing/escaping targets; do not replace operational read failures with a guessed missing-fragment finding.

Read a linked target even if it is outside the selected lint set or an ordinary user exclusion, provided it is inside the root and outside hard boundaries.
That is a read dependency, not authorization to lint, format or recursively traverse all of its links.
Report this distinction in inspection/documentation and account for its resource cost.
Only parse targets directly needed by selected links; graph cycles must not trigger recursive crawl.

Cache compact target anchor inventories per invocation using canonical path, content identity, syntax, parser/anchor-policy identity and proposed/original mode.
Do not retain a process-global mutable AST cache, re-read a popular target for every referring link, or copy the full repository graph into every worker.
Use the audit's `maxDocumentBytes`, `maxTotalDocumentBytes`, enumeration, analysis/worker and diagnostic ceilings as the shared admission envelope for unique source/read-dependency content.
Count the unique input union once, keeping proposed-output totals separate; retain selection-stage path counts and add the proposed `maxReadDependencyDocuments` limit of 10,000 for unique additional dependencies.
The naming audit specifies every existing leaf's population and unchanged default; graph accounting is a deliberate expansion, not a rename of `files` into a different count.
If further graph/source-map/preview ceilings are necessary, add them once through `analyzer-limits.js` and all generated/finite-profile consumers, with exact defaults settled before implementation.
No unbounded fallback is permitted.
An explicit owner-selected unlimited mode is a declared policy, not a fallback after failed admission; section 4.12 defines that distinction.

### 4.7 Repair admission, formatting, freshness and result identity

Preserve `check` exit `0` for complete input without blocking findings, `1` for blocking quality findings/drift and `2` for operational failure.
`--strict` adds warning blockers; diagnostic display filtering changes neither JSON findings nor decisions.
`inspect` resolves configuration and selection without claiming that content checks passed.

Format and normalize use operation-specific admission derived from actual input/proposed-output facts, not a general ignore-errors flag.
Format may leave only ordinary `quality/non-nfc-prose` findings on selected prose whose decoded Unicode text it preserves.
Normalize may leave only canonical-presentation drift handled by format; it must not leave eligible non-NFC prose unrepaired or hide an unsafe source-span case.
All other quality blockers, strict-mode warning blockers, parse failures, preservation failures, ambiguous references, protection violations and operational failures still refuse writes.
The exception applies only to the selected operation's presentation/NFC residual condition, never to unsafe dependent files or new collateral findings.
Evaluate retained structural rules on the actual candidate even when it is not canonically formatted; the existing canonical-only lint shortcut cannot hide errors from normalize admission.
Both repair orders must work for otherwise valid input with simultaneous presentation and NFC drift; check still fails after the first repair and passes after the second.

Logical-document formatting or normalization returns original content on refusal and never writes the checkout.
On a successful logical repair it returns proposed bytes, with any allowed remaining findings reported explicitly.
Section 4.9 defines normalization preview and source-scope constraints; section 4.10 defines command exits and quality reporting.

For multi-file repair, construct or admit all relevant proposed outputs, including dependent-fragment patches, before validating cross-document links.
A link from A to B must be checked against B's proposed output when B is in the same batch, and against captured original content otherwise.
Do not validate against a partially written mixture or allow worker scheduling to affect the verdict.
Preserve literal payload, tight/loose list structure, convergence and candidate identity checks.
Format retains its existing EOL-only allowances; normalize preserves physical EOL bytes and EOF layout exactly.
Never guess a fence language or new link label to make output pass.

Retain an explicit canonical-format corpus rather than treating the existing formatter as an oracle for itself:

| Source feature                    | Required output or refusal                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final newline and blank EOF lines | Exactly one final physical newline for ordinary nonempty documents; remove only nonliteral surplus blank lines; preserve the existing empty-document contract |
| Unordered lists                   | `-` markers with nesting and tight/loose structure preserved                                                                                                  |
| Ordered lists                     | Dot delimiters and consecutive numbering from the original first number; refuse transformations that would merge distinct adjacent lists                      |
| Headings                          | ATX representation; refuse unrepresentable multiline literal/hard-break cases rather than lose content                                                        |
| Code blocks                       | Safe backtick fences with a delimiter longer than embedded runs; retain exact payload and require the author to supply any missing language                   |
| Task markers                      | Lowercase `[x]` for completed tasks and unchanged completion state                                                                                            |
| Tables                            | Consistent leading/trailing pipes, alignment and spacing without changing cell text, escaped pipes or inline code                                             |
| Hard breaks and prose             | Explicit backslash hard breaks; retain package sentence layout and `proseWrap: "preserve"`; no arbitrary fixed-width reflow                                   |

If EOF cleanup would consume an unclosed literal block's payload, preservation takes precedence and the checker must report the unresolved condition.
Do not implement whole-file `trimEnd` as text hygiene.
These cases extend `AC-010` and `QA-010`; existing passing behavior needs regression proof, not a replacement formatter.

Capture config presence/absence, content identity and required input inventories during resolution.
Recheck those observations, linked targets and normalization's inbound-reference inventory before returning successful checking/preview results and before replacement begins; recheck applicable dependencies before subsequent writes.
For target files written earlier by this operation, expect the recorded postimage rather than rejecting the operation's own authorized change.
If a dependency/config appears, disappears, changes bytes or becomes linked, fail operationally; before the first write this means zero writes, and after earlier replacements it means truthful `writtenPaths` and per-document analysis/write states.
The existing per-file guard is not a filesystem-wide transaction or protection against arbitrary hostile same-user races; state the actual observation window and do not claim stronger atomicity.

Replace the ambiguous live `configDigest` contract with precise provenance in result schema 4:

| Field                          | Meaning                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configurationOrigin`          | Discriminated origin: default-file absence, file, or trusted snapshot; root-relative expected/original path and trusted source identity where applicable |
| `configurationBytesSha256`     | SHA-256 of exact input file bytes, or null for proven absence; never the hash of fabricated `{}`                                                         |
| `defaultConfigurationSha256`   | Exact packaged default-policy representation identity                                                                                                    |
| `policyResolverInputsSha256`   | Deterministic identity of the maintained resolver/default/schema/preset input inventory                                                                  |
| `effectiveConfigurationSha256` | SHA-256 of one versioned deterministic serialization of the complete resolved configuration, including effective invocation overrides                    |
| `configuration` and `policy`   | Complete resolved declarative settings and actual analyzer policy; never sparse input masquerading as effective output                                   |

Specify the serializer and fixed known field ordering once, with independent vectors; do not let incidental object insertion order define the contract.
Equivalent absent, `{}` and explicit configurations should share an effective identity while retaining different origin/byte identities.
Changing a default, rule owner, schema or resolver input changes the relevant package identity.
Update result validation, inspection, worker framing, migration comparison, qualification receipts and CI/release readers together.
Retain historical report fixtures unchanged; any historical comparison support is explicit reader behavior, not a new runtime schema shim.

Trusted candidate qualification must resolve absence in the trusted checkout, never in the candidate.
Materialize an owned trusted effective snapshot in the existing reserved staging boundary, binding its source origin separately from snapshot bytes.
The child must not rediscover a candidate policy or pretend that the generated snapshot is the original user configuration.
Keep an explicit trusted execution profile and its authority; zero-config ordinary consumption does not remove that assurance input.
Section 4.12 permits owner-controlled overrides while preserving distinct finite-lane acceptance.

### 4.8 Names and compatibility

Rename internal `advisoryDefaults`, `checkAdvisories` and `advisory-diagnostics.js` to `qualityRuleDefaults`, `checkQualityRules` and `quality-diagnostics.js`; their configurable severity already includes mandatory errors.
Update comments, imports, test names and dependency graph expectations in the same increment.
This is a semantic rename, not a reason to change diagnostic severity handling or create aliases.
Keep `prose-diagnostics` for the native sentence-formatting responsibility unless that responsibility actually changes.
Use the audit's exact replacements, including `eslintRuleSettings` for the misleading internal `nativeLintRules`; ESLint settings and native Snapper execution remain distinct owners.

Advance configuration/result/preset identities as one breaking contract change; choose an unused new major release version at delivery time.
Do not republish `1.0.3`, silently interpret schema 2 as schema 3, or implement a legacy preset branch without a prior scoped `NSH-01` owner decision.
No such compatibility override is established here.
The exact config/result version proposal is subject to `GATE-001`; if a real consumer requires a different transition, revise the plan before coding it.

### 4.9 Explicit normalization and anchor-impact handling

`normalize` repairs eligible decoded prose to NFC using the same syntax selection, prose-run classifier and Unicode primitive as the NFC checker.
It accepts the existing root, config, selection, limits, concurrency, strict and diagnostic-output controls.
With no file arguments it uses the same full authored selection as format; literal arguments and `--files-json` bound the write set exactly, including the successful empty-selection case.
No additional policy file or consumer script is required.

Add `--dry-run` and `--update-links` for normalize, with both defaulting to false and independently usable together.
Reject these new flags on unrelated commands rather than silently ignoring them or inventing aliases.
The API uses mode `normalize` with boolean `dryRun` and `updateLinks`; validate flags at the actual entry boundary and bind them to report identity.
Use the existing library entry points rather than adding a second normalization CLI implementation.

#### Prose changes and protected bytes

Normalize paragraph/list/blockquote text, headings, table-cell text, link labels and image alt values, including supported references and decoded character references.
Preserve code blocks/spans, raw HTML, front matter, reference identifiers, explicit anchor IDs, filenames and URL paths/queries.
The only URL changes are the separately admitted fragment substitutions below.
No source repair may perform NFKC, case folding, transliteration, smart-quote/dash substitution, NBSP/invisible-character removal, ordinary whitespace cleanup, line-ending changes or an incidental formatter pass.

Prepare minimal nonoverlapping source-span edits against captured original bytes.
UTF-16 parser offsets, Unicode code points and UTF-8 byte offsets are distinct units; map them explicitly, never by treating character counts as byte positions.
Preserve every byte outside the admitted prose/fragment spans, including BOM policy, mixed EOL representation and final-newline state; invalid input encoding remains an admission failure rather than implicit transcoding.
Apply span patches once against their original coordinate basis so earlier length changes cannot corrupt later edits.

Reparse the candidate and prove the same Markdown structure, link destinations except admitted fragments, reference bindings, literal payloads and inline styling, allowing only the intended NFC changes in decoded prose.
Use source-aware escaping or character references when NFC would otherwise introduce Markdown syntax.
For example, NFC can turn a compatibility-looking source character with a canonical decomposition into an ASCII delimiter; that does not authorize introducing a code span or other markup.
Do not round-trip the entire document through a printer merely to escape one changed run.

Combining sequences split by emphasis or other inline boundaries require a representation that preserves the formatting ownership of the original text.
If such a representation cannot be proven, report an unrepairable normalization boundary with its location and refuse the selected batch before any write.
Do not silently skip the run, move a combining mark across emphasis, remove markup, or claim the document is normalized.
Likewise, entity decoding must preserve literal ampersands, escaped punctuation and the resulting AST; normalization is not general entity canonicalization.

Normalization is idempotent at the source level: a second successful run produces no edits and identical bytes, not just equal rendered prose.
Do not write unchanged files or change their timestamps unnecessarily.
Use version-bound runtime normalization and conformance checks from section 4.4; preview and write must not disagree because they use different Unicode implementations.

#### Anchor identities and inbound references

Capture each heading's original node identity and allocated anchor, then compute anchors for all headings in the proposed document using the same package anchor policy.
Match original/proposed headings through preserved structural identity and source lineage, not their normalized text or list index alone.
Recompute the complete ordered allocation, including suffix changes on otherwise unchanged later headings.
Include explicit HTML IDs/names and supported custom-heading identities in collision/mapping validation while preserving their bytes.

If any generated anchor changes, ordinary normalize refuses before writing and returns the complete bounded anchor-change list plus the actionable `--update-links` option.
This applies even if no local inbound link is currently observed: changing public anchor identity is an explicit additional effect.
With `--update-links`, the caller permits those anchor changes and the necessary supported local-fragment repairs within the already selected write set.
The flag never grants arbitrary file renaming, markup insertion, legacy-anchor creation, scope expansion or permission to guess a target.

Resolve each affected reference against original content first, identifying the particular target node; then substitute that node's new anchor.
Do not match by normalizing the URL's fragment and hoping it identifies the same heading.
Preserve the URL path, query and unrelated title/label bytes, applying only the necessary correctly encoded fragment change.
Handle inline links and reference-definition destinations, including shared definitions, same-document references, percent encoding and legal root-relative paths under the selected policy.
Patch overlapping prose/label and destination edits through one source-edit owner; conflicting or unrepresentable spans refuse the batch.

Duplicate headings with deterministic distinct suffixes are not automatically ambiguous.
If NFC creates a new sibling-heading error, duplicate explicit target identity, unresolved target mapping or anchor collision that the selected model cannot distinguish, refuse rather than rename, merge, discard or arbitrarily suffix content.
Retain both original identities and bounded source locations in the report.
Do not repair pre-existing unrelated broken links as part of normalize.

When anchors change, complete a bounded reverse-reference inventory across supported `.md` files in the root outside hard operational boundaries, including tracked files and ordinary excluded/unselected files.
This is a distinct read scope, not a new write selection, and is needed to find incoming references rather than only links leaving selected files.
Use existing admission/budget owners for the union of source and dependency reads; do not implement an unbounded recursive crawler.
Keep ordinary check's direct-target behavior from section 4.6; the wider reverse inventory is required only for anchor-changing normalization.

If an incoming reference needs a change in an unselected or excluded file, refuse and identify the dependent path; the user can deliberately adjust selection or scope and rerun.
If it lies in protected raw HTML, recognize supported `href` dependencies through the HTML parser but refuse the required rewrite; normalize does not acquire HTML-edit authority.
Non-Markdown files, hard-boundary content, absolute external URLs, unsupported dialects and references outside the root are not covered by the local inventory.
Always report that external/unsupported backlinks are unverified when anchors change; absence from the local inventory is not proof of no callers.
The flag accepts the reported anchor-identity change, not a guarantee that unknown external links were repaired.

This explicit anchor contract follows [GitHub's section-link guidance](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links): heading changes and duplicate allocation can change link targets.
The local inventory, preview and flag are this package's safety design; neither the GFM grammar nor Unicode specifies this command interface.

Bind reverse-inventory membership and each required file's identity/bytes to preparation.
Reconcile tracked/walked membership again before successful preview or first replacement; additions, removals, content changes or linked-path substitutions affecting the observation cause an operational refusal.
Recheck applicable dependencies during replacement, recognizing this operation's own postimages.
Keep the documented cooperative observation/per-file replacement guarantee; do not promise a repository-wide atomic transaction.

Validate the complete proposed document/link graph before the first write.
An unsafe member anywhere in the selected batch means zero selected-source writes.
After preflight, a later per-file replacement failure may leave completed changes; report exact written and pending-write paths independently of analysis completion and never mislabel the result as a completed normalization.

#### Preview and logical documents

`normalize --dry-run` performs the same selection, source edits, anchor mapping, reverse inventory, quality admission and freshness checks as an actual write.
It creates no source/config/link edits; owned bounded temporary analysis storage is allowed under the existing cleanup contract.
Return a deterministic ordered change list with path, original UTF-8 byte span, original line/column, kind (`prose-nfc` or `local-fragment`), before/after byte lengths and hashes, and all anchor effects/refusals.
Record the effective policy, input identities, selection and Node/ICU/Unicode identity.
Do not include complete document bodies or unrestricted decoded text in default output; bounded explicitly requested diffs can be a later interface decision, not a mandatory new option here.

Preview is not a stored write token: a subsequent write reruns preparation and freshness checks.
Reusing a preview after source, policy, target, inventory or runtime changes is not supported.
Truncated/over-budget analysis produces an incomplete operational result, never a successful partial preview.
`writtenPaths` remains empty, and proposed changes must not be counted as completed writes.

For supplied logical documents, use the supplied bytes as the authoritative proposed member at their final path; never substitute a stale disk copy for that input.
Successful logical normalize returns the candidate bytes, or original bytes in dry-run/refusal, with the same proposed-change report.
It may update fragments within the supplied document under `updateLinks`, but cannot write inbound references in other files; a required external member edit refuses the logical request.
The request runner may run physical normalization preview and logical normalization because neither writes the checkout; physical normalize writes remain in the direct guarded writer path, like physical format.
Trusted candidate qualification continues to invoke check, never a write-capable mode.

### 4.10 Command outcomes, quality state and composable repairs

Keep operation success distinct from the remaining quality state in result schema 4.
An allowed residual finding is still a real finding with its configured severity; never hide it, downgrade it or return a fabricated clean result.

| Request/result                                                              | Exit | Effects and meaning                                                                                                                          |
| --------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Check complete, no blockers                                                 | `0`  | Read-only complete selected-scope verdict; informational/non-strict warnings remain visible                                                  |
| Check complete with blockers/drift                                          | `1`  | Read-only quality failure, including default non-NFC prose                                                                                   |
| Format completed with only allowed residual NFC findings                    | `0`  | Requested presentation repair succeeded; check still fails for NFC                                                                           |
| Normalize completed with only allowed residual presentation drift           | `0`  | Requested Unicode/link repair succeeded; check still fails for formatting                                                                    |
| Normalize dry-run fully admissible, changes or no changes                   | `0`  | Complete preview, zero source writes; change presence alone is not failure                                                                   |
| Repair/preview refused on a known policy, quality, scope or mapping blocker | `1`  | Complete refusal with reasons and zero source writes before first replacement                                                                |
| Any operation incomplete or failed operationally                            | `2`  | Invalid config/arguments, unsafe file admission, resource exhaustion, stale observations or I/O failure; preserve actual partial-write state |

Syntax/decoding admission failures and source-structure preservation failures are never eligible residual findings; use the existing owning diagnostic/error classification rather than converting them into successful repair.
An invalid path/file or missing dependency is operational; a known required link edit outside the selected write set is a completed scope refusal.
The empty-selection case succeeds with no tool launch or mutations.
`--strict` continues to block other warnings; it does not erase the narrowly allowed residual repair condition selected above.

Replace schema 3's overloaded `outcome` interpretation with explicit schema-4 fields: `operationStatus` (`completed`, `previewed`, `refused`, `failed`), `qualityStatus` (`clean`, `findings`, `incomplete`, `not-checked`) and `qualityBasis` (`input`, `candidate`, `applied`, or null when unavailable).
`operation` adds `normalize`; boolean `dryRun` and `updateLinks` retain the admitted request values, false for other commands.
Define `qualityStatus` over complete selected-scope findings, not over the entire repository or just the existence of an exit blocker; nonblocking information can therefore coexist with completed exit `0` and status `findings`.
Completed checks use `operationStatus: completed`, even when their quality blockers require exit `1`, with quality basis `input`.
Inspection uses `not-checked` and null basis; a preview describes `candidate`, not applied bytes; successful logical repairs use `candidate`; successful physical repairs describe `applied` content.
An early deterministic policy refusal can use `not-checked` and null basis when content analysis has not run; it must not claim a content verdict.
After a partial replacement failure, quality is incomplete; never reuse the all-candidate verdict as proof of the partially applied filesystem.
For a completed refusal with fully checked candidate content, candidate quality may be known separately from a scope/anchor refusal; use input basis only when the verdict actually describes checked original bytes.
If attempted analysis cannot complete, use incomplete and operational exit `2` rather than inventing a quality verdict.

Preserve full diagnostics with a declared input/candidate coordinate basis, and keep proposed edits, anchor changes and refusal reasons separate from `writtenPaths` and `documentResults`.
Replace old admission-overloaded `unchanged`/`unprocessed` arrays with the audit's per-document `analysisStatus` and `writeStatus` state table; a completed failed check remains completed analysis.
Logical changed content and read-only previews never masquerade as physical writes or byte-identical candidates.
Human output must state, for example, that normalization completed but formatting findings remain; it must not print a generic clean-repository message on operation success.
Update all result schemas, validators, report comparators, CLI renderers, public API tests and receipt consumers in the same increment.
Old `outcome` is not a compatibility alias in live schema-4 results; retained historical comparison readers keep their explicit old-schema behavior.

Do not reuse the check predicate `exitCode === 0 means no blockers` for a repair result.
CI/release quality gates must require a complete `check` result on the intended input identity; a successful normalize, format or preview receipt cannot substitute for it.
Regression tests must reject substitution of successful repair evidence for checking evidence even when the command exits `0`.

For otherwise valid mixed-drift input, prove both sequences: format then normalize then check, and normalize then format then check.
After the first step the other condition remains reported at its original severity; after the second step check succeeds and repeating both operations changes no bytes.
Protected content, parser/graph disagreements, new structural findings and incomplete analysis remain blockers in both orders.

### 4.11 Exposed-name migration and exact meanings

The [public naming audit](2026-11-02-public-naming-audit.md) supplies the complete surface inventory, source evidence, retained names, old/new mappings, quota defaults/populations, digest preimages and result-state tables.
It is incorporated into this plan; an implementer must read its contract sections rather than infer behavior from the replacement spelling.
R means behavior-preserving rename, D means explanatory correction, and B means a deliberate contract/exposure/accounting change.
No replacement may change a threshold, scope, output meaning or write effect without the B specification and its oracle.

| Audit IDs                 | Required implementation disposition                                                                                                                                                                            | Producing slices             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| NAME-001 through NAME-005 | `executeQualityRequest`, `processLogicalDocument`, private initial-result construction, `compareCheckReports`/comparison schema, `stageCandidateData`, `qualifyGitMarkdown` and `markdown-quality-qualify-git` | 010, 002, 009                |
| NAME-006                  | Exact commit-ID, executable-path, candidate-root and archive-flag mappings through qualification, workflow, observer and CodeQL consumers                                                                      | 010, 002                     |
| NAME-007 through NAME-009 | Local-target control, consumer-root enum, reconciliation/omission vocabulary, display-only diagnostic flag and scoped limit-bypass flags                                                                       | 010, 001, 004                |
| NAME-010 and NAME-011     | All 19 analyzer leaves, finite execution/profile fields, analyzerLimits owner and separate dependency count; retain specified defaults/units/populations                                                       | 010, 001, 004, 009           |
| NAME-012 and NAME-013     | Maximum sample metric, observed-memory/count labels and platform limitations; preserve actual measurement and admission                                                                                        | 010, 006                     |
| NAME-014 and NAME-015     | Independent operation/quality/basis and per-path analysis/write states with truthful partial effects                                                                                                           | 003, 009, 010                |
| NAME-016 and NAME-017     | Exact plugin/policy vocabulary, configuration provenance, comparison manifest/selection hashes, pre-overlay counts and Git-record digest meanings                                                              | 010, 002                     |
| NAME-018 and NAME-019     | Formatting-drift comparison, mandatory-quality owner names and ESLint/native separation                                                                                                                        | 010, 003                     |
| NAME-020                  | Finite disallowed-HTML, missing-HTML-alt, case-mismatch and unresolved-fragment IDs; preserve rule-specific scopes                                                                                             | 004, 005                     |
| NAME-021 and NAME-022     | Remove misleading JSON script aliases, rename aggregate/audit scripts, and name evidence-retention Boolean for its actual effect                                                                               | 010, 007                     |
| NAME-023 and NAME-024     | Parse-boundary error identity, original UTF-8 half-open edit spans, explicit coordinate units and span hashes                                                                                                  | 010, 009                     |
| NAME-025                  | Complete overridable resource inventory, resourceLimitMode, sparse persistent profiles, bootstrap overrides and honest external limits                                                                         | 010, 001, 002, 004, 009, 006 |

Retain accurate conventional names, including the package/platform names, `runQuality`, `inspectSelection`, `readExecutionProfile`, `validateQualityResult`, `check`, `format`, `inspect`, `normalize` and single-object `--json`.
The JSON Quality event-stream naming decision does not justify changing this package's `--json` to `--ndjson`.
Preserve upstream/provider-required identifiers at their adapters; a public audit does not authorize renaming external contracts.
The audit also fixes documentation that falsely describes an overrideable finding as always informational, validation as a snapshot, or a maximum observation as P95.

In addition to config 3/result 4/preset 2, migrate execution profile 1 to 2, comparison report 2 to 3, and changed observer/sample receipts 1 to 2.
Current comparison schema path/export/URN must agree; archived migration-schema evidence keeps its original identity.
Inventory any enclosing evidence contract that embeds changed receipts and version it explicitly; do not silently mutate schema 1 payloads or leave release/CI readers using old vocabulary.
Keep frozen historic records and explicit historic comparison support; no live compatibility alias or dual old/new key acceptance is authorized.
Unknown old SDK object keys need explicit rejection too, not just CLI/schema rejection, so a misspelled migrated quota cannot silently restore defaults.

### 4.12 Complete consumer control of resource ceilings

The owner requires all package-imposed resource ceilings to be overridable through a simple execution-profile input, with consumers responsible for their choice.
This is an explicit behavior change from revision 3, whose finite-only execution profiles and retained hidden ceilings did not meet that requirement.
The guarantee is a release acceptance criterion, not a claim about current package 1.0.3.
References elsewhere to bounded execution or finite resources describe the configured default and finite qualification lanes; this section governs explicit overrides.

#### One opt-in setting and persistent consumer defaults

Add `resourceLimitMode: "configured" | "unlimited"` to the execution profile, defaulting to `"configured"`.
The CLI projection is `--resource-limit-mode configured|unlimited`.
One invocation can opt out of every package-imposed resource ceiling:

```sh
npm exec -- markdown-quality check --root . --resource-limit-mode unlimited
```

An ordinary consumer can persist the same choice in a sparse root `.markdown-quality-execution.json`:

```json
{
  "resourceLimitMode": "unlimited"
}
```

Ordinary execution auto-discovers that exact file under the resolved consumer root; explicit `--execution-profile PATH` takes precedence.
Absence keeps current finite defaults; malformed, unreadable, linked or incompatible present input fails rather than silently falling back.
Do not require runtime declarations, toolchain archives, sample counts or a generated profile for ordinary check/format/normalize/inspect operations.
Those declarations remain required only by the operations that actually use them, such as trusted qualification.
If supplied, the ordinary profile's schema marker must identify the new execution schema; omission selects its current sparse-input contract.
Snapshot profile origin, bytes, effective resource policy and freshness just as for configuration.
Do not discover a candidate-controlled execution profile during trusted qualification.

The SDK uses `executionProfile: { resourceLimitMode: "unlimited" }` for direct/logical operations and the same profile fields in the request runner's existing second options argument.
Use `executeQualityRequest` instead of revision 3's proposed `executeBoundedQuality`, since execution can now deliberately lack package ceilings.
Its physical-write restrictions remain unchanged; the name does not promise a sandbox.
All commands, including guarded physical format/normalize, resolve the same resource contract; do not retain the current CLI's blanket rejection of execution profiles on physical formatting.
Applicable resource controls reach the existing direct writer and analyzer; this does not move physical replacement into a killable child that could lose effect accounting.

In configured mode, every ceiling accepts a positive safe integer or null; null disables that package ceiling.
Configured defaults remain finite, and finite overrides can raise or lower them.
Unlimited mode projects every package ceiling to null, including future registered ceilings; it never substitutes a large finite sentinel.
Explicit positive ceiling values in the same overriding layer as unlimited mode are contradictory and must be rejected; lower-layer defaults/values are intentionally bypassed and reported as such.
Use configured mode plus individual nulls for a mixed policy.
No extra confirmation flag, interactive prompt or repeating waiver is required beyond the consumer's explicit choice.

Resolve ordinary resources in this order: package defaults, configuration analyzer overrides, selected execution profile, then explicit invocation overrides.
Snapshot and report the result; never allow a helper or worker to reread lower-precedence settings and restore a limit.
Cross-field constraints, such as an inner deadline not exceeding an outer one, apply only when both ceilings are finite; null is not numerically coerced into zero.
Under trusted qualification, the independently supplied trusted profile and authorized invocation own this choice; candidate configuration has no override authority.
Existing hosted acceptance that requires a finite qualification profile remains a distinct consumer policy: an unlimited run cannot be relabeled as proof of compliance with finite limits.
A trusted owner may request unlimited execution, but its receipt must record exactly that policy and the assurance it actually establishes.

#### Remove hidden ceilings and close bootstrap gaps

Maintain one resource-control inventory with each ceiling's owner, public profile key, configured default, units, applicable operation, disable semantics and downstream adapters.
Generate admission/inspection documentation from that authority and inspect actual consuming branches; a table alone cannot prove complete coverage.
Extend it to the previously hidden controls below in addition to all audit-section-3 analyzer/execution limits and the planned graph/source-map/preview limits.

| Current fixed boundary                                                  | Required profile control and treatment                                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI logical stdin request, 8 MiB before profile resolution              | Use the resolved `maxRequestBytes`; resolve the profile before consuming request bytes and forward the same value to the worker framing boundary                                       |
| Profile and runtime declaration reads, 64 KiB each                      | `maxProfileBytes` and `maxRuntimeDeclarationBytes`, each default 65,536; support out-of-band invocation overrides before loading those inputs                                          |
| Git commands, 10-second timeout                                         | `gitTimeoutMs`, default 10,000, applied to inventory and checkout identity subprocesses                                                                                                |
| Git inventory output fallback, 4 MiB even after null                    | `maxGitInventoryOutputBytes`, default derived from configured `maxInventoryBytes`; explicit null/unlimited removes the fallback rather than reintroducing 4 MiB                        |
| Qualification Git tree output derived from staging entries              | `maxGitTreeOutputBytes`, configured default derived from `maxStagedEntries * 1024`; explicit null/unlimited removes the package cap, and derived arithmetic must be checked            |
| Python/runtime probe, 10 seconds and 4 KiB                              | `runtimeProbeTimeoutMs` and `maxRuntimeProbeOutputBytes`, defaults 10,000 and 4,096                                                                                                    |
| Qualification sample-count ceiling of 100                               | `maxQualificationSamples`, default 100; requested `requiredConsecutiveSamples` remains a finite positive work count and can exceed 100 when this ceiling is raised or disabled         |
| Evidence packaging input ceiling of 64 MiB                              | `maxEvidenceInputBytes`, default 67,108,864, supplied by the trusted packaging caller before reading artifacts; artifact contents cannot authorize their own admission                 |
| Evidence fallback inventory of 1,000 samples                            | `maxUnboundEvidenceSamples`, default 1,000, for collection without a complete trusted profile; unlimited does not fabricate missing profile/identity evidence                          |
| Document memo capacities, 4 MiB parse/layout and four entries per stage | `maxMemoParseBytes`, `maxMemoLayoutBytes`, `maxMemoEntriesPerStage`, defaults 4,194,304, 4,194,304 and 4; null removes eviction/admission ceilings while retaining invocation disposal |
| Package cleanup wait of five seconds                                    | `cleanupTimeoutMs`, default 5,000; null removes the wait deadline, not cancellation, process termination or truthful cleanup accounting                                                |
| Comparison harness input ceiling of 8 MiB                               | `maxComparisonInputBytes`, default 8,388,608, resolved before reading comparison inputs; no new size ceiling is imposed on the previously uncapped comparison SDK by this migration    |

A file cannot retroactively authorize reading itself beyond a bootstrap ceiling.
Therefore global CLI/SDK unlimited mode must be admitted before any profile/config/input-file read; a finite `maxProfileBytes` override must also be available through an out-of-band invocation control.
Expose the same finite override through `--max-profile-bytes N` for CLI bootstrap, then use normal profile precedence for subsequent reads.
The tiny persisted opt-in profile above fits the default bootstrap bound; consumers with unusually large profiles can use either bootstrap override.
Do not hide this causality behind a claim that every setting inside an unread file has already taken effect.
CLI `--resource-limit-mode unlimited` and equivalent SDK input override all package bootstrap ceilings as well as subsequent execution ceilings.

Replace coercions such as `null ?? default`, truthiness defaults, finite-only worker validators and bounded evidence-reader assumptions on these paths.
Use API-appropriate representations: omit an owned runtime limit or timer when null, and use a supported unbounded stream/buffer strategy where the native API requires it.
Never pass literal Infinity through JSON, silently clamp to an old ceiling, or turn a missing value into a disabled setting.
A new resource ceiling cannot ship without a public override, unlimited-mode projection and coverage test.
Classify every remaining fixed constant as a resource ceiling, a correctness/protocol constraint, a runtime representation bound or an algorithmic work unit; retain the owning rationale so a hidden cap cannot be excused as an implementation detail.

#### What the opt-in does and does not claim

Unlimited means no package-imposed resource ceilings; it cannot remove Node/V8/OS allocation constraints, JavaScript representation limits, filesystem constraints or hosted-provider job/artifact limits.
Omitting a package-supplied V8 flag delegates to the runtime's own limits; it does not create infinite heap, stack or buffer capacity.
A library cannot retroactively change the host process's startup heap limit; apply options only to owned runtimes and disclose host-owned constraints.
Node's [old-generation control](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib) and [worker resource contract](https://nodejs.org/api/worker_threads.html) are the adapter authorities.

Quality policy, NFC enforcement, schema correctness, containment, trusted authority, exact identities, literal preservation, cancellation, freshness and guarded replacement are not resource ceilings and stay enforced.
Algorithmic chunk sizes, polling intervals, requested sample counts and concurrency are work/strategy settings, not ceilings to turn into Infinity; document and tune them separately where useful.
Keep cleanup/disposal active and report uncertain effects honestly if the host terminates an unlimited run.
Report `resourceLimitMode`, each effective ceiling and its origin, applicable runtime controls and known external constraints through inspection and result identity.
The advanced override must be visible in a normal inspection result, not only hidden in a digest.

Removing ceilings is not a guaranteed speed improvement.
Higher cache allowances may reduce eviction/recomputation and larger runtime allocations may reduce some garbage-collection work; they may also increase memory pressure and elapsed time.
Skip unnecessary budget-only accounting when the corresponding ceiling is disabled, but retain accounting needed for exact effects, provenance, diagnostics and cleanup.
Compare configured defaults, a tuned finite profile and unlimited mode on the same admitted inputs, separately from tests where defaults reject the workload.
Measure startup, median/p95 elapsed time, peak memory under its actual platform metric, cache hits/evictions, output identity and cancellation/cleanup.
Only advertise an improvement supported by those measurements; finite defaults remain the package-wide default, and a saved opt-in profile becomes that consumer's ordinary default.

## 5. Requirements, acceptance criteria and invariants

Each `REQ-###` is paired with the same-numbered `AC-###` below.
Acceptance is based on externally observable behavior and negative cases, not on tests that merely search for new strings.

| Requirement                                      | Acceptance criterion                                                                                                                                                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: dependency-only operation               | AC-001: actual installed CLI runs the original five command shapes plus normalize, preview and update-links cases with no policy file, scripts, wrapper or added application dependency                                                                  |
| REQ-002: root identity                           | AC-002: explicit roots, nested Git/package/cwd fallbacks and worktrees select the specified root; unsafe/inaccessible metadata fails                                                                                                                     |
| REQ-003: sparse resolution                       | AC-003: absence, `{}`, sparse maps and complete current declarations resolve correctly; immutable snapshots do not share mutable state; bad present input fails                                                                                          |
| REQ-004: discovery and boundaries                | AC-004: broad `.md` scope, hidden paths, tracked inventory, literal names and empty selection are complete and bounded; hard boundaries cannot be overridden                                                                                             |
| REQ-005: default NFC error                       | AC-005: NFD prose in every declared prose context fails ordinary check; format preserves its Unicode and reports residual findings; protected bytes and visible overrides remain intact                                                                  |
| REQ-006: stronger style defaults                 | AC-006: generic labels, sibling duplicates and bare URLs fail; punctuation warns; long lines stay informational; strict/display behavior is unchanged                                                                                                    |
| REQ-007: accessibility and HTML                  | AC-007: missing/placeholder alt, unlabeled links and the specified unsafe HTML patterns fail; decorative empty HTML alt and legitimate semantic HTML pass                                                                                                |
| REQ-008: local path case                         | AC-008: wrong component casing fails identically on Windows/Linux for tracked and untracked targets; encoded paths remain contained                                                                                                                      |
| REQ-009: fragment integrity                      | AC-009: same/cross-document valid, missing, duplicate-explicit, suffixed, Unicode and encoded targets have independent expected verdicts; no recursive crawl/network activity                                                                            |
| REQ-010: formatting preservation                 | AC-010: canonical style remains convergent and literal-safe; graph checks use all proposed batch outputs; complete preflight precedes writes                                                                                                             |
| REQ-011: freshness and partial effects           | AC-011: config/target race injections refuse stale success; preflight failures write nothing; later failures accurately report completed and remaining paths                                                                                             |
| REQ-012: provenance and contracts                | AC-012: independent hash vectors, origin variants, schema migration and all live readers agree; absence is not a fabricated file digest                                                                                                                  |
| REQ-013: resource-controlled execution           | AC-013: configured config/graph boundary and one-over cases terminate within selected envelopes; disabled ceilings do not silently return; shared targets are not repeatedly parsed and worker-count changes preserve results                            |
| REQ-014: trusted qualification                   | AC-014: trusted absence supplies defaults; candidate config cannot take control; trusted resource policy, staging identity and complete receipts remain required; finite-lane acceptance is distinct from unlimited execution                            |
| REQ-015: installed assurance                     | AC-015: both layouts and every policy-selected runtime/platform pass minimal CLI and retained rich probes with verified package/lock/bin identities                                                                                                      |
| REQ-016: migration and guidance                  | AC-016: quick start is config-free; sparse examples execute; old-version errors are actionable; severity, graph and Unicode changes are explicit                                                                                                         |
| REQ-017: integration and delivery                | AC-017: relevant final local checks and independent assurance pass; when authorized, final-head hosted acceptance and normal merge/post-merge verification pass                                                                                          |
| REQ-018: source-aware NFC repair                 | AC-018: normalize repairs safely representable eligible prose only, preserves all other bytes/structure and is source-idempotent; unsafe mappings or disabled NFC policy refuse before writes                                                            |
| REQ-019: complete normalization preview          | AC-019: dry-run prepares the same edits and refusals as write, reports bounded spans/hashes/anchor effects, writes no sources and cannot authorize a later stale write                                                                                   |
| REQ-020: anchor and reference maintenance        | AC-020: changed anchors require update-links; all supported inbound references resolve by original target identity, fit the selected write set and pass the complete proposed graph; ambiguous/out-of-scope edits refuse                                 |
| REQ-021: composable repair outcomes              | AC-021: both mixed-drift repair orders succeed without hiding the residual condition; exits/status/basis follow section 4.10 and CI rejects repair/preview receipts substituted for check                                                                |
| REQ-022: normalized execution boundaries         | AC-022: CLI/API/logical/preview paths share policy and preparation, honor the resolved resource mode/cancellation/empty selection, never expand writes and report partial effects truthfully                                                             |
| REQ-023: precise exposed vocabulary              | AC-023: NAME-001 through NAME-025 and retained-name decisions are implemented across packed exports/bins, CLI/API, schemas, scripts, workflow and current consumers; removed spellings fail explicitly                                                   |
| REQ-024: faithful resource and measurement names | AC-024: every quota's defined population/unit/default/bypass and maximum-sample metric is proved; graph changes and platform memory limitations are explicit, not hidden by renaming                                                                     |
| REQ-025: truthful analysis and effect accounting | AC-025: complete failed checks, logical changed output, previews, early refusals and partial writes satisfy the independent per-document state table and reject inconsistent derived written paths                                                       |
| REQ-026: complete consumer resource override     | AC-026: every package ceiling has finite override and disable paths; one unlimited setting covers bootstrap, stdin, workers, native/Git commands, graph, caches and evidence without hidden fallback; sparse profiles persist the choice                 |
| REQ-027: honest performance and assurance        | AC-027: inspection/evidence binds effective resource policy and external constraints; cancellation/write invariants hold; finite acceptance rejects incompatible unlimited evidence; speed claims require measured configured/tuned/unlimited comparison |

Invariants: no runtime acquisition or external URL probes; no executable consumer configuration; no inline suppression authority; contained reads under the resolved resource policy; no literal-content loss; no unknown-rule coercion; stable deterministic diagnostics; independent syntax/quality/operational outcomes; immutable historical evidence; no source or release acceptance inferred from HISEW status.

## 6. Quality scenarios and independent oracles

| ID     | Stimulus                                                                                                                                         | Required response and measurement                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-001 | Fresh non-Git and Git dependency-only consumers, including nested invocation                                                                     | Required CLI commands and root selection work with observed installed binaries; no generated config                                              |
| QA-002 | Missing default, missing explicit file, denied access, symlink, bad JSON, old marker                                                             | Only default absence succeeds; all others fail with the correct operational category                                                             |
| QA-003 | Resolve two configurations, then attempt nested mutation; oversized sparse controls                                                              | No cross-session mutation; limits checked before merge/traversal expansion                                                                       |
| QA-004 | Hidden/tracked/excluded files, dependency directories, literal brackets, explicit empty selection                                                | Exact selected/omitted inventories; no unintended traversal or tool launch                                                                       |
| QA-005 | NFC/NFD, Hangul, reordered marks, entities, split inline runs, tables, images and literal controls                                               | Expected NFC errors at original coordinates; check and format do not normalize; protected literals remain intact                                 |
| QA-006 | Generic labels, duplicate headings, questions, long lines, bare URLs and autolinks                                                               | Exact default/override/strict/display truth table without accessibility overclaims                                                               |
| QA-007 | Decorative/meaningful/placeholder alt, image-only links, HTML attributes/comments and benign tags                                                | Finite static policy verdicts; no DOM/network/script effects or HTML rewrite                                                                     |
| QA-008 | Missing/encoded/case-mismatched paths, junction swap, traversal and non-Markdown fragments                                                       | Containment and exact spelling enforced consistently; unsupported fragment coverage is explicit                                                  |
| QA-009 | A links to B with duplicate headings, explicit IDs, Unicode and cycles                                                                           | Correct shared-anchor results; suffixes accepted; no recursive link expansion                                                                    |
| QA-010 | A and B both change under format; target excluded from formatting; logical document supplied                                                     | Graph uses proposed selected outputs and captured external targets; read dependencies never become write selections                              |
| QA-011 | Create/remove/replace config or target before verdict and between replacements                                                                   | No stale clean result; zero writes before preflight; truthful partial-write state afterward                                                      |
| QA-012 | Many references to one target, many unique targets, large HTML/combining sequences and one-over limits                                           | Bounded state/deadlines; unique-target work measured; no per-edge reparsing or worker-multiplied graph                                           |
| QA-013 | Delete/duplicate/substitute a consumer result, config identity, installed byte or lock entry                                                     | Existing CI/release admission rejects evidence before executing substituted content                                                              |
| QA-014 | npm 12 producer with npm 11 consumers; root and isolated layouts; Windows shims/Linux symlinks                                                   | Packing uses producer; consumer install/bin behavior is real; no fallback to global/cache package                                                |
| QA-015 | Candidate disables NFC or supplies config while trusted root has none                                                                            | Trusted defaults still apply; candidate data cannot redefine checking authority                                                                  |
| QA-016 | Equivalent effective input through different origins, altered package rules and historical reports                                               | Equal effective hashes where appropriate, distinct provenance and rejected stale live contracts                                                  |
| QA-017 | NFC edits in prose/alt/entities, astral offsets, delimiter-producing normalization and differently styled combining runs                         | Independently expected NFC text and same structure/untouched bytes; unsafe boundary refuses complete batch; second run has no writes             |
| QA-018 | Heading NFC changes, suffix cascades, repeated headings, explicit-ID collisions and encoded/reference links                                      | Complete old/new node mapping; unchanged later headings included; ambiguous or newly invalid graph refuses rather than guesses                   |
| QA-019 | Required inbound edit in selected/unselected/excluded/raw-HTML content; absolute or unsupported backlinks                                        | Selected supported fragments repaired only with flag; other required local edits refuse; external coverage remains explicitly unverified         |
| QA-020 | Preview and write on identical preimages, no-op/disabled policy, then changed source/config/inventory/runtime                                    | Matching candidates/refusals and zero preview writes; new write revalidates rather than trusts preview; incomplete preview never succeeds        |
| QA-021 | Both repair orders with mixed drift, strict mode, an unrelated error and successful repair substituted into CI                                   | Only the named residual condition is admitted; check remains failing until repaired; quality/effect status is honest and CI rejects substitution |
| QA-022 | Large combining runs, many incoming links, output quota, cancellation, stale dependency and late replacement failure                             | Bounded work/cleanup; no writes before admission; exact partial effects after a later operational failure                                        |
| QA-023 | No-config physical/logical normalize, literal names, files-json empty selection and combined dry-run/update-links                                | Same command/API semantics and identities; logical/preview never writes checkout; invalid flag combinations fail explicitly                      |
| QA-024 | Packed public-surface inventory, translated R fixtures and old names on CLI/SDK/profile/workflow boundaries                                      | Complete naming coverage; unchanged behavior for R; explicit rejection of stale/unknown names with no fallback selection or quota                |
| QA-025 | Exact/one-over quotas, astral patterns, diagnostic JSON bytes, sample counts 1/20/100 and platform memory records                                | Same numeric/counting thresholds, maximum rather than mislabeled P95, identical MiB forwarding and truthful metric limitations                   |
| QA-026 | Fully analyzed failure, changed logical output, dry-run, early refusal, partial replacement and forged effect arrays                             | Analysis/write states and quality basis agree; writtenPaths derives only from confirmed writes; old unprocessed semantics are not reused         |
| QA-027 | Every inventoried ceiling at tiny/exact/one-over bounds, null and global unlimited, including pre-read framing and evidence                      | All ceilings are actually overridable; no null-to-default fallback, clamp or unregistered cap; configured defaults unchanged                     |
| QA-028 | Sparse saved profile, invocation precedence, oversized bootstrap input, physical repairs, candidate opt-out and finite-lane receipt substitution | Persistent opt-in works; bootstrap overrides precede reads; freshness, authority and effect safety hold                                          |
| QA-029 | Identical workloads under defaults, tuned finite limits and unlimited, plus cancellation and allocation failure                                  | Same quality/content semantics; measured latency/memory/cache behavior and truthful operational failure/cleanup; no unsupported speed claim      |

The independent verifier owns expected policy verdicts and the accepted delta list.
Use hand-reviewed rendered-text/anchor cases, existing protected literal corpus, appropriate official Unicode vectors, and documented upstream grammar examples.
Do not derive expected anchors by calling the production anchor helper inside the assertion.
Test deterministic negative mutations: remove a required target, change one case component, substitute a config digest or installed byte, disable the NFC default, omit a selected result, and change a proposed heading.
Each mutation must fail at the intended boundary.
For normalization, also shift a source edit's byte offset, drop one suffix-affected heading or incoming reference, permit an out-of-selection patch, and substitute a successful preview for a check receipt.
Use independent expected text, preserved-byte spans, anchor-to-node mappings and reference destinations; production normalization/slug helpers must not generate their own sole expected answers.
Official Unicode vectors must match the declared Unicode identity and retain applicable fixture notices if incorporated; their adoption is not completed by citing the standard.

Mock only genuine external boundaries such as provider/network transport or controlled filesystem-failure timing where necessary.
Use real temporary files/Git/npm installation and actual parser/formatter/normalizer for their core claims.
Do not mock the validator verdict or package identity being proven.
For R mappings, translate only declared names in independent before/after fixtures; do not regenerate expected values from renamed production code.
For B mappings, retain explicit changed-contract vectors, including closed SDK option admission and the per-path state table.

## 7. Architecture, reuse and rights

Paths are likely implementation seams, not predicted line numbers or a fixed decomposition.

| Authority / likely files                                                                                             | Consumers and failure boundary                                      | Strategy and drift control                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/configuration.js`, `src/preset.js`, new default/effective-config owner                                          | CLI, SDK, execution worker, trusted staging                         | One resolver and immutable defaults; root/config I/O separate from semantic merge                                    |
| `scripts/schema-sources/`, `scripts/generate-schemas.js`, `src/analyzer-limits.js`                                   | Installed schemas, result/profile readers and tests                 | Extend existing generator for sparse/effective distinction; limits remain one authority                              |
| `src/documents.js`, `src/path-containment.js`, `src/regular-file.js`                                                 | Walk, Git reconciliation, explicit files and linked reads           | Shared admission decisions with distinct selection versus dependency-read populations                                |
| `src/analysis.js`, renamed quality-rule module, new anchor/HTML helpers                                              | Document workers and repository graph                               | Reuse GFM parse, slugger and supported HTML parser; one package fragment model                                       |
| `src/document-memo.js`, worker/pool and new invocation graph owner                                                   | Single/multiple workers, repeated targets, formatting candidates    | Keep document-local reuse; add bounded invocation-owned compact target inventory                                     |
| `src/quality.js`, `src/replacement.js`, `src/formatting.js`                                                          | Filesystem and logical format/check                                 | Preserve per-file write guard; add whole-preflight dependency observations and proposed-output checks                |
| Shared prose-run classifier and new source-edit/normalization owner                                                  | NFC checker, CLI/API normalization and preview                      | One population/Unicode authority; minimal admitted edits, independent structure/byte oracle, no formatter round-trip |
| Invocation anchor/reference graph and `src/documents.js`                                                             | Normalize anchor impact, reverse inventory and same-batch fragments | One old/proposed node mapping and captured read set; distinct read/write scopes and no silent expansion              |
| `src/cli.js`, `src/execution.js`, workers, `src/quality.js`, result schema/readers                                   | Physical writes, read-only preview, logical return and CI admission | Shared preparation; explicit effect/quality status; retain check-only authority in quality gates                     |
| `src/result-validation.js`, result/migration schemas, `src/migration.js`                                             | CLI inspection, comparison, qualification and consumers             | Version provenance deliberately; migrate current readers together; retain historical bytes                           |
| `src/candidate-staging.js`, `src/qualification-runner.js`, qualification evidence                                    | Candidate-as-data trust boundary                                    | Bind trusted absence and snapshot separately; never delegate authority to candidate config                           |
| `scripts/qualify-public-registry.mjs`, `scripts/qualify-runtime.js`, `scripts/ci-consumer.js`, `scripts/ci-proof.js` | Transported/public installs, acceptance/reuse and release readers   | Add observed minimal-consumer cases to current orchestration; do not replace rich probes or forge booleans           |

DRY-01 decisions apply to semantic knowledge, not merely similar loops.
Current schemas, defaults, path rules and receipt fields have named owners above; latest affected consumers must be enumerated again at implementation time.
Share rules within this package through those owners.
The checker and normalizer must share prose classification and runtime normalization, while expected source/anchor outputs remain independently reviewed test data.
Format and normalize may share guarded replacement and freshness admission but retain different allowed transformations and residual-quality predicates.
Do not extend a formatter-named helper to secretly normalize or an unchanged-check-only predicate to admit all findings.
Do not introduce a shared cross-repository framework merely because JSON Quality has a related resolver or consumer fixture.
Its native/Git/provider deployment boundaries differ.
Reuse the proven design and source-level lessons with attribution if code is adapted; keep independent oracles outside production rule ownership.

### 7.1 Software-selection findings

Planning inspected installed sources and refreshed npm metadata on 2026-11-02.
These observations are selection inputs, not evidence of a new dependency being installed or cleared.

| Capability                         | Inspected/current candidate                                                 | Selection disposition                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing structural rules          | `@eslint/markdown` 8.0.3, MIT; registry latest matches installed            | Reuse supported public rules; no recommended-config drift or private-module imports                                                                 |
| Formatting                         | Prettier 3.9.10, MIT; registry latest matches installed                     | Retain canonical printer and current protected-literal adapter                                                                                      |
| Sparse/effective validation        | Ajv 8.20.0, MIT; registry latest matches installed                          | Reuse closed schema validation/generation; no custom schema language                                                                                |
| GFM parsing                        | `mdast-util-from-markdown` 2.1.0 with existing GFM/front-matter extensions  | Retain existing AST/position authority                                                                                                              |
| Heading slug allocation            | `github-slugger` 2.0.0, ISC; already a transitive upstream dependency       | Preferred direct supported dependency if imported by this package; preserve exact license/notice                                                    |
| Heading text utility               | `mdast-util-to-string` 4.0.0, MIT                                           | Evaluate only if its alt/HTML semantics match the selected heading model; no unnecessary dependency                                                 |
| End-to-end link plugin             | `remark-validate-links` 13.1.0, MIT                                         | Real candidate: checks files/headings, but must demonstrate constrained supplied-target I/O, bounds and proposed-output integration before adoption |
| HTML heading pipeline              | `rehype-slug` 6.0.0, MIT                                                    | Adds IDs to an HTML tree; does not itself solve filesystem/candidate/read-boundary requirements                                                     |
| HTML fragments                     | `hast-util-from-html` 2.0.3, MIT                                            | Preferred candidate for bounded positioned HTML parsing; exact integration/rights gate remains open                                                 |
| Unicode normalization              | Standard `String.prototype.normalize("NFC")` on qualified Node/ICU builds   | Reuse the primitive already used by checking; no custom Unicode tables, native fork or additional normalization library                             |
| Prose source locations and escapes | Existing mdast positions, micromark parsing and protected-literal knowledge | Probe supported token/source mapping and escaping APIs; use a bounded adapter for the residual span edits, not a second Markdown parser             |

The [ESLint fragment-rule documentation](https://github.com/eslint/markdown/blob/main/docs/rules/no-missing-link-fragments.md) and installed rule confirm same-document scope and use of `github-slugger`.
Its public exports do not expose a reusable anchor inventory.
Do not extract private implementation internals or synthesize appended probe links that can disappear inside an unclosed code/HTML block.
The [slugger API](https://github.com/Flet/github-slugger) supplies duplicate allocation from plain heading text; it is not a Markdown parser.

The residual custom work is package policy resolution, bounded target acquisition, source/proposed graph ownership, exact path casing and integration with guarded writes/reporting.
The [remark link plugin](https://github.com/remarkjs/remark-validate-links) must receive a small capability experiment before concluding it cannot own part of that work.
If it offers safe supplied-target operation and the required semantics, prefer it to reimplementing those capabilities.
Otherwise record the concrete unmet boundary and use existing parsing plus a thin package-owned adapter.
The [rehype slug plugin](https://github.com/rehypejs/rehype-slug) and [HTML fragment parser](https://github.com/syntax-tree/hast-util-from-html) inform alternatives without committing to a second rendering pipeline.

The installed ISC text for `github-slugger` and MIT text for ESLint Markdown were read; existing notices must remain intact.
Registry license labels for other candidates are not full rights clearance.
Before adding/directly importing anything new, inspect exact release source, license texts, transitive terms, runtime compatibility and packaged notices/SBOM obligations.
Refresh material versions at implementation time and explain any retained older version; preserve stable supported Node targets until a deliberate compatibility decision changes them.
Do not install or downgrade tools solely to complete planning.

Revision 2 reuses [ECMAScript normalization](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.normalize) and [Node's ICU capability contract](https://nodejs.org/api/intl.html).
Some custom Node builds do not supply functional normalization; qualification must test capability and record ICU/Unicode identity, not accept the existence of a method as proof.
Preserve the current runtime policy and replan if a supported lane cannot meet the chosen semantics.
The [micromark public API](https://github.com/micromark/micromark#api) and the installed parser's supported extension/position contracts are the source-mapping research boundary.
Verify exact exported capabilities before adopting a helper; do not deep-import private tokenizer internals or copy a package's undocumented implementation.
The residual custom gap is safe source-span construction, preservation proof, old/new heading lineage and bounded dependent-reference edits.
Whole-document serializers can rewrite unrelated presentation, so they cannot satisfy the exact-untouched-byte oracle by themselves.
No new normalization dependency or license clearance is claimed in this revision.

## 8. Vertical implementation slices

Each slice crosses admission, behavior, reporting and its focused proof where relevant.
One integration owner keeps coupled contracts buildable; intermediate source commits need not be separately releasable.
No slice authorizes publication on its own.

### SLICE-010: establish precise public contracts through a real consumer operation

This new stable ID executes before 001 and is integrated with the producer of any coupled behavior it names.
Confirm current source, accepted decisions and HISEW readiness without adopting another execution.
When implementation commits are authorized, preserve the accepted plan and audit first, following the JSON Quality precedent.
Freeze the exposed-name inventory and audit dispositions, then demonstrate one installed renamed bounded check and one logical repair using the precise CLI/API/config/profile/result vocabulary.
Demonstrate those operations again with a tiny rejected finite bound, an individual null override and global unlimited mode.
Resolve sparse execution profiles before consuming stdin/configuration, propagate resource policy across every process/worker/evidence boundary, and remove the hidden caps listed in section 4.12.
Bind profile origin/freshness and effective resource identity; keep finite trusted acceptance separate from permission to execute an unlimited request.
Keep independent behavior-preserving mappings separate from new accounting/provenance behavior; R fixtures must retain existing populations, numeric defaults, content and effects.
Use final names from the start in later resolver, graph, HTML and normalization slices.

Rename public exports/bins/options/schema paths, qualification identities and the affected npm/workflow interfaces with their actual current consumers.
Add closed SDK admission so removed optional keys cannot be silently ignored.
Introduce the analysis/write-state representation coherently with validator/observer/CI readers, then extend it for normalization in 009.
Correct maximum-observation and memory labels without changing the maximum-based acceptance rule or claiming stronger memory measurement.
Migrate the profile/comparison/observer/receipt versions and explicit historical readers as one contract family.
Do not land a half-migrated schema/reader pair or implement an unauthorized shim.

Likely owners: package exports/bin/scripts, CLI/quality/execution, profile/schema generators, comparison, candidate/qualification/observer/evidence, reusable workflows and CodeQL admission fixtures.
Proof: `AC-023` through `AC-027`; `QA-024` through `QA-029`; all 25 audit items have dispositions, old-name rejection and independent equivalence/state/metric/resource-override fixtures.
Other producing slices complete the mapped policy/graph/normalization behavior before integrated acceptance.
Recovery: revert the coherent unpublished contract family; retain old artifacts and consumer migration inputs, never relabel historical bytes.

### SLICE-001: establish the accepted baseline and a real no-config check

Use the baseline retained before 010 and recheck material source/readiness changes.
Implement root discovery, optional default-file loading, sparse/effective schemas and immutable package defaults through the existing CLI/API check path.
Keep required schema/result-reader changes in this increment rather than leaving a temporarily invalid main branch.

Demonstrate one real no-config Git consumer and one non-Git consumer, equivalent `{}` input and malformed-present refusal.
Include basic operational boundaries so installing the dependency does not make its own Markdown files inputs.
Likely owners: configuration, preset/defaults, documents, execution/CLI, schema generator, result admission and focused configuration/CLI tests.
Proof: `AC-001` through `AC-004`, `QA-001` through `QA-004`; no content-policy expansion claimed yet.
Recovery: coherent unpublished source revert; no consumer migration.

### SLICE-002: make default policy and trusted absence observable and fresh

Complete provenance fields, deterministic encoding and config observation/rechecks through ordinary, logical and worker execution.
Extend trusted staging to snapshot effective defaults from trusted absence and bind original origin separately.
Migrate live result/profile/comparison/qualification consumers coherently.

Demonstrate a successful absent-config check, a config-created-mid-operation refusal and a candidate trying to disable policy while trusted configuration is absent.
Likely owners: configuration provenance, quality/execution, result validation, migration, candidate staging and qualification receipts.
Proof: `AC-011`, `AC-012`, `AC-014`; `QA-002`, `QA-011`, `QA-015`, `QA-016`, with independent hash/race vectors.
Recovery: restore the complete matching contract family, not only the CLI schema.

### SLICE-003: deliver NFC errors and stronger existing quality rules

Promote selected defaults, rename advisory-only internals, complete declared NFC prose coverage and extend the finite generic-label list.
Enable the existing bare-URL rule without applying its fix blindly.
Retain heading-question, long-line, literal, strict and display semantics.

Demonstrate `check` failing decomposed prose without strict mode, `format` repairing presentation while preserving and reporting ordinary NFC drift, and an explicit override visible in inspection.
Prove that unrelated errors still block formatting and that repair success cannot be admitted as check evidence.
Exercise equivalent results through logical and installed source entry paths as they become available.
Likely owners: preset, renamed quality rules, document worker, rule/format/logical/diagnostic tests and consumer guidance.
Proof: `AC-005`, `AC-006`, `AC-010`, the format/status portion of `AC-021`; `QA-005`, `QA-006`, `QA-021`, original-coordinate and Unicode-version tests.
Recovery: retain the accepted default delta; do not fix a false positive by globally restoring informational NFC.

### SLICE-004: validate one local link end to end across documents

After the reuse/anchor experiment, implement exact path-case checks and a bounded target/anchor owner.
Unify same/cross-document default fragment policy, supporting original and proposed outputs, trusted roots and direct read dependencies.
Integrate with deterministic diagnostics and config/target freshness observations before replacement.

Demonstrate A linking to B with valid/missing/encoded/case-mismatched fragments, an unselected target, duplicate suffixes and concurrent target changes.
Then add two-file formatting whose proposed output changes the target inventory.
Likely owners: analysis, path/document reading, anchor/graph module, quality, workers/memo, replacement and link/resource tests.
Proof: `AC-008` through `AC-014`; `QA-008` through `QA-012`, `QA-015`; Windows/Linux parity and no recursive crawl.
Recovery: no graph checks may be released before their write/freshness consumers are complete.

### SLICE-005: complete static accessibility and HTML checks

Adopt the selected supported HTML parser only after exact rights/capability checks.
Implement finite placeholder-alt, unlabeled-link, HTML-alt and unsafe-pattern policy with positioned, bounded diagnostics.
Use the same parsed HTML facts for explicit anchor collection where valid.
Keep literal output bytes and benign HTML intact.

Demonstrate useful text/image links, badges, decorative HTML, unsafe attributes, malformed fragments and code/comment controls.
Likely owners: quality rules, HTML/anchor helpers, preset, document memo/worker, dependency notices/SBOM and focused fixtures.
Proof: `AC-007`, `AC-009`, `AC-010`, `AC-013`; `QA-007`, `QA-009`, `QA-012`; parser boundary and preservation review.
Recovery: block this adoption if positioned fragment behavior is unreliable; record the counterexample instead of broadening a regex rule.

### SLICE-009: deliver explicit NFC repair, preview and dependent-link updates

This new slice retains its own stable ID and executes after 005, before installed-consumer qualification in 006.
Use the source-mapping experiments to implement one bounded preparation path shared by CLI, API, logical normalization and preview.
Share the checker population/Unicode primitive, produce minimal source edits, and reparse candidates to prove structure and untouched-byte preservation.
Include source-encoded entities, image alt text, heading text, astral offsets and safely representable adjacent prose runs; refuse unsafe mappings with original coordinates.
Keep original EOL/EOF layout, literals, identifiers and unrelated presentation intact.

Extend the existing graph owner with original/proposed heading lineage, complete suffix allocation and the bounded incoming-reference inventory.
Require `--update-links` when generated anchors change; patch only unambiguous supported fragments in the selected write set.
Unselected/excluded inbound references, protected HTML edits, collisions, unreadable required dependencies and resource exhaustion must produce the specified refusal/failure before the first write.
Never add files to selection or claim coverage of external backlinks.

Complete CLI flags, execution admission, result schema and all live consumers in the same coherent increment.
Preview and write share preparation/admission; preview records proposed edits and zero applied writes.
Guard actual replacement with captured preimages, policy and dependency inventory observations; retain truthful partial effects after a later failure.
Prove format and normalize both succeed on their own repairable drift, report the other drift, and reach a passing check in either order.
Other quality/strict-mode blockers retain their authority.

Demonstrate non-heading NFC repair, no-op byte idempotence, preview parity, heading refusal without the flag, selected cross-file repair with the flag, suffix cascades and out-of-scope refusal.
Exercise logical input and explicit empty selection without physical writes, stale preview invalidation, cancellation and late replacement failure.
Likely owners: shared prose classifier, source-edit/normalization module, anchor/reference graph, documents, CLI, quality/execution/workers, replacement, schemas and every current result/CI reader.
Proof: `AC-018` through `AC-022`, affected `AC-005`, `AC-008` through `AC-015`; `QA-017` through `QA-023` and existing protected-byte, graph, resource and provenance scenarios.
Recovery: retain preimages and exact applied-edit lists; never attempt to reverse NFC with NFD, which cannot recover the original spelling.

### SLICE-006: qualify the installed dependency-only CLI

Extend the existing transported/public-registry consumer orchestration with a genuinely minimal fixture.
Keep the richer configured API/runtime/native/performance probe as a separate obligation.
Use only the core dev dependency in the application manifest; no scripts, handwritten policy, wrapper or extra ESLint dependency.
Temporary archive routing for unpublished companions belongs to external fixture machinery and must be disclosed.
After publication, ordinary registry qualification must work without that routing.

Run the following exact public shapes from the actual install root:

```sh
npm exec -- markdown-quality check --root .
npm exec -- markdown-quality format --root .
npm exec -- markdown-quality inspect --root . --json
npm exec -- markdown-quality check --root . -- "docs/literal [1].md"
npm exec -- markdown-quality check --root . --files-json '[]'
npm exec -- markdown-quality normalize --root .
npm exec -- markdown-quality normalize --root . --dry-run --json
npm exec -- markdown-quality normalize --root . --update-links --dry-run --json
npm exec -- markdown-quality normalize --root . --update-links
```

Also check omitted-root invocation from a nested directory, sparse exclusions/frontmatter/severity overrides, NFC errors and cross-document links.
Run normalize with literal file names and `--files-json '[]'`, both repair orders, preview/write parity and selected versus out-of-scope incoming references.
Assert no implicit Unicode rewrite by check/format, no source writes by preview, and actual guarded NFC/fragment writes by the two write commands.
Use distinct fixtures for clean input, formatting drift, NFC drift, combined drift, anchor changes and invalid input so earlier writes cannot hide a missing check.
Assert operation status, residual quality and written/proposed lists rather than treating exit zero as a whole-policy verdict.
Inspect should report selection/policy, not claim content validation.

Verify frozen core/native version, archive integrity, generated-lock entries and installed file hashes before executing the candidate.
Resolve `.bin` to the intended installation, including Windows shims and Linux symlink entry points; verify no accidental dependency on the producer checkout or a global package.
Disable npm acquisition/prompts for the execution phase and assert zero network use by product operations.
For isolated layout, invoke npm from that layout's real installation root; do not imply a bare outer-root command automatically locates a binary in `tooling/markdown`.

Pack fixtures with the reference producer, install/run with the selected consumer toolchain, and classify the new tests correctly in `verification-suites.js`.
At this baseline, `assets/node-support.json` declares Node minimum `22.13.0`, tested majors 22/24/26, reference `26.13.0`, producer npm `12.2.1`, consumer npm `11.21.1`, Ubuntu 24.04 and Windows 2025.
Use the maintained frozen matrix to obtain current exact rows; do not hard-code the JSON Quality run's versions into a second policy.

Likely owners: qualify-public-registry, qualify-runtime, a small consumer CLI probe, CI consumer/proof readers, release evidence readers and package/workflow fixtures.
Extend the SDK fixture separately to import every supported root export, resolve every declared subpath, exercise renamed flags/profile fields and reject removed names; the minimal CLI consumer still needs no SDK imports or extra dependencies.
Include a persisted one-field unlimited profile, the one-flag CLI override, finite/null per-control overrides, logical stdin framing, physical repair and bootstrap cases in both install layouts.
Proof: `AC-001`, `AC-015`, installed portions of `AC-018` through `AC-027`; `QA-001`, `QA-013`, `QA-014`, `QA-017` through `QA-029`, including missing/duplicate/stale/substituted-case rejection.
Recovery: retain first failure and exact source/toolchain identities; do not drop a layout or relax the strict producer parser.

### SLICE-007: migrate the repository and publishable guidance coherently

Update current policy files, schema exports, result validators, examples, README, CLI help, consumer/central-contract/CI-trust/support documentation and changelog.
Lead with install and immediate `npm exec` usage; explain that local dependency installation does not place a bare executable on every ordinary shell's PATH.
The [npm exec documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec/) is the invocation authority.

Preserve meaningful local exceptions when simplifying this repository's policy.
Show explicit old-to-new schema/preset and fragment-rule override mappings.
Explain expanded default scope, read dependencies, NFC errors, explicit normalization and preview, exact path case, static accessibility limits and per-file partial-write recovery.
Document separate check/format/normalize roles, both repair orders, permitted residual findings and check-only quality acceptance.
Include heading/fragment examples with `--update-links`, an out-of-selection refusal and unverified external backlink coverage.
Migrate scripts that equate any repair's exit zero with a clean policy verdict or read the old result `outcome` field.
Do not rewrite historical research, release records or frozen performance expectations to conceal accepted behavior changes.

Likely owners: package/schema exports, current config examples, docs, test fixtures and generated dependency graph.
Include the complete naming migration map, quota populations, schema family transitions and honest maximum-observation terminology from the audit.
Document unlimited mode as consumer opt-in with runtime/provider constraints and measured performance limits; demonstrate saved-profile default behavior without changing the package-wide defaults.
Proof: `AC-012`, `AC-016`, `AC-018` through `AC-027`; runnable sparse/repair examples, current-export/schema checks, exact-scope Markdown validation and migration comparison.
Recovery: restore matching package/config/report consumers together; retain file preimages before any later consumer repair.

### SLICE-008: integrate, independently assure and prepare source delivery

Consolidate and format/lint the coherent implementation before ordinary review.
Run focused/affected checks during iteration, then the required relevant full profile and final installed matrix on the integrated candidate.
Complete independent correctness and native Codex Security assessments of the actual diff; repair findings and review/test affected questions without repeating unrelated successful work.
Preserve existing protected qualification approval and CodeQL admission behavior introduced by Markdown Quality PR #24.

If subsequently authorized to publish source, follow the PR/CI/normal-merge sequence in section 11, including post-merge evidence.
Do not stop at a green local run and describe remote main as delivered.
Package release remains a distinct authorization and qualification stage.

Proof: all ACs, compatible source/schema/default/native/package/evidence identities, no unresolved material findings, truthful delivery state.
Recovery: no force push, rewritten failures, relaxed acceptance or premature release claims.

### 8.1 Traceability and sequencing

| Slice     | REQ / AC              | QA                    | DEC                    | Falsifiable proof                                                                           | Release / cleanup implication                                  |
| --------- | --------------------- | --------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| SLICE-010 | 012, 023-027          | 013-016, 024-029      | 004, 008, 011, 017-020 | Packed operation, rename equivalence, quotas/metrics/effects and complete override proof    | Version current readers together; preserve historical evidence |
| SLICE-001 | 001-004               | 001-004               | 001-004                | Real no-config check and strict invalid-present cases                                       | Source candidate only; own temporary consumers                 |
| SLICE-002 | 011-012, 014          | 002, 011, 015-016     | 002-004, 008, 011      | Config races, provenance vectors, trusted absence                                           | No release with stale contract readers                         |
| SLICE-003 | 005-006, 010, 021     | 005-006, 021          | 005-006, 008, 016      | NFC error, format residual-quality admission and preserved literals                         | Explicit breaking-default migration                            |
| SLICE-004 | 008-014               | 008-012, 015          | 007-008                | Cross-file, case, resource, proposed-output and freshness cases                             | Graph/write path must land together                            |
| SLICE-005 | 007, 009-010, 013     | 007, 009, 012         | 007, 009               | Static HTML/alt controls and unchanged bytes                                                | Rights and parser assurance before adoption                    |
| SLICE-009 | 005, 008-015, 018-022 | 005, 008-023          | 005, 007-008, 013-016  | Exact source edits, anchor mappings, preview parity, both repair orders and guarded effects | No release before all operation/status consumers agree         |
| SLICE-006 | 001, 015, 018-027     | 001, 013-014, 017-029 | 010-011, 013-020       | Real npm CLI/SDK across both layouts and frozen matrix, including overrides                 | Keep archive/evidence identities; remove owned fixtures        |
| SLICE-007 | 012, 016, 018-027     | 004-006, 016-029      | 003-006, 012-020       | Runnable examples, explicit migrations, resource profiles and schema parity                 | Preserve historical evidence and consumer preimages            |
| SLICE-008 | 001-027               | 001-029               | 001-020                | Full relevant proof, independent review, authorized hosted acceptance                       | Separate source merge, release and downstream adoption         |

Numeric ranges refer to the prefixed IDs defined in this document.
Order: gates and accepted plan, then 010, 001, 002, 003, 004, 005, 009, 006, 007, 008.
The section-4.11 mapping adds NAME/AC/QA obligations to every producing slice; 010 is not permission to postpone coupled reader changes or mark later behavior complete.
Necessary docs/schema/readers belong in each producing slice; slice 007 completes the migration rather than repairing deliberately broken earlier increments.
Independent oracle preparation, upstream capability experiments and documentation research can proceed alongside implementation after their inputs are fixed.
Do not assign parallel writers to unresolved shared configuration, graph or result contracts.
This dependency analysis does not itself authorize agent delegation.

## 9. Verification, performance and evidence cadence

Use actual source commands and the current registered HISEW profiles; profile names alone do not establish coverage.
The first implementation proof should be the minimal reproduction and focused resolver/CLI tests, not a full release campaign.
Useful existing tests include `contracts`, `cli`, `quality`, `opinionated-defaults`, `logical-document`, `diagnostic-display`, `literal-protection`, `literal-layout`, `formatting`, `lists`, `resource-limits`, `replacement`, `result-validation`, `candidate`, `qualification`, `packed-qualification`, `ci-proof`, `workflows` and `shared-qualification-admission` under `test/`.
Add focused graph/config/normalization tests when existing suites do not own the boundary.
Include independent source-edit and anchor-lineage oracles, preview versus write effects, residual-quality admission, result-reader migration and check-receipt substitution rejection.

Representative commands, to be adapted to the actual changed test names:

```sh
node --test test/cli.test.js test/opinionated-defaults.test.js test/result-validation.test.js
node --test test/literal-protection.test.js test/literal-layout.test.js test/replacement.test.js
node --test test/candidate.test.js test/qualification.test.js test/packed-qualification.test.js
npm run check:affected
npm run check:architecture
npm run check:ci
npm run check:json
npm run check:full
```

The broad commands are planned implementation obligations, not checks executed while writing this document.
Run exact-scope formatting/Markdown checks for documentation-only changes and avoid new implementation-mirroring tests.
Use existing generated-schema and dependency-graph checks to catch missed current consumers.
Add bounded public-surface coverage and renamed-contract consumer fixtures, including profile/observer/CodeQL readers, rather than using a raw absence-of-text search as proof of semantic correctness.
Preserve current dependency advisory, native artifact, license, packaging and release invariants when their inputs are affected.

Measure no-config versus explicit-equivalent resolution on the same input/host; measure NFC default versus an explicit NFC error override to isolate added work from severity alone.
Use ASCII, composed Unicode, decomposed/long-combining controls, table/image labels and shared-target/high-fanout link corpora.
Measure normalize no-op versus real NFC edits and preview versus actual replacement on identical retained inputs.
Include anchor-changing cases with many incoming references, the broader reverse-inventory cost, both repair orders and a no-write idempotent second run.
Account for source maps, candidate/output bytes and reference inventories within the same finite budgets; record refused or incomplete runs separately from successful timing samples.
Also run the section-4.12 configured/tuned/unlimited comparison, reporting actual effective limits and avoiding a speed claim from comparing a rejected default run with a completed unlimited run.
Observe startup, median/p95 elapsed time, process/worker memory, target-read count and cleanup.
Keep existing OwlAPI/WebVOWL performance corpora and budgets; adjudicate intentional diagnostic deltas independently instead of changing frozen expected bytes.
No universal speedup or percentage budget is invented here.
Unexplained material regression, repeated per-reference parsing or growth beyond admitted limits blocks qualification.

Keep one concise record per coherent implementation increment with exact source and changed inputs.
Reuse valid scoped tests/reviews; broaden after new failures, changed semantics or final integration requirements justify it.
Retain original failed runs and distinguish repaired local proof from final-head hosted proof.
No source snapshots are sent to external reviewers by this plan.

## 10. Migration, observability and production acceptance

Migration has three separate surfaces: input configuration, result/evidence consumers, and authored content.
There is no database backfill.

For configuration, preserve explicit include/exclude/limits/frontmatter/link choices, replace the accepted markers, and remove repeated defaults only after comparing effective configurations.
An old narrow include must not silently expand to `**/*.md` merely because a maintainer removes it for neatness.
Translate any intentional old fragment-rule severity override to the new default fragment rule; explain optional upstream-rule behavior separately.
Show `exclude` replacement semantics and the difference between soft exclusions and hard operational boundaries.

For reports, migrate every live reader before generating schema-4 evidence; update schema exports and package membership together.
Replace the old `outcome` assumptions with operation status, quality status and quality basis; a successful repair or preview is never sufficient check evidence.
Replace old processing arrays with document analysis/write states; apply every API/bin/config/quota/profile/workflow mapping from the audit as an explicit migration.
Keep R thresholds/units unchanged and document the separate graph accounting expansion; retain the current maximum-based qualification gate under its accurate metric name.
Archived release/report records keep their original IDs and hashes.
For content, inspect default NFC, generic labels, duplicate headings and link/case findings, then preview eligible NFC repairs with `normalize --dry-run`.
Owners can authorize the ordinary normalize command for prose repairs and `--update-links` for reviewed heading/fragment changes within their selected scope.
Show the exact selected files, affected anchors, required incoming-link changes, remaining findings and unverified external backlink coverage before migration.
Repair presentation with format in either order and run check afterward; resolve unrelated semantic errors explicitly.
This planning task does not execute downstream source rewrites, filename renames or product normalization.

Interrupted implementation resumes from the last coherent source increment and its actual proof.
Interrupted formatting or normalization reports per-file effects; reconcile recorded preimages/postimages before retrying.
Recompute a write from current inputs rather than executing a saved preview as an authorization token.
Restore exact retained preimages when undoing normalization; applying NFD cannot reconstruct the author's original bytes.
Changing package policy, parser/Unicode identity or target content invalidates affected reusable observations.
Do not introduce persistent graph caches that need an unplanned invalidation/migration protocol.

| Operational question                  | Required signal                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Why was this policy selected?         | Root, origin, default/resolver/effective identities and resolved overrides                                              |
| Why was a document omitted?           | Explicit selection/inventory reason, including operational boundary versus ordinary exclusion                           |
| What did link validation inspect?     | Selected source count, bounded target dependency count and declared fragment coverage                                   |
| Why did a write not happen?           | Blocking rule or operational failure, complete diagnostics and independent document analysis/write states               |
| What would normalization change?      | Bounded proposed source spans/kinds, old/new anchors, dependent references and preview operation/quality status         |
| What actually changed?                | Actual written files and guarded preimage/postimage identities, distinct from proposed edits and logical returned bytes |
| What remains after a repair?          | Quality basis, residual diagnostics and the next check command; no clean inference from operation success               |
| Is NFC enforcement active?            | Effective rule severity and runtime normalization identity in qualification                                             |
| Did the installed public command run? | Exact command/cwd, candidate package/lock/bin identity, observed exit and case results                                  |
| Is delivery complete?                 | Final PR head acceptance, merge identity/tree and post-merge state; registry/adoption recorded separately               |

No telemetry service or background monitor is needed.
Do not include document bodies, arbitrary HTML, credentials or unbounded URL text in routine evidence.
Retain bounded source locations and identities needed to explain failures.

Producer acceptance requires all accepted requirements, independent dispositions, current rights inventory and packed/runtime/platform proof.
Consumer production acceptance additionally requires the consumer owner's scope/migration decision, attributable checks on its actual documents and tested recovery inputs.
A green repository badge or published README is insufficient for that claim.

## 11. Delivery, abort and recovery

### 11.1 Source delivery to remote main

The requested output now is this local plan; the sequence below is for later authorized implementation/delivery.

1. Reinspect local/remote history and concurrent changes. Use the authorized branch/worktree and retain unrelated work.
   Do not reset a diverged branch or infer that a previously observed remote head is still current.
2. Preserve the accepted plan first, then coherent implementation and focused repair commits with appropriate signing.
   Reuse completed scoped proof rather than rerunning it for commit bookkeeping.
3. Before publication, run applicable local checks and reviews; inspect current branch protection, PR template, workflow admission and source/evidence contracts. Fix actual toolchain/fixture issues before the full hosted run where possible.
4. Under source-publication authorization, publish the exact reviewed tip to a PR branch and open the PR.
   Use the repository's deliberate readiness/admission trigger and retain the protected qualification approval boundary.
   The plan does not pre-approve an environment gate.
5. Observe the full final-head acceptance run across producer, native, dependencies/security and consumer matrix obligations.
   If a failure appears, retain it, reproduce its cause, repair narrowly, run affected checks and obtain new hosted acceptance for the changed head.
6. After all required checks pass and merge is authorized, use a normal merge preserving source commits.
   Verify expected parents and equality to the tested integrated tree; a changed base requires the applicable new acceptance.
7. Observe post-merge main qualification/reuse, then synchronize local main by a non-destructive supported operation. Report exact source/merge/run identities and any remaining issue.
   Do not claim completion merely because the merge API returned success.

Do not weaken npm pack parsing, drop a consumer lane, bypass protected qualification or accept partial evidence to make CI green.
JSON Quality's repair is a regression to cover from the start: packing belongs to the producer, while installation and execution belong to each consumer lane.
Markdown Quality's latest qualification-approval fixes are the current authority and must remain intact.

### 11.2 Package release and downstream rollout

Under separate release authorization, choose an unused new major version for stricter defaults and changed public contracts, freeze the matching core/native package tuple and use existing release staging, provenance, registry and promotion machinery.
Repeat the dependency-only public-registry consumer without private archive routing.
Do not mutate already published `1.0.3` or claim a larger runtime support matrix for it based on newer source CI.
Migrate one authorized consumer with retained preimages and an accountable observer before any broader adoption.

Abort or stop promotion for unintended Unicode/literal/structure changes, stale policy/target success, missing selected files, graph resource escape, unsupported anchor behavior, out-of-scope fragment edits, preview writes, repair receipts accepted as check evidence, unsafe writes, incorrect provenance, unverified installed bytes, incomplete matrix evidence or unresolved material security/rights findings.
Report the specific boundary and cheapest evidence needed to proceed; do not silently reduce the accepted scope.

Before publication, revert or repair the coherent source/config/schema family.
After publication, preserve the bad artifact and evidence and use an authorized forward fix/deprecation/recovery route; do not promise registry erasure.
Consumer restoration requires exact preimages and matching prior package/configuration, plus consumer-owned checks.
Package rollback alone cannot undo heading edits, formatter writes, normalized prose or dependent-fragment changes.

The implementation owner handles source recovery, the delivery observer handles hosted/release state, and document owners authorize source restoration.
Remove only task-owned temporary consumers, staging roots and npm caches once no longer needed, preserving required native evidence and historical fixtures.
Verify absolute cleanup targets before recursive removal; do not delete other actors' work or unresolved HISEW storage.
Keep generated dependency/environment directories outside `G:/My Drive`.

## 12. Gates, experiments and replanning

This draft supplies proposed requirements, risk, decisions and oracles because no accepted new dossier existed at intake.
It does not claim those proposals have been approved merely by being documented.
The owner has already accepted default NFC errors and the revision-2 normalize/preview/update-links/composable-repair direction; do not request those decisions again.
The remaining baseline gate concerns detailed contracts, implementation readiness and later effect-specific authority.

| Gate                                                  | Owner and minimum evidence                                                                                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-001: accepted baseline                           | Decision owner accepts the detailed R2 scope, schema/preset transitions, naming dispositions, resource populations and static/fragment/status contracts; retain already accepted NFC error and revision-2 command direction   |
| GATE-002: HISEW readiness                             | Management and actual assurance owners resolve intended loaded/selected alignment and generation through supported coordination; keep current selection meanwhile                                                             |
| GATE-003: anchors, HTML and source mapping            | Integration owner and independent verifier settle the supported anchor/HTML model, source-preservation oracle, heading lineage and incoming-reference coverage using maintained component probes and reviewed counterexamples |
| GATE-004: resource, rights and consumer compatibility | Confirm target/reverse-inventory/source-map accounting, Unicode/runtime capability, exact new-component terms, repair-status semantics and live schema/evidence consumers before adopting the relevant change                 |
| GATE-005: delivery authority                          | Confirm source publication/merge and, separately, package release or downstream adoption only when those effects are requested                                                                                                |

| Experiment | Cheapest discriminating evidence                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXP-001    | Run the existing packed public CLI in a small no-config fixture, then with minimal incumbent config; identify the first actual bootstrap failure                                                                      |
| EXP-002    | Probe absent/empty/sparse/invalid configuration, nested root choices and deterministic config appearance during checking/writing                                                                                      |
| EXP-003    | Compare existing upstream anchors, `remark-validate-links` supplied-input capabilities and a slugger-based adapter on suffixes, HTML IDs, comments, front matter, encodings and unclosed blocks                       |
| EXP-004    | Probe positioned HTML fragments and accessible labels across inline/block boundaries; retain a counterexample if reconstruction is ambiguous                                                                          |
| EXP-005    | Run composed/decomposed/split-run NFC vectors on every selected runtime; record ICU/Unicode identity and decide any real semantic discrepancy                                                                         |
| EXP-006    | Measure repeated-target/high-fanout graph work and original/proposed target races with one and several workers under finite limits                                                                                    |
| EXP-007    | Install the frozen tuple into minimal root/isolated layouts, prove lock/bin/bytes identity, and run exact CLI commands with producer/consumer Node/npm split                                                          |
| EXP-008    | Demonstrate minimal NFC source edits for entities, alt text, astral offsets, escape-sensitive characters and safe inline runs; preserve all unrelated bytes and refuse an incompatible styling boundary               |
| EXP-009    | Map old/new heading nodes and suffix cascades, then probe selected/excluded/protected incoming links, encoded fragments, explicit IDs and inventory membership changes before any writes                              |
| EXP-010    | Run both repair orders and compare preview/write candidates, residual statuses and no-op results; mutate preimages/config/inventory, exhaust budgets and prove check-only CI admission                                |
| EXP-011    | Inventory actual installed exports/bins/options/schema fields; compare translated R fixtures and probe removed SDK/CLI keys, maximum-versus-P95 vectors, quota boundaries and forged analysis/write records           |
| EXP-012    | Trace each resource rejection/eviction/timeout to the resolved profile; probe tiny ceilings then null/global override across bootstrap/child boundaries, and benchmark configured/tuned/unlimited on identical inputs |

These experiments are future implementation evidence, except the source/dependency/history inspections explicitly recorded in this plan.
No performance benchmark, new product implementation, full test campaign, hosted Markdown Quality qualification, publication or downstream migration was performed by writing it.

Replan when source/contracts materially advance; a real consumer needs a legacy shim; a purported rename changes an unlisted population, threshold, hash preimage or effect; default scope hides or unexpectedly owns authored data; an accepted anchor model or source mapping cannot be reproduced safely; required incoming references cannot be classified within bounds; parser rights/integration fails; supported Unicode runtimes disagree materially; resource limits cannot bound the graph; candidate policy gains authority; or recovery cannot preserve truthful partial effects.
Reassess the higher outcome if zero-config still requires a generated policy/wrapper, stricter checks mainly produce false positives, or repository-scale latency exceeds useful developer feedback time.
Changing a settled owner requirement, dropping installed evidence or weakening write safety is not an implementation shortcut.

## 13. Completion criteria

The implementation is complete when all accepted ACs have source-bound evidence, current contracts/docs/packages agree, independent review findings are resolved and the installed matrix passes.
Remote-main delivery additionally requires the authorized final-head PR acceptance, normal merge and observed post-merge checks.
Package release and consumer adoption each require their own actual evidence and authority.

This planning deliverable is complete when this dossier is saved under `docs/plans`, its links and internal traceability are checked, and the repository's existing Markdown checker accepts it.
Its validation is document evidence only.
Revision 4 must retain normalization, preview, dependent-fragment updates and separate repair/quality outcomes, and incorporate all 25 naming dispositions plus complete consumer resource overrides across requirements, slices, tests, migration and evidence consumers.

Authoritative language references include the [GFM specification](https://github.github.com/gfm/) for syntax and the [Unicode normalization specification](https://www.unicode.org/reports/tr15/) for NFC.
Heading IDs and HTML post-processing are additional renderer/package contracts, not rules supplied by the GFM grammar alone.
