// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  linkSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";
import { admitCli } from "../src/cli-admission.js";
import {
  runQuality,
  executeQualityRequest,
  processLogicalDocument,
  validateQualityResult,
  compareCheckReports,
} from "../src/quality.js";
import { admitCheckEvidence } from "../src/result-validation.js";
import {
  syncPackageVersions,
  checkPackageVersions,
} from "../scripts/project-package-version.js";
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const repository = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function invoke(root, args, input) {
  const child = spawnSync(process.execPath, [cli, ...args, "--root", root], {
    input,
    encoding: "utf8",
    timeout: fixtureCommandTimeoutMs,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  assert.equal(child.error, undefined, String(child.error));
  return child;
}
test("lightweight discovery and imports need no operation, policy, native tool or stdin", (t) => {
  const root = consumer(t, { ".markdown-quality.json": "invalid" });
  mkdirSync(join(root, "src"));
  for (const name of [
    "cli.js",
    "cli-admission.js",
    "cli-streams.js",
    "cli-output-worker.js",
    "execution-defaults.js",
    "qualify-git-cli.js",
  ])
    cpSync(join(repository, "src", name), join(root, "src", name));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ type: "module", version: "3.0.0" }),
  );
  for (const name of ["cli.js", "qualify-git-cli.js"])
    for (const args of [[], ["--help"], ["--version"]]) {
      const child = spawnSync(
        process.execPath,
        [join(root, "src", name), ...args],
        { cwd: root, encoding: "utf8", timeout: 5000 },
      );
      assert.equal(child.status, 0, child.stderr);
      assert.match(
        child.stdout,
        args[0] === "--version" ? /^3\.0\.0\n$/u : /Usage:/u,
      );
      assert.equal(child.stderr, "");
    }
  const imported = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(new URL("src/cli.js", new URL("file:///" + root.replaceAll("\\", "/") + "/")).href)});`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "");
});
test("command admission refuses effect conflicts before root or stdin admission", () => {
  for (const args of [
    ["format"],
    ["format", "--write", "--dry-run"],
    ["normalize", "--files-json", "[]"],
    ["check", "--write"],
    ["format", "--stdin"],
    ["format", "--stdin", "--stdin-filepath", "a.md", "--json"],
    ["check", "--stdin-filepath", "a.md"],
    [
      "check",
      "--stdin",
      "--stdin-filepath",
      "a.md",
      "--stdin-filepath",
      "a.md",
    ],
    ["format", "--stdin-request", "--write"],
    ["check", "--files-json", "{}"],
    ["check", "--root", "a", "--root", "b"],
    ["inspect-profile", "--quiet"],
    ["check", "--stdin", "--stdin-filepath", "a.md", "--"],
  ])
    assert.throws(() => admitCli(args), undefined, args.join(" "));
  assert.deepEqual(admitCli(["check", "--", "--write"]).files, ["--write"]);
  assert.deepEqual(
    admitCli(["format", "--dry-run", "--files-json", "[]"]).files,
    [],
  );
  assert.match(admitCli(["format", "--help"]).discovery, /--write.*--dry-run/u);
});
test("format preview and write share actual candidate identities and bounded transport", async (t) => {
  const root = consumer(t, {
    "a.md": "_text_\n",
    "peer.md": "```\nbad\n```\n",
  });
  const preview = await executeQualityRequest({
    root,
    mode: "format",
    files: ["a.md"],
    dryRun: true,
  });
  validateQualityResult(preview);
  assert.equal(preview.exitCode, 0, JSON.stringify(preview));
  assert.equal(preview.operationStatus, "previewed");
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "_text_\n");
  assert.deepEqual(preview.documentResults[0].candidate, {
    inputSha256: hash("_text_\n"),
    inputBytes: 7,
    outputSha256: hash("*text*\n"),
    outputBytes: 7,
    changed: true,
  });
  const applied = await runQuality({ root, mode: "format", files: ["a.md"] });
  assert.equal(applied.exitCode, 0);
  assert.deepEqual(
    applied.documentResults[0].candidate,
    preview.documentResults[0].candidate,
  );
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "*text*\n");
  await assert.rejects(
    executeQualityRequest({ root, mode: "format" }),
    /never writes/u,
  );
  const again = await runQuality({
    root,
    mode: "format",
    files: ["a.md"],
    dryRun: true,
  });
  assert.equal(again.documentResults[0].candidate.changed, false);
});
test("preview rejects hardlinks and blocked peers before any replacement", async (t) => {
  const root = consumer(t, {
    "a.md": "_text_\n",
    "bad.md": "```\nvalue\n```\n",
  });
  const result = await runQuality({ root, mode: "format", dryRun: true });
  assert.equal(result.exitCode, 1);
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "_text_\n");
  linkSync(join(root, "a.md"), join(root, "hard.md"));
  const hard = await runQuality({
    root,
    mode: "format",
    dryRun: true,
    files: ["a.md"],
  });
  assert.equal(hard.exitCode, 2);
  assert.equal(hard.errors[0].code, "HARD_LINK");
});
test("raw UTF-8 is authoritative at an absent virtual self-link and physical disk path", (t) => {
  const root = consumer(t, { "a.md": "Disk bytes.\n" });
  for (const path of ["a.md", "new/é space.md"]) {
    const input = `# Heading\n\n[Self](#heading) and [named self](<${path.split("/").at(-1)}#heading>).\n\n_text_\n`;
    const child = invoke(
      root,
      ["format", "--stdin", "--stdin-filepath", path],
      input,
    );
    assert.equal(child.status, 0, child.stderr);
    assert.equal(
      child.stdout,
      input
        .replace("_text_", "*text*")
        .replace("<a.md#heading>", "a.md#heading"),
    );
  }
  assert.equal(readFileSync(join(root, "a.md"), "utf8"), "Disk bytes.\n");
  assert.equal(existsSync(join(root, "new")), false);
});
test("raw checks, excluded UTF-8 and legacy arbitrary-byte envelopes retain distinct scope", (t) => {
  const root = consumer(
    t,
    { "bad.md": "```\nbad\n```\n" },
    { exclude: ["skip/**"] },
  );
  const checked = invoke(
    root,
    ["check", "--stdin", "--stdin-filepath", "virtual.md", "--json"],
    "Plain prose.\n",
  );
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  const report = JSON.parse(checked.stdout);
  validateQualityResult(report);
  assert.equal(report.document.path, "virtual.md");
  assert.throws(() => admitCheckEvidence(report), /read-only check/u);
  const excluded = invoke(
    root,
    ["format", "--stdin", "--stdin-filepath", "skip/a.md"],
    "_unchanged_\n",
  );
  assert.equal(excluded.status, 0, excluded.stderr);
  assert.equal(excluded.stdout, "_unchanged_\n");
  assert.match(excluded.stderr, /omitted/u);
  const invalid = invoke(
    root,
    ["format", "--stdin", "--stdin-filepath", "skip/a.md"],
    Buffer.from([255]),
  );
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, "");
  const envelope = invoke(
    root,
    ["format", "--stdin-request", "--json"],
    JSON.stringify({ path: "skip/a.md", contentBase64: "/w==" }),
  );
  assert.equal(envelope.status, 0, envelope.stdout + envelope.stderr);
  assert.equal(JSON.parse(envelope.stdout).document.contentBase64, "/w==");
});
test("raw normalization keeps anchor consent and refuses dependent edits outside its buffer", (t) => {
  const root = consumer(t, { "peer.md": "See [target](virtual.md#café).\n" });
  const args = ["normalize", "--stdin", "--stdin-filepath", "virtual.md"];
  const input = "# Café\n\n[Self](#café)\n";
  const refused = invoke(root, args, input);
  assert.equal(refused.status, 1, refused.stderr);
  assert.equal(refused.stdout, "");
  assert.match(refused.stderr, /ANCHOR_CHANGE_REQUIRES_UPDATE_LINKS/u);
  const outside = invoke(root, [...args, "--update-links"], input);
  assert.equal(outside.status, 1, outside.stderr);
  assert.equal(outside.stdout, "");
  assert.match(outside.stderr, /OUT_OF_SCOPE_REFERENCE/u);
  writeFileSync(join(root, "peer.md"), "Plain prose.\n");
  const repaired = invoke(root, [...args, "--update-links"], input);
  assert.equal(repaired.status, 0, repaired.stderr);
  assert.equal(repaired.stdout, "# Café\n\n[Self](#café)\n");
  assert.match(repaired.stderr, /External backlinks: unverified/u);
  const quiet = invoke(root, [...args, "--update-links", "--quiet"], input);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.match(quiet.stderr, /External backlinks: unverified/u);
});
test("candidate validation rejects contradictory effects and preserves optional expectations", async (t) => {
  const root = consumer(t, { "a.md": "_text_\n" });
  const preview = await runQuality({ root, mode: "format", dryRun: true });
  validateQualityResult(preview, {});
  assert.throws(
    () => validateQualityResult(preview, { requestId: "wrong" }),
    /requested requestId/u,
  );
  for (const mutate of [
    (r) => delete r.documentResults[0].candidate,
    (r) => (r.documentResults[0].candidate.changed = false),
    (r) => (r.documentResults[0].candidate = null),
    (r) => (r.documentResults[0].writeStatus = "written"),
    (r) => (r.documentResults[0].candidate.outputBytes = -1),
  ]) {
    const changed = structuredClone(preview);
    mutate(changed);
    assert.throws(() => validateQualityResult(changed));
  }
  const check = await runQuality({ root, files: [] });
  const bad = structuredClone(check);
  bad.dryRun = true;
  assert.throws(() => validateQualityResult(bad));
  const logical = await processLogicalDocument({
    root,
    path: "virtual.md",
    content: Buffer.from("Plain.\n"),
    mode: "check",
  });
  validateQualityResult(logical);
  const wrong = structuredClone(logical);
  wrong.selection.mode = "full";
  assert.throws(() => validateQualityResult(wrong));
});
test("true schema-4 to schema-5 comparison preserves provenance and rejects logical substitution", async (t) => {
  const root = consumer(t, { "a.md": "Plain.\n" });
  const current = await runQuality({ root });
  const historical = structuredClone(current);
  historical.schemaVersion = 4;
  for (const r of historical.documentResults) delete r.candidate;
  const currentSchema = JSON.parse(
    readFileSync(join(repository, "schemas/result.schema.json")),
  );
  const oldSchema = structuredClone(currentSchema);
  oldSchema.properties.schemaVersion.const = 4;
  oldSchema.properties.documentResults.items.required =
    oldSchema.properties.documentResults.items.required.filter(
      (k) => k !== "candidate",
    );
  delete oldSchema.properties.documentResults.items.properties.candidate;
  const bytes = readFileSync(join(root, "a.md")),
    inputs = [{ path: "a.md", bytes: bytes.length, sha256: hash(bytes) }];
  const args = {
    incumbent: historical,
    candidate: current,
    incumbentSchema: oldSchema,
    candidateSchema: currentSchema,
    incumbentInputs: inputs,
    candidateInputs: inputs,
  };
  const report = compareCheckReports(args);
  assert.equal(report.incumbent.reportSchemaVersion, 4);
  assert.equal(report.candidate.reportSchemaVersion, 5);
  assert.equal(
    report.incumbent.effectiveConfigurationSha256,
    current.effectiveConfigurationSha256,
  );
  const logical = await processLogicalDocument({
    root,
    path: "a.md",
    content: bytes,
    mode: "check",
  });
  assert.throws(
    () => compareCheckReports({ ...args, candidate: logical }),
    /read-only/u,
  );
});
test("version projection preserves dependency resolution and validates all inputs before writing", (t) => {
  const root = consumer(t);
  for (const path of [
    "package.json",
    "package-lock.json",
    "packages/linux-x64/package.json",
    "packages/win32-x64/package.json",
  ]) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    cpSync(join(repository, path), join(root, path));
  }
  const metadata = JSON.parse(readFileSync(join(root, "package.json")));
  metadata.version = "3.1.0";
  writeFileSync(join(root, "package.json"), JSON.stringify(metadata));
  const before = JSON.parse(readFileSync(join(root, "package-lock.json")));
  syncPackageVersions(root);
  checkPackageVersions(root);
  const after = JSON.parse(readFileSync(join(root, "package-lock.json")));
  for (const key of ["version"]) after[key] = before[key];
  after.packages[""].version = before.packages[""].version;
  for (const platform of ["linux-x64", "win32-x64"])
    after.packages[`packages/${platform}`].version =
      before.packages[`packages/${platform}`].version;
  assert.deepEqual(after, before);
  writeFileSync(join(root, "packages/win32-x64/package.json"), "invalid");
  const linux = readFileSync(join(root, "packages/linux-x64/package.json"));
  assert.throws(() => syncPackageVersions(root));
  assert.deepEqual(
    readFileSync(join(root, "packages/linux-x64/package.json")),
    linux,
  );
});

function streamCli(root, args, action) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [action.entrypoint ?? cli, ...args, "--root", root],
      {
        env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: "1" },
        windowsHide: true,
        stdio: action.message ? ["pipe", "pipe", "pipe", "ipc"] : "pipe",
      },
    );
    let stderr = "",
      stdoutBytes = 0;
    const deadline = setTimeout(() => {
      child.kill();
      child.stdout.resume();
      reject(
        new Error(
          `Streaming fixture exceeded its outer bound; stdout=${stdoutBytes}; stderr=${stderr}`,
        ),
      );
    }, 15000);
    child.on("error", reject);
    child.on("message", (message) => action.message?.(child, message));
    child.stdin.on("error", () => {});
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (child.exitCode === null) action.output?.(child, chunk);
    });
    child.once("exit", () => child.stdout.resume());
    child.on("close", (code) => {
      clearTimeout(deadline);
      resolve({ code, stderr, stdoutBytes });
    });
    action.input?.(child);
  });
}
test("raw input awaits EOF and decodes split UTF-8 without replacement", async (t) => {
  const root = consumer(t, {}, { exclude: ["skip/**"] });
  const bytes = Buffer.from("é\n");
  let output = Buffer.alloc(0);
  const result = await streamCli(
    root,
    ["format", "--stdin", "--stdin-filepath", "skip/a.md"],
    {
      input(child) {
        child.stdin.write(bytes.subarray(0, 1));
        setTimeout(() => {
          assert.equal(output.length, 0);
          child.stdin.end(bytes.subarray(1));
        }, 50);
      },
      output(child, chunk) {
        output = Buffer.concat([output, chunk]);
      },
    },
  );
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(output, bytes);
});
test("raw input, internal framing and output retain explicit finite ceilings", (t) => {
  const root = consumer(t, {}, { exclude: ["skip/**"] });
  writeFileSync(
    join(root, "profile.json"),
    JSON.stringify({ maxRequestBytes: 64 }),
  );
  const input = invoke(
    root,
    [
      "format",
      "--stdin",
      "--stdin-filepath",
      "skip/a.md",
      "--execution-profile",
      "profile.json",
    ],
    "x".repeat(65),
  );
  assert.equal(input.status, 2);
  assert.equal(input.stdout, "");
  assert.match(input.stderr, /REQUEST_LIMIT/u);
  // Raw bytes fit, but the actual encoded JSON envelope does not.
  const framing = invoke(
    root,
    [
      "format",
      "--stdin",
      "--stdin-filepath",
      "skip/a.md",
      "--execution-profile",
      "profile.json",
    ],
    "x".repeat(40),
  );
  assert.equal(framing.status, 2);
  assert.equal(framing.stdout, "");
  assert.match(framing.stderr, /REQUEST_LIMIT/u);
  writeFileSync(
    join(root, "profile.json"),
    JSON.stringify({ executionTimeoutMs: 2_147_483_648 }),
  );
  const long = invoke(
    root,
    [
      "format",
      "--stdin",
      "--stdin-filepath",
      "skip/a.md",
      "--execution-profile",
      "profile.json",
    ],
    "Plain.\n",
  );
  assert.equal(long.status, 0, long.stderr);
  assert.equal(long.stdout, "Plain.\n");
  writeFileSync(
    join(root, "profile.json"),
    JSON.stringify({ maxOutputBytes: 64 }),
  );
  const output = invoke(
    root,
    [
      "check",
      "--stdin",
      "--stdin-filepath",
      "skip/a.md",
      "--execution-profile",
      "profile.json",
      "--json",
    ],
    "Plain.\n",
  );
  assert.equal(output.status, 2);
  assert.equal(output.stdout, "");
  assert.match(output.stderr, /OUTPUT_LIMIT/u);
});
test("raw delivery handles a real broken pipe after output begins", async (t) => {
  const root = consumer(t, {}, { exclude: ["skip/**"] });
  let reached = false;
  const result = await streamCli(
    root,
    ["format", "--stdin", "--stdin-filepath", "skip/a.md"],
    {
      input(child) {
        child.stdin.end("x".repeat(1024 * 1024));
      },
      output(child) {
        reached = true;
        child.stdout.destroy();
      },
    },
  );
  assert.equal(reached, true, "Output sink must actually be reached");
  assert.equal(result.code, 2, result.stderr);
  assert.match(result.stderr, /EPIPE|EIO|ECONNRESET/u);
});
test("one raw deadline covers incomplete input and blocked output after worker cleanup", async (t) => {
  const root = consumer(t, {}, { exclude: ["skip/**"] });
  writeFileSync(
    join(root, "profile.json"),
    JSON.stringify({ executionTimeoutMs: 2000 }),
  );
  const args = [
    "format",
    "--stdin",
    "--stdin-filepath",
    "skip/a.md",
    "--execution-profile",
    "profile.json",
  ];
  const input = await streamCli(root, args, {
    input(child) {
      child.stdin.write("unfinished");
    },
  });
  assert.equal(input.code, 2, input.stderr);
  assert.equal(input.stdoutBytes, 0);
  assert.match(input.stderr, /CANCELLED/u);
  // Advance the same operation clock across input and blocked output. Real
  // worker startup/cleanup must not race a short wall-clock budget on busy hosts.
  const controlledCli = join(root, "controlled-cli-clock.mjs");
  writeFileSync(
    controlledCli,
    `import {mock} from 'node:test';
    import {main} from ${JSON.stringify(new URL("../src/cli.js", import.meta.url).href)};
    let now=0;
    mock.method(performance, 'now', () => now);
    mock.timers.enable({apis:['setTimeout']});
    process.on('message', ({advance}) => {
      now+=advance;
      mock.timers.tick(advance);
      process.send({advanced:now});
    });
    const operation=main();
    process.send({started:true});
    await operation;
    process.disconnect();`,
  );
  let reached = false;
  const output = await streamCli(root, args, {
    entrypoint: controlledCli,
    message(child, message) {
      if (message.started) child.send({ advance: 1000 });
      else if (message.advanced === 1000)
        child.stdin.end("x".repeat(1024 * 1024));
    },
    output(child) {
      if (reached) return;
      reached = true;
      child.stdout.pause();
      child.send({ advance: 1000 });
    },
  });
  assert.equal(reached, true, "Output must follow actual worker cleanup");
  assert.equal(output.code, 2, output.stderr);
  assert.match(output.stderr, /CANCELLED/u);
});

test("format rechecks every selected preimage after analysis before preview or the first write", async (t) => {
  let currentRoot;
  const terminate = Worker.prototype.terminate;
  t.mock.method(Worker.prototype, "terminate", function () {
    writeFileSync(join(currentRoot, "a.md"), "Concurrent.\n");
    return terminate.call(this);
  });
  for (const dryRun of [true, false]) {
    currentRoot = consumer(t, { "a.md": "_first_\n", "b.md": "_second_\n" });
    const result = await runQuality({
      root: currentRoot,
      mode: "format",
      dryRun,
    });
    assert.equal(result.exitCode, 2, JSON.stringify(result));
    assert.equal(result.errors[0].code, "DEPENDENCY_CHANGED");
    assert.deepEqual(result.writtenPaths, []);
    assert.equal(readFileSync(join(currentRoot, "b.md"), "utf8"), "_second_\n");
  }
});
test("quiet retains strict blockers and JSON while suppressing only routine successful summaries", (t) => {
  const root = consumer(
    t,
    { "a.md": "# Title.\n\nPlain prose.\n" },
    { lint: { "quality/heading-trailing-punctuation": "warn" } },
  );
  const quiet = invoke(root, [
    "check",
    "--quiet",
    "--diagnostic-display-level",
    "error",
  ]);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(quiet.stdout, "");
  assert.ok(!quiet.stderr.includes("check completed"));
  const strict = invoke(root, [
    "check",
    "--quiet",
    "--strict",
    "--diagnostic-display-level",
    "error",
  ]);
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /Strict mode blocked/u);
  const normal = invoke(root, ["check", "--json"]),
    json = invoke(root, [
      "check",
      "--json",
      "--quiet",
      "--diagnostic-display-level",
      "error",
    ]);
  assert.equal(json.stdout, normal.stdout);
  assert.equal(json.stderr, "");
});

test("excluded raw paths still refuse directories and linked ancestors without changing legacy envelopes", (t) => {
  const root = consumer(t, {}, { exclude: ["skip/**"] });
  mkdirSync(join(root, "skip", "directory.md"), { recursive: true });
  mkdirSync(join(root, "target"));
  symlinkSync(
    join(root, "target"),
    join(root, "skip", "alias"),
    process.platform === "win32" ? "junction" : "dir",
  );
  for (const path of ["skip/directory.md", "skip/alias/a.md"]) {
    const raw = invoke(
      root,
      ["format", "--stdin", "--stdin-filepath", path],
      "Plain.\n",
    );
    assert.equal(raw.status, 2, raw.stderr);
    assert.equal(raw.stdout, "");
    assert.match(raw.stderr, /INVALID_FILE|UNSAFE_PATH/u);
    const envelope = invoke(
      root,
      ["format", "--stdin-request", "--json"],
      JSON.stringify({ path, contentBase64: "/w==" }),
    );
    assert.equal(envelope.status, 0, envelope.stderr);
    assert.equal(JSON.parse(envelope.stdout).document.contentBase64, "/w==");
  }
});
test("already-aborted empty output rejects before its fast path", async () => {
  const { writeOutput } = await import("../src/cli-streams.js");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(writeOutput({}, "", { signal: controller.signal }), {
    code: "CANCELLED",
  });
});
test("both bins preserve operational exit when their error sink is closed", async () => {
  for (const bin of [
    cli,
    fileURLToPath(new URL("../src/qualify-git-cli.js", import.meta.url)),
  ]) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [bin, "unknown-command"], {
        windowsHide: true,
      });
      child.on("error", reject);
      child.stdin.end();
      child.stdout.resume();
      child.stderr.destroy();
      child.on("close", (code) => resolve(code));
    });
    assert.equal(result, 2, bin);
  }
});
