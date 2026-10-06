// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicationOrigins } from "./publication-origins.js";
import { verifyCandidateContext } from "./verify-publication.js";

function boundedBytes(path, maximum = 1_048_576) {
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= maximum);
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= maximum);
  return bytes;
}
const json = (path) => JSON.parse(boundedBytes(path).toString("utf8"));

export function verifyPublicationArchiveBytes(directory, release) {
  for (const archive of release.archives) {
    assert.match(
      archive.filename,
      /^hadden-industries-markdown-quality(?:-(?:win32|linux)-x64)?-[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.tgz$/u,
    );
    const bytes = boundedBytes(join(directory, archive.filename), 20_000_000);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      archive.sha256,
    );
    assert.equal(
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      archive.integrity,
    );
  }
}

function admittedEnvironment(directory, context) {
  const bytes = boundedBytes(join(directory, "release-manifest.json"));
  const sha = createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha, process.env.MANIFEST_SHA);
  const release = JSON.parse(bytes);
  const values = preparePublicationEnvironment(
    release,
    sha,
    json(join(directory, "publication-origins.json")),
    context,
  );
  verifyPublicationArchiveBytes(directory, release);
  return values;
}

export function verifyCurrentPublicationRef(currentRef, context) {
  assert.equal(context.repository, "Hadden-Industries/markdown-quality");
  assert.equal(context.event, "workflow_dispatch");
  assert.equal(context.ref, "refs/heads/main");
  assert.equal(
    context.workflowRef,
    `${context.repository}/.github/workflows/publish.yml@refs/heads/main`,
  );
  assert.match(context.head, /^[a-f0-9]{40}$/u);
  assert.equal(currentRef.ref, "refs/heads/main");
  assert.equal(
    currentRef.object.sha,
    context.head,
    "Default branch advanced after admission",
  );
}

export function preparePublicationEnvironment(
  release,
  manifestSha,
  map,
  context,
) {
  assert.equal(context.repository, "Hadden-Industries/markdown-quality");
  assert.equal(context.event, "workflow_dispatch");
  assert.equal(context.ref, "refs/heads/main");
  assert.equal(
    context.workflowRef,
    `${context.repository}/.github/workflows/publish.yml@refs/heads/main`,
  );
  assert.match(context.head, /^[a-f0-9]{40}$/u);
  assert.match(release.version, /^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u);
  assert.deepEqual(
    release.archives.map((a) => a.name),
    ["win32-x64", "linux-x64", "core"],
  );
  const recovery = context.recoveryRun
    ? {
        run: String(context.recoveryRun),
        attempt: String(context.recoveryAttempt),
        originsSha256: context.recoveryOriginsSha ?? "",
      }
    : null;
  assert.ok(
    recovery || (!context.recoveryAttempt && !context.recoveryOriginsSha),
  );
  validatePublicationOrigins(
    map,
    {
      version: release.version,
      artifactSource: release.source.head,
      manifestSha,
      candidateRun: String(context.runId),
      controlSource: context.head,
      run: String(context.publicationRun),
      attempt: String(context.publicationAttempt),
      recovery,
    },
    release.archives,
  );
  const result = { RELEASE_VERSION: release.version };
  for (let index = 0; index < release.archives.length; index++) {
    const archive = release.archives[index];
    const packageName =
      "@hadden-industries/markdown-quality" +
      (archive.name === "core" ? "" : `-${archive.name}`);
    assert.equal(archive.package, packageName);
    assert.equal(archive.version, release.version);
    assert.equal(
      archive.filename,
      `${packageName.slice(1).replace("/", "-")}-${release.version}.tgz`,
    );
    assert.match(archive.sha256, /^[a-f0-9]{64}$/u);
    assert.match(archive.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
    const key = archive.name.replaceAll("-", "_").toUpperCase();
    result[`${key}_INTEGRITY`] = archive.integrity;
    result[`PUBLISH_${key}`] = String(map.records[index].state === "planned");
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const context = {
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
  };
  if (process.argv[2] === "--candidate-context") {
    const candidate = verifyCandidateContext(
      json(join(process.argv[3], "run.json")),
      context,
    );
    assert.ok(process.env.GITHUB_OUTPUT);
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `artifact-source=${candidate.source}\ncandidate-attempt=${candidate.attempt}\n`,
    );
  } else if (process.argv[2] === "--current-ref") {
    verifyCurrentPublicationRef(json(process.argv[3]), context);
    admittedEnvironment("frozen-release", context);
  } else {
    assert.equal(process.argv[2], "--environment");
    const values = admittedEnvironment(process.argv[3], context);
    assert.ok(process.env.GITHUB_ENV);
    appendFileSync(
      process.env.GITHUB_ENV,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
  }
}
