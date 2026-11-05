// SPDX-License-Identifier: AGPL-3.0-only
import {
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  closeSync,
  fstatSync,
  readSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { safePath } from "./consumer-root.js";
import { digest, exceeds, fail } from "./contracts.js";
import { defaultExecutionLimits } from "./resource-controls.js";
import { stagedDataManifest } from "./candidate-staging.js";

import { fingerprint } from "./stat-fingerprint.js";
import { openRegularFile, statRegularFile } from "./regular-file.js";
function readEvidence(root, path, bound, allowTruncation = false) {
  const full = safePath(root, path, { file: true });
  const pathStat = lstatSync(full);
  if (
    pathStat.nlink !== 1 ||
    (!allowTruncation && exceeds(pathStat.size, bound))
  )
    fail("EVIDENCE_LIMIT", "Evidence requires bounded singly linked files.");
  let opened;
  try {
    opened = openRegularFile(full);
  } catch {
    fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
  }
  const { descriptor: fd, stat: before } = opened;
  try {
    if (!allowTruncation && exceeds(before.size, bound))
      fail("EVIDENCE_LIMIT", "Evidence requires bounded singly linked files.");
    if (fingerprint(before) !== fingerprint(fstatSync(fd)))
      fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
    const bytes = Buffer.alloc(
      bound === null ? before.size : Math.min(before.size, bound),
    );
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!count)
        fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
      offset += count;
    }
    let current;
    try {
      current = statRegularFile(full);
    } catch {
      fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
    }
    if (
      fingerprint(before) !== fingerprint(fstatSync(fd)) ||
      fingerprint(before) !== fingerprint(current)
    )
      fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
    return {
      bytes,
      originalSize: before.size,
      truncated: exceeds(before.size, bound),
    };
  } finally {
    closeSync(fd);
  }
}
const boundedRead = (root, path, bound) =>
  readEvidence(root, path, bound).bytes;

const tighter = (left, right) =>
  left === null ? right : right === null ? left : Math.min(left, right);

/** Project quiescent qualification output for upload without modifying originals.
 * Manifests establish identity, not retained bytes or independent authenticity.
 * Reproduction requires the immutable candidate/trusted Git objects and archives.
 * Failed/incomplete observations retain diagnostics without becoming passes.
 * The trusted caller supplies input ceilings before any artifact is read; artifact
 * contents cannot authorize their own admission. Null disables a package ceiling.
 */
export function packageQualificationEvidence({
  evidenceRoot: sourceRoot,
  outputRoot,
  maxEvidenceInputBytes = defaultExecutionLimits.maxEvidenceInputBytes,
  maxUnboundEvidenceSamples = defaultExecutionLimits.maxUnboundEvidenceSamples,
}) {
  for (const value of [maxEvidenceInputBytes, maxUnboundEvidenceSamples])
    if (value !== null && (!Number.isSafeInteger(value) || value < 1))
      fail(
        "EVIDENCE_LIMIT",
        "Evidence ceilings must be positive safe integers or null.",
      );
  sourceRoot = resolve(sourceRoot);
  outputRoot = resolve(outputRoot);
  if (
    realpathSync(sourceRoot) !== sourceRoot ||
    !lstatSync(sourceRoot).isDirectory() ||
    contained(sourceRoot, outputRoot) ||
    contained(outputRoot, sourceRoot) ||
    existsSync(outputRoot) ||
    realpathSync(dirname(outputRoot)) !== dirname(outputRoot)
  )
    fail(
      "UNSAFE_EVIDENCE",
      "Evidence roots require disjoint real directories and fresh output.",
    );
  const originalReports = new Map();
  const readJson = (path) => {
    const bytes = boundedRead(sourceRoot, path, maxEvidenceInputBytes);
    originalReports.set(path, bytes);
    return JSON.parse(bytes);
  };
  const request = existsSync(join(sourceRoot, "request.json"))
    ? readJson("request.json")
    : null;
  const window = existsSync(join(sourceRoot, "window.json"))
    ? readJson("window.json")
    : null;
  const profile = request?.profile;
  const passed = window?.passed === true;
  if (profile) {
    if (
      !Number.isSafeInteger(profile.requiredConsecutiveSamples) ||
      profile.requiredConsecutiveSamples <= 0
    )
      fail(
        "EVIDENCE_LIMIT",
        "Evidence profiles require a finite positive sample count.",
      );
    for (const key of [
      "maxOutputBytes",
      "maxRequestBytes",
      "maxStagedDataBytes",
      "maxStagedEntries",
      "maxQualificationSamples",
    ])
      if (
        profile[key] !== null &&
        (!Number.isSafeInteger(profile[key]) || profile[key] <= 0)
      )
        fail(
          "EVIDENCE_LIMIT",
          "Evidence profile ceilings must be positive integers or null.",
        );
    if (
      exceeds(
        profile.requiredConsecutiveSamples,
        profile.maxQualificationSamples,
      )
    )
      fail("EVIDENCE_LIMIT", "Evidence exceeds packaging admission bounds.");
  }
  if (
    passed &&
    (!profile ||
      !isDeepStrictEqual(window.enforcedProfile, profile) ||
      !Array.isArray(window.samples) ||
      window.samples.length !== profile.requiredConsecutiveSamples)
  )
    fail(
      "EVIDENCE_CHANGED",
      "Successful window requires every declared sample and the exact profile.",
    );
  const bound = profile
    ? tighter(profile.maxOutputBytes, maxEvidenceInputBytes)
    : maxEvidenceInputBytes;
  const sampleCeiling = profile
    ? profile.requiredConsecutiveSamples
    : maxUnboundEvidenceSamples;
  const samples = window?.samples ?? [];
  if (!Array.isArray(samples) || exceeds(samples.length, sampleCeiling))
    fail("EVIDENCE_LIMIT", "Invalid evidence sample count.");
  const recorded = new Map();
  const receiptProblems = [];
  for (const [offset, sample] of samples.entries()) {
    if (
      sample.index !== offset + 1 ||
      sample.receiptPath !== `sample-${sample.index}/receipt.json` ||
      !/^[a-f0-9]{64}$/u.test(sample.receiptSha256 ?? "")
    )
      fail("EVIDENCE_CHANGED", "Invalid sample receipt reference.");
    try {
      const bytes = boundedRead(sourceRoot, sample.receiptPath, bound);
      if (digest(bytes) !== sample.receiptSha256)
        fail("EVIDENCE_CHANGED", "Sample receipt digest changed.");
      const receipt = JSON.parse(bytes);
      if (
        receipt.schemaVersion !== 2 ||
        !/^[a-f0-9]{40}$/u.test(request?.candidateCommitId ?? "") ||
        !/^[a-f0-9]{40}$/u.test(request?.trustedCommitId ?? "") ||
        receipt.candidate?.commitId !== request.candidateCommitId ||
        receipt.trusted?.commitId !== request.trustedCommitId ||
        !isDeepStrictEqual(receipt.producer, request.producer) ||
        !isDeepStrictEqual(receipt.workflow, request.workflow ?? null)
      )
        fail("EVIDENCE_CHANGED", "Request and receipt identities differ.");
      recorded.set(sample.index, receipt);
    } catch (error) {
      if (passed) throw error;
      receiptProblems.push({
        sample: sample.index,
        message: String(error.message),
      });
    }
  }
  mkdirSync(outputRoot);
  mkdirSync(join(outputRoot, "manifests"));
  const index = {
    schemaVersion: 2,
    passed,
    payloadRetention: "reconstruct-from-immutable-inputs",
    limitations:
      "Manifest hashes establish content identity, not source-byte retention or independent authenticity. Reconstruct candidate Git data and trusted policy overlay, including hidden paths and listed directories, before verifying the staged digest.",
    files: [],
    samples: [],
    problems: receiptProblems,
  };
  function emit(path, bytes, limit = bound, metadata = {}) {
    if (exceeds(bytes.length, limit))
      fail("EVIDENCE_LIMIT", "Compact evidence file exceeds the report bound.");
    writeFileSync(join(outputRoot, path), bytes, { flag: "wx" });
    index.files.push({
      path,
      size: bytes.length,
      sha256: digest(bytes),
      ...metadata,
    });
  }
  for (const path of ["request.json", "window.json"])
    if (existsSync(join(sourceRoot, path))) {
      const limit =
        path === "request.json"
          ? profile
            ? tighter(profile.maxRequestBytes, maxEvidenceInputBytes)
            : bound
          : bound;
      emit(path, originalReports.get(path), limit);
    }
  const directories = readdirSync(sourceRoot)
    .filter((name) => /^sample-[1-9][0-9]*$/u.test(name))
    .sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)));
  if (exceeds(directories.length, sampleCeiling))
    fail("EVIDENCE_LIMIT", "Too many sample directories.");
  const manifests = new Map();
  for (const name of directories) {
    const number = Number(name.slice(7));
    if (exceeds(number, sampleCeiling))
      fail("EVIDENCE_LIMIT", "Sample index exceeds the window.");
    const directory = safePath(sourceRoot, name);
    if (!lstatSync(directory).isDirectory())
      fail("UNSAFE_EVIDENCE", "Expected a real sample directory.");
    mkdirSync(join(outputRoot, name));
    const sample = {
      index: number,
      receiptPath: `${name}/receipt.json`,
      complete: recorded.has(number),
      manifestPath: null,
      manifestSha256: null,
    };
    for (const file of ["receipt.json", "stdout.txt", "stderr.txt"])
      if (existsSync(join(directory, file))) {
        try {
          // Failed observers can overshoot a log limit before termination. Keep
          // a bounded prefix, explicitly marked; its digest covers only that prefix.
          const { bytes, originalSize, truncated } = readEvidence(
            sourceRoot,
            `${name}/${file}`,
            bound,
            !passed,
          );
          if (
            file === "receipt.json" &&
            recorded.has(number) &&
            digest(bytes) !== samples[number - 1].receiptSha256
          )
            fail("EVIDENCE_CHANGED", "Receipt changed during packaging.");
          emit(
            `${name}/${file}`,
            bytes,
            bound,
            truncated ? { truncated: true, originalSize } : {},
          );
          if (truncated) {
            sample.complete = false;
            index.problems.push({
              sample: number,
              message: `${file} truncated to ${bound} bytes from ${originalSize}.`,
            });
          }
        } catch (error) {
          if (passed) throw error;
          sample.complete = false;
          index.problems.push({
            sample: number,
            message: String(error.message),
          });
        }
      } else {
        if (passed)
          fail(
            "EVIDENCE_CHANGED",
            "Successful sample has missing reports or logs.",
          );
        sample.complete = false;
        index.problems.push({
          sample: number,
          message: `${file} unavailable.`,
        });
      }
    const data = join(directory, "data");
    if (existsSync(data) && profile) {
      try {
        const manifest = stagedDataManifest(
          safePath(sourceRoot, `${name}/data`),
          profile,
        );
        const receipt = recorded.get(number);
        if (
          receipt &&
          (manifest.stagedDataSha256 !== receipt.staging?.stagedDataSha256 ||
            !isDeepStrictEqual(receipt.staging?.profile, profile))
        )
          fail(
            "EVIDENCE_CHANGED",
            "Staged data digest or profile changed after qualification.",
          );
        const path = `manifests/${manifest.stagedDataSha256}.json`;
        const bytes = Buffer.from(
          JSON.stringify({ schemaVersion: 1, ...manifest }, null, 2) + "\n",
        );
        if (!manifests.has(path)) {
          emit(path, bytes);
          manifests.set(path, digest(bytes));
        } else if (manifests.get(path) !== digest(bytes))
          fail(
            "EVIDENCE_CHANGED",
            "Conflicting manifests for one staged digest.",
          );
        sample.manifestPath = path;
        sample.manifestSha256 = manifests.get(path);
      } catch (error) {
        if (passed) throw error;
        sample.complete = false;
        index.problems.push({ sample: number, message: String(error.message) });
      }
    } else {
      sample.complete = false;
      if (passed)
        fail("EVIDENCE_CHANGED", "Successful sample has missing staged data.");
      index.problems.push({
        sample: number,
        message: "Staged data or trusted profile unavailable.",
      });
    }
    index.samples.push(sample);
  }
  if (
    passed &&
    (index.samples.length !== profile.requiredConsecutiveSamples ||
      index.samples.some((sample) => !sample.complete))
  )
    fail("EVIDENCE_CHANGED", "Successful window has missing sample evidence.");
  if (!window)
    index.problems.push({
      message:
        "Qualification window unavailable; observation did not complete.",
    });
  const bytes = Buffer.from(JSON.stringify(index, null, 2) + "\n");
  if (exceeds(bytes.length, bound))
    fail("EVIDENCE_LIMIT", "Artifact index exceeds the report bound.");
  writeFileSync(join(outputRoot, "artifact-index.json"), bytes, { flag: "wx" });
  return index;
}

import { contained } from "./path-containment.js";
