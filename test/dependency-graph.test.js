// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join, relative } from "node:path";
import {
  captureGraph,
  nativeReach,
  readOwned,
  safePath,
  writeBundle,
} from "../scripts/dependency-graph.js";
import { impactFixture } from "./dependency-impact-helpers.js";

test("external output link is rejected before creating missing checkout descendants", async (t) => {
  const inside = impactFixture(t),
    outside = impactFixture(t);
  symlinkSync(
    inside.root,
    join(outside.root, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    writeBundle(
      inside.root,
      join(outside.root, "linked", "must-not-exist", "bundle"),
    ),
    /link points into/u,
  );
  assert.equal(existsSync(join(inside.root, "must-not-exist")), false);
});

test("native graph captures standalone roots, re-exports, literal dynamic imports and external edges", async (t) => {
  const fixture = impactFixture(t, {
    "scripts/standalone.cjs": "require('node:fs');",
    "src/literal.js": "export const load = () => import('./leaf.js');",
  });
  const graph = captureGraph(fixture.root);
  assert.ok(
    graph.modules.some((module) => module.source === "scripts/standalone.cjs"),
  );
  const reach = await nativeReach(graph, ["src/leaf.js"]);
  for (const path of ["src/barrel.mjs", "src/literal.js", "test/leaf.test.js"])
    assert.ok(
      reach.modules.some((module) => module.source === path),
      path,
    );
  assert.ok(
    graph.modules
      .find((module) => module.source === "scripts/standalone.cjs")
      .dependencies.some((edge) => edge.resolved === "fs" && edge.coreModule),
  );
  assert.equal(
    reach.modules.some((module) => module.source === "test/unrelated.test.js"),
    false,
  );
});

test("native resolver rejects local imports escaping the source root", (t) => {
  const inside = impactFixture(t),
    outside = impactFixture(t);
  outside.put(
    "src/secret.js",
    "deliberately invalid source that must never be parsed",
  );
  const path = relative(
    join(inside.root, "src"),
    join(outside.root, "src/secret.js"),
  ).replaceAll("\\", "/");
  inside.put("src/escape.js", `import ${JSON.stringify(path)};`);
  const graph = captureGraph(inside.root);
  assert.ok(
    graph.summary.violations.some(
      (finding) => finding.rule.name === "unresolved",
    ),
  );
});

test("analysis never discovers executable dependency/Babel/Webpack configuration", (t) => {
  const fixture = impactFixture(t);
  for (const path of [
    ".dependency-cruiser.cjs",
    "babel.config.cjs",
    "webpack.config.cjs",
  ])
    fixture.put(
      path,
      "require('node:fs').writeFileSync('CONFIG-EXECUTED', 'bad'); throw Error('executed');",
    );
  captureGraph(fixture.root);
  assert.equal(existsSync(join(fixture.root, "CONFIG-EXECUTED")), false);
});

test("native rule validation detects unresolved, runtime-to-test and dev dependency violations", (t) => {
  const fixture = impactFixture(t, {
    "src/bad.js":
      "import './missing.js'; import '../test/leaf.test.js'; import 'dependency-cruiser';",
  });
  const graph = captureGraph(fixture.root);
  const errors = graph.summary.violations
    .filter((violation) => violation.rule.severity === "error")
    .map((violation) => violation.rule.name);
  for (const name of [
    "unresolved",
    "runtime-to-development",
    "runtime-to-dev-dependency",
  ])
    assert.ok(errors.includes(name), `${name}: ${errors}`);
});

test("native format rejects malformed captured graph; path metacharacters remain literal", async (t) => {
  await assert.rejects(
    nativeReach({ modules: [] }, ["src/leaf.js"]),
    /not valid/u,
  );
  const fixture = impactFixture(t, {
    "src/a+b[1].js": "export const value = 2;",
    "test/punctuation.test.js": "import '../src/a+b[1].js';",
  });
  const reach = await nativeReach(captureGraph(fixture.root), [
    "src/a+b[1].js",
  ]);
  assert.ok(
    reach.modules.some(
      (module) => module.source === "test/punctuation.test.js",
    ),
  );
  assert.equal(
    reach.modules.some((module) => module.source === "test/leaf.test.js"),
    false,
  );
});

test("unsafe paths, invalid native options and executable config extensions cannot enter analysis", (t) => {
  for (const path of [
    "../escape",
    "-option.js",
    "C:/escape.js",
    "src/../leaf.js",
    "src\\leaf.js",
    "a\nfile.js",
  ])
    assert.throws(() => safePath(path));
  const fixture = impactFixture(t);
  const config = JSON.parse(
    readFileSync(join(fixture.root, ".dependency-cruiser.json")),
  );
  config.extends = "./evil.cjs";
  fixture.put(".dependency-cruiser.json", JSON.stringify(config));
  assert.throws(
    () => captureGraph(fixture.root, fixture.root),
    /Unsupported graph configuration/u,
  );
  assert.throws(() => readOwned(fixture.root, "../package.json"));
});
