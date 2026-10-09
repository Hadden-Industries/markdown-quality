# CI trust and acquisition

Package qualification runs the complete current Node/platform matrix on every pull request.
For a single ordinary same-repository PR merge onto the previous `main` tip, `.github/workflows/check.yml` can reuse that PR's fully executed package qualification.
Admission independently checks the merged PR, tested Git tree and ordered parents, workflow identity, current resolved Node matrix, concrete Node/npm/Python versions, hosted runner images, successful complete job inventory, source attempt, and retained receipt artifact ID and digest.
The final `required` job rechecks the original proof after test jobs have been skipped; evidence that changes at that point fails the aggregate rather than granting success.
The workflow summaries identify `FULL` or `REUSED` and link the original run and attempt.

Absent, expired, foreign, malformed or mismatched proof selects full tests during strategy selection.
Direct, squash, rebase, forced and multi-merge pushes also run full tests.
Node release or runner-image changes prevent reuse when the current selected inputs differ.
Only a fully executed PR run can be the proof source; reuse records cannot form a chain.
Proof and lane JSON are bounded data, acquired through the pinned official artifact actions with digest verification.
GitHub API permissions are read-only; no extra credential or publication authority is granted.

Transported-candidate and performance qualification remain fresh on `main` because their archives and publication contracts bind the exact source commit.
Package-test reuse does not qualify PR archives for publication or replace reusable consumer, native-build, registry or release evidence.
The repository's `docs/plans/ci-verification-reuse.md` records the accepted scope and its acceptance criteria.

The package repository, OwlAPI, and WebVOWL are public, as inspected through GitHub on 2026-10-05.
The owner selected public npm distribution after the private upload was rejected with E402.
Core and both native packages declare public access; anonymous installation is a required registry qualification.
Ordinary fork pull requests need no registry credential or paid npm subscription.
The direct CLI and public APIs are canonical integrations.
Current source adds the public SHA-pinned reusable workflow described in the [centralized contracts guide](centralized-contracts.md).
Adoption uses the latest qualified producer commit and locked archive/workflow tuple regardless of npm release status.
The historical pilot/publication evidence below does not establish qualification of these new source contracts.

| Event                    | Trusted graph and policy                              | Acquisition                                     | Candidate processing                                 | Current status                               |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Package pull request     | Public locked dependencies and fixed native manifests | Public upstream inputs, no private secrets      | Package tests run without elevated authority         | Hosted package qualification passed          |
| Pilot protected branch   | Reviewed capability release and consumer policy       | Public locked graph, lifecycle scripts disabled | Full authored scope without credentials              | Alpha.3 registry passed; pilot proof pending |
| Pilot same-repository PR | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate Markdown and link target tree only         | Architecture selected; qualification pending |
| Pilot fork PR            | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate data only; no candidate scripts or graph   | Architecture selected; qualification pending |
| Tool or policy update PR | Existing accepted graph until review                  | New graph requires owner review                 | Never treat candidate graph or exclusions as trusted | Required review remains explicit             |

Package tests and candidate/registry qualification have no registry secret or OIDC permission.
They install with lifecycle scripts disabled and qualify both OS targets.
The separately dispatched publisher grants OIDC issuance only to its main-restricted npm-publication job.
Its exact candidate/source/manifest gate precedes public pilot publication; registry qualification remains credential-free and latest promotion remains separately gated.
Packed-consumer tests acquire public JavaScript dependencies before testing offline frozen-lock reinstallation and runtime execution.
The source lock acquisition alone does not populate metadata for a fresh consumer install.
It cannot serve as evidence that a pilot's private access works.

A pilot integration must acquire the exact public tool graph from a trusted source without registry credentials and process a separately fetched candidate data tree.
Use the reviewed schema 2 root policy; translate intended ignore-file exclusions into that policy before adoption.
Ignore files have no authority over the current Markdown selector.
Candidate checkout must not execute application tooling, Git hooks, package lifecycle scripts, JavaScript configuration, or a candidate CLI.
The checking process must not inherit checkout write credentials, npm configuration, or OIDC issuance authority.
Trusted policy review is required for any change to required scope or exclusions.

The owner accepted a manual trusted-run boundary for the two pilots on 2026-10-05.
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
Required-check identity limitations are documented in [GitHub ruleset troubleshooting](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules).
