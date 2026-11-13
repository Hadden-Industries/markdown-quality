// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { candidateJobNames } from "../scripts/node-matrix.js";
import { windowsRunner } from "../scripts/runner-policy.js";
import { testFiles } from "../scripts/verification-suites.js";
import { nodeMatrixFixture } from "./node-matrix-fixture.js";
const text = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workflow = (name) => parse(text(`.github/workflows/${name}.yml`));

test("native Python provisioning preserves the minimum selector and isolated hosted environment", () => {
  const action = parse(text(".github/actions/setup-python/action.yml"));
  const [target, provider, environment] = action.runs.steps;
  assert.equal(target.run, "bash .github/actions/setup-python/read-target.sh");
  assert.match(provider.uses, /^actions\/setup-python@[a-f0-9]{40}$/u);
  assert.deepEqual(provider.with, {
    "python-version": "${{ steps.python-target.outputs.version }}",
  });
  assert.equal(environment.shell, "bash");
  assert.match(environment.run, /python -m venv "\$RUNNER_TEMP\/python"/u);
  assert.match(environment.run, /VIRTUAL_ENV=\$RUNNER_TEMP\/python/u);
  assert.match(environment.run, /\$RUNNER_TEMP\/python\/Scripts/u);
  assert.match(environment.run, /\$RUNNER_TEMP\/python\/bin/u);
});

test("read-only release preparation cannot depend on draft visibility", () => {
  const publish = workflow("publish");
  const tag = publish.jobs.admit.steps.find((step) =>
    step.run?.startsWith("node scripts/verify-release-tag.js"),
  );
  assert.ok(
    tag.run.endsWith("--tag-only"),
    "Read-only admission must not fetch draft decisions",
  );
  assert.equal(publish.jobs.decision.permissions.contents, "read");
  assert.equal(publish.jobs.decision.environment, undefined);
  assert.equal(publish.jobs.decision.permissions["id-token"], undefined);
  assert.ok(publish.jobs.stage.needs.includes("decision"));
  assert.equal(
    publish.on.workflow_dispatch.inputs["review-json"].required,
    true,
  );
  const archive = workflow("github-release");
  assert.equal(archive.jobs.complete.if, "needs.archive.result == 'success'");
  assert.equal(archive.jobs.decisions.permissions.contents, "read");
  assert.equal(archive.jobs.decisions.environment, undefined);
  assert.equal(archive.jobs["legacy-decisions"].permissions.contents, "write");
  assert.equal(archive.jobs["legacy-decisions"].environment, "github-release");
  assert.deepEqual(archive.jobs.prepare.needs, [
    "decisions",
    "legacy-decisions",
  ]);
});

test("release credentials stay separated from qualification and each other", () => {
  const oidc = [],
    writes = [];
  for (const name of [
    "release-qualification",
    "publish",
    "release-registry",
    "github-release",
    "promote-release",
  ]) {
    const value = workflow(name);
    assert.deepEqual(Object.keys(value.on), ["workflow_dispatch"]);
    assert.equal(value.permissions.contents, "read");
    for (const [key, job] of Object.entries(value.jobs)) {
      if (job.permissions?.["id-token"] === "write")
        oidc.push(`${name}.${key}`);
      if (job.permissions?.contents === "write") writes.push(`${name}.${key}`);
    }
  }
  assert.deepEqual(oidc.sort(), ["promote-release.npm", "publish.stage"]);
  assert.deepEqual(writes.sort(), [
    "github-release.archive",
    "github-release.legacy-decisions",
    "promote-release.github",
  ]);
  assert.equal(workflow("publish").jobs.stage.environment, "npm-publication");
  assert.notEqual(
    workflow("github-release").jobs.archive.environment,
    "npm-publication",
  );
});

test("one producer owns packing and both ordinary and release qualification use its immutable ID", () => {
  const q = workflow("qualification");
  assert.deepEqual(Object.keys(q.on), ["workflow_call"]);
  assert.equal(q.jobs.producer.name, "Reference producer");
  assert.ok(
    q.jobs.producer.steps.some((s) => s.run === "npm run check:qualification"),
  );
  assert.equal(
    q.jobs.qualification.strategy.matrix,
    "${{ fromJSON(inputs.matrix) }}",
  );
  const download = q.jobs.qualification.steps.find(
    (s) => s.uses === "./.github/actions/download-evidence",
  );
  assert.equal(
    download.with["artifact-id"],
    "${{ needs.producer.outputs.archive-id }}",
  );
  const steps = q.jobs.qualification.steps;
  const runtime = steps.find(
    (s) => s.run === "node scripts/verify.js --runtime",
  );
  assert.ok(runtime);
  assert.equal(
    runtime.env.MARKDOWN_QUALITY_CONSUMER_NPM,
    "${{ runner.temp }}/consumer-npm/node_modules/npm/bin/npm-cli.js",
  );
  const acquireNpm = steps.find(
    (s) => s.name === "Provision floor-compatible consumer npm",
  );
  assert.equal(
    acquireNpm.env.CONSUMER_NPM,
    "${{ needs.producer.outputs.consumer-npm }}",
  );
  const consumer = steps.find(
    (s) => s.name === "Qualify original archives in root and isolated layouts",
  );
  assert.match(consumer.run, /qualify-public-registry\.mjs/u);
  assert.match(consumer.run, /--archives transported-release/u);
  assert.match(consumer.run, /--performance-corpora performance-corpora/u);
  assert.equal(
    consumer.env.PERFORMANCE_ENABLED,
    "${{ matrix.node == needs.producer.outputs.reference }}",
  );
  assert.equal(q.jobs.complete.if, "always()");
  assert.deepEqual(q.jobs.complete.needs, ["producer", "qualification"]);
  const release = workflow("release-qualification");
  assert.equal(
    release.jobs.product.uses,
    "./.github/workflows/qualification.yml",
  );
  assert.equal(release.jobs.product.with["release-mode"], true);
  assert.ok(!Object.hasOwn(release.jobs, "candidate"));
  for (const key of ["security", "distribution"])
    assert.ok(
      release.jobs[key].steps.some(
        (s) =>
          s.with?.["artifact-id"] === "${{ needs.product.outputs.archive-id }}",
      ),
    );
});

test("both platform corpus checkouts retain the frozen complete data sources", () => {
  const steps = workflow("qualification").jobs.qualification.steps;
  const corpora = steps.filter((s) =>
    s.with?.path?.startsWith("performance-corpora/"),
  );
  assert.deepEqual(
    corpora.map((s) => [s.with.repository, s.with.ref]),
    [
      ["Hadden-Industries/owlapi", "073beefb7805130bc0452472d1a9c801471fbaf1"],
      ["Hadden-Industries/webvowl", "b0fe00404eedf12a59084871863500869474bd3a"],
    ],
  );
  for (const s of corpora) {
    assert.equal(s.if, "matrix.node == needs.producer.outputs.reference");
    assert.equal(s.with["persist-credentials"], false);
  }
});

test("main observation never invokes a product suite or silently requests full qualification", () => {
  const main = workflow("main-qualification");
  assert.equal(
    main.jobs.full.if,
    "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.qualification != 'installed-only'",
  );
  assert.equal(main.jobs.full.uses, "./.github/workflows/ci.yml");
  for (const key of ["host", "observe"])
    for (const s of main.jobs[key].steps)
      assert.doesNotMatch(
        s.run ?? "",
        /check:full|check:product|qualify-public|workflow run/u,
      );
  assert.equal(main.jobs.observe.if, "always() && github.event_name == 'push'");
  assert.match(
    main.jobs["diagnostic-matrix"].if,
    /workflow_dispatch.*installed-only/u,
  );
  assert.equal(
    main.jobs["installed-diagnostic"].uses,
    "./.github/workflows/installed-qualification.yml",
  );
  assert.ok(
    !workflow("ci").jobs.acceptance.needs.includes("installed-diagnostic"),
  );
});

test("Actions, JavaScript and Python scans share the explicit source-bound identity", () => {
  const security = workflow("security");
  assert.deepEqual(Object.keys(security.on).sort(), [
    "schedule",
    "workflow_call",
    "workflow_dispatch",
  ]);
  assert.deepEqual(security.jobs.codeql.strategy.matrix.language, [
    "actions",
    "javascript-typescript",
    "python",
  ]);
  assert.ok(
    security.jobs.codeql.steps.some(
      (s) => s.with?.category === "/language:${{ matrix.language }}",
    ),
  );
  assert.equal(
    workflow("ci").jobs.dependencies.steps.find((s) =>
      s.uses?.startsWith("actions/dependency-review-action@"),
    ).with["fail-on-severity"],
    "moderate",
  );
});

test("runtime inventory retains source behavior and unknown tests while avoiding reference-only ownership", () => {
  const runtime = testFiles(true);
  for (const path of [
    "test/contracts.test.js",
    "test/native-staging.test.js",
    "test/resource-limits.test.js",
    "test/qualification.test.js",
  ])
    assert.ok(runtime.includes(path), path);
  for (const path of [
    "test/node-support.test.js",
    "test/packed-qualification.test.js",
    "test/python-runtime.test.js",
  ]) {
    assert.ok(!runtime.includes(path), path);
    assert.ok(testFiles().includes(path), path);
  }
  assert.ok(testFiles().length > runtime.length);
  const verify = text("scripts/verify.js");
  assert.ok(
    verify.lastIndexOf("scripts/runRepositoryJsonQuality.mjs") >
      verify.indexOf("scripts/qualify-json-packages.mjs"),
  );
  assert.ok(verify.includes("scripts/check-architecture.js"));
});

test("manual diagnostics and fixture qualification cannot masquerade as full CI", () => {
  for (const name of [
    "qualification-fixture",
    "windows-observation",
    "registry",
    "native",
  ])
    assert.deepEqual(Object.keys(workflow(name).on), ["workflow_dispatch"]);
  assert.equal(
    workflow("qualification-fixture").jobs.shared.uses,
    "./.github/workflows/markdown-quality.yml",
  );
  assert.ok(
    !readdirSync(new URL("../.github/workflows/", import.meta.url)).includes(
      "candidate.yml",
    ),
  );
  const matrix = nodeMatrixFixture();
  assert.deepEqual(candidateJobNames(matrix), [
    "Reference producer",
    ...matrix.os.flatMap((os) =>
      matrix.node.map((node) => `Qualify ${os} / Node ${node}`),
    ),
    "Complete runtime qualification",
  ]);
});

test("public trusted workflow retains its data-only inputs and evidence retention", () => {
  const shared = workflow("markdown-quality");
  for (const input of [
    "trusted-repository",
    "trusted-commit-id",
    "candidate-repository",
    "candidate-commit-id",
    "profile",
  ])
    assert.ok(shared.on.workflow_call.inputs[input]);
  const steps = shared.jobs.qualify.steps;
  const bootstrap = steps.find((step) =>
    step.uses?.startsWith("actions/setup-node@"),
  );
  assert.equal(bootstrap.with["node-version-file"], "producer/.node-version");
  assert.equal(bootstrap.with["node-version"], undefined);
  assert.ok(
    steps.some(
      (s) => s.run === "node producer/scripts/shared-qualification.mjs run",
    ),
  );
  const upload = steps.find((s) =>
    s.with?.name?.startsWith("shared-markdown-"),
  );
  assert.equal(upload.if, "always()");
  assert.equal(
    upload.with["retention-days"],
    "${{ inputs.retain-qualification-evidence && 30 || (job.status != 'success' && 14 || 7) }}",
  );
  assert.ok(
    steps
      .filter((s) => s.uses?.startsWith("actions/checkout@"))
      .every((s) => s.with["persist-credentials"] === false),
  );
});

test("clean release runners install their interpreters and default observations survive a failed public matrix", () => {
  const archive = workflow("github-release");
  for (const name of ["prepare", "archive"])
    assert.ok(
      archive.jobs[name].steps.some(
        (step) => step.uses === "./.github/actions/setup-python",
      ),
    );
  assert.equal(archive.env.NPM_CONFIG_IGNORE_SCRIPTS, "true");
  assert.equal(
    workflow("promote-release").jobs.admit.permissions["security-events"],
    "read",
  );
  const qualified = workflow("release-registry").jobs.qualified;
  assert.equal(qualified.if, "always()");
  assert.ok(
    qualified.steps.some(
      (step) => step.run === "node scripts/report-release-defaults.js",
    ),
  );
  assert.equal(
    qualified.steps.find(
      (step) =>
        step.name === "Require the complete public tuple and security gate",
    ).if,
    "always()",
  );
  const reconciliation = workflow("promote-release").jobs.reconcile;
  assert.deepEqual(reconciliation.permissions, {
    contents: "read",
    actions: "read",
  });
});

test("release downloads have artifact-read permission and both graphs retain Windows text output", () => {
  const release = workflow("release-qualification");
  for (const name of ["security", "distribution"])
    assert.equal(
      (release.jobs[name].permissions ?? release.permissions).actions,
      "read",
    );
  assert.equal(
    release.jobs.native.uses,
    "./.github/workflows/native-qualification.yml",
  );
  assert.equal(
    workflow("ci").jobs.native.uses,
    "./.github/workflows/native-qualification.yml",
  );
  const native = workflow("native-qualification").jobs.validate;
  assert.ok(
    native.strategy.matrix.include.some((lane) => lane.os === windowsRunner()),
  );
  assert.ok(
    native.steps.some((step) =>
      step.run?.includes("python test/text-output.py"),
    ),
  );
  for (const step of native.steps.filter((step) =>
    step.run?.startsWith("python "),
  ))
    assert.equal(
      step.run.trim().split(/\r?\n/u).length,
      1,
      "Every native exit must reach the Actions step boundary",
    );
  const observation = workflow("windows-observation").jobs.observe;
  assert.equal(observation["runs-on"], windowsRunner());
  assert.ok(
    observation.steps.some(
      (step) => step.uses === "./.github/actions/setup-producer",
    ),
  );
  assert.ok(!observation.steps.some((step) => step.with?.["node-version"]));
});
