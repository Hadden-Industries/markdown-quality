// SPDX-License-Identifier: AGPL-3.0-only
import {
  lstatSync,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  opendirSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import picomatch from "picomatch";
import * as prettier from "prettier";
import { safePath } from "./configuration.js";
import { fail, limits, exceeds } from "./contracts.js";
const blocked = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  ".hi",
  ".sdlc",
]);
export async function selectDocuments(context, files) {
  const { root, config } = context;
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
  const included = picomatch(config.include, { dot: true });
  const excluded = picomatch(config.exclude, { dot: true });
  const ignores = config.ignoreFiles.map((p) => {
    const path = safePath(root, p, { missing: true, file: true });
    try {
      if (exceeds(lstatSync(path).size, budgets.configBytes))
        fail("IGNORE_LIMIT", "Ignore file exceeds the size limit.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return path;
  });
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
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (!excluded(relative(root, path).split(sep).join("/") + "/"))
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
    for (const file of files)
      addCandidate(safePath(root, file, { file: true }));
  const selected = [],
    exclusions = [];
  for (const path of [...new Set(candidates)].sort()) {
    const rel = relative(root, path).split(sep).join("/");
    let reason;
    if (rel.split("/").some((part) => blocked.has(part))) reason = "mandatory";
    else if (!rel.endsWith(".md") || !included(rel)) reason = "not-included";
    else if (excluded(rel)) reason = "excluded";
    else if (
      (
        await prettier.getFileInfo(path, {
          ignorePath: ignores,
          resolveConfig: false,
          withNodeModules: false,
        })
      ).ignored
    )
      reason = "ignored";
    if (reason) exclusions.push({ path: rel, reason });
    else {
      safePath(root, path, { file: true });
      selected.push(rel);
    }
  }
  if (exceeds(selected.length, budgets.files))
    fail("SELECTION_LIMIT", "Document count limit exceeded.");
  return {
    files: selected,
    exclusions,
    mode: files === undefined ? "full" : "explicit",
  };
}
export function readDocument(root, file, budgets = limits) {
  const path = safePath(root, file, { file: true });
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
