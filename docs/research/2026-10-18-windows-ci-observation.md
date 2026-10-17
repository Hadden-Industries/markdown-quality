# One Windows CI observation

The owner authorized one instrumented run of a previously failing Windows lane on 18 October 2026.
This continues HISEW execution `034e5256-eecc-474a-940d-079cecef9738`, risk R2.
It supersedes the earlier research brief's recommendation to preserve the install and suite deadlines during diagnosis.
It does not authorize another matrix, a release, npm staging, promotion, or a permanent timeout-policy change.

## Accepted experiment

Use Windows with Node 26.12.0, matching the failing product lane in [qualification 39002858116](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117309476975).
That lane failed two fresh installs at approximately 120 seconds; its suite finished with failures after 383 seconds.
The same source passed the automatic Windows Node 26.12.0 suite in 505 seconds.
The latest equivalent local Node suite took 128 seconds, and the full local check took 167 seconds.
These are observations from different environments, not controlled estimates of runner overhead.

The starting source is `2f4718f05df9565ba9d9bb0f14ef56f0ca93a539`, tree `17b53b7181ccd3dbd42480245aa9b68b9d90163b`.
The diagnostic commit must differ only in observation controls, instrumentation, focused tests, and this record.
Keep the actual product suite, file concurrency, package preparation, assertions, registry retry policy, and downstream architecture and JSON checks.
Record the actual runner image, machine resources, Node and npm versions, source identity, and package-lock digest.
Runner allocation and registry state cannot be held identical to the previous run.

| Boundary                         | Ordinary limit | Provisional observation limit |
| -------------------------------- | -------------: | ----------------------------: |
| Each npm install or ci operation |    120 seconds |                   300 seconds |
| Node test suite                  |    600 seconds |                 1,800 seconds |
| Enclosing diagnostic job         | Not applicable |                    45 minutes |

These limits are experiment budgets, not claims of industry-standard values.
The opt-in profile is restricted to the named manual observation workflow on GitHub Actions.
Ordinary workflows retain their existing limits.
The 30-second corpus performance assertion, memory limits, security assertions, package identity checks, and failure exit codes remain unchanged.
The product lane does not replace the separate release corpus-performance jobs.

## Questions and falsifiable outcomes

1. If the old install ceiling interrupts slow but finite work, at least one install may exceed 120 seconds and then finish correctly before 300 seconds.
2. If cumulative test work exceeds the old suite ceiling, the suite may exceed 600 seconds and finish before 1,800 seconds.
3. If installation is stuck or exceptionally slow, its new deadline will still fail, with completed npm phase measurements and the native timeout outcome.
4. Later assertions may expose independent failures once earlier operations are allowed to complete.

One successful run below the old limits would show that this attempt did not reproduce the problem.
It would not prove the earlier fault fixed or explain the variance.
No outcome authorizes an automatic retry or another lane.

## Implementation and evidence plan

| Slice                                | Existing requirements          | Proof and boundary                                                                                                                          |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| OBS-001: opt-in process observations | REQ-003/AC-003, REQ-010/AC-010 | Focused real-child success, native failure and timeout checks; unchanged defaults; reject use by other hosted workflows                     |
| OBS-002: one manual Windows lane     | REQ-001/AC-001, REQ-002/AC-002 | Parsed workflow and pinned-action checks; one fixed runtime, read-only token, no publication or qualification receipts                      |
| OBS-003: bounded hosted observation  | REQ-003/AC-003                 | Exactly one dispatch bound to the delivered SHA; retain logs, downstream outcomes and interpretation without claiming release qualification |

The existing npm command wrapper remains the authority for selected-runtime npm invocation and acquisition policy.
The existing verification script remains the authority for selecting the full product suite.
Observation code supplies only an explicit profile, bounded structured logs and the provisional execution budgets.
Use native npm timing records and monotonic process durations; do not interpret nested npm timings as additive or as pure network time.
Log completed timings on success and failure, plus the original-threshold comparison and truncation count.
Never dump environment variables, authentication configuration or raw npm debug logs.

Use focused tests during development, then one required local full verification on the settled candidate before direct-main delivery.
The signed diagnostic commit uses GitHub's documented `[skip ci]` instruction to avoid automatic push matrices; the manual workflow remains runnable.
This is a delivery exception for this observation, not a change to CI triggers or release admission.
Inspect the settled patch once under the existing review route, reusing earlier security assessment for unchanged release boundaries.
The new workflow has no secrets, OIDC, publishing credentials, artifact upload or release authority.
Its logs and step summary are the evidence destination.

Retain the prior untracked expert brief and all existing held resources without adoption or cleanup.
The observer and follow-up decision owner is the maintainer, assisted by the agent in this chat.
After the run, record its identity, duration, threshold crossings, phase measurements, assertions and limitations here or in the external task evidence.
Any further run, permanent budget change, workload redesign, or release qualification rerun requires a new decision.

## Sources

- [GitHub: skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
- [GitHub: manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
- [npm: logging and timing](https://docs.npmjs.com/cli/v11/using-npm/logging/).

## Production adoption on 18 October 2026

The preceding sections preserve the original experiment's authority and limits.
The owner subsequently instructed: "Apply the provisional 5/30/45-minute limits to the prod flow."
This decision authorizes adopting those execution budgets in production qualification.

The [single observation, run 39078046899](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39078046899), passed on signed source `58813562ca00e8ad2aa0d8ade5b468445ee4a3a2`.
Its Node suite took 569.733 seconds as measured by its supervisor, with 533 passing tests and three skips.
The slowest genuine install took 78.867 seconds; offline reinstalls took 48.957 and 49.548 seconds.
Architecture and JSON checks also passed, and the run uploaded no artifacts.
The larger deadlines were not needed in this attempt; the intermittent failure was not reproduced.

Continue the existing R2 execution and REQ-003/AC-003 and REQ-010/AC-010 execution-assurance scope with one budget-adoption slice.
The existing npm command wrapper owns the five-minute install/ci budget and explicit fixture overrides; the verification runner owns the thirty-minute Node-suite budget.
Hosted npm toolchain acquisition also uses that shared install budget instead of its former job-only deadline.
Product, candidate, shared and registry qualification jobs receive forty-five minutes, with direct bootstrap npm ci steps bounded at five minutes.
Remove timeout selection from the observation switch; it now selects diagnostic logging only, retaining the former two- and ten-minute comparison baselines.
No timeout change selects additional tests, retries, publication effects, performance thresholds, memory limits or skipped assertions.
The native build workflow and fast admission/publishing control jobs retain their operation-specific deadlines.

Verification uses the existing real-child failure/timeout regressions, workflow invariants, exact-file formatting and linting, one review of the settled delta, and the required local full HISEW profile.
The external local HISEW invocation retains its separately configured fifteen-minute supervisor; that is not a hosted production-job limit and this change does not alter workflow installation settings.
Deliver one signed direct-main commit with the normal push matrices skipped, preserving the owner's restriction on additional hosted runs.
No new remote qualification run or release is authorized by this configuration change.
Rollback is a reviewed revert of this budget-adoption commit; prior failed and successful run evidence remains intact.
