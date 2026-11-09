// SPDX-License-Identifier: AGPL-3.0-only
/** Deliberate, journaled label changes after immutable pilot qualification. */
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { npmCliPath, npmCommand, native } from "./commands.js";
import { budgets } from "./qualification-budgets.js";
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
const npmTagReadbackBudgetMs = 300_000;
const npmTagReadbackMaxDelayMs = 16_000;

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
  sleep = delay,
  now = () => performance.now(),
}) {
  const requiredTargets = new Set();
  const observeLabels = async () => {
    const deadline = now() + npmTagReadbackBudgetMs;
    let backoff = 1_000;
    for (;;) {
      const labels = await readLabels(deadline);
      verifyPromotionLabels(labels, version, previous);
      const pending = [...requiredTargets].filter(
        (name) => labels[name] !== version,
      );
      const remaining = deadline - now();
      if (remaining > 0 && pending.length === 0) return labels;
      if (remaining > 0) await sleep(Math.min(backoff, remaining));
      if (now() >= deadline) {
        assert.fail(
          "Tag update outcome unresolved within five minutes; inspect native registry state before resuming",
        );
      }
      backoff = Math.min(backoff * 2, npmTagReadbackMaxDelayMs);
    }
  };
  await observeLabels();
  for (const name of packages) {
    // Require all earlier targets to be visible before advancing the next label.
    const labels = await observeLabels();
    if (labels[name] === version) {
      requiredTargets.add(name);
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
      requiredTargets.add(name);
      await observeLabels();
      record({ state: "verified", package: name, version });
    } catch (error) {
      record({ state: "outcome-unknown", package: name, target: version });
      throw error;
    }
  }
  return observeLabels();
}

/** The native npm command owns the registry protocol and OIDC exchange. */
export function readNpmLabels(deadline, command = npmCommand) {
  return Object.fromEntries(
    packages.map((name) => {
      const remaining =
        deadline === undefined
          ? budgets.read
          : Math.floor(deadline - performance.now());
      assert.ok(remaining > 0, "npm tag readback budget exhausted");
      const output = JSON.parse(
        command(
          [
            "view",
            name,
            "dist-tags",
            "--json",
            "--prefer-online",
            "--registry=https://registry.npmjs.org/",
          ],
          { timeout: Math.min(remaining, budgets.read) },
        ),
      );
      const results = Array.isArray(output) ? output : [output];
      assert.equal(
        results.length,
        1,
        `Expected one npm tag result for ${name}`,
      );
      const latest = results[0]?.latest;
      assert.equal(
        typeof latest,
        "string",
        `Missing npm latest tag for ${name}`,
      );
      return [name, latest];
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
    ["decisions", "prepare", "archive"],
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
  let labels = readNpmLabels();
  verifyPromotionLabels(
    labels,
    qualified.version,
    process.env.PRIOR_NPM_VERSION,
  );
  if (phase === "npm") {
    labels = await promoteNpmLabels({
      version: qualified.version,
      previous: process.env.PRIOR_NPM_VERSION,
      readLabels: readNpmLabels,
      record,
    });
  } else if (phase === "github") {
    labels = readNpmLabels();
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
    labels = readNpmLabels();
    verifyStableCompletion(labels, release, api("releases/latest"), qualified);
  }
  const result = {
    schemaVersion: 1,
    phase,
    version: qualified.version,
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
    qualificationSha256: hash(qualifiedBytes),
    labels,
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
