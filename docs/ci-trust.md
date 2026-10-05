# CI trust and acquisition

The package repository, OwlAPI, and WebVOWL are public, as inspected through GitHub on 2026-10-05.
The owner selected public npm distribution after the private upload was rejected with E402.
Core and both native packages declare public access; anonymous installation is a required registry qualification.
Ordinary fork pull requests need no registry credential or paid npm subscription.
The direct CLI is the canonical integration.
A private shared Action is optional and does not solve public caller access.

| Event                    | Trusted graph and policy                              | Acquisition                                     | Candidate processing                                 | Current status                               |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Package pull request     | Public locked dependencies and fixed native manifests | Public upstream inputs, no private secrets      | Package tests run without elevated authority         | Hosted qualification pending                 |
| Pilot protected branch   | Reviewed capability release and consumer policy       | Public locked graph, lifecycle scripts disabled | Full authored scope without credentials              | Public registry qualification pending        |
| Pilot same-repository PR | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate Markdown and link target tree only         | Architecture selected; qualification pending |
| Pilot fork PR            | Reviewed base tooling and policy                      | Separate trusted acquisition                    | Candidate data only; no candidate scripts or graph   | Architecture selected; qualification pending |
| Tool or policy update PR | Existing accepted graph until review                  | New graph requires owner review                 | Never treat candidate graph or exclusions as trusted | Required review remains explicit             |

The package CI has no registry secret or OIDC permission.
It installs with lifecycle scripts disabled and qualifies both OS targets.
Packed-consumer tests acquire public JavaScript dependencies before testing offline frozen-lock reinstallation and runtime execution.
The source lock acquisition alone does not populate metadata for a fresh consumer install.
It cannot serve as evidence that a pilot's private access works.

A pilot integration must acquire the exact public tool graph from a trusted source without registry credentials and process a separately fetched candidate data tree.
Use reviewed base policy and ignore files at their original relative paths so candidate exclusions cannot silently weaken the required check.
Candidate checkout must not execute application tooling, Git hooks, package lifecycle scripts, JavaScript configuration, or a candidate CLI.
The checking process must not inherit checkout write credentials, npm configuration, or OIDC issuance authority.
Trusted policy review is required for any change to required scope or exclusions.

Do not give publication or repository-write credentials to a PR-controlled dependency graph.
Do not execute candidate source in an elevated `pull_request_target` job.
Public capability archives are available to all recipients; source/notice and integrity obligations still apply.
Unqualified event isolation or a missing registry tuple blocks pilot cutover.

The owner restored npm login and approved publish authentication on 2026-10-05.
The private Windows upload was rejected by npm with E402, and no accessible alpha.1 version was found.
The subsequent owner request selects public distribution and removes the paid-private-plan prerequisite.
Pilot cutover still requires exact public tuple readback, fresh credential-free installation, event/policy isolation and accepted consumer deltas.

References: [GitHub event trust](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [public scoped publication](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
