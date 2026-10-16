// SPDX-License-Identifier: AGPL-3.0-only
/** Assemble provider-bound evidence for the existing immutable GitHub release writer. */
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { native } from "./commands.js";
import {
  hash,
  readJson,
  regularBytes,
  repository,
  verifyQualification,
} from "./release-assets.js";
import {
  requireManualControl,
  readProvider,
  providerFor,
  verifyStagingContinuation,
} from "./release-continuation.js";
import { registryWorkflow, registryJobNames } from "./release-qualification.js";
import { prepareGithubRelease } from "./prepare-github-release.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";
import { bindStagingReconciliation } from "./release-staging-evidence.js";

assert.equal(
  process.argv.length,
  3,
  "Usage: collect-release-evidence.js NEW_OUTPUT_DIRECTORY",
);
requireManualControl(process.env, ".github/workflows/github-release.yml");
const output = resolve(process.argv[2]);
mkdirSync(output);
const input = join(output, "input");
mkdirSync(input);
const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-archive-"));
try {
  const registry = readProvider(
    process.env.REGISTRY_RUN,
    process.env.REGISTRY_ATTEMPT,
  );
  const downloaded = new Map();
  const download = (run, name) => {
    assert.match(String(run), /^[1-9]\d{0,15}$/u);
    assert.match(name, /^[a-zA-Z0-9._-]+$/u);
    const path = join(scratch, `${run}-${name}`);
    if (downloaded.has(path)) return path;
    native("gh", [
      "run",
      "download",
      String(run),
      "--repo",
      repository,
      "--name",
      name,
      "--dir",
      path,
    ]);
    downloaded.set(path, true);
    return path;
  };
  const frozen = download(
    registry.run.id,
    `public-release-inputs-${registry.run.run_attempt}`,
  );
  const bytes = regularBytes(join(frozen, "release-manifest.json"));
  assert.match(process.env.MANIFEST_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(hash(bytes), process.env.MANIFEST_SHA);
  const release = JSON.parse(bytes);
  const context = readJson(join(frozen, "continuation.json"));
  const publication = providerFor(
    registry.run,
    registry.jobs,
    registryWorkflow,
    registryJobNames(release.qualificationMatrix),
  );
  const candidate = readProvider(
    context.qualification.run,
    context.qualification.attempt,
  );
  const stage = readProvider(context.staging.run, context.staging.attempt);
  const originBytes = regularBytes(join(frozen, "publication-origins.json"));
  assert.deepEqual(
    verifyStagingContinuation({
      release,
      manifestSha: hash(bytes),
      origins: { bytes: originBytes },
      originsSha: context.originsSha256,
      candidate,
      stage,
    }),
    context,
  );
  const qualified = {
    schemaVersion: 2,
    version: release.version,
    source: release.source.head,
    manifestSha256: hash(bytes),
    originsSha256: hash(originBytes),
    archives: release.archives.map(
      ({ package: packageName, filename, sha256, integrity }) => ({
        package: packageName,
        filename,
        sha256,
        integrity,
      }),
    ),
    origins: context.origins.records,
    candidate: {
      ...context.qualification,
      matrix: release.qualificationMatrix,
      runtimePolicy: release.runtimePolicy,
    },
    publication,
    native: {
      source: release.native.source.commit,
      buildSource: release.native.build.workflowCommit,
      buildRun: release.native.build.runId,
    },
    reports: {},
    materials: {},
    evidence: {},
  };
  const save = (name, bytes) => {
    assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u);
    writeFileSync(join(input, name), bytes, { flag: "wx" });
    return hash(bytes);
  };
  const evidence = (name, path) => {
    qualified.evidence[name] = save(name, regularBytes(path));
  };
  for (const name of [
    "release-manifest.json",
    "publication-origins.json",
    "source-sbom.cdx.json",
    ...release.archives.map(({ filename }) => filename),
  ])
    save(name, regularBytes(join(frozen, name)));
  save(
    "candidate-provider.json",
    Buffer.from(JSON.stringify(candidate, null, 2) + "\n"),
  );
  save(
    "publication-provider.json",
    Buffer.from(JSON.stringify(registry, null, 2) + "\n"),
  );
  qualified.evidence["staging-provider.json"] = save(
    "staging-provider.json",
    Buffer.from(JSON.stringify(stage, null, 2) + "\n"),
  );
  evidence("signed-tag.json", join(frozen, "signed-tag.json"));
  for (const kind of ["candidate", "registry"])
    for (const os of release.qualificationMatrix.os)
      for (const node of release.qualificationMatrix.node) {
        const artifact =
          kind === "candidate"
            ? node === release.runtimePolicy.reference
              ? `candidate-${os}`
              : `candidate-${os}-${node}`
            : `registry-${os}-${node}-${publication.attempt}`;
        const run =
          kind === "candidate" ? qualified.candidate.run : publication.run;
        const reportBytes = regularBytes(
          join(download(run, artifact), `${kind}-qualification.json`),
        );
        const name = `${kind}-${os}-${node}.json`;
        qualified.reports[name] = {
          platform: os === "windows-latest" ? "win32-x64" : "linux-x64",
          qualification:
            kind === "candidate"
              ? "transported candidate archives"
              : "public registry",
          node,
          sha256: save(name, reportBytes),
        };
      }
  const distribution = download(
    qualified.candidate.run,
    `release-distribution-${qualified.candidate.attempt}`,
  );
  const inventory = readJson(join(distribution, "distribution-evidence.json"));
  for (const { name, sha256 } of inventory.payloads) {
    assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u);
    evidence(name, join(distribution, name));
    assert.equal(qualified.evidence[name], sha256);
  }
  evidence(
    "distribution-evidence.json",
    join(distribution, "distribution-evidence.json"),
  );
  for (const [run, artifact, prefix] of [
    [
      qualified.candidate.run,
      `release-security-${qualified.candidate.attempt}`,
      "",
    ],
    [
      publication.run,
      `public-release-security-${publication.attempt}`,
      "public-",
    ],
  ]) {
    const security = download(run, artifact);
    for (const name of readdirSync(security))
      evidence(`${prefix}${name}`, join(security, name));
    for (const os of release.qualificationMatrix.os) {
      const recipient = download(run, `recipient-${os}`);
      for (const name of readdirSync(recipient))
        evidence(`${prefix}recipient-${os}-${name}`, join(recipient, name));
    }
  }
  for (const os of release.qualificationMatrix.os) {
    const performance = download(qualified.candidate.run, `performance-${os}`);
    for (const entry of readdirSync(performance, { withFileTypes: true }))
      if (entry.isFile())
        evidence(
          `performance-${os}-${entry.name}`,
          join(performance, entry.name),
        );
  }
  for (const origin of context.origins.records) {
    const archive = release.archives.find(
      ({ package: packageName }) => packageName === origin.package,
    );
    const staged = download(origin.run, "publication-source-and-manifest");
    const journal = regularBytes(
      join(staged, "staging-journal", `${archive.name}.jsonl`),
    );
    qualified.evidence[`stage-${archive.name}.jsonl`] = save(
      `stage-${archive.name}.jsonl`,
      journal,
    );
    const name = `stage-${archive.name}-reconciliation.json`;
    qualified.evidence[name] = save(
      name,
      Buffer.from(
        JSON.stringify(
          bindStagingReconciliation(journal, archive, origin, qualified),
          null,
          2,
        ) + "\n",
      ),
    );
  }
  const materials = readJson(
    new URL("./release-materials.json", import.meta.url),
  ).nativeSource;
  assert.equal(materials.commit, qualified.native.source);
  const nativeDirectory = join(scratch, "native-source");
  native("gh", [
    "release",
    "download",
    materials.release,
    "--repo",
    materials.repository,
    "--pattern",
    materials.filename,
    "--dir",
    nativeDirectory,
  ]);
  assert.equal(
    hash(regularBytes(join(nativeDirectory, materials.filename))),
    materials.sha256,
  );
  native("gh", [
    "release",
    "verify-asset",
    materials.release,
    join(nativeDirectory, materials.filename),
    "--repo",
    materials.repository,
    "--format",
    "json",
  ]);
  qualified.materials[materials.filename] = save(
    materials.filename,
    regularBytes(join(nativeDirectory, materials.filename)),
  );
  for (const [name, path] of [
    ["LICENSE", "LICENSE"],
    ["THIRD-PARTY-NOTICES.md", "THIRD-PARTY-NOTICES.md"],
    ["native-build.json", "assets/native-build.json"],
    ["native-rights.json", "assets/native-rights.json"],
    ["tool-manifest.json", "assets/tool-manifest.json"],
  ])
    qualified.materials[name] = hash(
      native("git", ["show", `${qualified.source}:${path}`], {
        encoding: null,
      }),
    );
  const decisions = join(scratch, "decisions");
  for (const [name, digest, phase] of [
    ["release-review.json", process.env.REVIEW_SHA, "review"],
    ["release-acceptance.json", process.env.ACCEPTANCE_SHA, "pilot"],
  ]) {
    native("gh", [
      "release",
      "download",
      `v${release.version}`,
      "--repo",
      repository,
      "--pattern",
      name,
      "--dir",
      decisions,
    ]);
    const bytes = regularBytes(join(decisions, name));
    verifyReleaseAcceptance(
      bytes,
      digest,
      release,
      qualified.manifestSha256,
      phase,
    );
    qualified.evidence[name] = save(name, bytes);
  }
  verifyQualification(qualified);
  const current = JSON.parse(
    native("gh", ["api", `repos/${repository}/git/ref/heads/main`]),
  );
  assert.equal(
    current.object.sha,
    process.env.GITHUB_SHA,
    "Control branch advanced during archival preparation",
  );
  prepareGithubRelease(qualified, input, join(output, "bundle"), process.cwd());
  writeFileSync(
    join(output, "qualification.json"),
    JSON.stringify(qualified, null, 2) + "\n",
    { flag: "wx" },
  );
} finally {
  assert.ok(scratch.startsWith(join(tmpdir(), "markdown-quality-archive-")));
  rmSync(scratch, { recursive: true, force: true });
}
