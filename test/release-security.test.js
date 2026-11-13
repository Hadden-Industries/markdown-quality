// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyCodeqlAnalyses,
  verifyRecipientAudit,
  verifyCodeqlSarif,
  refreshReleaseSecurity,
} from "../scripts/qualify-release-security.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash } from "../scripts/release-bytes.js";

const source = "a".repeat(40);
const analyses = () =>
  ["actions", "javascript-typescript", "python"].map((language, index) => ({
    id: 100 + index,
    ref: "refs/heads/main",
    commit_sha: source,
    analysis_key: ".github/workflows/release-qualification.yml:codeql",
    category: `/language:${language}`,
    tool: { name: "CodeQL", version: "2.27.2" },
    error: "",
    warning: "",
    rules_count: 43,
    results_count: 0,
    environment: JSON.stringify({ language, "build-mode": "none" }),
  }));

test("fresh admission audits retained original locks, preserves native audit outputs and refuses a substituted lock", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "release-security-refresh-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const qualified = {
    source,
    manifestSha256: "a".repeat(64),
    candidate: { matrix: { os: ["windows-2025", "ubuntu-26.04"] } },
    evidence: {},
  };
  writeFileSync(
    join(directory, "codeql-analyses.json"),
    JSON.stringify(analyses()),
  );
  for (const platform of qualified.candidate.matrix.os)
    for (const layout of ["root", "isolated"]) {
      const name = `public-recipient-${platform}-${layout}-package-lock.json`,
        bytes = Buffer.from(
          JSON.stringify({
            lockfileVersion: 3,
            packages: { "": { name: "original-recipient", version: "1.0.0" } },
          }),
        );
      writeFileSync(join(directory, name), bytes);
      qualified.evidence[name] = hash(bytes);
    }
  let calls = 0;
  const options = {
    gh: () => "[[]]",
    command: (args) => {
      calls++;
      assert.ok(
        args.includes("--package-lock-only") &&
          args.includes("--ignore-scripts"),
      );
      return JSON.stringify({
        auditReportVersion: 2,
        metadata: { vulnerabilities: { total: 0 } },
        vulnerabilities: {},
      });
    },
  };
  const refreshed = refreshReleaseSecurity(qualified, directory, options);
  assert.equal(calls, 4);
  assert.equal(refreshed.audits.length, 4);
  for (const record of refreshed.audits)
    assert.equal(record.audit.metadata.vulnerabilities.total, 0);
  writeFileSync(
    join(directory, Object.keys(qualified.evidence)[0]),
    "substituted",
  );
  calls = 0;
  assert.throws(
    () => refreshReleaseSecurity(qualified, directory, options),
    /lock changed/u,
  );
  assert.equal(calls, 0);
});

test("a prior source's successful CodeQL analysis cannot qualify this release", () => {
  const provider = analyses();
  assert.equal(verifyCodeqlAnalyses(provider, source).length, 3);
  provider[1].commit_sha = "b".repeat(40);
  assert.throws(() => verifyCodeqlAnalyses(provider, source), /CodeQL/u);
});

test("failed newer exact-source scans cannot be hidden by successful older analyses", () => {
  const provider = analyses();
  provider.unshift({
    ...provider[0],
    id: 200,
    error: "query execution failed",
  });
  assert.throws(() => verifyCodeqlAnalyses(provider, source), /failed/u);
});

test("recipient audits fail closed on low-severity findings, incomplete output and misleading totals", () => {
  const clean = {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { total: 0 } },
    vulnerabilities: {},
  };
  verifyRecipientAudit(clean);
  for (const changed of [
    { ...clean, error: { code: "ENOAUDIT" } },
    { ...clean, metadata: { vulnerabilities: { total: 1 } } },
    { ...clean, vulnerabilities: { katex: { severity: "low" } } },
    { ...clean, auditReportVersion: undefined },
  ])
    assert.throws(() => verifyRecipientAudit(changed));
});

test("CodeQL query provenance must agree with native analysis and contain an exact query pack", () => {
  const analysis = {
    category: "/language:python",
    tool: { version: "2.27.2" },
    rules_count: 1,
    results_count: 0,
  };
  const sarif = {
    version: "2.1.0",
    runs: [
      {
        automationDetails: { id: "/language:python/" },
        tool: {
          driver: { name: "CodeQL", semanticVersion: "2.27.2", rules: [] },
          extensions: [
            {
              name: "codeql/python-queries",
              semanticVersion: "1.8.12+source",
              rules: [{ id: "py/path-injection" }],
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(verifyCodeqlSarif(sarif, analysis).rules, [
    "py/path-injection",
  ]);
  // Current-main alert state is irrelevant, including later fixes or dismissals.
  sarif.runs[0].results = [
    { ruleId: "py/path-injection", suppressions: [{ kind: "external" }] },
  ];
  assert.throws(
    () => verifyCodeqlSarif(sarif, analysis),
    /findings block release/u,
  );
  sarif.runs[0].results = [];
  for (const results_count of [1, undefined, -1, "0"])
    assert.throws(() =>
      verifyCodeqlSarif(sarif, { ...analysis, results_count }),
    );
  sarif.runs[0].tool.extensions[0].rules = [];
  assert.throws(() => verifyCodeqlSarif(sarif, analysis), /inventory/u);
});

test("exact-source result counts block release even when later main is clean", () => {
  for (const count of [1, undefined, -1, "0"]) {
    const provider = analyses();
    provider[0].results_count = count;
    assert.throws(
      () => verifyCodeqlAnalyses(provider, source),
      /findings block release/u,
    );
  }
});
