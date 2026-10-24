# Frozen performance correctness reports

These gzip files retain the complete public `runQuality` results from producer source `763984e94f2122a949d2ad6f9bce5da9791015e8`, including every finding and selected path.
They are correctness reference data, not candidate timing or memory evidence.
Only the package version is normalized when verifying the canonical full-result SHA-256 against the pre-existing `resultSha256WithoutVersion` values in [performance-oracles.json](../performance-oracles.json).
The oracle hashes, policy source, invocation limits, and corpus revisions were preserved without regeneration.

The reports were retained from [transported qualification run 37997260094](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37997260094), source `aec44f56b528af592ad6ba7e1e114e333246c19c`, artifact `performance-ubuntu-24.04` (artifact ID `11647692630`).
That job independently executed the pinned historical producer and verified both reports against the already committed full-result hashes.
`owlapi.json.gz` and `webvowl.json.gz` retain the complete decoded values of `owlapi-incumbent.stdout.json` and `webvowl-incumbent.stdout.json`, respectively; gzip timestamps are zero for reproducibility.
The JSON adoption changed only their presentation through JSON Quality's public source formatter, after native admission and with the original compressed reports retained in external implementation evidence.
The existing semantic oracle hashes were verified before and after that change without regeneration.
The owning presentation command is `node scripts/format-performance-incumbents.mjs`; these reports receive ordinary JSON checks and no historical presentation exemption.
That explicit command uses the shared finite 2 MiB source writer and a separately measured 512 MiB managed workspace for the larger report's 87,991 indexed values.
It completes native admission before formatting its two inputs, preserves exact numeric spellings and rechecks the original full-result hashes after guarded replacement.
Ordinary JSON checking retains its 32 MiB managed target and streamed native-member delivery.
The corresponding frozen public corpus revisions remain declared in `scripts/qualify-performance.py`.

The Windows job in that run aborted in historical baseline analysis before candidate observations.
Historical source predates the literal-protection optimization; rerunning it on every hosted machine creates an unrelated resource-dependent prerequisite for current candidate qualification.
The qualifier now verifies both retained full reports before starting candidate measurements, rejects missing/corrupt/changed evidence, and compares every candidate finding, selected path, outcome and exit code.
Six fresh installed-candidate observations per corpus, complete corpus manifests, all consumer budgets, the 30-second/512 MiB gates, and failure retention remain active without retries.

An intentional policy or corpus change requires a separately accepted baseline and independently reproduced full reports.
Do not regenerate these reports or their oracle hashes from the candidate being qualified.
