// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { prepareCodeqlModelTests } from "./codeql-model-fixtures.js";
import { parseDocument } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const pack = join(root, ".github/codeql/actions");
const queryId = "actions/cache-poisoning/poisonable-step";
const importLine = "import QualificationAdmission\n";
const prefix =
  "// SPDX-License-Identifier: MIT\n// Source: github/codeql@a1575b98a8cc19bcfa7bb6cb41be688cb3dae65c; see ../LICENSE-MIT.txt.\n";

/** Select the native distribution's query pack, never a project or cache fallback. */
export function bundledActionsPack(resolution, distribution) {
  const bundled = resolution.steps
    .filter((step) => step.type === "by-name")
    .flatMap((step) => step.scans ?? [])
    .map((scan) => scan.found?.["codeql/actions-queries"])
    .filter(
      (entry) =>
        entry?.kind === "query" &&
        isAbsolute(entry.path) &&
        resolve(entry.path).startsWith(resolve(distribution) + sep),
    );
  assert.equal(
    bundled.length,
    1,
    "An independent native CodeQL bundle is required; cached query packs cannot establish parity",
  );
  return dirname(bundled[0].path);
}

export function verifyCodeqlQueryInventory(
  stock,
  selected,
  read = (path) => readFileSync(path, "utf8"),
) {
  const inventory = (paths) => {
    assert.ok(Array.isArray(paths) && paths.length > 0);
    const result = new Map();
    for (const path of paths) {
      assert.ok(isAbsolute(path) && path.endsWith(".ql"));
      const bytes = read(path);
      const id = /^\s*\*\s+@id\s+(\S+)\s*$/mu.exec(bytes)?.[1];
      assert.ok(
        id && !result.has(id),
        "Missing or duplicate CodeQL rule identity",
      );
      result.set(id, { path, bytes });
    }
    return result;
  };
  const expected = inventory(stock),
    actual = inventory(selected);
  const owner = (path) => {
    for (
      let directory = dirname(path), depth = 0;
      depth < 12;
      depth++, directory = dirname(directory)
    ) {
      try {
        const document = parseDocument(read(join(directory, "qlpack.yml")), {
          uniqueKeys: true,
        });
        assert.equal(document.errors.length, 0);
        const { name, version } = document.toJS();
        assert.ok(name && version, "Missing CodeQL query pack identity");
        return { name, version };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    throw new Error("Native query pack identity unavailable");
  };
  assert.deepEqual(
    [...actual.keys()].sort(),
    [...expected.keys()].sort(),
    "Native CodeQL rule inventory changed",
  );
  let replacements = 0;
  for (const [id, original] of expected) {
    const current = actual.get(id);
    if (id !== queryId) {
      assert.deepEqual(
        owner(current.path),
        owner(original.path),
        "Native CodeQL query pack changed",
      );
      assert.equal(
        current.bytes,
        original.bytes,
        `Native query changed: ${id}`,
      );
    } else {
      assert.equal(
        current.path,
        join(pack, "queries/CachePoisoningViaPoisonableStep.ql"),
      );
      assert.ok(current.bytes.startsWith(prefix));
      const body = current.bytes.slice(prefix.length);
      assert.equal(body.split(importLine).length, 2);
      assert.equal(
        body.replace(importLine, ""),
        original.bytes,
        "Native cache query semantics changed",
      );
      replacements++;
    }
  }
  assert.equal(replacements, 1);
  return { rules: expected.size, modeledQueries: replacements };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    "Use check-codeql-model.js CODEQL TEMPORARY_ROOT",
  );
  const cli = resolve(process.argv[2]);
  assert.ok(isAbsolute(process.argv[2]) && isAbsolute(process.argv[3]));
  mkdirSync(process.argv[3], { recursive: true });
  const temporaryRoot = realpathSync(process.argv[3]),
    sourceRoot = realpathSync(root);
  assert.ok(
    temporaryRoot !== sourceRoot && !temporaryRoot.startsWith(sourceRoot + sep),
    "Model tests must stay outside the analyzed checkout",
  );
  const scratch = mkdtempSync(join(temporaryRoot, "codeql-model-"));
  const caches = join(temporaryRoot, "codeql-common-caches");
  const run = (args, cwd = root, capture = false) =>
    native(cli, [...args, "--common-caches=" + caches], {
      cwd,
      timeout: 600000,
      maxBuffer: 8 * 1024 * 1024,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
  try {
    const distribution = realpathSync(dirname(cli));
    const baselinePack = realpathSync(
      bundledActionsPack(
        JSON.parse(
          run(
            ["resolve", "packs", "--format=json", "--kind=query"],
            scratch,
            true,
          ),
        ),
        distribution,
      ),
    );
    assert.ok(
      baselinePack.startsWith(distribution + sep),
      "Native baseline escaped its distribution",
    );
    const metadata = parseDocument(
      readFileSync(join(baselinePack, "qlpack.yml"), "utf8"),
      { uniqueKeys: true },
    );
    assert.equal(metadata.errors.length, 0);
    const { defaultSuiteFile } = metadata.toJS();
    assert.equal(typeof defaultSuiteFile, "string");
    const nativeSuite = resolve(baselinePack, defaultSuiteFile);
    assert.ok(nativeSuite.startsWith(baselinePack + sep));
    run(["pack", "install", pack, "--mode=use-lock"]);
    const resolveQueries = (specifier, cwd) =>
      run(["resolve", "queries", "--format=text", specifier], cwd, true)
        .trim()
        .split(/\r?\n/u)
        .map((path) => resolve(path));
    const stock = resolveQueries(nativeSuite, scratch);
    const selected = resolveQueries(join(pack, "actions.qls"));
    const inventory = verifyCodeqlQueryInventory(stock, selected);
    run([
      "query",
      "compile",
      "--check-only",
      join(pack, "queries/CachePoisoningViaPoisonableStep.ql"),
    ]);
    const testPack = join(scratch, "pack");
    const cases = prepareCodeqlModelTests(pack, testPack);
    run(
      ["test", "run", join(testPack, "tests"), "--threads=2", "--ram=2048"],
      scratch,
    );
    console.log(JSON.stringify({ ...inventory, fixtures: cases.length }));
  } finally {
    assert.ok(
      scratch.startsWith(temporaryRoot + sep) &&
        dirname(scratch) === temporaryRoot,
    );
    rmSync(scratch, { recursive: true, force: true });
  }
}
