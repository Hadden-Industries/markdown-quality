# Node runtime compatibility qualification

Accepted on 2026-10-15 under the owner's request to qualify the lowest compatible Node version in each supported family.
HISEW route: R2, because package engines are a public consumer contract.
The existing authorization covers configuration, signed commits and direct pushes to main.

## Acceptance

- Derive the lowest candidate in each existing family, Node 22, 24 and 26, from the production dependency graph and actual product API requirements.
- Qualify the exact candidates using real installed packages, native assets, CLI/API behavior and both supported Windows/Linux consumer layouts.
- Keep consumer minima, dynamically resolved latest-version CI coverage and the pinned development/release reference independent.
- Retain reference Node 24.21.0, including reference performance jobs and artifact identities.
- Run isolated JSON Quality checks on its supported development runtime rather than raising the product floor to match it.
- Exclude unqualified major families and document compatibility separately from advice to install current security patches.

## Slices and proof

1. Inspect every locked production engine declaration and product Node API use.
   Establish an independently justified candidate and the lower-bound reason for each family.
   Initial candidates are 22.13.0, 24.0.0 and 26.0.0; these remain unqualified until the real consumers pass.
2. Add meaningful matrix regressions before changing selection: retain exact minima, newest family releases and a reference that is neither minimum nor latest.
   Preserve reference job naming and reject missing reference metadata or inconsistent policy.
3. Update the runtime declaration and lock metadata to the qualified floors, adjust CI tooling boundaries and document the resulting contract.
   Use the existing runtime matrix and packed-consumer qualifier as the authorities.
4. Freeze the candidate, obtain ordinary review and independent verification, run HISEW full verification and deliver to main.
   Inspect the exact hosted package, transported-consumer and CodeQL results before completion.

## Guardrails and recovery

No dependency upgrades, formatter changes, native payload changes, npm publication or release publication are included.
An older test runner or development dependency does not by itself establish a higher consumer requirement.
If candidate qualification fails, preserve the failure and determine whether the cause is product compatibility, a runtime defect or development-only tooling before selecting another floor.
Do not raise timeouts, weaken preservation assertions or silently skip failed consumer behavior.
Any higher minimum needs a concrete dependency/API/runtime reason and qualification at the resulting boundary.
The source change is reversible through an ordinary follow-up commit.

## Results

### Accepted canonical runtime policy extension

The owner requested finding the local repository that defines Node versions in one place and applying the same DRY approach here.
OwlAPI provides that precedent in `docs/release/runtime-policy.json`, `scripts/runtime-policy.mjs` and `scripts/workflow-runtime-policy.mjs`: canonical selections and checked projections into native consumer declarations.

Retain `assets/node-support.json` as the single editable version policy, with separate consumer minimums and development/release reference fields.
Add `npm run sync:node` to project npm engines, root lock engines, initial workflow selections, bootstrap JSON and the current compatibility version list.
Full and product verification must reject projection drift.
Preserve matrix/profile expressions, unrelated workflow bytes, dependency lock entries and immutable historical release evidence.
Current-policy test fixtures consume the policy; intentionally synthetic policies remain independent test inputs.
Prove a single synthetic policy edit updates both declarations and bootstrap selections, retains dynamic selectors and unrelated values, and becomes idempotent.
The bootstrap JSON is now generated from the reference, superseding the earlier separately editable bootstrap authority.

Hosted failures on the preceding candidate had empty npm-install diagnostics.
Preserve their logs and expose the native process error, exit status, signal and duration before choosing any recovery; the existing timeout remains unchanged.

### Accepted file-observation repair

After the initial higher-floor candidate was pushed, the owner requested accounting for the Windows stat mismatch in code so the dependency minima could be supported.
This is a continuation of the R2 undertaking with a declared file-identity trust boundary.
The initial results below remain evidence for the unchanged implementation, rather than a permanent reason to require a newer runtime.

Use native handle observations consistently for file identity and fingerprints in private native staging, trusted candidate staging and qualification evidence.
Keep path observations as independent regular-file, non-link, single-link and stability guards.
Do not compare a device number from a path observation directly with one from a handle observation, and do not omit device identity from comparisons between handles.
Capture the original created-file handle identity and require subsequent reopened handles to match it.
Preserve existing root/ancestor checks, bounded reads, descriptor closure and refusal to remove replacements.
Centralize the observation mechanics without copying domain admission policy or adding a version-dependent shim.

Qualify stable files and independently hostile replacement, symlink, hard-link, device-identity and metadata-change cases.
Exercise candidate staging and evidence packaging as well as native batch checks on the older runtimes.
The target floors return to 22.13.0, 24.0.0 and 26.0.0 only if these checks pass.
Keep reference 24.21.0 and the separate JSON tooling contract.
Obtain a frozen security diff assessment, final ordinary review and independent execution for this changed safety code, followed by full HISEW and exact hosted verification.

### Initial unchanged-code boundary

The derived common Windows/Linux consumer floors are **22.17.0, 24.2.0 and 26.0.0**.
The [compatibility record](../node-runtime-compatibility.md) records the dependency and upstream-runtime reasons.
All 158 production lock entries admit the initial dependency-only candidates, but Windows native batch staging rejects 22.13.0 and 24.0.0 because `fstat()` and `lstat()` disagree on device identity.
Official distribution binaries reproduce failure at the immediate predecessors 22.16.0 and 24.1.0 and success at 22.17.0, 24.2.0 and 26.0.0.
No product identity or cleanup guard is relaxed.

Focused source qualification covers 160 tests at each selected floor.
A stale positive-version fixture from the initial candidates was corrected to the selected floors; the repaired six-test runtime-policy suite passes at all three versions.
The remaining source checks retain their original passing results for unchanged inputs.
Node 24's older native module-mock API is handled by shared test setup, with the official 24.15 API boundary recorded.
The packed consumer corpus now requires multi-document native staging, engine-strict installation and offline replay in both layouts.

The resolved matrix retains minima, current family releases and reference 24.21.0 on both platforms.
At the 2026-10-15 metadata observation it selects 22.17.0, 22.23.3, 24.2.0, 24.21.0, 24.22.0, 26.0.0 and 26.12.0.
Exact committed-candidate HISEW, review and hosted delivery results are retained in the execution evidence and provider runs rather than copied into a self-referential source commit.
