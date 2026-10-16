# Release publishing assurance: audit and research record

Date: 2026-10-16, Europe/Bucharest.
Task: Codex chat 01a1434f-2582-76b1-b7e7-c4be5272add7.
Related deliverable: [detailed HISEW implementation plan](../plans/2026-10-16-release-publishing-assurance-implementation-plan.md).

This record preserves the evidence and rationale behind the conversation's revised recommendations.
Observed behavior, documented service capabilities, proposed changes, and unproved integration claims are distinguished below.
This is an operator assessment, not a certification, HISEW verification receipt, or authorization to publish.

## 1. Conversation and decision lineage

The original request was to establish whether Markdown Quality's GitHub/npm release handling followed modern authoritative practice.
The audit found strong artifact integrity and provenance, together with gaps in authorization, explicit release-gate coverage, and standardized native inventory.
Its first response recommended PR-based source protection, npm token restrictions, stronger publication approval, least-privilege Actions defaults, a complete SBOM, and optional evaluation of a newly announced Actions lockfile feature.

The user then clarified:

1. Direct-to-main development must remain available as a sole developer, with local tests passing before push.
   Releases should be deliberately triggered and fully tested in GitHub Actions.
2. The npm bypass-token restriction was accepted.
3. The user is the sole maintainer and needs an appropriate approval model.
4. Hardening should concentrate on release publishing.
5. The concrete benefit of a complete SBOM needed explanation.
6. GitHub Enterprise is not available.

The revised response withdrew mandatory PRs, selected a complete hosted release gate, recommended stage-only OIDC plus the owner's npm 2FA approval, limited additional friction to release boundaries, and explained native SBOM coverage.
A fresh source check corrected the initial Enterprise-only statement: GitHub's announcement had been updated to include Free and Team in the preview.
The user's final planning instruction explicitly excludes that preview until wider availability.
That instruction governs regardless of eligibility.

The plan preserves these decisions without treating the original planning request as implementation or release authorization.
It includes reasoned trade-offs and recovery obligations, rather than presenting the audit's original recommendations as unchanged mandates.

On 2026-10-16, the owner subsequently requested implementation using HISEW, with the plan and this research record committed first.
That instruction accepts the implementation baseline and its scoped configuration effects; it does not select or authorize a new package version for publication.
The first document checkpoint precedes executable changes, and subsequent implementation evidence must retain its own candidate and verification identities.

## 2. Repository and published-release identities

| Subject | Observation |
| --- | --- |
| Repository | Hadden-Industries/markdown-quality |
| Local/remote main at audit and plan refresh | bfcf44061750851b69128d73aeeaf89bd5e17bcf |
| Worktree before plan files | Clean |
| Manifest development version | 1.0.3 |
| Published product version | 1.0.3 |
| Published package source | 92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0 |
| Signed annotated tag object | fdeb8d88d5568efb9df6774d318f9b0f5d4a912b |
| GitHub tag verification | Verified |
| GitHub product release | Immutable, stable/latest; published 2026-10-06T16:03:24Z |
| Original candidate | Run 37489502029 |
| Original publication | Run 37490858990, attempt 1 |
| npm labels across all three packages | latest = 1.0.3; pilot = 1.0.2 |
| Version inventory | Seven published versions: alpha.2, alpha.3, alpha.4, and 1.0.0 through 1.0.3 |
| Native acquisition history | snapper-0.11.9-build.1 remains mutable; snapper-0.11.9-build.2 is immutable |

The public package identities are:

- @hadden-industries/markdown-quality
- @hadden-industries/markdown-quality-linux-x64
- @hadden-industries/markdown-quality-win32-x64

Direct source links: [repository baseline](https://github.com/Hadden-Industries/markdown-quality/tree/bfcf44061750851b69128d73aeeaf89bd5e17bcf), [published source](https://github.com/Hadden-Industries/markdown-quality/tree/92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0), [v1.0.3 release](https://github.com/Hadden-Industries/markdown-quality/releases/tag/v1.0.3), [candidate run](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37489502029), and [publication attempt](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37490858990/attempts/1).

## 3. Verification actually performed during the audit

| Evidence class | Result and boundary |
| --- | --- |
| GitHub release verification | Native gh release verify v1.0.3 passed |
| Asset bytes | All 20 attached assets downloaded and SHA-256 compared |
| Evidence manifest | All 19 named payload bindings matched size/hash |
| Individual asset attestations | Native gh release verify-asset passed for the evidence manifest and all three npm archives |
| npm archive readback | Fresh npm pack downloads for all three packages matched original qualified/GitHub tarballs byte-for-byte |
| Registry signatures and provenance | Fresh npm audit signatures with included attestations passed for Windows and Linux-selected dependency trees; invalid and missing arrays were empty |
| Provenance subject | All three packages bound to the expected source, publish.yml, refs/heads/main, publication run, and attempt |
| npm publisher identity | Trusted publisher / GitHub Actions for all three packages |
| Original hosted runs | Candidate, publication, and both actual Windows/Linux registry qualification jobs succeeded |
| Focused local release tests | 91 passed, zero failed across github-release, publication, and registry-readback tests |

The Linux-selected dependency tree was installed on Windows with scripts disabled to verify cryptography and bytes.
It was not a new Linux executable-behavior test.
Actual Linux behavior was established by the separately inspected historical hosted run.
Old package versions were inventoried, not individually requalified.
Signature/provenance verification does not prove absence of vulnerabilities, independent reproducibility, or a SLSA level.
The planning turn did not repeat these release tests or create new releases.

## 4. Authenticated settings observations

### GitHub

Authenticated administrative API reads observed:

- main protected = false; branch protection endpoint returned 404, Branch not protected;
- repository rulesets = empty;
- immutable releases enabled; not enforced by the owner setting;
- npm-publication environment restricted to exactly main;
- no required reviewer or wait timer; administrator bypass allowed;
- Actions enabled and all actions allowed;
- repository SHA-pinning-required setting false;
- default workflow token permission write;
- Actions PR-approval permission enabled.

The inspected workflows themselves already declared narrow read permissions.
Only the publication job received id-token write.
External Action references were pinned to full commit SHAs.
Repository defaults therefore represent a defense-in-depth gap rather than proof that the inspected publishing workflow currently has a broad write token.

The absence of branch protection remains an observed fact, but mandatory PR enforcement is withdrawn for the user's current solo-maintainer model.
No CODEOWNERS requirement, Enterprise purchase, second maintainer, or automatic policy deployment is inferred.

A plan-time read found CodeQL default setup configured with query suite default and languages actions, javascript, javascript-typescript, python, and typescript.
Its reported update time was 2026-10-05T13:48:26Z.
This is configuration evidence; release admission still needs exact-source analysis and outcome evidence.

### npm

After the user authenticated in Chrome with a security-key check, the audit read private settings for all three packages.
Each had one valid trusted-publisher mapping to:

- repository Hadden-Industries/markdown-quality;
- workflow publish.yml;
- environment npm-publication;
- direct npm publish and npm stage publish permissions.

No dist-tag permission was observed.
All three selected the setting allowing 2FA or a granular token with bypass 2FA.
The stricter setting disallowing bypass tokens was unselected.
The UI stated that the restriction remains compatible with OIDC.
One maintainer, maksymshostak, had access through the organization's developers team.

The CLI's private trust inspection returned 401; browser inspection supplied the settings evidence.
Authentication was performed by the user.
No authentication code/session credential was extracted or placed in an artifact.
No npm setting was changed during the audit or planning.

## 5. Existing implementation details that must survive

The manual publisher takes a candidate run, approved manifest hash, distribution tag, and optional recovery run/attempt/origin-map hash.
Its default availability label is pilot; latest is currently possible with an explicit owner exception.
Concurrency is serialized without cancelling an in-progress publication.
The environment clears npm token variables, ignores lifecycle scripts, and uses isolated npm configuration/cache.
The inspected hosted runtime reference is Node 24.21.0 and publisher npm 12.2.0.

Admission verifies repository, workflow, source, current main, successful candidate run, complete same-attempt jobs, expected matrix, manifest hashes, and the main-only environment.
The current candidate context requires a push event and candidate.yml.
A new manual release-qualification path therefore requires deliberate admission changes; merely adding a dispatch input would not work.

The candidate pack job acquires native artifacts and runs qualify:json:packages.
That command packs and checks JSON; it does not replace check:product.
The complete product suite lives in the separate check.yml graph.
No explicit dependency on that full workflow or CodeQL was found in publication admission.
This is the principal hosted-gate gap.

candidate.yml's existing manual path runs the reusable trusted-fixture workflow with trusted-sha/candidate-sha.
It is not currently the release pack path.
Preserve that caller contract or migrate it explicitly; do not silently repurpose its inputs.

The current publisher verifies native packages before publishing core, checks version absence, rehashes inputs, rechecks main, and retains per-package origins.
An attempted or unknown effect is never made eligible merely because the registry returns 404.
Only an explicitly skipped eligible effect can proceed under the existing recovery rules.
Known-accepted versions receive bounded availability checks and readback, not another publication.

Native npm cryptographic verification checks expected origins established independently.
Each real platform installs/verifies core and its own native dependency and raw-byte verifies the opposite native archive.
The combined records cover the tuple.
The current standalone registry.yml still references a historical alpha.4 fixture and must not be mistaken for automatic qualification of a new release.

The archival preparer uses exact Git source, deterministic native git archive, named original payloads, and separate native origins.
The native gh delivery tool checks a pre-existing signed tag, resumes only matching missing draft assets, verifies complete inventory/bytes, and then verifies immutable release and assets.
It does not currently run as an integrated publication Actions job.
Stable classification and npm label movement have separate authority.

Existing rights and support obligations remain in [support and release](../support-and-release.md).
The current source contains changes after 1.0.3, including an accepted major-version behavior change; a workflow repair alone does not choose the next package version.
Producer dependency overrides do not automatically repair a consumer's graph.
The plan preserves that distinction in its security gate.

## 6. Authoritative standards and platform guidance

These are sources for the revised design, not a claim that every recommendation is a mandatory protocol requirement.
The linked pages were checked during this conversation on 2026-10-16; mutable guidance must be refreshed before adoption.

| Source | Relevance and boundary |
| --- | --- |
| [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/) | Recommends restrictive token access and stage-only publishing; documents independent dist-tag permissions and current OIDC limits |
| [npm staged publishing](https://docs.npmjs.com/staged-publishing/) | Owner reviews/approves staged packages with 2FA; native authenticated inspection/download is available |
| [npm stage CLI](https://docs.npmjs.com/cli/v12/commands/npm-stage/) | Tarball/package-spec interface, stage lifecycle, fixed initial tag, existing-version uniqueness, and native command behavior |
| [npm trust CLI](https://docs.npmjs.com/cli/v12/commands/npm-trust/) | Supported mapping management; do not invent a CLI flag from a UI capability |
| [npm dist-tag CLI](https://docs.npmjs.com/cli/v12/commands/npm-dist-tag/) | Native stable-label operations and their real external effects |
| [npm provenance](https://docs.npmjs.com/generating-provenance-statements/) | Public provenance and verification prerequisites |
| [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use) | Least-privilege tokens, pinned dependency identities, and workflow trust boundaries |
| [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) | Required reviewers/self-review option and public-repository plan availability |
| [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) | Immutability and release-attestation guarantees; preserve historical exceptions |
| [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) | Classify public compatibility changes and do not modify a released version's contents |
| [CycloneDX authoritative guide](https://cyclonedx.org/guides/sbom/lifecycle_phases/) | Inventory coverage, lifecycle distinctions, component relationships, and evidence limits |
| [CycloneDX specification](https://cyclonedx.org/specification/overview/) | Current 1.7 format; older valid source documents are not invalidated by its existence |
| [SLSA build-track basics](https://slsa.dev/spec/v1.2/build-track-basics) | Keep build-level claims separate from an npm provenance badge or release attestation |

### npm integration facts affecting this design

The chosen staging operation must explicitly use pilot.
npm documents latest as the default initial tag and makes the staged tag immutable.
Staged and published versions share the same version uniqueness boundary.
Native private-stage inspection and approval use the maintainer's authenticated session; short-lived stage OIDC is not a general-purpose inspection credential.
The approved artifact's provenance and bytes must be demonstrated through the selected native invocation before first activation.
These are service-specific integration constraints, not reasons to place owner tokens in CI. [npm stage CLI](https://docs.npmjs.com/cli/v12/commands/npm-stage/)

Current trusted-publisher guidance documents separate dist-tag authority, with npm 12.2.0 or later in the v12 line.
A promotion connection may manage labels while direct publication remains disabled.
Staging is inherently allowed on the documented connection form, so the plan does not promise a capability that is technically tag-only.
The source's older generic stage-permission wording and newer dist-tag section require current native validation, not guessed permission flags. [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing)

GitHub can use the sole maintainer as an environment reviewer when self-review prevention is disabled.
That is an intentional checkpoint, not independent human review.
For this public repository, the documented reviewer feature does not require Enterprise.
The revised plan uses npm 2FA as its owner-presence boundary and makes an additional self-review gate optional. [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments#required-reviewers)

### Preview correction and explicit exclusion

The initial audit described Actions dependency lockfiles as an Enterprise Cloud preview.
A later read of the [updated October 14 announcement](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/) found Free and Team included.
That correction is preserved here so the old evidence is not mistaken for current eligibility.

The user's later instruction excludes the feature.
No actions.lock, gh actions-lock, or Require lockfile policy is to be adopted or evaluated as an implementation dependency.
Existing full-SHA pinning remains.
No reminder, monitoring automation, Enterprise upgrade, or scheduled reconsideration was requested.

## 7. Native SBOM research and selection limits

The attached source-sbom.cdx.json is CycloneDX 1.5 and describes the source npm lock graph.
The release manifest explicitly says compiled native components are not covered.
Separate native rights/build/component records exist; the improvement is a standard interoperable description of the shipped whole, not a claim that all native evidence is absent.

Current native build inputs include Rust 1.98.1 and Snapper source commit 407c2beb04607f6ccb421e6f6418dcc00e4c1e94.
The selected features are cli, neural, lsp, watch, pandoc, treesitter, and mcp.
The controlled build already uses cargo-auditable, target-filtered Cargo metadata, embedded dependency extraction, cargo-about notices, runtime attribution, and per-platform evidence.
A raw upstream Cargo.lock can include build/development/feature possibilities beyond shipped runtime contents.

Stable candidate identities were retrieved from each maintainer's release API:

| Candidate | Latest stable observed | Verified capability / limitation |
| --- | --- | --- |
| [Syft](https://github.com/anchore/syft/releases/tag/v1.54.1) | v1.54.1, published 2026-10-06 | [Rust binary cataloging](https://oss.anchore.com/docs/capabilities/rust/) includes cargo-auditable ELF/PE evidence; [output formats](https://oss.anchore.com/docs/guides/sbom/formats/) include CycloneDX 1.7 |
| [cargo-cyclonedx](https://github.com/CycloneDX/cyclonedx-rust-cargo/releases/tag/cargo-cyclonedx-0.5.9) | cargo-cyclonedx-0.5.9, published 2026-03-19 | Maintained Cargo-oriented generator; build graph must still be reconciled to exact shipped target/features |
| [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli/releases/tag/v0.33.1) | v0.33.1, published 2026-07-23 | Native hierarchical merge and schema validation; component subjects and relationship conservation need qualification |

Inspected exact-license sources: [Syft v1.54.1](https://raw.githubusercontent.com/anchore/syft/v1.54.1/LICENSE), [cargo-cyclonedx 0.5.9](https://raw.githubusercontent.com/CycloneDX/cyclonedx-rust-cargo/cargo-cyclonedx-0.5.9/LICENSE), and [CycloneDX CLI v0.33.1](https://raw.githubusercontent.com/CycloneDX/cyclonedx-cli/v0.33.1/LICENSE).
All contain Apache-2.0 license text.
No binary acquisition, installation, runtime execution, complete transitive-rights clearance, or actual output-conservation experiment was performed.
Selection is a source-backed preferred direction, subject to the plan's experiment gate.

npm's current documentation labels 12.2.0 latest; its Git tag resolves to commit c276cadf785c1018d82dd287fe7742567055efb9.
That matches the current hosted publishing version.
Recheck stable releases and exact digests at adoption; do not execute a floating latest version.
The package's own support-floor policy remains a separate decision from build-tool selection.

## 8. Preservation, limitations, and handoff

Original audit directory:
C:/Users/maksy/AppData/Local/Temp/markdown-quality-release-audit-20261016-01a1434f.

Durable operator evidence directory:
C:/Users/maksy/.hi/w/e/operator/01a1434f-release-publishing-plan.

audit-preservation.json records original/retained path, byte count, and SHA-256 for 31 copied metadata/release-asset files totaling 27,779,468 bytes.
Every retained hash matched the original.
The preserved set contains the original assurance-summary.json, settings responses, asset hashes, npm pack/signature/provenance reports, and all 20 GitHub assets.
The original summary is retained unchanged, including superseded recommendations; the plan and this record provide the explicit decision overlay.
Temporary consumer node_modules trees and duplicate npm tarballs were not copied because the original qualified archives are already in the retained GitHub asset set.

Planning also retained the native verification-profile inspection.
This records declarations and executable resolution, not execution or coverage.
The loaded-plugin/selected-engine mismatch, complete prior installation, selected generation/attempt, and unverified hook activation remain separate facts.
No successful installation was retried and no runtime selection changed.

No source implementation, remote configuration mutation, workflow dispatch, package staging, approval, publication, label movement, commit, or push occurred in this planning task.
The planning task produced a proposed detailed implementation baseline; the subsequent acceptance is recorded in section 1 and the plan's revision 2.
Their validation does not qualify the future implementation or release.
