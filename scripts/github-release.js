// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  repository,
  hash,
  regularBytes,
  readJson,
  verifyBundle,
  verifyInventory,
  verifyProvider,
} from "./release-assets.js";

export function native(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    shell: false,
    ...options,
  });
  if (result.error || result.status !== 0) {
    const error = new Error(
      `${command} failed: ${String(result.stderr ?? result.error).slice(0, 2000)}`,
    );
    error.status = result.status;
    throw error;
  }
  return result.stdout;
}
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
  gh = (args) => native("gh", args),
  registry = verifyRegistry,
}) {
  const tag = `v${qualified.version}`;
  const assets = verifyBundle(qualified, directory, gitSource(qualified, cwd));
  mkdirSync(evidenceDirectory, { recursive: false });
  const journal = join(evidenceDirectory, "effects.jsonl");
  let sequence = 0;
  const call = (args) => {
    const id = ++sequence;
    appendFileSync(
      journal,
      JSON.stringify({ id, state: "attempted", args }) + "\n",
      { flush: true },
    );
    try {
      const text = gh(args);
      writeFileSync(join(evidenceDirectory, `${id}.txt`), text, { flag: "wx" });
      appendFileSync(
        journal,
        JSON.stringify({
          id,
          state: "returned",
          outputSha256: hash(Buffer.from(text)),
        }) + "\n",
        { flush: true },
      );
      return text;
    } catch (error) {
      appendFileSync(
        journal,
        JSON.stringify({
          id,
          state: "failed-or-unknown",
          message: error.message,
        }) + "\n",
        { flush: true },
      );
      throw error;
    }
  };
  const api = (path) =>
    JSON.parse(call(["api", `repos/${repository}/${path}`]));
  const checkTag = () => {
    let object = api(`git/ref/tags/${tag}`).object;
    for (let depth = 0; object.type === "tag" && depth < 4; depth++) {
      const annotation = api(`git/tags/${object.sha}`);
      assert.equal(annotation.tag, tag);
      object = annotation.object;
    }
    assert.equal(object.type, "commit");
    assert.equal(
      object.sha,
      qualified.source,
      "Version tag differs from package source",
    );
  };
  const checkContext = () => {
    assert.equal(
      api("immutable-releases").enabled,
      true,
      "Enable repository release immutability first",
    );
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
  await registry(qualified, directory);
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
  if (release === null) {
    const notes = join(evidenceDirectory, "notes.md");
    writeFileSync(
      notes,
      `Qualified npm pilot ${qualified.version}. Exact package source ${qualified.source}; candidate ${qualified.candidate.run}; publication ${qualified.publication.run}, attempt ${qualified.publication.attempt}. Original archives, source, notices and qualification evidence are attached. Stable promotion remains gated on both exact pilot acceptances and recovery. AGPL-3.0-only.`,
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
  assert.equal(release.tag_name, tag);
  assert.equal(
    release.prerelease,
    true,
    "This operation cannot change stable release classification",
  );
  assert.ok(Number.isSafeInteger(release.id) && release.id > 0);
  const id = release.id;
  if (release.draft) {
    assert.equal(release.immutable, false);
    const missing = verifyInventory(release, assets, true);
    for (const asset of missing) {
      assert.equal(
        hash(regularBytes(join(directory, asset.name))),
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
        hash(regularBytes(join(downloaded, asset.name))),
        asset.sha256,
      );
    checkContext();
    verifyBundle(qualified, directory, gitSource(qualified, cwd));
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
  assert.equal(release.prerelease, true);
  assert.equal(release.immutable, true, "Published release is not immutable");
  verifyInventory(release, assets);
  checkTag();
  call(["release", "verify", tag, "--repo", repository, "--format", "json"]);
  for (const asset of assets) {
    assert.equal(hash(regularBytes(join(directory, asset.name))), asset.sha256);
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
  assert.equal(release.prerelease, true);
  verifyInventory(release, assets);
  const summary = {
    source: qualified.source,
    tag,
    releaseId: id,
    immutable: true,
    prerelease: true,
    assets,
    nativeReleaseAndEveryAssetVerified: true,
    npmTagsChanged: false,
  };
  writeFileSync(
    join(evidenceDirectory, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { flag: "wx" },
  );
  return summary;
}

async function verifyRegistry(qualified) {
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
