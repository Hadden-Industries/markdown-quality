// SPDX-License-Identifier: AGPL-3.0-only
/** Deliberate, journaled label changes after immutable pilot qualification. */
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCliPath, npmCommand, native } from "./commands.js";
import { gitSource } from "./github-release.js";
import {
  hash,
  readJson,
  regularBytes,
  repository,
  verifyBundle,
  verifyInventory,
} from "./release-assets.js";
import {
  requireManualControl,
  providerFor,
  readProvider,
} from "./release-continuation.js";
import { verifyReleaseTag } from "./verify-release-tag.js";

const semver = createRequire(npmCliPath())("semver");
const packages = [
  "@hadden-industries/markdown-quality-win32-x64",
  "@hadden-industries/markdown-quality-linux-x64",
  "@hadden-industries/markdown-quality",
];

export function verifyPromotionLabels(labels, version, previous) {
  assert.equal(semver.valid(version), version);
  assert.equal(semver.prerelease(version), null);
  assert.equal(semver.valid(previous), previous);
  assert.ok(
    semver.gt(version, previous),
    "Stable promotion must advance the explicitly approved prior version",
  );
  assert.deepEqual(Object.keys(labels).sort(), [...packages].sort());
  for (const name of packages)
    assert.ok(
      [previous, version].includes(labels[name]),
      `Unexpected latest for ${name}; reconcile before changing labels`,
    );
}

export async function promoteNpmLabels({
  version,
  previous,
  readLabels,
  command = npmCommand,
  record = () => {},
}) {
  let labels = await readLabels();
  verifyPromotionLabels(labels, version, previous);
  for (const name of packages) {
    // Re-read all labels before each effect; never overwrite a concurrent new
    // stable release or expose core while either native label is still old.
    labels = await readLabels();
    verifyPromotionLabels(labels, version, previous);
    if (name === packages[2])
      for (const nativePackage of packages.slice(0, 2))
        assert.equal(labels[nativePackage], version);
    if (labels[name] === version) {
      record({ state: "observed-target", package: name, version });
      continue;
    }
    record({
      state: "attempted",
      package: name,
      previous: labels[name],
      target: version,
    });
    try {
      command([
        "dist-tag",
        "add",
        `${name}@${version}`,
        "latest",
        "--registry=https://registry.npmjs.org/",
      ]);
      const observed = await readLabels();
      verifyPromotionLabels(observed, version, previous);
      assert.equal(
        observed[name],
        version,
        "Tag update outcome unresolved; inspect native registry state before resuming",
      );
      record({ state: "verified", package: name, version });
    } catch (error) {
      record({ state: "outcome-unknown", package: name, target: version });
      throw error;
    }
  }
  labels = await readLabels();
  for (const name of packages) assert.equal(labels[name], version);
  return labels;
}

/** The native npm command owns the registry protocol and OIDC exchange. */
function readNpmLabels() {
  return Object.fromEntries(
    packages.map((name) => {
      const tags = JSON.parse(
        npmCommand([
          "view",
          name,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ]),
      );
      return [name, tags.latest];
    }),
  );
}

export function verifyStableCompletion(labels, release, latest, qualified) {
  for (const name of packages) assert.equal(labels[name], qualified.version);
  assert.equal(release.tag_name, `v${qualified.version}`);
  assert.equal(release.draft, false);
  assert.equal(release.immutable, true);
  assert.equal(release.prerelease, false);
  assert.equal(latest.id, release.id);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: promote-release.js admit|npm|github INPUTS NEW_JOURNAL_DIRECTORY",
  );
  const [phase, input, output] = process.argv.slice(2);
  assert.ok(["admit", "npm", "github"].includes(phase));
  requireManualControl(process.env, ".github/workflows/promote-release.yml");
  const qualifiedBytes = regularBytes(join(input, "qualification.json"));
  assert.match(process.env.QUALIFICATION_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(hash(qualifiedBytes), process.env.QUALIFICATION_SHA);
  const qualified = JSON.parse(qualifiedBytes);
  assert.equal(qualified.schemaVersion, 2);
  const bundle = resolve(input, "bundle");
  const assets = verifyBundle(
    qualified,
    bundle,
    gitSource(qualified, process.cwd()),
  );
  const archival = readProvider(
    process.env.ARCHIVE_RUN,
    process.env.ARCHIVE_ATTEMPT,
  );
  providerFor(
    archival.run,
    archival.jobs,
    ".github/workflows/github-release.yml",
    ["prepare", "archive"],
  );
  mkdirSync(output);
  const record = (event) =>
    appendFileSync(
      join(output, "effects.jsonl"),
      JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n",
      { flush: true },
    );
  const gh = (args) => {
    record({ state: "attempted", provider: "github", args });
    try {
      const text = native("gh", args);
      record({
        state: "returned",
        provider: "github",
        sha256: hash(Buffer.from(text)),
      });
      return text;
    } catch (error) {
      record({ state: "failed-or-unknown", provider: "github" });
      throw error;
    }
  };
  const api = (path) => JSON.parse(gh(["api", `repos/${repository}/${path}`]));
  const tag = `v${qualified.version}`;
  const verifyArchive = () => {
    const reference = api(`git/ref/tags/${tag}`);
    assert.equal(reference.object.type, "tag");
    verifyReleaseTag(reference, api(`git/tags/${reference.object.sha}`), {
      version: qualified.version,
      source: { head: qualified.source },
    });
    const release = api(`releases/tags/${tag}`);
    assert.equal(release.draft, false);
    assert.equal(release.immutable, true);
    verifyInventory(release, assets);
    gh(["release", "verify", tag, "--repo", repository, "--format", "json"]);
    for (const asset of assets)
      gh([
        "release",
        "verify-asset",
        tag,
        join(bundle, asset.name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    return release;
  };
  assert.equal(
    api("git/ref/heads/main").object.sha,
    process.env.GITHUB_SHA,
    "Control branch advanced after dispatch",
  );
  let release = verifyArchive();
  assert.match(process.env.PRIOR_GITHUB_RELEASE, /^[1-9]\d{0,15}$/u);
  const latest = api("releases/latest");
  assert.ok(
    [String(release.id), process.env.PRIOR_GITHUB_RELEASE].includes(
      String(latest.id),
    ),
    "Unexpected GitHub latest; reconcile before promotion",
  );
  verifyPromotionLabels(
    readNpmLabels(),
    qualified.version,
    process.env.PRIOR_NPM_VERSION,
  );
  if (phase === "npm") {
    await promoteNpmLabels({
      version: qualified.version,
      previous: process.env.PRIOR_NPM_VERSION,
      readLabels: readNpmLabels,
      record,
    });
  } else if (phase === "github") {
    const labels = readNpmLabels();
    for (const name of packages)
      assert.equal(
        labels[name],
        qualified.version,
        "All npm labels must be verified before GitHub stable classification",
      );
    if (release.prerelease || latest.id !== release.id)
      gh([
        "release",
        "edit",
        tag,
        "--repo",
        repository,
        "--prerelease=false",
        "--latest",
      ]);
    release = verifyArchive();
    verifyStableCompletion(
      readNpmLabels(),
      release,
      api("releases/latest"),
      qualified,
    );
  }
  const result = {
    schemaVersion: 1,
    phase,
    version: qualified.version,
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
    qualificationSha256: hash(qualifiedBytes),
    labels: readNpmLabels(),
    releaseId: release.id,
    prerelease: release.prerelease,
    wholeReleaseComplete: phase === "github",
  };
  writeFileSync(
    join(output, "summary.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${phase}: ${qualified.version}, source ${qualified.source}. Whole release complete: ${result.wholeReleaseComplete}. Inspect the retained label and GitHub readback before handoff.\n`,
    );
}
