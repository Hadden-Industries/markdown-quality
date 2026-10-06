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
  { version: "v26.11.0" },
  { version: "v26.10.0" },
  { version: "v24.22.0" },
  { version: "v24.21.0" },
  { version: "v22.24.0" },
  { version: "v22.23.3" },
];
test("qualification covers supported minima and newer patches without a future-major claim", () => {
  assert.deepEqual(qualificationMatrix(releases), {
    os: ["windows-latest", "ubuntu-24.04"],
    node: ["22.23.3", "22.24.0", "24.21.0", "24.22.0", "26.10.0", "26.11.0"],
  });
});
test("minimum/latest equality produces only one lane per major", () => {
  assert.deepEqual(
    qualificationMatrix(
      releases.filter(
        (r) => !["v22.24.0", "v24.22.0", "v26.11.0"].includes(r.version),
      ),
    ).node,
    ["22.23.3", "24.21.0", "26.10.0"],
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
    [...releases, { version: "v26.12.0-rc.1" }],
    [...releases, { version: "26.12.0; invalid" }],
  ]) {
    assert.throws(() => qualificationMatrix(data));
  }
});
test("declared minima satisfy package, lock and every locked dependency engine", () => {
  const metadata = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url)),
  );
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url)),
  );
  const range = metadata.engines.node;
  assert.equal(lock.packages[""].engines.node, range);
  assert.ok(nodeSupport.minimums.includes(nodeSupport.reference));
  for (const minimum of nodeSupport.minimums) {
    assert.ok(semver.satisfies(minimum, range), `Core rejects ${minimum}`);
    for (const [path, dependency] of Object.entries(lock.packages)) {
      if (dependency.engines?.node)
        assert.ok(
          semver.satisfies(minimum, dependency.engines.node),
          `${path} rejects ${minimum}`,
        );
    }
  }
  for (const version of ["22.23.2", "24.20.0", "26.9.0", "23.11.0", "25.9.0"])
    assert.equal(semver.satisfies(version, range), false, version);
  assert.equal(semver.satisfies("28.0.0", range), true);
});
