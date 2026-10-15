// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { npmCliPath } from "./commands.js";
const semver = createRequire(npmCliPath())("semver");
export const nodeSupport = JSON.parse(
  readFileSync(new URL("../assets/node-support.json", import.meta.url), "utf8"),
);

// Consumer minima and the pinned tooling/performance reference are independent.
function validatePolicy(policy) {
  assert.equal(policy.schemaVersion, 1);
  assert.ok(Array.isArray(policy.minimums) && policy.minimums.length > 0);
  const families = new Set();
  for (const minimum of policy.minimums) {
    assert.equal(semver.valid(minimum), minimum);
    assert.equal(semver.prerelease(minimum), null);
    const family = semver.major(minimum);
    assert.ok(!families.has(family), "Duplicate Node family minimum");
    families.add(family);
  }
  assert.equal(semver.valid(policy.reference), policy.reference);
  assert.equal(semver.prerelease(policy.reference), null);
  assert.ok(
    policy.minimums.some((minimum) =>
      semver.satisfies(policy.reference, `^${minimum}`),
    ),
    "Missing admitted Node reference",
  );
}

/** Resolve minimum/latest/reference lanes using npm's native semver implementation. */
export function qualificationMatrix(releases, policy = nodeSupport) {
  assert.ok(
    Array.isArray(releases) && releases.length > 0 && releases.length <= 10000,
  );
  const versions = releases.map((release) => {
    assert.ok(
      typeof release?.version === "string" &&
        /^v\d+\.\d+\.\d+$/u.test(release.version),
    );
    const version = semver.valid(release.version);
    assert.ok(version);
    return version;
  });
  validatePolicy(policy);
  assert.ok(
    versions.includes(policy.reference),
    `Missing declared reference ${policy.reference}`,
  );
  const nodes = policy.minimums.flatMap((minimum) => {
    assert.ok(
      versions.includes(minimum),
      `Missing declared minimum ${minimum}`,
    );
    const latest = semver.maxSatisfying(versions, `^${minimum}`);
    assert.ok(latest, `No supported release for ${minimum}`);
    return [
      ...new Set([
        minimum,
        latest,
        ...(semver.satisfies(policy.reference, `^${minimum}`)
          ? [policy.reference]
          : []),
      ]),
    ].sort(semver.compare);
  });
  return { os: policy.platforms, node: nodes };
}

/** Exact provider job names for an immutable matrix, or the historical two-platform run. */
export function candidateJobNames(matrix, policy = nodeSupport) {
  if (!matrix)
    return ["pack", "consumer (windows-latest)", "consumer (ubuntu-24.04)"];
  assert.deepEqual(
    matrix,
    qualificationMatrix(
      matrix.node.map((version) => ({ version: `v${version}` })),
      policy,
    ),
  );
  return [
    "pack",
    ...matrix.os.flatMap((os) =>
      matrix.node.map((node) =>
        node === policy.reference
          ? `consumer (${os})`
          : `consumer (${os}, ${node})`,
      ),
    ),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--reference") {
    assert.equal(process.argv.length, 3);
    validatePolicy(nodeSupport);
    console.log(nodeSupport.reference);
  } else {
    assert.equal(process.argv.length, 2);
    // Fetch release metadata only; no returned URL or script is executed.
    const response = await fetch("https://nodejs.org/dist/index.json", {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200);
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      assert.ok(bytes <= 1048576, "Node release metadata exceeds its bound");
      chunks.push(chunk);
    }
    console.log(
      JSON.stringify(qualificationMatrix(JSON.parse(Buffer.concat(chunks)))),
    );
  }
}
