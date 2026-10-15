# Shared JSON Quality adoption implementation plan

Status: **Draft for owner review; implementation is not authorized by this document.**
Prepared on 14 October 2026 for Hadden Industries Markdown Quality.
Revised on 15 October 2026 from the completed OwlAPI adoption and its linked delivery evidence.

The intended outcome is complete, attributable checking of Markdown Quality's JSON through the maintained **@hadden-industries/json-quality** package, while preserving Markdown behavior, native component and licence evidence, package provenance, and supported consumer runtimes.
One maintained engine should own generic JSON rules; Markdown Quality should retain its domain, producer, archive and release contracts.
A successful adoption must improve that outcome, rather than merely reduce a finding count.

**The user explicitly requires every node_modules directory to be excluded.**
The proposed directory boundary is `**/node_modules/**`, covering both root and nested installations, including tooling/json/node_modules.
This authorization comes from the user's current instruction for this plan, not another repository's policy.
Outside that directory boundary, no .json exclusion is permitted except a genuinely external fixture with established provenance and the owner's exact approval.
Git or workflow state, virtual environments, ignored files, native outputs, generated data, schemas, packages, historical evidence and archives do not become external fixtures because of their location, origin, age, inconvenience or failing findings.
All other JSON remains included by default.
Write protection and producer presentation are separate from full checking.

The requested deliverable is this implementation plan only, including the owner's 15 October authorization to revise, commit and push this exact document, directly to remote main where permitted.
That publication records a draft; it does not accept the proposed implementation or its configuration decisions.
No installation, implementation, configuration change, source formatting, build, full product test run, security scan, deployment or registry publication is authorized by this document revision.
The read-only discovery, native npm dry-runs and bounded public document analysis below are observations, not a completed repository-quality pass.

## 1. Authority, prerequisites and proposed route

Maksym Shostak / Hadden Industries is the decision and acceptance owner.
The future coordinating implementer owns integration only after assignment.
Native build, schema, package, CI and release owners retain their current responsibilities.

**R2 is recommended, pending acceptance.**
This change crosses parsing, package acquisition, filesystem write admission, native evidence, published-package boundaries and mandatory verification.
A missed document could weaken release admission; a broad repair could invalidate exact evidence or lose licence information.
No observed requirement establishes an R3 consequence.

The installed HISEW planning procedure is applicable to this personally active project.
The parent coordinator's fresh inspection found Markdown Quality selected, no active execution and no work in progress.
It did not adopt an older execution or act on unrelated passive feedback/resource holds.
Before implementation, recheck the exact checkout, current applicability, actual session identity, execution ownership and selected verification profiles through the supported engine.
An available capability or readable record is not execution ownership, a passed review or permission to run it.

The following remain prerequisites, with Maksym as accountable decision owner:

| Prerequisite                                           | Current status                                                                                                       | Minimum evidence before dependent implementation                                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted change dossier, route and scope               | This plan supplies proposed REQ/AC/QA/DEC identifiers; none is an accepted HISEW record                              | Accept an exact plan revision and its material requirements and risk route                                                                                      |
| Selected design                                        | Isolated public-package adoption with existing native-provider/result-schema-3 APIs is recommended                   | Qualify DEC-002 and the repository-specific DEC-003 provider against independently admitted native bytes                                                        |
| Configuration authority                                | No configuration edits authorized                                                                                    | Accept the exact files/settings in section 9, including finalized values; reject or narrow unnecessary rows                                                     |
| Current reuse and rights assessment                    | Public APIs, selected source, licences and consumer contracts inspected; final adoption clearance pending            | Confirm the selected identity remains current/applicable, inspect its actual licence/transitive terms and intended tool-only use, and record the owner decision |
| Implementation, acquisition and verification authority | Future work only                                                                                                     | Authorize the selected implementation route, installation and required verification separately as applicable                                                    |
| Commit and publication authority                       | Revision, commit and push of this document are authorized on 15 October; implementation delivery remains future work | Reuse the exact document publication authority; later implementation commits/delivery need their own accepted scope and applicable authority                    |
| Review and recovery route                              | Proposed below                                                                                                       | Admit actual independent verifier/reviewer/security capabilities and exact evidence/retention route when required; unavailable evidence remains a gap           |

The HISEW skill's prerequisite gate is not satisfied by invented accepted records.
This draft therefore records conditional implementation choices and their stop points.
It neither approves itself nor starts an execution.
NAM-01, DRY-01, REU-01, VAL-01, LIC-01, NSH-01, SEC-01 and CLEAN-01 guide the proposed work.
No compatibility shim or legacy fallback is proposed.
A new bridge between obsolete contracts would need a specific prior NSH-01 decision, not a renamed helper.

At the first later authorized commit checkpoint, commit the accepted plan itself with only its accepted scope.
Consolidate a coherent candidate before broad review, review repairs narrowly, and reserve external review for the final candidate under separately accepted review authority.
Do not infer current provider availability or a passed security assessment from an earlier repository's review.

## 2. Verified baseline and evidence limits

The target checkout is C:/Users/maksy/GitHub/markdown-quality.
The counts, dry-runs and quality probe below are the retained **14 October baseline**, not a census of the revised checkout.
On 15 October, the local and remote main tips both read **ba9d6be844e340ac08b0aa53bf18dcb92695bbd4**; only this plan was untracked.
The current package scripts already use check:markdown and format:markdown, and the CLI already has format --stdin-request and inspect-profile.
Fresh implementation must reconcile the intervening producer changes and regenerate the population/quality baseline; do not reuse the old counts as current admission evidence.
Its initial worktree was clean on main at **cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2**.
The parent's fresh remote-main readback matched that SHA.
All later unrelated changes remain user-owned; recheck immediately before mutation.
No root, ancestor or nested AGENTS.md/CLAUDE.md, and no docs/development.md, was found in this checkout.
The user's supplied exact-configuration, working-tree, Python, commit and push instructions still apply.

| Authority                                                                                   | Current fact and implication                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Package manifest](../../package.json)                                                      | Version 1.0.3, AGPL-3.0-only; public Node contract is ^22.23.3 or ^24.21.0 or >=26.11.1. The JSON development tool must not narrow that published contract, including its open future-major range                                                         |
| [Contribution guide](../../CONTRIBUTING.md) and [support policy](../support-and-release.md) | Reference development Node is 24.21.0; immutable released 1.0.3 and current source qualification are distinct. Explicit native acquisition and transported consumer qualification retain their owners                                                     |
| [Centralized contracts](../centralized-contracts.md)                                        | Current configuration schema 2, result schema 3 and execution schema 1; installed schemas compile independently. Markdown's native validators and exact logical-document semantics remain authoritative                                                   |
| [Verification driver](../../scripts/verify.js)                                              | Checks original LICENSE bytes, resolves the native tool, probes Python, runs three Python evidence suites, syntax-checks top-level JS, checks broad Prettier scope, runs all top-level Node tests, then checks authored Markdown                          |
| [Dependency and test guide](../dependency-graph-and-tests.md)                               | Complete source graph precedes affected selection. Unknown/configuration/resource changes and untrustworthy selection require full fallback; advisory selection cannot reduce final package, native or hosted obligations                                 |
| [Core staging](../../scripts/core-package-stage.js) and [packer](../../scripts/pack.js)     | stageCore is shared by shipment inspection and real packing. It removes packed scripts, rewrites optional dependencies, retains declared devDependencies and creates assets/source-identity.json; direct root npm dry-run is only a preliminary inventory |
| [Native build guide](../native-builds.md)                                                   | Native report presentation is producer-owned. Frozen files retain their identities; new serialization requires a fresh build, freeze and qualification, not edits to retained evidence                                                                    |
| Local tools observed                                                                        | Node 24.21.0 and npm 12.2.0 were used for read-only pack dry-runs. A .venv directory exists but no usable local Python interpreter was observed; only its .ruff_cache was present                                                                         |
| HISEW status                                                                                | Personal project applicability was inspected by the coordinator; there is no current execution. No OwlAPI legacy-record-reader blocker is inherited here                                                                                                  |

The existing Python wrapper selects the command named python.
This plan does not execute it or treat that global command as the user's permitted local .venv.
Future Python work must resolve a usable approved repository .venv and the existing .python-version authority, or stop at that integration gap.
Creating or changing the environment is separate setup work.

The root has no existing general JavaScript ESLint configuration identified by discovery.
Current full verification uses Node syntax checks, generic Prettier and Markdown's native lint pipeline.
Do not copy OwlAPI's root-ESLint composition as though it already exists here.

### Physical census

Independent Git and filesystem inventories counted regular files without following the observed junction.
These counts describe this snapshot and must be regenerated after acquisition, producer regeneration, tool installation or any relevant source change.

| Population                                       | Observed count | Checking and ownership consequence                                                                                                           |
| ------------------------------------------------ | -------------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracked .json                                    |             30 | Includes package/lock/configuration, schemas, source templates, native manifests, release evidence and consumer examples; all remain checked |
| Ignored installed .json                          |            276 | Excluded by the user's every-node_modules-directory instruction; includes node_modules/.package-lock.json                                    |
| Ignored generated native .json                   |             12 | Six evidence files in each packages/linux-x64 and packages/win32-x64 directory; full checking plus producer and identity protection          |
| Untracked .json                                  |              0 | New untracked JSON must become visible without editing an allowlist                                                                          |
| Physical .git .json                              |              0 | A present or later administrative JSON file is still in scope; zero observed is not an exclusion                                             |
| .jsonld, .sarif, .jsonl, .ndjson, .jsonc, .json5 |              0 | Their zero baseline does not disable supported discovery or dialect refusal                                                                  |
| Total observed physical regular .json            |        **318** | Includes the 276 excluded installed files; this is not a quality pass or archive/source-literal census                                       |
| Current in-scope physical regular .json          |         **42** | 30 tracked plus 12 generated native files, before adding the proposed integration files                                                      |

Exactly one junction was observed: node_modules/@hadden-industries/markdown-quality-win32-x64 points to this repository's packages/win32-x64.
The root manifest's file: native dependencies and lock entries with link: true explain that layout.
The independent census did not traverse the junction or double-count its target.
The shared engine tests configured directory exclusion before link rejection, so the authorized node_modules boundary prunes the containing tree before this junction is encountered.
The observed junction is therefore not an activation blocker under the current scope.
The real target packages/win32-x64 remains included.
No native dependency layout or root lock change is required merely to accommodate this excluded junction.
Links outside excluded directories retain the shared engine's fail-closed contract and need an explicit decision only if actually encountered.

Native npm pack --dry-run --json --ignore-scripts reported 61 root members, including nine JSON, and 14 members with seven JSON for each native package.
The commands inspected no lifecycle scripts because scripts were disabled.
These dry-runs neither built packages nor exercised stageCore.
Actual staged/packed membership, generated source identity, rewritten manifest, member bytes, installed import closure and native evidence need later fresh proof.
No root .tgz or dist archive was present during this inventory.
The native directories do contain retained MPL-SOURCE.tar.xz material; decoded members have not been censused or JSON-qualified by this task.
The 12 current generated native JSON files total 15,860,944 bytes; that measures one population, not total physical/logical demand.
The packer already accepts both array and npm 12 keyed report shapes with one-record/files admission; the shared history lesson requires preserving that behavior, not fixing an unobserved remaining shape bug.

### Bounded current quality observations

One read-only 3.83-second Node invocation analyzed exactly the 30 tracked and 12 generated native JSON buffers through the public checkJsonDocument and jsonContract exports at producer merge 6ec9f9452ff944bd876907b6ecb469e3248cc794.
The probe used the schema-mandated strict defaults and no document exceptions; its input selection excluded every node_modules directory.
It neither created a consumer policy nor ran the complete-root CLI, archive qualification, installed-package qualification or implementation tests.
Every input had a recorded byte length and SHA-256; no licence payload was printed.

| Current input                         |                                     Bytes | Duplicate-key findings | NFC findings | Other semantic findings         |
| ------------------------------------- | ----------------------------------------: | ---------------------: | -----------: | ------------------------------- |
| packages/linux-x64/cargo-notices.json |                                 2,816,253 |                  3,598 |            2 | None                            |
| packages/win32-x64/cargo-notices.json |                                 2,934,065 |                  3,586 |            0 | None                            |
| package-lock.json                     |                                    99,363 |                      0 |            0 | One native empty /packages/ key |
| Remaining 39 included files           | Recorded individually in the probe output |                      0 |            0 | None                            |

The principal failing-input SHA-256 values are:

- Linux notices: 22473eb073afc5d9f451888f96ab31dffc9bf3a55c50650f6fad058ba726df85.
- Windows notices: f5459fbdcf02354f87e1caf051238493f097be172b5af3e4f5e74b359146c29e.
- Root lock: b5c41ee9521989c3b2d6a170a59b72bf2bd364e6eeb961e72b2b23bbbfd173e1.

All 42 analyses reported complete and syntaxValid; completion is not absence of findings.
No byte-admission, syntax or numeric findings were observed.
There were 26 default presentation mismatches: 19 tracked and seven generated native files.
Those presentation observations require the actual repository producer/preservation contracts before classification; they are not permission for a bulk rewrite.
The native lock key needs its precise supported npm contract, while the current cargo findings require the source-owned semantic-conservation work in section 6.
These results are current scoped evidence, not a successful adoption or approved exception set.

### Current owners beyond suffix discovery

| JSON-bearing boundary                                                                                                                                          | Current owner                                                      | Required adoption treatment                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root and nested manifests, native npm locks, graph/impact policies and .github/bootstrap-node.json                                                             | npm, source-policy tests, graph/CI owners                          | Strict checking plus native lock/configuration consumption; lock root empty key only under its exact documented npm contract                                            |
| scripts/schema-sources and schemas                                                                                                                             | generate-schemas.js and existing Ajv/schema tests                  | Repair source authority, regenerate, compare and compile the actual shipped schemas independently                                                                       |
| Native build and rights JSON under assets                                                                                                                      | Native builder, freezer, acquisition/preparation and rights review | Validate generically without replacing checksum, crate, platform, rights or source-admission checks                                                                     |
| component.json, rights-evidence.json, embedded-dependencies.json, component-inventory.json, cargo-notices.json, build-evidence.json under both native packages | Native build/freeze/acquire/prepare chain                          | Check all; prohibit generic writes; repair the source producer and re-freeze approved current outputs                                                                   |
| docs/releases/1.0.2.json and 1.0.3.json                                                                                                                        | Immutable release evidence and publication readers                 | Preserve original evidence and native validation; a discovered generic failure remains an explicit unresolved decision                                                  |
| test/fixtures/performance-incumbents/*.json.gz                                                                                                                 | Frozen historical report oracle described by its README            | Decode through the native owner with limits and exact provenance; preserve the original oracle; neither gzip nor history grants an exclusion                            |
| MPL source archives and future native/core npm archives                                                                                                        | Existing native archive and packaging owners                       | Enumerate actual declared JSON members without extraction, reconcile membership/bytes, and pass admitted buffers through the public analyzer                            |
| Generated source programs, JSON frontmatter/fences, CLI JSON/NDJSON, reports and protocol buffers                                                              | Their source parser, generator, test and transport owners          | Declare actual JSON contracts and expected-negative cases; do not guess that every arbitrary string is JSON or pretend all logical JSON is physical                     |
| Git blobs or other retained evidence used by an active verifier                                                                                                | The existing exact source/evidence reader                          | Account for the actual referenced JSON; do not indiscriminately scan every historical Git object or silently omit an input the verifier relies on                       |
| Installed dependency assets inside any node_modules directory                                                                                                  | Native package manager and owning tool                             | Excluded from generic JSON-quality scope by direct user instruction; existing native lock, payload identity and runtime/package checks retain their independent purpose |
| Tool state outside node_modules, including Git/virtual-environment JSON                                                                                        | Owning tool                                                        | Include actual JSON with write protection where necessary; classify origin and integrity separately from external-fixture eligibility                                   |

No external-fixture exclusion is currently approved for this repository.
The incumbent corpora/reports and upstream source members are investigation candidates only if their actual provenance and test role establish that category.
Historical output produced by Markdown Quality is not automatically an external fixture.
A source string containing malformed JSON remains ordinary data in a valid outer JSON document; its outer file cannot be excluded.
An intentional negative test must identify the exact invalid input, owner, rejection contract and expected diagnostics before it can be admitted as a negative control.
A legacy failure discovered during migration cannot be retroactively labelled intentional.
Renaming a file or moving bytes into an archive solely to avoid checking is not a compliant repair.

## 3. Shared selection and lessons to carry forward

The revised proposed shared source is **e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5**, read back from JSON Quality remote main on 15 October.
Its Git tree **57df6147fdc764ef9ac8a23669a636b9f3706daf** matches the qualified OwlAPI producer pin **ded6b960e588ab708910953fb735b92760c913a3** exactly; both tree identities were checked locally.
The different commit identity follows the owner's separately authorized producer history rewrite recorded in [OwlAPI PR 77](https://github.com/Hadden-Industries/owlapi/pull/77).
The earlier candidate 98b60e6522ceed6b6fdfcd3153c8ceb76d027a81 and merge 6ec9f9452ff944bd876907b6ecb469e3248cc794 explain the original 14 October probe only; they are superseded for new adoption.
Do not rewrite another consumer's retained pin or any published history as part of this plan.
Its package version is 0.1.0-dev.0; this observation establishes no npm publication.
Its supported development runtime is >=24.21.0 <25 or >=26.11.1 <27, with npm >=12.2.0 <13.
The selected graph declares @eslint/json 2.1.1, ESLint 10.12.0, Prettier 3.9.10 and Ajv 8.20.0.

The original 10 October research brief and response in C:/Users/maksy/Downloads motivated distinct discovery, syntax, interoperability, schema, domain and writer gates.
They are historical research, not a current tool selection: their @eslint/json 2.0.1 and Prettier 3.9.9 recommendations and portfolio counts are stale for this adoption.
The maintained [shared consumer guide](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/docs/consumer-guide.md) and exported API now supply the implementation contract, including native providers, pure producer formatting and result schema 3.
The [extraction/adoption plan](https://github.com/Hadden-Industries/universal-ontology/blob/3ce28be700ebac33d3a7e50a794e8043c30138d4/docs/plans/2026-10-13-shared-json-quality-engine-extraction-and-adoption.md) supplies historical design rationale.

The [requested OwlAPI chat](codex://threads/01a13b56-5203-7163-ba5e-b0d7f3013383), its linked proposals, the [final implementation status](https://github.com/Hadden-Industries/owlapi/blob/2d5c731e3777452c594d55e36749971e8d4afffc/docs/plans/2026-10-14-owlapi-json-quality-adoption-implementation-status.md), merged PR 77 and HISEW issue 178 were consulted for the completed implementation and its pitfalls.
Its later owner amendments, exclusion decisions, packed counts, rights schemas, Node-specific lint composition and external-state boundaries do not authorize equivalent Markdown Quality changes.
In particular, none of its cargo-notices or installation exclusions is transferred.

### Completed OwlAPI implementation and preventive changes here

OwlAPI delivered source 2d5c731e3777452c594d55e36749971e8d4afffc through normal merge **2bb43e943abbfc4a21c810614d9043fd9aa446e3**.
Its implementation combined an isolated, locked public package, one generated acquisition bootstrap, a thin trusted native-document supplier and mandatory checks after native producers.
Generic analysis, formatting, preservation, budgets and reporting moved into JSON Quality; native verifiers retained archive/source admission and domain meaning.
This is the architecture to reuse, with Markdown-specific native owners and runtime separation.

| Observed OwlAPI pitfall                                                                                                                      | Preventive requirement for Markdown Quality                                                                                                                                                         | Proof/checkpoint                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Initial consumer scripts accumulated generic counters, reporting and formatting before those responsibilities were moved upstream            | Start with the now-public nativeSources/nativeProviders and pure formatter APIs; keep only native admission and policy facts here                                                                   | SLICE-001/004; AC-005/011; QA-009/014; no parallel local result schema or generic checker            |
| Review found an unsupported format-check call; the producer later removed check-format and producers CLI names                               | Use format --check and check --scope protected; exercise actual installed CLI, closed help grammar and invalid legacy names before full verification                                                | SLICE-002; QA-015; DEC-010; no aliases                                                               |
| Root installations, isolated tools, Python aliases and later CI checkouts exposed different coverage boundaries                              | Keep this plan's sole default exclusion **/node_modules/**; test hidden tracked files and Windows casing; classify every additional boundary instead of importing OwlAPI's seven exclusions         | SLICE-001/005; QA-001/002/013                                                                        |
| Embedded upstream text and manifests had CRLF-converted copies; preserved Unicode pins initially bound derived text rather than source truth | Compare original buffers/embedded values to exact source blobs or locked archive members before approving pins; preserve legitimate original CRLF and enforce effective Git attributes where needed | SLICE-003/004; QA-016; DEC-006                                                                       |
| First-party Java profile and release/provider manifests were initially protected unnecessarily                                               | Classify current generated data separately from published evidence; prefer owning regeneration and fresh byte bindings, removing spent presentation exceptions/write protection when approved       | SLICE-003/004; QA-012/016; CFG-014/015                                                               |
| Later producers exposed ten Maven presentation conflicts, an attempt marker and Unicode-bearing test labels only at the final CI check       | Inventory actual post-test/build reports; keep semantic test inputs while fixing their label/report producer, and require final JSON checks after the last producer                                 | SLICE-005; QA-013/017; exact native-original contracts remain owner decisions                        |
| Packaging/review facts, generated API digests and six browser import-map integrities became stale after final writers                        | Regenerate each affected current identity through its native owner after final bytes settle; exercise actual stageCore, archive and transported consumers                                           | SLICE-004/006; QA-012/017; no copied OwlAPI rights-count/hash protocol                               |
| Browser transport lacked .mjs MIME handling; archive validation and staging exceeded earlier assumptions                                     | Probe actual changed import/process/transport paths on Windows/Linux; measure full staged bytes and bound archive/test/runtime work separately                                                      | SLICE-004/006; QA-007/011/014; browser work only if this repository's changed path actually needs it |
| A producer boundary guard used quadratic excluded-boundary comparisons; Windows case and hidden tracked paths needed follow-up fixes         | Consume the reviewed indexed implementation; test this consumer's real boundary cases without copying the old scan or launching producer suites unnecessarily                                       | SLICE-001/002; QA-002/014                                                                            |
| A new affected selector initially captured an incomplete dependency graph                                                                    | Preserve this repository's complete before/after graphs and declared process/resource relations; test graph incompleteness and conservative whole-suite fallback                                    | SLICE-005; QA-018; full final verification stays independent                                         |
| Fully passing commands still lost final HISEW receipt publication during overlapping evidence promotion                                      | Serialize worktree evidence-store mutations around verification through receipt completion; retain failed attempts and use supported recovery before deciding which checks need relaunch            | SLICE-006; QA-019; DEC-011                                                                           |

The linked [source CI](https://github.com/Hadden-Industries/owlapi/actions/runs/38705519632) and [main CI](https://github.com/Hadden-Industries/owlapi/actions/runs/38707996996) qualify OwlAPI's recorded candidate only.
Its [trusted performance run](https://github.com/Hadden-Industries/owlapi/actions/runs/38705564934) and [missing-link control](https://github.com/Hadden-Industries/owlapi/actions/runs/38705721589) illustrate separate positive/negative evidence, not permission to copy its 192 MiB staging allowance, 256 MiB heaps, archive timeout or performance baseline.
The [Markdown CI failure](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38697863395) led to separate cleanup-observer and later test-path repairs; current main already contains later source.
Do not diagnose an old run as a current JSON-adoption failure or update OwlAPI's deliberately retained Markdown pin.

The following UO/WV history remains background rationale; the completed OwlAPI lessons and revised public contracts above govern this proposed integration.

| Verified source lesson                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Apply here                                                                                                                           | Do not transfer                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| UO [23aa1979e85c970018cc28aa2ffe24619b72f468](https://github.com/Hadden-Industries/universal-ontology/commit/23aa1979e85c970018cc28aa2ffe24619b72f468) and [10035299329c2ca547284878f59f5ba8456ef8f9](https://github.com/Hadden-Industries/universal-ontology/commit/10035299329c2ca547284878f59f5ba8456ef8f9) centralized ownership and made checking include ignored/generated inputs                                                                                                                                                                                                                                                                                                | Default inclusion; one shared generic engine; independently reconcile new paths                                                      | UO discovery exclusions or consumer-specific directories                                                   |
| UO [bcf08947a2894823cc2e08e293a4f7188ecb41cb](https://github.com/Hadden-Industries/universal-ontology/commit/bcf08947a2894823cc2e08e293a4f7188ecb41cb) and [baca599e8cbab6537a6e99915d2762973a3ab985](https://github.com/Hadden-Industries/universal-ontology/commit/baca599e8cbab6537a6e99915d2762973a3ab985) separated NFC and meaningful/interoperable content                                                                                                                                                                                                                                                                                                                      | Check keys and values strictly; preserve only exact qualified values; reject unsafe numbers without coercion                         | Blanket opaque strings, arbitrary whitespace trimming or consumer NFC pins                                 |
| UO [12de332bce19033cf07b61747ee3e0df47f8db75](https://github.com/Hadden-Industries/universal-ontology/commit/12de332bce19033cf07b61747ee3e0df47f8db75) and [bebe34f30c860826bfa99b677540d1649b4d8932](https://github.com/Hadden-Industries/universal-ontology/commit/bebe34f30c860826bfa99b677540d1649b4d8932) addressed semantic comparison and raw serialization identity                                                                                                                                                                                                                                                                                                            | Trace actual sinks; test object-member permutations independently; retain explicit byte/digest/ordered-tuple contracts               | Replacement of every JSON.stringify, ordered-array semantics or native digest algorithms                   |
| UO [7ffb939c32c37c23cf4575649be76270229f4678](https://github.com/Hadden-Industries/universal-ontology/commit/7ffb939c32c37c23cf4575649be76270229f4678), [aaadfc7c278902aae670667eba321da0c5a3eb55](https://github.com/Hadden-Industries/universal-ontology/commit/aaadfc7c278902aae670667eba321da0c5a3eb55) and [e26988a8e40fd66fd2428b575ca88e0004119e68](https://github.com/Hadden-Industries/universal-ontology/commit/e26988a8e40fd66fd2428b575ca88e0004119e68) tightened paths, byte admission and shared CLI                                                                                                                                                                     | Use real supported exports, reject BOM at byte admission, and exercise configuration through its real consumer                       | Inert configuration, JSONC acceptance or copied CLI/resource parsers                                       |
| Producer [5c44155457c7a9cd61b1fba2a92fe8f3143bbcaf](https://github.com/Hadden-Industries/json-quality/commit/5c44155457c7a9cd61b1fba2a92fe8f3143bbcaf), [91dd8b351b5b8110e2285316185be6746a9a9fb9](https://github.com/Hadden-Industries/json-quality/commit/91dd8b351b5b8110e2285316185be6746a9a9fb9), [4d6a083f47c6dfed0df43b2e1b1f2a16f167c8cb](https://github.com/Hadden-Industries/json-quality/commit/4d6a083f47c6dfed0df43b2e1b1f2a16f167c8cb) and [fcc3984e5eb3eef6834fc63515a8b5eeff975f80](https://github.com/Hadden-Industries/json-quality/commit/fcc3984e5eb3eef6834fc63515a8b5eeff975f80) cover npm report shape, bounded accounting, narrow pins and producer protection | Accept native npm 12 keyed reports; make counts and incomplete outcomes truthful; preserve producer ownership                        | Fixed old packlists, all-values exceptions, per-consumer rule copies or blanket limit increases            |
| Producer [899be5c7ca51fb96d0c793ed1874700847b557ec](https://github.com/Hadden-Industries/json-quality/commit/899be5c7ca51fb96d0c793ed1874700847b557ec) and [734f5e8eca15fb2a7e3b2f7d5b625a318444c048](https://github.com/Hadden-Industries/json-quality/commit/734f5e8eca15fb2a7e3b2f7d5b625a318444c048) centralize native acquisition and one cache                                                                                                                                                                                                                                                                                                                                   | One editable source selector; verbatim generated bootstrap; the same native npm cache for installation and verification              | Archive URL acquisition, a second provenance selector, hand-edited lock integrity or a consumer resolver   |
| Producer [98b60e6522ceed6b6fdfcd3153c8ceb76d027a81](https://github.com/Hadden-Industries/json-quality/commit/98b60e6522ceed6b6fdfcd3153c8ceb76d027a81) rejects native tar ignored entries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pin the repaired source; ignored metadata, duplicate/unsafe members and expanded-limit cases must fail complete membership admission | Earlier partial-census success; the review did not establish an actual extraction or outside-write exploit |
| UO [430cbe87a34ed9f1961d7910ae662b766c373e16](https://github.com/Hadden-Industries/universal-ontology/commit/430cbe87a34ed9f1961d7910ae662b766c373e16) and WV [b3468a2a5f047ea28681960dc6ad3769a5f5cbb8](https://github.com/Hadden-Industries/webvowl/commit/b3468a2a5f047ea28681960dc6ad3769a5f5cbb8) remove spent archive exceptions; WV [b002879a9b2e6cc9f329ee8cf150f80eb5567d86](https://github.com/Hadden-Industries/webvowl/commit/b002879a9b2e6cc9f329ee8cf150f80eb5567d86) independently asserts mandatory checks                                                                                                                                                             | Remove only truly obsolete task-owned exceptions; make CI omission a failing contract                                                | Deleting retained native evidence, inherited exceptions or a workflow check that only tests itself         |

The [UO PR 143](https://github.com/Hadden-Industries/universal-ontology/pull/143) merge is 015a356e1fac8bcea3fcfb213954a191ab6f6851.
[UO PR 144](https://github.com/Hadden-Industries/universal-ontology/pull/144) binds source 3ce28be700ebac33d3a7e50a794e8043c30138d4 to merge 41f7aa0fd6825701f33853295e79203cf7dde150.
[WebVOWL PR 79](https://github.com/Hadden-Industries/webvowl/pull/79) binds source 2beeda28f3a589ba6041d2b40ec4d03424df7559 to merge e93411027549dc292d7e324f25107ecf174d4441.
Public readback confirmed those merges.
Their hosted checks, reviews, waivers, configuration approvals and native attestations belong to those candidates, not this consumer.
WV's [25076fdf97b599a82dd6505beddc1cc2015a03f5](https://github.com/Hadden-Industries/webvowl/commit/25076fdf97b599a82dd6505beddc1cc2015a03f5) domain-specific indexed-identity/performance repair and UO's [486701dc22c597ac87533246bc6e419161c46bca](https://github.com/Hadden-Industries/universal-ontology/commit/486701dc22c597ac87533246bc6e419161c46bca) historical-link formatting repair are examples of fixing an owning consumer, not code to import here.

### Pinned source register

These references bind the important current claims to immutable source, while the relative links above remain useful when implementation changes local files.

| Boundary                                      | Pinned source                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer full control and package stage       | [verify.js](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/verify.js), [core-package-stage.js](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/core-package-stage.js), [pack.js](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/pack.js)                  |
| Native output and immutable evidence          | [build-native.py](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/build-native.py), [freeze-native.py](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/freeze-native.py), [native-builds.md](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/docs/native-builds.md) |
| Conservative selection and real package proof | [affected-tests.js](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/scripts/affected-tests.js), [.test-impact.json](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/.test-impact.json), [packaging.test.js](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/test/packaging.test.js) |
| Shared public contracts and policy            | [index.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/index.js), [configuration schema](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/schemas/configuration.schema.json), [CLI](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/cli.js)                                          |
| Shared acquisition and exact installation     | [acquire.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/acquire.js), [installation.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/installation.js)                                                                                                                                                                            |
| Physical/native/logical boundary              | [inventory.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/inventory.js), [documents.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/documents.js), [logical-documents.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/logical-documents.js)                            |
| Shared identity rule                          | [eslint export](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/eslint/index.js), [noJsonStringifyIdentity.js](https://github.com/Hadden-Industries/json-quality/blob/e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5/src/eslint/noJsonStringifyIdentity.js)                                                                                                                                       |

## 4. Proposed requirements and acceptance criteria

These identifiers are proposed traceability labels for owner acceptance.
They do not claim accepted requirements, completed quality scenarios or issued receipts.

| Requirement                                             | Falsifiable acceptance criterion                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Complete scope                                  | AC-001: Every node_modules directory is excluded as authorized. Independent Git/filesystem/native-owner inventories reconcile all remaining relevant physical and declared logical JSON inputs with completed results, explicit negative-control results or unresolved failures. New hidden, tracked, untracked, ignored and generated JSON outside that boundary is included. Any additional exclusion needs exact external-fixture approval |
| REQ-002 Strict interoperable JSON                       | AC-002: Actual consumer invocation rejects malformed outer JSON, BOM/invalid UTF-8, decoded duplicate keys, empty/edge-whitespace/meaningless keys, unsafe Unicode/noncharacters and mathematically integral values outside ±9007199254740991, including decimal/exponent spellings. JSONC/JSON5 is detected and refused                                                                                                                      |
| REQ-003 Default NFC with exact preservation             | AC-003: Keys and ordinary values are NFC-checked. A preserved non-NFC value is bound to one file/pointer, decoded UTF-8 hash/length, owner and reason, with generic writes disabled; JSONL adds a unique decoded record selector. Stale, missing, changed or ambiguous pins fail                                                                                                                                                              |
| REQ-004 Separate checking and writing                   | AC-004: All included documents are analyzed. Producer presentation and byte protection prevent generic writes without skipping validation. A preflight failure prevents the proposed writer batch; actual later partial replacements remain accurately reported. Formatting converges and normalization preserves numeric lexemes and detects key collisions                                                                                  |
| REQ-005 One supported shared engine                     | AC-005: Generic parsing, lint, schema/configuration, CLI flags, resource handling, normalization and guarded replacement use public shared exports. No private imports, sibling fallback, copied engine, shadow parser or redundant configuration schema is added                                                                                                                                                                             |
| REQ-006 Native exact acquisition                        | AC-006: The isolated manifest is the sole editable source selector; native lock/SRI, generated bootstrap, isolation assertion and independent cached-package verification bind the installed engine. Acquisition is explicit, frozen and script-free; checks never acquire or self-repair                                                                                                                                                     |
| REQ-007 Preserve runtime/package boundaries             | AC-007: Published Markdown APIs/CLIs and installed archives remain usable across the existing product runtime contract. JSON tools run only on their supported Node 24/26 contract and are absent from shipped production dependencies, import closure and native payloads                                                                                                                                                                    |
| REQ-008 Repair native producers without losing evidence | AC-008: Raw cargo report bytes are checked before lossy parse; complete crate/licence/source inventory is independently reconciled. Accepted regenerated outputs and both packed native packages pass strict checks and native identity gates. Old frozen bytes and failures remain retained                                                                                                                                                  |
| REQ-009 Preserve domain/oracle authority                | AC-009: Existing Ajv/schema, schema-generation, native protocol, rights, source identity, package and publication assertions remain effective. JSON checking does not change schema meaning, canonical digests, historical review facts or frozen correctness oracles                                                                                                                                                                         |
| REQ-010 Correct serialization identity                  | AC-010: Actual object-semantic comparisons survive key permutations and detect changed/missing/extra values. Ordered arrays, typed memo identities, byte digests and existing hash encodings retain their contracts. The shared ESLint guard executes over the accepted source scope                                                                                                                                                          |
| REQ-011 Mandatory, truthful verification                | AC-011: Full reference verification, independent CI assertions and relevant post-generation/package checks require JSON results. Affected selection cannot omit the new configuration/resource/process inputs or downgrade required final checks. Inventory alone, skipped/incomplete work and partial member censuses never pass as full quality                                                                                             |
| REQ-012 Bounded admission and recoverable delivery      | AC-012: Limits and failures account for actual bytes/members/records; exact input and environment identities bind evidence. Required security/review/hosted observations are complete or explicitly missing. Cleanup preserves user work, failure evidence and live consumers; rollback never claims to undo immutable publication                                                                                                            |

The 15 October synthesis adds these explicit acceptance refinements to the same proposed requirements:

- AC-005/006: The real installed CLI accepts format --check and check --scope protected, rejects retired spellings without aliases, and validates current schema-3 results.
  Source/tree equivalence does not replace this consumer's own lock/cache/install proof.
- AC-008/009: Original source text is verified before preservation; current generated schemas/reports and all changed digest references regenerate coherently.
  Presentation-only regeneration does not claim fresh measurements.
- AC-011: Native documents and authorities participate in shared cumulative accounting, and required final gates execute after the last relevant producer.
  Affected selection cannot conceal an incomplete graph or process/resource edge.
- AC-012: Final native receipt publication completes before competing evidence promotion/cleanup starts; an incomplete receipt remains incomplete even when every command capture passes.

## 5. Proposed architecture and DRY boundaries

### Public integration and source selection

The only editable JSON engine source coordinate will be `devDependencies["@hadden-industries/json-quality"]` in the proposed tooling/json/package.json.
The revised proposed value is git+https://github.com/Hadden-Industries/json-quality.git#e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5.
An exact npm version, or the producer-supported same-package exact npm alias, can replace it only after separate publication and qualification.
Reject tags, branches, partial commits, floating ranges and sibling file links.
The isolated exact-source rule is the native acquisition contract; it does not relax the root's existing >= development-dependency convention.

Native npm owns the isolated package-lock.json, source resolution and SRI.
Do not add a checked-in engine archive, /archive/ URL, second provenance manifest, duplicate commit pin or hand-maintained integrity field.
The previously qualified UO/WV lock integrity is a comparison lead, not a value to copy manually into this consumer's lock.
The consumer's acquisition must produce and verify its own lock against the selected identity.

Materialize the producer's jsonQualityAcquisitionBootstrap() source verbatim as the proposed scripts/installRepositoryQualityTools.mjs.
Use its json selection.
The bootstrap's supported markdown branch is unused: this producer has no tooling/markdown self-installation graph, and none should be created merely to fit that branch.
The generated source is deliberate deployment of a single maintained cold-start implementation, checked for drift against the installed public package; it is not an independently maintained installer.

The shared bootstrap resolves the selected native npm, uses its cache consistently for parent and child, restricts the environment, supplies empty user/global npm configuration, performs frozen npm ci with lifecycle scripts disabled, and then verifies the installation and bootstrap.
The repaired verifier reads the selected npm's native cache and tar parser, verifies the locked cached payload and complete engine-package membership/content, and rejects mismatches, links, unsafe or duplicate members and ignored tar entries.
It performs no extraction, acquisition or writes.
This helper does not independently content-verify every transitive package; native lock/integrity and consumer qualification retain that separate claim.

The proposed tooling/json/public-api.mjs bridge must call assertIsolatedJsonQuality and expose only supported exports.
Use runJsonQualityCli for shared argument, root, limit and error behavior.
The shared CLI has check, inventory, lint, format and normalize; use **format --check** for read-only presentation verification and **check --scope protected** for protected-document diagnostics.
The library/result operations check-format and check-protected are separate API identities, not CLI spellings.
The CLI rejects check-format, format-check, producers and inspect; do not add aliases or a consumer command translator.
Use one closed command/help grammar and run the real installed operation before composing a verification profile.
Current machine reports require result schema 3 and validateJsonQualityResult; regenerate older current reports instead of adding a legacy reader.
Inventory establishes scope, not a quality pass.
No npx or npm exec acquisition path belongs in read-only checks, including offline cache installation.

| Rule or boundary                                                            | Maintained authority and consumers                                      | Proposed local responsibility                                                                                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| JSON syntax, interoperability, NFC, generic presentation and guarded writes | JSON Quality public package                                             | Policy facts and native adapter calls only                                                                                              |
| Source-coordinate parsing, npm cache and installed engine identity          | Shared acquisition/installation APIs using native npm                   | Materialized bootstrap, isolated manifest/lock and public bridge                                                                        |
| Physical discovery and result schema                                        | Shared engine                                                           | Independently reconcile outcomes and the authorized node_modules boundary under DEC-002; no parallel general-purpose filesystem crawler |
| Native/archive/source-buffer membership                                     | Existing Markdown build, archive, generator and protocol owners         | Narrow nativeProviders returning admitted inventories, owned buffers and authorities; shared accounting/checking through runJsonQuality |
| Markdown schema, data and runtime contracts                                 | Existing source validators, schema generator, native protocol and tests | Preserve their acceptance sets and independent expectations                                                                             |
| Core/native shipment                                                        | stageCore, architecture assertion, packer and installed package tests   | Check actual output JSON before it is admitted and after packing; forbid JSON-tool leakage                                              |
| JavaScript serialization identity                                           | Shared ESLint rule plus domain-specific semantic tests                  | New explicit tooling-only configuration, accepted file scope and narrow local contracts                                                 |
| Workflow admission and proof reuse                                          | Current CI-reuse, candidate/publication and HISEW mechanisms            | Add real JSON input/gate obligations; preserve existing source/tree/platform/attempt identities                                         |

Do not centralize unrelated runtime, test-selection, package-publication and hosted-evidence owners into a single JSON helper.
Their independent failure and deployment boundaries are intentional.
New names must describe their actual scope: a source check is not a full package check, and an inventory is not validation.
Document each non-obvious interface and preservation decision at its declaration.

Use verb-first npm names with full-word targets and precise effects: install:json, check:json, inventory:json, lint:json, format:json and format:json:check are the useful core proposals.
The optional diagnostic subset is check:json:protected, and the JavaScript source-identity lint is lint:json:identity; neither replaces check:json.
Do not introduce check:json-format, check:json-producers, md abbreviations or duplicate aliases.
Keep existing check:markdown and format:markdown; Markdown check includes broader lint/link/presentation semantics and must not be presented as a formatting-only check.
Its existing format --stdin-request, inspect-profile and qualifier consumer names describe different effects; inspect-profile is not measured qualification.
Update live callers, docs, CI, help and negative probes together if any accepted name changes; preserve quoted historical command evidence as history.

### Runtime separation

Keep the JSON package entirely development-only and isolated.
Do not add it or @eslint/json to the root production graph, import it from src, or bundle it into native/core archives.
The current root already carries ESLint, Ajv and Prettier as product dependencies; that does not authorize repurposing product runtime imports to load the Node 24/26-only JSON tool.

Propose an explicit tooling-only ESLint configuration, loaded through the isolated public bridge on a supported tool runtime.
The root's installed native ESLint entry can consume that rule if the actual supported combination qualifies.
Require error severity, accepted JS/MJS/CJS scope and unused-disable reporting.
The rule export has no automatic file scope; presence in dependencies is not activation.

The full contributor gate should have an honest reference-runtime contract and require the JSON gate.
The Node 22 and future-major product lanes must retain their existing product checks without eagerly importing JSON tooling.
DEC-004 must settle the smallest explicit orchestration: for example, one mandatory supported-runtime JSON job plus an explicitly named product verification path for product lanes, while check:full on the reference runtime composes all repository obligations.
No silent environment-dependent skip may claim full JSON checking.
Any new profile must reuse the existing verification functions rather than maintain an old/new copied driver.
The existing driver checks only top-level .js syntax; qualification must prove that any new .mjs entry points and explicit config actually execute.
Keep JSON-tool tests in an explicitly composed supported-runtime group rather than eagerly importing the engine from product tests discovered on Node 22.
The product group must retain every existing applicable product test; the reference full gate must independently require both groups.
Do not make a missing tool installation or unsupported tool runtime look like a skipped passing full check.

### Strict rules and narrow preservation

Use the selected shared strict defaults; do not reimplement their parsing or infer dialect from a convenient extension.
All .json, .jsonld and .sarif inputs are strict JSON.
.jsonl and .ndjson use the shared record protocol.
New .jsonc or .json5 input fails explicitly.
Valid JSON can be a scalar; repository schemas decide any stricter shape.

Decoded duplicate names, including escaped-equivalent spellings, fail before object materialization can discard a member.
NFC key collisions are detected before normalization.
Do not trim keys or values, coerce numeric identifiers to strings, round unsafe numbers, sort semantic arrays, or replace a domain's canonical digest with generic serialization.
The native npm lock's empty /packages/ root key may receive only its exact verified native lock exception; no all-empty-key allowance is proposed.

Use preserveNfcValues only for a demonstrated exact-value obligation such as retained original notice text.
It requires a protected file, exact pointer, decoded UTF-8 SHA-256 and byte length, owner and reason; JSONL also requires a unique record identity independent of line number.
All keys and unselected strings remain checked.
No filename, directory, payload or all-strings heuristic makes content opaque.
Fresh values/indices or changed source documents require fresh native reconciliation and renewed exact pins.

Generic format and normalize must skip every node_modules directory and refuse included locks, retained historical evidence, native documents/authorities and other protected bytes.
Current first-party generated outputs require an explicit writer decision: their owning generator may use the public pure formatter and later permit ordinary shared formatting when that preserves generator freshness and domain meaning.
They do not require permanent protection simply because they are generated.
The shared producer-presentation setting intrinsically disables generic writes; allowFormatWrites: false can additionally express protection.
Neither setting excludes the document from checking.
A required quality failure in protected historical data remains an acceptance conflict for the owner; preserving bytes does not make those bytes pass.

### Actual serialization-identity candidates

Source inspection identified candidates, not proven defects:

- scripts/pack.js compares component.build with manifest.build using JSON.stringify; establish whether the native build object contract is semantic and test reordered equivalent members.
- scripts/dependency-graph.js, scripts/architecture.js and scripts/affected-tests.js compare snapshot objects through serialization; verify complete candidate identity, nested values, path ordering and stability before choosing a semantic comparator.
- scripts/affected-tests.js hashes graph/test inventories and compares ordered discovered test arrays and sorted serialized outcome events; determine each contract independently rather than treating every use as object equality.
- src/document-memo.js deliberately builds a sorted, typed ordered tuple that distinguishes undefined, null, -0 and plugin order; preserve this domain identity or reject unsupported inputs as it currently does.
- src/candidate-staging.js and other evidence owners hash explicit record sequences or raw bytes; their exact encoding and ordering remain the native contract.

Classify actual flagged sinks as object-semantic comparison, exact bytes, existing digest or ordered tuple.
Reuse the actual owned comparison contract where appropriate, including src/migration.js and its scripts/compare-quality-reports.js consumer; do not introduce a global canonicalization helper simply to satisfy the source rule.
Use the shared rule's immediately preceding local owner/reason declaration only for a true bytes, digest or ordered-tuple contract.
No file-wide disable or blanket JSON.stringify exception is allowed.
The rule's lexical analysis is bounded and supplements independent permutation/mutation regressions; it is not a general proof of semantic identity.
Trace both source and transported comparison sinks, including cross-realm JSON objects if an actual caller supplies them.
For a frozen oracle, verify the measured helpers from its recorded historical revision; compare today's behavior against that oracle without rewriting its provenance to match current helper bytes.

## 6. Native producer and package cutover

The current builder invokes cargo-about generate with locked/failure/JSON output controls, then reads cargo-notices.json through ordinary Python json.loads and reserializes it with json.dumps, indentation and LF.
It already owns physical presentation.
Ordinary json.loads can collapse duplicate keys before the rewritten report exists.
Parse-and-dump alone is therefore not a valid semantic repair or duplicate-key qualification.

Earlier OwlAPI discovery found thousands of duplicate-key occurrences in retained Markdown native cargo reports and two NFC values in its retained Linux report.
That historical evidence was only a lead.
The bounded current 42-document public API probe independently confirmed the current Markdown native findings recorded in section 2.
No inherited exception or prior consumer acceptance discharges them.

The first future native probe must preserve the raw cargo-about bytes and validate them before permissive parsing.
Reconcile a complete independently expected crate/version/source/licence/notice census against Cargo's locked metadata and the existing compiled-component/rights inventories.
If duplicate properties repeat the same data, that fact must be established for every relevant record; equality of a few examples is insufficient.
Different duplicate values, lost records or ambiguous licence association fail the migration.
Prefer fixing the maintained owning producer/input contract over editing installed JSON or rebuilding a report from an already lossy object.
A cargo-about/tool-version or native build-input change is a separately reviewed selection and configuration change.

Original notice collection retains raw hashes and original UTF-8 text.
Preserve those original texts and copyright/licence attributions; a correct exact-value NFC preservation contract is different from excluding the surrounding JSON.
Do not add an inaccurate claim that UO owns Markdown's third-party notices merely because it hosted an earlier JSON extraction.
The shared package and this repository being AGPL-3.0-only is a technical provenance fact, not final legal clearance for every bundled native component.

For current producer-owned JSON, use public formatJsonSource or formatJsonValue and shared analysis at the final serialization boundary where they preserve the native value and numeric commitments.
formatJsonSource preserves strict token spelling; formatJsonValue admits plain acyclic JSON and rejects accessors, custom serialization, sparse arrays, negative zero and nonfinite/unsupported values.
Neither pure function is a quality pass, a writer or an NFC normalizer.
Keep Python/Rust/native code responsible for its domain records and complete crate/rights collection.
Do not introduce a private Node engine import into shipped Python observers or a consumer runtime dependency.
Where a Python/native producer needs an explicit tooling-only Node check, bind that subprocess interface, input bytes, limits, exit meaning and environment as part of the producer contract.

Validate fresh build outputs before freeze/hash admission.
Freeze a new approved native tuple only after complete JSON and native semantic proof.
Update assets/tool-manifest.json, rights/source evidence and any related native-build settings only through their owning workflow and exact approvals.
A JSON-adoption plan is not authority to rebuild frozen native executables, publish an unchanged version with changed bytes, or edit old release records.
If binaries remain byte-identical, prove it; do not infer it from the intention to change report formatting.

Retained historical bytes continue to be checked and their failures remain visible.
If full historical conformance conflicts with preservation and no approved genuine external-fixture classification applies, activation stays blocked pending an explicit owner decision.
Moving that evidence outside the root does not discharge its declared native-input obligation.
The owner may revise scope or the preservation contract explicitly; the agent may not silently amend the starting rule.

Real pack qualification must use stageCore and the actual release packer.
Check the generated packed package.json and assets/source-identity.json, all shipped schemas/assets, both native package manifests and all native JSON evidence.
Reconcile members before and after native packing and installed extraction using existing package/archive validators.
Check decoded members without overwriting archives, and prove every byte-protected file retains its admitted hash.
Perform generic strict JSON checks on the included source/stage/archive members before installation; do not reintroduce excluded node_modules copies through an installed-file JSON-quality sweep.
Existing installed-package hash, native-resolution and runtime checks remain independent controls.
Do not use the 61-member root dry-run as the actual package proof.
The JSON tool, policy, installer, its dependency graph and development fixtures must not enter shipped core/native payloads.

The existing exported schemas, original LICENSE digest, native executable/mode/rights checks, source identities, SBOM and source/registry attestation gates remain separate obligations.
Any changed current source or packed byte requires the current native identity to be regenerated; historical attestations are neither edited nor carried forward as approval.
There is no OwlAPI rights-inventory count or digest algorithm to import into this repository.

## 7. Physical and logical coverage decisions

The shared physical walker has no built-in .git, node_modules, hidden-directory or nested-repository skip.
The consumer must supply the user's every-node_modules-directory exclusion explicitly.
Outside it, the engine walks those directories and reconciles tracked and ignored/untracked JSON.
Git ignore affects generic write admission, not full checking.
requiredOutputs adds presence requirements without making discovery an allowlist.
The public configuration has no externalRootPaths field.
Do not invent one or rely on a private discovery option.

### DEC-002: qualify the authorized node_modules boundary

Use the supported policy exclusion with paths matching `**/node_modules/**` and a truthful owner/reason citing this user instruction.
The shared walker resolves that directory contract and continues before testing links or descending.
A read-only public jsonContract probe confirmed that the pattern excludes root, nested and tooling/json node_modules paths while leaving packages/win32-x64/package.json and .git/state.json included.
This proves pattern resolution; the final policy's actual end-to-end inventory still requires qualification.

The bounded future probe must:

1. Reconcile the current 42 included physical files, the 276 excluded installed files and the containing exclusion boundaries without following the known junction.
2. Add malformed JSON under root and nested node_modules directories, including the isolated tool installation, and prove it is excluded without being parsed or written.
3. Add malformed peers immediately outside those directories and prove they are checked.
   Keep packages/* source/generated native data, .git, .venv, archives and any unrelated vendor directories included.
4. Keep real unsupported links outside excluded directories fail-closed; do not add a link exemption until an actual required input establishes the need.

The shared engine separately rescues tracked JSON from exclusions and makes it write-protected.
No tracked node_modules path exists in the current Git inventory.
The public-contract probe confirmed that tracked: true overrides exclusion.
Therefore assert before analysis that the checkout contains no tracked JSON under any node_modules directory.
A future tracked entry must fail the boundary contract and require explicit owner disposition or a separately accepted shared-contract change; do not silently check it while claiming that every node_modules directory is excluded.
Do not remove or untrack user files automatically.

Root optional-dependency declarations, install-links settings, executable links and root lock layout do not need to change for this adoption boundary.
The acquisition verifier may still verify the installed engine's native payload identity; that is an independent package-integrity contract, not generic JSON-quality inclusion.

### DEC-003: native buffers and archive membership

The completed OwlAPI extension already supplies the missing public seam; a new shared extension is no longer the default prerequisite.
Use configuration nativeSources with id/provider/owner/reason and a trusted nativeProviders map supplied to runJsonQuality or its CLI context.
Configuration selects a provider name and JSON parameters; it must never import executable modules.
The repository supplier runs the existing native storage/archive/domain verifier first and returns exactly inventory, documents and authorities.

Start with one actual native archive or retained content-addressed JSON member:

- Return each admitted original buffer as path/bytes and each inventory entry as path/sha256/byteLength/source, preserving its independently known identity.
- Use archive-member for a regular contained archive and memberPath; the logical path is `archivePath!/memberPath`.
  Use content-addressed only where the native store actually establishes that contract.
- Supply at least one independently verified physical authority path/hash/length, such as the admitted manifest or lock.
  Never fabricate a digest from the candidate and call it an independent expectation.
- Preserve missing, duplicate, extra, colliding, unreadable and changed-member failures from the owning reader.
  Bind the returned bytes to the actual admitted read rather than a later unbound re-read.
- Let the shared package clone buffers, reconcile identities, protect sources/authorities, recheck snapshots and account for counts, diagnostics and cumulative limits in result schema 3.
- Require validated counts.native and nativeSources summaries alongside physical/logical results.
  Provider errors or uncertain coverage stay incomplete with null unknown counts; a green physical result cannot discharge them.

All native documents are protected from generic writes, including writable-looking manifests named as authorities; Windows case variants must retain that protection.
The physical/logical pointer API remains appropriate for real JSON containers with matching containerPath/pointer/encoding; do not invent one for an archive or protocol buffer.
Raw transient cargo output still needs the section 6 pre-parse probe; no unsupported source kind or fake physical authority is introduced to force it through a native provider.
Use checkJsonDocument for bounded exploratory buffers only, without claiming cumulative admission.
For native or pointer-linked original sources, preserveSourcePresentation may bind approved exact member patterns to admitted hash/length and zero semantic findings; it never excludes them or authorizes unexplained semantic differences.
Ordinary physical files instead need their real producer presentation or exact preserved-bytes contract.
If an actual Markdown storage form cannot fit the current public seam, stop at that precise gap and seek a separately scoped producer extension; do not recreate generic accounting locally.

## 8. Quality scenarios and cheapest discriminating experiments

The integration owner maps each scenario to the actual changed boundary.
Expected results must be authored independently from the implementation under test.
Do not mock the real parser, npm lock/cache, archive reader, schema validator or ESLint configuration in the test that claims those contracts work.
Mock only genuine external network/provider boundaries for failure handling; use real installed and hosted paths for the claims that require them.

| Scenario                                     | Stimulus and required observation                                                                                                                                                                                                              | Oracle and owner                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| QA-001 Complete discovery                    | Add malformed tracked, untracked, ignored, hidden, generated and administrative JSON outside node_modules; each is found or a concrete safe-traversal failure blocks completeness                                                              | Independent Git/filesystem census; integration owner                                                                       |
| QA-002 Installation boundary                 | Root/nested/tooling node_modules are pruned before malformed content or links are analyzed; peers outside remain included; tracked JSON under node_modules fails pre-analysis contract admission; an included unsupported link fails closed    | Independent path/link inventory, native public contract and exact boundary mutations; integration owner                    |
| QA-003 Strict outer JSON                     | Bad syntax, BOM, invalid UTF-8, escaped duplicate names and JSONC/JSON5 fail; odd strings and embedded malformed input retain valid strict outer JSON                                                                                          | Literal independent bytes and shared diagnostics; JSON integration owner                                                   |
| QA-004 Numbers and Unicode                   | Unsafe integral decimal/exponent values, surrogates/noncharacters, meaningless keys and NFC collisions fail; permitted numbers/values preserve exact semantic and lexeme commitments                                                           | Fixed expected tokens and values; shared engine plus domain owner                                                          |
| QA-005 Exact preservation                    | One approved non-NFC notice value passes only its exact pin; changed length/hash/pointer, missing value, duplicate JSONL identity or unrelated non-NFC string fails; writers refuse the protected file                                         | Original source/notice hashes and independent mutations; native rights owner                                               |
| QA-006 Writer admission                      | One bad peer prevents preflight writes; symlink/race or changed input refuses replacement; a later actual failure reports only completed writes; format/normalize converge without altering protected bytes                                    | Before/after identities and real filesystem sentinels; integration owner                                                   |
| QA-007 Acquisition                           | Clean frozen install and native cache verification bind the selected commit; wrong source, missing/wrong cache, altered member/bootstrap, linked/extra member, ignored tar metadata and unsafe paths fail                                      | Native npm lock/SRI/cache and repaired public verifier; acquisition owner                                                  |
| QA-008 Native semantic conservation          | Duplicate-bearing raw cargo data is rejected before lossy parse; fresh admitted output exactly reconciles crate/source/licence/notice membership and original notice values                                                                    | Locked Cargo metadata, rights/component inventories and independent expected records; native owner                         |
| QA-009 Logical coverage                      | Delete/duplicate/change a declared archive/gzip/buffer member or exceed aggregate limits; native coverage fails and cannot be replaced by a green physical result                                                                              | Existing archive/native owner and separate inventory reconciliation                                                        |
| QA-010 Identity semantics                    | Permute object member order; equality and intended semantic identity remain stable. Mutate nested values, ordered arrays or source bytes; the relevant decision changes/fails                                                                  | Independent actual-domain examples and source guard; tooling owner                                                         |
| QA-011 Runtime isolation                     | Product lanes load ordinary APIs/CLIs without JSON tools; supported Node 24/26 tool lanes require the isolated graph; real pack/install inspection finds no tool leakage                                                                       | Actual consumer process and package membership; runtime/package verifier                                                   |
| QA-012 Native schema/domain validity         | Generic valid JSON with wrong domain shape fails the owning validator; generated schemas remain faithful and compile alone; old frozen oracle hashes are not re-authored                                                                       | Existing Ajv, schema, native and performance oracles                                                                       |
| QA-013 Gate independence                     | Omit, skip, cancel or fail JSON setup/check/post-build checks; independent workflow and package assertions fail. A new policy/lock/resource path cannot narrow affected selection                                                              | Existing CI/architecture/impact tests with injected omissions                                                              |
| QA-014 Bounds and evidence truth             | Hit each relevant count/byte/time/diagnostic boundary; explicit overrides change capacity only. Partial/native failures retain their original result and never become complete evidence                                                        | Literal budget fixtures and actual result/exit semantics; verifier                                                         |
| QA-015 Canonical command contract            | Invoke installed format --check and check --scope protected; retired CLI names/aliases and invalid option combinations fail without writes; command help agrees with admission                                                                 | Shared installed CLI and independent expected effects; integration owner                                                   |
| QA-016 Original truth and current generation | Compare admitted original buffers and embedded strings to pinned originals, including legitimate LF/CRLF; altered/missing source fails. Regenerate current outputs and references while preserving historical preimages and measurement claims | Original blob/archive hash/length, effective attributes and owning generators; source/native owners                        |
| QA-017 Final producer outputs                | Produce realistic test labels, JSONL, attempt markers and native/package reports; final check runs afterward and detects new malformed output. Missing/optional/conditional/early gate or bypassed aggregate fails governance                  | Real report producers and workflow mutation probes; CI/native owners                                                       |
| QA-018 Complete affected graph               | Mutate a source import, process/resource relation, deletion and unknown path; incomplete before/after graphs and zero/unknown selection fall back to all tests; untouched baseline/product tests remain included                               | Existing graph selector and independent changed-path cases; architecture owner                                             |
| QA-019 Receipt completion and serialization  | Keep evidence promotion and other same-worktree store writers outside the final verification/receipt interval; if contention occurs, retain capture identities, prove quiescence and inspect supported recovery before any rerun               | Native run/receipt status and actual owner/generation; lifecycle owner; no live-lock fault injection in this consumer task |

Measure actual end-to-end traversal, document count, logical duplication, diagnostics, runtime and memory before selecting overrides.
Shared defaults are 50,000 JSON-family files, 32 MiB per document, 256 MiB cumulative physical/logical bytes, 100,000 logical members, 100,000 JSONL records per file, 10,000 diagnostics, 1 MiB policy, 16 MiB Git output, 64 MiB tool output and 60 seconds per native tool.
Native members consume the logical-member ceiling; physical/native document identities share the file ceiling, and native source/authority snapshots plus admitted member bytes consume the cumulative byte budget.
Measure compressed/expanded/member totals and duplicated physical/logical views explicitly; a small physical census does not establish headroom for archive admission.
The file limit does not bound every non-JSON filesystem entry visited.
The identity rule separately defaults to 64 frames and 100,000 steps.
Supported positive safe-integer overrides, or explicit false/--no-limits capacity bypass, never waive semantic rules.
These cooperative limits are not an OS sandbox.
Do not copy UO's 512 MiB override or drop documents to fit a default.
Any required profile/timeout/capacity change needs its measured reason, exact setting and owner approval.

## 9. Exact configuration decision matrix

Every row is a proposal, not permission.
Before a later configuration write, show the final exact file and setting, its impact, and the smallest change against the then-current contents.
New configuration files count as configuration changes.
Unneeded conditional rows must be removed rather than implemented for symmetry.
Source/document paths below are predictions, not microscopic code instructions or promised line numbers.

| ID      | Exact file or narrowly identified path                                                                                                | Proposed setting/change and smallest impact                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-001 | tooling/json/package.json, new                                                                                                        | Private isolated package; sole JSON devDependency selector is the exact full Git source above; compatible declared tool engines. No JSON package in root production dependencies                                                                                                                        |
| CFG-002 | tooling/json/package-lock.json, new                                                                                                   | Native npm-generated frozen graph and SRI from CFG-001; no manual resolution/integrity editing                                                                                                                                                                                                          |
| CFG-003 | .json-quality.json, new                                                                                                               | Current exported schema; explicit `**/node_modules/**` exclusion with user-authorized owner/reason; no other default exclusions; strict/NFC defaults, exact producer/write-protection facts, required outputs and proven native lock/preservation contracts                                             |
| CFG-004 | tooling/json/source-quality.config.mjs, predicted new                                                                                 | Explicit shared serialization-identity rule, JS/MJS/CJS file scope, error severity, unused-disable reporting and supported-runtime loading; no root runtime import                                                                                                                                      |
| CFG-005 | package.json scripts                                                                                                                  | Core install:json, check:json, inventory:json, lint:json, format:json, format:json:check; normalize:json, check:json:protected and lint:json:identity only where useful. Delegate to canonical shared operations; retain full-word markdown names, update callers, remove retired names without aliases |
| CFG-006 | package.json format:code and format composition; .prettierignore                                                                      | Remove generic JSON write/check ownership from broad Prettier once the mandatory shared gate is active; JSON ignore patterns here affect only generic Prettier, not shared discovery. Preserve Markdown self-CLI ownership                                                                              |
| CFG-007 | scripts/verify.js and any new explicitly named product-verification entry                                                             | Require JSON physical/native/source checks in the reference full gate; preserve current product/native/schema/Markdown checks; explicit product/runtime separation under DEC-004 and syntax/execution coverage for new MJS                                                                              |
| CFG-008 | .test-impact.json                                                                                                                     | Add tooling/json, .json-quality.json and native adapter/acquisition/config/resource/process relations to full fallback/declared relations as required; do not weaken existing full domains                                                                                                              |
| CFG-009 | .dependency-cruiser.json and relevant architecture admission                                                                          | Forbid src-to-tooling/JSON-engine reachability and shipped tool leakage; include the actual new bridge/config/process roots or explicit resource relations; preserve undeclared-package errors, complete graph and shipment enforcement                                                                 |
| CFG-010 | .github/workflows/check.yml and candidate.yml                                                                                         | Explicit supported-runtime JSON acquisition/check gate, independent required result, exact source/cache identity and post-generation/package integration; retain product matrix and candidate/source binding                                                                                            |
| CFG-011 | .github/workflows/native.yml, conditional                                                                                             | Raw cargo report preflight and completed native output qualification before freeze/upload; actual changed build inputs/trigger paths only                                                                                                                                                               |
| CFG-012 | .github/workflows/markdown-quality.yml, publish.yml and registry.yml, conditional                                                     | Change only if touched artifacts/input admission require it; preserve candidate/trusted separation, permissions, exact archived tuple and publication gates. No implicit manual dispatch or publication                                                                                                 |
| CFG-013 | .github/dependabot.yml, optional decision                                                                                             | A separate /tooling/json npm update proposal only if desired and natively supported; exact acquisition selector/lock review remains required. No bot auto-merge or broad upgrade                                                                                                                        |
| CFG-014 | assets/native-build.json, assets/native-rights.json, assets/tool-manifest.json and scripts/native-evidence-contract.json, conditional | Only exact producer/tool/serialization/tuple changes proven necessary by DEC-005, generated through owning build/freeze/rights workflow. No rewrite of historical release evidence                                                                                                                      |
| CFG-015 | scripts/schema-sources/*.json and generated schemas/*.json, conditional                                                               | Presentation or actual accepted source corrections only; regenerate through existing owner and preserve schema versions/IDs/acceptance unless separately decided                                                                                                                                        |
| CFG-016 | HISEW selected verification profile or runtime controls, conditional external configuration                                           | Only if the actual required command/budget changes; exact native setting, evidence root and measured reason must be inspected and approved before mutation                                                                                                                                              |
| CFG-017 | .gitattributes, conditional                                                                                                           | Exact byte-preservation rules only for independently established original text/retained captures where existing LF conversion changes truth; inspect effective attributes and verify clean checkout bytes; no repository-wide removal of LF policy                                                      |

The proposed source adapters and tests are likely scripts/installRepositoryQualityTools.mjs, tooling/json/public-api.mjs, scripts/runRepositoryJsonQuality.mjs, one narrow native-document checker at the selected existing owner, a dedicated JSON-tool test group and extensions to the existing product/producer/package tests.
Their final names and placement must be checked against actual responsibilities and graph rules.
Do not create each predicted file if fewer coherent boundaries suffice.

No changes to .markdown-quality.json, .python-version, .github/bootstrap-node.json, root engines, optional production package versions, deployment policy or public schema meaning are proposed by default.
A discovered necessity becomes an exact additional decision.
This statement is a scope boundary, not permission to leave a required conflict unresolved.

## 10. Decision register

| Decision                                          | Recommended direction                                                                                                                                                               | Gate and owner                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 Scope and acceptance                      | Apply the user's authorized every-node_modules-directory exclusion; accept proposed R2/REQ/AC set with all other JSON included except exact approved external fixtures              | Maksym accepts exact revision; no implementation or configuration permission is inferred from this plan                            |
| DEC-002 Installation boundary                     | Qualify native policy pruning and outside-boundary inclusion; reject future tracked-node_modules contract conflicts before analysis                                                 | Integration/package owners; current excluded junction requires no layout repair or upstream extension                              |
| DEC-003 Native/logical accounting                 | Use existing native admission plus public nativeSources/nativeProviders and shared result-schema-3 accounting; qualify one real member/authority first                              | Native owner plus Maksym; extend upstream only for a demonstrated remaining public-contract gap                                    |
| DEC-004 Runtime and mandatory gates               | Keep public product engines; isolate JSON tools; explicit reference full gate and independent product lanes                                                                         | Runtime/CI owners plus exact CFG-004/005/007/010 approval                                                                          |
| DEC-005 Native report repair                      | Check raw bytes before parse and prove complete licence/component conservation; regenerate through the owner                                                                        | Native/rights owner and Maksym; fresh build/freeze/qualification only when explicitly authorized                                   |
| DEC-006 Historical and exact-value conflicts      | Preserve original bytes and report actual failures; approve exact NFC value pins only where justified; no automatic historical exception                                            | Maksym and relevant evidence/rights owner; unresolved incompatibility blocks full acceptance                                       |
| DEC-007 Acquisition and terms                     | Initial exact repaired Git source; isolated native lock/bootstrap/cache verification; final selected terms cleared for actual use                                                   | Maksym/adoption owner; no inference of publication or legal clearance                                                              |
| DEC-008 Limits and coverage composition           | Retain shared defaults until measured insufficiency; accept exact capacity/profile changes only with evidence                                                                       | Verification owner plus Maksym; no quality-rule bypass                                                                             |
| DEC-009 Assurance and delivery                    | Consolidated candidate, independent verifier, scoped native security assessment, narrow repair review, external final review when separately selected                               | Lifecycle owner; unavailable required evidence remains a gate, not an agent waiver                                                 |
| DEC-010 Names and public cutover                  | Canonical format --check and check --scope protected; full-word noun targets, one script per effect, schema-3 report regeneration and no compatibility aliases                      | Integration owner plus CFG-005 approval; producer changes require separate scope                                                   |
| DEC-011 Verification receipt and delivery cadence | Serialize final native receipt publication against evidence-store mutations; prefer direct signed main delivery where policy permits, preserving exact ancestry and remote readback | Lifecycle owner; reuse document-only push authority, obtain later implementation delivery authority; no force push/history rewrite |

## 11. Vertical implementation slices and commit checkpoints

The integration owner coordinates the slices.
Read-only scope and source-contract work may proceed in parallel when authorized.
Writes to one policy, acquisition graph, native tuple or verification driver must be serialized under one owner.
Native producer repair and archive/check integration share semantic inputs; they are not independent parallel write tasks.

| Slice                                                      | Observable outcome and likely seams                                                                                                                                                                                      | Dependencies and traceability                                                                       | Proof and checkpoint                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 Admit one complete scoped path                   | Accept plan/decisions/config rows; capture current Git/filesystem/native census; qualify the authorized node_modules exclusion and outside-boundary inclusion; demonstrate one authored JSON through the isolated engine | REQ-001/005/006/007; AC-001/005/006/007; QA-001/002/007/011; DEC-001/002/004/007                    | Commit the accepted plan at the first authorized checkpoint. Native clean acquisition, strict included bad peer, excluded malformed peer, no-write hashes and complete scoped reconciliation demonstrate the path            |
| SLICE-002 Make ordinary checking and safe writing coherent | Introduce strict policy, shared CLI entry, exact native-lock key contract, source guard and Prettier ownership split; correct only accepted ordinary source/presentation findings                                        | SLICE-001; REQ-002/003/004/005/010; AC-002/003/004/005/010; QA-003/004/005/006/010; DEC-006/008     | Real CLI/schema/ESLint probes plus independent semantic and writer mutations. Commit source/policy/proof together after config approval; no blanket format of native/history/installed content                               |
| SLICE-003 Qualify the native report producer               | Preserve/check raw cargo output, reconcile crate/licence/notices, establish exact protected value needs, regenerate only the approved current tuple through its native owner                                             | SLICE-001; SLICE-002 public contracts; REQ-003/008/009; AC-003/008/009; QA-005/008/012; DEC-005/006 | Raw duplicate rejection, complete independent census, current output checks, native build/freeze/rights identities. If fresh native work is not authorized or no safe repair is proven, retain failures and block this slice |
| SLICE-004 Close nonphysical and shipment coverage          | Qualify a narrow nativeProviders supplier using the existing owner reader, then shared native accounting; check source/core/native stages and archives while retaining installed-member identity checks                  | SLICE-001/003; REQ-001/007/008/009/011; AC-001/007/008/009/011; QA-009/011/012/014/016; DEC-003/008 | Exact schema-3 member/authority reconciliation, corruption/omission negatives, real stageCore/pack/install proof and absent tool leakage. A proven remaining shared-contract gap needs separate approval                     |
| SLICE-005 Make final controls mandatory                    | Integrate reference full and CI checks, product runtime lanes, affected/full fallback and independent omission assertions; update consumer/development/native docs                                                       | SLICE-002/003/004; REQ-007/009/011/012; AC-007/009/011/012; QA-011/012/013/014; DEC-004/008/009     | Existing focused CI/graph/package tests plus gate-omission mutations. One coherent candidate is ready for broad review; no unqualified partial activation                                                                    |
| SLICE-006 Qualify and deliver the accepted candidate       | Freeze exact candidate, run required local/native/hosted evidence, independent review/security, reconcile resources and perform only authorized source delivery                                                          | All prior slices; every AC; DEC-009 and remaining exact delivery authority                          | Native HISEW full profile once inputs settle, relevant platform/package proof, narrow repair reruns, exact remote readback after authorized push; publication/deployment remain separately reported                          |

Establish SLICE-002's policy and public-interface foundation first, using independent bounded probes without claiming a complete checkout pass.
SLICE-003 depends on that foundation, not on completion of SLICE-002's ordinary source repairs.
The shared writer validates all included peers, so the current native findings block whole-checkout formatting and normalization until SLICE-003's producer repairs and exact preservation decisions are qualified.
Then complete the ordinary source repairs and whole-scope proof in SLICE-002; do not bypass peer admission to make that slice appear green.

These are vertical outcomes, not a promise to commit each row independently when coupled evidence is still missing.
A checkpoint must leave source authority and generated outputs coherent.
Do not publish a half-adopted check that silently excludes native inputs until a later slice.
Focused exploratory invocation is labelled partial until all accepted scope obligations are mandatory.

Before broad review, SLICE-002 also requires QA-015/DEC-010 command proof; SLICE-003/004 require QA-016 source/regeneration proof; SLICE-005 requires QA-017/018 final-output and complete-graph proof.
SLICE-006 requires QA-019/DEC-011 receipt/delivery proof and the final-source sequence below.
The current authorization commits the revised draft now; a future accepted revision must be captured before implementation rather than recommitting this unchanged plan solely to satisfy the old first-checkpoint wording.

## 12. Verification and assurance strategy

Use the repository's npm run entry points for routine controls.
Inspect their actual side effects and selected profile before execution.
Root format and format:code currently write broadly; they are not read-only verification.
The plan-only task uses this document's native Markdown check and its selected R0 focused profile; implementation's proposed R2 obligations remain unstarted.
No implementation test result is claimed here.

During implementation, choose focused checks by the actual changed seam: JSON contract/configuration/acquisition, schema generation, native evidence/text output, architecture/dependency impact, packaging, source policy, CI reuse, candidate/publication admission and runtime/packed qualification.
Existing tests and native validators remain the oracles; new tests must challenge real boundaries rather than mirror implementation.
Run Python only through the accepted local .venv.
Do not run global Python to bypass a missing local environment.

The final full profile must include the shared check, native/logical coverage, identity source rule, independent domain validators and existing full product checks.
Use the supported HISEW completion/capture route for the canonical required run after candidate/configuration/generated inputs settle.
Do not run an equivalent manual full suite first merely to repeat it for a receipt.
Reuse evidence where actual measured inputs and workflow rules permit it, while preserving source, environment, integrity, ownership and failure gates.
An affected-test result is not full verification, and a graph is not complete behavioral coverage.

Use this final-source order to avoid OwlAPI's stale-inventory and repeated-run cycle:

1. Finish the exact selector/lock/bootstrap, command names, native-provider integration, accepted policy and owning producer repairs; run bounded real-consumer probes.
2. Regenerate current schemas, manifests, source identities and affected stage/package evidence from final bytes, including every dependent reference; freeze the coherent candidate and inspect package/import closure.
3. Complete broad review, then narrow repair review.
   Reconcile this plan and implementation status to that final candidate, retaining earlier failed/partial checkpoints as history.
4. Resolve configured cheap gates after the last writer and stage/commit at the route's selected checkpoint.
   Run the required native verification once inputs settle; do not add a second full run for the commit helper's optional witness.
5. Wait for the final receipt, complete captures and producer quiescence before promoting large evidence bundles or making other same-worktree store mutations.
   Then perform authorized direct source publication and read back exact remote ancestry and naturally triggered required CI.

[HISEW issue 178](https://github.com/Hadden-Industries/software-engineering-workflow/issues/178) remains open at this revision.
OwlAPI's first run passed six commands but ended incomplete on a ten-second worktree-publication lock; overlapping evidence promotion was a suspected competitor, not an identified lock holder or proven regression of issues 111/147.
Serialized recovery and a fresh complete run resolved that delivery; they did not fix HISEW or establish publication-only recovery support.
If this recurs, retain the original run/captures, distinguish requester from holder, inspect liveness and native recovery, and explain the exact missing admissible proof before relaunching commands.
Do not increase timeouts, delete locks, edit failed receipts or invent a publication-only success; reuse admitted captures only through a supported native route.

New JSON policy, tooling/lock/installer, producer templates, generated resources, native build inputs and workflow changes must force the appropriate conservative full route.
Unknown or missing relations, changed/renamed/deleted paths, missing comparison context or zero selected tests remain full-fallback conditions.
Add an independent test that removes or bypasses the JSON gate and observes verification/package/CI failure.
Testing only that the new script itself passes is insufficient.

For Node lanes, qualify the actual installed product APIs/CLIs and package layouts at the repository's supported minimum and current resolved stable lanes.
Use canonical supported Node 24 and supported Node 26 for JSON-tool qualification without restricting the product's Node 22 or future-major declaration.
Linux and Windows native/package paths need their actual platform evidence.
A local Windows pass cannot establish Linux archive/native behavior or hosted trust.

Consolidate before broad ordinary and native security review.
The relevant security scope includes package/cache/tar admission, traversal/links, untrusted JSON and archive buffers, guarded writers, subprocess/environment bounds and CI trust separation.
Freeze the exact reviewed target and use one top-level native security workflow with its own bounded workers; do not launch repeated or nested scans as a substitute for a scoped assessment.
Independent correctness verification remains separate from security finding count.
External review is only for the final candidate when separately required/authorized.
Missing, denied, expired or empty reviewer output supplies no assessment.
Earlier UO/WV/producer reviews and security scans are context, not current consumer proof.

After a repair, identify precisely which prior input/evidence is invalidated.
Run narrow repair checks and the relevant final obligations; do not endlessly rerun unrelated passing suites.
Preserve original failed/partial attempts with their real identities.
If an unchanged hosted failure is operational, diagnose and use the accepted bounded retry route rather than deleting or relabelling the failed attempt.
Naturally triggered hosted runs after authorized source delivery require exact source/tree/run/attempt/job/artifact readback.
For this repository, prefer a fast-forward signed push to main when current policy permits; a PR is a policy-driven fallback, not a default checkpoint.
Inspect all outgoing commits and current remote refs first; a changed remote needs scope/ancestry reconciliation, never an automatic force push or inherited authority for history cleanup.
Manual CI dispatch, tag/release publication, registry effects and deployment are not implied.

## 13. Migration, interruption and recovery

This is a coordinated development-tool and producer integration, not a data backfill service.
Existing product configuration/result/execution schema versions and public exports remain unchanged unless a separately accepted semantic change requires otherwise.
There is no planned dual-engine fallback or old/new auto-detection.

For ordinary current JSON, inspect findings before selecting source corrections.
Resolve duplicate keys, meaning, unsafe numbers and NFC collisions with their domain owner; never apply a bulk semantic rewrite merely because the new tool offers a mutator.
Reformat only approved ordinary files after full preflight.
Configuration files need exact approval even when the proposed edit changes presentation only.

Generated schemas/reports are regenerated from their accepted source owner and checked before native hash/signature admission.
Historical release/oracle/native evidence retains its original bytes.
A new current tuple is distinct from the old preserved tuple; one successful regeneration does not erase a historical failure.
The implementation status must show both the new result and any remaining acceptance conflict.

At interruption, retain the candidate commit/tree, staged and untracked scope, accepted decisions, completed AC evidence, raw native outputs, current tuple identities and exact resource owners in the existing task/native record.
On resume, re-read live checkout/selection/ownership and compare actual inputs before using old evidence.
Do not adopt another agent's execution or assume a parent's identity transfers.
A running owned process must complete or use supported bounded recovery before another competing build/check starts.

Abort activation for incomplete scope, an incorrectly applied node_modules boundary, unsafe included links, unresolved immutable-data failures, lost crate/licence records, changed schema acceptance, a runtime regression, tool leakage into the shipment, drifted acquisition/bootstrap, a missing mandatory gate or absent required assurance.
Keep the gate failing accurately and continue only independent authorized work.
The owner decides whether to amend an acceptance requirement.

Before public effects, reverse only this task's exact edits or apply a reviewed coherent forward correction; preserve all pre-existing work.
Do not use Git restoration commands to erase concurrent changes.
Keep old selector/lock/policy/preimages and current generated identities sufficient to reconstruct the last accepted source state.
A package downgrade does not restore already rewritten files.
After source delivery, assess whether a revert or forward fix is compatible with actual consumers.
After immutable package publication, changed bytes need a new coordinated version; a source revert does not undo publication.

## 14. Observability, storage and cleanup

Use existing command results, native inventories and HISEW evidence storage.
Resolve the current external evidence/temp destinations before creating supplemental artifacts; do not default to legacy repository-local .sdlc/runtime.
No new telemetry service, scheduler, generic evidence platform or repository scratch dossier is required.

The integration owner and then the repository owner observe:

- Actual selected engine source, lock/SRI, cache, bootstrap and tool runtime identities.
- Physical and native/logical expected, analyzed, failed, incomplete and protected counts, with exact paths/member identities and no invented complete totals.
- Specific duplicate/Unicode/schema/native-domain findings and whether an owning producer repair conserves the expected records.
- Write admission and actual replacement status separately from check results, including unchanged protected byte sentinels.
- Reference/product lane results, native package tuple, installed import closure and exact required CI outcomes.
- Accepted decisions still pending, evidence invalidated by a change, and any surviving resources with owner and removal trigger.

Reports can contain licence text, repository paths, Git identities, provider metadata and document findings.
Keep required original proof and failures in the appropriate store and inspect before external sharing.
Do not log tokens, broad environment dumps or credentials.
Acquisition should use public anonymous sources where the supported contract expects them.
Candidate files remain data at privileged CI boundaries.

Task-created disposable installs, copies, caches, native outputs, temporary package stages and test repositories need exact owners and consumers.
Reuse native cache ownership deliberately; do not delete a shared/user cache as task cleanup.
Dispose of eligible scratch only after proof, recovery and downstream consumers finish.
Retain accepted native source/notices/archives and failures under existing release obligations.
An ignored directory is not inherently disposable.
No cleanup may manufacture a green result by removing an input still required by the accepted scope.

## 15. Replanning triggers and completion

Replan before dependent work if:

- The baseline, native tuple, selected JSON source/public API, acquisition policy or root installed topology materially changes.
- A new JSON population or referenced logical/archive input cannot be accounted for without a scope change.
- The authorized node_modules boundary fails to prune an installation tree, a tracked entry conflicts with it, or a required included path exposes an unsupported link.
- The native collector becomes a second general discovery/parser/resource framework, or unified accounting requires a changed producer schema.
- A strict failure conflicts with immutable bytes, original notice preservation, historical oracles or an unapproved external-fixture classification.
- Raw cargo repair cannot prove complete crate/licence/source conservation or requires a different native tool/build/version.
- Root/public runtime support, shipped dependencies, schema meanings, digest encodings, registry/release contracts or permissions would change.
- Capacity/profile changes are necessary, a required local runtime is missing, or relevant independent/native/hosted evidence cannot be obtained.
- Recovery would destroy user work, alter immutable evidence, reuse an unowned execution or require an unapproved external effect.

Implementation is complete only when every accepted AC has attributable evidence, all included physical and declared native/logical documents are accounted for, strict failures and preservation decisions are resolved, the native/package/runtime contracts remain qualified, required assurance is complete and resource ownership is reconciled.
A knowingly incomplete check is not completion.
The final report must distinguish saved plan, implemented source, local tests, HISEW completion, hosted checks, source delivery, package publication and downstream acceptance.

For this planning task, completion means this saved reviewable draft, document-focused validation and an exact scope readback.
The 15 October follow-up additionally requires the authorized signed document commit and push with exact remote readback; it does not activate any proposed JSON gate.
Implementation and release remain unstarted.
