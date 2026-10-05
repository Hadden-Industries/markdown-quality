# CI trust and acquisition

The package repository, OwlAPI, and WebVOWL are public, as inspected through GitHub on 2026-10-05.
Ordinary fork pull requests do not receive private registry credentials.
The direct CLI is the canonical integration.
A private shared Action is optional and does not solve public caller access.

| Event                    | Trusted graph and policy                              | Acquisition                                          | Candidate processing                                 | Current status                               |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Package pull request     | Public locked dependencies and fixed native manifests | Public upstream inputs, no private secrets           | Package tests run without elevated authority         | Hosted qualification pending                 |
| Pilot protected branch   | Reviewed capability release and consumer policy       | Read-only private credential in isolated acquisition | Full authored scope without credentials              | Registry access pending                      |
| Pilot same-repository PR | Reviewed base tooling and policy                      | Separate trusted acquisition                         | Candidate Markdown and link target tree only         | Architecture selected; qualification pending |
| Pilot fork PR            | Reviewed base tooling and policy                      | Separate trusted acquisition                         | Candidate data only; no candidate scripts or graph   | Architecture selected; qualification pending |
| Tool or policy update PR | Existing accepted graph until review                  | New graph requires owner review                      | Never treat candidate graph or exclusions as trusted | Required review remains explicit             |

The package CI has no registry secret or OIDC permission.
It installs with lifecycle scripts disabled and qualifies both OS targets.
Packed-consumer tests acquire public JavaScript dependencies before testing offline frozen-lock reinstallation and runtime execution.
The source lock acquisition alone does not populate metadata for a fresh consumer install.
It cannot serve as evidence that a pilot's private access works.

A pilot integration must acquire the exact tool graph from a protected source, remove all credential material, and process a separately fetched candidate data tree.
Candidate checkout must not execute application tooling, Git hooks, package lifecycle scripts, JavaScript configuration, or a candidate CLI.
The checking process must not inherit checkout write credentials, npm configuration, or OIDC issuance authority.
Trusted policy review is required for any change to required scope or exclusions.

Do not install a PR-controlled private dependency graph with credentials.
Do not execute candidate source in an elevated `pull_request_target` job.
Do not expose private archives through public artifacts or caches.
Missing entitlement or credential isolation blocks pilot cutover.

The owner restored npm login on 2026-10-05, and the native identity and organization queries now succeed.
The account is an organization owner; this does not prove paid private-package entitlement or recipient installation access.
No private Markdown quality package has been published yet.
Pilot cutover still requires restricted publication, recipient readback, credential isolation, and native rights qualification.

References: [GitHub event trust](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [private npm CI](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/), and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
