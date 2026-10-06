// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  copyFileSync,
  existsSync,
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
} from "../scripts/release-assets.js";
import { prepareGithubRelease } from "../scripts/prepare-github-release.js";
import {
  deliverRelease,
  native,
  gitSource,
} from "../scripts/github-release.js";

const cwd = fileURLToPath(new URL("../", import.meta.url));
function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "github-release-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const input = join(temporary, "input");
  mkdirSync(input);
  const bundle = join(temporary, "bundle");
  const put = (name, data) => {
    const bytes = Buffer.isBuffer(data)
      ? data
      : Buffer.from(JSON.stringify(data, null, 2) + "\n");
    writeFileSync(join(input, name), bytes);
    return hash(bytes);
  };
  const source = native("git", ["rev-parse", "HEAD"], { cwd }).trim();
  const archives = ["win32-x64", "linux-x64", "core"].map((name) => {
    const suffix = name === "core" ? "" : `-${name}`;
    const bytes = Buffer.from(`Independent ${name} archive fixture`);
    const filename = `hadden-industries-markdown-quality${suffix}-1.0.2.tgz`;
    put(filename, bytes);
    return {
      package: `@hadden-industries/markdown-quality${suffix}`,
      filename,
      sha256: hash(bytes),
      integrity:
        "sha512-" + createHash("sha512").update(bytes).digest("base64"),
    };
  });
  const qualified = {
    schemaVersion: 1,
    version: "1.0.2",
    source,
    archives,
    native: {
      source: "a".repeat(40),
      buildSource: "b".repeat(40),
      buildRun: "1",
    },
  };
  const provider = (run, workflow, event, names) => {
    const expected = {
      run,
      attempt: "1",
      source,
      workflow,
      event,
      jobs: names,
    };
    const data = {
      run: {
        id: +run,
        repository: { full_name: repository },
        run_attempt: 1,
        head_sha: source,
        path: workflow,
        event,
        head_branch: "main",
        status: "completed",
        conclusion: "success",
      },
      jobs: {
        total_count: names.length,
        jobs: names.map((name) => ({
          name,
          run_id: +run,
          run_attempt: 1,
          status: "completed",
          conclusion: "success",
        })),
      },
    };
    return { expected, data };
  };
  const candidate = provider("10", ".github/workflows/candidate.yml", "push", [
    "pack",
    "consumer (windows-latest)",
    "consumer (ubuntu-24.04)",
  ]);
  const publication = provider(
    "11",
    ".github/workflows/publish.yml",
    "workflow_dispatch",
    [
      "admit",
      "publish",
      "registry (windows-latest)",
      "registry (ubuntu-24.04)",
    ],
  );
  qualified.candidate = candidate.expected;
  qualified.publication = publication.expected;
  put("candidate-provider.json", candidate.data);
  put("publication-provider.json", publication.data);
  qualified.origins = archives.map((a) => ({
    package: a.package,
    source,
    run: "11",
    attempt: "1",
    state: "planned",
  }));
  const sbomSha = put("source-sbom.cdx.json", { bomFormat: "CycloneDX" });
  qualified.manifestSha256 = put("release-manifest.json", {
    version: "1.0.2",
    source: { head: source, clean: true },
    native: {
      source: { commit: qualified.native.source },
      build: {
        workflowCommit: qualified.native.buildSource,
        runId: qualified.native.buildRun,
      },
    },
    sbom: { filename: "source-sbom.cdx.json", sha256: sbomSha },
    archives,
  });
  qualified.originsSha256 = put("publication-origins.json", {
    version: "1.0.2",
    artifactSource: source,
    manifestSha: qualified.manifestSha256,
    candidateRun: "10",
    records: qualified.origins,
  });
  qualified.reports = {};
  for (const [name, platform, qualification] of [
    ["candidate-windows.json", "win32-x64", "transported candidate archives"],
    ["candidate-linux.json", "linux-x64", "transported candidate archives"],
    ["registry-windows.json", "win32-x64", "public registry"],
    ["registry-linux.json", "linux-x64", "public registry"],
  ])
    qualified.reports[name] = {
      platform,
      qualification,
      sha256: put(name, {
        version: "1.0.2",
        candidate: source,
        platform,
        qualification,
        passed: true,
        records: archives,
      }),
    };
  qualified.materials = {
    "snapper-0.11.9-source.tar.gz": put(
      "snapper-0.11.9-source.tar.gz",
      Buffer.from("Native source fixture"),
    ),
  };
  for (const [name, path] of [
    ["native-build.json", "assets/native-build.json"],
    ["native-rights.json", "assets/native-rights.json"],
    ["tool-manifest.json", "assets/tool-manifest.json"],
    ["LICENSE", "LICENSE"],
    ["THIRD-PARTY-NOTICES.md", "THIRD-PARTY-NOTICES.md"],
  ])
    qualified.materials[name] = hash(
      native("git", ["show", `${source}:${path}`], { cwd, encoding: null }),
    );
  const assets = prepareGithubRelease(qualified, input, bundle, cwd);
  const evidenceDirectory = join(temporary, "evidence");
  return {
    qualified,
    directory: bundle,
    assets,
    evidenceDirectory,
    cwd,
    candidate,
    publication,
    input,
  };
}

test("matrix release evidence requires all runtime jobs and cannot silently downgrade a bound bundle", (t) => {
  const f = fixture(t);
  f.qualified.candidate.runtimePolicy = JSON.parse(
    readFileSync(new URL("../assets/node-support.json", import.meta.url)),
  );
  f.qualified.candidate.matrix = {
    os: ["windows-latest", "ubuntu-24.04"],
    node: ["22.23.3", "24.21.0", "26.10.0"],
  };
  f.qualified.candidate.jobs = [
    "pack",
    "consumer (windows-latest)",
    "consumer (ubuntu-24.04)",
    "consumer (windows-latest, 22.23.3)",
    "consumer (windows-latest, 26.10.0)",
    "consumer (ubuntu-24.04, 22.23.3)",
    "consumer (ubuntu-24.04, 26.10.0)",
  ];
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
          object: {
            type: "commit",
            sha: options.tagSource ?? f.qualified.source,
          },
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
    20,
  );
  const manifest = JSON.parse(
    readFileSync(join(f.directory, "release-evidence-manifest.json")),
  );
  assert.deepEqual(manifest.native, f.qualified.native);
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
    if (defect === "altered report")
      writeFileSync(join(f.directory, "registry-linux.json"), "{}");
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
  const f = fixture(t);
  const provider = providerAdapter(f);
  const result = await deliverRelease({
    ...f,
    gh: provider.gh,
    registry: async () => {},
  });
  assert.equal(result.immutable, true);
  assert.equal(provider.calls.filter((a) => a[1] === "upload").length, 20);
  assert.equal(
    provider.calls.filter((a) => a[1] === "verify-asset").length,
    20,
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
test("interrupted partial draft resumes only missing verified assets", async (t) => {
  const f = fixture(t);
  const existing = existingRelease(f);
  existing.assets = existing.assets.slice(0, 7);
  const provider = providerAdapter(f, { existing });
  await deliverRelease({ ...f, gh: provider.gh, registry: async () => {} });
  assert.equal(provider.calls.filter((a) => a[1] === "upload").length, 13);
  assert.ok(!provider.calls.some((a) => a[1] === "create"));
});
test("published immutable release recovery verifies without repeat external writes", async (t) => {
  const f = fixture(t);
  const provider = providerAdapter(f, { existing: existingRelease(f, false) });
  await deliverRelease({ ...f, gh: provider.gh, registry: async () => {} });
  assert.ok(
    !provider.calls.some((a) => ["create", "upload", "edit"].includes(a[1])),
  );
});
for (const defect of [
  "disabled immutability",
  "wrong tag",
  "unknown lookup",
  "corrupt draft bytes",
  "nonimmutable publication",
  "failed asset attestation",
  "registry mismatch",
])
  test(`operation stops on ${defect} without a successful receipt`, async (t) => {
    const f = fixture(t);
    const options = {};
    if (defect === "disabled immutability") options.enabled = false;
    if (defect === "wrong tag") options.tagSource = "e".repeat(40);
    if (defect === "unknown lookup")
      options.fail = (args) => args[1] === "graphql";
    if (defect === "corrupt draft bytes") options.corruptDownload = true;
    if (defect === "nonimmutable publication") options.publishImmutable = false;
    if (defect === "failed asset attestation")
      options.fail = (args) => args[1] === "verify-asset";
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
  });
