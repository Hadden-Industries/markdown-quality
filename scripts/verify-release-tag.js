// SPDX-License-Identifier: AGPL-3.0-only
/** Verify the pre-existing owner-signed source tag using authenticated GitHub evidence. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { repository, hash } from "./release-assets.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: verify-release-tag.js MANIFEST PROVIDER_DIRECTORY",
  );
  const release = JSON.parse(readFileSync(process.argv[2]));
  assert.match(release.version, /^[1-9]\d*\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u);
  const reference = JSON.parse(
    native("gh", [
      "api",
      `repos/${repository}/git/ref/tags/v${release.version}`,
    ]),
  );
  assert.equal(
    reference.object.type,
    "tag",
    "An annotated signed tag is required",
  );
  assert.match(reference.object.sha, /^[a-f0-9]{40}$/u);
  const annotation = JSON.parse(
    native("gh", [
      "api",
      `repos/${repository}/git/tags/${reference.object.sha}`,
    ]),
  );
  verifyReleaseTag(reference, annotation, release);
  writeFileSync(
    join(process.argv[3], "signed-tag.json"),
    JSON.stringify({ reference, annotation }, null, 2) + "\n",
    { flag: "wx" },
  );
  // The owner creates a draft and attaches the public decision record after
  // qualification. It binds review to the actual archives without a source
  // commit that would change the very subject being approved.
  const draft = JSON.parse(
    native("gh", [
      "release",
      "view",
      `v${release.version}`,
      "--repo",
      repository,
      "--json",
      "isDraft,isPrerelease,tagName",
    ]),
  );
  assert.equal(draft.isDraft, true);
  assert.equal(draft.isPrerelease, true);
  assert.equal(draft.tagName, `v${release.version}`);
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-review-"));
  try {
    native("gh", [
      "release",
      "download",
      `v${release.version}`,
      "--repo",
      repository,
      "--pattern",
      "release-review.json",
      "--dir",
      scratch,
    ]);
    const bytes = readFileSync(join(scratch, "release-review.json"));
    verifyReleaseAcceptance(
      bytes,
      process.env.REVIEW_SHA,
      release,
      hash(readFileSync(process.argv[2])),
      "review",
    );
    writeFileSync(join(process.argv[3], "release-review.json"), bytes, {
      flag: "wx",
    });
  } finally {
    assert.ok(scratch.startsWith(join(tmpdir(), "markdown-quality-review-")));
    rmSync(scratch, { recursive: true, force: true });
  }
}
