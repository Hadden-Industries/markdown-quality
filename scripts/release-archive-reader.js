// SPDX-License-Identifier: AGPL-3.0-only
/** Acquire an immutable indexed archive through native GitHub verification, then restore its logical proof. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { native } from "./commands.js";
import {
  hash,
  readJson,
  regularBytes,
  repository,
  materializeReleaseBundle,
  verifyInventory,
} from "./release-assets.js";
import { gitSource } from "./github-release.js";
import { artifactLimits } from "./artifact-policy.js";

/** Caller owns a fresh directory. No Actions availability is needed for these immutable bytes. */
export function acquireIndexedRelease(
  release,
  directory,
  gh = (args) => native("gh", args),
  { materialize = true, retainedQualification } = {},
) {
  assert.equal(release.draft, false);
  assert.equal(release.immutable, true);
  assert.ok(Number.isSafeInteger(release.id) && release.id > 0);
  const assets = join(directory, "assets"),
    logical = join(directory, "logical");
  mkdirSync(assets);
  gh([
    "release",
    "verify",
    release.tag_name,
    "--repo",
    repository,
    "--format",
    "json",
  ]);
  const acquire = (name) => {
    assert.match(name, /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}$/u);
    const matches = release.assets.filter((asset) => asset.name === name);
    assert.equal(matches.length, 1);
    gh([
      "release",
      "download",
      release.tag_name,
      "--repo",
      repository,
      "--pattern",
      name,
      "--dir",
      assets,
    ]);
    const bytes = regularBytes(join(assets, name), artifactLimits.payloadBytes);
    assert.equal(bytes.length, matches[0].size);
    assert.equal(`sha256:${hash(bytes)}`, matches[0].digest);
    gh([
      "release",
      "verify-asset",
      release.tag_name,
      join(assets, name),
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    return bytes;
  };
  const indexBytes = acquire("release-evidence-manifest.json"),
    index = JSON.parse(indexBytes);
  assert.ok([1, 3].includes(index.schemaVersion));
  const payloads = index.schemaVersion === 3 ? index.assets : index.payloads;
  assert.ok(Array.isArray(payloads));
  const empty =
    index.schemaVersion === 1
      ? payloads.filter(
          (asset) =>
            asset.size === 0 &&
            asset.name.startsWith("performance-") &&
            asset.name.endsWith(".stderr.txt"),
        )
      : [];
  const outer = payloads.filter((asset) => !empty.includes(asset));
  verifyInventory(release, [
    ...outer,
    {
      name: "release-evidence-manifest.json",
      size: indexBytes.length,
      sha256: hash(indexBytes),
    },
  ]);
  for (const asset of outer) acquire(asset.name);
  for (const asset of empty) {
    assert.match(asset.name, /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}$/u);
    assert.equal(asset.sha256, hash(Buffer.alloc(0)));
    writeFileSync(join(assets, asset.name), Buffer.alloc(0), { flag: "wx" });
  }
  const qualified =
    index.schemaVersion === 3
      ? readJson(join(assets, "qualification.json"))
      : retainedQualification;
  assert.ok(
    qualified,
    "Historical flat recovery requires the signed original qualification separately",
  );
  assert.equal(release.tag_name, `v${qualified.version}`);
  const verified = materialize
    ? materializeReleaseBundle(
        qualified,
        assets,
        logical,
        gitSource(qualified, process.cwd()),
      )
    : outer;
  return { qualified, directory: assets, logical, assets: verified };
}
