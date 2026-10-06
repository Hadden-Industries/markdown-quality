# Pilot migration boundary

The pilot declarations are [OwlAPI](consumer-configurations/owlapi.json) and [WebVOWL](consumer-configurations/webvowl.json).
They preserve the incumbent authored selection and native ignore files.
Existing ignore policy is retained from each frozen consumer; it is not copied into the shared preset.
The shared GFM, prose, and link checks still require reviewed diagnostic and output deltas before cutover.

## Current 1.0.3 integration closure

On 2026-10-06, the owner requested closure of these records after both consumer upgrades had integrated through their own chats and normal pull requests.
The observed integrations are:

| Consumer | Reviewed candidate                         | Integrated main commit                                                                                     | Hosted evidence                                                                                                                    |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| OwlAPI   | `d63f00ce61816b9e6614c53d627041b7598c35f9` | `4f6adbd3a925ad2e0ccfc98550f216642957f870`, [PR #49](https://github.com/Hadden-Industries/owlapi/pull/49)  | [CI 37504430078](https://github.com/Hadden-Industries/owlapi/actions/runs/37504430078), attempt 1; all twenty PR checks passed.    |
| WebVOWL  | `d99dfadf1db38be340cd8b13c80a23248864310a` | `693e5aa22269aec4d5860e38c03abf559ccb32a4`, [PR #57](https://github.com/Hadden-Industries/webvowl/pull/57) | [CI 37501151711](https://github.com/Hadden-Industries/webvowl/actions/runs/37501151711), attempt 1; all thirteen PR checks passed. |

Fresh remote `main` readback confirms both isolated locks resolve the core and both native packages to `1.0.3`.
Each core/native integrity matches the original [qualified release tuple](releases/1.0.3.json).
OwlAPI's manifest pins exact `1.0.3` and its approved `install:markdown` rename is complete.
WebVOWL deliberately uses manifest range `>=1.0.3`; PR #57 updates its candidate verifier to bind installation to the exact lock while checking manifest/lock agreement and native identities.
`npm ci` therefore retains the exact accepted archive identities; regenerating a lock may select a newer release and requires separate upgrade qualification.
This record documents the range without changing it or amending the accepted plan's exact-pin requirement.

Both PRs report all 67 selected documents clean, preserving the existing selection and replacing space-based hard breaks with explicit backslashes where needed.
WebVOWL's hosted Linux Markdown job independently confirms 67 clean documents and zero writes.
OwlAPI's originating chat reports that its three unrelated plan edits were preserved byte-for-byte, and WebVOWL's PR excludes the existing `skills-lock.json` change.
These preservation statements retain their consumer-side provenance; this producer-side closure changes neither checkout.
The 1.0.3 producer's exact source, immutable release, registry qualification and twenty-four measured corpus observations remain in the [current implementation record](implementation-status.md).

Upgrade tracking is closed as integrated elsewhere under the owner's current closure instruction.
This readback does not retrospectively establish separately recorded exact trusted-run owner acceptance, six-run resource windows on the new consumer candidates, or a new timed restoration.
The original alpha.4 pilot windows and recovery below remain historical evidence for those exact cutovers; they are not relabelled as 1.0.3 consumer proof.
Future migrations and graph changes retain their scope, trust, verification and recovery gates.

## Retained earlier pilot evidence

The original retained corpus snapshots use OwlAPI base `613a214001437ff037072c4c1a3c3a7d5b09b817` and WebVOWL base `f7372f9b8b93a2bf337fe0125fec8fd7e3454143`.
They remain historical comparison inputs, not current consumer acceptance.
The owner lifted the registry hold with “Proceed” on 2026-10-05 and restored npm login.
The owner subsequently selected public packages after npm rejected private publication with E402.
Native rights, transported archives and anonymous registry qualification passed for alpha.4.
OwlAPI's owner-accepted cutover integrated through PR #46 at `073beefb7805130bc0452472d1a9c801471fbaf1`, after trusted run `37338581639` qualified candidate `8dc38edbff5929cf0d30b39b577838928f29d875`.
WebVOWL's owner-accepted cutover integrated through PR #54 at `efd631802a5f823be63d6d53faef8a3bef02c41b`, after trusted run `37402366789` qualified candidate `f323cd387aea3dbeb8ece77f9786a307a079a4e8`.
Both cutovers passed six-run Linux/Windows windows, incumbent CI and scoped restoration; their exact acceptance does not extend to a later tuple.
WebVOWL's subsequent loading repair integrated separately through PR #55 at `b0fe00404eedf12a59084871863500869474bd3a`.
Its unrelated `skills-lock.json` edit remains a preserved sentinel.

The corrective 1.0.2 scopes were prepared for OwlAPI base `073beefb7805130bc0452472d1a9c801471fbaf1` and WebVOWL base `b0fe00404eedf12a59084871863500869474bd3a`, superseding the unaccepted 1.0.1 proposals.
They were paused for performance research and are now superseded by the integrated 1.0.3 upgrades above; do not apply them to current consumers.
Only each isolated tooling manifest and lock are newly proposed; OwlAPI's composed nine-path scope also includes its already approved seven-path `install:markdown` rename.
The published 1.0.2 tuple passed complete Windows/Linux registry qualification in run `37417063198`; its literal-code and inline-code corrections have positive independent source reviews.
Each prepared lock changes only its root pin and the coordinated core/platform records, retaining all 154 third-party records exactly.
One read-only Windows sample per proposed corpus passed without changing either live checkout or environment; independent security review binds the exact new manifest/lock pairs before scope acceptance.
These samples do not establish six-run hosted budgets, actual consumer recovery or exact trusted-run acceptance.
Implementation-plan GATE-06 still requires owner acceptance of each concrete upgrade scope and recovery before consumer mutation.
Preserve every retained unrelated-file sentinel and abort on baseline or preimage drift.

For each cutover, retain the base revision, exact configuration and lock, old scripts and workflows, selected paths and preimage hashes, unrelated-file sentinels, candidate tuple, and diagnostic/output differences.
Qualify the same core/native release in isolated tooling with lifecycle scripts disabled.
Replace only duplicate Markdown commands; retain JavaScript, Python, package, API, build, and release checks.
Search every old wrapper and installer reference before retirement.

Both full-scope hosted Markdown runs and mixed code/document runs must preserve their existing required statuses.
Public fork acquisition needs no npm secret and must follow the reviewed graph/policy boundary in [CI trust](ci-trust.md).
Do not let PR-controlled tooling, policy or ignore files replace the trusted required-check capability.

Recovery restores migration-owned manifests, locks, workflows, and formatted document preimages, then rechecks sentinels and required statuses.
Record actual elapsed restoration time.
A dependency downgrade alone does not restore document bytes.
Neither configuration templates nor local disposable consumers establish accepted pilot migration or recovery.
