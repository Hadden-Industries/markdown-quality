// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  projectNodeSupport,
  nodeSupportProjectionPaths,
} from "../scripts/project-node-support.js";
import { nodeSupport } from "../scripts/node-matrix.js";
import { hostedNpmVersion } from "../scripts/publication-npm.js";

test("one policy edit projects engines and bootstrap pins while preserving dynamic selections and unrelated values", () => {
  const source = {
    "package.json": JSON.stringify({
      engines: { node: "old", npm: ">=12" },
      name: "sentinel",
    }),
    "package-lock.json": JSON.stringify({
      packages: {
        "": { engines: { node: "old" } },
        dependency: { engines: { node: "historical" } },
      },
    }),
    ".github/bootstrap-node.json": JSON.stringify({ version: "old" }),
    ".github/workflows/fixture.yml":
      'jobs:\n  build:\n    steps:\n      - with:\n          node-version: "24.21.0" # keep comment\n      - with:\n          node-version: ${{ matrix.node }}\n      - with:\n          node-version: ${{ steps.profile.outputs.node }}\n',
  };
  const changed = {
    ...nodeSupport,
    minimum: "22.14.1",
    reference: "24.8.4",
    compatibilityPins: ["22.15.0", "26.1.2"],
    producerNpm: { version: "14.7.3" },
  };
  const result = projectNodeSupport(source, changed);
  assert.deepEqual(JSON.parse(result["package.json"]), {
    engines: { node: ">=22.14.1", npm: ">=12" },
    name: "sentinel",
    packageManager: "npm@14.7.3",
    devEngines: {
      packageManager: {
        name: "npm",
        version: ">=14.7.3",
        onFail: "error",
      },
    },
  });
  const lock = JSON.parse(result["package-lock.json"]);
  assert.equal(lock.packages[""].engines.node, "old");
  assert.equal(lock.packages.dependency.engines.node, "historical");
  assert.equal(
    JSON.parse(result[".github/bootstrap-node.json"]).version,
    "24.8.4",
  );
  assert.equal(
    result[".github/workflows/fixture.yml"],
    source[".github/workflows/fixture.yml"].replace('"24.21.0"', '"24.8.4"'),
  );
  assert.deepEqual(projectNodeSupport(result, changed), result);
  assert.throws(() =>
    projectNodeSupport(source, { ...changed, reference: "28.1.0" }),
  );
});

test("all current runtime declarations and publisher npm follow their policy", () => {
  const paths = nodeSupportProjectionPaths();
  const source = Object.fromEntries(
    paths.map((path) => [
      path,
      readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
    ]),
  );
  assert.deepEqual(
    projectNodeSupport(source),
    source,
    "Run npm run sync:node after editing assets/node-support.json",
  );
  assert.equal(hostedNpmVersion, nodeSupport.producerNpm.version);
});
