# Released Snapper security coverage

The released subject is `assets/native-build.json`, not `scripts/native-build-next.json`.
On 13 November 2026, anonymous readback of upstream commit `407c2beb04607f6ccb421e6f6418dcc00e4c1e94` matched both frozen inputs:

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| Cargo.lock | 84186 | ae679d5bed2cf65a72e422448bb7de70f9893ae4755f1d87ee38b3c27cfeb85d |
| Cargo.toml | 5575 | 58f9c619a86a9b8f1bb776c4c3022e393a5c596260cf44c5b40272833ec400ff |

The producer selects Rust 1.98.1, profile `dist`, features `cli,neural,lsp,watch,pandoc,treesitter,mcp`, and targets `x86_64-pc-windows-msvc` and `x86_64-unknown-linux-gnu`.
`build-native.py` already records target-filtered `cargo metadata --locked`, locked rights generation and `cargo auditable build --locked`.
Its embedded inventory is a conservative Cargo graph; it does not prove exact native/system linkage.

GitHub supports [Rust CodeQL extraction with build mode `none`](https://docs.github.com/en/code-security/reference/code-scanning/codeql/build-options-for-compiled-languages).
This host has no callable CodeQL, Cargo or Rust compiler.
No Rust database, extracted-file inventory or linked-crate correspondence was produced in this implementation session.
Rust source coverage therefore remains **unproven**; the existing Actions, JavaScript/TypeScript and Python analyses do not cover Snapper Rust.
No new release-security success is inferred from that absence.

The native maintainer can evaluate extraction in a disposable checkout of that exact commit, retaining tool versions, source/lock digests, both target-filtered metadata graphs, extraction logs, database source-file inventory, query identities and SARIF.
Use supported `none` extraction and compare its actual crates, files, generated code and configuration coverage with each producer graph and the embedded auditable inventory.
Do not assume buildless extraction has the same feature/target semantics as the shipped build.
Only adopt it as a release obligation after that comparison establishes a repeatable source-to-distribution correspondence.
Keep the approval-model query inventory tests unchanged.

For an advisory check, [RustSec cargo-audit](https://github.com/rustsec/rustsec/blob/main/cargo-audit/README.md) supports auditing an existing lock with `--file` from outside an untrusted source directory.
Evaluate a pinned cargo-audit binary against the exact verified lock, with a recorded advisory-database commit, configuration, JSON report and tool digest.
This has a useful lock-level contract, but a lock includes optional/build dependencies and cannot establish reachability, generated source coverage, system-library safety or exact linkage.
No advisory result ran on this host and no replacement scanner was selected.

Until those experiments produce evidence, retain all existing payload, provenance, glibc, rights, embedded-inventory and distribution-SBOM gates.
The next-build source is a separate security subject and must repeat the evaluation.
