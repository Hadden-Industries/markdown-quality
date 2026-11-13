// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { waitForReleaseAttestation } from "./release-attestation.js";
import { verifyImmutabilityObservation } from "./release-immutability.js";
import { artifactLimits } from "./artifact-policy.js";
import { createEffectJournal } from "./release-effects.js";
import { releaseSemver } from "./release-coordinates.js";
import {
  archiveOperation,
  readArchiveFamily,
} from "./release-archive-state.js";
import { verifyReleaseCompletion } from "./release-readback.js";
import { admitPriorReleaseEffects } from "./release-history.js";
import { archivePreflight } from "./release-decision-transport.js";
import { verifyNoPendingStages } from "./release-stage-guards.js";
import {
  repository,
  hash,
  regularBytes,
  readJson,
  verifyBundle,
  verifyInventory,
  verifyProvider,
} from "./release-assets.js";

export function gitSource(qualified, cwd) {
  return native(
    "git",
    [
      "archive",
      "--format=tar",
      `--prefix=markdown-quality-${qualified.version}/`,
      qualified.source,
    ],
    { cwd, encoding: null },
  );
}

export async function deliverRelease({
  qualified,
  directory,
  evidenceDirectory,
  cwd,
  gh = (args, options) => native("gh", args, options),
  registry = verifyPublicRegistryArchives,
  verifyTag = verifyReleaseTag,
  family = readArchiveFamily,
  env = process.env,
  history = (operation, archiveObservation) =>
    admitPriorReleaseEffects(operation, {
      env: {
        ...env,
        OPERATION_SHA: qualified.evidence["release-acceptance.json"],
      },
      checkpoint: env.HISTORY_CHECKPOINT,
      archiveObservation,
    }),
}) {
  assert.equal(
    qualified.schemaVersion,
    2,
    "Historical release evidence is read-only; current writes require deliberate staged qualification",
  );
  const tag = `v${qualified.version}`;
  const assets = verifyBundle(qualified, directory, gitSource(qualified, cwd));
  const effects = createEffectJournal(evidenceDirectory, {
    repository,
    controller: env.GITHUB_SHA ?? qualified.source,
    source: qualified.source,
    workflow: ".github/workflows/github-release.yml",
    run: env.GITHUB_RUN_ID ?? "1",
    attempt: env.GITHUB_RUN_ATTEMPT ?? "1",
    job: "archive",
    operationId:
      qualified.decision?.operationId ?? `archive-${qualified.version}`,
    manifestSha256: qualified.manifestSha256,
    decisionSha256: qualified.evidence["release-acceptance.json"],
  });
  let sequence = 0;
  let priorEffects = [];
  let latestStageWriteAt;
  let releaseId;
  const acceptance = archivePreflight(
    env,
    qualified,
    readJson(join(directory, "release-acceptance.json")),
  );
  if (acceptance.preflightBytes)
    writeFileSync(
      join(evidenceDirectory, "preflight.json"),
      acceptance.preflightBytes,
      { flag: "wx", flush: true },
    );
  const effectKey = (effect) =>
    `${effect.operation}/${effect.subject}/${effect.operation === "upload" ? effect.target[1].split(/[\\/]/u).at(-1) : effect.target.includes("--prerelease=false") ? "classification" : effect.operation === "edit" ? "publish" : "create"}`;
  const call = (args, options) => {
    const id = ++sequence;
    const request = () => {
      const text = gh(args, options);
      writeFileSync(join(evidenceDirectory, `${id}.txt`), text, { flag: "wx" });
      return text;
    };
    const write =
      args[0] === "release" && ["create", "upload", "edit"].includes(args[1]);
    if (write) {
      if (env.GITHUB_SHA)
        assert.equal(
          api("git/ref/heads/main").object.sha,
          env.GITHUB_SHA,
          "Archive controller was superseded during approval",
        );
      if (args[1] !== "create")
        assert.equal(
          lookup().id,
          releaseId,
          "Original archive draft was displaced",
        );
      if (qualified.channel !== undefined)
        verifyNoPendingStages(acceptance.stageInventory, {
          latestStageWriteAt,
        });
      const effect = {
        operation: args[1],
        subject: tag,
        target: args.slice(2),
      };
      assert.ok(
        !priorEffects.some((prior) => effectKey(prior) === effectKey(effect)),
        "An acknowledged archive request awaits readback; never replay it from a stale provider view",
      );
    }
    return write
      ? effects.write(
          {
            provider: "github",
            operation: args[1],
            subject: tag,
            step: `archive/${args[1]}`,
            prior: args[1] === "create" ? null : "verified-draft",
            target: args.slice(2),
            releaseId: releaseId ?? null,
          },
          request,
        )
      : effects.read("github", args.join(" "), request);
  };
  const api = (path) =>
    JSON.parse(call(["api", `repos/${repository}/${path}`]));
  const checkTag = () => {
    const reference = api(`git/ref/tags/${tag}`);
    assert.equal(reference.object.type, "tag");
    verifyTag(reference, api(`git/tags/${reference.object.sha}`), {
      version: qualified.version,
      source: { head: qualified.source },
    });
    return reference;
  };
  const checkImmutability = () =>
    qualified.channel !== undefined
      ? verifyImmutabilityObservation(
          acceptance.immutabilityObservation,
          qualified,
        )
      : assert.equal(
          api("immutable-releases").enabled,
          true,
          "Enable repository release immutability first",
        );
  const checkContext = () => {
    checkTag();
    for (const expected of [qualified.candidate, qualified.publication]) {
      const path = `actions/runs/${expected.run}/attempts/${expected.attempt}`;
      verifyProvider(
        { run: api(path), jobs: api(`${path}/jobs?per_page=100`) },
        expected,
      );
    }
  };
  checkContext();
  // GitHub's REST tag endpoint excludes drafts. Successful native GraphQL
  // lookup admits absence without treating permission/network failures as 404.
  const lookup = () => {
    const data = JSON.parse(
      call([
        "api",
        "graphql",
        "-f",
        'query=query($tag:String!){repository(owner:"Hadden-Industries",name:"markdown-quality"){release(tagName:$tag){databaseId tagName}}}',
        "-f",
        `tag=${tag}`,
      ]),
    );
    assert.ok(data.data?.repository && !data.errors);
    const found = data.data.repository.release;
    if (found === null) return null;
    assert.equal(found.tagName, tag);
    assert.ok(Number.isSafeInteger(found.databaseId) && found.databaseId > 0);
    return api(`releases/${found.databaseId}`);
  };
  let release = lookup();
  releaseId = release?.id;
  const review =
    qualified.channel === undefined
      ? null
      : readJson(join(directory, "release-review.json"));
  const directStable =
    qualified.channel === "latest" &&
    !releaseSemver.prerelease(qualified.version);
  const initiallyImmutable = release !== null && !release.draft;
  const expectedPrerelease =
    initiallyImmutable && directStable ? release.prerelease : true;
  assert.equal(typeof expectedPrerelease, "boolean");
  const admitHistory = async (observation) => {
    const result = await history(
      {
        operation: "archive",
        operationId:
          qualified.decision?.operationId ?? `archive-${qualified.version}`,
        version: qualified.version,
        manifestSha256: qualified.manifestSha256,
        settlements: acceptance.settlements ?? [],
      },
      observation,
    );
    priorEffects = (result.settledGithub ?? []).filter(
      (effect) =>
        effect.context?.workflow === ".github/workflows/github-release.yml" &&
        effect.subject === tag &&
        ["create", "upload", "edit"].includes(effect.operation) &&
        Array.isArray(effect.target),
    );
    latestStageWriteAt = result.latestStageWriteAt;
  };
  // Only draft writes require the repository setting. Recovery verifies the
  // published release's own immutability and attestations using the job token.
  if (release === null || release.draft) checkImmutability();
  await registry(qualified, directory);
  if (!initiallyImmutable)
    await admitHistory(
      release
        ? { qualified, archive: release, expectedAssets: assets }
        : undefined,
    );
  if (release === null) {
    const notes = join(evidenceDirectory, "notes.md");
    writeFileSync(
      notes,
      `Qualified npm ${qualified.channel ?? "pilot"} ${qualified.version}. Exact package source ${qualified.source}; candidate ${qualified.candidate.run}; publication ${qualified.publication.run}, attempt ${qualified.publication.attempt}. Original archives, corresponding source, notices and qualification evidence are attached. AGPL-3.0-only.`,
      { flag: "wx" },
    );
    call([
      "release",
      "create",
      tag,
      "--repo",
      repository,
      "--verify-tag",
      "--draft",
      "--prerelease",
      "--latest=false",
      "--title",
      `Markdown Quality ${qualified.version}`,
      "--notes-file",
      notes,
    ]);
    release = lookup();
    assert.ok(
      release,
      "Draft creation outcome unresolved; reconcile before resuming",
    );
  }
  releaseId = release.id;
  writeFileSync(
    join(evidenceDirectory, "archive-identity.json"),
    JSON.stringify({
      schemaVersion: 1,
      releaseId,
      tag,
      source: qualified.source,
      manifestSha256: qualified.manifestSha256,
      operationId:
        qualified.decision?.operationId ?? `archive-${qualified.version}`,
    }) + "\n",
    { flag: "wx", flush: true },
  );
  assert.equal(release.tag_name, tag);
  assert.equal(
    release.prerelease,
    expectedPrerelease,
    "This operation cannot change stable release classification",
  );
  assert.ok(Number.isSafeInteger(release.id) && release.id > 0);
  const id = release.id;
  if (release.draft) {
    assert.equal(release.immutable, false);
    const missing = verifyInventory(release, assets, true);
    for (const asset of missing) {
      assert.equal(
        hash(
          regularBytes(
            join(directory, asset.name),
            artifactLimits.payloadBytes,
          ),
        ),
        asset.sha256,
      );
      call([
        "release",
        "upload",
        tag,
        join(directory, asset.name),
        "--repo",
        repository,
      ]);
    }
    release = api(`releases/${id}`);
    assert.equal(release.tag_name, tag);
    assert.equal(release.draft, true);
    assert.equal(release.prerelease, true);
    verifyInventory(release, assets);
    const downloaded = join(evidenceDirectory, "draft-readback");
    mkdirSync(downloaded);
    call([
      "release",
      "download",
      tag,
      "--repo",
      repository,
      "--dir",
      downloaded,
    ]);
    for (const asset of assets)
      assert.equal(
        hash(
          regularBytes(
            join(downloaded, asset.name),
            artifactLimits.payloadBytes,
          ),
        ),
        asset.sha256,
      );
    checkContext();
    checkImmutability();
    // The admitted logical archive is fixed. Effect-time hashes and provider
    // inventory/tag identity checks retain freshness without reparsing every proof.
    verifyInventory(api(`releases/${id}`), assets);
    call([
      "release",
      "edit",
      tag,
      "--repo",
      repository,
      "--draft=false",
      "--prerelease",
      "--latest=false",
    ]);
  }
  release = api(`releases/${id}`);
  assert.equal(release.tag_name, tag);
  assert.equal(release.draft, false);
  assert.equal(release.prerelease, expectedPrerelease);
  assert.equal(release.immutable, true, "Published release is not immutable");
  verifyInventory(release, assets);
  const reference = checkTag();
  await waitForReleaseAttestation(
    qualified,
    release,
    assets,
    reference.object.sha,
    { gh: call, verifyTag },
  );
  call(["release", "verify", tag, "--repo", repository, "--format", "json"]);
  for (const asset of assets) {
    assert.equal(
      hash(
        regularBytes(join(directory, asset.name), artifactLimits.payloadBytes),
      ),
      asset.sha256,
    );
    call([
      "release",
      "verify-asset",
      tag,
      join(directory, asset.name),
      "--repo",
      repository,
      "--format",
      "json",
    ]);
  }
  checkTag();
  release = api(`releases/${id}`);
  assert.equal(release.tag_name, tag);
  assert.equal(release.immutable, true);
  assert.equal(release.draft, false);
  assert.equal(release.prerelease, expectedPrerelease);
  verifyInventory(release, assets);
  if (review && directStable && release.prerelease) {
    await admitHistory({ qualified, archive: release, expectedAssets: assets });
    const operation = archiveOperation(qualified, review, id),
      deadline = Date.now() + 300000;
    const observed = await verifyReleaseCompletion({
      operation: {
        ...operation,
        targetGithubLatest: operation.priorGithubLatest,
        targetPrerelease: true,
      },
      now: Date.now,
      deadline,
      readFamily: (end) => family(qualified, review, end),
      readGithub: async () => {
        const current = api(`releases/${id}`);
        verifyInventory(current, assets);
        let latest;
        try {
          latest = api("releases/latest");
        } catch (error) {
          if (operation.priorGithubLatest !== null || error.httpStatus !== 404)
            throw error;
          latest = null;
        }
        return { release: current, latest };
      },
    });
    assert.equal(
      observed.status,
      "complete",
      "Npm success awaits propagation; retain the archive journal and use read-only verification before continuing classification",
    );
    call([
      "release",
      "edit",
      tag,
      "--repo",
      repository,
      "--prerelease=false",
      "--latest",
    ]);
    release = api(`releases/${id}`);
  }
  const summary = {
    source: qualified.source,
    tag,
    releaseId: id,
    immutable: true,
    prerelease: release.prerelease,
    qualificationSha256: hash(Buffer.from(JSON.stringify(qualified))),
    assets,
    nativeReleaseAndEveryAssetVerified: true,
    npmTagsChanged: false,
  };
  effects.seal("github", summary);
  writeFileSync(
    join(evidenceDirectory, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { flag: "wx" },
  );
  return summary;
}

/** Refresh public version/tarball bytes without repeating the frozen consumer matrix. */
export async function verifyPublicRegistryArchives(qualified) {
  const body = async (response, maximum) => {
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      assert.ok(total <= maximum, "Registry response exceeded byte budget");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };
  for (const archive of qualified.archives) {
    const base = `https://registry.npmjs.org/${encodeURIComponent(archive.package)}`;
    const response = await fetch(`${base}/${qualified.version}`, {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    assert.equal(response.status, 200);
    const metadata = JSON.parse(await body(response, 1024 * 1024));
    assert.equal(metadata.name, archive.package);
    assert.equal(metadata.version, qualified.version);
    assert.equal(metadata.dist.integrity, archive.integrity);
    const basename = archive.package.split("/")[1];
    const url = `https://registry.npmjs.org/${archive.package}/-/${basename}-${qualified.version}.tgz`;
    assert.equal(metadata.dist.tarball, url);
    const tarball = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      redirect: "error",
    });
    assert.equal(tarball.status, 200);
    assert.equal(hash(await body(tarball, 64 * 1024 * 1024)), archive.sha256);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: node scripts/github-release.js QUALIFICATION_JSON BUNDLE_DIR NEW_EVIDENCE_DIR",
  );
  const qualified = readJson(resolve(process.argv[2]));
  await deliverRelease({
    qualified,
    directory: resolve(process.argv[3]),
    evidenceDirectory: resolve(process.argv[4]),
    cwd: fileURLToPath(new URL("../", import.meta.url)),
  });
}
