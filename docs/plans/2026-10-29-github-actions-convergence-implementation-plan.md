# GitHub Actions convergence with JSON Quality: implementation plan

Date: 2026-10-29, Europe/Bucharest.
Revision: 1.
Status: draft implementation dossier based on the owner's accepted design decisions; implementation is not started.
Decision owner: Maksym Shostak / Hadden Industries.
Implementation scope: Hadden-Industries/markdown-quality only.
Inspected Markdown source: fa1188a867b29bddd0b972a080b7fcd0261bdec3.
Inspected JSON reference: 33c95858d316ca3cdabf319a2705f9161d44e7e5.
Originating task: Codex conversation 01a18571-e3ca-7f42-9a2a-cd0c65f04ab5, GitHub Actions comparison and subsequent owner decisions.

## 1. Purpose, authority and completion boundary

Adopt JSON Quality's coordinated CI, deliberate qualification, evidence transport and governance model while preserving the stronger or necessary Markdown-specific guarantees.
The intended outcome is less duplicated qualification and a clearer acceptance decision without weakening installed-consumer correctness, security coverage, release integrity or recovery.

The owner accepted the comparison's ten decisions, subsequently selected exactly Node >=22.13.0 with best-effort non-LTS support, rejected GitHub workflow dependency lockfiles, and explicitly instructed: "Keep the local KaTeX fix."
Those decisions are the design basis below.
This request authorizes writing and checking this plan in docs/plans; it does not authorize implementation, commits, remote settings changes, workflow dispatches, publication or changes to JSON Quality.

REQ, AC, QA, DEC and SLICE identifiers are introduced here as a reviewable representation of that agreement.
They are not identifiers from an already captured HISEW requirement snapshot.
The proposed R2 route and the exact plan revision require acceptance before implementation starts.
Do not fabricate an execution, snapshot, approval, review or verification receipt.

HISEW inspection on the planning date reported personal applicability active, no work in progress in this worktree, and worktree-local focused, affected and full profiles.
Their current commands are check:focused, check:affected and check:full, each with a 900-second outer timeout.
The engine reported risk-route-not-selected.
These observations establish planning context, not product verification or permission to adopt unrelated retained resources.

There are three distinct delivery boundaries:

1. Source implementation: code, workflows, tests and documentation satisfy this dossier at an exact commit.
2. Repository activation: the new hosted graph and approved GitHub configuration are verified together.
3. Package release: an independently selected version is freshly qualified, staged, approved, checked through the public registry and promoted.

Completing the source implementation does not assert the other two boundaries have completed.
This plan prepares the release machinery but does not select or publish the next product version.
Published version 1.0.3 and its historical evidence remain immutable.

## 2. Accepted decisions and scope

| Decision | Original point           | Accepted result for Markdown Quality                                                                                | Consequence or retained boundary                                                                           |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DEC-001  | 1                        | Adopt JSON's coordinated producer, reusable qualification and single acceptance architecture                        | One authoritative distributed package tuple; platform-sensitive behavior remains qualified                 |
| DEC-002  | 2                        | Adopt the deliberate-only ordinary product CI process                                                               | PR ready_for_review starts full qualification; main observation never silently starts full tests           |
| DEC-003  | 3                        | Publish exactly >=22.13.0 and copy the distinction between tested LTS and best-effort other releases                | Do not add a Node 23 exclusion; dependency engine restrictions remain possible on best-effort releases     |
| DEC-004  | 4                        | Retain the Rust/Snapper production model and required Python virtual environment                                    | Do not import JSON's C++ build, Node-API or sanitizer implementation                                       |
| DEC-005  | 5                        | Retain root and isolated installs in ordinary and release qualification, real corpora and process-tree observations | Do not reduce coverage to JSON's current ordinary root-only consumer path                                  |
| DEC-006  | 6                        | Combine common packaging/evidence principles with Markdown-specific packaging and trusted-tree qualification        | Retain the KaTeX repair until a qualified upstream upgrade makes its machinery unnecessary, then remove it |
| DEC-007  | 7                        | Adopt explicit security orchestration without reducing coverage                                                     | Actions, JavaScript/TypeScript and Python remain mandatory; scheduled security scanning remains            |
| DEC-008  | 8                        | Reuse JSON's centralized release contracts and recovery discipline while retaining separated publication privileges | npm and GitHub effects remain separate; exact-byte handoffs and reconciliation are mandatory               |
| DEC-009  | 9                        | Adopt JSON's whole-workflow validation, immutable artifact transport and equal-input evidence reuse                 | Keep full SHA pins; GitHub workflow dependency lockfiles are explicitly excluded                           |
| DEC-010  | 10                       | Adopt JSON's governance model, adapted to this repository                                                           | Strict acceptance, merge commits, no bypass actors, narrow actions policy and read-only defaults           |
| DEC-011  | Latest scope instruction | Implement and activate only Markdown Quality when subsequently authorized                                           | JSON backports are separate work and cannot become a dependency on unimplemented JSON changes              |

The owner's range decision supersedes the earlier recommendation of ^22.13.0 or >=24.0.0.
The rejection of workflow dependency lockfiles supersedes the earlier recommendation to introduce them.
The KaTeX retention decision means keeping the repair while the upstream dependency chain still needs it.
Remove the repair and its redundant machinery once a maintained upstream upgrade supplies the fix and the installed-consumer checks pass without the workaround.
That conditional removal is part of the agreed design and does not require another keep-or-remove decision.

### 2.1 Included changes

- CI workflow structure, deliberate triggers, matrix ownership, source/consumer command boundaries and mandatory acceptance.
- Node policy schema and generated current declarations, producer/consumer toolchain separation and concrete runtime recording.
- Evidence transport, original-attempt provenance, retention, bounded acquisition and read-only main reuse decisions.
- Retention of the necessary KaTeX repair, with removal of repair-only machinery when a qualified upstream upgrade makes it redundant.
- Explicit CodeQL configuration, dependency review and audits, with corresponding release admission changes.
- Release contract consolidation, inventory, attestation integration, journalled effects and permission-separated handoffs.
- Markdown repository governance declarations, readback tooling and an explicitly gated activation procedure.
- Relevant tests, workflow contracts, command documentation and stale-path removal.

### 2.2 Excluded changes

- Any file, workflow, setting, issue, package or release mutation in json-quality or downstream consumer repositories.
- A new cross-repository shared package, organization-wide CI service or dependency on a sibling checkout at runtime.
- Changes to Markdown diagnostics, formatting semantics, link selection, public resource limits or concurrency defaults.
- Removing the KaTeX repair before the upstream fix and equivalent installed-consumer behavior are verified.
- Adding a replacement renderer or dropping math support.
- Replacing Snapper, changing its frozen upstream revision, or introducing JSON's native C++ implementation.
- Adding workflow dependency lockfiles, automatically qualifying every push, or silently falling back to full CI on main.
- Reducing corpus scope, resource evidence, installation layouts or security languages to match a smaller donor inventory.
- Selecting the next package version, rewriting published metadata or performing a release as a migration test.
- Blanket cleanup of historical artifacts, other sessions' resources or unrelated HISEW continuations.

## 3. Evidence basis and current behavior

The repository was clean before this document was added.
Facts below were inspected in this conversation; historical successful runs are contextual evidence for their exact sources, not passes for the proposed implementation.

| Evidence | Observed fact                                                                                                                            | Planning use                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| EVID-001 | Markdown has separate check.yml and candidate.yml product/transport paths, plus release wrappers                                         | Consolidate orchestration and eliminate repeated authoritative packing                                         |
| EVID-002 | JSON ci.yml coordinates policy, product, native, dependencies, CodeQL and CI / acceptance                                                | Reuse the design and implementation seams, adapting repository-specific job inventories                        |
| EVID-003 | Markdown's Node policy is schema 1 with minima 22.13.0, 24.0.0 and 26.0.0, reference 24.21.0 and windows-latest/ubuntu-24.04             | Migrate to one compatibility floor, explicit tested LTS families and a separately pinned producer              |
| EVID-004 | Current production dependency metadata admits 22.13.0; ESLint rejects 22.12.0 and Node 23                                                | Retain the verified floor and explicitly document best-effort limitations without narrowing the accepted range |
| EVID-005 | Hosted transported-consumer checks on Node 22.13.0 passed on both operating systems                                                      | Useful floor precedent; repeat on the new exact candidate                                                      |
| EVID-006 | Markdown's full verifier ends with JSON package qualification, identity lint, JSON tooling tests and the mandatory JSON check            | Preserve the complete obligation and final-check ordering while removing redundant producer work               |
| EVID-007 | Markdown uses externally frozen Rust source, controlled native evidence and a Python virtual environment                                 | Retain the native acquisition/build and interpreter owners                                                     |
| EVID-008 | Markdown's real-corpus qualifier checks complete findings, selected paths, identical results, unchanged inputs and process cleanup       | Retain the independent oracle and resource measurements                                                        |
| EVID-009 | Current Markdown release security admission expects the default CodeQL analysis identity                                                 | Migrate scan production and release admission together                                                         |
| EVID-010 | Markdown already separates npm promotion from GitHub release mutation; JSON combines them in one promotion job                           | Preserve the stronger separation while reusing common release logic                                            |
| EVID-011 | Both repositories retain identical AGPL-3.0-only license bytes, SHA-256 8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef | Preserve source attribution and notices for adapted code; inspect new third-party components separately        |
| EVID-012 | HISEW is active and exposes the current local profiles; no route is selected for this change                                             | Capture an accepted exact baseline and select the real obligations before future execution                     |

Primary local authorities are [CI trust](../ci-trust.md), [runtime compatibility](../node-runtime-compatibility.md), [centralized contracts](../centralized-contracts.md), [performance qualification](../performance-qualification.md), [native builds](../native-builds.md), [release operations](../release-operations.md) and [support/release policy](../support-and-release.md).
Existing accepted plans remain historical authorities for preserved guarantees; this dossier replaces only the explicitly changed CI and runtime decisions.

### 3.1 KaTeX investigation and retained repair

On 2026-10-29, npm reported @eslint/markdown 8.0.3, micromark-extension-math 3.1.0 and KaTeX 0.19.1 as their latest published versions.
Both upstream development manifests still selected micromark-extension-math ^3.1.0 and KaTeX ^0.16.0 respectively.
A fresh disposable installation without overrides or lifecycle scripts resolved KaTeX 0.16.47.
Its native npm audit reported GHSA-238p-pmpm-9mq7, whose fixed line starts at 0.18.2.
This establishes the affected dependency resolution; it is not a claim that Markdown's CLI itself meets every exploitation precondition.

The retained mechanism is [bundled-dependencies.js](../../scripts/bundled-dependencies.js): acquire from the frozen lock/cache, repair the one disclosed dependency declaration, preserve upstream executable bytes and notices, inventory the actual bundle, and validate fresh recipients.
Do not retain only the root override: npm does not apply a dependency's override to its consumer's graph.
The owner accepts continued maintenance of this narrow repair only while it remains necessary.
The Markdown maintainer reassesses it at dependency updates and release qualification.
Once a maintained upstream release naturally resolves a fixed KaTeX version, qualify fresh root and isolated consumers without overrides, the manifest repair or special bundling.
Require the existing rendering, security, dependency-validity and offline-reinstallation checks to pass against that upstream graph.
Then remove the override, manifest repair and any bundling, inventory generation or tests that exist solely to support the workaround.
Retain general package-integrity, SBOM and attribution controls, plus meaningful consumer behavior and security regression tests.
The currently inspected upstream graph does not meet that removal condition, so the initial implementation retains the fix.

Sources: [ESLint Markdown manifest](https://github.com/eslint/markdown/blob/main/package.json), [math extension manifest](https://github.com/micromark/micromark-extension-math/blob/main/package.json), [KaTeX advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7), and [npm override semantics](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).

### 3.2 Cost evidence and its limits

JSON release run 40661674658 supplied eight observed consumer lanes on 2026-10-28.
Its cost-relevant qualification scripts were unchanged at the inspected donor commit.
The isolated-layout work shared with ordinary CI took approximately 9-11 seconds per Linux lane and 48-88 seconds per Windows lane, totaling about 4.9 runner-minutes.
Including release-only evidence, the corresponding ranges were 11-14 and 59-101 seconds.
The likely parallel elapsed-time addition was around 1-1.5 minutes, not the sum across runners.

These are one run's observations, partitioned from its phase logs, not a fresh non-release A/B benchmark or a promised Markdown saving.
Markdown already performs both layouts; preserving them is mandatory here.
Measure the new Markdown graph before reporting cost improvements.
Separate queue time, installation, reference checks, packing, consumer execution, corpus checks and artifact transfer.

References: [JSON timing run](https://github.com/Hadden-Industries/json-quality/actions/runs/40661674658) and [Markdown floor-consumer run](https://github.com/Hadden-Industries/markdown-quality/actions/runs/40359621500).

## 4. Proposed HISEW route

### Risk class:

R2 for the future implementation, proposed for owner acceptance.
The plan-writing activity does not itself activate that route.

### Decision owner:

Maksym Shostak / Hadden Industries accepts scope, risk and consequential activation/release decisions.
The future implementing coordinator owns integration, evidence and cleanup within that authority.

### Reasoning:

The change affects public compatibility declarations, required-check enforcement, artifact trust, credential boundaries, cross-service publication, retries and recovery.
A wrong acceptance or release decision can admit unqualified bytes; GitHub configuration can also prevent legitimate merging.
These are explicit R2 triggers even when most product behavior is preserved.
No additional R3 consequence has been established by this task.

### Potential blast radius:

Markdown contributors, hosted qualification, package consumers and all three Markdown npm packages.
Downstream repositories may consume immutable workflow/package identities, but their configuration is outside implementation scope.

### Reversibility:

Unactivated source changes can be reverted.
Remote governance can be restored only through a captured, still-valid authorized configuration.
Published versions and externally observed effects cannot be rolled back by reverting Git.
Ambiguous publication results require reconciliation; unsupported old receipts must not be revived to make recovery pass.

### Principal unknowns:

Exact live repository settings at activation, current action/toolchain selections, hosted runner qualification, new artifact sizes and the registered profile's final command coverage/duration.
Section 12 assigns the cheapest evidence and decision boundary for each.

### Required artifacts:

This accepted exact plan, its protected requirement snapshot, route rationale with applicable sensitive scopes, implementation diff, focused and full evidence, independent review dispositions, hosted run identities, governance before/after readback and recovery records where effects occur.
Reuse existing records; do not create duplicate dashboards or evidence bundles without a consumer.

### Required specialist lenses:

Independent implementation/contract review and security assessment of changed trust, workflow and publication boundaries.
Review source provenance, dependency licensing/notices and native evidence changes where materially affected.
Select the current supported providers during execution; this plan launches no scan, review provider or subagent.

### Required verification:

Focused slice regressions, the full relevant local profile, both hosted platform/runtime matrices, installed archives, real-corpus observations, security analysis, evidence rejection cases and approved remote-policy readback.
Local tests, HISEW receipts, hosted CI and release evidence remain separate evidence classes.

### Required human approvals:

Acceptance of this exact implementation baseline and R2 route, plus authorization for the concrete remote activation/publication actions when applicable.
Reuse authority already supplied in the future execution conversation; do not manufacture repeat approval gates.
npm owner approval, stable-promotion acceptance and the existing trusted-consumer owner boundary remain distinct controls.

### Maximum sensible autonomy:

For this request: write and validate the plan only.
After implementation authorization: progress through accepted source changes and verification without avoidable phase prompts; preserve separate authority for remote effects, release and unrelated resources.

### Next lifecycle step:

Review and accept this revision, capture its exact requirement snapshot, recheck applicability and ownership, select the R2 obligations, then begin SLICE-001.
Commit the accepted plan at the first authorized implementation checkpoint before executable changes.
Format and lint every file in each exact commit scope before committing.

## 5. Requirements and acceptance criteria

Each AC below is an observable acceptance condition, not a claim of completion.

| Requirement                                  | Acceptance criterion                                                                                                                                                                                                                                                                         | Decision basis            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| REQ-001 Coordinated qualification            | AC-001: one frozen matrix and one authoritative core/native archive tuple serve every runtime consumer; one acceptance check rejects any missing mandatory result                                                                                                                            | DEC-001                   |
| REQ-002 Deliberate lifecycle                 | AC-002: ready_for_review and explicit main dispatch produce full ordinary qualification; main push produces a reuse decision only; missing proof produces FULL_REQUIRED without launching full tests                                                                                         | DEC-002                   |
| REQ-003 Broad compatibility policy           | AC-003: current package declarations project exactly >=22.13.0; mandatory lanes cover the floor, latest stable releases of tested LTS families and the independent reference on both platforms                                                                                               | DEC-003                   |
| REQ-004 Native and Python preservation       | AC-004: frozen Snapper/source/rights identities and both native packages remain validated; every Python-dependent path uses the required virtual environment                                                                                                                                 | DEC-004                   |
| REQ-005 Installed-consumer coverage          | AC-005: every ordinary and release runtime lane passes root and isolated installations, exact native identity, public behavior and offline frozen-lock replay with separate attributable results                                                                                             | DEC-005                   |
| REQ-006 Corpus and resource preservation     | AC-006: retained OwlAPI/WebVOWL corpus scope, complete diagnostics, repeated result identity, unchanged inputs, resource thresholds and zero-descendant completion remain enforced                                                                                                           | DEC-005                   |
| REQ-007 Packaging and trusted data           | AC-007: fixed KaTeX reaches fresh recipients; retain complete bundle evidence while the repair is needed, then remove redundant machinery after qualified upstream replacement; trusted Markdown qualification preserves link-target scope and rejects candidate-controlled execution/policy | DEC-006                   |
| REQ-008 Security completeness                | AC-008: Actions, JavaScript/TypeScript and Python scans, dependency review and applicable audits are mandatory; release admission recognizes the new exact-source scan identities                                                                                                            | DEC-007                   |
| REQ-009 Release effect integrity             | AC-009: source, version, archive, inventory, qualification and approval identities are revalidated before each effect; npm and GitHub mutation credentials are separated; unknown effects are never blindly retried                                                                          | DEC-008                   |
| REQ-010 Artifact and proof integrity         | AC-010: complete workflow contracts and artifact provenance are validated; wrong, expired, substituted, incomplete or mixed-attempt evidence cannot grant acceptance, reuse or release                                                                                                       | DEC-009                   |
| REQ-011 Repository governance                | AC-011: actual GitHub readback matches the approved Markdown policy, including required acceptance and selected actions, without enabling bypasses or losing the Python setup action                                                                                                         | DEC-010                   |
| REQ-012 Evidence and compatibility migration | AC-012: live consumers switch coherently to the current contracts; historical evidence remains immutable; diagnostics cannot satisfy full qualification; no interval allows merging without the intended checks                                                                              | DEC-001, DEC-008, DEC-009 |
| REQ-013 Scope and maintainability            | AC-013: JSON Quality and downstream checkouts/settings are untouched; internal policy has one owner, documentation matches execution, and no unapproved shim or workflow lockfile is introduced                                                                                              | DEC-009, DEC-011          |

### 5.1 Quality scenarios and independently owned oracles

| Scenario                    | Stimulus and environment                                                                                           | Required response and measurable evidence                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 Deliberate request   | Open a draft, push changes, mark ready, then change its head                                                       | Only the ready checkpoint launches ordinary full CI; changed content cannot merge on stale acceptance                             |
| QA-002 Missing proof        | Push a merge whose original receipt expired or cannot be authenticated                                             | Main reports FULL_REQUIRED with a reason; no automatic full suite; release remains blocked without fresh evidence                 |
| QA-003 Valid reuse          | Ordinary same-repository merge has equal qualified tree, policy, matrix and native inputs                          | Reuse names the original run, producing attempts and artifact identity; the observer creates no replacement product proof         |
| QA-004 Changed environment  | Same supported image family has a new build number; separately change a required runtime or native identity        | Incidental image-build drift alone can reuse; changed qualification inputs cannot; original image provenance is retained          |
| QA-005 Aggregate bypass     | Omit, cancel, skip or duplicate a required consumer/security/native result                                         | Acceptance fails even when GitHub reports some skipped jobs as acceptable                                                         |
| QA-006 Runtime floor        | Install and exercise the transported tuple on Node 22.13.0 on Windows and Linux                                    | Both layouts, multi-document native staging, formatting/preservation and failure paths pass with recorded Node/npm identities     |
| QA-007 Layout defect        | Correct root installation but broken isolated resolution, or reuse the same output filename                        | Lane and aggregate fail; two distinct layout results are required                                                                 |
| QA-008 Corpus regression    | Change a diagnostic, selected link target, output ordering, input byte or cleanup outcome                          | Existing independent full-result oracle rejects the change; no synthetic benchmark substitutes for corpus correctness             |
| QA-009 Resource regression  | A corpus exceeds 30000 ms or 536870912 observed tree bytes, or leaves descendants                                  | Qualification fails and retains all observations; no retry discards the failed sample                                             |
| QA-010 Unsafe artifact      | Supply wrong repository/run/source/digest, archive traversal, linked members, duplicate paths or excessive payload | Reject before accepted materialization/use; record a bounded failure; never admit by artifact name alone                          |
| QA-011 Attempt mixing       | Combine successful retained jobs with a later failed rerun or altered producer artifact                            | Verify each original producing attempt and final inventory; inconsistent evidence fails                                           |
| QA-012 Candidate authority  | Candidate changes config, executable scripts, ignore rules, symlinks or hidden link-target data                    | Trusted policy and tool identities remain authoritative; unsafe or extra data fails; candidate scripts and credentials are absent |
| QA-013 Scan coverage        | Python scan is absent, stale, errored or reports findings requiring disposition                                    | CI/release admission fails under the accepted finding policy; other green language scans do not compensate                        |
| QA-014 Partial publication  | npm operation succeeds but response is lost, or GitHub archival fails afterward                                    | Journal retains intent/outcome uncertainty; read-only reconciliation determines state before a deliberate continuation            |
| QA-015 Privilege separation | Run qualification, npm effect and GitHub effect jobs                                                               | Qualification lacks write/OIDC authority; each effect receives only its required permissions and trusted environment identity     |
| QA-016 Governance cutover   | New check has not appeared, allowlist omits setup-uv, or settings readback differs                                 | Activation stops before replacing effective protection; owner receives the exact mismatch and recovery state                      |
| QA-017 KaTeX regression     | Fresh recipient resolves the unpatched chain or loses legitimate rendering                                         | Packaging/security checks fail; root-only override success cannot substitute for installed-recipient evidence                     |
| QA-018 Unsupported evidence | Present an old schema, diagnostic-only run or main reuse summary as release qualification                          | Fail closed; retain historical bytes for audit but require the current complete release contract                                  |

The corpus fixtures, authored expected formatting bytes and negative acceptance examples remain independent of the implementation under test.
Use real npm, Git, archives, filesystem identities, virtual environments and packed consumers for their owned semantics.
Mock only genuine external service boundaries and interruption/timeout conditions in focused tests; confirm important service assumptions through authorized hosted readback.
Do not calculate a test's expected acceptance result by calling the production admission function.

## 6. Target architecture and reuse decisions

### 6.1 Ordinary qualification and release graphs

The ordinary entry is ci.yml, triggered by pull_request ready_for_review targeting main and called by an explicit main workflow dispatch.
It validates the event and exact checkout, freezes policy once, and coordinates product, native, dependency and security obligations.
CI / acceptance runs even when prerequisites fail and grants success only for the complete authenticated inventory.

The reusable product graph has a reference producer and Windows/Linux runtime consumers.
The producer owns policy checks, source-wide lint/format/architecture checks, frozen dependency installation, authoritative packing and final JSON validation of produced inputs.
Consumer lanes execute the selected runtime-sensitive source regressions and both installed layouts against that same archive tuple.
Reference-runtime lanes on both platforms retain the real-corpus checks and process-tree observation.
Packaging regression fixtures may create their own test archives; none may replace the authoritative transported tuple or silently trigger a second production pack.

The initial platform target follows JSON's explicit ubuntu-24.04 and windows-2025 labels rather than windows-latest.
Qualification must prove Markdown's Windows handle-identity, staging, Python and installed-native behavior on that image before activation.
The controlled native builder's existing platform/toolchain selection has its own authority and is not silently changed to match a consumer label.

The main-qualification.yml push path observes both supported host contracts and evaluates reuse.
Its possible product-evidence decisions are REUSED or FULL_REQUIRED.
Successful completion of the observation job means the decision was produced, not that missing qualification became successful.
The workflow_dispatch path deliberately executes full qualification for current main.

release-qualification.yml always requires fresh exact-release-source qualification through the reusable graph and the release-specific inventory/security obligations.
It cannot convert PR reuse into publication provenance.
Staging, npm owner approval, anonymous pilot-registry checks, GitHub archival/attestation and stable promotion remain separately admitted phases.

### 6.2 Workflow migration inventory

Names of new files below are predicted implementation targets, not existing interfaces or permission to retain misleading names.

| Current surface                                     | Target treatment                                                                                                    | Preservation condition                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| check.yml                                           | Replace ordinary entry/aggregate with ci.yml and main-qualification.yml                                             | Update all internal callers, required-check documentation and evidence consumers together                                   |
| candidate.yml product pack/consumer graph           | Move into reusable qualification.yml                                                                                | One distributed tuple, all frozen lanes and both layouts remain required                                                    |
| candidate.yml manual trusted/candidate fixture path | Preserve as an explicitly named manual fixture workflow, proposed qualification-fixture.yml                         | Preserve exact trusted/candidate SHA inputs and shared-workflow negative probes                                             |
| markdown-quality.yml                                | Preserve the public reusable Markdown workflow and current input meanings                                           | Retain trusted full-tree/link-target semantics, profile ownership and 7/14/30-day evidence contract                         |
| native.yml                                          | Preserve controlled Rust production; factor reusable production only where it removes duplicate orchestration       | Source revision, build tools, original rights evidence, native packages and build provenance remain bound                   |
| registry.yml                                        | Retain an explicitly manual registry diagnostic path or integrate its same capability into an existing manual entry | Do not mistake a historical fixture probe for current release-registry admission; remove incidental product push automation |
| windows-observation.yml                             | Retain explicit bounded diagnostics with exact source identity                                                      | Select a current declared lane; diagnostic-only output cannot mint full or release proof                                    |
| release-qualification.yml                           | Call the new common graph with one frozen release matrix                                                            | Fresh exact-source product, package, corpus and security evidence                                                           |
| publish.yml                                         | Adapt to stage-release.yml if adopting the donor filename                                                           | Update npm trusted-publisher mapping and all internal consumers before use; preserve stage-only authority                   |
| release-registry.yml                                | Reuse common evidence/contracts with Markdown-specific recipient and native checks                                  | Anonymous installs, both layouts, actual recipient audit/SBOM and pilot identity                                            |
| github-release.yml                                  | Reuse archival/inventory/attestation logic with original producer bindings                                          | Separate GitHub mutation authority and immutable asset readback                                                             |
| promote-release.yml                                 | Preserve separate npm and GitHub effect jobs                                                                        | Serialized promotion, explicit expected prior state, durable handoff and reconciliation                                     |
| Live default CodeQL setup                           | Replace with explicit reusable security.yml                                                                         | All three existing languages, schedules and release admission migrate together                                              |

Ordinary product qualification is deliberate-only.
Weekly security scanning remains scheduled, as in JSON.
The existing narrowly path-triggered controlled native production may remain as a separate production capability under DEC-004; it does not run or certify the full product suite.
Inventory every event explicitly so unrelated push automation is not accidentally preserved under a new name.

### 6.3 Policy and tooling ownership

assets/node-support.json remains the sole editable runtime policy.
Adopt the donor schema's minimum, testedLtsMajors, reference, producerNpm, consumerNpm and best-effort support meanings.
Initially tested families are 22, 24 and 26; resolve concrete maintained releases from official metadata and freeze them once per run.
Do not perpetuate a pre-LTS exception for a family that has already entered LTS or hardcode even-number parity as a future support rule.

Current donor pins are reference Node 24.22.1, producer npm 12.2.1 and consumer npm 11.21.1.
They are inspected reference facts, not an instruction to keep obsolete tooling indefinitely.
At implementation selection, check current stable/applicable LTS availability, choose exact compatible toolchain pins and qualify them.
An older reference retained against the applicable HISEW latest-version policy needs a recorded owner decision; a newer producer must not raise the accepted consumer floor.
No moving latest selector executes inside a frozen qualification run.

Project current root metadata, lock root metadata, staged package engine declarations, workflow bootstrap/runtime files and the generated support documentation from that policy.
Use npm's native semver and lockfile operations.
Do not rewrite historical receipts, synthetic fixtures or independently locked trusted-consumer profiles to manufacture agreement.
Remove obsolete live projections only with all their in-scope consumers.

Reuse the setup-producer pattern but call Markdown's Python virtual-environment setup and install its isolated JSON toolchain.
Do not copy JSON's install:markdown step back into Markdown or introduce a circular build dependency.
Retain native acquisition, script-disabled dependency installation and explicit producer/consumer executable identity.
Node action runtimes are also distinct from the product runtime under test.

### 6.4 DRY-01 authority and deployment decision table

| Knowledge                 | Current authority and latest consumers                                                               | Strategy and failure boundary                                                                                     | Drift control/owner                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Runtime support           | assets/node-support.json; package manifests, setup, matrix, docs, release contracts                  | One source with checked projections; consumer and producer versions have different meanings                       | Markdown maintainer; projection and matrix tests                  |
| Product verification      | scripts/verify.js and public command contracts; local full profile, producer and runtime selection   | Separate reference-only checks from runtime behavior without duplicating test inventories                         | Coordinator maps every existing obligation before moving it       |
| Archive identity          | scripts/pack.js, core-package-stage.js and release manifest; all consumers and release effects       | One distributed tuple and content inventory; test fixture packing remains independent                             | Hash/membership/native identity tests                             |
| Bundled dependency repair | scripts/bundled-dependencies.js; staging, packaging tests, distribution SBOM and installed consumers | One temporary repair owner; central release code reuses it until a qualified upstream replacement permits removal | DEC-006 retention/removal condition; reassess at updates/releases |
| Native component          | assets/native-build.json, native evidence contract and Python build/acquisition modules              | Markdown-specific adapter, independently produced frozen component                                                | Native source/build/rights tests; no C++ policy import            |
| Workflow contracts        | Adopted whole-workflow validator; every local workflow/action caller                                 | Native YAML parsing plus explicit input, pin, runtime and deadline checks                                         | One validator in preflight and full verification                  |
| Artifact transport        | Adapted download/upload and extraction boundary; CI proof, packages and release evidence             | GitHub artifact APIs/SDK own transport; local policy binds identity, limits and extraction safety                 | Original-attempt/digest/tampering fixtures and hosted readback    |
| Acceptance and reuse      | Adapted ci-proof/ci-command modules; CI aggregate and main observer                                  | Current schema, exact inputs and original attempts; summaries are presentation only                               | Independent adversarial receipt fixtures                          |
| Release decisions         | Consolidated release contract/inventory/effects; stage, registry, archive and promote jobs           | Shared pure admission rules, enforced again at every effect boundary                                              | Journal/reconciliation tests plus native service readback         |
| Trusted Markdown scope    | src/qualification.js and candidate-staging.js; public CLI/API and markdown-quality.yml               | Keep full committed data and link-target tree; JSON's source-only contract is a different domain                  | Existing trusted-data and hidden-file tests                       |
| Governance                | Proposed .github/governance.json; inspection/application tooling and remote provider                 | Declarative desired state with explicit preview/apply/readback; no workflow self-escalation                       | Maintainer approves exact delta and verifies remote enforcement   |

The donor implementation is an immutable reviewed source reference, not a runtime dependency.
Adapt suitable modules into Markdown and preserve AGPL notices and origin attribution.
This temporarily retains implementations in two independently released repositories; the maintainer owns drift review at future donor refreshes.
Record the imported donor commit and material deviations in the implementation record.
Do not create a shared service or generic abstraction merely to eliminate matching text.
JSON's future backports must not be required for Markdown's build or acceptance.

### 6.5 Native reuse and residual custom logic

Reuse GitHub's workflow/job/artifact APIs, official artifact runtime support, npm installation/audit/SBOM/provenance, native semver, native Git object identity and the established Markdown Python/native tools.
The residual custom responsibility is binding these native facts to this repository's exact acceptance, trust and release contracts.
Do not invent another package manager, YAML grammar, vulnerability database, generic version resolver or transport service.

Candidate reusable modules include JSON's scripts/check-workflows.js, ci-proof.js, ci-command.js, ci-host.js, github-evidence.js, artifact-policy.js, download-evidence.js, release-contract.js, release-inventory.js, release-effects.js, release-recovery.js and github-governance.js, plus its local evidence actions.
Inspect their complete dependency closures and tests before adoption; do not copy only an entry file and omit its contract dependencies.
JSON's official artifact SDK and YAML parser are development/CI dependencies; keep them out of the published product graph unless a demonstrated runtime need exists.
Refresh their exact maintained versions and inspect their actual licenses/notices before introducing them.

Existing original license bytes must remain unchanged.
No new shim, legacy receipt fallback or alternate hidden entry point is authorized.
The retained KaTeX repair is the explicitly approved existing exception, with its disclosed scope and removal condition.

## 7. Implementation slices and ordering

Before SLICE-001, obtain the accepted exact baseline, select the HISEW route and bind the actual current execution owner.
The first authorized commit contains the accepted plan, after scoped formatting and linting.
Do not assume this planning request authorizes that commit.

Every slice includes its affected documentation and focused proof.
Inactive/new workflow paths can be demonstrated locally before remote activation; an intermediate commit is not automatically safe to publish or activate.
The coordinator owns cross-slice integration and the final current-contract inventory.

### SLICE-001: Policy-owned runtime and producer setup through an installed floor consumer

Implement the schema/projection change and producer/consumer toolchain boundary.
Demonstrate one transported consumer on the minimum runtime, then complete Windows/Linux coverage before claiming the floor.
Include the real multi-document native staging cases that previously exposed Windows file-identity differences.
Retain Node-version-specific test-runner API handling without changing production behavior.

Predicted seams: assets/node-support.json, scripts/node-matrix.js, scripts/project-node-support.js, scripts/commands.js, scripts/python-target.js, package/lock metadata, bootstrap projections, proposed setup-producer action and node-support/projection/runtime tests.

Proof: independent matrix fixtures, exact >=22.13.0 projection, no drift in current consumers, truthful best-effort documentation, selected executable checks, required virtual environment and installed floor behavior.
The compatibility matrix does not require non-LTS releases to pass engine-strict installation.
Loss of dedicated 24.0.0/26.0.0 lanes is intentional under DEC-003, not silently reported as continuing direct qualification.

Dependencies: accepted baseline only.
Reversal before activation: revert the coherent policy/projection/setup change; do not rewrite historical package metadata.

### SLICE-002: One producer tuple through complete consumer and corpus qualification

Create reusable qualification.yml around Markdown's actual commands and packaging owners.
Map every existing check/product/candidate obligation to the reference producer, runtime-sensitive source tests, installed layouts or reference corpus jobs.
Require an explicit disposition for any check removed or moved; unknown test impact defaults to retaining full relevant coverage.

Refactor qualify:json:packages as needed so the authoritative tuple can be produced once and passed to the JSON inventory/check owner without repacking in each lane.
Keep JSON identity lint, tooling tests, architecture checks and the mandatory final JSON validation after all applicable producers have settled their outputs.
Do not let a newly generated manifest or journal appear after its only required validation.

Each runtime/OS lane receives the exact original archive artifact by ID/digest, executes relevant source behavior, then root and isolated installations with separate output paths and layout identities.
Both layouts qualify ordinary CI as well as releases.
Fresh installs remain script-disabled and engine-strict on mandatory lanes; each consumer replays its own frozen lock offline.
While the local bundle remains necessary, keep its KaTeX inventory checks.
Preserve inherited-trust regression and legitimate inline/display rendering checks through any upstream replacement.
If a qualified upstream upgrade satisfies section 3.1, remove the repair-only machinery and expectations rather than requiring the obsolete bundle layout to survive.

Run the existing full OwlAPI/WebVOWL corpus procedure on both reference-runtime platforms.
Preserve six fresh-process observations per corpus, complete diagnostic/selection equality, unchanged corpus bytes, identical result digests, maximum observed 30000 ms, maximum observed 536870912 tree bytes and zero active descendants.
Preserve its measurement caveats: warm filesystem, excluded acquisition/install time, six-sample observed maximum rather than a population p95, and different Windows/Linux memory accounting.

Predicted seams: scripts/verify.js, pack.js, core-package-stage.js, qualify-json-packages.mjs, qualify-runtime.js, package-qualification-evidence.mjs, qualify-performance.py, performance-check.mjs, existing packaging/runtime/performance tests and new reusable workflow contracts.

Proof: valid exact tuple on every frozen lane; independent failures for missing isolated results, archive replacement, KaTeX regression and corpus mismatch; producer invocation accounting demonstrates one authoritative distributed pack.
Record actual phase costs without promising the donor's timings.

Dependencies: SLICE-001.
Reversal before activation: retain old entry paths until their obligations have verified replacements; never substitute a second tuple into a partially completed run.

### SLICE-003: Deliberate CI with complete security and native acceptance

Add the deliberate ci.yml entry, event/checkout admission and concurrency cancellation for superseded candidates.
Call the product graph, Markdown-native qualification adapter, dependency review/audit and explicit security.yml.
Retain controlled Rust build/acquisition and rights verification; a current frozen component can be authenticated as such, but must not be described as freshly built when it was not.
If native inputs change, require newly applicable controlled build evidence before that tuple is accepted.

Security languages are Actions, JavaScript/TypeScript and Python.
Keep reusable, manual and weekly scheduled security entry points.
Use the actual expected source/ref and analysis categories in admission.
Preserve the donor's dependency-review threshold and complete development-graph audit, while retaining existing stricter release/recipient finding policies.
Do not add an empty Rust scan as proof of the external source, or import JSON's C++ language/build requirements.

CI / acceptance executes under always semantics and requires success plus complete authenticated records for every mandatory producer, native, dependency, scan, consumer layout and corpus obligation.
Missing, duplicate, cancelled or skipped required work fails.
Check names must be unique and match the future required-status configuration exactly.
Fork product tests remain unprivileged; trusted-data consumer qualification remains a separate contract.
Do not move candidate execution to a privileged pull_request_target or workflow_run path.

Predicted seams: ci.yml, security.yml, native.yml/reusable adapter, scripts/qualify-release-security.js, dependency-security command, acceptance inventory, existing release-security/security-remediation tests and new workflow admission tests.

Proof: event truth table including ready PR opened without ready_for_review, draft pushes, later synchronization, explicit main dispatch and fork candidates; mandatory-language/missing-job failures; preserved native source/rights checks.
Coordinate default-CodeQL replacement during SLICE-007; do not leave release admission on its old analysis key.

Dependencies: SLICE-002; policy and evidence contract portions of SLICE-004 can be developed together under one integration owner.
Reversal: before activation keep existing effective protection; after activation restrict affected operations rather than accept incomplete evidence.

### SLICE-004: Immutable evidence transport and read-only main reuse

Adapt the donor's whole-workflow/action validation, evidence upload/download, extraction, provenance and main-observation implementation.
Validate every caller, including dormant/manual release paths: YAML uniqueness, local action existence, required/unknown input handling, exact external SHA references, action runtime and transfer deadlines.
Use official action runtime credentials for SDK uploads; do not run an upload entry in an ordinary shell and assume it has action-service credentials.
Do not introduce actions.lock or another GitHub workflow dependency lockfile.

Preserve finite purpose-specific metadata, proof, payload, collection and extraction bounds.
Adopt the donor's centralized tooling deadline model, keeping product runtime/resource limits separate.
Reference values inspected in JSON are 20-minute installs, 30-minute suites, 120-minute jobs, 5-minute upload steps and 15-minute collection steps.
Validate outer/inner ordering against actual Markdown phases and HISEW's current 900-second outer profile; record any needed profile change for explicit configuration adoption.
Do not silently convert a timeout to success or lower coverage to fit a timer.

Receipts bind repository/workflow identity, source tree and parents, frozen policy/matrix, actual Node/npm/Python, native/generated inputs, original producing attempts, artifact IDs/digests, layout and corpus results, and security/native inventory.
Main reuse authenticates both the original work and final current provider metadata.
Allow supported image-family equality without requiring an incidental image build number match; preserve the original exact image provenance.
Reject reuse chains, wrong merge shape, changed mandatory inputs and proof older than its retained availability.

Missing or invalid proof produces FULL_REQUIRED and an actionable reason; it launches no full product work.
The explicit dispatch provides full main qualification.
An observer may complete successfully after reporting FULL_REQUIRED, but no consumer may interpret that completion as product qualification.

Predicted seams: ci-reuse.js/ci-reuse-command.js/ci-result.js, proposed evidence transport actions and modules, main-qualification.yml, ci-host/proof/command owners, current CI reuse/result tests and independent transport fixtures.

Proof: QA-002 through QA-005 and QA-010/011/018, including race/readback changes, missing layouts, expired producer archives and a new image build within the same supported family.
Retain a producer archive at least as long as the proof that references it.
Historical receipt schemas remain immutable audit data; new live admission rejects unsupported contracts without a compatibility shim.

Dependencies: SLICE-001 and SLICE-002; integrate with SLICE-003 before any new acceptance grants success.
Reversal: a schema or transport mismatch denies reuse and requires explicit qualification; it never falls back to unauthenticated evidence.

### SLICE-005: Release evidence, recovery and separated publication effects

Consolidate release admission/inventory/effect logic using the donor's existing modules and Markdown's current release owners.
Keep complete inventory of Markdown's delivered JavaScript graph, including its bundle while needed, plus Rust embedded components, original rights evidence, corresponding-source materials and actual installed-recipient inventory.
Preserve full production-recipient audit/SBOM evidence without filtering away the tool merely because a consumer declares it as a development dependency.
Common rules are shared, but each effect boundary enforces them on its received immutable inputs.

Release qualification freezes one source/version/matrix and executes fresh required evidence.
Stage-only npm publication precedes owner approval and public pilot consumption; preserve native-package/core ordering needed for valid resolution.
Anonymous registry qualification checks both layouts and archive integrity.
GitHub archival and attestations bind the approved assets and preserve their actual original producer provenance.
An attestation issued during archival must not be described as proof that archival was the original build.
Stable promotion remains a separate serialized decision with expected current labels and restoration availability.

Keep separate npm and GitHub mutation jobs with sealed immutable handoffs and pre-effect readback.
Qualification uses read-only authority.
npm jobs use the intended trusted-publisher workflow/environment and permitted operations.
GitHub archival uses only required contents/attestation permissions; OIDC may legitimately be needed for attestations but its identity must not also authorize npm publication.
Use separate environment identities and current npm trust controls rather than assuming id-token permission alone identifies publication authority.

Journal intent before each irreversible effect, record the observed outcome, and distinguish completed, failed and unknown.
Retry only classified read-only transient operations within finite bounds.
An unknown publish/tag/release effect requires service readback and deliberate reconciliation before further mutation.
If npm succeeds and GitHub fails, continue from verified service state; a Git revert cannot undo the published version.

Predicted seams: release-qualification.yml, publish.yml/stage-release.yml, release-registry.yml, github-release.yml, promote-release.yml, scripts/release-acceptance.js, release-continuation.js, release-assets.js, release-staging-evidence.js, collect-release-evidence.js, qualify-distribution-sbom.js and existing release tests.
Assess which donor modules replace or deepen those owners; avoid keeping parallel old/new admission engines.

Proof: valid qualification-to-stage admission, wrong-source/version/archive rejection, omitted Python/bundle/native inventory, substituted handoff, concurrent promotion, lost response, partial service success, immutable release conflict and restoration failure.
Use native validators for npm/SBOM/attestation formats and external-service mocks only for controlled negative/recovery scenarios.
Actual publication remains a separately authorized future release, not a required destructive migration experiment.

Dependencies: SLICE-002 through SLICE-004.
Reversal: deny effects until the coherent current release contract is qualified; after an effect use the documented journal/readback recovery route.

### SLICE-006: Preserve public trusted Markdown and diagnostic capabilities

Adapt the shared markdown-quality.yml workflow to the common evidence transport without changing its trusted/candidate repository/SHA/profile input meanings or data-only execution boundary.
Preserve the exact producer/workflow/core/native bindings, trusted profile, complete committed data tree, hidden file inventory and non-Markdown link targets.
Do not replace this with JSON's explicitly source-only immutable-git-json qualification result.

Keep repeated bounded observations, absolute trusted runtime identities, credential absence and cleanup proof.
Retain compact content manifests and reports rather than uploading each staged source copy.
Preserve routine success/failure/selected-qualification retention of 7/14/30 days and any named existing consumer requirements.
Reconstructibility requires every manifest path and digest, not merely a Markdown file list.

Preserve the manual trusted/candidate fixture workflow and the explicit Windows/registry diagnostic capabilities under accurate names.
Their records remain diagnostic or scoped qualification evidence; no reduced lane can satisfy full acceptance or release.
Update all in-repository callers and documentation atomically; downstream workflow consumers remain pinned to their original immutable commits until separately migrated.

Predicted seams: markdown-quality.yml, candidate.yml fixture branch, windows-observation.yml, registry.yml, scripts/shared-qualification.mjs, src/qualification.js/candidate-staging.js only where integration requires, and existing qualification/staging/evidence tests.

Proof: credential/candidate non-execution probes, altered trusted policy, hidden extra data, missing link target, artifact reconstruction, per-purpose retention and diagnostic-proof rejection.
Product semantics should require no rewrite; an apparent need to change them triggers re-planning.

Dependencies: SLICE-004, with preserved product contracts from SLICE-002.
Reversal: leave existing immutable published workflow references intact; deny activation of an unqualified new source tuple.

### SLICE-007: Consolidated assurance, governance cutover and operational handoff

Consolidate all source changes and documentation before broad review.
Resolve material local findings first, then request the route-selected independent implementation and security assurance for the final candidate.
Review follow-up deltas narrowly when their inputs and coverage remain valid.
Run the full relevant local profile after its declared inputs have settled, and obtain hosted evidence for the actual platform/runtime graph.

Adapt the donor governance declaration and inspection/application tool to Markdown's repository identity.
Required state includes CI / acceptance from the intended GitHub Actions App, strict up-to-date checks, merge commits only, no bypass actors, force-push/deletion protection, conversation resolution, read-only default token permissions, disallowed workflow review approval, external-contributor approval, secret scanning and push protection.
Retain the donor's zero mandatory approving reviewers; do not advertise independent human review from PR presence alone.
Keep full-SHA enforcement and a selected-actions allowlist.
Narrowly allow Markdown's pinned astral-sh/setup-uv action, or qualify an equivalent permitted action that still creates the required virtual environment; do not enable every verified third-party action.

Capture actual before-state, produce an exact reviewable settings delta, verify the new hosted acceptance context exists and then apply the authorized settings in the cutover order in section 9.
Read back provider state and exercise the relevant allow/deny behavior.
Apply no settings to JSON Quality.
Do not leave the repository dependent on a required check that the active workflow cannot produce.

Refresh CONTRIBUTING, README/runtime statements, CI trust, centralized contracts, native/release operations and current workflow references.
Document draft-to-ready retriggering, directly opened ready PRs, later head changes, bot PRs, explicit main dispatch and the meaning of FULL_REQUIRED.
Record source completion, hosted qualification, remote activation and release readiness separately.
Close only the actual execution's required lifecycle and cleanup obligations; preserve unrelated work/resources.

Proof: complete AC coverage, scoped format/lint and final diff checks, exact hosted run/artifact references, independent review dispositions, actual governance readback and the recovery/retention handoff.
No release is claimed merely because CI or governance is green.

Dependencies: SLICE-001 through SLICE-006.
Reversal: before effect, abort and retain effective prior protection; after activation, restrict the affected path and restore only a qualified current configuration or forward-fix it.

### 7.1 Traceability and independently useful work

| Slice     | Requirements / acceptance      | Quality scenarios                    | Decision basis         | Proof and release/cleanup implication                                              |
| --------- | ------------------------------ | ------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC-003, 004, 013           | QA-006                               | DEC-003, 004, 011      | Policy projections and actual installed floor; no historical metadata rewrite      |
| SLICE-002 | REQ/AC-001, 004, 005, 006, 007 | QA-006, 007, 008, 009, 017           | DEC-001, 004, 005, 006 | Same tuple, both layouts and original corpus oracles; dispose owned installs/trees |
| SLICE-003 | REQ/AC-001, 002, 004, 008, 010 | QA-001, 005, 013, 015                | DEC-001, 002, 004, 007 | Deliberate complete acceptance; coordinated scan migration                         |
| SLICE-004 | REQ/AC-002, 010, 012           | QA-002, 003, 004, 005, 010, 011, 018 | DEC-002, 009           | Original immutable proof and bounded transport; retention covers references        |
| SLICE-005 | REQ/AC-007, 008, 009, 012      | QA-010, 013, 014, 015, 017, 018      | DEC-006, 007, 008      | Separate effect authority and recoverable journal; preserve unresolved effects     |
| SLICE-006 | REQ/AC-007, 010, 012, 013      | QA-010, 012, 018                     | DEC-006, 009, 011      | Public trusted-tree contract and diagnostic capability preserved                   |
| SLICE-007 | REQ/AC-001 through 013         | QA-001 through 018                   | DEC-001 through 011    | Exact candidate assurance, coordinated activation and honest operational handoff   |

Every REQ/AC shorthand denotes the separately named REQ-### and AC-### with the same numeric suffix.
Policy fixtures, service-failure fixture design and documentation inventories can proceed independently after their contracts are frozen.
Acceptance schemas, workflow job names, artifact transport and release admission are semantically coupled and need one integrated owner.
Parallel agents or concurrent writes are not authorized by this plan; obtain any required delegation authority separately.

## 8. Verification execution and evidence placement

### 8.1 Command ownership

Current supported commands include npm run check:node, check:architecture, check:focused, check:affected, check:product and check:full, plus qualify:json:packages and the source Markdown CLI.
Preserve their accurate semantics or update every in-scope caller when responsibilities change.
Proposed additions include check:ci and explicit producer/runtime/package/security commands where they expose coherent existing capabilities.
Do not create aliases merely to mimic donor names.

The current focused profile runs contracts.test.js and is not sufficient alone for changes to workflow/release proof.
Run the specific affected CI, transport, node-policy, Python, native, packaging, qualification and release tests for each slice.
The full profile must include all relevant obligations, including architecture, workflow/security checks and the final JSON consumer gate.
Update HISEW command/input declarations and deadlines only through its supported configuration process when authorized; current broad coveredPaths declarations do not prove real coverage.

Use the repository's current dependency graph/affected-test machinery where applicable.
Unknown workflow or dynamically loaded test dependencies require conservative full coverage, not an empty successful selection.
Do not repeatedly run broad suites after unchanged scoped evidence passes; refresh for changed inputs, uncovered obligations or actual failures.

### 8.2 Required final evidence

- Exact source commit/tree, accepted plan revision, route and relevant dependency/action/toolchain identities.
- Passing local full relevant profile and separate focused negative-contract evidence where not included in it.
- Hosted minimum/latest/reference consumers on both platforms, with two layout records per lane and the original archive identity.
- Full reference corpus observations on Windows/Linux with independent oracles, resource metrics and cleanup facts.
- Native component/source/rights bindings and proof for any changed native production inputs.
- Actions, JavaScript/TypeScript and Python CodeQL results, dependency review and applicable native npm audit/SBOM results.
- Authenticated acceptance and main reuse/FULL_REQUIRED behavior, including original-attempt and artifact substitution failures.
- Non-publishing release-path tests, effect/credential isolation, journal interruption recovery and native format validation.
- Independent review/security dispositions for the final changed trust boundaries.
- Approved governance delta and actual readback if activation is included in the authorized execution.

Keep supplemental operator artifacts in the selected external HISEW evidence location, discovered during execution.
Do not put transient runs, copied corpora, node_modules or service credentials into docs/plans or invent a repository-local HISEW runtime directory.
Job logs and summaries carry ordinary diagnostics; structured artifacts exist only for named consumers.
Never scrape a summary to decide release admission.

### 8.3 Retention and cleanup

| Evidence class                                                           | Target retention/ownership                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Routine non-proof producer/diagnostic artifacts                          | Adopt donor's short retention, normally 1 day, when no longer consumer horizon applies                |
| PR proof and original archive it references                              | At least 30 days together; expired evidence requires deliberate requalification                       |
| Release qualification and original native/rights evidence                | Preserve the current 30-day workflow contracts or longer named release-consumer requirement           |
| Repository-level artifact policy                                         | Adopt the donor's 90-day maximum/default policy where applicable; per-artifact contracts still govern |
| Public reusable Markdown routine success/failure/selected evidence       | Preserve 7/14/30 days                                                                                 |
| Immutable published release/source/notice assets and unresolved journals | Retain under release/audit/recovery ownership; ordinary scratch cleanup does not remove them          |

Remove only task-owned temporary installs, extraction trees and copied corpus data after all evidence consumers release them.
Retain failed/unknown effect journals for reconciliation.
Existing remote artifacts are not bulk-deleted, relabeled or rewritten by this migration.
Record removal separately from evidence retention and do not claim space reclaimed without measurement.

## 9. Migration, cutover and recovery

### 9.1 Source and evidence migration

Treat the policy/receipt/acceptance migration as a coherent current-contract change.
Version changed schemas where their wire meaning changes; enumerate every producer and consumer before cutover.
Historical evidence stays at its original schema and provenance.
Do not backfill missing layout, scan, native or corpus evidence from assumptions.
Old receipts that cannot satisfy the new contract yield FULL_REQUIRED or release denial.

Existing immutable reusable workflow references remain valid at their original commits.
Preserve markdown-quality.yml's current public input semantics at the new commit.
No downstream checkout update is part of this plan; record any newly necessary downstream action for its owner instead of silently performing it.
No existing release run is resumed under changed workflow semantics; reconcile or finish it under its attributable original contract before new effect activation.

### 9.2 Remote activation order

1. Freeze the reviewed source and concrete desired-settings delta.
   Inspect current required checks, rulesets, action policy, CodeQL setup, environments and npm publisher bindings.
2. Demonstrate the replacement product and evidence paths on the exact proposed candidate through the intended deliberate event, and validate the new security/acceptance contracts locally.
   Preserve existing effective gates.
   If default CodeQL setup prevents advanced-workflow uploads, full hosted acceptance remains pending until the coordinated switch in step 4; do not substitute mocked scan success.
3. If both old and new qualification paths must briefly run to prove the cutover, label that temporary duplication and its removal checkpoint; it is not the steady-state design.
4. Coordinate explicit CodeQL activation and default-setup removal with the release-verifier change.
   Hold merge and release admission closed during any transition gap, obtain successful exact-source results for all three languages through the new workflow, and then demonstrate complete hosted acceptance.
   If the switch fails, restore the captured compatible configuration and its verified scan path or keep admission closed; never release on missing scan evidence.
5. Ensure every used action, including the Python setup action, is permitted under the proposed allowlist before enforcing it.
6. Establish the new required acceptance context and strict policy, then retire superseded required contexts and obsolete automatic workflows only when their replacements are verified.
   At every intermediate state an effective mandatory gate remains.
7. Read back rules, permissions, merge methods, secret protections, action policy and actual check identity.
   Record exact mismatches; a successful settings command is not sufficient evidence.
8. Observe the first merged candidate: either authenticate reuse or retain FULL_REQUIRED and deliberately dispatch full qualification when authorized.
   Do not treat observer success as qualification.
9. Verify release environment/publisher bindings and permission-separated handoffs before any separately authorized release.
   Renamed workflows require matching npm trust configuration.

If the existing repository state prevents this sequence, stop the affected activation and present the exact conflict with an alternative that preserves mandatory protection.
Do not temporarily disable all required checks, add an undocumented bypass or forge a status.

### 9.3 Abort and recovery cases

| Condition                                            | Required response                                                      | Recovery evidence                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| New CI or scan contract incomplete before activation | Keep existing effective gates and withhold the replacement             | Corrected candidate and complete new evidence                                    |
| Missing/expired PR evidence                          | Report FULL_REQUIRED; no automatic full run                            | Explicitly requested exact-main qualification                                    |
| Artifact/schema mismatch                             | Deny acceptance/reuse/release                                          | Fresh current-schema evidence from the original qualified producer               |
| Governance apply partially succeeds                  | Stop further changes, read actual state and preserve protection        | Before/after/delta records and an owner-approved restore or forward fix          |
| Action allowlist blocks a required action            | Withhold cutover or restore the qualified narrow policy                | Successful action-policy readback and required workflow behavior                 |
| npm effect has unknown outcome                       | Preserve journal and prohibit mutation retry                           | Registry/staging identity and integrity readback, then deliberate reconciliation |
| npm succeeds and GitHub fails                        | Resume only the missing effect after re-admission                      | Immutable npm result plus verified GitHub state; no republishing                 |
| Stable promotion is wrong                            | Use the separately admitted restoration route for labels/current state | Explicit expected labels, retained restore target and anonymous readback         |
| Published package has a defect                       | Select an authorized forward release or supported deprecation response | New version decision and fresh qualification; no overwrite of immutable versions |

The release operator owns effect recovery; the repository maintainer owns governance recovery.
Restoring an older source/configuration is permissible only if it still satisfies the accepted active contracts and consumers.
Otherwise restrict the affected operation and forward-fix it.

## 10. Observability and outcome assessment

Every qualification record should answer: which source/tree, policy, matrix, runtime, native component, artifact and producing attempt ran; which obligations completed; and why acceptance/reuse was granted or denied.
Use explicit FULL_REQUIRED reasons such as missing proof, changed input, unsupported contract, expired artifact or invalid attempt inventory.
Avoid an undifferentiated green summary for product qualification that did not occur.

Record phase duration, artifact bytes/counts, ordinary versus release mode, installation layout, corpus metrics and cleanup status.
Do not log credentials, OIDC tokens, sensitive service responses or candidate text unnecessarily.
Preserve enough bounded provider IDs and hashes to reproduce admission independently.

Compare equivalent full runs on the same frozen workload and runtime policy before claiming efficiency gains.
Report removal of redundant authoritative packing/checks as structural evidence, and actual runner/elapsed minutes as measurements.
Runner queue delays and registry variability are separate from product performance.
Do not trade away AC-005 through AC-010 to meet an unsupported timing target.

Operational acceptance requires that the maintainer can deliberately qualify, understand FULL_REQUIRED, identify original evidence, recover an interrupted effect and maintain the action/governance policy without guessing which workflow is authoritative.
Reassess the design if reuse becomes opaque, duplicate policy owners persist, artifact retention prevents ordinary review, or installed/corpus coverage is lost.

## 11. JSON follow-ups outside this plan

The comparison identified useful later JSON work: ordinary isolated-layout qualification with complete receipts; process-tree observation alongside existing native/scratch metrics; Python and C/C++ CodeQL coverage; and separated npm/GitHub promotion privileges.
Those items are not implementation slices, dependencies or completion criteria for this Markdown-only plan.
Do not create their issues, modify that repository or send another chat work without separate authorization.
Workflow dependency lockfiles are excluded from both the current proposal and these agreed follow-ups.

## 12. Unknowns, cheapest experiments and re-planning triggers

| Unknown or selection gate                                        | Cheapest discriminating evidence                                                                                        | Owner and affected boundary                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Exact current governance/environment/npm trust state             | Read-only provider inventory and an explicit desired-state diff                                                         | Maintainer; SLICE-007 activation and release binding                   |
| Appropriate current producer/action/SDK/YAML versions and rights | Authoritative release metadata, exact license/notice inspection and one frozen setup/consumer probe                     | Coordinator with maintainer for exceptions; SLICE-001/004              |
| Windows 2025 suitability for Markdown                            | Existing handle-identity, Python/native and installed floor/corpus checks on that image                                 | Coordinator; mandatory platform activation                             |
| Complete producer-versus-runtime test split                      | Map scripts/verify.js, current workflow commands and test impact graph; inject representative runtime/platform failures | Coordinator; SLICE-002; retain broader coverage while uncertain        |
| Artifact bounds and retention fit                                | Measure exact produced artifacts and enumerate all named consumers                                                      | Coordinator; SLICE-004/006; no arbitrary bound relaxation              |
| HISEW profile coverage and outer duration                        | Inspect current declarations, map changed obligations and measure one accepted full candidate                           | Execution owner; configuration approval if declarations need amendment |
| Default-to-explicit CodeQL category and analysis identity        | Read native analysis metadata and exercise verifier with successful and failed exact-source cases                       | Security/integration owner; SLICE-003/005/007                          |
| Active historical release continuation                           | Read journal and actual service state without effects                                                                   | Release operator; withhold new effect activation until reconciled      |

Re-plan or re-baseline if any of the following occurs:

- The implementation would alter Markdown parsing/formatting/link-selection semantics, native source or public runtime/resource behavior.
- A proposed optimization drops a mandatory layout, corpus, language, native/rights obligation or independent oracle.
- Supporting the broad engine declaration is turned into forced dependency-engine bypasses, or the published range is narrowed against DEC-003.
- A new cross-repository dependency, shared service, downstream migration or JSON mutation becomes necessary.
- An unapproved compatibility shim, workflow dependency lockfile or removal of the KaTeX repair before its verified upstream replacement is proposed.
- The live provider cannot enforce the intended controls, or activation would create an unprotected merge/publication interval.
- A schema transition cannot preserve immutable evidence and safely deny unsupported live consumers.
- A material tool/license/security constraint invalidates the selected reuse; do not substitute unreviewed custom infrastructure.
- New evidence establishes materially higher consequences than R2 or invalidates the accepted recovery route.

An unavailable tool or stale profile is an integration gap, not proof that a requirement is unnecessary.
Continue independent authorized work while resolving a bounded gap; do not falsely complete the affected obligation.

## 13. Source references and plan validation

The donor source snapshot is [JSON Quality at 33c95858](https://github.com/Hadden-Industries/json-quality/tree/33c95858d316ca3cdabf319a2705f9161d44e7e5).
Key references are its [CI graph](https://github.com/Hadden-Industries/json-quality/blob/33c95858d316ca3cdabf319a2705f9161d44e7e5/.github/workflows/ci.yml), [reusable qualification](https://github.com/Hadden-Industries/json-quality/blob/33c95858d316ca3cdabf319a2705f9161d44e7e5/.github/workflows/qualification.yml), [governance policy](https://github.com/Hadden-Industries/json-quality/blob/33c95858d316ca3cdabf319a2705f9161d44e7e5/.github/governance.json), [workflow validator](https://github.com/Hadden-Industries/json-quality/blob/33c95858d316ca3cdabf319a2705f9161d44e7e5/scripts/check-workflows.js) and [release effects](https://github.com/Hadden-Industries/json-quality/blob/33c95858d316ca3cdabf319a2705f9161d44e7e5/scripts/release-effects.js).

Relevant platform guidance inspected during the comparison: [GitHub required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [GitHub secure workflow use](https://docs.github.com/en/actions/reference/security/secure-use), [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [Node release policy](https://nodejs.org/en/about/previous-releases).
Reuse these sources with the accepted owner decisions; their general recommendations do not override the explicit exclusion of workflow dependency lockfiles.

Planning follows the installed HISEW implementation-plan and risk-route procedures, including their engineering-principle, evidence and recovery requirements.
The local procedures are inputs to planning, not new product dependencies or permission to execute the proposed work.

Validate this document with the repository's source Markdown formatter and checker, explicitly selecting this file so an untracked plan is included.
Check local links, decision/requirement/scenario/slice consistency, exact repository scope, current-versus-proposed paths and git diff whitespace.
Record actual document-check results in the task handoff.
These checks do not establish implementation, hosted qualification, remote activation or release readiness.
