// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { collectWriterHistory } from "../scripts/release-history.js";
import {
  buildRecoveredWriterEntry,
  createLegacyProvenanceResolver,
  LEGACY_RECOVERY_FILE,
  LEGACY_RECOVERY_SOURCE,
  LEGACY_WORKFLOW,
  verifyRecoveredProvenanceWriter,
} from "../scripts/release-provenance-recovery.js";
import {
  readPublicationHistory,
  verifyPublicationHistory,
} from "../scripts/publication-history.js";
import { legacyPublicationSteps } from "../scripts/publication-steps.js";
import { hash } from "../scripts/release-bytes.js";
import { releasePackages } from "../scripts/release-coordinates.js";
import { writerBaseline } from "../scripts/release-writer-inventory.js";

const repository = "Hadden-Industries/markdown-quality";
const repositoryId = 1001;
const workflowId = writerBaseline.publish.workflowId;
const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const shaCurrent = "c".repeat(40);

function sha512Pair(seed) {
  const bytes = Buffer.alloc(64, seed);
  return {
    hex: bytes.toString("hex"),
    integrity: `sha512-${bytes.toString("base64")}`,
  };
}

function packagePurl(pkg, version) {
  return `pkg:npm/%40${pkg.slice(1)}@${version}`;
}

function makeRun({
  id,
  number = id,
  headSha = shaA,
  conclusion = "success",
  createdAt = "2026-10-05T23:53:53Z",
  updatedAt = "2026-10-05T23:54:16Z",
  event = "workflow_dispatch",
  headBranch = "main",
  attempt = 1,
}) {
  return {
    id,
    name: "Publish",
    workflow_id: workflowId,
    run_number: number,
    run_attempt: attempt,
    path: LEGACY_WORKFLOW,
    event,
    head_branch: headBranch,
    head_sha: headSha,
    status: "completed",
    conclusion,
    created_at: createdAt,
    updated_at: updatedAt,
    repository: { id: repositoryId, full_name: repository },
    head_repository: { id: repositoryId, full_name: repository },
  };
}

function makePublishJobs(
  run,
  stepConclusions,
  {
    jobId = run.id * 10,
    jobName = "publish",
    jobConclusion = stepConclusions.some((c) => c === "failure")
      ? "failure"
      : "success",
    completedAt = run.updated_at ?? "2026-10-05T23:54:15Z",
    registryConclusion = "skipped",
    omitSteps = false,
  } = {},
) {
  const jobs = [
    {
      id: jobId,
      name: jobName,
      run_id: run.id,
      run_attempt: run.run_attempt,
      head_sha: run.head_sha,
      status: "completed",
      conclusion: jobConclusion,
      runner_id: 9001,
      started_at: run.created_at,
      completed_at: completedAt,
      ...(omitSteps
        ? {}
        : {
            steps: legacyPublicationSteps.map((name, index) => ({
              name,
              status: "completed",
              conclusion: stepConclusions[index],
              number: index + 1,
              started_at: run.created_at,
              completed_at: completedAt,
            })),
          }),
    },
  ];
  if (registryConclusion !== null)
    jobs.push({
      id: jobId + 1,
      name: "registry",
      run_id: run.id,
      run_attempt: run.run_attempt,
      head_sha: run.head_sha,
      status: "completed",
      conclusion: registryConclusion,
      runner_id: 9002,
      started_at: completedAt,
      completed_at: completedAt,
      steps: [],
    });
  return { total_count: jobs.length, jobs };
}

function slsaStatement({
  pkg,
  version,
  sha512,
  source = shaA,
  runId,
  attempt = 1,
  workflowPath = LEGACY_WORKFLOW,
  workflowRef = "refs/heads/main",
  event = "workflow_dispatch",
}) {
  const payload = {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: packagePurl(pkg, version),
        digest: { sha512 },
      },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            ref: workflowRef,
            repository: `https://github.com/${repository}`,
            path: workflowPath,
          },
        },
        resolvedDependencies: [
          {
            uri: `git+https://github.com/${repository}@refs/heads/main`,
            digest: { gitCommit: source },
          },
        ],
        internalParameters: { github: { event_name: event } },
      },
      runDetails: {
        builder: { id: "https://github.com/actions/runner/github-hosted" },
        metadata: {
          invocationId: `https://github.com/${repository}/actions/runs/${runId}/attempts/${attempt}`,
        },
      },
    },
  };
  return {
    name: pkg,
    version,
    location: `node_modules/${pkg}`,
    registry: "https://registry.npmjs.org/",
    attestationBundles: [
      {
        predicateType: "https://slsa.dev/provenance/v1",
        bundle: {
          dsseEnvelope: {
            payload: Buffer.from(JSON.stringify(payload)).toString("base64"),
          },
        },
      },
    ],
  };
}

function createMockHarness({
  runs,
  jobsByRunAttempt,
  artifactsByRun = new Map(),
  versionBySha = new Map(),
  published = [],
  auditOverrides,
}) {
  let npmAuditCalls = 0;
  const baseline = {
    publish: {
      workflowId,
      runs: [...runs]
        .sort((left, right) => left.run_number - right.run_number)
        .map((run) => run.id),
    },
    "github-release": { runs: [] },
    "promote-release": { runs: [] },
  };
  const packuments = new Map();
  for (const pkg of releasePackages) {
    packuments.set(pkg, {
      name: pkg,
      versions: {},
      time: { created: "2026-10-05T00:00:00Z" },
    });
  }
  const digests = new Map();
  for (let i = 0; i < published.length; i++) {
    const item = published[i];
    const pair = item.sha512
      ? {
          hex: item.sha512,
          integrity:
            item.integrity ??
            `sha512-${Buffer.from(item.sha512, "hex").toString("base64")}`,
        }
      : sha512Pair(i + 10);
    digests.set(`${item.pkg}@${item.version}`, pair);
    const pack = packuments.get(item.pkg);
    pack.versions[item.version] = { dist: { integrity: pair.integrity } };
    pack.time[item.version] = item.publishedAt;
  }

  const gh = (args) => {
    assert.equal(args[0], "api");
    const route = args[1];
    if (
      route ===
      `repos/${repository}/actions/workflows/publish.yml/runs?per_page=100`
    ) {
      return JSON.stringify([
        { total_count: runs.length, workflow_runs: runs },
      ]);
    }
    if (
      route.startsWith(`repos/${repository}/actions/workflows/`) &&
      route.endsWith("/runs?per_page=100")
    ) {
      return JSON.stringify([{ total_count: 0, workflow_runs: [] }]);
    }
    const runAttemptMatch =
      /^repos\/Hadden-Industries\/markdown-quality\/actions\/runs\/(\d+)\/attempts\/(\d+)$/u.exec(
        route,
      );
    if (runAttemptMatch) {
      const id = Number(runAttemptMatch[1]);
      const run = runs.find(
        (r) => r.id === id && r.run_attempt === Number(runAttemptMatch[2]),
      );
      if (!run) {
        const err = new Error("(HTTP 404)");
        err.httpStatus = 404;
        throw err;
      }
      return JSON.stringify(run);
    }
    const runMatch =
      /^repos\/Hadden-Industries\/markdown-quality\/actions\/runs\/(\d+)$/u.exec(
        route,
      );
    if (runMatch) {
      const run = runs.find((r) => r.id === Number(runMatch[1]));
      return JSON.stringify(run);
    }
    const jobsMatch =
      /^repos\/Hadden-Industries\/markdown-quality\/actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs\?per_page=100$/u.exec(
        route,
      );
    if (jobsMatch) {
      const key = `${jobsMatch[1]}/${jobsMatch[2]}`;
      return JSON.stringify(jobsByRunAttempt.get(key));
    }
    const artMatch =
      /^repos\/Hadden-Industries\/markdown-quality\/actions\/runs\/(\d+)\/artifacts\?per_page=100$/u.exec(
        route,
      );
    if (artMatch) {
      const list = artifactsByRun.get(Number(artMatch[1])) ?? [];
      return JSON.stringify([{ artifacts: list }]);
    }
    const pkgMatch =
      /^repos\/Hadden-Industries\/markdown-quality\/contents\/package\.json\?ref=([a-f0-9]{40})$/u.exec(
        route,
      );
    if (pkgMatch) {
      const version = versionBySha.get(pkgMatch[1]);
      return JSON.stringify({
        type: "file",
        path: "package.json",
        encoding: "base64",
        content: Buffer.from(JSON.stringify({ version })).toString("base64"),
      });
    }
    throw new Error(`Unexpected gh route: ${route}`);
  };

  const npm = (args) => {
    if (args[0] === "install") return "";
    if (args[0] === "audit" && args[1] === "signatures") {
      npmAuditCalls++;
      const verified = published.map((item) => {
        const pair = digests.get(`${item.pkg}@${item.version}`);
        return slsaStatement({
          pkg: item.pkg,
          version: item.version,
          sha512: item.slsaSha512 ?? pair.hex,
          source: item.source ?? shaA,
          runId: item.runId,
          attempt: item.attempt ?? 1,
          workflowPath: item.workflowPath,
          workflowRef: item.workflowRef,
          event: item.event,
        });
      });
      const baseAudit = { invalid: [], missing: [], verified };
      return JSON.stringify(
        auditOverrides ? auditOverrides(baseAudit) : baseAudit,
      );
    }
    throw new Error(`Unexpected npm args: ${args.join(" ")}`);
  };

  const readPackument = async (pkg) => packuments.get(pkg);
  return {
    gh,
    npm,
    readPackument,
    baseline,
    env: { GITHUB_SHA: shaCurrent, RUNNER_TEMP: process.env.TEMP ?? "/tmp" },
    getNpmAuditCalls: () => npmAuditCalls,
  };
}

test("recovers published-despite-failure, preempted-failure, partial-success, and full-success legacy runs from verified npm provenance", async () => {
  const runPreempted = makeRun({
    id: 37391073949,
    number: 1,
    headSha: shaA,
    conclusion: "failure",
    createdAt: "2026-10-05T23:53:53Z",
    updatedAt: "2026-10-05T23:54:16Z",
  });
  const runFailedAfterPublish = makeRun({
    id: 37393670535,
    number: 2,
    headSha: shaB,
    conclusion: "failure",
    createdAt: "2026-10-06T00:22:35Z",
    updatedAt: "2026-10-06T00:23:19Z",
  });
  const runPartialLinux = makeRun({
    id: 37408154658,
    number: 3,
    headSha: shaB,
    conclusion: "failure",
    createdAt: "2026-10-06T03:15:52Z",
    updatedAt: "2026-10-06T03:19:32Z",
  });
  const runFullNext = makeRun({
    id: 37412118242,
    number: 4,
    headSha: shaCurrent,
    conclusion: "success",
    createdAt: "2026-10-06T04:06:23Z",
    updatedAt: "2026-10-06T04:13:26Z",
  });
  const runs = [
    runFullNext,
    runPartialLinux,
    runFailedAfterPublish,
    runPreempted,
  ];
  const jobsByRunAttempt = new Map([
    [
      "37391073949/1",
      makePublishJobs(runPreempted, ["failure", "skipped", "skipped"], {
        completedAt: "2026-10-05T23:54:15Z",
      }),
    ],
    [
      "37393670535/1",
      makePublishJobs(
        runFailedAfterPublish,
        ["failure", "skipped", "skipped"],
        {
          completedAt: "2026-10-06T00:23:19Z",
        },
      ),
    ],
    [
      "37408154658/1",
      makePublishJobs(runPartialLinux, ["skipped", "success", "skipped"], {
        completedAt: "2026-10-06T03:19:31Z",
      }),
    ],
    [
      "37412118242/1",
      makePublishJobs(runFullNext, ["success", "success", "success"], {
        completedAt: "2026-10-06T04:13:25Z",
        registryConclusion: "success",
      }),
    ],
  ]);
  const h = createMockHarness({
    runs,
    jobsByRunAttempt,
    versionBySha: new Map([
      [shaA, "1.0.0"],
      [shaB, "1.0.0"],
      [shaCurrent, "1.0.1"],
    ]),
    published: [
      {
        pkg: releasePackages[0],
        version: "1.0.0",
        runId: 37393670535,
        source: shaB,
        publishedAt: "2026-10-06T00:25:25.398Z",
      },
      {
        pkg: releasePackages[1],
        version: "1.0.0",
        runId: 37408154658,
        source: shaB,
        publishedAt: "2026-10-06T03:19:23.172Z",
      },
      {
        pkg: releasePackages[2],
        version: "1.0.0",
        runId: 37409484508,
        source: shaB,
        publishedAt: "2026-10-06T03:35:51.573Z",
      },
      ...releasePackages.map((pkg, idx) => ({
        pkg,
        version: "1.0.1",
        runId: 37412118242,
        source: shaCurrent,
        publishedAt: `2026-10-06T04:1${idx}:00.000Z`,
      })),
    ],
  });

  const observed = await collectWriterHistory({
    env: h.env,
    gh: h.gh,
    npm: h.npm,
    readPackument: h.readPackument,
    baseline: h.baseline,
    approvedControllers: new Set([shaA, shaB, shaCurrent]),
    intents: [],
  });

  assert.deepEqual(observed.missing, []);
  assert.equal(observed.writers.length, 4);
  assert.equal(
    h.getNpmAuditCalls(),
    1,
    "Single batched npm audit per collection",
  );

  const docs = new Map(
    observed.writers.map((w) => [w.run.id, verifyRecoveredProvenanceWriter(w)]),
  );
  assert.equal(docs.get(37391073949).packages[0].disposition, "preempted");
  assert.equal(docs.get(37391073949).packages[0].preemptedBy.run, 37393670535);
  assert.equal(
    docs.get(37393670535).packages[0].disposition,
    "published-despite-step-failure",
  );
  assert.equal(docs.get(37408154658).packages[0].disposition, "skipped");
  assert.equal(docs.get(37408154658).packages[1].disposition, "published");
  assert.deepEqual(
    docs.get(37412118242).packages.map((p) => p.disposition),
    ["published", "published", "published"],
  );

  // Subsequent collectWriterHistory with checkpoint reuses retained entries without npm calls.
  const h2 = createMockHarness({
    runs,
    jobsByRunAttempt,
    versionBySha: new Map(),
    published: [],
  });
  const reused = await collectWriterHistory({
    env: h2.env,
    checkpoints: [
      {
        writers: observed.writers,
        writerAttempts: observed.writerAttempts,
        closedWriterRuns: observed.closedWriterRuns,
        nonWriterRuns: observed.nonWriterRuns,
      },
    ],
    gh: h2.gh,
    npm: h2.npm,
    readPackument: h2.readPackument,
    baseline: h2.baseline,
    approvedControllers: new Set([shaA, shaB, shaCurrent]),
    intents: [],
  });
  assert.deepEqual(reused.missing, []);
  assert.equal(reused.writers.length, 4);
  assert.equal(h2.getNpmAuditCalls(), 0);
});

test("non-baseline runs, stage jobs, multi-attempt runs and non-dispatch events never enter provenance recovery", async () => {
  const stageRun = makeRun({
    id: 5001,
    number: 1,
    conclusion: "success",
    createdAt: "2026-10-06T04:06:23Z",
    updatedAt: "2026-10-06T04:13:26Z",
  });
  const unbaselinedPublish = makeRun({
    id: 5002,
    number: 2,
    conclusion: "success",
    createdAt: "2026-10-06T04:06:23Z",
    updatedAt: "2026-10-06T04:13:26Z",
  });
  const runs = [stageRun, unbaselinedPublish];
  const jobsByRunAttempt = new Map([
    [
      "5001/1",
      makePublishJobs(stageRun, ["success", "success", "success"], {
        jobName: "stage",
      }),
    ],
    [
      "5002/1",
      makePublishJobs(unbaselinedPublish, ["success", "success", "success"], {
        jobName: "publish",
      }),
    ],
  ]);
  const h = createMockHarness({
    runs,
    jobsByRunAttempt,
    versionBySha: new Map([[shaA, "1.0.0"]]),
  });
  // Override baseline so 5002 is NOT in baseline.publish.runs and 5001 is in baseline but has jobName stage.
  const observed = await collectWriterHistory({
    env: h.env,
    gh: h.gh,
    npm: () => {
      throw new Error("npm must not run for ineligible jobs");
    },
    readPackument: h.readPackument,
    baseline: {
      publish: { workflowId, runs: [5001] },
      "github-release": { runs: [] },
      "promote-release": { runs: [] },
    },
    approvedControllers: new Set([shaA]),
    intents: [],
  });
  assert.equal(observed.missing.length, 2);

  // Direct resolver gate refuses multi-attempt, push event, and open runs with zero npm calls.
  const resolver = createLegacyProvenanceResolver({
    repository,
    baseline: { publish: { workflowId, runs: [5001, 5002, 5003, 5004] } },
    runs,
    gh: h.gh,
    npm: () => {
      throw new Error("npm must not run for ineligible jobs");
    },
    readPackument: h.readPackument,
  });
  for (const [run, attempt] of [
    [makeRun({ id: 5002, attempt: 2 }), 2],
    [makeRun({ id: 5003, event: "push" }), 1],
    [{ ...makeRun({ id: 5004 }), status: "in_progress", conclusion: null }, 1],
  ]) {
    const jobs = makePublishJobs(run, ["success", "success", "success"]);
    assert.equal(
      await resolver.recoverWriter({
        run,
        attempt,
        job: jobs.jobs[0],
        inventory: jobs,
        observedAt: Date.now(),
        publishRuns: [run],
      }),
      null,
    );
  }
});

for (const [label, expectedError, configure] of [
  [
    "invalid npm signature",
    /Invalid npm registry signature/u,
    (base) => ({
      ...base,
      auditOverrides: (audit) => ({ ...audit, invalid: [{ name: "bad" }] }),
    }),
  ],
  [
    "missing npm signature",
    /Missing npm registry signature/u,
    (base) => ({
      ...base,
      auditOverrides: (audit) => ({ ...audit, missing: [{ name: "missing" }] }),
    }),
  ],
  [
    "mismatched SLSA gitCommit",
    /lacks matching verified SLSA provenance/u,
    (base) => ({
      ...base,
      published: base.published.map((item) => ({ ...item, source: shaB })),
    }),
  ],
  [
    "wrong SLSA workflow path",
    /Expected values to be strictly deep-equal/u,
    (base) => ({
      ...base,
      published: base.published.map((item) => ({
        ...item,
        workflowPath: ".github/workflows/evil.yml",
      })),
    }),
  ],
  [
    "tarball sha512 mismatch against packument dist.integrity",
    /SLSA subject sha512 mismatch/u,
    (base) => ({
      ...base,
      published: base.published.map((item) => ({
        ...item,
        slsaSha512: Buffer.alloc(64, 99).toString("hex"),
      })),
    }),
  ],
  [
    "skipped step contradicted by verified SLSA provenance for the same run",
    /contradicts verified npm provenance/u,
    () => ({
      steps: ["skipped", "success", "skipped"],
      published: [
        {
          pkg: releasePackages[0],
          version: "1.0.0",
          runId: 37408154658,
          source: shaA,
          publishedAt: "2026-10-06T03:18:00.000Z",
        },
        {
          pkg: releasePackages[1],
          version: "1.0.0",
          runId: 37408154658,
          source: shaA,
          publishedAt: "2026-10-06T03:19:00.000Z",
        },
      ],
    }),
  ],
  [
    "success step missing npm provenance for target version",
    /lacks matching verified SLSA provenance/u,
    () => ({
      steps: ["success", "success", "success"],
      published: [],
    }),
  ],
  [
    "preemption claimed when preempting run started before failed run closed",
    /did not start after failed run/u,
    () => {
      const preempted = makeRun({
        id: 37391073949,
        number: 1,
        headSha: shaA,
        conclusion: "failure",
        createdAt: "2026-10-05T23:53:53Z",
        updatedAt: "2026-10-06T00:30:00Z",
      });
      const earlierOther = makeRun({
        id: 37393670535,
        number: 2,
        headSha: shaB,
        conclusion: "failure",
        createdAt: "2026-10-06T00:22:35Z",
        updatedAt: "2026-10-06T00:23:19Z",
      });
      return {
        runs: [earlierOther, preempted],
        jobsByRunAttempt: new Map([
          [
            "37391073949/1",
            makePublishJobs(preempted, ["failure", "skipped", "skipped"], {
              completedAt: "2026-10-06T00:30:00Z",
            }),
          ],
          [
            "37393670535/1",
            makePublishJobs(earlierOther, ["failure", "skipped", "skipped"], {
              completedAt: "2026-10-06T00:23:19Z",
            }),
          ],
        ]),
        published: [
          {
            pkg: releasePackages[0],
            version: "1.0.0",
            runId: 37393670535,
            source: shaB,
            publishedAt: "2026-10-06T00:25:25.398Z",
          },
        ],
      };
    },
  ],
  [
    "preemption claimed when another legacy publish step succeeded",
    /executed other steps so it cannot be discharged by preemption/u,
    () => {
      const failed = makeRun({
        id: 37408154658,
        number: 1,
        headSha: shaA,
        conclusion: "failure",
        createdAt: "2026-10-06T03:15:52Z",
        updatedAt: "2026-10-06T03:19:32Z",
      });
      return {
        runs: [failed],
        jobsByRunAttempt: new Map([
          [
            "37408154658/1",
            makePublishJobs(failed, ["failure", "success", "skipped"], {
              completedAt: "2026-10-06T03:19:31Z",
              jobConclusion: "failure",
            }),
          ],
        ]),
        published: [
          {
            pkg: releasePackages[0],
            version: "1.0.0",
            runId: 37393670535,
            source: shaB,
            publishedAt: "2026-10-06T00:25:25.398Z",
          },
          {
            pkg: releasePackages[1],
            version: "1.0.0",
            runId: 37408154658,
            source: shaA,
            publishedAt: "2026-10-06T03:19:00.000Z",
          },
        ],
      };
    },
  ],
  [
    "preemption claimed when run conclusion is success",
    /requires non-success run conclusion/u,
    () => ({
      steps: ["failure", "skipped", "skipped"],
      published: [
        {
          pkg: releasePackages[0],
          version: "1.0.0",
          runId: 37393670535,
          source: shaB,
          publishedAt: "2026-10-06T00:25:25.398Z",
        },
      ],
    }),
  ],
]) {
  test(`strict provenance contract refuses ${label}`, async () => {
    const defaultRun = makeRun({
      id: 37408154658,
      number: 1,
      headSha: shaA,
      conclusion: "success",
      createdAt: "2026-10-06T03:15:52Z",
      updatedAt: "2026-10-06T03:19:32Z",
    });
    const baseSpec = {
      runs: [defaultRun],
      steps: ["success", "success", "success"],
      published: releasePackages.map((pkg, idx) => ({
        pkg,
        version: "1.0.0",
        runId: 37408154658,
        source: shaA,
        publishedAt: `2026-10-06T03:1${idx}:00.000Z`,
      })),
    };
    const cfg = configure(baseSpec);
    const runs = cfg.runs ?? baseSpec.runs;
    const jobsByRunAttempt =
      cfg.jobsByRunAttempt ??
      new Map([
        [
          `${runs[0].id}/1`,
          makePublishJobs(runs[0], cfg.steps ?? baseSpec.steps, {
            completedAt: "2026-10-06T03:19:31Z",
            jobConclusion: (cfg.steps ?? baseSpec.steps).includes("failure")
              ? "failure"
              : "success",
          }),
        ],
      ]);
    const h = createMockHarness({
      runs,
      jobsByRunAttempt,
      versionBySha: new Map([
        [shaA, "1.0.0"],
        [shaB, "1.0.0"],
      ]),
      published: cfg.published ?? baseSpec.published,
      auditOverrides: cfg.auditOverrides,
    });

    await assert.rejects(
      () =>
        collectWriterHistory({
          env: h.env,
          gh: h.gh,
          npm: h.npm,
          readPackument: h.readPackument,
          baseline: h.baseline,
          approvedControllers: new Set([shaA, shaB]),
          intents: [],
        }),
      expectedError,
    );
  });
}

test("verifyRecoveredProvenanceWriter rejects forged checkpoint markers and inconsistent dispositions", () => {
  const run = makeRun({
    id: 37393670535,
    number: 3,
    headSha: shaB,
    conclusion: "failure",
    createdAt: "2026-10-06T00:22:35Z",
    updatedAt: "2026-10-06T00:23:19Z",
  });
  const jobs = makePublishJobs(run, ["failure", "skipped", "skipped"], {
    completedAt: "2026-10-06T00:23:19Z",
  });
  const pair = sha512Pair(42);
  const validEntry = buildRecoveredWriterEntry({
    run,
    attempt: 1,
    job: jobs.jobs[0],
    inventory: jobs,
    version: "1.0.0",
    packages: [
      {
        package: releasePackages[0],
        step: legacyPublicationSteps[0],
        stepConclusion: "failure",
        disposition: "published-despite-step-failure",
        provenance: {
          package: releasePackages[0],
          version: "1.0.0",
          source: shaB,
          run: run.id,
          attempt: 1,
          invocation: `https://github.com/${repository}/actions/runs/${run.id}/attempts/1`,
          integrity: pair.integrity,
          sha512: pair.hex,
          publishedAt: "2026-10-06T00:25:25.398Z",
        },
      },
      {
        package: releasePackages[1],
        step: legacyPublicationSteps[1],
        stepConclusion: "skipped",
        disposition: "skipped",
      },
      {
        package: releasePackages[2],
        step: legacyPublicationSteps[2],
        stepConclusion: "skipped",
        disposition: "skipped",
      },
    ],
  });
  assert.equal(verifyRecoveredProvenanceWriter(validEntry).version, "1.0.0");

  assert.throws(() =>
    verifyRecoveredProvenanceWriter({
      ...validEntry,
      artifact: { ...validEntry.artifact, source: undefined },
    }),
  );
  assert.throws(() =>
    verifyRecoveredProvenanceWriter({
      ...validEntry,
      artifact: { ...validEntry.artifact, id: 123 },
    }),
  );
  const extraFile = Buffer.from("{}", "utf8");
  assert.throws(() =>
    verifyRecoveredProvenanceWriter({
      ...validEntry,
      files: {
        ...validEntry.files,
        "extra.json": {
          sha256: hash(extraFile),
          base64: extraFile.toString("base64"),
        },
      },
    }),
  );
  const badDoc = JSON.parse(
    Buffer.from(
      validEntry.files[LEGACY_RECOVERY_FILE].base64,
      "base64",
    ).toString("utf8"),
  );
  badDoc.packages[1].disposition = "published";
  const badBytes = Buffer.from(JSON.stringify(badDoc), "utf8");
  const badDigest = hash(badBytes);
  assert.throws(() =>
    verifyRecoveredProvenanceWriter({
      ...validEntry,
      artifact: {
        ...validEntry.artifact,
        size_in_bytes: badBytes.length,
        digest: `sha256:${badDigest}`,
        source: LEGACY_RECOVERY_SOURCE,
      },
      files: {
        [LEGACY_RECOVERY_FILE]: {
          sha256: badDigest,
          base64: badBytes.toString("base64"),
        },
      },
    }),
  );
});

test("readPublicationHistory discharges other-version legacy runs via signed checkpoint or provenance while refusing same-version expiry", async () => {
  const legacy = makeRun({
    id: 37412118242,
    number: 1,
    headSha: shaA,
    conclusion: "success",
    createdAt: "2026-10-06T04:06:23Z",
    updatedAt: "2026-10-06T04:13:26Z",
  });
  const current = {
    id: 49999999999,
    name: "Publish",
    workflow_id: workflowId,
    run_number: 2,
    run_attempt: 1,
    path: LEGACY_WORKFLOW,
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: shaCurrent,
    status: "in_progress",
    conclusion: null,
    created_at: "2026-11-15T10:00:00Z",
    updated_at: "2026-11-15T10:00:00Z",
    repository: { id: repositoryId, full_name: repository },
    head_repository: { id: repositoryId, full_name: repository },
  };
  const currentJobs = {
    total_count: 1,
    jobs: [
      {
        id: 7001,
        name: "stage",
        run_id: current.id,
        run_attempt: 1,
        head_sha: shaCurrent,
        status: "in_progress",
        conclusion: null,
        runner_id: 9009,
        started_at: current.created_at,
        completed_at: null,
        steps: [
          {
            name: "Publish Windows staging package and record origin",
            status: "in_progress",
            conclusion: null,
          },
        ],
      },
    ],
  };
  const legacyJobs = makePublishJobs(
    legacy,
    ["success", "success", "success"],
    {
      completedAt: "2026-10-06T04:13:25Z",
      registryConclusion: "success",
    },
  );
  const h = createMockHarness({
    runs: [current, legacy],
    jobsByRunAttempt: new Map([
      ["37412118242/1", legacyJobs],
      ["49999999999/1", currentJobs],
    ]),
    versionBySha: new Map([[shaA, "1.0.1"]]),
    published: releasePackages.map((pkg, idx) => ({
      pkg,
      version: "1.0.1",
      runId: 37412118242,
      source: shaA,
      publishedAt: `2026-10-06T04:1${idx}:00.000Z`,
    })),
  });

  const downloadExpired = async () => {
    const err = new Error("Expired");
    err.code = "EVIDENCE_ARTIFACT_EXPIRED";
    throw err;
  };

  // Other version (4.0.0) succeeds via Strict Provenance Contract.
  const resolver = createLegacyProvenanceResolver({
    repository,
    baseline: h.baseline,
    runs: [current, legacy],
    gh: h.gh,
    npm: h.npm,
    readPackument: h.readPackument,
  });
  const history = await readPublicationHistory(
    current.id,
    h.gh,
    downloadExpired,
    {
      version: "4.0.0",
      archives: () => [],
      checkpoints: [],
      recoverSubject: resolver.recoverSubject,
    },
  );
  verifyPublicationHistory(
    { version: "4.0.0", archives: [] },
    {
      run: String(current.id),
      attempt: "1",
      controlSource: shaCurrent,
      records: [],
    },
    history,
  );

  // Same version (1.0.1) still refuses expired legacy artifacts without original manifest bytes.
  await assert.rejects(
    () =>
      readPublicationHistory(current.id, h.gh, downloadExpired, {
        version: "1.0.1",
        archives: () => [],
        checkpoints: [],
        recoverSubject: resolver.recoverSubject,
      }),
    /Expired/u,
  );

  // Recovered checkpoint writer also discharges via checkpoint without touching npm.
  const collected = await collectWriterHistory({
    env: h.env,
    gh: (args) =>
      args[1] ===
      `repos/${repository}/actions/workflows/publish.yml/runs?per_page=100`
        ? JSON.stringify([{ total_count: 1, workflow_runs: [legacy] }])
        : h.gh(args),
    npm: h.npm,
    readPackument: h.readPackument,
    baseline: {
      publish: { workflowId, runs: [legacy.id] },
      "github-release": { runs: [] },
      "promote-release": { runs: [] },
    },
    approvedControllers: new Set([shaA]),
    intents: [],
  });
  const fromCheckpoint = await readPublicationHistory(
    current.id,
    h.gh,
    downloadExpired,
    {
      version: "4.0.0",
      archives: () => [],
      checkpoints: [
        {
          writers: collected.writers,
          writerAttempts: collected.writerAttempts,
        },
      ],
      recoverSubject: () => {
        throw new Error("Should resolve from checkpoint");
      },
    },
  );
  verifyPublicationHistory(
    { version: "4.0.0", archives: [] },
    {
      run: String(current.id),
      attempt: "1",
      controlSource: shaCurrent,
      records: [],
    },
    fromCheckpoint,
  );
});

test("readPublicationHistory merges recovered version with richer manifestSha256 receipt and rejects version conflicts", async () => {
  const legacy = makeRun({
    id: 37412118242,
    number: 1,
    headSha: shaA,
    conclusion: "success",
    createdAt: "2026-10-06T04:15:00Z",
    updatedAt: "2026-10-06T04:18:00Z",
  });
  const later = makeRun({
    id: 37500000000,
    number: 2,
    headSha: shaB,
    conclusion: "success",
    createdAt: "2026-10-07T04:15:00Z",
    updatedAt: "2026-10-07T04:18:00Z",
  });
  const current = makeRun({
    id: 39999999999,
    number: 3,
    headSha: shaCurrent,
    status: "in_progress",
    conclusion: null,
    createdAt: "2026-11-10T00:00:00Z",
    updatedAt: "2026-11-10T00:01:00Z",
  });
  const legacyInventory = makePublishJobs(
    legacy,
    ["success", "success", "success"],
    { completedAt: "2026-10-06T04:17:00Z", registryConclusion: "success" },
  );
  const laterInventory = makePublishJobs(
    later,
    ["success", "success", "success"],
    { completedAt: "2026-10-07T04:17:00Z", registryConclusion: "success" },
  );
  const currentInventory = { total_count: 0, jobs: [] };

  const h = createMockHarness({
    runs: [current, later, legacy],
    jobsByRunAttempt: new Map([
      ["37412118242/1", legacyInventory],
      ["37500000000/1", laterInventory],
      ["39999999999/1", currentInventory],
    ]),
    versionBySha: new Map([
      [shaA, "1.0.1"],
      [shaB, "2.0.0"],
    ]),
    published: releasePackages.map((pkg, idx) => ({
      pkg,
      version: "1.0.1",
      runId: legacy.id,
      source: shaA,
      publishedAt: `2026-10-06T04:1${idx}:00.000Z`,
    })),
  });

  const legacyCollected = await collectWriterHistory({
    env: h.env,
    gh: (args) =>
      args[1] ===
      `repos/${repository}/actions/workflows/publish.yml/runs?per_page=100`
        ? JSON.stringify([{ total_count: 1, workflow_runs: [legacy] }])
        : h.gh(args),
    npm: h.npm,
    readPackument: h.readPackument,
    baseline: {
      publish: { workflowId, runs: [legacy.id] },
      "github-release": { runs: [] },
      "promote-release": { runs: [] },
    },
    approvedControllers: new Set([shaA]),
    intents: [],
  });

  const legacyManifestBytes = Buffer.from(JSON.stringify({ version: "1.0.1" }));
  const legacyManifestSha256 = hash(legacyManifestBytes);
  const laterManifestBytes = Buffer.from(JSON.stringify({ version: "2.0.0" }));
  const makeReceiptBytes = (version) =>
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        run: String(later.id),
        attempt: "1",
        manifestSha256: hash(laterManifestBytes),
        history: [
          {
            run: legacy,
            attempts: [{ run: legacy, jobs: legacyInventory }],
            manifestSha256: legacyManifestSha256,
            subject: {
              version,
              manifestSha256: legacyManifestSha256,
            },
          },
        ],
      }),
    );

  const makeLaterWriter = (versionInReceipt) => ({
    run: later,
    attempt: 1,
    job: laterInventory.jobs[0],
    inventory: laterInventory,
    artifact: { source: "actions" },
    files: {
      "frozen-release/release-manifest.json": {
        sha256: hash(laterManifestBytes),
        base64: laterManifestBytes.toString("base64"),
      },
      "provider/publication-history.json": {
        sha256: hash(makeReceiptBytes(versionInReceipt)),
        base64: makeReceiptBytes(versionInReceipt).toString("base64"),
      },
    },
  });

  const downloadExpired = async () => {
    const err = new Error("Expired");
    err.code = "EVIDENCE_ARTIFACT_EXPIRED";
    throw err;
  };

  const merged = await readPublicationHistory(
    current.id,
    h.gh,
    downloadExpired,
    {
      version: "4.0.0",
      archives: () => [],
      checkpoints: [
        {
          writers: [...legacyCollected.writers, makeLaterWriter("1.0.1")],
          writerAttempts: [
            ...legacyCollected.writerAttempts,
            { run: later, inventory: laterInventory },
          ],
        },
      ],
    },
  );
  const legacyEntry = merged.find((item) => item.run.id === legacy.id);
  assert.deepEqual(legacyEntry.subject, {
    version: "1.0.1",
    manifestSha256: legacyManifestSha256,
  });

  await assert.rejects(
    () =>
      readPublicationHistory(current.id, h.gh, downloadExpired, {
        version: "4.0.0",
        archives: () => [],
        checkpoints: [
          {
            writers: [...legacyCollected.writers, makeLaterWriter("1.0.2")],
            writerAttempts: [
              ...legacyCollected.writerAttempts,
              { run: later, inventory: laterInventory },
            ],
          },
        ],
      }),
    /Conflicting publication version evidence/u,
  );
});
