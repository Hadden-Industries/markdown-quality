// SPDX-License-Identifier: AGPL-3.0-only
/** Npm version and channel validation shared by release workflows. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { npmCliPath } from "./commands.js";

export { releasePackages } from "./release-identity.js";
export const releaseSemver = createRequire(npmCliPath())("semver");

/** npm owns SemVer parsing; reject aliases and metadata npm would normalize away. */
export function releaseVersion(version, { stable = false } = {}) {
  assert.equal(typeof version, "string");
  assert.equal(
    releaseSemver.valid(version),
    version,
    "Noncanonical npm release version",
  );
  if (stable)
    assert.equal(
      releaseSemver.prerelease(version),
      null,
      "A stable target is required",
    );
  return version;
}

/** Omission means pilot even though the native npm CLI defaults to latest. */
export function releaseChannel(channel = "pilot") {
  assert.ok(["pilot", "latest"].includes(channel), "Unknown release channel");
  return channel;
}
