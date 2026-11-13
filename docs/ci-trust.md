# CI trust and acquisition

## Request PR qualification

Ordinary full qualification starts when a PR targeting `main` receives `ready_for_review`, or when an operator dispatches `main-qualification.yml` on `main` with `qualification: full`.
Selecting `installed-only` runs the packed-recipient diagnostic.
Opening a ready PR, draft updates and later synchronization do not launch full ordinary qualification.

Changed heads require another deliberate ready checkpoint; strict required acceptance prevents stale qualification from authorizing a changed tree.
`ci.yml` freezes one matrix and coordinates the reference producer, runtime consumers, frozen native validation, dependency review/audit and explicit Actions, JavaScript/TypeScript and Python CodeQL scans.

`CI / acceptance` requires the complete authenticated successful inventory, both installed layouts and reference corpus evidence; skipped or missing obligations fail.
The policy job runs source admission before the producer builds the shared archive tuple and runs the final JSON check.
Runtime consumers exercise source behavior and the same archive ID on both operating systems.

## Interpret the main qualification result

On a main push, `main-qualification.yml` only observes hosted platform contracts and decides `REUSED` or `FULL_REQUIRED`.
Absent, expired, foreign, malformed or mismatched proof produces `FULL_REQUIRED` with a reason and launches no full product tests.
Direct, squash, rebase, forced and multi-merge pushes likewise require deliberate full qualification.

Reuse independently checks the ordinary same-repository merge, tree and ordered parents, workflow, current frozen matrix, actual Node/npm/Python, native inputs and original producing attempts.
Changed mandatory inputs prevent reuse; a new image build within the same declared family does not erase the original image provenance.

Observer reruns select only their current attempt's host probes.
Partial reruns without a complete current probe set produce `FULL_REQUIRED`; rerun the host probes to reconsider reuse.
Only a fully executed PR run can be the proof source; reuse records cannot form a chain.

Proof and lane JSON are bounded data, uploaded through a native Actions SDK entry and acquired by immutable artifact ID with provider, size, digest and metadata readback checks.
Archive extraction rejects redirects, traversal, duplicate paths, linked members and excessive payloads before use.
GitHub API permissions are read-only; no extra credential or publication authority is granted.

Main observation is a reuse decision, not newly executed qualification or release proof.
Manual `release-qualification.yml` always runs fresh exact-source product, corpus, explicit security, recipient audit and distribution inventory obligations through the common graph.
It has no publication authority.

The [convergence plan](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/docs/plans/2026-10-29-github-actions-convergence-implementation-plan.md) supersedes the earlier automatic-CI/reuse design for current source.
Verify hosted acceptance for the exact candidate and inspect the live governance settings before release.

The package repository, OwlAPI, and WebVOWL are public, as inspected through GitHub on 2026-10-05.
The owner selected public npm distribution after the private upload was rejected with E402.
Core and both native packages declare public access; anonymous installation is a required registry qualification.
Ordinary fork pull requests need no registry credential or paid npm subscription.

The direct CLI and public APIs are canonical integrations.
Version 3.0.2 retains the public SHA-pinned reusable workflow introduced in 2.0 and described in the [centralized contracts guide](centralized-contracts.md).
Adoption uses the latest qualified producer commit and locked archive/workflow tuple regardless of npm release status.
The historical pilot/publication evidence below does not establish qualification of these new source contracts.

| Event                    | Trusted graph and policy                              | Acquisition                                     | Candidate processing                                 | Historical evidence                           |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Package pull request     | Public locked dependencies and fixed native manifests | Public upstream inputs, no private secrets      | Package tests run without elevated authority         | Hosted package qualification passed           |
| Pilot protected branch   | Reviewed capability release and consumer policy       | Public locked graph, lifecycle scripts disabled | Full authored scope without credentials              | Alpha.4 cutovers passed; both pilots on 1.0.3 |
| Pilot same-repository PR | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate Markdown and link target tree only         | 2.0 workflow then awaited hosted proof        |
| Pilot fork PR            | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate data only; no candidate scripts or graph   | 2.0 workflow then awaited hosted proof        |
| Tool or policy update PR | Existing accepted graph until review                  | New graph requires owner review                 | Never treat candidate graph or exclusions as trusted | Required review remains explicit              |

Package tests and candidate/registry qualification have no registry secret or OIDC permission.
They install with lifecycle scripts disabled and qualify both OS targets.
The separately dispatched publisher grants OIDC issuance only to its main-restricted npm-publication job.

Its exact candidate/source/manifest gate precedes staging under the owner-reviewed channel (`pilot` by default or explicitly `latest`).
After the owner's 2FA approvals, public registry qualification uses anonymous acquisition.
A subsequent change of stable defaults requires a separate owner decision.
Packed-consumer tests acquire public JavaScript dependencies before testing offline frozen-lock reinstallation and runtime execution.

Packing, bundled-dependency acquisition, source SBOM generation and shipment inspection use the retained producer Node/npm pair even when invoked from a consumer lane.
Fixture archives follow that same producer route; consumer installation, dependency-tree checks and runtime tests retain the separately provisioned floor-compatible npm.

CI passes the frozen consumer npm version into acquisition and selects that CLI for runtime-sensitive source tests as well as installed-package qualification.
The source lock acquisition alone does not populate metadata for a fresh consumer install.
Pilot qualification verifies anonymous acquisition of the exact public package family.

A pilot integration must acquire the exact public tool graph from a trusted source without registry credentials and process a separately fetched candidate data tree.
Use a reviewed configuration schema 3 root policy, or trusted absence for package defaults; translate intended ignore-file exclusions into that policy before adoption.

Ignore files have no authority over the current Markdown selector.
Candidate checkout must not execute application tooling, Git hooks, package lifecycle scripts, JavaScript configuration, or a candidate CLI.
The checking process must not inherit checkout write credentials, npm configuration, or OIDC issuance authority.
Trusted policy review is required for any change to required scope or exclusions.

The owner accepted a manual trusted-run boundary for the two pilots on 2026-10-05.
Shared qualification now additionally requires owner approval of its exact request through the protected `markdown-quality-trusted-qualification` environment before the trusted graph executes.

Required reviewers and disabled administrator bypass are checked live, together with this workflow run's approval history; a named but unprotected environment does not authorize execution.
The [Actions analysis model](https://github.com/Hadden-Industries/markdown-quality/blob/v3.0.2/.github/codeql/README.md) recognizes this exact admission sequence for manual workflows while preserving the native rule inventory and unchanged zero-result release gates.

The request summary identifies the reviewed trusted commit/profile and paired producer, plus the candidate commit; changing those inputs creates a new workflow run requiring approval.
GitHub required checks select a name/context and App identity, not a workflow revision or event.
App 15368 identifies GitHub Actions, including candidate-controlled jobs.
Preserve OwlAPI's `CI / required` and WebVOWL's `WebVOWL application`, `Dependency review`, and `CodeQL gate` required checks.

Before each pilot merge, the owner accepts the exact candidate head/tree and attributable trusted hosted run, including trusted workflow source, core/native hashes, policy/ignore digests, selected paths, run/job/check IDs, outputs and required-status readback.

Any changed candidate, base policy/workflow or tool identity invalidates that acceptance.
A same-name candidate job or green PR summary cannot substitute for this record.
This route provides manual owner enforcement; it does not claim automatic workflow-specific enforcement.
The pilot trusted-run boundary creates no separate App, paid entitlement, write-capable status reporter, OIDC authority or new secret.

Negative hosted probes must show malformed-link failure, candidate policy and ignore-file non-authority, candidate marker non-execution and credential absence.
The single owner's own PR does not constitute independent human approval; any necessary integration route must be explicit and recorded.

Do not give publication or repository-write credentials to a PR-controlled dependency graph.
Do not execute candidate source in an elevated `pull_request_target` job.
Public capability archives are available to all recipients; source/notice and integrity obligations still apply.
Unqualified event isolation or a missing registry tuple blocks pilot cutover.

The owner restored npm login and approved publish authentication on 2026-10-05.
The private Windows upload was rejected by npm with E402, and no accessible alpha.1 version was found.
The subsequent owner request selects public distribution and removes the paid-private-plan prerequisite.
Pilot cutover still requires exact public tuple readback, fresh credential-free installation, event/policy isolation and accepted consumer deltas.

References: [GitHub event trust](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [public scoped publication](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Qualification evidence retention

Routine diagnostics belong in job logs and concise job summaries.
The manual registry diagnostic uses the qualifier's existing JSON stdout and does not upload a duplicate report.
Candidate and release-registry workflows retain their exact JSON records because the release collector consumes them.

Package, performance, release-security and distribution qualification append bounded public facts to job summaries only after their gates pass.
Summaries are presentation, not an input to release admission; no release decision scrapes logs or summary text.

Performance artifacts retain all top-level JSON observations and text driver logs under their existing names and layout.
The upload omits the copied corpus directories; the release collector never consumed those trees.

Original receipts still contain the complete corpus manifests and identity checks needed to verify reconstruction.
Package archives, native original license evidence, distribution and recipient SBOMs, security records, package proof/reuse transfers, and staging/recovery journals keep their existing file contracts and retention periods.

The reusable Markdown workflow uploads compact reports and complete content manifests, not per-sample staged source trees.
Candidate/trusted commits, archive identities and staged digests remain in original receipts; reconstruction must verify all manifest paths, including hidden inputs.

See [the compact artifact contract](centralized-contracts.md#compact-hosted-artifacts).
Fresh staging, candidate non-execution and credential boundaries remain unchanged.
A packaging error fails the job; an uploaded partial directory is not passing qualification evidence.

The reusable workflow takes `trusted-repository`, `trusted-commit-id`, `candidate-repository`, `candidate-commit-id`, `profile` and the Boolean `retain-qualification-evidence` inputs.
It exposes the full identities to its steps as `MQ_TRUSTED_COMMIT_ID`, `MQ_CANDIDATE_COMMIT_ID` and `MQ_WORKFLOW_COMMIT_ID`.
Local qualification uses the `markdown-quality-qualify-git` bin, which accepts named flags only, or the `qualifyGitMarkdown` API.

The repository's own qualification lanes keep finite ceilings.
An owner-requested profile with `resourceLimitMode: "unlimited"` is a distinct policy; its receipts and window record that mode rather than presenting it as a finite lane.

Routine successes retain artifacts for 7 days, failures for 14, and explicitly selected `retain-qualification-evidence: true` runs for 30.
GitHub supports per-artifact retention and path selection; it does not require retaining repeated source copies.
Source bundles needed for offline audit have separate retention ownership.
Existing artifacts are not deleted or relabeled by this workflow change.
Required-check identity limitations are documented in [GitHub ruleset troubleshooting](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules).
