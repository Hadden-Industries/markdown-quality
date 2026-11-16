// SPDX-License-Identifier: AGPL-3.0-only
/** Disposable provider worlds for production executables, with an isolated real SSH test key. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { releaseFixture, stageInventory } from "./release-fixture.js";
import { hash } from "../scripts/release-bytes.js";
import { native, npmCliPath } from "../scripts/commands.js";
import { planPublicationOrigins } from "../scripts/publication-origins.js";
import { prepareGithubRelease } from "../scripts/prepare-github-release.js";
import { writerBaseline } from "../scripts/release-writer-inventory.js";
import { releaseCommit } from "../scripts/release-qualification.js";

const repository = "Hadden-Industries/markdown-quality";
const root = fileURLToPath(new URL("../", import.meta.url));
const hook = new URL("./release-provider-fixture-hook.mjs", import.meta.url)
  .href;

export function entryWorld(t, phase, exactSource) {
  const f = releaseFixture(t, true, "latest");
  const temporary = dirname(f.input),
    key = join(temporary, "fixture-key");
  native("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
  const policy = {
    principal: "offline-rehearsal@example.test",
    activeKeys: [
      readFileSync(`${key}.pub`, "utf8")
        .trim()
        .split(/\s+/u)
        .slice(0, 2)
        .join(" "),
    ],
    historicalTags: {},
  };
  const sign = (tag, commit, sha) => {
    const payload = `object ${commit}\ntype commit\ntag ${tag}\ntagger Offline <offline-rehearsal@example.test> 1 +0000\n\nIsolated fixture; no live authority\n`;
    return {
      sha,
      tag,
      object: { type: "commit", sha: commit },
      verification: {
        verified: true,
        reason: "valid",
        payload,
        signature: native(
          "ssh-keygen",
          ["-Y", "sign", "-f", key, "-n", "git"],
          { input: payload },
        ),
      },
    };
  };
  const workflow = phase === "stage" ? "publish" : "github-release";
  const runId = phase === "stage" ? 99001 : 99002;
  const controller = f.qualified.source;
  const number = writerBaseline[workflow].runs.length + 1;
  const manifestBytes = readFileSync(
    join(exactSource ?? f.input, "release-manifest.json"),
  );
  const manifest = JSON.parse(manifestBytes);
  const review = JSON.parse(readFileSync(join(f.input, "release-review.json")));
  Object.assign(review, {
    version: manifest.version,
    source: manifest.source.head,
    manifestSha256: hash(manifestBytes),
    controller,
    controllerDeltaSha256: hash(
      native(
        "git",
        [
          "diff",
          "--binary",
          "--no-ext-diff",
          "--no-textconv",
          releaseCommit(manifest),
          controller,
        ],
        { cwd: root, encoding: null },
      ),
    ),
    candidate: { run: exactSource ? "43917797156" : "10", attempt: "1" },
    stageInventory: stageInventory(),
  });
  const reviewBytes = Buffer.from(JSON.stringify(review));
  const reviewSha = hash(reviewBytes);
  const state = {
    signerPolicy: policy,
    npmCli: npmCliPath(),
    version: manifest.version,
    repositoryRoot: root,
    archives: manifest.archives,
    archiveDirectory: exactSource ?? f.input,
    priorLatest: 15,
    routes: {},
    calls: [],
    requests: [],
    assets: [],
    tags: Object.fromEntries(
      manifest.archives.map((archive) => [
        archive.package,
        { latest: phase === "stage" ? "1.0.1" : manifest.version },
      ]),
    ),
  };
  const env = {
    ...process.env,
    GH_TOKEN: "isolated-fixture",
    GITHUB_TOKEN: "",
    NODE_OPTIONS: "",
    NPM_TOKEN: "",
    NODE_AUTH_TOKEN: "",
    GITHUB_REPOSITORY: repository,
    GITHUB_REPOSITORY_ID: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/${workflow}.yml@refs/heads/main`,
    GITHUB_ACTOR: "maksymshostak",
    GITHUB_TRIGGERING_ACTOR: "maksymshostak",
    GITHUB_SHA: controller,
    GITHUB_RUN_ID: String(runId),
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_NUMBER: String(number),
    CANDIDATE_RUN: String(review.candidate.run),
    STAGING_PHASE: "natives",
    RECOVERY_RUN: "",
    RECOVERY_ATTEMPT: "",
    RECOVERY_ORIGINS_SHA: "",
    HISTORY_CHECKPOINT: "[]",
    MANIFEST_SHA: hash(manifestBytes),
    REVIEW_JSON: reviewBytes.toString(),
    REVIEW_SHA: reviewSha,
    MARKDOWN_QUALITY_PRODUCER_NODE: process.execPath,
    MARKDOWN_QUALITY_PRODUCER_NPM: npmCliPath(),
    MQ_RELEASE_PROVIDER_FIXTURE: join(temporary, "provider-world.json"),
  };
  const job = join(temporary, "cold-job");
  mkdirSync(job);
  env.RUNNER_TEMP = job;
  env.GITHUB_ENV = join(job, "env");
  env.GITHUB_OUTPUT = join(job, "output");
  const run = (id, name, index) => ({
    id,
    run_number: index,
    run_attempt: 1,
    workflow_id: writerBaseline[name].workflowId,
    repository: { id: 1, full_name: repository },
    head_repository: { id: 1, full_name: repository },
    path: `.github/workflows/${name}.yml`,
    head_sha: controller,
    head_branch: "main",
    event: "workflow_dispatch",
    created_at: "2026-01-01T00:00:00Z",
    status: "completed",
    conclusion: "failure",
  });
  for (const [name, baseline] of Object.entries(writerBaseline)) {
    const runs = baseline.runs.map((id, i) => run(id, name, i + 1));
    if (name === workflow)
      runs.push({
        ...run(runId, name, number),
        status: "in_progress",
        conclusion: null,
      });
    state.routes[`actions/workflows/${name}.yml/runs?per_page=100`] = [
      { total_count: runs.length, workflow_runs: runs },
    ];
    for (const value of runs.filter((value) => value.id !== runId)) {
      state.routes[`actions/runs/${value.id}/attempts/1`] = value;
      state.routes[`actions/runs/${value.id}/attempts/1/jobs?per_page=100`] = {
        total_count: 0,
        jobs: [],
      };
      state.routes[`actions/runs/${value.id}/artifacts?per_page=100`] = [
        { artifacts: [] },
      ];
    }
  }
  let bundle;
  if (phase === "stage") {
    const archives = join(job, "archives");
    mkdirSync(archives);
    writeFileSync(join(archives, "release-manifest.json"), manifestBytes);
    for (const archive of manifest.archives)
      copyFileSync(
        join(state.archiveDirectory, archive.filename),
        join(archives, archive.filename),
      );
    const map = planPublicationOrigins({
      release: manifest,
      manifestSha: env.MANIFEST_SHA,
      candidateRun: env.CANDIDATE_RUN,
      context: {
        head: controller,
        publicationRun: String(runId),
        publicationAttempt: "1",
        decision: {
          channel: "latest",
          reviewSha256: reviewSha,
          operationId: review.operationId,
        },
      },
    });
    writeFileSync(
      join(archives, "publication-origins.json"),
      JSON.stringify(map),
    );
    mkdirSync(join(job, "provider"));
    writeFileSync(join(job, "provider/release-review.json"), reviewBytes);
    // A fresh stage executable must not reopen this redundant historical transport.
    writeFileSync(
      join(job, "provider/staging-history.json"),
      "[]" + " ".repeat(23612807),
    );
    bundle = archives;
  } else {
    const tagSha = "d".repeat(40),
      tag = `v${manifest.version}`;
    const annotation = sign(tag, releaseCommit(f.qualified), tagSha);
    const reference = {
      ref: `refs/tags/${tag}`,
      object: { type: "tag", sha: tagSha },
    };
    const signed = Buffer.from(JSON.stringify({ reference, annotation }));
    writeFileSync(join(f.input, "signed-tag.json"), signed);
    f.qualified.evidence["signed-tag.json"] = hash(signed);
    bundle = join(temporary, "cold-bundle");
    state.assets = prepareGithubRelease(f.qualified, f.input, bundle, root);
    state.bundle = bundle;
    state.routes[`git/ref/tags/${tag}`] = reference;
    state.routes[`git/tags/${tagSha}`] = annotation;
    state.routes["immutable-releases"] = { enabled: true };
    state.routes["git/ref/heads/main"] = {
      ref: "refs/heads/main",
      object: { sha: controller },
    };
    for (const provider of [f.candidate, f.publication]) {
      state.routes[`actions/runs/${provider.data.run.id}/attempts/1`] =
        provider.data.run;
      state.routes[
        `actions/runs/${provider.data.run.id}/attempts/1/jobs?per_page=100`
      ] = provider.data.jobs;
    }
    env.REVIEW_JSON = readFileSync(
      join(f.input, "release-review.json"),
      "utf8",
    );
    env.REVIEW_SHA = f.qualified.evidence["release-review.json"];
    env.ACCEPTANCE_JSON = readFileSync(
      join(f.input, "release-acceptance.json"),
      "utf8",
    );
    env.ACCEPTANCE_SHA = f.qualified.evidence["release-acceptance.json"];
    env.REGISTRY_RUN = "11";
    env.REGISTRY_ATTEMPT = "1";
    state.downloads = {
      "release-manifest.json": join(f.input, "release-manifest.json"),
    };
  }
  const decisionSha = phase === "stage" ? reviewSha : env.ACCEPTANCE_SHA;
  const intentTag = `release-history-intent-${workflow}-${number}-1-${decisionSha}`;
  const intentSha = "e".repeat(40);
  state.routes["git/matching-refs/tags/release-history-intent-?per_page=100"] =
    [
      [
        {
          ref: `refs/tags/${intentTag}`,
          object: { type: "tag", sha: intentSha },
        },
      ],
    ];
  state.routes[`git/tags/${intentSha}`] = sign(
    intentTag,
    controller,
    intentSha,
  );
  writeFileSync(env.MQ_RELEASE_PROVIDER_FIXTURE, JSON.stringify(state));
  return {
    ...f,
    env,
    job,
    bundle,
    manifest,
    state: () => JSON.parse(readFileSync(env.MQ_RELEASE_PROVIDER_FIXTURE)),
    change: (apply) => {
      const value = JSON.parse(readFileSync(env.MQ_RELEASE_PROVIDER_FIXTURE));
      apply(value);
      writeFileSync(env.MQ_RELEASE_PROVIDER_FIXTURE, JSON.stringify(value));
    },
    entry: (script, args = []) =>
      spawnSync(
        process.execPath,
        ["--import", hook, join(root, "scripts", script), ...args],
        {
          cwd: job,
          env,
          encoding: "utf8",
          timeout: 120000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      ),
  };
}
