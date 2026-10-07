# Opinionated Markdown defaults: HISEW implementation plan

Revision: 5, 2026-10-07, Europe/Bucharest.
Status: draft for review; planning authorized, implementation baseline not accepted.

## 1. Purpose, governing inputs, and scope

Make authored Markdown deterministic, accessible, and easy to review without changing its meaning or surprising existing consumers.
Apply the defaults in [the research document](../research/opinionated-defaults-for-markdown-quality.md), including **required code-block language labels**, which retain the existing default.
**Replace the defaults of the existing `authored-gfm@1` preset in place.**
Keep that preset identifier and a single current policy; do not create another preset or retain the incumbent behavior as a selectable legacy policy.
This owner direction supersedes the research's recommendation to introduce a new preset.
Consumers receive the replacement behavior when they upgrade the package, so package-version selection, explicit release notes, and retained preimages provide the migration and recovery boundary.

This document is the change dossier and implementation handoff for that follow-up.
Its `OD-REQ`, `OD-AC`, `OD-QA`, `OD-DEC`, and `OD-SLICE` identifiers are stable within this change and do not redefine identifiers in the completed [original plan](implementation-plan.md) or [performance plan](performance-implementation-plan.md).
The owner selected the research defaults and replacement of the existing preset in this chat, then explicitly retained the existing code-block language requirement.
The detailed requirements, proposed R2 route, quality scenarios, and design below remain a draft; that selection does not authenticate acceptance of these exact document bytes.

Inspected source: `main` at `8ea213d8ba251d76e9cb29284afd71b9ca8d6d20`, package manifest version `1.0.3`.
Research SHA-256: `62511eac3a673457997c572df5dab2dd512f3b48ca07ea619fa708956a27d8cb`.
The research directory was already untracked and is preserved as the owner's input.
Its opaque citation tokens are not independently retrievable evidence; authoritative references and local observations below support this draft.

HISEW inspection returned personal applicability with `active: true`, profiles `focused`, `affected`, and `full`, and no active execution for this worktree.
The selected procedure is [Thin Implementation Plan](C:/Users/maksy/.codex/plugins/cache/hadden-industries/hisew/0.1.0-dev.17/skills/hadden-industries-plan-software-change/SKILL.md).
No execution, baseline capture, configuration change, scan, delegation, publication, or consumer migration is authorized by this plan.
An accepted baseline and completed adoption/rights evidence are missing implementation prerequisites; they are explicit gates below, rather than assumed facts.

Included: versioned policy/configuration/report contracts, formatter defaults, structural/accessibility checks, advisory diagnostics, YAML support, read-only migration comparison, documentation, and producer qualification.
Excluded: replacing the existing toolchain; embedded-code formatting; network link checking; guessing editorial corrections or code languages; automatic Unicode normalization; fleet migration; expanding consumer file scopes; changing concurrency defaults; and unrelated backlog enhancements.
TOML/JSON front matter remains explicit opt-in; recognition and preservation do not imply schema validation of a site's metadata.

## 2. Proposed risk route

### Risk class:

R2, proposed for this follow-up.
The trigger is changed public configuration, result, CLI/library, formatting, and CI contracts, rather than the size of the code diff.
The completed original R2 execution does not authorize this new baseline.

### Decision owner:

Maksym Shostak, as the requesting owner, for exact scope, route, unresolved contract decisions, and implementation acceptance.
The implementing agent owns integration and attributable evidence within subsequently authorized scope.

### Reasoning:

Observed: configuration and result schemas currently restrict the preset to `authored-gfm@1`; diagnostics support only `error`/`warning`; any diagnostic prevents writes and yields exit 1.
Inferred risks: incompatible machine output, newly blocking findings, parser disagreement, incorrect source rewrites, or advisory findings accidentally admitting unsafe writes.
Severity and write-admission mistakes affect every consumer that upgrades to the replacement package, even when its configuration still names `authored-gfm@1`.
The owner has explicitly selected that policy replacement; use package-version release boundaries and migration evidence to contain adoption risk.
No observed safety-critical or regulatory trigger justifies R3.

### Potential blast radius:

The producer CLI/library and exported schemas; authored documents in each consumer's existing selection; report validators and CI callers; platform archives and release qualification.
Existing consumers can encounter new formatting/findings and changed exit behavior through a dependency upgrade alone; inventory ranges and resolved versions during adoption.

### Reversibility:

Before delivery, restore task-owned source changes using the retained candidate baseline.
For an adopted consumer, restore recorded package, lockfile, configuration, workflow, and document preimages, then rerun incumbent checks.
Installing the prior package does not undo formatted bytes.
Published archives are immutable; a defective release requires a new version or authorized withdrawal/deprecation, not replacement of existing archives.

### Principal unknowns:

Qualification of the resolved LF/literal contract; native formatter interference with canonical markers/front matter; advisory heuristic false positives; supported result-version transition; and new dependency rights clearance.
The cheapest experiments and escalation conditions are in sections 8 and 11.

### Required artifacts:

Accepted exact dossier/route; policy and report fixtures; current dependency/rights inventory; source/config/tool/corpus identities; review dispositions; focused, affected, and full evidence; packed-install evidence; migration comparison; and recovery records for any separately authorized adoption.

### Required specialist lenses:

Independent verification and review of public contracts, semantic/literal preservation, and replacement admission, as required by the installed R2 route.
Use targeted dependency/license and input-boundary expertise where the selected changes create a material gap.
Determine native security assessment scope from the actual patch and applicable policy; this planning request grants no scan or delegation authority.

### Required verification:

Next useful check: narrow native-capability and preservation experiments on owned fixtures.
Final assurance: focused slice proof, affected regressions, registered full verification, independent R2 review, and producer installation/runtime/performance proof on supported Windows/Linux and Node targets.

### Required human approvals:

Accept the exact R2 baseline and consequential unresolved decisions before implementation; obtain actual rights clearance for added inputs.
Publication and exact consumer adoption require their own authority when requested.
Reuse valid existing approvals/evidence within their identity and scope; do not fabricate new acceptance or repeat unchanged assurance without a reason.

### Maximum sensible autonomy:

Currently: inspect and draft this plan.
After implementation authorization and prerequisite closure: implement and verify accepted slices in the selected checkout, preserving unrelated changes.
No automatic delivery, environment acquisition, control relaxation, or consumer edits follow from a completed slice.

### Next lifecycle step:

Review this concrete draft, resolve the material contract gates, and accept exact baseline bytes and route.
Before native execution mutations, recheck applicability and current-session ownership; rediscover configured external evidence/temporary destinations.
Do not reuse completed execution state or historical `.sdlc` directories as defaults.

## 3. Complete default disposition

The research's proposed JSON is a policy specification, not evidence that today's schema accepts those fields.
The replacement must expose truthful effective policy in inspection, with a small consumer configuration retaining `authored-gfm@1` and its authored scope.
An exposed option must be implemented and validated; do not accept inert fields.
Package-owned preset data should define the replacement defaults without introducing a large configurable style surface.
The owner explicitly requires dependency-independent policy selection: every supported native option that determines a selected package policy must be supplied explicitly from reviewed package-owned values, including rule severities, rule options, syntax/front-matter options, formatter options, and native sentence-layout configuration.
Do not derive the effective rule set by spreading an upstream `recommended` configuration or activate newly recommended rules automatically.
Explicitly encode intentional allowances such as HTML and bare URLs, including relevant rule disablements; register only the selected rules and preserve the explicit consumer-override precedence.
Expose the resulting effective policy and relevant native options in inspection and bind their identity to qualification evidence.
Where a dependency has no supported option for a required default, qualify the residual transform or preservation guard rather than claim that implicit behavior has been pinned.

| Area          | Replacement default and acceptance boundary                                                                                                                                                                                   | Requirement          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Dialect       | GFM in every parsing/lint/preservation path; separately identify GitHub alerts, front matter, and emoji shortcodes as extensions                                                                                              | OD-REQ-002           |
| Prose         | One sentence per soft line; unlimited width; clause breaks off; 120-character informational threshold excluding URLs, literals, tables, and code                                                                              | OD-REQ-003, 008      |
| Layout        | LF throughout the file, including literal payloads: physical CRLF and lone CR become LF; tab width 2, final newline; canonical blank spacing around blocks, maximum one consecutive blank line outside protected payloads     | OD-REQ-004, 006      |
| Lists         | `-` bullets; `.` ordered delimiter; sequential numbering retaining the original starting value; one space after markers; `- [ ]` / `- [x]` task markers                                                                       | OD-REQ-004           |
| Headings      | Open ATX headings, no closing hashes; hierarchy errors, at most one H1; legitimate preambles allowed; punctuation advisory, question marks legitimate                                                                         | OD-REQ-004, 007, 008 |
| Code blocks   | Fenced backticks with safe length; convert indented code without changing code value; **language required**, preserve existing language/info strings, require author-supplied labels rather than guessing or inserting `text` | OD-REQ-005           |
| Embedded code | Formatting off; preserve code contents, whitespace, and blank lines; source delimiters/container indentation may change safely                                                                                                | OD-REQ-005           |
| Emphasis      | `*emphasis*`, `**strong**`; malformed internal delimiter spacing remains an error                                                                                                                                             | OD-REQ-004, 007      |
| Breaks        | Actual hard breaks use backslash-newline; forbid trailing prose whitespace; sentence wrapping adds only soft breaks                                                                                                           | OD-REQ-003, 004      |
| Tables        | Canonical GFM pipes/cell padding; column-count errors; no prose-width checks on rows                                                                                                                                          | OD-REQ-004, 007      |
| Links         | Preserve inline/reference form; validate definitions, labels, fragments, and contained local targets; reject root-relative links by default; recommend relative repository links without rewriting remote URLs                | OD-REQ-007           |
| Bare URLs     | Allow GFM literal autolinks; no bare-URL ban                                                                                                                                                                                  | OD-REQ-002, 007      |
| Images        | Missing/empty alt remains an error; meaningful descriptions required; generic-description heuristics advisory and require human judgement                                                                                     | OD-REQ-007, 008      |
| HTML          | Allow and preserve raw HTML, including useful details/image markup; no blanket ban or HTML reformatter                                                                                                                        | OD-REQ-006           |
| Front matter  | Optional leading YAML recognized consistently and preserved, excluded from prose transforms/diagnostics; TOML/JSON only when explicitly selected                                                                              | OD-REQ-002, 006      |
| Emoji         | Preserve Unicode emoji and `:shortcodes:`; no conversion                                                                                                                                                                      | OD-REQ-006           |
| Punctuation   | Preserve author quotes/dashes; no smart-punctuation conversion                                                                                                                                                                | OD-REQ-006           |
| Unicode       | No NFC/NFD rewriting anywhere; prose-only non-NFC `info` enabled by this requested adoption, individually disableable                                                                                                         | OD-REQ-006, 008      |
| Severity      | Error blocks normally; warning advisory normally and blocking under strict; info never affects exit/admission; operational failures remain exit 2                                                                             | OD-REQ-009           |
| Drift         | Fails read-only check; guarded `format` fixes it; warning/info do not prevent ordinary formatting                                                                                                                             | OD-REQ-009           |
| Compatibility | Replace existing `authored-gfm@1` defaults; preserve loadability of existing configurations while documenting changed behavior; compare prior/candidate package versions before mechanical migration and CI upgrade           | OD-REQ-001, 010, 011 |

“One blank line around blocks” is container-aware.
Do not insert spacing that changes tight-list semantics, interrupts a paragraph, or damages HTML/code/front matter.
Literal protection and parsed-meaning checks outrank blind textual substitutions; any unresolvable conflict is reported and returned for baseline revision.

The replacement structural rules explicitly use `error` for: `markdown/heading-increment`, `no-duplicate-definitions`, `no-empty-definitions`, `no-empty-images`, `no-empty-links`, `no-invalid-label-refs`, `no-missing-atx-heading-space`, `no-missing-label-refs`, `no-missing-link-fragments`, `no-multiple-h1`, `no-reference-like-urls`, `no-reversed-media-syntax`, `no-space-in-emphasis`, `no-unused-definitions`, `require-alt-text`, and `table-column-count` (all with the `markdown/` prefix).
Retain the explicit GitHub-alert label allowance.
Retain `markdown/fenced-code-language` explicitly at `error` in the existing preset.
An explicitly selected consumer lint override retains its existing precedence; the replacement default continues to require a language label.
Formatting preserves existing info strings and never guesses or inserts a language.
If converting indented code produces an unlabeled fence, report the missing label and block batch admission until the author supplies one; do not infer a language from the code body.

The proposed advisory defaults are `quality/duplicate-sibling-heading` and `quality/generic-link-text` at `warn`, plus `quality/heading-trailing-punctuation`, `quality/long-prose-line`, and `quality/non-nfc-prose` at `info`.
Document generic alt-text guidance without presenting missing-alt detection as proof of meaningfulness.
If a generic-alt heuristic is added, name and qualify its warning separately; no opaque accessibility inference or automatic alt generation.

## 4. Requirements and falsifiable acceptance

| ID         | Requirement                                                  | Acceptance criterion                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-REQ-001 | One replaced preset and valid configuration/report contracts | OD-AC-001: Existing schema-version-1 configurations still load and select the replacement `authored-gfm@1` defaults; no second/legacy preset exists; unknown presets/rules/options and invalid severities fail explicitly; effective package/policy/configuration and report version are accurate even for empty selections and failures; all incumbent-to-replacement behavior changes have adjudicated oracles |
| OD-REQ-002 | Consistent GFM and selected extension parsing                | OD-AC-002: Representative CommonMark/GFM conformance fixtures and YAML boundaries agree across lint, local links, literal discovery, memoization, and semantic comparison; body diagnostics retain correct original coordinates                                                                                                                                                                                  |
| OD-REQ-003 | Semantic sentence wrapping without hard width                | OD-AC-003: Sentences produce soft lines with clause breaks off; long sentences are not forcibly wrapped; no accidental hard breaks; native failures and unknown diagnostics still fail closed                                                                                                                                                                                                                    |
| OD-REQ-004 | Deterministic source style                                   | OD-AC-004: Every style row in section 3 has golden output and second-pass byte identity, including nested/quoted lists, non-1 list starts, headings, emphasis, tables, hard breaks, and block spacing; parsed meaning is unchanged                                                                                                                                                                               |
| OD-REQ-005 | Required fence languages and protected code                  | OD-AC-005: Labeled fences pass ordinary/strict checks when otherwise clean; unlabeled fences retain an error and block formatting admission; no label is invented; indented-code conversion requires an author-supplied label before admission; labeled tilde/backtick cases converge without losing body content, blank lines, whitespace, or info strings                                                      |
| OD-REQ-006 | Preserve non-prose and author text                           | OD-AC-006: Under default LF, protected code/HTML/YAML payloads match their originals after only physical CRLF/lone-CR normalization; preserve tabs, spaces, blank-line count, escaped sequences, emoji, URL/path content, and Unicode code points; retain native CommonMark code-span value comparison; other payload mutations fail preservation; existing explicit EOL overrides remain supported              |
| OD-REQ-007 | Structural, accessibility, and repository integrity          | OD-AC-007: Every explicit error rule has positive/negative fixtures; broken local targets, references, and supported fragment checks fail; valid alerts, HTML, bare URLs, preambles, and inline/reference choices survive; no network access or execution of consumer code                                                                                                                                       |
| OD-REQ-008 | Actionable bounded editorial diagnostics                     | OD-AC-008: Sibling-heading, generic-link, punctuation, long-line, and non-NFC cases have independent positive/negative fixtures, exact coordinates, deterministic ordering, and documented exclusions; advisory text cannot change source bytes                                                                                                                                                                  |
| OD-REQ-009 | Severity, drift, and write admission                         | OD-AC-009: CLI/library/schema tests prove the mode/severity matrix below, including mixed batches, warnings during format, strict failures, info-only reports, no-diagnostic outcomes, empty selection, and operational failure; no writes precede complete batch validation                                                                                                                                     |
| OD-REQ-010 | Read-only migration comparison                               | OD-AC-010: Comparing the prior package and replacement candidate under the same scopes produces would-format paths and new/resolved errors, warnings, and info with both package/config/tool identities; each source corpus remains byte-identical during checks; no alias/shim or automatic acquisition/execution                                                                                               |
| OD-REQ-011 | Reviewable adoption and recovery                             | OD-AC-011: Consumer guidance supplies an explicit package/preset baseline, separate mechanical/content changes, read-only CI order, strict opt-in, and recorded-preimage restoration; producer completion is distinguishable from consumer acceptance                                                                                                                                                            |
| OD-REQ-012 | Retain bounded, qualified distribution                       | OD-AC-012: All incumbent path, file, diagnostic, worker, timeout, replacement, native-protocol, and cleanup invariants remain covered and pass; supported packed installs validate the replacement contracts/preset and current performance budgets; input and rights inventories identify any additions                                                                                                         |

Proposed replacement mode/severity matrix:

| Condition                                    | Ordinary check          | Strict check | Ordinary format                                    | Strict format                          |
| -------------------------------------------- | ----------------------- | ------------ | -------------------------------------------------- | -------------------------------------- |
| Clean or info only                           | Exit 0                  | Exit 0       | Admit verified candidates, exit 0                  | Admit verified candidates, exit 0      |
| Warning only                                 | Exit 0, retain findings | Exit 1       | Admit verified candidates, retain findings, exit 0 | Exit 1, no writes                      |
| Error                                        | Exit 1                  | Exit 1       | Exit 1, no writes                                  | Exit 1, no writes                      |
| Formatting drift only                        | Exit 1                  | Exit 1       | Fix after validation, exit 0                       | Fix after validation, exit 0           |
| Operational/preservation/convergence failure | Exit 2                  | Exit 2       | Exit 2; no admission before validation             | Exit 2; no admission before validation |

Advisory diagnostics remain in reports even when exit is 0.
With the replacement, `outcome: findings` may coexist with exit 0; document that machine callers must use the selected contract's exit/admission semantics rather than treating any diagnostic as failure.
The incumbent outcome/exit coupling is intentionally replaced, with no legacy-policy branch in the new package.
An interruption or replacement-time filesystem failure can occur after earlier admitted replacements; retain truthful `written`/`unprocessed` state and preimages rather than claiming all-or-nothing filesystem transactions.

## 5. Domain invariants and quality scenarios

Invariants: no consumer JavaScript/config execution; contained paths and no linked parents; no external link fetches; read-only check/inspect; prepare and validate the complete selected batch before write admission; unchanged semantic trees and protected literal content under the precisely bounded physical-EOL equivalence in OD-DEC-008; formatter fixed points; deterministic result ordering; preserved resource limits and explicit errors; private payload cleanup before admission; serial default and supported explicit concurrency unchanged.

| ID        | Stimulus and environment                                                                                    | Required measurable response                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-QA-001 | Upgrade producer with an existing `authored-gfm@1` consumer corpus                                          | Existing configuration loads; all byte/diagnostic/exit/admission deltas match the accepted replacement policy, with no unexplained changes; package/report identity distinguishes old and new behavior                                                                                                                      |
| OD-QA-002 | Noncanonical Markdown with nested containers and literal payloads                                           | Canonical golden output, equivalent parsed semantics and preserved payloads; second format makes zero writes                                                                                                                                                                                                                |
| OD-QA-003 | Missing fence languages, legitimate preambles, HTML, URLs, emoji and front matter                           | Missing fence languages error; valid labeled blocks and legitimate preambles, HTML, URLs, emoji and front matter have no forbidden default diagnostics; exact preservation under the selected contract                                                                                                                      |
| OD-QA-004 | Warning/info/error combinations across multiple documents                                                   | Matrix in section 4 holds; every blocker prevents pre-admission writes; strict never promotes info; complete reports pass their native schemas                                                                                                                                                                              |
| OD-QA-005 | Input tries path escape, linked targets, excessive findings, oversized payloads, or malformed native output | Existing precise failures remain effective within existing bounds; no out-of-root effects, network calls, consumer execution, or relaxed timeout                                                                                                                                                                            |
| OD-QA-006 | Compare/migrate then interrupt or reject adoption                                                           | Comparison writes no source; restore exact retained preimages and package/config/lock/workflow identities; incumbent checks prove restoration                                                                                                                                                                               |
| OD-QA-007 | LF, CRLF, lone-CR and mixed-EOL versions of the same corpus on supported Windows/Linux and Node runtimes    | Default output is identical LF source including protected payloads; escaped newline text and Unicode separators are unchanged; second pass is byte-identical; unsupported payload mutations fail; explicit incumbent EOL overrides retain their documented semantics; attributable platform/runtime/packed-archive receipts |
| OD-QA-008 | Add YAML and advisory work to frozen realistic corpora                                                      | Six consecutive valid full runs per frozen corpus/platform; observed nearest-rank p95 at most 30 seconds and existing platform-specific 512 MiB budgets; retain all failures and metric definitions                                                                                                                         |
| OD-QA-009 | Native checks, candidate preparation, or replacement fail mid-operation                                     | Explicit exit 2 and truthful completion state; workers quiesce; owned staging cleaned or retained with a reported reason; no automatic rerun overwrites evidence                                                                                                                                                            |

## 6. Decisions, reuse, and architectural seams

| ID         | Selected direction or open gate                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-DEC-001 | Owner-selected: apply the research defaults, retain required code-block languages, and replace the existing `authored-gfm@1` defaults; explicitly retain the language rule at error and never invent an info string                                                                                                                                                                                                                                                           |
| OD-DEC-002 | Draft: keep the existing Prettier → Snapper → Prettier composition, GFM parsers, ESLint correctness rules, Ajv validation, bounded workers, and guarded replacement; do not introduce a second general formatter/linter                                                                                                                                                                                                                                                       |
| OD-DEC-003 | Draft: retain configuration `schemaVersion: 1` and `preset: authored-gfm@1`, extend validated optional policy/severity fields where needed, and replace defaults for all loaded configs; emit result `schemaVersion: 2` for changed severity/outcome/effective-config contracts; use a new major package release for the breaking behavior, with exact version selected before delivery; schema version is a machine contract, not a new preset                               |
| OD-DEC-004 | Draft: advisory severities are package-owned metadata mapped around native lint findings, not unsupported ESLint severity values; centralize effective failure threshold for CLI/library/check/format; strict fails on warnings, never info                                                                                                                                                                                                                                   |
| OD-DEC-005 | Draft: reuse maintained front-matter parser extensions for YAML and protect raw payload ranges consistently; prose-only custom rules use parsed positions and explicit exclusions                                                                                                                                                                                                                                                                                             |
| OD-DEC-006 | Draft: use maintained formatter options/AST utilities first; add only qualified source-span transforms for demonstrated residual defaults; no relaxed semantic guard or regex Markdown grammar                                                                                                                                                                                                                                                                                |
| OD-DEC-007 | Draft: retain the native CLI/library and enhance inspection to show effective replacement policy; perform migration comparison through a producer-owned qualification harness over explicitly supplied old/new reports and candidate manifests from separately installed package versions; no new preset selector, compatibility alias/shim, floating acquisition, or automatic execution of a package from report data                                                       |
| OD-DEC-008 | Resolved planning decision under the owner's HISEW-principles request: canonical LF applies throughout selected files, including code/HTML/YAML; preservation means literal-content preservation after only physical-EOL normalization, with native CommonMark code-span semantics retained. No universal raw-byte-preservation claim, mixed-EOL literal exception, guessed embedded-language equivalence, or new mode/shim; existing explicit EOL overrides remain supported |
| OD-DEC-009 | Draft: formatter candidate and drift validation precede lint; lint sees canonical source only after byte identity in check, or sees guarded candidates in format; defer structural lint on drifting check inputs rather than report misleading candidate coordinates                                                                                                                                                                                                          |
| OD-DEC-010 | Owner-selected: the package explicitly owns policy values and native options; upstream recommended/default changes must not silently select a different policy. Exact dependency identities support reproducibility, while reviewed effective-config fixtures, native contract validation, golden outputs and preservation/fixed-point tests qualify every dependency upgrade                                                                                                 |

### Resolved LF and literal-content contract

The owner asked to resolve this ambiguity by applying HISEW principles.
The research explicitly selects LF, including cross-platform identical output.
The intended outcome is portable authored Markdown with deterministic source form and preserved content, rather than preservation of its original physical newline encoding.
OD-DEC-008 therefore selects **LF throughout the file, with literal-content preservation after physical-EOL normalization**.
This resolves the design question; implementation and exact-baseline acceptance remain separate.

For the default policy, each physical CRLF pair becomes one LF and each remaining physical CR becomes one LF, including inside code blocks, inline code, raw HTML, and recognized YAML front matter.
Retain every other payload character, indentation within the payload, tab, trailing space, and blank line.
Literal backslash escape sequences such as `\r\n`, `\n`, and `\u000d` are ordinary authored characters and remain unchanged.
Do not normalize Unicode or treat U+0085, U+2028, or U+2029 as CR/LF source separators.
Fence/heading/list syntax and Markdown container indentation may still change under their independently specified transformations; they are not code-payload bytes.
Final-newline and block-spacing defaults cannot append content inside an open or whitespace-sensitive protected payload: establish a valid boundary and preservation proof, or reject admission.

Reuse Prettier's native `endOfLine: lf` and maintained GFM/front-matter parsers.
The existing package-side preservation comparison is the residual gap: current code/HTML node values can retain CRLF, so a raw value comparison may reject a native EOL-only change.
Compare protected payloads under the exact selected EOL mapping, and independently require all-LF candidate output; do not collapse whitespace or broadly strip control characters to make comparisons pass.
Retain the existing CommonMark-defined code-span value comparison, which treats physical line endings as spaces without collapsing interior spaces/tabs.
Use maintained node/source positions for payload correspondence; reject lost, added, or mismatched payloads.
Keep diagnostic coordinates attributable to the original/canonical source as required by OD-AC-002.
The existing explicit `layout.endOfLine` overrides (`crlf`, `preserve`) remain supported with their documented file-level semantics; `preserve` is not a promise to preserve every separator in a mixed-EOL file.
There is no new per-literal EOL mode or implicit override.

HISEW application:

- OUT-01: preserve documentation content and cross-platform deterministic output; assess consumer hashes, generated-document oracles, and recovery against changed source bytes.
- NAM-01 / DOC-01: name and document the guarantee as literal-content preservation under the selected EOL policy; do not describe changed source bytes as universally byte-preserved.
- REU-01 / VAL-01: use existing native formatter options and consumer parsers; the bounded EOL comparison does not implement a second Markdown, YAML, HTML, or embedded-language grammar.
- PRP-01: resolve the representation ambiguity in this dossier with focused native probes and explicit qualification; do not add a compatibility shim, parser-execution layer, or consumer-specific exception campaign.

Alternatives considered: preserving CRLF only inside literals would create mixed-EOL output and violate the selected default; preserving all original bytes would prevent the requested canonical formatting; interpreting every embedded language to prove executable equivalence would exceed this Markdown package's ownership and execute unnecessary consumer machinery.
The selected contract guarantees Markdown/metadata content under the specified representation policy, not identical source hashes or arbitrary byte-sensitive embedded protocols.
Where a consumer's document is itself a byte-exact fixture, signature input, or immutable record, the consumer must resolve its existing file scope/EOL requirements before formatting that document; do not silently exempt it or claim the prior hash survives.

Evidence refreshed on 2026-10-07: CommonMark defines LF, CRLF, and lone CR as source line endings and gives code spans their own value normalization; YAML 1.2.2 defines scalar line-break style as presentation and normalizes those breaks to LF; HTML preprocessing normalizes newlines before tokenization; Prettier documents native LF output.
These are native consumer contracts, not proof of arbitrary embedded-program equivalence.
Four in-memory probes using installed Prettier `3.9.9` through the existing protected layout path covered CRLF code with trailing spaces/tabs/blank lines and written `\r\n` escapes, multiline inline code, raw `<pre>` HTML, and YAML metadata.
Each output differed only by CRLF-to-LF conversion and was a byte-identical second-pass fixed point.
The maintained Markdown parser retained raw CRLF in code/HTML values, confirming the comparison gap.
These probes establish the selected native capability and counterexample, not full-pipeline or consumer acceptance.
The full LF/CRLF/lone-CR/mixed-EOL matrix and negative-mutation tests remain implementation proof obligations.

### Remaining native style gaps and selected dependencies

Explicit policy ownership is part of OD-REQ-001 / OD-AC-001 and OD-REQ-012 / OD-AC-012, with OD-QA-001 covering dependency-upgrade behavior.
OD-SLICE-001 must replace inherited lint-policy assembly with the explicit package-owned rule/options map and prove the effective native configurations against independently reviewed fixtures; OD-SLICE-007 must retain that proof for the exact qualified dependency graph.
Examples include explicit `endOfLine: lf`, `proseWrap: preserve` at the Prettier stage, `embeddedLanguageFormatting: off`, tab width 2, GFM parsing, YAML recognition, required fence languages at error, and Snapper's unlimited width with clause breaks off.
Also specify other supported options that affect selected policy or its canonical output, rather than relying on today's option omission semantics.
Do not publish speculative option names; validate selected fields/options through each native consumer's supported contract and implement only evidenced residual gaps.
Golden fixtures must cover every selected default and intentional allowance, independently of the upstream recommendation list.
Changing the dependency's recommended rule map must not change the package's effective rule set; effective-config inspection and qualification must detect an unavailable/renamed rule or unsupported option explicitly.
An explicitly configured dependency may still change parsing or formatting implementation across versions.
Exact dependency versions and lockfile integrity identify the assessed implementation; dependency updates require renewed conformance, output, preservation, severity, and fixed-point proof for changed inputs.
Unexpected policy/output differences block the affected upgrade until resolved through implementation repair or an explicit baseline revision, without silently following upstream defaults.

Local capability probe with installed Prettier `3.9.9` preserved a Setext heading and `_emphasis_`, retained repeated `1.` numbering, and normalized a tilde fence, bullet marker, strong marker, and uppercase task marker.
This proves specific residual policy gaps, not the need for a wholesale printer replacement.
Adding a transform that Prettier subsequently undoes must trigger a pipeline-order experiment and fixed-point proof before selection.

On 2026-10-07, native npm registry `latest` readback matched `prettier 3.9.9`, `eslint 10.12.0`, `@eslint/markdown 8.0.3`, and `mdast-util-from-markdown 2.1.0` in the manifest.
Potential YAML additions are `micromark-extension-frontmatter 2.0.0` and `mdast-util-frontmatter 2.0.1`, both registry-declared MIT and already installed transitively.
Declare direct dependencies if importing them directly; transitive presence is not a supported dependency contract or rights clearance.
Refresh exact selected releases, dependency graph, original licence texts/notices and actual rights disposition before adoption.
The pinned Snapper `0.11.9` identity and native rights inventory are observed locally; latest-upstream identity was not independently refreshed here.
Reuse [software selection](software-selection.md), [third-party notices](../../THIRD-PARTY-NOTICES.md), and [native rights](../../assets/native-rights.json) only within their verified identities; close any stale selection/rights gap before new inputs are adopted.

Predicted seams, subject to experiments:

| Concern                            | Likely files/modules                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Presets and effective policy       | `src/configuration.js`, a package-owned preset module, `schemas/configuration.schema.json`                                  |
| Result versioning and thresholds   | `src/quality.js`, `src/contracts.js`, `src/cli.js`, `schemas/result.schema.json`                                            |
| GFM/extensions and diagnostics     | `src/analysis.js`, `src/document-worker.js`, `src/document-memo.js`, a prose-policy module                                  |
| Guarded canonical formatting       | `src/formatting.js`, `src/literal-layout.js`, `src/whitespace.js`, a narrow policy-transform module                         |
| Native policy isolation            | `assets/snapper.toml`, `src/native-tool.js`, `src/native-checks.js`, worker/memo context identities                         |
| Consumer handoff and qualification | `README.md`, `docs/consumer-guide.md`, `test/*.test.js`, packed/runtime/performance scripts and existing candidate workflow |

Preserve existing memo/native identity boundaries.
Any parsing/layout/native reuse must bind syntax options, effective config/policy, original bytes, and tool identity; do not let an incumbent fast path bypass replacement transforms or diagnostics merely because the preset identifier is unchanged.
Keep this within-operation reuse rather than introducing a persistent cache.
Apply NAM-01 to new names and distinguish formatting policy from diagnostic/failure policy; use accurate contract comments and no unexplained compatibility shims.
There is no prior NSH-01 override for a bridge in this change.

## 7. Vertical slices and traceability

Each slice demonstrates a complete consumer-visible path through the single replaced preset while retaining safety invariants.
All slices are needed for the requested final policy; an intermediate slice is an internal checkpoint, not a claim that partial defaults are delivered.
The integration owner is the implementing agent; release/adoption decisions remain with the owner.

| Slice        | REQ / AC / QA / DEC links                                       | Observable increment and falsifiable proof                                                                                                                                                                                                                         | Release / cleanup implication                                                                                              |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| OD-SLICE-001 | REQ/AC-001, 012; QA-001; DEC-002, 003                           | Freeze incumbent corpus/config/result observations, then load existing configs end to end with replacement defaults and accurate package/preset/report identity; negative unknown-preset/options and empty-selection/failure tests                                 | Internal contract checkpoint; no legacy-policy branch or second preset; retain old/candidate oracle identities externally  |
| OD-SLICE-002 | REQ/AC-005, 009; QA-001, 003, 004; DEC-001, 004                 | Prove labeled fences pass and unlabeled fences error with the existing preset; introduce three severities and strict CLI/library paths; prove schema-valid output and complete batch admission matrix, including advisory-only format                              | Internal usable policy path; retain the existing required-language default without invented labels; cleanup fixture roots  |
| OD-SLICE-003 | REQ/AC-002, 006, 012; QA-002, 003, 005, 007, 009; DEC-005, 008  | Format/check YAML-prefaced documents and normalize physical EOLs while preserving other payload content and original body positions; prove LF/CRLF/lone-CR/mixed-EOL matrix, literal mutation rejection, and GFM/alert/HTML/emoji/Unicode/malformed/EOF boundaries | Requires resolved EOL-contract proof and new-input rights evidence; retain failing preservation counterexamples            |
| OD-SLICE-004 | REQ/AC-003, 004, 005, 006; QA-002, 003, 007; DEC-002, 006       | Canonicalize complete mixed documents for every style default; include Setext/closing hashes, emphasis, repeated numbering, safe fences and protected nested literals; golden bytes, parsed-tree comparison, native prose check and second-pass identity           | Internal complete formatter checkpoint; reject oscillating or meaning-changing paths; remove only owned temporary payloads |
| OD-SLICE-005 | REQ/AC-007, 008, 009; QA-003, 004, 005; DEC-004, 005, 009       | Check canonical documents with explicit structural rules and all five advisory rules; prove exclusions, thresholds, fragment/local-target behavior, coordinates and deterministic reports; drift gates lint correctly                                              | Complete default check path; warnings remain author judgement, no autofix; retain independent false-positive dispositions  |
| OD-SLICE-006 | REQ/AC-001, 010, 011; QA-001, 006; DEC-003, 007                 | Compare old/new package reports on identical read-only scopes; prove migration artifact schema and added/resolved findings; exercise a documented package-upgrade migration/restoration on owned corpus copies                                                     | Consumer-ready handoff without consumer writes; retain baseline/preimages until adoption/recovery disposition              |
| OD-SLICE-007 | REQ/AC-001 through 012; QA-001 through 009; DEC-001 through 010 | One frozen candidate passes effective-native-config fixtures, affected/full checks, independent review, packed installs, cross-platform/Node conformance and resource/performance budgets for the replaced preset; produce truthful docs and release evidence      | Producer qualification only; new immutable version and any delivery need authority; consumer acceptance is separate        |

Ordering: 001 → 002 → 003 → 004 → 005 → 006 → 007.
Advisory fixture research and consumer guidance drafting can proceed independently after contract definitions stabilize, but writes to shared parser/preset/result seams are serially integrated.
No delegation is requested or authorized by this plan.
If slice 003 or 004 exposes an incompatible representation, revise downstream fixtures/contracts before continuing; do not carry a speculative shim through later slices.

Focused proof uses the relevant existing families (`contracts`, `cli`, `quality`, `formatting`, `literal-layout`, `lists`, `whitespace`, `replacement`, `document-memo`, `document-analysis`, `native-checks`) plus new replacement-policy/front-matter/migration fixtures where required.
The registered `npm run check:focused` runs only `test/contracts.test.js`; it is insufficient alone for most slices.
Run direct focused Node test selections for actual changed behavior and retain evidence through the native workflow when an execution is authorized.
Affected assurance is `npm run check:affected`; full assurance is `npm run check:full`, including syntax, licenses, native/package evidence, Prettier, tests, and Markdown checks.
Inspect command prerequisites and permitted effects before invoking runtime/packing/candidate checks; a profile name or workflow definition is not proof that an archive was installed and exercised.

## 8. Oracles and discriminating experiments

The producer owns golden bytes, schema fixtures, conformance cases, diagnostic/exit oracles, limits, and package/runtime proof.
Consumer owners retain authored scopes, local product checks, exact rollout approval, and acceptance of editorial findings.
Expected results are independently derived from the selected policy and representative specification examples, not copied from candidate output and called validated.
Use the real installed parser/formatter/native CLI in integration proof.
Mocks are limited to genuine OS/process/network/registry fault boundaries, not Markdown semantics, advisory classification, or successful replacement.

| Uncertainty                          | Cheapest experiment and decision                                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native style support and oscillation | Small mixed-document probe of installed/selected native APIs, followed by nested containers, non-1 starts, fences containing backticks, and semantic/fixed-point checks; select only residual transforms that survive composition                                                             |
| Resolved LF/literal contract proof   | Same YAML/HTML/code document in LF, CRLF, lone CR, and mixed EOL; expected output contains only LF, retains every other payload character, escaped sequences and blank-line count, and converges; injected non-EOL mutations must fail; qualify existing explicit EOL overrides independently |
| YAML consistency                     | Leading YAML with multiline scalar prose, thematic-break lookalikes, EOF, BOM, and nested separators through all analysis/protection paths; declare supported recognition boundaries and preserve raw payload rather than interpret YAML                                                      |
| Advisory false positives             | Freeze a representative corpus and manually label sibling scope, generic text, punctuation, non-NFC and long-line exclusions; require zero unexplained false positives in retained qualification windows, otherwise refine before acceptance                                                  |
| Severity support                     | Native ESLint validates only its supported severities; verify package mapping preserves rule options, disabled rules and native messages while producing real `info` reports; no fake ESLint `info` setting                                                                                   |
| Cross-file fragments                 | Separate same-document fragment fixtures from links into another Markdown file; measure native coverage; if the research intent requires more than supplied coverage, return an explicit residual-gap decision to the owner                                                                   |
| Report evolution                     | Validate old/new full reports with their actual schemas and exercise representative CLI/library callers; determine package semver and how migration comparison identifies both configurations before delivery                                                                                 |
| Performance                          | Compare incumbent and candidate on the same frozen corpora with every expected policy delta adjudicated, then measure added policy/extension work; do not claim historical speedups cover new parsing/rules                                                                                   |

No new dependency, alternative printer, custom semantic classifier, or host acquisition may be selected merely because the first experiment fails.
Refresh deep reuse selection and exact rights evidence if the existing composition cannot satisfy the accepted policy.

## 9. Migration, CI, observability, and security

Existing schema-version-1 configurations continue to name `authored-gfm@1` and now receive its replacement defaults.
This is an intentional package-upgrade behavior change, documented prominently in the release and consumer guide; there is no second preset, legacy mode, or automatic configuration rewrite.
Extend optional configuration fields only as required, validate all exposed fields, and version changed result output separately as specified in OD-DEC-003.
No persistent database, backfill, or fleet reconciler is needed.
Report versioning and migration comparison are public contracts and require native Ajv validation; validate native ESLint rule names/options at their own boundary.

For separately authorized consumer adoption: record exact package/preset/config/lock/workflow/document baseline and a clean or explicitly dispositioned incumbent check; compare old/new packages read-only; format a selected scope with the replacement package in a dedicated mechanical change; resolve new correctness/accessibility errors with author judgement; review warnings/info; then upgrade CI's resolved package while retaining `authored-gfm@1`.
Keep content edits separate from mechanical formatting and select strict separately.
If the incumbent baseline has findings, record them rather than falsely claim clean proof.
Interrupted formatting resumes only after reconciling actual written/unprocessed paths against retained preimages and current bytes.
Cleanup removes owned fixture/staging payloads after their consumers finish, retains durable evidence and failed attempts, and records owner/use/removal trigger for any survivor.

CI discovers only configured authored scope, parses GFM/extensions, builds guarded candidates, and tests byte identity before structural lint/local-link validation.
Drift fails without rewriting; a later developer `format` can resolve it.
Canonical documents receive structural/link/advisory diagnostics; normal errors and strict warnings select failure, info does not.
Every input still receives configured size, parsing, and safety checks; skipping downstream lint on drift cannot skip operational errors or justify writes.

Observability uses bounded existing stdout JSON/text, not telemetry or a new logging service.
Answer: which preset/config/tool generated this result; which files would change; which diagnostic categories changed; which findings actually block; whether literal preservation/convergence failed; and whether replacement completed.
Migration comparison must identify both package versions/source identities, effective policies, configurations and digests; the same preset string cannot distinguish prior and replacement behavior.
Operational exit 2, preservation failures, timeout/limit breaches, unexplained incumbent-to-candidate deltas, unexplained false positives, and resource budget breaches are abort signals.
The implementation/release observer reviews attributable producer receipts; each consumer owner observes its actual adoption and recovery.

Retain no-inline-config linting, isolated native configuration, contained filesystem targets, escaped terminal text, bounded diagnostics/worker execution, and no network checks.
Allowing HTML is parsing/preservation policy, not an HTML sanitizer or assurance about rendered content.
Front matter remains data and must not invoke site plugins, consumer configuration code, or arbitrary loaders.
Evaluate the actual parser/policy/dependency patch for native security assessment triggers and record accountable dispositions; planning, dependency metadata, and tests are not scan evidence.

## 10. Release, rollback, and production acceptance

Freeze one source/config/tool/dependency/rights identity and coherent core/platform archive tuple only after complete replacement-policy proof and invariant regressions.
Update consumer/report documentation and the existing qualification corpus/oracles deliberately; historical results cannot act as replacement truth without independent adjudication of every intentional policy delta.
Use current supported runtime/platform identities from maintained repository metadata.
Keep the incumbent performance gate and observer definitions from [performance qualification](../performance-qualification.md); any changed budget or metric is a baseline decision, not a convenient test adjustment.

Use a new major package release for the changed behavior and machine contract; choose the exact unused version and final exported-schema transition before publication.
Never republish `1.0.3` or an existing platform archive with changed behavior.
An upgrade intentionally changes existing-preset defaults; release notes and comparison evidence must make that effect explicit before adoption.
If rollout is later authorized, use one bounded consumer adoption first with recorded preimages and an accountable observer; expand only after actual consumer checks and recovery evidence.

Abort for semantic/literal loss, incomplete defaults, unexplained behavior deltas or invariant regressions, misleading severity/report behavior, parser disagreement, unresolved rights, unsafe path/write effects, or unqualified resource regressions.
Before publication, restore/revise the candidate using retained source evidence.
After adoption, use the consumer's separately authorized exact-preimage restoration and run its complete incumbent checks; restoring config alone is insufficient.
If publication has occurred, preserve bad-release evidence and select an authorized forward-fix/deprecation route.
Do not promise registry erasure or instant rollback.

Producer acceptance requires complete policy/contract tests, independent R2 dispositions, packed/runtime/cross-platform/resource proof, current rights inventory, and truthful documentation.
Consumer production acceptance additionally requires that consumer's configuration/scope decision, attributable CI/runtime results, absence or accepted disposition of false positives, and recovery proof.
The original plans' completion remains intact; this follow-up does not claim that the replacement defaults already exist or that any consumer has adopted them.

## 11. Prerequisites, replanning, and reassessment

| Gate                                       | Owner and minimum evidence to close                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-GATE-001: Exact baseline and route      | Requesting owner accepts this revision's requirement/design/risk bytes, including severity/write behavior and inspection/report evolution, before implementation                                                                                                    |
| OD-GATE-002: Literal/EOL proof             | Design resolved by OD-DEC-008 under the owner's request; integration owner must prove its exact EOL-only allowance, protected-payload checks, fixed points, original diagnostic coordinates, supported overrides, and negative-mutation matrix before qualification |
| OD-GATE-003: Native reuse and rights       | Integration owner refreshes selected releases/capability experiments and original component terms/notices; accountable owner clears any added inputs; transitive availability/registry MIT labels alone do not close it                                             |
| OD-GATE-004: Public contract compatibility | Real schema/caller evidence confirms result-version/configuration transition and new major release; no old validator is silently treated as accepting the changed report contract                                                                                   |
| OD-GATE-005: Final assurance and delivery  | Accepted R2 verification/review and frozen producer evidence close qualification; publication and consumer migration retain their separately authorized effects                                                                                                     |

Replan when the research file or governing policy changes; native defaults/versions invalidate the probe; a counterexample violates the resolved EOL-only literal contract or tight-list preservation; upstream rules cannot implement the selected checks; YAML requires executing/interpreting content; false-positive findings undermine advisory utility; report consumers require a different version transition; performance limits cannot be met; or required independent/security/rights evidence is unavailable.
Record the specific counterexample and cheapest next evidence rather than silently reduce scope or weaken tests.

Reassess the higher outcome if canonicalization produces noisy diffs without better readability, strict warning mode discourages adoption, advisory checks become editorial policing, or maintaining custom transforms costs more than demonstrated native reuse.
The intended trade-off is one explicit, versioned producer policy with consumer-owned scope and rollout; no fleet uniformity claim overrides local product acceptance.

## 12. Authoritative references

These complement the supplied research and the current source observations; they do not substitute for exact selected-version implementation and rights proof.

- [GFM specification](https://github.github.com/gfm/) and [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) supply grammar and conformance examples.
- [YAML 1.2.2 line breaks](https://yaml.org/spec/1.2.2/#54-line-break-characters) and [HTML input preprocessing](https://html.spec.whatwg.org/multipage/parsing.html#preprocessing-the-input-stream) ground the selected physical-EOL representation rule; they do not establish arbitrary embedded-program equivalence.
- [ESLint Markdown documentation](https://github.com/eslint/markdown) describes GFM/front-matter configuration and structural rules; the installed recommended rule set was also inspected directly.
- [Prettier options](https://prettier.io/docs/options) distinguish prose wrapping, embedded formatting, and EOL settings; the installed formatter probe identifies actual remaining style gaps.
- [Unicode normalization specification](https://unicode.org/reports/tr15/) supplies NFC definitions; this policy reports selected prose cases and never rewrites normalization.
- [Micromark front matter](https://github.com/micromark/micromark-extension-frontmatter) and [mdast front matter](https://github.com/syntax-tree/mdast-util-frontmatter) are candidate maintained extension boundaries requiring adoption evidence.
- [Snapper upstream](https://github.com/TurtleTech-ehf/snapper) supplies the existing native sentence-formatting capability; local manifest/config identity is not a latest-upstream claim.
