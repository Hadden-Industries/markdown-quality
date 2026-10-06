# Immutable GitHub release delivery

This operation archives an already qualified npm tuple.
It does not build or publish npm packages, move distribution tags, or grant publisher permissions.
Use the [accepted plan](plans/implementation-plan.md#immutable-release-identity-and-coordinated-promotion) for stable-promotion prerequisites.

The reviewed [1.0.2 qualification record](releases/1.0.2.json) binds the original source `183fd4ee75cdf5a7f053e00c1032e5d7891d075d`, transported candidate and complete registry qualification to their exact providers, attempts, reports, archives and origins.
Its native build retains its separate source and build identities; the package commit is not the native compiler's source.
Preserve AGPL-3.0-only and every original source, notice and archive byte.

## Prepare and inspect

Retain the original candidate's three npm archives, `release-manifest.json` and `source-sbom.cdx.json` in an explicit input directory.
Add its original `publication-origins.json`, the four report files named in the qualification record, and `candidate-provider.json`/`publication-provider.json`, each containing the provider's original `run` and complete `jobs` responses.
Acquire the original `snapper-0.11.9-source.tar.gz` from the qualified native-build release and verify its frozen SHA-256.
Use complete terminal attempts; a successful publication job alone is insufficient.
Do not add private diagnostics, credentials or embargoed evidence.

```sh
node scripts/prepare-github-release.js docs/releases/1.0.2.json /approved/release-inputs /approved/new-release-bundle
```

The preparer copies only named original payloads, reads notices/build manifests directly from the exact Git commit, and creates a deterministic source archive with native `git archive`.
This source archive is an attached payload; GitHub's automatic source downloads are not substitutes for verified release assets.
It validates report/archive identities and creates a manifest binding every payload's digest and package-source identity, with separate native origins.
The evidence manifest does not contain its own hash; retain that digest externally.
Output directories are exclusive: partial preparations remain visible and require inspection before choosing a new directory.

## Publish and verify

Enable repository release immutability through the authorized GitHub settings path before publishing a new release.
It protects future releases; it does not retroactively protect the historical native-build release.
Create and verify the signed version tag with the existing qualified signing mechanism, resolving it to the original package source, then push that exact tag.
The delivery tool requires the tag to exist and never creates, replaces or moves it.
Do not substitute the current release-control commit for package source.

```sh
node scripts/github-release.js docs/releases/1.0.2.json /approved/release-bundle /approved/new-release-evidence
```

Use the existing authenticated GitHub CLI for this bounded operation.
Only this operation requires release-write authority; product checks and registry acquisition remain credential-free.
Each native command has a two-minute ceiling and retained attempted/returned/failed-or-unknown evidence.
Fresh anonymous registry archive acquisition must match the original tuple before external writes.

The operation prepares a draft prerelease, uploads only missing assets whose existing peers already match, and reads back the complete draft inventory and every asset's bytes before publication.
It never uses asset replacement, npm publication, tag movement or latest promotion.
Unexpected, duplicate, incomplete or mismatched assets, a wrong source tag, provider failure or disabled immutability stops delivery.
After publication, it requires native immutability, exact inventory/tag readback and successful `gh release verify` plus `gh release verify-asset` for every asset.
A success summary is written only after final readback.
Keep that summary, manifest digest, raw native verification results and corresponding assets for the accepted retention period.
GitHub release attestation, npm provenance, native build provenance and pilot acceptance remain distinct evidence.

## Recover an interruption

Preserve the previous attempted-effect journal and fresh provider state.
Revalidate the unchanged bundle and qualification record, then use a new evidence directory.
A matching partial draft resumes only missing uploads; it does not overwrite existing assets.
A fully matching published immutable prerelease receives readback and verification only.
An unknown creation/upload/publication outcome is reconciled through native provider lookup before any later attempt.
Do not delete, replace or republish an immutable identity to make a receipt pass.
Stop for explicit reconciliation if another actor changes the tag, inventory or classification.

Publishing the immutable prerelease does not satisfy either pilot's migration or trusted-run gate.
Stable promotion requires both exact pilot acceptances, platform windows, timed restoration and a separately admitted npm tag-management operation with its specific OIDC permission.
The stale alpha.2 `latest` target remains unqualified for Linux execution and is not an accepted recovery target.
Controlled installation guidance names the qualified exact pilot version until promotion is accepted.
