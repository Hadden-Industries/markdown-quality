// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateJsonQualityEvent } from "../../tooling/json/public-api.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
function cli(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/runRepositoryJsonQuality.mjs", ...args, "--json"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  assert.equal(result.error, undefined);
  const events = result.stdout
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line));
  for (const event of events)
    assert.equal(validateJsonQualityEvent(event), true);
  return { ...result, events, terminal: events.at(-1) };
}

test("the real complete CLI includes protected native members while capacity bypass preserves finite runtime controls", () => {
  const result = cli(["check", "--no-capacity-limits"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.terminal.type, "execution-terminal");
  for (const key of [
    "inventoryComplete",
    "linkedExpectationsComplete",
    "sourceObservationsComplete",
    "diagnosticsComplete",
    "contractSatisfied",
  ])
    assert.equal(result.terminal[key], true, key);
  assert.equal(result.terminal.domainComplete, false);
  const execution = result.events.find((event) => event.type === "execution");
  assert.ok(
    Object.values(execution.resources.admission).every(
      (value) => value === null,
    ),
  );
  assert.ok(
    Object.values(execution.resources.runtime).every(
      (value) => BigInt(value) > 0n,
    ),
  );
  const paths = new Set(
    result.events
      .filter((event) => event.type === "source")
      .map((event) => event.path),
  );
  for (const path of [
    "docs/releases/1.0.3.json",
    "test/fixtures/performance-incumbents/owlapi.json.gz!/owlapi.json",
    "test/fixtures/performance-incumbents/webvowl.json.gz!/webvowl.json",
    ...["linux-x64", "win32-x64"].map(
      (platform) =>
        `packages/${platform}/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`,
    ),
  ])
    assert.ok(paths.has(path), path);
});

for (const spelling of [
  "inventory",
  "lint",
  "check-format",
  "format-check",
  "producers",
])
  test(`the real CLI rejects the retired ${spelling} spelling`, () => {
    const result = cli([spelling]);
    assert.equal(result.status, 2);
    assert.equal(result.terminal.type, "failure");
    assert.equal(
      result.events.some((event) => event.type === "source"),
      false,
    );
  });

test("a complete check cannot be filtered through old file-selection options", () => {
  const result = cli(["check", "--files", "[]"]);
  assert.equal(result.status, 2);
  assert.equal(result.terminal.type, "failure");
  assert.equal(
    result.events.some((event) => event.type === "source"),
    false,
  );
});

test("a caller cannot redirect the fixed repository adapter root", () => {
  const result = cli(["check", "--root", "tooling/json"]);
  assert.equal(result.status, 2);
  assert.equal(result.terminal.type, "failure");
  assert.equal(
    result.events.some((event) => event.type === "source"),
    false,
  );
});
