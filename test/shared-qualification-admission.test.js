// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, cpSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { consumer } from "./helpers.js";
import { npmCommand } from "../scripts/commands.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import {
  admitSharedQualification,
  qualificationRequest,
  qualificationEnvironment,
  verifyQualificationApproval,
} from "../scripts/shared-qualification-admission.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const requestEnvironment = {
  GITHUB_REPOSITORY: "example/consumer",
  GITHUB_RUN_ID: "101",
  MQ_WORKFLOW_REPOSITORY: "Hadden-Industries/markdown-quality",
  MQ_WORKFLOW_COMMIT_ID: "a".repeat(40),
  MQ_TRUSTED_REPOSITORY: "example/consumer",
  MQ_TRUSTED_COMMIT_ID: "b".repeat(40),
  MQ_CANDIDATE_REPOSITORY: "example/candidate",
  MQ_CANDIDATE_COMMIT_ID: "c".repeat(40),
  MQ_PROFILE: ".markdown-quality-execution.json",
};
const protection = () => ({
  name: qualificationEnvironment,
  id: 17,
  can_admins_bypass: false,
  protection_rules: [
    {
      type: "required_reviewers",
      reviewers: [{ type: "User", reviewer: { id: 42 } }],
    },
  ],
});
const approved = () => [
  {
    state: "approved",
    user: { id: 42 },
    environments: [{ id: 17, name: qualificationEnvironment }],
  },
];

test("approval uses only the caller repository's current environment and this run's native review", async () => {
  const paths = [];
  const result = await admitSharedQualification({
    environment: requestEnvironment,
    read: async (path) => {
      paths.push(path);
      return path.startsWith("/environments/") ? protection() : approved();
    },
  });
  assert.deepEqual(paths, [
    `/environments/${qualificationEnvironment}`,
    "/actions/runs/101/approvals",
  ]);
  assert.equal(result.reviewerId, 42);
  assert.equal(result.trustedCommitId, requestEnvironment.MQ_TRUSTED_COMMIT_ID);
  assert.equal(
    result.producerCommitId,
    requestEnvironment.MQ_WORKFLOW_COMMIT_ID,
  );
});

test("missing protection, administrator bypass and unauthenticated reviews fail closed", () => {
  for (const mutate of [
    (value) => {
      value.can_admins_bypass = true;
    },
    (value) => {
      delete value.can_admins_bypass;
    },
    (value) => {
      value.protection_rules = [];
    },
    (value) => {
      value.protection_rules[0].reviewers = [];
    },
    (value) => {
      value.name = "other";
    },
  ]) {
    const value = protection();
    mutate(value);
    assert.throws(() => verifyQualificationApproval(value, approved()));
  }
  for (const reviews of [
    [],
    [{ ...approved()[0], state: "rejected" }],
    [{ ...approved()[0], state: "bypassed" }],
    [{ ...approved()[0], user: { id: 99 } }],
    [
      {
        ...approved()[0],
        environments: [{ id: 18, name: qualificationEnvironment }],
      },
    ],
    [...approved(), { ...approved()[0], state: "rejected" }],
  ])
    assert.throws(() => verifyQualificationApproval(protection(), reviews));
});

test("invalid or mutable request identities cannot enter the approval record", () => {
  for (const delta of [
    { MQ_TRUSTED_COMMIT_ID: "main" },
    { MQ_WORKFLOW_COMMIT_ID: "HEAD" },
    { MQ_PROFILE: "../profile.json" },
    { MQ_PROFILE: "profile\nextra" },
    { MQ_TRUSTED_REPOSITORY: "https://example/repo" },
    { GITHUB_RUN_ID: "0" },
  ])
    assert.throws(() =>
      qualificationRequest({ ...requestEnvironment, ...delta }),
    );
});

test("contained profile aliases and Unicode names retain their exact reviewed input", () => {
  const profile = "./révision/../profil.json";
  assert.equal(
    qualificationRequest({ ...requestEnvironment, MQ_PROFILE: profile })
      .profile,
    profile,
  );
});

test("request summary is available without installing or checking out caller code", (t) => {
  const output = join(consumer(t), "summary.md");
  const result = spawnSync(
    process.execPath,
    ["scripts/shared-qualification-admission.js", "request"],
    {
      cwd: root,
      env: {
        ...process.env,
        ...requestEnvironment,
        GITHUB_STEP_SUMMARY: output,
      },
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = readFileSync(output, "utf8");
  for (const value of Object.values(qualificationRequest(requestEnvironment)))
    assert.ok(summary.includes(String(value)), String(value));
});

test("unapproved shared execution cannot import a hostile locked package", (t) => {
  const scratch = consumer(t);
  const marker = join(scratch, "hostile-import-ran");
  const product = JSON.parse(readFileSync(join(root, "package.json")));
  const hostile = consumer(t, {
    "package.json": JSON.stringify({
      name: product.name,
      version: product.version,
      type: "module",
      exports: "./index.js",
    }),
    "index.js": `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'executed'); throw new Error('UNAPPROVED_IMPORT_EXECUTED');`,
  });
  const response = JSON.parse(
    npmCommand(["pack", "--json", "--ignore-scripts", "--offline"], {
      cwd: hostile,
    }),
  );
  const [packed] = Array.isArray(response) ? response : Object.values(response);
  assert.equal(typeof packed?.filename, "string");
  const trusted = consumer(t, {
    ".node-version": process.versions.node,
    ".python-version": readFileSync(join(root, ".python-version")),
    ".markdown-quality-execution.json": JSON.stringify({
      schemaVersion: 1,
      samples: 1,
      checkerMs: 10000,
      windowMs: 30000,
      memoryBytes: 536870912,
      nodeOldSpaceMb: 256,
      requestBytes: 8388608,
      reportBytes: 8388608,
      stagingBytes: 134217728,
      stagingEntries: 100000,
      limits: {},
      runtimes: {
        node: { file: ".node-version" },
        python: { file: ".python-version" },
      },
      toolchain: {
        lockFile: "graph/package-lock.json",
        coreArchive: "graph/core.tgz",
        nativeArchives: {
          "win32-x64": "graph/core.tgz",
          "linux-x64": "graph/core.tgz",
        },
      },
    }),
    "graph/package.json": JSON.stringify({
      name: "qualification-trigger",
      version: "1.0.0",
      private: true,
      dependencies: { "@hadden-industries/markdown-quality": "file:core.tgz" },
    }),
  });
  cpSync(join(hostile, packed.filename), join(trusted, "graph/core.tgz"));
  npmCommand(
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: join(trusted, "graph") },
  );
  const result = spawnSync(
    process.execPath,
    ["scripts/shared-qualification.mjs", "run"],
    {
      cwd: root,
      env: {
        ...process.env,
        ...requestEnvironment,
        MQ_TRUSTED_ROOT: trusted,
        MQ_CANDIDATE_ROOT: scratch,
        GH_TOKEN: "",
        GITHUB_TOKEN: "",
        npm_config_offline: "true",
      },
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Read-only GitHub token unavailable/u);
  assert.equal(existsSync(marker), false);
  assert.equal(existsSync(join(trusted, "graph/node_modules")), false);
});

test("workflow mutations cannot remove or move the approval boundary", () => {
  const path = ".github/workflows/markdown-quality.yml";
  const source = readFileSync(join(root, path), "utf8");
  for (const changed of [
    source.replace(
      "name: markdown-quality-trusted-qualification",
      "name: unprotected",
    ),
    source.replace("needs: request", "needs: []"),
    source.replace(
      "node producer/scripts/shared-qualification-admission.js verify",
      "true",
    ),
    source.replace(
      "package-manager-cache: false",
      "package-manager-cache: true",
    ),
  ])
    assert.throws(() => checkWorkflows({ overrides: { [path]: changed } }));
});
