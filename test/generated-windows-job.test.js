// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkWindowsJob,
  embedWindowsJob,
} from "../scripts/generate-windows-job.js";
test("both standalone drivers contain the exact canonical Windows implementation", () => {
  checkWindowsJob();
  const target =
    "before\n# BEGIN GENERATED WINDOWS JOB\nold\n# END GENERATED WINDOWS JOB\nafter\n";
  const expected =
    "before\n# BEGIN GENERATED WINDOWS JOB\nnew\n# END GENERATED WINDOWS JOB\nafter\n";
  assert.equal(embedWindowsJob(target, "new\n"), expected);
  assert.equal(embedWindowsJob(expected, "new\n"), expected);
  for (const invalid of [
    "",
    target + target,
    target.replace("# END GENERATED WINDOWS JOB\n", ""),
    "# END GENERATED WINDOWS JOB\n# BEGIN GENERATED WINDOWS JOB\n",
  ])
    assert.throws(() => embedWindowsJob(invalid, "new"));
});
test(
  "supported Windows x64 ABI and raw Job operations run in a disposable child",
  { skip: process.platform !== "win32" },
  () => {
    for (const mode of [[], ["abort"]]) {
      const result = spawnSync(
        "python",
        [
          "-I",
          "-B",
          fileURLToPath(new URL("./windows-job.py", import.meta.url)),
          ...mode,
        ],
        { encoding: "utf8", timeout: 15000, windowsHide: true },
      );
      assert.equal(
        result.status,
        mode.length ? 2 : 0,
        result.stdout + result.stderr,
      );
      assert.match(
        result.stdout,
        mode.length ? /aborting-owned-job/u : /quiescent-owned-job/u,
      );
    }
  },
);
