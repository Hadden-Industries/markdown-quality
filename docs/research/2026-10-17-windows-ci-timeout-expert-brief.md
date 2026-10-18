# Markdown Quality Windows CI timeout research brief

Prepared 17 October 2026 for an engineer specialising in npm and Arborist, Windows process and filesystem behaviour, and CI performance diagnosis.
The requested outcome is an evidence-backed diagnosis, ranked fixes, and small runnable remote CI test cases that distinguish the competing explanations without repeatedly rebuilding and qualifying the entire project.

The latest existing runs show two unresolved failure classes: a fresh consumer installation exceeds its 120-second command deadline, and other product suites exhaust their 600-second deadline while a final offline reinstall is still running.
The latter reinstalls had only about 22 and 30 seconds of suite time remaining; those observations do not establish a stuck reinstall.
Both corpus performance qualifications, release security, distribution SBOM validation, and a separate transported-candidate workflow passed on the same source.
Release qualification remains failed.

This is a research handoff, not an implementation or execution instruction.
The owner stopped further builds because the investigation had become a slow loop.
No new tests, builds, workflow dispatches, reruns, commits, pushes, package stages, or releases were performed to prepare this brief.
Existing logs and an existing archive artifact were read and downloaded.

## Questions for the expert

1. What causes the 120-second installation failures: registry operations, dependency resolution, local tarball processing, shared cache or filesystem contention, a specific npm implementation, or a combination?
2. Are the 600-second failures predominantly cumulative suite work and scheduling, or is there an additional lifecycle defect?
   Explain the outer and inner deadlines separately.
3. Which earlier fixes remain correct, which addressed only a narrower condition, and which could have introduced additional cost?
   Identify a regression only where a controlled comparison supports it.
4. Are the current 120-second install, 600-second suite, and 30-second corpus limits justified for their respective workloads?
   Evaluate the measurement contracts and headroom without proposing a threshold increase as the first repair.
5. What is the smallest useful remote experiment for each leading hypothesis, and what result would falsify it?
6. Supply actual small test files and a minimal manual workflow, with exact commands, prerequisites, budgets, expected results, and cleanup.
   A recommendation to rerun the existing full workflow is insufficient.

Keep the sole-maintainer direct-main workflow, deliberate release approval, and existing release gates.
Do not require PRs, GitHub Enterprise, a public-preview feature, a larger paid runner, weakened integrity or audit checks, disabled endpoint protection, or publication to diagnose this.
The unresolved OPEN-010 release decision and approval of a new release version remain separate authorities.

## Frozen source and current run evidence

All four latest workflows below used commit [`2f4718f05df9565ba9d9bb0f14ef56f0ca93a539`](https://github.com/Hadden-Industries/markdown-quality/commit/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539), tree `17b53b7181ccd3dbd42480245aa9b68b9d90163b`.
Times are UTC; Bucharest was UTC+3 on this date.
These are completed existing runs, not new experiments.

| Existing workflow                           | Run                                                                                           | Created and completed UTC | Result |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| Qualify a deliberate release                | [39002858116](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116) | 04:31:00–04:44:21         | Failed |
| Package qualification on push               | [39002856425](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856425) | 04:30:59–04:43:52         | Failed |
| Transported candidate qualification on push | [39002856523](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856523) | 04:30:59–04:41:27         | Passed |
| CodeQL, displayed as Push on main           | [39002856439](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856439) | 04:30:59–04:32:17         | Passed |

The manual run passed 13 of 14 product matrix jobs and all 14 candidate consumer jobs.
Its Windows Node 26.12.0 product job failed; the product-required and final qualification jobs then failed as aggregators.
The optional shared-workflow branch was skipped.
The push product run instead failed Windows Node 22.23.3 and 24.0.0; its Windows Node 26.12.0 job passed.
Successful sibling jobs do not replace either failed gate.

### Failure A: two fresh installs in one Windows product job

Read [manual Windows Node 26.12.0 job 117309476975](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117309476975).
The selected product runtime was Node **26.12.0**, npm **11.20.0**.
An earlier setup step used tooling Node 24.21.0/npm 11.19.0; it is not the npm identity of the failed install.

The job ran Windows Server 2025, OS 10.0.26100, image `windows-2025-vs2026`, image version `20261007.264.1`, runner 2.337.0, in Azure `westus3`.
The npm invocations reported `status=null`, `signal=SIGTERM`, and `error=ETIMEDOUT`.

| Failing test                                                                                                                           | Install elapsed | Longest retained completed phases                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------- |
| `packaging.test.js`: packed root and isolated consumers install without lifecycle scripts and execute offline                          |       120034 ms | Windows native package `reifyNode` 47183 ms; `idealTree:buildDeps` 38291 ms; `idealTree:#root` 36228 ms |
| `packed-qualification.test.js`: clean frozen source archives qualify through the installed public boundary without release publication |       120203 ms | Windows native package `reifyNode` 47666 ms; `idealTree:buildDeps` 38691 ms; `idealTree:#root` 36708 ms |

The first test had already spent 88703 ms packing archives and 30454 ms independently inspecting the shipment.
Its fixture cleanup took 2153 ms.
The Node suite exited with two failed tests after **382829 ms**, status 1.
This was not a 600-second suite timeout.

The two completed phase profiles are strikingly similar and concern installs that can overlap within one job.
That supports investigating shared local resource pressure, but does not prove a race or a cache defect.
The native package is supplied through a local archive, so its long `reifyNode` duration is not itself evidence of a slow registry download.
The timer can include other work or waiting in npm's installation path.
The retained failure tail contains many completed dependency extraction timings but no completed core-package timer; an absent completion is not sufficient to identify the blocked operation.

### Failure B: the suite deadline interrupts the final offline reinstall

Read [push Windows Node 22.23.3 job 117309412034](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856425/job/117309412034) and [push Windows Node 24.0.0 job 117309412081](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856425/job/117309412081).
Their product npm versions were **10.9.9** and **11.3.0**, respectively.
They used the same Windows image version as failure A, in `westus3` and `southcentralus`.

| Completed phase in `packaging.test.js` |           Node 22.23.3 |            Node 24.0.0 |
| -------------------------------------- | ---------------------: | ---------------------: |
| Pack archives                          |               32793 ms |               30907 ms |
| Inspect shipment                       |               29466 ms |               34050 ms |
| Root install                           |               88831 ms |               91587 ms |
| Root runtime qualification             |              109124 ms |               91846 ms |
| Root offline reinstall                 |               35286 ms |               41598 ms |
| Isolated install                       |               40099 ms |               57042 ms |
| Isolated runtime qualification         |               68959 ms |               61105 ms |
| Isolated offline reinstall             | Started; no end marker | Started; no end marker |
| Outer Node suite deadline              |   600012 ms, ETIMEDOUT |   600009 ms, ETIMEDOUT |

The final offline starts appear at 04:43:16.538 and 04:42:47.908 UTC; outer termination appears at 04:43:38.692 and 04:43:18.089.
These log intervals are approximately **22.15** and **30.18 seconds**.
They describe the remaining observed outer window, not completed reinstall durations.
The earlier root offline reinstalls already took 35.29 and 41.60 seconds.
Consequently, a final reinstall with similar ordinary duration could exceed the remaining suite allowance without violating its own 120-second limit.
Reporter buffering prevents treating these timestamps as a precise internal scheduler trace, but the deadline distinction is conclusive.

### Same-source successful comparison

[Push Windows Node 26.12.0 job 117309412183](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002856425/job/117309412183) used npm 11.20.0, the same image version, and Azure `northcentralus`.
Its suite reported 530 tests: 527 passed, three expected platform skips, and zero failures, in **505409.2113 ms**.

| Phase                          | Passing Node 26.12.0 job |
| ------------------------------ | -----------------------: |
| Pack archives                  |                 29128 ms |
| Inspect shipment               |                 33494 ms |
| Root install                   |                 60138 ms |
| Root runtime qualification     |                 83555 ms |
| Root offline reinstall         |                 38298 ms |
| Isolated install               |                 32898 ms |
| Isolated runtime qualification |                 52501 ms |
| Isolated offline reinstall     |                 32133 ms |
| Fixture cleanup                |                  1943 ms |

This is strong evidence against a deterministic failure inherent to Node 26.12.0 alone.
It is not a controlled A/B experiment: job VM, region, cache history, filesystem state, scheduling, and public dependency resolution can differ.
Different Actions jobs ordinarily receive separate VMs; simultaneous workflows do not by themselves establish shared disk contention between jobs.
The within-job test processes do share the job's resources.

### Performance and security are currently passing subgates

The latest manual [Windows reference consumer 117309587335](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117309587335) and [Linux reference consumer 117309587231](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117309587231) each completed six observations per corpus, with complete parity.

| Platform and corpus | Maximum of six elapsed observations | Peak platform process-tree metric |
| ------------------- | ----------------------------------: | --------------------------------: |
| Windows OwlAPI      |                        12490.814 ms |                   429248512 bytes |
| Windows WebVOWL     |                        10092.721 ms |                   363204608 bytes |
| Linux OwlAPI        |                        18255.160 ms |                   477696000 bytes |
| Linux WebVOWL       |                        13463.018 ms |                   416280576 bytes |

All are below the unchanged 30000-ms and 536870912-byte gates.
Windows measures Job Object peak committed memory; Linux samples summed process-group RSS.
Those metrics are not interchangeable.
Six observations provide a sample maximum, not an estimate of a population p95 or p99.

[Release security 117310787075](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117310787075) and [distribution validation 117310787087](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116/job/117310787087) also passed.
Do not describe the current product-suite timeout as a renewed corpus-performance or advisory failure.

## Execution path and the boundaries that matter

The permanent source links below are pinned to the investigated commit.

| Source                                                                                                                                                                    | Responsibility                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [check.yml](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/.github/workflows/check.yml#L129)                         | Product matrix; acquire tooling on Node 24.21.0, switch to selected product Node, install development graph, acquire native inputs, run product checks; 30-minute job ceiling |
| [verify.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/scripts/verify.js#L20)                                    | Native synchronous command wrapper; a single 600000-ms deadline around the entire top-level Node test invocation                                                              |
| [commands.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/scripts/commands.js#L45)                                | Resolve npm beside selected Node; bounded acquisition; native timing summaries                                                                                                |
| [packaging.test.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/test/packaging.test.js#L43)                       | Actual pack, independent architecture admission, root and isolated fresh installs, bundle/security/native assertions, runtime qualification, offline reinstalls, cleanup      |
| [packed-qualification.test.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/test/packed-qualification.test.js#L28) | Copy and freeze a separate producer, pack again, fresh install, six public candidate-qualification samples and rejection controls                                             |
| [qualify-runtime.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/scripts/qualify-runtime.js)                      | Repeated fresh public CLI/API checks, independent expected outputs, formatting and failure preservation                                                                       |
| [bundled-dependencies.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/scripts/bundled-dependencies.js)            | Offline locked bundle acquisition, disclosed metadata repair, file and origin inventory                                                                                       |
| [candidate.yml](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/.github/workflows/candidate.yml)                      | Pack once, transport archives, install in dedicated consumer jobs; reference jobs also measure corpora                                                                        |
| [test-outcomes.js](https://github.com/Hadden-Industries/markdown-quality/blob/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539/scripts/test-outcomes.js)                          | Dequeue, outcome, stderr, and native error diagnostics                                                                                                                        |

The Node test invocation enumerates every top-level `*.test.js` file and specifies no test-concurrency override.
Node's CLI concurrency default depends on `os.availableParallelism()`; the CLI behaviour differs from the programmatic runner's default.
Record the actual available parallelism in the proposed probe instead of assuming the developer workstation and hosted runner match.
[Node CLI reference](https://nodejs.org/download/release/v22.13.0/docs/api/cli.html#--test-concurrency).

The product workflow disables setup-node's package-manager cache, but it first runs native npm installation.
That warms npm's ordinary cache inside the VM.
Subsequent test processes inherit environment and default cache configuration unless they explicitly override it.
An uncached Actions job therefore does not imply an empty npm cache for every consumer install.
The expert should distinguish cache restoration, cached content, metadata freshness, and concurrent access to one cache directory.

Fresh consumer commands are equivalent to:

```text
<selected-node> <selected-npm-cli> install --ignore-scripts --no-audit --no-fund
  --fetch-timeout=15000 --fetch-retries=2 --fetch-retry-factor=2
  --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=4000 --timing
```

Offline reinstall replaces `install` with `ci --offline` and retains the other flags.
`spawnSync` has `timeout: 120000`, UTF-8 output, `maxBuffer: 8388608`, and `windowsHide: true`.
The wrapper appends its acquisition flags after the caller's arguments.
An experiment must account for that ordering rather than silently trying to override a flag earlier in the list.
Neither command runs lifecycle scripts; audit is a separate required gate.
Native binaries are supplied in local optional-dependency tarballs, not compiled by this install.

The runtime checks intentionally start many fresh processes, roughly thirty CLI operations per layout plus other probes.
Their aggregate 52–109-second durations are not single-operation violations of the 30-second corpus gate.
Individual public CLI probes also have their own deadlines.
Optimising the harness must preserve the distinction between tests that require fresh process isolation and checks that merely repeat acquisition or immutable preparation.

The verifier selects the repository Python environment and prepends it to PATH before tests.
A standalone probe invoking Python must preserve that selection.
An earlier diagnostic invocation omitted it and was not valid full-verification evidence.

## Previous fixes and what their evidence actually establishes

The detailed recent record is [release qualification repair](2026-10-17-release-qualification-repair.md).
The older [performance qualification record](../performance-qualification.md), [accepted performance plan](../plans/performance-implementation-plan.md), and [issue 12](https://github.com/Hadden-Industries/markdown-quality/issues/12) provide the earlier lineage.

### Earlier runtime improvements and subsequent workload changes

On 6 October, measured duplicate parsing and native process work were reduced with document-scoped reuse, native batching, and a guarded check-first shortcut.
The retained paired experiments reported 36.5%/38.0% mean reductions for memo/batching on OwlAPI/WebVOWL, followed by a separate 12.9%/16.8% check-first comparison.
The comparisons used different host conditions and must not be added together.
Owned parse counts fell from 196/208 to 68/75; native calls fell from 190/194 to 19/27.
The selected source preserved full result and formatted-byte parity for its then-current policy.

The later opinionated-defaults implementation changed the workload and diagnostic contract.
Issue 12 records all six OwlAPI measurements at commit `3dbfa07`, with maxima 30.563 seconds on Linux and 40.839 seconds on Windows despite correct complete results.
The owner accepted that implementation with performance explicitly deferred; this was not release approval or a relaxed threshold.
The corpus checker now retains thousands of advisory findings under its maintainer diagnostic override, unlike the earlier strict-whitespace workload.

On 8 October, [`509fc8b`](https://github.com/Hadden-Industries/markdown-quality/commit/509fc8b4e2b29f36a9223d3b1a617e83e640d9b8) retained bounded Markdown stage results independently, followed by [`0b45bc3`](https://github.com/Hadden-Industries/markdown-quality/commit/0b45bc38cead0e01f9cc8ea8310414b2415bcaf6) keeping protected parses transient.
Those are relevant memory-lifetime boundaries, not proof that later code can reuse every earlier AST.

The current repair at [`994b660`](https://github.com/Hadden-Industries/markdown-quality/commit/994b660ffe163989fec47e0b1ea27edc1f120049) addressed repeated literal classification after document-local memo disposal.
The immediate pre-repair hosted OwlAPI samples were 30567.6402, 31798.1364, 28703.8165, 24818.9938, 26173.5267, and 27541.7756 ms: two exceeded the unchanged 30-second gate.
It retains only the classification, binds reuse to exact output and syntax, accounts for retained bytes, and reparses changed or unproven inputs.
The implementation is in `src/prose-diagnostics.js`, `src/document-worker.js`, and `src/quality.js`.
Local six-sample OwlAPI maximum changed from 12434.68 to 10087.15 ms; WebVOWL maximum was essentially unchanged, 8330.22 versus 8356.28 ms.
Hosted corpus gates subsequently passed, including the latest run.

Thus “the old performance fix stopped working” is too broad.
Earlier optimisations addressed specific repeated work under specific policies and lifetimes.
The current remaining failures occur in acquisition and the product harness, outside the measured corpus operation.
Issues [4](https://github.com/Hadden-Industries/markdown-quality/issues/4), [9](https://github.com/Hadden-Industries/markdown-quality/issues/9), and [10](https://github.com/Hadden-Industries/markdown-quality/issues/10) are possible future optimisation research, not established timeout causes.

### Request recovery inside the install deadline

The original Windows Node 26.12.0 release qualification [38961318924](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38961318924) timed out at 120068 ms without identifying an exact network cause.
npm's default HTTP request deadline was longer than the project's whole-command deadline.
A local HTTP fixture that withheld initial metadata responses reproduced a failure at 30012 ms under its deliberately shorter 30-second test deadline.
The 15-second fetch timeout and bounded native read retries made that fixture pass in 16672 ms.
The production 120-second deadline and absence of outer-command retries were preserved.

This demonstrates recovery from the deliberately stalled request pattern.
It does not prove that registry stalls caused the original hosted failure or that 15-second request timers bound all dependency-graph, cache, extraction, deletion, and filesystem work.
Multiple requests and retry sequences also share the outer budget.
All four acquisition-fixture tests passed in the previously inspected failing suites after the lifecycle repairs.

### Producer advisory repair did not apply to recipient installations

The 8 October security change [`47febbe1`](https://github.com/Hadden-Industries/markdown-quality/commit/47febbe1b6f3282814e77db7ea13eac72b4928ed) used a root override to obtain KaTeX 0.19.0 in the producer graph.
Its accepted scope was producer-only.
A fresh packed consumer still followed `micromark-extension-math`'s older dependency range.
That is npm's documented root-override boundary, not an override feature that subsequently failed.
[npm package.json specification](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).

The relevant advisory is [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7), affecting KaTeX versions from 0.11.0 below 0.18.2.
The observed consumer audit had four low-severity findings across the chain.
Public Markdown Quality API exploit reachability was not established; its parsing path does not enable math HTML rendering.
The repair obligation nonetheless included the installed recipient graph.

The current core bundles the 79-package `@eslint/markdown` runtime closure.
Its sole vendored metadata repair changes `micromark-extension-math@3.1.0` to depend on KaTeX 0.19.0.
Executable third-party source remains unchanged; original licences and a complete bound inventory are retained.
The final root manifest has no override, and native `npm ls --all`, recipient audit, SBOM reconciliation, tamper controls, and offline reinstall remain required.
An attempted override-only bundle was rejected by npm 12 with `EBUNDLEOVERRIDE`; that earlier packaging experiment does not identify the npm version of today's failed Windows job.

Bundling increases the work performed during packaging, installation, inventory checking, and deletion.
It is therefore a credible contributor to harness cost, but the latest logs do not establish it as the installation root cause.
Removing the security repair or shipping a vulnerable graph is not an acceptable diagnostic fix.
At the previous registry readback, `@eslint/markdown` 8.0.3 and `micromark-extension-math` 3.1.0 still lacked a suitable upstream range update; refresh that fact before proposing an upgrade.

### Offline staging requested more than the bundle needed

At `994b660`, [manual run 38973289280](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38973289280) timed out in Windows Node 24.22.0 bundle staging: offline `npm ci` took 120140 ms.
The staging manifest unnecessarily requested all production dependencies although only one declared closure was bundled.
[`f6c56aa`](https://github.com/Hadden-Industries/markdown-quality/commit/f6c56aa43c86b4e7bf37b8e15fd7b89ed7068e51) narrowed that acquisition manifest to the bundle root while preserving the complete original lock bytes, native integrity checks, disabled scripts, and the complete final consumer manifest.
A native local probe then installed 79 packages in 812 ms without unrelated ESLint, Prettier, or Ajv.

That fixes unnecessary producer staging work.
It cannot eliminate the legitimate unbundled runtime dependencies installed by a fresh recipient, or the work of validating and reinstalling the whole consumer tree.
Offline acquisition also cannot benefit from network retry tuning.

### Two real fixture lifecycle defects

First, an exit/close listener could be registered after the fixture child had already exited, leaving cleanup waiting for an event that would never recur.
The fix captures child completion immediately, bounds startup to five seconds, retains startup stderr, and tests premature exit.

Second, a native Node 22/24 probe demonstrated that a throwing cleanup hook prevented later hooks from running.
Filesystem cleanup had been registered before server shutdown.
The repair moved server ownership into a `finally` block that kills and awaits the child before filesystem after-hooks, with a consumer-failure regression.
These are proved fixture defects; neither is proved to explain all hosted timeouts.
The latest suite failures were interrupted during recorded packaging work, so an idle leaked server is a weaker explanation for those particular observations.

### Integration and observability repairs

The same repair series corrected a native package PURL encoding finding and Windows file-URI representation in npm CycloneDX output.
The latter preserves raw SBOM output and binds only exact candidate archive references before converting them with `pathToFileURL`.
It removes no components, hashes, licences, or dependency edges.
Current CodeQL and distribution validation pass.

[`04b932b`](https://github.com/Hadden-Industries/markdown-quality/commit/04b932bc37109a45600d231cfc63ab6f6c812821) restricted performance uploads to top-level observation and driver files, excluding copied corpus trees, and added bounded job summaries.
The collector's file contract remains intact.
The unanchored `__pycache__/` ignore rule covers Python bytecode directories at every depth; the previously noticed `.pyc` was untracked.

[`c3d2c1a`](https://github.com/Hadden-Industries/markdown-quality/commit/c3d2c1a6713eadaa32af9f82e95789081c90aad6) added better fixture ownership and command/test diagnostics.
[`4d5d128`](https://github.com/Hadden-Industries/markdown-quality/commit/4d5d128cbe03dc17b529d541803da70d4774bc72) added synchronous packaging phase markers.
[`2f4718f`](https://github.com/Hadden-Industries/markdown-quality/commit/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539) preserved slow completed npm phases within the existing 2000-character failure allocation.
The last two changes were observability improvements, not claimed timeout fixes.

## Recent sequence explaining why broad reruns were unproductive

| Source and existing run                                                                                                 | Result relevant to the next investigation                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `04b932b`, [38988131831](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38988131831)                | All 14 consumers, both performance jobs, security, and distribution passed; Windows product install reached 120023 ms and another suite reached 600 seconds                                                           |
| `c3d2c1a`, [38997544380](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38997544380)                | Windows Node 26.12.0 and 24.21.0 suites reached 600022/600027 ms; consumers, performance, security, distribution passed; acquisition fixtures passed                                                                  |
| Same `c3d2c1a`, automatic [38997528959](https://github.com/Hadden-Industries/markdown-quality/actions/runs/38997528959) | A Windows Node 26 consumer install reached 120080 ms; therefore the problem is not restricted to the full product harness                                                                                             |
| `4d5d128`, [39000792105](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39000792105)                | Windows Node 26.0.0 product root install reached 120055 ms after `idealTree:buildDeps` completed at 97087 ms; pack 118519 ms, inspection 50914 ms; suite exited at 539446 ms with failures                            |
| Same manual run                                                                                                         | Windows reference consumer install reached 120037 ms before corpus measurements; missing downstream performance files were a consequence, not evidence of an artifact-policy regression                               |
| Same `4d5d128`, automatic [39000784993](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39000784993) | Transported candidate passed; automatic [product run 39000784998](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39000784998) failed Windows Node 22.13.0 and 26.0.0 installs at 120574/120194 ms |
| `2f4718f`, latest runs above                                                                                            | More discriminating native timing evidence, but install and cumulative suite failures remain                                                                                                                          |

Earlier successful Windows product suites on `c3d2c1a` took 587427.5364 ms on Node 22.13.0 and 328884.1563 ms on Node 24.22.0.
The former had about 12.6 seconds of margin under 600 seconds.
A local three-file comparison took approximately 111275 ms at concurrency 3 and 143945 ms at concurrency 1; the packaging body changed only from 110907 to 107219 ms.
That local comparison did not justify globally serialising the suite and does not exclude contention on a hosted VM.
The retained October 7 implementation record reported 249 JavaScript tests; the latest suite reports 530.
That count is evidence of changed suite scope, not a proportional cost model: a small number of integration fixtures can dominate elapsed time.

Full matrices mixed dependency acquisition, producer staging, archive validation, process startup, public behaviour, security, and corpus measurement.
Additional instrumentation then required another long run to observe an intermittent failure.
Successful runs on neighbouring VMs did not reveal which variable mattered.
The next step should reduce the experiment, retain both outcomes, and change one causal variable at a time.

## What the limits and authoritative guidance do and do not establish

| Limit                                          | Meaning and present assessment                                                                                                                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15000-ms request timeout with two retries      | A bounded HTTP recovery policy inside a larger command. It is not a bound on total dependency installation. Validate compatibility across actual npm versions.                                                  |
| 120000-ms npm command                          | A project responsiveness and runaway-process guard. Current successful root installs can take 60–92 seconds, so available headroom is materially smaller than the earlier 8-second local observation suggested. |
| 600000-ms Node suite                           | Total top-level test invocation, including its queue and process execution. Suite growth and repeated heavy fixtures can consume it without an individual operation hanging. It is not the Actions job ceiling. |
| 30000-ms corpus maximum                        | Product workload gate over each of six complete fresh-process observations. Installation and corpus acquisition are outside it. Latest exact-source observations pass.                                          |
| 512 MiB process tree and 128 MiB worker budget | Existing resource contracts with platform-specific measurement semantics. No permission to add workers or remove checks to recover time.                                                                        |

No cited npm, Node, or GitHub specification prescribes a universal two-minute install or ten-minute suite limit.
The existence of a configurable timeout is not evidence that a particular value is appropriate.
AWS's engineering guidance recommends relating deadlines to measured latency and an explicit tolerated false-timeout rate, while accounting for network variation and bounded retries.
That is useful methodology, not a requirement to copy its service-call numbers into this CI harness.
[Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter).

The expert should assess headroom using completed and censored observations separately, explain cold versus warm acquisition and suite scheduling, and recommend a reliable work organisation within the current limits first.
Any conclusion that the measurement contract itself is unsuitable must be presented for a separate owner decision; the current task prohibits weakening gates.

npm documents idempotent registry-read retries, a default 300000-ms HTTP timeout, and native timing output.
Those facilities support the existing stalled-read fix and proposed instrumentation, not a guarantee that the full operation finishes inside 120 seconds.
[npm configuration](https://docs.npmjs.com/cli/v11/using-npm/config/#fetch-timeout).
Native `npm ci` removes an existing `node_modules` and installs from a frozen lock; `--offline` removes network use, not filesystem and dependency-tree work.
[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

Arborist has distinct ideal-tree and reification phases, including special handling of bundled dependencies.
Use the actual npm version's implementation to interpret timer names; they are not pure network counters.
[npm 11.20.0 ideal-tree implementation](https://github.com/npm/cli/blob/v11.20.0/workspaces/arborist/lib/arborist/build-ideal-tree.js), [reification implementation](https://github.com/npm/cli/blob/v11.20.0/workspaces/arborist/lib/arborist/reify.js).

GitHub documents a standard public Windows runner class with four CPUs and 16 GB RAM, but the precise CPU availability, image, volume, and runtime used by a probe must be recorded.
An OS label does not pin an immutable hosted image build.
[GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

## Ranked hypotheses and discriminating evidence

These are investigation priorities, not diagnosed causes.

| Priority and hypothesis                                                          | Supporting observations                                                                                                                                                           | Limitation or counterevidence                                                                                              | Small discriminating test and possible remedy                                                                                                                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High: cumulative suite work exhausts the outer deadline                          | Both latest 600-second failures reach the final offline reinstall with little time remaining; previous success at 587 seconds; packaging performs two full runtime qualifications | Does not explain 120-second failures in dedicated consumer jobs                                                            | Budget/scheduler miniature, then time the packaging path alone. If confirmed, remove repeated immutable setup or reorganise independent coverage with an explicit unchanged acceptance map.     |
| High: within-job installation, packing, or extraction contention                 | Two overlapping latest installs have almost identical slow phase profiles; pack time varies 29–119 seconds; native local-archive reification takes about 47 seconds               | Local three-file serialisation was slower overall; dedicated consumer has also failed                                      | One versus two simultaneous fixed-archive installs with shared and separate fresh caches. Consider a narrow resource semaphore or isolated cache only if its paired results support it.         |
| High: bundled/core and native archive processing materially increases local work | Core now has 1369 members and a bundled closure; repeated validation/reinstallation; native archive expands to about 45.8 MB                                                      | Increased work is expected and correctness-preserving; no controlled pre/post hosted comparison                            | Local-only synthetic many-small-files and few-large-files tarballs, followed by actual frozen archives. Optimise repeated preparation or a measured npm path while retaining bundle integrity.  |
| Medium: registry latency or metadata resolution remains expensive                | Prior `idealTree:buildDeps` was about 97 seconds; fresh consumers resolve unbundled dependencies                                                                                  | Latest completed ideal-tree phase was about 38 seconds and later extraction remained slow; offline staging has also failed | Controlled loopback-registry delay cases, then online versus seeded-cache/offline install with an identical graph. Change bounded request policy only if request-level evidence supports it.    |
| Medium: cache state or cache concurrency affects npm                             | Several commands share a VM and default cache; installations follow producer acquisition                                                                                          | No cache corruption or locking error established; clearing caches could worsen cold acquisition                            | Fresh private cache per arm, shared cache control, verified identical manifests and archive inputs. Preserve failed cache evidence rather than deleting it blindly.                             |
| Medium: npm-version or hosted-image behaviour                                    | Failures span npm 10.9.9, 11.3.0, and 11.20.0; OS image is new enough to merit exact comparison                                                                                   | Same Node/npm/image combination both passes and fails; cross-version comparisons also change graph and host state          | After minimisation, hold Node and fixture constant and vary a compatible pinned npm version; separately compare one supported stable runner label. Do not vary both at once.                    |
| Lower for latest failures: leaked fixture process or timeout cleanup             | Two earlier lifecycle defects were demonstrated                                                                                                                                   | Current fixtures passed; current suite logs show ongoing packaging work rather than only idle shutdown                     | A 5–10-second child lifecycle test with premature exit, consumer failure, and deadline termination; assert descendant quiescence before deletion.                                               |
| Lower: renewed Markdown runtime regression                                       | Past policies and memo lifetimes changed costs; runtime checks have substantial aggregate cost                                                                                    | Both complete corpus checks pass with full parity in the latest manual run                                                 | Only if a minimal public-operation probe identifies a slow operation, profile that operation with the real worker and preserved oracle. Do not restart whole-corpus optimisation speculatively. |

A platform or npm outage has not been established.
Historical issue reports about other npm versions, linked-install strategies, Git dependencies, or antivirus interference are leads only if their actual trigger can be reproduced here.
Do not label this a known npm bug merely because another issue contains “idealTree” or “Windows”.

## Required small remote test cases

Provide runnable code and workflow changes for the cases selected below.
The first delivery should contain the minimum cases that distinguish the two leading explanations, not a new exhaustive matrix.
Suggested budgets are design targets for diagnosis and include an explicit setup allowance; they are not amendments to production gates.

| Case                                | Fixture and intervention                                                                                                                                                                                                           | Required failing and passing controls                                                                                                                                                                            | Target execution budget                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D0: nested deadline and scheduling  | Three tiny Node test files: one queued workload, one child operation with its own deadline, and one fast sentinel. Scale to seconds. Record suite start, child start, termination, and cleanup.                                    | One case deliberately exhausts the outer deadline before the child deadline; another lets the same child finish. Assert distinct reported failure classes and no surviving descendants.                          | 5–15 seconds                                                                    |
| D1: native request recovery         | Extend or reuse `test/npm-acquisition.test.js` and its real loopback HTTP fixture. Test first-response stall, repeat stall, and many short serial metadata delays separately.                                                      | A deliberate stalled request must fail with the old incompatible policy; current bounded recovery must pass the supported pattern. Repeated stalls must fail predictably without an outer retry.                 | 10–35 seconds per selected case                                                 |
| D2: local archive extraction        | Create small dependency-free tarballs using native npm packing: many small files versus a comparable byte total in few files. Add a tiny bundled dependency closure. Install local files with private caches and scripts disabled. | An invalid integrity or missing declared dependency control must fail. A valid fixture must install and preserve bytes. Compare member count, bytes, CPU, wall time, and actual file operations where available. | Prefer 10–30 seconds; cap fixture size explicitly                               |
| D3: one actual consumer install     | Reuse the fixed archives identified below. Create only one private consumer manifest with exact local core/native specs, then invoke the real wrapper. No corpus checkout, repack, architecture suite, or runtime qualification.   | Assert exact archive hashes and installed package identities; changed hash must be rejected before install. Retain timeout as failure, not a retry trigger.                                                      | Original 120-second command ceiling; at most 2–3 minutes after acquisition      |
| D4: contention and cache            | Run the same D2 fixture, then D3 only if needed, once alone and once in a fixed two-process pair. Independently compare shared versus separate cache directories.                                                                  | Same archives and graph in every arm; bounded pair completion and cleanup. Deliberately invalid member control still fails. Separate cache and parallelism interventions.                                        | Synthetic under 60 seconds; actual pair within a 3-minute measurement allowance |
| D5: offline reinstall cost          | Reuse a successful D3 lock and seeded cache in the same job. Compare normal `ci --offline` on the installed tree with a fresh private directory using the same lock and inputs.                                                    | A required uncached content item must produce an offline failure; a complete seeded cache must pass. Record removal and install phases separately.                                                               | Keep the existing 120-second command ceiling                                    |
| D6: runtime startup versus checking | After one actual install, run a tiny document through a selected public check and one format/idempotence path. Measure process launch, module load, native work, and total separately.                                             | Preserve independently specified output and byte assertions; mutate one expected result to demonstrate a useful failure. Do not reuse a long-lived process where the contract requires cold startup.             | 10–30 seconds for the miniature                                                 |
| D7: fixture lifecycle               | Child that exits before readiness, child whose consumer throws, and a child held beyond a short parent deadline.                                                                                                                   | Premature exit and consumer error are retained, cleanup completes, and descendants are absent before directory removal. A deliberately broken ownership variant must expose the defect.                          | 5–10 seconds                                                                    |

For D0 and D7, a passing meta-test must assert the deliberately failing child's exit code and diagnostic, rather than setting workflow-level `continue-on-error` and treating any outcome as success.
Do not use `--test-force-exit` to conceal leaked processes.
Node documents synchronous child timeout and close semantics; verify Windows descendant behaviour explicitly rather than inferring it from a parent `SIGTERM` field.
[Node child processes](https://nodejs.org/download/release/v22.13.0/docs/api/child_process.html#child_processspawnsynccommand-args-options).

The existing acquisition test file is already a candidate for a small regression lane:

```text
node --test --test-reporter=./scripts/test-outcomes.js test/npm-acquisition.test.js
```

This command is a proposed future execution, not a result obtained for this brief.
Verify its exact prerequisites and total time under the chosen Node/npm pair.
Do not include `packaging.test.js` in the first “small” lane merely because it is one file: it contains multiple heavyweight integration operations.
Do not add a short per-file timeout to that file and interpret the predictable interruption as a newly discovered product bug.

### Minimal workflow contract

Supply an opt-in `workflow_dispatch` diagnostic workflow with an allowlisted case selector and fixed source identities.
Start with one Windows job on Node 26.12.0/npm 11.20.0 for the install question, or Node 22.23.3/npm 10.9.9 for the suite-budget miniature.
Do not begin with the full OS/runtime cross-product.
Use existing approved immutable action pins and ordinary supported features.

Grant `contents: read`, and `actions: read` only when downloading the existing artifact.
Use `persist-credentials: false`; give the test processes no publishing credentials, OIDC authority, npm token, or release environment.
A scoped GitHub read token for artifact download is distinct from anonymous npm consumer acquisition.
Keep package installation scripts disabled and avoid automatic retries.

Target a 5–8-minute maximum job including setup, with the experiment itself substantially shorter.
Run D0/D1/D2 without acquiring the complete development graph if their implementation can use only native Node/npm facilities.
D3 should download existing archives, not call the full candidate workflow.
Creating or changing a manual workflow in this repository can itself trigger existing push workflows; the expert must provide a delivery approach that respects the owner's build stop until renewed authority is granted.
Neither committing this brief nor pushing a diagnostic branch is implicit permission to run CI.

Declare at most two or three discriminating jobs for the first hypothesis round, with a predeclared sample count and stop rule.
One pair can be exploratory evidence; it cannot establish a rare failure rate.
If the miniature does not reproduce the signature, report that result and refine the hypothesis instead of repeatedly rerunning the full matrix.
Preserve every failed attempt and account for any extra repetitions before running them.

### Measurements the test cases must expose

Emit a compact JSON-lines record and a short job summary, with:

- Case and arm identity, source SHA, archive hashes, runtime executable and npm CLI path, exact Node/npm versions, image label/version, available parallelism, memory capacity, volume/free space, and whether setup restored a cache.
- Monotonic elapsed time for queue admission, child start, each observed phase, termination, and cleanup; UTC correlation timestamps are secondary.
- Exit status, signal, native error code, outer deadline, inner deadline, and which deadline fired.
- Safe whitelisted npm configuration: registry origin without credentials, retry values, install strategy, cache path classification, offline state, and lock/manifest identity.
- Process CPU and relevant I/O or sampled process/volume observations, when supported without new privileges; describe sampling overhead and limitations.
- Native completed timings and the last safely observed active phase; retain whether a timer is unfinished or missing because the process was killed.
- Installed graph identity and byte/integrity checks appropriate to the case, plus remaining descendants and temporary-file cleanup outcome.

Do not dump the entire environment, `.npmrc`, headers, credentials, verbose request bodies, or inherited secret-bearing configuration.
If additional native timing files are read, emit a bounded sanitised excerpt to logs.
A killed npm process may not flush its final timing JSON; absence is not proof that no work occurred.
An observer inside a process blocked by `spawnSync` cannot deliver ordinary timer callbacks during that call; use an appropriately bounded external observer or a dedicated asynchronous diagnostic wrapper, and disclose differences from the production path.

Current failure summaries retain only 2000 characters of npm diagnostics, select completed timers, and discard successful stderr.
Nested `idealTree` timers and concurrently running `reifyNode` timers are not additive.
Packaging end markers run in `finally` and indicate elapsed duration, not successful completion.
Test dequeue events are useful progress evidence, not a complete critical-path profile.
The expert's observer must remedy the specific missing evidence without becoming a new large data-generation system.

## Reusable archives for the actual install probe

The latest manual run retained artifact **candidate-release**, ID **12089857699**, 22679138 bytes.
GitHub reported ZIP digest `sha256:a5486926f8540304e0ec2dca0933481a1ececd698f903c66e3764bfdd949668f` and `expired=false` at inspection.
Artifact metadata is available from the [existing run](https://github.com/Hadden-Industries/markdown-quality/actions/runs/39002858116).
Recheck availability and identity before future execution; do not substitute “latest”.

The downloaded manifest has SHA-256 `d403f655c3a448aba8ba651f7bb8a942742cd88f84f640b9c9219ae4188673ab`.
It binds the source SHA/tree above and producer lock SHA-256 `5486ab27befc5297d944a622afede3fdc556ff9148f19b19cd0ebf1394d04308`.
The three downloaded archive hashes were independently recalculated and matched the manifest.
The GitHub ZIP digest identifies the container; it is distinct from the manifest and inner archive digests.

| Archive                                                  | SHA-256                                                            | Compressed bytes | Declared members and file bytes |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ---------------: | ------------------------------- |
| `hadden-industries-markdown-quality-1.0.3.tgz`           | `ed51524fc5fd0d838e2cfeaf060f54f81f5a9f62eadc75202078fb92af2b2300` |          2333180 | 1369; 8472546 bytes             |
| `hadden-industries-markdown-quality-win32-x64-1.0.3.tgz` | `5660e39295c840ddcd4cdab7770bf0c618ed2b770c039bdaf187ea10799b6062` |         10331322 | 14; 45754301 bytes              |
| `hadden-industries-markdown-quality-linux-x64-1.0.3.tgz` | `5d1c193121a55923f9b66d6ca8a3a5464e4310b2c203ea846c4f84de79e51afb` |         10106043 | 14; 43210168 bytes              |

The sizes and member totals describe the retained manifest, not a new extraction benchmark.
The archived candidate's filename version is still 1.0.3, but its bytes are not the immutable public npm 1.0.3 release.
The public release has the older report/configuration contract; the candidate uses schema 2 for those public contracts.
The candidate release-manifest schema itself remains 1, which is a separate schema.
Do not reproduce this with `npm install @hadden-industries/markdown-quality@1.0.3` and assume equivalence.

The retained artifact was produced by the candidate pack job.
The failed product tests independently pack from their own source/fixture contexts; byte-for-byte identity with their unretained temporary archives has not been established.
Use the retained artifact for an efficient controlled consumer probe, and explicitly qualify that boundary.
If only the independently packed product fixture reproduces the failure, capture its identity in a narrowly scoped later experiment rather than silently conflating the two.

For local access, the existing evidence directory is:

```text
C:\Users\maksy\.hi\w\e\operator\01a1434f-release-qualification-repair
```

The directly inspected files are `expert-latest-manual-win26.log`, `expert-latest-push-win22.log`, `expert-latest-push-win24.log`, `expert-latest-push-win26-pass.log`, `expert-latest-manual-winperf.log`, `expert-latest-manual-linuxperf.log`, `expert-latest-manual-run.json`, and `expert-latest-push-product.json`.
The downloaded archives and manifest are in `expert-current-candidate/` beneath that directory.
These local paths are supplementary access points; the run/job/source links make the handoff useful to an expert without this workstation.
Logs and artifacts have finite retention; retain the relevant safe evidence before expiry if longer analysis is needed.

## Fix selection and acceptance requested from the expert

Return a concise diagnosis for each failure class, with a causal trace from observation to mechanism and explicit confidence.
For every proposed fix, provide the smallest source or workflow diff, the failing control it repairs, the competing explanations it rules out, and its effect on correctness, security, runtime, and total CI work.
Identify the fastest reversible candidate first.

Possible remedies worth evaluating include eliminating repeated immutable preparation, isolating proven cache contention, narrowly scheduling heavy fixture work, improving the measured npm bottleneck, or replacing the temporary vendored repair after a suitable upstream release.
None is selected merely by listing it here.
Sharing archives must preserve independent pack/admission tests and source identity.
Splitting the suite must preserve complete required coverage and aggregation and must be disclosed as a change to verification organisation; do not silently convert one 600-second obligation into several permissive windows.
Caching must retain explicit fresh-consumer coverage and fail on incorrect or missing content.

The expert's delivery must include:

1. Runnable miniature test files and a manual workflow, with a copyable command for each case and exact supported versions.
2. A table of hypotheses, predicted observations, actual results if any, falsification conditions, and the next action for each outcome.
3. Demonstrated failing and passing controls, or a clear statement that a proposed case has not yet been executed.
   A synthetic slow fixture alone does not prove the production cause.
4. A coverage map showing that any proposed harness optimisation preserves root/isolated installation, no-script and offline behaviour, bundle inventory/tamper checks, valid dependency edges, public API/CLI semantics, frozen source identity, and cleanup.
5. A bounded sequence from miniature reproduction to one relevant actual-package probe, then only the necessary regression checks.
   Full release qualification requires renewed owner authority after the mechanism and repair are credible.
6. An assessment of the three distinct timing limits, with measured headroom, censored observations, and any contract question separated from implementation fixes.
7. Remaining uncertainty and a rollback plan; no claim that a neighbouring green run erases a failed run.

Human diagnostics belong in logs and concise summaries.
Retain artifacts where another job or a future verifier genuinely consumes exact files: package archives, bound qualification records, and required security/SBOM evidence.
Do not reintroduce copied corpus trees or downloadable narrative reports for each diagnostic job.
This requested research brief is a deliberate handoff document, not a new CI artifact policy.

The investigation is complete when it yields a falsifiable mechanism, a proportionate repair proposal, and a fast test loop capable of detecting the original failure.
Implementation acceptance, local verification, hosted qualification, release approval, npm staging, promotion, and publication remain distinct outcomes.
