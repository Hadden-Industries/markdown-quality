// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { repositoryPython } from "./python-target.js";
import { artifactLimits } from "./artifact-policy.js";
import { candidateJobNames } from "./node-matrix.js";
import { assertUbuntuJobLabel, ubuntuRunner } from "./runner-policy.js";
import {
  releaseQualificationJobNames,
  releaseQualificationWorkflow,
  verifyReleaseQualificationJob,
} from "./release-qualification.js";
import { registryJobNames, registryWorkflow } from "./release-qualification.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";
import { bindStagingReconciliation } from "./release-staging-evidence.js";
import { validateConsumer } from "./ci-consumer.js";
import { releaseVersion, releaseChannel } from "./release-coordinates.js";

export const repository = "Hadden-Industries/markdown-quality";
export { hash } from "./release-bytes.js";
export const regularBytes = (path, maximum = 64 * 1024 * 1024) =>
  releaseBytes(path, maximum);
export const readJson = (path) =>
  JSON.parse(regularBytes(path, 16 * 1024 * 1024).toString("utf8"));

export function verifyQualification(qualified) {
  assert.ok(
    [1, 2].includes(qualified.schemaVersion),
    "Unsupported qualification reader format",
  );
  const current = qualified.schemaVersion === 2;
  releaseVersion(qualified.version);
  if (qualified.channel !== undefined) releaseChannel(qualified.channel);
  assert.match(qualified.source, /^[a-f0-9]{40}$/u);
  for (const key of ["manifestSha256", "originsSha256"])
    assert.match(qualified[key], /^[a-f0-9]{64}$/u);
  assert.equal(qualified.archives.length, 3);
  const packages = new Set();
  for (const archive of qualified.archives) {
    assert.match(
      archive.package,
      /^@hadden-industries\/markdown-quality(?:-win32-x64|-linux-x64)?$/u,
    );
    assert.ok(!packages.has(archive.package));
    packages.add(archive.package);
    assert.equal(
      archive.filename,
      `${archive.package.slice(1).replace("/", "-")}-${qualified.version}.tgz`,
    );
    assert.match(archive.sha256, /^[a-f0-9]{64}$/u);
    assert.match(archive.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
  }
  assert.deepEqual(
    Object.keys(qualified.reports).sort(),
    current
      ? releaseReportNames(qualified.candidate.matrix)
      : [
          "candidate-linux.json",
          "candidate-windows.json",
          "registry-linux.json",
          "registry-windows.json",
        ],
  );
  assert.deepEqual(Object.keys(qualified.materials).sort(), [
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
    "native-build.json",
    "native-rights.json",
    "snapper-0.11.9-source.tar.gz",
    "tool-manifest.json",
  ]);
  for (const value of Object.values(qualified.materials))
    assert.match(value, /^[a-f0-9]{64}$/u);
  for (const value of Object.values(qualified.reports))
    assert.match(value.sha256, /^[a-f0-9]{64}$/u);
  assert.match(qualified.native.source, /^[a-f0-9]{40}$/u);
  assert.match(qualified.native.buildSource, /^[a-f0-9]{40}$/u);
  assert.match(qualified.native.buildRun, /^[1-9]\d{0,15}$/u);
  for (const [kind, requiredJobs] of [
    [
      "candidate",
      current
        ? releaseQualificationJobNames(
            qualified.candidate.matrix,
            qualified.candidate.runtimePolicy,
          )
        : qualified.candidate.matrix
          ? candidateJobNames(
              qualified.candidate.matrix,
              qualified.candidate.runtimePolicy,
            )
          : ["pack", "consumer (windows-latest)", "consumer (ubuntu-24.04)"],
    ],
    [
      "publication",
      current
        ? registryJobNames(qualified.candidate.matrix)
        : [
            "admit",
            "publish",
            "registry (windows-latest)",
            "registry (ubuntu-24.04)",
          ],
    ],
  ]) {
    const expected = qualified[kind];
    assert.match(expected.run, /^[1-9]\d{0,15}$/u);
    assert.match(expected.attempt, /^[1-9]\d{0,15}$/u);
    assert.match(expected.source, /^[a-f0-9]{40}$/u);
    assert.equal(
      expected.workflow,
      current
        ? kind === "candidate"
          ? releaseQualificationWorkflow
          : registryWorkflow
        : `.github/workflows/${kind === "candidate" ? "candidate" : "publish"}.yml`,
    );
    assert.equal(
      expected.event,
      !current && kind === "candidate" ? "push" : "workflow_dispatch",
    );
    assert.equal(new Set(expected.jobs).size, expected.jobs.length);
    for (const job of requiredJobs) assert.ok(expected.jobs.includes(job));
    const permitted = [
      ...requiredJobs,
      ...(!current && kind === "publication"
        ? ["retained (windows-latest)", "retained (ubuntu-24.04)"]
        : []),
    ];
    assert.ok(expected.jobs.every((job) => permitted.includes(job)));
  }
  assert.equal(qualified.candidate.source, qualified.source);
  if (current) {
    for (const name of [
      "distribution-sbom.cdx.json",
      "distribution-evidence.json",
      "security-evidence.json",
      "public-security-evidence.json",
      "staging-provider.json",
      "publication-history.json",
      "signed-tag.json",
      "release-review.json",
      "release-acceptance.json",
      ...["win32-x64", "linux-x64", "core"].flatMap((name) => [
        `stage-${name}.jsonl`,
        `stage-${name}-reconciliation.json`,
      ]),
    ])
      assert.ok(qualified.evidence?.[name], `Missing ${name}`);
    for (const [name, digest] of Object.entries(qualified.evidence)) {
      assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u);
      assert.match(digest, /^[a-f0-9]{64}$/u);
    }
  }
}

export function releaseReportNames(matrix) {
  assert.ok(matrix?.os?.length && matrix?.node?.length);
  return ["candidate", "registry"]
    .flatMap((kind) =>
      matrix.os.flatMap((os) =>
        matrix.node.map((node) => `${kind}-${os}-${node}.json`),
      ),
    )
    .sort();
}

export function releaseNames(qualified) {
  verifyQualification(qualified);
  return [
    ...qualified.archives.map((a) => a.filename),
    "release-manifest.json",
    "source-sbom.cdx.json",
    "publication-origins.json",
    `markdown-quality-${qualified.version}-source.tar`,
    "snapper-0.11.9-source.tar.gz",
    "native-build.json",
    "native-rights.json",
    "tool-manifest.json",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
    ...Object.keys(qualified.reports),
    "candidate-provider.json",
    "publication-provider.json",
    ...Object.keys(qualified.evidence ?? {}),
    ...(qualified.channel !== undefined ? ["qualification.json"] : []),
  ].sort();
}

export function verifyProvider(provider, expected) {
  const { run, jobs } = provider;
  assert.equal(run.repository.full_name, repository);
  assert.equal(String(run.id), expected.run);
  assert.equal(String(run.run_attempt), expected.attempt);
  assert.equal(run.head_sha, expected.source);
  assert.equal(run.path, expected.workflow);
  assert.equal(run.event, expected.event);
  assert.equal(run.head_branch, "main");
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.equal(jobs.total_count, jobs.jobs.length);
  for (const name of expected.jobs) {
    const matches = jobs.jobs.filter((j) => j.name === name);
    assert.equal(matches.length, 1, "Missing or duplicate required job");
    if (expected.workflow === releaseQualificationWorkflow) {
      verifyReleaseQualificationJob(run, matches[0]);
      continue;
    }
    assert.equal(matches[0].status, "completed");
    assert.equal(matches[0].conclusion, "success");
    assert.equal(String(matches[0].run_id), expected.run);
    assert.equal(String(matches[0].run_attempt), expected.attempt);
    assert.equal(matches[0].head_sha ?? run.head_sha, expected.source);
    if (expected.workflow === registryWorkflow)
      assertUbuntuJobLabel(matches[0]);
  }
}

export function verifyPayloads(qualified, directory, sourceArchive) {
  verifyQualification(qualified);
  assert.equal(qualified.archives.length, 3);
  assert.deepEqual(qualified.archives.map((a) => a.package).sort(), [
    "@hadden-industries/markdown-quality",
    "@hadden-industries/markdown-quality-linux-x64",
    "@hadden-industries/markdown-quality-win32-x64",
  ]);
  const manifestBytes = regularBytes(join(directory, "release-manifest.json"));
  assert.equal(hash(manifestBytes), qualified.manifestSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.version, qualified.version);
  assert.equal(manifest.source.head, qualified.source);
  assert.equal(manifest.source.clean, true);
  assert.deepEqual(qualified.candidate.matrix, manifest.qualificationMatrix);
  assert.deepEqual(qualified.candidate.runtimePolicy, manifest.runtimePolicy);
  assert.deepEqual(qualified.native, {
    source: manifest.native.source.commit,
    buildSource: manifest.native.build.workflowCommit,
    buildRun: manifest.native.build.runId,
  });
  for (const archive of qualified.archives) {
    assert.equal(
      archive.filename,
      `${archive.package.slice(1).replace("/", "-")}-${qualified.version}.tgz`,
    );
    const declared = manifest.archives.find(
      (a) => a.package === archive.package,
    );
    assert.ok(declared);
    for (const key of ["filename", "sha256", "integrity"])
      assert.equal(declared[key], archive[key]);
    const bytes = regularBytes(join(directory, archive.filename));
    verifyArchiveBytes(bytes, archive);
  }
  assert.equal(
    hash(regularBytes(join(directory, manifest.sbom.filename))),
    manifest.sbom.sha256,
  );
  const originsBytes = regularBytes(
    join(directory, "publication-origins.json"),
  );
  assert.equal(hash(originsBytes), qualified.originsSha256);
  const origins = JSON.parse(originsBytes);
  assert.equal(origins.version, qualified.version);
  assert.equal(origins.artifactSource, qualified.source);
  assert.equal(origins.manifestSha, qualified.manifestSha256);
  assert.equal(origins.candidateRun, qualified.candidate.run);
  assert.deepEqual(origins.records, qualified.origins);
  for (const [name, expected] of Object.entries(qualified.reports)) {
    const bytes = regularBytes(join(directory, name));
    assert.equal(hash(bytes), expected.sha256);
    const report = JSON.parse(bytes);
    if (qualified.schemaVersion === 2)
      validateConsumer(report, {
        source: qualified.source,
        node: expected.node,
        os: expected.platform.startsWith("win32")
          ? "windows-2025"
          : ubuntuRunner(qualified.candidate.runtimePolicy),
        qualification: expected.qualification,
        policy: qualified.candidate.runtimePolicy,
      });
    assert.equal(report.passed, true);
    assert.equal(report.version, qualified.version);
    assert.equal(report.candidate, qualified.source);
    assert.equal(report.platform, expected.platform);
    assert.equal(report.qualification, expected.qualification);
    if (expected.node) assert.equal(report.node, `v${expected.node}`);
    assert.equal(
      report.scope,
      undefined,
      "Partial qualification is insufficient",
    );
    for (const archive of qualified.archives) {
      const found = report.records.filter((r) => r.package === archive.package);
      assert.equal(found.length, 1);
      assert.equal(found[0].sha256, archive.sha256);
      assert.equal(found[0].integrity, archive.integrity);
    }
  }
  verifyProvider(
    readJson(join(directory, "candidate-provider.json")),
    qualified.candidate,
  );
  verifyProvider(
    readJson(join(directory, "publication-provider.json")),
    qualified.publication,
  );
  assert.ok(
    regularBytes(
      join(directory, `markdown-quality-${qualified.version}-source.tar`),
    ).equals(sourceArchive),
    "Source archive must be native git archive of the expected commit",
  );
  for (const [name, sha256] of Object.entries(qualified.materials))
    assert.equal(hash(regularBytes(join(directory, name))), sha256);
  for (const [name, sha256] of Object.entries(qualified.evidence ?? {}))
    assert.equal(hash(regularBytes(join(directory, name))), sha256);
  if (qualified.schemaVersion === 2) {
    for (const archive of manifest.archives) {
      const origin = origins.records.find(
        (entry) => entry.package === archive.package,
      );
      assert.deepEqual(
        readJson(join(directory, `stage-${archive.name}-reconciliation.json`)),
        bindStagingReconciliation(
          regularBytes(join(directory, `stage-${archive.name}.jsonl`)),
          archive,
          origin,
          qualified,
        ),
        "Staging journal must be bound to the verified public tuple",
      );
    }
    verifyReleaseAcceptance(
      regularBytes(join(directory, "release-review.json")),
      qualified.evidence["release-review.json"],
      manifest,
      qualified.manifestSha256,
      "review",
    );
    const acceptance = verifyReleaseAcceptance(
      regularBytes(join(directory, "release-acceptance.json")),
      qualified.evidence["release-acceptance.json"],
      manifest,
      qualified.manifestSha256,
      "acceptance",
    );
    assert.equal(
      acceptance.reviewSha256,
      qualified.evidence["release-review.json"],
    );
    if (acceptance.schemaVersion === 2) {
      const review = readJson(join(directory, "release-review.json"));
      for (const key of [
        "channel",
        "operationId",
        "controller",
        "controllerDeltaSha256",
      ])
        assert.equal(acceptance[key], review[key]);
      assert.deepEqual(acceptance.guards, review.guards);
      assert.deepEqual(acceptance.candidate, review.candidate);
      assert.equal(qualified.channel, releaseChannel(review.channel));
      assert.equal(qualified.decision.reviewSha256, acceptance.reviewSha256);
    }
    assert.equal(
      String(acceptance.publicQualificationRun),
      qualified.publication.run,
    );
    assert.equal(
      String(acceptance.publicQualificationAttempt),
      qualified.publication.attempt,
    );
    for (const name of [
      "distribution-evidence.json",
      "security-evidence.json",
      "public-security-evidence.json",
    ]) {
      const evidence = readJson(join(directory, name));
      assert.equal(evidence.source, qualified.source);
      assert.equal(evidence.manifestSha256, qualified.manifestSha256);
    }
    const distribution = readJson(
      join(directory, "distribution-evidence.json"),
    );
    for (const payload of distribution.payloads)
      assert.equal(
        qualified.evidence[payload.name],
        payload.sha256,
        "Missing or replaced distribution evidence",
      );
  }
  const names = releaseNames(qualified);
  assert.equal(new Set(names).size, names.length);
  return names.map((name) => {
    const bytes = regularBytes(join(directory, name));
    return {
      name,
      size: bytes.length,
      sha256: hash(bytes),
      packageSource: qualified.source,
    };
  });
}

export function verifyBundle(qualified, directory, sourceArchive) {
  const evidence = readJson(join(directory, "release-evidence-manifest.json"));
  if (evidence.schemaVersion === 3)
    return verifyCompactBundle(qualified, directory, sourceArchive, evidence);
  const payloads = verifyPayloads(qualified, directory, sourceArchive);
  assert.deepEqual(evidence, {
    schemaVersion: 1,
    repository,
    version: qualified.version,
    tag: `v${qualified.version}`,
    source: qualified.source,
    native: qualified.native,
    candidate: qualified.candidate,
    publication: qualified.publication,
    origins: qualified.origins,
    payloads,
    scope:
      "Immutable archival of the qualified pilot tuple; stable promotion requires separate exact pilot and recovery acceptance.",
  });
  const bytes = regularBytes(join(directory, "release-evidence-manifest.json"));
  const assets = [
    ...payloads,
    {
      name: "release-evidence-manifest.json",
      size: bytes.length,
      sha256: hash(bytes),
      packageSource: qualified.source,
    },
  ];
  assert.deepEqual(
    readdirSync(directory).sort(),
    assets.map((a) => a.name).sort(),
  );
  // GitHub refuses empty uploads. Keep empty performance stderr in the
  // verified bundle and evidence manifest so the original bytes stay bound.
  return assets.filter(
    (asset) =>
      !(
        asset.size === 0 &&
        asset.name.startsWith("performance-") &&
        asset.name.endsWith(".stderr.txt")
      ),
  );
}

const assetName = (name) =>
  assert.match(name, /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}$/u);
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");

/** Emit an indexed representation after complete verification of the logical flat archive. */
export function compactReleaseBundle(
  qualified,
  directory,
  output,
  sourceArchive,
) {
  verifyBundle(qualified, directory, sourceArchive);
  const original = readJson(join(directory, "release-evidence-manifest.json"));
  assert.equal(original.schemaVersion, 1);
  const standalone = new Set([
    ...qualified.archives.map((archive) => archive.filename),
    `markdown-quality-${qualified.version}-source.tar`,
    "snapper-0.11.9-source.tar.gz",
    "release-manifest.json",
    "qualification.json",
    "publication-origins.json",
    "signed-tag.json",
    "release-review.json",
    "release-acceptance.json",
    "native-build.json",
    "native-rights.json",
    "tool-manifest.json",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
  ]);
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-proof-pack-"));
  try {
    mkdirSync(output);
    const members = [],
      assets = [];
    for (const entry of original.payloads) {
      assetName(entry.name);
      const bytes = regularBytes(join(directory, entry.name));
      if (standalone.has(entry.name)) {
        writeFileSync(join(output, entry.name), bytes, { flag: "wx" });
        assets.push(entry);
      } else {
        writeFileSync(join(scratch, entry.name), bytes, { flag: "wx" });
        members.push(entry);
      }
    }
    const zip = "release-evidence.zip";
    native(
      repositoryPython(),
      [
        fileURLToPath(new URL("./pack-artifact.py", import.meta.url)),
        scratch,
        join(output, zip),
        String(artifactLimits.payloadBytes),
      ],
      { timeout: 600000 },
    );
    const bytes = regularBytes(join(output, zip), artifactLimits.payloadBytes);
    assets.push({
      name: zip,
      size: bytes.length,
      sha256: hash(bytes),
      packageSource: qualified.source,
    });
    const index = {
      ...original,
      schemaVersion: 3,
      assets,
      evidence: { filename: zip, members },
    };
    writeFileSync(
      join(output, "release-evidence-manifest.json"),
      jsonBytes(index),
      { flag: "wx" },
    );
    return verifyCompactBundle(qualified, output, sourceArchive, index);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Authenticate the outer ZIP and every logical member, including genuine empty logs. */
function verifyCompactBundle(qualified, directory, sourceArchive, evidence) {
  assert.equal(evidence.repository, repository);
  assert.equal(evidence.version, qualified.version);
  assert.equal(evidence.source, qualified.source);
  assert.equal(evidence.evidence?.filename, "release-evidence.zip");
  assert.ok(
    Array.isArray(evidence.assets) &&
      evidence.assets.length > 0 &&
      evidence.assets.length <= 4096,
  );
  assert.ok(
    Array.isArray(evidence.evidence.members) &&
      evidence.evidence.members.length > 0 &&
      evidence.evidence.members.length <= 4096,
  );
  const names = new Set();
  let total = 0;
  const admit = (entry) => {
    assetName(entry.name);
    assert.ok(
      !names.has(entry.name.toLowerCase()),
      "Duplicate logical release member",
    );
    names.add(entry.name.toLowerCase());
    assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(entry.packageSource, qualified.source);
  };
  for (const entry of evidence.assets) {
    admit(entry);
    const bytes = regularBytes(
      join(directory, entry.name),
      artifactLimits.payloadBytes,
    );
    assert.equal(bytes.length, entry.size);
    assert.equal(hash(bytes), entry.sha256);
  }
  assert.ok(names.has("release-evidence.zip"));
  assert.ok(!names.has("release-evidence-manifest.json"));
  assert.deepEqual(
    readdirSync(directory).sort(),
    [
      ...evidence.assets.map((entry) => entry.name),
      "release-evidence-manifest.json",
    ].sort(),
  );
  for (const entry of evidence.evidence.members) {
    admit(entry);
    total += entry.size;
  }
  assert.ok(
    total <= artifactLimits.payloadBytes,
    "Logical release evidence exceeds the admitted transport budget",
  );
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-proof-read-"));
  try {
    const extracted = join(scratch, "proof"),
      logical = join(scratch, "logical");
    mkdirSync(extracted);
    mkdirSync(logical);
    native(
      repositoryPython(),
      [
        fileURLToPath(new URL("./extract-artifact.py", import.meta.url)),
        join(directory, "release-evidence.zip"),
        extracted,
        String(artifactLimits.payloadBytes),
      ],
      { timeout: 600000 },
    );
    assert.deepEqual(
      readdirSync(extracted).sort(),
      evidence.evidence.members.map((entry) => entry.name).sort(),
      "Extra or missing logical evidence member",
    );
    for (const entry of evidence.evidence.members) {
      const bytes = regularBytes(
        join(extracted, entry.name),
        artifactLimits.payloadBytes,
      );
      assert.equal(bytes.length, entry.size);
      assert.equal(hash(bytes), entry.sha256);
      writeFileSync(join(logical, entry.name), bytes, { flag: "wx" });
    }
    for (const entry of evidence.assets.filter(
      (entry) => entry.name !== "release-evidence.zip",
    ))
      writeFileSync(
        join(logical, entry.name),
        regularBytes(join(directory, entry.name)),
        { flag: "wx" },
      );
    const original = { ...evidence, schemaVersion: 1 };
    delete original.assets;
    delete original.evidence;
    writeFileSync(
      join(logical, "release-evidence-manifest.json"),
      jsonBytes(original),
      { flag: "wx" },
    );
    // Reuse the historical logical contract instead of inventing a weaker ZIP-only reader.
    verifyBundle(qualified, logical, sourceArchive);
    const bytes = regularBytes(
      join(directory, "release-evidence-manifest.json"),
    );
    return [
      ...evidence.assets,
      {
        name: "release-evidence-manifest.json",
        size: bytes.length,
        sha256: hash(bytes),
        packageSource: qualified.source,
      },
    ];
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Materialize verified logical members for admission/audits, keeping the outer asset directory immutable. */
export function materializeReleaseBundle(
  qualified,
  directory,
  output,
  sourceArchive,
) {
  const assets = verifyBundle(qualified, directory, sourceArchive);
  const index = readJson(join(directory, "release-evidence-manifest.json"));
  mkdirSync(output);
  const scratch = mkdtempSync(
    join(tmpdir(), "markdown-quality-proof-members-"),
  );
  try {
    if (index.schemaVersion === 3)
      native(
        repositoryPython(),
        [
          fileURLToPath(new URL("./extract-artifact.py", import.meta.url)),
          join(directory, index.evidence.filename),
          scratch,
          String(artifactLimits.payloadBytes),
        ],
        { timeout: 600000 },
      );
    for (const entry of index.payloads) {
      const packed =
        index.schemaVersion === 3 &&
        index.evidence.members.some((member) => member.name === entry.name);
      const bytes = regularBytes(
        join(packed ? scratch : directory, entry.name),
        artifactLimits.payloadBytes,
      );
      assert.equal(bytes.length, entry.size);
      assert.equal(hash(bytes), entry.sha256);
      writeFileSync(join(output, entry.name), bytes, { flag: "wx" });
    }
    return assets;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function verifyInventory(release, assets, allowMissing = false) {
  assert.ok(
    Array.isArray(release.assets) && release.assets.length <= assets.length,
  );
  const missing = new Map(assets.map((a) => [a.name, a]));
  for (const asset of release.assets) {
    const expected = missing.get(asset.name);
    assert.ok(expected, "Unexpected or duplicate release asset");
    assert.equal(asset.state, "uploaded");
    assert.equal(asset.size, expected.size);
    assert.equal(asset.digest, `sha256:${expected.sha256}`);
    missing.delete(asset.name);
  }
  if (!allowMissing)
    assert.equal(missing.size, 0, "Incomplete release inventory");
  return [...missing.values()];
}

import { hash, releaseBytes, verifyArchiveBytes } from "./release-bytes.js";
