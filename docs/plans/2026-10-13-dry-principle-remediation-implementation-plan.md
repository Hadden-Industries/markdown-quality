# DRY principle remediation implementation plan

Date: 13 October 2026.
Status: **accepted for implementation on 13 October 2026**.
Draft revision: 1.
Repository baseline: `070ce2d815adddafc456ddfb8600188ccd4d8fbe` on `main`.
Decision owner: the Markdown Quality repository owner.
Integration owner after acceptance: the actor assigned to this change's owned HISEW execution.

## Accepted implementation authority

The repository owner requested implementation of this plan through HISEW, explicitly approved R2 and the proposed configuration changes, and authorized commit, push and integration.
Commit this plan first, consolidate the implementation before broad reviews, and use narrow follow-up reviews for repairs.
The draft and proposed wording below records the accepted revision's planning context; this acceptance supersedes its planning-only authority limits for the implementation and source-delivery lifecycle.
Package publication, release, deployment and downstream adoption remain separate effects.

## Purpose and authority

Give each of the fourteen audited shared rules one current authority, so a maintenance change reaches every applicable consumer without weakening its contract.
Preserve formatter output, diagnostics, bounded execution, installed package behavior, publication admission and retained evidence.
Success means fewer independently editable representations of the same knowledge and demonstrated conformance at the affected boundaries.
It does not mean a lower clone percentage or an unmeasured speed improvement.

The user authorized a detailed HISEW implementation plan covering **all fourteen findings**, saved under `docs/plans/`.
This task authorizes this new document and document-focused validation.
It does not authorize production edits, installations, scans, external reviews, HISEW execution or configuration changes, commits, pushes, merges, workflow dispatches, package publication, deployment or downstream adoption.
Authorization from the referenced WebVOWL, OwlAPI and HISEW chats is not inherited.
The accepted architecture-hardening plan in this repository is context, not acceptance of this refactor.

The REQ, AC, QA, DEC, configuration changes and risk route below are proposed decisions belonging to this draft.
There is no accepted native requirement snapshot or selected risk route for this change.
The missing prerequisites are owner acceptance of an identified revision and configuration table, followed by the native baseline and execution controls required by the accepted route.
They prevent implementation, not preparation of this reviewable draft.
No business requirement, review result or native receipt is inferred from existing code.

At the first future authorized commit checkpoint, include the accepted plan before or with its first implementation slice, subject to the actual commit gates.
Do not commit this draft during planning.
Record owner amendments in the accepted revision instead of preserving contradictory current instructions.
Once accepted work is authorized, ordinary slice boundaries do not require repeated permission requests.
An expansion of scope, changed contract or unavailable mandatory assurance requires its own disposition.

## 1. Evidence and baseline

The completed audit covered all 190 tracked files: 33 runtime files, 33 scripts, 57 test files, 25 documents and six workflows, plus the remaining metadata, assets and historical material.
It indexed 1,324 JavaScript functions/callbacks and 70 Python functions and verified all 77 cited source references.
Normalized clone matching, token windows, Python AST comparisons and JSON subtree comparisons supplied candidates; semantic inspection determined the fourteen findings.
These are maintainability findings, not allegations of a runtime failure or vulnerability.
The directly observed contract discrepancy is the support guide's current-sounding schema 1/2 sentence versus the current configuration schema 2 admission and result schema 3 implementation.

Audit provenance:

- Source: `C:/Users/maksy/.codex/visualizations/2026/10/13/01a13618-91f6-7463-82af-6bbaa9ca05b3/duplication-audit/findings.json`.
- SHA-256: `41484a24e1760ffd46c90cef6ca897df52241c3579f40b3c3db6249f0d1d8e4b`.
- Adjacent `audit.html`, `scan.json`, `python-scan.json` and `data-scan.json` retain the original presentation, inventory and candidate evidence.
- This plan embeds every finding, repository location, disposition and acceptance criterion; access to that private audit directory is not required to understand or implement the scope.

The parent rechecked the clean checkout and baseline before planning.
This planning actor also observed the same HEAD and clean status before creating this file.
No repository or ancestor `AGENTS.md` was found during the parent inspection.
Refresh the actual checkout, candidate identity and unrelated changes before implementation; the audit is exact-snapshot evidence, not a promise that the checkout will remain unchanged.

| Area                    | Current authority or behavior                                                                                                                                                                                                                 | Consequence for this plan                                                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public source contracts | [Configuration](../../schemas/configuration.schema.json) schema 2, [result](../../schemas/result.schema.json) schema 3, [execution](../../schemas/execution.schema.json) schema 1 and existing exports in [package.json](../../package.json). | Preserve API signatures, exports, schema IDs, validation domains and standalone schema compilation.                                                                                                                |
| Package and runtime     | Development metadata still says `1.0.3`; engines are `^22.23.3 \|\| ^24.21.0 \|\| >=26.11.1`. [Node policy](../../assets/node-support.json) references `24.21.0`. `.python-version` declares `3.15.0`.                                        | Version fields are not release evidence. No runtime, dependency or native executable upgrade is proposed.                                                                                                          |
| Native tool             | [Tool manifest](../../assets/tool-manifest.json), current Snapper `0.11.9`, frozen platform payloads and their rights/provenance.                                                                                                             | Reuse the admitted native capability and its current protocols; do not rebuild or change native bytes to accomplish DRY extraction.                                                                                |
| Architecture            | [Dependency policy](../../.dependency-cruiser.json) and [architecture assertion](../../scripts/architecture.js) protect runtime/development direction, foundations, named shared tooling, runtime cycles and real npm shipment membership.    | New owners must fit these boundaries; a static graph cannot qualify Python assets, shell setup or generated data.                                                                                                  |
| Test selection          | [Maintainer guide](../dependency-graph-and-tests.md) and [impact policy](../../.test-impact.json).                                                                                                                                            | No-argument `check:affected` executes every top-level JavaScript test. Selective mode requires an explicit immutable `--base`; it is not a replacement for relevant final assurance.                               |
| CI reuse                | Accepted [CI verification reuse plan](ci-verification-reuse.md), `scripts/ci-reuse.js` and current workflow.                                                                                                                                  | Preserve exact tree, ordered parents, workflow/policy, runtime/environment, attempt, job and artifact bindings. Candidate, performance and publication evidence do not acquire reuse authority from this refactor. |
| Full verification       | [scripts/verify.js](../../scripts/verify.js) checks license/native identity, Python admission, named Python evidence tests, JavaScript syntax, formatting, all top-level Node tests, and authored Markdown/link inventory.                    | Add actual execution paths for new generation, ABI and bootstrap checks; a path-coverage declaration alone is insufficient.                                                                                        |
| Installed consumers     | [Packaging tests](../../test/packaging.test.js), [packed qualification](../../test/packed-qualification.test.js) and [runtime qualification](../../test/runtime-qualification.test.js).                                                       | Requalify the actual frozen archives, root/isolated layouts, schema exports and standalone observer without source-only helper access.                                                                             |

The installed HISEW `0.1.0-dev.21` planning and routing skills, engine invocation, engineering principles, risk routes, progression, verification and resource-retention guidance were read.
The parent performed read-only native applicability inspection for this directory: `personal`, `active: true`.
Profile inspection returned `risk-route-not-selected` for this work; no execution was started, adopted or changed.
The inherited declarations are `focused` → `npm run check:focused`, `affected` → `npm run check:affected`, and `full` → `npm run check:full`, each a single npm-script command with a 900-second timeout.
Their `coveredPaths: ["**"]` values are owner claims, not measured coverage.
The selected command environment resolves through `C:/Program Files/nodejs/node.exe` and that installation's npm CLI; native inspection reported `environmentProbed: false`.
Separate local readback observed Node `24.21.0` and Python `3.15.0`.
These observations do not qualify other supported hosts or a future candidate.

Current configured HISEW roots are `C:/Users/maksy/.hi/w/c` and `C:/Users/maksy/.hi/w/e`.
This maintained plan requires no supplemental evidence allocation.
Before future operator evidence or scratch is created, resolve current native `inspect-environment`, ownership and storage disposition.
Do not write into engine-owned receipt namespaces or choose historical `.sdlc/runtime` or `.sdlc/tmp` paths as defaults.

## 2. Scope and preservation guardrails

All DRY-001 through DRY-014 receive a concrete implementation outcome below, including the P3 findings.
Generated representations and independent validators are valid dispositions only when their authority and executable drift controls are explicit.
No finding is silently deferred as optional cleanup.

Preserve these boundaries throughout the change:

- Current source APIs, CLI exit meanings, formatter bytes, literal preservation, diagnostic ordering/severity and effective-policy reporting retain their accepted behavior.
- Analyzer configuration permits `limits: false` and individual `null` limits.
  Trusted execution/profile limits remain finite positive safe integers.
  Configuration schema 2, result schema 3 and execution schema 1 remain distinct contracts.
- Native stdin and file reports keep their separate shape, attribution, coverage, duplicate-finding, omitted-clean-record and exit-consistency admission.
  Shared normalization runs only after the applicable boundary admits the data.
- `long_threshold = 2097153` remains an explicit checking extension.
  It is not added to the formatter's reported sentence policy or coupled silently to a user-selected `fileBytes` limit.
- The native batch capacity remains 32.
  Its legal names remain `input-0.md` through `input-31.md`; cleanup remains bounded by 32 possible inputs plus the two owned configuration files.
- Equal 4 MiB numbers do not acquire a shared meaning.
  Native group input bytes, pending prose recheck retention and other coordinator/report retention policies keep their own names, owners and reasons for change.
- Publication still verifies current `main`, current admitted bytes and origins at every existing effect checkpoint.
  Native packages precede core, including native registry qualification before core.
  Only the publication job receives `id-token: write`.
- The three historical publication step names used by recovery stay exact: `Publish Windows package under pilot and verify integrity`, `Publish Linux package under pilot and verify integrity`, and `Publish coherent core under pilot and verify integrity`.
- The Python setup used by the native build must work before a repository Node installation or npm dependency installation.
  Existing immutable action pins remain visible in reviewed workflow/action declarations.
- Windows ABI sharing does not combine observer drivers.
  The maintainer Linux metric is sampled `VmRSS` including its Python driver; the bundled Linux metric is `smaps_rollup` RSS excluding Python.
  Windows bundled observations use a cumulative Job peak across the sample window; maintainer observations use a fresh driver/Job per observation.
- Runtime leaves cannot import Ajv, schema-loading configuration, scripts, tests or orchestration merely to obtain a predicate or constant.
  Existing transitive architecture controls remain effective.
- Share neutral test setup and input construction, never production-derived golden expectations.
  Preserve source/installed separation and independently authored hostile-input cases.
- Published 1.0.3, historical release/provenance records, `test/registry-alpha.*.json`, review records and compressed performance incumbents are immutable.
  No regeneration rewrites their bytes or reinterprets them as current proof.

This plan adds no new public capability, compatibility shim, alias, fallback, license or third-party dependency.
It reuses Node, Python, Bash already required by the affected workflows, existing Ajv/Prettier/Node tests, native npm packing and dependency-cruiser's supported checks.
Its residual custom work is repository-specific ownership, narrow projections and integration with existing consumer validators.
No software-selection expansion is proposed, and no claim is made that every retained pin is the globally latest version.
Any proposed new tool, supported platform, package shape, schema dialect, runtime import mechanism or compatibility bridge reopens the relevant research, rights and owner decisions.
No scoped NSH-01 override exists for this work.
Historical interpretation already exercised by current recovery readers is not an unsupported consumer to delete by analogy with another repository.

## 3. Proposed risk route

**Risk class:** R2, inferred and awaiting owner acceptance for this change.

**Decision owner:** The Markdown Quality repository owner, accepting an identified plan revision, its behavioral guardrails and the configuration table below.

**Reasoning:** This behavior-preserving refactor touches public schemas, installed observer evidence, filesystem/input admission and privileged cross-system publication controls.
A wrong shared rule could affect both direct and batch checking, admit incomplete release evidence, or make several CI lanes agree on the same error.
Those are R2 triggers even when the source diff mostly moves existing code.
No observed safety-critical or equivalent R3 consequence has been established.
Likelihood is uncertain; detection is strong only when independent fixtures and real installed/platform consumers accompany parity checks.

**Potential blast radius:** Source and installed CLI/library consumers, qualification operators, Windows/Linux observers, package CI and future release operators.
The dependency direction, package source identity and native artifact vocabulary also affect downstream consumers when a new tuple is separately adopted.

**Reversibility:** An unreleased coherent source change can be reverted together with its generated outputs, configuration and tests, followed by relevant qualification.
That cannot undo an npm publication, revoke a historical receipt or rewrite a frozen archive's identity.
No such public effect is currently authorized.
Post-publication recovery would use the existing immutable-origin route or a newly accepted forward release.

**Principal unknowns:** Exact metadata edge acceptance, bootstrap conformance on hosted Bash, supported Windows ABI behavior, generation integration cost and the later selected review/verification capabilities.
Section 12 assigns cheap discriminating checks and decision owners.
None prevents a coherent planning draft; a contract discrepancy found by those checks can change implementation acceptance.

**Required artifacts:** This accepted plan/baseline, native route record and exact requirement snapshot as required by the accepted R2 procedure, a short execution record, candidate-bound verification/review dispositions and the necessary resource inventory.
Use the existing task and native stores; no new issue, tracked diary or standalone release campaign is inherently required.

**Required specialist lenses:** Ordinary correctness and DRY-01 ownership review; independent verification required by the R2 route; scoped security assessment under SEC-01 because filesystem/input admission and privileged workflow logic change.
Review installed packaging, platform process observation and evidence provenance as material questions within that assurance, without an automatic extra reviewer for every finding.
No native binary, dependency or license adoption is proposed, so a fresh full rights campaign is not inferred from helper extraction.
Preserve existing license/provenance checks and reopen rights assessment if their actual inputs change.

**Required verification:** Focused checks during each slice, relevant integration proof, actual route-selected full obligations on the settled candidate, installed archive qualification and real Windows/Linux evidence for the affected observation/bootstrap boundaries.
Section 10 names composition and capture rules.
`check:focused` is currently only `test/contracts.test.js`; it cannot establish this change's complete scope.
Do not run `affected` plus `full` blindly as equivalent final gates.
Native obligation/profile inspection determines which distinct evidence rows actually require execution.

**Required human approvals:** Accept this proposed R2 revision and exact configuration effects before implementation and capture the required prior baseline.
Commit/publication, provider usage, push/merge, workflow dispatch, package release and downstream adoption retain their applicable separate authority.
Future approval of an implementation lifecycle can cover its ordinary necessary steps without another prompt at every slice.

**Maximum sensible autonomy:** Now, finish and validate this document only.
After acceptance, implement all approved slices within an owned execution, preserve unrelated work, consolidate before broad review and repair bounded findings without widening the contract.
Do not adopt another actor's execution, fabricate acceptance, select an older capability to evade a gap, or weaken verification to finish.

**Next lifecycle step:** Owner accepts an identified revision and any amendments.
The future integration owner then refreshes applicability, command/environment declarations, worktree and session ownership, records the route and required baseline through supported native operations, and starts only the authorized implementation.
Read-only planning observations are not receipts or execution authority.

## 4. Exact proposed configuration effects

All rows require acceptance with this plan.
Likely new paths and command names are design predictions, not implemented interfaces or promised final file locations.
Use equally precise names if implementation evidence supports a better local seam.

| ID      | Current state                                                                                                | Proposed effect and preserved meaning                                                                                                                                                                                                                                                                                                                             | Acceptance gate                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CFG-001 | Configuration, result and execution JSON contain separately authored configuration/limit shapes.             | Add a data-only analyzer-limit owner and narrow build-time schema sources/projection. Track the three standalone generated schemas at their existing exported paths. Preserve all current IDs, versions, acceptance sets and finite/unlimited distinctions.                                                                                                       | AC-001, DEC-002; independently compile installed outputs and reject stale projections before packaging.                                    |
| CFG-002 | Sentence policy, native TOML/flags, layout defaults and protocol capacity recur.                             | Derive the formatter TOML and argument values from current policy; derive staging names/cardinality from capacity 32; source layout defaults from the existing formatter policy. Preserve exact current values and private checking extension.                                                                                                                    | AC-003, DEC-003; actual bytes/arguments, result policy and negative protocol fixtures.                                                     |
| CFG-003 | Candidate names/conditions use literal reference `24.21.0`.                                                  | Export the trusted resolved reference beside the matrix and consume it in every reference-dependent name, performance condition and artifact name. Preserve the matrix shape and frozen runtime-policy history.                                                                                                                                                   | AC-004; synthetic reference change and historical admission tests.                                                                         |
| CFG-004 | Several initial setup-node steps need a runtime before policy code can run.                                  | Give this bootstrap pin a separately named, build-only authority, predicted `.github/bootstrap-node.json`, still `24.21.0`. Keep necessary literal setup declarations checked against it; they do not claim to be the dynamic performance reference.                                                                                                              | AC-004; enumerate actual bootstrap consumers and fail conformance if a pin drifts. No runtime upgrade is included.                         |
| CFG-005 | Five lanes repeat the Python reader and setup-uv configuration.                                              | One local composite action, predicted `.github/actions/setup-repository-python/action.yml`, owns the dependency-free reader and current setup-uv SHA/options. All five lanes call it after checkout. Preserve `>=3.15.0`, stable finite version admission, uv `0.13.0`, activation, temporary venv, `no-project: true`, disabled cache and native setup ordering. | AC-007; explicit local-action admission and tests of the actual nested declaration, not a broad trust exception for local actions.         |
| CFG-006 | Three publish workflow jobs repeat npm configuration and acquisition.                                        | One release-local helper owns two explicit phases: isolated environment selection, then pinned npm acquisition after existing origin/byte admission. Keep npm `12.2.0`, selected Node prefix, public registry and disabled lifecycle/audit/fund behavior.                                                                                                         | AC-008; job permissions, intervening gates, exact effect-step names and native-before-core order stay visible.                             |
| CFG-007 | Windows Job ABI code is hand-maintained in two standalone drivers.                                           | One build-only Python source owns ABI/low-level operations; a narrow generator embeds the same reviewed block into both tracked drivers. `observe.py` remains a single self-contained `-I -B` asset; `observerSha256` still hashes that complete file.                                                                                                            | AC-009, DEC-006; read-only drift checks and real Windows/installed proof, no observer schema migration.                                    |
| CFG-008 | Current native evidence member names/platform archive mapping recur.                                         | One build-only JSON vocabulary supplies current schema-2 base members and exact platform archive mapping. Keep distinct supplemental-rights membership and legacy manifest interpretation.                                                                                                                                                                        | AC-014; existing native bytes and all historical manifests remain immutable.                                                               |
| CFG-009 | Architecture protection names current foundational/shared-tooling modules.                                   | Extend narrow rules to newly introduced leaves and their prohibited orchestration reachability where needed. Preserve runtime-to-development/dev-dependency errors, runtime cycle errors and real npm shipment checks.                                                                                                                                            | AC-010/011 and QA-011; do not broadly prohibit legitimate tooling imports or make a rule pass by removing a root.                          |
| CFG-010 | Static imports cannot capture schema templates, generated blocks, action internals or Python data relations. | Add explicit relevant relations/full-fallback paths in `.test-impact.json` for the new inputs. Wire conformance through top-level Node tests and named Python/shell execution where required; extend read-only format coverage to changed/new declarations.                                                                                                       | QA-014; actual mutation selection and execution prove coverage. Do not reduce required CI or alter HISEW profiles merely to obtain a pass. |
| CFG-011 | Native push filters include only `native.yml`, `assets/native-build.json` and `scripts/build-native.py`.     | Include the shared Python setup declaration, `.python-version` and the new native evidence authority wherever they affect this workflow. Cover any separate referenced shell/data file if the final action introduces one.                                                                                                                                        | AC-007/014; static event/path-filter tests, with hosted observation only after separately authorized source delivery.                      |
| CFG-012 | Current compatibility prose overlaps and contradicts current schema admission.                               | Make `docs/centralized-contracts.md` the current compatibility description. Link from support/release prose; remove the unsupported current claim or label retained history only when an exact release establishes it.                                                                                                                                            | AC-013; narrow schema-description checks and source/installed conformance, without rewriting release records.                              |
| CFG-013 | Personal profiles are inherited, with 900-second command bounds and unprobed environment.                    | No HISEW configuration/profile/timeout/exclusion change is proposed. Extend repository-owned conformance within the existing command composition and identify any remaining required platform proof separately.                                                                                                                                                   | Inspect actual final obligations before execution; any necessary profile change needs its own exact proposed effect and owner acceptance.  |

Changes to generated source/templates are source delivery, not package publication.
Package version and dependency fields remain unchanged by this plan.
Current support, historical 1.0.3, hosted qualification, semver selection and downstream adoption stay separate claims.

## 5. Requirements and falsifiable acceptance

IDs are local to this plan.
Each row is a required outcome; P3 priority affects sequencing, not whether it is implemented.

| Finding and problem                                                                                            | Requirement and concrete disposition                                                                                                                                                                                                                                    | Falsifiable acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Repository evidence                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DRY-001, P2: the complete configuration schema and limit vocabulary recur in result/execution representations. | **REQ-001:** Author configuration grammar once and analyzer limit names/defaults once. Generate self-contained current schemas using explicit nullable analyzer and finite execution projections.                                                                       | **AC-001:** Generated schema structures/validation behavior equal the baseline; all nineteen limit names, unknown keys, zero/negative/fraction/unsafe values, `null`, `false` and partial overrides have independently specified outcomes. A synthetic canonical change propagates to every intended projection; manual output drift fails. Installed schemas each compile directly with strict Ajv without registering sibling schemas.                                                         | `schemas/configuration.schema.json`, `schemas/result.schema.json`, `schemas/execution.schema.json`, `src/configuration.js`, `src/contracts.js`, `src/result-validation.js`, `src/execution-profile.js`.          |
| DRY-002, P2: direct and grouped prose checking repeat list-boundary recheck decisions/snippet extraction.      | **REQ-002:** Share a pure internal recheck eligibility/snippet operation. Keep direct native calls, grouped flushing, owner attribution and diagnostic retention in their existing orchestration paths.                                                                 | **AC-002:** Authored expected findings and exact snippets cover quoted ordered items, adjacent lists, nested/continued lists, prefix/indent changes, literal-only lines and real prose faults. Both public paths preserve order and behavior; failed/malformed rechecks fail. Group timing still charges each owner for its own extraction and participating native work. Parity alone cannot satisfy acceptance.                                                                                | `src/prose-diagnostics.js`, `src/formatting.js`, `src/document-worker.js`, `test/native-checks.test.js`, `test/lists.test.js`.                                                                                   |
| DRY-003, P2: native formatting policy, capacity and diagnostic mapping have multiple maintained forms.         | **REQ-003:** Give sentence policy and bounded native protocol coherent leaf owners; generate TOML/flags and derive legal filenames/cleanup bounds. Reuse formatter-owned layout defaults. Share admitted diagnostic normalization while preserving distinct validators. | **AC-003:** Tests inspect native argument values, exact TOML bytes, effective policy, capacity-32 partitioning, byte/output bounds, `input-31.md`, rejection of `input-32.md`/ambiguous names, and cleanup capacity 34. Unknown kinds fail and admitted `long` findings remain omitted. Scalar/file coverage and malformed-report cases retain their different admission outcomes.                                                                                                               | `assets/snapper.toml`, `src/preset.js`, `src/configuration.js`, `src/native-tool.js`, `src/native-checks.js`, `src/native-staging.js`, `src/prose-diagnostics.js`.                                               |
| DRY-004, P2: the Node reference literal can diverge from `policy.reference`.                                   | **REQ-004:** Drive current workflow reference behavior from a validated matrix-job reference output. Give necessary pre-policy bootstrap pins a separate checked authority.                                                                                             | **AC-004:** Changing only a synthetic policy reference changes expected and resolved provider job names, corpus/performance selection and artifact names together, with exactly one reference lane per platform. Missing/invalid references fail. Bootstrap remains explicit and independently checked. Frozen historical matrices use their recorded policy; pre-matrix candidates keep their existing contract.                                                                                | `assets/node-support.json`, `scripts/node-matrix.js`, `.github/workflows/candidate.yml`, `.github/workflows/check.yml`, `test/node-support.test.js`, `test/publication.test.js`.                                 |
| DRY-005, P2: publication control-context validation and environment decoding recur.                            | **REQ-005:** Centralize the common pure repository/event/ref/workflow/head rule and explicit environment mapping. Invoke it at each applicable admission/checkpoint; retain separate candidate, environment, origin, recovery and fresh-ref rules.                      | **AC-005:** Independently wrong repository, event, ref, workflow, head, attempt, recovery origin and freshly advanced main are rejected at their actual entrypoints. Environment mapping preserves empty/missing and string semantics. Replacing the context/bytes after admission still prevents the next effect; no accepted-object cache substitutes for reacquisition.                                                                                                                       | `scripts/verify-publication.js`, `scripts/prepare-publication-environment.js`, `scripts/publication-origins.js`, `.github/workflows/publish.yml`, `test/publication.test.js`.                                    |
| DRY-006, P2: release-local bounded byte readers and archive SHA-256/SRI checks recur.                          | **REQ-006:** Use release-local bounded regular-file reading and supplied-byte archive verification, with explicit caller limits. Keep filename/provenance checks and real fresh reads with callers.                                                                     | **AC-006:** Reject non-files, links, inputs already beyond the caller bound, growth beyond that bound during reading, and either checksum mismatch. Preserve 1 MiB metadata, 4 MiB lock/SBOM and 20,000,000-byte archive limits at their existing callers. Fresh reads and digest checks detect changed archive bytes between gates. This simpler reader does not claim generic same-size mutation detection during a read; stronger runtime streaming/fingerprint readers remain intact.        | `scripts/release-assets.js`, `scripts/verify-publication.js`, `scripts/prepare-publication-environment.js`, `scripts/qualify-public-registry.mjs`, `test/publication.test.js`, `test/github-release.test.js`.    |
| DRY-007, P3: five Python provisioning lanes copy the same bootstrap/setup.                                     | **REQ-007:** Move the dependency-free reader and current setup-uv configuration into one precisely admitted local action and update all five callers, governance and trigger relations.                                                                                 | **AC-007:** Actual action input/output logic follows changed valid pins and rejects missing, partial, prerelease, malformed or non-finite version declarations. It emits the stable minimum constraint, preserves isolation options and works before Node/npm. Tests identify all five lanes and native ordering, admit only the selected local action and its pinned nested action, and fail when relevant native trigger paths are removed.                                                    | `.python-version`, `.github/workflows/check.yml`, `.github/workflows/candidate.yml`, `.github/workflows/native.yml`, `scripts/python-target.js`, `test/python-target.test.js`, `test/ci-reuse-workflow.test.js`. |
| DRY-008, P3: three publication jobs copy isolated npm setup.                                                   | **REQ-008:** Own isolated npm environment selection and pinned acquisition once, retaining two explicit phases and their current workflow order.                                                                                                                        | **AC-008:** Windows and Linux selected-Node prefix cases, quoted/space-containing paths, empty isolated npmrc files, job-local cache, disabled scripts, exact registry/version and selected npm readback are verified. All three callers use the owner. No new permission/token or automatic publish path appears; a bootstrap failure stops its job.                                                                                                                                            | `.github/workflows/publish.yml`, `scripts/commands.js`, `test/publication.test.js`, `test/registry-readback.test.js`.                                                                                            |
| DRY-009, P2: Windows Job structures/signatures/low-level operations are hand-maintained twice.                 | **REQ-009:** Maintain one build-only ABI/operation source and checked embedded representations in both standalone observers. Keep drivers, metrics, lifetimes and reports independent.                                                                                  | **AC-009:** Real Windows child probes verify independently expected x64 field layout, handle/pointer signatures, assignment, accounting, cumulative peaks, active descendants and bounded failure cleanup. Source or embedded-block drift fails normal proof. Installed `python -I -B observe.py` works without the source repository or an extra Python asset, and its reported hash equals its complete installed file. Linux metrics and historical observer hashes are unchanged in meaning. | `assets/qualification/observe.py`, `scripts/qualify-performance.py`, `src/qualification.js`, `test/performance-observer.test.js`, `test/qualification.test.js`, `test/packed-qualification.test.js`.             |
| DRY-010, P3: shipment and entrypoint reporting independently decode package targets.                           | **REQ-010:** Extract pure supplied-metadata decoding/normalization, leaving graph path admission, actual shipment membership and source/process-root inventory with their callers.                                                                                      | **AC-010:** Characterized string/object bins, export resources, invalid target values, wildcards and current edge shapes retain their existing outcomes. Missing shipment members still fail; schemas/Python remain resources; declared process roots remain separate evidence. A target mutation reaches both current consumers without importing graph orchestration into the decoder.                                                                                                         | `scripts/architecture.js`, `scripts/dependency-graph.js`, `test/architecture.test.js`, `test/dependency-graph.test.js`, `test/packaging.test.js`.                                                                |
| DRY-011, P3: containment and stat fingerprint have duplicate runtime owners.                                   | **REQ-011:** Introduce focused runtime leaves for lexical containment and the existing five-field fingerprint. Update actual consumers without sharing filesystem admission or unrelated identity models.                                                               | **AC-011:** Equality, descendants, siblings, parent traversal and Windows cross-drive cases have literal expected decisions. Each `dev`, `ino`, `size`, `mtimeMs`, `ctimeMs` change alters the existing fingerprint. Link/hard-link/race/truncation/error tests still exercise their owning callers. Foundations import no schema/Ajv/configuration side effects through these leaves.                                                                                                           | `src/configuration.js`, `src/native-staging.js`, `src/candidate-staging.js`, `src/qualification-evidence.js`, `test/native-staging.test.js`, `test/candidate.test.js`, `test/qualification-evidence.test.js`.    |
| DRY-012, P3: source and packed qualification repeat host discovery and Git fixture freezing.                   | **REQ-012:** Share only test-owned host discovery/version observation and neutral frozen-Git fixture construction, with explicit root/message inputs.                                                                                                                   | **AC-012:** Both existing suites still run real source/installed paths, preserve independent assertions/corpus/hostile fixtures and prove installed code cannot use source-only helpers. Fixture Git settings are command-scoped, unsigned fixture commits remain confined to disposable roots, and cleanup removes only the owning test's root.                                                                                                                                                 | `test/qualification.test.js`, `test/packed-qualification.test.js`, `test/helpers.js`.                                                                                                                            |
| DRY-013, P2: support/release prose contradicts current schema admission.                                       | **REQ-013:** Own current compatibility prose in the centralized contracts guide and link to it from support/release guidance. Remove the unsupported current schema-1-loadable claim.                                                                                   | **AC-013:** The current guide explicitly states configuration 2/result 3/execution 1 and finite execution versus nullable analyzer limits, matching source and installed validators. No current document asserts schema 1 is loadable without evidence. Any retained historical claim names its exact established release; immutable history is byte-identical. A narrow conformance check fails the actual contradictory claim.                                                                 | `docs/support-and-release.md`, `docs/centralized-contracts.md`, `schemas/configuration.schema.json`, `test/contracts.test.js`.                                                                                   |
| DRY-014, P2: build/freeze/repack/acquire repeat native evidence vocabulary and archive names.                  | **REQ-014:** Add one current build-only evidence inventory/platform mapping owner. Make producers and current consumers use it while keeping independently enforced byte/membership/provenance admission.                                                               | **AC-014:** Independently expected base inventories, executable member, Windows ZIP/Linux tar.xz names and separate supplemental-rights members match all current stages. Missing, extra, duplicate, linked, over-bound or digest-mismatched archive entries fail. Repacking preserves original build bytes and supplemental provenance; current extraction does not rewrite or remove tested legacy interpretation.                                                                             | `scripts/build-native.py`, `scripts/freeze-native.py`, `scripts/prepare-native.py`, `scripts/acquire-native.py`, `test/native-evidence.py`, `test/package-archive.py`, `.github/workflows/native.yml`.           |

All source locations above exist at the audit baseline; references identify current evidence, not future line numbers.
The default limit catalog has nineteen entries at this baseline.
A later supported catalog change requires new explicit expected acceptance and default values, rather than teaching tests to accept whatever keys production currently exports.

## 6. Ownership, decisions and architecture

The following matrix applies DRY-01's decision test to each material rule.
The repository owner remains accountable for deliberate separation; the integration owner implements the accepted drift controls.
New paths in this section are predictions.

| Rule and scoped authority                                                                                                                                                              | Latest in-scope consumers                                                                                          | Selected strategy                                                                                                                                                   | Boundary preserved and drift control                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyzer names/defaults: predicted `src/analyzer-limits.js`; configuration grammar: `scripts/schema-sources/configuration.json`; result/execution grammar: their own source fragments. | Configuration loading, default budgets, result validation, execution profile admission and installed schema users. | Data-only shared values plus fixed-path deterministic projections into the existing three schema outputs.                                                           | Runtime leaves never load authoring templates or Ajv. Analyzer unlimited and execution finite projections stay distinct; independent literals and standalone Ajv tests guard meaning.         |
| List recheck eligibility/snippet construction: one internal pure operation in `src/prose-diagnostics.js`.                                                                              | `checkProse` through formatting and `checkProseGroup` through worker verification.                                 | Shared code within the existing coherent module.                                                                                                                    | Process calls, group flushing, admitted-check reuse, literal filtering and timing ownership stay in their respective callers; independent expected findings guard a common-mode bug.          |
| Sentence policy: predicted `src/native-policy.js`; layout: existing `formatterDefaults` in `src/preset.js`.                                                                            | Reported policy, formatting flags/TOML and private check configuration.                                            | Immutable data and narrowly derived representations.                                                                                                                | Checking extension is separately named; layout projection picks only `endOfLine`/`tabWidth`, not every Prettier option. Generated asset drift and actual invocations are checked.             |
| Native capacity, owned input names and admitted diagnostic vocabulary/mapping: predicted `src/native-protocol.js`.                                                                     | Native group partitioning, staging admission/cleanup, report sizing and prose recheck batching.                    | Shared pure capacity/name/mapping operations.                                                                                                                       | Stdin/file admission, source-line accounting, duplicate checks and omission rules stay separate. Input bytes and retention budgets retain distinct owners.                                    |
| Runtime reference: existing `assets/node-support.json`; initial bootstrap: a separately named `.github/bootstrap-node.json` declaration.                                               | Matrix resolver, current candidate workflow, provider-job validation and relevant bootstrap steps.                 | Reference job output plus explicitly checked bootstrap representations.                                                                                             | No mutation of frozen candidate policy or matrix shape. Synthetic policies prove all reference consumers change together; bootstrap has its own equality check.                               |
| Publication control context: predicted `scripts/publication-context.js`.                                                                                                               | Candidate-context admission, full admission, environment preparation and current-main recheck.                     | Pure rule and environment decoder reused at every boundary.                                                                                                         | Run-attempt/recovery/environment rules and fresh API/file acquisition remain local. Independently invalid contexts and checkpoint mutation tests remain authored outside this module.         |
| Release input bytes/archive digests: predicted `scripts/release-bytes.js`.                                                                                                             | Release assets, full publication admission, environment/current-ref recheck and registry qualification.            | Release-local reader plus supplied-byte SHA-256/SHA-512-SRI verification.                                                                                           | Explicit caller ceilings, path/filename validation and reacquisition remain with consumers. This helper never replaces stronger runtime readers.                                              |
| Python provisioning: local setup action; version value: `.python-version`; version admission meaning: existing `scripts/python-target.js`.                                             | `check` probe/package, `candidate` pack/consumer and `native` native job.                                          | Shared dependency-free Bash reader/setup declaration; conformance fixtures across Bash and JS admission.                                                            | Setup works before repository Node/npm; all nested remote actions remain SHA-pinned and explicitly inspected. Workflow trigger changes are tested.                                            |
| Hosted npm acquisition: predicted `scripts/publication-npm.js`, using existing `scripts/commands.js`.                                                                                  | `publish.yml` retained, publish and registry jobs.                                                                 | One narrowly scoped module with two deliberate lifecycle phases.                                                                                                    | Permission/effect order and all network/publish steps remain visible to workflow review. Version/prefix/isolation tests and job-graph mutations guard conformance.                            |
| Windows Job ABI and raw operations: predicted `scripts/windows-job-abi.py`.                                                                                                            | Generated blocks in bundled `observe.py` and maintainer `qualify-performance.py`.                                  | Deterministic checked embedding by predicted `scripts/generate-windows-job-abi.js`.                                                                                 | Both deployed drivers stay standalone. No report policy, Linux code, sample window or metric definition enters the shared block; independent host tests guard native meaning.                 |
| Declared bin/export target decoding: predicted `scripts/package-targets.js`.                                                                                                           | Shipment assertion and graph entrypoint inventory.                                                                 | Pure decoder from supplied metadata, no filesystem or graph capture.                                                                                                | Each caller retains its path/inventory admission; declared process relations remain separate. Shared target parsing cannot create a dependency cycle.                                         |
| Runtime lexical containment and five-field stat fingerprint: predicted `src/path-containment.js` and `src/file-fingerprint.js`.                                                        | Configuration path checks, native staging, candidate staging and evidence packaging.                               | Two coherent leaves, with direct consumer updates.                                                                                                                  | Directory identity based on `birthtimeNs`, graph-path syntax, actual links/races and error policies remain separate. Explicit platform cases and architecture rules protect these boundaries. |
| Test host/Git construction: predicted `test/qualification-fixtures.js`.                                                                                                                | Source qualification and installed qualification tests.                                                            | Shared test-only setup, parameterized by owned root and fixture message.                                                                                            | Expected outcomes, installed imports and hostile fixtures stay independent; runtime/scripts never depend on test helpers.                                                                     |
| Current compatibility prose: `docs/centralized-contracts.md`.                                                                                                                          | Maintainers and consumers following current support/release guidance.                                              | One current description with links from other maintained prose.                                                                                                     | Narrow schema-description conformance and review of current claims; historical evidence is retained without regeneration.                                                                     |
| Current native evidence names/platform archive mapping: predicted `scripts/native-evidence-contract.json`.                                                                             | Build output completion, freeze, controlled repack and acquisition.                                                | Build-only JSON data read from each caller's exact file-relative path; current schema-2 membership composed explicitly with executable and optional rights members. | Each stage owns its byte/resource/provenance checks. Historical manifest handling stays version-scoped, and independent expected inventories prevent circular proof.                          |

### Proposed decisions

**DEC-001: Consolidate knowledge at its domain boundary.**
No universal `utils`, generic policy service, generalized schema resolver or cross-language compatibility framework is introduced.
Use direct reuse only where meaning and change responsibility coincide.
All in-scope current consumers move coherently; there is no dual old/new implementation switch.

**DEC-002: Bundle schemas deterministically at authoring time.**
Move the nineteen names and existing defaults to a data-only runtime leaf, preserving the existing `contracts.js` export as the same ordinary contract binding.
Author nonprojected configuration/result/execution shapes in build-only fragments under `scripts/schema-sources/`.
A narrow `scripts/generate-schemas.js` fills known locations from those fragments and the limit catalog; it is not a general `$ref` resolver or template language.
Result configuration embeds the canonical projected configuration shape, and result policy/execution receive their explicitly different limit projections.
Check that authored fragments cannot accidentally contain a second hand-written projected shape.
Retain self-contained generated files at the exported `schemas/*.schema.json` paths.
No installation or consumer operation requires a generator or sibling-schema registration.
Independent malformed-result semantic tests remain outside generated schema expectations.

**DEC-003: Share policy and normalization without sharing protocol admission.**
`native-policy` owns formatter sentence values and explicit check-only extension values.
`native-protocol` owns capacity, exact canonical input names, diagnostic kind vocabulary and normalized finding construction.
Filename admission checks a canonical nonnegative index less than capacity; leading-zero, signed, traversing and out-of-range names remain invalid.
Report bounds derive the longest permitted name and cleanup derives capacity plus the owned configuration map size.
Each protocol retains its own shape/coverage/attribution/exit validation before mapping diagnostics.
Maintain separate names for pending recheck retention and native group input limits even when their values coincide.

**DEC-004: Policy-driven reference does not imply policy-driven bootstrap.**
Current matrix generation validates and emits both the existing matrix and the reference from the same trusted checkout/policy observation.
Expose the reference through the pack/matrix job outputs and replace every candidate reference comparison with that output.
Do not add an extra matrix axis, duplicate lane or unvalidated fallback when the output is missing.
The bootstrap runtime needed before executing policy code has a separately reviewed declaration and conformance check.
Keep the historical policy supplied by a frozen candidate authoritative for its provider job names.

**DEC-005: Reuse pure release rules, repeat their enforcement.**
The shared publication validator covers only the common five control fields; candidate run-ID representation and later attempt/origin checks retain their existing explicit meanings.
The environment decoder maps the current eleven GitHub/candidate/recovery fields without silently coercing missing or empty values into accepted identities.
The bounded reader and digest helper never cache admission.
Fresh provider responses, manifests, archives and origin maps are still acquired/validated at the same effect boundaries.
Within one synchronous gate, redundant assertions may disappear only after the independent negative tests establish the same rejection contract.

**DEC-006: Generate the Windows ABI block to preserve standalone observation.**
The bundled observer is invoked with Python `-I -B` and reports the digest of its complete file.
Adding a sibling import would change both installed acquisition and the completeness of that identity.
Use one build-only source and two narrow generated blocks instead.
The generator replaces exactly one explicitly marked region per known target, fails on missing/duplicate markers and never transforms arbitrary Python code.
The shared block contains structure fields, ctypes signatures, Job creation/policy/assignment and raw query/termination operations.
It performs no Job creation at import time and owns no reporting, sampling or Linux behavior.
Preserve driver-specific active-descendant adjustment, sample lifetimes and error/report ordering.
Do not introduce handle closure that kills the assigned observer before it retains its failure report.
New source bytes naturally produce new observer hashes; historical hashes and the `observerSha256` field's meaning do not change.

**DEC-007: Keep bootstraps narrow and auditable.**
The Python composite action shares an existing orchestration contract; it does not execute candidate documents or add repository dependency installation.
Its Bash reader must conform to stable, finite major/minor/patch pin semantics without relying on Node, installed Python or a YAML package.
Keep setup-uv's current immutable SHA and explicit configuration visible inside the action.
Governance resolves only the exact approved local action path and validates its nested declaration; it does not accept arbitrary local actions.
The npm helper's environment-selection and acquisition phases remain separated by the existing artifact/origin admission steps.
It reuses selected-Node/npm binding from `commands.js`, not an unrelated global executable or shell-built command string.

**DEC-008: Decode package targets without owning shipment.**
Characterize existing acceptance before moving code, including unusual metadata shapes that the current `Object.values` branches may tolerate.
Do not quietly broaden support for conditional exports, patterns or new bin shapes, or tighten incidental acceptance as part of extraction.
The helper returns normalized declared targets; current callers still admit path syntax and check actual files/membership.
A shape correction found during characterization needs an explicit contract disposition and regression, not a renamed refactor.

**DEC-009: Keep filesystem predicates below filesystem policies.**
Containment is the current platform's lexical `relative`/absolute/parent test.
Fingerprint remains the ordered `dev:ino:size:mtimeMs:ctimeMs` representation.
Neither function opens files, grants trust, resolves links or translates error codes.
Native staging's `dev`/`ino`/`birthtimeNs` capability identity remains separate.
Existing supported exports retain their behavior; internal imports are updated directly without introducing legacy aliases.

**DEC-010: Preserve independent expectations and native consumers.**
Tests own literal expected findings, acceptance tables, field layouts, inventories and effect ordering.
Generators and shared production helpers may construct inputs, but cannot compute their own expected decisions.
Mock the external GitHub/registry/process-result boundary when testing refusal paths; use real Git, actual archive tools, installed Ajv, the native formatter and OS process primitives for their positive consumer claims.

**DEC-011: Current documentation has one owner; history remains evidence.**
Correct the schema discrepancy in current prose without deciding an unverified historical release mapping.
If exact historical behavior is not established, remove the unsupported sentence from current guidance instead of guessing its release.
Retain current semver/release caveats and published 1.0.3's frozen claims as explicitly historical.
The prose checker targets the small maintained schema/version table or markers, not every incidental occurrence of a number in documentation.

**DEC-012: Native vocabulary is shared data, not shared approval.**
The current base inventory contains `LICENSE.snapper`, `COPYRIGHT-library.html`, `THIRD-PARTY-NOTICES.txt`, `embedded-dependencies.json`, `component-inventory.json`, `cargo-notices.json`, `build-evidence.json` and `MPL-SOURCE.tar.xz`, plus the platform executable.
The rights supplement adds `rights-evidence.json` and `SUPPLEMENTAL-NOTICES.txt` only under its existing separately bound evidence.
The exact current mapping is `win32-x64` → `snapper-windows.zip` and `linux-x64` → `snapper-linux.tar.xz`.
Keep this vocabulary as data in the predicted `scripts/native-evidence-contract.json`, not an importable module with a hyphenated Python name.
Each Python consumer reads the exact sibling data path resolved from its own `__file__`, using the standard library; no ambient working directory, `PATH`, `PYTHONPATH`, `sys.path` insertion or fallback determines the authority.
The existing `test/native-evidence.py` and `test/text-output.py` loaders use `importlib.util.spec_from_file_location` for the builder/freezer, so test that loading path as well as ordinary script execution.
Expected member inventories in those tests remain independently authored instead of read from the new vocabulary.
Use explicit supported keys for the current contract; keep any historical interpretation in its existing versioned branch with independent fixtures.
The builder checks its completed original inventory but cannot hash `build-evidence.json` into its own `files` record.
Freeze/repack preserve this self-reference exclusion and never let supplemental material masquerade as original hosted output.

**DEC-013: Generation is explicit; checking is read-only.**
Each narrow generator has explicit regeneration and check modes, deterministic LF output, bounded known targets and failure on stale/malformed inputs.
The Python ABI authority carries its existing license attribution into both outputs.
The native policy asset generator and schema generator preserve their current semantic output before consumers move.
Regenerate and format before final candidate freeze, then use read-only byte/structural checks during ordinary verification and packaging preflight.
Do not regenerate silently on installation, test pass, release admission or consumer execution.

**DEC-014: Final assurance follows the settled candidate.**
Use focused development checks, consolidate all slices, settle generators/formatters/staging/authorized commits and choose the native capture route before expensive final execution.
Perform broad ordinary/independent/security review on the final consolidated target where required by the accepted route.
Narrow repair follow-ups inspect changed questions and affected proof; they do not automatically restart unrelated suites or whole-repository reviews.
A required independent verification remains a separate assurance obligation with actual substantive evidence.

## 7. Quality scenarios and test-oracle ownership

| Scenario                                                | Stimulus and environment                                                                                                         | Required response and measurable proof                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QA-001: Schema agreement**                            | A current configuration, malformed report or synthetic catalog change reaches source and installed validators.                   | Configuration/result/execution projections accept the independent positive cases and reject the independent negative cases; direct installed strict Ajv compilation succeeds; stale output or a second hand-maintained projection fails.                                     |
| **QA-002: List correctness**                            | Quoted/nested/adjacent/continued list prose and mixed literal content use direct formatting and grouped checking.                | Exact authored findings, order, suppression and snippets match the baseline contract. Malformed native recheck output fails; owners receive only their intended work attribution.                                                                                            |
| **QA-003: Bounded native protocol**                     | 31, 32 and 33 small inputs, a group crossing its byte/output ceiling, and hostile report/name cases exercise both protocols.     | Groups are bounded without retries; canonical filenames/cleanup bounds derive from capacity; each protocol enforces its own coverage/attribution rule; checked/formatter policy bytes match their respective authorities.                                                    |
| **QA-004: Reference change**                            | A fixture changes `policy.reference` to another admitted minimum and resolves a Windows/Linux matrix.                            | Exactly the intended lanes own performance/corpus work and legacy-style names; all expected provider/artifact names agree. A missing/invalid reference refuses execution; bootstrap conformance remains a different assertion.                                               |
| **QA-005: Publication checkpoint freshness**            | Provider context, branch head, admitted manifest/archive or origin map changes after an earlier successful gate.                 | The next existing gate refuses before its effect. Recovery uses the correct original run/attempt/source and exact historical step names; no cached shared helper result bypasses enforcement.                                                                                |
| **QA-006: Release input bounds**                        | A file is oversized, grows beyond its caller bound during acquisition, is a link/non-file, or has one mismatched digest.         | The owning gate fails with its established failure class before publication/acceptance. Caller-specific limits remain in effect; stronger runtime race-aware reads are unchanged.                                                                                            |
| **QA-007: Bootstrap independence**                      | Valid/invalid Python pins run through all five hosted caller declarations, including native setup without repository Node/npm.   | One current action governs setup, malformed/non-finite pins fail and the minimum remains stable-only. Exact setup options, native ordering, explicit local-action trust and path-trigger coverage are checked.                                                               |
| **QA-008: npm isolation and privilege**                 | Each retained/publish/registry job uses the selected Node installation on supported Windows/Linux paths.                         | User/global npm configuration and cache are isolated; exact pinned npm is observed; scripts remain disabled; failed setup stops. Job permissions, protected environment and all publication checkpoints retain their independent tests.                                      |
| **QA-009: Windows observation**                         | Real bounded child probes allocate memory, create descendants, fail native operations or are interrupted.                        | Supported x64 ABI expectations hold; raw accounting is valid; descendants quiesce or failure cleanup remains a failure. Bundled cumulative-window and maintainer fresh-Job interpretations remain different and explicit.                                                    |
| **QA-010: Installed asset completeness**                | A frozen package is installed in root and isolated layouts and the source tree is unavailable.                                   | Public schemas compile; both CLIs/native paths work; standalone observer uses `-I -B`, requires no new sibling/helper file and reports its exact full-file hash. Build-only generators/templates/fixtures remain absent.                                                     |
| **QA-011: Architecture and path semantics**             | A leaf imports configuration/orchestration, a runtime import is omitted from shipment, or platform path/stat inputs change.      | Native architecture/shipment gates reject the forbidden dependency; independent containment/fingerprint outcomes remain correct; graph-relative path syntax is not replaced by a runtime OS predicate.                                                                       |
| **QA-012: Fixture separation**                          | Source and packed qualification use the shared host/freezing helper in disposable roots.                                         | Their actual source/installed behaviors and independently authored errors remain tested; no user Git identity/configuration is changed; only exactly owned fixture paths are cleaned.                                                                                        |
| **QA-013: Compatibility guidance**                      | A maintainer reads current schema guidance or a fixture introduces the known contradictory current claim.                        | One guide identifies configuration 2/result 3/execution 1 and limit distinctions; its small conformance check fails the contradiction. Historical records remain byte-identical and are not treated as current validation inputs.                                            |
| **QA-014: Current native inventory and proof coverage** | Build/freeze/repack/acquire see current inventories, optional rights, duplicate/extra/missing members, or changed shared inputs. | Original/supplemental bytes and provenance remain distinct; hostile archives fail; independent expected inventories agree. Changed Python/action/schema/generation inputs reach an actual check or explicit conservative full obligation, not just a declared coverage glob. |

The independent oracle is the accepted behavior captured as literal cases, not the implementation before or after extraction alone.
Baseline differential checks are useful secondary evidence, particularly for unchanged schemas and release rejection, but cannot establish correctness when both paths now share the same function.
Preserve existing malformed native/result reports and historical hash-bound performance reports.
Do not update a failing expectation to match newly generated output unless the owner explicitly accepts a changed requirement.

A real OS probe must run in a bounded disposable child, especially when assigning a process to a kill-on-close Job.
Never assign the test runner or user application to the test Job merely to exercise a structure definition.
Python isolation, failure cleanup and installed behavior need process evidence; a source-text comparison or mocked ctypes return is insufficient.
Local Windows results do not stand in for Linux, and local action parsing does not stand in for hosted setup.

## 8. Vertical implementation slices

These are integration increments with a complete consumer path and proof, not a script of microscopic edits.
The default is sequential integration under one owner.
Potential independent work is identified in section 9; it is not delegation authority.
Every slice preserves unrelated checkout changes and uses exact path staging only at an authorized checkpoint.

### SLICE-001: Configuration to emitted result and current guidance

Links: DRY-001/013; REQ-001/013; AC-001/013; QA-001/010/013; DEC-002/010/011/013.

Create the data-only analyzer-limit authority and build-only schema sources.
Introduce the narrow generator, first proving that its baseline outputs retain current validation domains and public schema metadata.
Switch `contracts.js`, configuration/result/execution consumers and schema projections coherently.
Correct the current support-guide discrepancy and make the centralized guide the single current compatibility description.
Add a focused read-only generated-contract test and a packaging preflight using the same check implementation.
No runtime schema resolution service or installation generator is added.

Likely files: the three current schemas, `src/contracts.js`, new analyzer-limit leaf/schema sources/generator, `src/configuration.js`, relevant schema tests, `scripts/pack.js` or its existing staging preflight seam, and the two current guides.
Changes to source imports are needed only where ownership moves; avoid unrelated API renaming.

Proof: existing `contracts`, `result-validation`, `resource-limits` and `execution` tests, new independent limit/projection cases, generated-output mutation/idempotence cases, narrow prose conformance and an actual installed-schema probe through packaging.
Checkpoint: all three schema exports compile independently and a changed canonical fixture reaches each correct projection; source/installed current guidance agrees.
Rollback/cleanup: revert source/catalog/templates/generated outputs/docs as one unit; preserve prior receipts and historical schemas in release evidence.
No data backfill or consumer migration is required because accepted validation behavior is unchanged.

### SLICE-002: One native policy and bounded protocol through real checks

Links: DRY-003; REQ/AC-003; QA-002/003/010; DEC-003/010/013.

Introduce small native-policy/protocol leaves, derive the formatter asset and argument values, and obtain layout defaults from the existing formatter owner.
Move only common diagnostic kind classification/mapping after each protocol's admission.
Derive capacity-based names, worst permitted report pathname and cleanup cardinality.
Retain separate native-input and prose-retention byte policies and the check-only long threshold.
Wire asset drift checking into ordinary verification and packaging preflight.

Likely files: `src/preset.js`, `src/configuration.js`, `src/native-tool.js`, `src/native-checks.js`, `src/native-staging.js`, `src/prose-diagnostics.js`, `assets/snapper.toml`, new leaf/generator files and native/default-policy tests.

Proof: `native-checks`, `native-staging`, `opinionated-defaults`, `disabled-advisories`, `formatting` and appropriate `resource-limits` tests; exact command/config/policy assertions and 32/33-input, malformed-report and cleanup cases.
Checkpoint: direct formatting and actual file-batch checking use the same intended formatting policy while retaining the two admission contracts.
Rollback/cleanup: revert policy, generated TOML and all dependent adapters together; close only owned staging through existing identity-checked cleanup.
A cleanup failure remains failure evidence, not permission for a recursive fallback delete.

### SLICE-003: List recheck construction through both callers

Links: DRY-002; REQ/AC-002; QA-002/003; DEC-001/003/010.
Dependency: SLICE-002 establishes protocol capacity ownership first.

Extract only eligibility and complete continuation snippet construction into a pure internal operation in `prose-diagnostics.js`.
Use it from direct and grouped rechecking without changing literal filtering, finding order, admitted checks, flush behavior or timing ownership.
Keep native failure handling at each actual invocation.

Proof: `native-checks`, `lists`, `formatting`, `literal-protection` and relevant `quality`/document-worker cases with independently authored expected findings and exact edge snippets.
Include quote depth, indent/prefix mismatch, adjacent ordered/unordered differences, blank continuation boundaries, literal-only lines and genuine sentence faults.
Checkpoint: a representative list has the same independently expected public behavior through direct formatting and grouped quality checking; attributed time remains nonnegative and owned.
Rollback/cleanup: the coherent prose module/test change can be reverted; use existing caller staging cleanup and retain failing fixture evidence.

### SLICE-004: Runtime path and fingerprint ownership through staging

Links: DRY-011; REQ/AC-011; QA-006/011; DEC-009/010.

Move lexical containment and the five-field fingerprint into separate runtime leaves and update their actual imports.
Retain configuration path admission, native staging capability identity, candidate transfer and evidence packaging's stronger file/race/truncation logic.
Extend the narrow foundation rules to the new leaves if their current policy otherwise leaves a gap.

Proof: `contracts`, `native-staging`, `candidate`, `qualification-evidence`, `security-remediation` and `architecture` tests as affected, plus explicit Windows/POSIX predicate cases and stat-component mutations.
Checkpoint: hostile staging/evidence inputs are still refused at the same callers while native foundational imports remain free of configuration/Ajv side effects.
Rollback/cleanup: revert the leaves and import changes coherently; preserve every externally owned or identity-changed path on cleanup refusal.

### SLICE-005: Policy reference through workflow names and publication admission

Links: DRY-004; REQ/AC-004; QA-004/005; DEC-004/010.

Expose the validated reference with the existing matrix output and use it for all candidate names, corpus acquisition, performance/nonperformance branches and artifact conditions.
Create a separately named bootstrap declaration and enumerate the literal bootstrap consumers it governs.
Keep the frozen runtime policy/matrix in manifests and old candidate admission behavior unchanged.
Update current support prose only where needed to distinguish a policy reference from bootstrap.

Proof: `node-support`, `ci-reuse`, `ci-reuse-workflow`, `publication` and `github-release` cases as affected; synthetic policy fixtures resolve the exact job/artifact decisions and reject missing outputs without duplicating the production expression as the oracle.
Checkpoint: a changed fixture reference produces coherent expected names and one performance lane per platform, while historical candidate job inventories remain admitted under their frozen contract.
Rollback/cleanup: revert resolver/workflow/bootstrap/conformance changes together; old candidate receipts retain their own exact policy and attempts.
No workflow dispatch or artifact relabelling is part of this slice.

### SLICE-006: Dependency-free Python setup through all five lanes

Links: DRY-007; REQ/AC-007; QA-007/014; DEC-007/010.

Introduce the local composite action using the current pinned setup-uv declaration and one Bash reader.
Replace the five repeated blocks and update governance to inspect the actual nested action and calling order.
Conform the Bash pin reader to the existing stable finite target contract with independent valid/invalid fixtures.
Extend native push-path coverage for the shared setup authority and `.python-version`.
Use the repository's existing Prettier YAML parser for structural assertions, rather than introducing another parser dependency.

Proof: `python-target`, `python-runtime`, `ci-reuse-workflow` and action/bootstrap conformance; execute the reader in the Bash environments already required by the supported workflow hosts.
Assert five concrete callers: `check.probe`, `check.package`, `candidate.pack`, `candidate.consumer`, and `native.native`.
Mutations of nested action owner/SHA/options, ordering, output wiring and push filters must fail.
Checkpoint: the native lane can obtain the same admitted Python minimum before Node/npm, and the other four lanes use the identical setup authority.
Rollback/cleanup: revert action and all five callers/governance/filter changes together; remove only a task-owned temporary venv after retained proof no longer needs it.
Do not alter a user's system Python, HISEW runtime or global configuration.

### SLICE-007: Common control-context admission through every publication gate

Links: DRY-005; REQ/AC-005; QA-005; DEC-005/010.

Add a pure common control validator and explicit environment decoder.
Use them in both command entrypoints and every live common-context gate, while leaving provider fetching, candidate attempt, environment policy, origin mapping and recovery admission with their existing owners.
Remove same-boundary duplicated assertions only after characterization proves equivalent rejection.

Proof: `publication`, `github-release` and relevant origin/recovery fixtures, with independent negatives for each common field and mutation after prior admission.
Exercise the command environment mappings through supplied environments, not only direct helper calls.
Checkpoint: every publication entrypoint still rejects a changed or untrusted context before the corresponding effect.
Rollback/cleanup: revert shared rule/imports together; never rewrite already emitted origin maps or retained provider responses to fit a changed validator.
No external publication effect is needed to test this extraction.

### SLICE-008: Bounded release bytes through admission and reacquisition

Links: DRY-006; REQ/AC-006; QA-005/006/010; DEC-005/010.
Dependency: integrate after SLICE-007 to avoid concurrent edits to the same release gates.

Extract the release-local reader and supplied-byte SHA-256/SHA-512-SRI verification.
Move the four reader consumers and repeated archive checks without moving path validation, caller ceilings or provider policy into a generic filesystem helper.
Keep the archive reads at initial admission, environment/current-ref revalidation and registry/retained qualification.

Proof: `publication`, `github-release`, `registry-readback` and affected packaging tests; actual temporary regular/link/non-file inputs, controlled growth beyond caller-bound cases, independent bad SHA/SRI and archive mutation between gates.
Checkpoint: all four consumers enforce their own bounds through one byte primitive and still reacquire before their existing effects.
Rollback/cleanup: revert release-helper consumers coherently; preserve frozen archives and failure captures, then remove only owned scratch readers' fixtures.
Do not replace `qualification-evidence` or candidate staging readers with this simpler operation.

### SLICE-009: Isolated npm setup through retained, publish and registry jobs

Links: DRY-008; REQ/AC-008; QA-008; DEC-007/010.
Dependencies: SLICE-007/008 settle the gates separating npm environment selection from acquisition.

Introduce the narrowly named two-phase npm helper and replace only the three copied setup pairs.
Reuse current selected-Node executable binding, derive its platform prefix, create isolated npm configuration files and acquire/assert the existing exact npm version.
Leave setup-node action SHA, job permissions, environment protection, artifact acquisition and every publication operation visible in the workflow.

Proof: `publication`, `registry-readback`, helper boundary tests and workflow AST/mutation cases for all three callers, phase ordering, version/prefix selection, OIDC location and exact recovery step names.
Mock npm process/network acquisition at its external boundary for local deterministic setup tests; later hosted platform setup establishes real environment behavior.
Checkpoint: each job selects isolation before admission and acquires npm afterward, with unchanged publication effect order and refusal on setup failure.
Rollback/cleanup: revert the helper and three caller pairs together; task-local npmrc/cache disposal follows retained-evidence obligations and never targets the system/user cache.

### SLICE-010: One Windows ABI through standalone observer qualification

Links: DRY-009; REQ/AC-009; QA-009/010; DEC-006/010/013.

Create the build-only ABI/raw-operation source and a narrow deterministic embedder.
Replace the duplicated low-level blocks in both drivers, then adapt each existing driver to the same raw operation interface without combining their report/lifecycle policies.
Add read-only drift checking to ordinary tests and packaging preflight.
Preserve `observe.py` as the sole runtime Python asset needed by the existing observer export and launch contract.

Proof: `performance-observer`, `qualification`, `packed-qualification`, `python-runtime` and a focused real-Windows ABI/Job test invoked by the top-level Node inventory.
Use independently expected supported-x64 layouts and native operation outcomes, generator drift/marker/idempotence mutations, isolated installed `-I -B` execution and complete-file digest readback.
Run Linux observation regressions to establish that metric and cleanup code did not change through the refactor.
Checkpoint: both Windows drivers use one checked ABI definition while the installed observer remains standalone and its output identity still describes all executable observer source.
Rollback/cleanup: revert authority/generator/embedded blocks and adapters together; retain old observations against their original hashes and dispose of only quiescent owned child groups/Jobs.

### SLICE-011: Declared targets through shipment and architecture reports

Links: DRY-010; REQ/AC-010; QA-010/011; DEC-008/010.

Characterize existing supplied-metadata behavior, then add a pure target decoder used by shipment admission and entrypoint inventory.
Keep caller-owned path admission and membership/resource/process classification.
Extend narrow shared-tooling direction checks if needed so the new leaf cannot reach either consuming orchestrator.
Do not import the broader inventory function from shipment admission.

Proof: `architecture`, `dependency-graph`, `affected-tests` and `packaging` with independent target-shape fixtures, missing members and declared process roots.
Checkpoint: the actual npm stage and graph report interpret the same declared package targets without acquiring a dependency cycle or losing separate resource proof.
Rollback/cleanup: revert decoder/callers/rules together; retain architecture bundles only when they are accepted evidence, and clean exact disposable package stages through their current owners.

### SLICE-012: Shared test setup through source and installed qualification

Links: DRY-012; REQ/AC-012; QA-010/012; DEC-010.
Dependency: integrate after the observer and staging slices so fixture refactoring does not obscure their behavior changes during diagnosis.

Create a test-only helper for host Git/Python discovery, observed Python version and command-scoped Git fixture freezing.
Pass root/message explicitly and preserve the existing tests' independent assertions, trusted archives, corpus bytes and hostile-input construction.
Do not let the helper import production validators to derive expected results or redirect installed imports into the source checkout.

Proof: both `qualification` and `packed-qualification` suites, with path/fixture cleanup inspection and confirmation that isolated installed execution has no source-only helper dependency.
Checkpoint: both suites still demonstrate their distinct consumer paths using common neutral setup.
Rollback/cleanup: revert only helper/callers; fixture commits are disposable local test data, never commits in the real checkout.

### SLICE-013: Current native evidence vocabulary through build and repack

Links: DRY-014; REQ/AC-014; QA-014; DEC-010/012.
Dependency: SLICE-006 establishes shared native setup and trigger governance.

Add one build-only JSON inventory/platform mapping authority and integrate build completion, freeze, repack and acquire.
Keep the current base member set, binary member, self-hash exclusion and optional supplemental rights explicit.
Preserve each stage's resource/byte/provenance enforcement and tested historical version branches.
Add the new consumed authority to native push-path coverage and explicit test-impact relations.

Proof: existing `python test/native-evidence.py` and `python test/package-archive.py`, extended with independent base/supplement inventories, both archive formats, duplicate/extra/missing members, byte preservation and current/legacy interpretation cases.
Include `python -B test/text-output.py` to exercise the actual importlib-loaded build/performance sources and retain LF byte/provenance semantics.
Load the builder/freezer from an unrelated working directory in a bounded fixture, with no search-path augmentation, to prove exact file-relative vocabulary resolution.
Exercise acquisition naming with a controlled local transport or mocked network boundary, never a real release write.
Checkpoint: a controlled fixture travels through current freeze/repack with exact original bytes and separately identified rights, and malformed archives fail before acceptance.
Rollback/cleanup: revert the JSON authority and four consumers/trigger relations together; historical manifests, frozen assets and rights records are not regeneration targets.
No native rebuild, rights approval or real asset publication is implied by fixture conformance.

### SLICE-014: Consolidated consumer, assurance and handoff

Links: every REQ/AC/QA and DEC-010/013/014.
Dependency: SLICE-001 through SLICE-013 complete with their focused proofs.

Review the ownership matrix against the actual final imports and generators and close every finding's acceptance evidence.
Consolidate documentation, explicit data/process relations, workflow triggers, generated outputs and new ordinary verification entrypoints.
Finish authorized formatting, generator writes, staging and commit ordering before selecting the final native verification route.
Qualify the actual candidate archives and supported platform boundaries, then obtain the route-required ordinary review, independent verification and scoped security assessment on the frozen consolidated target.
Use substantive target-bound reports; denied actions, empty success responses and process completion alone do not establish review.
Address findings with narrow repair follow-ups and explicit evidence invalidation decisions.

Checkpoint: every matrix row has a concrete implementation and passing relevant proof, every material separation has its accepted reason/control, mandatory evidence gaps are resolved and retained resources have owners/dispositions.
Handoff states source delivery, local proof, HISEW receipt status, hosted evidence and downstream adoption separately.
Cleanup preserves the accepted plan, native evidence and historical material; it removes only exactly owned disposable material after its consumers finish.
Any commit/push/merge/release proceeds only within authority actually granted at that future point.

## 9. Dependencies and traceability

The integration owner owns all cross-slice imports, generated-output ordering, package and workflow boundaries.
Runtime/schema work and release/CI work may be inspected independently after interfaces are accepted, but concurrent writers must not edit the same files without explicit ownership.
Shared files create real sequencing constraints: `contracts.js`, `configuration.js`, `native-staging.js`, `prose-diagnostics.js`, `verify-publication.js`, `prepare-publication-environment.js`, `publish.yml`, `native.yml`, architecture policy, impact policy and packaging/conformance tests.
The default plan creates no additional agents or chats.

| Finding | Requirement / acceptance | Delivery slice       | Quality scenarios / decisions   | Proof and release or cleanup implication                                                                                          |
| ------- | ------------------------ | -------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| DRY-001 | REQ-001 / AC-001         | SLICE-001, SLICE-014 | QA-001/010; DEC-002/010/013     | Literal acceptance matrix, projection mutations and installed standalone schemas; source+generated rollback, no schema migration. |
| DRY-002 | REQ-002 / AC-002         | SLICE-003, SLICE-014 | QA-002/003; DEC-001/003/010     | Authored list findings/snippets plus both native callers; existing staging cleanup remains authoritative.                         |
| DRY-003 | REQ-003 / AC-003         | SLICE-002, SLICE-014 | QA-002/003/010; DEC-003/010/013 | Actual arguments/TOML, malformed protocol and capacity/cleanup tests; no native payload change.                                   |
| DRY-004 | REQ-004 / AC-004         | SLICE-005, SLICE-014 | QA-004/005; DEC-004/010         | Synthetic reference and historical provider inventory; no relabelled old artifacts or broadened CI reuse.                         |
| DRY-005 | REQ-005 / AC-005         | SLICE-007, SLICE-014 | QA-005; DEC-005/010             | Independent context negatives and each checkpoint after mutation; no external effect required.                                    |
| DRY-006 | REQ-006 / AC-006         | SLICE-008, SLICE-014 | QA-005/006/010; DEC-005/010     | Regular/link/growth/digest cases with actual reacquisition; retain immutable archives.                                            |
| DRY-007 | REQ-007 / AC-007         | SLICE-006, SLICE-014 | QA-007/014; DEC-007/010         | Real reader plus five-caller/action/filter mutations; future hosted proof distinct, temporary venv ownership explicit.            |
| DRY-008 | REQ-008 / AC-008         | SLICE-009, SLICE-014 | QA-008; DEC-007/010             | Prefix/isolation and job/effect ordering; no OIDC expansion or publication dispatch.                                              |
| DRY-009 | REQ-009 / AC-009         | SLICE-010, SLICE-014 | QA-009/010; DEC-006/010/013     | Independent Windows ABI/Job and isolated installed observer; retain complete-file identity and old evidence.                      |
| DRY-010 | REQ-010 / AC-010         | SLICE-011, SLICE-014 | QA-010/011; DEC-008/010         | Metadata fixtures and real npm shipment; no source inventory import into decoder.                                                 |
| DRY-011 | REQ-011 / AC-011         | SLICE-004, SLICE-014 | QA-006/011; DEC-009/010         | Platform/path/stat literals and hostile caller tests; no weaker runtime byte reader.                                              |
| DRY-012 | REQ-012 / AC-012         | SLICE-012, SLICE-014 | QA-010/012; DEC-010             | Both existing consumer suites and exact fixture cleanup; production never imports test setup.                                     |
| DRY-013 | REQ-013 / AC-013         | SLICE-001, SLICE-014 | QA-001/013; DEC-011             | Narrow current prose conformance and installed contracts; immutable history preserved.                                            |
| DRY-014 | REQ-014 / AC-014         | SLICE-013, SLICE-014 | QA-014; DEC-010/012             | Python archive/provenance fixtures and trigger coverage; no real asset/rights publication.                                        |

Semantically independent preparation may examine SLICE-004, SLICE-005 and SLICE-011 once the new leaf interfaces are accepted.
Integration of SLICE-007 → SLICE-008 → SLICE-009 is sequential because the same publication gates and order are the contract.
SLICE-002 precedes SLICE-003; SLICE-006 precedes SLICE-013; observer/staging behavior settles before SLICE-012; all precede SLICE-014.

## 10. Verification and evidence cadence

### Focused development proof

Use existing top-level Node test files directly for the relevant slice, for example:

```sh
node --test test/contracts.test.js test/result-validation.test.js test/resource-limits.test.js test/execution.test.js
node --test test/native-checks.test.js test/native-staging.test.js test/lists.test.js test/formatting.test.js
node --test test/node-support.test.js test/ci-reuse-workflow.test.js test/publication.test.js
node --test test/performance-observer.test.js test/qualification.test.js test/packed-qualification.test.js
node --test test/architecture.test.js test/dependency-graph.test.js test/packaging.test.js
python test/native-evidence.py
python test/package-archive.py
```

These are candidate focused commands to select by actual changes, not a requirement to run every line after every slice.
New test paths remain predictions until implemented and included in normal discovery.
Existing top-level `.test.js` discovery should execute generation, action and ABI conformance; where it delegates Python/Bash, assert process completion and bound it explicitly.
`scripts/verify.js` currently syntax-checks only `.js` and directly names three Python evidence files.
Do not assume a newly added `.py`, `.sh`, action YAML or generator check is covered merely by placing it under a familiar directory.

Preserve one read-only implementation of each drift assertion, with independent fixtures for mutation sensitivity.
Run it through ordinary verification and the appropriate packaging preflight so an unqualified generated schema/TOML/observer cannot be shipped just because a particular named test was not invoked.
Keep the existing deliberate architecture assertion in both ordinary tests and real packaging proof.
Update explicit generated/data/process relations, then demonstrate that changing the canonical authority selects its consumer checks or the existing conservative full route.
Do not turn graph reachability into complete coverage or allow an advisory selector to reduce required hosted assurance.

### Final candidate and native capture

Inspect actual current HISEW obligations, profile command composition, environment identity and evidence-reuse eligibility before scheduling the final run.
The current `full` profile invokes `npm run check:full` with a 900-second outer bound and already includes every top-level Node test, named native/Python regressions, formatting and authored documents.
Its packaging tests supply actual consumer evidence, subject to inspection of their final assertions.
Do not first run an equivalent manual full suite and repeat it solely to obtain a receipt.
Use the supported native completion/capture route for the canonical required run after planned inputs, generators, staging and authorized commits are settled.
Where an admissible existing receipt covers an unchanged required obligation, use the supported reuse path without relabelling unrelated evidence.
Independently required execution remains separate and is planned explicitly.

The final proof also needs the affected real Windows/Linux boundaries and actual installed archives.
Determine which of these are executed by existing local/hosted profiles and which remain explicit supplemental obligations; record gaps instead of treating `coveredPaths` as coverage.
A local Windows run cannot supply Linux setup/observer evidence, and static workflow tests cannot claim deployed CI behavior.
Normal hosted runs become observable after separately authorized source delivery; this plan does not authorize a manual workflow dispatch or publish job.
If the full command's actual new composition cannot fit its current bound, measure the responsible work and propose an exact justified change or evidence composition decision; do not silently increase timeouts, skip tests or edit exclusions.

Consolidate before broad review.
Resolve actual ordinary reviewer, independent verifier and native security-provider availability through supported discovery when the later accepted implementation reaches that gate.
This planning task has not admitted or executed a reviewer capability and promises no particular paid model/provider.
Retain provider identity, target, completed substantive output and limitations; missing/denied/empty evidence remains an unresolved obligation.
Use one top-level scoped security workflow for the frozen final change, covering the touched native/filesystem, release/CI and input trust boundaries.
Do not substitute a general code review for the security assessment or a security finding count for independent correctness verification.

An edit after evidence requires an input-specific decision: identify the changed bytes, affected commands and prior target, then rerun what is invalidated.
A semantic formatter fix invalidates relevant behavior proof.
A demonstrated layout-only document edit normally needs document checks and an explicit snapshot assessment; it does not automatically justify another full suite.
Respect any actual exact-candidate gate, preserve prior results under their original identity and never fabricate a fresh receipt from a remembered exit code.

### Validation of this planning deliverable

Only the new plan is formatted/checked during this task.
Use the installed Prettier on its literal path, the repository Markdown CLI on that one literal path, a relative-link check for the plan and `git diff --check`/one-file scope inspection.
Literal Markdown CLI paths follow `--`.
Do not run full source, package, native, performance, review or security workflows to validate a planning document.
The task handoff records the actual document check result separately from all future implementation evidence.

## 11. Compatibility, migration and recovery

### Source, schema and package cutover

This is a coordinated source refactor with checked generated outputs, not a persistent-data migration.
There is no backfill or dual-read/write period.
Existing caller APIs and emitted report fields remain unchanged.
Generate current schemas/TOML/observer blocks from the selected authorities before qualification and track them with their inputs in the same coherent change.
Any interrupted generation is detectable by read-only drift checks; rerun the explicit generator and inspect its exact diff before resuming.
A generator must not overwrite unknown paths or historical material.

Schema templates and generator/ABI authorities stay build-only and are excluded from consumer archives by the existing package boundary.
New runtime leaves are included through the existing `src` membership, with real packlist/import-closure proof.
No schema `$id`, version, export target or observer identity format changes are planned.
The source HEAD/tree and resulting source/archive hashes will naturally change; compare behavior for the same candidate using the existing provenance mechanisms instead of demanding old hashes for new source.
Do not normalize away changed diagnostics, selection, policy or archive content as if they were incidental identity differences.

The Windows observer remains one executable Python file and the existing exported target remains usable independently with `-I -B`.
Generated ABI source is already inside that file, so the full-file digest continues to bind its operative code.
The two driver reports retain their established shapes, platform labels, timing windows and failure/cleanup semantics.
An observer metric, field or hash-meaning change would require a different compatibility decision and re-baseline.

Publication readers continue to understand their existing tested historical records and recoverable partial tuples.
Current native inventory ownership applies to the current controlled manifest branch; a historical branch is not rewritten into current authority.
Native artifacts, release JSON, original license bytes, registry-alpha fixtures and compressed incumbents remain unchanged.
Use existing rights/provenance validation of supplied bytes, not a newly rendered approximation of historical evidence.

### Interruption and resumption

At a meaningful checkpoint, retain the exact candidate identity, completed slice/AC evidence, pending decisions, generated-output state and resource owners in the existing task/native record.
On resume, inspect HEAD, tree, staged/untracked changes, current applicability, session/execution ownership and liveness before mutation.
A inherited session ID or readable old execution is not ownership.
If a process is still running, let the owned process finish or use its supported bounded recovery; do not launch another full command or remove its workspace to clear a lock.
Reconcile prior proof with the actual candidate and environment, preserving evidence rather than recasting it as current.

Maintain source authority and outputs together at checkpoints.
An incomplete extraction never enables an old/new runtime selector or fallback implementation.
If a required consumer cannot be updated/qualified coherently, leave activation blocked and request the exact owner decision while continuing independent authorized work.

### Abort, rollback and forward fix

Abort activation when generated files drift, an independent expected result changes, a protocol becomes more permissive, a platform observation is unavailable, a shipment member disappears, a reference lane is ambiguous or a publication checkpoint/effect order changes.
The integration owner diagnoses the exact failing boundary and retains its evidence.
The repository owner decides any amended semantics or reduced acceptance; an agent cannot silently waive them.

Before public effects, restore the coherent last accepted source/configuration/generated set and requalify affected behavior.
Do not restore by deleting unrelated work, rewriting historical evidence or forcing the branch.
After separately authorized source integration, a qualified forward fix is preferable when a simple revert would invalidate currently adopted contracts.
After package publication, immutable published bytes cannot be replaced; use the existing explicit recovery route for a partial tuple or accept a new coordinated version and qualification.
No claim that a source revert undoes publication is made.

Temporary stages, child processes, npm caches/venvs and test fixture repositories have exact owners and bounded purposes.
Retain proof and failures needed for review, recovery or downstream acquisition before disposal.
An ignored path is not disposable merely because it is ignored.
Never extend HISEW exclusions to hide new observer/generator source or create a stale-pass exception.

## 12. Security, observability and principal unknowns

This task introduces no telemetry service, secret store or remote policy dependency.
Release inputs, provider JSON, native output and filesystem metadata remain untrusted at their existing boundaries.
Shared pure validation reduces duplicated policy, but every reachable effect boundary must still enforce its own admission before acting.
Private document payloads remain in the current bounded private staging area with existing link/identity/access checks and cleanup failures.
Logs/evidence may contain source paths, Git identities, provider metadata or document findings; use the existing appropriate evidence store and inspect before sharing.

Operational acceptance uses existing signals:

- Generator checks name the stale known output and fail before packaging; a successful regeneration alone is not independent validation.
- Architecture/shipment assertions identify forbidden paths and missing runtime/resources without hiding failures behind selector fallback.
- Workflow outputs expose the resolved reference and concrete lane identities; provider/artifact names match the frozen policy actually admitted.
- Publication gates retain actionable context, byte, origin and main-advance refusal, without logging credentials or broad environment dumps.
- Observer reports preserve process quiescence, failure cleanup, sample/metric limitations and complete-file identity; no missing observation becomes success.
- The integration handoff records each DRY/AC result and genuine remaining evidence gap without claiming a runtime, CI-cost or maintenance-time saving that was not measured.

The future hosted observer is the repository owner or an explicitly delegated operator.
After authorized delivery, inspect the naturally triggered package/candidate/native consumer paths affected by changed inputs, their exact attempt/source/artifacts and any FULL/REUSED decision separately.
Release operators retain publication/registry/pilot acceptance responsibilities only if a release is later authorized.
Consumer maintainers separately accept any new producer/archive/workflow tuple.

| Unknown                                                                       | Cheapest discriminating check before dependent activation                                                                                                         | Owner and required disposition                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Schema projection fidelity and direct installed Ajv behavior.                 | Generate from a fixture copy of the baseline sources; compare structures, run the literal acceptance matrix and compile each actual installed export alone.       | Integration owner; any acceptance-set or `$id` change goes to the repository owner before continuing.                  |
| Exact native TOML/argument and line-accounting boundaries.                    | Inspect both current invocations with existing native fixtures and fixed malformed reports; assert check-only threshold and scalar/file differences explicitly.   | Runtime implementer/integration owner; a protocol or policy change requires an amended AC.                             |
| Package metadata edge shapes currently tolerated.                             | Table-driven characterization against both existing decoders with supplied in-memory metadata.                                                                    | Tooling implementer; preserve behavior or obtain explicit separate correction authority.                               |
| Dependency-free Bash pin parsing across supported hosts.                      | Execute the actual action reader with changed, malformed, overflow and newline fixtures before setup; compare independent contract outcomes with `python-target`. | CI integration owner; do not introduce Node/Python bootstrapping dependence as a workaround.                           |
| Composite action/workflow inspection and native path coverage.                | Parse current workflow/action YAML with the installed Prettier parser; mutate the exact local action, nested SHA, order and filters.                              | CI integration owner; unresolved nested trust or missing consumer triggers block activation.                           |
| Complete Windows ABI and lifetime equivalence.                                | Bounded real Windows child probes of literal layout expectations, assignment/query/termination and both driver's ownership semantics.                             | Platform verifier; preserve single-file identity or replan any required ABI/driver correction.                         |
| Standalone generated observer packaging.                                      | Install the candidate archive with the source tree unavailable; invoke existing `-I -B` launch and compare its reported digest with the installed file.           | Packaging verifier; a dependency on source/build-only files is a failure, not an invitation to add an import fallback. |
| New conformance checks actually execute in ordinary/full verification.        | Mutate each new canonical input/output/action relation and observe the intended top-level check or conservative fallback fail. Inspect `verify.js` composition.   | Integration owner; add relevant repository checks rather than relying on `coveredPaths`.                               |
| Final timing and native evidence eligibility.                                 | Inspect profiles/environment/capture route before final work; use focused timings to identify a real 900-second-bound risk.                                       | Lifecycle owner; any configuration change needs an exact proposed scope and owner acceptance.                          |
| Reviewer/independent/security capability availability at implementation time. | Supported read-only discovery for the selected providers, followed by actual scoped capability admission only when authorized/required.                           | Lifecycle owner; absent substantive mandatory evidence needs an accountable alternative or remains a gate.             |
| Historical schema-1 sentence provenance.                                      | Inspect only the exact release/source evidence if retaining that historical claim is useful.                                                                      | Documentation owner; otherwise remove the unverified current claim, without inventing historical support.              |

## 13. Replanning triggers and completion definition

Replan before continuing dependent work if any of the following occurs:

- The audit baseline materially changes, a current consumer is omitted, an additional duplication changes ownership scope, or proposed helpers accumulate unrelated modes.
- Schema versions/IDs, accepted input domains, public exports, formatting bytes, diagnostics, resource ceilings, native retry behavior or error semantics need to change.
- A direct installed schema requires a custom resolver, a generated observer requires a sibling import, or complete observer identity would no longer bind the operative code.
- Linux metrics, Windows cumulative/fresh-Job semantics, native executable bytes or rights/provenance meanings change.
- Shared schema/ABI generation cannot be deterministic and narrow, or packaging can bypass its required drift check.
- The matrix shape, frozen historical policy, candidate admission, CI reuse contract, publication permissions, native-before-core sequence or recovery step names would change.
- Native workflow trigger coverage cannot follow the actual shared inputs, or bootstrap begins depending on software it is meant to provision.
- Architecture enforcement must be weakened, a runtime leaf must reach configuration/orchestration, or test-only setup becomes part of the shipped runtime graph.
- A new dependency, license, platform, release version, compatibility bridge or independently deployed consumer is proposed.
- Exact HISEW ownership/candidate/environment evidence is unavailable, a required profile change is necessary, or mandatory independent/security evidence remains incomplete.
- The proposed reversal would lose user work, replace immutable evidence or require an unapproved irreversible effect.

The implementation is complete only when all fourteen findings have their concrete accepted outcome, every AC has relevant evidence, generated representations have enforceable current authority, retained separation is justified, route-required assurance is complete and owned resources are reconciled.
The higher outcome is coherent future maintenance with unchanged consumer trust and behavior.
Source delivery, local tests, HISEW completion, hosted qualification, package release and downstream acceptance must each be reported at the level actually achieved.
For this planning task, completion is the saved reviewable draft and passing document-focused checks; implementation and release remain unstarted.
