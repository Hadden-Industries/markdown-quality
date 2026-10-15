// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

/** Select the local development or explicitly activated hosted virtual environment. */
export function repositoryPython(repositoryRoot = root) {
  const environment = process.env.VIRTUAL_ENV || join(repositoryRoot, ".venv");
  const executable = join(
    environment,
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  if (!existsSync(executable))
    throw new Error("An approved Python virtual environment is required.");
  return executable;
}

function parts(version) {
  if (!/^[1-9]\d*\.\d+\.\d+$/u.test(version))
    throw new Error("Python target must be a stable major.minor.patch version");
  const values = version.split(".").map(Number);
  if (!values.every(Number.isSafeInteger))
    throw new Error("Invalid Python target");
  return values;
}

export function pythonTarget(repositoryRoot = root) {
  const version = readFileSync(
    join(repositoryRoot, ".python-version"),
    "utf8",
  ).trim();
  parts(version);
  return version;
}

export function supportsPython(version, minimum = pythonTarget()) {
  const required = parts(minimum);
  if (!/^[1-9]\d*\.\d+\.\d+$/u.test(version)) return false;
  const observed = parts(version);
  for (let index = 0; index < required.length; index++) {
    if (observed[index] !== required[index])
      return observed[index] > required[index];
  }
  return true;
}

export function pythonProbeArgs(repositoryRoot = root) {
  return [
    "-c",
    "import sys; minimum = tuple(map(int, sys.argv[1].split('.'))); sys.exit(0 if sys.version_info >= minimum and sys.version_info.releaselevel == 'final' else 'Stable Python ' + sys.argv[1] + ' or newer is required')",
    pythonTarget(repositoryRoot),
  ];
}
