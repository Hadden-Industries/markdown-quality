# Centralized producer contracts

These development contracts implement the producer portions of the centralization plan.
They are separate from published `1.0.3`, hosted qualification, and consumer adoption acceptance.
The latest producer commit can be adopted after its exact transported tuple is qualified; npm publication and a new release are not prerequisites.

## Current source compatibility

| Contract                | Version |
| ----------------------- | ------- |
| Configuration           | 3       |
| Effective configuration | 3       |
| Result                  | 4       |
| Execution               | 2       |
| Comparison              | 3       |

Current configuration admission rejects schemas 1 and 2 with migration guidance; omitted markers select the installed contract.
Every package resource ceiling is overridable and `null` disables one; configuration `analyzerLimits: false` removes only analyzer ceilings.
`resourceLimitMode: "unlimited"` in an execution profile, or `--resource-limit-mode unlimited`, removes every package ceiling, including bootstrap reads.
Unlimited mode cannot remove Node/V8, operating-system or hosted-provider limits and makes no speed claim.
Each shipped schema compiles independently without a sibling schema registry.
Historical release evidence retains the versions and behavior actually shipped by that release.

## Logical documents and bounded invocation

```javascript
import {
  processLogicalDocument,
  executeQualityRequest,
  validateQualityResult,
} from "@hadden-industries/markdown-quality";

const result = await processLogicalDocument({
  root: repositoryRoot,
  path: "docs/generated.md",
  requestId: "generation-42",
  content: Buffer.from(generatedContent),
});
validateQualityResult(result, { requestId: "generation-42" });
const formatted = Buffer.from(result.document.contentBase64, "base64");
```

`processLogicalDocument` uses the same policy, linting, formatting, preservation and link analyzer as `runQuality`.
The supplied path is the final canonical repository-relative path.
The file need not exist; relative links resolve from that path against the actual repository root.
No checkout file is written, and `writtenPaths` stays empty.
Excluded content is returned exactly, including invalid UTF-8 and original line endings.
Selected content must satisfy UTF-8 and the selected input limits.
Failure retains original content and prevents the caller from treating returned bytes as admitted output.

`markdown-quality format --stdin-request --root PATH --json` reads one JSON object from standard input with `path`, optional `requestId`, and canonical `contentBase64`.
Its request framing is bounded by the effective `maxRequestBytes` (8 MiB by default), resolved from the execution profile and invocation before standard input is read.
It returns the same result schema 4 and never renames a generated file into an unrelated basename.
Non-JavaScript callers own framing, request correlation and domain freshness, then write only admitted bytes.

`runQuality`, `inspectSelection` and `processLogicalDocument` analyze in the current process.
`executeQualityRequest(request, options)` invokes the installed analyzer in a fresh Node process with sanitized environment, resolved request/output/deadline/heap ceilings and optional `AbortSignal`.
Its logical request replaces Buffer content with `document: { path, requestId, contentBase64 }`.
Providing malformed logical content fails before dispatch; it never becomes a checkout operation.
This bounded transport supports read-only checking/inspection and logical supplied-content formatting.
Checkout formatting uses `runQuality` and the CLI `format` command in the caller process, retaining guarded actual partial-replacement reports without a killable transport guessing which writes occurred.
Default ceilings are 8 MiB request and output (`maxRequestBytes`, `maxOutputBytes`), 180 seconds (`executionTimeoutMs`) and 256 MiB Node old generation (`maxNodeOldGenerationMiB`); each accepts `null`.
No credentials, PATH, Node injection, npm configuration or GitHub/OIDC variables reach that checker.
CLI checking, inspection and logical documents use this same transport.
`--execution-profile PATH` selects its controls and analyzer limits from the same execution schema.
The profile's Python declaration is enforced when qualification launches the observer.
CLI SIGINT/SIGTERM cancellation aborts the checker and waits for cleanup before reporting failure on hosts delivering those signals.
Force termination of checkout formatting can interrupt writes without a final report; no empty replacement receipt is fabricated.
Cancellation and overflow terminate the owned process tree; cleanup failures remain failures.
Qualification uses an observer-owned process group so all descendants remain observable.

`validateQualityResult` validates the installed schema and semantic consistency: package/request/exit identity, diagnostic scope, unique per-document accounting, status/write agreement, selection decisions and no writes for read-only or logical operations.
`operationStatus` is `completed`, `previewed`, `refused` or `failed`; `qualityStatus` is `clean`, `findings`, `incomplete` or `not-checked`.
`qualityBasis` names whether findings describe the `input`, a previewed `candidate` or `applied` content.
Each `documentResults` entry records its `analysisStatus` and `writeStatus`, and `writtenPaths` lists every replaced file.
`admitCheckEvidence` additionally requires a completed read-only `check` of the input.
Only complete checks are quality evidence; a successful repair, preview or inspection never substitutes for one.
Provenance binds `configurationOrigin`, `configurationBytesSha256`, `defaultConfigurationSha256`, `policyResolverInputsSha256` and `effectiveConfigurationSha256`, with the resolved `resourcePolicy` and `runtime` identity.
All four installed tool-version keys are required and independently checked against package/native metadata in producer tests.
An unavailable installed version identity prevents a complete result; the CLI emits a named stderr failure and operational exit 2 rather than fabricated version keys.
Non-blocking findings can coexist with successful exit.
It does not authenticate caller-supplied reports or confer acceptance.

## One trusted execution profile

`readExecutionProfile({ root, profile })` reads `.markdown-quality-execution.json` at the root by default.
The supported `execution-schema` export describes schema 2.
Ordinary profiles are sparse: every key is optional, and an absent default file keeps the package defaults.
An explicit missing profile, or a present malformed, linked or incompatible one, fails.
`markdown-quality inspect-profile` resolves the selected profile without running analysis.
Both local qualification and the reusable workflow use this reader.

```json
{
  "schemaVersion": 2,
  "requiredConsecutiveSamples": 6,
  "executionTimeoutMs": 30000,
  "sampleTimeoutMs": 180000,
  "maxObservedMemoryBytes": 536870912,
  "maxNodeOldGenerationMiB": 256,
  "maxRequestBytes": 8388608,
  "maxOutputBytes": 16777216,
  "maxStagedDataBytes": 134217728,
  "maxStagedEntries": 100000,
  "analyzerLimits": { "maxDocumentDiagnostics": 10000 },
  "runtimes": {
    "node": { "file": ".node-version" },
    "python": { "file": ".python-version" }
  },
  "toolchain": {
    "lockFile": "tooling/markdown/package-lock.json",
    "coreArchive": "tooling/markdown/archives/core.tgz",
    "nativeArchives": {
      "win32-x64": "tooling/markdown/archives/windows.tgz",
      "linux-x64": "tooling/markdown/archives/linux.tgz"
    }
  }
}
```

Qualification requires a trusted profile file with `requiredConsecutiveSamples` and `runtimes`.
It also requires explicit `sampleTimeoutMs`, `maxObservedMemoryBytes`, `maxStagedDataBytes` and `maxStagedEntries`, each a positive integer or `null`; these have no ordinary package default.
`requiredConsecutiveSamples` cannot exceed `maxQualificationSamples` (100 by default) unless that ceiling is `null`.
`resourceLimitMode` is `configured` by default; `unlimited` removes every package ceiling and is recorded in the resolved policy.
Resolution precedence is package defaults, configuration `analyzerLimits`, the execution profile, then invocation flags.
The profile itself is read under the bootstrap `maxProfileBytes` ceiling (64 KiB); `--max-profile-bytes N` or unlimited mode sets it before the profile is read.
Runtime declarations are contained regular files bounded by `maxRuntimeDeclarationBytes` (64 KiB).
Text declares an exact version; Node requires all three version components.
A reference can instead provide `pointer: "/runtime/node"` into bounded JSON, using JSON Pointer unescaping and own properties.
No shell expansion or executable resolver is supported.
The profile and each runtime declaration are hashed; installed Node/Python must match their declared versions.
Python major/minor references accept the installed patch in that line.

The qualification toolchain binds a committed trusted lock and retained core/native archives inside the trusted root.
The archives must match the requested SHA-256 values and the lock's SHA-512 integrities and versions.
Install only that reviewed trusted graph, with lifecycle scripts disabled, before calling qualification.
The installed core must carry a clean full source identity generated during packing and match the paired producer workflow revision.
The manifest version cannot replace this source identity.

## Trusted staging and observation

`stageCandidateData({ candidateRoot, trustedRoot, outputRoot, profile, config })` requires disjoint real roots and a fresh staging destination.
It validates the trusted qualification profile and policy first, then preflights entries, bytes, links, hard links and reserved-path collisions before copying.
Trusted absence of a configuration resolves package defaults in the trusted checkout, never in the candidate.
Only Git/dependency/virtual-environment/workflow operational directories are omitted; authored `.sdlc` content remains data.
The effective trusted policy is written as an owned snapshot under `.markdown-quality-trusted-inputs/policy.json`.
The result binds the policy's `configurationSource` separately from the snapshot bytes, recorded as `trustedConfigurationSnapshotSha256`.
`candidateEntryCount` and `candidateFileBytes` count the candidate population before the overlay; `stagedDataSha256` covers the staged result including it.
Every staged path and byte, including non-Markdown link targets, contributes to a streamed identity.
Candidate JavaScript/configuration/dependencies are never executed.
Failed staging can leave owned partial data; retain it as failure evidence and clean it only after its consumers finish.
Full CLI/API requests with `--reconcile-inventory git` reconcile tracked Markdown within their consumer root, including paths below operational directories skipped by filesystem discovery.
Root discovery happens before host Git binding and profile resolution; both in-process and bounded operations resolve absolute host Git outside consumer inputs.
Selected unsafe tracked content fails explicitly; root exclusions can explain it.
Non-Git data roots use filesystem discovery; qualification always supplies the verified commit inventory.
Explicit file requests remain their explicitly chosen scope.
Missing selected members fail with `MISSING_DOCUMENT` and their canonical relative path.
Excluded directory names still consume the finite discovery entry budget; their bytes are never read for omission accounting.

`qualifyGitMarkdown` requires full `candidateCommitId`/`trustedCommitId` values, absolute native `gitExecutablePath`/`pythonExecutablePath`, the trusted profile, a locked producer archive tuple and an external fresh `outputRoot`.
It verifies regular committed file bytes through metadata-only Git reads and native Git blob hashes, without status/diff filters or hooks.
Non-operational untracked data and altered committed bytes fail.
Fresh sample staging supplies complete tracked Markdown inventory to the canonical full check.
Before/after staged and checkout identities must remain identical.
The installed observer is resolved by the package; callers never copy or select a different observer.

Windows records cumulative Job peak committed bytes including the Python driver and requires zero active descendants.
Linux samples dedicated process-group `smaps_rollup` RSS every 50 ms plus scan overhead, excludes the Python observer and counts shared pages per process.
These are different metrics; Linux can miss short-lived peaks.
Timeouts, memory/report overflow, incomplete descendants and observer failures do not produce successful receipts.
Failure evidence records cleanup state before Windows Job abort or owned Linux group cleanup.
Every receipt (schema 2) binds candidate/trusted checkout identity, staging, producer/workflow identity, the host, the Git executable hash and the complete result.
The returned window (schema 2) keeps bounded sample metrics and relative receipt paths/hashes; complete sample receipts remain in the selected output directory.
Each sample records `checkerElapsedMs`, `peakObservedMemoryBytes` and `observationPollCount`; the window records `pythonVersionDetails` and its `resourceLimitMode`.
`maxObservedCheckDurationMs` is the maximum checker duration across all required samples, not a P95 or population tail assurance.

## Reusable workflow and qualification boundaries

Call `.github/workflows/markdown-quality.yml` at the full commit ID of the qualified producer revision.
It accepts `trusted-repository`, `trusted-commit-id`, `candidate-repository`, `candidate-commit-id` and `profile` inputs.
Its immutable actions acquire separate trusted/candidate checkouts without persisted credentials.
The caller grants `contents: read` and `actions: read` and configures the `markdown-quality-trusted-qualification` environment with required owner reviewers and administrator bypass disabled.
The request job shows the exact trusted repository/commit/profile, candidate identity and paired producer before either platform job can start.
The reviewer must inspect the profile's locked core/native archive graph: approval authorizes executing that trusted graph, while candidate content remains data only.
The driver checks the live protection rules and this run's native approval history before acquisition/import; a missing or automatically created unprotected environment fails closed.
Each caller repository owns its reviewers; the environment supplies no publication authority and needs no secrets.
The producer-owned bootstrap reader supplies the exact Node/Python values to setup actions; callers do not duplicate budgets in workflow inputs.
The trusted toolchain must already contain the latest-commit artifact tuple paired with that called workflow commit.
The workflow uses GitHub's `job.workflow_*` fields for its own repository/ref/commit and retains caller identity separately.
These fields are documented for GitHub.com and are unavailable on GitHub Enterprise Server; an unavailable identity fails closed.
See GitHub's [job context documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context) for the workflow identity and check-run fields.
The checker receives no repository-write, registry or OIDC credentials.
Both Windows and Linux jobs retain attributable receipts and failures.

### Compact hosted artifacts

Current directory bundles are uploaded as `shared-markdown-<os>-<attempt>.zip` through the native Actions SDK.
The `.zip` suffix preserves native downloader extraction and the existing `artifact-index.json` layout.
Consumers adopting this workflow revision must select the suffixed artifact name; previously pinned workflow commits retain their original artifact names.

Fresh staging and the local qualifier output remain unchanged.
After observation, the producer projects evidence from its `evidenceRoot` into a separate fresh upload directory.
The trusted caller supplies `maxEvidenceInputBytes` (64 MiB by default) and `maxUnboundEvidenceSamples` (1,000 by default) before any artifact is read; `null` disables either, and artifact contents cannot authorize their own admission.
Successful projections retain original request/window/receipt/stdout/stderr bytes and an `artifact-index.json` (schema 2).
The index lists file sizes/SHA256 hashes and sample-to-manifest references.
Complete manifests under `manifests/<stagedDataSha256>.json` list every staged file's path, size and SHA256, plus directories, including hidden paths and empty directories.
Identical staged identities share one manifest per job; raw stages, source trees and native package archives are not uploaded.
Successful projections require complete sample evidence, original receipt hashes and exact staged/profile identities.
Failed/incomplete windows retain diagnostics and explicitly incomplete sample records.
Oversized failed receipts or logs retain a bounded prefix marked `truncated`, with `originalSize`; its recorded size and hash cover only the retained prefix.
Unsafe or unavailable failed reports are identified as problems rather than complete evidence.
Failures before the qualifier creates evidence, or unreadable request/window reports, remain attributable through the GitHub job log; a compact artifact may be unavailable.
Manifest and index files must fit the trusted report bound; exceeding it fails packaging even if checking succeeded.

These are integrity inventories, not source archives or independent attestations.
For reproduction, acquire the exact candidate/trusted Git objects and locked package archives named in the unchanged receipts.
Restore candidate data excluding operational directories under the staging contract, add the trusted policy snapshot at `.markdown-quality-trusted-inputs/policy.json`, and restore listed directories.
Compare the entire path/type/size/hash inventory without extras, then recompute the original staged digest.
Hidden paths are represented inside ordinary JSON files; upload-artifact's hidden-file exclusion cannot remove those manifest entries.
Verify the downloaded artifact against GitHub's reported artifact digest and every indexed file hash.
Losing the Git objects or archives can prevent reconstruction; retain selected source bundles separately where long-term offline reproduction is required.

Routine successful uploads expire after 7 days; failed jobs after 14 days.
The optional Boolean `retain-qualification-evidence` workflow input retains selected qualification evidence for 30 days.
It changes retention only, never scope, limits, sample count or execution.
Existing artifacts retain their original expiry.
Logs and receipts still contain attributable runtime paths and data diagnostics; compact packaging is not a redaction gate.

Hosted positive/negative runs and owner acceptance remain separate from source tests.
The working implementation does not prove either supported OS's complete hosted trust path until that exact commit/tuple is run there.
Consumers must review their root-policy translations and bootstrap trust inputs before cutover.
No consumer caller, governance fingerprint, lock or document changes are authorized by producer implementation alone.

## Report comparison

`compareCheckReports` (schema exported as `./comparison-schema`) compares an incumbent and a candidate check report of schemas 1 through 4.
Both must describe identical input manifests, selection mode and selected paths.
Each side records `reportSchemaVersion`, `selectionSha256`, `configurationBytesSha256`, `effectiveConfigurationSha256` (`null` before result schema 4) and `inputManifestSha256`.
The comparison (schema 3) reports `added`, `resolved`, `retained`, `messageChanges` and `formattingDriftPaths`.
The maintainer harness `scripts/compare-check-reports.js` reads inputs under `maxComparisonInputBytes` (8 MiB by default); `--max-comparison-input-bytes N` changes it and `--no-input-size-limit` removes it.

The retained performance oracle still requires the independently frozen producer at `763984e94f2122a949d2ad6f9bce5da9791015e8` to reproduce its complete old report hash.
Maintained producer fixtures translate each frozen corpus's schema 2 root policy into schema 3 input with explicit `authored-gfm@1` severity overrides, so the frozen incumbents are compared like-for-like.
Current reports must then match every incumbent finding, selected path, exit and status across six samples.
The original oracle is preserved, including its source identity; it is not regenerated from the changed implementation.

The observer reuses native Job/group mechanisms previously maintained by the AGPL OwlAPI integration and this producer's performance tooling.
The maintained shared implementation remains AGPL-3.0-only; consumer copies are migration targets, not shared runtime fallbacks.
