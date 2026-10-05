# Pilot migration boundary

The pilot declarations are [OwlAPI](consumer-configurations/owlapi.json) and [WebVOWL](consumer-configurations/webvowl.json).
They preserve the incumbent authored selection and native ignore files.
Existing ignore policy is retained from each frozen consumer; it is not copied into the shared preset.
The shared GFM, prose, and link checks still require reviewed diagnostic and output deltas before cutover.

The retained corpus snapshot uses OwlAPI base `613a214001437ff037072c4c1a3c3a7d5b09b817`.
OwlAPI subsequently advanced; refresh the exact inputs before any cutover.
The retained WebVOWL base is `f7372f9b8b93a2bf337fe0125fec8fd7e3454143`.
Its unrelated `skills-lock.json` change is a preserved sentinel.
These consumer checkouts have not been changed by this task.
The owner lifted the registry hold with “Proceed” on 2026-10-05 and restored npm login.
The owner subsequently selected public packages after npm rejected private publication with E402.
Native rights and both controlled-binary packed platform suites passed; the public tuple requires fresh registry readback and unauthenticated installation.
The dependent installed-release cutovers remain pending.

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
