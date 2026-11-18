// SPDX-License-Identifier: AGPL-3.0-only
/** Admit the owner's digest-bound repository setting observation before draft effects. */
import { repository, repositoryUrl } from "./release-identity.js";
import assert from "node:assert/strict";
import { hash } from "./release-bytes.js";

/** A published immutable release verifies its own state and needs no fresh settings observation. */
export function verifyImmutabilityObservation(
  observation,
  qualified,
  now = Date.now(),
) {
  assert.equal(observation?.repository, repositoryUrl);
  assert.equal(
    observation.endpoint,
    `https://api.github.com/repos/${repository}/immutable-releases`,
  );
  const checked = Date.parse(observation.checkedAt);
  assert.ok(
    Number.isFinite(checked) && checked <= now && now - checked <= 3600000,
    "Owner immutability observation is stale or in the future",
  );
  assert.deepEqual(observation.candidate, {
    version: qualified.version,
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
  });
  assert.equal(typeof observation.responseBytes, "string");
  const bytes = Buffer.from(observation.responseBytes);
  assert.ok(bytes.length <= 65536);
  assert.equal(hash(bytes), observation.sha256);
  assert.equal(
    JSON.parse(bytes).enabled,
    true,
    "Repository immutability is disabled",
  );
  return observation;
}
