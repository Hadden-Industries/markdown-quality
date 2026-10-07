// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import {
  readdirSync,
  lstatSync,
  realpathSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  readSync,
  writeSync,
  closeSync,
  fstatSync,
} from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { contained, safePath, loadConfiguration } from "./configuration.js";
import { readExecutionProfile } from "./execution-profile.js";
import { digest, fail } from "./contracts.js";

const reserved = ".markdown-quality-trusted-inputs";
const operational = new Set([".git", "node_modules", ".venv", "venv", ".hi"]);
const slash = (name) => name.replaceAll("\\", "/");
const fingerprint = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");

function tree(root, profile, strip = false) {
  const records = [];
  let bytes = 0,
    entries = 0;
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      if (++entries > profile.stagingEntries)
        fail("STAGING_LIMIT", "Candidate exceeds the staged entry bound.");
      const path = join(directory, name),
        stat = lstatSync(path),
        logical = slash(relative(root, path));
      if (strip && logical === reserved)
        fail(
          "RESERVED_PATH",
          "Candidate collides with reserved trusted inputs.",
        );
      if (
        strip &&
        operational.has(name) &&
        stat.isDirectory() &&
        !stat.isSymbolicLink()
      )
        continue;
      if (stat.isSymbolicLink() || !contained(root, realpathSync(path)))
        fail("UNSAFE_STAGING", "Candidate contains linked or escaping data.");
      if (stat.isDirectory()) {
        records.push({ path: logical, type: "directory" });
        visit(path);
      } else {
        if (!stat.isFile() || stat.nlink !== 1)
          fail(
            "UNSAFE_STAGING",
            "Candidate requires regular singly linked data files.",
          );
        bytes += stat.size;
        if (bytes > profile.stagingBytes)
          fail("STAGING_LIMIT", "Candidate exceeds the staged byte bound.");
        records.push({
          path: logical,
          type: "file",
          size: stat.size,
          fingerprint: fingerprint(stat),
        });
      }
    }
  }
  visit(root);
  return { records, bytes, entries };
}

/** Metadata admission shared by exact checkout verification and staging. */
export function inspectCandidateData(root, profile) {
  return tree(root, profile, true);
}

/** Stream a bounded exact staged-data identity; includes non-Markdown link targets. */
export function stagedDataDigest(root, profile) {
  const inventory = tree(root, profile);
  const hash = createHash("sha256"),
    chunk = Buffer.alloc(65536);
  for (const record of inventory.records) {
    hash.update(
      JSON.stringify([record.type, record.path, record.size ?? null]) + "\n",
    );
    if (record.type !== "file") continue;
    const path = safePath(root, record.path, { file: true }),
      fd = openSync(path, "r");
    try {
      if (fingerprint(fstatSync(fd)) !== record.fingerprint)
        fail("STAGED_DATA_CHANGED", "Data changed during identity capture.");
      let offset = 0,
        size;
      while ((size = readSync(fd, chunk, 0, chunk.length, offset)) > 0) {
        hash.update(chunk.subarray(0, size));
        offset += size;
        if (offset > record.size)
          fail("STAGED_DATA_CHANGED", "Data grew during identity capture.");
      }
      if (
        offset !== record.size ||
        fingerprint(fstatSync(fd)) !== record.fingerprint
      )
        fail("STAGED_DATA_CHANGED", "Data changed during identity capture.");
    } finally {
      closeSync(fd);
    }
  }
  return hash.digest("hex");
}

/** Stage candidate data under an independently read finite trusted profile/policy.
 * Preflight rejects overlap and unsafe/oversized inputs before creating output.
 * Candidate scripts, dependency graphs and candidate policy are never executed.
 */
export function stageCandidate({
  sourceRoot,
  trustedRoot,
  outputRoot,
  profile: profilePath,
  config = ".markdown-quality.json",
}) {
  sourceRoot = resolve(sourceRoot);
  trustedRoot = resolve(trustedRoot);
  outputRoot = resolve(outputRoot);
  for (const root of [sourceRoot, trustedRoot])
    if (
      realpathSync(root) !== root ||
      !lstatSync(root).isDirectory() ||
      lstatSync(root).isSymbolicLink()
    )
      fail(
        "UNSAFE_STAGING",
        "Inputs require real directories without linked parents.",
      );
  if (
    contained(sourceRoot, trustedRoot) ||
    contained(trustedRoot, sourceRoot) ||
    contained(sourceRoot, outputRoot) ||
    contained(outputRoot, sourceRoot) ||
    contained(trustedRoot, outputRoot) ||
    contained(outputRoot, trustedRoot) ||
    existsSync(outputRoot)
  )
    fail(
      "UNSAFE_STAGING",
      "Candidate, trusted and fresh staging roots must be disjoint.",
    );
  const parent = dirname(outputRoot);
  if (realpathSync(parent) !== parent || lstatSync(parent).isSymbolicLink())
    fail("UNSAFE_STAGING", "Staging parent must have no linked parents.");
  const profile = readExecutionProfile({
    root: trustedRoot,
    profile: profilePath,
  });
  const policyPath = safePath(trustedRoot, config, { file: true });
  if (lstatSync(policyPath).size > profile.limits.configBytes)
    fail("CONFIG_LIMIT", "Trusted policy exceeds its admission bound.");
  const policy = readFileSync(policyPath);
  loadConfiguration({ root: trustedRoot, config, limits: profile.limits });
  const inventory = tree(sourceRoot, profile, true);
  if (
    inventory.bytes + policy.length > profile.stagingBytes ||
    inventory.entries + 2 > profile.stagingEntries
  )
    fail(
      "STAGING_LIMIT",
      "Trusted overlay exceeds the staged admission bound.",
    );
  mkdirSync(outputRoot);
  const chunk = Buffer.alloc(65536);
  for (const record of inventory.records) {
    const destination = join(outputRoot, record.path);
    if (record.type === "directory") {
      mkdirSync(destination);
      continue;
    }
    const source = safePath(sourceRoot, record.path, { file: true }),
      input = openSync(source, "r"),
      output = openSync(destination, "wx");
    try {
      if (fingerprint(fstatSync(input)) !== record.fingerprint)
        fail("CANDIDATE_CHANGED", "Candidate changed after staging admission.");
      let offset = 0,
        size;
      while ((size = readSync(input, chunk, 0, chunk.length, offset)) > 0) {
        offset += size;
        if (offset > record.size)
          fail("CANDIDATE_CHANGED", "Candidate grew during staging.");
        let written = 0;
        while (written < size)
          written += writeSync(output, chunk, written, size - written);
      }
      if (
        offset !== record.size ||
        fingerprint(fstatSync(input)) !== record.fingerprint
      )
        fail("CANDIDATE_CHANGED", "Candidate changed during staging.");
    } finally {
      closeSync(input);
      closeSync(output);
    }
  }
  mkdirSync(join(outputRoot, reserved));
  const configPath = reserved + "/policy.json";
  writeFileSync(join(outputRoot, configPath), policy, { flag: "wx" });
  return {
    configPath,
    profile,
    policySha256: digest(policy),
    entries: inventory.entries,
    dataBytes: inventory.bytes,
    stagedDataSha256: stagedDataDigest(outputRoot, profile),
  };
}
