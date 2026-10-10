// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { consumer } from "./helpers.js";

for (const [minor, patch, releaselevel] of [
  [14, 9, "final"],
  [15, 0, "alpha"],
  [15, 0, "beta"],
  [15, 0, "candidate"],
])
  test(`full verification rejects Python 3.${minor}.${patch} ${releaselevel} before running checks`, (t) => {
    const root = consumer(t, {
      "sitecustomize.py":
        "import sys\nfrom collections import namedtuple\n" +
        "Version = namedtuple('Version', 'major minor micro releaselevel serial')\n" +
        `sys.version_info = Version(3, ${minor}, ${patch}, '${releaselevel}', 0)\n`,
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
    assert.match(result.stderr, /Stable Python 3\.15\.0 or newer is required/u);
  });
