// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { impactFixture } from "./dependency-impact-helpers.js";
import { planAffected, runAffected } from "../scripts/affected-tests.js";
import { consumer } from "./helpers.js";

test("shared generator and native resources select and execute the conservative full obligation", async (t) => {
  for (const path of [
    "scripts/schema-sources/configuration.json",
    "scripts/windows-job-source.py",
    "scripts/native-evidence-contract.json",
    "scripts/resource-');throw new Error('injected').json",
    "scripts/resource-`${process.exit(99)}-\u2028\u2029.json",
  ]) {
    const fixture = impactFixture(t, {
      [path]: "canonical\n",
      "test/resource-path.json": JSON.stringify(path),
      "test/resource.test.js": `import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; const path = JSON.parse(readFileSync('test/resource-path.json','utf8')); test('independent resource bytes',()=>assert.equal(readFileSync(path,'utf8'),'canonical\\n'));\n`,
    });
    const baseline = await runAffected(
      await planAffected({
        root: fixture.root,
        base: fixture.base,
        paths: [path],
      }),
    );
    assert.equal(baseline.outcome.code, 0, baseline.outcome.selected.stdout);
    fixture.put(path, "drift\n");
    const plan = await planAffected({ root: fixture.root, base: fixture.base });
    assert.equal(plan.mode, "full", path);
    assert.ok(plan.selected.includes("test/resource.test.js"));
    const result = await runAffected(plan);
    assert.equal(result.outcome.code, 1);
    assert.match(result.outcome.selected.stdout, /drift/u);
  }
});

test("native build/freezer importlib loading resolves vocabulary from their own files", (t) => {
  const cwd = consumer(t);
  const root = fileURLToPath(new URL("../", import.meta.url));
  const result = spawnSync(
    "python",
    [
      "-I",
      "-B",
      "-c",
      `import importlib.util, pathlib, sys\nroot=pathlib.Path(sys.argv[1])\nfor name in ('build-native','freeze-native'):\n spec=importlib.util.spec_from_file_location(name,root/'scripts'/f'{name}.py')\n module=importlib.util.module_from_spec(spec)\n spec.loader.exec_module(module)\n assert len(module.VOCABULARY['baseMembers']) == 8\n print(name)\n`,
      root,
    ],
    { cwd, encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.replaceAll("\r\n", "\n"),
    "build-native\nfreeze-native\n",
  );
});
