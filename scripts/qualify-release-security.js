// SPDX-License-Identifier: AGPL-3.0-only
/** Release-specific admission of native CodeQL and npm recipient audit evidence. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { hash, readJson, repository } from "./release-assets.js";

/** Select the analyses that may satisfy exact-source release security coverage. */
export function verifyCodeqlAnalyses(analyses, source) {
  assert.ok(Array.isArray(analyses));
  assert.match(source, /^[a-f0-9]{40}$/u);
  return ["actions", "javascript-typescript", "python"].map((language) => {
    const matches = analyses.filter(
      (analysis) =>
        analysis.commit_sha === source &&
        analysis.ref === "refs/heads/main" &&
        analysis.category === `/language:${language}` &&
        analysis.analysis_key ===
          "dynamic/github-code-scanning/codeql:analyze" &&
        analysis.tool?.name === "CodeQL",
    );
    assert.ok(matches.length, `Missing exact-source CodeQL ${language}`);
    // Provider listing is newest first. Never substitute an older successful
    // scan when the newest exact-source analysis failed or warned.
    const analysis = matches[0];
    assert.equal(analysis.error, "", `CodeQL ${language} failed`);
    assert.equal(
      analysis.warning,
      "",
      `CodeQL ${language} requires warning disposition`,
    );
    assert.ok(
      Number.isSafeInteger(analysis.rules_count) && analysis.rules_count > 0,
      "CodeQL executed no rules",
    );
    assert.equal(
      analysis.results_count,
      0,
      "Exact-source CodeQL findings block release",
    );
    assert.equal(JSON.parse(analysis.environment).language, language);
    assert.ok(Number.isSafeInteger(analysis.id) && analysis.id > 0);
    return analysis;
  });
}

/** Require a completed native audit of the actual recipient graph, with no findings. */
export function verifyRecipientAudit(audit) {
  assert.equal(audit.auditReportVersion, 2);
  assert.ok(!audit.error, "Recipient audit did not complete");
  assert.equal(
    audit.metadata?.vulnerabilities?.total,
    0,
    "Recipient dependencies require security disposition",
  );
  assert.deepEqual(audit.vulnerabilities, {});
}

/** Retain native query/configuration and exact-source scan identity without replacing CodeQL. */
export function verifyCodeqlSarif(sarif, analysis) {
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs.length, 1);
  const run = sarif.runs[0];
  assert.equal(run.automationDetails.id, `${analysis.category}/`);
  assert.equal(run.tool.driver.name, "CodeQL");
  assert.equal(run.tool.driver.semanticVersion, analysis.tool.version);
  assert.equal(
    analysis.results_count,
    0,
    "Exact-source CodeQL findings block release",
  );
  assert.ok(Array.isArray(run.results ?? []), "Invalid CodeQL results");
  assert.equal(
    (run.results ?? []).length,
    0,
    "Exact-source SARIF findings block release",
  );
  const rules = [run.tool.driver, ...(run.tool.extensions ?? [])].flatMap(
    (tool) => tool.rules ?? [],
  );
  assert.equal(
    rules.length,
    analysis.rules_count,
    "CodeQL query inventory differs from native analysis",
  );
  assert.ok(
    run.tool.extensions?.some(
      (tool) => tool.name.endsWith("-queries") && tool.semanticVersion,
    ),
    "Missing exact CodeQL query pack identity",
  );
  return {
    findings: 0,
    driver: run.tool.driver.semanticVersion,
    queryPacks: run.tool.extensions.map(({ name, semanticVersion }) => ({
      name,
      semanticVersion,
    })),
    rules: rules.map(({ id }) => id),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: qualify-release-security.js ARCHIVES OUTPUT",
  );
  const [directory, output] = process.argv
    .slice(2)
    .map((path) => resolve(path));
  mkdirSync(output, { recursive: true });
  const releaseBytes = readFileSync(join(directory, "release-manifest.json"));
  const release = JSON.parse(releaseBytes);
  assert.equal(
    release.source.head,
    process.env.RELEASE_SOURCE || process.env.GITHUB_SHA,
  );
  const record = (name, value) =>
    writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n", {
      flag: "wx",
    });
  const list = (path) =>
    JSON.parse(
      native("gh", [
        "api",
        `repos/${repository}/${path}`,
        "--paginate",
        "--slurp",
      ]),
    ).flat();
  const analyses = list(
    "code-scanning/analyses?ref=refs%2Fheads%2Fmain&tool_name=CodeQL&per_page=100",
  );
  const selected = verifyCodeqlAnalyses(analyses, release.source.head);
  record("codeql-analyses.json", selected);
  const scans = selected.map((analysis) => {
    const sarif = JSON.parse(
      native("gh", [
        "api",
        `repos/${repository}/code-scanning/analyses/${analysis.id}`,
        "-H",
        "Accept: application/sarif+json",
      ]),
    );
    const configuration = verifyCodeqlSarif(sarif, analysis);
    // Public release evidence retains exact query identities and a digest,
    // not raw SARIF messages/snippets that may describe embargoed findings.
    const scan = {
      analysis: analysis.id,
      sarifSha256: hash(Buffer.from(JSON.stringify(sarif))),
      ...configuration,
    };
    record(`codeql-${analysis.id}.json`, scan);
    return scan;
  });
  const recipient = [];
  for (const platform of ["windows-latest", "ubuntu-24.04"]) {
    for (const layout of ["root", "isolated"]) {
      const name = `${layout}-audit.json`;
      const path = join("recipient-security", `recipient-${platform}`, name);
      const audit = readJson(path);
      verifyRecipientAudit(audit);
      recipient.push({
        platform,
        layout,
        auditSha256: hash(readFileSync(path)),
      });
    }
  }
  record("security-evidence.json", {
    schemaVersion: 1,
    source: release.source.head,
    manifestSha256: hash(releaseBytes),
    run: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    scans,
    recipient,
  });
}
