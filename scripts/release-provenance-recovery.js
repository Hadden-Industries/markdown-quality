// SPDX-License-Identifier: AGPL-3.0-only
/** Recover closed legacy publish.yml evidence strictly from verified npm provenance. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native, npmCommand } from "./commands.js";
import { verifyReleaseProvenance } from "./provenance.js";
import { legacyPublicationSteps } from "./publication-steps.js";
import { hash } from "./release-bytes.js";
import { releasePackages, releaseVersion } from "./release-coordinates.js";
import { legacyRunClosed, writerBaseline } from "./release-writer-inventory.js";

export const LEGACY_REPOSITORY = "Hadden-Industries/markdown-quality";
export const LEGACY_WORKFLOW = ".github/workflows/publish.yml";
export const LEGACY_REGISTRY = "https://registry.npmjs.org/";
export const LEGACY_RECOVERY_FILE = "provenance-recovery.json";
export const LEGACY_RECOVERY_SOURCE = "npm-provenance-recovery";

assert.equal(legacyPublicationSteps.length, 3);
assert.equal(releasePackages.length, 3);

const LEGACY_STEP_PACKAGES = legacyPublicationSteps.map((step, index) => ({
  step,
  package: releasePackages[index],
}));

const VALID_STEP_CONCLUSIONS = new Set([
  "success",
  "skipped",
  "failure",
  "cancelled",
  "timed_out",
]);

function decodeSriSha512(integrity) {
  assert.equal(typeof integrity, "string", "Missing tarball SRI integrity");
  const match = /^sha512-([A-Za-z0-9+/]+={0,2})$/u.exec(integrity);
  assert.ok(match, "Expected sha512 SRI integrity digest");
  const raw = Buffer.from(match[1], "base64");
  assert.equal(raw.length, 64, "Invalid sha512 digest length");
  assert.equal(raw.toString("base64"), match[1]);
  return raw.toString("hex");
}

function packagePurl(pkg, version) {
  const encoded = pkg.startsWith("@") ? `%40${pkg.slice(1)}` : pkg;
  return `pkg:npm/${encoded}@${version}`;
}

function expectedInvocationUrl(repository, runId, attempt) {
  return `https://github.com/${repository}/actions/runs/${runId}/attempts/${attempt}`;
}

function parseTimestamp(value, label) {
  assert.equal(typeof value, "string", `Missing timestamp: ${label}`);
  const ms = Date.parse(value);
  assert.ok(Number.isFinite(ms), `Invalid timestamp: ${label}`);
  return ms;
}

function completedStepsByName(job) {
  return LEGACY_STEP_PACKAGES.map(({ step, package: pkg }) => {
    const matches =
      job.steps?.filter((candidate) => candidate.name === step) ?? [];
    assert.equal(
      matches.length,
      1,
      `Expected one legacy publish step: ${step}`,
    );
    const entry = matches[0];
    assert.equal(entry.status, "completed", `Incomplete publish step: ${step}`);
    assert.ok(
      VALID_STEP_CONCLUSIONS.has(entry.conclusion),
      `Unsupported publish step conclusion: ${entry.conclusion}`,
    );
    return { ...entry, package: pkg };
  });
}

function registryJobsSkipped(inventory) {
  const jobs =
    inventory?.jobs?.filter(
      (job) => job.name === "registry" || job.name.startsWith("registry "),
    ) ?? [];
  return jobs.every(
    (job) => job.status === "completed" && job.conclusion === "skipped",
  );
}

/** Check whether a missing/expired run belongs to the closed legacy publish.yml cohort. */
export function eligibleLegacyPublishRecovery({
  run,
  attempt,
  job,
  baseline,
  observedAt = Date.now(),
  repository = LEGACY_REPOSITORY,
} = {}) {
  const effectiveBaseline = baseline ?? writerBaseline;
  if (!run || !job || attempt !== 1 || run.run_attempt !== 1) return false;
  if (run.repository?.full_name !== repository) return false;
  if (run.path !== LEGACY_WORKFLOW) return false;
  if (run.event !== "workflow_dispatch" || run.head_branch !== "main")
    return false;
  if (run.status !== "completed" || job.status !== "completed") return false;
  if (job.name !== "publish") return false;
  if (job.run_id !== run.id || job.run_attempt !== attempt) return false;
  if (job.head_sha !== run.head_sha) return false;
  if (!legacyRunClosed(run, observedAt)) return false;
  if (!effectiveBaseline?.publish?.runs?.includes(run.id)) return false;
  const steps = completedStepsByName(job);
  return steps.some((step) => step.conclusion !== "skipped");
}

async function defaultReadPackument(pkg) {
  const response = await fetch(`${LEGACY_REGISTRY}${encodeURIComponent(pkg)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  assert.ok(
    response.ok,
    `Failed to read npm packument for ${pkg} (${response.status})`,
  );
  const packument = await response.json();
  assert.equal(packument?.name, pkg, "Packument name mismatch");
  assert.ok(
    packument.versions && typeof packument.versions === "object",
    "Packument missing versions",
  );
  assert.ok(
    packument.time && typeof packument.time === "object",
    "Packument missing publish time index",
  );
  return packument;
}

function readTargetVersion({ repository, sha, gh }) {
  const file = JSON.parse(
    gh(["api", `repos/${repository}/contents/package.json?ref=${sha}`]),
  );
  assert.equal(file.type, "file");
  assert.equal(file.path, "package.json");
  assert.equal(file.encoding, "base64");
  const pkg = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  return releaseVersion(pkg.version);
}

function extractVerifiedProvenance(audit, pkg, version, packument) {
  const matches = audit.verified.filter(
    (record) => record.name === pkg && record.version === version,
  );
  assert.equal(
    matches.length,
    1,
    `Missing or duplicate verified npm signature record: ${pkg}@${version}`,
  );
  const record = matches[0];
  const bundles =
    record.attestationBundles?.filter(
      (entry) => entry.predicateType === "https://slsa.dev/provenance/v1",
    ) ?? [];
  assert.equal(
    bundles.length,
    1,
    `Expected one verified SLSA v1 provenance attestation for ${pkg}@${version}`,
  );
  const statement = JSON.parse(
    Buffer.from(bundles[0].bundle.dsseEnvelope.payload, "base64").toString(
      "utf8",
    ),
  );
  const dependency =
    statement?.predicate?.buildDefinition?.resolvedDependencies?.[0];
  const source = dependency?.digest?.gitCommit;
  assert.match(source ?? "", /^[a-f0-9]{40}$/u);
  const invocationId =
    statement?.predicate?.runDetails?.metadata?.invocationId ?? "";
  const match =
    /^https:\/\/github\.com\/Hadden-Industries\/markdown-quality\/actions\/runs\/([1-9]\d*)\/attempts\/([1-9]\d*)$/u.exec(
      invocationId,
    );
  assert.ok(match, `Invalid SLSA provenance invocationId: ${invocationId}`);
  const runId = Number(match[1]),
    attempt = Number(match[2]);

  // Reuse verifyReleaseProvenance so SLSA workflow/builder/event invariants cannot drift.
  verifyReleaseProvenance(audit, [{ package: pkg }], {
    version,
    publicationOrigins: {
      records: [{ package: pkg, source, run: runId, attempt }],
    },
  });

  const versionMeta = packument.versions[version];
  assert.ok(
    versionMeta?.dist?.integrity,
    `Missing dist.integrity: ${pkg}@${version}`,
  );
  const expectedSha512 = decodeSriSha512(versionMeta.dist.integrity);
  assert.ok(
    Array.isArray(statement.subject) && statement.subject.length === 1,
    `Expected one SLSA subject for ${pkg}@${version}`,
  );
  assert.equal(
    statement.subject[0].name,
    packagePurl(pkg, version),
    `SLSA subject PURL mismatch for ${pkg}@${version}`,
  );
  assert.equal(
    statement.subject[0].digest?.sha512,
    expectedSha512,
    `SLSA subject sha512 mismatch against packument dist.integrity for ${pkg}@${version}`,
  );
  const publishedAt = packument.time[version];
  parseTimestamp(publishedAt, `packument.time[${pkg}@${version}]`);
  return {
    package: pkg,
    version,
    source,
    run: runId,
    attempt,
    invocation: invocationId,
    integrity: versionMeta.dist.integrity,
    sha512: expectedSha512,
    publishedAt,
  };
}

function auditTargetPackages(targets, packuments, { npm, tempRoot }) {
  const scratch = mkdtempSync(join(tempRoot, "npm-provenance-recovery-"));
  try {
    writeFileSync(
      join(scratch, ".npmrc"),
      `registry=${LEGACY_REGISTRY}\nignore-scripts=true\naudit=false\nfund=false\n`,
    );
    const dependencies = Object.fromEntries(
      targets.map(({ package: pkg, version }, index) => [
        `recovery-${index}`,
        `npm:${pkg}@${version}`,
      ]),
    );
    writeFileSync(
      join(scratch, "package.json"),
      JSON.stringify(
        {
          name: "markdown-quality-provenance-recovery",
          version: "0.0.0",
          private: true,
          dependencies,
        },
        null,
        2,
      ) + "\n",
    );
    npm(
      [
        "install",
        "--force",
        "--ignore-scripts",
        "--omit=optional",
        "--no-audit",
        "--no-fund",
        `--registry=${LEGACY_REGISTRY}`,
      ],
      { cwd: scratch },
    );
    const audit = JSON.parse(
      npm(
        [
          "audit",
          "signatures",
          "--json",
          "--include-attestations",
          `--registry=${LEGACY_REGISTRY}`,
        ],
        { cwd: scratch },
      ),
    );
    assert.deepEqual(audit.invalid, [], "Invalid npm registry signature");
    assert.deepEqual(audit.missing, [], "Missing npm registry signature");
    assert.ok(Array.isArray(audit.verified));
    const records = targets.map(({ package: pkg, version }) =>
      extractVerifiedProvenance(audit, pkg, version, packuments.get(pkg)),
    );
    return records;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function selectVersionsToAudit(packuments, requiredVersions, runs) {
  const baselineCreated = runs.length
    ? Math.min(
        ...runs.map((run) => parseTimestamp(run.created_at, "run.created_at")),
      )
    : null;
  const baselineUpdated = runs.length
    ? Math.max(
        ...runs.map((run) => parseTimestamp(run.updated_at, "run.updated_at")),
      )
    : null;
  const targets = [];
  for (const pkg of releasePackages) {
    const packument = packuments.get(pkg);
    const eligibleVersions = Object.keys(packument.versions).filter((ver) => {
      if (requiredVersions.has(ver)) return true;
      try {
        releaseVersion(ver, { stable: true });
        return true;
      } catch {
        const published = Date.parse(packument.time?.[ver] ?? "");
        return (
          baselineCreated !== null &&
          Number.isFinite(published) &&
          published >= baselineCreated - 60_000
        );
      }
    });
    const selected =
      eligibleVersions.length <= 40
        ? eligibleVersions
        : eligibleVersions.filter((ver) => {
            if (requiredVersions.has(ver)) return true;
            if (baselineCreated === null) return false;
            const published = Date.parse(packument.time?.[ver] ?? "");
            return (
              Number.isFinite(published) &&
              published >= baselineCreated - 7 * 86_400_000 &&
              published <= baselineUpdated + 30 * 86_400_000
            );
          });
    for (const ver of requiredVersions)
      if (packument.versions[ver] && !selected.includes(ver))
        selected.push(ver);
    for (const ver of selected) targets.push({ package: pkg, version: ver });
  }
  return targets;
}

function evaluateStepRecords({
  repository,
  run,
  attempt,
  job,
  inventory,
  targetVersion,
  byPackageVersion,
  byInvocation,
  lookupRun,
}) {
  const steps = completedStepsByName(job);
  const invocationKey = `${run.id}/${attempt}`;
  const publishedByRun = byInvocation.get(invocationKey) ?? [];
  const packages = [];
  const accounted = new Set();

  for (const step of steps) {
    const pkg = step.package;
    const coord = `${pkg}@${targetVersion}`;
    const record = byPackageVersion.get(coord);

    if (step.conclusion === "skipped") {
      assert.equal(
        publishedByRun.some((entry) => entry.package === pkg),
        false,
        `Skipped step ${step.name} contradicts verified npm provenance on run ${run.id}`,
      );
      packages.push({
        package: pkg,
        step: step.name,
        stepConclusion: "skipped",
        disposition: "skipped",
      });
      continue;
    }

    if (step.conclusion === "success") {
      assert.ok(
        record &&
          record.run === run.id &&
          record.attempt === attempt &&
          record.source === run.head_sha,
        `Successful legacy step ${step.name} lacks matching verified SLSA provenance for ${coord}`,
      );
      accounted.add(coord);
      packages.push({
        package: pkg,
        step: step.name,
        stepConclusion: "success",
        disposition: "published",
        provenance: record,
      });
      continue;
    }

    // Failed/cancelled/timed_out step: either it published before exiting non-zero,
    // or zero family packages carry this run's invocationId and a strictly later run preempted it.
    if (
      record &&
      record.run === run.id &&
      record.attempt === attempt &&
      record.source === run.head_sha
    ) {
      accounted.add(coord);
      packages.push({
        package: pkg,
        step: step.name,
        stepConclusion: step.conclusion,
        disposition: "published-despite-step-failure",
        provenance: record,
      });
      continue;
    }

    assert.notEqual(
      job.conclusion,
      "success",
      `Failed step preemption requires non-success job conclusion on run ${run.id}`,
    );
    assert.notEqual(
      run.conclusion,
      "success",
      `Failed step preemption requires non-success run conclusion on run ${run.id}`,
    );
    assert.ok(
      steps
        .filter((other) => other.name !== step.name)
        .every((other) => other.conclusion === "skipped"),
      `Failed run ${run.id} executed other steps so it cannot be discharged by preemption`,
    );
    assert.ok(
      registryJobsSkipped(inventory),
      `Failed run ${run.id} ran registry verification unexpectedly`,
    );
    assert.equal(
      publishedByRun.length,
      0,
      `Failed run ${run.id} unexpectedly published npm artifacts`,
    );
    assert.ok(
      record && record.run !== run.id,
      `Preempted step ${step.name} lacks verified immutable successor on npm for ${coord}`,
    );

    const supersedingRun = lookupRun(record.run);
    assert.ok(
      supersedingRun,
      `Missing superseding publish run ${record.run} for ${coord}`,
    );
    assert.equal(
      supersedingRun.repository?.full_name ?? repository,
      repository,
    );
    assert.equal(supersedingRun.path, LEGACY_WORKFLOW);
    assert.equal(supersedingRun.event, "workflow_dispatch");
    assert.equal(supersedingRun.head_branch, "main");
    assert.equal(
      supersedingRun.head_sha,
      record.source,
      `Superseding run ${record.run} head_sha differs from verified SLSA provenance`,
    );
    const failedClosedAt = Math.max(
      parseTimestamp(job.completed_at, "job.completed_at"),
      parseTimestamp(run.updated_at, "run.updated_at"),
    );
    const supersedingCreatedAt = parseTimestamp(
      supersedingRun.created_at,
      "supersedingRun.created_at",
    );
    const publishedAt = parseTimestamp(
      record.publishedAt,
      "record.publishedAt",
    );
    assert.ok(
      supersedingCreatedAt > failedClosedAt,
      `Claimed preempting run ${record.run} did not start after failed run ${run.id} closed`,
    );
    assert.ok(
      publishedAt > failedClosedAt && publishedAt >= supersedingCreatedAt,
      `Superseding publish time for ${coord} does not postdate failed run ${run.id}`,
    );
    packages.push({
      package: pkg,
      step: step.name,
      stepConclusion: step.conclusion,
      disposition: "preempted",
      preemptedBy: {
        ...record,
        runCreatedAt: supersedingRun.created_at,
      },
    });
  }

  for (const extra of publishedByRun)
    assert.ok(
      accounted.has(`${extra.package}@${extra.version}`) &&
        extra.version === targetVersion,
      `Run ${run.id} published unexpected package version ${extra.package}@${extra.version}`,
    );

  assert.ok(
    packages.some((entry) => entry.disposition !== "skipped"),
    `Legacy recovery requires at least one non-skipped step outcome on run ${run.id}`,
  );
  return packages;
}

/** Construct canonical synthetic writer observation holding signed recovery evidence bytes. */
export function buildRecoveredWriterEntry({
  repository = LEGACY_REPOSITORY,
  run,
  attempt,
  job,
  inventory,
  version,
  packages,
}) {
  const document = {
    schemaVersion: 1,
    kind: "legacy-publish-provenance-recovery",
    repository,
    workflow: LEGACY_WORKFLOW,
    run: run.id,
    attempt,
    job: job.id,
    jobConclusion: job.conclusion,
    runConclusion: run.conclusion,
    source: run.head_sha,
    version,
    registry: LEGACY_REGISTRY,
    packages,
  };
  const bytes = Buffer.from(JSON.stringify(document, null, 2) + "\n");
  const digest = hash(bytes);
  return {
    run,
    attempt,
    job,
    inventory,
    artifact: {
      id: null,
      name: `publication-source-and-manifest-${attempt}`,
      size_in_bytes: bytes.length,
      digest: `sha256:${digest}`,
      expires_at: null,
      source: LEGACY_RECOVERY_SOURCE,
      workflow_run: {
        id: run.id,
        repository_id: run.repository.id,
        head_repository_id: run.head_repository.id,
        head_sha: run.head_sha,
      },
    },
    files: {
      [LEGACY_RECOVERY_FILE]: {
        sha256: digest,
        base64: bytes.toString("base64"),
      },
    },
  };
}

function verifyProvenanceFields(
  record,
  expectedPkg,
  expectedVersion,
  expectedRun,
) {
  assert.equal(record?.package, expectedPkg);
  assert.equal(record.version, expectedVersion);
  assert.match(record.source ?? "", /^[a-f0-9]{40}$/u);
  assert.ok(Number.isInteger(record.run) && record.run > 0);
  assert.ok(Number.isInteger(record.attempt) && record.attempt > 0);
  assert.equal(
    record.invocation,
    expectedInvocationUrl(LEGACY_REPOSITORY, record.run, record.attempt),
  );
  decodeSriSha512(record.integrity);
  assert.match(record.sha512 ?? "", /^[a-f0-9]{128}$/u);
  assert.equal(record.sha512, decodeSriSha512(record.integrity));
  parseTimestamp(record.publishedAt, "record.publishedAt");
  if (expectedRun !== undefined) assert.equal(record.run, expectedRun);
}

/** Verify structural and cryptographic consistency of a checkpoint's recovered legacy writer entry. */
export function verifyRecoveredProvenanceWriter(entry) {
  const hasFile = Boolean(entry.files?.[LEGACY_RECOVERY_FILE]);
  const hasSource = entry.artifact?.source === LEGACY_RECOVERY_SOURCE;
  assert.equal(
    hasFile,
    hasSource,
    "Provenance recovery file and artifact source marker must match",
  );
  if (!hasFile) return null;

  assert.equal(entry.artifact.id, null);
  assert.equal(
    entry.artifact.name,
    `publication-source-and-manifest-${entry.attempt}`,
  );
  assert.equal(entry.artifact.expires_at, null);
  assert.deepEqual(Object.keys(entry.files), [LEGACY_RECOVERY_FILE]);
  const raw = Buffer.from(entry.files[LEGACY_RECOVERY_FILE].base64, "base64");
  assert.equal(entry.artifact.size_in_bytes, raw.length);
  assert.equal(
    entry.artifact.digest,
    `sha256:${entry.files[LEGACY_RECOVERY_FILE].sha256}`,
  );
  assert.equal(hash(raw), entry.files[LEGACY_RECOVERY_FILE].sha256);

  assert.equal(entry.run.path, LEGACY_WORKFLOW);
  assert.equal(entry.run.event, "workflow_dispatch");
  assert.equal(entry.run.head_branch, "main");
  assert.equal(entry.attempt, 1);
  assert.equal(entry.job.name, "publish");

  const doc = JSON.parse(raw.toString("utf8"));
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.kind, "legacy-publish-provenance-recovery");
  assert.equal(doc.repository, LEGACY_REPOSITORY);
  assert.equal(doc.workflow, LEGACY_WORKFLOW);
  assert.equal(doc.run, entry.run.id);
  assert.equal(doc.attempt, entry.attempt);
  assert.equal(doc.job, entry.job.id);
  assert.equal(doc.jobConclusion, entry.job.conclusion);
  assert.equal(doc.runConclusion, entry.run.conclusion);
  assert.equal(doc.source, entry.run.head_sha);
  assert.equal(doc.registry, LEGACY_REGISTRY);
  releaseVersion(doc.version);

  const steps = completedStepsByName(entry.job);
  assert.ok(
    Array.isArray(doc.packages) && doc.packages.length === steps.length,
    "Recovered writer package list mismatch",
  );
  const failedClosedAt = Math.max(
    parseTimestamp(entry.job.completed_at, "job.completed_at"),
    parseTimestamp(entry.run.updated_at, "run.updated_at"),
  );

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const record = doc.packages[index];
    assert.equal(record?.package, step.package);
    assert.equal(record.step, step.name);
    assert.equal(record.stepConclusion, step.conclusion);

    if (step.conclusion === "skipped") {
      assert.equal(record.disposition, "skipped");
      assert.equal(record.provenance, undefined);
      assert.equal(record.preemptedBy, undefined);
      continue;
    }
    if (step.conclusion === "success") {
      assert.equal(record.disposition, "published");
      assert.equal(record.preemptedBy, undefined);
      verifyProvenanceFields(
        record.provenance,
        step.package,
        doc.version,
        doc.run,
      );
      assert.equal(record.provenance.attempt, doc.attempt);
      assert.equal(record.provenance.source, doc.source);
      continue;
    }
    if (record.disposition === "published-despite-step-failure") {
      assert.equal(record.preemptedBy, undefined);
      verifyProvenanceFields(
        record.provenance,
        step.package,
        doc.version,
        doc.run,
      );
      assert.equal(record.provenance.attempt, doc.attempt);
      assert.equal(record.provenance.source, doc.source);
      continue;
    }
    assert.equal(record.disposition, "preempted");
    assert.equal(record.provenance, undefined);
    assert.notEqual(doc.jobConclusion, "success");
    assert.notEqual(doc.runConclusion, "success");
    assert.ok(
      steps
        .filter((other) => other.name !== step.name)
        .every((other) => other.conclusion === "skipped"),
    );
    assert.ok(registryJobsSkipped(entry.inventory));
    const by = record.preemptedBy;
    verifyProvenanceFields(by, step.package, doc.version);
    assert.notEqual(by.run, doc.run);
    const createdAt = parseTimestamp(
      by.runCreatedAt,
      "preemptedBy.runCreatedAt",
    );
    const publishedAt = parseTimestamp(
      by.publishedAt,
      "preemptedBy.publishedAt",
    );
    assert.ok(createdAt > failedClosedAt);
    assert.ok(publishedAt > failedClosedAt && publishedAt >= createdAt);
  }
  assert.ok(
    doc.packages.some((entryRecord) => entryRecord.disposition !== "skipped"),
  );
  return doc;
}

/**
 * Memoized legacy provenance resolver verifying npm signatures, SLSA v1 provenance,
 * package.json source binding and strict failure preemption per collector invocation.
 */
export function createLegacyProvenanceResolver({
  repository = LEGACY_REPOSITORY,
  baseline,
  runs = [],
  gh = (args) => native("gh", args),
  npm = (args, options) => npmCommand(args, options),
  readPackument = defaultReadPackument,
  tempRoot = tmpdir(),
} = {}) {
  const runsById = new Map(runs.map((run) => [Number(run.id), run]));
  const versionBySha = new Map();
  let packumentsPromise;
  let verifiedState;

  const lookupRun = (runId) => {
    const id = Number(runId);
    if (!runsById.has(id)) {
      const fetched = JSON.parse(
        gh(["api", `repos/${repository}/actions/runs/${id}`]),
      );
      runsById.set(id, fetched);
    }
    return runsById.get(id);
  };

  const targetVersionFor = (sha) => {
    if (!versionBySha.has(sha))
      versionBySha.set(sha, readTargetVersion({ repository, sha, gh }));
    return versionBySha.get(sha);
  };

  const ensureVerified = async (requiredVersions) => {
    if (!packumentsPromise)
      packumentsPromise = Promise.all(
        releasePackages.map(async (pkg) => [pkg, await readPackument(pkg)]),
      ).then((entries) => new Map(entries));
    const packuments = await packumentsPromise;

    const needed = new Set(requiredVersions);
    const missingFromSnapshot =
      !verifiedState ||
      releasePackages.some((pkg) =>
        [...needed].some(
          (ver) =>
            packuments.get(pkg).versions[ver] &&
            !verifiedState.byPackageVersion.has(`${pkg}@${ver}`),
        ),
      );

    if (missingFromSnapshot) {
      const targets = selectVersionsToAudit(packuments, needed, [
        ...runsById.values(),
      ]).filter(
        ({ package: pkg, version: ver }) =>
          !verifiedState?.byPackageVersion.has(`${pkg}@${ver}`),
      );
      const records = targets.length
        ? auditTargetPackages(targets, packuments, { npm, tempRoot })
        : [];
      const byPackageVersion = verifiedState?.byPackageVersion ?? new Map();
      const byInvocation = verifiedState?.byInvocation ?? new Map();
      for (const record of records) {
        const coord = `${record.package}@${record.version}`;
        if (!byPackageVersion.has(coord)) {
          byPackageVersion.set(coord, record);
          const key = `${record.run}/${record.attempt}`;
          const list = byInvocation.get(key) ?? [];
          list.push(record);
          byInvocation.set(key, list);
        }
      }
      verifiedState = { byPackageVersion, byInvocation };
    }
    return { packuments, ...verifiedState };
  };

  const verifyAndEvaluate = async ({
    run,
    attempt,
    job,
    inventory,
    observedAt = Date.now(),
    publishRuns = [],
  }) => {
    for (const listed of publishRuns) runsById.set(Number(listed.id), listed);
    if (
      !eligibleLegacyPublishRecovery({
        run,
        attempt,
        job,
        baseline,
        observedAt,
        repository,
      })
    )
      return null;

    const targetVersion = targetVersionFor(run.head_sha);
    const { byPackageVersion, byInvocation } = await ensureVerified([
      targetVersion,
    ]);
    const packages = evaluateStepRecords({
      repository,
      run,
      attempt,
      job,
      inventory,
      targetVersion,
      byPackageVersion,
      byInvocation,
      lookupRun,
    });
    return { targetVersion, packages };
  };

  return {
    async recoverWriter(input) {
      const evaluated = await verifyAndEvaluate(input);
      if (!evaluated) return null;
      return buildRecoveredWriterEntry({
        repository,
        run: input.run,
        attempt: input.attempt,
        job: input.job,
        inventory: input.inventory,
        version: evaluated.targetVersion,
        packages: evaluated.packages,
      });
    },
    async recoverSubject(input) {
      const evaluated = await verifyAndEvaluate(input);
      return evaluated ? { version: evaluated.targetVersion } : null;
    },
  };
}
