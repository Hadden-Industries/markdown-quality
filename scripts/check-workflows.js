// SPDX-License-Identifier: AGPL-3.0-only
// Adopt OwlAPI's whole-workflow contract checks, using native YAML parsing.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { budgets } from "./qualification-budgets.js";
import { qualificationEnvironment } from "./shared-qualification-admission.js";

const repository = fileURLToPath(new URL("../", import.meta.url));
const transferBudgets = new Map([
  ["./.github/actions/upload-evidence", budgets.uploadStep],
  ["./.github/actions/download-evidence", budgets.collection],
]);

/** Check every local caller before expensive hosted fan-out, including dormant release paths. */
export function checkWorkflows({ root = repository, overrides = {} } = {}) {
  const read = (path) => {
    const document = parseDocument(
      overrides[path] ?? readFileSync(resolve(root, path), "utf8"),
      { uniqueKeys: true },
    );
    assert.equal(document.errors.length, 0, `${path}: invalid YAML`);
    return document.toJS();
  };
  const actions = new Map();
  const pinned = (path, uses) => {
    if (uses && !uses.startsWith("./"))
      assert.match(
        uses,
        /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/u,
        `${path}: external action needs a full reviewed SHA`,
      );
  };
  for (const entry of readdirSync(resolve(root, ".github/actions"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const path = `.github/actions/${entry.name}/action.yml`;
    const action = read(path);
    assert.ok(
      ["composite", "node24"].includes(action.runs?.using),
      `${path}: unsupported action runtime`,
    );
    if (action.runs.using === "node24") {
      assert.ok(
        existsSync(
          resolve(root, ".github/actions", entry.name, action.runs.main),
        ),
        `${path}: missing native entry`,
      );
    } else {
      assert.ok(
        Array.isArray(action.runs.steps),
        `${path}: missing composite steps`,
      );
      for (const step of action.runs.steps) {
        pinned(path, step.uses);
        assert.ok(
          !Object.hasOwn(step, "timeout-minutes"),
          `${path}: composite-step timeout is unsupported`,
        );
        if (step.run)
          assert.ok(step.shell, `${path}: composite command needs a shell`);
      }
    }
    actions.set(`./.github/actions/${entry.name}`, action);
  }
  assert.equal(
    actions.get("./.github/actions/upload-evidence")?.runs.using,
    "node24",
    "SDK uploads require native action credentials",
  );
  const workflows = new Map();
  for (const name of readdirSync(resolve(root, ".github/workflows")).filter(
    (name) => name.endsWith(".yml"),
  ))
    workflows.set(
      `./.github/workflows/${name}`,
      read(`.github/workflows/${name}`),
    );
  // Maintained callers own the source gate; the reusable producer runs only
  // the remaining phase. Do not replace this dependency with a skip flag.
  for (const [path, workflow] of workflows)
    for (const job of Object.values(workflow.jobs ?? {})) {
      if (job.uses !== "./.github/workflows/qualification.yml") continue;
      const gates = [job.needs].flat().filter((name) => {
        const gate = workflow.jobs[name];
        const checks = gate?.steps?.filter(
          (step) => step.run === "npm run check:source",
        );
        return (
          checks?.length === 1 &&
          !checks[0].if &&
          !checks[0]["continue-on-error"] &&
          !gate["continue-on-error"] &&
          gate.steps
            .slice(0, gate.steps.indexOf(checks[0]))
            .some(
              (step) =>
                !step.if &&
                !step["continue-on-error"] &&
                (step.uses === "./.github/actions/setup-producer" ||
                  step.run ===
                    "node scripts/qualification-process.js producer-npm\nnpm ci --ignore-scripts --no-audit --no-fund\n"),
            )
        );
      });
      assert.ok(
        gates.length === 1 && !job.if && !job["continue-on-error"],
        `${path}: package qualification requires one blocking source gate with locked tools`,
      );
    }
  const productChecks = workflows
    .get("./.github/workflows/qualification.yml")
    .jobs.producer.steps.filter(
      (step) => step.run === "npm run check:qualification",
    );
  assert.ok(
    productChecks.length === 1 &&
      !productChecks[0].if &&
      !productChecks[0]["continue-on-error"],
    "Reusable producer must run the complete remaining qualification phase",
  );
  const security = workflows.get("./.github/workflows/security.yml");
  assert.equal(security.jobs.codeql.needs, "model");
  assert.equal(security.jobs.model.name, "Validate Actions approval model");
  assert.ok(
    security.jobs.model.steps.some(
      (step) =>
        step.run ===
          'node scripts/check-codeql-model.js "$CODEQL" "$MODEL_TEMP"' &&
        !step.if &&
        !step["continue-on-error"],
    ),
  );
  assert.equal(
    security.jobs.codeql.steps.find((step) =>
      step.uses?.includes("codeql-action/init@"),
    )?.with?.["config-file"],
    "${{ matrix.language == 'actions' && './.github/codeql/actions-config.yml' || '' }}",
  );
  const shared = workflows.get("./.github/workflows/markdown-quality.yml");
  assert.equal(shared.jobs.qualify.needs, "request");
  assert.equal(
    shared.jobs.qualify.environment?.name,
    qualificationEnvironment,
    "Shared qualification must require owner approval before checkout execution",
  );
  const sharedSteps = shared.jobs.qualify.steps;
  const approval = sharedSteps.findIndex(
    (step) =>
      step.run ===
      "node producer/scripts/shared-qualification-admission.js verify",
  );
  const trusted = sharedSteps.findIndex(
    (step) => step.with?.path === "trusted",
  );
  assert.ok(
    approval >= 0 && approval < trusted,
    "Live approval protection must be checked before caller-selected checkouts",
  );
  assert.ok(
    shared.jobs.request.steps.some(
      (step) =>
        step.run ===
        "node producer/scripts/shared-qualification-admission.js request",
    ),
  );
  for (const job of Object.values(shared.jobs))
    for (const step of job.steps ?? [])
      if (step.uses?.startsWith("actions/setup-node@"))
        assert.equal(step.with?.["package-manager-cache"], false);
  function inputs(path, supplied, declared = {}) {
    for (const key of Object.keys(supplied ?? {}))
      assert.ok(
        Object.hasOwn(declared, key),
        `${path}: undeclared input ${key}`,
      );
    for (const [key, value] of Object.entries(declared))
      if (value.required && !Object.hasOwn(value, "default"))
        assert.ok(
          supplied?.[key] !== undefined && supplied[key] !== "",
          `${path}: missing required input ${key}`,
        );
  }
  const receipt = workflows
    .get("./.github/workflows/ci.yml")
    ?.jobs.acceptance.steps.find(
      (step) => step.with?.path === "${{ steps.proof.outputs.path }}",
    );
  const producer = workflows
    .get("./.github/workflows/qualification.yml")
    ?.jobs.producer.steps.find((step) => step.id === "archive");
  const horizon = receipt?.with?.["retention-days"];
  assert.ok(
    Number.isSafeInteger(horizon) && horizon > 0,
    "PR proof retention horizon is missing",
  );
  assert.equal(
    String(producer?.with?.["retention-days"]).replace(/\s+/gu, ""),
    "${{(inputs.release-mode||inputs.emit-proof)&&" + horizon + "||1}}",
    "PR producer retention must cover the compact reuse-proof horizon",
  );
  const publication = workflows.get("./.github/workflows/publish.yml");
  const archival = workflows.get("./.github/workflows/github-release.yml");
  const promotion = workflows.get("./.github/workflows/promote-release.yml");
  for (const [workflow, roles] of [
    [publication, ["review"]],
    [archival, ["decisions", "archive"]],
    [promotion, ["github"]],
  ]) {
    assert.equal(workflow.permissions.contents, "read");
    for (const role of roles)
      assert.ok(workflow.jobs[role], `Missing protected GitHub role: ${role}`);
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const writer = roles.includes(name);
      assert.equal(
        job.permissions?.contents ?? workflow.permissions.contents,
        writer ? "write" : "read",
        `${name}: draft visibility belongs to the protected GitHub role`,
      );
      if (writer) {
        assert.equal(job.environment, "github-release");
        assert.equal(
          job.permissions?.["id-token"],
          undefined,
          "Draft reads cannot acquire npm authority",
        );
      }
      const setup = job.steps?.findIndex((step) =>
        step.uses?.startsWith("actions/setup-node@"),
      );
      assert.ok(
        setup >= 0 && !job.steps[setup].if,
        `${name}: release runtime setup is required`,
      );
      assert.ok(
        !job.steps.slice(0, setup).some((step) => step.run),
        `${name}: release commands must follow runtime setup`,
      );
      assert.equal(
        job.steps.filter((step) => step.uses?.startsWith("actions/setup-node@"))
          .length,
        1,
        `${name}: publisher runtime must remain stable`,
      );
    }
  }
  const tagCheck = publication.jobs.admit.steps.find((step) =>
    step.run?.startsWith("node scripts/verify-release-tag.js"),
  );
  assert.ok(
    tagCheck?.run.endsWith("--tag-only"),
    "Read-only tag admission must not read draft decisions",
  );
  assert.equal(publication.jobs.review.needs, "admit");
  assert.ok(
    publication.jobs.review.steps.some(
      (step) =>
        step.run ===
        "node scripts/verify-release-tag.js frozen-release/release-manifest.json provider",
    ),
    "Protected review must verify the live draft",
  );
  assert.ok(
    publication.jobs.stage.needs.includes("review"),
    "Staging requires the protected review",
  );
  assert.ok(
    publication.jobs.stage.if.includes("needs.review.result == 'success'"),
    "Failed draft review must block staging",
  );
  assert.ok(
    publication.jobs.stage.steps.some(
      (step) =>
        step.with?.["artifact-ids"] ===
          "${{ needs.review.outputs.artifact-id }}" &&
        step.with?.["merge-multiple"] === true &&
        step.with.path === "provider" &&
        step.with["digest-mismatch"] === "error",
    ),
    "Staging must retain the exact review snapshot",
  );
  for (const [role, id] of [
    ["admit", "admission"],
    ["review", "review"],
  ]) {
    const job = publication.jobs[role];
    assert.equal(
      job.outputs?.["artifact-id"],
      `\${{ steps.${id}.outputs.artifact-id }}`,
    );
    const upload = job.steps.filter((step) => step.id === id);
    assert.equal(upload.length, 1, "Missing publication artifact producer");
    assert.equal(
      upload[0].with?.name,
      `publication-${id === "admission" ? "admission" : "review"}-\${{ github.run_attempt }}`,
    );
  }
  for (const role of ["review", "retained", "stage"]) {
    const transfers = publication.jobs[role].steps.filter((step) =>
      step.uses?.startsWith("actions/download-artifact@"),
    );
    assert.ok(
      transfers.some(
        (step) =>
          step.with?.["artifact-ids"] ===
            "${{ needs.admit.outputs.artifact-id }}" &&
          step.with?.["merge-multiple"] === true,
      ),
      "Publication must consume the original admission artifact ID",
    );
    assert.ok(
      transfers.every((step) => !step.with?.name),
      "Publication downloads must retain original producer IDs",
    );
  }
  const stageSteps = publication.jobs.stage.steps;
  const guards = stageSteps.filter((step) => step.id === "staging_history");
  assert.equal(guards.length, 1, "Missing publication attempt admission");
  const guard = guards[0];
  assert.equal(
    guard.run,
    "node scripts/publication-history.js --admit-attempt frozen-release",
  );
  assert.equal(
    guard.if,
    undefined,
    "Publication history admission must be unconditional",
  );
  assert.equal(
    guard["continue-on-error"],
    undefined,
    "Publication history cannot soft-fail",
  );
  assert.equal(guard["working-directory"], undefined);
  assert.deepEqual(guard.env, { GH_TOKEN: "${{ github.token }}" });
  for (const [name, key] of [
    ["Stage Windows package under pilot", "WIN32_X64"],
    ["Stage Linux package under pilot", "LINUX_X64"],
    ["Stage coherent core under pilot", "CORE"],
  ]) {
    const writes = stageSteps.filter((step) => step.name === name);
    assert.equal(writes.length, 1);
    assert.ok(
      stageSteps.indexOf(guard) < stageSteps.indexOf(writes[0]),
      "History admission must precede every staging write",
    );
    assert.equal(
      writes[0].if,
      `steps.staging_history.outputs.admitted == 'true' && env.STAGE_${key} == 'true'`,
    );
  }
  const retained = publication.jobs.retained.steps;
  assert.equal(
    retained.at(-1).with?.name,
    "retained-registry-${{ matrix.os }}-${{ github.run_attempt }}",
  );
  assert.ok(
    retained.some(
      (step) =>
        step.run === guard.run && !step.if && !step["continue-on-error"],
    ),
    "Retained qualification must authenticate the current controller attempt",
  );
  assert.equal(
    stageSteps.at(-1).with?.name,
    "publication-source-and-manifest-${{ github.run_attempt }}",
  );
  assert.equal(archival.jobs.prepare.needs, "decisions");
  assert.ok(
    archival.jobs.decisions.steps.some(
      (step) =>
        step.run === "node scripts/read-release-decisions.js release-decisions",
    ),
    "Protected decisions must read the live draft",
  );
  assert.ok(
    archival.jobs.prepare.steps.some(
      (step) =>
        step.with?.["artifact-ids"] ===
          "${{ needs.decisions.outputs.artifact-id }}" &&
        step.with.path === "release-decisions" &&
        step.with["digest-mismatch"] === "error",
    ),
    "Read-only assembly requires the decision snapshot",
  );
  for (const [producer, consumer, stepId] of [
    ["decisions", "prepare", "decisions"],
    ["prepare", "archive", "inputs"],
  ]) {
    assert.equal(
      archival.jobs[producer].outputs?.["artifact-id"],
      `\${{ steps.${stepId}.outputs.artifact-id }}`,
      "Archive transfer must retain its producing artifact ID",
    );
    assert.ok(
      archival.jobs[producer].steps.some(
        (step) =>
          step.id === stepId &&
          step.uses?.startsWith("actions/upload-artifact@"),
      ),
    );
    assert.ok(
      archival.jobs[consumer].steps.some(
        (step) =>
          step.with?.["artifact-ids"] ===
            `\${{ needs.${producer}.outputs.artifact-id }}` &&
          !step.with.name &&
          step.with["digest-mismatch"] === "error",
      ),
      "Archive readback must use the producer ID, not the consuming attempt",
    );
  }
  assert.equal(archival.jobs.archive.permissions.attestations, "read");
  assert.equal(
    archival.jobs.prepare.steps.find(
      (step) =>
        step.run === "node scripts/collect-release-evidence.js archive-inputs",
    )?.env.RELEASE_DECISIONS_DIRECTORY,
    "release-decisions",
  );
  for (const [job, directory] of [
    [publication.jobs.review, "provider/release-review.json"],
    [archival.jobs.decisions, "release-decisions/"],
  ]) {
    assert.ok(
      job.steps.some(
        (step) =>
          step.if === "always()" &&
          step.with?.path === directory &&
          step.with["if-no-files-found"] === "error",
      ),
      "Draft failure evidence must remain visible",
    );
  }
  let callers = 0;
  for (const [path, workflow] of workflows) {
    for (const job of Object.values(workflow.jobs ?? {})) {
      pinned(path, job.uses);
      if (job.uses?.startsWith("./.github/workflows/")) {
        const called = workflows.get(job.uses);
        assert.ok(
          called?.on?.workflow_call !== undefined,
          `${path}: unknown reusable workflow ${job.uses}`,
        );
        inputs(path, job.with, called.on.workflow_call?.inputs);
      }
      for (const step of job.steps ?? []) {
        if (step["timeout-minutes"])
          assert.ok(
            job["timeout-minutes"] > step["timeout-minutes"],
            `${path}: job deadline must exceed its inner step`,
          );
        pinned(path, step.uses);
        assert.ok(
          !/scripts\/(?:upload-evidence\.js|ci-command\.js upload)/u.test(
            step.run ?? "",
          ),
          `${path}: shell SDK upload lacks action credentials`,
        );
        const local =
          path === "./.github/workflows/markdown-quality.yml"
            ? step.uses?.replace(/^\.\/producer\//u, "./")
            : step.uses;
        if (!local?.startsWith("./.github/actions/")) continue;
        const action = actions.get(local);
        assert.ok(action, `${path}: unresolved local action ${step.uses}`);
        inputs(path, step.with, action.inputs);
        if (transferBudgets.has(local)) {
          callers++;
          assert.equal(
            step["timeout-minutes"] * 60000,
            transferBudgets.get(local),
            `${path}: transfer deadline drift`,
          );
        }
      }
    }
  }
  assert.ok(callers > 0);
  return {
    workflows: workflows.size,
    localActions: actions.size,
    transferCallers: callers,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkWorkflows()));
