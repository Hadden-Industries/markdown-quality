// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveTool } from "../src/native-tool.js";
import { digest } from "../src/contracts.js";
const root = fileURLToPath(new URL("../", import.meta.url));
function node(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    timeout: 600_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) process.exit(result.status ?? 2);
}
if (
  digest(readFileSync(new URL("../LICENSE", import.meta.url))) !==
  "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef"
)
  throw new Error("Original AGPL-3.0-only license bytes changed.");
resolveTool();
const nativeEvidence = spawnSync("python", ["test/native-evidence.py"], {
  cwd: root,
  stdio: "inherit",
  timeout: 30_000,
  windowsHide: true,
});
if (nativeEvidence.error || nativeEvidence.status !== 0)
  process.exit(nativeEvidence.status ?? 2);
for (const folder of ["src", "scripts", "test"])
  for (const path of readdirSync(
    new URL("../" + folder + "/", import.meta.url),
  ))
    if (path.endsWith(".js")) node(["--check", folder + "/" + path]);
node([
  "node_modules/prettier/bin/prettier.cjs",
  "--check",
  "src",
  "scripts",
  "test",
  "schemas",
  "assets",
  "package.json",
  "docs",
  "README.md",
  "THIRD-PARTY-NOTICES.md",
]);
node([
  "--test",
  ...readdirSync(new URL("../test/", import.meta.url))
    .filter((p) => p.endsWith(".test.js"))
    .map((p) => "test/" + p),
]);
node(["src/cli.js", "check"]);
