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

/** Resolve concrete minimum/latest lanes using npm's native semver implementation. */
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
  const nodes = policy.minimums.flatMap((minimum) => {
    assert.ok(
      versions.includes(minimum),
      `Missing declared minimum ${minimum}`,
    );
    const latest = semver.maxSatisfying(versions, `^${minimum}`);
    assert.ok(latest, `No supported release for ${minimum}`);
    return latest === minimum ? [minimum] : [minimum, latest];
  });
  return { os: policy.platforms, node: nodes };
}

/** Exact provider job names for an immutable matrix, or the historical two-platform run. */
export function candidateJobNames(matrix, policy = nodeSupport) {
  if (!matrix)
    return ["pack", "consumer (windows-latest)", "consumer (ubuntu-24.04)"];
  assert.equal(policy.schemaVersion, 1);
  assert.ok(policy.minimums.includes(policy.reference));
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
