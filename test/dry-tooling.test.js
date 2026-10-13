// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { consumer } from "./helpers.js";
import { declaredTargets } from "../scripts/declared-targets.js";
import {
  validatePublicationContext,
  publicationContext,
} from "../scripts/publication-context.js";
import { releaseBytes, verifyArchiveBytes } from "../scripts/release-bytes.js";
import {
  npmIsolation,
  acquireHostedNpm,
  selectedNodePrefix,
} from "../scripts/publication-npm.js";
import { pythonTarget } from "../scripts/python-target.js";
test("metadata decoding preserves supplied target shapes without path classification", () => {
  for (const [metadata, expected] of [
    [{}, []],
    [
      {
        bin: "./cli.js",
        exports: { ".": "./index.js", "./schema": "./schema.json" },
      },
      ["./cli.js", "./index.js", "./schema.json"],
    ],
    [{ bin: ["./a.js"], exports: {} }, ["./a.js"]],
    [{ bin: 42 }, []],
  ])
    assert.deepEqual(declaredTargets(metadata), expected);
  for (const metadata of [
    { exports: "./index.js" },
    { exports: [] },
    { exports: { ".": { import: "./index.js" } } },
    { bin: { cli: 1 } },
    { bin: "./*.js" },
  ])
    assert.throws(() => declaredTargets(metadata));
});
test("common publication controls decode supplied environments and revalidate mutations", () => {
  const env = Object.fromEntries(
    [
      "GITHUB_REPOSITORY",
      "GITHUB_EVENT_NAME",
      "GITHUB_REF",
      "GITHUB_WORKFLOW_REF",
      "GITHUB_SHA",
      "CANDIDATE_RUN",
      "GITHUB_RUN_ID",
      "GITHUB_RUN_ATTEMPT",
      "RECOVERY_RUN",
      "RECOVERY_ATTEMPT",
      "RECOVERY_ORIGINS_SHA",
    ].map((key, index) => [key, String(index)]),
  );
  assert.deepEqual(publicationContext(env), {
    repository: "0",
    event: "1",
    ref: "2",
    workflowRef: "3",
    head: "4",
    runId: "5",
    publicationRun: "6",
    publicationAttempt: "7",
    recoveryRun: "8",
    recoveryAttempt: "9",
    recoveryOriginsSha: "10",
  });
  const context = {
    repository: "Hadden-Industries/markdown-quality",
    event: "workflow_dispatch",
    ref: "refs/heads/main",
    workflowRef:
      "Hadden-Industries/markdown-quality/.github/workflows/publish.yml@refs/heads/main",
    head: "a".repeat(40),
  };
  validatePublicationContext(context);
  for (const key of Object.keys(context))
    assert.throws(() =>
      validatePublicationContext({ ...context, [key]: "untrusted" }),
    );
});
test("release bytes retain caller bounds and both independent archive digests", (t) => {
  const root = consumer(t, { archive: "abc" });
  const path = join(root, "archive"),
    bytes = releaseBytes(path, 3);
  assert.equal(bytes.toString(), "abc");
  assert.throws(() => releaseBytes(path, 2));
  assert.throws(() => releaseBytes(root, 10000));
  const archive = {
    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    integrity: "sha512-" + createHash("sha512").update("abc").digest("base64"),
  };
  verifyArchiveBytes(bytes, archive);
  for (const key of ["sha256", "integrity"])
    assert.throws(() =>
      verifyArchiveBytes(bytes, { ...archive, [key]: "bad" }),
    );
  writeFileSync(path, "abd");
  assert.throws(() => verifyArchiveBytes(releaseBytes(path, 3), archive));
});

test("release acquisition rejects growth beyond the caller bound after metadata admission", (t) => {
  const root = consumer(t, { archive: "abc" });
  const reader = new URL("../scripts/release-bytes.js", import.meta.url).href;
  const code = `import {mock} from 'node:test'; import assert from 'node:assert/strict'; import * as fs from 'node:fs';
    const path=process.argv[1]; const read=fs.readFileSync;
    const option=process.versions.node.startsWith('22.')?'namedExports':'exports';
    mock.module('node:fs',{[option]:{lstatSync:fs.lstatSync,readFileSync:(input)=>{fs.writeFileSync(path,'abcd'); return read(input);}}});
    const {releaseBytes}=await import(${JSON.stringify(reader)});
    assert.throws(()=>releaseBytes(path,3));`;
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-test-module-mocks",
      "--input-type=module",
      "-e",
      code,
      join(root, "archive"),
    ],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
});
test("isolated npm acquisition binds selected Node and fails on setup or version errors", (t) => {
  const root = consumer(t),
    isolation = npmIsolation(root);
  const env = {
    RUNNER_TEMP: root,
    NPM_CONFIG_IGNORE_SCRIPTS: "true",
    ...isolation,
  };
  const calls = [];
  acquireHostedNpm(env, (args, options) => {
    calls.push({ args, env: options.env, timeout: options.timeout });
    return args[0] === "--version" ? "12.2.0\n" : "";
  });
  assert.deepEqual(calls[0].args, [
    "install",
    "--global",
    "npm@12.2.0",
    "--prefix",
    selectedNodePrefix(process.execPath, process.platform),
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--registry=https://registry.npmjs.org/",
  ]);
  assert.equal(readFileSync(isolation.NPM_CONFIG_USERCONFIG, "utf8"), "");
  assert.equal(
    calls[0].timeout,
    0,
    "the hosted job owns the npm acquisition deadline",
  );
  assert.equal(
    calls[1].timeout,
    undefined,
    "version readback retains the command's bounded default",
  );
  assert.throws(() =>
    acquireHostedNpm({ ...env, NPM_CONFIG_CACHE: "foreign" }, () => {
      throw Error("must not run");
    }),
  );
  assert.throws(
    () =>
      acquireHostedNpm(env, () => {
        throw Error("acquisition failed");
      }),
    /acquisition failed/u,
  );
  assert.throws(
    () => acquireHostedNpm(env, () => "12.1.0"),
    /version mismatch/u,
  );
});
test("dependency-free Bash Python target reader agrees with stable finite JS admission", (t) => {
  const root = consumer(t);
  const git =
    process.platform === "win32"
      ? execFileSync("where.exe", ["git"], { encoding: "utf8" })
          .trim()
          .split(/\r?\n/u)[0]
      : null;
  const bash = git ? join(dirname(dirname(git)), "bin/bash.exe") : "bash";
  const reader = fileURLToPath(
    new URL("../.github/actions/setup-python/read-target.sh", import.meta.url),
  );
  for (const [value, valid] of [
    ["3.15.0\n", true],
    [" 3.16.02 \n", true],
    ["3.16", false],
    ["3.16.0rc1", false],
    ["3.16.0\n3.17.0", false],
    ["3.9007199254740992.0", false],
    ["3.9007199254740991.0", true],
  ]) {
    writeFileSync(join(root, ".python-version"), value);
    const output = join(root, "output");
    writeFileSync(output, "");
    const result = spawnSync(bash, [reader], {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: output },
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    });
    assert.equal(result.status, valid ? 0 : 1, result.stderr);
    if (valid)
      assert.equal(
        readFileSync(output, "utf8"),
        `version=>=${pythonTarget(root)}\n`,
      );
    else assert.throws(() => pythonTarget(root));
  }
});
