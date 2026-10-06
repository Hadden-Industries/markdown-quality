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

const repository = "Hadden-Industries/markdown-quality";
const digest = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
function bytes(path, maximum) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= maximum,
    "Expected bounded regular release input",
  );
  const result = readFileSync(path);
  assert.ok(result.length <= maximum);
  return result;
}
const json = (path) => JSON.parse(bytes(path, 1_048_576).toString("utf8"));

export function verifyCandidateContext(run, context) {
  assert.equal(context.repository, repository);
  assert.equal(context.event, "workflow_dispatch");
  assert.equal(context.ref, "refs/heads/main");
  assert.equal(
    context.workflowRef,
    `${repository}/.github/workflows/publish.yml@refs/heads/main`,
  );
  assert.match(context.head, /^[a-f0-9]{40}$/u);
  assert.match(String(context.runId), /^[1-9]\d{0,15}$/u);
  assert.equal(String(run.id), String(context.runId));
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.event, "push");
  assert.equal(run.path, ".github/workflows/candidate.yml");
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
  const candidate = verifyCandidateContext(run, context);
  assert.equal(context.repository, repository);
  assert.equal(context.event, "workflow_dispatch");
  assert.equal(context.ref, "refs/heads/main");
  assert.equal(
    context.workflowRef,
    `${repository}/.github/workflows/publish.yml@refs/heads/main`,
  );
  assert.match(context.head, /^[a-f0-9]{40}$/u);
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
  assert.equal(run.event, "push");
  assert.equal(run.path, ".github/workflows/candidate.yml");
  assert.equal(run.head_branch, "main");
  const artifactSource = candidate.source;
  assert.match(artifactSource, /^[a-f0-9]{40}$/u);
  assert.equal(run.head_sha, artifactSource);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.equal(jobs.total_count, 3);
  assert.equal(jobs.jobs.length, 3);
  assert.deepEqual(jobs.jobs.map((job) => job.name).sort(), [
    "consumer (ubuntu-24.04)",
    "consumer (windows-latest)",
    "pack",
  ]);
  for (const job of jobs.jobs) {
    assert.equal(job.status, "completed");
    assert.equal(job.conclusion, "success");
    assert.equal(job.head_sha, artifactSource);
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, run.run_attempt);
  }
  const manifestBytes = bytes(
    join(directory, "release-manifest.json"),
    1_048_576,
  );
  assert.equal(digest(manifestBytes), manifestSha);
  const release = JSON.parse(manifestBytes);
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
    assert.equal(digest(tarball), archive.sha256);
    assert.equal(
      `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
      archive.integrity,
    );
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
    context: {
      repository: process.env.GITHUB_REPOSITORY,
      event: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      workflowRef: process.env.GITHUB_WORKFLOW_REF,
      head: process.env.GITHUB_SHA,
      runId: process.env.CANDIDATE_RUN,
      publicationRun: process.env.GITHUB_RUN_ID,
      publicationAttempt: process.env.GITHUB_RUN_ATTEMPT,
      recoveryRun: process.env.RECOVERY_RUN,
      recoveryAttempt: process.env.RECOVERY_ATTEMPT,
      recoveryOriginsSha: process.env.RECOVERY_ORIGINS_SHA,
    },
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
