// SPDX-License-Identifier: AGPL-3.0-only
import {
  lstatSync,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  opendirSync,
  existsSync,
  realpathSync,
} from "node:fs";
import {
  join,
  relative,
  sep,
  dirname,
  delimiter,
  isAbsolute,
  resolve,
} from "node:path";
import { execFileSync } from "node:child_process";
import picomatch from "picomatch";
import { safePath, contained } from "./configuration.js";
import { fail, limits, exceeds, decode } from "./contracts.js";
const blocked = new Set([".git", "node_modules", ".venv", "venv", ".hi"]);
/** Full repository requests reconcile tracked Markdown by default; data roots
 * without Git metadata can supply their immutable inventory explicitly.
 */
export function defaultInventory(root, files, inventory) {
  if (inventory !== undefined || files !== undefined) return inventory;
  let directory = root;
  while (true) {
    if (existsSync(join(directory, ".git"))) return "git";
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** Resolve host Git without command search in candidate working directories. */
export function bindGitExecutable(root, executable) {
  const candidates =
    executable !== undefined
      ? [executable]
      : (process.env.PATH ?? process.env.Path ?? "")
          .split(delimiter)
          .filter(Boolean)
          .map((entry) =>
            join(entry, process.platform === "win32" ? "git.exe" : "git"),
          );
  const git = candidates.find(
    (path) =>
      isAbsolute(path) &&
      existsSync(path) &&
      lstatSync(path).isFile() &&
      !contained(resolve(root), realpathSync(path)) &&
      (process.platform !== "win32" || path.toLowerCase().endsWith(".exe")),
  );
  if (!git)
    fail(
      "INVENTORY_FAILED",
      "Cannot bind native host Git outside consumer inputs.",
    );
  return realpathSync(git);
}

function selectedPath(root, file) {
  try {
    return safePath(root, file, { file: true });
  } catch (error) {
    if (error.code === "ENOENT")
      fail("MISSING_DOCUMENT", "Selected document is missing: " + file);
    throw error;
  }
}
/** One path decision, including ancestor exclusions previously applied only by walking. */
export function createPathDecision(config) {
  const included = picomatch(config.include, { dot: true });
  const exclusions = config.exclude.map((pattern) => ({
    pattern,
    matches: picomatch(pattern, { dot: true }),
  }));
  return (path) => {
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path
        .split("/")
        .some((part) => part === ".." || part === "." || part === "") ||
      path.includes(":") ||
      path.includes("\0")
    )
      fail("UNSAFE_PATH", "Expected a canonical repository-relative path.");
    const parts = path.split("/");
    const subjects = [
      path,
      ...parts
        .slice(0, -1)
        .map((_, index) => parts.slice(0, index + 1).join("/") + "/"),
    ];
    for (const { pattern, matches } of exclusions)
      for (const subject of subjects)
        if (matches(subject))
          return { path, decision: "excluded", pattern, matchedPath: subject };
    if (!path.endsWith(".md") || !included(path))
      return {
        path,
        decision: "not-included",
        pattern: null,
        matchedPath: null,
      };
    if (parts.some((part) => blocked.has(part)))
      fail(
        "UNSAFE_SELECTION",
        "Selected path traverses operational filesystem state: " + path,
      );
    return { path, decision: "selected", pattern: null, matchedPath: null };
  };
}

/** Native Git inventory is bounded metadata; fsmonitor/replacements and ambient Git environment overrides are disabled. */
export function readGitInventory(root, budgets, gitExecutable, decide) {
  gitExecutable = bindGitExecutable(root, gitExecutable);
  const env = Object.fromEntries(
    ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP"]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  let bytes;
  try {
    bytes = execFileSync(
      gitExecutable,
      [
        "--no-optional-locks",
        "--no-replace-objects",
        "-c",
        "core.fsmonitor=false",
        "-C",
        root,
        "ls-files",
        "--cached",
        "--stage",
        "-z",
      ],
      {
        env,
        timeout: 10_000,
        maxBuffer: budgets.selectionBytes ?? 4_194_304,
        windowsHide: true,
      },
    );
  } catch {
    fail("INVENTORY_FAILED", "Cannot read bounded native Git inventory.");
  }
  const paths = [];
  for (const record of decode(bytes).split("\0").filter(Boolean)) {
    const match = /^(\d+) ([a-f0-9]+) ([0-3])\t([\s\S]+)$/u.exec(record);
    if (!match || match[3] !== "0")
      fail("INVENTORY_FAILED", "Conflicted or invalid Git inventory.");
    if (match[4].endsWith(".md")) {
      paths.push(match[4]);
      if (exceeds(paths.length, budgets.files))
        fail(
          "SELECTION_LIMIT",
          "Tracked Markdown inventory exceeds the file bound.",
        );
      if (
        match[1] !== "100644" &&
        match[1] !== "100755" &&
        decide?.(match[4]).decision === "selected"
      )
        fail(
          "UNSAFE_SELECTION",
          "Selected Git member is not a regular file: " + match[4],
        );
    }
  }
  return [...new Set(paths)].sort();
}

export async function selectDocuments(
  context,
  files,
  { inventory, gitExecutable } = {},
) {
  const { root, config } = context;
  inventory = defaultInventory(root, files, inventory);
  const budgets = config.limits ?? limits;
  if (
    files !== undefined &&
    (!Array.isArray(files) ||
      files.some((p) => typeof p !== "string") ||
      exceeds(files.length, budgets.files))
  )
    fail(
      "INVALID_SELECTION",
      "Explicit files must be a bounded JSON string array.",
    );
  if (
    inventory !== undefined &&
    inventory !== "git" &&
    !Array.isArray(inventory)
  )
    fail("INVALID_INVENTORY", "Inventory must be Git or canonical path data.");
  const decide = createPathDecision(config);
  let visited = 0;
  const candidates = [];
  let candidateBytes = 0;
  function addCandidate(path) {
    candidateBytes += Buffer.byteLength(path);
    if (exceeds(candidateBytes, budgets.selectionBytes))
      fail("SELECTION_LIMIT", "Discovered path bytes exceed the limit.");
    candidates.push(path);
  }
  function walk(dir) {
    const directory = opendirSync(dir);
    try {
      for (let entry; (entry = directory.readSync()) !== null;) {
        if (exceeds(++visited, budgets.entries))
          fail("SELECTION_LIMIT", "Directory entry limit exceeded.");
        if (blocked.has(entry.name)) continue;
        const path = join(dir, entry.name);
        if (entry.isSymbolicLink()) {
          if (entry.name.endsWith(".md")) addCandidate(path);
          continue;
        }
        if (entry.isDirectory()) {
          // Enumerate names (never excluded file bytes) so omission provenance is complete.
          walk(path);
        } else if (entry.isFile() && entry.name.endsWith(".md"))
          addCandidate(path);
      }
    } finally {
      directory.closeSync();
    }
  }
  if (files === undefined) walk(root);
  else
    for (const file of files) {
      decide(file);
      addCandidate(join(root, file));
    }
  const tracked =
    inventory === "git"
      ? readGitInventory(root, budgets, gitExecutable, decide)
      : inventory;
  if (
    tracked !== undefined &&
    (files !== undefined ||
      !Array.isArray(tracked) ||
      tracked.some((p) => typeof p !== "string") ||
      new Set(tracked).size !== tracked.length ||
      exceeds(tracked.length, budgets.files))
  )
    fail(
      "INVALID_INVENTORY",
      "Inventory reconciliation requires a full bounded request.",
    );
  const accounting = (tracked ?? []).map((path) => decide(path));
  for (const item of accounting) {
    if (item.decision === "selected") selectedPath(root, item.path);
    addCandidate(join(root, item.path));
  }
  const selected = [],
    exclusions = [];
  for (const path of [...new Set(candidates)].sort()) {
    const rel = relative(root, path).split(sep).join("/");
    const decision = decide(rel);
    if (decision.decision !== "selected") {
      const { decision: reason, ...details } = decision;
      exclusions.push({ ...details, reason });
    } else {
      selectedPath(root, rel);
      selected.push(rel);
    }
  }
  if (exceeds(selected.length, budgets.files))
    fail("SELECTION_LIMIT", "Document count limit exceeded.");
  return {
    files: selected,
    exclusions,
    mode: files === undefined ? "full" : "explicit",
    inventory: accounting,
  };
}
export function readDocument(root, file, budgets = limits) {
  const path = selectedPath(root, file);
  const fd = openSync(path, "r");
  try {
    const stat = fstatSync(fd, { bigint: true });
    if (!stat.isFile()) fail("INVALID_FILE", "Expected a regular file.");
    if (budgets.fileBytes !== null && stat.size > BigInt(budgets.fileBytes))
      fail("DOCUMENT_LIMIT", "Document exceeds the size limit.");
    // Read chunks through EOF even with no ceiling; never allocate the configured
    // maximum up front, and still detect growth after the initial stat.
    const chunks = [];
    let size = 0,
      count;
    while (true) {
      const buffer = Buffer.alloc(65_536);
      count = readSync(fd, buffer, 0, buffer.length, null);
      if (count === 0) break;
      size += count;
      if (exceeds(size, budgets.fileBytes))
        fail("DOCUMENT_LIMIT", "Document exceeds the size limit.");
      chunks.push(buffer.subarray(0, count));
    }
    // Preserve exact preimage ownership rather than retaining a pooled backing store.
    const bytes = Buffer.alloc(size);
    let offset = 0;
    for (const chunk of chunks) {
      chunk.copy(bytes, offset);
      offset += chunk.length;
    }
    return { path, bytes, stat };
  } finally {
    closeSync(fd);
  }
}
