// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  realpathSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import {
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
export const repositoryRoot = resolve(dirname(self), "..");
export const limits = Object.freeze({
  files: 4096,
  bytes: 64 * 1024 * 1024,
  fileBytes: 8 * 1024 * 1024,
  graphBytes: 16 * 1024 * 1024,
  analysisMs: 30000,
  testMs: 600000,
});
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

/** Reject ambiguous, option-like and escaping Git paths before filesystem/process use. */
export function safePath(path) {
  if (
    typeof path !== "string" ||
    !path ||
    path.length > 1024 ||
    path.startsWith("-") ||
    path.includes("\\") ||
    /[\x00-\x1f\x7f]/u.test(path) ||
    isAbsolute(path) ||
    path
      .split("/")
      .some(
        (part) => !part || part === "." || part === ".." || part.includes(":"),
      )
  )
    throw new Error("Unsafe repository path");
  return path;
}

/** Read only regular files reached through regular directories inside this root. */
export function readOwned(root, path) {
  safePath(path);
  let target = root;
  for (const part of path.split("/")) {
    target = join(target, part);
    if (lstatSync(target).isSymbolicLink())
      throw new Error("Linked input is unsupported");
  }
  const info = lstatSync(target);
  const actual = relative(realpathSync(root), realpathSync(target));
  if (
    !info.isFile() ||
    info.size > limits.fileBytes ||
    actual.startsWith(`..${sep}`) ||
    isAbsolute(actual)
  )
    throw new Error("Input escaped root or exceeded file limit");
  return readFileSync(target);
}

/** Bounded shell-free Git observations; malformed UTF-8 paths are rejected separately. */
export function git(root, args, binary = false) {
  // Bind the host executable without searching the candidate working directory.
  const executable = (process.env.PATH ?? process.env.Path ?? "")
    .split(delimiter)
    .filter(isAbsolute)
    .map((entry) =>
      join(entry, process.platform === "win32" ? "git.exe" : "git"),
    )
    .find(
      (path) =>
        existsSync(path) &&
        lstatSync(path).isFile() &&
        relative(realpathSync(root), realpathSync(path)).startsWith(`..${sep}`),
    );
  if (!executable) throw new Error("Native host Git unavailable");
  const child = spawnSync(realpathSync(executable), args, {
    cwd: root,
    encoding: binary ? undefined : "utf8",
    windowsHide: true,
    timeout: 10000,
    maxBuffer: limits.graphBytes,
  });
  if (child.error || child.status !== 0)
    throw new Error("Git context unavailable");
  return child.stdout;
}

export function nulPaths(buffer) {
  const value = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  return value.split("\0").filter(Boolean);
}

/** Capture Git inventory plus content, independent of graph membership and timestamps. */
export function snapshot(root) {
  if (lstatSync(root).isSymbolicLink())
    throw new Error("Linked repository root");
  const paths = [
    ...new Set([
      ...nulPaths(
        git(
          root,
          ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
          true,
        ),
      ),
      ...authoredRoots(root),
    ]),
  ].sort();
  if (paths.length > limits.files) throw new Error("Inventory limit");
  const folded = new Set();
  let bytes = 0;
  const files = paths.map((path) => {
    safePath(path);
    const key = path.toLowerCase();
    if (folded.has(key)) throw new Error("Case-colliding paths");
    folded.add(key);
    let content;
    try {
      content = readOwned(root, path);
    } catch (error) {
      if (error.code === "ENOENT") return { path, sha256: null };
      throw error;
    }
    bytes += content.length;
    if (bytes > limits.bytes) throw new Error("Snapshot byte limit");
    return { path, sha256: sha256(content) };
  });
  const tests = files
    .filter((file) => file.sha256 && /^test\/[^/]+\.test\.js$/u.test(file.path))
    .map((file) => file.path);
  if (!tests.length) throw new Error("No current test inventory");
  return {
    head: git(root, ["rev-parse", "HEAD"]).trim(),
    tree: git(root, ["rev-parse", "HEAD^{tree}"]).trim(),
    index: sha256(git(root, ["ls-files", "--stage", "-z"], true)),
    files,
    tests,
    digest: sha256(JSON.stringify(files)),
  };
}

/** Independently discover all executable JS-family roots, including standalone modules. */
function authoredRoots(root) {
  const files = [];
  let entries = 0;
  function visit(path) {
    for (const entry of readdirSync(join(root, path), {
      withFileTypes: true,
    })) {
      const name = `${path}/${entry.name}`;
      if (++entries > limits.files)
        throw new Error("Graph directory inventory limit");
      safePath(name);
      if (entry.isSymbolicLink()) throw new Error("Linked graph input");
      if (entry.isDirectory()) visit(name);
      else if (/\.(?:js|mjs|cjs)$/u.test(name)) {
        readOwned(root, name);
        files.push(name);
      }
      if (files.length > limits.files) throw new Error("Graph inventory limit");
    }
  }
  for (const path of ["src", "scripts", "test"]) visit(path);
  if (!files.length) throw new Error("Empty graph roots");
  return files.sort();
}

/** Capture in an isolated process: the API never discovers or executes candidate configuration. */
export function captureGraph(root, configRoot = repositoryRoot) {
  const child = spawnSync(
    process.execPath,
    ["--max-old-space-size=256", self, "--capture-worker"],
    {
      cwd: root,
      input: JSON.stringify({
        root,
        config: JSON.parse(readOwned(configRoot, ".dependency-cruiser.json")),
        roots: authoredRoots(root),
        modules: join(repositoryRoot, "node_modules"),
      }),
      encoding: "utf8",
      windowsHide: true,
      timeout: limits.analysisMs,
      maxBuffer: limits.graphBytes,
    },
  );
  if (child.error || child.status !== 0)
    throw new Error(
      `Graph extraction failed: ${child.error?.code ?? child.stderr.slice(0, 1000)}`,
    );
  return JSON.parse(child.stdout);
}

/** Upstream format validates its own graph and owns all reverse import reachability. */
export async function nativeReach(graph, seeds) {
  const { format } = await import("dependency-cruiser");
  if (
    !seeds.length ||
    seeds.length > limits.files ||
    JSON.stringify(graph).length > limits.graphBytes
  )
    throw new Error("Reach input limit");
  const pattern = seeds
    .map((seed) => safePath(seed).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join("|");
  const result = await format(graph, {
    outputType: "json",
    reaches: `^(?:${pattern})$`,
  });
  return JSON.parse(result.output);
}

/** Publish a complete new external bundle atomically; never overwrite an earlier bundle. */
export async function writeBundle(root, output) {
  output = resolve(output);
  const rel = relative(root, output);
  if (!rel || (!rel.startsWith(`..${sep}`) && !isAbsolute(rel)))
    throw new Error("Graph output must be external");
  // Resolve the nearest existing ancestor before creating any missing directories.
  // An external-looking link must not cause writes inside the checkout, even on rejection.
  let ancestor = dirname(output);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const projected = resolve(realpathSync(ancestor), relative(ancestor, output));
  const actual = relative(realpathSync(root), projected);
  if (!actual || (!actual.startsWith(`..${sep}`) && !isAbsolute(actual)))
    throw new Error("Output link points into the repository");
  const before = snapshot(root);
  const graph = captureGraph(root);
  const { format } = await import("dependency-cruiser");
  const views = {
    overview: {},
    runtime: { includeOnly: "^src/" },
    tests: { focus: "^test/" },
  };
  const rendered = {};
  for (const [name, filter] of Object.entries(views))
    rendered[name] = (
      await format(graph, { outputType: "mermaid", ...filter })
    ).output;
  const after = snapshot(root);
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Snapshot drift");
  mkdirSync(dirname(output), { recursive: true });
  const actualParent = relative(
    realpathSync(root),
    realpathSync(dirname(output)),
  );
  if (
    (!actualParent.startsWith(`..${sep}`) && !isAbsolute(actualParent)) ||
    existsSync(output)
  )
    throw new Error(
      "Output must be a new external directory without a link back into the repository",
    );
  const temp = mkdtempSync(join(dirname(output), ".graph-"));
  try {
    writeFileSync(
      join(temp, "graph.json"),
      JSON.stringify(graph, null, 2) + "\n",
    );
    for (const [name, view] of Object.entries(rendered))
      writeFileSync(join(temp, `${name}.mmd`), view);
    const policy = JSON.parse(readOwned(root, ".test-impact.json"));
    writeFileSync(
      join(temp, "declared-relations.json"),
      JSON.stringify(policy.relations, null, 2) + "\n",
    );
    writeFileSync(
      join(temp, "provenance.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          snapshot: before,
          runtime: process.version,
          platform: process.platform,
          tool: "dependency-cruiser@18.5.0",
          graphDigest: sha256(JSON.stringify(graph)),
          lockDigest: sha256(readOwned(root, "package-lock.json")),
          configDigest: sha256(readOwned(root, ".dependency-cruiser.json")),
          policyDigest: sha256(readOwned(root, ".test-impact.json")),
          owner: "invoking maintainer",
          disposal:
            "after graph consumers finish; retain accepted proof and failures",
        },
        null,
        2,
      ) + "\n",
    );
    renameSync(temp, output);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  return graph;
}

if (process.argv[1] && resolve(process.argv[1]) === self) {
  try {
    if (process.argv[2] === "--capture-worker") {
      const request = JSON.parse(readFileSync(0, "utf8"));
      // No extends, plugins, custom reporters, transpilers, cache or executable config.
      if (
        Object.keys(request.config).some(
          (key) => !["forbidden", "options"].includes(key),
        ) ||
        Object.keys(request.config.options).some(
          (key) =>
            !["doNotFollow", "moduleSystems", "preserveSymlinks"].includes(key),
        )
      )
        throw new Error("Unsupported graph configuration");
      const { cruise, format } = await import("dependency-cruiser");
      const result = await cruise(
        request.roots,
        {
          ...request.config.options,
          validate: true,
          ruleSet: { forbidden: request.config.forbidden },
          outputType: "json",
        },
        {
          modules: [request.modules],
          // Enhanced-resolve intersects restrictions, so express the two allowed roots as one union.
          restrictions: [
            new RegExp(
              `^(?:${[request.root, request.modules].map((path) => path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|")})(?:[\\\\/]|$)`,
            ),
          ],
          exportsFields: ["exports"],
          conditionNames: ["node", "import", "default"],
          extensions: [".js", ".mjs", ".cjs", ".json"],
        },
        {},
      );
      const graph = JSON.parse(result.output);
      await format(graph, { outputType: "json" });
      process.stdout.write(JSON.stringify(graph));
    } else {
      if (process.argv.length !== 4 || process.argv[2] !== "--output")
        throw new Error(
          "Usage: graph:dependencies -- --output <new external directory>",
        );
      const graph = await writeBundle(repositoryRoot, process.argv[3]);
      console.log(
        `Captured ${graph.modules.length} modules; ${graph.summary.violations.length} native rule findings`,
      );
      if (
        graph.summary.violations.some(
          (finding) => finding.rule.severity === "error",
        )
      )
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
