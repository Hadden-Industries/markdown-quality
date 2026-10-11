// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { consumer } from "./helpers.js";
import { pythonTarget } from "../scripts/python-target.js";

const minimum = pythonTarget();
const [major, minor, patch] = minimum.split(".").map(Number);

for (const [version, releaselevel] of [
  [patch ? [major, minor, patch - 1] : [major, minor - 1, 9], "final"],
  [[major, minor, patch], "alpha"],
  [[major, minor, patch], "beta"],
  [[major, minor, patch], "candidate"],
])
  test(`full verification rejects Python ${version.join(".")} ${releaselevel} before running checks`, (t) => {
    const root = consumer(t, {
      "sitecustomize.py":
        "import sys\nfrom collections import namedtuple\n" +
        "Version = namedtuple('Version', 'major minor micro releaselevel serial')\n" +
        `sys.version_info = Version(${version.join(", ")}, '${releaselevel}', 0)\n`,
    });
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/verify.js", import.meta.url))],
      {
        env: { ...process.env, PYTHONPATH: root, PYTHONDONTWRITEBYTECODE: "1" },
        encoding: "utf8",
        timeout: 30000,
        windowsHide: true,
      },
    );
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(
      result.stderr.includes(`Stable Python ${minimum} or newer is required`),
    );
  });
