# CLI community alignment implementation plan

Date: 5 November 2026, Europe/Bucharest.
Status: proposed design for review; this document does not authorize implementation or release.
Baseline: `951ce9c9a671a499272f8ce399276f78a8aa3d6b` on `main`, with a clean working tree at authoring start.
Authoring model: GPT-6 Astra at Max, as requested.

## Outcome and scope

Make Markdown Quality straightforward to discover, preview, use from editors and compose in shell pipelines, while preserving its Markdown policy, literal selection, bounded execution and truthful repair reports.
Recommend one coherent next major release for the incompatible CLI and result changes, with a precise classification of features that could instead ship compatibly.
This is a tailored counterpart to the [JSON Quality CLI plan](https://github.com/Hadden-Industries/json-quality/blob/619f259f01bb21012343e30b2e6507d9e972e669/docs/plans/2026-11-05-cli-community-alignment-implementation-plan.md), informed by its implementation and subsequent failures.

The current task adds only this new plan.
It does not change product code, configuration, schemas, package versions, native artifacts or release state; install dependencies or toolchains; execute product test campaigns; commit; or push.
Existing documents under `docs/plans/` and captured qualification/research evidence remain historical artifacts.
Future implementation changes maintained guidance and owning code, not the wording of spent plans.

Use the existing repository workflow and tools.
Do not register HISEW, repeat routing, introduce lifecycle paperwork, create companion evidence packets or add a test framework.
For a future authorized implementation, consolidate coherent changes, format and lint the exact scope, then use Review Agent for one ordinary internal review and narrow follow-ups for material repairs.
No external or security review campaign is proposed by this task.
Existing publication gates remain intact, but are not an instruction to execute a release campaign now.
Future commit messages require the user's actual approval before signed commits, in accordance with the correction in the originating chat; a plan or displayed draft alone is not that approval.

### Invariants

- `check` establishes a verdict for its actual selection and captured link dependencies.
  A selected-file or supplied-buffer check does not establish complete repository acceptance.
  A successful repair or preview is never check evidence.
- Formatting preserves Markdown meaning and protected literal content, and does not normalize prose to NFC.
  Normalization makes eligible source-span edits and does not substitute a formatter pass.
  Their existing permitted residual findings remain distinct.
- Filesystem repair performs complete selected-batch preparation before the first replacement.
  Per-file replacement remains guarded, with accurate confirmed writes and incomplete work after an interruption; it is not a transaction across files.
- Configuration remains data, loaded only from the selected root or explicit config path.
  Ignore files, candidate code, executable configuration and automatic runtime acquisition gain no new authority.
- Explicit exclusion, intentional empty selection, extension admission, Git reconciliation, native identity, resource limits and trusted qualification retain their own meanings.
  Convenience flags cannot bypass them.
- A complete validated result, successful owned cleanup, successful output delivery and the appropriate process exit are separate requirements.
  EOF, a JSON object beginning on stdout or an exit code observed without a complete report is insufficient evidence.

## Verified baseline and relevant history

### Current Markdown Quality

The root manifest and both platform package manifests select `2.0.0`.
The exported contracts are configuration schema 3, effective configuration schema 3, result schema 4, execution schema 2 and comparison schema 3; the preset is `authored-gfm@2`.
The retained native formatter/checker is Snapper 0.11.9, admitted through `assets/tool-manifest.json` and exact platform executable hashes.
There is no JSON Quality-style unified event/native cohort vector here.
`resolveTool()` requires the installed core and native package versions to agree.

Public registry reads on 5 November 2026 found all three package families already published at 2.0.0:

| Package                                         | 2.0.0 publication time, UTC   | Observed tags                   |
| ----------------------------------------------- | ----------------------------- | ------------------------------- |
| `@hadden-industries/markdown-quality`           | 4 November 2026, 08:51:17.044 | `pilot: 2.0.0`, `latest: 1.0.3` |
| `@hadden-industries/markdown-quality-linux-x64` | 4 November 2026, 08:42:48.692 | `pilot: 2.0.0`, `latest: 1.0.3` |
| `@hadden-industries/markdown-quality-win32-x64` | 4 November 2026, 08:43:11.539 | `pilot: 2.0.0`, `latest: 1.0.3` |

These are observations of the [core registry metadata](https://registry.npmjs.org/@hadden-industries%2fmarkdown-quality), [Linux registry metadata](https://registry.npmjs.org/@hadden-industries%2fmarkdown-quality-linux-x64) and [Windows registry metadata](https://registry.npmjs.org/@hadden-industries%2fmarkdown-quality-win32-x64), not release-readiness certification.
Tags are mutable and must be refreshed before a later release decision.
The published coordinate is already consumed regardless of its tag.

Source inspection and read-only probes of the existing installed 2.0.0 dependency in the sibling JSON Quality checkout establish this baseline:

| Surface                 | Current behavior                                                                                            | Decision                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Main discovery          | No arguments and top-level help print a long global usage; `check --help` and `--version` fail              | Keep useful no-argument behavior, add contextual help and version, and make discovery independent of operational imports |
| Qualification discovery | No arguments or standalone help print usage; operational inputs are explicit flags                          | Add version and lightweight discovery; retain this flag-driven invocation, with no new environment-only execution mode   |
| Full check              | Discover selected policy files; reconcile tracked inventory by default in Git context                       | Preserve                                                                                                                 |
| Selected check          | Literal paths after `--`, or `--files-json`; `[]` deliberately selects nothing                              | Preserve and explain scope; no new `check-files` command                                                                 |
| Paths                   | Explicit paths may use any non-refused extension; include patterns govern discovery; exclusions still apply | Preserve; no new glob/directory engine or Markdown-only restriction on explicit names                                    |
| Root                    | Explicit root, else nearest verified Git checkout, nearest regular package root, then cwd                   | Preserve, including Windows short-path handling                                                                          |
| Filesystem format       | Writes by default; `--dry-run` is rejected                                                                  | Require an explicit mode in the major release and add real preview                                                       |
| Filesystem normalize    | Writes by default; has real `--dry-run` and explicit `--update-links`                                       | Retain the preparation and link rules, require `--write` for mutation                                                    |
| Supplied document       | `format`/`normalize --stdin-request` accept bounded JSON/base64 framing; results carry candidate bytes      | Retain this machine interface and add a separate raw UTF-8 convenience interface                                         |
| Reports                 | One whole-document JSON result with operation, quality and write states; human output currently uses stdout | Keep whole-document JSON; move human operation output to stderr in the major release                                     |
| Display                 | `--diagnostic-display-level` already filters presentation only; `--strict` makes warnings block             | Preserve both meanings; add a small quiet control without skipping checks                                                |
| Native execution        | Retained platform executable and bounded worker/process orchestration                                       | Reuse; do not transplant JSON's native sessions, event terminals or cohort bump                                          |

The source checkout has no local `node_modules` at authoring time.
Its current implementation has been inspected, not runtime-qualified by executing the source CLI.
The installed sibling dependency's discovery probes are evidence about that installed 2.0.0 package, not about future changes.
No applicable `AGENTS.md` was found in the repository or nested docs; the coordinating task also checked ancestor directories.

Relevant inspected Markdown commits include `8fc6bde` for zero-config contracts, `a7c463e` for explicit NFC repair, `42e37b8` for SDK admission and preview freshness, `c9679bd` for explicit files of other extensions, `7d12f72` for consumer documentation, `5d99e8a` for pilot version selection, and `befdb4d` for hosted consumer and Windows short-path repairs.
The plan preserves these decisions instead of reopening the 2.0 policy redesign.

### Lessons from the JSON implementation

The originating chat was paginated through its beginning, including the user's process corrections, the approved plan, implementation reviews, packaging constraints and native failures.
The source changes in `619f259`, `fcf0b72`, `cbe7021` and the delivery repair `3c858753e059554a1d42b37215bb6959a601b702` were inspected alongside that history.

| Observed JSON hurdle                                                                                        | Required application here                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A late schema error, generated declaration changes and installed-reader assumptions crossed multiple owners | Map CLI admission, operation, worker dispatch, result schema, semantic validator, historical comparison, qualification and installed consumers before editing; migrate each coherent relation together |
| Repair preflight incorrectly required the original to satisfy the repaired presentation                     | Run the existing Markdown preparation and operation-specific residual rules; permit repairable input, then verify the actual candidate without exempting unrelated findings                            |
| An omitted expectation was treated as a mismatch                                                            | Preserve own-property-based optional expected-value checks in `validateQualityResult`; absent expectations impose no pin, while an explicitly supplied null remains an actual expectation              |
| One real native fixture still used a mode-less writer                                                       | Audit actual command builders and installed probes, not just README examples; change physical writers only and retain negative tests for missing modes                                                 |
| Schema/source checks passed while retained native components were incompatible                              | Admit the actual platform payload before native execution and bind installed proof to the actual frozen package tuple; do not infer native success from lint or schema compilation                     |
| A successful build was confused with staged payloads and release qualification                              | Distinguish build, retained bytes, repack, installed execution and release admission; verify which owner consumes each artifact                                                                        |
| Normal session closure cancelled the signal used for final output                                           | Trace Markdown's own worker close, process close and stdout lifetimes; output delivery must survive normal cleanup and remain cancellable by the caller and its own deadline                           |
| A broken-pipe fixture exhausted workspace before reaching a pipe                                            | Size the genuine fixture to cross the sink boundary, give it explicit adequate finite budgets, and assert that output was reached before asserting broken delivery                                     |
| A runtime-created compile cache polluted a cleanup oracle                                                   | Isolate or explicitly disable that runtime cache before launching the fixture; do not weaken the empty-owned-scratch assertion by filtering unknown leftovers                                          |
| Package/version metadata polluted policy identity and generated checksum churn                              | Keep release version projection separate from policy identity; Markdown already hashes actual resolver inputs, so do not add a copied checksum inventory                                               |
| Windows cannot alone prove Linux executable behavior                                                        | Inspect archive mode and execute the installed binary in Linux; retain Markdown's existing tar-mode normalization rather than copying JSON's different pack implementation                             |

The first [JSON native run](https://github.com/Hadden-Industries/json-quality/actions/runs/41985725816) built both platforms but reported 42 passes and 8 failures on each, and retained no successful payload artifacts because their upload depended on success.
The three-file repair was signed and pushed as `3c85875`.
At this plan's evidence cutoff, the [repair run](https://github.com/Hadden-Industries/json-quality/actions/runs/41988736711) reported 49 passes, 1 failure and no skips on each platform: the original delivery failures passed, and the remaining cleanup assertion encountered `node-compile-cache`.
The further fixture-only cache-isolation repair had passed source checks and narrow review, but was uncommitted and had not received its native rerun.
This is useful failure evidence, not an all-green run or Markdown acceptance.

## Community evidence and disposition

Prettier documents explicit `--write`, filename-aware stdin, presentation controls and separate formatting-check exits.
These are useful interface precedents; they do not require replacing Markdown Quality's policy-aware check or normalization-preview semantics.
See [Prettier CLI](https://prettier.io/docs/cli).

Markdownlint-cli2 documents inert help, explicit fixes, stdin formatting to stdout and the same broad 0/1/2 distinction.
It also makes different choices about globs, executable configuration and formatter exits.
Adopt the useful interaction patterns while retaining this package's declared selection and authority boundaries.
See [Markdownlint-cli2 command line, formatting and exits](https://github.com/DavidAnson/markdownlint-cli2#command-line).

ESLint documents filename-context stdin and quiet behavior that can change warning-rule execution.
Markdown Quality's existing display threshold deliberately preserves every diagnostic and execution decision, and the proposed quiet flag will do so too.
See [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface).
These design choices are engineering inferences from the precedents and the inspected repository; there is no universal CLI grammar to reproduce.

| Finding                                                                        | Tailored requirement                                                                                 | Acceptance                                                                                                                                                 | Slice / proof   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| F1: discovery depends on operational imports and lacks version/contextual help | Lightweight shared admission and installed-package version discovery on both bins                    | Discovery succeeds without Git, native companion, stdin consumption or valid repository policy                                                             | S1 / P1         |
| F2: selected scope is already present but easy to overstate                    | Preserve existing `check` selection and make full, explicit, empty and logical scope visible         | A valid selected member can pass beside an unrelated bad peer; read dependencies still matter; explicit success never becomes a full qualification receipt | S2 / P2, P5     |
| F3: filesystem mutation is implicit                                            | Require `--write` or `--dry-run` on physical repairs in the major release                            | Missing/conflicting modes fail before root, policy, stdin or write effects                                                                                 | S1, S3 / P1, P3 |
| F4: format has no actual preview                                               | Share preparation, candidate verification and freshness with writes                                  | Preview exposes real candidate identities, changes no source bytes, and agrees with a fresh write on unchanged inputs                                      | S3 / P3         |
| F5: editor use requires a base64 envelope                                      | Add raw `--stdin --stdin-filepath`, retaining the envelope                                           | Supplied bytes are authoritative, stdout transforms contain only output source, and neither route writes checkout files                                    | S4 / P4         |
| F6: output streams and delivery need a clear contract                          | Whole-document JSON stays on stdout; human reports move to stderr; delivery failures are operational | JSON/source bytes never mix with human text; slow/broken sinks cannot report success                                                                       | S1, S4 / P1, P4 |
| F7: repair success can coexist with findings                                   | Preserve and foreground operation/quality separation and strict semantics                            | Format can leave NFC findings; normalize can leave presentation drift; `check` remains the quality gate                                                    | S3 / P3, P5     |
| F8: package and protocol changes can drift                                     | Coordinate schema readers, commands, version projection and installed probes                         | The actual current family is tested, old reports retain old interpretation, and no unrelated schema/native version is bumped                               | S2, S5 / P5, P6 |

## Proposed command contract

These are proposed commands for the complete major-release implementation, not claims about installed 2.0.0.
Retain the two binary names and existing verbs.
Do not add `check-files`, an alternate linter, NDJSON, `fix` aliases, watch mode or a command framework.

### Operation matrix

| Invocation                                                                                    | Input and scope                                                                 | Effects and output                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `markdown-quality`, `markdown-quality --help`, `-h`                                           | Discovery                                                                       | Root help on stdout, exit 0, no operation                                                         |
| `markdown-quality COMMAND --help`                                                             | Known command discovery                                                         | Relevant options, effects, scope, examples and exits on stdout                                    |
| `markdown-quality --version`, `-v`                                                            | Invoked package metadata                                                        | Exact package SemVer plus LF on stdout                                                            |
| `markdown-quality check [--root R]`                                                           | Full policy selection and normal Git reconciliation                             | Read-only complete check of that selection; human stderr or `--json` stdout                       |
| `markdown-quality check [--root R] -- A.md B.markdown`                                        | Existing literal explicit selection and required link reads                     | Selected check; no implicit expansion to unrelated lint targets                                   |
| `markdown-quality check --files-json '[]' [--root R]`                                         | Intentional explicit empty selection                                            | Exit 0 with zero checked documents; explicitly not full repository acceptance                     |
| `markdown-quality format --dry-run [--root R] [-- paths]`                                     | Full or explicit physical selection                                             | Actual candidate preview, zero replacements, report output                                        |
| `markdown-quality format --write [--root R] [-- paths]`                                       | Same selection and preflight                                                    | Guarded replacements and report output                                                            |
| `markdown-quality normalize --dry-run [--update-links] [--root R] [-- paths]`                 | Existing NFC preparation and link-impact model                                  | Preview edits, anchor changes, refusals and candidate identities; zero replacements               |
| `markdown-quality normalize --write [--update-links] [--root R] [-- paths]`                   | Same normalization selection and preflight                                      | Guarded selected writes, with actual partial effects retained on failure                          |
| `markdown-quality check --stdin --stdin-filepath docs/a.md [--root R]`                        | One supplied UTF-8 document under the selected root policy                      | Read-only logical check; human stderr or one JSON result on stdout                                |
| `markdown-quality format --stdin --stdin-filepath docs/a.md [--root R]`                       | One policy-aware virtual document                                               | Source UTF-8 only on stdout after candidate acceptance and cleanup                                |
| `markdown-quality normalize --stdin --stdin-filepath docs/a.md [--root R] [--update-links]`   | One virtual normalization member; backlink inspection when explicitly requested | Source only on stdout; cannot update any other file; out-of-selection dependent edits refuse      |
| `markdown-quality format --stdin-request [--root R] [--json]`                                 | Existing closed JSON/base64 request                                             | Preserve the envelope and result behavior; no physical writes                                     |
| `markdown-quality normalize --stdin-request [--dry-run] [--update-links] [--root R] [--json]` | Existing logical normalization protocol                                         | Preserve request identity, preview input-byte behavior and explicit anchor consent                |
| `markdown-quality inspect [--root R] [selection] [--json]`                                    | Selection, configuration and provenance inspection                              | No content verdict; human details on stderr or JSON on stdout                                     |
| `markdown-quality inspect-profile [existing profile controls] [--json]`                       | Execution-profile resolution                                                    | Retain the current JSON-on-stdout behavior with or without `--json`; no analyzer or qualification |

`format --stdin-request --dry-run` may use the new formatting preview with a JSON result and unchanged envelope input bytes, matching logical normalization preview semantics.
It does not return candidate source as a raw stream.
Raw transform mode rejects `--dry-run`: returning a transformed buffer is already a no-checkout-write operation, and a second output meaning would be ambiguous.

For `markdown-quality-qualify-git`, preserve explicit qualification flags, no-argument help, immutable candidate/trusted/producer identities, machine stdout and error stderr.
Add standalone help/version discovery before importing qualification owners.
Do not copy JSON Quality's environment-only no-argument workflow: Markdown's current binary does not implement it.

### Admission and discovery

Extract a small CLI admission/help owner using Node builtins and package-relative metadata reads.
Load `operation.js`, execution profiles, result construction and native-dependent imports only after syntactic admission.
Resolve version relative to `import.meta.url`, never cwd or an unrelated consumer manifest.
Keep entrypoint imports inert while preserving execution through npm shims and Linux symlinks.

Support top-level help/version and command-position help.
Reject unknown commands/options, conflicting repeated singleton values and help/version combinations with one precise correction and relevant usage.
Do not auto-correct and execute a guessed command.
Tokens after `--` remain literal paths even when they resemble options.
Retain the current requirement that file positionals follow `--`; removing that requirement is unnecessary for this work.

Reject these combinations before operational imports or stdin consumption:

- Physical `format`/`normalize` with neither or both `--write` and `--dry-run`, including intentional empty selections without a mode.
- Repair modes on `check`, `inspect` or `inspect-profile`; `--update-links` outside normalization.
- Raw stdin combined with `--stdin-request`, filesystem selections, `--reconcile-inventory`, `--write` or `--dry-run`.
- Raw stdin without exactly one `--stdin-filepath`, or that filename option without raw stdin.
- Raw transform stdin with `--json`; check stdin may use `--json` because its output is a report.
- Envelope stdin with a raw filename or `--write`; preserve its existing normalize-preview flags.
- `--files-json` with the positional selection delimiter, and malformed or non-array JSON selection.
- Display controls on the qualification binary or on `inspect-profile`; retain compatible no-effect display filtering with ordinary `--json` reports.

Malformed operational options remain exit 2.
When `--json` requests a report and installed result metadata can be loaded, preserve a schema-valid failure result on stdout.
If installed metadata is unavailable, emit a named stderr failure and exit 2 without fabricated tool/version identities.
The lightweight admission layer must not load those owners merely to print help or version.

### Roots, files and complete scope

Preserve `resolveConsumerRoot`/`discoverConsumerRoot` and the short-path repair from `befdb4d`.
Explicit root selects exactly that directory; config does not relocate it.
Automatic root discovery still verifies Git rather than trusting a `.git` marker, and failure to verify observed metadata remains an error.
An explicit non-Git data root continues to support selected operations without requiring Git discovery.

Physical and virtual source identities use canonical root-relative forward-slash paths on all platforms.
`--root` itself can use an ordinary native absolute or relative filesystem path.
Help must explain this distinction for invocations from nested directories.
No cwd-relative reinterpretation of existing path arguments is introduced.
Reject escapes, empty/dot segments, backslashes, alternate streams, duplicates, directories and linked path components according to the existing owners.
Literal wildcard characters remain literal where the host permits them.

Keep policy exclusion and operational-boundary behavior.
Explicit files bypass `include`, but do not bypass exclusions; MDX remains a refused dialect under the owning selection rules.
Full discovery continues to select `.md` and specifically opted-in names/extensions.
Do not copy JSON's nonempty-only selected command: Markdown's intentional `[]` and empty delimiter are existing automation contracts.
Make zero selected documents and their omissions prominent, while retaining their exit meaning.

For checks and repairs, a selected file's cross-document fragments still read bounded target dependencies even when those targets are unselected or excluded.
Those dependencies are not recursively crawled, linted or added to the write set.
Report them through `selection.readDependencies`.
An unrelated bad peer must not block an explicit operation merely because it exists; a required missing, stale, linked or over-budget dependency must still prevent a trustworthy result.
This differs deliberately from JSON Quality's complete-repository preflight for selected writers.

## Explicit repair and actual preview

### Shared candidate preparation

Extend the existing operation owner rather than building a second formatting implementation.
`analyzeOperation` already distinguishes repair, logical content, dry-run and physical write, and already quiesces analysis before replacement.
The missing seams are admission of format preview, its worker transport guards, informative candidate accounting, and equivalent source/ownership checks for preview and write.

For physical format and normalize:

1. Admit the complete selection and resolved policy/profile before reading sources.
2. Capture every selected original and required dependency under existing byte and count accounts.
3. Prepare actual candidates using the established formatter or source-span normalizer, with independent semantic, literal and native checks.
4. Evaluate candidate diagnostics using the existing `residualAllowed` contract and strict warning behavior.
5. Finish whole-batch preflight, close analysis/staging owners, and recheck policy, selected source identities, dependencies and any reverse-reference inventory.
6. Return preview with no replacement capability, or perform existing per-file guarded replacements and record each confirmed write.

Formatting must admit repairable layout in the original.
It must not waive syntax, literal preservation, unrelated policy errors or strict warnings to manufacture a candidate.
Normalize may leave formatter/Snapper presentation findings; format may leave only ordinary `quality/non-nfc-prose` findings.
Their successful exits still mean the requested repair completed, not that the policy is clean.

The current source records all selected-member freshness observations for normalization, while format relies mainly on replacement guards.
Factor the necessary selected-member observation/preflight relation so format preview also detects changed source bytes, replacement identity, hard links, linked ancestors and policy/dependency changes before completion.
Apply physical rewrite eligibility to both preview and write, without opening a write handle in preview.
Read-only checks retain their distinct read permissions.
Do not promise a preview guarantees future filesystem writability or reserves a source snapshot.

`executeQualityRequest` and `execution-worker.js` must admit `format` only when `dryRun === true` or a logical document is supplied.
Their two independent no-checkout-write guards must still reject an ordinary physical format/normalize request before launching or dispatching a killable worker.
Keep actual physical writes in the calling process through `runQuality`/`analyzeOperation`.
A timeout-killed worker cannot infer how many replacements another process completed.

The SDK's existing `runQuality({mode: "format"})` and `runQuality({mode: "normalize"})` remain physical repair requests.
The new mandatory `--write` rule is CLI admission, not an invented required SDK property.
Add `dryRun: true` support to format consistently; preserve unknown-option refusal.

### Candidate result contract

Use result schema 5 for one bounded addition: every `documentResults` entry has `candidate`, either null or a closed object containing `inputSha256`, `inputBytes`, `outputSha256`, `outputBytes` and `changed`.
Digests bind exact UTF-8 bytes; byte counts are nonnegative safe integers, and `changed` agrees with byte identity.
Only repair operations may supply a candidate; check/inspect, omitted paths and members whose candidate preparation or validation is incomplete have null.
A completed or previewed nonempty repair requires candidate identity for every selected member.
A refusal may retain candidates already independently verified, without claiming the entire batch is eligible or applied.
Partial-write reports keep candidates separately from confirmed `writeStatus`/`writtenPaths`.

This supplies concrete preview changes without inserting whole documents into physical-file reports.
Retain normalization's existing `proposedChanges` source spans, `anchorChanges`, refusal codes and `backlinkCoverage`; do not pretend formatting changes are normalization edits.
Human previews list changed/unchanged paths and candidate byte counts, plus remaining findings and refusal reasons.
No patch/diff output or persistent preview token is needed in this increment.

For logical transforms, `document.contentBase64` retains its current meaning: candidate bytes after a successful ordinary transform, original bytes for preview, and original bytes on refusal.
For logical checks it contains the supplied input.
Raw stdout derives only from a successful non-preview logical transform and must agree with its validated candidate identity.
An excluded logical input has no candidate and passes through unchanged according to the existing omission contract; human output must say it was excluded rather than checked or repaired.

### Exit meanings

| Outcome                                                                                                  | Exit | Required interpretation                                            |
| -------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| Valid discovery or profile inspection                                                                    | 0    | No quality assertion                                               |
| Complete check with no blocking diagnostics                                                              | 0    | Actual selected scope passed; info/advisory warnings may remain    |
| Complete check with errors or strict warnings                                                            | 1    | Completed policy failure                                           |
| Successful preview, whether or not changes are proposed                                                  | 0    | Actual candidates prepared; no writes; not a formatting-check exit |
| Successful physical/logical repair with allowed residual findings                                        | 0    | Repair completed; run check for the policy verdict                 |
| Complete repair/preview refusal                                                                          | 1    | No successful candidate adoption; report the known reason          |
| Bad arguments, malformed bytes, resource refusal, stale inputs, failed cleanup or failed output delivery | 2    | Operationally incomplete or failed; never success                  |

Retain normalize preview's exit 0 for a successful changed preview and use the same rule for format.
Use `check` to detect formatting drift in CI; do not make two preview commands disagree merely to imitate another tool's `--check` flag.

## Raw stdin and Markdown-specific context

### One virtual document under ordinary policy

Require explicit `--stdin` and `--stdin-filepath`; do not infer stdin from a pipe or treat the literal filename `-` as a new magic input.
Use the same root and configuration resolution as physical operations.
A filename alone does not activate a second no-policy mode, and omitting `--root` does not silently disable configuration or local-link checks.
For an isolated buffer, the caller can select a deliberate data root and its policy.

The virtual path supplies identity, relative-link base, include/exclude decisions and dialect admission.
It never supplies replacement bytes from disk or grants permission to overwrite that path.
The final file and its not-yet-existing parents may be absent, subject to lexical containment and safe existing ancestors.
Reject an existing directory, symlink, junction, path escape or operational-boundary path.
Keep supplied bytes authoritative even when a different disk file exists at the same spelling.

Reuse `processLogicalDocument`/`runQualityRequest` and the existing analysis owners.
The raw CLI adapter encodes the bounded input into the existing internal request; it is not a second Markdown parser or checker.
Expose raw logical check as a CLI operation; retain the existing JSON/base64 interface for callers needing request IDs and complete candidate/refusal details.
Do not deprecate or remove `--stdin-request` in this plan.

Decode the complete raw stream with strict UTF-8 admission after EOF, including split multibyte code points; do not pass chunks through a replacement decoder.
Empty input is an actual zero-byte Markdown document, not an empty file selection, and receives the normal policy verdict.
Raw mode requires UTF-8 even for an excluded path; the legacy envelope retains its existing ability to pass excluded arbitrary bytes unchanged.
Document this difference between a text interface and an existing byte-envelope interface.

No source stdout is written for a transform refusal or operational failure before delivery begins.
Excluded valid UTF-8 input passes through byte-for-byte with an exclusion explanation on stderr.
Successful transformation preserves policy-selected EOL behavior; do not append an extra newline beyond the actual candidate.
Raw `check --json` returns a logical check report, never the transformed source.

### Links and normalization

Same-document fragments must use the supplied buffer's anchors.
References to its own logical path must not accidentally read stale disk content; test both `#heading` and a path-qualified self-reference when the virtual file is absent.
Reuse the path/anchor owners and, if necessary, thread one explicit logical-member identity through local-target resolution so self-reference admission is narrowly correct.
Other local targets continue to use actual bounded disk dependencies and existing case/containment rules.
Do not claim another unsaved editor buffer, a site route, a directory index or an external URL was validated.

Without `--update-links`, a normalization that changes generated anchors retains `ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS` and produces no raw source output.
With that flag, the virtual document is the only member eligible for edits.
Include it exactly once in the existing reverse-reference inventory even if it is not yet present on disk, and use supplied bytes instead of its disk version.
Supported self-fragment edits may be returned in that buffer.
An existing other file requiring a changed fragment remains `OUT_OF_SCOPE_REFERENCE`; raw HTML references and ambiguous/unrepresentable edits retain their refusals.
Never silently rewrite or return additional files from a one-buffer transform.
`externalReferences: "unverified"` remains true in the structured result, and raw stderr must retain that limitation when anchor changes occur.

An editor owns whether and how it adopts a returned buffer.
The CLI does not grant a preview a reusable write capability, establish that the editor buffer remained current, or authorize shell redirection over the input file.
Examples must not suggest `... > same-input.md`, which the shell can truncate before the CLI reads it.

### Framing, resources and delivery

Resolve the execution profile and its bootstrap ceilings before consuming stdin.
Reject interactive TTY stdin with a concise pipe/redirect example instead of waiting unexpectedly.
Bound raw input, internal request framing, analysis, complete result framing and final output through existing resource owners.
`maxRequestBytes` continues to bound actual internal JSON/base64 framing, so base64 and metadata overhead count; a raw document below the text limit can still exceed the transport limit.
`maxOutputBytes` continues to bound the serialized result and also bounds raw source delivery; do not silently enlarge limits or remove report fields to admit a buffer.
Document this overhead and explicit finite/null/unlimited controls honestly.

For the new raw CLI path, retain one caller cancellation/deadline from before stdin through output completion; do not restart the budget after EOF or normal worker cleanup.
Pass the remaining execution allowance to the existing child transport and keep its separate cleanup allowance.
Preserve SDK execution-control semantics and the existing physical-writer ownership model.
No new package ceiling or timeout increase is required merely to add stdin.

Await backpressure and write completion; catch output errors on both report and source paths, including EPIPE.
Do not call immediate `process.exit` while output is queued.
After any source prefix has escaped, report failure on stderr and exit 2; never append a JSON error object or retry a candidate to the same stream.
The receiver must discard partial output after a failed process.
For a physical repair whose final report cannot be delivered, do not claim that files were restored or that zero writes occurred.
The internal result must retain actual effects even when its external delivery fails.

Normal worker/staging cleanup must finish before success is exposed, and must not cancel an independent output owner.
Markdown's `analyzer.close()` terminates a worker and `runQualityRequest` settles on child closure; this is not the same implementation as JSON's session-signal defect.
Test the real lifecycle before changing it, and avoid importing an unneeded native-session abstraction.

## Human and machine output

Keep one complete JSON result per `--json` operation, including ordinary classified failure results when metadata is available.
No NDJSON or alternate reporter is introduced.
Qualification and profile-inspection machine output retain their current shapes.
Help and version remain stdout.
Human operation findings, summary, progress, repair guidance and admission errors move to stderr as an intentional major-release change.

Retain `terminalText` escaping for paths/messages; add severity visibly alongside the stable rule/code and location.
Examples should explain a repairable layout finding, NFC repair, a link failure requiring a content edit, a normalization refusal, and a strict warning.
Do not prescribe an automatic repair for meaning, link labels, alternative text or HTML policy.

Preserve `--diagnostic-display-level info|warning|error` exactly as presentation filtering.
JSON remains complete and invariant under it; hidden diagnostics still count toward budgets, strict admission and exits.
Add `--quiet` to suppress routine successful summaries/progress, without suppressing selected diagnostic lines, errors, refusal reasons, partial-write warnings or the explanation of a hidden strict blocker.
Allow it with the existing display threshold; in report mode it changes no JSON bytes.
It cannot make a failed operation silent about its failure reason.

Human output must identify full versus explicit physical selection, supplied logical input, exclusions, dependency reads, preview versus applied content, and remaining findings.
Use these existing report concepts rather than a new parallel operation-scope framework.
No full-repository success wording is allowed for an explicit empty, selected-file or logical check.

## Contract and consumer migration map

### Versions and readers

Result schema 5 is a closed contract change, owned by `scripts/schema-sources/result.json` and `src/result-construction.js`.
Regenerate `schemas/result.schema.json` with `scripts/generate-schemas.js`; do not hand-edit projected schemas.
Update semantic validation and every producer/reader in the same slice.
Keep candidate identities consistent with actual bytes and source kind, and require `dryRun: false`/`updateLinks: false` for check and inspect.
Validate logical `document`, explicit selection, zero write effects and read dependencies together.

`admitCheckEvidence` and trusted qualification must require the intended physical scope, not merely `operation === "check"` and exit 0.
The trusted runner knows its staged selection; bind that expected selection and reject a substituted logical document, preview, repair or incomplete result.
A general selected check can remain valid evidence for that declared selection without becoming complete-repository evidence.
Do not unconditionally require `selection.mode === "full"` in a shared validator if the actual trusted caller deliberately supplies an explicit immutable list.

Extend `compareCheckReports` to interpret result 5 and retain explicit branches for result 1, 2, 3 and 4.
Use the supplied historical schema for each side, preserve historical accounting and provenance meanings, and do not rewrite frozen reports into the new shape.
Comparisons must still bind identical input manifests and actual scope, reject repairs/previews and reject physical-versus-logical substitution.
Keep logical-buffer comparison out of this increment unless its supplied-byte manifest contract is explicitly implemented; reject it clearly rather than comparing a disk manifest to a buffer report.
The comparison output remains schema 3 if its existing identity and finding fields are unchanged; its `reportSchemaVersion` already accepts future positive integers.

Configuration/effective schema 3, execution schema 2, `authored-gfm@2`, qualification receipt/window schemas 2 and the existing native wire contract stay unchanged unless an actual incompatible field/meaning is changed in their owners.
Nested current results require reader updates and new current proof, not an automatic increment of every surrounding schema.
If a release reader's old version would otherwise ambiguously accept changed semantics, version that particular envelope as part of the affected seam and explain why.
There are no generated TypeScript declarations in the present public package; do not copy JSON's type-generation work into this plan.

### Owning seams

| Producer or boundary                                                                                   | Readers and consumers to migrate together                                                                                     | Expected work                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/cli.js`, `src/qualify-git-cli.js`; small proposed CLI admission/output helpers                    | `test/cli.test.js`, `test/execution.test.js`, `test/diagnostic-display.test.js`; npm shims                                    | Lazy discovery, modes, stream contract, targeted parser and sink tests                                             |
| `src/operation.js`, `src/quality.js`                                                                   | `src/execution.js`, `src/execution-worker.js`, direct SDK callers                                                             | Format preview admission, shared preparation/freshness, unchanged physical-write transport refusal                 |
| `src/result-construction.js`, `scripts/schema-sources/result.json`, generated result schema            | `src/result-validation.js`, `src/report-comparison.js`, `src/qualification-runner.js`, `src/qualification.js`                 | Result 5 construction, candidate identities, scope agreement and historical/current interpretation                 |
| `src/documents.js`, `src/consumer-root.js`, `src/configuration.js`                                     | Physical and logical paths, `test/zero-config.test.js`, `test/central-selection.test.js`, `test/markdown-extensions.test.js`  | Preserve roots/exclusions/empty scope; reuse path admission and captured policy absence                            |
| `src/local-links.js`, `src/link-graph.js`, `src/normalize-batch.js`                                    | Logical checks, raw transforms, `test/logical-document.test.js`, `test/normalize-command.test.js`, `test/local-links.test.js` | Authoritative virtual self-reference, bounded actual dependencies, single-buffer anchor/refusal semantics          |
| `src/formatting.js`, `src/document-analysis.js`, `src/document-analysis-pool.js`, `src/replacement.js` | Preview/write integration and lifecycle fixtures                                                                              | Reuse semantic/literal/native guards and actual per-file effects; avoid gratuitous engine changes                  |
| `scripts/qualify-runtime.js`, `scripts/qualify-minimal-consumer.js`                                    | `test/packaging.test.js`, `scripts/qualify-public-registry.mjs`, `scripts/ci-consumer.js`, `scripts/ci-proof.js`              | Explicit physical write flags, discovery/preview/raw cases, exact commands and independently authored byte oracles |
| `scripts/core-package-stage.js`, `scripts/pack.js`, platform manifests                                 | Installed native version check, transported/registry qualification                                                            | Synchronized package family, shipped helpers, source identity, actual archive mode and payload identity            |
| `package.json`, root/local-package lock entries; proposed version projection helper                    | Existing early producer/pack admission and narrow drift test                                                                  | One candidate declaration and no dependency resolution, native rebuild or evidence mutation during synchronization |
| Existing maintained docs and workflow command callers                                                  | README/npm consumers, contributor scripts, reusable qualification                                                             | Current commands, migration instructions and shipped-link correctness; preserve trusted workflow inputs            |

The map is a bounded starting inventory, not permission to edit every listed file.
Use `rg` and the existing dependency graph to identify actual call sites immediately before implementation.
Check computed command arrays and code embedded in strings; text searches for `format --root` alone miss several consumers.
Do not copy JSON's exact-count CLI evidence format into Markdown, whose minimal-consumer result presently records commands/cases and is nested in other qualification records.
Require the new assertions through the real owning probe and reader, without weakening frozen identity checks.

## SemVer and release recommendation

### Recommendation

Ship the complete change as one coordinated **3.0.0 core/Linux/Windows package family**, following approval and qualification.
This is a proposal, not a version edit or publication instruction.
Use the root `package.json.version` as the single selected candidate when implementation/release selection is authorized, and project companions and lock metadata from it.
Current general guidance should refer to that source rather than scattering a new candidate literal; dated plans and published-version migration examples remain historical or intentionally version-specific.

The package's [support policy](../support-and-release.md) expressly includes CLI behavior, library APIs, schemas, exit meanings, formatter output and default diagnostics in its public contract.
The write-default change, stdout/stderr move and default result-schema replacement are incompatible with published 2.0.0 consumers.
They cannot be called patches or hidden behind the `pilot` label.
[SemVer](https://semver.org/) distinguishes compatible fixes, compatible additions and incompatible API changes; the classifications below apply that rule to this package's documented surface.

Npm tags choose a version for installation; they do not convert `2.0.0` into a SemVer prerelease.
The existing final-coordinate pilot-then-promotion route can be reused for an authorized 3.0.0 release, with the same immutable bytes promoted later.
Do not introduce `3.0.0-rc.1` blindly: current Markdown release admission was deliberately built around final `X.Y.Z` coordinates.
A different prerelease workflow would be separately scoped work.
See [npm dist-tag documentation](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

### Per-change classification

The minimum levels below assume changes are released independently from a published 2.0.0 baseline.
The complete release takes the highest required level; each individual feature does not require a separate bump or release.

| Proposed or possible change                                                                                            | Minimum package level                                                                     | Reason and boundary                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| This planning document, with no product/package change                                                                 | None                                                                                      | Repository planning is not a package release                                                                                                   |
| Corrected maintained prose, npm description/keywords, or nonfunctional internal cleanup                                | No release required; patch if shipping updated package bytes                              | No public behavior changes; published artifacts still cannot be overwritten                                                                    |
| Add `--version`, command help and import-inert discovery                                                               | Minor                                                                                     | New supported CLI functionality; an isolated fix to existing promised help can be patch                                                        |
| Add optional `--write` while still accepting old implicit writes                                                       | Minor                                                                                     | Old invocations continue to work; supports an optional bridge                                                                                  |
| Require `--write`/`--dry-run`, rejecting old mode-less physical writers                                                | Major                                                                                     | Existing successful automation stops with exit 2                                                                                               |
| Add format preview and `dryRun: true` SDK support                                                                      | Minor in isolation                                                                        | New opt-in capability, provided existing result output is preserved or a new report format is explicitly selected                              |
| Replace default result 4 with closed result 5                                                                          | Major                                                                                     | Old strict readers reject the version/required fields, including candidate identities                                                          |
| Add opt-in raw stdin/check while keeping envelope behavior                                                             | Minor in isolation                                                                        | New invocation shapes and logical checks; existing byte-envelope calls remain valid                                                            |
| Remove/replace `--stdin-request`, rename its keys or change preview bytes                                              | Major                                                                                     | Breaks existing integration framing; not proposed                                                                                              |
| Move existing human output from stdout to stderr                                                                       | Major                                                                                     | Changes an observable stream used by shell scripts and callers                                                                                 |
| Add quiet with presentation-only effects                                                                               | Minor                                                                                     | Optional behavior without changing existing verdicts or default output                                                                         |
| Improve wording/severity display without changing codes, scope, exits or stream                                        | Patch if only clarifying human text                                                       | Structured fields and stable diagnostic codes remain unchanged; do not disguise a new policy rule as wording                                   |
| Reclassify exits, change root precedence, reject intentional empty selection or change literal/include/exclude meaning | Major                                                                                     | Existing successful commands or scope selection change; these changes are not proposed                                                         |
| Extend comparison to accept result 5 while retaining old interpretation and output schema                              | Minor in isolation                                                                        | Adds an input capability; removing historical readers or changing comparison identity semantics would be major                                 |
| Fix stale success, malformed-report acceptance, failed delivery or a preservation defect                               | Patch when restoring the existing documented contract                                     | Retain a concrete regression and distinguish erroneous former behavior from intentionally supported behavior                                   |
| Change default formatter style, NFC policy, link rules, severities or supported syntax                                 | Major when valid supported inputs change output/verdict contrary to the declared contract | No such policy redesign is planned; an opt-in rule/mode can be minor, and a demonstrated correctness repair may be patch                       |
| Upgrade Prettier, ESLint Markdown, Snapper, Node/ICU assumptions or another runtime dependency                         | Classify observed public effects                                                          | Dependency SemVer alone does not decide wrapper SemVer; changed valid formatting/default verdicts or removed runtime support can require major |
| Synchronize version metadata and add read-only drift admission                                                         | No independent consumer level; included with the selected release                         | Projection is producer tooling, not a second source of version truth                                                                           |
| Repack unchanged native bytes into the synchronized new package family                                                 | Same family version as core                                                               | Package equality and immutable distribution require new companion coordinates; unchanged executable bytes do not imply a new Snapper version   |

Prettier itself recommends exact installation because formatting can change across releases.
That is useful evidence for checking concrete output deltas, not a license to ignore Markdown Quality's own compatibility promises.
See [Prettier installation guidance](https://prettier.io/docs/install).
Keep existing formatter/native/policy dependencies pinned for this CLI increment unless an identified defect requires a separately justified change.

### Package versions are not schema or native versions

| Identity                                                    | Current                                 | Proposed handling                                                                                       |
| ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Core and both native npm packages                           | 2.0.0                                   | One synchronized next major family for the complete change                                              |
| Result schema                                               | 4                                       | 5 for the new default closed candidate/report contract                                                  |
| Configuration and effective configuration schemas           | 3                                       | Retain; CLI effects do not redesign configuration                                                       |
| Preset                                                      | `authored-gfm@2`                        | Retain; no new default rules or formatting style                                                        |
| Execution-profile schema                                    | 2                                       | Retain existing limits and profile keys; version only if their wire contract actually changes           |
| Comparison schema                                           | 3                                       | Retain output shape; reader adds result-5 interpretation                                                |
| Qualification request/receipt/window and artifact envelopes | Independently versioned in their owners | Update nested-result admission; advance only a changed incompatible envelope, not every number together |
| Tool manifest schema and retained Snapper executable        | Manifest 2; Snapper 0.11.9              | Retain when bytes, wire protocol and manifest meaning stay unchanged                                    |
| Native protocol or ABI/cohort                               | No shared JSON-style cohort             | Do not invent or increment one for a CLI result change                                                  |
| Policy hashes, source commit and archive digests            | Content identities                      | Recompute from real changed inputs through their owners; never assign them as SemVer counters           |

### Optional bridge and consumer migration

An optional 2.1 release could add discovery, optional `--write`, raw stdin and preview behind compatible output selection while preserving implicit writes, stdout and result 4 by default.
That would let consumers migrate before the break, but it requires maintaining two contracts and qualifying an additional immutable family.
A schema-5 default cannot ride in that supposedly compatible bridge.
Recommendation: use one coherent 3.0 release; choose the bridge only if an identified consumer needs staged migration.
Do not implement or publish either route as part of this plan.

Migration examples for the complete major:

| 2.0 invocation or assumption                         | Replacement                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `markdown-quality format --root .`                   | `markdown-quality format --write --root .`                                                       |
| `markdown-quality normalize --root . --update-links` | `markdown-quality normalize --write --root . --update-links`                                     |
| Existing normalize preview                           | Retained; add format preview where useful                                                        |
| Parse human stdout                                   | Prefer `--json`; use stderr only for human presentation                                          |
| Parse result schema 4 only                           | Adopt installed schema 5/current validator; retain explicit historical comparison paths          |
| Encode editor text into `--stdin-request`            | May continue unchanged, or opt into raw stdin with virtual filename                              |
| Treat exit 0 as all-repository clean                 | Inspect operation, input/candidate/applied basis, actual selection and logical-document presence |

Audit consumers before refreshing their locks.
The sibling JSON Quality project deliberately declares Markdown Quality `>=2.0.0`; that range admits a future 3.0 release, so its lockfile delays but does not prevent this break.
Coordinate its command migration, particularly `format:markdown`, before any lock refresh selects the new family.
Do not silently change that user-chosen range to a caret or upper bound in another repository.
Use an exact version for a controlled adoption when the consumer owner chooses it.

## Implementation slices

Each slice must leave a coherent producer/reader relation.
S1 establishes admission, S2 establishes report interpretation, S3 and S4 implement effects using those contracts, and S5 proves actual consumers and documents migration.
They may be developed in one working batch, but expensive proof runs only against a frozen coherent candidate.

### S1 — Discovery and command admission

Extract command metadata, lightweight package-version lookup and strict argument admission from `src/cli.js`; reuse the small discovery owner in `src/qualify-git-cli.js`.
Implement contextual help, explicit physical modes and output-mode conflicts before root/policy loading.
Move human operation presentation to its small owning renderer and add presentation-only quiet behavior.
Keep inspection/profile/qualification differences explicit.

Deliver current help examples, parse failures and new no-effect discovery fixtures.
Do not change policy, roots, SDK write semantics or full/explicit selection.
The missing-write diagnostic must identify both `--write` and `--dry-run` and perform zero operation work.
Finish with P1 and affected existing display/parser checks.

### S2 — Result 5 and scope admission

Author the closed candidate identity in the result schema source; update construction, semantic validation, current comparison and nested qualification readers together.
Regenerate actual schema projections through their existing owner.
Add real current check/repair reports and deliberate contradictory mutations, with historical result-4 comparison fixtures retained rather than renumbered.
Bind physical/logical scope and complete selected accounting in qualification callers.

Deliver a compiling current schema, precise missing/contradictory-field refusals, preserved optional expectation semantics and a reader inventory with no unhandled current-version branch.
Finish with P2/P5's cheap contract cases before invoking native cases.

### S3 — Shared physical preview and writers

Admit format dry-run in operation and both bounded-transport dispatch owners.
Refactor only the necessary candidate/observation relation to give format preview actual output identities, all-selected freshness and physical eligibility equivalent to writes.
Reuse normalization's source-span and backlink preparation, existing native/semantic checks and guarded replacement.
Retain the caller-process physical writer and truthful partial-write accounting.

Deliver exact-byte preview/write equivalence on unchanged input, zero preview source mutations, changed/unchanged candidates, normalization/format composition and refusal/freshness cases.
Finish with P3 and the relevant actual native executable on each supported platform.

### S4 — Raw stdin and complete output delivery

Add a bounded raw-input adapter around the existing logical-document execution path, preserving the old envelope.
Handle virtual self-reference and single-buffer normalization through existing link owners; explicitly retain out-of-scope backlink refusals.
Implement complete validated source/report output with backpressure, error handling, independent delivery lifetime and caller cancellation.
Make source output contingent on successful candidate admission and owned cleanup.

Deliver byte-exact stdout, no checkout writes, distinct JSON mode, strict UTF-8/EOF/TTY admission and real cancellation/broken-pipe tests.
Isolate runtime compile-cache state in cleanup fixtures and provision enough finite resource allowance to reach the tested sink.
Finish with P4, preserving negative controls for actual input/output/resource refusal.

### S5 — Consumer migration and one version owner

Migrate actual physical CLI calls in package scripts, `scripts/qualify-runtime.js`, `scripts/qualify-minimal-consumer.js`, affected tests and maintained workflow callers.
Keep SDK/envelope calls that do not write checkouts free of invented write flags.
Extend the dependency-only installed probe in both root and isolated layouts for help/version, old-mode refusal, both previews, explicit writes, raw stdin and the retained envelope.
Use independently authored expected Markdown bytes and separate fixtures so a prior writer cannot hide a failing check.

Add a small version projection/check owner for root-selected candidate version, both companion manifests and owned lock entries.
Precompute and validate the complete update set before any write; preserve dependency resolution, native payloads, notices, policy hashes unrelated to the version, frozen artifacts and release approvals.
Wire its read-only drift check into the relevant existing producer/pack admission before expensive qualification.
Do not conduct a general npm-script renaming campaign.

Update README, consumer/migration/centralized-contract/support/release guidance and contributor commands against final behavior.
Explain raw versus envelope input, root-relative virtual paths, explicit mutation, excluded/empty selection, changed report schema, stderr and residual findings.
Verify links against shipped npm contents; repository-only workflow links need repository URLs in shipped documents.
Do not claim a new version is available before publication or that source checks establish release readiness.

### S6 — Consolidation and evidence boundary

Format/lint the exact coherent scope, run justified remaining focused checks, and obtain one Review Agent review before delivery.
Repair material findings with narrow verification/review; preserve original failures and unaffected passes.
Present the exact detailed message for approval before a signed commit if commits are later requested.
Do not add process-only commits, duplicate receipts or another agent merely to run tests.

Freeze the exact clean candidate before trusted installed qualification.
Markdown's packer records clean/dirty source identity; unlike JSON's packer, it does not itself universally refuse a dirty stage.
The trusted qualification owner rejects dirty or mismatched source identity.
A dirty local package can be a bounded engineering probe, but cannot be described as the clean trusted tuple for its HEAD.

## Focused verification

### Execution discipline

Use existing `node:test`, `test/helpers.js` and the current native/consumer fixtures.
Discover exact names and required setup immediately before selecting tests; the names below were inspected at the baseline.
Use anchored `--test-name-pattern` with the actual managed Node executable, and examine selected/pass/fail/skip counts and process exit.
For example, after dependencies are available under the implementation authority:

```powershell
& 'C:/Program Files/nodejs/node.exe' --test --test-name-pattern '^CLI literal and JSON selections preserve boundaries and schema on every exit$' test/cli.test.js
```

This is a future command, not a test run recorded by plan authoring.
Do not use `npm exec --no -- node`, which tried to acquire a separate Node package in the originating work.
Use the retained producer Node/npm pair for packaging even when a consumer lane switches runtimes; consumer npm remains independently selected.

Run cheap parser/schema/reader checks before native or installed-package proof.
Batch closely related exact cases in their owning file where useful.
Do not run `npm test`, `check:full`, an affected-test fallback to every test, corpus performance qualification, dependency audits or release/security workflows merely to validate this CLI increment.
If an existing broad fixture is the only entrypoint, expose a small selector in that owner rather than adding a parallel framework or pretending the broad invocation is focused.

### Existing selectors and proposed oracles

| Proof                                       | Exact existing selectors to retain where affected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Proposed acceptance/refusal cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: discovery and admission                 | `test/cli.test.js`: `CLI literal and JSON selections preserve boundaries and schema on every exit`; `CLI concurrency reaches real analysis and rejects counts below one before writes`. `test/execution.test.js`: `retired commands and incompatible stdin options fail before formatting checkout files`; `CLI installed metadata failures use operational exit without fabricated version keys`.                                                                                                                                                                                                                                                                                                                                                                                                     | Both-bin no-argument/help/version outside a repository, without Git/native companion and with invalid policy/profile present; package-relative version under a foreign cwd; real Linux symlink/Windows shim; import inertness; mode conflicts and missing modes cause no root/policy/stdin or source-write effects; command-specific help and actionable failures                                                                                                                                                    |
| P2: selection and roots                     | `test/zero-config.test.js`: `the nearest Git checkout wins over a nested package root and needs no configuration`; `a bare directory falls back to the invocation directory without Git`; `a Windows 8.3 short path still identifies its Git checkout`; `a configuration created during an operation refuses stale success`. `test/markdown-extensions.test.js`: `explicitly named files are checked as Markdown whatever their extension`; `a named file ignores include but an exclusion still omits it`; `named MDX is refused instead of being checked or silently omitted`.                                                                                                                                                                                                                       | Preserve explicit empty selection and exclusion omissions; valid selected file beside invalid unrelated peer; linked fragment target outside selection still read/bounded/fresh; malformed Git metadata refuses; nested path spelling and virtual path do not change root; literal wildcard/missing/duplicate/escape/directory cases remain honest                                                                                                                                                                   |
| P3: actual preview and repair               | `test/normalize-command.test.js`: `preview and write share preparation; preview never writes and writes are idempotent`; `format and normalize compose in either order and check stays authoritative`; `normalize refuses unrelated blockers, strict warnings and disabled NFC policy`; `anchor changes require update-links and repair only selected supported references`. `test/replacement.test.js`: `a later filesystem interruption reports the completed prefix and preserves remaining preimages`.                                                                                                                                                                                                                                                                                             | Actual format preview followed by fresh write has equal candidate hashes/bytes; zero source changes and zero replacement calls in preview; hard-link/linked-parent/stale-source refusal parity; earlier selected member changes before first write; invalid selected peer prevents all writes; normalization preserves protected spans/EOL; partial writer failure keeps exact confirmed paths and pending state                                                                                                     |
| P4: stdin, output and cleanup               | `test/logical-document.test.js`: `logical content is formatted at its final path without changing the repository`; `excluded invalid-UTF8 bytes are returned unchanged and an included positive control changes`. `test/normalize-command.test.js`: `logical normalization returns candidate bytes and never writes the checkout`. `test/execution.test.js`: `bounded public execution preserves logical identity and rejects report overflow`; `malformed provided logical documents cannot fall through to checkout formatting`; `bounded execution rejects checkout writes before launching a killable worker`; `Linux CLI cancellation disposes its detached checker before reporting failure`.                                                                                                    | Byte-exact raw output with spaces/Unicode and existing different disk bytes; split/invalid UTF-8, empty document, TTY and incomplete input; excluded text pass-through versus legacy arbitrary-byte envelope; virtual absent self-link; other unsaved buffers not inferred; changed anchors with/without consent and external/out-of-scope references; finite input/frame/output/deadline refusal; real backpressure/broken pipe after observed output; worker/staging cleanup and independent delivery cancellation |
| P5: results, display and historical readers | `test/result-validation.test.js`: `supported validator rejects semantic lies and permits complete advisory success`; `successful repair results are never admitted as check evidence`; `reported tools match independent installed package and native manifest metadata`. `test/report-comparison.test.js`: `schema-4 complete check reports compare with current provenance identities`. `test/generated-contracts.test.js`: `canonical schema changes propagate and manual generated drift is rejected`; `the current compatibility guide describes the actual exported schema versions`. `test/diagnostic-display.test.js`: `display thresholds preserve complete JSON results, exit behavior and default output`; `hidden warnings enforce strict write admission and permit ordinary formatting`. | Result 5 rejects missing/contradictory candidates, source-kind/selection lies, false applied/preview states and incomplete accounting; absent expected pin passes but explicit mismatch fails; true 4-to-5 comparison preserves both identities; historical reports stay unchanged; logical check cannot certify a staged checkout; hidden strict warnings still block; quiet cannot suppress failure evidence or alter JSON                                                                                         |
| P6: installed consumers and package family  | `scripts/qualify-minimal-consumer.js` through its actual installed callers; `test/packaging.test.js`: `packed root and isolated consumers install without lifecycle scripts and execute offline`; `test/packed-qualification.test.js`: `clean frozen source archives qualify through the installed public boundary without release publication`; `test/commands.test.js`: `fixture packing retains producer npm while consumer selection remains independent`.                                                                                                                                                                                                                                                                                                                                         | A narrow installed CLI selection exercises both layouts on exact archives and actual native executable; version equals invoked manifest; physical calls use explicit modes; old mode-less call refuses; raw and envelope input coexist; schema 5/current validator match; all installed file/native identities and Linux executable mode agree; wrong native package version/hash and stale evidence refuse                                                                                                          |

The packaging and trusted qualification tests named in P6 are broader existing entrypoints, not automatic authorization to execute their complete bodies during this task.
Inspect their actual cost and dependencies; reuse their owners for a focused CLI corpus first.
Required full release qualification remains a separate later gate and cannot be replaced by that smaller corpus.

Use real filesystem/process/native boundaries for behavior being proved.
Mock only an external boundary or existing narrow failure seam where appropriate, not the transformation, cleanup or source identity under test.
For output failures use one genuine document that exceeds the pipe buffer, adequate explicit finite memory/output ceilings, an observed-output assertion, a retained nonzero exit assertion and strict task-owned scratch cleanup.
Do not raise a timeout, filter an unexplained leftover or relabel a skip as native proof to get a pass.

After a repair, rerun the failed case and checks affected by its changed inputs.
Report split evidence as split evidence.
There is no new retry mechanism in this design; no retry framework is required.

## Native, package and release proof

Markdown uses a retained external Snapper executable rather than JSON's addon/session cohort.
If the CLI implementation changes no executable bytes, native arguments, Snapper policy assets or native wire interpretation, a rebuild is not inherently required.
The unchanged verified executables and their original build/rights provenance can be repacked into newly versioned companion npm packages, with exact core/native version equality and hashes rechecked.
Do not select the unrelated `scripts/native-build-next.json` upgrade as a side effect of CLI alignment.

If implementation reveals a necessary native change, first prepare and review the exact build-input/protocol change.
Use the existing controlled hosted build/freeze/acquire route and its retained identities; do not install a local Rust/C++ toolchain or dispatch builds without the authority actually granted for that action.
A build result is not automatically staged into the packer's package directories or accepted for release.
Retain source/toolchain/provenance, stage the intended bytes through the owning route, then qualify the actual new tuple.

For package proof, inspect `scripts/core-package-stage.js`, `scripts/pack.js` and their actual qualification caller before freezing.
The root manifest projects exact companion dependencies into the packed core.
Both layouts must use these archives, their frozen lock graph, lifecycle scripts disabled, the actual public bin and the observed native tool.
Markdown's packer already normalizes/checks Linux native executable mode with `scripts/package-archive.py`; retain that mechanism and prove execution in a Linux installed lane.
Windows-only success does not establish Linux support.

The current Node policy has minimum 22.13.0, tested LTS majors 22/24/26, reference 26.13.0 and Ubuntu/Windows platforms, with separate producer and consumer npm versions.
For release, freeze the actual matrix through its owner at that time, including independently required minimum and reference lanes.
Do not freeze today's mutable latest-patch assumptions in this plan or use only the local reference run as proof of the full supported matrix.
Use existing reusable qualification; if focused hosted CLI execution needs an entrypoint, add a closed selection to the existing trusted producer owner without turning it into a release-acceptance shortcut.

| Evidence                                             | Establishes                                                  | Does not establish                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Source inspection and installed 2.0 discovery probes | Current owners and the observed existing invocation behavior | Future implementation, source checkout runtime success or release readiness |
| Exact schema/admission/lint checks                   | Contract coherence and selected code/text properties         | Native execution, complete package contents or output lifecycle success     |
| Focused actual native/process/filesystem tests       | Named changed behavior on the tested host and actual payload | Other platforms, all runtime lanes or complete release qualification        |
| Frozen installed root/isolated CLI corpus            | Exact shipped package/native tuple and tested public shapes  | Anonymous registry readback or every existing release gate                  |
| Complete existing release qualification              | Only its exact source, archives, matrix, run and attempt     | A later modified candidate or an unrun publication/promotion                |

Keep the original failed logs and useful diagnostics through a repair, using existing tool records.
Clean spent task-owned scratch promptly after consumers finish; do not export redundant proof packets or delete evidence still needed to diagnose an unfinished run.
An unexecuted native, installed, hosted or release condition remains a stated gap.

## Decisions, risks and replanning

This plan resolves the normal design choices: preserve selection/root/envelope semantics; use explicit physical modes; add actual format preview and policy-aware raw stdin; keep Markdown JSON reports; adopt result 5; recommend one major package family.
No additional user input is required to finish this document.
Implementation and release remain separate future instructions.

Before implementation, refresh only facts that could invalidate the design: baseline changes, selected/published package version, contract readers, available dependencies/native payloads, and the narrow installed/hosted execution path.
Confirm current schema and qualification callers before hard-coding an expected selection mode or report envelope version.
If a new logical-file requirement would need multi-buffer snapshots, a different link policy or a new native protocol, replan that seam rather than silently widening scope.

The main migration risks are open-ended downstream dependency ranges, strict schema consumers, shell scripts capturing human stdout, implicit write invocations embedded in command builders, virtual self-links and backlink scope, and resource/sink lifetimes.
The acceptance cases and owner map address each directly.
No default lint/format policy changes, broad dependency upgrades, alternate syntax, executable configuration, glob expansion, LSP, cache/watch feature or general performance campaign is included.
A transitive policy-input audit may identify a real missing provenance dependency; repair only that owning relation and keep unrelated metadata/version bytes out of its fingerprint.

Before publication, recovery is a reviewed source change preserving unrelated work.
After publication, use a new qualified immutable coordinate or remain pinned to the previous family; never overwrite published bytes, move historical signed tags or rewrite old evidence.
Downgrading the package does not undo source replacements.
Partial writers require inspection of reported/uncertain files and a fresh preflight, not automatic restoration from a stale preview.
Partial stdout after failed delivery must not be adopted as a valid buffer.

For this document-only task, verification is limited to the existing installed Markdown Quality formatter/checker on this exact new file, whitespace checks and final changed-file/branch/HEAD inspection.
No proposed product, native, installed-candidate or hosted acceptance is claimed.
