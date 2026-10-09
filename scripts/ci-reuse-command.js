// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommand } from "./commands.js";
import {
  createReceipt,
  matrixLanes,
  repository,
  requireResults,
  selectProof,
  validateLanes,
  verifyProof,
  workflow,
} from "./ci-reuse.js";

const jsonLimit = 2_097_152;
function json(path) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= jsonLimit,
    "Expected bounded regular JSON",
  );
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= jsonLimit);
  return JSON.parse(bytes.toString("utf8"));
}

/** Read raw commit headers: shallow pretty-printing can conceal the actual parents. */
export function gitSnapshot(directory = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      maxBuffer: jsonLimit,
      windowsHide: true,
    }).trim();
  const headers = git("cat-file", "commit", "HEAD")
    .split("\n\n")[0]
    .split("\n");
  return {
    commit: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    parents: headers
      .filter((line) => line.startsWith("parent "))
      .map((line) => line.slice(7)),
    workflow: git("rev-parse", `HEAD:${workflow}`),
  };
}

/** GitHub responses are data, bounded and restricted to this repository's read API. */
export function repositoryReader(token, request = fetch) {
  assert.ok(token, "Read-only GitHub token unavailable");
  let calls = 0;
  return async (path) => {
    assert.ok(
      ++calls <= 30 &&
        /^\/[a-zA-Z0-9/?=&._-]+$/u.test(path) &&
        !path.includes("..") &&
        !path.includes("//"),
    );
    const response = await request(
      `https://api.github.com/repos/${repository}${path}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    assert.equal(response.status, 200, "GitHub proof metadata unavailable");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      assert.ok(size <= jsonLimit, "GitHub proof metadata exceeds bound");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  };
}

function context() {
  return {
    repository: process.env.GITHUB_REPOSITORY,
    repositoryId: Number(process.env.GITHUB_REPOSITORY_ID),
    runId: Number(process.env.GITHUB_RUN_ID),
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    sha: process.env.GITHUB_SHA,
    eventName: process.env.GITHUB_EVENT_NAME,
    event: json(process.env.GITHUB_EVENT_PATH),
    snapshot: gitSnapshot(),
  };
}
const write = (path, value) =>
  writeFileSync(path, JSON.stringify(value) + "\n");
function output(values, summary) {
  for (const [key, value] of Object.entries(values)) {
    assert.match(String(value), /^[^\r\n]*$/u);
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  if (summary) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
}

// Provider/event diagnostics are bounded plain text before entering runner output or Markdown.
function plainReason(value) {
  return (
    String(value ?? "")
      .split("\n")[0]
      .replace(/[^a-zA-Z0-9 .,():_-]/gu, "")
      .slice(0, 180) || "Evidence eligibility or integrity check failed"
  );
}

/** Closed artifact directory inventory, including filenames and no symbolic links. */
export function readLaneArtifacts(root, matrix, prefix, runAttempt) {
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink());
  const expected = matrixLanes(matrix).map(
    (lane) => `${prefix}-${lane.os}-${lane.node}-attempt-${runAttempt}`,
  );
  assert.deepEqual(readdirSync(root).sort(), expected.sort());
  return expected.map((name) => {
    const directory = join(root, name);
    const stat = lstatSync(directory);
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
    assert.deepEqual(readdirSync(directory), ["lane.json"]);
    return json(join(directory, "lane.json"));
  });
}

/** Support the official downloader's single-ID layout, refusing extra or linked files. */
export function readProofArtifact(root, name) {
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink());
  const files = readdirSync(root);
  if (files.length === 1 && files[0] === "receipt.json")
    return json(join(root, "receipt.json"));
  assert.deepEqual(files, [name]);
  const directory = join(root, name);
  assert.ok(
    lstatSync(directory).isDirectory() &&
      !lstatSync(directory).isSymbolicLink(),
  );
  assert.deepEqual(readdirSync(directory), ["receipt.json"]);
  return json(join(directory, "receipt.json"));
}

function scratchDirectory() {
  const root = resolve(process.env.RUNNER_TEMP, "package-ci-reuse");
  mkdirSync(root, { recursive: true });
  return root;
}

async function main(command) {
  if (command === "lane") {
    const root = scratchDirectory();
    const current = context();
    const lane = { os: process.env.LANE_OS, node: process.env.LANE_NODE };
    const record = {
      schemaVersion: 1,
      repository: current.repository,
      repositoryId: current.repositoryId,
      runId: current.runId,
      runAttempt: current.runAttempt,
      snapshot: current.snapshot,
      lane,
      host: {
        os: process.env.RUNNER_OS,
        arch: process.env.RUNNER_ARCH,
        image: process.env.ImageOS,
        imageVersion: process.env.ImageVersion,
        node: process.version,
        npm: npmCommand(["--version"]).trim(),
        python: execFileSync("python", ["--version"], {
          encoding: "utf8",
          windowsHide: true,
        }).trim(),
      },
    };
    write(join(root, "lane.json"), record);
    return;
  }
  if (command === "select") {
    try {
      const root = scratchDirectory();
      const current = context();
      const selection = await selectProof({
        context: current,
        read: repositoryReader(process.env.GH_TOKEN),
      });
      write(join(root, "selection.json"), selection);
      output({
        available: "true",
        run_id: selection.run.id,
        artifact_id: selection.artifact.id,
      });
    } catch (error) {
      const reason = plainReason(
        error instanceof Error ? error.message : undefined,
      );
      output(
        { available: "false", reason },
        `FULL package qualification: ${reason}.`,
      );
    }
    return;
  }
  if (command === "verify") {
    try {
      const root = scratchDirectory();
      const current = context();
      const matrix = JSON.parse(process.env.QUALIFICATION_MATRIX);
      assert.equal(
        process.env.PROOF_DOWNLOAD_OUTCOME,
        "success",
        "Proof download did not succeed",
      );
      const selection = json(join(root, "selection.json"));
      const receipt = readProofArtifact(
        join(root, "proof"),
        selection.artifact.name,
      );
      const hosts = readLaneArtifacts(
        join(root, "hosts"),
        matrix,
        "probe",
        current.runAttempt,
      );
      const result = await verifyProof({
        context: current,
        matrix,
        hosts,
        selection,
        receipt,
        read: repositoryReader(process.env.GH_TOKEN),
      });
      // Transport the already authenticated bytes for the final aggregate's independent readback.
      write(join(root, "decision.json"), {
        context: current,
        matrix,
        hosts,
        selection,
        receipt,
        result,
      });
      output(
        { reuse: "true" },
        `REUSED package qualification from [run ${result.sourceRun}, attempt ${result.sourceAttempt}](https://github.com/${repository}/actions/runs/${result.sourceRun}/attempts/${result.sourceAttempt}). Tests will not be represented as freshly executed.`,
      );
    } catch (error) {
      const reason = plainReason(
        error instanceof Error ? error.message : undefined,
      );
      output(
        { reuse: "false", reason },
        `FULL package qualification: ${reason}.`,
      );
    }
    return;
  }
  assert.equal(command, "required");
  const needs = JSON.parse(process.env.NEEDS_JSON);
  const reused = process.env.REUSE === "true";
  requireResults(needs, reused);
  if (reused) {
    const root = scratchDirectory();
    const current = context();
    const matrix = JSON.parse(process.env.QUALIFICATION_MATRIX);
    assert.equal(process.env.DECISION_DOWNLOAD_OUTCOME, "success");
    const decision = json(join(root, "decision", "decision.json"));
    assert.deepEqual(decision.context, current);
    assert.deepEqual(decision.matrix, matrix);
    const result = await verifyProof({
      ...decision,
      context: current,
      matrix,
      read: repositoryReader(process.env.GH_TOKEN),
    });
    output(
      { mode: "REUSED" },
      `REUSED: complete successful package tests from [run ${result.sourceRun}, attempt ${result.sourceAttempt}](https://github.com/${repository}/actions/runs/${result.sourceRun}/attempts/${result.sourceAttempt}); receipt artifact ${result.artifactId}, ${result.artifactDigest}. No package tests ran freshly on main.`,
    );
    return;
  }
  const reason = plainReason(
    process.env.FALLBACK_REASON ||
      `Evidence strategy unavailable or not reusable (probe: ${needs.probe.result}, strategy: ${needs.strategy.result})`,
  );
  // Test success is authoritative; optional provenance can only enable later reuse.
  try {
    const root = scratchDirectory();
    const current = context();
    const matrix = JSON.parse(process.env.QUALIFICATION_MATRIX);
    const lanes = validateLanes(
      readLaneArtifacts(
        join(root, "executed"),
        matrix,
        "executed",
        current.runAttempt,
      ),
      current,
      matrix,
    );
    if (
      current.eventName === "pull_request" &&
      current.event.pull_request.base.ref === "main"
    ) {
      write(
        join(root, "receipt.json"),
        createReceipt({ context: current, matrix, lanes, needs }),
      );
      output(
        { recorded: "true", mode: "FULL" },
        `FULL: every package lane executed successfully on this PR integration. Reason: ${reason}.`,
      );
      return;
    }
  } catch {
    output(
      { recorded: "false", mode: "FULL" },
      `FULL: every package lane executed successfully. Reason: ${reason}. Optional proof metadata was unavailable; no reusable receipt was recorded.`,
    );
    return;
  }
  output(
    { recorded: "false", mode: "FULL" },
    `FULL: every package lane executed successfully on this checkout. Reason: ${reason}.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main(process.argv[2]);
