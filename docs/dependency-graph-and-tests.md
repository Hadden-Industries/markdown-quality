# Dependency graph and affected JavaScript tests

Markdown Quality uses dependency-cruiser 18.5.0 for development analysis and keeps Node's test runner.
Full package qualification, the complete JavaScript suite, native checks and Markdown/link inventory remain independent controls.
The graph describes imports; it does not prove complete behavioral coverage or native/package provenance.

## Generate architecture views

```sh
npm run graph:dependencies -- --output /absolute/external/path/new-graph-bundle
```

Choose a new directory outside the checkout and any links back into it.
The generator captures all authored JS, MJS and CJS under `src`, `scripts` and `test`, including standalone roots, before applying display filters.
It emits upstream JSON, overview/runtime/test Mermaid views, a separately labelled declared-relation table and snapshot provenance.
Mermaid files use dependency-cruiser's renderer; Graphviz and remote uploads are unnecessary.
Unresolved dependencies and runtime imports of development code or devDependencies are native errors; cycles warn.
The command returns nonzero for native errors while retaining the completed diagnostic bundle.

Configuration is data-only JSON.
The API receives explicit parser, resolver and reporter options and never discovers candidate Babel, Webpack or executable dependency-cruiser configuration.
Local imports cannot resolve outside the source root; third-party internals are not traversed.
Keep standalone CLI and worker roots: absence of an importer is legitimate.

The invoking maintainer owns the bundle.
Retain accepted proof and required failures; dispose of exploratory bundles when their consumers finish.
Existing bundles are never overwritten.
Reports contain local source identities and paths: inspect them before sharing.
No cache or recurring publication is configured.

## Inspect or execute an affected set

Resolve the intended comparison explicitly to its full immutable commit ID.
The coordinator never guesses `main`, the previous commit or a HISEW execution.

```sh
git rev-parse your-reviewed-base
npm run check:affected -- --base <full-commit-id> --list
npm run check:affected -- --base <full-commit-id>
npm run check:affected -- --base <full-commit-id> --shadow
```

`--list` reports the candidate and selection with `executed: false`.
The ordinary invocation runs complete selected files through native Node.
`--shadow` also discovers/runs the independent full inventory and compares common per-test file outcomes, skips and failures.
A failed subset stays failed even if a supplemental full run passes.
Shadow disagreement is nonzero.
Reports retain stdout/stderr, per-test outcomes, timings, selected paths, reasons, supplemental rule IDs and filtered native subgraphs.
The final elapsed time includes selection and execution; full results remain separate fields.

Use repeated `--path <repository-relative-path>` only to add seeds.
These paths never replace authoritative staged, unstaged, committed or untracked changes.
Paths with spaces, Unicode and regex punctuation are literal.
Option-like paths, path escape, links, case collisions and invalid filename encoding are rejected.
An unsafe or corrupt full inventory fails instead of reporting a successful fallback.

```sh
npm run check:affected
npm test
npm run check:full
```

Without an explicit base, `check:affected` runs every current top-level JavaScript test file.
HISEW's unchanged no-argument profile therefore remains full.
`npm test` and `check:full` retain their independent discovery and obligations; `check:focused` still means contract tests.
Affected selection never narrows product Markdown documents or link targets.
Python evidence is separate; full local verification requires stable Python 3.15 or newer in the authorized environment.

## Admission and conservative fallback

Selection unions native reverse reachability over baseline and current graphs, then intersects independently enumerated current tests.
This preserves consumers when an import edge or source disappears.
Added tests select themselves; removed tests force full discovery and a coverage-review reason.
Baseline materialization reads only regular Git blobs into an owned temporary directory, uses the same installed dependencies, and runs no historical code or configuration.
It never switches worktrees or installs historical packages.
Historical snapshots are removed after selection, including failure paths.

The baseline must have byte-identical package metadata, lock, graph config and impact policy.
Missing objects, shallow history, incompatible controls, invalid policy/graph, unresolved native edges, unknown resources or zero selected tests trigger full execution.
No changes also defaults to full verification.
Scripts, schemas, native/platform assets, fixtures, documentation, workflows and root control files select full.
Independently applicable native, Python or full checks are still required for those domains.
Snapshot drift before/during selection or execution invalidates the result.
Selected failures never cause a retry that hides their outcome.

`.test-impact.json` records worker URLs, spawned CLI/qualification runners, generated test imports and source-copy groups for packed consumers.
Each rule carries its source evidence, kind and fixture reference.
Each exceptional rule can activate once, with upstream `format(..., { reaches })` owning every import traversal.
Declared edges are not presented as parsed imports or native cycle findings.

Resource/process builtins, computed loads and selected boundary modules remain full domains when edited.
The guard reuses Acorn already installed by the analyzer solely to recognize risky syntax; it does not parse dependency strings or resolve imports.
New filesystem, worker, process, generated-program and computed-load boundaries need a reviewed policy disposition and independent fixture.
Maintain this inventory whenever those boundaries change; uncertainty requires full verification.

## Limits, evidence and recovery

Analysis admits at most 4,096 inventory entries, 8 MiB per source file, 64 MiB of source contents and 16 MiB of graph/runner output.
Extraction uses a separate Node process with a 256 MiB old-space limit and a 30-second deadline.
These bounds leave room above the current repository inventory while keeping accidental expansion finite.
Test execution has a ten-minute limit; timeout, cancellation and excess output terminate the owned process tree and remain nonzero.
Native cleanup errors return bounded incomplete evidence with the owned harness PID and birth identity where available.
They do not prove child quiescence; retain the workspace for diagnosis until surviving producers are accounted for.
No persistent cache exists.
Hashes bind local contents, Git identities, index, config, policy, lock, tool, runtime, platform, graph and test inventory; they are not authenticated hosted proof.

The contract corpus includes native imports/re-exports/dynamic imports, standalone roots, negative rules, executable-config markers, escaping imports, old/new topology, cycles, multiple changes, worker/process chains, generated-program and source-copy relations, resources, missing baselines, unsafe paths, runner failures, cancellation, timeout and drift.
Seeded leaf failures are caught by selected and independent full execution.
A deliberately defective selection must produce a shadow disagreement when it omits a failing test.
These bounded examples do not prove every future hidden dependency absent.

Small isolated changes can omit unrelated files, but graph generation, baseline acquisition and packed-consumer fan-out can erase savings.
Measure total time on representative settled inputs before treating selection as faster.
One Windows/Node 24.21.0 experiment changed only `literal-protection.test.js`: one of 41 files ran in 13.0 seconds including 9.9 seconds of selection, versus 90.6 seconds for independent full JavaScript discovery; both passed and common outcomes agreed.
This is one local observation, not a general speedup claim or native/Python qualification.
A separate shared `document-memo.js` reachability inspection selected 25 of 41 files, including packed consumers; shared changes may erase savings.
Use the full commands immediately after a missed failure, stale identity, unexplained empty set, relation gap or cost regression; retain the failing evidence and add an independent regression before re-enabling the affected domain.
Required-CI narrowing, hosted graph artifacts, persistent caching and a Jest migration require separate decisions.
