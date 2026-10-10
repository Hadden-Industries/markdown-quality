# Compact qualification evidence

## Accepted baseline and purpose

Owner request in Codex chat `01a1228c-f0dd-7d71-973c-d8be61530978`:
"Also fix the 'The size is excessive for routine Markdown CI' as per your recommendations, using hisew".
The original centralization authorization covers scoped configuration changes,
signed commits and publication. Shared plan section24.7 records the accepted
recommendations. Native snapshot `d7aafb4b-9654-4c5b-8615-6bbc097e4c1a`
preserves that baseline. Producer starts at `3f00f67147b45bef0cf35940bb43a7850eecf38f`.

Positive agent-skills qualification uploaded295576530 bytes: twelve staged copies,
each containing approximately20MB of already-compressed native archives.
The higher outcome is useful, independently verifiable qualification evidence with
proportionate storage and download cost.

## Route and invariants

Risk R2: the reusable cross-repository workflow changes its retained evidence
contract. Incorrect packaging could hide missing or changed data. Reversal is a
normal producer/consumer pin revert; historical artifacts remain unchanged.
Ordinary Review Agent, scoped Codex Security assessment and an independent
different-vendor final-commit review address the material risks. Consolidate before
broad review; use narrow follow-ups; external review only on signed final commits.

- REQ-001: Retain all sample receipts, results, stdout/stderr and the complete window.
- REQ-002: Remove repeated staged source/package bytes from hosted uploads; retain
  complete content manifests, including hidden paths and empty directories, bound
  to the measured staging identities and immutable Git inputs.
- REQ-003: Preserve fresh per-sample staging, finite bounds, candidate-as-data,
  local-link rejection, runtime identity and native quiescence evidence.
- REQ-004: Use short routine-success retention and longer selected/failure evidence.
- REQ-005: Deliver the producer fix and adopt it in agent-skills with exact archive,
  lock and reusable-workflow identity; preserve the established npm script names.

## Slices and proof

| Slice | Requirement / acceptance | Proof | Delivery and cleanup |
| --- | --- | --- | --- |
| SLICE-001 | REQ-001/002/003; AC-001 compact packaging excludes raw stages, includes hidden paths and binds every manifest to original receipts | Test-first real packaging fixture; missing/tampered stage rejection; unchanged source evidence; failed-window logs retained | Producer implementation and public artifact contract; original local qualification layout unchanged |
| SLICE-002 | REQ-004; AC-002 explicit success/failure/selected retention | Parsed workflow checks; producer full native profile | Shared workflow uploads only the compact directory; existing artifacts expire under their original policy |
| SLICE-003 | REQ-005; AC-003 exact consumer adoption and measured reduction | Clean producer pack, consumer full gate; positive and hostile Windows/Linux hosted runs; independently verified manifests reconstructed from Git | Normal signed main publication; shared plan updated after landing |

## Design and boundaries

Keep the qualification API and original local output unchanged. A producer-owned
post-processing step projects that output into a fresh compact upload directory.
Use existing bounded staging/digest functions and Node built-in filesystem/crypto
facilities, not a consumer shim or a new archive library. GitHub's supported artifact
path/compression/retention controls are the selected upload mechanism. Existing
dependencies and their licenses remain unchanged; no third-party code is copied.

The compact directory stores complete sample evidence and one content manifest per
distinct staged digest. A manifest is an integrity inventory, not a source archive:
reproduction needs the exact candidate and trusted Git objects and locked archives.
It must not claim byte retention or independent authenticity. Bind manifest hashes
and sample references in an index. Verify successful windows against receipt and
stage hashes before accepting the projection; failures keep attributable bounded
diagnostics and explicitly identify incomplete evidence. Do not delete local stages
or change measured execution timing to optimize uploads.

Predicted seams: `src/candidate-staging.js`, producer packaging script and tests,
`.github/workflows/markdown-quality.yml`, `docs/centralized-contracts.md`,
`docs/ci-trust.md`; consumer archive/lock/source identity and reusable workflow pin.
No new registry release, installed plugin update, engine update, fleet migration or
destructive remote cleanup is part of this task.

## Verification, observation and recovery

Focused packaging tests first, affected staging/qualification/packed tests at
integration, then current native HISEW full profile on the frozen candidate.
Keep independent expected manifest entries and exercise real filesystem bytes.
Use actual GitHub artifact metadata to compare compressed byte counts with the
295576530-byte baseline; do not equate uncompressed size with stored size.
Reconstruct all manifest paths and bytes from frozen candidate plus trusted overlay.
Validate every receipt hash, source identity and negative rejection on both OS jobs.

Replan if exact reconstruction cannot cover hidden paths, packaging requires weaker
limits or trust, the producer/consumer main advances, or a review changes the evidence
contract. Repository owner observes delivery; a failed compact projection fails the
job and leaves original local evidence available for diagnosis. Revert pins to abort
adoption. Retain native receipts and compact qualification evidence for audit;
dispose only task-owned temporary clones after review consumers finish, through
recoverable cleanup. Reassess retained task evidence by2026-11-10.
