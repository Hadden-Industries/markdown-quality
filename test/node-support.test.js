// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { npmCliPath } from "../scripts/commands.js";
import { nodeSupport, qualificationMatrix } from "../scripts/node-matrix.js";
const semver = createRequire(npmCliPath())("semver");

const releases = [
  { version: "v28.0.0" },
  { version: "v26.13.0" },
  { version: "v26.12.0" },
  { version: "v26.0.0" },
  { version: "v24.22.0" },
  { version: "v24.21.0" },
  { version: "v24.2.0" },
  { version: "v22.24.0" },
  { version: "v22.23.3" },
  { version: "v22.17.0" },
];
test("qualification covers supported minima and newer patches without a future-major claim", () => {
  assert.deepEqual(qualificationMatrix(releases), {
    os: ["windows-latest", "ubuntu-24.04"],
    node: [
      "22.17.0",
      "22.24.0",
      "24.2.0",
      "24.21.0",
      "24.22.0",
      "26.0.0",
      "26.13.0",
    ],
  });
});
test("minimum/latest equality deduplicates each major while retaining the separate reference", () => {
  const policy = { ...nodeSupport, reference: "24.2.0" };
  assert.deepEqual(
    qualificationMatrix(
      policy.minimums.map((version) => ({ version: `v${version}` })),
      policy,
    ).node,
    ["22.17.0", "24.2.0", "26.0.0"],
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
    ...nodeSupport,
    minimums: ["22.17.0", "24.2.0", "26.0.0"],
    reference: "24.21.0",
  };
  const metadata = [
    "22.17.0",
    "22.23.3",
    "24.2.0",
    "24.21.0",
    "24.22.0",
    "26.0.0",
    "26.12.0",
  ].map((version) => ({ version: `v${version}` }));
  assert.deepEqual(qualificationMatrix(metadata, policy).node, [
    "22.17.0",
    "22.23.3",
    "24.2.0",
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
  for (const version of [
    "22.12.0",
    "22.16.0",
    "24.1.0",
    "24.2.0-rc.1",
    "26.0.0-rc.1",
    "23.11.0",
    "25.9.0",
  ])
    assert.equal(semver.satisfies(version, range), false, version);
  assert.equal(semver.satisfies("28.0.0", range), false);
  for (const version of [
    "22.17.1",
    "22.23.3",
    "24.2.1",
    "24.21.0",
    "26.0.1",
    "26.12.0",
  ])
    assert.ok(semver.satisfies(version, range), version);
});
