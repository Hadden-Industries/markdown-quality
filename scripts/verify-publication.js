// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  appendFileSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planPublicationOrigins } from "./publication-origins.js";
import {
  releaseQualificationWorkflow,
  verifyReleaseQualificationJobs,
} from "./release-qualification.js";

const repository = "Hadden-Industries/markdown-quality";
const digest = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
const bytes = (path, maximum) =>
  releaseBytes(path, maximum, "Expected bounded regular release input");
const json = (path) => JSON.parse(bytes(path, 1_048_576).toString("utf8"));

/** Admit only a completed manual release qualification; ordinary CI is insufficient. */
export function verifyReleaseQualificationContext(run, context) {
  validatePublicationContext(context);
  assert.match(String(context.runId), /^[1-9]\d{0,15}$/u);
  assert.equal(String(run.id), String(context.runId));
  assert.equal(run.repository.full_name, repository);
  assert.equal(
    run.event,
    "workflow_dispatch",
    "Require manual release qualification",
  );
  assert.equal(
    run.path,
    releaseQualificationWorkflow,
    "Require manual release qualification",
  );
  assert.equal(run.head_branch, "main");
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.match(String(run.run_attempt), /^[1-9]\d{0,15}$/u);
  if (!context.recoveryRun) assert.equal(run.head_sha, context.head);
  return { source: run.head_sha, attempt: String(run.run_attempt) };
}

export function verifyPublication({
  root,
  directory,
  manifestSha,
  run,
  jobs,
  currentRef,
  environment,
  branches,
  context,
  previous,
}) {
  const candidate = verifyReleaseQualificationContext(run, context);
  validatePublicationContext(context);
  assert.match(context.runId, /^[1-9]\d{0,15}$/u);
  assert.match(manifestSha, /^[a-f0-9]{64}$/u);
  assert.equal(currentRef.ref, "refs/heads/main");
  assert.equal(
    currentRef.object.sha,
    context.head,
    "Default branch advanced after dispatch",
  );
  assert.equal(environment.name, "npm-publication");
  assert.deepEqual(environment.deployment_branch_policy, {
    protected_branches: false,
    custom_branch_policies: true,
  });
  assert.equal(branches.total_count, 1);
  assert.equal(branches.branch_policies.length, 1);
  assert.equal(branches.branch_policies[0].name, "main");
  assert.equal(branches.branch_policies[0].type, "branch");
  assert.equal(String(run.id), context.runId);
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.path, releaseQualificationWorkflow);
  assert.equal(run.head_branch, "main");
  const artifactSource = candidate.source;
  assert.match(artifactSource, /^[a-f0-9]{40}$/u);
  assert.equal(run.head_sha, artifactSource);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  const manifestBytes = bytes(
    join(directory, "release-manifest.json"),
    1_048_576,
  );
  assert.equal(digest(manifestBytes), manifestSha);
  const release = JSON.parse(manifestBytes);
  const runtimePolicyPath = join(root, "assets/node-support.json");
  if (existsSync(runtimePolicyPath)) {
    assert.ok(
      release.qualificationMatrix,
      "Source requires matrix qualification",
    );
    assert.deepEqual(release.runtimePolicy, json(runtimePolicyPath));
  }
  verifyReleaseQualificationJobs(run, jobs, release);
  const metadata = json(join(root, "package.json"));
  assert.match(metadata.version, /^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u);
  assert.equal(metadata.name, "@hadden-industries/markdown-quality");
  assert.equal(metadata.license, "AGPL-3.0-only");
  assert.equal(metadata.publishConfig.access, "public");
  assert.equal(release.version, metadata.version);
  assert.equal(release.source.head, artifactSource);
  assert.equal(release.source.clean, true);
  assert.equal(
    release.source.lockSha256,
    digest(bytes(join(root, "package-lock.json"), 4_194_304)),
  );
  assert.equal(
    release.sourcePackageDigest,
    digest(bytes(join(root, "package.json"), 1_048_576)),
  );
  assert.equal(
    digest(bytes(join(root, "LICENSE"), 1_048_576)),
    "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef",
  );
  assert.deepEqual(
    release.native,
    json(join(root, "assets/tool-manifest.json")),
  );
  assert.equal(release.build.lifecycleScripts, "disabled");
  assert.equal(release.sbom.filename, "source-sbom.cdx.json");
  assert.equal(
    release.sbom.sha256,
    digest(bytes(join(directory, release.sbom.filename), 4_194_304)),
  );
  assert.equal(release.archives.length, 3);
  const names = ["win32-x64", "linux-x64", "core"];
  assert.deepEqual(
    release.archives.map((archive) => archive.name),
    names,
  );
  for (const archive of release.archives) {
    const packageName =
      archive.name === "core"
        ? metadata.name
        : `${metadata.name}-${archive.name}`;
    const filename =
      packageName.slice(1).replace("/", "-") + `-${release.version}.tgz`;
    assert.equal(archive.package, packageName);
    assert.equal(archive.version, release.version);
    assert.equal(archive.filename, filename);
    const tarball = bytes(join(directory, filename), 20_000_000);
    verifyArchiveBytes(tarball, archive);
    if (archive.name === "linux-x64") {
      assert.equal(archive.executableMode.mode, "0o755");
      assert.equal(archive.executableMode.allMemberBytesPreserved, true);
      assert.equal(archive.executableMode.sha256, archive.sha256);
    }
  }
  return {
    version: release.version,
    source: artifactSource,
    manifestSha,
    candidateRun: run.id,
    publicationOrigins: planPublicationOrigins({
      release,
      manifestSha,
      candidateRun: run.id,
      context,
      previous,
    }),
    archives: release.archives.map(({ name, integrity }) => ({
      name,
      integrity,
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: verify-publication.mjs RELEASE_DIRECTORY MANIFEST_SHA PROVIDER_DIRECTORY",
  );
  const [, , directory, manifestSha, providerDirectory] = process.argv;
  const result = verifyPublication({
    root: process.env.RECOVERY_RUN
      ? resolve("artifact-source")
      : resolve(fileURLToPath(new URL("../", import.meta.url))),
    directory: resolve(directory),
    manifestSha,
    run: json(join(providerDirectory, "run.json")),
    jobs: json(join(providerDirectory, "jobs.json")),
    currentRef: json(join(providerDirectory, "current-ref.json")),
    environment: json(join(providerDirectory, "environment.json")),
    branches: json(join(providerDirectory, "branches.json")),
    context: publicationContext(process.env),
    ...(process.env.RECOVERY_RUN
      ? {
          previous: {
            run: json(join(providerDirectory, "previous-run.json")),
            jobs: json(join(providerDirectory, "previous-jobs.json")),
            manifestBytes: bytes(
              "previous-publication/frozen-release/release-manifest.json",
              1_048_576,
            ),
            originsBytes: existsSync(
              "previous-publication/frozen-release/publication-origins.json",
            )
              ? bytes(
                  "previous-publication/frozen-release/publication-origins.json",
                  1_048_576,
                )
              : null,
          },
        }
      : {}),
  });
  writeFileSync(
    join(directory, "publication-origins.json"),
    JSON.stringify(result.publicationOrigins, null, 2) + "\n",
    { flag: "wx" },
  );
  assert.ok(process.env.GITHUB_ENV);
  appendFileSync(
    process.env.GITHUB_ENV,
    `RELEASE_VERSION=${result.version}\n` +
      result.archives
        .map(
          ({ name, integrity }) =>
            `${name.replaceAll("-", "_").toUpperCase()}_INTEGRITY=${integrity}\n`,
        )
        .join(""),
  );
  process.stdout.write(JSON.stringify(result) + "\n");
}

import { releaseBytes, verifyArchiveBytes } from "./release-bytes.js";

import {
  validatePublicationContext,
  publicationContext,
} from "./publication-context.js";
