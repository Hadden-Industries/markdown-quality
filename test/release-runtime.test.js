// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { parse } from "yaml";
import { hash } from "../scripts/release-bytes.js";
import { npmCliPath } from "../scripts/commands.js";
import {
  readDraftDecisions,
  reviewDecisions,
  pilotDecisions,
} from "../scripts/release-acceptance.js";
import {
  inspectReleaseTag as inspectTag,
  verifyTagMetadata,
} from "../scripts/verify-release-tag.js";
// Isolated GitHub-provider fixtures model provider metadata; real OpenSSH/key
// admission is exercised independently in release-signing.test.js.
const inspectReleaseTag = (manifest, output, options) =>
  inspectTag(manifest, output, { verifyTag: verifyTagMetadata, ...options });
import { collectDraftDecisions } from "../scripts/read-release-decisions.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import { waitForReleaseAttestation } from "../scripts/release-attestation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const repository = "Hadden-Industries/markdown-quality";
function fixture(t) {
  const directory = mkdtempSync(
    join(tmpdir(), "markdown-quality-release-runtime-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const release = { version: "2.0.0", source: { head: "a".repeat(40) } };
  const manifest = Buffer.from(JSON.stringify(release) + "\n");
  const manifestSha = hash(manifest);
  const decision = (phase) =>
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        phase,
        version: release.version,
        source: release.source.head,
        manifestSha256: manifestSha,
        owner: "maksymshostak",
        acceptedAt: "2026-10-31T00:00:00Z",
        ...(phase === "pilot"
          ? {
              reviewSha256: "b".repeat(64),
              publicQualificationRun: "17",
              publicQualificationAttempt: "1",
            }
          : {}),
        decisions: Object.fromEntries(
          (phase === "review" ? reviewDecisions : pilotDecisions).map(
            (name) => [
              name,
              {
                outcome: "accepted",
                rationale:
                  "Owner accepted this exact release's original evidence.",
                reviewer: "fixture owner",
                independent: true,
                ...(phase === "pilot"
                  ? { subject: "exact public npm pilot" }
                  : {}),
                evidence: [
                  {
                    url: "https://example.test/original",
                    sha256: "c".repeat(64),
                  },
                ],
              },
            ],
          ),
        ),
      }) + "\n",
    );
  const records = {
    "release-review.json": decision("review"),
    "release-acceptance.json": decision("pilot"),
  };
  const manifestPath = join(directory, "release-manifest.json");
  writeFileSync(manifestPath, manifest);
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    if (args[0] === "api") {
      const reference = {
        ref: "refs/tags/v2.0.0",
        object: { type: "tag", sha: "d".repeat(40) },
      };
      const annotation = {
        sha: reference.object.sha,
        tag: "v2.0.0",
        object: { type: "commit", sha: release.source.head },
        verification: { verified: true, reason: "valid" },
      };
      return JSON.stringify(
        args[1].includes("git/ref/") ? reference : annotation,
      );
    }
    if (args[0] === "run")
      writeFileSync(join(args.at(-1), "release-manifest.json"), manifest);
    else if (args[1] === "view")
      return JSON.stringify({
        isDraft: true,
        isPrerelease: true,
        tagName: "v2.0.0",
      });
    else if (args[1] === "download")
      writeFileSync(
        join(args.at(-1), args[args.indexOf("--pattern") + 1]),
        records[args[args.indexOf("--pattern") + 1]],
      );
    else throw new Error("Unexpected native operation");
    return "";
  };
  const env = {
    GITHUB_REPOSITORY: repository,
    GITHUB_REF: "refs/heads/main",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    REGISTRY_RUN: "17",
    REGISTRY_ATTEMPT: "1",
    MANIFEST_SHA: manifestSha,
    REVIEW_SHA: hash(records["release-review.json"]),
    ACCEPTANCE_SHA: hash(records["release-acceptance.json"]),
  };
  return {
    directory,
    release,
    manifestPath,
    manifestSha,
    records,
    calls,
    gh,
    env,
  };
}

test("read-only admission verifies the signed original source without any draft API access", (t) => {
  const f = fixture(t);
  const provider = join(f.directory, "provider");
  mkdirSync(provider);
  inspectReleaseTag(f.manifestPath, provider, {
    tagOnly: true,
    env: f.env,
    gh: (args) => {
      assert.equal(args[0], "api", "Read-only token cannot see draft releases");
      return f.gh(args);
    },
  });
  assert.equal(f.calls.length, 2);
  assert.ok(existsSync(join(provider, "signed-tag.json")));
  assert.ok(!existsSync(join(provider, "release-review.json")));
  inspectReleaseTag(f.manifestPath, provider, { env: f.env, gh: f.gh });
  assert.deepEqual(
    readFileSync(join(provider, "release-review.json")),
    f.records["release-review.json"],
  );
});

test("the protected reader transfers exact owner bytes and refuses a different candidate or decision", (t) => {
  const f = fixture(t);
  const output = join(f.directory, "decisions");
  collectDraftDecisions(output, f.env, f.gh);
  assert.deepEqual(readdirSync(output).sort(), [
    "release-acceptance.json",
    "release-review.json",
  ]);
  for (const [name, bytes] of Object.entries(f.records))
    assert.deepEqual(readFileSync(join(output, name)), bytes);
  for (const field of ["MANIFEST_SHA", "REVIEW_SHA", "ACCEPTANCE_SHA"]) {
    const rejected = join(f.directory, field);
    assert.throws(() =>
      collectDraftDecisions(
        rejected,
        { ...f.env, [field]: "0".repeat(64) },
        f.gh,
      ),
    );
    assert.ok(!existsSync(rejected));
  }
});

test("draft absence, denied visibility and wrong draft identity never become approval", (t) => {
  const f = fixture(t);
  const decisions = [
    { name: "release-review.json", digest: f.env.REVIEW_SHA, phase: "review" },
  ];
  for (const draft of [
    null,
    { isDraft: false, isPrerelease: true, tagName: "v2.0.0" },
    { isDraft: true, isPrerelease: false, tagName: "v2.0.0" },
    { isDraft: true, isPrerelease: true, tagName: "v3.0.0" },
  ]) {
    assert.throws(() =>
      readDraftDecisions(f.release, f.manifestSha, decisions, {
        repository,
        gh: () => JSON.stringify(draft),
      }),
    );
  }
  const denied = new Error("HTTP403: draft visibility denied");
  assert.throws(
    () =>
      readDraftDecisions(f.release, f.manifestSha, decisions, {
        repository,
        gh: () => {
          throw denied;
        },
      }),
    (error) => error === denied,
  );
});

test("archival decisions preserve published immutable recovery while staging still requires a draft", (t) => {
  const f = fixture(t);
  const published = {
    tag_name: "v2.0.0",
    draft: false,
    immutable: true,
    prerelease: true,
  };
  const read = (state) => (args) => {
    if (args[0] === "release" && args[1] === "view")
      return JSON.stringify({
        isDraft: false,
        isPrerelease: true,
        tagName: "v2.0.0",
      });
    if (args[0] === "api") return JSON.stringify(state);
    return f.gh(args);
  };
  const output = join(f.directory, "published-decisions");
  collectDraftDecisions(output, f.env, read(published));
  assert.deepEqual(
    readFileSync(join(output, "release-acceptance.json")),
    f.records["release-acceptance.json"],
  );
  const provider = join(f.directory, "published-staging");
  mkdirSync(provider);
  assert.throws(
    () =>
      inspectReleaseTag(f.manifestPath, provider, {
        env: f.env,
        gh: (args) => (args[0] === "api" ? f.gh(args) : read(published)(args)),
      }),
    /live draft/u,
  );
  for (const changed of [
    { ...published, immutable: false },
    { ...published, prerelease: false },
    { ...published, tag_name: "v3.0.0" },
  ]) {
    const rejected = join(
      f.directory,
      `rejected-${Object.values(changed).join("-")}`,
    );
    assert.throws(() => collectDraftDecisions(rejected, f.env, read(changed)));
    assert.ok(!existsSync(rejected));
  }
});

function attestationFixture() {
  const qualified = { version: "2.0.0", source: "a".repeat(40) };
  const tagSha = "b".repeat(40);
  const assets = [{ name: "candidate.tgz", size: 3, sha256: "c".repeat(64) }];
  const live = {
    id: 17,
    tag_name: "v2.0.0",
    immutable: true,
    draft: false,
    prerelease: true,
    assets: assets.map((asset) => ({
      ...asset,
      state: "uploaded",
      digest: `sha256:${asset.sha256}`,
    })),
  };
  const reference = {
    ref: "refs/tags/v2.0.0",
    object: { type: "tag", sha: tagSha },
  };
  const annotation = {
    sha: tagSha,
    tag: "v2.0.0",
    object: { type: "commit", sha: qualified.source },
    verification: { verified: true, reason: "valid" },
  };
  const calls = [];
  const read = (observe) => (args, options) => {
    assert.equal(
      args[0],
      "api",
      "Readiness must never publish or verify cryptographic claims",
    );
    assert.ok(options.timeout > 0 && options.timeout <= 120000);
    calls.push(args[1]);
    if (args[1].includes("/attestations/")) return JSON.stringify(observe());
    if (args[1].includes("git/ref/")) return JSON.stringify(reference);
    if (args[1].includes("git/tags/")) return JSON.stringify(annotation);
    return JSON.stringify(live);
  };
  return {
    qualified,
    tagSha,
    assets,
    live,
    reference,
    annotation,
    calls,
    read,
  };
}

test("immutable release indexing waits within one budget while native verification stays separate", async () => {
  const f = attestationFixture();
  let time = 0,
    observations = 0;
  const observed = await waitForReleaseAttestation(
    f.qualified,
    f.live,
    f.assets,
    f.tagSha,
    {
      verifyTag: verifyTagMetadata,
      now: () => time,
      sleep: async (ms) => {
        time += ms;
      },
      gh: f.read(() => {
        if (++observations === 1)
          throw Object.assign(new Error("not indexed"), {
            stdout: '{"message":"Not Found","status":"404"}',
          });
        return { attestations: [{}] };
      }),
    },
  );
  assert.equal(observed.observations, 2);
  assert.equal(time, 30000);
  assert.equal(
    f.calls.filter((path) => path.includes("/attestations/")).length,
    2,
  );
});

test("indexing refusal, malformed evidence, identity drift and expiry remain terminal", async () => {
  for (const kind of [
    "denied",
    "malformed",
    "tag",
    "source",
    "asset",
    "release",
    "expired",
  ]) {
    const f = attestationFixture();
    const denied = Object.assign(new Error("HTTP403"), { httpStatus: 403 });
    let time = 0;
    const result = waitForReleaseAttestation(
      f.qualified,
      f.live,
      f.assets,
      f.tagSha,
      {
        verifyTag: verifyTagMetadata,
        deadline: 10000,
        now: () => time,
        sleep: async (ms) => {
          time += ms;
        },
        gh: f.read(() => {
          if (kind === "denied") throw denied;
          if (kind === "malformed") return { attestations: "invalid" };
          if (kind === "tag") f.reference.object.sha = "d".repeat(40);
          if (kind === "source") f.annotation.object.sha = "d".repeat(40);
          if (kind === "asset")
            f.live.assets[0].digest = "sha256:" + "d".repeat(64);
          if (kind === "release") f.live.id = 18;
          return { attestations: kind === "expired" ? [] : [{}] };
        }),
      },
    );
    await assert.rejects(
      result,
      kind === "denied" ? (error) => error === denied : undefined,
      kind,
    );
    assert.equal(
      f.calls.filter((path) => path.includes("/attestations/")).length,
      1,
    );
  }
});

test("publication commands load without project-installed packages while retaining native npm", () => {
  const npmRoot =
    pathToFileURL(resolve(dirname(npmCliPath()), "..")).href.toLowerCase() +
    "/";
  const hook = `import {registerHooks, isBuiltin} from "node:module"; registerHooks({resolve(specifier, context, next) { const resolved = next(specifier, context); if (resolved.url.toLowerCase().includes("/node_modules/") && !resolved.url.toLowerCase().startsWith(${JSON.stringify(npmRoot)})) throw new Error("Project package leaked into release runtime: " + specifier); if (!isBuiltin(specifier) && !/^(?:file:|data:|[./]|[A-Za-z]:)/u.test(specifier) && !context.parentURL?.toLowerCase().startsWith(${JSON.stringify(npmRoot)})) throw new Error("Project dependency: " + specifier); return resolved; }});`;
  const modules = [
    "stage-release-package",
    "github-release",
    "promote-release",
    "verify-release-tag",
    "read-release-decisions",
    "prepare-publication-environment",
    "verify-publication",
    "github-evidence",
    "collect-release-evidence",
    "publication-history",
    "publication-attempts",
    "publication-artifact",
  ];
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(hook)}`,
      "--input-type=module",
      "--eval",
      `for (const name of ${JSON.stringify(modules)}) { try { await import("./scripts/" + name + ".js"); } catch (error) { if (name !== "collect-release-evidence" || !error.message.includes("Usage: collect-release-evidence.js")) throw error; } }`,
    ],
    { cwd: root, encoding: "utf8", windowsHide: true, timeout: 10000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test("workflow contracts reject draft-permission, dependency-order and snapshot regressions", () => {
  const cases = [
    [
      "publish.yml",
      (doc) => {
        doc.jobs.admit.steps.find((step) =>
          step.run?.includes("verify-release-tag.js"),
        ).run =
          "node scripts/verify-release-tag.js frozen-release/release-manifest.json provider";
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.decision.permissions.contents = "write";
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.decision.permissions["id-token"] = "write";
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.decision.environment = "npm-publication";
      },
    ],
    [
      "publish.yml",
      (doc) => {
        delete doc.on.workflow_dispatch.inputs["history-checkpoints"].default;
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.decision.steps = doc.jobs.decision.steps.filter(
          (step) => step.id !== "prior_effects",
        );
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.decision.steps.find((step) => step.id === "prior_effects")[
          "continue-on-error"
        ] = true;
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.stage.needs = ["admit", "retained"];
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.stage.if = doc.jobs.stage.if.replace(
          "needs.decision.result == 'success'",
          "true",
        );
      },
    ],
    [
      "publish.yml",
      (doc) => {
        doc.jobs.stage.steps.find(
          (step) =>
            step.with?.["artifact-ids"] ===
            "${{ needs.decision.outputs.artifact-id }}",
        ).with["digest-mismatch"] = "warn";
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.decisions.permissions.contents = "write";
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.prepare.needs = [];
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.prepare.steps.find(
          (step) => step.with?.["artifact-ids"],
        ).with = {
          name: "release-decisions-${{ github.run_attempt }}",
          path: "release-decisions",
          "digest-mismatch": "error",
        };
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.decisions.outputs["artifact-id"] = "${{ github.run_attempt }}";
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.archive.steps.find((step) => step.with?.["artifact-ids"]).with[
          "artifact-ids"
        ] = "${{ github.run_attempt }}";
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        delete doc.jobs.prepare.steps.find((step) =>
          step.run?.includes("collect-release-evidence.js"),
        ).env.RELEASE_DECISIONS_DIRECTORY;
      },
    ],
    [
      "github-release.yml",
      (doc) => {
        doc.jobs.decisions.steps.find((step) =>
          step.uses?.startsWith("actions/upload-artifact@"),
        ).if = "success()";
      },
    ],
    [
      "promote-release.yml",
      (doc) => {
        doc.jobs.npm.steps = doc.jobs.npm.steps.filter(
          (step) => !step.uses?.startsWith("actions/setup-node@"),
        );
      },
    ],
  ];
  for (const [name, mutate] of cases) {
    const path = `.github/workflows/${name}`;
    const doc = parse(readFileSync(join(root, path), "utf8"));
    mutate(doc);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
      undefined,
      name,
    );
  }
});

test("archival gates cannot inherit a skipped decision branch or report a skipped writer as success", () => {
  const path = ".github/workflows/github-release.yml";
  const original = parse(readFileSync(join(root, path), "utf8"));
  for (const [reason, mutate] of [
    ["implicit writer success", (doc) => delete doc.jobs.archive.if],
    [
      "implicit completion success",
      (doc) => (doc.jobs.complete.if = "needs.archive.result == 'success'"),
    ],
    ["ungated writer", (doc) => (doc.jobs.archive.if = "${{ !cancelled() }}")],
    [
      "missing completion assertion",
      (doc) => {
        doc.jobs.complete.steps = doc.jobs.complete.steps.filter(
          (step) => step.name !== "Require a successful archival writer",
        );
      },
    ],
    [
      "disabled completion assertion",
      (doc) => {
        doc.jobs.complete.steps.find(
          (step) => step.name === "Require a successful archival writer",
        ).if = false;
      },
    ],
    [
      "unbound writer result",
      (doc) => {
        delete doc.jobs.complete.steps.find(
          (step) => step.name === "Require a successful archival writer",
        ).env.NEEDS_JSON;
      },
    ],
  ]) {
    const doc = structuredClone(original);
    mutate(doc);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
      /archival (?:writer|completion)/u,
      reason,
    );
  }
});

test("the actual archival completion command refuses a skipped, failed or cancelled writer", () => {
  const document = parse(
    readFileSync(join(root, ".github/workflows/github-release.yml"), "utf8"),
  );
  const gate = document.jobs.complete.steps.find(
    (step) => step.name === "Require a successful archival writer",
  );
  assert.ok(
    gate,
    "Completion must verify the writer before downloading its evidence",
  );
  const command = /^node --input-type=module -e '([^']+)'\s*$/u.exec(gate.run);
  assert.ok(command, "Exercise the exact declared native Node command");
  for (const result of ["success", "skipped", "failure", "cancelled"]) {
    const observed = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", command[1]],
      {
        cwd: root,
        env: {
          ...process.env,
          NEEDS_JSON: JSON.stringify({
            prepare: { result: "success" },
            archive: { result },
          }),
        },
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      },
    );
    assert.ifError(observed.error);
    assert.equal(observed.signal, null);
    assert.equal(observed.status, result === "success" ? 0 : 1, result);
    if (result !== "success")
      assert.match(observed.stderr, /Archival writer did not succeed/u);
  }
});

test("release jobs cannot inherit an unqualified hosted npm before registry reads", () => {
  for (const [name, role] of [
    ["release-registry.yml", "admit"],
    ["release-registry.yml", "security"],
    ["release-registry.yml", "qualified"],
    ["github-release.yml", "prepare"],
    ["github-release.yml", "archive"],
    ["release-history.yml", "prepare"],
  ]) {
    const path = `.github/workflows/${name}`;
    const original = parse(readFileSync(join(root, path), "utf8"));
    for (const mutation of [
      "missing acquisition",
      "disabled acquisition",
      "late acquisition",
      "missing isolation",
    ]) {
      const doc = structuredClone(original);
      const steps = doc.jobs[role].steps;
      const acquire = steps.findIndex(
        (step) => step.run === "node scripts/publication-npm.js acquire",
      );
      if (mutation === "missing acquisition") {
        doc.jobs[role].steps = steps.filter(
          (step) => step.run !== "node scripts/publication-npm.js acquire",
        );
      } else if (mutation === "disabled acquisition" && acquire >= 0) {
        steps[acquire].if = false;
      } else if (mutation === "late acquisition" && acquire >= 0) {
        steps.push(...steps.splice(acquire, 1));
      } else if (mutation === "missing isolation") {
        doc.jobs[role].steps = steps.filter(
          (step) => step.run !== "node scripts/publication-npm.js isolate",
        );
      }
      assert.throws(
        () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
        /hosted npm must/u,
        `${name}/${role}: ${mutation}`,
      );
    }
  }
});

test("an npm-only family operation skips the GitHub writer only by its authenticated admission output", () => {
  const path = ".github/workflows/promote-release.yml";
  const original = parse(readFileSync(join(root, path), "utf8"));
  checkWorkflows({ overrides: { [path]: JSON.stringify(original) } });
  for (const [reason, mutate] of [
    ["ungated GitHub writer", (doc) => delete doc.jobs.github.if],
    [
      "caller-selected GitHub skip",
      (doc) =>
        (doc.jobs.github.if =
          "fromJSON(inputs.operation-json).scope.github == true"),
    ],
    [
      "unconditional skipped writer at completion",
      (doc) =>
        (doc.jobs.complete.if = doc.jobs.complete.if.replace(
          " && needs.admit.outputs.github-writer == 'false'",
          "",
        )),
    ],
    [
      "unbound admission output",
      (doc) =>
        (doc.jobs.admit.outputs["github-writer"] =
          "${{ inputs.operation-json }}"),
    ],
  ]) {
    const doc = structuredClone(original);
    mutate(doc);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
      undefined,
      reason,
    );
  }
});
