// SPDX-License-Identifier: AGPL-3.0-only
import {
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { contained, safePath } from "./configuration.js";
import { digest, fail } from "./contracts.js";
import { stagedDataManifest } from "./candidate-staging.js";

const maximumReportBytes = 64 * 1024 * 1024;
const fingerprint = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
function boundedRead(root, path, bound) {
  const full = safePath(root, path, { file: true });
  const before = lstatSync(full);
  if (before.nlink !== 1 || before.size > bound)
    fail("EVIDENCE_LIMIT", "Evidence requires bounded singly linked files.");
  const bytes = readFileSync(full);
  if (
    bytes.length !== before.size ||
    fingerprint(before) !== fingerprint(lstatSync(full))
  )
    fail("EVIDENCE_CHANGED", "Evidence changed during packaging.");
  return bytes;
}

/** Project quiescent qualification output for upload without modifying originals.
 * Manifests establish identity, not retained bytes or independent authenticity.
 * Reproduction requires the immutable candidate/trusted Git objects and archives.
 * Failed/incomplete observations retain diagnostics without becoming passes.
 */
export function packageQualificationEvidence({ sourceRoot, outputRoot }) {
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
    const bytes = boundedRead(sourceRoot, path, maximumReportBytes);
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
    for (const key of [
      "samples",
      "reportBytes",
      "requestBytes",
      "stagingBytes",
      "stagingEntries",
    ])
      if (!Number.isSafeInteger(profile[key]) || profile[key] <= 0)
        fail(
          "EVIDENCE_LIMIT",
          "Evidence profile bounds must be finite positive integers.",
        );
    if (
      profile.samples > 100 ||
      profile.reportBytes > maximumReportBytes ||
      profile.requestBytes > maximumReportBytes
    )
      fail("EVIDENCE_LIMIT", "Evidence exceeds packaging admission bounds.");
  }
  if (
    passed &&
    (!profile ||
      !isDeepStrictEqual(window.enforcedProfile, profile) ||
      !Array.isArray(window.samples) ||
      window.samples.length !== profile.samples)
  )
    fail(
      "EVIDENCE_CHANGED",
      "Successful window requires every declared sample and the exact profile.",
    );
  const bound = profile?.reportBytes ?? 8388608;
  const samples = window?.samples ?? [];
  if (!Array.isArray(samples) || samples.length > (profile?.samples ?? 1000))
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
      recorded.set(sample.index, JSON.parse(bytes));
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
    schemaVersion: 1,
    passed,
    payloadRetention: "reconstruct-from-immutable-inputs",
    limitations:
      "Manifest hashes establish content identity, not source-byte retention or independent authenticity. Reconstruct candidate Git data and trusted policy overlay, including hidden paths and listed directories, before verifying the staged digest.",
    files: [],
    samples: [],
    problems: receiptProblems,
  };
  function emit(path, bytes, limit = bound) {
    if (bytes.length > limit)
      fail("EVIDENCE_LIMIT", "Compact evidence file exceeds the report bound.");
    writeFileSync(join(outputRoot, path), bytes, { flag: "wx" });
    index.files.push({ path, size: bytes.length, sha256: digest(bytes) });
  }
  for (const path of ["request.json", "window.json"])
    if (existsSync(join(sourceRoot, path))) {
      const limit =
        path === "request.json" ? (profile?.requestBytes ?? bound) : bound;
      emit(path, originalReports.get(path), limit);
    }
  const directories = readdirSync(sourceRoot)
    .filter((name) => /^sample-[1-9][0-9]*$/u.test(name))
    .sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)));
  if (directories.length > (profile?.samples ?? 1000))
    fail("EVIDENCE_LIMIT", "Too many sample directories.");
  const manifests = new Map();
  for (const name of directories) {
    const number = Number(name.slice(7));
    if (number > (profile?.samples ?? 1000))
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
        const bytes = boundedRead(sourceRoot, `${name}/${file}`, bound);
        if (
          file === "receipt.json" &&
          recorded.has(number) &&
          digest(bytes) !== samples[number - 1].receiptSha256
        )
          fail("EVIDENCE_CHANGED", "Receipt changed during packaging.");
        emit(`${name}/${file}`, bytes);
      } else if (passed)
        fail(
          "EVIDENCE_CHANGED",
          "Successful sample has missing reports or logs.",
        );
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
    (index.samples.length !== profile.samples ||
      index.samples.some((sample) => !sample.complete))
  )
    fail("EVIDENCE_CHANGED", "Successful window has missing sample evidence.");
  if (!window)
    index.problems.push({
      message:
        "Qualification window unavailable; observation did not complete.",
    });
  const bytes = Buffer.from(JSON.stringify(index, null, 2) + "\n");
  if (bytes.length > bound)
    fail("EVIDENCE_LIMIT", "Artifact index exceeds the report bound.");
  writeFileSync(join(outputRoot, "artifact-index.json"), bytes, { flag: "wx" });
  return index;
}
