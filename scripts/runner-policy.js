// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import nodeSupport from "../assets/node-support.json" with { type: "json" };

export const ubuntuRunnerPattern = /^ubuntu-(\d[02468])\.04$/u;

export function ubuntuRunner(policy = nodeSupport) {
  const runners = policy.platforms.filter((platform) =>
    platform.startsWith("ubuntu-"),
  );
  assert.equal(runners.length, 1, "Expected one Ubuntu qualification runner");
  assert.match(runners[0], ubuntuRunnerPattern, "Ubuntu requires an LTS label");
  return runners[0];
}

export function assertUbuntuJobLabel(job) {
  const runner = /\bubuntu-\d[02468]\.04(?=[ ,)])/u.exec(job.name)?.[0];
  if (runner)
    assert.deepEqual(
      job.labels?.filter((label) => label.startsWith("ubuntu-")),
      [runner],
      `GitHub runner labels differ from the frozen Ubuntu lane: ${job.name}`,
    );
}
