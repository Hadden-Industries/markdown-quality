// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { captureGraph } from "../scripts/dependency-graph.js";
import { impactFixture } from "./dependency-impact-helpers.js";
import { checkArchitecture, shipmentErrors } from "../scripts/architecture.js";
import { stageCore } from "../scripts/core-package-stage.js";
import {
  repositoryRoot,
  analyzerIdentity,
} from "../scripts/dependency-graph.js";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

test("the actual repository satisfies architecture and shipped closure", () => {
  const result = checkArchitecture();
  assert.ok(result.runtime.includes("src/quality.js"));
  assert.ok(result.runtime.includes("src/document-worker.js"));
  assert.ok(
    result.files.some(({ path }) => path === "schemas/result.schema.json"),
  );
  assert.equal(
    result.files.some(({ path }) => path.startsWith("scripts/")),
    false,
  );
  assert.match(analyzerIdentity(), /^dependency-cruiser@18\.7\.0$/u);
});

function packageFixture(t, files = {}) {
  const fixture = impactFixture(t, files);
  fixture.put(
    "package.json",
    JSON.stringify({
      name: "architecture-fixture",
      version: "1.0.0",
      type: "module",
      files: ["src", "assets"],
      exports: { ".": "./src/leaf.js" },
      devDependencies: { "dependency-cruiser": ">=18.7.0" },
    }),
  );
  fixture.put("assets/tool-manifest.json", '{"platforms":{}}');
  return fixture;
}

test("candidate assertion rejects a real error instead of selector-style full fallback", (t) => {
  const fixture = packageFixture(t, {
    "src/leaf.js": "import './missing.js';",
  });
  assert.throws(() => checkArchitecture(fixture.root), /unresolved/u);
});

test("architecture diagnostics preserve the native indirect violating path", (t) => {
  const fixture = packageFixture(t, {
    "src/contracts.js": "import './middle.js';",
    "src/middle.js": "import './quality.js';",
    "src/quality.js": "export {};",
  });
  assert.throws(() => checkArchitecture(fixture.root), /src\/middle\.js/u);
});

test("an exported but absent package member cannot disappear from architecture proof", (t) => {
  const fixture = packageFixture(t);
  const metadata = JSON.parse(readFileSync(join(fixture.root, "package.json")));
  metadata.exports["./missing"] = "./src/missing.js";
  fixture.put("package.json", JSON.stringify(metadata));
  assert.throws(
    () => checkArchitecture(fixture.root),
    /Unshipped entrypoint: src\/missing.js/u,
  );
});

test("shipped JavaScript outside the captured authored roots fails explicitly", (t) => {
  const fixture = packageFixture(t, { "assets/disconnected.js": "export {};" });
  assert.throws(
    () => checkArchitecture(fixture.root),
    /Missing runtime graph root: assets\/disconnected.js/u,
  );
});

test("a foreign native npm package result cannot qualify this candidate", (t) => {
  const fixture = packageFixture(t);
  const original = childProcess.spawnSync;
  // Only the genuine external npm response is replaced; graph and membership
  // semantics retain their real implementations and independent fixtures.
  childProcess.spawnSync = (executable, argv, options) =>
    argv.includes("--dry-run")
      ? {
          status: 0,
          stdout: '[{"name":"foreign-package","version":"1.0.0","files":[]}]',
          stderr: "",
        }
      : original(executable, argv, options);
  syncBuiltinESMExports();
  try {
    assert.throws(
      () => checkArchitecture(fixture.root),
      /Wrong core package inventory/u,
    );
  } finally {
    childProcess.spawnSync = original;
    syncBuiltinESMExports();
  }
});

test("source-resolvable imports to npm-omitted members fail for disconnected runtime roots", (t) => {
  const fixture = packageFixture(t, {
    "src/disconnected.js": "import './omitted.js';",
    "src/omitted.js": "export const hidden = 1;",
    "src/.npmignore": "omitted.js\n",
  });
  assert.throws(
    () => checkArchitecture(fixture.root),
    /Unshipped dependency: src\/disconnected.js -> src\/omitted.js/u,
  );
});

test("staging preserves metadata transformation and source bytes; corrupt shipment data fails", (t) => {
  const fixture = packageFixture(t);
  const stage = mkdtempSync(join(tmpdir(), "mq-stage-proof-"));
  t.after(() => rmSync(stage, { recursive: true, force: true }));
  const core = join(stage, "core");
  const { metadata, sourceIdentity } = stageCore(fixture.root, core);
  assert.equal(metadata.scripts, undefined);
  assert.deepEqual(metadata.optionalDependencies, {});
  assert.equal(sourceIdentity.head, fixture.base);
  assert.equal(
    sourceIdentity.lockSha256,
    "ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356",
  );
  assert.equal(
    readFileSync(join(core, "src/leaf.js"), "utf8"),
    "export const value = 1;\n",
  );
  const result = checkArchitecture(fixture.root);
  const graph = captureGraph(fixture.root);
  assert.throws(
    () =>
      shipmentErrors(
        fixture.root,
        core,
        [...result.files, result.files[0]],
        graph,
        metadata,
      ),
    /Ambiguous/u,
  );
  assert.throws(
    () =>
      shipmentErrors(
        fixture.root,
        core,
        result.files.map((file, index) =>
          index ? file : { ...file, size: file.size + 1 },
        ),
        graph,
        metadata,
      ),
    /Shipment size mismatch/u,
  );
  writeFileSync(join(core, "src/leaf.js"), "export const value = 2;\n");
  assert.ok(
    shipmentErrors(
      fixture.root,
      core,
      result.files,
      graph,
      metadata,
    ).errors.some((error) => error.includes("Source/stage mismatch")),
  );
});

for (const [name, files, rule] of [
  [
    "foundation two-hop",
    {
      "src/contracts.js": "import './middle.js';",
      "src/middle.js": "import './quality.js';",
      "src/quality.js": "export {};",
    },
    "foundations-stay-independent",
  ],
  [
    "shared tooling two-hop",
    {
      "scripts/commands.js": "import './middle.js';",
      "scripts/middle.js": "import './pack.js';",
      "scripts/pack.js": "export {};",
    },
    "shared-tooling-stays-independent",
  ],
  [
    "undeclared runtime",
    { "src/unowned.js": "import 'acorn';" },
    "runtime-undeclared-package",
  ],
  [
    "undeclared tooling",
    { "scripts/unowned.js": "import 'acorn';" },
    "tooling-undeclared-package",
  ],
  [
    "indirect overlapping cycle",
    {
      "src/a.js": "import './b.js';",
      "src/b.js": "import './c.js'; import './a.js';",
      "src/c.js": "import './a.js';",
    },
    "runtime-cycles",
  ],
])
  test(`${name} is rejected by native policy`, (t) => {
    const fixture = impactFixture(t, files);
    assert.ok(
      captureGraph(fixture.root).summary.violations.some(
        (v) => v.rule.name === rule && v.rule.severity === "error",
      ),
    );
  });

test("valid caller-to-foundation direction and acyclic diamond stay allowed", (t) => {
  const fixture = impactFixture(t, {
    "src/contracts.js": "export const n = 1;",
    "src/preset.js": "export {};",
    "src/quality.js":
      "import './contracts.js'; import './left.js'; import './right.js';",
    "src/left.js": "import './preset.js';",
    "src/right.js": "import './preset.js';",
  });
  assert.deepEqual(captureGraph(fixture.root).summary.violations, []);
});

for (const origin of [
  "contracts",
  "preset",
  "document-analysis-pool",
  "native-tool",
])
  test(`foundation ${origin} rejects an indirect orchestration dependency`, (t) => {
    const fixture = impactFixture(t, {
      [`src/${origin}.js`]: "import './middle.js';",
      "src/middle.js": "import './execution.js';",
      "src/execution.js": "export {};",
    });
    assert.ok(
      captureGraph(fixture.root).summary.violations.some(
        (v) => v.rule.name === "foundations-stay-independent",
      ),
    );
  });
for (const origin of ["commands", "node-matrix", "python-target", "ci-reuse"])
  test(`shared tooling ${origin} rejects an indirect command dependency`, (t) => {
    const fixture = impactFixture(t, {
      [`scripts/${origin}.js`]: "import './middle.js';",
      "scripts/middle.js": "import './ci-reuse-command.js';",
      "scripts/ci-reuse-command.js": "export {};",
    });
    assert.ok(
      captureGraph(fixture.root).summary.violations.some(
        (v) => v.rule.name === "shared-tooling-stays-independent",
      ),
    );
  });

test("core staging rejects a linked source before copy", (t) => {
  const fixture = packageFixture(t);
  const outside = impactFixture(t);
  symlinkSync(
    join(outside.root, "src"),
    join(fixture.root, "src/linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () => stageCore(fixture.root, join(outside.root, "core")),
    /Linked/u,
  );
});

test("runtime import cycles fail architecture policy, including disconnected self cycles", (t) => {
  const fixture = impactFixture(t, { "src/cycle.js": "import './cycle.js';" });
  const graph = captureGraph(fixture.root);
  assert.ok(
    graph.summary.violations.some(
      ({ rule }) => rule.name === "runtime-cycles" && rule.severity === "error",
    ),
  );
});
