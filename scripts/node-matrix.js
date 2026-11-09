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
const production = Object.entries(
  JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)))
    .packages,
).filter(([path, entry]) => path && !entry.dev);

// Older release manifests carry their original explicit development range.
export function producerNpmRange({ version, range = `>=${version}` }) {
  return range;
}

/** Installability is a floor; the explicit LTS policy owns qualification. */
export function validatePolicy(policy) {
  assert.equal(policy.schemaVersion, 2);
  assert.equal(semver.valid(policy.minimum), policy.minimum);
  assert.equal(semver.prerelease(policy.minimum), null);
  assert.ok(
    Array.isArray(policy.testedLtsMajors) && policy.testedLtsMajors.length > 0,
  );
  assert.equal(
    new Set(policy.testedLtsMajors).size,
    policy.testedLtsMajors.length,
  );
  assert.ok(Array.isArray(policy.preLtsMajors));
  assert.equal(new Set(policy.preLtsMajors).size, policy.preLtsMajors.length);
  assert.ok(
    policy.preLtsMajors.every((major) =>
      policy.testedLtsMajors.includes(major),
    ),
  );
  for (const major of policy.testedLtsMajors)
    assert.ok(
      Number.isSafeInteger(major) && major >= semver.major(policy.minimum),
    );
  assert.equal(policy.support?.otherEngineCompatibleReleases, "best-effort");
  for (const version of [policy.minimum, policy.reference]) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
    for (const [path, entry] of production)
      assert.ok(
        !entry.engines?.node || semver.satisfies(version, entry.engines.node),
        `${path} does not support ${version}`,
      );
  }
  assert.equal(semver.valid(policy.reference), policy.reference);
  assert.equal(semver.prerelease(policy.reference), null);
  assert.ok(
    semver.gte(policy.reference, policy.minimum) &&
      policy.testedLtsMajors.includes(semver.major(policy.reference)),
    "Reference is outside qualified LTS policy",
  );
  for (const version of [policy.consumerNpm, policy.producerNpm?.version]) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
  }
  assert.ok(
    semver.satisfies(
      policy.producerNpm.version,
      producerNpmRange(policy.producerNpm),
    ),
  );
  assert.ok(Array.isArray(policy.platforms) && policy.platforms.length > 0);
  assert.equal(new Set(policy.platforms).size, policy.platforms.length);
  assert.ok(
    policy.platforms.every(
      (platform) =>
        typeof platform === "string" && /^[a-z]+-[a-z0-9.]+$/u.test(platform),
    ),
  );
  return policy;
}

/** Freeze the one floor and latest qualified LTS patches; never infer LTS by parity. */
export function qualificationMatrix(releases, policy = nodeSupport) {
  validatePolicy(policy);
  assert.ok(
    Array.isArray(releases) && releases.length > 0 && releases.length <= 10000,
  );
  const versions = releases
    .map((release) => {
      assert.ok(
        typeof release?.version === "string" && release.version.startsWith("v"),
      );
      assert.equal(
        semver.valid(release.version),
        release.version.slice(1),
        "Invalid official release version",
      );
      return release.version.slice(1);
    })
    .filter((version) => semver.prerelease(version) === null);
  assert.ok(versions.includes(policy.reference), "Missing reference release");
  assert.ok(versions.includes(policy.minimum), "Missing minimum release");
  const nodes = policy.testedLtsMajors.map((major) => {
    const qualified = releases
      .filter(
        (release) =>
          (release.lts || policy.preLtsMajors.includes(major)) &&
          semver.prerelease(release.version) === null &&
          semver.major(release.version) === major,
      )
      .map((release) => release.version.slice(1));
    const latest = semver.maxSatisfying(
      qualified,
      `>=${major}.0.0 <${major + 1}.0.0`,
    );
    assert.ok(latest);
    return latest;
  });
  return {
    os: policy.platforms,
    node: [...new Set([policy.minimum, ...nodes, policy.reference])].sort(
      semver.compare,
    ),
  };
}

export async function resolveQualificationMatrix() {
  const response = await fetch("https://nodejs.org/dist/index.json", {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert.ok(size <= 1048576, "Node metadata exceeds its bound");
    chunks.push(chunk);
  }
  return qualificationMatrix(JSON.parse(Buffer.concat(chunks)));
}
/** Admit an immutable lane set without resolving moving release metadata. */
export function validateFrozenMatrix(matrix, policy = nodeSupport) {
  validatePolicy(policy);
  assert.deepEqual(Object.keys(matrix).sort(), ["node", "os"]);
  assert.deepEqual(matrix.os, policy.platforms);
  assert.ok(
    Array.isArray(matrix.node) &&
      matrix.node.length > 0 &&
      matrix.node.length <= 12,
  );
  assert.ok(
    matrix.node.length <= policy.testedLtsMajors.length + 2,
    "Extra runtime lanes outside floor/latest/reference policy",
  );
  assert.deepEqual(matrix.node, [...new Set(matrix.node)].sort(semver.compare));
  for (const version of matrix.node) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
    assert.ok(
      semver.gte(version, policy.minimum) &&
        policy.testedLtsMajors.includes(semver.major(version)),
    );
  }
  assert.ok(
    matrix.node.includes(policy.minimum) &&
      matrix.node.includes(policy.reference),
  );
  for (const major of policy.testedLtsMajors)
    assert.ok(matrix.node.some((v) => semver.major(v) === major));
  return matrix;
}
export function candidateJobNames(matrix, policy = nodeSupport) {
  validateFrozenMatrix(matrix, policy);
  return [
    "Reference producer",
    ...matrix.os.flatMap((os) =>
      matrix.node.map((node) => "Qualify " + os + " / Node " + node),
    ),
    "Complete runtime qualification",
  ];
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length <= 3);
  if (process.argv[2] === "--reference") console.log(nodeSupport.reference);
  else if (process.argv[2] === "--frozen")
    console.log(
      JSON.stringify(
        validateFrozenMatrix(JSON.parse(process.env.QUALIFICATION_MATRIX)),
      ),
    );
  else {
    assert.equal(process.argv.length, 2);
    console.log(JSON.stringify(await resolveQualificationMatrix()));
  }
}
