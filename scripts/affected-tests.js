// SPDX-License-Identifier: AGPL-3.0-only
import { execFile, spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv from "ajv";
import {
  captureGraph,
  git,
  limits,
  nativeReach,
  nulPaths,
  readOwned,
  repositoryRoot,
  safePath,
  sha256,
  snapshot,
} from "./dependency-graph.js";

const self = fileURLToPath(import.meta.url);
const policySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "fullDomains",
    "fullFiles",
    "boundaryFiles",
    "relations",
  ],
  properties: {
    schemaVersion: { const: 1 },
    ...Object.fromEntries(
      ["fullDomains", "fullFiles", "boundaryFiles"].map((name) => [
        name,
        {
          type: "array",
          uniqueItems: true,
          maxItems: 128,
          items: { type: "string", minLength: 1, maxLength: 1024 },
        },
      ]),
    ),
    relations: {
      type: "array",
      maxItems: 128,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "dependency",
          "consumer",
          "kind",
          "evidence",
          "fixture",
        ],
        properties: Object.fromEntries(
          ["id", "dependency", "consumer", "kind", "evidence", "fixture"].map(
            (name) => [name, { type: "string", minLength: 1, maxLength: 1024 }],
          ),
        ),
      },
    },
  },
};
const validatePolicy = new Ajv({ allErrors: true }).compile(policySchema);

/** Native graph traversal, composed with each exceptional edge at most once. */
export async function selectFromGraphs(graphs, changed, tests, relations) {
  const seeds = new Set(changed),
    applied = new Set();
  const reached = new Set(changed);
  let subgraphs;
  for (let round = 0; round <= relations.length; round++) {
    subgraphs = await Promise.all(
      graphs.map((graph) => nativeReach(graph, [...seeds].sort())),
    );
    for (const graph of subgraphs)
      for (const module of graph.modules) reached.add(module.source);
    let grew = false;
    for (const rule of relations)
      if (
        !applied.has(rule.id) &&
        (rule.dependency.endsWith("/")
          ? [...reached].some((path) => path.startsWith(rule.dependency))
          : reached.has(rule.dependency))
      ) {
        applied.add(rule.id);
        seeds.add(rule.consumer);
        grew = true;
      }
    if (!grew) {
      const selected = tests.filter((path) => reached.has(path)).sort();
      return {
        selected,
        reasons: Object.fromEntries(
          selected.map((path) => [
            path,
            {
              kind: changed.includes(path) ? "direct-change" : "native-reach",
              seeds: [...seeds].sort(),
              supplementalRules: [...applied].sort(),
            },
          ]),
        ),
        subgraphs,
        appliedRules: [...applied].sort(),
      };
    }
  }
  throw new Error("Supplemental composition bound");
}

/** Parser guard for unmodelled loads; it extracts no dependencies and performs no resolution. */
function hasUnmodelledBoundary(bytes) {
  // Reuse the analyzer's installed public Acorn dependency, not its private extractor.
  const require = createRequire(import.meta.resolve("dependency-cruiser"));
  const { parse } = require("acorn");
  const ast = parse(bytes.toString("utf8"), {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  let unsafe = false;
  const denied = new Set([
    "eval",
    "Function",
    "require",
    "Worker",
    "URL",
    "fetch",
    "process",
    "global",
    "globalThis",
    "WebAssembly",
  ]);
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportExpression" && node.source.type !== "Literal")
      unsafe = true;
    if (["CallExpression", "NewExpression"].includes(node.type)) {
      let callee = node.callee;
      while (callee?.type === "MemberExpression") {
        if (callee.computed) unsafe = true;
        callee = callee.object;
      }
      if (denied.has(callee?.name)) unsafe = true;
    }
    for (const value of Object.values(node))
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
  }
  visit(ast);
  return unsafe;
}

/** Source-only baseline: regular Git blobs, same lock/config, no checkout/install/code execution. */
function baselineSnapshot(root, base, current) {
  if (typeof base !== "string" || !/^[0-9a-f]{40}$/u.test(base))
    throw new Error("Base must be an immutable full commit ID");
  if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() !== "false")
    throw new Error("Shallow baseline");
  const commit = git(root, [
    "rev-parse",
    "--verify",
    `${base}^{commit}`,
  ]).trim();
  for (const path of [
    "package-lock.json",
    "package.json",
    ".dependency-cruiser.json",
    ".test-impact.json",
  ])
    if (
      !git(root, ["show", `${commit}:${path}`], true).equals(
        readOwned(root, path),
      )
    )
      throw new Error(`Incompatible baseline ${path}`);
  const entries = nulPaths(
    git(root, ["ls-tree", "-r", "-z", "--full-tree", commit], true),
  );
  if (entries.length > limits.files)
    throw new Error("Baseline inventory limit");
  const baseline = [],
    blobs = [];
  let bytes = 0;
  for (const entry of entries) {
    const tab = entry.indexOf("\t");
    const [mode, type, oid] = entry.slice(0, tab).split(" ");
    const path = safePath(entry.slice(tab + 1));
    if (type !== "blob" || !["100644", "100755"].includes(mode))
      throw new Error("Unsupported baseline link/submodule");
    const content = git(root, ["cat-file", "blob", oid], true);
    bytes += content.length;
    if (content.length > limits.fileBytes || bytes > limits.bytes)
      throw new Error("Baseline byte limit");
    baseline.push({ path, sha256: sha256(content) });
    if (
      /^(?:src|scripts|test)\/.*\.(?:js|mjs|cjs)$/u.test(path) ||
      path === "package.json"
    )
      blobs.push({ path, content });
  }
  const old = new Map(baseline.map((file) => [file.path, file.sha256]));
  const now = new Map(current.files.map((file) => [file.path, file.sha256]));
  const changes = [...new Set([...old.keys(), ...now.keys()])]
    .sort()
    .filter((path) => old.get(path) !== now.get(path))
    .map((path) => ({
      path,
      status: !now.get(path)
        ? "deleted"
        : !old.has(path)
          ? "added"
          : "modified",
    }));
  return {
    commit,
    tree: git(root, ["rev-parse", `${commit}^{tree}`]).trim(),
    changes,
    blobs,
  };
}

/** Explain an exact working candidate. Any untrusted selection condition widens to all current tests. */
export async function planAffected({
  root = repositoryRoot,
  base,
  paths = [],
} = {}) {
  root = resolve(root);
  // A corrupt/unsafe full inventory cannot be laundered into a successful fallback.
  const before = snapshot(root);
  const report = {
    schemaVersion: 1,
    root,
    candidate: before,
    base: null,
    changes: [],
    inventoryDigest: sha256(JSON.stringify(before.tests)),
    tool: "dependency-cruiser@18.5.0",
    runtime: process.version,
    platform: process.platform,
    mode: "full",
    fallback: null,
    selected: before.tests,
    reasons: {},
    executed: false,
  };
  const full = (reason) => {
    report.mode = "full";
    report.fallback = reason;
    report.selected = before.tests;
    report.reasons = {};
    return report;
  };
  if (!base) return full("missing-explicit-base");
  let temp;
  try {
    for (const path of paths) safePath(path);
    const policy = JSON.parse(readOwned(root, ".test-impact.json"));
    if (!validatePolicy(policy)) throw new Error("Invalid impact policy");
    if (
      new Set(policy.relations.map((rule) => rule.id)).size !==
      policy.relations.length
    )
      throw new Error("Duplicate supplemental IDs");
    for (const rule of policy.relations) {
      safePath(rule.dependency.replace(/\/$/u, ""));
      safePath(rule.consumer);
    }
    const baseline = baselineSnapshot(root, base, before);
    report.base = { commit: baseline.commit, tree: baseline.tree };
    report.changes = baseline.changes;
    report.lockDigest = sha256(readOwned(root, "package-lock.json"));
    report.configDigest = sha256(readOwned(root, ".dependency-cruiser.json"));
    report.policyDigest = sha256(readOwned(root, ".test-impact.json"));
    if (!baseline.changes.length) return full("no-changes");
    const changed = [
      ...new Set([...baseline.changes.map((change) => change.path), ...paths]),
    ].sort();
    for (const change of baseline.changes) {
      if (
        change.status === "deleted" &&
        before.tests.includes(change.path) === false &&
        /^test\/.*\.test\.js$/u.test(change.path)
      )
        return full("deleted-test-coverage");
      if (
        policy.fullFiles.includes(change.path) ||
        policy.fullDomains.some((prefix) => change.path.startsWith(prefix)) ||
        policy.boundaryFiles.includes(change.path)
      )
        return full(`control-or-resource:${change.path}`);
      if (
        !/^(?:src\/[^/]+\.(?:js|mjs|cjs)|test\/[^/]+\.js)$/u.test(change.path)
      )
        return full(`unknown-input:${change.path}`);
      if (
        change.path.startsWith("src/") &&
        change.status !== "deleted" &&
        hasUnmodelledBoundary(readOwned(root, change.path))
      )
        return full(`unmodelled-boundary:${change.path}`);
    }
    temp = mkdtempSync(join(tmpdir(), "markdown-quality-impact-"));
    for (const folder of ["src", "scripts", "test"])
      mkdirSync(join(temp, folder));
    for (const { path, content } of baseline.blobs) {
      mkdirSync(dirname(join(temp, path)), { recursive: true });
      writeFileSync(join(temp, path), content);
    }
    const graphs = [captureGraph(temp, root), captureGraph(root, root)];
    if (
      graphs.some((graph) =>
        graph.summary.violations.some(
          (violation) => violation.rule.severity === "error",
        ),
      )
    )
      return full("native-rule-error");
    const known = new Set(
      graphs.flatMap((graph) => graph.modules.map((module) => module.source)),
    );
    if (changed.some((path) => !known.has(path)))
      return full("missing-graph-membership");
    // Resource/process builtins indicate a boundary even when aliased in source.
    if (
      graphs.some((graph) =>
        graph.modules.some(
          (module) =>
            changed.includes(module.source) &&
            module.dependencies.some((dep) =>
              /^(?:node:)?(?:fs(?:\/promises)?|child_process|worker_threads|vm|module)$/u.test(
                dep.resolved,
              ),
            ),
        ),
      )
    )
      return full("resource-or-process-module");
    for (const rule of policy.relations)
      if (
        !(rule.dependency.endsWith("/")
          ? [...known].some((path) => path.startsWith(rule.dependency))
          : known.has(rule.dependency)) ||
        !known.has(rule.consumer)
      )
        throw new Error(`Missing supplemental endpoint:${rule.id}`);
    const selection = await selectFromGraphs(
      graphs,
      changed,
      before.tests,
      policy.relations,
    );
    if (!selection.selected.length) return full("empty-selection");
    Object.assign(report, selection, {
      mode: "selected",
      graphDigests: graphs.map((graph) => sha256(JSON.stringify(graph))),
    });
    if (JSON.stringify(before) !== JSON.stringify(snapshot(root)))
      throw new Error("Snapshot drift");
    return report;
  } catch (error) {
    if (JSON.stringify(before) !== JSON.stringify(snapshot(root)))
      throw new Error("Snapshot drift");
    return full(`analysis-unavailable:${error.message}`);
  } finally {
    if (temp) rmSync(temp, { recursive: true, force: true });
  }
}

/** Read native parentage and birth identities without executing candidate code. */
function posixProcesses() {
  if (process.platform === "linux") {
    const entries = readdirSync("/proc").filter((entry) =>
      /^\d+$/u.test(entry),
    );
    if (entries.length > 65536) throw new Error("Process inventory limit");
    const rows = [];
    for (const entry of entries) {
      try {
        const stat = readFileSync(`/proc/${entry}/stat`, "utf8");
        const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        rows.push([Number(entry), Number(fields[1]), fields[19]]);
      } catch (error) {
        if (!["ENOENT", "ESRCH"].includes(error.code)) throw error;
      }
    }
    return rows;
  }
  const result = spawnSync("/bin/ps", ["-axo", "pid=,ppid=,lstart="], {
    encoding: "utf8",
    timeout: 1000,
    maxBuffer: limits.fileBytes,
  });
  if (result.status !== 0 || result.error)
    throw new Error("Process inventory unavailable");
  return result.stdout
    .trim()
    .split("\n")
    .map((row) => {
      const match = /^\s*(\d+)\s+(\d+)\s+(.+)$/u.exec(row);
      if (!match) throw new Error("Invalid process inventory");
      return [Number(match[1]), Number(match[2]), match[3]];
    });
}

/** Stop captured descendants; a missing/reused harness cannot grant ownership of another PID. */
export function stopPosixTree(
  pid,
  birth,
  { table = posixProcesses, send = process.kill } = {},
) {
  const owned = new Map();
  const signalOwned = (target, identity, signal) => {
    if (!table().some(([id, , start]) => id === target && start === identity))
      return;
    try {
      send(target, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  try {
    const root = table().find(([id]) => id === pid);
    if (!birth || !root || root[2] !== birth)
      throw new Error("Owned harness identity unavailable; cleanup incomplete");
    owned.set(pid, birth);
    signalOwned(pid, birth, "SIGSTOP");
    const deadline = performance.now() + 5000;
    for (let round = 0; round < 32; round++) {
      let added = false;
      for (const [id, parent, start] of table()) {
        if (!owned.has(parent) || owned.has(id)) continue;
        if (owned.size >= limits.files || performance.now() > deadline)
          throw new Error("Process cleanup limit");
        owned.set(id, start);
        signalOwned(id, start, "SIGSTOP");
        added = true;
      }
      if (!added) return;
    }
    throw new Error("Process cleanup depth limit");
  } finally {
    // Parentage was captured while ancestors were stopped; identity checks avoid PID reuse.
    const failures = [];
    for (const [id, start] of [...owned].reverse()) {
      try {
        signalOwned(id, start, "SIGKILL");
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length)
      throw new AggregateError(failures, "Owned process cleanup incomplete");
  }
}

/** Execute complete test files with native Node; failed subsets remain failures in shadow. */
export async function runAffected(
  report,
  { shadow = false, signal, timeout = limits.testMs } = {},
) {
  signal?.throwIfAborted();
  if (!Number.isInteger(timeout) || timeout <= 0 || timeout > limits.testMs)
    throw new Error("Invalid runner timeout");
  if (
    JSON.stringify(report.candidate) !== JSON.stringify(snapshot(report.root))
  )
    throw new Error("Snapshot drift before execution");
  const execute = (paths) =>
    new Promise((resolveRun, reject) => {
      if (
        !paths.length ||
        paths.some((path) => !report.candidate.tests.includes(safePath(path)))
      ) {
        reject(new Error("Invalid runner inventory"));
        return;
      }
      const start = performance.now();
      // A nested runner must start a new harness rather than inherit Node's child-test marker.
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const child = spawn(
        process.execPath,
        [
          "--test",
          `--test-reporter=${pathToFileURL(join(dirname(self), "test-outcomes.js")).href}`,
          ...paths,
        ],
        {
          cwd: report.root,
          env,
          windowsHide: true,
          shell: false,
          detached: process.platform !== "win32",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      // Capture at launch; never adopt whatever later happens to occupy this PID.
      let birth = null;
      if (process.platform !== "win32") {
        try {
          birth = posixProcesses().find(([id]) => id === child.pid)?.[2];
        } catch {
          /* Stop reports incomplete cleanup if native identity is unavailable. */
        }
      }
      let stdout = "",
        stderr = "",
        bytes = 0,
        exceeded = false;
      let stopped = null,
        termination = Promise.resolve(),
        settled = false;
      const finish = (code, killed) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        let events;
        try {
          events = stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));
        } catch {
          events = null;
        }
        const outcomes =
          events?.filter((event) =>
            ["test:pass", "test:fail"].includes(event.type),
          ) ?? [];
        resolveRun({
          code:
            stopped || exceeded || killed || !outcomes.length ? 2 : (code ?? 2),
          signal: stopped ?? killed,
          cleanupIncomplete: stopped === "cleanup-failed",
          pid: child.pid,
          birth,
          outputLimit: exceeded,
          paths,
          elapsedMs: performance.now() - start,
          outcomes,
          stdout,
          stderr,
        });
      };
      const stop = (reason) => {
        if (stopped || !child.pid) return;
        stopped = reason;
        if (process.platform === "win32") {
          termination = new Promise((done) =>
            execFile(
              join(
                process.env.SystemRoot ?? "C:\\Windows",
                "System32",
                "taskkill.exe",
              ),
              ["/PID", String(child.pid), "/T", "/F"],
              { windowsHide: true, timeout: 5000 },
              (error) => {
                if (error && child.exitCode === null)
                  stopped = "cleanup-failed";
                done();
              },
            ),
          );
        } else {
          try {
            stopPosixTree(child.pid, birth);
          } catch (error) {
            if (error.code !== "ESRCH") stopped = "cleanup-failed";
          }
        }
        termination.then(() => {
          if (stopped !== "cleanup-failed") return;
          // Failed cleanup is a bounded incomplete result, never a quiescence claim.
          // Do not await close from a child which could still be alive.
          child.stdout.destroy();
          child.stderr.destroy();
          child.unref();
          finish(2, "cleanup-failed");
        });
      };
      const timer = setTimeout(() => stop("timeout"), timeout);
      const abort = () => stop("cancelled");
      signal?.addEventListener("abort", abort, { once: true });
      const collect = (key) => (chunk) => {
        bytes += chunk.length;
        if (bytes > limits.graphBytes) {
          exceeded = true;
          stop("output-limit");
          return;
        }
        if (key === "stdout") stdout += chunk;
        else stderr += chunk;
      };
      child.stdout.on("data", collect("stdout"));
      child.stderr.on("data", collect("stderr"));
      child.on("error", (error) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(error);
      });
      child.on("close", async (code, killed) => {
        await termination;
        finish(code, killed);
      });
    });
  const selected = await execute(report.selected);
  if (
    JSON.stringify(report.candidate) !== JSON.stringify(snapshot(report.root))
  )
    throw new Error("Snapshot drift after execution");
  let full = null;
  if (shadow && !selected.signal) {
    // Independent filesystem discovery, never the selector's supplied inventory.
    const discovered = readdirSync(join(report.root, "test"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
      .map((entry) => `test/${entry.name}`)
      .sort();
    if (JSON.stringify(discovered) !== JSON.stringify(report.candidate.tests))
      throw new Error("Independent shadow inventory disagrees");
    full = await execute(discovered);
  }
  if (
    JSON.stringify(report.candidate) !== JSON.stringify(snapshot(report.root))
  )
    throw new Error("Snapshot drift after shadow");
  const comparable = (run) =>
    run.outcomes
      .filter(
        (event) =>
          event.file &&
          report.selected.some(
            (path) => resolve(report.root, path) === resolve(event.file),
          ),
      )
      .map((event) => JSON.stringify(event))
      .sort();
  const shadowAgreement = full
    ? selected.code === full.code &&
      JSON.stringify(comparable(selected)) === JSON.stringify(comparable(full))
    : null;
  return {
    ...report,
    executed: true,
    outcome: {
      selected,
      full,
      code: selected.code || full?.code || (shadowAgreement === false ? 2 : 0),
      shadowAgreement,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === self) {
  try {
    const options = { root: process.cwd(), paths: [] };
    let list = false,
      shadow = false;
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg === "--base" && process.argv[i + 1])
        options.base = process.argv[++i];
      else if (arg === "--path" && process.argv[i + 1])
        options.paths.push(process.argv[++i]);
      else if (arg === "--list") list = true;
      else if (arg === "--shadow") shadow = true;
      else
        throw new Error(
          "Usage: check:affected -- [--base <full commit>] [--path <additional seed>] [--list|--shadow]",
        );
    }
    if (list && shadow)
      throw new Error("List and shadow are mutually exclusive");
    const start = performance.now();
    let report = await planAffected(options);
    if (!list) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      process.once("SIGINT", abort);
      process.once("SIGTERM", abort);
      try {
        report = await runAffected(report, {
          shadow,
          signal: controller.signal,
        });
      } finally {
        process.removeListener("SIGINT", abort);
        process.removeListener("SIGTERM", abort);
      }
    }
    report.elapsedMs = performance.now() - start;
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.outcome?.code ?? 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
