// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stageCore } from "../scripts/core-package-stage.js";
import { repositoryRoot } from "../scripts/dependency-graph.js";
import { consumer } from "./helpers.js";

test("bundle acquisition installs only its declared closure while preserving recipient dependencies", (t) => {
  const core = join(consumer(t), "core");
  const producer = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json")),
  );
  const { metadata } = stageCore(repositoryRoot, core);
  for (const name of ["eslint", "prettier", "ajv", "dependency-cruiser"])
    assert.equal(existsSync(join(core, "node_modules", name)), false, name);
  assert.equal(
    JSON.parse(readFileSync(join(core, "node_modules/katex/package.json")))
      .version,
    "0.19.0",
  );
  assert.deepEqual(
    readFileSync(join(core, "package-lock.json")),
    readFileSync(join(repositoryRoot, "package-lock.json")),
  );
  assert.deepEqual(metadata.dependencies, producer.dependencies);
  assert.deepEqual(metadata.bundleDependencies, producer.bundleDependencies);
  assert.equal(metadata.overrides, undefined);
});
