// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { verifyImmutabilityObservation } from "../scripts/release-immutability.js";
import { hash } from "../scripts/release-bytes.js";

test("only fresh exact-candidate enabled settings bytes admit a draft write", () => {
  const candidate = {
    version: "4.0.0-rc.1",
    source: "a".repeat(40),
    manifestSha256: "b".repeat(64),
  };
  const now = Date.parse("2026-11-13T01:00:00Z");
  const observation = {
    repository: "https://github.com/Hadden-Industries/markdown-quality",
    endpoint:
      "https://api.github.com/repos/Hadden-Industries/markdown-quality/immutable-releases",
    checkedAt: "2026-11-13T00:30:00Z",
    candidate,
    responseBytes: '{"enabled":true}',
    sha256: hash(Buffer.from('{"enabled":true}')),
  };
  verifyImmutabilityObservation(observation, candidate, now);
  for (const change of [
    { checkedAt: "2026-11-13T01:00:01Z" },
    { checkedAt: "2026-11-12T23:59:59Z" },
    { repository: "https://github.com/foreign/repository" },
    { candidate: { ...candidate, source: "c".repeat(40) } },
    {
      responseBytes: '{"enabled":false}',
      sha256: hash(Buffer.from('{"enabled":false}')),
    },
    { sha256: "0".repeat(64) },
  ])
    assert.throws(() =>
      verifyImmutabilityObservation(
        { ...observation, ...change },
        candidate,
        now,
      ),
    );
});
