// SPDX-License-Identifier: AGPL-3.0-only
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
import { verifyTagMetadata } from "../scripts/verify-release-tag.js";

const cwd = fileURLToPath(new URL("../", import.meta.url));

export function stageInventory() {
  return {
    checkedAt: new Date().toISOString(),
    command: "npm stage list --json --registry=https://registry.npmjs.org/",
    packages: Object.fromEntries(
      ["win32-x64", "linux-x64", ""].map((suffix) => [
        `@hadden-industries/markdown-quality${suffix ? `-${suffix}` : ""}`,
        { responseBytes: "[]", sha256: hash(Buffer.from("[]")) },
      ]),
    ),
  };
}

export function releaseFixture(t, current = true, channel, version = "1.0.2") {
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
    const filename = `hadden-industries-markdown-quality${suffix}-${version}.tgz`;
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
    version,
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
          head_sha: source,
          labels:
            name.match(/\bubuntu-\d[02468]\.04(?=[ ,)])/u)?.slice(0, 1) ?? [],
          status: "completed",
          conclusion: name === "candidate / shared" ? "skipped" : "success",
          steps: [],
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
    version,
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
    version,
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
        version,
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
  if (current) {
    qualified.schemaVersion = 2;
    const matrix = nodeMatrixFixture();
    qualified.candidate.matrix = matrix;
    qualified.candidate.runtimePolicy = nodeSupport;
    qualified.candidate.workflow =
      ".github/workflows/release-qualification.yml";
    qualified.candidate.event = "workflow_dispatch";
    qualified.candidate.jobs = [
      "resolve",
      "dependencies",
      "native / Validate win32-x64",
      "native / Validate linux-x64",
      "product / Reference producer",
      ...matrix.os.flatMap((os) =>
        matrix.node.map((node) => `product / Qualify ${os} / Node ${node}`),
      ),
      "product / Complete runtime qualification",
      "scans / Scan actions",
      "scans / Validate Actions approval model",
      "scans / Scan javascript-typescript",
      "scans / Scan python",
      "security",
      "distribution",
      "qualified",
    ];
    qualified.publication.workflow = ".github/workflows/release-registry.yml";
    qualified.publication.jobs = [
      "admit",
      ...matrix.os.flatMap((os) =>
        matrix.node.map((node) => `registry (${os}, ${node})`),
      ),
      "security",
      "qualified",
    ];
    for (const [name, item] of [
      ["candidate", candidate],
      ["publication", publication],
    ]) {
      item.data = provider(
        item.expected.run,
        item.expected.workflow,
        item.expected.event,
        item.expected.jobs,
      ).data;
      put(`${name}-provider.json`, item.data);
    }
    const manifest = JSON.parse(
      readFileSync(join(input, "release-manifest.json")),
    );
    manifest.qualificationMatrix = matrix;
    manifest.runtimePolicy = nodeSupport;
    manifest.archives = manifest.archives.map((archive, index) => ({
      ...archive,
      name: ["win32-x64", "linux-x64", "core"][index],
      version: qualified.version,
    }));
    qualified.manifestSha256 = put("release-manifest.json", manifest);
    qualified.originsSha256 = put("publication-origins.json", {
      version: qualified.version,
      artifactSource: source,
      manifestSha: qualified.manifestSha256,
      candidateRun: "10",
      records: qualified.origins,
    });
    qualified.reports = {};
    for (const kind of ["candidate", "registry"])
      for (const os of matrix.os)
        for (const node of matrix.node) {
          const name = `${kind}-${os}-${node}.json`;
          const platform = os.startsWith("windows") ? "win32-x64" : "linux-x64";
          const qualification =
            kind === "candidate"
              ? "transported candidate archives"
              : "public registry";
          qualified.reports[name] = {
            platform,
            qualification,
            node,
            sha256: put(name, {
              schemaVersion: 1,
              npm: nodeSupport.consumerNpm,
              manifestSha256: qualified.manifestSha256,
              archives: archives.map(({ package: packageName, sha256 }) => ({
                package: packageName,
                sha256,
              })),
              ...(kind === "candidate" && node === nodeSupport.reference
                ? {
                    performance: {
                      schemaVersion: 1,
                      python: pythonTarget(),
                      corpora: Object.fromEntries(
                        ["owlapi", "webvowl"].map((name) => [
                          name,
                          {
                            observations: Array.from({ length: 6 }, () => ({
                              activeDescendants: 0,
                            })),
                            completeDiagnosticAndSelectedSourceParity: true,
                            observedP95Ms: 1000,
                            peakTreeBytes: 1234,
                          },
                        ]),
                      ),
                    },
                  }
                : {}),
              version: qualified.version,
              candidate: source,
              platform,
              qualification,
              node: `v${node}`,
              passed: true,
              records: [
                ...archives,
                ...["root", "isolated"].map((layout) => {
                  const record = {
                    layout,
                    platform,
                    installedVersion: qualified.version,
                    allInstalledFileHashesVerified: true,
                    frozenTransportedArchiveInstall: kind === "candidate",
                    offlineFrozenLockReinstall: true,
                    credentialFreeOfflineRuntime: true,
                    unchangedDocumentAndConvergentFormatting: true,
                    lifecycleScripts: "disabled",
                    lockSha256: "a".repeat(64),
                    runtimeQualification: { node: "v" + node },
                  };
                  return {
                    ...record,
                    evidence: {
                      filename: layout + "-qualification.json",
                      sha256: createHash("sha256")
                        .update(
                          // json-identity-contract: bytes; owner: independent release layout fixture; reason: Bind exact LF layout-file bytes rather than infer semantic equality from serialization.
                          JSON.stringify({
                            schemaVersion: 1,
                            candidate: source,
                            node: "v" + node,
                            ...record,
                          }) + "\n",
                        )
                        .digest("hex"),
                    },
                  };
                }),
              ],
            }),
          };
        }
    qualified.evidence = {};
    for (const [index, archive] of manifest.archives.entries()) {
      const origin = qualified.origins[index];
      const subject = {
        package: archive.package,
        version: archive.version,
        sha256: archive.sha256,
        integrity: archive.integrity,
        tag: "pilot",
        origin,
      };
      const journal = Buffer.from(
        ["attempted", "outcome-unknown"]
          .map((state) => JSON.stringify({ state, ...subject }))
          .join("\n") + "\n",
      );
      const name = `stage-${archive.name}.jsonl`;
      qualified.evidence[name] = put(name, journal);
      const reconciliation = `stage-${archive.name}-reconciliation.json`;
      qualified.evidence[reconciliation] = put(
        reconciliation,
        bindStagingReconciliation(journal, archive, origin, qualified),
      );
    }
    for (const name of [
      "distribution-sbom.cdx.json",
      "staging-provider.json",
      "publication-history.json",
      "signed-tag.json",
    ])
      qualified.evidence[name] = put(name, {});
    for (const name of [
      "distribution-evidence.json",
      "security-evidence.json",
      "public-security-evidence.json",
    ])
      qualified.evidence[name] = put(name, {
        source,
        manifestSha256: qualified.manifestSha256,
        payloads: [],
      });
    const decision = {
      outcome: "accepted",
      rationale: "Explicit independent fixture review and evidence.",
      reviewer: "fixture-reviewer",
      independent: true,
      subject: "exact public npm pilot",
      evidence: [
        { url: "https://example.org/evidence", sha256: "a".repeat(64) },
      ],
    };
    const identity = {
      schemaVersion: 1,
      source,
      version: qualified.version,
      manifestSha256: qualified.manifestSha256,
      owner: "maksymshostak",
      acceptedAt: "2026-10-16T00:00:00Z",
    };
    qualified.evidence["release-review.json"] = put("release-review.json", {
      ...identity,
      phase: "review",
      decisions: Object.fromEntries(
        ["semver", "security", "nativeRights", "retention"].map((name) => [
          name,
          decision,
        ]),
      ),
    });
    qualified.evidence["release-acceptance.json"] = put(
      "release-acceptance.json",
      {
        ...identity,
        phase: "pilot",
        reviewSha256: qualified.evidence["release-review.json"],
        publicQualificationRun: "11",
        publicQualificationAttempt: "1",
        stageInventory: stageInventory(),
        decisions: Object.fromEntries(
          ["owlapi", "webvowl", "restoration"].map((name) => [name, decision]),
        ),
      },
    );
  }
  if (current)
    for (const platform of qualified.candidate.matrix.os)
      for (const layout of ["root", "isolated"]) {
        const name = `public-recipient-${platform}-${layout}-package-lock.json`;
        qualified.evidence[name] = put(name, {
          lockfileVersion: 3,
          packages: { "": { name: "original-recipient", version: "1.0.0" } },
        });
      }
  if (channel) {
    const review = JSON.parse(readFileSync(join(input, "release-review.json")));
    Object.assign(review, {
      schemaVersion: 2,
      repository,
      operationId: "direct-fixture",
      controller: source,
      controllerDeltaSha256: hash(Buffer.alloc(0)),
      candidate: { run: "10", attempt: "1" },
      channel,
      guards: {
        selectedLabels: Object.fromEntries(
          archives.map((archive) => [archive.package, "1.0.1"]),
        ),
        defaults: Object.fromEntries(
          archives.map((archive) => [archive.package, "1.0.1"]),
        ),
        githubLatest: 15,
      },
    });
    qualified.channel = channel;
    qualified.evidence["release-review.json"] = put(
      "release-review.json",
      review,
    );
    qualified.decision = {
      channel,
      operationId: review.operationId,
      reviewSha256: qualified.evidence["release-review.json"],
    };
    qualified.evidence["release-acceptance.json"] = put(
      "release-acceptance.json",
      {
        ...review,
        phase: "acceptance",
        decisions: {},
        trials: {},
        reviewSha256: qualified.decision.reviewSha256,
        publicQualificationRun: "11",
        publicQualificationAttempt: "1",
        stageInventory: stageInventory(),
        immutabilityObservation: {
          repository: `https://github.com/${repository}`,
          endpoint: `https://api.github.com/repos/${repository}/immutable-releases`,
          checkedAt: new Date().toISOString(),
          candidate: {
            version: qualified.version,
            source,
            manifestSha256: qualified.manifestSha256,
          },
          responseBytes: '{"enabled":true}',
          sha256: hash(Buffer.from('{"enabled":true}')),
        },
      },
    );
    for (const [index, origin] of qualified.origins.entries()) {
      origin.reviewSha256 = qualified.decision.reviewSha256;
      const name = `stage-${["win32-x64", "linux-x64", "core"][index]}.jsonl`;
      const records = readFileSync(join(input, name), "utf8")
        .trim()
        .split("\n")
        .map((line) => ({
          ...JSON.parse(line),
          tag: channel,
          decision: qualified.decision,
          origin,
        }));
      const journal = Buffer.from(
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      qualified.evidence[name] = put(name, journal);
      const manifest = JSON.parse(
        readFileSync(join(input, "release-manifest.json")),
      );
      const reconciliation = name.replace(".jsonl", "-reconciliation.json");
      qualified.evidence[reconciliation] = put(
        reconciliation,
        bindStagingReconciliation(
          journal,
          manifest.archives[index],
          origin,
          qualified,
        ),
      );
    }
    const origins = JSON.parse(
      readFileSync(join(input, "publication-origins.json")),
    );
    origins.records = qualified.origins;
    origins.decision = qualified.decision;
    qualified.originsSha256 = put("publication-origins.json", origins);
  }
  const assets = prepareGithubRelease(qualified, input, bundle, cwd);
  const evidenceDirectory = join(temporary, "evidence");
  return {
    qualified,
    history: async () => ({ settledGithub: [] }),
    directory: bundle,
    assets,
    evidenceDirectory,
    verifyTag: verifyTagMetadata,
    cwd,
    candidate,
    publication,
    input,
  };
}

/** Original native-only staging proof; no public core qualification or candidate archive is supplied. */
export function interruptedStagingFixture(t, priorVersion = "1.0.1-rc.1") {
  const f = releaseFixture(t, true, "latest"),
    manifestBytes = readFileSync(join(f.input, "release-manifest.json")),
    manifest = JSON.parse(manifestBytes);
  const review = JSON.parse(readFileSync(join(f.input, "release-review.json")));
  for (const name of Object.keys(review.guards.selectedLabels))
    review.guards.selectedLabels[name] = review.guards.defaults[name] =
      priorVersion;
  const reviewBytes = Buffer.from(JSON.stringify(review)),
    reviewSha256 = hash(reviewBytes);
  const origins = JSON.parse(
    readFileSync(join(f.input, "publication-origins.json")),
  );
  origins.decision.reviewSha256 = reviewSha256;
  for (const origin of origins.records) origin.reviewSha256 = reviewSha256;
  const file = (bytes) => ({
    sha256: hash(bytes),
    base64: bytes.toString("base64"),
  });
  const files = {
    "frozen-release/release-manifest.json": file(manifestBytes),
    "provider/release-review.json": file(reviewBytes),
    "frozen-release/publication-origins.json": file(
      Buffer.from(JSON.stringify(origins)),
    ),
  };
  const originalJournals = {};
  const scope = manifest.archives.slice(0, 2).map((archive) => archive.package);
  for (const archive of manifest.archives.slice(0, 2)) {
    const origin = origins.records.find(
      (value) => value.package === archive.package,
    );
    const subject = {
      package: archive.package,
      version: archive.version,
      sha256: archive.sha256,
      integrity: archive.integrity,
      tag: "latest",
      origin,
      decision: origins.decision,
    };
    const bytes = Buffer.from(
      JSON.stringify({ state: "attempted", ...subject }) +
        "\n" +
        JSON.stringify({
          state: "staged-awaiting-owner",
          stageId: `stage-${archive.name}`,
          ...subject,
        }) +
        "\n",
    );
    files[`staging-journal/${archive.name}.jsonl`] = file(bytes);
    originalJournals[archive.package] = hash(bytes);
  }
  const run = {
    id: 11,
    run_attempt: 1,
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
    path: ".github/workflows/publish.yml",
    head_sha: f.qualified.source,
    head_branch: "main",
    event: "workflow_dispatch",
    status: "completed",
    conclusion: "success",
    actor: { login: "maksymshostak" },
  };
  const job = {
    id: 901,
    name: "stage",
    run_id: 11,
    run_attempt: 1,
    head_sha: run.head_sha,
    status: "completed",
    conclusion: "success",
  };
  return {
    entry: { run, attempt: 1, job, files },
    manifest,
    review,
    scope,
    recovery: {
      originalWriter: { run: "11", attempt: "1", job: "901" },
      originalOperationId: review.operationId,
      originalDecisionSha256: reviewSha256,
      originalJournalSha256: originalJournals[scope[0]],
      originalJournals,
      affectedManifestSha256: hash(manifestBytes),
    },
    provider: {
      gh: (args) => {
        if (args[1].includes("git/ref/"))
          return JSON.stringify({ object: { sha: "d".repeat(40) } });
        if (args[1].includes("git/tags/")) return "{}";
        throw Object.assign(new Error("No complete candidate archive"), {
          httpStatus: 404,
        });
      },
      verifyTag: () => {},
      publicProof: async () => ({
        auditSha256: "a".repeat(64),
        nativeVerified: true,
      }),
    },
  };
}
