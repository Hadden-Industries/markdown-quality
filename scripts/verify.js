// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, delimiter } from "node:path";
import { resolveTool } from "../src/native-tool.js";
import { digest } from "../src/contracts.js";
import { pythonProbeArgs, repositoryPython } from "./python-target.js";
import { observeCommand } from "./ci-observation.js";
import { npmCommand } from "./commands.js";
import { testFiles } from "./verification-suites.js";
const root = fileURLToPath(new URL("../", import.meta.url));
if (
  process.argv.length > 3 ||
  (process.argv[2] &&
    !["--product", "--runtime", "--source", "--qualification"].includes(
      process.argv[2],
    ))
)
  throw new Error(
    "Use check:full, check:product, check:runtime, check:source or check:qualification.",
  );
const productOnly = process.argv[2] === "--product";
const qualificationOnly = process.argv[2] === "--qualification";
function checkSourceQuality() {
  if (
    digest(readFileSync(new URL("../LICENSE", import.meta.url))) !==
    "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef"
  )
    throw new Error("Original AGPL-3.0-only license bytes changed.");
  node(["scripts/project-package-version.js", "--check"]);
  node(["scripts/project-node-support.js", "--check"]);
  node(["scripts/check-workflows.js"]);
  node(["scripts/check-architecture.js"]);
  npmCommand(["run", "format:code:check"], {
    cwd: root,
    stdio: "inherit",
    timeout: 600_000,
  });
  if (!productOnly) {
    npmCommand(["run", "lint:json:identity"], {
      cwd: root,
      stdio: "inherit",
      timeout: 600_000,
    });
  }
}
// The source stage needs only the locked Node toolchain. Qualification retains
// its Python admission and every native/producer check.
if (process.argv[2] === "--source") {
  checkSourceQuality();
  process.exit(0);
}
const python = repositoryPython(root);
// Reject an unsupported interpreter before launching any verification checks.
const pythonRuntime = spawnSync(python, pythonProbeArgs(), {
  cwd: root,
  stdio: "inherit",
  timeout: 30_000,
  windowsHide: true,
});
if (pythonRuntime.error || pythonRuntime.status !== 0)
  process.exit(pythonRuntime.status ?? 2);
// Existing product subprocesses inherit the same explicitly selected environment.
process.env.VIRTUAL_ENV = dirname(dirname(python));
process.env.PATH = dirname(python) + delimiter + process.env.PATH;
function node(args) {
  const started = performance.now();
  const timeout = args[0] === "--test" ? 1_800_000 : 600_000;
  const observed =
    args[0] === "--check"
      ? () => {}
      : observeCommand(
          args[0] === "--test" ? "Node test suite" : args.slice(0, 2).join(" "),
          // Historical baseline for comparing future instrumented observations.
          600_000,
          timeout,
        );
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    timeout,
    windowsHide: true,
  });
  observed(result);
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
if (process.argv[2] === "--runtime") {
  resolveTool();
  node([
    "--test",
    "--test-reporter=./scripts/test-outcomes.js",
    ...testFiles(true),
  ]);
  process.exit(0);
}
if (!qualificationOnly) checkSourceQuality();
resolveTool();
node([
  "src/cli.js",
  "check",
  "--reconcile-inventory",
  "git",
  "--diagnostic-display-level",
  "warning",
]);
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
node(["--test", "--test-reporter=./scripts/test-outcomes.js", ...testFiles()]);
if (!productOnly) {
  // JSON integration checks admit the actual packed tuple, including its
  // generated manifests; produce those inputs before the first consumer.
  node(["scripts/qualify-json-packages.mjs"]);
  node([
    "--test",
    ...readdirSync(new URL("../test/json-tooling/", import.meta.url))
      .filter((path) => path.endsWith(".test.mjs"))
      .map((path) => "test/json-tooling/" + path),
  ]);
  // Mandatory final JSON result follows every local product/test producer.
  node(["scripts/runRepositoryJsonQuality.mjs", "check"]);
}
