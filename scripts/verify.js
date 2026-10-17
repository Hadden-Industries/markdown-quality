// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, delimiter } from "node:path";
import { resolveTool } from "../src/native-tool.js";
import { digest } from "../src/contracts.js";
import { pythonProbeArgs, repositoryPython } from "./python-target.js";
const root = fileURLToPath(new URL("../", import.meta.url));
if (
  process.argv.length > 3 ||
  (process.argv[2] && process.argv[2] !== "--product")
)
  throw new Error("Use check:full or check:product.");
const productOnly = process.argv[2] === "--product";
const python = repositoryPython(root);
// Existing product subprocesses inherit the same explicitly selected environment.
process.env.VIRTUAL_ENV = dirname(dirname(python));
process.env.PATH = dirname(python) + delimiter + process.env.PATH;
function node(args) {
  const started = performance.now();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    timeout: 600_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    console.error(
      "Verification command failed: " +
        JSON.stringify({
          command:
            args[0] === "--test"
              ? "Node test suite"
              : args.slice(0, 2).join(" "),
          elapsedMs: Math.round(performance.now() - started),
          status: result.status,
          signal: result.signal,
          error: result.error?.code ?? null,
        }),
    );
    process.exit(result.status ?? 2);
  }
}
if (
  digest(readFileSync(new URL("../LICENSE", import.meta.url))) !==
  "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef"
)
  throw new Error("Original AGPL-3.0-only license bytes changed.");
resolveTool();
node(["scripts/project-node-support.js", "--check"]);
const pythonRuntime = spawnSync(python, pythonProbeArgs(), {
  cwd: root,
  stdio: "inherit",
  timeout: 30_000,
  windowsHide: true,
});
if (pythonRuntime.error || pythonRuntime.status !== 0)
  process.exit(pythonRuntime.status ?? 2);
const nativeEvidence = spawnSync(python, ["test/native-evidence.py"], {
  cwd: root,
  stdio: "inherit",
  timeout: 30_000,
  windowsHide: true,
});
if (nativeEvidence.error || nativeEvidence.status !== 0)
  process.exit(nativeEvidence.status ?? 2);
const packageEvidence = spawnSync(python, ["test/package-archive.py"], {
  cwd: root,
  stdio: "inherit",
  timeout: 30000,
  windowsHide: true,
});
if (packageEvidence.error || packageEvidence.status !== 0)
  process.exit(packageEvidence.status ?? 2);
const textEvidence = spawnSync(python, ["-B", "test/text-output.py"], {
  cwd: root,
  stdio: "inherit",
  timeout: 30000,
  windowsHide: true,
});
if (textEvidence.error || textEvidence.status !== 0)
  process.exit(textEvidence.status ?? 2);
for (const folder of ["src", "scripts", "test"])
  for (const path of readdirSync(
    new URL("../" + folder + "/", import.meta.url),
  ))
    if (/\.(?:js|mjs|cjs)$/u.test(path)) node(["--check", folder + "/" + path]);
node([
  "node_modules/prettier/bin/prettier.cjs",
  "--check",
  "src",
  "scripts",
  "test",
  "tooling/json/*.mjs",
  "schemas",
  "assets",
  "docs",
  "package.json",
  ".markdown-quality.json",
  ".github/dependabot.yml",
  ".github/ISSUE_TEMPLATE",
  ".github/workflows/markdown-quality.yml",
  ".github/workflows/candidate.yml",
  ".github/workflows/check.yml",
  ".github/workflows/release-registry.yml",
  ".github/workflows/github-release.yml",
  ".github/workflows/promote-release.yml",
  ".github/workflows/native.yml",
  ".github/workflows/publish.yml",
  ".github/workflows/release-qualification.yml",
  ".github/actions",
  ".github/bootstrap-node.json",
  ".dependency-cruiser.json",
  ".test-impact.json",
]);
node([
  "--test",
  "--test-reporter=./scripts/test-outcomes.js",
  ...readdirSync(new URL("../test/", import.meta.url))
    .filter((p) => p.endsWith(".test.js"))
    .map((p) => "test/" + p),
]);
node(["src/cli.js", "check", "--inventory", "git"]);
if (!productOnly) {
  node(["scripts/lint-json-identity.mjs"]);
  node([
    "--test",
    ...readdirSync(new URL("../test/json-tooling/", import.meta.url))
      .filter((path) => path.endsWith(".test.mjs"))
      .map((path) => "test/json-tooling/" + path),
  ]);
  node(["scripts/qualify-json-packages.mjs"]);
  // Mandatory final JSON result follows every local product/test producer.
  node(["scripts/runRepositoryJsonQuality.mjs", "check"]);
}
