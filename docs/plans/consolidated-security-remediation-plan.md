# Consolidated security remediation: HISEW implementation plan

Revision: 1, 2026-10-08, Europe/Bucharest.
Status: revision 1 accepted for implementation by the owner's 2026-10-08 request in Codex session `01a11a29-692b-7752-ab8c-fb45bb7e3d80`, including the R2 route, DEC-001 producer-only boundary and DEC-003 CI effects.
The exact accepted draft is retained in HISEW requirement snapshot `53df36b0-8dce-4bc7-9cff-f740e8127176`; the draft/proposed wording below describes that accepted baseline.
Delivery, hosted dispatch, PR closure and npm publication still require their separately stated authority.

## Purpose and governing evidence

Resolve Dependabot alert 1, CodeQL alert 1, and the Actions upgrades proposed by pull request 1 as one reviewed unit, while preserving Markdown behavior and package-publication admission controls.
This document is the draft change dossier, proposed risk route, design, and implementation handoff.
Its `REQ`, `AC`, `QA`, `DEC`, and `SLICE` identifiers are local to this change.
Maksym Shostak is the decision owner; the implementing agent will own integration and evidence within the subsequently authorized scope.

Inspected local and remote `main`: `2a8f162cd98a8548d8fa7b065cd6fe1828efcab7`, clean worktree, manifest version `1.0.3`.
Inspected PR head: `6e6f2329e8c6921ec264c24730e72e7da567b19a` on `dependabot/github_actions/actions-8359bcb69e`, open.
All three GitHub items were read live through authenticated GitHub APIs.
HISEW reports active personal applicability and a committed handoff for the earlier producer-centralization execution, with no verification gaps for that execution.
That earlier accepted scope and evidence remain historical inputs; they do not authorize or qualify this remediation.
Use the installed HISEW routing and Thin Implementation Plan procedures for this draft, then the accepted route for any later implementation.

| Input                                                                                             | Live observation                                                                                                                                     | Consequence for this change                                                                                                               |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Dependabot alert 1](https://github.com/Hadden-Industries/markdown-quality/security/dependabot/1) | Open, runtime transitive KaTeX `0.16.47`, GHSA-238p-pmpm-9mq7 / CVE-2026-103923, low advisory severity                                               | Remove affected KaTeX from the producer's resolved graph; distinguish that from fixing independently installed consumers                  |
| [CodeQL alert 1](https://github.com/Hadden-Industries/markdown-quality/security/code-scanning/1)  | Open, `js/incomplete-sanitization`, `scripts/wait-registry-integrity.js`, single-occurrence slash replacement; scanner labels security severity high | Replace manual path encoding and preserve the actual input and integrity boundaries; scanner severity alone is not a demonstrated exploit |
| [PR 1](https://github.com/Hadden-Industries/markdown-quality/pull/1)                              | Updates four Actions across six workflows; contains neither alert fix                                                                                | Incorporate its intent into the consolidated candidate and refresh stale version targets                                                  |

The [KaTeX advisory](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7) identifies `0.18.2` as the first fixed version.
Exploitation requires pre-existing prototype pollution or control of an options prototype, attacker expressions, and unsafe use of rendered HTML.
The producer's inspected analysis path uses ESLint Markdown/GFM and does not itself render KaTeX HTML into a browser.
This is a bounded static observation, not proof that every transitive execution path or consumer is unexploitable.

Current npm metadata reports `@eslint/markdown@8.0.3` and `micromark-extension-math@3.1.0` as latest; the latter still requires KaTeX `^0.16.0`.
The producer lock resolves that chain to `0.16.47`; a routine lockfile refresh cannot cross its minor-version constraint.
Current latest KaTeX is `0.19.0`, with MIT declared in npm metadata.

The registry helper already validates names against only the core, Windows x64, and Linux x64 package identities before making requests.
Consequently, a second slash cannot currently reach the flagged replacement.
Anonymous read-only probes of the old and fully component-encoded core packument URLs returned the same package name and `1.0.3` integrity on the inspection date.
Extend that evidence to both native packages during implementation; no publication was performed to obtain it.

## Proposed risk route

### Risk class:

R2, proposed for the consolidated change.

### Decision owner:

Maksym Shostak, as requesting maintainer and the security policy's named owner.

### Reasoning:

Observed changes concern registry-publication readback, executable Actions used in OIDC publication, and the reusable trusted qualification workflow.
Inferred R2 triggers are authorization/trust boundaries and cross-system workflow compatibility.
Package consumers are an additional boundary because producer overrides do not propagate.
No database migration, financial processing, sensitive-data collection, safety-critical system, or R3 assurance obligation was identified.

### Potential blast radius:

Producer installation and tests; Windows/Linux CI; trusted candidate acquisition; transported archives and registry publication verification.
Published archives and downstream consumer locks remain unchanged by a source-only merge.

### Reversibility:

Source edits can be reverted as one candidate using retained preimages.
A reverted dependency fix reintroduces the advisory and requires an explicit risk disposition.
Published npm versions cannot be repaired by overwriting their bytes; any later package release needs its own qualified new version and forward-fix/recovery route.

### Principal unknowns:

Cross-minor KaTeX compatibility, all native-package URL readbacks, v7 checkout behavior through reusable-workflow callers, and hosted artifact transport with the existing downloader.
Consumer-distribution remediation is a separate unresolved design boundary described below.

### Required artifacts:

This accepted dossier revision; exact baseline and consolidated candidate identity; dependency and Action identity/rights observations; focused and full verification; review dispositions; hosted run and alert readbacks after authorized delivery.
Keep execution evidence in HISEW's currently inspected external evidence destination; do not create repository-local temporary control state.

### Required specialist lenses:

Ordinary code review, independent verification, and scoped security assessment of dependency resolution, URL construction, candidate trust, credentials, caches, and artifact admission.
Check upstream rights for changed dependencies and Actions.
Select the installed review providers at implementation time; this plan does not dispatch scans or reviewers.

### Required verification:

Focused registry/dependency/workflow checks while editing, affected regression tests at integration, then the HISEW `full` profile against one frozen candidate.
Hosted Windows/Linux package and transported-candidate qualification plus CodeQL and dependency-alert readback are separate delivery evidence.
The local full profile cannot establish hosted Action behavior or published-consumer remediation.

### Required human approvals:

Acceptance of this exact draft baseline, R2 route, proposed CI effects, and producer-versus-consumer remediation boundary before implementation.
Commit, push, PR replacement/closure, merge, dispatch, and npm publication retain their own authority; none is performed by this planning request.

### Maximum sensible autonomy:

Now: read-only investigation and a local draft plan.
After implementation approval: bounded edits, dependency acquisition and relevant verification under the accepted HISEW execution; no unapproved public-contract expansion or release effect.

### Next lifecycle step:

Accept or revise this dossier, then recheck applicability and ownership, capture the accepted baseline, and start one R2 execution.
Do not reopen or adopt the completed producer-centralization execution.

## Requirements, acceptance, and quality scenarios

| Requirement                                                                | Acceptance criterion                                                                                                                                                                                | Quality scenario and oracle                                                                                                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: Remove the reported vulnerable dependency from the producer graph | AC-001: Clean locked installation has no KaTeX in the advisory range; targeted advisory absent from current audit; unrelated findings receive separate dispositions                                 | QA-001: A fresh root install resolves the reviewed fixed version and passes the actual GFM/math-containing document paths without changed exits, diagnostics contracts, or unexpected writes              |
| REQ-002: Encode registry package paths completely                          | AC-002: All three allowed names resolve to the intended registry objects; invalid names fail before lookup; metadata identity and integrity checks remain mandatory                                 | QA-002: Extra separators, encoded separators, query/fragment characters, wrong scope, and traversal-like inputs cause zero requests; malformed, mismatched, or unavailable metadata never becomes success |
| REQ-003: Adopt the four Action families in PR 1 safely                     | AC-003: Every existing use in the six affected workflows has the reviewed full commit SHA; hosted paths preserve selected runtime, credential isolation, artifact layout, and publication admission | QA-003: Windows/Linux qualification and archive upload/download succeed; candidate content cannot gain executable policy, secrets, repository-write or OIDC authority                                     |
| REQ-004: Deliver one consolidated change with truthful closure             | AC-004: One candidate and review lineage covers both alerts and PR 1; default-branch scans verify fixes after authorized merge; consumer and publication gaps remain explicit                       | QA-004: A changed base, candidate, lock, Action, or workflow identity invalidates only the evidence whose inputs changed and triggers reassessment before completion                                      |

The acceptance oracle belongs to the maintainer's existing contracts and this accepted dossier, not to changed implementation output.
Tests may inject the existing registry `lookup`, clock, and sleep seams to control network failures and deadlines.
Do not mock URL construction, package resolution, validators, or integrity comparison themselves.
Real npm resolution and anonymous registry readback complement deterministic tests; hosted execution owns the Action runtime and transport oracle.

## Proposed design decisions

### DEC-001: Bounded producer dependency repair with an explicit consumer gate

Prefer a maintained upstream release that declares a fixed KaTeX range if one appears before implementation.
With today's graph, propose a parent-scoped npm override for `micromark-extension-math` to KaTeX `0.19.0`, matching this repository's exact-version convention, and regenerate the root lock using npm.
Do not hand-edit resolved integrity metadata, add a second direct KaTeX dependency and assume it deduplicates, or patch installed dependency files.
Retain the old/new graph, package integrity, upstream license texts, and compatibility evidence; metadata declaring MIT is not the completed rights check.
No new wrapper, shim, renderer, fork, or formatter replacement is selected.

**Boundary requiring owner acceptance:** this resolves the repository's producer lockfile alert, not every installation of the published package.
[npm only applies overrides from the root project](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#overrides); this library's override is ignored when it is a dependency.
Run a clean packed-consumer installation without a consumer override to expose and record its actual graph.
Do not label a root-only fix a consumer-wide remediation or publish it with that claim.
If the required outcome includes an independently safe published graph, re-plan before implementation around a maintained upstream dependency fix or an explicitly accepted distribution/dependency change.
A fork, vendoring, bundling, or shrinkwrap strategy is not silently authorized by this draft.
Existing release `1.0.3` stays immutable; consumer remediation and new npm publication are excluded from this source-only plan's completion claim.

### DEC-002: Standard component encoding, unchanged admission rules

Replace the packument path's manual slash replacement with `encodeURIComponent(name)`, consistent with the existing version-specific and absence-probe paths.
Keep the fixed HTTPS registry origin, exact package allowlist, version/integrity validation, redirect rejection, metadata size ceiling, Accept headers, retry semantics, and shared deadline.
The expected packument URL will encode `@` and use uppercase percent escapes; update byte-level test expectations only with the independent registry readback evidence.
Use the existing `installUrl` role or a precise packument name; no public rename or compatibility bridge is needed.
Do not dismiss the alert instead of repairing the flagged construction, and do not characterize the current allowlisted path as a proven exploitable injection.

### DEC-003: Refresh PR 1 to current reviewed immutable Action identities

Live upstream release and commit inspection produced these targets:

| Action                    | PR 1 target | Proposed target                                                         | Full target commit                         |
| ------------------------- | ----------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| `actions/checkout`        | 7.0.1       | [7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)        | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node`      | 7.0.0       | [7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)      | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `actions/setup-python`    | 7.0.0       | [7.0.0](https://github.com/actions/setup-python/releases/tag/v7.0.0)    | `5fda3b95a4ea91299a34e894583c3862153e4b97` |
| `actions/upload-artifact` | 7.0.1       | [7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

Revalidate release-to-commit identities and exact release terms before adoption; do not float major tags.
Affected files are `.github/workflows/{candidate,check,markdown-quality,native,publish,registry}.yml`.
The exact proposed effect is Action implementation upgrades at existing call sites, with existing triggers, permissions, runtime matrices, artifact names/paths/retention and failure behavior preserved.
No new cache, artifact, trigger, permission, or automatic publication behavior is proposed.

Review these compatibility points explicitly:

- [Checkout v7](https://github.com/actions/checkout/blob/v7.0.1/README.md) blocks unsafe fork checkout under `pull_request_target` and `workflow_run`.
  Inspect effective reusable-workflow caller events.
  Do not add `allow-unsafe-pr-checkout: true` just to recover a failing run; a required caller change needs a separate accepted trust decision.
- Setup-node v7 removes a dummy `NODE_AUTH_TOKEN` export.
  Preserve credential-free acquisition, the publisher's deliberate token handling and `package-manager-cache: false` settings.
  Inspect effective caching rather than inferring it from the version number.
- Setup-python v7 removes `pip-install`; no inspected call site uses it.
  Preserve Python 3.14 and verify actual selected runtime and native-tool commands.
- Upload-artifact v7 uses Node 24 and supports direct-file uploads.
  Preserve default archived mode (`archive: true`), the existing downloader, and directory layout.
  Test digest, exact bytes, and admission metadata after transport; do not enable direct-file mode.
- Verify the selected hosted runners support the Actions runtime.
  Preserve the package's independent Node 22/24/26 qualification matrix; an Action's Node runtime is not the application runtime.

### DEC-004: One integration and closure lineage

Use one consolidated remediation branch/candidate from the current main baseline after authorization.
Bring across PR 1's reviewed intent, refresh the two stale targets, and add both alert fixes and their evidence.
Prefer a consolidated replacement PR linked to PR 1; preserve the old PR until the replacement exists, then close it as superseded only with publication/closure authority.
Do not merge PR 1 separately and call the combined work complete.
No GitHub comments, closures, scan dispatches, commits, or pushes are part of creating this draft.

## Implementation slices and traceability

Each slice crosses implementation and its proof boundary; all slices enter one final review and delivery candidate.
Predicted paths below are planning guidance, not a mandate to edit unchanged modules.

| Slice     | Traceability                     | Demonstrable increment and predicted seams                                                                                                                              | Falsifiable proof                                                                                                                                                                                                                  | Release and cleanup implication                                                                                                                                    |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SLICE-001 | REQ-001, AC-001, QA-001, DEC-001 | Repair producer dependency resolution in `package.json` and `package-lock.json`; add focused dependency/real-analysis regressions and accurate limitation documentation | Fresh npm graph contains only fixed KaTeX; targeted audit finding absent; real producer document behavior preserved; clean packed-consumer graph separately recorded                                                               | Stop on incompatibility or a requirement for wider consumer remediation; retain resolution and rights evidence, remove only task-owned disposable install fixtures |
| SLICE-002 | REQ-002, AC-002, QA-002, DEC-002 | Repair URL encoding in `scripts/wait-registry-integrity.js` and extend `test/registry-readback.test.js`                                                                 | All three names and invalid-name table; both installer metadata media types; mismatched identity/integrity, 404 delay, terminal failures, deadline and absence-probe behavior remain correct; anonymous readback confirms encoding | No registry writes or republishing; source revert is available but must not erase alert evidence                                                                   |
| SLICE-003 | REQ-003, AC-003, QA-003, DEC-003 | Apply the four Action families across all six workflows; extend existing publication/qualification contract tests only where a meaningful invariant lacks coverage      | Review YAML semantics and full pins; prove credential and artifact contracts; hosted Windows/Linux package and transported candidate jobs pass for the frozen SHA                                                                  | No publication to test upgraded Actions; retain run IDs, archive identities and failures; caller incompatibility requires re-plan                                  |
| SLICE-004 | REQ-004, AC-004, QA-004, DEC-004 | Freeze the combined candidate, qualify, review, and prepare a single delivery handoff                                                                                   | Route-selected full verification, independent and security dispositions, exact hosted evidence; after authorized merge, fresh alert API readback proves default-branch closure                                                     | Close/supersede PR 1 with authority; preserve evidence and release hold; retire only task-owned branch/scratch after its consumers finish                          |

Ordering: accept the scope and consumer gate first; perform SLICE-001 and SLICE-002 before the final workflow integration and SLICE-004.
Dependency and URL investigations are semantically separable, but shared manifests, tests, and workflow pins remain under one integration owner.
No parallel write delegation is required or authorized by this plan.

## Verification cadence and completion evidence

1. Reinspect head, worktree ownership, both alerts, PR 1 and upstream target identities; resolve drift before mutation.
   Capture the accepted exact dossier and candidate baseline through HISEW.
2. After dependency edits, perform a clean `npm ci --ignore-scripts --no-audit --no-fund` in the authorized environment, inspect `npm ls katex --all` and the complete resolved lock, and retain current `npm audit --json` output.
   Investigate the target advisory by identity rather than accepting an exit code alone.
   Keep acquisition outside offline checking.
3. Run `node --test test/registry-readback.test.js` for the URL slice.
   Add the missing invalid-input and all-package cases without weakening existing timeout and terminal-failure tests.
4. Run relevant document, packed-consumer, publication, and qualification regressions, then `npm run check:affected` at integration.
   Do not invent a network-mocking success for package resolution or Action behavior.
5. Finish formatting and static checks, inspect the exact candidate, then run HISEW `full`, whose repository command is `npm run check:full`.
   It includes native/archive/text evidence, syntax, formatting, JavaScript tests and authored Markdown.
   Confirm Python and native prerequisites first; missing evidence is a gap, not a pass.
6. Obtain ordinary review, independent verification and scoped security assurance against that same candidate under the accepted R2 route.
   Retain actual provider output and dispositions; do not assume earlier producer review covers the new dependency or Actions.
7. With delivery authority, obtain hosted package and transported-candidate qualification and CodeQL for the exact final commit.
   Hosted artifact-producing runs are effects requiring delivery authority, not read-only planning probes.
   Exercise the reusable workflow's relevant caller events without widening credentials.
   Do not dispatch the real publisher merely to validate YAML or Action versions.
8. After authorized merge, read both alert APIs and the default-branch analysis commit.
   Require Dependabot to report the targeted finding fixed and CodeQL to report the repaired finding fixed at an applicable new analysis; stale open results remain pending.
   Record PR 1's supersession/closure separately from both security outcomes.

Full local checks, hosted qualification, merged source, default-branch alert closure, npm publication, and consumer adoption are distinct states.
This plan supplies no new npm release qualification or publication authority.

## Rollout, recovery, and reassessment

No data migration, schema change, backfill, or document rewrite is proposed.
Resume interrupted work from the retained source/lock/Action identities and execution evidence; do not reuse results across changed inputs without an explicit evidence decision.
For source delivery, the maintainer observes checks, alert state and archive/registry-readback failures; the implementing agent records attributable results.
Abort integration on changed Markdown semantics, surviving vulnerable producer resolution, expanded credential access, failed artifact admission, or unavailable required assurance.

Before merge, repair forward or restore only task-owned edits from the recorded baseline.
After merge, a reviewed source revert may restore prior CI behavior but can reintroduce the dependency finding; keep promotion blocked until the owner accepts the recovery disposition or a forward fix qualifies.
Do not unpublish, overwrite an npm version, change dist-tags, remove retained evidence, or delete another task's files as rollback.
Keep the accepted plan, review outputs and security counterevidence; clean only disposable fixtures and branches after their last consumer and within authorized retention rules.

Re-plan if upstream dependencies gain a native fix, target Action releases move materially, PR/main changes overlap, a reusable caller needs unsafe checkout, consumer-wide remediation becomes required, or license/runtime compatibility differs from the inspected metadata.
Cheapest discriminating checks are the clean producer/packed-consumer graph comparison, the existing registry lookup seam plus anonymous URL probes, and exact Action metadata/caller-event review before hosted qualification.
The higher outcome is a trustworthy Markdown producer and delivery path: closing dashboard items must not weaken consumer behavior, trust separation, artifact integrity, or truthful release claims.

## Planning result and outstanding gates

Completed during planning: live item inspection; current source and dependency-path review; HISEW applicability/progress inspection; upstream release/commit lookup; anonymous core registry URL equivalence probe; draft route, requirements, design and proof plan.
Not performed: remediation edits, dependency installation, product test runs, security scans, remote workflow runs, commits, PR mutation, merge, release, or consumer migration.

The implementation gate is owner acceptance of this exact draft, including DEC-001's producer-only remediation boundary and DEC-003's precise CI effects.
If consumer-wide dependency removal is required instead, the minimum next evidence is a maintained fixed upstream graph or an accepted alternative distribution design; that decision belongs to the maintainer.
