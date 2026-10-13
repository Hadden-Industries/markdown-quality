# Dependency-cruiser architecture hardening

Date: 13 October 2026.
Status: **accepted for implementation on 13 October 2026, with the amendment below**.
Baseline: Markdown Quality `482126f52802e1479c00caf1c9fdf9ad7d856aa9`, matching local `main`, `origin/main`, and the parent's live remote observation.

## Accepted implementation amendment

The owner requested implementation through HISEW, Node 26 `>=26.11.1`, dependency-cruiser `>=18.6.0`, and the remaining dependencies at their latest stable versions.
This instruction accepts the seven improvements and their configuration changes; the retained draft wording below records the proposal's planning history.
The owner explicitly selected R2 for the expanded supported-runtime and dependency change; full verification, independent verification, ordinary review and scoped security assessment accompany this implementation.
Retain Node 22 and 24 support and synchronize the Node 26 minimum in the existing runtime-policy authority and its consumers.
Registry research on 13 October selects dependency-cruiser 18.6.0, Acorn 8.19.0, micromark 4.0.3, micromark-extension-math 3.1.0, Prettier 3.9.10, and KaTeX 0.19.0; all other direct runtime dependencies already match their latest stable versions.
Declare the requested analyzer range, lock its exact selected resolution with native npm, and preserve production/development categories and native payloads.
The existing signed-commit and publication authority in this thread applies to implementation checkpoints; include this plan at the first commit point and reserve external review for the consolidated final candidate.
No package release or deployment is requested.

## Purpose and authority

Make architecture regressions fail ordinary verification and give maintainers useful, reproducible explanations of imports, shipment boundaries and dependency direction.
Implement the seven selected improvements through dependency-cruiser's supported capabilities and the existing package/test infrastructure.
A graph remains evidence about imports; it does not establish complete behavioral coverage, resource presence, native provenance or product quality.

The user authorized this detailed plan under `docs/plans/`, including research and document-only validation.
The REQ, AC, QA, DEC, risk route, configuration changes and slices below are **proposed decisions**, not an accepted native requirement snapshot.
Prior acceptance of the initial dependency-cruiser integration or security remediation does not authorize these new changes.
Implementation, installation, workflow mutation, scans, reviews, commits, publication and release remain outside this planning task.
No missing implementation approval prevents saving a coherent draft.

The implementation decision owner is the repository owner; the future implementation actor owns integration and evidence within that acceptance.
Accept one identified revision and its configuration table before implementation, recording any amendments explicitly.
At the first future authorized commit checkpoint, commit the accepted plan with its scope before or alongside the first implementation slice, as the actual commit gates require.
Do not commit this draft without commit authority.

This plan extends the delivered [initial integration plan](2026-10-10-markdown-quality-dependency-cruiser-implementation-plan.md) and current [maintainer contract](../dependency-graph-and-tests.md).
The initial plan's retained draft header is historical; its implementation and later acceptance are not reopened here.
The [CI proof-reuse baseline](ci-verification-reuse.md) continues to own hosted reuse.

HISEW `0.1.0-dev.21` planning/routing methods were read from the installed `hisew-dev` plugin, including engine invocation, engineering principles, risk routes, workflow progression, verification, software selection and resource retention.
Read-only `inspect-project-applicability` returned `personal`, `active: true` for the explicit Markdown Quality directory.
Native profile inspection returned `risk-route-not-selected`; no execution was started, selected, adopted or altered.
Existing configuration and evidence roots are `C:/Users/maksy/.hi/w/c` and `C:/Users/maksy/.hi/w/e`; they are not a grant to write arbitrary files there.
This maintained plan needs no supplemental workflow artifact.
Future operator evidence/scratch first requires the current native `inspect-environment` storage and ownership disposition, never a historical `.sdlc` fallback.

## 1. Baseline and constraints

### What exists

| Area                         | Observed baseline and implication                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native adapter               | [scripts/dependency-graph.js](../../scripts/dependency-graph.js) captures every authored JS/MJS/CJS root under `src`, `scripts`, and `test` before display filtering. Public `cruise` and `format` own resolution, validation and reachability. External packages are leaves.                                                                                                                        |
| Architecture policy          | [.dependency-cruiser.json](../../.dependency-cruiser.json) errors on unresolved imports, `src` importing `scripts`/`test`, and runtime `npm-dev` edges; all native import cycles currently warn.                                                                                                                                                                                                     |
| Missing full-suite assertion | Graph fixtures verify rule behavior. The real-repository graph use in [affected tests](../../test/affected-tests.test.js) checks generated-consumer selection. `captureGraph` can return a graph containing errors. The bundle CLI publishes diagnostics and then fails; the selector chooses `full` for `native-rule-error`. Neither establishes an architecture assertion inside the normal suite. |
| Ordinary verification        | `npm test` uses `node --test test/*.test.js`. [scripts/verify.js](../../scripts/verify.js) independently discovers all top-level `.test.js` files and also checks license/native/Python evidence, syntax, layout and Markdown/link inventory.                                                                                                                                                        |
| Shipment                     | [scripts/pack.js](../../scripts/pack.js) copies `metadata.files` into a temporary core, generates `assets/source-identity.json`, rewrites core package metadata, then invokes native `npm pack --ignore-scripts --json` for core and platform packages. Root metadata is not the final staged manifest.                                                                                              |
| Consumer proof               | [test/packaging.test.js](../../test/packaging.test.js) uses actual archives, root/isolated installs and offline execution. It asserts that scripts, tests and the analyzer are absent from consumer archives/installations. Archive-mode, native rights and provenance checks are separate obligations.                                                                                              |
| Selector safety              | [scripts/affected-tests.js](../../scripts/affected-tests.js), [test outcomes](../../scripts/test-outcomes.js) and [.test-impact.json](../../.test-impact.json) already implement explicit immutable baselines, old/current reverse unions, independent test inventory, conservative full fallback, declared relations and negative full shadow. Preserve them.                                       |
| Runtime contract             | Package version `1.0.3`, native ESM, AGPL-3.0-only; [package metadata](../../package.json) owns Node engines. [Node support](../../assets/node-support.json) owns minimum/reference/platform policy; [.python-version](../../.python-version) is `3.15.0`. There is no root Node pin.                                                                                                                |
| Live observation             | Parent capture on 13 October: dependency-cruiser `18.5.0`, Node `24.21.0`, 130 records, 33 source modules, 630 edges, zero violations of any severity. This is source analysis, not full or installed-product qualification.                                                                                                                                                                         |

The current Node engines expression is `^22.23.3 || ^24.21.0 || >=26.10.0`.
The live source graph has no native import SCC to repair and no runtime `npm-no-pkg` finding.
Three authoring edges are classified `npm-no-pkg`: the selector's Acorn use and the security test's `micromark` and `micromark-extension-math` imports.
Acorn currently comes from the analyzer's installed tree through `createRequire`; its sole responsibility is risky-syntax detection, not import resolution.

The read-only OwlAPI comparison is delivered main `e9adc821688928e7a494eb59f76b7cedab79faa1`, including hardening `48b86fc681a4d5e103c7ecfc7c454512582a8f1c`, follow-up `034e75f68c313f3875917a32073fab331786b4e8`, and rights repair `238d1f358210d103d2c92a1b9fd8e3d57a3d6ac2`.
Its native pack inventory, narrow transitive rules and native reports are useful reference patterns, not Markdown Quality policy.
Its browser fixture did not qualify the actual browser graph; its unsuccessful affected-test experiments did not authorize CI narrowing.
Markdown Quality retains its independently implemented selector and full/shadow controls.
No OwlAPI source is copied by this plan.

### Scope and non-goals

Scope covers the real-repository gate; native shipment closure; narrow foundational contracts; runtime import-cycle errors; runtime undeclared-package protection with separate tooling policy; shared-tooling direction; and optional native focus, reverse-dependents, metrics and advisory entrypoint reachability.

Product APIs, CLI formatting/linting behavior, schemas, presets, native executables, concurrency defaults, publication admission, authenticated CI reuse and full qualification keep their accepted meanings.
No browser graph, Jest migration, generic architecture framework, new resolver, packlist implementation, automatic dead-code removal, metric threshold gate, persistent graph cache, remote UI, hosted report upload or required-CI selection is proposed.
No directory reorganization or helper consolidation is justified merely by graph density or matching text.

## 2. Draft risk route

**Risk class:** R1, ordinary bounded engineering change, conditional on preserving staging output and identity derivation/admission contracts for the same candidate, apart from the accepted manifest/development-dependency delta, and retaining all existing assurance contracts.

**Decision owner:** Repository owner, accepting this exact draft or an amended revision.

**Reasoning:** The intended changed behavior is earlier developer verification failure and optional diagnostic views.
False positives block development; false negatives miss architecture defects.
Both are detectable with independent mutation/consumer fixtures and reversible in the tooling change.
No intended persistent-data migration, runtime/public behavior change, privileged CI decision or concurrency change establishes an R2/R3 trigger.
A release-stage extraction deserves explicit equivalence proof, but adjacency to the previous R2 selector does not itself make this change R2.

**Potential blast radius:** Maintainer commands, ordinary Node tests, the full pipeline and source package staging.
Consumers can be affected indirectly if staging equivalence or dependency categories are changed incorrectly.
Do not expand the route's assumptions into a claim that every development tool is low risk.

**Reversibility:** Revert the coherent accepted source/configuration/dependency change, regenerate the lock with native npm when necessary, and requalify the retained supported state.
A source revert cannot retract a published package or restore old evidence identities.
No public release or historical evidence rewrite is authorized.

**Principal unknowns:** Staged packlist fidelity, supported-version predicate behavior, added gate cost and exact lock/notice changes.
Resolve them with the bounded experiments in section 10 before dependent implementation.

**Required artifacts:** This accepted brief/plan, precise configuration decision, focused/final evidence and review dispositions in the existing task or native evidence store.
An extra issue, ADR, tracked diary or release campaign is not inherently required.

**Required specialist lenses:** Ordinary correctness/principles review.
HISEW SEC-01 specifically triggers scoped native security assessment for the proposed filesystem/process input boundary and changed dependencies.
Assess the final changed adapter, literal path admission, staging containment and dependency delta; do not infer a repository-wide scan, independent verifier or repeated specialist fan-out from the route.
If the final implementation omits a trigger, retain an explicit supported disposition.

**Required verification:** Affected checks plus the binding outcome that ordinary full verification fails real architecture violations.
Use the actual unchanged full profile once on the settled candidate because this change modifies a full-suite gate and shipment-stage integration.
Its package/native/Python/Markdown obligations remain distinct from the architecture check.
R1 does not independently mandate a second vendor's repeated full execution.

**Required human approvals:** Acceptance of the proposed invariants, exact configuration/dependency table and implementation scope.
Commit, push, merge, scan/provider and release actions retain their separately applicable authority.
A future approved lifecycle need not pause repeatedly at every slice boundary.

**Maximum sensible autonomy:** Now, complete this draft and its document-only checks.
After acceptance, implement within the bounded slices and accepted effects, preserving unrelated work and native execution ownership.

**Next lifecycle step:** Owner accepts the plan revision and decisions; then resolve current HISEW applicability, ownership and required controls for the new work before implementation.
Capture any baseline demanded by the accepted route through supported native operations; prose is not a receipt or snapshot.

Re-route before introducing unexpected package payload/export changes or changing source-identity derivation/admission contracts, supported runtime behavior, publication or CI trust, required test coverage, resolver containment, resource ceilings or difficult recovery.
Such changes can trigger R2 with a prior protected baseline, independent verification and relevant specialists.
Routine new candidate HEAD, tree and source-identity digest values are expected; staging equivalence compares the old and extracted implementations for the same candidate, allowing the explicitly accepted manifest/development-dependency delta.
A native capability gap is not permission to weaken a gate, introduce a shim or silently select an older tool.

## 3. Requirements and falsifiable acceptance

IDs are local to this plan and become normative only through acceptance.

| Requirement                                                     | Acceptance criterion                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: Make actual architecture violations fail normal proof. | AC-001: A top-level Node architecture test and a narrowly named standalone check inspect the actual candidate; native error findings, malformed analysis or incomplete shipment evidence fail nonzero without requiring a graph bundle. The existing runner and full pipeline still discover all tests.                                     |
| REQ-002: Close runtime imports over the actual shipped core.    | AC-002: Every first-party dependency of every admitted runtime JS-family module, including disconnected roots, resolves to npm-admitted staged/archive membership. Omitted imported files, missing package entrypoints and wrong stage/source identity fail. Schemas/assets/platform payloads retain separate presence and installed proof. |
| REQ-003: Protect foundational direction.                        | AC-003: The named foundations cannot directly or transitively reach the named orchestration set. Current permitted dependencies and ordinary orchestration/re-exports pass. Native rule findings identify the violating boundary/path.                                                                                                      |
| REQ-004: Reject runtime native import cycles.                   | AC-004: Self, direct, indirect, disconnected and overlapping/enlarged runtime cycles fail. An unrelated valid graph passes. Declared worker/process relations do not become native imports or cycle evidence.                                                                                                                               |
| REQ-005: Declare package ownership explicitly.                  | AC-005: Runtime `npm-no-pkg` edges error. Tooling receives its own rule after the three known imports have an accepted declaration/exception disposition. Clean install and current consumer proof preserve production categories, the KaTeX override and analyzer exclusion.                                                               |
| REQ-006: Keep shared tooling upstream of command orchestration. | AC-006: Shared command invocation, Node policy, Python target and CI-reuse validation cannot transitively import named release/command orchestrators. Their intended consumers and validation contracts continue to work.                                                                                                                   |
| REQ-007: Provide native diagnostic views.                       | AC-007: A literal focus produces native neighborhood and complete reverse-dependent views, native extracted metrics and entrypoint reachability advice from the same full captured graph/snapshot. Unknown/unsafe paths fail; unreachable and metrics never decide deletion, selection or success.                                          |
| REQ-008: Preserve existing safety and evidence boundaries.      | AC-008: Graph/version/lock identity is accurate; data-only config, bounded isolated extraction, external publication containment and failure preservation remain effective. Full fallback, independent inventory and negative shadow continue to catch deliberately omitted failing consumers.                                              |
| REQ-009: Preserve packaging, proof and lifecycle semantics.     | AC-009: Staging equivalence and actual archive/installed checks pass without introducing a second packager, changing authenticated reuse or reducing native/Python/Markdown checks. Maintainers can recover and clean owned resources without losing failures.                                                                              |

| Quality scenario                                   | Stimulus, observable response and independent oracle                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001: Architecture is enforceable                | Inject a prohibited source edge into an owned fixture/candidate copy. The normal architecture test fails even when the selector falls back to full and all unrelated tests pass. Remove it; the same check passes. A fixture disabling/omitting the architecture assertion must be detected by the integration test. |
| QA-002: Shipment is faithful                       | A shipped module imports an existing local file omitted by native pack admission; source resolution succeeds but shipment closure fails. Compare dry-run membership with a real archive from the same staged bytes, including nested ignore behavior and generated metadata.                                         |
| QA-003: Transitive boundaries are real             | Insert a neutral intermediate module between each foundation/shared-tooling root and a forbidden orchestrator. Native reachability still fails; an allowed dependency and caller-to-foundation direction pass.                                                                                                       |
| QA-004: Cycles remain errors                       | Add each cycle shape, including a cycle in a standalone runtime component and one enlarged by an overlapping path. All fail without an SCC allowlist; an acyclic diamond and separate valid component pass.                                                                                                          |
| QA-005: Dependency ownership survives installation | Add a resolvable undeclared runtime package and an undeclared tooling import separately. Each fails its own rule. The accepted direct dev declarations pass from a clean lock install; installed runtime consumers still omit developer-only tooling.                                                                |
| QA-006: Diagnostics are truthful                   | Focus a Unicode/space/regex-punctuation filename. Only literal native matches appear; a two-hop dependent is included in reverse reachability. Actual JS roots are covered while schema/Python exports are identified as resources. An importer-free module remains advisory.                                        |
| QA-007: Trust boundaries stay bounded              | Supply escaping/linked/option-like paths, malicious executable config markers, malformed/oversized npm output, graph drift, dependency identity mismatch and subprocess failure. Refuse before unsafe effects; retain bounded diagnostics and remove only owned released temporary material.                         |
| QA-008: Selection never launders failure           | Preserve old/current edge-removal and deleted-source cases, changed controls/resources, authoritative staged/unstaged/untracked seeds, marker-as-data cancellation tests and a deliberately missed seeded failure. Full or shadow disagreement stays nonzero.                                                        |
| QA-009: Cost remains proportionate                 | Measure architecture-only and optional-report elapsed time and resource use on the same settled source/runtime, including npm dry run and cleanup. Stay within existing finite limits and the 900-second profile budget; a measured breach blocks promotion and triggers a specific design decision.                 |
| QA-010: Delivered boundaries agree                 | Actual core and native archives retain accepted identities, licenses, modes, resources and offline root/isolated execution. Hosted full qualification/reuse, when publication is authorized, reports its genuine evidence class and exact candidate.                                                                 |

## 4. Native reuse and current-version research

Research refreshed on 13 October 2026.
The question is how to enforce repository-specific contracts and render useful views using native import and shipment semantics, without creating parallel authorities.

| Candidate/capability          | Evidence, fit and selection                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dependency-cruiser public API | Installed `18.5.0` source/types and tagged `18.6.0` API/types confirm `cruise`, `format`, `validate`/`ruleSet`, `to.reachable`, `to.circular`, `npm-no-pkg`, `focus`, `reaches`, Mermaid and metrics. Select these supported capabilities. Native options/config/graph validation remains authoritative.                                                                                                                  |
| Native npm pack               | npm `12.2.0` is installed with the selected Node installation. Official pack documentation and installed source support `--dry-run --json --ignore-scripts`; the pack command obtains contents through the native packing route. Select this against the actual staged core. It avoids a complete multi-platform release build merely to extract membership; dry run can still perform packing work and must be measured. |
| Direct npm-packlist library   | Maintained native library can derive files, but direct use would require additional ownership/integration and still cannot infer Markdown Quality's staged manifest. Prefer the already used npm CLI and prove equality to the real pack route. Reconsider only if a demonstrated CLI cost/contract problem warrants it.                                                                                                  |
| ESLint restricted imports     | Useful for direct import restrictions; it does not by itself supply the transitive graph, native package classification and shipment/report requirements here. Retain ESLint's existing product role instead of duplicating the dependency policy in it.                                                                                                                                                                  |
| Existing repository helpers   | Reuse bounded snapshot/path admission, native graph validation, shell-free npm invocation, pack staging policy and neutral fixture construction when their contracts align. Preserve independently specified expectations.                                                                                                                                                                                                |
| Existing affected coordinator | Keep its old/current native reachability and non-import safety model. The native CLI's convenient affected option is not a qualified replacement for its accepted baselines, resources, shadow and failure contracts.                                                                                                                                                                                                     |

Primary references: [dependency-cruiser 18.6.0 release](https://github.com/sverweij/dependency-cruiser/releases/tag/v18.6.0), [public API](https://github.com/sverweij/dependency-cruiser/blob/v18.6.0/doc/api.md), [rules reference](https://github.com/sverweij/dependency-cruiser/blob/v18.6.0/doc/rules-reference.md), [options and format types](https://github.com/sverweij/dependency-cruiser/blob/v18.6.0/types/options.d.mts), [npm pack](https://docs.npmjs.com/cli/v12/commands/npm-pack/), [npm-packlist](https://github.com/npm/npm-packlist), and [ESLint restricted imports](https://eslint.org/docs/latest/rules/no-restricted-imports).
The installed adapter's explicit resolver conditions are `node`, `import`, `default`; none of these sources qualifies browser/import-map semantics.

### Exact version and rights disposition

Authoritative registry metadata reports these current stable candidates, distinct from the installed baseline:

| Component                | Locked now          | Proposed development selection                                      | Checked source                                                                                                               |
| ------------------------ | ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| dependency-cruiser       | `18.5.0`            | `18.6.0`                                                            | [Registry metadata](https://registry.npmjs.org/dependency-cruiser/18.6.0); source `59606f7133843b190aa328c95d5c676631ca45f1` |
| Acorn                    | Transitive `8.18.0` | Direct dev `8.19.0`, also the exact dependency of analyzer `18.6.0` | [Registry metadata](https://registry.npmjs.org/acorn/8.19.0); source `0e0ece7cc7202624d4aca531be4b515b0114b5d0`              |
| micromark                | Transitive `4.0.3`  | Direct dev `4.0.3`                                                  | [Registry metadata](https://registry.npmjs.org/micromark/4.0.3)                                                              |
| micromark-extension-math | Transitive `3.1.0`  | Direct dev `3.1.0`                                                  | [Registry metadata](https://registry.npmjs.org/micromark-extension-math/3.1.0)                                               |

The analyzer's `18.6.0` integrity is `sha512-It7NW5AmCDBCLMq7I91Nfu8VRKzrIE6S+M/FMQzALDceJ0B1PWRHo77q9YJg/HwyBBEWHVtOuTptIQki+xecOw==`.
Native npm must generate the accepted exact lock; do not hand-author transitive lock entries.
Recheck stable metadata, release restrictions and material dependency changes before incorporation, then freeze the selection during verification.
No older-version exception or floating install is proposed.
Latest-version integration is unverified here; no package was installed.

The exact tagged analyzer/Acorn license texts and installed micromark/math license texts were inspected: all carry MIT terms with copyright/permission-notice retention and warranty limitations.
The product remains AGPL-3.0-only; developer tooling is not added to runtime dependency categories.
This supports the technical rights recommendation for the named use, not a fabricated completed legal clearance for a future lock.
Before adoption, inspect the actual transitive lock delta and all applicable notices/terms, retain attribution for any incorporated source, and resolve material unknowns with the owner.
Keep the existing `micromark-extension-math.katex = 0.19.0` security override unless a separately accepted change supersedes it.
Existing native binary/MPL/source-offer evidence is unaffected and still independently checked.

Exact license sources include [analyzer MIT text](https://github.com/sverweij/dependency-cruiser/blob/v18.6.0/LICENSE) and [Acorn MIT text](https://github.com/acornjs/acorn/blob/8.19.0/acorn/LICENSE); micromark/math texts are in the installed exact-version packages.
No new hosted service, account, telemetry, registry publication or report upload is selected.
Normal dependency acquisition may need registry access under the future authorized install; graph/report use remains local.

The residual custom gap is small: compose native findings with repository-specific shipment/entrypoint identities, expose the failure status, safely map literal requested paths, and explain the results.
No custom import parser, transitive walker, cycle algorithm, metrics formula, npm inclusion grammar, schema dialect or second packager is authorized.

## 5. Decisions and exact configuration proposal

All decisions below await acceptance.

| Decision | Recommended behavior and reason                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001  | Add a narrow architecture-check operation and top-level `node:test` assertion using the same existing graph adapter. Keep capture/reporting able to retain an error-containing graph; the assertion owns success/failure.                                        |
| DEC-002  | Share only the current core-staging policy between the release packer and shipment inspection, then ask native npm for admitted membership. Bind the source graph, stage bytes, staged manifest and pack inventory. Installed/archive proof remains independent. |
| DEC-003  | Protect the four named foundational modules from the explicit orchestration set through native transitive rules. Do not claim broad functional purity or redesign runtime layering.                                                                              |
| DEC-004  | Runtime native import cycles become errors with no baseline exceptions. Preserve a separately named warning for authoring-only cycles; any runtime-involving cycle is an error. Folder cycles remain optional advice.                                            |
| DEC-005  | Use the four exact dev selections above, including explicit ownership of the three intentional authoring imports; add separate runtime and tooling `npm-no-pkg` rules. Preserve the Acorn syntax-guard role and current runtime categories.                      |
| DEC-006  | Protect the four shared-tooling modules from the explicit orchestration set using native transitive rules. Keep their current side effects and consumers; change direction policy without a cleanliness refactor.                                                |
| DEC-007  | Add optional literal `--focus <repository-relative-module>` to graph bundles, native focus/reaches views, extracted metrics and advisory entrypoint reachability. Every view derives from one admitted full capture.                                             |
| DEC-008  | Derive reported analyzer identity from the admitted installed package and lock agreement. Reuse that identity for graph provenance and affected reports; reject mismatches. Keep snapshot, resolver, output and selector safety controls.                        |
| DEC-009  | Keep the existing full pipeline, HISEW profiles, CI reuse and publication proof. The new ordinary test participates naturally in each applicable full candidate.                                                                                                 |

| Configuration/file surface              | Exact proposed change                                                                                                                                                                                          | Default or pipeline effect                                                                                                            | Acceptance boundary                                                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`, native lock             | Dev dependencies: analyzer `18.6.0`, Acorn `8.19.0`, micromark `4.0.3`, math extension `3.1.0`; regenerate only the justified lock delta.                                                                      | Updates analyzer/parser; makes existing authoring imports explicit. Production/optional categories and override retain their meaning. | Owner accepts versions, categories, lock and notice scope; actual install/rights/consumer proof required.                                                   |
| `package.json` scripts                  | Add `check:architecture` for the narrow status command.                                                                                                                                                        | Optional focused invocation; `npm test`/`check:full` discover the new architecture test automatically.                                | Do not replace test discovery or add a second full run to `verify.js`.                                                                                      |
| `.dependency-cruiser.json`              | Add the named transitive foundation/tooling contracts; runtime `npm-no-pkg` error and distinct tooling error after declarations; replace global cycle warning with runtime error and authoring warning scopes. | Actual violations become ordinary test failures. No grandfathered runtime cycle allowance.                                            | Exact source/target sets below; prove selected native predicates before activation.                                                                         |
| Trusted graph composition               | Derive shipment membership and advisory roots from native admitted data; use native `metrics: true` for report captures.                                                                                       | Metrics are optional report extraction work; gate/selector need no metrics overhead. Native errors retain status.                     | Any local option allowlist extension is only the bounded boolean/explicit trusted option needed; no executable config, plugin, cache or reporter discovery. |
| Graph CLI/bundle                        | Optional `--focus` and additive focus/reverse/metrics/advisory outputs; existing overview/runtime/tests/raw/relations/provenance remain.                                                                       | No default remote write or required output. Unknown or unsafe focus fails before output publication.                                  | Document new fields and version the bundle provenance if its existing contract requires it; no reader shim.                                                 |
| `.test-impact.json`, HISEW profiles, CI | No policy relaxation or profile mutation proposed.                                                                                                                                                             | No-base affected stays full JS; full pipeline and authenticated CI reuse remain.                                                      | A demonstrably necessary relation amendment or profile change needs its own exact decision; do not bundle speculative optimization.                         |

The exact proposed package script is `"check:architecture": "node scripts/check-architecture.js"`.

The alternative to direct declarations is a narrowly owned, named tooling exception for each exact import and consumer, with package/lock identity, rights evidence, positive/negative tests and reassessment on analyzer/consumer change.
It avoids declaring intentional transitive use but leaves ownership coupled to another package's tree.
Direct declarations are recommended because the imports are intentional maintained consumers and the latest analyzer already selects the proposed Acorn.
Do not activate a blanket tooling error first and silently suppress its existing findings afterward.

### Foundational and shared-tooling contracts

The proposed foundation origins are exactly:

- `src/contracts.js`: metadata, errors, limits and small common contracts; current local source dependencies: none.
  Filesystem/crypto use is legitimate.
- `src/preset.js`: accepted policy defaults; current local source dependencies: none.
- `src/document-analysis-pool.js`: pool contract; current local source dependency: `contracts.js`.
- `src/native-tool.js`: native identity/selection/invocation boundary; current local source dependency: `contracts.js`.
  Filesystem/process work is intentional.

For these origins, forbid native direct or transitive reachability to exactly `src/cli.js`, `src/qualification-cli.js`, `src/quality.js`, `src/execution.js`, `src/execution-worker.js`, `src/qualification.js`, and `src/qualification-runner.js`.
This protects the selected foundational-to-orchestration invariant without freezing every possible future internal helper.
A proposed additional boundary such as document analysis or formatting needs an explicit rationale and accepted target set.
Do not label `analysis.js` pure: it uses filesystem, ESLint and configuration.
`formatting.js` invokes native checks; `quality.js` intentionally imports/re-exports many subsystems; `qualification-runner.js` intentionally imports `qualification.js`.

Shared-tooling origins are exactly `scripts/commands.js`, `scripts/node-matrix.js`, `scripts/python-target.js`, and `scripts/ci-reuse.js`.
Forbid native direct or transitive reachability from these origins to `scripts/pack.js`, `scripts/ci-reuse-command.js`, `scripts/release-assets.js`, `scripts/verify-publication.js`, `scripts/qualify-public-registry.mjs`, `scripts/shared-qualification.mjs`, and `scripts/verify.js`.
If the chosen staging seam introduces another command-orchestration module, classify it explicitly before adding it to this set.

Permitted current directions include `node-matrix -> commands`, `ci-reuse -> node-matrix/python-target`, and `ci-reuse-command -> ci-reuse/commands`.
Packer, release-assets and publication verification consume Node policy; full verification consumes Python policy; shared/registry qualification consume command invocation.
`node-matrix.js` has an intentional CLI-only metadata fetch, so its invariant is dependency direction, not side-effect-free purity.
CI-reuse validation retains authenticated proof admission and its closed expected-job inventory.

## 6. Architecture seams and DRY-01 authority

Names here predict responsibilities, not final filenames or implementation line numbers.
The proposed `scripts/check-architecture.js` entrypoint backs the exact package script above; a discoverable `test/architecture.test.js` exercises the same assertion, whose reusable composition stays beside the graph adapter unless a separate module has a coherent responsibility.
If needed, a `scripts/core-package-stage.js` seam owns core-stage construction shared with `packRelease`; it must not turn into another release orchestrator.

| Material rule/domain and current authority                                                         | Latest consumers and boundary                                                                       | Strategy and deliberate separation/drift control                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import semantics and transitive predicates: selected dependency-cruiser public contract            | Capture worker, architecture assertion, graph views and affected coordinator in one source checkout | Share the admitted API adapter. Native schemas/options and mutation fixtures validate it; no second resolver/walker.                                                                                                                                                               |
| Architecture meaning: accepted rule definitions and this dossier                                   | Ordinary test, standalone command and maintainer reports                                            | One data-only policy with trusted derived membership. Keep explicit independently authored expected violations so a shared policy bug cannot bless itself.                                                                                                                         |
| Core staging: current `packRelease` transformation of package metadata and `files`                 | Release packer and new shipment reader share source, package and failure boundaries                 | Extract only compatible stage construction; native npm owns inclusion. Preserve release-only rights/native/archive steps. Compare output against independent actual archive fixtures, not two calls to the shared helper.                                                          |
| Package declaration: root manifest and native generated lock                                       | Analyzer classification, syntax guard, security tests and package consumers                         | Direct dev ownership, native lock generation and exact-version admission. Runtime package dependencies are a different authority from development tool availability.                                                                                                               |
| Analyzer identity: installed manifest admitted against current lock                                | Graph provenance and affected result fields currently hardcode `18.5.0`                             | Derive one current identity and reuse it; reject disagreement. Immutable old reports keep their historical version.                                                                                                                                                                |
| Entrypoint meaning: package bins/exports plus reviewed process relations                           | Reachability report, packaging entrypoint proof and existing affected relation consumers            | Derive current JS roots and resource entries; map approved process roles from existing relations. Runtime reachability and test impact have different meanings; retain explicit classification and fixture conformance rather than treating every test relation as a runtime root. |
| Node/Python policy: `assets/node-support.json` and `.python-version`, consumed by existing modules | Pack/release/CI validators, verification and qualified runtime matrix                               | Reuse current accessors and protect direction. Do not copy versions or centralize runtime execution with policy validation.                                                                                                                                                        |
| Full/affected evidence: accepted selector and CI-reuse contracts                                   | Local coordinator, native profiles, full verifier and GitHub workflow                               | Deliberately separate local graph/selection observations from authenticated hosted reuse. Their trust and failure boundaries differ; existing negative tests are drift controls.                                                                                                   |

The owner accepts retained separation; the implementation reviewer checks the latest consumers and reasons for change at integration.
Reassess on a real new consumer, changed stage semantics or detected drift.
No universal helper, policy service, compatibility alias or old/new consumer bridge is proposed.
No prior NSH-01 override covers a new shim.
NAM-01 requires names such as “native import cycle” and “advisory unreachable” to preserve their actual meaning; a count or report must not claim runtime calls or unused code.

### Shipment closure detail

Use two explicitly related observations: the full authored source graph and native inventory of the same candidate's staged core.
Capture identities before/after stage construction and analysis; reject drift.
The inventory records staged manifest and admitted file names with bounded normalized paths, relevant byte digests, npm/Node identity and source/package/lock identities.
Verify that each analyzed runtime source corresponds byte-for-byte to its staged counterpart.
Generated `assets/source-identity.json` and rewritten `package.json` have their own stage identities; never equate them blindly with source bytes.

Ask native npm to inspect that owned stage with lifecycle scripts disabled.
Parse its supported JSON response, require the expected single core package, bounded regular contained paths and no duplicate/case-colliding or ambiguous entries.
Native npm owns `files`, ignore, default inclusion and manifest semantics.
Local checks only enforce this consumer's expected response, containment, sizes and identity; do not recreate npm's inclusion grammar.

Apply closure to all admitted runtime JS-family modules, not just those reachable from public roots.
A native-resolved first-party dependency outside admitted membership is an error even if it exists in the source checkout.
A disconnected shipped module importing an unshipped module must fail.
Derive a native path restriction from the admitted set with literal escaping, or use a bounded membership comparison over native-resolved edges where native predicates cannot express the exact contract.
That comparison may not resolve an import, infer transitive edges or whitelist by directory alone.
Independently validate all manifest-declared runtime entrypoints are admitted, so a missing root cannot disappear from the analysis.

The preferred implementation reuses the full source graph with proven stage/source equality; if a staged graph is necessary, extend the bounded adapter with explicit admitted roots and stage containment rather than assuming `scripts`/`test` exist in the stage.
Do not relax the selector's historical-snapshot contract or import historical executable configuration.
Validate candidate package classification against the correct manifest and document any source/staged dependency-class difference.

JSON schema exports, Python observer assets, `assets/.editorconfig`, native manifests and platform executables are not all JavaScript imports.
Native optional packages are separate archives with their existing identity/mode/rights checks.
Their presence and runtime availability remain archive/installed/qualification obligations.
Do not invoke full native builds or the entire release pack merely to discover core membership.
Use the existing actual packaging test to prove dry-run/real-archive agreement and unchanged release behavior.

### Report and entrypoint detail

Capture the full graph once for a bundle, with native metrics enabled at extraction.
A metrics reporter cannot recover metrics omitted by extraction.
Then invoke native `format` for overview/runtime/tests, focus neighborhood, reverse dependents and metrics.
`focus` means the selected modules and immediate neighbors; `reaches` means modules reaching the selected seeds transitively.
Do not relabel one as the other, filter the capture roots first or recalculate metrics locally.

Accept one optional literal repository-relative module path; validate existing safe path/containment rules and full-graph membership before escaping it for an anchored native pattern.
Spaces, Unicode and regex punctuation remain literal.
Unknown, escaping, absolute, linked and option-like paths fail; arbitrary regex input is outside this interface.
Keep output external, newly allocated and atomic, including failure-safe cleanup.

Build JS reachability roots from both package bins (`src/cli.js`, `src/qualification-cli.js`), the root JS export (`src/quality.js`), and reviewed runtime process entrypoints (`src/document-worker.js`, `src/execution-worker.js`, `src/qualification-runner.js`).
Exclude schema JSON and Python export values from JS roots while retaining them as separately labelled required resources.
Validate current export shapes; conditional/pattern exports need explicit qualification, not a guessed flattening algorithm.

Use native reachability from those roots as an advisory result over all runtime modules.
Declared process roots/relations remain visibly separate from parsed imports.
`qualification-evidence.js` currently has tooling/test consumers without a source importer: this is useful advice, not deletion authorization.
Native module/folder coupling counts are descriptive; no “bad architecture” threshold is adopted.
For the mostly flat `src` tree, folder-cycle views are low value: provide optional labelled advice only if an informative grouping and the selected version's limited `scope: folder` predicates are demonstrated.
No custom logical process-cycle detector belongs here.

## 7. Observable implementation slices

One integration owner consolidates shared adapter/policy changes.
Within a slice, proof is part of the behavior; test writing is not deferred to a later horizontal phase.
After accepted interfaces settle, read-only research or independent fixture design may proceed separately, but this plan authorizes no further agents or concurrent writes.
Slices 3 and 4 have distinct policy meanings; shared-file edits must still be serialized.

### SLICE-001: Ordinary verification rejects a real architecture error

Outcome: a maintainer can run a narrow architecture command, and the ordinary Node suite fails an actual error-containing repository graph without creating a bundle.

Use the existing capture and native validation boundary; add one reusable assertion/status path and one top-level integration test.
Preserve graph capture for selection/report diagnostics.
Add the accepted current analyzer update and truthful shared tool identity here so all later predicates are qualified on the selected version.
Keep exact direct package declarations and their intentional consumer treatment coherent with that upgrade.

Predicted seams: graph adapter, new architecture command/test, package metadata/lock, affected report identity and focused existing graph/selector tests.
Prove AC-001/005/008 with a real violating fixture, candidate-root assertion, independent discovery, version mismatch rejection and existing graph/selector regressions.
The first usable seam is a failing native rule in normal verification, not merely a successful graph command.
No output directory is needed; temporary negative fixtures are owned and cleaned after proof retention.

### SLICE-002: Runtime imports close over the packed core

Outcome: a source-resolvable import to an omitted package file is rejected before a consumer encounters the missing file.

Establish the narrow shared stage seam and native dry-run inventory; preserve the release packer's emitted transformations and release-only checks.
Join the admitted membership to native source edges under proven byte/manifest identity.
Integrate the result with the architecture assertion and actual packaging test.

Predicted seams: `scripts/pack.js`, a justified core-stage module, architecture composition and graph/packaging fixtures.
Prove AC-002/008/009 using disconnected origins, nested exclusions, special/default files, generated identity, drift, malformed inventory and dry-run/actual-archive comparison.
Run relevant existing packaging/packed-qualification, native and provenance checks for the changed boundary.
If staging equivalence requires an unexpected payload/export/runtime change or a change to identity derivation/admission contracts, stop this slice and re-route.
Ordinary new candidate identity values and the accepted manifest/development-dependency delta do not trigger that stop.
After evidence promotion, release the exact stage and npm temporary resources; an incomplete archive is never usable release evidence.

### SLICE-003: Foundations, runtime cycles and package ownership are enforceable

Outcome: accidental foundational-to-orchestration paths, runtime import cycles and undeclared runtime packages fail with distinguishable native rule names.

Add the accepted foundation and cycle policies, then the separately scoped tooling package policy once declarations/consumer treatment pass.
Use the complete source inventory so disconnected modules and overlapping cycles are visible.
Do not add an SCC allowance for a baseline with no cycles.
An unexpected baseline finding gets source diagnosis and an owner disposition, not a blanket exception.

Predicted seams: native JSON rules, graph/architecture fixtures, existing Acorn and security-test consumers, notices if the exact dependency delta requires them.
Prove AC-003/004/005 with direct/transitive mutations, allowed current dependencies, multiple cycle shapes, runtime/tooling classification and clean-lock consumer checks.
Update the maintainer contract in the same slice.
Policy rollback must be explicit and coherent with the earlier gate; no hidden success-on-error branch.

### SLICE-004: Shared tooling remains independent of orchestration

Outcome: validation and reusable invocation modules can continue serving pack, verification and CI callers without importing those callers.

Add the named transitive tooling rules and independent positive/negative fixtures.
Keep `node-matrix`'s intentional CLI fetch, npm-native semver and shell-free command invocation.
Keep CI-reuse validation's exact tree/parents/workflow/runtime/job/artifact controls intact.

Predicted seams: native JSON rules, architecture fixtures and existing CI-reuse/Python-target/packaging regression tests.
Prove AC-006/008/009 with each origin, intermediate forbidden paths and current valid consumers.
No CI workflow or reuse policy edit is required.
Reverse this policy slice if its accepted invariant is proven wrong, with owner amendment and affected proof.

### SLICE-005: Maintainers can inspect native focused reports and qualify the integration

Outcome: one optional focused bundle shows native neighbors, upstream dependents, metrics and qualified advice with a coherent snapshot.

Add literal focus admission, native report composition, correct mixed-language entrypoint inventory and additive provenance.
Retain full raw graph and declared relations as separate evidence.
Run the advisory folder experiment only if it answers a real grouping question; its absence does not weaken runtime cycle enforcement.
Complete command help and maintainer documentation, reconcile final resources and prepare the consolidated candidate.

Predicted seams: graph adapter/CLI, graph fixtures, maintainer docs and shared version identity.
Prove AC-007/008/009, then perform the final assurance described below after formatting, planned commits and candidate identity settle.
Publish no hosted artifacts or package merely to demonstrate local reports.
Retain accepted proof/failures; discard released exploratory bundles through the correct owned-resource route.

### Traceability and release/cleanup

| Slice     | Requirements / acceptance       | Scenarios / decisions                   | Independent proof                                                                                                 | Release and cleanup implication                                                                      |
| --------- | ------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ-001/005/008; AC-001/005/008 | QA-001/005/007/008; DEC-001/005/008/009 | Actual candidate assertion, mutated failing fixture, unchanged independent test discovery, admitted version check | Developer command/test only; no graph bundle required. Preserve failures and release owned fixtures. |
| SLICE-002 | REQ-002/008/009; AC-002/008/009 | QA-002/007/009/010; DEC-002/008/009     | Native dry-run versus actual archive, known omitted-file failure, installed consumers                             | Preserve package semantics; no registry release. Bound, identify and remove released staging.        |
| SLICE-003 | REQ-003/004/005; AC-003/004/005 | QA-003/004/005/008; DEC-003/004/005     | Independent expected boundaries/cycle mutations and clean-lock native classification                              | Activate exact accepted errors together with fixtures/declarations; no runtime exception baseline.   |
| SLICE-004 | REQ-006/008/009; AC-006/008/009 | QA-003/007/010; DEC-006/009             | Reverse-direction mutation and existing CI-reuse/Python/pack consumer assertions                                  | No workflow/reuse change; preserve hosted proof and resource responsibilities.                       |
| SLICE-005 | REQ-007/008/009; AC-007/008/009 | QA-006/007/008/009/010; DEC-007/008/009 | Literal-path native view membership, native metric presence, root/resource fixtures, final full proof             | External local reports only; atomically publish new bundles and retain current evidence ownership.   |

## 8. Oracle ownership and verification cadence

The owner accepts expected architecture meaning; tests encode that meaning independently of production policy generation.
Native dependency-cruiser owns import extraction/predicates, npm owns shipment admission, Node owns execution and the archive/installed tests own consumer behavior.
A test that computes expected membership from the same helper under test is insufficient.

Neutral file creation, native invocation and JSON parsing can be shared.
Write expected rule names, known prohibited paths, root classifications and intentionally omitted archive members independently.
Include mutation sensitivity to a missing real-repository assertion, a removed/widened rule, a false membership admission, a missing runtime process root, wrong version reporting and a filtered-before-validation graph.
Do not require a new generic mutation framework: small targeted fixtures suffice.

Use genuine bounded local processes and real native parsers for graph and npm contracts.
Mock network/provider boundaries only where existing tests already validate their consumer-shaped responses.
Do not mock the architecture verdict, npm inclusion semantics or native resolver into the desired answer.
Cancellation/timeout tests retain the existing static child marker as argument data; never interpolate marker data into JavaScript source.

### Actual current profiles versus final assurance

| Native profile | Observed invocation and limit                           | What it establishes                                                                                                                                                            |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focused`      | `npm run check:focused`, 900 seconds                    | Existing contract tests; it does not become an architecture test merely because the profile is named focused. Use explicit changed test files for useful development feedback. |
| `affected`     | `npm run check:affected` with no arguments, 900 seconds | Full current JS inventory, because no immutable base is supplied. No typed baseline/profile extension is invented.                                                             |
| `full`         | `npm run check:full`, 900 seconds                       | Existing syntax/layout/license/native/Python/complete JS/Markdown obligations, including packaging/installed tests and the new architecture test after implementation.         |

Inspection reported legacy-inherited declarations/shared-project policy and resolved Windows commands, not measured coverage or environment qualification.
Keep all profile definitions unchanged.
Resolve native required-profile obligations for the accepted execution before the first expensive run; do not infer composition/reuse from overlapping commands.
If affected and full are independently required, honor both unless the actual accepted native obligation contract admits reuse.
Do not run a manual full suite and repeat it solely to manufacture a receipt.

During editing, use explicit relevant Node files such as `test/dependency-graph.test.js`, the proposed architecture test, selector regressions, packaging/packed-qualification tests, and CI-reuse/Python-target tests where their boundaries change.
Run the changed security-regression consumer for the micromark declarations.
These checks supply feedback, not a claim that installed/Linux/hosted assurance already passed.

Before final assurance, finish authorized formatting and lint fixes, remove diagnostic scratch, inspect the precise diff and settle dependencies, staging and any authorized commit ordering.
Consolidate into one candidate before broad review.
Run the missing binding full/profile obligations on that frozen object through the governed route when native receipts are required.
Use the configured ordinary reviewer and the triggered scoped native security workflow for that same final candidate.
Fix meaningful findings with narrow repair follow-ups and affected checks; repeat broader coverage only when changed inputs/risk invalidate it.
No review, security assessment, full product test, host matrix or release evidence is claimed by this planning task.

The full route continues to check all Markdown documents/link targets and native/Python obligations; local architecture success cannot substitute for them.
Use actual Node policy minimum/latest lanes and the accepted Python target at later qualification, without silently changing runtime configuration.
A historical selector baseline with different package metadata, lock or graph policy is intentionally incompatible with this change and must select full verification.
Only a subsequently accepted immutable baseline with matching controls can demonstrate selective behavior again; do not bypass compatibility checks to obtain a speed result.
A new architecture test in the full suite changes candidate proof inputs naturally.
Authenticated CI reuse still compares the tested tree, ordered parents, workflow, runtime matrix, complete jobs and retained artifacts; no new shortcut is introduced.
Any future HISEW issue-150 capability requires live supported contract inspection before use.

## 9. Compatibility, operation and recovery

No persistent data migration, backfill or reconciliation job is needed.
Existing graph bundles and test reports remain historical evidence with their original tool/candidate identities.
New report fields must have explicit documented meaning; if an existing machine consumer requires a schema change, qualify and update that current consumer together.
Do not add a silent old/new schema shim or overwrite old bundles.

The implementation adds development declarations and gate behavior, not installed product imports of developer tools.
Actual package bytes can differ only through explicitly accepted metadata/lock/source identity changes attributable to the candidate; a shared staging refactor must otherwise preserve the packer's output semantics.
Validate metadata transformation, generated identity and native optional-package rewrites against independent expectations.
An unforeseen runtime/public contract delta requires the re-route in section 2.

Useful operator signals are command exit/status, native rule names and source/target paths, snapshot/tool/lock/npm identities, admitted file/root counts, source-to-stage mismatches, optional report paths, elapsed time and incomplete-cleanup diagnostics.
Questions they answer: which invariant failed, whether the candidate was stable, whether the stage was the analyzed source, whether advice is merely advisory, and whether the extra analysis is affordable.
Avoid new telemetry services and unmeasured speedup claims.

Production acceptance for this tooling change means normal full qualification rejects real violations, the same supported package consumers still run, and authorized hosted results reflect the new candidate.
A local graph count, green focused check or archive filename is not production acceptance.
The integration owner observes first use and any authorized hosted qualification; the repository owner decides acceptance of material findings.

On failure or interruption, preserve the exact candidate, native diagnostics and resource identities.
Do not switch source roots, reuse a partial inventory, publish a partial bundle, hide a selected-test failure or weaken an error into an advisory to recover a green result.
Resume only after confirming the same source/configuration/lock/tool identities and released or accounted-for producers; otherwise create fresh evidence.
Use full checks after a selection gap, keeping negative-shadow counterevidence and a meaningful regression.

Abort activation for unproved pack fidelity, a native predicate mismatch, unsafe input admission, incorrect version/root classification, a surviving unaccounted subprocess, profile budget failure or unsupported package/rights change.
Prefer a bounded forward fix for the cause.
An authorized rollback restores the coherent supported tooling/config/lock state and reruns the affected evidence; it does not relabel prior results.
If a package has already been published under later separate authority, follow that release's actual recovery policy rather than assuming Git reversal restores consumers.

### Resources and cost

This plan is a durable product-maintenance document.
Future regression fixtures and maintained command docs are durable assets.
Native receipts/review/security outputs and required counterevidence are retained evidence.
Owned fixture copies, npm stages and exploratory bundles are temporary only after their consumers and recovery duties finish.

Before accumulating workflow resources, resolve native storage and declare an owned bounded group under its current contract.
Keep engine-owned records with native writers; operator evidence does not impersonate receipts.
Record purpose, owner, next consumer, budget, retention reason and release condition in the existing task/native inventory.
Never choose an ignored or `.sdlc` path as a convenience fallback.
Product graph bundles keep their explicit external user-selected destination.

Existing extraction limits are 4,096 entries, 8 MiB per file, 64 MiB source, 16 MiB graph/output, 256 MiB worker old space and 30 seconds per extraction; test execution is bounded at ten minutes.
Retain these ceilings.
Use the existing shell-free npm helper's bounded invocation, and introduce only a justified finite stage/inventory allowance compatible with the admitted source limits.
Record observed stage bytes and complete elapsed cost; do not assume dry run is free or raise the 900-second profiles preemptively.
Choose finite temporary/evidence budgets from measured payload and justified headroom before an implementation run.

Clean up in two passes: remove deliverable-affecting scratch before final freeze, then dispose of released detached working material after evidence/consumer handoff.
Verify exact ownership and containment, process quiescence and required retained copies before removal.
Use native/tool-managed cleanup or the authorized recoverable platform route.
Preserve unknown/concurrent/user material and unresolved producers; do not recursively delete a guessed stage root.
Native resource reconciliation and evidence retention remain separate from test success.

## 10. Cheapest experiments and re-planning conditions

These are future bounded implementation prerequisites, not experiments run during this draft.

| Unknown                            | Cheapest discriminating check                                                                                                                                            | Decision on failure                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selected-version native semantics  | Tiny in-memory/owned fixtures on admitted `18.6.0` for transitive reachable, runtime/tooling package types, all cycle forms, report focus/reaches and metrics extraction | Fix valid composition or consult upstream supported behavior. No custom walker or unproved predicate.                                                                                   |
| Stage/pack fidelity                | One representative staged core; compare native dry-run files to a real pack of those exact bytes and independent known inclusions/exclusions                             | Repair the single staging authority or re-route a required packaging-contract change. Never substitute root `npm pack` output without proof.                                            |
| Source graph suitability           | Match every runtime graph file's bytes/identity to its admitted stage path; include an existing omitted import target and disconnected root                              | If equivalent source analysis cannot establish closure, qualify explicit staged roots in the bounded adapter. Do not relax containment.                                                 |
| Tooling declaration classification | Clean accepted lock install plus graph classifications and existing syntax-guard/security tests; inspect notices and transitive delta                                    | Correct dependency ownership/category or obtain a precise exception. An arbitrary npm-no-pkg allowlist is insufficient.                                                                 |
| Mixed entrypoint meaning           | Fixture with both bins, JS export, schema/Python exports and declared worker/runner roots; one real repository advisory report                                           | Correct classification or qualify a new export form. Do not treat every string export as JavaScript or unreachable as unused.                                                           |
| Cost                               | Same candidate/runtime: narrow architecture status, full existing command, optional metrics/focus capture; report actual elapsed and bounds                              | Reduce repeated captures/staging through a coherent within-invocation seam or request a specific measured budget/design decision. No persistent cache or profile relaxation by default. |

Re-baseline if HEAD/source/control/lock/runtime changes materially before implementation, if the selected stable release changes before incorporation, or if independent findings invalidate a proposed invariant.
Refresh exact acceptance and evidence for changed meaning.
Re-plan if package metadata gains conditional/pattern exports, runtime source escapes `src`, new generated/copied/process boundaries appear, native inventory is incomplete, new tool rights are unclear, or an adapter begins taking responsibility for another domain's policy.
Protect ordinary product outcomes over graph appearance, low module counts, nominal speed or a green gate.

Completion requires all seven accepted opportunities to be implemented or explicitly amended by the owner, their independent proof current, failures honestly retained, final route/review obligations satisfied and resources reconciled.
This document supplies the reviewable proposal; acceptance and implementation remain future work.
