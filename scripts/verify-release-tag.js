// SPDX-License-Identifier: AGPL-3.0-only
/** Verify the pre-existing owner-signed source tag using authenticated GitHub evidence. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { repository, hash } from "./release-assets.js";
import { readDraftDecisions } from "./release-acceptance.js";

export function verifyReleaseTag(reference, annotation, release) {
  assert.equal(reference.ref, `refs/tags/v${release.version}`);
  assert.equal(reference.object.type, "tag");
  assert.equal(annotation.sha, reference.object.sha);
  assert.equal(annotation.tag, `v${release.version}`);
  assert.equal(annotation.object.type, "commit");
  assert.equal(annotation.object.sha, release.source.head);
  assert.equal(
    annotation.verification?.verified,
    true,
    "GitHub must verify the signed source tag",
  );
  assert.equal(annotation.verification.reason, "valid");
}

export function inspectReleaseTag(
  manifestPath,
  providerDirectory,
  {
    tagOnly = false,
    env = process.env,
    gh = (args) => native("gh", args),
  } = {},
) {
  const manifestBytes = readFileSync(manifestPath);
  const release = JSON.parse(manifestBytes);
  assert.equal(hash(manifestBytes), env.MANIFEST_SHA);
  assert.match(release.version, /^[1-9]\d*\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u);
  const reference = JSON.parse(
    gh(["api", `repos/${repository}/git/ref/tags/v${release.version}`]),
  );
  assert.equal(
    reference.object.type,
    "tag",
    "An annotated signed tag is required",
  );
  assert.match(reference.object.sha, /^[a-f0-9]{40}$/u);
  const annotation = JSON.parse(
    gh(["api", `repos/${repository}/git/tags/${reference.object.sha}`]),
  );
  verifyReleaseTag(reference, annotation, release);
  const tagPath = join(providerDirectory, "signed-tag.json");
  if (existsSync(tagPath))
    assert.deepEqual(JSON.parse(readFileSync(tagPath)), {
      reference,
      annotation,
    });
  else
    writeFileSync(
      tagPath,
      JSON.stringify({ reference, annotation }, null, 2) + "\n",
      { flag: "wx" },
    );
  if (tagOnly) return;
  const decisions = readDraftDecisions(
    release,
    hash(manifestBytes),
    [{ name: "release-review.json", digest: env.REVIEW_SHA, phase: "review" }],
    { repository, gh },
  );
  writeFileSync(
    join(providerDirectory, "release-review.json"),
    decisions.get("release-review.json"),
    { flag: "wx" },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(
    process.argv.length === 4 ||
      (process.argv.length === 5 && process.argv[4] === "--tag-only"),
    "Usage: verify-release-tag.js MANIFEST PROVIDER_DIRECTORY [--tag-only]",
  );
  inspectReleaseTag(process.argv[2], process.argv[3], {
    tagOnly: process.argv[4] === "--tag-only",
  });
}
