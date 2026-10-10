// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { repositoryRoot } from "../scripts/dependency-graph.js";

/** Disposable real Git fixture with explicit, independently authored test consumers. */
export function impactFixture(t, files = {}, relations = []) {
  const root = mkdtempSync(join(tmpdir(), "markdown-quality-impact-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const folder of ["src", "scripts", "test"])
    mkdirSync(join(root, folder));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  put(
    "package.json",
    JSON.stringify({
      name: "impact-fixture",
      private: true,
      type: "module",
      devDependencies: { "dependency-cruiser": "18.5.0" },
    }),
  );
  put("package-lock.json", "{}\n");
  put(
    ".dependency-cruiser.json",
    readFileSync(join(repositoryRoot, ".dependency-cruiser.json")),
  );
  put(
    ".test-impact.json",
    JSON.stringify({
      schemaVersion: 1,
      fullDomains: ["assets/", "scripts/", "schemas/"],
      fullFiles: [
        "package.json",
        "package-lock.json",
        ".test-impact.json",
        ".dependency-cruiser.json",
      ],
      boundaryFiles: [],
      relations,
    }),
  );
  put("src/leaf.js", "export const value = 1;\n");
  put("src/barrel.mjs", "export {value} from './leaf.js';\n");
  put(
    "test/leaf.test.js",
    "import test from 'node:test'; import assert from 'node:assert/strict'; import {value} from '../src/barrel.mjs'; test('leaf value', () => assert.equal(value, 1));\n",
  );
  put(
    "test/unrelated.test.js",
    "import test from 'node:test'; test('unrelated', () => {});\n",
  );
  for (const [path, content] of Object.entries(files)) put(path, content);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
    });
  git("init", "--quiet");
  git("add", "--all");
  git(
    "-c",
    "user.name=Impact fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "Fixture baseline",
  );
  return { root, put, git, base: git("rev-parse", "HEAD").trim() };
}
