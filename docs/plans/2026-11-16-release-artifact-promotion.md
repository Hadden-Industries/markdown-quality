# Release artifact promotion

## Accepted outcome

Build and qualify one immutable package family in ordinary CI, then promote those exact bytes after an authenticated normal merge.
An immediate release repeats no source suite, native validation, installed runtime matrix or performance corpus.
Current advisory observations, release authority, staging, public-registry verification and immutable archival remain separate obligations.
This contract supersedes the source-only reuse proposal in [the earlier draft](2026-11-14-release-qualification-evidence-reuse.md) and the fresh-graph requirement in the earlier release convergence plan for new-format promotions.
Historical records keep their original readers and rules.

## Implementation and ownership

- `ci.yml` produces archives once and retains candidate reports, recipient locks, SBOMs, performance observations and distribution inventories for 30 days.
  Acceptance authenticates Distribution alongside every existing mandatory predecessor.
- `ci-proof.js` remains the authority for the original repository, run, successful job inventory, producing attempts, source tree, ordered parents, platform contracts and matrix coverage.
- `release-reuse.js` adapts a manual main dispatch to the authenticated merge facts, validates the existing proof, downloads artifacts by immutable ID and digest, and verifies original package bytes.
  Every retained report is bound to the timestamp interval of its original successful producing execution.
  The resolver never installs or executes a downloaded candidate.
- `release-qualification.yml` chooses reuse or the reusable full fallback, then requires fresh security and a valid distribution inventory before its final gate.
  A skipped fallback is accepted only alongside verified promotion; it never means the original tests passed by being skipped.
- `release-reuse-evidence.js` binds retained inventories to the original manifest and carries both original evidence and the new promotion subject.
  Current security audits use the original locks with lifecycle scripts disabled and no dependency installation.
- `pack.js` retains the original producer lock for fresh candidates too.
  Security readers verify its manifest digest before auditing; older candidates without it acquire the lock at the exact original source commit and verify the same digest.
  Archival consumes promoted reports, recipient observations and performance files from the authenticated retained bundle, so expiry of the original CI artifacts does not discard surviving proof.
- Publication, continuation, signed-tag verification, source archival and retained-history readers preserve original package provenance while identifying the landed release commit separately.

## Immutable subjects and invalidation

Package archives and their embedded source identity remain unchanged.
`build-manifest.json` and `build-qualification.json` retain the original producer records; `build-package-lock.json` retains the original producer graph.
A new release manifest adds `promotion` with schema version 1, build and release commits, complete tree, ordered parents, original CI run/attempt/PR and original manifest/proof SHA-256 digests.
Owner decisions bind the new release manifest digest.
The signed release tag and corresponding source archive identify the landed commit, whose tree is authenticated equal to the build tree.
The build commit remains the package source and provenance identity.

Reuse requires a complete same-repository ordinary merge and current matching policy/matrix.
It rejects forks, changed trees or parents, altered archives, unsupported source identities, incomplete or ambiguous provider records, stale producing attempts and expired artifacts.
Evidence lookup failures select the full fallback; output publication failures fail the job rather than selecting another execution route.
`force-fresh` provides an explicit diagnostic escape hatch.
No time-only freshness rule or new run ID invalidates deterministic qualification.

CodeQL retains its original commit/ref/workflow and original producing execution.
Native SARIF supplies the exact engine, query packs and rule inventory.
Current open alerts and source/recipient advisories are refreshed before release effects.
Existing npm OIDC bindings, native-first owner approval, registry provenance/integrity checks and immutable release controls continue to apply.

## Verification and limits

Exercise the real resolver with authenticated provider fixtures, original package bytes and a different landed commit.
Verify unchanged archives, retained build records and exact transfer inventory; substituted bytes must fail before any candidate is published.
Cover both admission routes, missing/failed/duplicate/skipped gates, wrong commits/trees, original-job artifact substitution, retained-lock/inventory tampering and CodeQL execution identity.
Retain existing release, continuation, publication, signing, history, packaging and workflow regression coverage.
Run source checks and the relevant product checks after the candidate is prepared.

Hosted orchestration, live npm stages and GitHub releases require their own authorized hosted runs.
Local tests do not establish those outcomes, and implementation grants no push or publication authority.

The design follows [SLSA provenance verification](https://slsa.dev/spec/v1.2/verifying-artifacts), [GitHub workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
Existing authenticated GitHub artifact/run records supply the provenance binding; no new service, credential or parallel signing infrastructure is introduced.
