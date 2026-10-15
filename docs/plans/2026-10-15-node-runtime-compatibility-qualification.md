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

Qualification is in progress; exact results and runtime identities will be recorded here before final review.
