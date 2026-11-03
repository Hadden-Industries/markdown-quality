// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  runQuality,
  inspectSelection,
  stageCandidateData,
  readExecutionProfile,
  qualifyGitMarkdown,
} from "../src/quality.js";
import { loadConfiguration } from "../src/configuration.js";
import { discoverConsumerRoot } from "../src/consumer-root.js";
import { canonicalJson } from "../src/contracts.js";
import { resolveResourcePolicy } from "../src/resource-controls.js";
import { fixtureCommandTimeoutMs } from "./helpers.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));

function fixture(t, files = {}) {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "markdown-quality-zero-config-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  }
  return root;
}

function run(cwd, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args, "--json"], {
    cwd,
    encoding: "utf8",
    timeout: fixtureCommandTimeoutMs,
    windowsHide: true,
  });
  return { status: result.status, report: JSON.parse(result.stdout) };
}

test("a dependency-only package consumer checks from a nested directory without configuration", (t) => {
  const root = fixture(t, {
    "package.json": "{}\n",
    "docs/guide.md": "# Guide\n\nText.\n",
    ".github/notes.md": "# Notes\n\nText.\n",
    "node_modules/tool/readme.md": "# Tool\n",
    "vendor/third.md": "# Third\n",
  });
  const nested = join(root, "docs");
  const { status, report } = run(nested, "check");
  assert.equal(status, 0, JSON.stringify(report.errors));
  assert.equal(report.operationStatus, "completed");
  assert.equal(report.qualityBasis, "input");
  assert.deepEqual(report.configurationOrigin, {
    kind: "default-absent",
    path: ".markdown-quality.json",
    source: null,
  });
  assert.equal(report.configurationBytesSha256, null);
  // Hidden authored directories are in scope; hard boundaries and the default
  // vendor exclusion are not.
  assert.deepEqual(report.selection.files, [
    ".github/notes.md",
    "docs/guide.md",
  ]);
  assert.deepEqual(
    report.selection.omissions.map(({ path, reason }) => [path, reason]),
    [["vendor/third.md", "excluded"]],
  );
  const inspected = run(nested, "inspect").report;
  assert.equal(inspected.root, root);
  assert.equal(inspected.qualityStatus, "not-checked");
});

test("the nearest Git checkout wins over a nested package root and needs no configuration", (t) => {
  const root = fixture(t, {
    "packages/app/package.json": "{}\n",
    "packages/app/readme.md": "# App\n\nText.\n",
    "top.md": "# Top\n\nText.\n",
  });
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  assert.equal(
    discoverConsumerRoot(undefined, { cwd: join(root, "packages/app") }).root,
    root,
  );
  assert.equal(
    discoverConsumerRoot(undefined, { cwd: join(root, "packages/app") }).method,
    "git",
  );
  const { status, report } = run(join(root, "packages/app"), "check");
  assert.equal(status, 0, JSON.stringify(report.errors));
  assert.deepEqual(report.selection.files, [
    "packages/app/readme.md",
    "top.md",
  ]);
  assert.deepEqual(
    report.selection.reconciliationDecisions.map((d) => d.decision),
    ["selected", "selected"],
  );
  // An explicit subdirectory root selects exactly that directory.
  const explicit = run(root, "check", "--root", "packages/app").report;
  assert.deepEqual(explicit.selection.files, ["readme.md"]);
});

test("a bare directory falls back to the invocation directory without Git", (t) => {
  const root = fixture(t, { "a.md": "# A\n" });
  const found = discoverConsumerRoot(undefined, { cwd: root });
  // A home-directory package.json can legitimately own a temporary directory;
  // the fallback order is still explicit.
  assert.ok(["cwd", "package", "git"].includes(found.method));
  assert.equal(discoverConsumerRoot(root).method, "explicit");
});

test("absent, empty and explicit-equivalent configuration share effective identity only", async (t) => {
  const root = fixture(t, { "a.md": "# A\n\nText.\n" });
  const absent = await runQuality({ root });
  writeFileSync(join(root, ".markdown-quality.json"), "{}\n");
  const empty = await runQuality({ root });
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({
      schemaVersion: 3,
      preset: "authored-gfm@2",
      include: ["**/*.md"],
      links: { checkLocalTargets: true },
    }),
  );
  const explicit = await runQuality({ root });
  for (const report of [absent, empty, explicit])
    assert.equal(report.exitCode, 0, JSON.stringify(report.errors));
  assert.equal(
    absent.effectiveConfigurationSha256,
    empty.effectiveConfigurationSha256,
  );
  assert.equal(
    empty.effectiveConfigurationSha256,
    explicit.effectiveConfigurationSha256,
  );
  assert.equal(absent.configurationOrigin.kind, "default-absent");
  assert.equal(empty.configurationOrigin.kind, "file");
  assert.equal(
    empty.configurationBytesSha256,
    createHash("sha256").update("{}\n").digest("hex"),
  );
  assert.notEqual(
    empty.configurationBytesSha256,
    explicit.configurationBytesSha256,
  );
  assert.equal(
    absent.defaultConfigurationSha256,
    explicit.defaultConfigurationSha256,
  );
  // A changed effective setting changes the effective identity.
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({ lint: { "quality/long-prose-line": "off" } }),
  );
  const changed = await runQuality({ root });
  assert.notEqual(
    changed.effectiveConfigurationSha256,
    absent.effectiveConfigurationSha256,
  );
});

test("canonical identity serialization orders keys and rejects non-JSON data", () => {
  // Independent vector: code-unit key order, array order kept, no whitespace.
  assert.equal(
    canonicalJson({ b: 1, a: [true, null, "x"], c: { z: "é", y: 0 } }),
    '{"a":[true,null,"x"],"b":1,"c":{"y":0,"z":"é"}}',
  );
  assert.throws(() => canonicalJson({ a: Infinity }), /finite JSON/u);
  assert.throws(() => canonicalJson(new Date(0)), /plain JSON/u);
});

test("only proven default absence selects defaults; present bad input fails", async (t) => {
  const root = fixture(t, { "a.md": "# A\n" });
  const cases = [
    [{ config: "missing.json" }, null, "MISSING_CONFIG"],
    [{}, "{", "INVALID_CONFIG"],
    [{}, JSON.stringify({ schemaVersion: 2 }), "UNSUPPORTED_CONFIG_VERSION"],
    [{}, JSON.stringify({ preset: "authored-gfm@1" }), "UNSUPPORTED_PRESET"],
    [{}, JSON.stringify({ limits: false }), "INVALID_CONFIG"],
    [{}, JSON.stringify({ links: { localFiles: true } }), "INVALID_CONFIG"],
    [{}, JSON.stringify({ links: { rootRelative: "root" } }), "INVALID_CONFIG"],
    [{}, JSON.stringify({ include: [] }), "INVALID_CONFIG"],
    [{}, JSON.stringify({ unknown: true }), "INVALID_CONFIG"],
  ];
  for (const [options, bytes, code] of cases) {
    rmSync(join(root, ".markdown-quality.json"), { force: true });
    if (bytes !== null)
      writeFileSync(join(root, ".markdown-quality.json"), bytes);
    const report = await runQuality({ root, ...options });
    assert.equal(report.exitCode, 2, code);
    assert.equal(report.errors[0].code, code, report.errors[0].message);
    assert.equal(report.qualityStatus, "not-checked");
  }
  rmSync(join(root, ".markdown-quality.json"), { force: true });
  mkdirSync(join(root, ".markdown-quality.json"));
  const directory = await runQuality({ root });
  assert.equal(directory.errors[0].code, "INVALID_FILE");
});

test("resolved configuration snapshots are immutable and independent", (t) => {
  const first = fixture(t, {
    ".markdown-quality.json": JSON.stringify({ exclude: ["x/**"] }),
  });
  const second = fixture(t, {});
  const a = loadConfiguration({ root: first });
  const b = loadConfiguration({ root: second });
  assert.throws(() => a.config.exclude.push("y/**"), TypeError);
  assert.throws(() => {
    a.config.lint["quality/non-nfc-prose"] = "off";
  }, TypeError);
  assert.deepEqual(a.config.exclude, ["x/**"]);
  assert.deepEqual(b.config.exclude, [
    "**/vendor/**",
    "**/.cache/**",
    "**/coverage/**",
  ]);
  // exclude: [] clears ordinary exclusions but not hard operational boundaries.
  const cleared = fixture(t, {
    ".markdown-quality.json": JSON.stringify({ exclude: [] }),
    "vendor/a.md": "# A\n",
    "node_modules/b.md": "# B\n",
  });
  return inspectSelection({ root: cleared }).then((report) => {
    assert.deepEqual(report.selection.files, ["vendor/a.md"]);
  });
});

test("a configuration created during an operation refuses stale success", async (t) => {
  const root = fixture(t, { "a.md": "# A\n\nText.\n" });
  const pending = runQuality({ root });
  // Resolution observed proven absence synchronously before the first await.
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({ lint: { "quality/long-prose-line": "off" } }),
  );
  const report = await pending;
  assert.equal(report.exitCode, 2);
  assert.equal(report.errors[0].code, "CONFIG_CHANGED");
  assert.equal(report.operationStatus, "failed");
  // A changed configuration file is refused the same way.
  const again = runQuality({ root });
  writeFileSync(join(root, ".markdown-quality.json"), "{}\n");
  assert.equal((await again).errors[0].code, "CONFIG_CHANGED");
});

test("a sparse saved execution profile persists unlimited mode for ordinary operations", async (t) => {
  const root = fixture(t, {
    "a.md": "# A\n\nText.\n",
    ".markdown-quality-execution.json": JSON.stringify({
      resourceLimitMode: "unlimited",
    }),
  });
  const report = await inspectSelection({ root });
  assert.equal(report.exitCode, 0, JSON.stringify(report.errors));
  assert.equal(report.resourcePolicy.resourceLimitMode, "unlimited");
  assert.deepEqual(report.resourcePolicy.executionProfile.kind, "file");
  assert.ok(
    Object.values(report.configuration.analyzerLimits).every(
      (value) => value === null,
    ),
  );
  assert.ok(
    Object.values(report.resourcePolicy.executionLimits).every(
      (value) => value === null,
    ),
  );
  // Invocation configured mode restores package defaults above the saved profile.
  const configured = await inspectSelection({
    root,
    resourceLimitMode: "configured",
  });
  assert.equal(
    configured.configuration.analyzerLimits.maxDocumentBytes,
    2097152,
  );
  assert.equal(configured.resourcePolicy.resourceLimitModeOrigin, "invocation");
  // The same choice works through the CLI and the request runner.
  const viaCli = run(root, "check", "--root", ".");
  assert.equal(viaCli.status, 0);
  assert.equal(viaCli.report.resourcePolicy.resourceLimitMode, "unlimited");
});

test("ceilings accept finite, null and unlimited overrides without hidden fallback", async (t) => {
  const root = fixture(t, { "a.md": "# A\n\n" + "Text. ".repeat(20) + "\n" });
  const tiny = await runQuality({
    root,
    executionProfile: { analyzerLimits: { maxDocumentBytes: 1 } },
  });
  assert.equal(tiny.errors[0].code, "DOCUMENT_LIMIT");
  const disabled = await runQuality({
    root,
    executionProfile: { analyzerLimits: { maxDocumentBytes: null } },
  });
  assert.notEqual(disabled.exitCode, 2, JSON.stringify(disabled.errors));
  assert.equal(disabled.configuration.analyzerLimits.maxDocumentBytes, null);
  assert.equal(disabled.resourcePolicy.executionProfile.kind, "inline");
  assert.equal(
    disabled.resourcePolicy.origins["analyzerLimits.maxDocumentBytes"],
    "execution-profile",
  );
  const contradiction = await runQuality({
    root,
    executionProfile: {
      resourceLimitMode: "unlimited",
      analyzerLimits: { maxDocumentBytes: 5 },
    },
  });
  assert.equal(contradiction.errors[0].code, "INVALID_RESOURCE_POLICY");
  // A higher layer may set an individual finite ceiling again over unlimited mode.
  const policy = resolveResourcePolicy([
    { origin: "execution-profile", resourceLimitMode: "unlimited" },
    { origin: "invocation", analyzerLimits: { maxDocumentBytes: 7 } },
  ]);
  assert.equal(policy.analyzerLimits.maxDocumentBytes, 7);
  assert.equal(policy.analyzerLimits.maxTotalDocumentBytes, null);
  assert.equal(policy.executionLimits.maxRequestBytes, null);
  assert.equal(policy.origins.maxRequestBytes, "unlimited:execution-profile");
  // Derived Git inventory output follows the configured inventory ceiling.
  const derived = resolveResourcePolicy([
    { origin: "invocation", analyzerLimits: { maxInventoryBytes: 123 } },
  ]);
  assert.equal(derived.executionLimits.maxGitInventoryOutputBytes, 123);
  assert.equal(derived.origins.maxGitInventoryOutputBytes, "derived");
});

test("bootstrap ceilings apply before reading a profile and cannot be self-authorized", (t) => {
  const root = fixture(t, {
    "package.json": "{}\n",
    "a.md": "# A\n",
    "big.json": JSON.stringify({ resourceLimitMode: "configured" }),
  });
  const refused = run(
    root,
    "check",
    "--execution-profile",
    "big.json",
    "--max-profile-bytes",
    "5",
  );
  assert.equal(refused.status, 2);
  assert.equal(refused.report.errors[0].code, "PROFILE_LIMIT");
  const admitted = run(
    root,
    "check",
    "--execution-profile",
    "big.json",
    "--max-profile-bytes",
    "4096",
  );
  assert.notEqual(admitted.status, 2, JSON.stringify(admitted.report.errors));
  const removed = run(root, "check", "--no-limits");
  assert.equal(removed.status, 2);
  assert.match(removed.report.errors[0].message, /--no-analyzer-limits/u);
});

test("closed SDK admission rejects removed and unknown option spellings", async (t) => {
  const root = fixture(t, { "a.md": "# A\n" });
  for (const [options, pattern] of [
    [{ inventory: "git" }, /reconciliationInventory/u],
    [{ limits: false }, /analyzerLimits/u],
    [{ gitExecutable: "git" }, /gitExecutablePath/u],
    [{ unknownOption: 1 }, /Unknown operation option/u],
    [{ dryRun: true }, /normalize/u],
  ]) {
    const report = await runQuality({ root, ...options });
    assert.equal(report.exitCode, 2);
    assert.equal(report.errors[0].code, "INVALID_OPTION");
    assert.match(report.errors[0].message, pattern);
  }
  const profile = await runQuality({
    root,
    executionProfile: { samples: 1 },
  });
  assert.match(profile.errors[0].message, /requiredConsecutiveSamples/u);
  // Trusted and profile entry points refuse removed spellings explicitly too.
  assert.throws(
    () => stageCandidateData({ sourceRoot: root }),
    /sourceRoot was removed; use candidateRoot/u,
  );
  assert.throws(
    () => readExecutionProfile({ root, samples: 1 }),
    /Unknown option: samples/u,
  );
  await assert.rejects(
    qualifyGitMarkdown({ candidateSha: "0".repeat(40) }),
    /candidateSha was removed; use candidateCommitId/u,
  );
});
