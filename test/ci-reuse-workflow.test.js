// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parsers } from "prettier/plugins/yaml";

const source = readFileSync(
  new URL("../.github/workflows/check.yml", import.meta.url),
  "utf8",
);

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

function govern(text) {
  const document = yamlValue(parsers.yaml.parse(text));
  assert.deepEqual(document.on, {
    push: { branches: ["main"] },
    pull_request: null,
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
      if (step.uses)
        assert.match(step.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/u);
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
  const tests = pkg.steps.find((step) => step.run === "npm run check:full");
  assert.ok(tests);
  assert.equal(tests.if, undefined);
  assert.equal(
    pkg.steps.findIndex(
      (step) => step.run === "node scripts/ci-reuse-command.js lane",
    ) > pkg.steps.indexOf(tests),
    true,
  );
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
    "      - run: npm run check:full",
    "      - if: github.event_name == 'push'\n        run: npm run check:full",
  ],
  [
    "tolerate test failure",
    "      - run: npm run check:full",
    "      - continue-on-error: true\n        run: npm run check:full",
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
