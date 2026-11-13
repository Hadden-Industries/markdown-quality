// SPDX-License-Identifier: AGPL-3.0-only
/** Native npm reads with an explicit shared deadline and explicit absence semantics. */
import assert from "node:assert/strict";
import { npmCommand } from "./commands.js";
import { budgets } from "./qualification-budgets.js";
import { releasePackages } from "./release-coordinates.js";

/** A successful object/singleton-array response owns label absence; errors never silently do. */
export function readPackageTags(
  name,
  {
    deadline = performance.now() + budgets.read,
    now = () => performance.now(),
    command = npmCommand,
    allowAbsentPackage = false,
  } = {},
) {
  assert.ok(releasePackages.includes(name));
  const remaining = Math.floor(deadline - now());
  assert.ok(remaining > 0, "Release readback deadline exhausted");
  let raw;
  try {
    raw = command(
      [
        "view",
        name,
        "dist-tags",
        "--json",
        "--prefer-online",
        "--registry=https://registry.npmjs.org/",
        "--fetch-retries=0",
        `--fetch-timeout=${Math.min(remaining, budgets.read)}`,
      ],
      { timeout: Math.min(remaining, budgets.read) },
    );
  } catch (error) {
    let body;
    try {
      body = JSON.parse(error.stdout);
    } catch {
      /* Preserve the original provider failure. */
    }
    if (allowAbsentPackage && body?.error?.code === "E404") return {};
    throw error;
  }
  assert.ok(now() < deadline, "Release readback deadline exhausted");
  const parsed = JSON.parse(raw),
    records = Array.isArray(parsed) ? parsed : [parsed];
  assert.equal(records.length, 1, "Expected exactly one npm tag response");
  const tags = records[0];
  assert.ok(tags && typeof tags === "object" && !Array.isArray(tags));
  for (const value of Object.values(tags)) assert.equal(typeof value, "string");
  return tags;
}

/** All package reads consume the caller's one operation budget. */
export function readFamilyLabels(label, options = {}) {
  return Object.fromEntries(
    releasePackages.map((name) => [
      name,
      readPackageTags(name, options)[label] ?? null,
    ]),
  );
}
