# Shared Markdown Quality Package: Implementation Plan

Date: 2026-10-05, Europe/Bucharest.
Revision: draft 4.
Initial plan: 2026-10-03.
Planning owner and proposed acceptance owner: Maksym Shostak.
Task references: initial planning in Codex chat `01a1014e-c54e-7c63-8c24-6313be12493a`; review synthesis in chat `01a1090f-4eb0-7210-b541-c9b62f3984dc`.

## 1. Status, authority, and purpose

This is a reviewable draft requirement dossier, design, and implementation plan.
The companion [software-selection record](software-selection.md) holds the comparative research and dated source evidence.
Draft 4 incorporates the substantive recommendations in the [validation and revision review](../reviews/implementation-plan-validation-and-revision.md).
It preserves existing IDs while revising release scope, CI delivery, assurance, compatibility, and maintenance contracts.
The user's instruction selects agentic coding apps for implementation, so the review's labour estimates, cost envelope, staffing/RACI, role assignments, meeting cadence, and personnel-derived calendar are excluded.
Implementation is sequenced by dependencies and demonstrated exit conditions; agent execution does not imply acceptance, rights clearance, or publication authority.
The user has authorized planning; neither this document nor the previous architectural discussion constitutes acceptance of an exact R2 implementation baseline.
The user's subsequent instruction selects a dedicated repository, private npm distribution, and AGPL-3.0-only licensing subject to dependency and donor review.
Those targeting decisions are accepted and reused below; the exact names, repository visibility, rights clearance, and implementation baseline are not thereby accepted.
Package implementation, source-repository creation, configuration changes in consumers, installation, scans, registry publication, commits, pushes, merges, and fleet upgrades require their applicable authorization.
No such effects were performed to produce this plan.

The purpose is to give repository maintainers one maintained implementation of Markdown layout, sentence formatting, structural linting, and local-link checking.
Repositories retain control of authored document locations, preserved evidence, generated content, and justified exceptions.
Success means a maintainer can install a pinned release, declare those differences, and run the same capability locally and in CI without maintaining copies of formatter wrappers or installers.

The proposed implementation changes public CLI/configuration/report contracts and verification across multiple repositories.
Its route is R2, subject to owner acceptance.
The higher-level guardrails are preservation of Markdown meaning, preservation of unrelated working-tree content, reproducibility, explicit upgrade adoption, and removal of duplicated maintenance.
Fewer files or faster CI alone do not establish success.

### Revision disposition and release outcome

| Review recommendation             | Disposition in draft 4                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smaller first release             | v1.0 delivers full-scope CI checking, safe formatting, stable reports, private supported-platform installation, and two accepted pilots. REQ-009, QA-006, and SLICE-005 retain their identities as conditional v1.1 work. |
| Canonical CLI and optional Action | Consumer-owned workflows invoke the locked CLI directly. A thin Action is an optional convenience after its access and parity are qualified; it is not required for v1.0.                                                 |
| Earlier CI trust decision         | GATE-11 has an architecture checkpoint in SLICE-001 and an observed qualification checkpoint before pilot cutover. Consumer visibility and event access are explicit inputs.                                              |
| Stronger release assurance        | Add a complete component inventory/SBOM, source/build/native-repack provenance, reviewed full-SHA Action pins, qualified OIDC publishing, and a frozen evidence manifest.                                                 |
| Compatibility and operation       | Version preset behavior explicitly; define support, vulnerability handling, upgrade, release, and recovery procedures with measurable evidence.                                                                           |
| Delivery management               | Use milestone exits, gate summaries, evidence pointers, and risk dispositions in the existing handoff. Staffing, financial estimates, and calendar commitments are omitted.                                               |

v1.0 is complete when the same frozen core/platform release is reproducibly installed on Windows x64 and Ubuntu 24.04 x64, preserves the accepted corpus and read-only guarantees, passes its required assurance, and replaces duplicate tooling in OwlAPI and WebVOWL without weakening their CI controls.
Two approved, materially different substitute consumers are possible only through an explicit DEC-012 revision.
The remaining three migrations are post-v1.0 work; changed/referrer-aware checking is a conditional v1.1 capability justified by measured full-check constraints.
An agent finishing all internal coding tasks does not establish this consumer outcome.

### HISEW applicability and planning boundary

On 2026-10-05, the installed launcher reported HISEW `0.1.0.dev17`, active personal applicability for this worktree, and no active execution under the current chat's installation/session identity.
This revision uses the Thin Implementation Plan procedure and reuses the proposed R2 route and draft dossier below.
The existing focused/affected/full profiles have undeclared input semantics; no current inspection establishes coverage of the proposed Markdown package or this plan.
They are not used as Markdown-package verification.
Supplemental revision evidence belongs under the configured external evidence root `C:\Users\maksy\.hi\w\e`, in an isolated task directory; this requested plan remains repository-owned documentation.
No workflow state, registration, profile, or requirement snapshot was changed.

The planning procedure's requirements, route, quality scenarios, and decisions are represented below as a draft baseline.
Its accepted-baseline and research/rights prerequisites remain explicit gates where evidence is incomplete.
Implementation begins only after the owner accepts the relevant revision and the target repository has applicable, correctly scoped controls.

## 2. Proposed risk route

### Risk class:

R2, inferred from a new externally consumed CLI/configuration contract, native executable distribution, document-writing behavior, and coordinated changes to repository verification.
No safety-critical, regulated, financial, or critical-infrastructure use was identified; an R3 route is not currently justified.

### Decision owner:

Maksym Shostak for the proposed scope and acceptance baseline.
The executing coding app coordinates implementation, integration, and evidence within the granted scope.
Handoffs identify the actual execution session and any separately authorized independent review context; they do not require a staffed delivery team or RACI.
Maksym retains acceptance and delivery decisions, with any necessary rights decision made by a person or authority entitled to make it.
Independent verification remains distinct from the implementing app's self-checks.

### Reasoning:

Observed source code invokes native tools and writes authored Markdown.
The proposed bundle additionally distributes executables and supplies shared CI behavior.
A selection or parser defect can affect several repositories, silently omit checks, or change literals.
Those are concrete filesystem, input/parsing, dependency, and cross-repository assurance concerns.

### Potential blast radius:

Initially the package and two isolated pilot consumers; subsequently the five substantial existing Markdown-tooling repositories.
Pinned consumer releases and individual migration PRs bound propagation.
Repositories do not execute a floating latest release.

### Reversibility:

A consumer dependency/configuration migration can be reversed using its recorded prior manifest, lock, workflow, and source revisions.
Formatting changes require retained preimages or an appropriate clean Git baseline to recover exact original bytes.
Reinstalling an older package does not undo document edits.
Registry versions are immutable release identities; a bad release is superseded or deprecated through an authorized forward fix.

### Principal unknowns:

Exact package/repository name and ownership, dependency/donor clearance for the selected AGPL-3.0-only license, private-registry entitlements and CI access, standalone-binary parity with the existing wheel-installed tool, Windows DLL/runtime requirements, native archive extraction tooling, dependency graph identity, and legacy scope/output deltas.
The cheapest evidence and required decisions are listed in section 12.

### Required artifacts:

Accepted revision of this baseline; source/dependency/rights inventory; canonical qualification fixtures; versioned consumer configuration/report schemas and preset; frozen package archives; SBOM and source/build/native-repack provenance; release-evidence manifest; per-consumer migration manifests and output/diagnostic comparisons; review dispositions; verification evidence; support and recovery runbook.
Keep evidence in existing task/PR records where practical rather than creating redundant dossiers.

### Required specialist lenses:

Markdown/GFM and literal-preservation correctness; platform/package installation; filesystem and subprocess containment; dependency/native-asset security; source licensing and redistribution.
Independent verification and the selected ordinary reviewer apply to the final frozen implementation.
HISEW SEC-01 triggers scoped native security assessment for the installer/extraction, document-writing, parsing, and Action paths once implementation and that assessment are authorized.
This planning task runs no scan and dispatches no agents.

### Required verification:

Focused public-interface fixtures during implementation; affected packaged-consumer and repository migration checks at integration; full relevant platform, package, security/review, and consumer evidence on the frozen release candidate.
The new package's actual HISEW profiles must declare the correct commands and coverage before governed implementation verification.

### Required human approvals:

Accept the exact R2 baseline, clear consequential source/asset rights, select repository/registry ownership, authorize exact consumer configuration scope, and authorize publication or other delivery effects when requested.
Baseline acceptance is not registry authorization.
No NSH-01 override is recorded; legacy shims are not planned.

### Maximum sensible autonomy:

Now: inspect sources, research maintained tools, and write/validate this draft.
After implementation authorization and gate closure: implement accepted slices and run allowed checks within the selected checkout.
No silent platform fallback, lowered lint baseline, automatic fleet rollout, global configuration mutation, or undeclared runtime acquisition.

### Next lifecycle step:

Review and accept the revised v1.0 requirements and decisions.
Resolve GATE-01 through GATE-04 and GATE-11's architecture checkpoint before extracting restricted source or building the dependent product capability.
Authorized disposable qualification can supply missing evidence without implying package implementation or release acceptance.
Capture the exact accepted requirement bytes and start the actual R2 execution in the selected package checkout using native HISEW operations.

## 3. Scope and proposed requirements

### Included

- One dedicated source repository for the implementation, tested versioned policy preset, native-tool asset manifest, schemas, qualification fixtures, and direct-CLI CI guidance; an optional thin GitHub Action may follow qualified demand.
- A private pinned npm CLI/library package and private matching platform asset packages for initial Windows x64 and Ubuntu 24.04 x64 consumers.
- AGPL-3.0-only licensing for the package-owned implementation, conditional on dependency and donor review; third-party assets retain their own approved license notices.
- CommonMark/GFM authored Markdown, semantic sentence lines, structural linting, local file/link/image targets, and native same-document heading-fragment linting.
- Repository-specific source/exclusion policy, selected lint overrides, full/explicit input selection, and stable text/JSON results; v1.0 CI always checks the full authored scope.
- Root devDependency installation and an isolated `tooling/markdown` npm project for documentation-only CI or non-Node repositories.
- Pilot adoption in OwlAPI and WebVOWL as the v1.0 completion boundary; conditional migrations in Universal Ontology, Software Engineering Workflow, and Steam Community BBCode follow stable v1.0.
- Release provenance, explicit compatibility/support policy, and a rehearsed recovery procedure.

### Excluded from the initial release

Changed-document optimization, Git comparison input, unchanged-referrer dependency analysis, remote URL availability checking, cross-document heading-fragment validation, HTML-render equivalence as a universal guarantee, code-block formatting/linting, MDX, prose rewriting by models, daemon/watch/editor extensions, MCP services, Git clean/smudge hooks, and general repository CI orchestration.
Explicit local file selection remains useful but makes no claim of complete repository assurance; it cannot replace a full required CI check in v1.0.
macOS, Windows ARM64, Linux ARM64, Alpine/musl, and additional Node majors require their own qualification before support is advertised.
Google extensions and agent-skills are later adoption candidates; adding sentence formatting or new scope there is a separate consumer requirement decision.

### Requirement and acceptance table

All IDs below are proposed and become governing only with acceptance of this document's exact revision.

| Requirement | Observable contract                                                                           | Acceptance criterion and oracle                                                                                                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001     | One versioned implementation supplies formatting, linting, links, and selection.              | AC-001: Two independent packed consumers invoke the same archive and policy identity; neither has a copied formatter, parser, or installer.                                                                                                                                                                                |
| REQ-002     | Consumers own explicit authored-document scope and preserved-content exclusions.              | AC-002: Accepted selection manifests match expected root, nested, package, ignored, untracked, Unicode, bracket, whitespace, and negated-ignore cases.                                                                                                                                                                     |
| REQ-003     | The formatter composes layout and sentence formatting while retaining meaningful literals.    | AC-003: Owner-reviewed expected bytes preserve code, hard breaks, tables, URLs, HTML examples, emphasis, task lists, and Unicode; a second pass produces identical bytes.                                                                                                                                                  |
| REQ-004     | Check operations are read-only and deterministic.                                             | AC-004: Checkout sentinels and selected/unselected files remain byte-identical; no environment installation, stdin wait on empty selections, cache/report write, or network request occurs.                                                                                                                                |
| REQ-005     | Formatting does not hide unresolved defects or overwrite concurrent changes.                  | AC-005: Proposed output is validated before replacement; unresolved defects prevent any batch write; a changed preimage aborts its replacement with a truthful partial outcome.                                                                                                                                            |
| REQ-006     | GFM structure uses the supported ESLint Markdown implementation.                              | AC-006: Known invalid headings, labels, table rows, and same-document fragments fail; allowed GitHub alerts and literal code examples pass under owner-reviewed fixtures.                                                                                                                                                  |
| REQ-007     | Local Markdown links/images/definitions resolve using a maintained parser.                    | AC-007: Existing contained targets pass; missing or escaping targets fail; external schemes are classified but not fetched; fragments are not misreported as filename text.                                                                                                                                                |
| REQ-008     | Native-tool identity and execution are release-controlled.                                    | AC-008: A packed install resolves the matching asset without PATH fallback, Python, postinstall download, or executable writes at runtime; wrong/missing/corrupt/unsupported tools fail clearly.                                                                                                                           |
| REQ-009     | Conditional v1.1 changed-document checks retain the relevant whole-repository assurance.      | AC-009: After benchmark justification, policy/tool changes require full content checking; renamed/deleted targets cause unchanged authored referrers to be checked; comparison failures cannot yield a selective clean result.                                                                                             |
| REQ-010     | Configuration and results are versioned consumer contracts.                                   | AC-010: Maintained schema validation rejects unknown fields/versions; text/JSON represent the same outcome; operational errors cannot be mistaken for clean content.                                                                                                                                                       |
| REQ-011     | Local and CI execution use the same release and configuration.                                | AC-011: Direct CLI workflows and local full checks select identical files and emit equivalent diagnostics; existing job names and dependency/security floors remain intact. Any optional Action must prove the same parity.                                                                                                |
| REQ-012     | Extraction, installation, upgrade, and recovery remain attributable.                          | AC-012: Exact source origins, licenses, native digests, installed dependency graph, candidate hashes, accepted deltas, prior consumer identities, and rollback instructions are retained.                                                                                                                                  |
| REQ-013     | Adoption removes duplicate ownership without weakening existing product checks.               | AC-013: Each migrated consumer's actual full relevant verification passes; product documentation/example/generator checks remain with their owner; unused tools are removed only after consumer search and approval.                                                                                                       |
| REQ-014     | Core/native npm packages use restricted access with explicit authorized-consumer credentials. | AC-014: Authorized clean consumers install every required private package; unauthorized download fails; secrets are absent from runtime and retained outputs; fork/event tests prove that privileged paths execute no PR-controlled scripts, JS config, replacement CLI, workflow, or dependency graph.                    |
| REQ-015     | Every release has verifiable source, build, component, and native-repack provenance.          | AC-015: A frozen manifest binds reviewed clean source, locks, SBOM/component coverage, native origins and hashes, build/workflow identity, schemas/preset/corpus, archive digests, rights, and assurance results; released artifacts match registry readback. Attestation capability and verification status are explicit. |
| REQ-016     | Public behavior and maintenance obligations are explicit versioned contracts.                 | AC-016: Paired corpus/consumer results justify package and preset version increments; approved support/deprecation and vulnerability procedures, release runbook, and timed pilot restoration are demonstrated before stable promotion.                                                                                    |

### Acceptance release and evidence index

Existing REQ/AC-001 through REQ/AC-014 remain stable identifiers; REQ/AC-015 and REQ/AC-016 add the review's release and maintenance obligations.
The executing app attaches actual artifact paths/digests and pass/fail/blocked statuses to this index in the release manifest; the pointers below name required evidence, not completed results.
Maksym accepts scope, expected semantics, and pilot deltas; independent review assesses the frozen implementation and evidence without generating expected values from that implementation.

| Acceptance | Release target                                    | Evidence-producing slices and required record                                                                                       |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AC-001     | v1.0                                              | SLICE-002, 006, 007, 008: identical core/platform archive identities and two pilot manifests.                                       |
| AC-002     | v1.0; comparison extension v1.1                   | SLICE-003, 004: reviewed scope/ignore fixtures; SLICE-005 adds comparison selection.                                                |
| AC-003     | v1.0                                              | SLICE-002, 003, 007, 008: golden corpus, exact preservation, idempotence, accepted consumer deltas.                                 |
| AC-004     | v1.0                                              | SLICE-002, 003, 006: file/environment sentinels and offline runtime observation.                                                    |
| AC-005     | v1.0                                              | SLICE-003: batch validation, concurrent preimage and interruption evidence.                                                         |
| AC-006     | v1.0                                              | SLICE-004: supported ESLint validation and positive/negative GFM fixtures.                                                          |
| AC-007     | v1.0                                              | SLICE-004: independently specified local target trees and diagnostics.                                                              |
| AC-008     | v1.0                                              | SLICE-001, 002, 010: native parity/identity and clean packed-platform matrix.                                                       |
| AC-009     | Conditional v1.1                                  | SLICE-005: performance decision and complete Git/referrer implication corpus; explicitly deferred at v1.0.                          |
| AC-010     | v1.0                                              | SLICE-002, 004, 006: schema, exit, text/JSON and CI contract results.                                                               |
| AC-011     | v1.0                                              | SLICE-006, 007, 008: direct-CLI parity and actual hosted required-check readback.                                                   |
| AC-012     | v1.0; repeat per later migration                  | SLICE-001, 007, 008, 010: provenance, prior identities, accepted deltas, and recovery record.                                       |
| AC-013     | Two pilots in v1.0; remaining consumers afterward | SLICE-007, 008, 009: full relevant consumer checks and duplicate-consumer retirement search.                                        |
| AC-014     | v1.0                                              | SLICE-001, 006, 010: visibility/event matrix, credential isolation, access denial and registry readback.                            |
| AC-015     | v1.0                                              | SLICE-010, with inputs from 001, 002, 006: frozen release manifest, SBOM, native inventory, provenance and attestation disposition. |
| AC-016     | v1.0 and every upgrade                            | SLICE-007, 008, 010: contract delta/version decision, support runbook, incident exercise and timed restoration.                     |

### Domain invariants

1. Selection precedes document reads and is common to formatting, prose checks, and structural linting.
   Conditional v1.1 local-link impact analysis may read additional in-scope documents to find affected referrers; those reads must be declared in the result.
2. An explicit empty selection never means all documents and never invokes an empty-argv native stdin mode.
3. Paths cannot escape the declared root through lexical traversal, parent symlinks, or Windows junction/reparse-point traversal.
   Hard-linked files are not writable format candidates unless safe ownership has been established; native filesystem capability must be researched before promising enforcement.
4. A zero native exit or unchanged rendered output does not override actual prose diagnostics.
5. An exception for a reproduced structural false positive must recheck real item prose and continuation lines.
   Broad list suppression is not an acceptable correctness substitute.
6. `check` does not mutate the checkout, tooling environment, policy, dependency locks, or Git state.
7. Package roots, consumer roots, native-asset roots, and any explicit report-output root are distinct.
8. Inputs are UTF-8; malformed input is an operational/input error, not silently replaced text.
9. Dependency pins and native assets are coherent release identities, not independently drifting tools.
10. Authored requirements and test expected values are not computed by the implementation being tested.

## 4. Software selection and source evidence

The [software-selection record](software-selection.md) owns comparative research, dated donor observations, selected releases and primary authorities, supported native interfaces, asset identities, rights gaps, and the residual custom boundary.
The core proposal is Prettier for layout, Snapper for sentence lines, ESLint Markdown for GFM structure, maintained mdast/GFM parsing for local links, and Ajv for package-owned JSON schemas.
The proposed initial runtime remains Node 24 LTS; Windows/Linux standalone asset distribution remains conditional on parity, runtime, extraction, and rights qualification.

The original donor inspection and exploratory test observations remain dated 2026-10-03.
Selected core registry/release metadata was refreshed on 2026-10-04 and remained unchanged; see the research record for exact scope and identities.
No historical test run or metadata refresh establishes current-source acceptance, selected-version integration, standalone-binary parity, or rights clearance.

DEC-003, DEC-006, DEC-009, and DEC-014 depend on that research and the experiment outcomes in SLICE-001.
GATE-03 and GATE-04 retain the outstanding exact donor/dependency/asset rights and native qualification work.
Refresh the record before adoption under REU-01/VER-01/LIC-01; keep this plan's REQ/AC/QA/DEC and slice baseline synchronized with any materially changed selection.
The companion record remains dated software-selection evidence; this draft governs the revised release scope, conditional changed mode, and optional Action.
The new registry/CI/provenance recommendations were checked against the primary authorities linked in sections 5 and 9 on 2026-10-05.
That targeted documentation check does not refresh every selected dependency version or close an integration/rights gate.

## 5. Proposed consequential decisions

DEC-001's dedicated-repository direction, DEC-002's private-npm direction, and DEC-014's conditional AGPL-3.0-only direction are selected by the user's subsequent instruction.
Exact names and the remaining DEC choices remain proposed; no complete baseline acceptance is claimed.

| Decision | Proposed choice and reason                                                                                                                                                                        | Trigger for reconsideration                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001  | Owner-selected dedicated source repository, provisionally `Hadden-Industries/markdown-quality`; exact name and repository visibility remain undecided. `personal` holds this draft only.          | Name/access/ownership cannot be established or the owner explicitly revises the dedicated-repository decision.                                                                         |
| DEC-002  | Owner-selected private scoped npm package, provisionally `@hadden-industries/markdown-quality`, exposing one CLI and a small documented library interface.                                        | Registry name/ownership/private entitlement or a non-Node consumer constraint invalidates the selected delivery model.                                                                 |
| DEC-003  | Package-reviewed standalone Snapper release binaries in matching OS/CPU asset packages; no Python requirement for initial consumers.                                                              | Binary parity, platform dependencies, asset rights, packaging size, or supported extraction cannot be qualified. Then rebaseline the wheel approach; do not add an automatic fallback. |
| DEC-004  | Core and two platform packages have one coordinated release identity; runtime verifies expected executable identity and invokes its absolute path.                                                | Platform packages cannot be installed coherently under native npm optional-dependency semantics.                                                                                       |
| DEC-005  | One JSON configuration and package-owned preset; no automatic execution of consumer JS Prettier/ESLint configs or plugins.                                                                        | A demonstrated consumer requirement needs a separately accepted, bounded trusted extension contract.                                                                                   |
| DEC-006  | Use Prettier, Snapper, ESLint Markdown, maintained AST parsing, and maintained schema validation through their supported interfaces.                                                              | A reproduced requirement gap is better served by an assessed native alternative.                                                                                                       |
| DEC-007  | Separate operation contracts: `check` never writes; `format` writes only validated selected output; `inspect` reports configuration/selection/tool identity without installation.                 | Usability evidence identifies a missing legitimate operation; no alias is added merely to preserve an illustrative previous command.                                                   |
| DEC-008  | Text and versioned JSON results; no mandatory report file or telemetry.                                                                                                                           | Accepted downstream integration requires another native report format.                                                                                                                 |
| DEC-009  | Consumer lockfiles govern their installed JS graph; release inventory records qualified native and JS identities. Root and isolated-tooling install layouts are both tested.                      | Packaging needs an additional native npm graph-lock mechanism; assess shrinkwrap explicitly rather than assuming the source lock propagates.                                           |
| DEC-010  | v1.0 required CI checks use the full authored scope. Conditional v1.1 changed mode requires measured need, valid comparison, and complete impact accounting.                                      | Accepted full-check runtime/resource limits cannot be met after simpler supported improvements; rebaseline before implementing optimization.                                           |
| DEC-011  | Direct invocation of the locked CLI in consumer-owned workflows is canonical. A thin composite Action is optional and cannot become a second policy implementation.                               | A demonstrated consumer need and compatible repository access justify the wrapper; whole-job delegation needs a separate accepted decision.                                            |
| DEC-012  | Pilot OwlAPI, then WebVOWL, then the other three mature consumers; no automatic fleet adoption.                                                                                                   | A pilot is blocked by unrelated work or fails to represent the intended supported interface.                                                                                           |
| DEC-013  | Private core and native packages use restricted publication; acquisition credentials are scoped to read-only consumption and isolated from runtime checking. Publishing credentials are separate. | A consumer's fork/event trust or registry access cannot satisfy the required credential and distribution constraints.                                                                  |
| DEC-014  | Owner-selected AGPL-3.0-only for package-owned implementation, subject to exact donor/dependency/asset review and retained notices/source-delivery decisions.                                     | Rights review finds an unresolved incompatibility or additional obligation; escalate before copying or release.                                                                        |
| DEC-015  | Freeze source/build/repack provenance and a complete component inventory/SBOM for each release; prefer qualified npm OIDC publication and verify attestations where available.                    | Selected hosting/registry entitlement cannot provide the intended proof; record the limitation and an accepted alternative before release.                                             |
| DEC-016  | Treat CLI, documented library API, configuration/result schemas, exit meanings, formatting, and preset/default diagnostics as the public compatibility contract.                                  | Observed output or diagnostic deltas invalidate the planned version increment or support promise.                                                                                      |

### Delivery and platform artifacts

The initial logical release contains a private core package and private Windows x64 / Linux x64 asset packages.
Exact names remain subject to ownership and registry acceptance.
The planned publishable manifests declare AGPL-3.0-only for package-owned implementation and `publishConfig.access: restricted` for all released npm packages; retained native assets keep their original notices.
Do not use npm's `private: true` as the visibility mechanism for a package that must be published; it is a publish-prevention setting.
Private registry ownership/entitlements, authorized users/teams, and all platform-package access must be qualified before a consumer depends on the release.
Use npm's supported OS/CPU/optional-dependency metadata, with explicit failure if the required platform asset is absent.
`npm ci --ignore-scripts` must work; no executable acquisition in package lifecycle scripts is planned.
Installation may contact the registry; runtime checks and formatting do not.

### Private acquisition and CI trust

Local installation uses the operator's authorized npm identity through native npm authentication.
CI acquisition uses read-only granular package credentials, with explicit expiry/rotation recorded in the acquisition procedure and a separate publication path.
Prefer npm Trusted Publishing/OIDC from a reviewed supported release workflow; qualify the actual repository, runner, package, environment, and allowed publication operation before relying on it.
Record a supported bootstrap or alternative publication method where OIDC cannot yet be used; it requires its own authorization and must preserve restricted access.
OIDC publication does not authenticate private dependency installation.
See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and [private-package CI authentication](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/).
Registry secrets stay in ephemeral acquisition configuration, never in committed `.npmrc`, locks, package archives, caches/artifacts intended for sharing, or document diagnostics.
Remove acquisition credential material from the checking process environment and filesystem before invoking any content-processing runtime.
Qualify secret redaction and failed-install behavior, including registry errors and package-manager debug logs.

Credentialed acquisition installs an owner-reviewed trusted tool graph; it must not execute a PR-supplied npm script, resolve a PR-supplied unapproved capability replacement, or load repository JavaScript configuration.
Tool dependency changes require a reviewed graph update before private credentials are used with that candidate.
Repository data checked by the trusted tool remains untrusted input and must satisfy the scoped security assessment.

Ordinary fork PR workflows do not have the same secret access as trusted workflows.
Each public/fork-enabled consumer must select a supported private-package check path before cutover: for example, an approved protected check workflow that acquires the trusted release and processes only the candidate document data without executing candidate application code.
This is a proposed option, not a completed event/security design.
Do not solve absent credentials by using `pull_request_target` to run untrusted checkout scripts, weakening required statuses, leaking private package archives in public artifacts, or reporting a skipped check as passed.
When no approved access path is available, report the prerequisite and retain the existing consumer workflow until GATE-11 closes.
GATE-11 first records a consumer access matrix in SLICE-001, before product work depends on the proposed distribution architecture.
For the package repository and each pilot, record actual visibility, allowed callers, PR origin/event, trusted tool/config source, credentialed acquisition boundary, data-only candidate path, required status, and expected denial behavior.
Repository visibility and entitlements are unresolved until inspected; do not infer them from repository names.
The matrix must cover same-repository PRs, fork PRs where supported, protected-branch checks, and dependency/configuration change PRs.
Untrusted JSON policy is bounded input, not authority to change the reviewed tool graph, exclusions, or required policy; define which changes need a trusted policy review before cutover.
Missing access is a blocked prerequisite, never a skipped green required check.

Direct CLI installation/invocation is the canonical reference workflow for both root and isolated-tooling consumers.
GitHub's [private Action sharing controls](https://docs.github.com/en/actions/how-tos/reuse-automations/share-with-your-organization) require caller access qualification; optional wrapper availability must not determine whether a consumer can use the CLI.
Privileged paths must treat candidate Markdown as data and cannot execute PR-supplied commands/configuration or dependencies; test these exclusions explicitly before a pilot. See [GitHub's event-trust guidance](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target).
The checking runtime receives neither acquisition/publication secrets nor OIDC issuance authority, repository write credentials, or inherited credential files.
Pin external Actions and reusable workflows in the scoped release/consumer integration to reviewed full commit SHAs; record the source repository and readable release identity alongside each pin. See [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

Standalone asset candidates, upstream archive digests, and acquisition/extraction evidence are maintained in the [software-selection record](software-selection.md).
The release builder still retains source/tag provenance, extraction inventory, actual executable/DLL identities, notices, and qualification output.
GATE-03 and GATE-04 remain open; metadata hashes alone do not authenticate a publisher or establish binary parity.

### Public contract and version policy

The public contract is the CLI, documented library API, configuration schema, result schema, exit meanings, formatting guarantees, and preset/default diagnostic policy.
Every result and `inspect` output identifies the package, schema, and explicit preset version.
Consumers pin a bundled preset identity; a package upgrade cannot silently select a different preset major or fetch remote policy.
Retaining an older supported preset preserves its documented behavior rather than aliasing it to new rules.

| Change                                                                     | Required version and evidence decision                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compatible repair/security fix                                             | Patch only when it restores the documented contract without intentionally changing accepted defaults; retain the reproducer and paired corpus evidence. |
| Backward-compatible opt-in feature                                         | Minor; new diagnostics are disabled by default and added result fields follow the declared schema extensibility rules.                                  |
| Changed default findings or intentional formatting behavior                | New preset major; also a package major if an existing invocation changes behavior or the old supported contract cannot be preserved.                    |
| Removed/renamed CLI, library, config or report field; changed exit meaning | Package major and corresponding schema changes; unsupported contracts fail explicitly, with migration guidance.                                         |
| Dependency/native tool upgrade                                             | Derive the increment from observed contract/preset deltas, not the dependency's own version label.                                                      |

This is the package's proposed compatibility policy using [Semantic Versioning](https://semver.org/); it is not evidence that a particular future change is compatible.
Published version contents remain immutable.
Document supported package/preset combinations and each end-of-support transition in the release runbook.
Material revisions to DEC-003, 005, 011, 013, 014, 015, or 016 require a dated decision with evidence and affected ACs in the existing decision record; avoid a parallel administrative log.

## 6. Interface and architecture

### CLI contract

Proposed public operations are `markdown-quality check`, `markdown-quality format`, and `markdown-quality inspect`.
They accept an explicit consumer root/configuration; root discovery may find the nearest declared package configuration, never the installed package directory.
v1.0 supports full discovery, literal filenames after an option terminator, and JSON filename input as separate documented selection modes.
Explicit local checks report their limited coverage; required CI invokes full discovery.
`check --base <commit> --head <commit>` belongs only to conditional v1.1; v1.0 rejects comparison options as unsupported rather than silently ignoring them.
`format` supports full or explicit selection only.
`inspect` identifies selected files, excluded-policy reasons, effective preset/configuration, supported platform, tool versions, and missing capability without mutating anything.

Proposed exit meanings: `0` clean/completed, `1` content findings, `2` configuration/tool/input/operation failure.
A format run with unresolved content produces `1` and no proposed writes; a filesystem/interruption failure can produce `2` with an explicit partial replacement outcome.
JSON reports have a schema version, capability/preset/tool identity, effective root/config digest, selection mode and paths, diagnostic source/rule/location, outcome, and written/unchanged/unprocessed paths where applicable.
Absolute paths remain local; machine results can use root-relative paths for CI.
No document bodies are logged by default; excerpts are bounded and optional.

The library supplies the same selection/check/format behavior to the CLI through a documented small interface; any optional Action invokes that CLI.
Tests cross that interface and the packed CLI.
Private modules need not become public adapters solely for mocking.

### Configuration ownership

The proposed root file is `.markdown-quality.json` with `schemaVersion`, `preset`, `include`, `exclude`, documented ignore-file references, constrained lint overrides, and local-link policy.
The preset has an explicit version and is bundled in an identified capability release, never fetched as remote policy.
No regex source, shell command, executable path override, JavaScript module, remote schema, or arbitrary plugin is accepted in ordinary repository configuration.

v1.0 selection is: included paths intersect explicit literal candidates when supplied; reject unsafe paths; apply mandatory non-traversal of Git/dependency/tool directories; apply explicit exclusions; apply configured native ignore-file semantics; deduplicate and sort.
Conditional v1.1 adds comparison candidates and conservative impact expansion under REQ-009.
Use Prettier's documented ignore handling rather than reimplementing Git/Prettier ignore syntax.
Explicit package exclusions always win; native ignore negation is honored within its own input semantics and cannot override mandatory safety exclusions.
Report an authored-root with no documents as a scope decision rather than silently promise useful coverage.
An explicit empty list is a successful zero selection.

Layout/prose defaults are owned by the package: preserve prose wrapping, embedded language formatting off, unlimited sentence width, clause splitting off, and forced native backend.
Existing repo-specific layout/line-ending requirements must be inventoried and translated into the accepted bounded configuration subset.
Do not opportunistically load inherited JS formatter config to preserve unspecified behavior.
Unknown fields and schema versions fail; no coercion or silent legacy aliases.

### Predicted modules and files

Names and locations are design predictions, not mandatory microtasks or existing files.

| Predicted seam/module                                      | Responsibility                                                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/configuration.*`, `schemas/configuration.schema.json` | Read bounded JSON; validate the package contract; construct effective policy.                                                                       |
| `src/documents.*`                                          | Resolve consumer root, discover/select literal documents, native ignores, file identity and safe paths.                                             |
| `src/native-tool.*`, `assets/tool-manifest.json`           | Resolve supported installed asset, validate identity, bound process/resources, validate native diagnostics.                                         |
| `src/formatting.*`                                         | Compose layout/prose/layout; compute candidate output and preservation/convergence evidence.                                                        |
| `src/markdown-lint.*`                                      | Supported ESLint Markdown configuration and diagnostics; no consumer application-lint configuration takeover.                                       |
| `src/local-links.*`                                        | Maintained AST extraction, supported URL handling, contained filesystem targets; impact/referrer accounting only in conditional v1.1.               |
| `src/change-selection.*`                                   | Conditional v1.1 only: supported Git invocation and literal NUL-delimited paths; conservative invalidation.                                         |
| `src/quality.*`, `src/cli.*`                               | Public orchestration, check versus format effects, stable result and exit contract.                                                                 |
| `schemas/result.schema.json`, `test/fixtures/`             | Consumer results and independently reviewed expectations.                                                                                           |
| `packages/native-*/`, `packaging/`                         | Reviewed assets, notices, coherent manifests, build/pack/release qualification.                                                                     |
| `docs/consumer-guide.md`, reference workflow examples      | Canonical direct CLI invocation and root/isolated-tooling installation; optional `action.yml` only after access/parity qualification.               |
| Release manifest, SBOM/provenance outputs, support runbook | Frozen artifact/evidence identity, component coverage, compatibility, incident response, and recovery; exact paths decided in the package checkout. |

### Check and format behavior

Check computes candidate formatted bytes in memory, validates prose independently of native exit/output equality, runs structural rules and local-link checks, and reports findings without writing.
Malformed native reports, unknown diagnostic kinds, crashes, timeouts, truncated output, invalid UTF-8, and missing tools are operational failures.
Known quoted/adjacent-list defects are requalified against the selected Snapper release; prefer upstream resolution.
If a compatibility suppression is still necessary, obtain an exact NSH-01 owner override before shipping it, including scope, regression evidence, owner, and removal trigger.
Existing donor approvals do not automatically authorize that exception in the new package.

Format first computes and validates every selected candidate against the proposed batch view, including links.
Any unresolved content or operational failure before writing leaves the batch unchanged.
Recheck each original's bytes/hash and file identity immediately before replacement; use an exclusive sibling temporary file and native supported replacement semantics.
Preserve applicable mode/line-ending contracts and qualify Windows locks, junctions, hard links, and Unix ownership/mode effects rather than claim all metadata remains unchanged.
If a replacement fails after other valid files were committed, report the partial result and stop further writes.
This is not a whole-batch transaction.
Rerunning is convergent; recovery of original uncommitted bytes requires the operator's retained preimages, which migration preparation must capture.
Spent owned temporary files are removed when safe; unproven failed-operation evidence is retained with its purpose and cleanup trigger.

## 7. Quality scenarios

All scenarios are proposed hard correctness constraints unless identified as a measured optimization.
The proposed accountable acceptance owner is Maksym Shostak; the executing app produces evidence, with separate independent assessment at final R2 verification.
Production signals are local/CI results, not centralized telemetry.
Performance/resource quantities are target parameters to baseline in SLICE-001; no invented timings are acceptance gates.

| Scenario | Source, stimulus, artifact, and environment                                                                                       | Required response and measure                                                                                                                                                                                   | Verification and production signal                                                                                                     | Rationale and risk                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| QA-001   | Author invokes check with malformed prose amid preserved evidence in a normal checkout.                                           | Selected defects are reported; all checkout bytes remain unchanged; no install/network request.                                                                                                                 | Filesystem snapshots and network/process observation; CI report outcome.                                                               | Read-only verification must be trustworthy.                                                                |
| QA-002   | Author formats GFM fixtures containing literals, hard breaks, nested lists, HTML, and non-ASCII text.                             | Expected preserved bytes remain exact and the second pass is identical.                                                                                                                                         | Reviewed golden corpus plus independent render/AST evidence for representative cases; unexpected diff reports.                         | Native preservation backstops do not establish whole-document equivalence.                                 |
| QA-003   | Faulted/changed native tool returns success with prose findings or malformed diagnostics.                                         | Findings remain failures; malformed/unknown results produce operational failure and zero writes.                                                                                                                | Public-interface fixtures plus real native reproduction; tool identity/diagnostic source in results.                                   | Avoid silent false acceptance.                                                                             |
| QA-004   | Untrusted paths/configuration introduce traversal, junctions, option-like names, malformed UTF-8, or arbitrary plugin references. | Outside sentinels unchanged; inputs rejected before execution or writing; no shell interpretation.                                                                                                              | Adversarial filesystem/CLI fixtures on both platforms and scoped security assessment; bounded error records.                           | New filesystem/parsing trust boundaries.                                                                   |
| QA-005   | Maintainer installs a packed release on clean supported Windows/Linux hosts with lifecycle scripts disabled.                      | Correct matching tool works without Python, runtime downloads, or dependency on the source checkout.                                                                                                            | Native npm install/lock behavior and offline runtime tests; inspect tool identity.                                                     | The shipped archive is the product, not source tests.                                                      |
| QA-006   | Conditional v1.1 CI receives empty/deleted/renamed documents or changed link targets/config/tooling.                              | Empty selection terminates; impacted referrers are checked; policy/tooling changes select full scope; invalid comparison fails or explicitly selects full checks.                                               | Git fixture histories and documented fallback cases; mode/reason/path count in report.                                                 | v1.0 retains full-scope CI; optimized coverage is a later proof obligation.                                |
| QA-007   | User/process edits a selected file after candidates were computed, or replacement is interrupted.                                 | Concurrent bytes are not overwritten; no half-written single file; partial batch state is truthful and resumable by rechecking.                                                                                 | Fault injection and hash/file-identity sentinels; written/unprocessed list.                                                            | Per-file safety differs from whole-batch atomicity.                                                        |
| QA-008   | Formatter/linter/native dependency release changes output or diagnostics.                                                         | Upgrade delta is visible, reviewed, and bound to release/graph identity; no silently inherited version.                                                                                                         | Paired old/new corpus and consumer runs; dependency PR and release notes.                                                              | One source must not mean fleet-wide uncontrolled drift.                                                    |
| QA-009   | New capability checks a large representative repository and long nested quote input.                                              | Enforce accepted size/time/output limits with operational errors; measure file/subprocess counts, elapsed time, peak memory, and archive/install size.                                                          | Baseline benchmarks and bounded pathological fixtures; local CI durations.                                                             | Bounded resources are hard constraints; speed improvement is measured, not assumed.                        |
| QA-010   | Local CLI, JSON consumer, direct CLI workflow, and any qualified optional Action check the same root/config/archive.              | Same selected paths, substantive diagnostics, and outcome; text cannot hide operational failure represented in JSON.                                                                                            | Result-schema/packed consumer/workflow parity tests; release and config digests.                                                       | A single semantic implementation must reach every caller.                                                  |
| QA-011   | Authorized and unauthorized users/CI events attempt acquisition of private core/native packages.                                  | Authorized installs complete; unauthorized downloads fail; runtime receives no registry credentials; fork/event limitations remain explicit rather than skipped passes.                                         | Native registry access tests, secret sentinels/redaction, event-trust review, actual consumer CI readback; bounded acquisition errors. | Private delivery introduces credential and entitlement dependencies independent of formatting correctness. |
| QA-012   | Release inputs, packaged native contents, or an external Action change after candidate freeze.                                    | Manifest/digest mismatch blocks promotion; every shipped component has an inventory/SBOM entry; affected assurance is rerun before approval.                                                                    | Source/build/repack manifest, independent digest verification, attestation verification when supported, and registry readback.         | Hashes need attributable source/build context; stale evidence is not reusable approval.                    |
| QA-013   | A policy upgrade, vulnerable component, or pilot abort requires an operational response.                                          | Contract deltas determine versioning; affected releases/consumers are identifiable; the approved runbook restores recorded preimages/configuration without unrelated changes within an accepted recovery bound. | Paired upgrade corpus, incident exercise, timed restoration, and support/deprecation record.                                           | Agentic implementation still needs recoverable releases and explicit maintenance behavior.                 |

## 8. Vertical implementation slices

The executing coding app coordinates integration against the accepted baseline and preserves a resumable evidence handoff.
Each slice has an observable public path and evidence, not a horizontal batch of modules.
Likely files remain predictions.
No slice is accepted merely because its own unit tests pass.

### Agent execution sequence and milestone exits

Slice IDs remain stable for review traceability; their numeric order is not the revised execution order.
The v1.0 critical path is SLICE-001 → SLICE-002 → SLICE-004 → SLICE-003 → SLICE-006 → SLICE-010 candidate assurance/acquisition → SLICE-007 → SLICE-008 → SLICE-010 stable decision.
SLICE-009 follows stable promotion; SLICE-005 is conditional v1.1 and is not a prerequisite for v1.0 CI or either pilot.

| Milestone                 | Demonstrable exit and evidence                                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline and architecture | Accepted revision/digest; rights and native decisions; support/resource targets; package/consumer visibility-event matrix; GATE-11 architecture decision; correct target-repository HISEW controls. |
| Internal alpha            | SLICE-002 and SLICE-004: packed `check`/`inspect` with full-scope formatting, GFM and local-link diagnostics on both supported platforms; no writes or runtime acquisition.                         |
| Internal beta             | SLICE-003: safe `format`, complete candidate validation, preservation/idempotence, race/fault tests, and a recoverable preimage path.                                                               |
| Release candidate         | SLICE-006 and SLICE-010: direct CLI CI path qualified; frozen contracts/preset, source/locks/corpus, SBOM/native inventory and archives; independent/security/rights dispositions.                  |
| Pilot availability        | Separately authorized restricted publication if registry installation is needed; exact artifact/access readback, with no stable promotion yet.                                                      |
| First and second pilots   | SLICE-007 then SLICE-008: same exact release tuple, accepted old/new deltas, full relevant hosted checks, preserved controls, and timed recovery evidence.                                          |
| Stable v1.0               | SLICE-010: two accepted pilots, complete release/runbook evidence, and no unresolved release-blocking risk or missing correctness proof.                                                            |
| Follow-on                 | SLICE-009 per accepted migration; SLICE-005 only after measured full-check limits justify it and its revised baseline is accepted.                                                                  |

Each app handoff records current input identities, completed AC evidence, open decisions, safe next slice, and any partial filesystem/publication state.
Independent qualification work can proceed concurrently only when it uses isolated inputs and does not write shared contracts or candidates; integration consumes frozen results in the order above.
Any delegation or independent review is separately authorized under the active workflow; this plan starts no agent fan-out.
There are no person-day, staffing, monetary, meeting, or fixed calendar commitments.

### SLICE-001: Freeze one representative consumer contract and close selection gates

Outcome: an owner can inspect a proposed install/check contract, reviewed corpus expectations, source rights map, and first consumer selection manifest.
Close exact dedicated-repository/private-scope ownership, baseline acceptance, software selection, AGPL donor/dependency/asset review, platform/extraction questions, GATE-11's private/fork CI architecture decision, and resource baseline parameters.
Record all pilot visibility/event combinations, a supported restricted first-publication path, intended OIDC eligibility, and the provenance/attestation capabilities actually available.
Specify the source-delivery procedure required by the rights decision, including release-bound source/build materials, recipient access, and retention; private registry access does not establish that obligation's satisfaction.
Compare the maintained alternatives against the concrete corpus where documentation cannot establish fit.
Retain exact donor source revisions and immutable qualification inputs; no wholesale history import is required.
Assess whether native binaries genuinely reduce consumer setup enough to justify platform package maintenance.

Proof: rights/selection records with truthful statuses; expected files and bytes reviewed independently; exact native artifact/tool identities; explicit acceptance of DEC-003 or a rebaselined alternative; reviewed CI trust matrix and acceptance probes; numeric benchmark/recovery targets grounded in representative consumers.
Dependency: baseline review and authorized disposable qualification environment.
Release implication: no executable release or restricted-source extraction before its gate closure; full hosted CI qualification follows in SLICE-006 before a pilot.

### SLICE-002: Install a packed candidate and check one authored document

Outcome: a fresh supported consumer installs the packed core and matching native asset, then checks a real malformed document without Python or writes.
Cross package manifests, asset resolution, bounded process execution, layout/prose composition, result schema, and the public CLI.
Expose read-only `inspect` and full/explicit selection through the same interface; comparison flags remain unsupported in v1.0.
Distinguish the installed package root from a temporary consumer root.
Support clean document, fused sentence, zero-exit-with-diagnostic, missing/corrupt asset, empty explicit list, and invalid configuration cases.

Proof: real packed installation with lifecycle scripts disabled on Windows/Linux; document/environment sentinels; same native output as the qualified donor invocation; explicit operational exit behavior.
Dependencies: SLICE-001.
Release implication: internal candidate only; no registry publication is needed for this proof.

### SLICE-003: Format a selected document batch safely with repository-specific scope

Outcome: a consumer declares include/exclude/ignore policy and formats an intended batch while evidence and unrelated files remain unchanged.
Reuse the alpha's shared enumeration and JSON/literal selection for final candidate validation, optimistic preimage checking, supported per-file replacement, interruption outcomes, and repeat-run convergence.
Qualify `.md` first; any additional suffix must be specified in the accepted configuration contract.
Include nested parent-link/junction and hard-link scenarios rather than checking only the final path's symlink flag.

Proof: reviewed selection/golden fixtures; no-op second pass; independent preimages; failure-before-write and mid-batch fault cases; boundary sentinels.
Dependencies: SLICE-004, so the write path validates complete layout, prose, structure, and local-link results before replacement.
Release implication: guarded write capability; rollback requires retained preimages and cannot be inferred from package downgrade.

### SLICE-004: Report GFM and local-link defects through the same check

Outcome: `check` rejects invalid structure and missing contained link targets while accepted alerts, references, and literal examples pass.
Reuse supported ESLint rules and schemas; use maintained AST/URL interfaces for links, images, and definitions.
Verify encoded filenames, spaces, Unicode, relative/root-relative policy, same-file fragments, directories versus files, and external schemes without fetching.
Cross-document fragment validation remains explicitly absent; do not advertise it based on the native same-document rule.
Product-specific generated API and example-completeness tests remain in the consumer repository.

Proof: positive/negative golden documents and independently chosen target trees; native lint configuration validation; local-link diagnostics reflected identically in text/JSON.
Dependencies: SLICE-002 and cleared reuse rights; shared enumeration must cover full authored scope before alpha qualification.
Release implication: completes read-only alpha before SLICE-003 enables writes; new diagnostics are classified as policy changes and their consumer impact must be reviewed.

### SLICE-005: Conditional v1.1 changed-document and referrer checking

Entry condition: accepted pilot measurements show that full checking exceeds agreed runtime/resource limits, simpler supported improvements are insufficient, and a separate optimization baseline is accepted.
If full checking meets those limits, defer this slice without weakening the v1.0 completion claim.
Outcome: a CI-like comparison checks changed authored content, checks unchanged documents that refer to changed/deleted local targets, and expands to full scope for policy/tool changes.
Use native Git commit resolution and NUL-delimited paths; do not shell-interpolate filenames.
Comparison head must identify the checkout being checked; relevant tracked inputs must match the claimed snapshot.
Default full discovery includes untracked authored files; comparison mode does not claim they belong to the committed diff.
Deletes are absent content, not a malformed explicit path, but trigger link-impact checking.
An explicit missing user filename remains an error.
Unavailable/shallow/ambiguous comparisons never return a selective clean result: fail or take the documented full-check route, with a reported reason.

Proof: representative Git histories for adds/deletes/renames/type changes, bracket/newline filenames, invalid refs, relevant dirty inputs, deleted non-Markdown targets, unchanged referrers, and policy invalidation.
Dependencies: stable v1.0 from SLICE-010, benchmark evidence from SLICE-007/008, and accepted conditional v1.1 scope; reuse SLICE-004's link analysis.
Release implication: selective mode can replace existing documentation selectors only after implication coverage matches the consumer's required assurance.

### SLICE-006: Run the same packed release locally and in direct CLI workflows

Outcome: root-dependency and isolated-tooling consumers run an equivalent check in supported CI and terminal environments.
The reference workflow installs the reviewed locked tooling graph with lifecycle scripts disabled, invokes the CLI for the full authored scope, and surfaces results without a second classifier.
Capability identity comes from the reviewed consumer/tooling lock; root/config inputs are bounded data, never shell source.
An optional composite Action may wrap exactly this path only after caller access and parity are proven; it and all external Actions/reusable workflows are pinned to reviewed full commit SHAs.
Private acquisition is a separate trusted credential scope, using an approved graph and authorized event; the content-processing step has neither registry credentials nor write authority.
Close GATE-11's qualification checkpoint for fork-enabled consumers and any proposed private-Action sharing before altering their required check path.
Attempt PR-controlled script, JS config, dependency/CLI replacement, malicious policy, and credential-file injection; prove the trusted workflow processes only bounded candidate data and cannot use candidate-supplied execution authority.
Repositories own checkout settings, least-privilege workflow permissions, required status names, existing dependency review, and any CodeQL floors; content processing inherits no checkout credentials.
Untrusted PR content receives read-only check effects, no write token and no remote execution through repository configuration.

Proof: packed consumer matrix, native workflow validation, minimum-permission and fork/event fixtures, credential redaction/absence, direct-CLI selection/diagnostic parity, install without repository application dependencies, and offline runtime observation.
Dependencies: SLICE-003/004 and GATE-11 architecture closure in SLICE-001; no dependency on SLICE-005 or an optional Action.
Release implication: candidate usable in a host workflow; actual hosted acceptance remains distinct from local workflow simulation.

### SLICE-007: Migrate OwlAPI as the first real consumer

Outcome: OwlAPI invokes the candidate for its authored Markdown, while its application/Python/release tooling remains owned locally.
Inventory exact existing selected files and configured rules, including generated API exclusions and retained review documents.
Compare both implementations on the same disposable input snapshot and classify every selection/diagnostic/output difference.
Update approved npm commands directly to the new CLI; avoid legacy executable aliases or duplicate old/new policy engines.
Retain the old implementation only as immutable qualification evidence until accepted cutover, not as a production fallback.

Proof: accepted delta manifest; package qualification tests and full relevant OwlAPI checks; Windows/Linux check effects; actual hosted required-check readback after separately authorized delivery; timed restoration of the pilot's code/config/lock/workflow and selected document preimages.
Dependencies: SLICE-006, SLICE-010 candidate assurance and any necessary registry availability, GATE-11 qualification, and consumer-specific scope/config approval.
Release implication: first scoped pilot adoption; retained old manifest/lock/source identity enables reversal.

### SLICE-008: Migrate WebVOWL and prove lightweight documentation CI

Outcome: WebVOWL preserves its authored root/docs/package policy and conservative CI behavior using the same package installed by OwlAPI.
Refresh the current branch/main source identity and preserve unrelated feature work.
Replace minimal-tool extraction and formatting wrappers where no other consumers remain.
Retain application/Python/CodeQL classification floors and the existing required aggregate status.
Prove both a documentation-only change and a tooling/mixed change through real hosted workflows after authorized delivery.

Proof: selection and corpus parity, long-quote/nested-list/task-list regressions, unchanged-referrer coverage through full-scope local-link checking, documentation-only and mixed-change hosted outcomes, and accepted resource measurements.
Existing workflow job classification may remain, but the required Markdown job checks the full authored scope; an externally supplied changed-file list cannot bypass the deferred REQ-009 proof.
Dependencies: accepted SLICE-007 pilot, SLICE-006, and consumer-specific approval.
Release implication: second different consumer establishes that configuration variation is real and the shared interface is sufficient.

### SLICE-009: Migrate the remaining mature consumers one at a time

Outcome: Universal Ontology, Software Engineering Workflow, and Steam Community BBCode use the same release with their own accepted scope and local product checks.
Each repository receives a separate migration manifest, isolated candidate comparison, and delivery/recovery decision.
Keep UO policy/evidence boundaries; keep HISEW's engine/build dependencies and separately decide any expansion into skill Markdown; keep Steam's generated reference ownership and example/conformance tests.
Replace Steam's report-writing behavior only with an explicit reporting integration that the consumer actually needs.
Search for actual remaining Snapper/Python/Prettier consumers before removing dependencies or lock groups.

Proof: per-repository selection/diagnostic/output deltas, full relevant native checks and policy floors, frozen package identity, exact target readback when delivery is authorized.
Dependencies: both pilots accepted and stable v1.0 promoted through SLICE-010; each migration has its own accepted scope and authorization.
Release implication: controlled fleet adoption, with independent reversibility per repository; no global switchover.

### SLICE-010: Qualify and publish a coherent release, then retire spent duplication

Outcome: the owner can approve a frozen, fully qualified coordinated package release and each adopted repository has an attributable installed identity.
This slice has separate candidate assurance, pilot availability, and stable-promotion checkpoints, so pilots do not depend on a stable decision that itself requires pilot evidence.
Finalize semantic naming, full relevant verification, ordinary review, independent verification, required scoped security assessment, AGPL donor/dependency/asset clearance, notices/source-delivery record, installed dependency/native graph, package contents, support/runbook decisions, and recovery evidence.
Freeze the release-evidence manifest defined in section 9 before assessment; produce the SBOM, upstream/build/repack provenance, and supported artifact attestations, and verify their binding to the exact core/platform tuple.
Qualify OIDC publishing where supported, with an explicit restricted bootstrap/alternative path when necessary; record any entitlement limitation without claiming unavailable npm provenance.
Publish private native asset packages and the private core under separately authorized coordinated restricted-access release rules; a partial publication cannot promote the core as supported.
For the initial private publication, inspect the selected npm publication method before use: [npm documents a public placeholder when staging a previously nonexistent package](https://docs.npmjs.com/creating-and-publishing-private-packages/).
Do not infer that staged first publication preserves the owner's requested visibility; use an explicitly qualified restricted publication path.
Registry name/server acceptance is a real gate; `npm pack` or publication dry-run cannot prove it.
Read back restricted visibility and registry artifact identity; test authorized installation of that exact release and unauthorized download denial for core and platform packages.
Publish an optional compatible thin Action revision only if included in the authorized scope, documenting its relation to the qualified capability and caller access.
Stable promotion requires both accepted pilots, the approved support/incident/recovery runbook, and no unresolved release-blocking risk; later fleet migration and conditional v1.1 do not block v1.0.

Proof: frozen archive/SBOM/provenance/manifest hashes, native asset inventory, review/security/rights dispositions, release-readiness decision, registry readback, packed/registry consumer checks, pilot recovery evidence, and duplicate-consumer search for accepted cutovers.
Dependencies: candidate assurance uses SLICE-006; authorized pilot availability follows that assurance; stable promotion uses SLICE-007/008.
Fleet cleanup follows only individually accepted migrations.
Release implication: package availability is not automatic fleet adoption; delete only named spent artifacts after retained evidence and active consumers are accounted for.

### Slice traceability

| Slice     | Requirement / acceptance / quality / decision links                                                  | Falsifiable proof                                                                                                                     | Release or cleanup implication                                                    |
| --------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC-001, 008, 012, 014 to 016; QA-005, 008, 009, 011 to 013; DEC-001 to 004, 009, 011, 013 to 016 | Accepted contract, rights/source-delivery and CI architecture records, native parity/platform/extraction experiment.                  | No dependent implementation or restricted extraction before relevant gates close. |
| SLICE-002 | REQ/AC-002, 003, 004, 008, 010; QA-001, 003 to 005; DEC-003 to 009                                   | Clean packed install; real one-document check, inspect and selection; zero-write/zero-network evidence.                               | Internal candidate only.                                                          |
| SLICE-003 | REQ/AC-002 to 005; QA-001, 002, 004, 007; DEC-005 to 008                                             | Selection/golden corpus, preimage race, interruption, convergence.                                                                    | Per-file write contract; retain recovery inputs.                                  |
| SLICE-004 | REQ/AC-002, 004, 006, 007, 010; QA-001, 002, 004, 010; DEC-005, 006, 008                             | Full authored-scope selection, native lint and AST target fixtures, read-only alpha.                                                  | Document diagnostic policy changes.                                               |
| SLICE-005 | REQ/AC-002, 004, 009; QA-001, 006, 009; DEC-010                                                      | Measured need, accepted v1.1 scope, Git histories and changed-target/referrer implication.                                            | Deferred from v1.0; selective CI only after complete scope qualification.         |
| SLICE-006 | REQ/AC-001, 008, 010, 011, 014, 015; QA-004, 005, 010 to 012; DEC-009, 011, 013, 015                 | Packed root/tooling installs, credential/event injection probes, direct CLI parity, full-SHA workflow identities.                     | GATE-11 qualification before hosted pilot cutover; optional Action.               |
| SLICE-007 | REQ/AC-001, 003, 011 to 013, 016; QA-002, 008, 010, 013; DEC-012, 016                                | OwlAPI accepted delta, full relevant checks, timed restoration.                                                                       | First bounded consumer adoption.                                                  |
| SLICE-008 | REQ/AC-001, 011 to 013, 016; QA-008 to 011, 013; DEC-010 to 012, 016                                 | WebVOWL docs-only/mixed hosted checks using full Markdown scope and the same release; measured resources.                             | Second consumer proves shared interface.                                          |
| SLICE-009 | REQ/AC-002, 011 to 013; QA-008, 010; DEC-012                                                         | Per-repository delta and actual full relevant controls.                                                                               | Post-v1.0; remove duplicates only after each accepted cutover.                    |
| SLICE-010 | REQ/AC-008, 011 to 016; QA-004, 005, 008, 010 to 013; DEC-001 to 004, 009, 011, 013 to 016           | Frozen manifest/SBOM/provenance, independent/security/rights review, restricted registry installation, approved runbook and recovery. | Separate candidate/pilot availability/stable checkpoints; bounded cleanup.        |

SLICE-010's candidate assurance precedes pilot availability; stable promotion follows both pilots, and final fleet cleanup follows each later migration.
Registry publication may be needed before pilots use a normal registry dependency; authorize it separately after package assurance.
Prefer qualifying one immutable version under a pilot distribution tag and promoting that same version after both pilots; moving a tag does not change artifact bytes.
If a prerelease-to-stable version change repacks any manifest or archive, freeze the resulting tuple and rerun the affected package/install/consumer evidence before claiming stable acceptance; previous hashes do not qualify new bytes.
Both pilots must ultimately accept the exact tuple proposed for stable use.
Packed experiments do not require publication, and this sequencing grants no publication authority.

## 9. Verification and oracle ownership

### Verification scope and evidence coverage

The proposed package's focused profile exercises public selection/config/results, native diagnostic validation, and representative formatter/linter/link fixtures.
The affected profile adds real installed assets, writing/interruption cases, and root/isolated packed consumers on the changed supported platform.
The full profile adds the complete corpus/platform/install matrix, actual release graph/contents, native workflow checks, representative consumer integrations, required independent verification, and review/security obligations.
Ordinary commands and assurance outputs must be defined in the actual implementation repository and bound to its accepted HISEW profiles before claiming engine receipts.
No current `personal` profile is repurposed silently.

Each final candidate is formatted/linted and inspected before expensive verification.
Freeze candidate source, fixtures, configuration/result schemas, preset, lockfiles, package archives, SBOM/native inventory, provenance, and workflow/Action identities.
Changes to tool/preset/config/fixture input invalidate the affected evidence; do not run the full fleet repeatedly without an input change or unresolved concern.
Full means relevant obligations, not unrelated application suites from every local clone.
At each real consumer cutover, that repository's global verification floors still apply.

### Oracles and boundaries

Expected selected files and formatted bytes are reviewed by the baseline owner with independent verifier scrutiny.
Preserve donor fixtures with provenance, but independently justify expectations when tool versions or accepted policy change.
Use representative rendering/AST checks as additional semantic evidence, not a universal equivalence claim and not an expectation generated by the formatter itself.
Native schema/parser/package-manager checks validate their own contracts; they do not establish document meaning or rights.

Mock only actual external effects where deterministic fault injection is necessary: native process crash/output/timeout, filesystem interruption/concurrent mutation, registry/network transport, and conditional v1.1 Git comparison failures.
At least one real native-tool and packed-consumer path covers every shipped platform.
Do not replace real Prettier, Snapper, ESLint, npm installation, or Markdown parsing with mocks in release qualification.
No model evaluation or agent calls are needed to operate the product.

### Frozen release-evidence manifest

Keep one manifest for each exact candidate tuple in the authorized evidence store, with artifact locations, digests, producer/session identity, observed result, limitations, and the applicable AC/QA/gate links.
A missing item is blocked or explicitly inapplicable with a reason; an empty path, generated checklist, or upstream claim is not a pass.
The manifest indexes evidence rather than copying it into another dossier.
Freeze the evidence needed for each milestone: registry readback and pilot acceptance are explicitly pending in the prepublication manifest and become required at their respective later gates.
Retain each frozen manifest; subsequent delivery/pilot evidence produces a new digest-bound manifest referencing its predecessor and the unchanged candidate tuple.
This permits evidence to accumulate without rewriting earlier approval inputs or pretending that post-publication observations already exist at candidate assurance.

| Evidence class                  | Required contents and validation                                                                                                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source and public contract      | Clean source commit, release/tag identity, accepted requirement digest, source lockfile, fixture corpus, config/result schema and preset digests, CLI/API/exit contract.                                                                                          |
| Packaged graph and SBOM         | Exact core/platform tarball digests and contents, source/build versus shipped runtime graphs, installed consumer lock identities, SPDX or CycloneDX SBOM, and explicit coverage of every bundled native executable/DLL/runtime component.                         |
| Supplier and native origin      | Exact donor revisions/licences; upstream release/tag/archive URL and digest; available source/build/signature evidence; supplier maintenance/security-response and transitive dependency observations; unresolved origin or resilience limitations.               |
| Build and repack                | Reviewed workflow and full Action SHAs, job/run identity, runner/runtime/tool versions, build inputs, extractor/version, extracted file inventory and hashes, original-to-repacked mapping, retained notices and source-delivery decision.                        |
| Contract and differential proof | CLI/library/schema/exit/preset tests; accepted donor-versus-candidate and standalone-versus-reference comparisons on identical input bytes; reviewed semantic/output deltas.                                                                                      |
| Adversarial and fault proof     | UTF-8/Unicode/path fixtures, empty input, filesystem boundaries, native crash/timeout/malformed output, concurrent preimages, interrupted writes and acquisition failure; Git history failures apply only to conditional v1.1.                                    |
| Packaged and CI proof           | Clean Windows/Linux root/isolated installs, script-disabled acquisition, read-only/offline runtime, visibility/event matrix, credential isolation and required-status readback; optional Action parity only if shipped.                                           |
| Assurance and delivery          | Focused/affected/full references for relevant frozen inputs; independent verification, ordinary/security/rights dispositions; publication authorization, restricted access and registry digest readback; attestation verification or explicit unavailable status. |
| Consumer and recovery           | Both pilot configuration/lock/workflow identities, approved scope/delta manifests, retained preimages, timed restoration, support/incident/release runbook, and bounded retirement evidence.                                                                      |

Use maintained [npm SBOM generation](https://docs.npmjs.com/cli/v12/commands/npm-sbom/) for the JS graph; reconcile it with a native component inventory rather than assuming npm discovers executable/DLL internals.
Validate any supplemental SPDX/CycloneDX representation with its supported tools; do not invent a parallel SBOM format or claim complete coverage from package names alone.
The release builder uses a frozen install with lifecycle scripts disabled, then explicitly invokes only reviewed build/repack steps with their declared inputs.
Packaging provenance must distinguish upstream assertions, locally observed extraction/repack facts, and independently verified proof; absence of upstream attestations is recorded, never fabricated.

npm automatic provenance requires a public source repository and public package, so it cannot be promised for the selected private-package model.
See [npm's provenance conditions](https://docs.npmjs.com/trusted-publishers/#automatic-provenance-generation).
Retain the internal manifest in every case; when the selected GitHub entitlement supports [artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations), verify subject digests and the expected repository/workflow identity and retain the verification result.
If that facility is unavailable, GATE-08 requires an explicit disposition of the remaining provenance gap and any assessed native signing alternative; a manifest hash is not represented as a signature or SLSA level.

### External assurance mapping

These primary references were checked on 2026-10-05 and provide a vocabulary for inspecting the same evidence; they create no certification claim or parallel lifecycle.

| Reference                                                                       | Plan evidence and HISEW connection                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [NIST SSDF v1.1, SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)       | Requirements/risk and protected contracts; reviewed implementation/verification; release integrity and vulnerability response. Map to the accepted R2 route, SEC-01, GATE-08 and the support runbook.                         |
| [NIST SP 1326 supplier due diligence](https://csrc.nist.gov/pubs/sp/1326/final) | Proportionate supplier provenance, resilience, security practices and dependency-tier evidence, including material ownership/control questions. Map to REU-01/LIC-01 and GATE-03/04; an archive digest alone is insufficient. |
| [SLSA v1.2 source/build provenance](https://slsa.dev/spec/v1.2/)                | Bind reviewed source and build/repack inputs to released artifact identities through REQ-015/QA-012 and the frozen manifest. Claim only verified properties; no SLSA level is asserted.                                       |

### Candidate freeze and change control

Protect the implementation repository's release branch and require applicable independent review of manifests, release workflows, preset behavior and native inputs using the repository's supported controls.
This is a future configuration requirement under GATE-07, not permission to change repository settings during planning.
Any post-freeze edit names the affected evidence and invalidates the corresponding manifest entries before reevaluation.
A prose correction may need only documentation/package-content checks; a native/tool/preset/config/corpus or CI trust change requires the affected platform, consumer, security, and contract evidence.
Always update artifact hashes and registry readback for changed release bytes; reuse evidence only where its declared inputs and conclusions still hold.
Security hotfixes may shorten sequencing but retain source/provenance attribution, rights, archive identity, relevant supported-platform smoke tests and required independent assessment.

## 10. Repository migration and compatibility

| Consumer                      | Preserve initially                                                                                 | Replace after proof                                                                            | Local checks that stay                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| OwlAPI                        | Recursive authored selection; generated API/provenance/review exclusions; existing GFM rules.      | Markdown quality/selection wrappers and duplicate policy only where no other consumer remains. | JavaScript/Python checks, public API/package/release qualification.               |
| WebVOWL                       | Root/docs/vowl-package scope; archive/policy/evidence exclusions; docs-only versus full CI floors. | Prose/select/check wrappers and minimal Markdown installer extraction.                         | Application tests/build, Python setup/testing, CodeQL/dependency review.          |
| Universal Ontology            | Root/docs/package-root scope and retained editing-policy/evidence/generated exclusions.            | Shared formatter/tool projection and documentation-selection implementation.                   | Generated policy, ontology/MCP/product documentation checks.                      |
| Software Engineering Workflow | Current root/docs semantic scope and review exclusions; package/engine isolation.                  | Prose wrappers, selector, shared Markdown policy.                                              | Engine/build/uv/Python controls and skill/package documentation semantics.        |
| Steam Community BBCode        | Generated-reference/plans/migration exclusions and explicit evidence needs.                        | Prose wrapper and generic local-link implementation after parity.                              | Executed examples, conversion semantics, generated API/conformance documentation. |

The migration register for each repository records: base commit and actual branch; user-owned dirty paths; selected files; current formatter/rule/ignore configuration; generated/evidence ownership; exact candidate package/graph; output and diagnostic deltas; affected local/hosted controls; preimages; rollback identity; owner acceptance; named retirements.
It also records repository visibility/fork-event access, the reviewed acquisition/tool/config sources, package/preset/schema identities, full-scope v1.0 CI behavior, and required-status mapping.
Different scopes do not become one universal all-Markdown glob by accident.
No backfill of historical review, archive, generated, or third-party prose is planned.
New lint findings are fixed or accepted through explicit scoped policy decisions, not hidden by broad exclusions or a findings baseline generated by the candidate.
Existing task-oriented npm entry points can invoke the shared CLI directly where their meaning remains accurate; deprecated legacy binaries and duplicated policy engines are not retained as shims.

Schema changes use explicit package/config/result/preset version contracts and fail unsupported versions.
No in-place automatic migration of repository configuration or lockfiles occurs during checking.
Consumer upgrade PRs show dependency and policy/output deltas together and remain individually reviewable.

## 11. Rollout, observability, and recovery

The executing app records native operational errors, outcome counts, selected paths, elapsed/resource measurements, tool/policy identities, and CI status readback in the existing task/release evidence.
Pilot acceptance includes unexpected diffs, missed authored roots, new diagnostics, and retained generated/evidence bytes.
Excerpts and absolute paths are restricted to local or explicitly requested reports; there is no hosted document upload or centralized telemetry.

Rollout stages are: read-only packed alpha; safe-format beta; frozen release candidate with qualified CI; authorized pilot availability if needed; accepted OwlAPI pilot; accepted WebVOWL pilot; stable release; separately authorized remaining migrations.
Abort promotion for literal/meaning changes outside accepted layout differences, unknown diagnostic kinds, scope omission, runtime network/install behavior, unsupported platform dependencies, rights gaps, or lost CI floors.

Before each consumer migration, isolate the authorized changes and record old code/config/lock/workflow identities and exact selected preimages.
After an abort, restore only task-owned migration changes using scoped reverse edits or the owner's authorized recovery operation.
Preserve unrelated working-tree edits and failed evidence.
If document formatting occurred, restore its retained original bytes or approved prior Git inputs; a package rollback alone is insufficient.
If release publication partially succeeded, retain registry identities, do not reuse version numbers, keep the unsupported core unpromoted, and publish an authorized coherent corrective release.
Revoke credentials or deprecate a compromised release only through separately authorized provider/registry actions, retaining the affected identities and incident evidence.

### Measurable acceptance and operating signals

Correctness thresholds below are release/cutover conditions; timing and rate bounds are proposed until representative measurements and baseline acceptance at GATE-05.
Collect local/CI evidence with a declared workload, host/tool identity, sample count and observation window; do not add centralized telemetry or a dashboard service.

| Signal                                                                   | v1.0 acceptance or decision rule                                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unaccepted semantic/literal changes; second-pass differences             | Zero in the accepted corpus and pilot deltas; block promotion on any occurrence.                                                                                                               |
| `check` state mutation; runtime acquisition/network; runtime credentials | Zero in qualification; any breach blocks the release and triggers investigation.                                                                                                               |
| Advertised platform/install combinations                                 | 100% of the defined Windows x64/Ubuntu 24.04 x64 × root/isolated-tooling matrix passes from the exact packed/registry tuple.                                                                   |
| Component evidence and immutable workflow pins                           | 100% shipped JS/native component coverage and reviewed full-SHA pins for external Actions/reusable workflows in scope; missing evidence blocks release.                                        |
| Accepted scope/delta and preserved CI floors                             | Every migrated consumer has an accepted manifest; zero removed required checks or skipped checks reported as passes.                                                                           |
| Pilot operational errors and false positives                             | Record error runs/total valid runs and independently adjudicated false positives/total findings by rule/tool, with a minimum sample/window agreed at GATE-05; investigate every novel failure. |
| Full-check performance and resource bounds                               | Measure elapsed p95, peak memory, file/subprocess counts, and install/archive size against identical incumbent inputs; enforce accepted size/time/output limits.                               |
| Recovery                                                                 | Rehearse at least one pilot restoration, verify exact bytes/config/lock/workflow and unrelated sentinels, and meet the accepted elapsed-time bound before stable promotion.                    |
| Release-blocking risks                                                   | Zero unresolved correctness, rights, credential-isolation, native-parity, or required-assurance gaps at stable promotion; accepted residual limitations remain explicit.                       |

The review's candidate targets of under 1% operating/false-positive rates, at most 125% of incumbent p95 time, and restoration within 60 minutes are experiment hypotheses for GATE-05, not evidence-backed commitments.
Retain, replace, or reject each with measured consumer constraints and a recorded rationale; do not use a rate threshold to excuse semantic corruption or secret exposure.
Conditional v1.1 is considered only when accepted full-check constraints are breached and the cheapest supported improvements do not resolve them.

### Support, dependency upkeep, and incident response

Before stable promotion, accept a concise runbook covering the supported Node/OS/CPU/install/preset combinations, maintained release lines, security-fix/backport policy, upgrade/deprecation notice and migration path, and evidence/source retention.
Initial support is the qualified v1 release line and explicit preset identities; additional release lines or platforms require an accepted support decision and qualification.
Specify measurable vulnerability acknowledgement/triage and remediation-or-mitigation targets by severity at GATE-08, with a reachable reporting route and explicit observation responsibility for the authorized session or configured service.
No unattended monitoring or schedule is created by this plan, and an inactive coding app is not an assumed incident-response service.

Use approved native advisory/dependency-update services where available; review dependency changes with SBOM, rights, corpus, and consumer deltas.
Native Snapper updates require fresh standalone/reference parity, platform/runtime, asset provenance and output qualification; update proposals do not authorize unattended adoption.
The release runbook records the refresh trigger/cadence and actual provider support, including gaps that a private repository's entitlements leave unresolved.

For an advisory or suspected compromise: identify affected components/releases/consumers from the manifest; preserve evidence; stop affected promotion; request or use existing authority for containment/credential rotation; qualify an attributable fixed release; provide approved consumer recovery/upgrade instructions and verify readback.
Exercise that path with a simulated affected component before stable promotion and record which actions would require external authority.
The runbook must make the corresponding-source/notice delivery required by GATE-03 retrievable for the actual release recipients and preserve it for the accepted retention period. See the [AGPL text](https://www.gnu.org/licenses/agpl.en.html) for the source of obligations; exact applicability remains a rights decision.

No automatic cleanup job is introduced.
Remove disposable acquisition/qualification scratch after its evidence consumers finish.
Retain fixtures, rights/provenance records, reviewed deltas, release inventories, and required recovery inputs until their explicit retention/removal conditions are met.
The executing app records any surviving temporary item, its responsible authority, purpose, and deletion trigger in the handoff.

## 12. Gates, unknowns, and replanning

### Gate overview

| Decision group                     | Detailed gates  | Evidence-based exit                                                                                                   |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Baseline                           | GATE-01, 02, 07 | Accepted revision, target checkout/private registry identities and applicable controls.                               |
| Rights and suppliers               | GATE-03         | Exact incorporation/redistribution disposition, supplier limitations, notices and corresponding-source procedure.     |
| Native and platform                | GATE-04, 05     | Qualified binary parity/extraction/runtime, support matrix, resource and recovery thresholds.                         |
| CI trust and delivery architecture | GATE-11         | Early visibility/event/tool-graph decision, then credential-isolation/access and actual workflow proof before pilots. |
| Release assurance and availability | GATE-08, 09     | Frozen manifest/SBOM/provenance, required review and runbook, authorized restricted publication/readback.             |
| Consumer adoption                  | GATE-06, 10     | Accepted per-consumer scope/delta, hosted controls, rehearsed recovery and bounded retirement.                        |

These groups summarize the existing gates without replacing their IDs or creating new approval bodies.
Resolve the CI visibility/fork design, native feasibility, and rights/registry constraints first because they can invalidate the chosen architecture.
The implementing app assembles concrete evidence; actual acceptance/rights/publication decisions remain attributable to the authority entitled to make them.

| Gate    | Current status                                                                                                       | Cheapest evidence and required decision                                                                                                                                                                                                           | Blocks                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GATE-01 | Draft 4 synthesis authorized; exact revised implementation baseline not yet accepted.                                | Maksym reviews v1.0 scope and REQ/AC/QA/DEC, then accepts exact revision/digest and implementation effects.                                                                                                                                       | R2 product implementation and accepted-baseline capture.                                                               |
| GATE-02 | Dedicated repository/private npm selected; exact names, visibility, ownership and entitlements unresolved.           | Inspect real repository/registry identities and restricted access; record their selection and permitted bootstrap path.                                                                                                                           | Target creation, architecture finalization and private publication.                                                    |
| GATE-03 | Conditional AGPL-3.0-only direction; exact donor/dependency/asset rights and supplier review incomplete.             | Exact provenance/licenses/notices, material supplier risks and corresponding-source/recipient/retention procedure; accountable rights disposition before incorporation.                                                                           | Restricted copying, redistributed assets and rights-dependent release.                                                 |
| GATE-04 | Standalone parity/runtime/extraction unqualified.                                                                    | Compare exact standalone and reference binaries on an adversarial corpus on both platforms; inspect DLL/runtime needs and supported extraction.                                                                                                   | DEC-003 finalization and dependent native package implementation/delivery.                                             |
| GATE-05 | Support and size/time/output, performance/rate and recovery targets not measured/accepted.                           | Representative corpus and clean consumer experiments; accept numeric bounds, sample/window definitions and supported matrix; confirm against packaged pilots.                                                                                     | Resource/support claims, performance acceptance and v1.1 optimization decision.                                        |
| GATE-06 | Each consumer's scope/delta/configuration changes unaccepted.                                                        | Snapshot actual current inputs and dirty paths; compare old/new selections/diagnostics/output; accept that concrete migration scope and recovery plan.                                                                                            | That consumer's mutation/cutover.                                                                                      |
| GATE-07 | Actual package repository HISEW applicability/profiles and release protections unestablished.                        | Select the real checkout and authorize appropriate focused/affected/full declarations and repository protections; inspect their actual scope.                                                                                                     | Governed package implementation/verification and release-control claims.                                               |
| GATE-08 | Frozen manifest, independent/ordinary/security/rights review, support/runbook and release-readiness evidence absent. | Assess immutable candidate, SBOM/provenance/component coverage, attestation capability or gap disposition, contract versioning and measurable incident targets; record independent results.                                                       | Candidate release approval; stable decision also requires pilot/recovery evidence.                                     |
| GATE-09 | Publication authorization and registry acceptance absent.                                                            | Authorize exact tuple and restricted OIDC/bootstrap/alternative path; publish, read back hashes/visibility and authorized/unauthorized access.                                                                                                    | Claimed registry delivery and registry-based pilots; never replaced by pack/dry-run.                                   |
| GATE-10 | Hosted acceptance and retirement evidence absent for each consumer; pilot recovery rehearsal absent.                 | Actual required-status readback and remaining-consumer search per migration; at least one timed pilot restoration with unrelated sentinels unchanged before stable promotion.                                                                     | Each migration's completion/retirement; both pilot acceptances and the recovery rehearsal block stable promotion.      |
| GATE-11 | Architecture and qualification checkpoints both open.                                                                | In SLICE-001, inspect each visibility/event/acquisition/trusted-policy boundary and accept a feasible safe path. In SLICE-006, prove denial/secret isolation/no candidate execution and qualify any optional wrapper access before pilot cutover. | Dependent CI/distribution implementation until architecture closure; private CI and hosted pilots until qualification. |

The gates do not prevent review of this draft; they prevent treating proposals or source inspection as implementation/release proof.
No missing prerequisite is marked complete by this plan.

### Risk disposition register

The review's numerical likelihood/impact scores are uncalibrated planning estimates; retain the concrete risks and proof obligations without treating those scores as measured probabilities.
All rows remain unqualified at this draft stage.
At each milestone, bind the current disposition and residual limitation to evidence in the release manifest.

| Risk                                                                      | Required control/proof and decision point                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Private credentials or elevated workflow authority reach candidate code   | GATE-11 architecture plus adversarial event tests; data-only candidate processing, trusted graph/config source, no runtime credentials/OIDC/write authority. |
| Private Action unavailable to a caller                                    | Direct CLI is canonical; inspect the access matrix before considering the optional wrapper.                                                                  |
| Upgrade changes accepted formatting or default diagnostics                | DEC-016 contract/preset versioning, paired corpus/consumer results and explicit upgrade acceptance.                                                          |
| Native binary has hidden dependencies, wrong behavior or uncertain origin | GATE-03/04 rights/supplier/parity/platform evidence and REQ-015 source/repack/component provenance.                                                          |
| Literal corruption, unsafe Windows links/locks or unrecoverable writes    | QA-002/004/007 adversarial golden corpus and fault injection; exact preimages and timed recovery under GATE-10.                                              |
| Supply-chain or publication compromise                                    | Frozen graphs/SBOM/provenance, reviewed full-SHA workflows, qualified OIDC/restricted release path, incident runbook and exact registry readback.            |
| AGPL/donor/native obligations or private visibility not satisfied         | GATE-03 source/rights disposition and GATE-09 restricted first-publication/access proof; no public placeholder assumption.                                   |
| Selective mode misses unchanged referrers                                 | Deferred from v1.0; full scope preserves coverage. Conditional v1.1 must prove REQ-009/QA-006 before use.                                                    |
| Concurrent migrations or stale agent handoffs lose scope/evidence         | Frozen handoff identities, sequential accepted pilots, separate later migration manifests, invalidation on changed inputs, preservation of unrelated work.   |
| Maintenance is assumed but no supported response path exists              | GATE-08 runbook/support/incident targets and explicit observation arrangement; any unavailable service remains a declared gap.                               |

Unresolved hard correctness, rights, credential-isolation or required-assurance failures block promotion; an agent cannot reduce a risk by changing its label or waiving an invariant.
Any acceptable residual limitation needs a recorded owner decision, rationale, compensating evidence and reassessment trigger before stable promotion.

Replan or rebaseline when:

- A suitable maintained native capability removes a proposed custom responsibility.
- Native packaging cannot meet the accepted rights/platform/parity constraints; reassess isolated wheel delivery explicitly.
- A current dependency release changes sentence/literal behavior, report kinds, lint defaults, or support policy.
- The owner changes package license, deployment/registry model, supported platforms, or intended consumer scope.
- Another repository needs arbitrary plugins, cross-root links, MDX, or remote-link validation.
- Accepted full-check resource bounds are breached and justify conditional v1.1; if selective checking cannot account for unchanged referrers, retain full checking and reconsider the optimization.
- Observed resource use or operational burden exceeds accepted bounds, or two pilots reveal that configuration hides duplicated behavior rather than removing it.
- Consumer visibility/event access, npm publication support or attestation entitlement invalidates the accepted CI/provenance design.
- Default diagnostics, preset/schema compatibility, support scope or incident/recovery targets change.
- An NSH-01 override becomes necessary, or rights/security review changes the selected reuse approach.
- Candidate inputs change after frozen assurance; identify affected evidence instead of reusing stale receipts.

## 13. Planning completion and implementation handoff

This draft is complete when its local Markdown syntax/layout, references, ID traceability, dependency ordering, and authority/evidence claims have been checked and the saved result is reviewable.
That is a planning-document result, not package verification or baseline acceptance.

The implementation handoff records: accepted revision/digest; actual target checkout and active applicability; approved source/rights and software selection evidence; actual risk route/scopes; supported platform/preset contract; executing app/session and separately authorized independent review context; AC evidence index and frozen manifest; milestone/slice/profile coverage; CI trust decision; support/recovery targets; remaining gates; and separately authorized delivery effects.
Capture the accepted baseline with native HISEW support only after real acceptance, then start the corresponding R2 execution.
Do not reuse another task's execution or profiles without demonstrated package coverage and appropriate authorization.

v1.0 implementation completion requires the exact qualified shipped tuple, both accepted pilot outcomes, the release/support/recovery evidence, and the authorized registry/consumer delivery boundaries actually reached.
Remaining fleet adoptions stay explicitly pending until their individual gates close.
REQ-009/QA-006/SLICE-005 remain explicitly deferred unless a measured need and separate v1.1 baseline are accepted; an optional Action may remain absent.
No code, configuration, repository, registry release, or consumer migration is created by this plan itself.
