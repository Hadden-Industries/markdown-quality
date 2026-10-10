# Centralized producer contracts

These development contracts implement the producer portions of the centralization plan.
They are separate from published `1.0.3`, hosted qualification, and consumer adoption acceptance.
The latest producer commit can be adopted after its exact transported tuple is qualified; npm publication and a new release are not prerequisites.

## Logical documents and bounded invocation

```javascript
import {
  processDocument,
  executeQuality,
  validateQualityResult,
} from "@hadden-industries/markdown-quality";

const result = await processDocument({
  root: repositoryRoot,
  path: "docs/generated.md",
  requestId: "generation-42",
  content: Buffer.from(generatedContent),
});
validateQualityResult(result, { requestId: "generation-42" });
const formatted = Buffer.from(result.document.contentBase64, "base64");
```

`processDocument` uses the same policy, linting, formatting, preservation and link analyzer as `runQuality`.
The supplied path is the final canonical repository-relative path.
The file need not exist; relative links resolve from that path against the actual repository root.
No checkout file is written.
Excluded content is returned exactly, including invalid UTF-8 and original line endings.
Selected content must satisfy UTF-8 and the selected input limits.
Failure retains original content and prevents the caller from treating returned bytes as admitted output.
`unchanged` records checkout write admission, including a successfully processed logical document; returned content can differ.

`markdown-quality document --root PATH --json` reads one JSON object from standard input with `path`, optional `requestId`, and canonical `contentBase64`.
Its request framing is bounded to 8 MiB.
It returns the same result schema 3 and never renames a generated file into an unrelated basename.
Non-JavaScript callers own framing, request correlation and domain freshness, then write only admitted bytes.

`runQuality`, `inspectSelection` and `processDocument` analyze in the current process.
`executeQuality(request, bounds)` invokes the installed analyzer in a fresh Node process with sanitized environment, finite request/report/deadline/heap bounds and optional `AbortSignal`.
Its logical request replaces Buffer content with `document: { path, requestId, contentBase64 }`.
Providing malformed logical content fails before dispatch; it never becomes a checkout operation.
This bounded transport supports read-only checking/inspection and logical supplied-content formatting.
Checkout formatting uses `runQuality` and the CLI `format` command in the caller process, retaining guarded actual partial-replacement reports without a killable transport guessing which writes occurred.
Default bounds are 8 MiB request/report, 180 seconds and 256 MiB Node old space.
No credentials, PATH, Node injection, npm configuration or GitHub/OIDC variables reach that checker.
CLI checking, inspection and logical documents use this same transport.
`--execution-profile PATH` selects its finite controls and analyzer limits from the same execution schema; it requires the actual Node version and cannot combine with `--no-limits` or checkout formatting.
The profile's Python declaration is enforced when qualification launches the observer.
CLI SIGINT/SIGTERM cancellation aborts the checker and waits for cleanup before reporting failure on hosts delivering those signals.
Force termination of checkout formatting can interrupt writes without a final report; no empty replacement receipt is fabricated.
Cancellation and overflow terminate the owned process tree; cleanup failures remain failures.
Qualification uses an observer-owned process group so all descendants remain observable.

`validateQualityResult` validates the installed schema and semantic consistency: package/request/exit identity, diagnostic scope, unique processing/accounting, severity/outcome/admission, inventory decisions and no writes for read-only or logical operations.
All four installed tool-version keys are required and independently checked against package/native metadata in producer tests.
An unavailable installed version identity prevents a complete result; the CLI emits a named stderr failure and operational exit 2 rather than fabricated version keys.
Advisory findings can coexist with successful exit.
It does not authenticate caller-supplied reports or confer acceptance.

## One trusted execution profile

`readExecutionProfile({ root, profile })` reads `.markdown-quality-execution.json` by default.
The supported `execution-schema` export describes schema 1.
Both local qualification and the reusable workflow use this reader.

```json
{
  "schemaVersion": 1,
  "samples": 6,
  "checkerMs": 30000,
  "windowMs": 180000,
  "memoryBytes": 536870912,
  "nodeOldSpaceMb": 256,
  "requestBytes": 8388608,
  "reportBytes": 16777216,
  "stagingBytes": 134217728,
  "stagingEntries": 100000,
  "limits": { "documentDiagnostics": 10000 },
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

All numeric controls are finite positive safe integers; samples are limited to 100.
The reader merges omitted analyzer limits with package defaults and makes that resolved object authoritative over policy limits.
`false` and `null` bypasses are rejected at qualification.
Runtime declarations are contained regular files bounded to 64 KiB.
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

`stageCandidate({ sourceRoot, trustedRoot, outputRoot, profile, config })` requires disjoint real roots and a fresh staging destination.
It validates trusted policy/profile first, then preflights entries, bytes, links, hard links and reserved-path collisions before copying.
Only Git/dependency/virtual-environment/workflow operational directories are omitted; authored `.sdlc` content remains data.
The trusted policy is overlaid byte-for-byte under `.markdown-quality-trusted-inputs/policy.json`.
Every staged path and byte, including non-Markdown link targets, contributes to a streamed identity.
Candidate JavaScript/configuration/dependencies are never executed.
Failed staging can leave owned partial data; retain it as failure evidence and clean it only after its consumers finish.
Full CLI/API requests inside a Git checkout automatically reconcile tracked Markdown within their consumer root, including paths below operational directories skipped by filesystem discovery.
Root discovery happens before host Git binding and profile resolution; both in-process and bounded operations resolve absolute host Git outside consumer inputs.
Selected unsafe tracked content fails explicitly; root exclusions can explain it.
Non-Git data roots use filesystem discovery and can supply a bounded immutable inventory; qualification always supplies the verified commit inventory.
Explicit file requests remain their explicitly chosen scope.
Missing selected members fail with `MISSING_DOCUMENT` and their canonical relative path.
Excluded directory names still consume the finite discovery entry budget; their bytes are never read for omission accounting.

`qualifyCandidate` requires full candidate/trusted commits, absolute native host Git/Python executables, the trusted profile, a locked producer archive tuple and an external fresh output directory.
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
Every receipt binds source/tree/data, policy, resolved profile, lock/archive/native identities, installed runtimes and the complete result.
The returned window keeps bounded sample metrics and relative receipt paths/hashes; complete sample receipts remain in the selected output directory.
The required sample count and nearest-rank observed p95 derive from the same profile; this window is not population tail assurance.

## Reusable workflow and qualification boundaries

Call `.github/workflows/markdown-quality.yml` at the full SHA of the qualified producer revision.
It accepts trusted/candidate repository and full SHA inputs plus the profile path.
Its immutable actions acquire separate trusted/candidate checkouts without persisted credentials.
The producer-owned bootstrap reader supplies the exact Node/Python values to setup actions; callers do not duplicate budgets in workflow inputs.
The trusted toolchain must already contain the latest-commit artifact tuple paired with that called workflow SHA.
The workflow uses GitHub's `job.workflow_*` fields for its own repository/ref/SHA and retains caller identity separately.
These fields are documented for GitHub.com and are unavailable on GitHub Enterprise Server; an unavailable identity fails closed.
See GitHub's [job context documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context) for the workflow identity and check-run fields.
The checker receives no repository-write, registry or OIDC credentials.
Both Windows and Linux jobs retain attributable receipts and failures.

### Compact hosted artifacts

Fresh staging and the local qualifier output remain unchanged.
After observation, the producer projects evidence into a separate upload directory.
Successful projections retain original request/window/receipt/stdout/stderr bytes and an `artifact-index.json` (schema1).
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
Restore candidate data excluding operational directories under the staging contract, add the trusted policy at `.markdown-quality-trusted-inputs/policy.json`, and restore listed directories.
Compare the entire path/type/size/hash inventory without extras, then recompute the original staged digest.
Hidden paths are represented inside ordinary JSON files; upload-artifact's hidden-file exclusion cannot remove those manifest entries.
Verify the downloaded artifact against GitHub's reported artifact digest and every indexed file hash.
Losing the Git objects or archives can prevent reconstruction; retain selected source bundles separately where long-term offline reproduction is required.

Routine successful uploads expire after7 days; failed jobs after14 days.
The optional Boolean `qualification-evidence` workflow input retains selected qualification evidence for30 days.
It changes retention only, never scope, limits, sample count or execution.
Existing artifacts retain their original expiry.
Logs and receipts still contain attributable runtime paths and data diagnostics; compact packaging is not a redaction gate.

Hosted positive/negative runs and owner acceptance remain separate from source tests.
The working implementation does not prove either supported OS's complete hosted trust path until that exact commit/tuple is run there.
Consumers must review their root-policy translations and bootstrap trust inputs before cutover.
No consumer caller, governance fingerprint, lock or document changes are authorized by producer implementation alone.

The retained performance oracle still requires the independently frozen producer at `763984e94f2122a949d2ad6f9bce5da9791015e8` to reproduce its complete old report hash.
Schema 2 root policies in maintained producer fixtures explicitly reproduce each frozen corpus's former scope.
Current reports must then match every incumbent finding, selected path, exit and outcome across six samples.
The original oracle is preserved, including its source identity; it is not regenerated from the changed implementation.

The observer reuses native Job/group mechanisms previously maintained by the AGPL OwlAPI integration and this producer's performance tooling.
The maintained shared implementation remains AGPL-3.0-only; consumer copies are migration targets, not shared runtime fallbacks.
