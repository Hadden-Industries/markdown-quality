// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { npmCliPath } from "../scripts/commands.js";
import {
  nodeSupport,
  qualificationMatrix as resolveMatrix,
} from "../scripts/node-matrix.js";
const semver = createRequire(npmCliPath())("semver");
// Fixed synthetic release history tests selection independently of future policy edits.
const syntheticPolicy = {
  ...nodeSupport,
  minimums: ["22.13.0", "24.0.0", "26.0.0"],
  reference: "24.21.0",
};
const qualificationMatrix = (releases, policy = syntheticPolicy) =>
  resolveMatrix(releases, policy);

const releases = [
  { version: "v28.0.0" },
  { version: "v26.13.0" },
  { version: "v26.12.0" },
  { version: "v26.0.0" },
  { version: "v24.22.0" },
  { version: "v24.21.0" },
  { version: "v24.0.0" },
  { version: "v22.24.0" },
  { version: "v22.23.3" },
  { version: "v22.13.0" },
];
test("qualification covers supported minima and newer patches without a future-major claim", () => {
  assert.deepEqual(qualificationMatrix(releases), {
    os: ["windows-latest", "ubuntu-24.04"],
    node: [
      "22.13.0",
      "22.24.0",
      "24.0.0",
      "24.21.0",
      "24.22.0",
      "26.0.0",
      "26.13.0",
    ],
  });
});
test("minimum/latest equality deduplicates each major while retaining the separate reference", () => {
  const policy = { ...syntheticPolicy, reference: "24.0.0" };
  assert.deepEqual(
    qualificationMatrix(
      policy.minimums.map((version) => ({ version: `v${version}` })),
      policy,
    ).node,
    ["22.13.0", "24.0.0", "26.0.0"],
  );
});
test("unordered official metadata selects the newest release with native semver", () => {
  assert.deepEqual(
    qualificationMatrix([...releases].reverse()),
    qualificationMatrix(releases),
  );
});
test("incomplete or invalid release metadata cannot produce successful partial qualification", () => {
  for (const data of [
    [],
    {},
    releases.filter((r) => !r.version.startsWith("v22.")),
    [...releases, { version: "v26.13.0-rc.1" }],
    [...releases, { version: "26.13.0; invalid" }],
  ]) {
    assert.throws(() => qualificationMatrix(data));
  }
});
test("reference runtime remains qualified when it is neither a minimum nor latest", () => {
  const policy = {
    ...syntheticPolicy,
    minimums: ["22.13.0", "24.0.0", "26.0.0"],
    reference: "24.21.0",
  };
  const metadata = [
    "22.13.0",
    "22.23.3",
    "24.0.0",
    "24.21.0",
    "24.22.0",
    "26.0.0",
    "26.12.0",
  ].map((version) => ({ version: `v${version}` }));
  assert.deepEqual(qualificationMatrix(metadata, policy).node, [
    "22.13.0",
    "22.23.3",
    "24.0.0",
    "24.21.0",
    "24.22.0",
    "26.0.0",
    "26.12.0",
  ]);
  assert.throws(() =>
    qualificationMatrix(
      metadata.filter((release) => release.version !== "v24.21.0"),
      policy,
    ),
  );
  for (const reference of ["22.12.0", "25.0.0", "28.0.0", "24.21.0-rc.1"])
    assert.throws(() =>
      qualificationMatrix(metadata, { ...policy, reference }),
    );
});
test("consumer minima satisfy the production graph while the tooling reference satisfies development engines", () => {
  const metadata = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url)),
  );
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url)),
  );
  const range = metadata.engines.node;
  assert.equal(lock.packages[""].engines.node, range);
  assert.equal(
    range,
    nodeSupport.minimums.map((minimum) => `^${minimum}`).join(" || "),
  );
  for (const minimum of nodeSupport.minimums) {
    assert.ok(semver.satisfies(minimum, range), `Core rejects ${minimum}`);
    for (const [path, dependency] of Object.entries(lock.packages)) {
      if (!dependency.dev && dependency.engines?.node)
        assert.ok(
          semver.satisfies(minimum, dependency.engines.node),
          `${path} rejects ${minimum}`,
        );
    }
  }
  for (const [path, dependency] of Object.entries(lock.packages))
    if (dependency.engines?.node)
      assert.ok(
        semver.satisfies(nodeSupport.reference, dependency.engines.node),
        `${path} rejects tooling reference`,
      );
  for (const minimum of nodeSupport.minimums) {
    assert.equal(semver.satisfies(`${minimum}-rc.1`, range), false);
    assert.equal(semver.satisfies(semver.inc(minimum, "major"), range), false);
    assert.ok(semver.satisfies(semver.inc(minimum, "patch"), range));
    const { major, minor, patch } = semver.parse(minimum);
    if (minor || patch) {
      const below = patch
        ? `${major}.${minor}.${patch - 1}`
        : `${major}.${minor - 1}.999`;
      assert.equal(semver.satisfies(below, range), false);
    }
  }
});
