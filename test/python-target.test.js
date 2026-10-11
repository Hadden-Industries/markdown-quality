// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  pythonProbeArgs,
  pythonTarget,
  supportsPython,
} from "../scripts/python-target.js";
import { consumer } from "./helpers.js";

test("a changed repository pin drives proof admission and the native Python guard", (t) => {
  const root = consumer(t, {
    ".python-version": "3.16.2\n",
    "sitecustomize.py":
      "import sys\nfrom collections import namedtuple\n" +
      "Version = namedtuple('Version', 'major minor micro releaselevel serial')\n" +
      "sys.version_info = Version(3, 16, 1, 'final', 0)\n",
  });
  assert.equal(pythonTarget(root), "3.16.2");
  assert.equal(supportsPython("3.16.1", pythonTarget(root)), false);
  assert.equal(supportsPython("3.16.2", pythonTarget(root)), true);
  assert.equal(supportsPython("3.16.3", pythonTarget(root)), true);
  assert.equal(supportsPython("3.16.2rc1", pythonTarget(root)), false);
  const probe = () =>
    spawnSync("python", pythonProbeArgs(root), {
      env: { ...process.env, PYTHONPATH: root, PYTHONDONTWRITEBYTECODE: "1" },
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
    });
  assert.equal(probe().status, 1);
  assert.match(probe().stderr, /Stable Python 3\.16\.2 or newer is required/u);
  writeFileSync(join(root, ".python-version"), "3.16.1\n");
  assert.equal(probe().status, 0);
});

test("partial, prerelease and malformed maintained pins fail closed", (t) => {
  const root = consumer(t);
  for (const version of ["3.16", "3.16.2rc1", ">=3.16.2", "3.16.2\n3.17.0"]) {
    writeFileSync(join(root, ".python-version"), version);
    assert.throws(() => pythonTarget(root), /stable major.minor.patch/u);
  }
});
