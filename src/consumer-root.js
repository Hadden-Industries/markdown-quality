// SPDX-License-Identifier: AGPL-3.0-only
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fail, exceeds } from "./contracts.js";
import { contained } from "./path-containment.js";
import { bindGitExecutable, readGit } from "./host-git.js";
export { contained } from "./path-containment.js";

export function safePath(root, input, { missing = false, file = false } = {}) {
  if (
    typeof input !== "string" ||
    input.includes("\0") ||
    input.replace(/^[A-Za-z]:[\\/]/u, "").includes(":")
  )
    fail("UNSAFE_PATH", "Invalid path.");
  const path = resolve(root, input);
  if (!contained(root, path))
    fail("UNSAFE_PATH", "Path escapes the consumer root.");
  const parts = relative(root, path).split(sep).filter(Boolean);
  if (parts.length === 0 && file && !lstatSync(root).isFile())
    fail("INVALID_FILE", "Expected a regular file.");
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (missing && error.code === "ENOENT") return path;
      throw error;
    }
    if (stat.isSymbolicLink())
      fail("UNSAFE_PATH", "Symbolic links and junctions are not supported.");
    if (!contained(root, realpathSync(current)))
      fail("UNSAFE_PATH", "Resolved path escapes the consumer root.");
    if (i < parts.length - 1 && !stat.isDirectory())
      fail("UNSAFE_PATH", "A path parent is not a directory.");
    if (i === parts.length - 1 && file && !stat.isFile())
      fail("INVALID_FILE", "Expected a regular file.");
  }
  return path;
}

function observe(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return undefined;
    fail("UNSAFE_ROOT", "Cannot inspect consumer root metadata.");
  }
}

/** Confirm an observed .git entry denotes this directory's checkout through host Git. */
function verifyGitBoundary(directory, { gitExecutablePath, gitTimeoutMs }) {
  let output;
  try {
    const git = bindGitExecutable(directory, gitExecutablePath);
    output = readGit(git, directory, ["rev-parse", "--show-toplevel"], {
      timeoutMs: gitTimeoutMs,
      maxOutputBytes: 65_536,
    });
  } catch {
    fail(
      "UNSAFE_ROOT",
      "Cannot verify the observed Git checkout boundary with host Git.",
    );
  }
  let top;
  try {
    top = realpathSync(resolve(output.toString("utf8").trim()));
  } catch {
    fail("UNSAFE_ROOT", "Host Git reported an inaccessible checkout root.");
  }
  if (top !== realpathSync(directory))
    fail(
      "UNSAFE_ROOT",
      "Observed Git metadata does not identify this directory's checkout.",
    );
}

/** Root identity is independent of configuration presence. An explicit root wins;
 * otherwise the nearest Git checkout, the nearest package root, then the invocation
 * directory. Package or configuration code is never executed.
 */
export function discoverConsumerRoot(
  root,
  { cwd = process.cwd(), gitExecutablePath, gitTimeoutMs = null } = {},
) {
  let method;
  if (root !== undefined && root !== null) {
    if (typeof root !== "string" || root === "" || root.includes("\0"))
      fail("UNSAFE_ROOT", "Consumer root must be a nonempty path.");
    root = resolve(cwd, root);
    method = "explicit";
  } else {
    const start = resolve(cwd);
    let packageRoot;
    for (let directory = start; ;) {
      const git = observe(join(directory, ".git"));
      if (git) {
        if (git.isSymbolicLink() || (!git.isDirectory() && !git.isFile()))
          fail(
            "UNSAFE_ROOT",
            "Git metadata must be a directory or a worktree/submodule file.",
          );
        verifyGitBoundary(directory, { gitExecutablePath, gitTimeoutMs });
        root = directory;
        method = "git";
        break;
      }
      if (packageRoot === undefined) {
        const manifest = observe(join(directory, "package.json"));
        if (manifest?.isFile() && !manifest.isSymbolicLink())
          packageRoot = directory;
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    if (method === undefined) {
      method = packageRoot === undefined ? "cwd" : "package";
      root = packageRoot ?? start;
    }
  }
  let rootStat;
  try {
    rootStat = lstatSync(root);
  } catch {
    fail("UNSAFE_ROOT", "Consumer root is missing or inaccessible.");
  }
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    realpathSync(root) !== root
  )
    fail(
      "UNSAFE_ROOT",
      "Consumer root must be a real directory without linked parents.",
    );
  return { root, method };
}

/** Resolve the same consumer identity before any subprocess executable binding. */
export function resolveConsumerRoot(root, options) {
  return discoverConsumerRoot(root, options).root;
}

/** Read a contained regular, unlinked file under a ceiling that was chosen before the
 * read. The file cannot authorize reading itself beyond that ceiling.
 */
export function readBoundedFile(path, maxBytes, code, message) {
  const before = lstatSync(path);
  if (before.isSymbolicLink() || !before.isFile())
    fail("INVALID_FILE", "Expected a regular unlinked file.");
  if (exceeds(before.size, maxBytes)) fail(code, message);
  const descriptor = openSync(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.ino !== before.ino)
      fail("INVALID_FILE", "File changed while being opened.");
    const chunks = [];
    let size = 0;
    while (true) {
      const buffer = Buffer.alloc(65_536);
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) break;
      size += count;
      if (exceeds(size, maxBytes)) fail(code, message);
      chunks.push(buffer.subarray(0, count));
    }
    return { bytes: Buffer.concat(chunks, size), stat };
  } finally {
    closeSync(descriptor);
  }
}
