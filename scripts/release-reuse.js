// SPDX-License-Identifier: AGPL-3.0-only
/** Promote authenticated original CI archives; never rebuild or execute their contents. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { gitSnapshot, readRawProof, publishCiResult } from "./ci-command.js";
import { selectProof, verifyProof, repository } from "./ci-proof.js";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { verifyArchiveBytes } from "./release-bytes.js";
import { verifyPromotion } from "./release-qualification.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Bind a retained artifact to its original successful job, including partial reruns. */
export function selectQualificationArtifact(inventory, name, execution) {
  const matches = inventory.filter((artifact) => artifact.name === name);
  assert.equal(matches.length, 1, `Missing or ambiguous retained ${name}`);
  const artifact = matches[0];
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  const created = Date.parse(artifact.created_at);
  assert.ok(
    created >= Date.parse(execution.job.started_at) &&
      created <= Date.parse(execution.job.completed_at),
    `Retained ${name} differs from the original producing execution`,
  );
  return artifact;
}

/** Add promotion authorization to a new manifest; original manifest and archive bytes survive. */
export function promoteManifest({
  manifestBytes,
  receipt,
  selection,
  releaseSource,
  proofBytes,
}) {
  const original = JSON.parse(manifestBytes);
  assert.equal(
    original.promotion,
    undefined,
    "Do not promote an already promoted manifest",
  );
  assert.equal(original.source.head, receipt.snapshot.commit);
  assert.equal(original.source.tree, receipt.snapshot.tree);
  assert.deepEqual(original.qualificationMatrix, receipt.matrix);
  assert.equal(original.sbom.filename, "source-sbom.cdx.json");
  assert.equal(original.archives.length, 3);
  for (const archive of original.archives) {
    assert.match(
      archive.package,
      /^@hadden-industries\/markdown-quality(?:-win32-x64|-linux-x64)?$/u,
    );
    assert.equal(archive.version, original.version);
    assert.equal(
      archive.filename,
      `${archive.package.slice(1).replace("/", "-")}-${original.version}.tgz`,
    );
  }
  for (const lane of receipt.lanes) {
    assert.equal(lane.consumer.manifestSha256, hash(manifestBytes));
    assert.equal(lane.consumer.version, original.version);
    for (const archive of original.archives) {
      const matches = lane.consumer.archives.filter(
        (item) => item.package === archive.package,
      );
      assert.equal(matches.length, 1);
      assert.equal(matches[0].sha256, archive.sha256);
    }
  }
  const promoted = {
    ...original,
    promotion: {
      schemaVersion: 1,
      buildCommit: original.source.head,
      releaseCommit: releaseSource,
      tree: receipt.snapshot.tree,
      parents: receipt.snapshot.parents,
      buildManifestSha256: hash(manifestBytes),
      proofSha256: hash(proofBytes),
      run: selection.run.id,
      attempt: selection.run.run_attempt,
      pullRequest: selection.pr.number,
    },
  };
  verifyPromotion(promoted, releaseSource);
  return promoted;
}

/** A manual request reconstructs merge facts from Git; PR association remains provider-authenticated. */
export function mergeQualificationContext(environment, snapshot) {
  assert.equal(environment.GITHUB_REPOSITORY, repository);
  assert.equal(environment.GITHUB_REF, "refs/heads/main");
  assert.equal(environment.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(snapshot.commit, environment.GITHUB_SHA);
  assert.equal(
    snapshot.parents.length,
    2,
    "Reuse requires an ordinary two-parent merge",
  );
  const repositoryId = Number(environment.GITHUB_REPOSITORY_ID);
  assert.ok(Number.isSafeInteger(repositoryId) && repositoryId > 0);
  return {
    repository,
    repositoryId,
    runId: Number(environment.GITHUB_RUN_ID),
    runAttempt: Number(environment.GITHUB_RUN_ATTEMPT),
    sha: snapshot.commit,
    snapshot,
    eventName: "push",
    event: {
      ref: "refs/heads/main",
      after: snapshot.commit,
      before: snapshot.parents[0],
      forced: false,
      created: false,
      deleted: false,
      repository: {
        id: repositoryId,
        full_name: repository,
        default_branch: "main",
      },
    },
  };
}

/** Reject changed archives and retain the original manifest alongside the promotion descriptor. */
export function retainPromotedManifest(
  directory,
  promoted,
  manifestBytes,
  proofBytes,
) {
  for (const archive of promoted.archives)
    verifyArchiveBytes(
      readFileSync(join(directory, archive.filename)),
      archive,
    );
  assert.equal(
    hash(readFileSync(join(directory, promoted.sbom.filename))),
    promoted.sbom.sha256,
  );
  writeFileSync(join(directory, "build-manifest.json"), manifestBytes, {
    flag: "wx",
  });
  writeFileSync(join(directory, "build-qualification.json"), proofBytes, {
    flag: "wx",
  });
  writeFileSync(
    join(directory, "release-manifest.json"),
    JSON.stringify(promoted, null, 2) + "\n",
  );
}

/** A reuse miss falls back before publishing outputs; no partially admitted candidate survives. */
export async function reuseQualification({
  environment = process.env,
  snapshot = gitSnapshot(),
  matrix,
  read,
  destination,
  download = downloadEvidence,
  now = Date.now,
}) {
  assert.equal(
    existsSync(destination),
    false,
    "Reuse output must be a new directory",
  );
  const scratch = mkdtempSync(
    join(tmpdir(), "markdown-quality-release-reuse-"),
  );
  let admitted = false;
  try {
    const ctx = mergeQualificationContext(environment, snapshot);
    assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
    const selection = await selectProof({ ctx, read, now: now() });
    const receipt = await readRawProof(selection.artifact, read);
    // These are recorded supported-platform contracts, not newly allocated runners.
    const hosts = matrix.os.map(
      (os) => receipt.lanes.find((lane) => lane.lane.os === os)?.host,
    );
    await verifyProof({
      ctx,
      matrix,
      hosts,
      selection,
      receipt,
      read,
      now: now(),
    });
    const proofBytes = Buffer.from(JSON.stringify(receipt) + "\n");
    const inventory = await read(
      `/actions/runs/${selection.run.id}/artifacts?per_page=100`,
    );
    assert.equal(inventory.total_count, inventory.artifacts.length);
    assert.ok(inventory.total_count < 100);
    const transfer = async (artifact, path) =>
      download({
        id: artifact.id,
        destination: path,
        read,
        runId: selection.run.id,
        repositoryId: ctx.repositoryId,
        headSha: selection.run.head_sha,
        expectedArtifact: artifact,
      });
    const archives = join(scratch, "archives");
    const transport = receipt.lanes[0].transport;
    await transfer(transport, archives);
    const manifestBytes = readFileSync(join(archives, "release-manifest.json"));
    const promoted = promoteManifest({
      manifestBytes,
      receipt,
      selection,
      releaseSource: ctx.sha,
      proofBytes,
    });
    assert.equal(promoted.version, environment.RELEASE_VERSION);
    const artifacts = [];
    const execution = (name) => {
      const matches = receipt.executions.filter(
        (item) => item.job.name === name,
      );
      assert.equal(matches.length, 1, `Missing original ${name}`);
      return matches[0];
    };
    for (const os of matrix.os) {
      for (const node of matrix.node) {
        const reference = node === promoted.runtimePolicy.reference;
        const producer = execution(`Product / Qualify ${os} / Node ${node}`);
        artifacts.push([
          reference ? `candidate-${os}` : `candidate-${os}-${node}`,
          producer,
        ]);
        if (reference)
          artifacts.push(
            [`recipient-${os}`, producer],
            [`performance-${os}`, producer],
          );
      }
    }
    const distribution = execution("Distribution");
    artifacts.push([
      `release-distribution-${distribution.runAttempt}`,
      distribution,
    ]);
    for (const [name, producer] of artifacts) {
      const artifact = selectQualificationArtifact(
        inventory.artifacts,
        name,
        producer,
      );
      await transfer(artifact, join(scratch, "evidence", name));
    }
    retainPromotedManifest(archives, promoted, manifestBytes, proofBytes);
    const producerLockPath = join(archives, "build-package-lock.json");
    const retainedLock = existsSync(producerLockPath);
    const producerLock = readFileSync(
      retainedLock ? producerLockPath : "package-lock.json",
    );
    assert.equal(hash(producerLock), promoted.source.lockSha256);
    if (!retainedLock)
      writeFileSync(producerLockPath, producerLock, { flag: "wx" });
    assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
    admitted = true;
    cpSync(archives, destination, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    cpSync(
      join(scratch, "evidence"),
      join(destination, "qualification-evidence"),
      { recursive: true },
    );
    return {
      reused: "true",
      source: promoted.source.head,
      originalRun: selection.run.id,
      originalAttempt: selection.run.run_attempt,
      distribution: `release-distribution-${distribution.runAttempt}`,
    };
  } catch (error) {
    // An output failure is a failed job, never permission to run another route.
    if (admitted) throw error;
    return {
      reused: "false",
      reason: String(error.message)
        .split("\n")[0]
        .replace(/[^a-zA-Z0-9 .,:_()/-]/gu, "")
        .slice(0, 200),
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const matrix = JSON.parse(process.env.RELEASE_MATRIX);
  const read = createRepositoryReader({
    repository,
    token: process.env.GH_TOKEN,
  });
  const result =
    process.env.FORCE_FRESH === "true"
      ? { reused: "false", reason: "Owner requested fresh qualification" }
      : await reuseQualification({
          matrix,
          read,
          destination: resolve(process.argv[2]),
        });
  publishCiResult(
    result,
    result.reused === "true"
      ? `REUSED: original CI ${result.originalRun}/${result.originalAttempt}; archives unchanged; no source, native, runtime or performance matrices repeated.`
      : `FRESH_REQUIRED: ${result.reason}. Running full qualification.`,
  );
}
