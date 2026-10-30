// SPDX-License-Identifier: AGPL-3.0-only
/** Transfer exact owner decisions from the protected draft reader to read-only assembly. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash, releaseBytes } from "./release-bytes.js";
import { readDraftDecisions } from "./release-acceptance.js";
import { repository } from "./release-assets.js";

export function collectDraftDecisions(
  directory,
  env = process.env,
  gh = (args) => native("gh", args),
) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch");
  for (const name of ["REGISTRY_RUN", "REGISTRY_ATTEMPT"])
    assert.match(env[name], /^[1-9]\d{0,15}$/u);
  const scratch = mkdtempSync(
    join(tmpdir(), "markdown-quality-decision-source-"),
  );
  try {
    gh([
      "run",
      "download",
      env.REGISTRY_RUN,
      "--repo",
      repository,
      "--name",
      `public-release-inputs-${env.REGISTRY_ATTEMPT}`,
      "--dir",
      scratch,
    ]);
    const manifest = releaseBytes(
      join(scratch, "release-manifest.json"),
      16 * 1024 * 1024,
    );
    assert.match(env.MANIFEST_SHA, /^[a-f0-9]{64}$/u);
    assert.equal(hash(manifest), env.MANIFEST_SHA);
    const decisions = readDraftDecisions(
      JSON.parse(manifest),
      env.MANIFEST_SHA,
      [
        {
          name: "release-review.json",
          digest: env.REVIEW_SHA,
          phase: "review",
        },
        {
          name: "release-acceptance.json",
          digest: env.ACCEPTANCE_SHA,
          phase: "pilot",
        },
      ],
      { repository, gh, allowImmutablePrerelease: true },
    );
    const output = resolve(directory);
    mkdirSync(output);
    for (const [name, bytes] of decisions)
      writeFileSync(join(output, name), bytes, { flag: "wx" });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    3,
    "Usage: read-release-decisions.js NEW_OUTPUT_DIRECTORY",
  );
  collectDraftDecisions(process.argv[2]);
}
