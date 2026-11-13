// SPDX-License-Identifier: AGPL-3.0-only
/** Exercise actual OpenSSH signatures; a valid signature by another key is insufficient. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "../scripts/commands.js";
import { verifyReleaseTag } from "../scripts/verify-release-tag.js";

test("release tag verifies owner identity, payload binding and explicitly scoped key rotation", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "release-signature-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const owner = join(directory, "owner"),
    foreign = join(directory, "foreign");
  for (const key of [owner, foreign])
    native("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
  const publicKey = (key) =>
    readFileSync(`${key}.pub`, "utf8")
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .join(" ");
  const release = { version: "4.0.0-rc.1", source: { head: "a".repeat(40) } };
  const reference = {
    ref: "refs/tags/v4.0.0-rc.1",
    object: { type: "tag", sha: "b".repeat(40) },
  };
  const payload = `object ${release.source.head}\ntype commit\ntag v${release.version}\ntagger Test <test@example.test> 1 +0000\n\nExact source\n`;
  const annotation = {
    sha: reference.object.sha,
    tag: `v${release.version}`,
    object: { type: "commit", sha: release.source.head },
    verification: { verified: true, reason: "valid", payload },
  };
  const sign = (key, bytes = payload) =>
    native("ssh-keygen", ["-Y", "sign", "-f", key, "-n", "git"], {
      input: bytes,
    });
  const signerPolicy = {
    principal: "test@example.test",
    activeKeys: [publicKey(owner)],
    historicalTags: {},
  };
  annotation.verification.signature = sign(owner);
  verifyReleaseTag(reference, annotation, release, { signerPolicy });
  annotation.verification.signature = sign(foreign);
  assert.throws(
    () => verifyReleaseTag(reference, annotation, release, { signerPolicy }),
    /signature|signer|ssh-keygen/iu,
  );
  annotation.verification.signature = sign(
    owner,
    payload.replace(release.source.head, "c".repeat(40)),
  );
  assert.throws(() =>
    verifyReleaseTag(reference, annotation, release, { signerPolicy }),
  );
  annotation.verification.signature = sign(owner);
  const rotated = {
    principal: signerPolicy.principal,
    activeKeys: [publicKey(foreign)],
    historicalTags: { [annotation.sha]: [publicKey(owner)] },
  };
  verifyReleaseTag(reference, annotation, release, { signerPolicy: rotated });
  const nextRef = structuredClone(reference),
    nextTag = structuredClone(annotation);
  nextRef.object.sha = nextTag.sha = "d".repeat(40);
  assert.throws(
    () =>
      verifyReleaseTag(nextRef, nextTag, release, { signerPolicy: rotated }),
    /signature|signer|ssh-keygen/iu,
  );
});
