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
import { executeFamilyLabels } from "./family-labels.js";

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
  settled = {},
}) {
  verifyPromotionLabels(
    Object.fromEntries(packages.map((name) => [name, previous])),
    version,
    previous,
  );
  return executeFamilyLabels({
    operation: {
      operation: "promote",
      label: "latest",
      scope: { npm: packages },
      priors: Object.fromEntries(packages.map((name) => [name, previous])),
      targets: Object.fromEntries(packages.map((name) => [name, version])),
    },
    readLabels,
    command,
    record,
    now,
    sleep,
    settled,
    random: () => 0,
  });
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
    "Usage: promote-release.js admit|npm|github|verify INPUTS NEW_OUTPUT",
  );
  const { runReleaseController } = await import("./release-controller.js");
  const result = await runReleaseController({
    phase: process.argv[2],
    input: resolve(process.argv[3]),
    output: resolve(process.argv[4]),
  });
  process.stdout.write(JSON.stringify(result) + "\n");
  if (result.status === "completion-unconfirmed") process.exitCode = 1;
}
