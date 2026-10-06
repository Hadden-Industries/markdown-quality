// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const repository = "Hadden-Industries/markdown-quality";
export const hash = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
export function regularBytes(path, maximum = 64 * 1024 * 1024) {
  const info = lstatSync(path);
  assert.ok(info.isFile() && !info.isSymbolicLink() && info.size <= maximum);
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= maximum);
  return bytes;
}
export const readJson = (path) =>
  JSON.parse(regularBytes(path, 16 * 1024 * 1024).toString("utf8"));

export function verifyQualification(qualified) {
  assert.equal(qualified.schemaVersion, 1);
  assert.match(qualified.version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/u);
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
  assert.deepEqual(Object.keys(qualified.reports).sort(), [
    "candidate-linux.json",
    "candidate-windows.json",
    "registry-linux.json",
    "registry-windows.json",
  ]);
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
      ["pack", "consumer (windows-latest)", "consumer (ubuntu-24.04)"],
    ],
    [
      "publication",
      [
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
      `.github/workflows/${kind === "candidate" ? "candidate" : "publish"}.yml`,
    );
    assert.equal(
      expected.event,
      kind === "candidate" ? "push" : "workflow_dispatch",
    );
    assert.equal(new Set(expected.jobs).size, expected.jobs.length);
    for (const job of requiredJobs) assert.ok(expected.jobs.includes(job));
    const permitted = [
      ...requiredJobs,
      ...(kind === "publication"
        ? ["retained (windows-latest)", "retained (ubuntu-24.04)"]
        : []),
    ];
    assert.ok(expected.jobs.every((job) => permitted.includes(job)));
  }
  assert.equal(qualified.candidate.source, qualified.source);
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
    assert.equal(matches[0].status, "completed");
    assert.equal(matches[0].conclusion, "success");
    assert.equal(String(matches[0].run_id), expected.run);
    assert.equal(String(matches[0].run_attempt), expected.attempt);
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
  assert.deepEqual(qualified.native, {
    source: manifest.native.source.commit,
    buildSource: manifest.native.build.workflowCommit,
    buildRun: manifest.native.build.runId,
  });
  for (const archive of qualified.archives) {
    assert.match(archive.filename, /^[a-z0-9.-]+\.tgz$/u);
    const declared = manifest.archives.find(
      (a) => a.package === archive.package,
    );
    assert.ok(declared);
    for (const key of ["filename", "sha256", "integrity"])
      assert.equal(declared[key], archive[key]);
    const bytes = regularBytes(join(directory, archive.filename));
    assert.equal(hash(bytes), archive.sha256);
    assert.equal(
      "sha512-" + createHash("sha512").update(bytes).digest("base64"),
      archive.integrity,
    );
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
    assert.equal(report.passed, true);
    assert.equal(report.version, qualified.version);
    assert.equal(report.candidate, qualified.source);
    assert.equal(report.platform, expected.platform);
    assert.equal(report.qualification, expected.qualification);
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
  const payloads = verifyPayloads(qualified, directory, sourceArchive);
  const evidence = readJson(join(directory, "release-evidence-manifest.json"));
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
  return assets;
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
