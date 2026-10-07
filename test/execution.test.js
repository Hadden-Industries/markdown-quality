// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import * as api from "../src/quality.js";
import { consumer } from "./helpers.js";

test("bounded public execution preserves logical identity and rejects report overflow", async (t) => {
  assert.equal(typeof api.executeQuality, "function");
  const root = consumer(t, { "target.md": "Target.\n" });
  const request = {
    root,
    mode: "format",
    document: {
      path: "new.md",
      requestId: "r1",
      contentBase64: Buffer.from("Alpha. Beta.\n").toString("base64"),
    },
  };
  const result = await api.executeQuality(request);
  assert.equal(result.exitCode, 0);
  assert.equal(result.document.requestId, "r1");
  assert.equal(
    Buffer.from(result.document.contentBase64, "base64").toString(),
    "Alpha.\nBeta.\n",
  );
  assert.deepEqual(result.written, []);
  for (const prefix of ["", "x", "xx", "xxx"]) {
    const unicodeIdentity = prefix + "é💡".repeat(20000);
    const unicodeResult = await api.executeQuality({
      ...request,
      document: { ...request.document, requestId: unicodeIdentity },
    });
    assert.equal(unicodeResult.document.requestId, unicodeIdentity);
  }
  await assert.rejects(api.executeQuality(request, { reportBytes: 100 }), {
    code: "REPORT_LIMIT",
  });
  await assert.rejects(api.executeQuality(request, { checkerMs: 1 }), {
    code: "EXECUTION_TIMEOUT",
  });
  await assert.rejects(api.executeQuality(request, { signal: {} }), {
    code: "INVALID_EXECUTION",
  });
  await assert.rejects(
    api.executeQuality(request, { signal: AbortSignal.abort() }),
    { code: "CANCELLED" },
  );
});

test("logical CLI bounded JSON framing uses the public operation", (t) => {
  const root = consumer(t);
  const input = JSON.stringify({
    path: "new.md",
    requestId: "cli1",
    contentBase64: Buffer.from("Alpha. Beta.\n").toString("base64"),
  });
  const output = spawnSync(
    process.execPath,
    ["src/cli.js", "document", "--root", root, "--json"],
    { input, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(output.status, 0, output.stdout + output.stderr);
  const result = JSON.parse(output.stdout);
  assert.equal(result.document.requestId, "cli1");
  assert.equal(
    Buffer.from(result.document.contentBase64, "base64").toString(),
    "Alpha.\nBeta.\n",
  );
});

test("malformed provided logical documents cannot fall through to checkout formatting", async (t) => {
  const original = "Alpha. Beta.\n";
  const root = consumer(t, { "README.md": original });
  for (const document of [null, false, 0, "", undefined, [], {}]) {
    await assert.rejects(
      api.executeQuality({ root, mode: "format", document }),
      { code: "INVALID_DOCUMENT" },
    );
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), original);
  }
  // The private transport must also refuse malformed framing if used directly.
  for (const document of [null, false, 0, ""]) {
    const worker = spawnSync(
      process.execPath,
      ["src/execution-worker.js", "8388608"],
      {
        input: JSON.stringify({ root, mode: "format", document }),
        encoding: "utf8",
        timeout: 15000,
      },
    );
    assert.notEqual(worker.status, 0);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), original);
  }
});

test("accepted deadlines above the Node timer ceiling retain their full duration", async (t) => {
  const root = consumer(t, { "README.md": "Alpha.\n" });
  const report = await api.executeQuality(
    { root, mode: "inspect" },
    { checkerMs: 2_147_483_648 },
  );
  assert.equal(report.exitCode, 0);
  assert.deepEqual(report.selection.files, ["README.md"]);
});

test("bounded execution rejects checkout writes before launching a killable worker", async (t) => {
  const original = "Alpha. Beta.\n";
  const root = consumer(t, { "README.md": original });
  await assert.rejects(api.executeQuality({ root, mode: "format" }), {
    code: "INVALID_EXECUTION",
  });
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), original);
});

test("CLI installed metadata failures use operational exit without fabricated version keys", (t) => {
  const root = consumer(t);
  const script = join(root, "metadata-failure.mjs");
  const target = new URL("../src/tool-versions.js", import.meta.url).href;
  const cli = new URL("../src/cli.js", import.meta.url).href;
  writeFileSync(
    script,
    `import {mock} from 'node:test';
    const mockExports=process.versions.node.startsWith('22.')?'namedExports':'exports';
    mock.module(${JSON.stringify(target)}, {[mockExports]:{installedToolVersions(){throw Object.assign(new Error('Missing metadata'),{code:'TOOL_METADATA'});}}});
    process.argv=[process.execPath,'cli','inspect','--root',${JSON.stringify(root)},'--unknown-option','--json'];
    await import(${JSON.stringify(cli)});`,
  );
  const result = spawnSync(
    process.execPath,
    ["--experimental-test-module-mocks", script],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stdout, "");
  assert.match(
    result.stderr,
    /TOOL_METADATA: Cannot construct installed result metadata/u,
  );
});

test("nested CLI invocations discover the policy root before binding tracked inventory", (t) => {
  const root = consumer(t, { "README.md": "Alpha.\n", "docs/.keep": "" });
  for (const args of [
    ["init", "--quiet", root],
    ["-C", root, "add", "--", "."],
  ])
    spawnSync("git", args, { encoding: "utf8" });
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  for (const mode of ["check", "inspect"]) {
    const execution = spawnSync(process.execPath, [cli, mode, "--json"], {
      cwd: join(root, "docs"),
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(execution.status, 0, execution.stdout + execution.stderr);
    const report = JSON.parse(execution.stdout);
    assert.deepEqual(
      report.selection.inventory.map(({ path }) => path),
      ["README.md"],
    );
  }
  writeFileSync(join(root, ".node-version"), process.versions.node);
  writeFileSync(join(root, ".python-version"), "3.14");
  writeFileSync(
    join(root, ".markdown-quality-execution.json"),
    JSON.stringify({
      schemaVersion: 1,
      samples: 1,
      checkerMs: 1,
      windowMs: 30000,
      memoryBytes: 536870912,
      nodeOldSpaceMb: 256,
      reportBytes: 8388608,
      requestBytes: 8388608,
      stagingBytes: 134217728,
      stagingEntries: 100000,
      limits: {},
      runtimes: {
        node: { file: ".node-version" },
        python: { file: ".python-version" },
      },
    }),
  );
  const bounded = spawnSync(
    process.execPath,
    [
      cli,
      "inspect",
      "--execution-profile",
      ".markdown-quality-execution.json",
      "--json",
    ],
    { cwd: join(root, "docs"), encoding: "utf8", timeout: 15000 },
  );
  assert.equal(bounded.status, 2);
  assert.equal(JSON.parse(bounded.stdout).errors[0].code, "EXECUTION_TIMEOUT");
});

test("execution profile resolves only bounded trusted runtime declarations and finite limits", (t) => {
  assert.equal(typeof api.readExecutionProfile, "function");
  const root = consumer(t, {
    ".node-version": process.versions.node,
    "runtime.json": JSON.stringify({ python: "3.14" }),
  });
  const profile = {
    schemaVersion: 1,
    samples: 2,
    checkerMs: 30000,
    windowMs: 60000,
    memoryBytes: 536870912,
    nodeOldSpaceMb: 256,
    reportBytes: 8388608,
    requestBytes: 8388608,
    stagingBytes: 134217728,
    stagingEntries: 100000,
    limits: {},
    runtimes: {
      node: { file: ".node-version" },
      python: { file: "runtime.json", pointer: "/python" },
    },
  };
  writeFileSync(
    join(root, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  const resolved = api.readExecutionProfile({ root });
  assert.equal(resolved.runtimes.node, process.versions.node);
  assert.equal(resolved.runtimes.python, "3.14");
  assert.equal(resolved.limits.documentDiagnostics, 1000);
  assert.equal(resolved.samples, 2);
  profile.checkerMs = 1;
  writeFileSync(
    join(root, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  const timed = spawnSync(
    process.execPath,
    [
      "src/cli.js",
      "inspect",
      "--root",
      root,
      "--execution-profile",
      ".markdown-quality-execution.json",
      "--json",
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.equal(timed.status, 2);
  assert.equal(JSON.parse(timed.stdout).errors[0].code, "EXECUTION_TIMEOUT");
  profile.checkerMs = 30000;
  profile.limits = { documentDiagnostics: null };
  writeFileSync(
    join(root, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  assert.throws(() => api.readExecutionProfile({ root }), {
    code: "INVALID_PROFILE",
  });
  profile.limits = {};
  profile.runtimes.node.file = "../node.txt";
  writeFileSync(
    join(root, ".markdown-quality-execution.json"),
    JSON.stringify(profile),
  );
  assert.throws(() => api.readExecutionProfile({ root }));
  assert.equal(
    readFileSync(join(root, ".node-version"), "utf8"),
    process.versions.node,
  );
});

test(
  "Linux CLI cancellation disposes its detached checker before reporting failure",
  { skip: process.platform !== "linux", timeout: 15000 },
  async (t) => {
    const root = consumer(t, { "README.md": "Alpha.\n" });
    const cli = spawn(
      process.execPath,
      ["src/cli.js", "check", "--root", root, "--json"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "";
    cli.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    cli.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const closed = new Promise((resolve) =>
      cli.once("close", (code, signal) => resolve({ code, signal })),
    );
    let checker;
    t.after(() => {
      if (cli.exitCode === null) cli.kill("SIGKILL");
      if (checker && existsSync(`/proc/${checker}`)) {
        try {
          process.kill(-checker, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
    });
    const end = Date.now() + 8000;
    while (!checker && Date.now() < end && cli.exitCode === null) {
      try {
        checker =
          Number(
            readFileSync(`/proc/${cli.pid}/task/${cli.pid}/children`, "utf8")
              .trim()
              .split(/\s+/u)[0],
          ) || undefined;
      } catch {}
      if (!checker) await delay(10);
    }
    assert.ok(
      checker,
      "Must observe the real detached checker before cancellation",
    );
    cli.kill("SIGTERM");
    const status = await closed;
    assert.equal(status.code, 2, stderr + stdout);
    assert.equal(JSON.parse(stdout).errors[0].code, "CANCELLED");
    assert.equal(existsSync(`/proc/${checker}`), false);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), "Alpha.\n");
  },
);
