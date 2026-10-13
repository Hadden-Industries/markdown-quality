// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
export const git = execFileSync(
  process.platform === "win32" ? "where.exe" : "which",
  ["git"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/u)[0];
export const python = execFileSync(
  "python",
  ["-c", "import sys; print(sys.executable)"],
  { encoding: "utf8" },
).trim();
export const pythonVersion = execFileSync(python, ["--version"], {
  encoding: "utf8",
})
  .trim()
  .replace("Python ", "");
export function freezeFixture(root, message) {
  const run = (...args) =>
    execFileSync(git, ["-c", "core.autocrlf=false", "-C", root, ...args], {
      windowsHide: true,
    });
  run("init", "-q");
  run("add", "--all");
  run(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    message,
  );
  return run("rev-parse", "HEAD").toString().trim();
}
