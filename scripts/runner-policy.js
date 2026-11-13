// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import nodeSupport from "../assets/node-support.json" with { type: "json" };

export const ubuntuRunnerPattern = /^ubuntu-(\d[02468])\.04$/u;
export const windowsRunnerPattern = /^windows-20(\d{2})(-vs20\d{2})?$/u;
// Release evidence from before the explicit Visual Studio image pin.
export const legacyWindowsRunner = "windows-2025";

function selectRunner(policy, family, pattern) {
  const runners = policy.platforms.filter((platform) =>
    platform.startsWith(family + "-"),
  );
  assert.equal(
    runners.length,
    1,
    `Expected one ${family} qualification runner`,
  );
  assert.match(runners[0], pattern, `Unsupported ${family} runner label`);
  return runners[0];
}

export function ubuntuRunner(policy = nodeSupport) {
  return selectRunner(policy, "ubuntu", ubuntuRunnerPattern);
}

export function windowsRunner(policy = nodeSupport) {
  return selectRunner(policy, "windows", windowsRunnerPattern);
}

/** Check pinned lane names against provider labels, retaining earlier Windows evidence as recorded. */
export function assertMatrixJobLabel(job) {
  const runner = job.name
    .split(/[\s(),/]+/u)
    .find(
      (label) =>
        ubuntuRunnerPattern.test(label) ||
        windowsRunnerPattern.exec(label)?.[2],
    );
  if (runner)
    assert.deepEqual(
      job.labels?.filter((label) => /^(?:ubuntu|windows)-/u.test(label)),
      [runner],
      `GitHub runner labels differ from the frozen lane: ${job.name}`,
    );
}
