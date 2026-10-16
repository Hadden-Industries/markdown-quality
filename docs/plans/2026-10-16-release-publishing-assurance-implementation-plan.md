# Deliberate release publishing: HISEW implementation plan

Date: 2026-10-16, Europe/Bucharest.
Revision: 2; implementation acceptance and first-checkpoint authority recorded.
Status: accepted implementation baseline on 2026-10-16; the owner requested implementation using HISEW and a first signed checkpoint containing this plan and its research record.
Implementation and release completion remain separately evidenced below.
Decision owner: Maksym Shostak / Hadden Industries.
Originating task: Codex chat 01a1434f-2582-76b1-b7e7-c4be5272add7.
Repository baseline: bfcf44061750851b69128d73aeeaf89bd5e17bcf on local and remote main, clean before this document was added.

This document is the change dossier, accepted R2 route, quality-scenario record, selected design direction, implementation sequence, and handoff.
REQ, AC, QA, DEC, GATE, SLICE, and OPEN identifiers are local to this plan.
It preserves the conversation's decisions and engineering rationale, including corrections to the initial audit recommendations.
The accompanying [audit and research record](../research/2026-10-16-release-publishing-assurance-evidence.md) preserves observations, exact identities, authoritative references, limitations, and superseded advice.
Neither document is a HISEW verification receipt or an assertion of completed assurance.

## 1. Outcome, authority, and explicit constraints

The beneficiary is a sole maintainer who needs quick ordinary development and a deliberate, auditable release process.
Success means that only the intended, fully qualified package bytes become public and stable, with enough retained evidence to verify their source, qualification, contents, approval, and recovery state.
A green workflow alone is insufficient.

The user established these constraints:

| Conversation decision                                                                    | Implementation consequence                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep quick direct-to-main development; do not require PRs while there is one contributor | No mandatory PR, second-person review, merge queue, CODEOWNERS approval, or required-check branch rule that prevents ordinary direct pushes                                          |
| Push only after local tests pass                                                         | Preserve local verification and signed-delivery practices; do not invent an unenforceable server guarantee about local testing                                                       |
| Publishing must be a measured, explicitly triggered action                               | A push, tag push, dependency update, or completed background CI run must never independently authorize release effects                                                               |
| All testing required of a release must execute as GitHub Actions                         | Hosted proof is a publication prerequisite; local results and self-reported receipts cannot substitute for required hosted execution                                                 |
| Restrict alternative npm token publishing                                                | Apply the stronger package access setting to all three packages during authorized implementation                                                                                     |
| One current maintainer                                                                   | Use the owner's explicit approval and npm 2FA; describe independent technical review separately from human separation of duties                                                      |
| Concentrate hardening on releases                                                        | Cover all inputs and jobs feeding publication; retain a proportionate repository-wide read-only Actions token default                                                                |
| Implement the revised recommendations in a detailed plan                                 | Include complete distribution SBOM coverage, evidence, recovery, and delivery work; do not reduce this to workflow YAML edits                                                        |
| Do not use the public-preview feature                                                    | Exclude Actions workflow dependency lockfiles, actions.lock, gh actions-lock, and Require lockfile policies; defer reconsideration until wider availability and a new owner decision |

The original planning request authorized writing this plan and preserving its evidence.
The subsequent instruction, "Implement the plan using HISEW, committing it (and \"docs\research\2026-10-16-release-publishing-assurance-evidence.md\") first", accepts this implementation baseline, its R2 route, and its scoped source/configuration work.
It requires a first signed document checkpoint before executable changes.
It does not authorize creating an issue or PR or select a package version to publish.
The earlier agreement to the npm access recommendation is retained; the future implementation should reuse that decision within its exact scope rather than ask the same conceptual question again.
A concrete release still needs an exact version, source, archives, and owner authorization.
Implementation approval must establish the allowed delivery effects once, then carry them through without redundant phase prompts.

The revised advice withdraws the blanket PR requirement.
Absence of PR enforcement is an accepted operating choice for this plan, with the owner retaining authority over source and workflow edits.
It is not independent review, and the release mechanism cannot prevent the repository/npm administrator from deliberately changing its controls.
Review that choice when another contributor receives write or release authority.

## 2. HISEW applicability and planning prerequisites

Read-only native inspection found active personal applicability, profiles focused/affected/full, and no active execution.
Profile declarations are legacy-inherited for worktree 6701ef39-aac1-4423-b30a-3fa13ac21cc8; the project ID is 72c306af-f445-4135-b463-c0829d3204d4.
The profile commands currently select check:focused, check:affected, and check:full, each with a declared 900-second budget.
Their broad coveredPaths declarations are owner claims, not proof that a profile covers release-specific obligations.
Ignored generated native evidence inputs make the dedicated native/archive identity checks particularly important.

The loaded HISEW plugin and selected engine still differ:

| Observation                        | Exact identity or state                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Loaded plugin release              | 9b307af5b8f69b5ce025ad9c951f55a34278013e6758696a52cc7fe0dd905d51             |
| Selected engine release            | 0dd53487678c0e640836c314b36c3adecc52651ab7960b7f45b2ebc7ee8042ae             |
| Selected generation / attempt      | 10 / e14fbc5a-7259-4d7d-b0b6-3aeb8dbee1b7                                    |
| Human version                      | 0.1.0.dev25; equal version text does not establish artifact equivalence      |
| Retained installation outcome      | Complete; update ownership unowned at inspection                             |
| Current-session hook activation    | Unverified                                                                   |
| Requested loaded-release readiness | False; setup inspection did not establish usable launchers for that artifact |

This did not prevent the authorized document preparation.
Before governed implementation, use HISEW manage to reconcile the actual loaded artifact, selected runtime, affected assurance owners, and current-session activation.
Do not reinstall an already successful update, silently select the stale artifact, adopt another execution, or treat a direct launcher read as hook-activation proof.
This is a prerequisite to implementation verification, not a request to repair HISEW as part of this plan.

Implementation-entry readback on 2026-10-16 confirmed the same loaded/selected release mismatch, selected generation 10, complete retained installation attempt, and unobserved live hook activation.
The selected engine's status command succeeded and reported personal applicability with no active execution.
An initial progress inspection required explicit repository selection; the supported select-repository operation then bound this actual session to Markdown Quality at session-selection generation 1.
The following progress inspection succeeded and reported unrouted, with no execution or verification evidence.
This restores repository selection only; it does not establish matching plugin activation or resolve OPEN-010.

The current configuration root is C:/Users/maksy/.hi/w/c and evidence root is C:/Users/maksy/.hi/w/e.
Planning evidence is in the isolated operator directory C:/Users/maksy/.hi/w/e/operator/01a1434f-release-publishing-plan.
Do not put new supplemental evidence in historical repository-local .sdlc/runtime or .sdlc/tmp directories.
Rediscover current external storage before implementation; preserve canonical engine receipts separately from operator artifacts.

The conversation supplies the intended outcome and constraints.
Sections 4-6 make the previously missing draft requirements, risk route, scenarios, and design decisions explicit.
They do not silently accept a risk route or fabricate missing integration evidence.
OPEN items identify the remaining prerequisites; the affected slice stops at its stated gate until the evidence exists.

## 3. Verified baseline and the actual gaps

The earlier audit verified published version 1.0.3, whose source is 92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0.
It verified immutable GitHub release delivery, a verified signed version tag, all 20 release-asset hashes, the manifest's 19 payload bindings, native release verification, and three npm tarballs matching the qualified GitHub copies.
Fresh npm signature/provenance checks passed for all three packages.
The original transported candidate and both hosted registry-platform jobs succeeded.
The local focused release suite passed 91 tests, with zero failures.

Those facts concern that release and those observations.
Current main contains later work while package.json still says 1.0.3.
The plan must not overwrite 1.0.3, describe its behavior as current development behavior, or treat old qualification as a new release pass.
Current support documentation states that the accepted opinionated-defaults change requires a new major version; version selection must consider the entire unpublished delta, not assume a patch release.

| Current behavior                                                                                             | Required change or preservation                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| publish.yml already uses workflow_dispatch                                                                   | Preserve explicit initiation; manual triggering alone does not establish complete qualification                   |
| Admission requires candidate.yml, a successful push on main, complete same-attempt jobs, and manifest hashes | Include the separate full product checks and all other release obligations in fail-closed release admission       |
| check.yml runs check:product and JSON checks independently                                                   | Reuse those commands and workflow capability in the release graph; no parallel copied test inventory              |
| candidate.yml packs one tuple and tests transported archives across its matrix                               | Preserve exact-byte transport; its existing workflow_dispatch path is a different fixture-check use case          |
| npm mappings allow direct and staged publication                                                             | Move the publishing connection to stage-only; use owner 2FA for public approval                                   |
| All three npm packages permit bypass-2FA granular tokens                                                     | Require 2FA and disallow bypass tokens for each package                                                           |
| Publication environment allows exactly main but has no reviewer                                              | Preserve the main-only boundary; npm approval is the proposed human gate                                          |
| Workflow permissions are narrow, but repository Actions default is write                                     | Make the default read-only and retain explicit job-level elevations                                               |
| Current direct Action uses are pinned to full SHAs                                                           | Preserve and validate pinning; do not introduce the excluded lockfile preview                                     |
| Source SBOM covers the npm lock graph and excludes compiled native components                                | Add a release inventory that includes native/runtime contents, with explicit coverage boundaries                  |
| GitHub archival is an existing local/native-CLI operation                                                    | Reuse its validation/recovery logic and place release qualification/readback in the deliberate hosted process     |
| Direct publication can select latest before registry tests                                                   | Use pilot for first public availability; qualify registry installations before stable promotion                   |
| Publication-origin records handle partial outcomes conservatively                                            | Extend that discipline to staging, approval, and promotion; never turn an unknown effect into permission to retry |

Read [release operations](../release-operations.md), [support and release](../support-and-release.md), [current contracts](../centralized-contracts.md), and the original [implementation plan](implementation-plan.md) as governing compatibility inputs.
The generic pilot/consumer acceptance and restoration requirements in those documents are not silently waived.
The 1.0.3 exception was version-specific.
Resolve their applicability to the next version before its stable release; no downstream consumer migration is authorized here.

## 4. Proposed risk route

### Risk class:

R2, accepted through the owner's 2026-10-16 implementation instruction.
Authentication/authorization, artifact trust, cross-system state, irreversible public versions, concurrency, and interrupted-effect recovery all trigger elevated risk.
No observed safety-critical or comparable R3 consequence has been established.

### Decision owner:

Maksym Shostak / Hadden Industries.
A future implementing coordinator owns integration and evidence within the accepted scope.
A review provider does not acquire maintainer or release-approval authority.

### Reasoning:

An incorrect gate could publish untested or substituted code, expose a package under latest prematurely, or make recovery republish an uncertain effect.
A staged approval can make bytes public irreversibly.
These are material consequences even if the final code diff is small.
The risk classification is inferred from those observable boundaries.

### Potential blast radius:

All three npm packages, Windows/Linux consumers, GitHub release/tag identities, retained evidence, and workflows whose permissions are changed.
The default-token change also affects other Actions jobs, so inventory their explicit permission needs before changing the default.
Normal developer Git credentials and direct pushes remain outside that token change.

### Reversibility:

Unpublished source/configuration changes can be corrected through a normal signed commit.
A staged rejection is a real external deletion requiring owner presence and attributable evidence.
Published versions cannot be replaced.
Distribution labels can be restored only to an already qualified exact version under an authorized recovery decision; that does not undo downloads or consumer changes.
Immutable GitHub assets/tags must remain intact.
Forward fixes require new versions.

### Principal unknowns:

Exact npm staged tarball/provenance behavior; authenticated inspection/reconciliation; first-use publisher activation; complete native SBOM coverage; GitHub CodeQL admission; and the next version's existing pilot-policy obligations.
Section 12 assigns each an owner, cheapest discriminating experiment, and stop condition.

### Required artifacts:

This accepted revision or its successor; current route and requirements snapshot; qualified source/archive/tool identities; hosted gate inventory; per-package effect journal; staged-owner approval evidence; registry and GitHub verification; SBOM coverage report; reviewed recovery record; and retained final release assessment.
Reuse existing manifests and journals where their meanings align.

### Required specialist lenses:

Ordinary code review, independent verification, scoped security assessment of authorization/artifact/credential boundaries, and native component/rights review for SBOM changes.
Use the configured supported review capabilities against the final consolidated candidate.
This planning task does not dispatch reviewers or create subagents.
Independent technical assessment does not imply a second human maintainer.

### Required verification:

Focused boundary tests while editing, affected regression testing at integration, then the accepted full relevant HISEW obligations against the settled candidate.
Hosted release qualification is separately mandatory.
Native platform execution, registry cryptography, immutable-release verification, and human approval remain distinct evidence.

### Required human approvals:

Acceptance of the detailed implementation baseline and its material configuration effects; exact publication/version authorization; npm 2FA approval for each staged package; and any changed risk or recovery effect.
Reuse authorization already given for unchanged effects.
No PR or second maintainer is required by this route.

### Maximum sensible autonomy:

Now: the accepted bounded source/configuration changes and checks, configured reviews, and authorized signed document checkpoint followed by implementation commits.
Direct-main delivery retains its explicit publication authority and required local evidence.
External package/release effects proceed only within the exact release authority established for that candidate.

### Next lifecycle step:

Record this accepted plan and its research record at the first authorized signed checkpoint before executable changes.
Resolve the HISEW runtime/activation prerequisite before governed implementation verification; preserve the separate installation, selection, repository-selection, and genuine hook-activation observations.
Complete SLICE-001's discriminating integration evidence before enabling new publishing authority.

## 5. Requirements, acceptance criteria, and invariants

Each acceptance criterion is binary unless a measured inherited threshold is identified.
The accountable owner is Maksym Shostak; the implementing coordinator records proof and unresolved limitations.

| Requirement                                               | Acceptance criterion | Observable result                                                                                                                                                                                   |
| --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Preserve solo development                         | AC-001               | An ordinary direct push remains possible after local checks; no new PR/reviewer/merge-queue branch requirement is configured                                                                        |
| REQ-002 Require deliberate release initiation             | AC-002               | Push, PR, tag push, scheduled CI, and unrelated workflow completion cannot start staging, publication, or stable promotion                                                                          |
| REQ-003 Require complete hosted qualification             | AC-003               | Every required gate for one source/archive subject is successful with authenticated provider/job/attempt identities before the corresponding effect                                                 |
| REQ-004 Publish exact qualified bytes                     | AC-004               | Every transport and effect boundary rehashes the same three tarballs and manifest; a changed byte, source, matrix, or origin refuses admission                                                      |
| REQ-005 Restrict npm authority                            | AC-005               | All three packages disallow bypass tokens; staging trust cannot directly publish or manage tags; only the intended workflow/environment/repository identity matches                                 |
| REQ-006 Require owner presence                            | AC-006               | Packages stay private while staged; each public approval requires the maintainer's 2FA and is associated with the intended version, stage identifier, and archive evidence                          |
| REQ-007 Preserve tuple coherence                          | AC-007               | Both native versions are public and verified before core staging/approval becomes available through the supported process; every package has the coordinated version                                |
| REQ-008 Separate pilot availability from stable promotion | AC-008               | Initial stages explicitly select pilot; latest is unchanged until complete registry qualification and applicable policy acceptance; promotion has a distinct deliberate trigger                     |
| REQ-009 Preserve immutable GitHub delivery                | AC-009               | Exact-source signed tag, complete draft inventory, all asset bytes, immutability, release attestation, and every asset verification pass; no replacement                                            |
| REQ-010 Apply least privilege across release inputs       | AC-010               | Read-only default and explicit per-job permissions; no npm static secret, unnecessary OIDC, persisted checkout credentials, or unqualified input execution in privileged jobs                       |
| REQ-011 Produce a complete, honest distribution SBOM      | AC-011               | Native executable dependencies/runtime components and package relationships are covered, validated, hash-bound, and reconciled; omissions block a completeness claim                                |
| REQ-012 Recover without duplicate effects                 | AC-012               | Interrupted/unknown staging, approval, upload, or label changes enter reconciliation; no negative lookup alone reauthorizes an attempted effect                                                     |
| REQ-013 Retain interpretable evidence                     | AC-013               | Source/control/native identities, gate attempts, approvals, tool versions, exact artifacts, and effect outcomes survive Actions expiry under the existing retention policy                          |
| REQ-014 Preserve existing release/consumer contracts      | AC-014               | SemVer classification, AGPL/source/notices, supported runtimes, literal-preservation behavior, pilot/restoration obligations, and historical records have explicit dispositions                     |
| REQ-015 Exclude the preview                               | AC-015               | No actions.lock, gh actions-lock installation/use, Require lockfile policy, or dependency on preview availability appears in implementation                                                         |
| REQ-016 Make the operator outcome clear                   | AC-016               | Each run reports its exact phase, completed gates, pending owner action, known/unknown effects, and whether the release is staged, public, qualified, archived, or stable                           |
| REQ-017 Reuse native capabilities and current contracts   | AC-017               | Native npm/GitHub/CycloneDX interfaces own their formats; custom code is limited to repository identity, sequencing, coverage, and reconciliation gaps                                              |
| REQ-018 Preserve proportionate verification               | AC-018               | Fresh required hosted release proof is produced once for its subject and reused across continuation phases; repeat checks only for changed inputs, invalid evidence, or a concrete unmet obligation |

Domain invariants:

- A package version identifies immutable bytes; version equality is not evidence of byte equality.
- Package-source, publishing-control, native-source, native-build, and workflow-run identities are separate fields.
- A test result belongs to its exact source, artifacts, policy, environment, job, run, and attempt.
- A successful top-level run cannot hide skipped, neutral, cancelled, missing, duplicate, or foreign required jobs.
- A stage is not a public release; a public version is not necessarily a qualified/stable release.
- The owner remains the release decision-maker; an approval-looking string is not authenticated approval.
- GitHub and npm do not provide one atomic transaction across all packages, assets, and labels.
- Evidence of registry absence cannot prove that a prior uncertain request was never accepted.
- Ordinary source edits after selection cannot substitute new bytes into a frozen release.
- Completeness, authenticity, vulnerability absence, legal clearance, and reproducibility are different claims.
- Historical evidence is read-only history, not a live fallback publishing path.

## 6. Quality scenarios

All scenarios below are proposed hard release constraints unless marked as an optimization.
Owner: Maksym Shostak for acceptance; implementing coordinator for evidence collection.
Production signals are retained run/journal fields and manual readback, not a new telemetry service.

| ID / priority   | Source, stimulus, environment, artifact                                                         | Required response and measure                                                                                                               | Verification and production signal                                                                           | Trace / rationale                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| QA-001 / high   | Maintainer pushes an ordinary commit during development                                         | Zero release effects; direct development remains available                                                                                  | Trigger/event tests and hosted push observation; no stage/publication journal                                | REQ-001/002, AC-001/002; avoid accidental publication                    |
| QA-002 / high   | One required product/security/platform job fails, disappears, or is skipped                     | Deny staging before any npm effect; identify the exact unsatisfied gate                                                                     | Negative provider fixtures plus authorized hosted failing-gate exercise; gate denial record                  | REQ-003, AC-003; closes the current candidate-only gap                   |
| QA-003 / high   | Artifact substitution, foreign run, rerun-attempt mixture, or mutated manifest in transport     | Deny before effects, with zero accepted mismatches                                                                                          | Independent hashes and mutated fixtures; subject/digest mismatch reason                                      | REQ-004, AC-004; all trust boundaries revalidate                         |
| QA-004 / high   | Main advances during preparation or after native approval                                       | Stop ordinary preparation as required; preserve already attempted bytes and use explicit continuation tied to original subject              | Controlled race fixtures and hosted observation; source/control identities and stale-reference reason        | REQ-004/012; fast development must not mutate an in-flight release       |
| QA-005 / high   | CI has stage-only OIDC; owner has not approved                                                  | Zero direct publication and zero stable promotion; pending packages remain staged                                                           | Settings readback and bounded staging qualification; no public target version before approval                | REQ-005/006, AC-005/006; separate workflow authority from owner presence |
| QA-006 / high   | One native approval is absent, mismatched, or fails readback                                    | Core is not staged by the supported workflow; retain partial native state                                                                   | Table-driven state cases and first live tuple; per-native outcome and core eligibility                       | REQ-007/012, AC-007/012                                                  |
| QA-007 / high   | Native/core stage request, GitHub write, or tag movement loses its response                     | Mark unknown; reconcile provider state; zero blind retry/overwrite                                                                          | Fault injection at actual subprocess/network boundaries; attempted/result/readback journal                   | REQ-012, AC-012                                                          |
| QA-008 / high   | npm accepts a version but metadata visibility lags                                              | Preserve the existing five-minute per-package availability bound; only recognized propagation absence may wait; mismatch/auth failures stop | Controlled metadata fixtures and real first-use timings; visibility elapsed time and terminal reason         | REQ-007/012; existing policy in support-and-release                      |
| QA-009 / high   | Published core or native install/provenance fails on Windows or Linux                           | No latest promotion or successful stable-release record                                                                                     | Hosted clean installs, native signature verification, root/isolated layouts; both terminal platform reports  | REQ-003/008, AC-003/008                                                  |
| QA-010 / high   | A native Rust component is deliberately omitted or attributed to the wrong platform             | SBOM completeness gate fails despite schema-valid JSON                                                                                      | Compare with independently extracted embedded/runtime evidence; missing/extra/misclassified component report | REQ-011, AC-011                                                          |
| QA-011 / high   | Existing GitHub draft has unexpected assets, changed bytes, wrong tag, or disabled immutability | No publication, replacement, or deletion; reconcile                                                                                         | Existing release tests extended through hosted adapter; native release/asset verification results            | REQ-009/012                                                              |
| QA-012 / medium | Owner is unavailable longer than a CI job budget                                                | End at a durable pending phase; consume no indefinite runner wait; resume without rebuilding or repeating effects                           | Continuation exercise with terminal runs; next action and retained evidence location                         | REQ-006/012/016; practical solo operation                                |
| QA-013 / high   | New transitive dependency vulnerability or rights discrepancy is found in qualification         | Hold affected release and record actionable disposition; no producer-only override is claimed to fix recipients                             | Native audit/advisory and actual packed/installed graph evidence; candidate hold                             | REQ-011/014                                                              |
| QA-014 / high   | Actions artifacts expire after 30 days                                                          | Required evidence remains retrievable and digest-verifiable for maintained lifetime plus three years after support ends                     | Retained-store/immutable-release retrieval exercise; retention owner and object inventory                    | REQ-013, AC-013                                                          |
| QA-015 / medium | Same frozen candidate is resumed after approval without changed inputs                          | Reuse admissible qualification; run missing continuation checks only                                                                        | Receipt/subject comparison; evidence-reuse decision with reason                                              | REQ-018, AC-018; optimization constrained by correctness                 |
| QA-016 / high   | Preview-related dependency or policy is proposed during implementation                          | Reject it from this scope                                                                                                                   | Diff/configuration inspection; deferred decision remains unchanged                                           | REQ-015, AC-015                                                          |

Existing performance acceptance remains six valid full checks per frozen corpus/platform, observed nearest-rank sample p95 at most 30 seconds, with the six-sample maximum interpretation retained.
Windows committed memory and Linux whole-tree resident memory each retain their separately defined 512 MiB qualification budget.
Do not reinterpret those measurements as identical metrics, statistical tail guarantees, arbitrary-repository promises, or production resource ceilings.
Where applicable, retain the existing scoped restoration exercise target of 60 minutes.
No additional latency, cost, or job timeout target is invented by this plan; measure new staging/SBOM work before changing operation budgets.

## 7. Design decisions and alternatives

| Decision                           | Selected direction and rationale                                                                                  | Alternatives / trade-off / reassessment                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 Development authority      | Keep direct-to-main and local checks; govern release effects separately                                           | Mandatory PRs are excluded by user instruction; revisit with additional contributors                                                   |
| DEC-002 Release entry              | Keep a deliberate workflow_dispatch entry and explicit continuation/promotion operations                          | Automatic publication after push/tag/workflow_run is excluded                                                                          |
| DEC-003 Qualification authority    | Compose existing product/candidate/native checks into one explicit release gate inventory                         | Copying commands into a second independent suite risks drift; top-level candidate success alone is insufficient                        |
| DEC-004 Test execution             | Fresh hosted qualification for release preparation; retain exact proof for later phases                           | Ordinary push-CI reuse optimization remains separate; repeated unchanged full runs are unnecessary                                     |
| DEC-005 npm authorization          | Stronger package access plus stage-only publishing connection and owner 2FA approval                              | Direct OIDC publication remains supported by npm but is not this plan's chosen mode                                                    |
| DEC-006 Single-maintainer approval | Use npm owner approval as the human presence gate; no required second human                                       | GitHub self-review can be an optional checkpoint but is not independent review or a mandatory duplicate gate                           |
| DEC-007 Availability labels        | Explicit pilot during staging; stable promotion only after hosted registry and archival prerequisites             | Never rely on npm's default tag; the historical 1.0.3 latest-on-publish exception is not generalized                                   |
| DEC-008 Tuple sequence             | Verify public native packages before making core staging available                                                | Staging all three at once would permit premature core approval; preserve the stronger existing sequencing guarantee                    |
| DEC-009 Durable continuation       | Stop at pending owner action and resume from exact immutable inputs through a manual continuation                 | Unbounded polling occupies runners; a new daemon, scheduler, or notification service is unnecessary                                    |
| DEC-010 Privilege split            | Stage and stable-label management use distinct workflow/environment trust boundaries                              | Adding tag-management authority to the staging connection would widen the preparation path's effects                                   |
| DEC-011 GitHub archive             | Reuse existing draft/readback/immutable-publication logic and native gh verification                              | Replacing the proven archival implementation or uploading unverified convenience assets is unnecessary                                 |
| DEC-012 SBOM meaning               | Describe distributed package/native contents and separately identify source/build/consumer-resolution inventories | A format-version bump or raw Cargo.lock dump does not establish shipped-component coverage                                             |
| DEC-013 Stable tooling             | Prefer existing npm/gh capabilities; qualify current stable SBOM tools against actual binaries                    | No generic package resolver, provenance verifier, license classifier, or custom CycloneDX parser                                       |
| DEC-014 Preview deferral           | No Actions dependency lockfile feature in this change                                                             | Reconsider only after wider availability and an explicit owner decision; no scheduled monitor is created                               |
| DEC-015 Historical compatibility   | Preserve old evidence bytes and read-only verification; support one current publishing contract                   | No old direct-publish fallback or silent legacy authorization downgrade; historical incomplete effects require explicit reconciliation |
| DEC-016 Naming and scope           | Name staging, approval, publication, qualification, archival, and promotion separately                            | Do not rename unrelated files; reassess changed job/record names whose old meaning is misleading                                       |
| DEC-017 Whole-release completion   | Final completion requires agreement of all package versions/labels and GitHub release readback                    | Cross-service partial completion is a recoverable state, never an atomicity claim                                                      |
| DEC-018 Existing obligations       | Retain SemVer, source/notices, consumer acceptance, retention, and security dispositions                          | Resolve stale/inapplicable requirements explicitly; this plan cannot quietly waive them                                                |

### 7.1 Proposed operator journey

The following is the proposed supported path, using GitHub's native Actions UI and npm's native approval UI/CLI.
It deliberately has durable handoffs where the registry requires human presence.
It does not require a continuously running CI job or an extra application.

1. The owner commits and pushes ordinary work after local tests pass.
2. The owner selects the intended release version and exact source on main, then manually starts release preparation.
3. GitHub Actions resolves and freezes the qualification matrix, executes every required pre-publication gate, packs one final tuple, validates its SBOM/evidence, and records an inspectable summary.
4. The owner prepares the exact-source signed version tag using the existing qualified signing route before irreversible release effects; hosted checks verify it.
   No personal signing key is uploaded to Actions.
5. The stage-only workflow stages the two native packages under pilot and records returned identities/outcomes.
   It stops with explicit owner instructions.
6. The owner reviews the staged native identities/bytes against the qualified evidence and approves each through npm with 2FA.
7. A deliberate continuation admits the retained subject, verifies both public native archives and their original provenance, then stages the core under pilot.
   The owner reviews and approves that core with 2FA.
8. A deliberate finalization run performs complete anonymous registry qualification on Windows and Linux, checks all stable-release prerequisites, prepares/verifies the complete GitHub draft, and publishes its immutable archival release.
9. The separately scoped promotion operation moves the three npm latest labels, native packages first and core last, then classifies the same verified GitHub release stable/latest and reads back the complete state.

Finalization and promotion may share one explicitly requested workflow run with separate privilege-bearing jobs.
They must retain separate eligibility decisions and journals.
The owner can stop after pilot qualification.
The exact native approval actions are real effects, not three invented copies of an agent permission prompt.

The initial implementation should keep the proven publish.yml identity for the staging process where its encompassing meaning remains accurate.
A separate finalization/promotion workflow and environment are predicted seams, not filenames mandated before source review.
Changing a trusted workflow filename or moving OIDC into a reusable workflow requires rechecking npm's actual caller identity; do not assume the token identifies the expected file.

### 7.2 State and identity model

Use the existing release manifest and publication-origin design as the starting point.
A current record must distinguish:

- release ID/version and package source commit;
- publishing-control commit and qualified workflow identity;
- native source, build release, platform executable digest, and build evidence;
- exact three archive names, sizes, SHA-256 values, and npm integrity values;
- source SBOM and distribution SBOM identities/coverage;
- gate inventory, matrix, provider run IDs, attempts, job IDs, conclusions, and evidence digests;
- per-package stage request, returned stage identifier, staged digest/tag, and approval/publication observation;
- expected provenance origin independently established before verification;
- per-effect intended, attempted, known-success, known-no-effect, and unknown status;
- GitHub draft/release/tag/assets and npm prior/target distribution labels;
- human decision references, pending action, and final reconciliation result.

Per-package phase descriptions are: eligible to stage, staging attempted, staged awaiting owner, public awaiting verification, verified, rejected, or outcome unknown.
These phase names are a design vocabulary, not permission to duplicate provider state as a second source of truth.
Always reconcile native provider observations.
A GitHub run completing its staging work successfully does not mean that the package was publicly approved.

An unrelated main advancement must not silently change an already attempted release's original bytes.
Preserve the existing ordinary-preparation guard against branch advancement.
For explicit continuation after a legitimate owner pause, separate the retained artifact source from the current reviewed recovery/control source, as the existing recovery model already does.
If that relation cannot be admitted, stop with the exact prerequisite rather than force the maintainer to republish or discard accepted native versions.

### 7.3 Permissions and remote configuration

| Boundary                    | Proposed authority                                                        | Configuration / proof                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary developer          | Existing Git credentials and local testing                                | No new branch PR restriction                                                                                                        |
| Repository Actions default  | Read-only repository contents                                             | Enumerate existing jobs before changing the default; preserve required explicit permissions                                         |
| Qualification and transport | Read contents/actions as needed                                           | No OIDC or package/release writes; persist-credentials false                                                                        |
| Staging job                 | OIDC only for its package staging trust                                   | Existing repository plus publish.yml plus npm-publication; main-only environment; no direct publish or dist-tag access              |
| Owner npm approval          | Interactive maintainer session with 2FA                                   | Native approval and inspection; no session token copied into CI                                                                     |
| GitHub archival job         | Minimum contents write and evidence reads                                 | Separate from arbitrary candidate test execution; exact checked inputs                                                              |
| npm promotion job           | Separate OIDC connection with dist-tag access and direct publish disabled | Dist-tag permission is explicit; npm may inherently allow staging on that connection, so do not describe it as technically tag-only |
| Final verification          | Public/read-only wherever supported                                       | Native signature/attestation and actual anonymous acquisition                                                                       |

All three existing packages need access-setting readback.
Inventory every trusted publisher connection, not just the first matching connection; an old connection permitting direct publication remains a bypass of the intended workflow.
Revoke unused tokens only within established ownership/scope; do not delete tokens used by unrelated packages.
Disable Actions PR-approval permission if unused as part of the reviewed default-permission change.
Full-SHA pinning remains the baseline for release-affecting Actions, including relevant called workflows and local actions.
Use a stable GitHub SHA-pinning policy only if it is available for this repository and its impact has been inventoried; the plan does not depend on it.
A broad allowlist restriction is not a substitute for inspecting the actual action closure.

No setting is changed during this draft.
During cutover, quiesce release producers, record before/after configuration, close obsolete direct-publish authority, and verify the new path before declaring activation.
If replacing a trust connection is necessary, account for npm's first-use validation/expiry rule and perform the planned first use within its supported window.
Do not leave old permissive connections enabled as an implicit rollback.

## 8. Required hosted gate inventory

Release preparation must use a single authoritative inventory whose consumers include the workflow graph, admission, summary, and tests.
The implementation may derive job expectations from existing runtime and policy contracts.
Do not create a universal policy framework when a repository-owned manifest and shared pure rules suffice.

| Gate                                 | Required proof and source of truth                                                                                                                                                                        | Phase                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| GATE-001 Identity and version        | Intended repository/main event, exact selected commit, authorized coordinated version, clean/frozen package inputs, valid tag/source relation, manifest and lock consistency                              | Before staging                                                          |
| GATE-002 Product qualification       | Existing check:product coverage, native evidence/archive/text-output tests, all applicable JavaScript tests, syntax, format, authored Markdown, runtime policy checks                                     | Before staging                                                          |
| GATE-003 JSON and architecture       | Existing JSON identity/tests/check including actual produced archives/native documents; check:architecture explicitly included if not already guaranteed by GATE-002                                      | Before staging                                                          |
| GATE-004 Transported consumers       | Same three archives on every resolved supported Windows/Linux and Node lane, root and isolated installations; complete same-attempt job inventory                                                         | Before staging                                                          |
| GATE-005 Native and rights           | Qualified build/acquisition identities, toolchain, embedded dependencies, notices/source material, platform execution; new build qualification when native inputs change                                  | Before staging                                                          |
| GATE-006 Security                    | Applicable CodeQL analysis of the exact source, selected query/configuration identity, relevant alert disposition, dependency and recipient-graph assessment, scoped independent security review evidence | Before staging; refresh affected questions before promotion             |
| GATE-007 Performance and restoration | Applicable frozen-corpus platform windows and inherited thresholds; explicit applicability/evidence for required restoration and consumer acceptance                                                      | Performance before staging; required acceptance before stable promotion |
| GATE-008 SBOM and manifest           | Native plus package coverage, schema/consumer validation, expected component reconciliation, archive hashes, no private payloads, evidence manifest closure                                               | Before staging and archival                                             |
| GATE-009 Native public availability  | Both exact native versions, bytes and original provenance verified; no uncertain effect remains                                                                                                           | Before core staging                                                     |
| GATE-010 Public tuple qualification  | Fresh anonymous registry acquisition, cryptographic signatures/provenance, root/isolated consumers, both actual operating systems and supported release matrix coverage                                   | Before stable promotion                                                 |
| GATE-011 GitHub archival             | Existing source tag and complete draft readback, exact assets, enabled immutability, gh release verify and per-asset verify                                                                               | Before stable promotion                                                 |
| GATE-012 Stable completion           | Applicable owner/consumer acceptance, exact prior/target labels, no concurrent producer, successful complete npm and GitHub readback                                                                      | Before declaring stable completion                                      |

CodeQL currently uses GitHub default setup and has no checked-in CodeQL workflow.
Do not treat its absence from .github/workflows as absence of scanning.
Prefer authenticated exact-source analysis/check admission where it proves the required coverage.
If default setup cannot establish the release's complete obligation, design and review a hosted advanced-setup replacement without duplicate scans or silent loss of queries.
An API response or advisory review is not a substitute for a required test that has not run in Actions.

The current runtime policy has minima 22.13.0, 24.0.0, and 26.0.0, with reference 24.21.0 and platforms windows-latest / ubuntu-24.04.
These are the inspected file values; older planning history may describe different floors.
Resolve exact current minimum/latest/reference lanes once through scripts/node-matrix.js and bind the resolved matrix to the candidate.
No runtime-support change is authorized merely by this release-process work.
Recheck newest applicable stable/LTS tooling before adoption; preserve product support lanes independently.

## 9. SBOM and native reuse design

The current source SBOM remains useful and must retain its honest pre-build/npm-lock scope.
The missing deliverable is a distribution-oriented inventory for the actual package/native artifacts.
It should identify the core and each platform package, embedded native runtime dependencies, native executable hashes, component relationships, source/build attribution, and applicable license/notice references.

Example outcome: when an advisory names a Rust crate, a standard SBOM consumer can identify the relevant shipped native package/version and source evidence without manually joining custom JSON files.
That identifies candidates for investigation; exploitability still needs assessment.
A valid schema or an upgraded format number alone does not prove coverage.

Candidate reuse research, refreshed 2026-10-16:

| Capability / candidate                        | Verified identity and fit                                                                                     | Selection / unresolved evidence                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Existing npm sbom                             | npm 12.2.0; already creates the source npm graph                                                              | Retain source inventory; it cannot alone represent compiled native contents                                   |
| Existing cargo-auditable and native manifests | Already embedded/extracted during the controlled native build; component/runtime/rights records exist         | Reuse as independently attributable native evidence; avoid rebuilding binaries solely to invent metadata      |
| Syft                                          | Stable v1.54.1; documented cargo-auditable binary cataloger covers ELF and PE and supports CycloneDX JSON 1.7 | Preferred native-binary SBOM producer to qualify against both actual released executables                     |
| cargo-cyclonedx                               | Stable cargo-cyclonedx-0.5.9; maintained Rust/Cargo SBOM generator                                            | Credible build-graph alternative; target/features/build-only separation and exact shipped coverage need proof |
| CycloneDX CLI                                 | Stable v0.33.1; native merge/validation including hierarchical composition and 1.7                            | Preferred composition/validation capability if actual relationships survive without loss                      |

Exact release license texts for all three newly considered tools were inspected and are Apache-2.0.
That is a technical selection input, not blanket clearance of downloaded binary/runtime bundles or a legal certification.
Before execution/adoption, inspect the selected release artifacts, transitive/runtime notices, acquisition verification, and actual distribution/terms obligations.
Tools should remain build-time dependencies unless a recipient requirement justifies shipping them.
No tool was installed or executed for this plan.

Use the current stable tool's supported CycloneDX version explicitly, with 1.7 the current target where qualified.
Retain npm's existing 1.5 source document as original evidence if conversion is needed; do not relabel its coverage.
Prefer native merge/BOM linking and schema validation over a handwritten format converter.
Custom logic may bind package/platform identities, reconcile component coverage, and attach existing rights/runtime evidence that tools cannot infer; document that residual gap first.

The proof experiment must distinguish:

- actual embedded runtime crates from Cargo.lock's source/build/dev superset;
- Rust standard-library/runtime attribution and Windows/Linux system dependencies from vendored third-party libraries;
- package distribution contents from dependencies resolved at consumer install time;
- one qualified consumer dependency resolution from every possible future transitive resolution;
- licensing inventory from vulnerability/exploitability assessment;
- platform variants with the same crate identity from erroneous deduplication.

Retain the source graph and qualified consumer lock graphs with their own scope.
Do not promise an immutable universal npm consumer graph when transitive resolution remains dependent on installation context.
Zero silently omitted required native/runtime components is the completeness criterion.
Unresolved attribution must be explicit and blocks a claim that the inventory is complete.
The exact tool adoption is gated by OPEN-003; the plan does not claim its experiment already passed.

## 10. Architectural seams, DRY assessment, and test oracles

Likely file locations are predictions, not a request to edit every listed file.

| Current authority / rule                      | Latest consumers and predicted seams                                                                                         | Strategy and drift control                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime support and expected matrix           | assets/node-support.json, scripts/node-matrix.js; check.yml, candidate.yml, admission, summaries                             | Derive expectations from the existing owner; no copied Node/platform list                        |
| Product checks                                | scripts/verify.js and package.json; check.yml and release preparation                                                        | Reusable workflow/commands; retain explicit host/platform execution                              |
| Exact release bytes                           | scripts/pack.js, release-bytes.js, release-assets.js; all transports/publish/archive readers                                 | Reuse bounded pure checks; repeat enforcement at each independent trust boundary                 |
| Release eligibility                           | scripts/verify-publication.js and publication-context.js; stage/continue/finalize operations                                 | Extend one current policy with explicit phases; reject obsolete writers                          |
| Per-package provenance and effects            | scripts/publication-origins.js, publication-npm.js; registry verifier and recovery                                           | Version the changed contract; preserve old evidence and independently expected origins           |
| Registry acceptance                           | scripts/wait-registry-integrity.js and qualify-public-registry.mjs                                                           | Reuse native npm verification; preserve bounded propagation policy and actual consumer execution |
| GitHub archival                               | scripts/prepare-github-release.js and github-release.js                                                                      | Reuse proven draft/readback/resumption logic through a narrow hosted adapter                     |
| Native build/component knowledge              | scripts/build-native.py, assets/native-build.json, native-rights.json, tool-manifest.json, existing embedded/runtime reports | Compose maintained SBOM tooling with existing evidence; do not duplicate license classification  |
| JSON policy                                   | tooling/json public integration, scripts/qualify-json-packages.mjs and native-json-documents.mjs                             | Keep the shared JSON engine authoritative; explicitly include new generated evidence             |
| Historical recovery and operator instructions | docs/release-operations.md, support-and-release.md, applicable release records                                               | One current runbook with explicit history; no misleading retained step labels in new effects     |

Deliberate independent validation remains at transport, staging, registry, and GitHub boundaries because each consumes separately supplied data and can fail independently.
Shared pure checks are appropriate; shared mutable authority or a network policy service is not needed.
Tests may share neutral input builders, but expected approval decisions and hashes must come from independent fixtures/oracles.
Mutation sensitivity must demonstrate that deleting a required gate or changing a digest causes rejection.
Do not calculate expected results through the function under test.

Native npm and gh own their supported command/response contracts.
Use their parsers/verifiers rather than a private Sigstore verifier, npm argument grammar, or guessed REST write route.
Use maintained CycloneDX validation and the repository's JSON tooling.
Mock only genuine external provider/process boundaries for deterministic adverse cases.
Real hosted OIDC/2FA, registry cryptography, platform execution, and immutable-release behavior require integration evidence; mocked success is not that evidence.

No prior no-shim override is granted for this work.
Retained legacy history may be verified under an explicit read-only historical schema, but it must never route to old permissive effects.
Names that currently say publish when they now mean stage must be corrected in the current contract.
Legacy exact step strings used to interpret old attempts remain historical data with explicit schema attribution.

## 11. Vertical implementation slices and proof

The implementation coordinator owns integration.
Each slice delivers an observable path with tests/documentation, rather than a horizontal batch of all schemas followed by all workflows.
All required slices must complete before claiming the revised release process is implemented.
External effects remain subject to the accepted authority and gates.

### SLICE-001: Establish the executable release contract

Demonstrate that one intended release subject has a complete, inspectable required-gate inventory and cannot be admitted when any required hosted proof is absent.
Reconcile current docs, source, default CodeQL setup, HISEW prerequisites, versioning, and existing consumer/pilot obligations.
Resolve OPEN-001/002/004 enough to select the staging and approval integration.
Keep new effect paths disabled.

Predicted seams: release policy/manifest contracts, verify-publication.js, publication-context.js, node-matrix.js, release documentation, and their focused tests.
Proof: missing product gate, wrong source/attempt/workflow, incomplete matrix, unsupported event, and changed manifest all deny; ordinary direct pushes remain unaffected.
Release implication: an eligibility report only; no new publishing authority.
Reversal: revert unpublished source changes without external state.

### SLICE-002: Run full release qualification through a manual entry

Demonstrate manual preparation of one fresh candidate with all required pre-publication tests in Actions, producing one frozen tuple.
Compose check.yml and candidate.yml with existing commands; preserve their ordinary CI and fixture-dispatch uses.
Resolve the matrix once, run the full required product/security/native/JSON/architecture/consumer/performance work, and produce authenticated summaries.
Disallow proof-reuse shortcuts that merely substitute local/self-reported results for hosted execution.

Proof: successful complete matrix; an intentionally failed full-product gate prevents staging; wrong/partial/rerun job inventory is rejected; exact transported archives execute in both layouts.
Release implication: fully qualified but unpublished candidate.
Reversal: disable the new entry without disturbing normal direct-to-main CI.

### SLICE-003: Stage and approve a coherent npm tuple

Demonstrate staged native packages, owner approval, verified native availability, then core staging/approval using the same frozen archives.
Extend the existing effect/origin journal to stage identifiers and separately observed approval/publication.
Use stage-only OIDC, no static tokens, and explicit pilot.
Private staged inspection uses the maintainer's native authenticated tools; no CI credential workaround.
Cutover configuration follows the order in section 13.

Proof: native byte identity across staging/publication, preserved provenance origin, no direct-publish permission, no premature core stage, and successful owner-presence path.
Fault proof: lost staging response, existing staged version, owner rejection, partial approval, metadata lag, concurrent continuation, and source advancement preserve safe outcomes.
Release implication: first real public effects are irreversible; use only an explicitly authorized coherent new version.
Reversal: hold/reject unapproved stages under owner authority; public versions require reconciliation/forward fix.

### SLICE-004: Qualify the public tuple and finish immutable delivery

Demonstrate manual finalization of the approved tuple through real anonymous Windows/Linux registry installs, signatures/provenance, archive matching, and complete GitHub draft verification.
Use the existing archival behavior and existing owner signing route.
Grant release-write authority only to the necessary archival job.

Proof: complete hosted registry reports; incorrect provenance or a single asset mismatch blocks finalization; every final asset and the signed tag verify through native gh.
Release implication: immutable archival release, initially kept out of stable promotion until its separate gate.
Reversal: resume a matching partial draft; never overwrite published immutable assets.

### SLICE-005: Promote stable labels with attributable recovery

Demonstrate a deliberate promotion that requires full registry/archive/policy proof and moves native latest labels before core.
Use a distinct npm trust boundary with explicit dist-tag permission and direct publishing disabled.
Read back all three npm labels and GitHub classification.
Preserve prior qualified label targets and per-effect outcomes.

Proof: staging credentials cannot move tags; missing Linux/Windows/archive acceptance denies; interruption after each native/core/GitHub effect reconciles without repeating uncertain writes.
Release implication: final stable completion is declared only after cross-service agreement.
Reversal: owner-authorized restoration to the recorded previously qualified tuple, with fresh readback; no claim that previous downloads are undone.

### SLICE-006: Include native contents in the distribution SBOM

Demonstrate a standards-based inventory for the actual package/native artifacts using qualified maintained tools and existing native evidence.
Resolve OPEN-003 first.
Add schema and coverage checks, manifest bindings, GitHub attachment, and consumer-oriented explanation.
Keep source/build/consumer-resolution inventories distinguishable.

Proof: both actual ELF/PE native archives, independent embedded/runtime comparison, missing-component mutation, platform attribution, relationships, notices/source references, and schema validation.
Release implication: new releases gain a complete inventory; existing immutable releases are not modified.
Reversal: hold a new release if completeness cannot be established; do not silently fall back to an npm-only completeness claim.

### SLICE-007: Enforce least privilege and close obsolete paths

Demonstrate the whole release path with read-only default Actions permissions, explicit elevations, pinned action closure, isolated package-manager configuration, and no obsolete direct-publish connection.
Review all affected jobs before changing repository defaults.
Remove spent live fallback paths while retaining historical evidence readers.

Proof: permission inventory, real settings readback for all three packages/connections, ordinary CI success, negative unauthorized operation tests, and unchanged direct developer delivery.
Release implication: activate the hardened configuration only with the qualified implementation and a controlled first-use sequence.
Reversal: disable release entry points while preserving token restrictions; reintroducing broader authority requires a new explicit decision.

### SLICE-008: Rehearse, review, document, and hand off

Demonstrate the full operator journey and recovery cases against the final consolidated candidate.
Update release/support/security documentation and examples without weakening historical constraints.
Complete applicable HISEW full verification and independent reviews, then authorized signed direct-main delivery and exact hosted readback.
Perform the first real release only when its separate candidate authority exists.

Proof: section 13 rehearsal evidence, final traceability closure, native settings/readback, no preview feature, retained evidence retrieval, and accurate operator summaries.
Release implication: distinguish implementation delivered, configuration activated, first staged run, first public release, and stable release.
Cleanup: retain required evidence and remove only owned disposable materials under the accepted retention policy.

### Traceability and ordering

| Slice     | Requirement / acceptance / scenario / decision linkage                       | Falsifiable proof                                            | Release / cleanup consequence                 |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| SLICE-001 | REQ/AC-001-004, 012, 014, 016-018; QA-001-004, 007; DEC-001-004, 015-018     | Complete gate inventory and negative admission cases         | No external effects                           |
| SLICE-002 | REQ/AC-002-004, 010, 014, 018; QA-001-004, 009, 013, 015; DEC-002-004        | Real hosted complete/failing candidate runs                  | Retain exact candidate once                   |
| SLICE-003 | REQ/AC-004-007, 012, 016; QA-003-008, 012; DEC-005-009                       | Real stage/approval/native-before-core path plus fault cases | Preserve partial and unknown registry effects |
| SLICE-004 | REQ/AC-003-004, 009, 013-014; QA-009, 011, 014; DEC-011, 017-018             | Both platform installs and all immutable assets verified     | Retain signed-source and archival bundle      |
| SLICE-005 | REQ/AC-008, 010, 012, 016; QA-007, 009, 011-012; DEC-007, 010, 017           | Deliberate promotion and interrupted-label reconciliation    | Restore only qualified labels; no republish   |
| SLICE-006 | REQ/AC-011, 013-014, 017; QA-010, 013-014; DEC-012-013                       | Independent native inventory and omission detection          | No historical asset rewriting                 |
| SLICE-007 | REQ/AC-001, 005, 010, 015, 017; QA-001, 005, 016; DEC-001, 005, 010, 014-016 | Least-privilege and remote-settings readback                 | Disable unsafe release paths                  |
| SLICE-008 | All REQ/AC; QA-007-016; DEC-017-018                                          | Final review, rehearsal, hosted and provider readback        | Accurate completion and evidence handoff      |

SLICE-001 precedes implementation of new external effects.
SLICE-002 precedes SLICE-003; SLICE-003 precedes real public-tuple verification; SLICE-004 precedes stable promotion in SLICE-005.
SLICE-006 and the source portion of SLICE-007 must be complete before the first release claiming this plan's full outcome.
Their code/research can progress independently after shared manifest/permission contracts are fixed.
Configuration cutover is ordered with staging integration, not applied speculatively.
SLICE-008 integrates all slices.

Parallel work is only a semantic decomposition opportunity, not current delegation authority.
Safe independent read-only work includes native SBOM research, release-policy inventory, and Actions permission inventory.
Do not assign parallel writers to the same origin schema, publishing workflow, or acceptance authority.
Consolidate before broad review; review repair deltas narrowly unless changed scope invalidates earlier coverage.

## 12. Principal unknowns and discriminating experiments

| ID       | Question / owner                                                                                                                                                | Cheapest evidence                                                                                                                                                               | Stop or replan condition                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OPEN-001 | Does native npm stage publish preserve these exact tarball bytes and the expected OIDC provenance through approval? Implementer; maintainer accepts             | Inspect pinned npm 12.2.0 implementation/native dry-run behavior, then one explicitly authorized staged/new-version path with download and post-approval cryptographic readback | Byte change, lost provenance, unsupported invocation, or unverifiable approval origin blocks stage integration; no direct-publish fallback |
| OPEN-002 | How are stage IDs and unknown private-stage outcomes recovered with the actual supported authentication? Maintainer                                             | Native stage result plus maintainer list/view/download and exact matching; no OIDC inspection assumption                                                                        | Missing or ambiguous original stage requires owner reconciliation; no duplicate stage because public registry says 404                     |
| OPEN-003 | Can stable Syft/CycloneDX tooling cover both exact native binaries, runtime attribution, and relationships without loss? Implementer and native/rights reviewer | Compare generated output to existing embedded/component/runtime evidence on both platforms, inject omission, validate composition                                               | Unexplained omissions or license/relationship loss block completeness; qualify another maintained option before custom conversion          |
| OPEN-004 | Which exact full hosted gates and next-release pilot obligations apply? Maintainer with implementer                                                             | Compare current scripts/workflows/default CodeQL/accepted release docs to gate table; inspect next-version compatibility delta                                                  | A missing owner decision about support, behavior, consumers, or major version blocks that release, not unrelated source work               |
| OPEN-005 | Which npm permission/configuration APIs and first-use expiry apply to these existing mappings? Maintainer                                                       | Current settings and native trust docs; retain before/after identity; qualify within supported expiry                                                                           | Do not assume connections are editable in place or leave a permissive connection live                                                      |
| OPEN-006 | How does CodeQL default setup prove the exact selected release? Implementer/security reviewer                                                                   | Inspect authenticated analysis/check identities and configuration; prove missing/stale/failed analysis denial                                                                   | If insufficient, replan scoped advanced setup; do not pretend a green unrelated run meets the gate                                         |
| OPEN-007 | Can the signed-tag and GitHub archival operation run through the desired hosted boundary without moving a personal key? Maintainer/implementer                  | Verify pre-existing signed source tag and call existing native archival adapter on a controlled draft path                                                                      | No uploading personal signing secrets or weakening tag-source verification                                                                 |
| OPEN-008 | What runtime/resource budgets does new SBOM/staging work need? Implementer; owner accepts material cost change                                                  | Bounded measured runs with input sizes, elapsed time, memory, and CI logs                                                                                                       | Preserve existing limits until evidence justifies a change; no universal guessed timeout or indefinite owner wait                          |
| OPEN-009 | Are all current settings/permissions still as audited at cutover? Maintainer                                                                                    | Fresh exact readback of environments, default permissions, all trust connections, package access, and live producers                                                            | Changed input/owner/producer requires reconciliation before mutation                                                                       |
| OPEN-010 | Is HISEW selected/loaded/current-session activation coherent for implementation? Actual owning sessions and maintainer                                          | Supported manage/selection inspection and genuine current-session activation observation                                                                                        | No silent selection, reinstall, or verification claim while unresolved                                                                     |

A private scratch package is not automatically an adequate experiment: different visibility/provenance/authentication behavior can invalidate the result.
Creating any test package or consuming a package version is an external effect requiring its own exact scope.
Prefer local contract probes and authorized existing-package first-use evidence; do not create throwaway public identities merely to make a test pass.
A successful dry run does not prove hosted OIDC, registry approval, or publication behavior.

## 13. Migration, rollout, rehearsal, and recovery

### 13.1 Implementation and configuration checkpoints

1. Accept the draft implementation baseline, resolve HISEW readiness, inspect current scope/ownership/storage, and record the plan at the first authorized signed checkpoint.
2. Implement and test the new current schemas and manual release paths while they have no newly enabled external publishing authority.
3. Complete source integration, relevant full verification, and independent code/security/native review against one settled candidate.
4. Deliver source through the authorized direct-main route; inspect the exact remote commit and hosted checks.
   Do not require a PR.
5. Quiesce existing release producers.
   Preserve settings and unfinished historical effect journals; select the exact current configuration transition.
6. Apply the all-package 2FA/token restriction and stage-only trust configuration; establish the separate promotion trust with the minimum supported permissions.
   Read back every setting.
7. Apply reviewed Actions defaults/explicit permissions and verify ordinary CI and release qualification.
   Keep old direct publication unavailable.
8. Exercise native staging and approval with the exact owner-authorized new version.
   Complete both-platform public qualification, archive verification, and promotion only when all applicable gates pass.
9. Retain final configuration, artifact, approval, and recovery evidence.
   Declare each achieved stage separately.

A new trust connection's validation window may constrain checkpoint order.
Schedule its first real use accordingly; do not create it long before the qualified candidate is ready.
If a supported change requires replacement, the temporary no-publication interval is acceptable; an overlapping permissive bypass is not the default recovery technique.

Schema evolution must name the current writer and consumers, validate new required fields, and reject unsupported current-effect records.
Preserve original historical JSON bytes, source records, and immutable release assets.
Do not run a broad rewrite/backfill over docs/releases or historical evidence.
Any migration needed for current operation must be lossless, attributable, and independently validated; missing facts cannot be synthesized.
Legacy partial attempts retain their original run/attempt/source and require explicit reconciliation before adopting the new operation.

### 13.2 Required rehearsal cases

The final candidate must have retained evidence for:

- successful unpublished preparation with complete hosted gates;
- one genuine missing/failing required hosted gate blocking effects;
- artifact/hash/workflow/attempt substitution rejection;
- interrupted stage creation with no response and maintainer reconciliation;
- one approved native and one pending/rejected native, with core unavailable;
- main advancement while owner approval is pending, preserving original subject;
- public version visibility delay and mismatched metadata refusal;
- provenance or actual platform-install failure preventing promotion;
- unexpected/mismatched GitHub draft assets and matching-draft resumption;
- interruption between each label/classification effect and exact readback recovery;
- retained-evidence retrieval after temporary Actions artifacts are no longer relied on;
- SBOM component omission and platform misattribution detection;
- normal direct-main development and ordinary CI under the new permission default;
- exclusion of the preview feature.

Use deterministic fault injection for destructive/rare failures.
A live public publication is not repeatedly performed to test retries.
At least one authorized end-to-end real staged release is required before claiming live activation of that path.
If no new release is authorized, report source delivery and configuration readiness separately, with live activation still unproved.

### 13.3 Abort and recovery rules

| Failure point                        | Safe action                                                                        | What cannot be claimed                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Before staging                       | Hold candidate; repair and requalify changed inputs                                | No need to change published versions                           |
| Stage request uncertain              | Preserve request/result evidence; owner reconciles matching private/public state   | A 404 or timeout is not permission to stage again              |
| Staged but unapproved                | Owner may leave pending or explicitly reject; retain stage evidence                | Rejection is not an automatic cleanup operation                |
| Only some native packages public     | Verify exact accepted bytes/origins; continue only missing eligible effects        | Tuple release is incomplete; no republishing accepted versions |
| Core public but registry checks fail | Hold latest; preserve exact failures; forward-fix changed bytes with a new version | Publication success is not qualification                       |
| GitHub draft partial                 | Resume only verified missing assets                                                | No clobber, deletion, or asset replacement                     |
| Immutable GitHub release published   | Verify/read back; retain history                                                   | No replacing its tag or payloads                               |
| Some stable labels moved             | Reconcile each intended/prior/current label and owner-authorized restore/continue  | No cross-system atomicity or rollback of downloads             |
| Security or rights gate fails        | Stop affected release and record owner/specialist disposition                      | No invented waiver or blanket legal clearance                  |
| Tool/engine/provider unavailable     | Preserve complete/incomplete evidence and identify the exact blocked obligation    | No success inferred from partial logs                          |

The previous known qualified stable tuple is the candidate for label restoration, subject to fresh verification and security/support suitability.
Do not use the historical Linux-unqualified alpha.2 latest target as a recovery target.
A package downgrade cannot restore documents already formatted by consumers.
Consumer restoration remains scoped to its own accepted preimages and sentinels.
Any restoration that would weaken security or reinstate obsolete publishing authority requires an explicit changed-risk decision.

## 14. Verification, review, observability, and completion

### Verification cadence

During implementation, run meaningful focused tests for the changed admission/recovery/manifest behavior.
Existing anchors include test/publication.test.js, test/registry-readback.test.js, test/github-release.test.js, native staging/evidence checks, and workflow/proof-reuse tests.
Use npm run check:affected for integration when its impact graph is applicable; explicitly include changed workflow files, new scripts, and generated-contract consumers rather than assume impact discovery sees them.
The broad contracts-only focused profile is not sufficient by itself for this change.

Finish formatting, syntax, JSON identity, and input-producing work before freezing the final candidate.
Run the route-selected full profile once for its settled subject and complete any release-specific obligations it does not cover.
The currently registered full command is npm run check:full.
Hosted qualification remains a separate proof class.
A later change requires a scope-based evidence decision; preserve old results and refresh affected proof.
Do not rerun the complete suite merely because a valid unchanged result crossed an administrative checkpoint.

No full product suite, new hosted run, security scan, or release experiment was run to create this draft.
Document validation must be reported separately from implementation verification.

### Review ownership

Review the final consolidated source/configuration candidate for ordinary correctness and the material authorization, input, credential, artifact, recovery, and native-content boundaries.
Use the designated native security provider when the accepted scope requires it and it is available.
Preserve the actual provider, target, coverage, findings, repairs, and limitations.
Do not equate zero reported findings with proven absence of vulnerabilities.
After repairs, review affected questions narrowly; repeat a broad review only when its coverage was invalidated.
Review cannot waive NAM-01, authorize a shim, publish findings, or approve the release.

### Operator questions and signals

Every phase summary should answer:

- Which exact source/control/native identities and package version are being handled?
- Which required gates actually executed, and where are their terminal hosted reports?
- Which archives and manifests were qualified, staged, approved, or publicly verified?
- Which owner actions remain, and what native UI/command performs them?
- Which effects are known successful, known absent, or unknown?
- What are the current pilot/latest and GitHub release states?
- Where is the durable evidence, who owns the next action, and what permits continuation?

Record run/attempt/job identity, gate result, artifact digest, stage identifier, prior/target labels, effect status, elapsed propagation wait, and failure reason.
Never log tokens, 2FA codes, recovery codes, private browser session material, or embargoed findings in public artifacts.
Keep sensitive review findings in the appropriate restricted evidence store.
No new unattended monitor, notification integration, or scheduled task is introduced.

### Evidence retention and cleanup

Preserve release source/build inputs, qualified archives, notices, SBOMs, accepted approvals/recovery inputs, and actual recipient verification for the maintained release lifetime plus three years after support ends, as the existing policy states.
Actions' 30-day artifact retention is a transport lifetime, not the retention policy.
Export required records before expiry.
Public release bundles contain only deliberately selected public material; private configuration/security details stay in the restricted external store.

The original audit metadata and GitHub release assets were copied to the external planning directory with per-file SHA-256 comparison.
There are 31 preserved files totaling 27,779,468 bytes; audit-preservation.json records original and retained paths and hashes.
Original temporary consumer installations were not duplicated.
This preservation does not upgrade the historical audit to a HISEW receipt or imply new tests.
Retain this planning evidence until implementation handoff and the applicable release-retention decision; remove only specifically owned disposable copies after integrity and continued retention are established.

### Definition of done

The implementation can be called delivered when every requirement/acceptance row has exact proof or an explicitly accepted, accurately scoped disposition; all required slices and reviews are complete; source is delivered through the authorized route; and the intended configuration has verified readback.
The live publishing path can be called qualified only after the real staged approval, both-platform registry, immutable GitHub, and promotion path has succeeded for an authorized release.
If release authority is absent, finish the authorized source/configuration work and state the remaining live qualification boundary precisely.
Do not mark a draft, a source commit, or a staging-only run as a completed stable release.

## 15. Replanning and deferred work

Rebaseline the affected portion when any of the following changes:

- another contributor or maintainer obtains write/publish authority;
- package identities, native platforms, runtime support, source behavior, or SemVer classification change;
- npm staging/provenance/tag permissions differ from the qualified native contracts;
- package or workflow trust identities, environment policies, or signing ownership change;
- a required gate is removed, replaced, or cannot be attributed to the selected release;
- native SBOM tools cannot preserve coverage, attribution, rights, or relationships;
- recovery would require overwriting immutable material, reintroducing direct token publication, or guessing an unknown effect;
- next-release pilot/consumer obligations conflict with the intended scope;
- measured resource/cost behavior exceeds an accepted budget;
- current HISEW selection, execution ownership, evidence roots, or verifier applicability changes;
- preview adoption is proposed.

Actions workflow dependency lockfiles are explicitly deferred.
There will be no lockfile generator installation, generated actions.lock, lockfile-enforcement setting, evaluation dependency, or automatic revisit task in this implementation.
Current full-SHA action pinning remains.
A future review requires wider availability and an owner decision; the latest observed Free/Team preview eligibility does not override the user's instruction.

Also outside scope: mandatory PRs, recruiting another maintainer solely for approval, repository-wide feature refactoring, rebuilding unchanged native code without cause, consumer migrations, retroactive edits to 1.0.3 or historical native releases, automatic dependency publication, SLSA level certification, an Enterprise upgrade, and new monitoring services.

The purpose anchor remains quick ordinary development plus deliberate, verifiable release delivery.
If a proposed control creates routine development friction without improving an identified release boundary, simplify or replan it.
If an apparent simplification removes a required gate, provenance check, owner-presence boundary, or recovery guarantee, reject it.
