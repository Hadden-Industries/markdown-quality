// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  bundledActionsPack,
  verifyCodeqlQueryInventory,
} from "../scripts/check-codeql-model.js";
import { checkWorkflows } from "../scripts/check-workflows.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const replacement = join(
  root,
  ".github/codeql/actions/queries/CachePoisoningViaPoisonableStep.ql",
);
const local = readFileSync(replacement, "utf8");
const original = local
  .split("\n")
  .slice(2)
  .join("\n")
  .replace("import QualificationAdmission\n", "");

test("native baseline selection rejects cached, foreign and ambiguous pack substitutes", () => {
  const distribution = join(root, "codeql-distribution");
  const nativePack = join(
    distribution,
    "qlpacks/codeql/actions-queries/0.6.39",
  );
  const scan = (path) => ({
    found: {
      "codeql/actions-queries": {
        kind: "query",
        path: join(path, "qlpack.yml"),
      },
    },
  });
  const cache = {
    type: "by-name-and-version",
    found: {
      "codeql/actions-queries": {
        "0.6.39": { path: join(root, "cache/qlpack.yml") },
      },
    },
  };
  assert.equal(
    bundledActionsPack(
      { steps: [{ type: "by-name", scans: [scan(nativePack)] }, cache] },
      distribution,
    ),
    nativePack,
  );
  for (const steps of [
    [cache],
    [{ type: "by-name", scans: [scan(join(root, "cache"))] }, cache],
    [{ type: "by-name", scans: [scan(nativePack), scan(nativePack)] }],
  ])
    assert.throws(
      () => bundledActionsPack({ steps }, distribution),
      /independent native CodeQL bundle/u,
    );
});
function fixture() {
  const nativeRoot = join(root, "native-codeql-fixture");
  const stock = [join(nativeRoot, "cache.ql"), join(nativeRoot, "other.ql")];
  const selected = [
    replacement,
    join(root, "selected-codeql-fixture/other.ql"),
  ];
  const metadata = "name: codeql/actions-queries\nversion: 0.6.39\n";
  const files = new Map([
    [stock[0], original],
    [replacement, local],
    [stock[1], "/**\n * @id actions/independent-rule\n */\nselect 1\n"],
    [selected[1], "/**\n * @id actions/independent-rule\n */\nselect 1\n"],
    [join(dirname(stock[1]), "qlpack.yml"), metadata],
    [join(dirname(selected[1]), "qlpack.yml"), metadata],
  ]);
  const read = (path) => {
    if (!files.has(path))
      throw Object.assign(new Error("Missing fixture input"), {
        code: "ENOENT",
      });
    return files.get(path);
  };
  return { stock, selected, files, read };
}
test("query admission retains native rule identities, bodies and pack versions", () => {
  const f = fixture();
  assert.deepEqual(verifyCodeqlQueryInventory(f.stock, f.selected, f.read), {
    rules: 2,
    modeledQueries: 1,
  });
  assert.throws(
    () => verifyCodeqlQueryInventory(f.stock, f.selected.slice(0, 1), f.read),
    /inventory changed/u,
  );
  assert.throws(
    () =>
      verifyCodeqlQueryInventory(
        f.stock,
        [...f.selected, f.selected[1]],
        f.read,
      ),
    /duplicate/u,
  );
  f.files.set(
    f.selected[1],
    f.files.get(f.selected[1]).replace("select 1", "select 2"),
  );
  assert.throws(
    () => verifyCodeqlQueryInventory(f.stock, f.selected, f.read),
    /Native query changed/u,
  );
  f.files.set(f.selected[1], f.files.get(f.stock[1]));
  f.files.set(
    join(dirname(f.selected[1]), "qlpack.yml"),
    "name: codeql/actions-queries\nversion: 0.6.37\n",
  );
  assert.throws(
    () => verifyCodeqlQueryInventory(f.stock, f.selected, f.read),
    /pack changed/u,
  );
});
test("the modeled rule retains its complete stock query beyond the single model import", () => {
  const f = fixture();
  f.files.set(
    replacement,
    local.replace("import actions", "import actions\n// semantic drift"),
  );
  assert.throws(
    () => verifyCodeqlQueryInventory(f.stock, f.selected, f.read),
    /semantics changed/u,
  );
  f.files.set(
    replacement,
    local.replace("import QualificationAdmission\n", ""),
  );
  assert.throws(() => verifyCodeqlQueryInventory(f.stock, f.selected, f.read));
});
test("all scans depend on native model validation and only Actions uses the complete modeled suite", () => {
  const path = ".github/workflows/security.yml";
  const source = readFileSync(join(root, path), "utf8");
  const workflow = parse(source);
  assert.deepEqual(workflow.jobs.codeql.strategy.matrix.language, [
    "actions",
    "javascript-typescript",
    "python",
  ]);
  assert.equal(workflow.jobs.model.name, "Validate Actions approval model");
  assert.deepEqual(workflow.permissions, { contents: "read" });
  for (const mutation of [
    source.replace("    needs: model\n", ""),
    source.replace(
      "matrix.language == 'actions'",
      "matrix.language == 'python'",
    ),
    source.replace(
      'node scripts/check-codeql-model.js "$CODEQL" "$MODEL_TEMP"',
      "echo skipped",
    ),
  ])
    assert.throws(() => checkWorkflows({ overrides: { [path]: mutation } }));
});
