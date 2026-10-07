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

const source = fileURLToPath(new URL("../", import.meta.url));
const git = execFileSync(
  process.platform === "win32" ? "where.exe" : "which",
  ["git"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/u)[0];
const python = execFileSync(
  "python",
  ["-c", "import sys;print(sys.executable)"],
  { encoding: "utf8" },
).trim();
const pythonVersion = execFileSync(python, ["--version"], { encoding: "utf8" })
  .trim()
  .replace("Python ", "");
function freeze(root) {
  const run = (...args) =>
    execFileSync(git, ["-c", "core.autocrlf=false", "-C", root, ...args], {
      windowsHide: true,
    });
  run("init", "-q");
  run("add", "--all");
  run(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "Frozen package qualification fixture",
  );
  return run("rev-parse", "HEAD").toString().trim();
}

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
  const sourceSha = freeze(frozen);
  const { packRelease } = await import(
    pathToFileURL(join(frozen, "scripts/pack.js"))
  );
  const archives = join(scratch, "archives");
  const tuple = packRelease(archives);
  assert.equal(tuple.source.clean, true);
  assert.equal(tuple.source.head, sourceSha);
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
      schemaVersion: 1,
      samples: 6,
      checkerMs: 30000,
      windowMs: 60000,
      memoryBytes: 536870912,
      nodeOldSpaceMb: 256,
      reportBytes: 8388608,
      requestBytes: 8388608,
      stagingBytes: 134217728,
      stagingEntries: 100000,
      limits: {},
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
  const trustedSha = freeze(trustedRoot);
  const sourceRoot = consumer(t, {
    "README.md": "Alpha.\n",
    "never-run.mjs": "throw new Error('Candidate code executed');",
  });
  const candidateSha = freeze(sourceRoot);
  const require = createRequire(join(trustedRoot, "package.json"));
  const { qualifyCandidate } = await import(
    pathToFileURL(require.resolve("@hadden-industries/markdown-quality"))
  );
  const native = tuple.archives.find(
    (item) => item.name === `${process.platform}-${process.arch}`,
  );
  const request = {
    sourceRoot,
    trustedRoot,
    candidateSha,
    trustedSha,
    git,
    python,
    outputRoot: join(scratch, "evidence"),
    producer: {
      sourceSha,
      coreArchiveSha256: core.sha256,
      nativeArchiveSha256: native.sha256,
    },
  };
  const result = await qualifyCandidate(request);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.samples.length, 6);
  const receipt = JSON.parse(
    readFileSync(
      join(request.outputRoot, result.samples[0].receiptPath),
      "utf8",
    ),
  );
  assert.equal(receipt.producer.source.head, sourceSha);
  assert.equal(receipt.producer.coreArchiveSha256, core.sha256);
  assert.deepEqual(receipt.result.written, []);
  assert.equal(readFileSync(join(sourceRoot, "README.md"), "utf8"), "Alpha.\n");
  await assert.rejects(
    qualifyCandidate({
      ...request,
      outputRoot: join(scratch, "rejected"),
      producer: { ...request.producer, coreArchiveSha256: "0".repeat(64) },
    }),
    { code: "PRODUCER_IDENTITY" },
  );
  writeFileSync(join(sourceRoot, "uncommitted.md"), "Added.\n");
  execFileSync(git, ["-C", sourceRoot, "add", "uncommitted.md"]);
  await assert.rejects(
    qualifyCandidate({
      ...request,
      outputRoot: join(scratch, "index-injection"),
    }),
    { code: "CHECKOUT_CHANGED" },
  );
});
