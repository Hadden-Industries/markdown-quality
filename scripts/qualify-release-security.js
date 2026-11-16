// SPDX-License-Identifier: AGPL-3.0-only
/** Release-specific admission of native CodeQL and npm recipient audit evidence. */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native, npmCommand } from "./commands.js";
import { hash, readJson, regularBytes, repository } from "./release-assets.js";
import { reportCiResult } from "./ci-result.js";
import {
  releaseQualificationWorkflow,
  releaseCommit,
} from "./release-qualification.js";
import { verifyBuildEvidence } from "./release-reuse-evidence.js";

/** Resolve the immutable producer graph before consulting current advisories. */
export function qualifiedProducerLock(
  release,
  directory,
  {
    readSourceLock = (source) =>
      Buffer.from(
        native("gh", [
          "api",
          `repos/${repository}/contents/package-lock.json?ref=${source}`,
          "--jq",
          ".content",
        ]),
        "base64",
      ),
  } = {},
) {
  assert.match(release.source.head, /^[a-f0-9]{40}$/u);
  assert.match(release.source.lockSha256, /^[a-f0-9]{64}$/u);
  const path = join(directory, "build-package-lock.json");
  const lock = existsSync(path)
    ? regularBytes(path, 4_194_304)
    : Buffer.from(readSourceLock(release.source.head));
  assert.ok(
    lock.length > 0 && lock.length <= 4_194_304,
    "Invalid producer lock size",
  );
  assert.equal(
    hash(lock),
    release.source.lockSha256,
    "Qualified producer lock changed",
  );
  return lock;
}

/** Select the analyses that may satisfy exact-source release security coverage. */
export function verifyCodeqlAnalyses(analyses, source, authority = {}) {
  assert.ok(Array.isArray(analyses));
  assert.match(source, /^[a-f0-9]{40}$/u);
  return ["actions", "javascript-typescript", "python"].map((language) => {
    const matches = analyses.filter(
      (analysis) =>
        analysis.commit_sha === source &&
        analysis.ref === (authority.ref ?? "refs/heads/main") &&
        analysis.category === `/language:${language}` &&
        analysis.analysis_key ===
          `${authority.workflow ?? releaseQualificationWorkflow}:codeql` &&
        analysis.tool?.name === "CodeQL",
    );
    assert.ok(matches.length, `Missing exact-source CodeQL ${language}`);
    // Provider listing is newest first. Never substitute an older successful
    // scan when the newest exact-source analysis failed or warned.
    const analysis = matches[0];
    if (authority.executions) {
      const producer = authority.executions.find(
        (item) => item.job.name === `CodeQL / Scan ${language}`,
      );
      assert.ok(producer, "Missing original CodeQL execution");
      assert.ok(
        Date.parse(analysis.created_at) >=
          Date.parse(producer.job.started_at) &&
          Date.parse(analysis.created_at) <=
            Date.parse(producer.job.completed_at),
        "CodeQL analysis is outside the original producing execution",
      );
    }
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

/** Original PR scans keep their own ref, workflow, commit and producing execution. */
export function codeqlAuthority(release, directory) {
  if (!release.promotion) return {};
  const receipt = verifyBuildEvidence(release, directory);
  return {
    ref: `refs/pull/${receipt.pullRequest}/merge`,
    workflow: ".github/workflows/ci.yml",
    executions: receipt.executions,
  };
}

/** Refresh advisories against an unchanged lock without installing dependencies or scripts. */
export function auditRecipientLock(lock, { command = npmCommand } = {}) {
  const parsed = JSON.parse(lock);
  assert.equal(parsed.lockfileVersion, 3);
  assert.ok(parsed.packages?.[""]);
  const directory = mkdtempSync(join(tmpdir(), "markdown-quality-lock-audit-"));
  try {
    writeFileSync(join(directory, "package-lock.json"), lock, { flag: "wx" });
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify(parsed.packages[""]),
      { flag: "wx" },
    );
    const raw = command(
      [
        "audit",
        "--package-lock-only",
        "--ignore-scripts",
        "--json",
        "--audit-level=none",
        "--registry=https://registry.npmjs.org/",
      ],
      { cwd: directory },
    );
    verifyRecipientAudit(JSON.parse(raw));
    assert.ok(readFileSync(join(directory, "package-lock.json")).equals(lock));
    return raw;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

/** Re-admit retained exact-source scans, refresh open alerts, and audit the original recipient locks. */
export function refreshReleaseSecurity(
  qualified,
  logical,
  { command = npmCommand, gh = (args) => native("gh", args) } = {},
) {
  const original = readJson(join(logical, "codeql-analyses.json"));
  const scans = verifyCodeqlAnalyses(
    original,
    qualified.source,
    qualified.promotion
      ? codeqlAuthority(
          readJson(join(logical, "release-manifest.json")),
          logical,
        )
      : {},
  );
  const alerts = JSON.parse(
    gh([
      "api",
      `repos/${repository}/code-scanning/alerts?state=open&per_page=100`,
      "--paginate",
      "--slurp",
    ]),
  ).flat();
  assert.equal(
    alerts.length,
    0,
    "Current security observations require disposition before label effects",
  );
  const audits = [],
    scratch = mkdtempSync(join(tmpdir(), "markdown-quality-retained-audit-"));
  try {
    for (const platform of qualified.candidate.matrix.os)
      for (const layout of ["root", "isolated"]) {
        const name = `public-recipient-${platform}-${layout}-package-lock.json`;
        const lock = regularBytes(join(logical, name));
        assert.equal(
          hash(lock),
          qualified.evidence[name],
          "Retained recipient lock changed",
        );
        const raw = auditRecipientLock(lock, { command });
        audits.push({
          name,
          lockSha256: hash(lock),
          auditSha256: hash(Buffer.from(raw)),
          audit: JSON.parse(raw),
        });
      }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return {
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
    analyses: scans.map((scan) => scan.id),
    openAlerts: 0,
    audits,
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
    process.env.RELEASE_SOURCE ? release.source.head : releaseCommit(release),
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
  const authority = codeqlAuthority(release, directory);
  const analyses = list(
    `code-scanning/analyses?ref=${encodeURIComponent(authority.ref ?? "refs/heads/main")}&tool_name=CodeQL&per_page=100`,
  );
  const selected = verifyCodeqlAnalyses(
    analyses,
    release.source.head,
    authority,
  );
  const alerts = list("code-scanning/alerts?state=open&per_page=100");
  assert.equal(
    alerts.length,
    0,
    "Current security observations require disposition",
  );
  const producerLock = qualifiedProducerLock(release, directory);
  const sourceAudit = auditRecipientLock(producerLock);
  writeFileSync(join(output, "source-package-lock.json"), producerLock, {
    flag: "wx",
  });
  record("source-audit.json", JSON.parse(sourceAudit));
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
  for (const platform of release.runtimePolicy.platforms) {
    for (const layout of ["root", "isolated"]) {
      const name = `${layout}-audit.json`;
      const path = join("recipient-security", `recipient-${platform}`, name);
      const audit = release.promotion
        ? JSON.parse(
            auditRecipientLock(
              readFileSync(
                join(
                  "recipient-security",
                  `recipient-${platform}`,
                  `${layout}-package-lock.json`,
                ),
              ),
            ),
          )
        : readJson(path);
      verifyRecipientAudit(audit);
      record(`${platform}-${layout}-audit.json`, audit);
      recipient.push({
        platform,
        layout,
        auditSha256: hash(Buffer.from(JSON.stringify(audit, null, 2) + "\n")),
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
  reportCiResult("Release security qualification", {
    Status: "passed",
    Source: release.source.head,
    "CodeQL analyses": selected.length,
    "Recipient audits": recipient.length,
    "Reported vulnerabilities": 0,
    "Manifest SHA256": hash(releaseBytes),
  });
}
