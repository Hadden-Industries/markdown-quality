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
  const before = process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
  let metadata;
  try {
    process.env.MARKDOWN_QUALITY_CONSUMER_NPM = "missing-consumer-npm-cli.js";
    ({ metadata } = stageCore(repositoryRoot, core));
  } finally {
    if (before === undefined) delete process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
    else process.env.MARKDOWN_QUALITY_CONSUMER_NPM = before;
  }
  for (const name of ["prettier", "ajv", "dependency-cruiser"])
    assert.equal(existsSync(join(core, "node_modules", name)), false, name);
  assert.equal(
    JSON.parse(readFileSync(join(core, "node_modules/katex/package.json")))
      .version,
    "0.19.1",
  );
  assert.deepEqual(
    readFileSync(join(core, "package-lock.json")),
    readFileSync(join(repositoryRoot, "package-lock.json")),
  );
  assert.deepEqual(metadata.dependencies, producer.dependencies);
  assert.equal(
    JSON.parse(readFileSync(join(core, "node_modules/eslint/package.json")))
      .dependencies.minimatch,
    producer.overrides.minimatch,
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        join(core, "node_modules/@eslint/config-array/package.json"),
      ),
    ).dependencies.minimatch,
    producer.overrides.minimatch,
  );
  assert.equal(
    JSON.parse(readFileSync(join(core, "node_modules/minimatch/package.json")))
      .version,
    producer.overrides.minimatch,
  );
  assert.deepEqual(metadata.bundleDependencies, producer.bundleDependencies);
  assert.equal(metadata.overrides, undefined);
});
