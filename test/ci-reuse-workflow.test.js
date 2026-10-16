// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parsers } from "prettier/plugins/yaml";
import {
  candidateJobNames,
  qualificationMatrix,
  nodeSupport,
} from "../scripts/node-matrix.js";

const source = readFileSync(
  new URL("../.github/workflows/check.yml", import.meta.url),
  "utf8",
);

test("release entrypoints are manual and publishing credentials exist only at their effect boundaries", () => {
  const expectedOidc = ["publish.stage", "promote-release.npm"],
    expectedWrites = ["github-release.archive", "promote-release.github"];
  const oidc = [],
    writes = [];
  for (const name of [
    "release-qualification",
    "publish",
    "release-registry",
    "github-release",
    "promote-release",
  ]) {
    const text = readFileSync(
      new URL(`../.github/workflows/${name}.yml`, import.meta.url),
      "utf8",
    );
    const workflow = yamlValue(parsers.yaml.parse(text));
    assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
    assert.equal(workflow.permissions.contents, "read");
    assert.equal(workflow.permissions["id-token"], undefined);
    assert.ok(
      !/npm publish|stage approve|actions-lock|distribution-tag/u.test(text),
    );
    for (const [job, spec] of Object.entries(workflow.jobs)) {
      if (spec.permissions?.["id-token"] === "write")
        oidc.push(`${name}.${job}`);
      if (spec.permissions?.contents === "write") writes.push(`${name}.${job}`);
      if (spec.uses) assert.ok(spec.uses.startsWith("./.github/workflows/"));
      for (const step of spec.steps ?? []) {
        if (step.uses && !step.uses.startsWith("./"))
          assert.match(step.uses, /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/u);
        if (step.uses?.startsWith("actions/checkout@"))
          assert.equal(step.with["persist-credentials"], "false");
        if (step.uses?.startsWith("actions/download-artifact@"))
          assert.equal(step.with["digest-mismatch"], "error");
      }
    }
  }
  assert.deepEqual(oidc, expectedOidc);
  assert.deepEqual(writes, expectedWrites);
});

// Use the already locked YAML parser; this adapter reads its AST rather than parsing YAML again.
function yamlValue(node) {
  if (!node) return null;
  if (node.value !== undefined) return node.value;
  if (node.type === "mapping" || node.type === "flowMapping") {
    const entries = node.children.map((item) =>
      item.children.map((child) => yamlValue(child.children[0])),
    );
    assert.equal(
      new Set(entries.map(([key]) => key)).size,
      entries.length,
      "Duplicate YAML key",
    );
    return Object.fromEntries(entries);
  }
  if (node.type === "sequence" || node.type === "flowSequence")
    return node.children.map((item) => yamlValue(item.children[0]));
  if (node.type === "root") {
    assert.equal(node.children.length, 1);
    return yamlValue(node.children[0]);
  }
  if (node.type === "document")
    return yamlValue(
      node.children.find((child) => child.type === "documentBody"),
    );
  assert.ok(node.children.length <= 1, node.type);
  return yamlValue(node.children[0]);
}

test("generated Node bootstrap consumers conform to the canonical tooling reference", () => {
  const bootstrap = JSON.parse(
    readFileSync(new URL("../.github/bootstrap-node.json", import.meta.url)),
  );
  const expected = [
    "check.matrix",
    "check.strategy",
    "check.package",
    "check.package",
    "check.required",
    "candidate.pack",
    "markdown-quality.qualify",
    "publish.admit",
    "publish.retained",
    "publish.stage",
    "registry.registry",
    "release-qualification.resolve",
    "release-qualification.security",
    "release-qualification.distribution",
    "release-registry.admit",
    "release-registry.security",
    "github-release.prepare",
    "github-release.archive",
    "promote-release.admit",
    "promote-release.npm",
    "promote-release.github",
  ];
  const actual = [];
  assert.equal(bootstrap.version, nodeSupport.reference);
  for (const name of [
    "check",
    "candidate",
    "markdown-quality",
    "publish",
    "registry",
    "release-qualification",
    "release-registry",
    "github-release",
    "promote-release",
  ]) {
    const workflow = yamlValue(
      parsers.yaml.parse(
        readFileSync(
          new URL(`../.github/workflows/${name}.yml`, import.meta.url),
          "utf8",
        ),
      ),
    );
    for (const [job, specification] of Object.entries(workflow.jobs))
      for (const step of specification.steps ?? []) {
        const pin = step.with?.["node-version"];
        if (pin && !pin.includes("${{")) {
          assert.equal(pin, bootstrap.version);
          actual.push(`${name}.${job}`);
        }
      }
  }
  assert.deepEqual(actual, expected);
});

test("a changed admitted Node reference owns candidate names and all performance conditions", () => {
  // Deliberately synthetic policy; these values do not track the current contract.
  const policy = {
    ...nodeSupport,
    minimums: ["22.13.0", "24.0.0", "26.0.0"],
    reference: "22.13.0",
  };
  const matrix = qualificationMatrix(
    [...policy.minimums, "24.21.0"].map((version) => ({
      version: `v${version}`,
    })),
    policy,
  );
  assert.deepEqual(candidateJobNames(matrix, policy), [
    "pack",
    "consumer (windows-latest)",
    "consumer (windows-latest, 24.0.0)",
    "consumer (windows-latest, 24.21.0)",
    "consumer (windows-latest, 26.0.0)",
    "consumer (ubuntu-24.04)",
    "consumer (ubuntu-24.04, 24.0.0)",
    "consumer (ubuntu-24.04, 24.21.0)",
    "consumer (ubuntu-24.04, 26.0.0)",
  ]);
  for (const reference of [undefined, "missing"])
    assert.throws(() =>
      qualificationMatrix(
        policy.minimums.map((version) => ({ version: `v${version}` })),
        { ...policy, reference },
      ),
    );
  const workflow = yamlValue(
    parsers.yaml.parse(
      readFileSync(
        new URL("../.github/workflows/candidate.yml", import.meta.url),
        "utf8",
      ),
    ),
  );
  assert.equal(
    workflow.jobs.pack.outputs.reference,
    "${{ steps.resolve.outputs.reference }}",
  );
  const consumer = workflow.jobs.consumer;
  assert.equal(
    consumer.name,
    "${{ matrix.node == needs.pack.outputs.reference && format('consumer ({0})', matrix.os) || format('consumer ({0}, {1})', matrix.os, matrix.node) }}",
  );
  for (const step of consumer.steps.filter((step) => step.if))
    assert.ok(step.if.includes("needs.pack.outputs.reference"));
  assert.equal(
    consumer.steps.filter((step) =>
      step.if?.includes("matrix.node == needs.pack.outputs.reference"),
    ).length,
    5,
  );
  assert.equal(
    consumer.steps.filter((step) =>
      step.if?.includes("matrix.node != needs.pack.outputs.reference"),
    ).length,
    1,
  );
  assert.equal(
    consumer.steps.find((step) => step.with?.name?.includes("candidate-{0}"))
      .with.name,
    "${{ matrix.node == needs.pack.outputs.reference && format('candidate-{0}', matrix.os) || format('candidate-{0}-{1}', matrix.os, matrix.node) }}",
  );
});

test("retained verification and staging preserve intervening admission and fail closed ordering", () => {
  const workflow = yamlValue(
    parsers.yaml.parse(
      readFileSync(
        new URL("../.github/workflows/publish.yml", import.meta.url),
        "utf8",
      ),
    ),
  );
  for (const id of ["retained", "stage"]) {
    const steps = workflow.jobs[id].steps;
    const isolation = steps.findIndex(
      (step) => step.run === "node scripts/publication-npm.js isolate",
    );
    const admission = steps.findIndex(
      (step) =>
        step.run ===
        "node scripts/prepare-publication-environment.js --environment frozen-release",
    );
    const acquisition = steps.findIndex(
      (step) => step.run === "node scripts/publication-npm.js acquire",
    );
    assert.ok(
      isolation >= 0 && admission > isolation && acquisition > admission,
    );
    for (const index of [isolation, admission, acquisition]) {
      assert.equal(steps[index]["continue-on-error"], undefined);
      assert.equal(steps[index].if, undefined);
    }
    assert.equal(steps[isolation].shell, "bash");
    assert.equal(steps[acquisition].shell, "bash");
  }
});

const pythonActionSource = readFileSync(
  new URL("../.github/actions/setup-python/action.yml", import.meta.url),
  "utf8",
);
function governPythonAction(text) {
  const action = yamlValue(parsers.yaml.parse(text));
  assert.equal(action.runs.using, "composite");
  assert.equal(action.runs.steps.length, 2);
  assert.deepEqual(action.runs.steps[0], {
    id: "python-target",
    shell: "bash",
    run: "bash .github/actions/setup-python/read-target.sh",
  });
  assert.equal(
    action.runs.steps[1].uses,
    "astral-sh/setup-uv@1c37ad07a6a961277cf70c0d37d6f313000f5884",
  );
  assert.deepEqual(action.runs.steps[1].with, {
    "python-version": "${{ steps.python-target.outputs.version }}",
    version: "0.13.0",
    "activate-environment": "true",
    "venv-path": "${{ runner.temp }}/python",
    "no-project": "true",
    "enable-cache": "false",
  });
}
test("five concrete Python lanes use the governed dependency-free local action", () => {
  governPythonAction(pythonActionSource);
  const lanes = [];
  for (const name of ["check", "candidate", "native"]) {
    const workflow = yamlValue(
      parsers.yaml.parse(
        readFileSync(
          new URL(`../.github/workflows/${name}.yml`, import.meta.url),
          "utf8",
        ),
      ),
    );
    for (const [id, job] of Object.entries(workflow.jobs)) {
      for (const [index, step] of (job.steps ?? []).entries()) {
        if (step.uses !== "./.github/actions/setup-python") continue;
        lanes.push(`${name}.${id}`);
        assert.ok(
          job.steps
            .slice(0, index)
            .some((step) => step.uses?.startsWith("actions/checkout@")),
        );
        assert.ok(
          job.steps
            .slice(index + 1)
            .some((step) =>
              /(?:python |npm run check:full|node scripts\/(?:qualify-public-registry|ci-reuse-command))/u.test(
                step.run ?? "",
              ),
            ),
          `${name}.${id} must invoke its Python-dependent check after setup`,
        );
        if (name === "native")
          assert.equal(
            job.steps
              .slice(0, index)
              .some((step) => step.uses?.startsWith("actions/setup-node@")),
            false,
          );
      }
    }
    if (name === "native")
      for (const path of [
        ".github/actions/setup-python/**",
        ".python-version",
        "scripts/native-evidence-contract.json",
      ])
        assert.ok(workflow.on.push.paths.includes(path));
  }
  assert.deepEqual(lanes, [
    "check.probe",
    "check.package",
    "candidate.pack",
    "candidate.consumer",
    "native.native",
  ]);
});
for (const [before, after] of [
  ["astral-sh/setup-uv@", "untrusted/setup-uv@"],
  ["1c37ad07a6a961277cf70c0d37d6f313000f5884", "v10"],
  ["enable-cache: false", "enable-cache: true"],
  ["steps.python-target.outputs.version", "env.PYTHON_VERSION"],
  ["shell: bash", "shell: pwsh"],
])
  test(`nested Python action rejects ${after}`, () =>
    assert.throws(() =>
      governPythonAction(pythonActionSource.replace(before, after)),
    ));

test("shared qualification uploads compact evidence with explicit retention tiers", () => {
  const shared = yamlValue(
    parsers.yaml.parse(
      readFileSync(
        new URL("../.github/workflows/markdown-quality.yml", import.meta.url),
        "utf8",
      ),
    ),
  );
  assert.equal(
    shared.on.workflow_call.inputs["qualification-evidence"].type,
    "boolean",
  );
  assert.equal(
    shared.on.workflow_call.inputs["qualification-evidence"].default,
    "false",
  );
  const steps = shared.jobs.qualify.steps;
  const packaging = steps.findIndex(
    (step) =>
      step.run === "node producer/scripts/package-qualification-evidence.mjs",
  );
  const upload = steps.findIndex((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.ok(packaging >= 0 && upload > packaging);
  assert.equal(steps[packaging].if, "always()");
  assert.equal(steps[upload].if, "always()");
  assert.equal(
    steps[upload].with.path,
    "${{ runner.temp }}/shared-markdown-upload/",
  );
  assert.equal(
    steps[upload].with["retention-days"],
    "${{ inputs.qualification-evidence && 30 || (job.status != 'success' && 14 || 7) }}",
  );
});

function govern(text) {
  const document = yamlValue(parsers.yaml.parse(text));
  assert.deepEqual(document.on, {
    push: { branches: ["main"] },
    pull_request: null,
    workflow_call: {
      inputs: {
        runtimes: {
          description:
            "Matrix frozen by the manual release qualification caller",
          required: "true",
          type: "string",
        },
      },
    },
  });
  assert.deepEqual(document.permissions, { contents: "read" });
  assert.deepEqual(Object.keys(document.jobs), [
    "matrix",
    "probe",
    "strategy",
    "package",
    "required",
  ]);
  const { matrix, probe, strategy, package: pkg, required } = document.jobs;
  assert.equal(matrix.if, undefined);
  assert.equal(probe.if, undefined);
  assert.equal(strategy.if, undefined);
  assert.deepEqual(probe.needs, "matrix");
  assert.deepEqual(strategy.needs, ["matrix", "probe"]);
  assert.deepEqual(pkg.needs, ["matrix", "strategy"]);
  assert.equal(
    pkg.if,
    "always() && needs.matrix.result == 'success' && (needs.strategy.result != 'success' || needs.strategy.outputs.reuse != 'true')",
  );
  assert.deepEqual(required.needs, ["matrix", "probe", "strategy", "package"]);
  assert.equal(required.if, "always()");
  assert.equal(pkg.name, "package (${{ matrix.os }}, ${{ matrix.node }})");
  assert.equal(probe.name, "probe (${{ matrix.os }}, ${{ matrix.node }})");
  assert.equal(
    pkg.strategy.matrix,
    "${{ fromJSON(needs.matrix.outputs.runtimes) }}",
  );
  assert.equal(probe.strategy.matrix, pkg.strategy.matrix);
  assert.equal(strategy.outputs.reuse, "${{ steps.verify.outputs.reuse }}");
  for (const job of Object.values(document.jobs)) {
    assert.equal(job["continue-on-error"], undefined);
    if (job.permissions)
      assert.deepEqual(job.permissions, {
        contents: "read",
        actions: "read",
        "pull-requests": "read",
      });
    for (const step of job.steps) {
      if (step.uses && step.uses !== "./.github/actions/setup-python")
        assert.match(
          step.uses,
          /^(?:actions\/[a-z-]+|astral-sh\/setup-uv)@[a-f0-9]{40}$/u,
        );
      if (step.run)
        assert.equal(
          step["continue-on-error"],
          job === pkg && step.run === "node scripts/ci-reuse-command.js lane"
            ? "true"
            : undefined,
          step.run,
        );
      if (step.uses?.startsWith("actions/checkout@"))
        assert.equal(step.with["persist-credentials"], "false");
      if (step.uses?.startsWith("actions/download-artifact@")) {
        assert.equal(step.with["digest-mismatch"], "error");
        if (step.with["run-id"]) {
          assert.equal(
            step.with.repository,
            "Hadden-Industries/markdown-quality",
          );
          assert.equal(
            step.with["artifact-ids"],
            "${{ steps.select.outputs.artifact_id }}",
          );
          assert.equal(
            step.with["run-id"],
            "${{ steps.select.outputs.run_id }}",
          );
          assert.equal(step.if, "steps.select.outputs.available == 'true'");
          assert.equal(step.with.name, undefined);
          assert.equal(step.with.pattern, undefined);
        }
      }
    }
  }
  const tests = pkg.steps.find((step) => step.run === "npm run check:product");
  assert.ok(tests);
  assert.equal(tests.if, undefined);
  const installJson = pkg.steps.find(
    (step) => step.run === "npm run install:json",
  );
  const jsonCheck = pkg.steps.find(
    (step) =>
      step.run ===
      "npm run lint:json:identity\nnpm run test:json\nnpm run check:json\n",
  );
  assert.ok(installJson);
  assert.ok(jsonCheck);
  assert.equal(installJson.if, undefined);
  assert.equal(jsonCheck.if, undefined);
  for (const step of [installJson, jsonCheck]) {
    assert.equal(step["continue-on-error"], undefined);
  }
  assert.ok(pkg.steps.indexOf(installJson) < pkg.steps.indexOf(tests));
  assert.ok(pkg.steps.indexOf(jsonCheck) > pkg.steps.indexOf(tests));
  const laneIndex = pkg.steps.findIndex(
    (step) => step.run === "node scripts/ci-reuse-command.js lane",
  );
  const toolingRuntime = pkg.steps
    .slice(0, pkg.steps.indexOf(jsonCheck))
    .findLast((step) => step.uses?.startsWith("actions/setup-node@"));
  assert.equal(toolingRuntime.with["node-version"], nodeSupport.reference);
  assert.equal(toolingRuntime.if, undefined);
  assert.ok(pkg.steps.indexOf(tests) < laneIndex);
  assert.ok(laneIndex < pkg.steps.indexOf(toolingRuntime));
  assert.ok(pkg.steps.indexOf(toolingRuntime) < pkg.steps.indexOf(jsonCheck));
  const result = required.steps.find((step) => step.id === "result");
  assert.equal(result.run, "node scripts/ci-reuse-command.js required");
  assert.equal(result.if, undefined);
  assert.equal(result.env.NEEDS_JSON, "${{ toJSON(needs) }}");
  assert.equal(
    result.env.REUSE,
    "${{ needs.strategy.result == 'success' && needs.strategy.outputs.reuse == 'true' }}",
  );
  for (const job of [probe, pkg]) {
    const upload = job.steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@"),
    );
    assert.equal(upload["continue-on-error"], "true");
    assert.equal(
      upload.with.name,
      (job === probe ? "probe" : "executed") +
        "-${{ matrix.os }}-${{ matrix.node }}-attempt-${{ github.run_attempt }}",
    );
  }
  const hosts = strategy.steps.find((step) => step.with?.pattern);
  assert.equal(hosts.with.pattern, "probe-*-attempt-${{ github.run_attempt }}");
  const decisionUpload = strategy.steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.equal(
    decisionUpload.with.name,
    "package-reuse-decision-${{ github.run_attempt }}",
  );
  const decision = required.steps.find((step) => step.id === "decision");
  assert.equal(
    decision.if,
    "needs.strategy.result == 'success' && needs.strategy.outputs.reuse == 'true'",
  );
  assert.equal(decision.with.name, decisionUpload.with.name);
  assert.equal(decision["continue-on-error"], undefined);
  const executed = required.steps.find((step) => step.with?.pattern);
  assert.equal(
    executed.if,
    "(needs.strategy.result != 'success' || needs.strategy.outputs.reuse != 'true') && needs.package.result == 'success'",
  );
  assert.equal(
    executed.with.pattern,
    "executed-*-attempt-${{ github.run_attempt }}",
  );
  assert.equal(executed["continue-on-error"], "true");
  assert.equal(
    result.env.DECISION_DOWNLOAD_OUTCOME,
    "${{ steps.decision.outcome }}",
  );
  const verification = strategy.steps.find((step) => step.id === "verify");
  assert.equal(verification.run, "node scripts/ci-reuse-command.js verify");
  assert.equal(verification.if, "steps.select.outputs.available == 'true'");
  assert.equal(
    strategy.outputs.reason,
    "${{ steps.verify.outputs.reason || steps.select.outputs.reason }}",
  );
  assert.equal(
    result.env.FALLBACK_REASON,
    "${{ needs.strategy.outputs.reason }}",
  );
  assert.equal(
    verification.env.PROOF_DOWNLOAD_OUTCOME,
    "${{ steps.proof.outcome }}",
  );
  return document;
}

test("the real workflow preserves full PR coverage, closed graph and exact proof acquisition", () =>
  govern(source));

for (const [name, before, after] of [
  [
    "unapproved local action",
    "./.github/actions/setup-python",
    "./.github/actions/untrusted",
  ],
  [
    "untrusted Python action pin",
    "./.github/actions/setup-python",
    "astral-sh/setup-uv@v10",
  ],
  [
    "PR job bypass",
    "  package:\n",
    "  package:\n    continue-on-error: true\n",
  ],
  [
    "missing required dependency",
    "needs: [matrix, probe, strategy, package]",
    "needs: [matrix, strategy, package]",
  ],
  ["conditional aggregate", "if: always()", "if: success()"],
  [
    "skip tests",
    "      - run: npm run check:product",
    "      - if: github.event_name == 'push'\n        run: npm run check:product",
  ],
  [
    "tolerate test failure",
    "      - run: npm run check:product",
    "      - continue-on-error: true\n        run: npm run check:product",
  ],
  [
    "remove the final JSON gate",
    "          npm run check:json\n",
    "          echo omitted-json-gate\n",
  ],
  [
    "omit JSON acquisition",
    "        run: npm run install:json",
    "        run: echo omitted-json-acquisition",
  ],
  ["privileged token", "  contents: read", "  contents: write"],
  [
    "broadened proof selection",
    "artifact-ids: ${{ steps.select.outputs.artifact_id }}",
    "pattern: package-proof-*",
  ],
  [
    "ignore failed download",
    "PROOF_DOWNLOAD_OUTCOME: ${{ steps.proof.outcome }}",
    "PROOF_DOWNLOAD_OUTCOME: success",
  ],
  [
    "ignore failed jobs",
    "NEEDS_JSON: ${{ toJSON(needs) }}",
    "NEEDS_JSON: '{}'",
  ],
  ["accept digest mismatch", "digest-mismatch: error", "digest-mismatch: warn"],
  [
    "skip fallback after optional failure",
    "always() && needs.matrix.result == 'success' && (needs.strategy.result != 'success' || needs.strategy.outputs.reuse != 'true')",
    "needs.strategy.outputs.reuse != 'true'",
  ],
  [
    "reuse failed strategy output",
    "REUSE: ${{ needs.strategy.result == 'success' && needs.strategy.outputs.reuse == 'true' }}",
    "REUSE: ${{ needs.strategy.outputs.reuse }}",
  ],
  [
    "consume an older attempt",
    "pattern: probe-*-attempt-${{ github.run_attempt }}",
    "pattern: probe-*",
  ],
  [
    "misreport skipped proof download",
    "      - id: verify\n        if: steps.select.outputs.available == 'true'",
    "      - id: verify",
  ],
  [
    "drop fallback reason",
    "FALLBACK_REASON: ${{ needs.strategy.outputs.reason }}",
    "FALLBACK_REASON: ''",
  ],
])
  test(`workflow governance rejects ${name}`, () => {
    assert.ok(source.includes(before), "Mutation must reach the real workflow");
    assert.throws(() => govern(source.replace(before, after)));
  });
