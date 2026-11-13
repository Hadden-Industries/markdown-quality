// SPDX-License-Identifier: AGPL-3.0-only
/** Compare an owner's downloaded stage bytes; never contact npm or approve a stage. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { hash, releaseBytes, verifyArchiveBytes } from "./release-bytes.js";

/** The owner authenticates the stage identity and channel separately with npm stage view. */
export function checkStagedTarball(
  args,
  {
    read = releaseBytes,
    report = (result) => console.log(JSON.stringify(result, null, 2)),
  } = {},
) {
  const [manifestPath, manifestSha256, member, stageId, channel, tarballPath] =
    args;
  const result = { status: "refused", stageId, tag: channel, member };
  try {
    assert.equal(
      args.length,
      6,
      "Usage: verify-staged-tarball.js MANIFEST MANIFEST_SHA256 MEMBER STAGE_ID CHANNEL DOWNLOADED_TGZ",
    );
    assert.ok(["win32-x64", "linux-x64", "core"].includes(member));
    assert.ok(
      ["pilot", "latest"].includes(channel),
      "Unknown reviewed channel",
    );
    assert.ok(
      typeof stageId === "string" &&
        stageId.length > 0 &&
        stageId.length <= 256 &&
        !/[\r\n]/u.test(stageId),
      "Expected the original journal's stage ID",
    );
    assert.match(manifestSha256, /^[a-f0-9]{64}$/u);
    const manifestBytes = read(
      manifestPath,
      1_048_576,
      "Expected a bounded regular qualification manifest",
    );
    result.manifestSha256 = {
      expected: manifestSha256,
      observed: hash(manifestBytes),
    };
    assert.equal(
      result.manifestSha256.observed,
      manifestSha256,
      "Qualification manifest SHA-256 mismatch",
    );
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    const entries = manifest.archives.filter(
      (archive) => archive.name === member,
    );
    assert.equal(entries.length, 1, "Expected exactly one manifest member");
    const archive = entries[0];
    assert.equal(
      archive.package,
      "@hadden-industries/markdown-quality" +
        (member === "core" ? "" : `-${member}`),
    );
    assert.equal(typeof manifest.version, "string");
    assert.equal(archive.version, manifest.version);
    result.package = archive.package;
    result.version = archive.version;
    result.expected = { sha256: archive.sha256, integrity: archive.integrity };
    const bytes = read(
      tarballPath,
      20_000_000,
      "Expected a bounded regular downloaded tarball",
    );
    result.observed = {
      sha256: hash(bytes),
      integrity:
        "sha512-" + createHash("sha512").update(bytes).digest("base64"),
    };
    verifyArchiveBytes(bytes, archive);
    result.status = "verified";
  } catch (error) {
    result.reason = error.message;
  }
  report(result);
  return result.status === "verified" ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = checkStagedTarball(process.argv.slice(2));
