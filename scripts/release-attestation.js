// SPDX-License-Identifier: AGPL-3.0-only
/** Observe immutable release indexing; native gh still owns cryptographic verification. */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { native } from "./commands.js";
import { budgets } from "./qualification-budgets.js";
import { repository, verifyInventory } from "./release-assets.js";
import { verifyReleaseTag } from "./verify-release-tag.js";

const notIndexed = (error) => {
  if (error.httpStatus === 404) return true;
  try {
    const response = JSON.parse(String(error.stdout));
    return (
      String(response.status) === "404" && response.message === "Not Found"
    );
  } catch {
    return false;
  }
};

export async function waitForReleaseAttestation(
  qualified,
  release,
  assets,
  tagSha,
  {
    gh = (args, options) => native("gh", args, options),
    now = Date.now,
    sleep = delay,
    deadline = now() + budgets.read,
  } = {},
) {
  assert.match(tagSha, /^[a-f0-9]{40}$/u);
  assert.ok(Number.isSafeInteger(release.id) && release.id > 0);
  const releaseId = release.id;
  const expectedSource = {
    version: qualified.version,
    source: { head: qualified.source },
  };
  const tag = `v${expectedSource.version}`;
  const read = (path) => {
    const remaining = deadline - now();
    assert.ok(remaining > 0, "Release attestation indexing budget exhausted");
    const value = JSON.parse(
      gh(["api", `repos/${repository}/${path}`], { timeout: remaining }),
    );
    assert.ok(
      now() < deadline,
      "Release attestation indexing budget exhausted",
    );
    return value;
  };
  const unchanged = () => {
    const reference = read(`git/ref/tags/${tag}`);
    assert.equal(
      reference.object.sha,
      tagSha,
      "Release tag changed during attestation observation",
    );
    verifyReleaseTag(reference, read(`git/tags/${tagSha}`), expectedSource);
    const live = read(`releases/${releaseId}`);
    assert.equal(live.id, releaseId);
    assert.equal(live.tag_name, tag);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    assert.equal(live.prerelease, true);
    verifyInventory(live, assets);
  };
  for (let observation = 1; ; observation++) {
    unchanged();
    let attestations;
    try {
      const result = read(
        `attestations/sha1%3A${tagSha}?predicate_type=release&per_page=100`,
      );
      assert.ok(
        Array.isArray(result.attestations) && result.attestations.length <= 100,
        "Malformed release attestation inventory",
      );
      assert.ok(
        result.attestations.every(
          (entry) =>
            entry && typeof entry === "object" && !Array.isArray(entry),
        ),
        "Malformed release attestation entry",
      );
      attestations = result.attestations;
    } catch (error) {
      if (!notIndexed(error)) throw error;
      attestations = [];
    }
    if (attestations.length) {
      unchanged();
      return { observations: observation };
    }
    const remaining = deadline - now();
    assert.ok(remaining > 0, "Release attestation indexing budget exhausted");
    await sleep(Math.min(budgets.read / 4, remaining));
  }
}
