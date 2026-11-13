// SPDX-License-Identifier: AGPL-3.0-only
/** Authenticate owner-signed release/history tag payloads using native OpenSSH. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "./commands.js";

export const releaseSigningPolicy = JSON.parse(
  readFileSync(new URL("./release-signers.json", import.meta.url)),
);

/** Historical keys qualify only exact retained tag objects, so rotation cannot admit backdated new refs. */
export function verifyOwnerTagSignature(
  annotation,
  signerPolicy = releaseSigningPolicy,
  command = native,
) {
  assert.equal(annotation.verification?.verified, true);
  assert.equal(annotation.verification.reason, "valid");
  const { payload, signature } = annotation.verification;
  assert.equal(typeof payload, "string", "Missing signed tag payload");
  assert.ok(payload.length <= 65536);
  assert.ok(
    payload.startsWith(
      `object ${annotation.object.sha}\ntype commit\ntag ${annotation.tag}\ntagger `,
    ),
    "Signed tag payload differs from its source or ref",
  );
  assert.ok(
    typeof signature === "string" &&
      signature.length <= 16384 &&
      /^-----BEGIN SSH SIGNATURE-----\r?\n/u.test(signature),
    "Missing native SSH signature",
  );
  assert.match(signerPolicy.principal, /^[A-Za-z0-9@._+-]+$/u);
  const keys = [
    ...signerPolicy.activeKeys,
    ...(signerPolicy.historicalTags[annotation.sha] ?? []),
  ];
  assert.ok(keys.length > 0 && keys.length <= 32);
  for (const key of keys) assert.match(key, /^ssh-ed25519 [A-Za-z0-9+/=]+$/u);
  const scratch = mkdtempSync(
    join(tmpdir(), "markdown-quality-tag-signature-"),
  );
  try {
    const signers = join(scratch, "allowed-signers"),
      signed = join(scratch, "tag.sig");
    writeFileSync(
      signers,
      keys
        .map((key) => `${signerPolicy.principal} namespaces="git" ${key}\n`)
        .join(""),
      { flag: "wx" },
    );
    writeFileSync(signed, signature, { flag: "wx" });
    command(
      "ssh-keygen",
      [
        "-Y",
        "verify",
        "-f",
        signers,
        "-I",
        signerPolicy.principal,
        "-n",
        "git",
        "-s",
        signed,
      ],
      { input: payload },
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
