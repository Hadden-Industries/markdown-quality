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
  entrypointInventory,
  analyzerIdentity,
} from "../scripts/dependency-graph.js";
import { impactFixture } from "./dependency-impact-helpers.js";

test("focused reports retain literal two-hop dependents, native metrics and mixed entrypoint advice", async (t) => {
  const fixture = impactFixture(
    t,
    {
      "src/literal [é].js": "export const value = 1;",
      "src/neighbor.js": "export {value} from './literal [é].js';",
      "src/entry.js": "import './neighbor.js';",
      "src/qualify.js": "export {};",
      "src/worker.js": "export {};",
      "schemas/result.json": "{}",
      "assets/observe.py": "pass\n",
    },
    [
      {
        id: "worker",
        kind: "worker-url",
        dependency: "src/worker.js",
        consumer: "src/entry.js",
        evidence: "Fixture worker root",
        fixture: "this test",
      },
    ],
  );
  fixture.put(
    "package.json",
    JSON.stringify({
      name: "graph-fixture",
      type: "module",
      bin: { one: "src/entry.js", two: "src/qualify.js" },
      exports: {
        ".": "./src/entry.js",
        "./schema": "./schemas/result.json",
        "./observer": "./assets/observe.py",
      },
    }),
  );
  const outside = impactFixture(t);
  const output = join(outside.root, "bundle");
  await writeBundle(fixture.root, output, { focus: "src/literal [é].js" });
  const dependents = JSON.parse(readFileSync(join(output, "dependents.json")));
  for (const path of ["src/literal [é].js", "src/neighbor.js", "src/entry.js"])
    assert.ok(
      dependents.modules.some(({ source }) => source === path),
      path,
    );
  assert.equal(
    dependents.modules.some(({ source }) => source === "src/qualify.js"),
    false,
  );
  const advice = JSON.parse(readFileSync(join(output, "entrypoints.json")));
  assert.deepEqual(advice.javascript, [
    "src/entry.js",
    "src/qualify.js",
    "src/worker.js",
  ]);
  assert.deepEqual(advice.resources, [
    "assets/observe.py",
    "schemas/result.json",
  ]);
  assert.ok(advice.findings.some((finding) => finding.from === "src/leaf.js"));
  assert.ok(readFileSync(join(output, "metrics.txt"), "utf8").length > 0);
  const provenance = JSON.parse(readFileSync(join(output, "provenance.json")));
  assert.equal(provenance.tool, analyzerIdentity());
  for (const focus of ["src/missing.js", "../outside.js", "-option.js"])
    await assert.rejects(
      writeBundle(fixture.root, join(outside.root, "invalid"), { focus }),
    );
  fixture.put(
    "package.json",
    JSON.stringify({ exports: { ".": { node: "./src/entry.js" } } }),
  );
  assert.throws(() => entrypointInventory(fixture.root), /entrypoint shape/u);
});

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
