// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  realpathSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { resolve, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contained, safePath } from "./configuration.js";
import { readExecutionProfile } from "./execution-profile.js";
import { executionEnvironment } from "./execution.js";
import { fail, decode, digest, metadata } from "./contracts.js";
import { resolveTool } from "./native-tool.js";
import { validateQualityResult } from "./result-validation.js";
import { inspectCandidateData } from "./candidate-staging.js";

/** Native metadata-only Git reads; verify committed regular-file bytes without
 * status/diff filters, hooks or any candidate program. Linked trees fail closed.
 */
export function checkoutIdentity(root, git, expected, profile) {
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(expected ?? ""))
    fail(
      "REVISION_IDENTITY",
      "Expected checkout requires a full Git commit identity.",
    );
  root = resolve(root);
  const read = (...args) =>
    execFileSync(
      git,
      [
        "--no-optional-locks",
        "--no-replace-objects",
        "-c",
        "core.fsmonitor=false",
        "-C",
        root,
        ...args,
      ],
      {
        env: executionEnvironment(),
        timeout: 10000,
        maxBuffer: profile.stagingEntries * 1024,
        windowsHide: true,
      },
    );
  const head = decode(read("rev-parse", "--verify", "HEAD")).trim();
  if (head !== expected)
    fail(
      "REVISION_IDENTITY",
      "Checkout does not match the requested exact revision.",
    );
  const tree = decode(read("rev-parse", "HEAD^{tree}")).trim();
  const format = decode(read("rev-parse", "--show-object-format")).trim();
  if (!["sha1", "sha256"].includes(format))
    fail("REVISION_IDENTITY", "Unsupported native Git object format.");
  const records = decode(read("ls-tree", "-r", "-z", "HEAD"))
    .split("\0")
    .filter(Boolean);
  if (records.length > profile.stagingEntries)
    fail("STAGING_LIMIT", "Tracked checkout exceeds its admission bound.");
  const markdownPaths = [],
    hash = createHash("sha256"),
    chunk = Buffer.alloc(65536);
  let total = 0;
  for (const record of records) {
    const match = /^(100644|100755) blob ([a-f0-9]+)\t([\s\S]+)$/u.exec(record);
    if (!match)
      fail(
        "UNSAFE_STAGING",
        "Qualification requires regular committed files without submodules or links.",
      );
    const path = safePath(root, match[3], { file: true }),
      stat = lstatSync(path);
    total += stat.size;
    if (stat.nlink !== 1 || total > profile.stagingBytes)
      fail(
        "STAGING_LIMIT",
        "Committed checkout exceeds bounded regular-file admission.",
      );
    const blob = createHash(format).update("blob " + stat.size + "\0"),
      fd = openSync(path, "r");
    try {
      let size;
      while ((size = readSync(fd, chunk, 0, chunk.length, null)) > 0)
        blob.update(chunk.subarray(0, size));
    } finally {
      closeSync(fd);
    }
    if (blob.digest("hex") !== match[2])
      fail(
        "CHECKOUT_CHANGED",
        "Checkout file bytes differ from the expected commit.",
      );
    hash.update(record + "\0");
    if (match[3].endsWith(".md")) markdownPaths.push(match[3]);
  }
  // The index and ignore rules cannot conceal added data or link targets.
  const committedPaths = new Set(
    records.map((record) => record.slice(record.indexOf("\t") + 1)),
  );
  const parents = new Set();
  for (const path of committedPaths) {
    const parts = path.split("/");
    for (let end = 1; end < parts.length; end++)
      parents.add(parts.slice(0, end).join("/"));
  }
  const actual = inspectCandidateData(root, profile);
  if (
    actual.records.some(
      (record) =>
        !(record.type === "file" ? committedPaths : parents).has(record.path),
    )
  )
    fail(
      "CHECKOUT_CHANGED",
      "Qualification checkout has data outside the requested commit.",
    );
  return {
    head,
    tree,
    committedDataSha256: hash.digest("hex"),
    markdownPaths: markdownPaths.sort(),
  };
}

function boundExecutable(path, roots) {
  if (!isAbsolute(path ?? ""))
    fail(
      "EXECUTABLE_IDENTITY",
      "Qualification requires absolute native executable paths.",
    );
  const bound = realpathSync(path);
  if (
    !lstatSync(bound).isFile() ||
    roots.some((root) => contained(root, bound)) ||
    (process.platform === "win32" && !bound.toLowerCase().endsWith(".exe"))
  )
    fail(
      "EXECUTABLE_IDENTITY",
      "Runtime must be a native host executable outside source inputs.",
    );
  return bound;
}

/** Observe repeated exact-candidate checks using bundled Windows Job/Linux group
 * mechanics. This produces evidence, never installation, publication or approval.
 * Runtime/profile input is trusted; candidate requests cannot relax its limits.
 */
export async function qualifyCandidate({
  sourceRoot,
  trustedRoot,
  candidateSha,
  trustedSha,
  git,
  python,
  outputRoot,
  profile: profilePath,
  producer,
  workflow,
}) {
  sourceRoot = resolve(sourceRoot);
  trustedRoot = resolve(trustedRoot);
  outputRoot = resolve(outputRoot);
  const roots = [sourceRoot, trustedRoot];
  if (
    roots.some(
      (root) => contained(root, outputRoot) || contained(outputRoot, root),
    ) ||
    contained(sourceRoot, trustedRoot) ||
    contained(trustedRoot, sourceRoot)
  )
    fail(
      "UNSAFE_STAGING",
      "Qualification inputs and output require disjoint roots.",
    );
  if (
    realpathSync(sourceRoot) !== sourceRoot ||
    realpathSync(trustedRoot) !== trustedRoot ||
    realpathSync(resolve(outputRoot, "..")) !== resolve(outputRoot, "..")
  )
    fail("UNSAFE_ROOT", "Qualification roots require no linked parents.");
  const profile = readExecutionProfile({
    root: trustedRoot,
    profile: profilePath,
  });
  if (profile.runtimes.node !== process.versions.node)
    fail(
      "RUNTIME_MISMATCH",
      "Installed Node differs from the trusted runtime declaration.",
    );
  git = boundExecutable(git, roots);
  python = boundExecutable(python, roots);
  const pythonVersion = decode(
    execFileSync(python, ["--version"], {
      env: executionEnvironment(),
      timeout: 10000,
      maxBuffer: 4096,
      windowsHide: true,
    }),
  )
    .trim()
    .replace(/^Python /u, "");
  if (
    pythonVersion !== profile.runtimes.python &&
    !pythonVersion.startsWith(profile.runtimes.python + ".")
  )
    fail(
      "RUNTIME_MISMATCH",
      "Installed Python differs from the trusted runtime declaration.",
    );
  if (
    !producer ||
    !/^[a-f0-9]{40}$/u.test(producer.sourceSha ?? "") ||
    !/^[a-f0-9]{64}$/u.test(producer.coreArchiveSha256 ?? "") ||
    !/^[a-f0-9]{64}$/u.test(producer.nativeArchiveSha256 ?? "")
  )
    fail(
      "PRODUCER_IDENTITY",
      "Qualification requires the locked source/core/native archive tuple.",
    );
  const sourceIdentityPath = new URL(
    "../assets/source-identity.json",
    import.meta.url,
  );
  let installed;
  try {
    installed = JSON.parse(readFileSync(sourceIdentityPath, "utf8"));
  } catch {
    fail(
      "PRODUCER_IDENTITY",
      "Qualification requires an installed source-bound packed capability.",
    );
  }
  if (installed.head !== producer.sourceSha || installed.clean !== true)
    fail(
      "PRODUCER_IDENTITY",
      "Installed capability does not bind the requested clean producer revision.",
    );
  if (!profile.toolchain)
    fail(
      "PRODUCER_IDENTITY",
      "Qualification profile requires a trusted locked archive graph.",
    );
  const acquire = (name) => {
    const path = safePath(trustedRoot, name, { file: true });
    if (lstatSync(path).size > profile.stagingBytes)
      fail(
        "STAGING_LIMIT",
        "Trusted archive graph exceeds its admission bound.",
      );
    return readFileSync(path);
  };
  const coreBytes = acquire(profile.toolchain.coreArchive);
  const nativeBytes = acquire(
    profile.toolchain.nativeArchives[`${process.platform}-${process.arch}`],
  );
  const lockBytes = acquire(profile.toolchain.lockFile);
  const lock = JSON.parse(decode(lockBytes));
  const coreRecord = lock.packages?.["node_modules/" + metadata.name];
  const nativeSpec = resolveTool();
  const nativeManifest = JSON.parse(
    readFileSync(
      new URL("../assets/tool-manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const nativeName = nativeManifest.platforms[nativeSpec.key].package;
  const nativeRecord = lock.packages?.["node_modules/" + nativeName];
  const integrity = (bytes) =>
    "sha512-" + createHash("sha512").update(bytes).digest("base64");
  if (
    digest(coreBytes) !== producer.coreArchiveSha256 ||
    digest(nativeBytes) !== producer.nativeArchiveSha256 ||
    coreRecord?.integrity !== integrity(coreBytes) ||
    nativeRecord?.integrity !== integrity(nativeBytes) ||
    coreRecord?.version !== metadata.version ||
    nativeRecord?.version !== metadata.version
  )
    fail(
      "PRODUCER_IDENTITY",
      "Trusted lock and actual archive bytes disagree with the requested installed tuple.",
    );
  checkoutIdentity(sourceRoot, git, candidateSha, profile);
  checkoutIdentity(trustedRoot, git, trustedSha, profile);
  const native = resolveTool();
  mkdirSync(outputRoot);
  const requestPath = join(outputRoot, "request.json");
  writeFileSync(
    requestPath,
    JSON.stringify({
      sourceRoot,
      trustedRoot,
      candidateSha,
      trustedSha,
      git,
      profile,
      profilePath,
      producer: {
        ...producer,
        package: { name: metadata.name, version: metadata.version },
        source: installed,
        nativeExecutableSha256: native.sha256,
        lockSha256: digest(lockBytes),
      },
      workflow,
    }) + "\n",
    { flag: "wx" },
  );
  const observer = fileURLToPath(
    new URL("../assets/qualification/observe.py", import.meta.url),
  );
  const runner = fileURLToPath(
    new URL("./qualification-runner.js", import.meta.url),
  );
  const child = spawn(
    python,
    ["-I", "-B", observer, process.execPath, runner, requestPath, outputRoot],
    {
      env: executionEnvironment(),
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let errorBytes = 0;
  child.stderr.on("data", (bytes) => {
    errorBytes += bytes.length;
    if (errorBytes > profile.reportBytes) child.kill();
  });
  const status = await new Promise((done, reject) => {
    child.on("error", reject);
    child.on("close", done);
  });
  const reportPath = join(outputRoot, "window.json");
  if (lstatSync(reportPath).size > profile.reportBytes)
    fail("REPORT_LIMIT", "Observation report exceeds its bound.");
  const report = JSON.parse(decode(readFileSync(reportPath)));
  if (
    report.profileSha256 !== profile.profileSha256 ||
    report.passed !== (status === 0) ||
    report.requiredConsecutiveSamples !== profile.samples ||
    (report.passed &&
      (report.samples.length !== profile.samples ||
        report.samples.some((sample) => sample.activeDescendants !== 0)))
  )
    fail(
      "INVALID_RESULT",
      "Observer exit/profile/completion evidence is inconsistent.",
    );
  for (const sample of report.samples) {
    if (sample.receiptPath !== `sample-${sample.index}/receipt.json`)
      fail("INVALID_RESULT", "Observer returned an unexpected receipt path.");
    const path = safePath(outputRoot, sample.receiptPath, { file: true });
    if (lstatSync(path).size > profile.reportBytes)
      fail("REPORT_LIMIT", "Sample receipt exceeds its bound.");
    const bytes = readFileSync(path);
    if (digest(bytes) !== sample.receiptSha256)
      fail("INVALID_RESULT", "Sample receipt identity changed.");
    const receipt = JSON.parse(decode(bytes));
    validateQualityResult(receipt.result, {
      operation: "check",
      exitCode: sample.exitCode,
    });
  }
  return report;
}
