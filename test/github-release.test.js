// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { nodeSupport } from "../scripts/node-matrix.js";
import { nodeMatrixFixture, nextPatchVersion } from "./node-matrix-fixture.js";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  copyFileSync,
  existsSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hash,
  repository,
  verifyBundle,
  verifyInventory,
  verifyQualification,
  compactReleaseBundle,
} from "../scripts/release-assets.js";
import { prepareGithubRelease } from "../scripts/prepare-github-release.js";
import { native } from "../scripts/commands.js";
import { deliverRelease, gitSource } from "../scripts/github-release.js";
import { bindStagingReconciliation } from "../scripts/release-staging-evidence.js";
import { pythonTarget } from "../scripts/python-target.js";
import { repositoryPython } from "../scripts/python-target.js";
import { verifyTagMetadata } from "../scripts/verify-release-tag.js";
import { acquireIndexedRelease } from "../scripts/release-archive-reader.js";
import { verifyArchiveCompletion } from "../scripts/verify-archive-completion.js";

const cwd = fileURLToPath(new URL("../", import.meta.url));
import { releaseFixture as fixture } from "./release-fixture.js";

test("indexed archive conserves every logical byte including empty stderr and rejects a substituted member index", (t) => {
  const f = fixture(t);
  const emptyLog = "performance-ubuntu-24.04-owlapi-compact.driver.stderr.txt";
  writeFileSync(join(f.input, emptyLog), Buffer.alloc(0));
  f.qualified.evidence[emptyLog] = hash(Buffer.alloc(0));
  const flat = `${f.directory}-with-empty`;
  prepareGithubRelease(f.qualified, f.input, flat, cwd);
  const output = `${f.directory}-compact`;
  const source = gitSource(f.qualified, cwd);
  const assets = compactReleaseBundle(f.qualified, flat, output, source);
  assert.ok(assets.length < f.assets.length);
  assert.ok(assets.some((asset) => asset.name === "release-evidence.zip"));
  assert.deepEqual(verifyBundle(f.qualified, output, source), assets);
  t.diagnostic(
    JSON.stringify({
      flatAssets: f.assets.length,
      indexedAssets: assets.length,
      flatBytes: f.assets.reduce((sum, asset) => sum + asset.size, 0),
      indexedBytes: assets.reduce((sum, asset) => sum + asset.size, 0),
    }),
  );
  const path = join(output, "release-evidence-manifest.json");
  const index = JSON.parse(readFileSync(path));
  const original = JSON.parse(
    readFileSync(join(flat, "release-evidence-manifest.json")),
  );
  assert.deepEqual(index.payloads, original.payloads);
  assert.equal(
    index.evidence.members.find((member) => member.name === emptyLog).size,
    0,
  );
  const member = index.evidence.members[0];
  member.sha256 = "0".repeat(64);
  writeFileSync(path, JSON.stringify(index));
  assert.throws(() => verifyBundle(f.qualified, output, source));
});

test("indexed reader rejects valid outer ZIPs containing extra, missing, duplicate, linked or traversing members", (t) => {
  const f = fixture(t),
    source = gitSource(f.qualified, cwd),
    packed = `${f.directory}-indexed`;
  compactReleaseBundle(f.qualified, f.directory, packed, source);
  for (const kind of [
    "extra",
    "missing",
    "duplicate",
    "linked",
    "traversal",
    "oversized",
  ]) {
    const directory = `${packed}-${kind}`;
    cpSync(packed, directory, { recursive: true });
    const indexPath = join(directory, "release-evidence-manifest.json"),
      index = JSON.parse(readFileSync(indexPath));
    const zipPath = join(directory, "release-evidence.zip");
    if (kind === "oversized")
      index.evidence.members[0].size = 512 * 1024 * 1024 + 1;
    else
      native(repositoryPython(), [
        "-c",
        `import sys,zipfile,io
p,kind=sys.argv[1:]
raw=open(p,'rb').read()
with zipfile.ZipFile(io.BytesIO(raw)) as original, zipfile.ZipFile(p,'w') as changed:
    entries=original.infolist()
    for i,item in enumerate(entries):
        if kind!='missing' or i: changed.writestr(item, original.read(item))
    if kind=='duplicate': changed.writestr(entries[0],original.read(entries[0]))
    elif kind in ('extra','traversal'): changed.writestr('unexpected.txt' if kind=='extra' else '../escape.txt','foreign')
    elif kind=='linked':
        link=zipfile.ZipInfo('linked.txt'); link.create_system=3; link.external_attr=0o120777<<16; changed.writestr(link,'target')
`,
        zipPath,
        kind,
      ]);
    const bytes = readFileSync(zipPath),
      zip = index.assets.find((asset) => asset.name === "release-evidence.zip");
    zip.size = bytes.length;
    zip.sha256 = hash(bytes);
    writeFileSync(indexPath, JSON.stringify(index));
    assert.throws(() => verifyBundle(f.qualified, directory, source), kind);
  }
});

test("a successful installed-only diagnostic cannot replace a release report even with matching hashes", (t) => {
  const f = fixture(t);
  const [name, expected] = Object.entries(f.qualified.reports)[0];
  const report = JSON.parse(readFileSync(join(f.input, name)));
  assert.equal(report.passed, true);
  report.scope = "installed-only diagnostic";
  const bytes = Buffer.from(JSON.stringify(report));
  writeFileSync(join(f.input, name), bytes);
  expected.sha256 = hash(bytes);
  assert.throws(
    () =>
      prepareGithubRelease(
        f.qualified,
        f.input,
        `${f.directory}-diagnostic`,
        cwd,
      ),
    /Partial qualification/u,
  );
});

test("direct stable latest archives and classifies the same immutable release while pilot preserves classification", async (t) => {
  for (const channel of ["latest", "pilot"]) {
    const f = fixture(t, true, channel),
      adapter = providerAdapter(f);
    const result = await deliverRelease({
      ...f,
      gh: adapter.gh,
      registry: async () => {},
      family: () =>
        Object.fromEntries(
          f.qualified.archives.map((archive) => [
            archive.package,
            f.qualified.version,
          ]),
        ),
    });
    assert.equal(result.immutable, true);
    assert.equal(result.prerelease, channel !== "latest");
    assert.equal(
      adapter.calls.filter((args) => args[1] === "create").length,
      1,
    );
    assert.equal(
      adapter.calls.filter((args) => args.includes("--prerelease=false"))
        .length,
      channel === "latest" ? 1 : 0,
    );
  }
});

test("flat historical qualification restores manifest-bound empty logs and verifies only real provider assets", (t) => {
  const f = fixture(t, false),
    emptyLog = "performance-ubuntu-24.04-flat.driver.stderr.txt";
  writeFileSync(join(f.input, emptyLog), Buffer.alloc(0));
  f.qualified.evidence = {};
  f.qualified.evidence[emptyLog] = hash(Buffer.alloc(0));
  const flat = `${f.directory}-old-flat`;
  const assets = prepareGithubRelease(f.qualified, f.input, flat, cwd);
  const release = {
    id: 20,
    immutable: true,
    draft: false,
    tag_name: `v${f.qualified.version}`,
    assets: assets.map((asset) => ({
      ...asset,
      state: "uploaded",
      digest: `sha256:${asset.sha256}`,
    })),
  };
  const target = `${f.directory}-acquired`;
  mkdirSync(target);
  const verified = [];
  const acquired = acquireIndexedRelease(
    release,
    target,
    (args) => {
      assert.ok(["verify", "verify-asset", "download"].includes(args[1]));
      if (args[1] === "download") {
        const name = args[args.indexOf("--pattern") + 1];
        copyFileSync(
          join(flat, name),
          join(args[args.indexOf("--dir") + 1], name),
        );
      }
      if (args[1] === "verify-asset") verified.push(args[3]);
      return "{}";
    },
    { retainedQualification: f.qualified },
  );
  assert.equal(acquired.qualified.schemaVersion, 1);
  assert.equal(readFileSync(join(acquired.logical, emptyLog)).length, 0);
  assert.equal(verified.length, release.assets.length);
  assert.ok(!verified.some((name) => name.endsWith(emptyLog)));
});

test("matrix release evidence requires all runtime jobs and cannot silently downgrade a bound bundle", (t) => {
  const f = fixture(t);
  f.qualified.candidate.runtimePolicy = {
    ...nodeSupport,
    producerNpm: {
      ...nodeSupport.producerNpm,
      version: nextPatchVersion(nodeSupport.producerNpm.version),
    },
  };
  verifyQualification(f.qualified);
  assert.throws(
    () => verifyBundle(f.qualified, f.directory, gitSource(f.qualified, f.cwd)),
    "Qualification snapshot must match original manifest",
  );
  f.qualified.candidate.jobs.pop();
  assert.throws(
    () => verifyQualification(f.qualified),
    "Omitted runtime evidence cannot be accepted",
  );
});

function providerAdapter(f, options = {}) {
  const calls = [];
  let release = options.existing ?? null;
  const gh = (args) => {
    calls.push(args);
    if (options.fail?.(args)) throw new Error("Injected provider failure");
    if (args[0] === "api" && args[1] === "graphql")
      return JSON.stringify({
        data: {
          repository: {
            release: release && {
              databaseId: release.id,
              tagName: release.tag_name,
            },
          },
        },
      });
    if (args[0] === "api") {
      const endpoint = args[1].replace(`repos/${repository}/`, "");
      if (endpoint === "immutable-releases")
        return JSON.stringify({ enabled: options.enabled ?? true });
      if (endpoint.startsWith("git/ref/"))
        return JSON.stringify({
          ref: "refs/tags/v1.0.2",
          object: {
            type: "tag",
            sha: "d".repeat(40),
          },
        });
      if (endpoint.startsWith("git/tags/"))
        return JSON.stringify({
          sha: "d".repeat(40),
          tag: "v1.0.2",
          object: {
            type: "commit",
            sha: options.tagSource ?? f.qualified.source,
          },
          verification: { verified: true, reason: "valid" },
        });
      if (endpoint.startsWith("actions/runs/")) {
        const data = endpoint.includes("/10/")
          ? f.candidate.data
          : f.publication.data;
        return JSON.stringify(
          endpoint.includes("/jobs?") ? data.jobs : data.run,
        );
      }
      if (endpoint === "releases/20") return JSON.stringify(release);
      if (endpoint === "releases/latest")
        return JSON.stringify({ id: release?.prerelease === false ? 20 : 15 });
      if (endpoint.startsWith("attestations/sha1%3A"))
        return JSON.stringify({ attestations: [{ bundle: {} }] });
      throw new Error("Unexpected API fixture endpoint: " + endpoint);
    }
    const action = args[1];
    if (action === "create")
      release = {
        id: 20,
        tag_name: "v1.0.2",
        draft: true,
        prerelease: true,
        immutable: false,
        assets: [],
      };
    else if (action === "upload") {
      const name = args[3].split(/[\\/]/u).at(-1);
      const a = f.assets.find((asset) => asset.name === name);
      release.assets.push({
        name,
        state: "uploaded",
        size: a.size,
        digest: `sha256:${a.sha256}`,
      });
    } else if (action === "download") {
      const output = args[args.indexOf("--dir") + 1];
      for (const asset of f.assets)
        copyFileSync(join(f.directory, asset.name), join(output, asset.name));
      if (options.corruptDownload)
        writeFileSync(join(output, f.assets[0].name), "corrupted");
    } else if (action === "edit") {
      release.draft = false;
      release.immutable = options.publishImmutable ?? true;
      if (args.includes("--prerelease=false")) release.prerelease = false;
    } else if (!["verify", "verify-asset"].includes(action))
      throw new Error("Unexpected release fixture action");
    return "{}";
  };
  return {
    gh,
    calls,
    get release() {
      return release;
    },
  };
}
const existingRelease = (f, draft = true) => ({
  id: 20,
  tag_name: "v1.0.2",
  draft,
  prerelease: true,
  immutable: !draft,
  assets: f.assets.map((a) => ({
    name: a.name,
    size: a.size,
    digest: `sha256:${a.sha256}`,
    state: "uploaded",
  })),
});

test("archival binds original source, all tuple bytes and independent native origins", (t) => {
  const f = fixture(t);
  assert.equal(
    verifyBundle(f.qualified, f.directory, gitSource(f.qualified, cwd)).length,
    51,
  );
  const manifest = JSON.parse(
    readFileSync(join(f.directory, "release-evidence-manifest.json")),
  );
  assert.deepEqual(manifest.native, f.qualified.native);
  assert.equal(
    manifest.payloads.filter(
      (asset) => asset.name === "publication-history.json",
    ).length,
    1,
    "The authenticated version bindings survive Actions artifact expiry",
  );
  assert.ok(
    !manifest.payloads.some((a) => a.name === "release-evidence-manifest.json"),
  );
});
for (const defect of [
  "corrupt archive",
  "wrong source",
  "extra file",
  "altered report",
  "altered origins",
  "wrong source archive",
])
  test(`bundle rejects ${defect}`, (t) => {
    const f = fixture(t);
    const q = structuredClone(f.qualified);
    if (defect === "corrupt archive")
      writeFileSync(join(f.directory, q.archives[0].filename), "bad");
    if (defect === "wrong source") q.source = "e".repeat(40);
    if (defect === "extra file")
      writeFileSync(join(f.directory, "unexpected.txt"), "bad");
    if (defect === "altered report") {
      const report = Object.keys(q.reports).find((name) =>
        name.startsWith("registry-"),
      );
      assert.ok(report, "The report to corrupt exists in the valid fixture");
      writeFileSync(join(f.directory, report), "{}");
    }
    if (defect === "altered origins")
      writeFileSync(join(f.directory, "publication-origins.json"), "{}");
    const source =
      defect === "wrong source archive"
        ? Buffer.from("bad")
        : gitSource(f.qualified, cwd);
    assert.throws(() => verifyBundle(q, f.directory, source));
  });
test("inventory rejects duplicate, missing, unexpected and corrupted assets", (t) => {
  const f = fixture(t);
  for (const change of [
    (r) => r.assets.pop(),
    (r) => r.assets.push(r.assets[0]),
    (r) => (r.assets[0].name = "unexpected"),
    (r) => (r.assets[0].digest = "sha256:" + "0".repeat(64)),
  ]) {
    const r = existingRelease(f);
    change(r);
    assert.throws(() => verifyInventory(r, f.assets));
  }
});

test("qualification rejects path traversal and omitted assurance before preparation writes", (t) => {
  const f = fixture(t);
  for (const change of [
    (q) => (q.version = "../outside"),
    (q) => (q.archives[0].filename = "../outside"),
    (q) => (q.reports["../outside"] = q.reports["registry-linux.json"]),
    (q) => (q.materials["../outside"] = "a".repeat(64)),
    (q) => (q.candidate.jobs = []),
    (q) => (q.publication.workflow = ".github/workflows/evil.yml"),
    (q) => (q.publication.run = "../../other"),
  ]) {
    const q = structuredClone(f.qualified);
    change(q);
    assert.throws(() => verifyQualification(q));
    const output = join(f.evidenceDirectory, "not-created");
    assert.throws(() => prepareGithubRelease(q, f.input, output, cwd));
    assert.equal(existsSync(f.evidenceDirectory), false);
  }
});
test("native operation assembles a draft then verifies every immutable asset without npm publication", async (t) => {
  const f = fixture(t, true);
  const provider = providerAdapter(f);
  const result = await deliverRelease({
    ...f,
    gh: provider.gh,
    registry: async () => {},
  });
  assert.equal(result.immutable, true);
  assert.equal(
    provider.calls.filter((a) => a[1] === "upload").length,
    f.assets.length,
  );
  assert.equal(
    provider.calls.filter((a) => a[1] === "verify-asset").length,
    f.assets.length,
  );
  assert.ok(
    !provider.calls.some(
      (a) =>
        a.includes("--clobber") ||
        a.includes("publish") ||
        a.includes("dist-tag"),
    ),
  );
});
test("historical pilot archive completion authenticates its original writer and closes without repeating asset verification", async (t) => {
  const f = fixture(t),
    adapter = providerAdapter(f);
  await deliverRelease({ ...f, gh: adapter.gh, registry: async () => {} });
  const root = `${f.directory}-legacy-inputs`;
  mkdirSync(root);
  cpSync(f.directory, join(root, "bundle"), { recursive: true });
  writeFileSync(join(root, "qualification.json"), JSON.stringify(f.qualified));
  const run = {
    id: 1,
    run_attempt: 1,
    path: ".github/workflows/github-release.yml",
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
    head_sha: f.qualified.source,
    event: "workflow_dispatch",
    head_branch: "main",
    status: "completed",
    conclusion: "success",
  };
  const before = adapter.calls.length,
    deadlines = [];
  const result = await verifyArchiveCompletion(
    root,
    f.evidenceDirectory,
    `${root}-completion`,
    {
      env: { GITHUB_RUN_ID: "1", ARCHIVE_JOURNAL_ID: "800" },
      verifyTag: f.verifyTag,
      historicalFamily: (label, { deadline }) => {
        assert.equal(label, "pilot");
        deadlines.push(deadline);
        return Object.fromEntries(
          f.qualified.archives.map((archive) => [
            archive.package,
            f.qualified.version,
          ]),
        );
      },
      read: async (path) =>
        JSON.parse(adapter.gh(["api", `repos/${repository}${path}`])),
      gh: (args, { timeout }) => {
        assert.ok(timeout > 0 && timeout <= 300000);
        const path = args[1];
        if (path?.endsWith("/actions/artifacts/800"))
          return JSON.stringify({
            id: 800,
            name: "archive-journal-1",
            digest: `sha256:${"a".repeat(64)}`,
            expired: false,
            workflow_run: {
              id: 1,
              head_sha: run.head_sha,
              repository_id: 1,
              head_repository_id: 1,
            },
          });
        if (path?.endsWith("/attempts/1")) return JSON.stringify(run);
        if (path?.endsWith("/attempts/1/jobs?per_page=100"))
          return JSON.stringify({
            total_count: 1,
            jobs: [
              {
                id: 900,
                name: "archive",
                run_id: 1,
                run_attempt: 1,
                head_sha: run.head_sha,
                status: "completed",
                conclusion: "success",
              },
            ],
          });
        return adapter.gh(args);
      },
    },
  );
  assert.equal(result.status, "complete");
  assert.equal(result.scope, "historical-pilot-archive");
  assert.equal(deadlines.length, 1);
  assert.ok(
    !adapter.calls
      .slice(before)
      .some((args) =>
        ["create", "upload", "edit", "verify-asset"].includes(args[1]),
      ),
  );
});

test("interrupted partial draft resumes only missing verified assets", async (t) => {
  const f = fixture(t, true);
  const existing = existingRelease(f);
  existing.assets = existing.assets.slice(0, 7);
  const provider = providerAdapter(f, { existing });
  await deliverRelease({ ...f, gh: provider.gh, registry: async () => {} });
  assert.equal(
    provider.calls.filter((a) => a[1] === "upload").length,
    f.assets.length - 7,
  );
  assert.ok(!provider.calls.some((a) => a[1] === "create"));
});
test("interrupted direct-stable classification resumes once and an already stable archive verifies with zero writes", async (t) => {
  for (const stable of [false, true]) {
    const f = fixture(t, true, "latest"),
      existing = { ...existingRelease(f, false), prerelease: !stable };
    const adapter = providerAdapter(f, { existing });
    await deliverRelease({
      ...f,
      gh: adapter.gh,
      registry: async () => {},
      family: () =>
        Object.fromEntries(
          f.qualified.archives.map((archive) => [
            archive.package,
            f.qualified.version,
          ]),
        ),
    });
    assert.equal(
      adapter.calls.filter((args) => args.includes("--prerelease=false"))
        .length,
      stable ? 0 : 1,
    );
    assert.ok(
      !adapter.calls.some((args) => ["create", "upload"].includes(args[1])),
    );
  }
});

test("a displaced draft and a superseded controller stop before another archive effect", async (t) => {
  const f = fixture(t, true, "latest"),
    adapter = providerAdapter(f);
  await assert.rejects(
    deliverRelease({
      ...f,
      registry: async () => {},
      gh: (args) => {
        if (args[1]?.endsWith("/releases/21"))
          return JSON.stringify(adapter.release);
        const result = adapter.gh(args);
        if (args[1] === "upload") adapter.release.id = 21;
        return result;
      },
    }),
    /displaced/u,
  );
  assert.equal(adapter.calls.filter((args) => args[1] === "upload").length, 1);
  const g = fixture(t, true, "latest"),
    provider = providerAdapter(g);
  await assert.rejects(
    deliverRelease({
      ...g,
      registry: async () => {},
      env: { GITHUB_SHA: g.qualified.source },
      gh: (args) =>
        args[1]?.endsWith("/git/ref/heads/main")
          ? JSON.stringify({ object: { sha: "f".repeat(40) } })
          : provider.gh(args),
    }),
    /superseded/u,
  );
  assert.ok(
    !provider.calls.some((args) =>
      ["create", "upload", "edit"].includes(args[1]),
    ),
  );
});

test("an acknowledged archive create on a stale absent view is never repeated", async (t) => {
  const f = fixture(t, true, "latest"),
    adapter = providerAdapter(f);
  f.history = async () => ({
    settledGithub: [
      {
        operation: "create",
        subject: `v${f.qualified.version}`,
        target: [`v${f.qualified.version}`],
        context: { workflow: ".github/workflows/github-release.yml" },
      },
    ],
  });
  await assert.rejects(
    deliverRelease({ ...f, gh: adapter.gh, registry: async () => {} }),
    /never replay/u,
  );
  assert.ok(
    !adapter.calls.some((args) =>
      ["create", "upload", "edit"].includes(args[1]),
    ),
  );
});

test("a previous family classification cannot be interpreted as an archive request", async (t) => {
  const f = fixture(t, true, "latest"),
    adapter = providerAdapter(f);
  await deliverRelease({
    ...f,
    gh: adapter.gh,
    registry: async () => {},
    family: () =>
      Object.fromEntries(
        f.qualified.archives.map((archive) => [
          archive.package,
          f.qualified.version,
        ]),
      ),
    history: async () => ({
      settledGithub: [
        {
          operation: "classify-release",
          subject: 19,
          target: { latest: 19, prerelease: false },
          context: { workflow: ".github/workflows/promote-release.yml" },
        },
      ],
    }),
  });
  assert.equal(adapter.calls.filter((args) => args[1] === "create").length, 1);
});

test("published immutable release recovery works without repository administration access", async (t) => {
  const f = fixture(t, true);
  const provider = providerAdapter(f, {
    existing: existingRelease(f, false),
    fail: (args) => args[1]?.endsWith("/immutable-releases"),
  });
  const result = await deliverRelease({
    ...f,
    gh: provider.gh,
    registry: async () => {},
  });
  assert.equal(result.immutable, true);
  assert.equal(
    provider.calls.filter((a) => a[1] === "verify-asset").length,
    f.assets.length,
  );
  assert.ok(
    !provider.calls.some((a) => ["create", "upload", "edit"].includes(a[1])),
  );
});
test("empty performance stderr remains bound without a zero-byte release asset", (t) => {
  const f = fixture(t, true);
  const emptyLog = "performance-ubuntu-24.04-owlapi-1.driver.stderr.txt";
  const nonemptyLog = "performance-ubuntu-24.04-owlapi-2.driver.stderr.txt";
  const empty = Buffer.alloc(0);
  const nonempty = Buffer.from("Driver diagnostic\n");
  for (const [name, bytes] of [
    [emptyLog, empty],
    [nonemptyLog, nonempty],
  ]) {
    writeFileSync(join(f.input, name), bytes);
    f.qualified.evidence[name] = hash(bytes);
  }
  const bundle = join(f.input, "..", "bundle-with-performance");
  const assets = prepareGithubRelease(f.qualified, f.input, bundle, f.cwd);
  assert.ok(!assets.some(({ name }) => name === emptyLog));
  assert.ok(assets.some(({ name }) => name === nonemptyLog));
  assert.deepEqual(readFileSync(join(bundle, emptyLog)), empty);
  const evidence = JSON.parse(
    readFileSync(join(bundle, "release-evidence-manifest.json")),
  );
  assert.deepEqual(
    evidence.payloads.find(({ name }) => name === emptyLog),
    {
      name: emptyLog,
      size: 0,
      sha256: hash(empty),
      packageSource: f.qualified.source,
    },
  );
});
for (const defect of [
  "disabled immutability",
  "wrong tag",
  "unknown lookup",
  "corrupt draft bytes",
  "nonimmutable publication",
  "failed asset attestation",
  "failed release attestation",
  "registry mismatch",
])
  test(`operation stops on ${defect} without a successful receipt`, async (t) => {
    const f = fixture(t, true);
    const options = {};
    if (defect === "disabled immutability") options.enabled = false;
    if (defect === "wrong tag") options.tagSource = "e".repeat(40);
    if (defect === "unknown lookup")
      options.fail = (args) => args[1] === "graphql";
    if (defect === "corrupt draft bytes") options.corruptDownload = true;
    if (defect === "nonimmutable publication") options.publishImmutable = false;
    if (defect === "failed asset attestation")
      options.fail = (args) => args[1] === "verify-asset";
    if (defect === "failed release attestation")
      options.fail = (args) => args[1] === "verify";
    const provider = providerAdapter(f, options);
    await assert.rejects(
      deliverRelease({
        ...f,
        gh: provider.gh,
        registry: async () => {
          if (defect === "registry mismatch")
            throw new Error("Registry archive differs");
        },
      }),
    );
    assert.equal(existsSync(join(f.evidenceDirectory, "summary.json")), false);
    if (
      [
        "disabled immutability",
        "wrong tag",
        "unknown lookup",
        "registry mismatch",
      ].includes(defect)
    )
      assert.ok(
        !provider.calls.some((a) =>
          ["create", "upload", "edit"].includes(a[1]),
        ),
      );
    if (defect === "corrupt draft bytes")
      assert.ok(!provider.calls.some((a) => a[1] === "edit"));
    if (defect === "failed release attestation") {
      assert.equal(
        provider.calls.filter((args) => args[1] === "verify").length,
        1,
      );
      assert.equal(
        provider.calls.filter((args) => args[1] === "edit").length,
        1,
      );
      assert.equal(provider.release.immutable, true);
    }
  });
