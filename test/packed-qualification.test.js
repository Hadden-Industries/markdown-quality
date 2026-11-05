// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { consumer } from "./helpers.js";
import { npmCommand } from "../scripts/commands.js";
import { repositoryPython } from "../scripts/python-target.js";

const source = fileURLToPath(new URL("../", import.meta.url));
import {
  git,
  python,
  pythonVersion,
  freezeFixture,
} from "./qualification-host.js";
const freeze = (root) =>
  freezeFixture(root, "Frozen package qualification fixture");

test("clean frozen source archives qualify through the installed public boundary without release publication", async (t) => {
  const scratch = consumer(t);
  const frozen = join(scratch, "producer");
  mkdirSync(frozen);
  const tracked = execFileSync(git, [
    "-C",
    source,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  for (const file of new Set(tracked)) {
    mkdirSync(dirname(join(frozen, file)), { recursive: true });
    cpSync(join(source, file), join(frozen, file));
  }
  cpSync(join(source, "packages"), join(frozen, "packages"), {
    recursive: true,
  });
  // Dependencies are existing trusted inputs; only the temporary source snapshot
  // is committed. This never changes or commits the author's checkout.
  symlinkSync(
    join(source, "node_modules"),
    join(frozen, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  // Packing validates native inputs with the same approved producer interpreter.
  symlinkSync(
    dirname(dirname(repositoryPython(source))),
    join(frozen, ".venv"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const sourceCommitId = freeze(frozen);
  const { packRelease } = await import(
    pathToFileURL(join(frozen, "scripts/pack.js"))
  );
  const archives = join(scratch, "archives");
  const tuple = packRelease(archives);
  assert.equal(tuple.source.clean, true);
  assert.equal(tuple.source.head, sourceCommitId);
  const trustedRoot = consumer(t, {
    ".gitignore": "node_modules/\n",
    ".node-version": process.versions.node,
    ".python-version": pythonVersion,
  });
  cpSync(archives, join(trustedRoot, "archives"), { recursive: true });
  const core = tuple.archives.find((item) => item.name === "core");
  writeFileSync(
    join(trustedRoot, "package.json"),
    JSON.stringify({
      name: "trusted-fixture",
      version: "1.0.0",
      private: true,
      dependencies: { [core.package]: "file:archives/" + core.filename },
      optionalDependencies: Object.fromEntries(
        tuple.archives
          .filter((item) => item.name !== "core")
          .map((item) => [item.package, "file:archives/" + item.filename]),
      ),
    }),
  );
  npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: trustedRoot,
  });
  const nativeArchives = Object.fromEntries(
    tuple.archives
      .filter((item) => item.name !== "core")
      .map((item) => [item.name, "archives/" + item.filename]),
  );
  writeFileSync(
    join(trustedRoot, ".markdown-quality-execution.json"),
    JSON.stringify({
      schemaVersion: 2,
      requiredConsecutiveSamples: 6,
      executionTimeoutMs: 30000,
      sampleTimeoutMs: 60000,
      maxObservedMemoryBytes: 536870912,
      maxNodeOldGenerationMiB: 256,
      maxOutputBytes: 8388608,
      maxRequestBytes: 8388608,
      maxStagedDataBytes: 134217728,
      maxStagedEntries: 100000,
      analyzerLimits: {},
      runtimes: {
        node: { file: ".node-version" },
        python: { file: ".python-version" },
      },
      toolchain: {
        lockFile: "package-lock.json",
        coreArchive: "archives/" + core.filename,
        nativeArchives,
      },
    }),
  );
  const trustedCommitId = freeze(trustedRoot);
  const candidateRoot = consumer(t, {
    "README.md": "Alpha.\n",
    "never-run.mjs": "throw new Error('Candidate code executed');",
  });
  const candidateCommitId = freeze(candidateRoot);
  const require = createRequire(join(trustedRoot, "package.json"));
  const { qualifyGitMarkdown } = await import(
    pathToFileURL(require.resolve("@hadden-industries/markdown-quality"))
  );
  const native = tuple.archives.find(
    (item) => item.name === `${process.platform}-${process.arch}`,
  );
  const request = {
    candidateRoot,
    trustedRoot,
    candidateCommitId,
    trustedCommitId,
    gitExecutablePath: git,
    pythonExecutablePath: python,
    outputRoot: join(scratch, "evidence"),
    producer: {
      sourceCommitId,
      coreArchiveSha256: core.sha256,
      nativeArchiveSha256: native.sha256,
    },
  };
  const result = await qualifyGitMarkdown(request);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.samples.length, 6);
  const receipt = JSON.parse(
    readFileSync(
      join(request.outputRoot, result.samples[0].receiptPath),
      "utf8",
    ),
  );
  assert.equal(receipt.producer.source.head, sourceCommitId);
  assert.equal(receipt.producer.coreArchiveSha256, core.sha256);
  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.candidate.commitId, candidateCommitId);
  assert.equal(receipt.trusted.commitId, trustedCommitId);
  assert.deepEqual(receipt.result.writtenPaths, []);
  assert.equal(receipt.result.operationStatus, "completed");
  assert.equal(receipt.result.qualityBasis, "input");
  assert.equal(
    readFileSync(join(candidateRoot, "README.md"), "utf8"),
    "Alpha.\n",
  );
  await assert.rejects(
    qualifyGitMarkdown({
      ...request,
      outputRoot: join(scratch, "rejected"),
      producer: { ...request.producer, coreArchiveSha256: "0".repeat(64) },
    }),
    { code: "PRODUCER_IDENTITY" },
  );
  writeFileSync(join(candidateRoot, "uncommitted.md"), "Added.\n");
  execFileSync(git, ["-C", candidateRoot, "add", "uncommitted.md"]);
  await assert.rejects(
    qualifyGitMarkdown({
      ...request,
      outputRoot: join(scratch, "index-injection"),
    }),
    { code: "CHECKOUT_CHANGED" },
  );
});
