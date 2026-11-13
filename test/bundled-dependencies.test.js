// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stageCore } from "../scripts/core-package-stage.js";
import {
  bundleInventoryPath,
  stageBundledDependencies,
} from "../scripts/bundled-dependencies.js";
import { repositoryRoot } from "../scripts/dependency-graph.js";
import { consumer } from "./helpers.js";

test("bundle acquisition preserves the frozen graph and ships only the declared closure", (t) => {
  const core = join(consumer(t), "core");
  const manifestBefore = readFileSync(join(repositoryRoot, "package.json"));
  const lockBefore = readFileSync(join(repositoryRoot, "package-lock.json"));
  const producer = JSON.parse(manifestBefore);
  const before = process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
  let metadata;
  try {
    process.env.MARKDOWN_QUALITY_CONSUMER_NPM = "missing-consumer-npm-cli.js";
    ({ metadata } = stageCore(repositoryRoot, core));
  } finally {
    if (before === undefined) delete process.env.MARKDOWN_QUALITY_CONSUMER_NPM;
    else process.env.MARKDOWN_QUALITY_CONSUMER_NPM = before;
  }
  const inventory = JSON.parse(readFileSync(join(core, bundleInventoryPath)));
  for (const name of [
    "prettier",
    "ajv",
    "dependency-cruiser",
    "fast-xml-parser",
  ])
    assert.ok(
      inventory.files.every(
        ({ path }) => !path.startsWith(`node_modules/${name}/`),
      ),
      `${name} must not be bundled`,
    );
  assert.equal(
    existsSync(join(core, "node_modules/dependency-cruiser")),
    false,
  );
  assert.equal(
    JSON.parse(readFileSync(join(core, "node_modules/katex/package.json")))
      .version,
    producer.overrides["micromark-extension-math"].katex,
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
  assert.deepEqual(
    readFileSync(join(repositoryRoot, "package.json")),
    manifestBefore,
  );
  assert.deepEqual(
    readFileSync(join(repositoryRoot, "package-lock.json")),
    lockBefore,
  );
});

test("bundle acquisition refuses an incomplete development lock even when development packages are omitted", (t) => {
  const root = consumer(t),
    core = join(root, "core");
  mkdirSync(core);
  const manifestBytes = readFileSync(join(repositoryRoot, "package.json"));
  const metadata = JSON.parse(manifestBytes);
  const lock = JSON.parse(
    readFileSync(join(repositoryRoot, "package-lock.json")),
  );
  assert.ok(metadata.devDependencies.yaml);
  assert.equal(lock.packages["node_modules/yaml"].dev, true);
  const missingVersion = lock.packages["node_modules/yaml"].version;
  delete lock.packages["node_modules/yaml"];
  // json-identity-contract: bytes; owner: bundle acquisition regression; reason: Assert that native rejection preserves the exact malformed fixture lock bytes.
  const lockBytes = Buffer.from(JSON.stringify(lock) + "\n");
  writeFileSync(join(root, "package.json"), manifestBytes);
  writeFileSync(join(root, "package-lock.json"), lockBytes);
  assert.throws(
    () => stageBundledDependencies(root, core, metadata),
    (error) =>
      /npm ci failed/u.test(error.message) &&
      error.stderr.includes(`Missing: yaml@${missingVersion} from lock file`),
  );
  assert.equal(existsSync(join(core, bundleInventoryPath)), false);
  assert.deepEqual(readFileSync(join(root, "package.json")), manifestBytes);
  assert.deepEqual(readFileSync(join(root, "package-lock.json")), lockBytes);
});
