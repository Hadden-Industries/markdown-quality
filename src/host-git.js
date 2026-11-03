// SPDX-License-Identifier: AGPL-3.0-only
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fail } from "./contracts.js";
import { contained } from "./path-containment.js";

/** Resolve host Git without command search in candidate working directories. */
export function bindGitExecutable(root, executable) {
  const candidates =
    executable !== undefined
      ? [executable]
      : (process.env.PATH ?? process.env.Path ?? "")
          .split(delimiter)
          .filter(Boolean)
          .map((entry) =>
            join(entry, process.platform === "win32" ? "git.exe" : "git"),
          );
  const git = candidates.find(
    (path) =>
      typeof path === "string" &&
      isAbsolute(path) &&
      existsSync(path) &&
      lstatSync(path).isFile() &&
      !contained(resolve(root), realpathSync(path)) &&
      (process.platform !== "win32" || path.toLowerCase().endsWith(".exe")),
  );
  if (!git)
    fail(
      "INVENTORY_FAILED",
      "Cannot bind native host Git outside consumer inputs.",
    );
  return realpathSync(git);
}

/** Metadata-only Git reads; fsmonitor/replacements and ambient Git environment overrides are disabled. */
export function readGit(
  gitExecutablePath,
  root,
  args,
  { timeoutMs = null, maxOutputBytes = null } = {},
) {
  const env = Object.fromEntries(
    ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP"]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  // Null ceilings omit the package bound; the native API's unbounded buffer
  // representation is Infinity, which never crosses a JSON boundary.
  return execFileSync(
    gitExecutablePath,
    [
      "--no-optional-locks",
      "--no-replace-objects",
      "-c",
      "core.fsmonitor=false",
      "-C",
      root,
      ...args,
    ],
    {
      env,
      timeout: timeoutMs ?? 0,
      maxBuffer: maxOutputBytes ?? Infinity,
      windowsHide: true,
    },
  );
}
