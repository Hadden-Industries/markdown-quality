# Offline release continuation rehearsal

This plan was drafted by a delegated GPT-6 Astra planning worker at Extra High (`xhigh`), then checked against local owning sources by the parent.
It uses the sibling Software Engineering Workflow planning and implementation guidance, without invoking the installed HISEW engine.

## Current controlling findings

The original release remains paused.
No further pushes, PR mutations, workflow dispatches or registry mutations are authorized by this rehearsal.
The task is to simulate and insulate the complete remaining path before another live attempt.
Offline results must state their limits.

- Baseline: main `fcb614b8b95011d9f68f9e397a09714166bc89a6`; local uncommitted repair on `fix/release-stage-preflight`.
  Preserve original 3.0.3 archives and the existing signed tags.
- Actual archive sizes are 10,331,320 bytes (Windows), 9,936,109 bytes (Linux) and 4,941,794 bytes (core).
  All fit the existing 20,000,000-byte archive reader; this is a checked non-blocker for 3.0.3, not a predicted next failure.
- The signed cutover checkpoint declares and the previous hosted reader consumed **216,462,511 expanded bytes**.
  Its existing limit is **268,435,456 bytes**.
  Adding only the two failed attempts' history snapshots, manifests and publication receipts requires at least **53,806,672 additional base64 bytes**, for a lower bound of **270,269,183 bytes**, already **1,833,727 bytes over** the limit before new successful writers.
  Retention repair is therefore a prerequisite to publication, not merely a final cleanup check.
- Investigate a consumer-supported receipt projection for new writers before introducing a new storage schema.
  Preserve every earlier signed writer representation unchanged, retain original manifests/origins/decisions/journals and native identities, and prove cold acquisition/re-export with the proposed projection.
  Redundant recursively serialized snapshots may be omitted only after their consumers and independently retained subjects are proved sufficient.
  If this cannot be established, use a versioned representation through the existing codec/reader, with explicit compatibility tests.
  Raising limits or silently weakening completeness is not the remedy.
- Installed npm 12.2.2 provides `stage download`, which downloads actual tarball bytes, and `stage approve`, which requires a UUID and uses a separate owner POST with 2FA.
  The download filename includes the stage UUID.
  `stage publish --json` returns package-keyed tarball metadata with a `stageId`.
  Its pinned fetch implementation does not retry POSTs.
  These native contracts should shape realistic fixtures; source inspection does not establish future registry availability or publisher permission.
- Sibling sources inspected: JSON Quality `7517eb15f016902e28d74070367b3fa9681b8584`, OwlAPI `3191b95a884fdc4567719d411a8387a9d2b87efd`, Software Engineering Workflow `7aee2c0ba052bfad5f09bcbd5614ece87d736d3b`.
  The useful patterns are native CLI/provider interception, read-only admission receipts, exact no-replay journals, attestation readiness, purpose-specific transport bounds and explicit state rehearsal.
  They do not by themselves verify this release.

The parent amendments above control where they refine predictions in the worker plan below.
The handoff below is the proposed coverage; the implementation record distinguishes executed checks from residual limits.

## Implementation record

The parent implemented the repairs locally.
The source-only planning worker completed using GPT-6 Astra `xhigh`.
A separate implementation worker could not inspect files because its local command policy rejected even reads; it made no changes.
Implementation continued in the authorized parent workspace.

- The redundant 16 MiB stage-history read was removed.
  Staging consumes the authenticated freshness timestamp returned by prior-effect admission.
  Original attempt 18 has a narrowly bound reviewed no-request entry, including its original job, controller, artifact digest, manifest and log digest.
- New retained writers omit a snapshot only after the existing subject consumer proves identical authenticated subjects without it.
  Actual writer 18 contains legacy claims that cannot pass that projection.
  Its exact snapshot is therefore retained with a bounded `gzip+base64` member representation; existing signed maps stay unchanged.
  The signed reader and cold restore verify the original SHA-256 and expanded size, and compression is admitted only for the named snapshot member.
- Measurement against the digest-verified original writer-18 artifact: its twelve retained files require 34,407,444 base64 bytes without this representation and 4,209,652 with it, saving 30,197,792 bytes.
  This measurement excludes enclosing JSON and provider metadata.
  It proves that writer's saving, not the final future checkpoint size.
  The eventual complete export must still pass the unchanged 48 MiB wire and 256 MiB expanded bounds.
- Archive upload and readback use the existing upload/collection budgets.
  The public-tuple wrapper uses the registry budget.
  A local CLI checks the complete dispatch body, including JSON escaping and UTF-8 bytes, before dispatch.
  The registry workflow summary now distinguishes direct latest archival from pilot-to-latest promotion.
- New cold-process tests invoke actual production executables.
  They exercise environment projection, native-first staging, denial of core in the native phase, lost stage acknowledgments with no same-workspace replay, real OpenSSH verification of an isolated fixture-key intent, signature refusal, exact decision transfer, the public-qualifier argument/deadline handoff, eighteen compact assets, immutable publication, direct latest classification, native verification failure and continuation without re-upload, and read-only completion with no further writes.
  Unexpected processes and network routes refuse; the loader excludes project dependencies while permitting the selected native npm installation.
- The staging entry test also passed with the exact 894,913-byte 3.0.3 manifest and all three frozen tarballs from the original 163,600,940-byte qualification artifact.
  The transport SHA-256 was verified as `3a2390e92832b293b6157aacfb87b0111d4be857b93b8da9e217e891c845b268`; the downloaded ZIP was deleted after extraction.
  No package was rebuilt or published.
- The signed-history tests exercise real isolated test-key verification, snapshot corruption, canonical base64, contradictory version claims, compressed and original cold restoration, and preservation of old signed representations.
  Existing tests cover original-attempt metadata conflicts, expiry versus denials, multi-subject export and re-export, exact no-request scope, retained native origins and complete matrix-report admission.

These are bounded simulations, not a claim that all five proposed slices have become one end-to-end provider rehearsal.
The historical native inventories in the new CLI world are independent fixture observations; they do not reproduce the live signed cutover's entire 216 MB history.
The archive world starts from validated complete simulated qualification receipts.
The public-tuple wrapper test observes the native handoff and does not execute or certify its inner consumer matrix.
GitHub's release verifier is an external simulated boundary; owner tag and intent signatures are actually checked with the fixture key.
Real trusted-publisher/OIDC permission, owner 2FA approval, future advisories, provider availability and propagation remain live observations.
The existing complete hosted qualification remains the runtime evidence for the frozen packages.
Live operations remain paused.

Verification: all **325** release, publication, archive, registry-readback and native label-request tests passed.
`npm run check:source` passed workflow contracts, version/runtime projections, architecture, code formatting and the JSON identity lint.
The exact frozen-input staging case passed separately.
The signed local implementation commit and its subsequent Review Agent/Codex Security results are reported separately; these checks do not substitute for those reviews.

The first final Review Agent pass at `2e6dc0767d39cf79847ca110a8a22bd23ac4b688` identified three P2 corrections.
The authenticated freshness summary now rejects every missing or malformed publication timestamp and calculates the maximum numerically, so an absent older timestamp cannot hide a newer writer.
The history test harness now intercepts only Git's fixture read and executes the real SSH verifier; a tampered signed payload is a failing negative control.
The npm boundary now returns a JSON string for integrity queries, and a new entry-point case covers an attributable native already visible under the selected label before the next stage.
The earlier claim of real history-signature verification was not supported by that harness until this correction.
The original native-tag and intent entry-point tests did execute their real fixture-key SSH verifier.
These corrections retain the live pause and require the final commit to receive both reviews again.
After these corrections, all **328** release/publication tests passed; the source checks passed again and the added timestamp-ordering case passed separately after its final refinement.

## Planning worker handoff

The next increment should establish a complete offline release journey before another hosted attempt.
Preserve the eight-file repair, but treat its 161 passing tests and `check:source` as focused evidence only.
The missing proof is that fresh jobs can consume real-sized evidence, stage each package once, recover the original native origins, qualify the complete public tuple, archive it, finish direct `latest` classification, and export history that a cold reader can consume again.

This plan uses only the supplied packet.
No tools, repository inspection, execution, HISEW invocation, security review, or publication authorization occurred.

The controlling constraints are:

- Preserve the exact qualified 3.0.3 package archives and manifest.
  Keep `v3.0.3` and the signed `v3.0.2` tag unchanged.
- Keep the current repair and its narrowly bound writer-18 recovery entry.
  Do not generalize “no request” from an empty registry inventory or missing journal.
- Keep pushes, PR mutations, workflow dispatches, and registry mutations stopped while implementing and demonstrating offline readiness.
- Reuse existing release modules, provider boundaries, journals, and workflows.
  Add test infrastructure, not another release controller or production shim.
- Conduct the separate GPT-6 Astra xhigh Review Agent review and Codex Security review only after the final implementation commit.
  No external reviews.
- Use local disposable storage outside `G:/My Drive`; remove spent scratch promptly while preserving original recovery evidence.

The release identities must remain distinct throughout every fixture and assertion:

| Role                      | Frozen identity                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Qualified release         | 3.0.3                                                                                              |
| Qualification             | `43917797156/1`, reused mode; `fresh` legitimately skipped                                         |
| Package build source      | `51c08db985f2e0209b5eecc781658c526e045cc9`                                                         |
| Signed release commit     | `a2bb644e92ace3ba7c4253ae2461510181a7220b`                                                         |
| Manifest                  | 894,913 exact bytes; SHA-256 `2615ed18ab41be5523f03f0ec5fb0c55b0abcbc4e25971ef4ac4da7e663c787a`    |
| Qualified producer ZIP    | 163,600,940 bytes                                                                                  |
| Original CI               | `43912747374/1`                                                                                    |
| Current main baseline     | `fcb614b8b95011d9f68f9e397a09714166bc89a6`                                                         |
| Successful controller CI  | `43929159050/1` at `772b0b7ad5f970ea336e87cb2f37df1be24b1953`; main has the same tree              |
| Existing retained history | `release-history-20261116-cutover-476a3808a243`, commit `057c86df517f457810518c9c717c89faa0edf396` |

The eventual controller will be the final implementation commit.
Its review must bind the exact binary diff from `releaseCommit(release)` to that controller.
Neither ordinary controller CI nor tree equality substitutes for the original release qualification.

**The immediate predictions to test are concrete.
**

| Classification            | Finding and implication                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Observed defect           | Writer 18 failed before `stageReleaseArchive` because a 23,612,807-byte history snapshot passed through a 16 MiB reader. The supplied repair removes that redundant read.                                                                                                                  |
| Code-supported prediction | `stageReleaseArchive` still reads each archive with a literal **20,000,000-byte** bound. The parent has since checked all three exact sizes: each is below this bound for 3.0.3. Keep a size-boundary compatibility case if the accepted archive contract requires it.                     |
| Code-supported prediction | Compact JSON reduces formatting overhead but still serializes retained `Buffer` values as numeric arrays. Omitting manifests from two reviewed no-request entries does not bound future successful-attempt snapshot growth.                                                                |
| Code-supported prediction | Most release jobs have no project dependency installation. Any transitive project import can fail in a fresh job despite passing locally with `node_modules`.                                                                                                                              |
| Code-supported prediction | Archive upload/download calls generally inherit `native()`’s 120-second default instead of the existing upload/collection profiles. Large transfers can fail after effects have occurred.                                                                                                  |
| Code-supported prediction | `verifyPublicRegistryArchives` performs single-shot reads; attestation readiness handles absent indexing but does not use the existing typed transient-read policy. Expected propagation or temporary failures can interrupt later phases.                                                 |
| Code-supported prediction | Each decision can fit its individual bound while combined review, acceptance, preflight, and other inputs exceed the dispatch envelope. Validate the actual serialized aggregate.                                                                                                          |
| Code-supported prediction | One-hour owner observations can expire during environment waits, retained qualification, matrix execution, or archive transfers. Rehearse existing refresh paths.                                                                                                                          |
| Code-supported prediction | The archive summary hashes `JSON.stringify(qualified)`, while history preparation requires the digest of the exact `qualification.json` file. Using the summary digest as `QUALIFICATION_SHA` can fail. Preserve historical receipt semantics; use exact file bytes for the history input. |
| External unknown          | Installed npm stage response fields, terminal status vocabulary, staged-byte inspection capabilities, and internal request retry behavior are not supplied. Inspect npm 12.2.2 locally before specifying their oracle.                                                                     |
| External unknown          | Future provider availability, trusted-publisher enforcement, owner approval, propagation, current advisories, and actual attestation indexing cannot be established offline.                                                                                                               |

The parent owns integration.
Implement the following five slices in order; each ends with a demonstrable path through production entry points.

1. **SLICE-001 — Cold native staging with original history and real package sizes**

   **Outcome:** Starting from the retained qualification and reviewed writer-17/18 evidence, fresh admission, decision, and stage workspaces reach exactly two simulated stage operations: Windows, then Linux.
   Core remains unrequested.

   **Owning files and interfaces:** `publish.yml`; `publication-history.js` and `admitStagingAttempt`; `stage-release-package.js`; `release-stage-guards.js`; `release-history.js`; `publication-artifact.js`; `publication-upload.js`; `commands.js`; the supplied baseline and documentation repair.
   Inspect `release-bytes.js`, `prepare-publication-environment.js`, `verify-publication.js`, and the workflow checker before dependent edits.

   **Selected implementation:**

   - Keep the eight-file repair.
     Exercise it through `publication-history.js --admit-attempt` followed by the actual `stage-release-package.js` executable.
   - Build proposed `test/release-entry-fixture.mjs`, `test/release-provider-fixture-hook.mjs`, and `test/release-entrypoints.test.js`.
     Adapt JSON Quality’s native-process interception pattern, with Markdown Quality’s actual argv, files, provider records, and workflow identities.
   - Launch each job with a separate checkout/workspace and explicit environment.
     Transfer only files that the workflow uploads.
     Apply `GITHUB_ENV` and `GITHUB_OUTPUT` changes at their real step boundaries.
   - Keep admission, origin planning, history collection, artifact authentication, tag verification, byte verification, and guards real.
     Do not reuse the existing fixture’s `history: async () => ({…})`, empty registry verifier, or no-op tag verifier for the full-chain claim.
   - Intercept actual external process/provider boundaries only.
     Execute local Git inspection, archive packing/extraction, and nested repository entry points normally.
     Unknown provider routes and unexpected child commands must fail.
   - Block accidental external egress.
     A hook covering `spawnSync` alone is insufficient because production code also uses `fetch` and nested Node processes.
   - Test dependency absence using the sibling resolver restriction, permitting only the selected npm installation and dependencies explicitly provisioned by that job.
     Preserve actual dependency setup where it is required; do not add installation indiscriminately to every reader.
   - Compare every frozen tarball against the 20,000,000-byte staging reader.
     If a qualified archive exceeds it, use the existing qualified-archive/payload contract at this reader, with exact digest verification.
     Do not increase global metadata, stdout, or history limits.
   - Derive `latestStageWriteAt` from authenticated relevant observations and test its freshness semantics across retained attempts and reruns.
     Missing or malformed timestamps must not silently excuse a known intervening writer.
   - Inspect the installed stage implementation’s retry behavior.
     Require no automatic replay of a mutating request; add the native `--fetch-retries=0` option if that is the supported control for this command.

   **Proof:** The original 23,612,807-byte snapshot reaches the old failing boundary in a disposable baseline replay.
   The repaired entry point reaches both stage calls, preserving the manifest and archive digests.
   A stale inventory refuses before staging; a substituted writer-18 artifact refuses before staging; a changed archive refuses before startup/journal creation.

   **Completion state:** Two original journals end in `staged-awaiting-owner`, each with its original source/run/attempt and inspectable stage ID.
   The publication artifact contains their original bytes and a native upload acknowledgment.
   There are **2 stage calls, 0 core calls, 0 owner approvals, 0 release mutations, and 0 dist-tag calls**.

2. **SLICE-002 — Owner observation, propagation, and deliberate core recovery**

   **Outcome:** The simulated owner verifies and approves the two exact native stages.
   A new core dispatch authenticates those original writers, qualifies their public bytes and provenance, and stages core exactly once.

   **Owning files and interfaces:** `publication-origins.js`; `publication-attempts.js`; `publication-artifact.js`; `release-stage-guards.js`; `publication-npm.js`; retained and stage jobs in `publish.yml`.
   Inspect `qualify-public-registry.mjs`, `wait-registry-integrity.js`, `release-staging-evidence.js`, `publication-context.js`, `consumer-toolchain.js`, and `release-labels.js`.

   **Selected implementation:**

   - Establish native npm 12.2.2 contracts from the installed CLI and its installed dependencies: stage publish output, stage list pagination, stage inspection, owner approval, terminal statuses, singleton versus object `view` output, and error serialization.
   - Represent owner approval as an explicit fixture-provider event, separate from Actions credentials.
     The staging job receives the `npm-publication` environment and OIDC context; read-only and retained jobs receive neither publishing authority nor an account-token fallback.
   - Verify each stage ID against package, version, reviewed `latest` channel, and the strongest native byte identity available.
     Compare downloaded staged bytes if the native interface provides them.
   - If stage inspection supplies only SHA-1 `shasum`, name that limitation.
     A stage ID plus a local tarball hash is not proof of remote SHA-256/SHA-512 identity.
     Inspect native capabilities before choosing the pre-approval check; do not invent an undocumented endpoint or quietly weaken “exact staged bytes.”
   - Use the new native run as `recovery-run`, not writer 17 or 18.
     Bind its exact origins-file digest.
   - Preserve native origin records and their original review digests.
     A fresh core review may refresh observations and controller binding while retaining the same channel and operation lineage.
   - Run both actual retained-qualification entry paths and the stage job’s native-only qualification.
     Only then invoke the core stage entry point.
   - Model temporary public absence, old labels, approved-but-not-yet-public stages, missing provenance, and independent package propagation.
     Retry eligible reads under one deadline; never turn absence into permission to repeat a stage operation.
   - Accept only native-supported terminal inventory states.
     An unknown status remains blocking.
     A missing stage inventory entry does not settle an earlier unknown request.

   **Proof:** The native packages retain their first producer identities through download, recovery planning, public provenance checks, and the core journal.
   An attempted native replay fails.
   Changed native bytes, origin-map digest, channel, or provenance stop before core staging.

   **Completion state:** The core map has native records `retained, retained` and one newly planned core origin.
   Core staging changes only core’s journal.
   The canonical journey has **3 cumulative stage calls in Windows → Linux → core order**, with **2 native owner approvals before core**.
   Core then requires its separate owner approval.

3. **SLICE-003 — Complete public qualification in fresh runtime jobs**

   **Outcome:** After core approval, the real registry continuation admits all three public packages and every frozen runtime lane; the public evidence collector can consume the resulting outputs.

   **Owning files and interfaces:** `release-registry.yml`; `release-continuation.js`; `verify-public-tuple.js`; `release-qualification.js`; `qualify-release-security.js`; `publication-npm.js`; `commands.js`.
   Inspect `qualification-process.js`, `qualify-public-registry.mjs`, `ci-consumer.js`, and recipient-output naming.

   **Selected implementation:**

   - Use the exact frozen matrix: **eight OS/Node lanes**, each covering root and isolated layouts.
     Read the four actual Node versions and frozen consumer npm version from the manifest; do not infer them from the current producer toolchain.
   - Preserve the reference Node/npm pair for provenance while running each consumer with its selected Node.
     Prove executable paths and npm resolution after the second `setup-node`.
   - Exercise `release-continuation.js` with the original native artifact, completed core artifact, reused qualification, signed tag, and current controller.
     Keep the reused `fresh` job skipped and the remaining qualification gates successful.
   - Run `verify-public-tuple.js` and its real child qualifier.
     Use frozen tarballs and preseeded offline dependencies for actual install/runtime checks where available.
     Mock provider reads and external verification responses only at their genuine boundaries.
   - Distinguish orchestration simulation of eight lanes from execution on eight real runtime/OS combinations.
     A Windows fixture label does not establish Linux execution.
     If the required offline Linux environment or a frozen runtime is unavailable, retain that precise gap.
   - Exercise the security qualification entry point with captured native analysis/audit shapes while preserving its actual source, lock, SARIF, and recipient validators.
     This is workflow simulation, not the deferred Codex Security review and not proof of current remote advisories.
   - Validate recipient artifact names and directory layouts against `release.runtimePolicy.platforms`; the producer and collector must agree without test-only renaming.
   - Make a failed lane produce the existing observed-defaults output, and require the final qualification gate to fail.
     Partial native `latest` changes must remain visible in that report.

   **Proof:** All eight complete reports identify all three archive digests and both layouts.
   Original candidate reports preserve their build-manifest binding in reused mode.
   Remove one lane, replace one layout with an installed-only diagnostic, omit a recipient lock, or substitute controller-source scans: each must fail at the real consumer.

   **Completion state:** All three simulated public `latest` values are 3.0.3, while `pilot` stays 3.0.1.
   Qualification performs **0 stage calls, 0 owner approvals, 0 dist-tag calls, and 0 GitHub release mutations**.

4. **SLICE-004 — Exact archival, attestation readiness, and direct latest completion**

   **Outcome:** Exact review and acceptance bytes produce an immutable archive, followed by one deliberate stable classification and read-only completion.

   **Owning files and interfaces:** `github-release.yml`; `github-release.js`; `release-assets.js`; `release-attestation.js`; `release-readback.js`; `release-decision-transport.js`; `release-acceptance.js`; `release-archive-state.js`; `commands.js`.
   Inspect `read-release-decisions.js`, `collect-release-evidence.js`, `prepare-github-release.js`, `release-immutability.js`, `release-effects.js`, and `verify-archive-completion.js`.

   **Selected implementation:**

   - Run decision reading and evidence collection as separate fresh jobs, then run the archival and completion executables from their transported outputs.
   - Validate the full dispatch envelope, including JSON escaping and all inputs.
     Keep acceptance’s `immutabilityObservation` at the top level.
     Rehearse `archivePreflight` refreshing only the permitted live observations while leaving original decision bytes and digests unchanged.
   - Use the existing compact bundle for newly assembled 3.0.3 archival evidence, if the collector does not already do so.
     This changes transport packaging only; the qualified package bytes and every logical member remain unchanged.
   - For the supplied schema-2 `latest` contract, the compact bundle contains **18 physical assets**: 16 standalone files, the evidence ZIP, and its index.
     Assert the independently enumerated set, not just its count.
     Retain existing flat-bundle compatibility.
   - Assign existing upload and collection profiles at the relevant native transfer calls.
     Test their composition with job deadlines and freshness windows.
     Do not widen `native()` defaults globally.
   - Extend exact-coordinate read resilience through existing provider interfaces.
     Preserve permanent-error and identity-mismatch refusal.
     No retry surrounds `deliverRelease`, `stageReleaseArchive`, `gh release create/upload/edit`, or owner approval.
   - Adapt the useful JSON Quality attestation distinction: readiness observation precedes one native cryptographic verification.
     Validate supported inline and remote-bundle shapes from the pinned native contract.
   - Use a same-token positive attestation control only if an existing retained subject actually provides one.
     The packet does not establish that Markdown Quality has JSON Quality’s manifest attestation.
     Without such a control, report ambiguous 404 as unconfirmed indexing/access; do not claim it proves authorization.
   - Keep tag, release ID, immutable asset inventory, and classification fixed during observation.
     Native `gh release verify` or `verify-asset` failure remains terminal for that invocation.
   - Rehearse the direct `latest` route already implemented in `deliverRelease`: draft creation, exact uploads/readback, immutable prerelease publication, attestation verification, public-family convergence, then stable/latest classification.
   - Correct the registry workflow’s stale “Stable promotion is a separate operation” summary for this route.
     No `promote-release.yml` run or npm dist-tag mutation is needed.

   **Proof:** From an absent release, the canonical compact route performs exactly **1 create, 18 uploads, 1 publish edit, and 1 classification edit**, in that order.
   Each asset is verified.
   Completion authenticates the original archive writer and adds **0 mutations**.

   Existing-draft and existing-immutable scenarios must retain their observed identities.
   A lost acknowledgment never permits repeating the corresponding request from a stale provider view.
   A lost create response without a durably established release ID remains unresolved; do not manufacture attribution from a matching tag alone.

5. **SLICE-005 — Cold retention, re-export, and final integrated proof**

   **Outcome:** The complete simulated release produces history that an independent fresh process can authenticate, consume after artifact expiry, and re-export without losing original identities or exceeding existing bounds.

   **Owning files and interfaces:** `release-history.yml`; `prepare-release-history.js`; `release-history.js`; `release-history-format.js`; `publication-artifact.js`; `release-assets.js`.
   Inspect `acquire-release-inputs.js`, `publication-subjects.js`, `release-retained-artifacts.js`, `release-archive-reader.js`, `download-evidence.js`, and the signature-policy implementation.

   **Selected implementation:**

   - Feed `prepare-release-history.js` the exact `qualification.json` bytes from the archival producer.
     Compute `QUALIFICATION_SHA` from that file, not the archive summary’s serialized-object digest.
   - Retain the existing cutover checkpoint and every earlier subject it must continue to preserve.
     Select earlier qualifications explicitly through the existing retained-target interface.
   - Exercise the real collector with the two new staging attempts, archival writer, completion reader, their artifacts, and the existing history.
     Do not replace collection with an empty writer list.
   - Preserve original signed representations.
     Compact only newly produced material under consumer-supported contracts; do not rewrite historical snapshots or drop their files merely to pass a size test.
   - Run export → process exit → authentication/read → original-artifact restoration → re-export.
     Clear fixture caches and remove live artifact availability for the cold fallback run.
   - Use real local signature verification for fixture-generated checkpoints with a test key and isolated fixture signer policy.
     Keep that separate from authentication of the actual owner-signed cutover bytes.
     If the current executable cannot select an isolated fixture policy, inspect its existing owner before choosing the fixture construction; never substitute a no-op signature verifier.
   - Do not repeat the previously denied optional live `readSignedHistoryRefs` verification by another tool, encoding, or access route.
   - Test one further no-new-effect re-export.
     Representation growth must track newly retained unique evidence, not repeatedly embed the previous complete checkpoint.

   **Proof:** All original manifest, journal, qualification, artifact, source, and tag identities survive a cold round trip.
   Artifact expiry changes acquisition location, not authority.
   Conflicting signed copies, missing original evidence, or changed artifact identities fail with **0 provider mutations**.

   Measure actual transport bytes, expanded bytes, retained file sizes, subprocess output sizes, peak memory, and scratch occupancy.
   Keep the existing **48 MiB transport / 256 MiB expanded** history limits.
   If the remaining release sequence cannot fit, the retention slice is incomplete: inspect the snapshot consumers and implement a scoped representation repair before proceeding, rather than raising limits or discarding evidence.

The fixture design should apply the sibling lessons narrowly.
JSON Quality demonstrates how to run ordinary writer entry points without project dependencies and record native process calls; it also supplies useful lost-upload, transfer-profile, native-response, and attestation cases.
Its prepared admission fixtures do not prove Markdown Quality’s admission path, so this plan must execute that path too.
OwlAPI’s pure state rehearsal supplies a useful independent vocabulary for “absent,” “matching existing publication,” and “exact-artifact reconciliation.”
Its classifier cannot establish transport, authentication, journaling, setup, or byte fidelity.
Do not import its generic tagged-version abandonment outcome: retaining this exact 3.0.3 qualification is an explicit constraint.

The mandatory fixture corpus is:

| Fixture                 | Required realism                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen qualification    | Exact 894,913-byte manifest, all three original tarballs, original reports and reused-build evidence; no miniature replacement for the final journey |
| Failed staging          | Original writer-17/18 metadata, complete job inventories, native logs and ZIP bytes where locally retained; exact artifact IDs/digests               |
| History size regression | Exact 23,612,807-byte snapshot; retained 34/45 MB snapshots where available; actual 27,321,572-byte checkpoint wire representation                   |
| Successful staging      | Actual emitted startup, journal, raw npm response, origins, review, upload-log acknowledgment, and ZIP from the previous fixture phase               |
| Provider identities     | Distinct build, release, controller, run, attempt, job, repository IDs, runner labels, artifact IDs, and original execution timestamps               |
| Runtime qualification   | Eight frozen lanes, all three packages, root and isolated layouts; retained source/build evidence and recipient lock files                           |
| Error transports        | Native `stdout`, `stderr`, exit status, signal, error code, HTTP status, and headers, rather than generic thrown messages                            |
| Interruption            | Durable state retained across a process exit and a fresh workspace; provider state can change independently of response delivery                     |

Fixture provider state must separate **request received**, **effect applied**, **acknowledgment delivered**, and **read visibility**.
Otherwise lost-response and propagation tests collapse into unrealistic success/failure toggles.

For the scenario matrix below, staging counts are logical `npm stage publish` invocations in **(Windows, Linux, core)** order.
GitHub counts are **(create, upload, publish edit, classification edit)**.
The installed CLI inspection must additionally establish each invocation’s underlying HTTP sequence; one CLI call must not be assumed to mean one HTTP request.
Counts are local to the scenario unless marked cumulative.

| Scenario                                                                                   | Expected mutation counts/order                                  | Saved state and next permitted behavior                                          |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Current repair, real history, valid native inputs                                          | Stage **(1,1,0)**; GitHub **(0,0,0,0)**                         | Both journals end `staged-awaiting-owner`; core absent                           |
| Stale inventory, changed review, wrong controller or substituted artifact                  | Stage **(0,0,0)**                                               | Admission/guard refusal; no staging intent                                       |
| Archive exceeds erroneous reader bound                                                     | Stage **(0,0,0)** before repair                                 | Regression must reach size check; repaired valid frozen archive proceeds         |
| Windows response lost after application                                                    | Stage **(1,0,0)**                                               | Windows `attempted → outcome-unknown`; Linux/core absent; replay adds **0**      |
| Windows response has wrong integrity, missing stage ID, malformed JSON, or output overflow | Stage **(1,0,0)**                                               | Raw response when available; `outcome-unknown`; replay adds **0**                |
| Linux response lost                                                                        | Stage **(1,1,0)**                                               | Windows staged, Linux unknown, core absent; recovery adds **0** until reconciled |
| Second invocation in the same workspace                                                    | Additional stage **(0,0,0)**                                    | Exclusive journal/startup creation blocks replay                                 |
| Fresh-workspace rerun after a possible prior request                                       | Additional stage **(0,0,0)**                                    | Original-attempt admission blocks replay                                         |
| Rerun after authenticated wholly skipped request steps                                     | Initially **(0,0,0)**                                           | Only never-attempted planned origins may rebind; retain original inventories     |
| Missing/ambiguous modern upload acknowledgment                                             | Additional stage **(0,0,0)**                                    | No namesake artifact fallback                                                    |
| Original artifact 404/410 with exact signed fallback                                       | Additional stage **(0,0,0)**                                    | Restore exact original files and identity                                        |
| Artifact 403, digest mismatch, or conflicting signed fallback                              | Additional stage **(0,0,0)**                                    | Fail; absence/recovery classification forbidden                                  |
| Owner approves both natives; public data lags then converges                               | Owner approvals **2**; stage **(0,0,1)** only after convergence | Original native origins retained; new core journal                               |
| Native stage pending, rejected, unknown-status, or public bytes/provenance differ          | Core **0**                                                      | Retained/native qualification refuses                                            |
| Valid core approval and complete registry qualification                                    | Owner approval **1**; all workflow mutations **0**              | Eight complete reports and current-observation outputs                           |
| One runtime/layout/security-evidence lane fails                                            | All workflow mutations **0**                                    | Qualification fails; actual defaults reported; no archival handoff               |
| Fresh compact archive                                                                      | GitHub **(1,18,1,1)**                                           | Draft → verified draft → immutable prerelease → immutable stable/latest          |
| Draft already contains seven exact compact assets                                          | GitHub **(0,11,1,1)**                                           | Upload only missing assets; preserve draft ID                                    |
| Draft readback differs                                                                     | GitHub **(1,18,0,0)** from empty start                          | Draft retained; no publication or success seal                                   |
| Existing immutable prerelease, fully verified                                              | GitHub **(0,0,0,1)**                                            | Classify once after public-family convergence                                    |
| Existing immutable stable release                                                          | GitHub **(0,0,0,0)**                                            | Verification/completion only                                                     |
| Create applied, acknowledgment lost                                                        | GitHub **(1,0,0,0)**                                            | Unknown effect; no automatic second create                                       |
| First upload applied, acknowledgment lost                                                  | GitHub **(1,1,0,0)**                                            | Unknown upload; exact readback/reconciliation before continuation                |
| Publication applied, attestation indexing delayed                                          | GitHub **(1,18,1,0)** while waiting                             | Immutable prerelease retained; read-only observation                             |
| Attestation becomes ready                                                                  | Additional GitHub **(0,0,0,1)** after native verification       | Native verification once, then classification                                    |
| Attestation 403, malformed inventory, verification failure, or indexing deadline           | Classification **0**                                            | No success seal; preserve immutable release and journal                          |
| Classification applied, acknowledgment/readback lost                                       | GitHub **(0,0,0,1)**                                            | Unknown/unconfirmed classification; read-only recovery adds **0**                |
| npm/GitHub third value or controller changes between effects                               | No mutation after the changed prefix                            | Existing journals remain intact; no baseline refresh by inference                |
| Read-only 429/502 or identified rate-limit 403                                             | Mutations **0** during retry                                    | Shared deadline and bounded reads; terminal refusal on exhaustion                |
| Permission 403, invalid JSON, or identity mismatch                                         | Retry count **0**                                               | Immediate refusal                                                                |
| History preparation, cold restoration, re-export                                           | Provider mutations **0**                                        | Complete checkpoint or explicit incomplete result; originals unchanged           |

For every successful full journey, npm dist-tag calls are **0**.
The simulated owner performs exactly **3 approvals**.
Publication under `--tag=latest` supplies the npm label changes; GitHub archival supplies final GitHub classification.

Negative controls must demonstrate sensitivity, not merely add passing cases.
In disposable copies, replay the prior 16 MiB staging-history read; omit one runtime lane; permit a changed artifact digest; remove the durable intent before staging; replace retained native origins with the core controller; allow a repeated acknowledged write; or classify before public-family convergence.
Each selected control must fail at its intended behavioral assertion.
A broken import, syntax error, missing fixture, or unexecuted test is not acceptable evidence.

The command surface can stay small.
These existing test paths are supplied:

```powershell
node --test test/release-staging.test.js test/release-controls.test.js test/release-continuation.test.js
node --test test/github-release.test.js test/release-controller.test.js
npm run check:source
```

These are proposed test paths, not existing commands claimed to have passed:

```powershell
node --test --test-concurrency=1 test/release-entrypoints.test.js
node --test --test-concurrency=1 test/release-history-roundtrip.test.js
```

The entry-point harness should invoke the following existing executables inside its isolated provider environment, never directly against live services:

```text
node scripts/publication-history.js --admit-attempt frozen-release
node scripts/stage-release-package.js win32-x64 frozen-release staging-journal
node scripts/stage-release-package.js linux-x64 frozen-release staging-journal
node scripts/publication-artifact.js RUN ATTEMPT previous-publication provider
node scripts/stage-release-package.js core frozen-release staging-journal
node scripts/release-continuation.js frozen-release previous-stage stage-provider
node scripts/verify-public-tuple.js frozen-release registry-qualification.json
node scripts/qualify-release-security.js frozen-release release-security
node scripts/read-release-decisions.js release-decisions
node scripts/collect-release-evidence.js archive-inputs
node scripts/github-release.js archive-inputs/qualification.json archive-inputs/bundle archive-journal
node scripts/verify-archive-completion.js archive-inputs archive-journal archive-completion
node scripts/prepare-release-history.js archive-inputs release-history
```

Use the exact retained-only and native-only qualifier argv already declared in `publish.yml`.
Inspect `package.json` and the maintained workflow checker before adding final repository commands; the packet does not establish their full verification entry point.

The resource proof must follow producer bytes through their consumers.
It should cover Buffer-to-JSON expansion, base64 expansion, decompression, repeated artifact acquisition, archive extraction, retained-file copying, and stdout capture.
Specifically test the 8 MiB npm and 64 MiB native process buffers, the 16 MiB generic JSON reader, the 64 MiB publication-artifact download bound, the 512 MiB payload policy, and history’s 48/256 MiB bounds at the actual callers that use them.
The 163 MB qualification ZIP must not accidentally travel through the publication-artifact limit.

Do not place binary payloads or entire history snapshots in test subprocess stdout.
Keep them in bounded files, emit compact diagnostics, and record which boundary failed.
Authenticate immutable checkpoint bytes once per appropriate invocation where existing interfaces allow reuse; refresh mutable provider observations at effect boundaries.
No cache may survive a new writer or hide changed preimages.

Before dependent implementation, the parent needs these concrete local inspections:

- Exact current diff and repository instructions, preserving the uncommitted repair.
- Individual frozen tarball sizes and locally retained source-packet artifacts.
- Installed npm 12.2.2 stage implementation and dependencies, including byte-inspection and retry contracts.
- Transitive imports and setup requirements for every remaining job, plus local upload helpers and composite actions.
- `publication-subjects.js` and all staging-history readers before any additional snapshot compaction.
- Artifact download/extraction limits and exact acquisition behavior for the 163,600,940-byte producer ZIP.
- Native error/header handling in `github-evidence.js`, registry readers, and absence checks.
- Exact eight-lane runtime policy, recipient path conventions, and available offline Windows/Linux runtimes and caches.
- The collector’s compact-bundle path, exact qualification-file digest source, archive completion authentication, and history acquisition path.
- Signature-policy selection for real offline checkpoint verification, and whether an existing same-token attestation control subject exists.

These inspections do not include another live attempt to verify the selected signed-history ref.

Final readiness evidence should be the actual test results and retained fixture outputs: one clean complete journey, the specified interruption branches, meaningful negative controls, measured resource use, and cold re-export.
Reuse the successful original qualification for unchanged package bytes; do not rebuild packages to make the fixture convenient.
After final implementation checks and the local implementation commit, perform the required separate Review Agent and Codex Security reviews.
Repair material findings and rerun affected checks before reporting readiness.

Offline success still cannot guarantee future provider state or owner approval.
A later permanent refusal, changed identity, missing evidence, or unresolved write outcome calls for preserving state and reconciliation.
It does not justify moving tags, replacing 3.0.3 bytes, or restarting live discovery.

The first implementation increment is deliberately short:

1. Preserve the current repair and locate the exact frozen archives plus writer-18 evidence locally.
2. Inspect individual tarball sizes, npm’s native stage contract, and the staging entry point’s dependency closure.
3. Add one cold entry-point fixture with the real 23,612,807-byte history and exact frozen manifest/packages.
4. Demonstrate the old history failure, then reach Windows and Linux staging exactly once with the repair; add stale-inventory and lost-acknowledgment controls.
5. Carry those emitted artifacts into the core-continuation slice instead of generating another synthetic successful admission.

## Hosted scheduler correction, 17 November 2026

Public qualification run `43969567116/1` passed all eleven jobs for the original 3.0.3 package tuple.
Archival run `43971573004/1` then authenticated its decisions and prepared its evidence successfully, but GitHub skipped both `archive` and completion without starting a runner or executing any writer step.
The overall run still reported success.
The unused `legacy-decisions` branch was skipped, and the downstream jobs relied on implicit status checks.
The earlier cold CLI journey did not model this hosted scheduler behavior.

[GitHub documents skip propagation through a dependency chain](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs) and recommends an explicit status function to override the default.
For a publication job, use [the cancellation-aware `!cancelled()` condition](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows) together with successful preparation.
Apply that condition to the writer and completion, preserving their original dependencies and permissions.
Completion must independently require a successful writer before downloading its journal; a skipped or failed writer must not produce a successful release run.

The regression oracle is the actual original run's empty skipped-writer inventory, not its green aggregate conclusion.
Workflow mutation checks must reject implicit status checks, a writer without successful preparation, and an omitted completion assertion.
Execute the completion step's actual native Node program with successful, skipped, failed and cancelled writer results; only success may pass.
Retain the successful public qualification instead of running its matrix again.
After landing and reviewing this controller correction, reserve a new archival run and retain the earlier signed reservation and original skipped-run evidence unchanged.
