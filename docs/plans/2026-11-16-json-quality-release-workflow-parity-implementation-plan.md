# JSON Quality release workflow parity

## Direction and baseline

Draft HISEW R2 implementation plan prepared on 2026-11-16.
The release workflow design decisions below were confirmed in the plan review.
Release evidence controls npm writes and immutable GitHub releases, so a mistaken recovery can create a second request or authorize the wrong package family.
The intended outcome is to continue an attributable release after a transport failure or a definitive npm refusal while requiring the same owner decisions, archive identities and public qualification as an ordinary release.

The comparison covers `429eef4e6e215bbf2f28bff8855457d42255742a..c8c74cc6847d1c34c1d86de861d1a6a6b4d26317` in JSON Quality.
The latter revision matched its remote default branch.
The range contains four merges and five substantive commits.
The only workflow YAML edits change two dispatch descriptions.
Their implementation spans the workflow entry points, evidence transport, native writer and retained history.
[JSON Quality range](https://github.com/Hadden-Industries/json-quality/compare/429eef4e6e215bbf2f28bff8855457d42255742a...c8c74cc6847d1c34c1d86de861d1a6a6b4d26317).

Markdown Quality is missing release workflow improvements.
Its remote `main` was `39d80c30df1a19869f7cdb7fc0109eb3111d790b`.
The checked-out and pushed `fix/release-controller` branch was `c1ba9829587a9d11fd324014d37ff3e806c30b93`.
Use that branch as the integration starting point because it already implements most of the earlier [controller hardening and pilot retirement plan](2026-11-14-release-controller-hardening-and-pilot-retirement.md).
In particular, `0e63205` adds retirement and refusal recovery, and `c1ba982` adds provenance recovery for an enumerated set of expired legacy publishers.
Carry forward the branch's protected controller, signed history and source-to-controller decision rules.
Recheck both refs when implementation starts and reconcile any intervening change before qualifying the combined revision.
[Markdown Quality branch delta](https://github.com/Hadden-Industries/markdown-quality/compare/39d80c30df1a19869f7cdb7fc0109eb3111d790b...c1ba9829587a9d11fd324014d37ff3e806c30b93).

The confirmed decisions govern the acceptance criteria below.
Verify the combined candidate from `fix/release-controller` before integrating full parity into `main`.
The first consumer owns staging artifact verification.
A writer-side check is conditional on the hosted handoff result in DEC-01.
Both original native receipts are required for the completed-request continuation, including when an authenticated signed checkpoint supplies the bytes after expiry.
Settle only a proved pilot-tag DELETE refusal.
Independently verified staging changes may land while exact refusal recovery remains blocked and parity remains incomplete.
The release maintainer owns integration, the release owner owns the accepted baseline, dispatch decisions and publisher settings, and an independent verifier with release security expertise reviews artifact custody and the refusal path before merge.
Planning used the sibling Software Engineering Workflow checkout at `cd6c5b8a3087b224490168ede04413669eb893b7`, specifically its planning and implementation skills, verification routes and handoff guidance.
This comparison is based on source, hosted run metadata and existing test source.
The isolated npm probe was blocked by the command safety hook before execution.
Hosted Markdown retirement and the proposed fault scenarios remain unverified.

## Findings by source change

### Digest representation and skipped jobs

`4d9cef5` binds bare upload and prefixed REST digests to the same evidence and admits the exact skipped matrix identity for native staging.
`scripts/upload-evidence.js` already canonicalizes SDK responses and `scripts/download-evidence.js` requires a prefixed REST digest and verifies the bytes.
The protected publication path uses the pinned native upload/download actions for admission and review, passing the producing IDs with `digest-mismatch: error`.
An initial Markdown native dispatch has one skipped `retained` job and separate native steps inside `stage`.
GitHub recorded that shape in the original native dispatch `42589874800`.

Preserve digest strictness.
Exercise Markdown's own skipped job through the failed-native predecessor reader in SLICE-002.
[JSON change](https://github.com/Hadden-Industries/json-quality/commit/4d9cef5cb8f6033f38543beb392d48d2fdc5c868) · [Markdown native attempt](https://github.com/Hadden-Industries/markdown-quality/actions/runs/42589874800/attempts/1).

### Artifact visibility and completed native evidence

`3593a33` retries REST visibility of the acknowledged writer artifact and accepts complete native request evidence after a transport-only failure.
The shared reader already opts exact artifact metadata IDs into bounded 404 retries when downloading.
The `publish.yml` stage upload emits an ID and digest via the stock action, but no writer-side step reads them back.
`verify-publication.js` passes the previous jobs, manifest and origin map to `planPublicationOrigins`, without passing the original stage journals.
Core readiness can therefore treat the native origins as retained before proving their completed receipts.
Later archival reads journals, and the branch already accepts a completed core request after a later stage-job failure and exports failed native writer evidence.

Prove the acknowledged upload at the first consumer and close the completed-evidence gap through core continuation, public qualification, archival and signed history.
SLICE-001 and SLICE-002.
[JSON change](https://github.com/Hadden-Industries/json-quality/commit/3593a33805836ba468ffe885d84739ac15c6a100) · [JSON failed readback](https://github.com/Hadden-Industries/json-quality/actions/runs/43476557013).

### Guarded pilot retirement

`9d5d96b` adds guarded pilot retirement, npm-only completion and retention of the retired subject.
The branch already implements `retire-pilot`, natives-first deletion, immutable stable and retired qualification, stable and GitHub guards, the authenticated GitHub writer skip, and history export for an older pilot.
Remote `main` lacks the branch implementation.

Integrate and exercise the existing implementation with SLICE-003.
Verify the package-specific trusted-publisher settings before any live retirement.
[JSON change](https://github.com/Hadden-Industries/json-quality/commit/9d5d96bd0c1b0763323f3141926d0dc41c3db77b) · [Markdown implementation](https://github.com/Hadden-Industries/markdown-quality/commit/0e632055bd02ec5f39d53b6714a64eedd9f17ac8).

### Native refusal settlement and regression

`f3c0a7a` and `7911335` settle an exact native refusal using the original failed execution, then require a fresh decision and retain the proof.
The branch has a protected read-only reconciliation job, a separate settlement and fresh decision binding, including recovery after an acknowledged prefix.
Its tests inject an error with `status: 1`.
The production `runNpm` builds an error without `status`, while `npmRequestDiagnostic` needs it and `npmRequestRejected` requires a nonzero exit.
Separately, the reconciler hashes the original job log without checking that the refusal belongs to the exact pilot DELETE.
A bare `E401` can also come from npm's earlier request to read the tags.

Repair the real native error path and require evidence of the exact refusal.
Use structural comparison for records and exact-byte checks for digests.
SLICE-003.
[JSON recovery](https://github.com/Hadden-Industries/json-quality/commit/f3c0a7aaed8d2fda9577757bef880e2b5823426a) · [Structural test correction](https://github.com/Hadden-Industries/json-quality/commit/791133562abf08bd1e0367acd644933f9f0db08a).

Scope covers the release Actions behavior introduced in this range, including its native commands, data contracts and operational documentation.
Keep the package layout, archive/recipient/security qualification, reviewed controller deltas, same-attempt artifact identity and public API intact.
Retain the existing legacy provenance scope and the separate procedure for unknown npm outcomes.
Broader CI tuning, version upgrades, new workflow entry points, package publication and live alias changes are outside this increment.

## Implementation slices

### SLICE-001 — Verify the acknowledged staging artifact at consumption

**REQ-01 / AC-01 / QA-01 / DEC-01.**
The first consumer of `publication-source-and-manifest-<attempt>` must authenticate the original upload, retrieve it by its exact acknowledged ID, and verify the digest against the downloaded bytes.
Bind the ID, digest, attempt-qualified name, original run and attempt, repository, controller source, and size using the existing evidence owners.
Authenticate the original job and its upload execution even when another stage step failed.
Preserve the attempt naming, failure-path evidence retention and original writer conclusion.

Start with a hosted two-dispatch observation using a harmless artifact and the pinned upload action.
Capture the producing run, attempt, `artifact-id` and `artifact-digest` as the oracle.
Give the second dispatch only the current run and attempt coordinates and check whether the existing run artifact inventory and original job evidence identify that one acknowledged upload, including when its stage job failed after the package requests.
Compare the selected ID and digest to the captured outputs and verify the downloaded bytes.
GitHub's artifact inventory is scoped to the workflow run.
Its artifact response carries run and source metadata but has no documented attempt field.
Exercise multiple attempts of the same run in the hosted handoff and show that the protected producer job and the attempt-qualified artifact selection distinguish their uploads.
If this proves the link, keep the existing dispatch inputs and finish verification in `scripts/publication-artifact.js` and `scripts/download-evidence.js`.
If the consumer cannot establish the link, add only the producer-side check needed to bind the two native outputs and make that binding available to the later authenticated reader.
Use a supported producer evidence surface able to retain the binding with the original attempt even after a later failure.
Verify that property in the same two-dispatch test before depending on it.
Only that fallback may add a writer-side metadata readback.
Verify the acknowledged ID, digest and original producer identity using its existing Actions read permission.
Preserve an earlier package-step failure independently of the transport result.

`scripts/github-evidence.js` owns the finite retry policy and `scripts/download-evidence.js` owns byte verification and extraction.
Reuse the existing deadline and request bounds for discovery and transfer, and opt into `pendingArtifact` only for the exact metadata ID selected by the authenticated handoff.
The Actions pin supplies a bare digest and REST supplies the `sha256:` form.
Validate each representation at its boundary.
With the preferred path, the stage job adds zero REST requests and the consumer reuses its original inventory and digest checks.
The fallback adds only the reads needed to bind the original acknowledgment.
The readback has no package or artifact write authority.
[Pinned upload outputs](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/README.md#outputs) · [Actions artifact API](https://docs.github.com/en/rest/actions/artifacts#get-an-artifact).

Likely edit seams are `scripts/publication-artifact.js`, `scripts/download-evidence.js` and their workflow consumers.
A producer fallback may also touch the final upload in `publish.yml` and `scripts/check-workflows.js`.
When the read budget expires, report the evidence as unconfirmed and include the original run, attempt and known artifact ID.
A later read-only lookup may retry those coordinates.
Any resumed package effect still requires its existing admission and owner decision.
Use the existing legacy name for authenticated older attempts that produced it.
A missing or ambiguous modern upload cannot establish a different original artifact.

**Proof.**
Use test-first for the JS behavior and workflow contract checks for the Actions wiring.
Extend `test/evidence-transport.test.js` at the real reader with a response sequence of 404 followed by matching metadata.
Verify one upload, the same ID on every metadata GET, and acceptance only for the acknowledged digest.
Use malformed response or digest, a different or duplicate artifact, a valid upload from another attempt of the same run and source, wrong source, expiry, refusal and exhausted visibility as adverse cases.
Exercise a read-only retry after exhaustion and assert the original coordinates and writer conclusion, with zero replacement uploads or npm effects.
Run `npm run check:ci` and require the hosted cross-dispatch handoff before claiming parity.
Inject delays and errors at the GitHub response boundary without risking a live package effect.

### SLICE-002 — Require complete native request proof before core continuation

**REQ-02 / AC-02 / QA-02 / DEC-02.**
A failed first native staging attempt may supply completed-request proof when both intended native requests completed, the core request was skipped, and the stage job failed only at the identified post-effect evidence transport or readback.
Authenticate the protected source and original run/attempt, exact job and step inventory, manifest and origin-map digests, and both original journals. Each journal must carry the matching package, version, archive digest and integrity, controller, run, attempt, review and channel, with an intent and a valid completed stage ID. When the route is justified, a fresh owner-reviewed core dispatch retains both original origins, observes both native approvals and public archive/provenance checks, and can issue the one reviewed core request.
Public registry qualification, GitHub archival and signed history must carry the original failed conclusion and same custody through their existing entry points.

Start at `publish.yml`'s acquisition of `previous-publication` and `scripts/verify-publication.js`, which builds the input for `scripts/publication-origins.js`.
The attempt reader in `scripts/publication-attempts.js` owns original execution identity and known step inventories.
`scripts/release-staging-evidence.js` owns journal-to-subject binding, shared with archival.
Extend those authorities so readers apply the same predecessor proof while retaining their distinct public-observation obligations.
Recognize only the recorded skipped `retained` shape for an authenticated initial native dispatch with no recovery run.
Require the actual successful retained matrix when the workflow schedules it.
Read retained artifacts once per original run/attempt within an invocation.
Reuse the original bundle layout and signed history format when they carry the full proof.
[Per-attempt job API](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt) · [Markdown staging and reconciliation procedure](../release-operations.md).

Missing, partial, swapped or ambiguous receipts cannot establish completed requests, even when public bytes match.
Keep the separate path for a genuinely unknown request using its existing independent settlement rules.
The narrow transport failure rule must neither grant a second native request nor reject an expressly authorized recovery through that separate path.
Preserve the current core-continuation and legacy readers, including the branch's separately scoped provenance settlement for legacy publishers.
After Actions artifact expiry, accept an authenticated signed checkpoint that preserves both exact original journal byte streams and the original upload, run, attempt, manifest, origins and review identities.
Verify the hashes and signed history custody and check agreement with surviving provider evidence.
Thread those exact receipts through core admission, public qualification and archival.
Preserve the authenticated run and job inventory in the checkpoint.
GitHub's retention policy can also expire workflow run records.
Exercise that case with the complete retained proof and with the checkpoint absent or incomplete.
[GitHub Actions retention settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#setting-the-check-workflow-run-status-artifact-and-log-retention-period-for-a-repository).
If a receipt or its custody is missing, ambiguous or contradicted, the completed-request path blocks pending reconciliation.
Matching public bytes supply their ordinary approval and integrity proof.

**Proof.**
Extend the fixture in `test/publication.test.js` that currently provides successful step metadata and omits the journals.
Use independent fixtures for the two exact native receipts, the hosted skipped job shape and public approval outcomes.
Assert retained native origins, exactly one authorized core request and zero native replays, with unchanged original journal bytes and failure conclusions through the registry reader, archive collection and checkpoint export/import.
Replay the same failed native attempt with its Actions artifact expired and confirm that the signed checkpoint supplies the same two original receipts and decision.
Reject a failure at or before either effect, missing or unknown receipt, altered review or integrity, wrong stage ID or attempt, unexpected skipped matrix, unapproved native bytes, missing artifact without an admissible checkpoint, and conflicts with surviving provider evidence.
Exercise the ordinary successful native and core paths and a pending request with independent reconciliation.
Likely regression files are `test/publication.test.js`, `test/publication-attempts.test.js`, `test/release-continuation.test.js`, `test/github-release.test.js`, `test/release-history.test.js` and `test/release-provenance-recovery.test.js`.

### SLICE-003 — Settle the exact rejected pilot removal through the real npm writer

**REQ-03 / AC-03 / QA-03 / DEC-03.**
Carry the real process exit status and termination information from `runNpm` to the existing family writer diagnostic.
The journal keeps `outcome-unknown` and retains only the bounded fields needed to establish a later refusal.
The separate protected reconciliation job may record a rejection only for the last and only unknown effect in a `retire-pilot` operation when native evidence identifies HTTP 401 on `DELETE` of the exact scoped package's `pilot` tag at `registry.npmjs.org`.
Bind the proof to the original failed job and request step, decision, journal digest and sequence.
A generic `E401`, a failed preliminary GET or OIDC exchange, a conflicting acknowledgement, a timeout, a signal, or a different host, package, label or method leaves the effect unresolved.
The prior value must still be visible for the rejected request.

In the inspected npm 12.2.2 CLI, `dist-tag rm` performs OIDC setup, reads tags, then sends the tag DELETE.
The same HTTP status can reach the CLI from different operations.
Its bundled HTTP client can retry a DELETE after eligible failures inside the same npm invocation.
A terminal 401 could therefore follow an earlier attempt whose outcome is unknown.
Use npm's `--fetch-retries=0` for the native pilot retirement removal and preserve the non-interactive writer.
Keep the existing retry policy for read-only verification and unrelated commands.
For new evidence, verify that the guarded writer issues at most one DELETE per admitted effect.
For earlier writers, a refusal requires authenticated evidence excluding an earlier unresolved DELETE.
A final 401 by itself leaves that earlier attempt unresolved.
Before implementing the evidence adapter, observe the real pinned npm through `npmCommand` in an isolated registry fixture that independently forces a GET 401 and a DELETE 401, plus a transport interruption.
Use the authored request log of that fixture as the oracle.
Prefer the native structured error when it preserves the provider-reported method, endpoint and status.
If the pinned CLI omits those fields, demonstrate that the existing authenticated native job log supplies them within the original failed step.
Bind the bounded diagnostics to the log digest.
If neither source establishes the exact DELETE refusal, keep the affected request unresolved and report the specific evidence gap.
Require exact proof at admission before the restored exit status can authorize any rejection settlement.
The independently verified artifact and staging fixes may proceed with that restriction in place.
Record refusal recovery as an outstanding parity gap.
[npm 12.2.2 `dist-tag` command](https://github.com/npm/cli/blob/v12.2.2/lib/commands/dist-tag.js) · [Bundled HTTP retry implementation](https://github.com/npm/make-fetch-happen/blob/v16.0.1/lib/remote.js) · [npm retry configuration](https://docs.npmjs.com/cli/v12/using-npm/config/#fetch-retries) · [npm trusted publishing and dist-tag permissions](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

Likely edit seams are `scripts/commands.js`, `scripts/family-labels.js`, `scripts/release-effects.js`, `scripts/reconcile-release-effect.js` and the existing history/operation consumer.
Keep the native npm command as the only writer.
Retain the public-safe method, endpoint coordinates and HTTP status with the original failed job and step, journal digest and sequence, owner decision, and authenticated evidence reference.
Drop arbitrary response text, credentials, query strings and full raw logs from public artifacts.
The retained observation and settlement reader must independently bind the new proof to the effect and the authenticated producer.
Older journals remain readable.
After the original Actions artifacts or logs expire, admit a signed checkpoint containing previously verified proof of the exact refusal and its original bindings.
Reject a conflict with surviving provider evidence.
Older `E401`-only journals require independent authenticated evidence of the exact request or remain unresolved.
Retain the original journal and separate settlement by digest in their original forms.

A fresh digest-bound retirement must name the exact refusal settlement and original operation.
Use the existing `verifyRetirementResumption` and family guard owners to enforce the original retired identity, stable `latest` for all three packages and immutable GitHub release/latest markers.
The acknowledged prefix becomes explicit no-ops.
The fresh writer can issue the proved-refused removal once and request untouched removals within the original scope with their reviewed priors.
Complete through the npm-only workflow with the authenticated GitHub writer skip.
The release owner verifies repository, `promote-release.yml`, `npm-promotion` environment and dist-tag capability for **each** package before a live operation.
[Markdown retirement and publisher procedure](../release-operations.md#retire-an-evaluated-pilot-alias).

**Proof.**
Put the first regression on the real native wrapper seam so the existing fixture cannot synthesize the exit status.
Count actual DELETE requests at the isolated registry under the selected writer configuration.
Verify zero on a preflight GET 401 and one on a DELETE 401, transient 5xx or a connection lost after the registry received the DELETE.
A 5xx or lost response leaves the effect unresolved.
A fixture with an earlier ambiguous DELETE followed by a final 401 must refuse settlement.
Then drive `executeFamilyLabels`, the protected reconcile entry point, a fresh admitted controller operation, the read-only completion job and signed history replay through the existing fixtures.
Model the expected writes from the owner-approved preimages and the fixture's independent HTTP observations.
Assert zero writes during reconciliation, no repeated acknowledged removal, one retried DELETE only under the new decision, no GitHub edits, and exact original and new evidence across history export/import after retention expiry. Challenge wrong endpoint/method, changed stable, GitHub or pilot guards, altered journal/decision, wrong attempt, ordinary auth failure and transport failure. Compare retained parsed records structurally and use hash/byte equality for custody.
Likely focused files are `test/release-controller.test.js`, `test/release-promotion.test.js`, `test/release-history.test.js`, `test/release-runtime.test.js` and `test/release-readback.test.js`.

## Integration and verification

- SLICE-001 can land independently of the native predecessor check.
  Freeze the verified artifact handoff route and its original upload identity before qualifying the SLICE-002 continuation through that route.
  SLICE-003 can proceed independently in a separate worktree after the native CLI observation.
  The release maintainer integrates the combined effects of SLICE-002 and SLICE-003 in the shared writer history reader and checkpoint regressions.
- Use the inspected repository runners.
  Run the listed files with `node --test` for each slice, use `npm run check:ci` for workflow structure, and enumerate the combined affected surface with `npm run check:affected -- --base c1ba9829587a9d11fd324014d37ff3e806c30b93 --list` when that revision remains the integration base.
  At candidate freeze, run the actual affected selection and the applicable `npm run check:source` gate.
  Keep matching evidence from earlier runs when no relevant input changed.
  Full parity requires three observations on the applicable frozen candidate.
  First, verify the exact digest-bound artifact at a read-only consumer in a separate hosted dispatch.
  Second, use the actual pinned npm CLI against the isolated fixture to distinguish the GET 401 and DELETE 401 and prove there are no internal DELETE retries.
  Third, replay the failed native stage and partial retirement from signed retained evidence after simulated original artifact and log expiry.
  The failure fixtures exercise the protected contracts without production write credentials.
  Observe live provider settings and resulting public labels under any separately authorized production operation.
- Bind the handoff to the exact revision and runner configuration, each focused failure and fix, exercised test counts, affected results, covered and pending hosted scenarios, and original evidence references.
  The independent verifier checks the failure injection at the GitHub and npm boundaries and inspects effective workflow permissions, same-attempt custody and adverse cases on the combined candidate.
  Release security review owns the evidence-admission, credential and public artifact findings.
- Reuse the currently pinned action, repository reader, npm CLI, attempt journal, public registry qualification and signed checkpoint facilities.
  No new dependency is proposed.
  On 2026-11-16, the official latest releases matched the pins for `actions/upload-artifact` 7.0.2, `actions/download-artifact` 8.0.2 and npm CLI 12.2.2.
  Record the versions actually used and recheck the existing pins at implementation freeze.
  If implementation needs a new supplier, resolve supported versions, license and applicable terms in the existing software-selection process before adoption.
  Both repository manifests declare AGPL-3.0-only.
  If adapting upstream project code, preserve its SPDX notice and attribute the exact source commit.
  Name new evidence for the state it proves, and use the existing artifact and command interfaces without a compatibility shim.

## Rollout and recovery

Verify the combined controller candidate on `fix/release-controller` before integrating full parity under the existing protected `main` process.
If the exact DELETE proof remains unavailable, the independently verified artifact and staging changes are eligible for integration with the refusal path blocking unproven 401s.
Record that parity remains incomplete and preserve the pending recovery evidence.
Keep GitHub and npm credentials at their existing Actions boundaries.
For any separately authorized production change, the owner selects the exact publisher preimages, immutable qualification evidence and applicable controller delta.
Retain the original Actions logs, histories and required signed checkpoint references before expiry.
The release maintainer checks the stage and transport results separately, the original run/attempt and artifact ID, the exact journal and any settlement, then all three visible npm tags and GitHub latest before declaring completion.

Stop further effects when provider state diverges from the decision, custody is incomplete, an unrecognized job shape appears, the read budget expires, or trusted publishing differs across the package family.
A bounded transport failure can be investigated read-only by original run, attempt and any known artifact ID, using authenticated signed history for retained evidence when available.
An unresolved request remains blocked.
Restore earlier qualified aliases only through the existing explicit owner operation with fresh preimages.
Reverting a repository change can restore prior controller code before effects.
After requests, preserve the original journal and use read-only verification, an accepted settlement or a fresh forward decision for the actual provider state.
[Markdown release operations](../release-operations.md).

Use the hosted handoff result to select the consumer path or the writer-side fallback in DEC-01.
If visibility exceeds the finite read budget, record the unconfirmed result and measure the original-ID readback with an isolated artifact before proposing any change to the shared limits.
Reconsider DEC-02 if the current controller emits a different job identity or transports a different set of original files.
Compare authoritative per-attempt metadata and downloaded bytes, and extend only the identified producer contract.
If the pinned npm CLI and authenticated log cannot prove the DELETE refusal, follow the partial delivery decision above.
A changed guarded preimage blocks the affected operation until the owner reviews the new state.
Revisit the plan if this work adds duplicate registry reads, increases mutable effect scope, or displaces the evidence needed to recover an interrupted release.
