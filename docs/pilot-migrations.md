# Pilot migration boundary

The pilot declarations are [OwlAPI](consumer-configurations/owlapi.json) and [WebVOWL](consumer-configurations/webvowl.json).
They preserve the incumbent authored selection and native ignore files.
Existing ignore policy is retained from each frozen consumer; it is not copied into the shared preset.
The shared GFM, prose, and link checks still require reviewed diagnostic and output deltas before cutover.

The observed OwlAPI base is `1cdc5a33b9538cce8ced88f21af18138da7a8923`.
Its checkout contains untracked review documents.
The observed WebVOWL base is `5f5a5e955f3ac5ac6f3bceaf3201a79708759938`.
Its checkout contains unrelated design-plan and skills-lock changes.
These consumer checkouts have not been changed by this task.
Registry delivery is blocked by the owner's explicit instruction on 2026-10-05.
The dependent installed-release cutovers remain pending.

For each cutover, retain the base revision, exact configuration and lock, old scripts and workflows, selected paths and preimage hashes, unrelated-file sentinels, candidate tuple, and diagnostic/output differences.
Qualify the same core/native release in isolated tooling with lifecycle scripts disabled.
Replace only duplicate Markdown commands; retain JavaScript, Python, package, API, build, and release checks.
Search every old wrapper and installer reference before retirement.

Both full-scope hosted Markdown runs and mixed code/document runs must preserve their existing required statuses.
Public fork acquisition must follow the qualified credential boundary in [CI trust](ci-trust.md).
Do not use PR-controlled tooling or a caller's dependency graph in a privileged acquisition step.

Recovery restores migration-owned manifests, locks, workflows, and formatted document preimages, then rechecks sentinels and required statuses.
Record actual elapsed restoration time.
A dependency downgrade alone does not restore document bytes.
Neither configuration templates nor local disposable consumers establish accepted pilot migration or recovery.
