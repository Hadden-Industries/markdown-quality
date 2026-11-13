// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { checkStagedTarball } from "../scripts/verify-staged-tarball.js";

const members = ["win32-x64", "linux-x64", "core"];
const sha = (bytes, algorithm = "sha256", encoding = "hex") =>
  createHash(algorithm).update(bytes).digest(encoding);

function fixture(member = "win32-x64", channel = "pilot") {
  const tarballs = Object.fromEntries(
    members.map((name) => [name, Buffer.from(`Downloaded ${name} fixture`)]),
  );
  const manifest = Buffer.from(
    JSON.stringify({
      version: "3.0.2",
      archives: members.map((name) => ({
        name,
        package:
          "@hadden-industries/markdown-quality" +
          (name === "core" ? "" : `-${name}`),
        version: "3.0.2",
        sha256: sha(tarballs[name]),
        integrity: "sha512-" + sha(tarballs[name], "sha512", "base64"),
      })),
    }),
  );
  const files = new Map([
    ["release-manifest.json", manifest],
    ["downloaded.tgz", tarballs[member]],
  ]);
  return {
    files,
    tarballs,
    run() {
      let result;
      const status = checkStagedTarball(
        [
          "release-manifest.json",
          sha(manifest),
          member,
          `original-${member}-stage`,
          channel,
          "downloaded.tgz",
        ],
        {
          read: (path) => files.get(path),
          report: (value) => (result = value),
        },
      );
      return { status, result };
    },
  };
}

test("matching downloaded bytes pass for every member and either reviewed channel", () => {
  for (const member of members)
    for (const channel of ["pilot", "latest"]) {
      const { status, result } = fixture(member, channel).run();
      assert.equal(status, 0);
      assert.equal(result.status, "verified");
      assert.equal(result.stageId, `original-${member}-stage`);
      assert.equal(result.tag, channel);
      assert.equal(
        result.manifestSha256.observed,
        result.manifestSha256.expected,
      );
      assert.deepEqual(result.observed, result.expected);
    }
});

test("a one-byte modification refuses approval evidence with both observed digests", () => {
  const f = fixture();
  const changed = Buffer.from(f.files.get("downloaded.tgz"));
  changed[0] ^= 1;
  f.files.set("downloaded.tgz", changed);
  const { status, result } = f.run();
  assert.equal(status, 1);
  assert.equal(result.status, "refused");
  assert.equal(result.stageId, "original-win32-x64-stage");
  assert.notEqual(result.observed.sha256, result.expected.sha256);
  assert.notEqual(result.observed.integrity, result.expected.integrity);
});

test("another package member's tarball cannot satisfy the selected stage check", () => {
  const f = fixture();
  f.files.set("downloaded.tgz", f.tarballs["linux-x64"]);
  const { status, result } = f.run();
  assert.equal(status, 1);
  assert.equal(result.status, "refused");
  assert.equal(result.package, "@hadden-industries/markdown-quality-win32-x64");
  assert.notEqual(result.observed.sha256, result.expected.sha256);
  assert.notEqual(result.observed.integrity, result.expected.integrity);
});
