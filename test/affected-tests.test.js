// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";
import { npmCliPath } from "../scripts/commands.js";
import {
  planAffected,
  runAffected,
  selectFromGraphs,
  stopPosixTree,
} from "../scripts/affected-tests.js";
import { captureGraph, repositoryRoot } from "../scripts/dependency-graph.js";
import { impactFixture } from "./dependency-impact-helpers.js";

test("runner settles incomplete evidence when native cleanup fails while its harness lives", async (t) => {
  const f = impactFixture(t, {
    "test/unrelated.test.js":
      "import test from 'node:test'; test('surviving harness', async () => { await new Promise(() => setInterval(() => {}, 1000)); });",
  });
  const report = await planAffected({ root: f.root, base: f.base });
  const failure = Object.assign(
    new Error("Independent native cleanup failure"),
    { code: "EPERM" },
  );
  const mock =
    process.platform === "win32"
      ? t.mock.method(childProcess, "execFile", (...args) => {
          args.at(-1)(failure);
        })
      : t.mock.method(process, "kill", () => {
          throw failure;
        });
  syncBuiltinESMExports();
  let result;
  try {
    result = await runAffected(report, { timeout: 300 });
    assert.equal(result.outcome.code, 2);
    assert.equal(result.outcome.selected.signal, "cleanup-failed");
    assert.equal(result.outcome.selected.cleanupIncomplete, true);
    assert.ok(result.outcome.selected.elapsedMs < 5000);
  } finally {
    mock.mock.restore();
    syncBuiltinESMExports();
    // The failed cleanup deliberately left this owned harness alive. Reap it with the real native facility.
    if (result?.outcome.selected.pid) {
      const pid = result.outcome.selected.pid;
      if (process.platform === "win32") {
        const killed = spawnSync(
          join(process.env.SystemRoot, "System32", "taskkill.exe"),
          ["/PID", String(pid), "/T", "/F"],
          { windowsHide: true, timeout: 5000 },
        );
        assert.equal(killed.status, 0, killed.stderr?.toString());
      } else {
        try {
          process.kill(-pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
    }
  }
});

test("cleanup rejects reused harness identities and attempts every child after one signal fails", () => {
  const rows = [
    [10, 1, "root-birth"],
    [11, 10, "first-child"],
    [12, 10, "second-child"],
  ];
  const killed = [];
  const send = (pid, signal) => {
    if (signal !== "SIGKILL") return;
    killed.push(pid);
    if (pid === 12)
      throw Object.assign(new Error("Independent termination failure"), {
        code: "EPERM",
      });
  };
  assert.throws(
    () => stopPosixTree(10, "former-root", { table: () => rows, send }),
    /identity unavailable/u,
  );
  assert.deepEqual(killed, []);
  assert.throws(
    () => stopPosixTree(10, "root-birth", { table: () => rows, send }),
    /cleanup incomplete/u,
  );
  assert.deepEqual(killed, [12, 11, 10]);
});

test("repository generated formatting consumers include modules and their imported leaves", async () => {
  const graph = captureGraph(repositoryRoot);
  const policy = JSON.parse(
    readFileSync(join(repositoryRoot, ".test-impact.json")),
  );
  const tests = graph.modules
    .map((module) => module.source)
    .filter((path) => /^test\/[^/]+\.test\.js$/u.test(path));
  // These known generated imports were independently inventoried in formatting.test.js.
  for (const seed of [
    "src/formatting.js",
    "src/native-tool.js",
    "src/contracts.js",
    "src/analysis.js",
  ]) {
    const report = await selectFromGraphs(
      [graph],
      [seed],
      tests,
      policy.relations,
    );
    assert.ok(report.selected.includes("test/formatting.test.js"), seed);
  }
});

test("real worker, spawned CLI and generated-program seeds retain each failing consumer", async (t) => {
  const relation = (id, dependency, consumer, kind) => ({
    id,
    dependency,
    consumer,
    kind,
    evidence: "Independent executable fixture",
    fixture: "real boundary seeds",
  });
  const f = impactFixture(
    t,
    {
      "src/worker.js":
        "import {parentPort} from 'node:worker_threads'; import {value} from './leaf.js'; parentPort.postMessage(value);",
      "src/parent.js":
        "import {Worker} from 'node:worker_threads'; export const value = () => new Promise((resolve, reject) => { const worker = new Worker(new URL('./worker.js', import.meta.url)); worker.once('message', resolve); worker.once('error', reject); });",
      "src/cli.js": "import {value} from './leaf.js'; console.log(value);",
      "test/worker.test.js":
        "import test from 'node:test'; import assert from 'node:assert/strict'; import {value} from '../src/parent.js'; test('real worker seed', async () => assert.equal(await value(), 1));",
      "test/process.test.js":
        "import test from 'node:test'; import assert from 'node:assert/strict'; import {spawnSync} from 'node:child_process'; import {fileURLToPath} from 'node:url'; test('real CLI seed', () => { const child = spawnSync(process.execPath, [fileURLToPath(new URL('../src/cli.js', import.meta.url))], {encoding:'utf8'}); assert.equal(child.status, 0); assert.equal(child.stdout.trim(), '1'); });",
      "test/generated.test.js":
        "import test from 'node:test'; import assert from 'node:assert/strict'; import {spawnSync} from 'node:child_process'; test('real generated seed', () => { const program = `import {value} from ${JSON.stringify(new URL('../src/leaf.js', import.meta.url).href)}; console.log(value);`; const child = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {encoding:'utf8'}); assert.equal(child.status, 0); assert.equal(child.stdout.trim(), '1'); });",
    },
    [
      relation("worker", "src/worker.js", "src/parent.js", "worker-url"),
      relation("cli", "src/cli.js", "test/process.test.js", "spawn"),
      relation(
        "generated",
        "src/leaf.js",
        "test/generated.test.js",
        "generated-program",
      ),
    ],
  );
  f.put("src/leaf.js", "export const value = 999;\n");
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "selected", report.fallback);
  assert.deepEqual(report.selected, [
    "test/generated.test.js",
    "test/leaf.test.js",
    "test/process.test.js",
    "test/worker.test.js",
  ]);
  const result = await runAffected(report, { shadow: true });
  for (const name of [
    "real worker seed",
    "real CLI seed",
    "real generated seed",
  ])
    for (const run of [result.outcome.selected, result.outcome.full])
      assert.ok(
        run.outcomes.some(
          (event) => event.name === name && event.type === "test:fail",
        ),
        name,
      );
  assert.equal(result.outcome.shadowAgreement, true);
  assert.equal(result.outcome.code, 1);
});

test("a changed resource forces full discovery which catches its independent regression", async (t) => {
  const f = impactFixture(t, {
    "assets/value.json": "1",
    "test/resource.test.js":
      "import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; test('resource seed', () => assert.equal(JSON.parse(readFileSync(new URL('../assets/value.json', import.meta.url))), 1));",
  });
  f.put("assets/value.json", "999");
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "full");
  const result = await runAffected(report, { shadow: true });
  assert.equal(result.outcome.code, 1);
  assert.equal(result.outcome.shadowAgreement, true);
  assert.ok(
    result.outcome.full.outcomes.some(
      (event) => event.name === "resource seed" && event.type === "test:fail",
    ),
  );
});

test("running cancellation terminates detached descendants before returning", async (t) => {
  const markerRoot = mkdtempSync(join(tmpdir(), "impact-owned-process-"));
  t.after(() => rmSync(markerRoot, { recursive: true, force: true }));
  const marker = join(markerRoot, "pid");
  const program = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setInterval(() => {}, 1000);`;
  const f = impactFixture(t, {
    "test/unrelated.test.js": `import test from 'node:test'; import {spawn} from 'node:child_process'; test('detached child', async () => { const child = spawn(process.execPath, ['--eval', ${JSON.stringify(program)}], {detached:true, stdio:'ignore'}); child.unref(); await new Promise(() => setInterval(() => {}, 1000)); });`,
  });
  const report = await planAffected({ root: f.root, base: f.base });
  const controller = new AbortController();
  const running = runAffected(report, {
    signal: controller.signal,
    timeout: 10000,
  });
  const deadline = Date.now() + 8000;
  while (!existsSync(marker) && Date.now() < deadline)
    await new Promise((done) => setTimeout(done, 20));
  controller.abort();
  const result = await running;
  assert.ok(existsSync(marker), result.outcome.selected.stderr);
  const pid = Number(readFileSync(marker, "utf8"));
  const alive = () => {
    try {
      process.kill(pid, 0);
      if (process.platform === "linux")
        return !/\) Z /u.test(readFileSync(`/proc/${pid}/stat`, "utf8"));
      return true;
    } catch (error) {
      if (["ESRCH", "ENOENT"].includes(error.code)) return false;
      throw error;
    }
  };
  // Emergency cleanup stays confined to the PID whose marker the owned child wrote.
  if (alive()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
    assert.fail("Detached descendant survived runner cleanup");
  }
  assert.equal(result.outcome.code, 2);
  assert.equal(result.outcome.selected.signal, "cancelled");
});

test("output exhaustion returns incomplete nonzero evidence", async (t) => {
  const f = impactFixture(t, {
    "test/unrelated.test.js":
      "import test from 'node:test'; test('too much output', async () => { for(let i=0;i<20;i++) console.log('x'.repeat(1024*1024)); await new Promise(() => setInterval(() => {}, 1000)); });",
  });
  const report = await planAffected({ root: f.root, base: f.base });
  const result = await runAffected(report, { timeout: 10000 });
  assert.equal(result.outcome.code, 2);
  assert.equal(result.outcome.selected.outputLimit, true);
  assert.equal(result.outcome.selected.signal, "output-limit");
});

test("explicit baseline selects independent leaf consumers through barrel and staged/untracked changes", async (t) => {
  const f = impactFixture(t);
  f.put("src/leaf.js", "export const value = 2;\n");
  f.git("add", "--", "src/leaf.js");
  f.put(
    "test/new test Ω.test.js",
    "import test from 'node:test'; test('new', () => {});",
  );
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "selected", report.fallback);
  assert.deepEqual(report.selected, [
    "test/leaf.test.js",
    "test/new test Ω.test.js",
  ]);
  assert.equal(report.executed, false);
  assert.deepEqual(
    report.changes.map((entry) => entry.path),
    ["src/leaf.js", "test/new test Ω.test.js"],
  );
});

test("old topology preserves consumers after deletion, rename and removal of an import edge", async (t) => {
  const f = impactFixture(t);
  renameSync(join(f.root, "src/leaf.js"), join(f.root, "src/renamed.js"));
  f.put("src/barrel.mjs", "export const value = 3;\n");
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "selected", report.fallback);
  assert.deepEqual(report.selected, ["test/leaf.test.js"]);
  assert.ok(
    report.changes.some(
      (entry) => entry.path === "src/leaf.js" && entry.status === "deleted",
    ),
  );
});

test("worker imported leaves propagate through exceptional spawn and generated-program chains", async (t) => {
  const relations = [
    {
      id: "worker",
      dependency: "src/worker.js",
      consumer: "src/parent.js",
      kind: "worker-url",
      evidence: "Independent Worker URL fixture",
      fixture: "worker imported leaf",
    },
    {
      id: "cli",
      dependency: "src/cli.js",
      consumer: "test/process.test.js",
      kind: "spawn",
      evidence: "Independent spawned path fixture",
      fixture: "worker imported leaf",
    },
  ];
  const f = impactFixture(
    t,
    {
      "src/worker.js": "import './leaf.js';",
      "src/parent.js":
        "export const worker = new URL('./worker.js', import.meta.url);",
      "src/cli.js": "import './parent.js';",
      "test/process.test.js":
        "import test from 'node:test'; test('spawn consumer', () => {});",
    },
    relations,
  );
  f.put("src/leaf.js", "export const value = 2;\n");
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "selected", report.fallback);
  assert.deepEqual(report.selected, [
    "test/leaf.test.js",
    "test/process.test.js",
  ]);
  assert.deepEqual(report.appliedRules, ["cli", "worker"]);
});

test("diamonds, cycles and multiple edits produce deterministic finite unions", async (t) => {
  const f = impactFixture(t, {
    "src/a.js": "import './b.js'; import './leaf.js';",
    "src/b.js": "import './a.js';",
    "test/cycle.test.js": "import '../src/b.js';",
  });
  f.put("src/leaf.js", "export const value = 2;\n");
  f.put(
    "test/unrelated.test.js",
    "import test from 'node:test'; test('edited', () => {});",
  );
  const first = await planAffected({ root: f.root, base: f.base });
  const second = await planAffected({ root: f.root, base: f.base });
  assert.equal(first.mode, "selected", first.fallback);
  assert.deepEqual(first.selected, [
    "test/cycle.test.js",
    "test/leaf.test.js",
    "test/unrelated.test.js",
  ]);
  assert.deepEqual(first.selected, second.selected);
  assert.deepEqual(first.reasons, second.reasons);
});

test("missing/no-change/invalid baseline and incompatible controls fall back truthfully", async (t) => {
  const f = impactFixture(t);
  for (const base of [undefined, "HEAD", "f".repeat(40), f.base]) {
    const report = await planAffected({ root: f.root, base });
    assert.equal(report.mode, "full");
    assert.deepEqual(report.selected, [
      "test/leaf.test.js",
      "test/unrelated.test.js",
    ]);
    assert.equal(report.executed, false);
  }
  f.put("package-lock.json", '{"changed":true}');
  assert.match(
    (await planAffected({ root: f.root, base: f.base })).fallback,
    /Incompatible baseline/u,
  );
});

test("unknown resources, removed tests, computed loads and process inputs never yield empty success", async (t) => {
  for (const [path, source] of [
    ["unknown.txt", "unknown"],
    ["assets/native.toml", "native"],
    ["src/leaf.js", "export const value = import(globalThis.target);"],
    [
      "src/leaf.js",
      "import {readFileSync as read} from 'node:fs'; export const value = read('hidden');",
    ],
  ]) {
    const f = impactFixture(t);
    f.put(path, source);
    const report = await planAffected({ root: f.root, base: f.base });
    assert.equal(report.mode, "full", path);
    assert.ok(report.selected.length);
  }
  const f = impactFixture(t);
  unlinkSync(join(f.root, "test/leaf.test.js"));
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.fallback, "deleted-test-coverage");
  assert.deepEqual(report.selected, ["test/unrelated.test.js"]);
});

test("selected regression failure remains nonzero and shadow records the independent full result", async (t) => {
  const f = impactFixture(t);
  f.put("src/leaf.js", "export const value = 999;\n");
  const plan = await planAffected({ root: f.root, base: f.base });
  assert.equal(plan.mode, "selected", plan.fallback);
  const result = await runAffected(plan, { shadow: true });
  assert.equal(result.outcome.code, 1);
  assert.equal(result.outcome.selected.code, 1);
  assert.equal(result.outcome.full.code, 1);
  assert.match(result.outcome.selected.stdout, /999/u);
});

test("independent shadow catches a deliberately defective selection which omits a failing file", async (t) => {
  const f = impactFixture(t);
  f.put("src/leaf.js", "export const value = 999;\n");
  const plan = await planAffected({ root: f.root, base: f.base });
  plan.selected = ["test/unrelated.test.js"]; // Deliberate fault, never derived as an oracle.
  const result = await runAffected(plan, { shadow: true });
  assert.equal(result.outcome.selected.code, 0);
  assert.equal(result.outcome.full.code, 1);
  assert.equal(result.outcome.shadowAgreement, false);
  assert.equal(result.outcome.code, 1);
});

test("snapshot drift invalidates execution; pre-aborted work cannot report success", async (t) => {
  const f = impactFixture(t);
  f.put("src/leaf.js", "export const value = 2;\n");
  const plan = await planAffected({ root: f.root, base: f.base });
  f.put("src/leaf.js", "export const value = 3;\n");
  await assert.rejects(runAffected(plan), /Snapshot drift/u);
  const settled = await planAffected({ root: f.root, base: f.base });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runAffected(settled, { signal: controller.signal }),
    /abort/iu,
  );
});

test("bounded runner timeout preserves an incomplete nonzero outcome", async (t) => {
  const f = impactFixture(t);
  f.put(
    "test/unrelated.test.js",
    "import test from 'node:test'; test('never finishes', async () => { await new Promise(() => setInterval(() => {}, 1000)); });",
  );
  const plan = await planAffected({ root: f.root, base: f.base });
  const result = await runAffected(plan, { timeout: 300 });
  assert.equal(result.outcome.code, 2);
  assert.ok(result.outcome.selected.signal);
});

test("data-only invalid policy and absent endpoints fall back; linked source cannot grant success", async (t) => {
  const f = impactFixture(t);
  f.put(".test-impact.json", JSON.stringify({ schemaVersion: 999 }));
  assert.match(
    (await planAffected({ root: f.root, base: f.base })).fallback,
    /Invalid impact policy/u,
  );
  const outside = impactFixture(t);
  symlinkSync(
    outside.root,
    join(f.root, "src", "escape"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    planAffected({ root: f.root, base: f.base }),
    /Linked graph input/u,
  );
});

test("bounded source-copy groups select packaged consumers even without import relations", async (t) => {
  const f = impactFixture(
    t,
    {
      "test/packed.test.js":
        "import test from 'node:test'; test('packed source', () => {});",
    },
    [
      {
        id: "packed-source",
        dependency: "src/",
        consumer: "test/packed.test.js",
        kind: "source-copy-group",
        evidence: "Fixture archive copies the source directory",
        fixture: "source-copy group",
      },
    ],
  );
  f.put("src/leaf.js", "export const value = 2;\n");
  const report = await planAffected({ root: f.root, base: f.base });
  assert.equal(report.mode, "selected", report.fallback);
  assert.deepEqual(report.selected, [
    "test/leaf.test.js",
    "test/packed.test.js",
  ]);
});

test("real npm entrypoint lists without execution and preserves a selected failing exit", (t) => {
  const f = impactFixture(t);
  const metadata = JSON.parse(readFileSync(join(f.root, "package.json")));
  const entrypoint = fileURLToPath(
    new URL("../scripts/affected-tests.js", import.meta.url),
  );
  metadata.scripts = { "check:affected": `node "${entrypoint}"` };
  f.put("package.json", JSON.stringify(metadata));
  f.git("add", "--all");
  f.git(
    "-c",
    "user.name=Impact fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "Fixture entrypoint",
  );
  const base = f.git("rev-parse", "HEAD").trim();
  f.put("src/leaf.js", "export const value = 999;\n");
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const invoke = (...args) =>
    spawnSync(
      process.execPath,
      [npmCliPath(), "run", "check:affected", "--silent", "--", ...args],
      {
        cwd: f.root,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  const listed = invoke("--base", base, "--list");
  assert.equal(listed.status, 0, listed.stderr);
  assert.equal(JSON.parse(listed.stdout).executed, false);
  assert.deepEqual(JSON.parse(listed.stdout).selected, ["test/leaf.test.js"]);
  const executed = invoke("--base", base);
  assert.equal(executed.status, 1, executed.stderr);
  assert.equal(JSON.parse(executed.stdout).outcome.selected.code, 1);
  const fallback = invoke();
  assert.equal(fallback.status, 1);
  assert.equal(JSON.parse(fallback.stdout).fallback, "missing-explicit-base");
  assert.deepEqual(JSON.parse(fallback.stdout).selected, [
    "test/leaf.test.js",
    "test/unrelated.test.js",
  ]);
});
