// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureGraph,
  repositoryRoot,
  readOwned,
  safePath,
  snapshot,
  sha256,
  limits,
} from "./dependency-graph.js";
import { stageCore } from "./core-package-stage.js";
import { npmCommand } from "./commands.js";

/** Validate native npm membership and source/stage equality without resolving imports again. */
export function shipmentErrors(root, core, files, graph, metadata) {
  if (!Array.isArray(files) || !files.length || files.length > limits.files)
    throw new Error("Invalid shipment inventory");
  const admitted = new Set(),
    folded = new Set();
  for (const { path, size } of files) {
    safePath(path);
    if (
      admitted.has(path) ||
      folded.has(path.toLowerCase()) ||
      !Number.isSafeInteger(size) ||
      size < 0
    )
      throw new Error("Ambiguous shipment inventory");
    admitted.add(path);
    folded.add(path.toLowerCase());
    if (readOwned(core, path).length !== size)
      throw new Error("Shipment size mismatch");
  }
  const errors = [];
  const runtime = [...admitted].filter((path) => /\.(js|mjs|cjs)$/u.test(path));
  if (!runtime.length) throw new Error("Empty runtime shipment inventory");
  const modules = new Map(
    graph.modules.map((module) => [module.source, module]),
  );
  for (const source of runtime) {
    if (!modules.has(source))
      errors.push(`Missing runtime graph root: ${source}`);
    if (sha256(readOwned(root, source)) !== sha256(readOwned(core, source)))
      errors.push(`Source/stage mismatch: ${source}`);
    for (const edge of modules.get(source)?.dependencies ?? [])
      if (
        !edge.coreModule &&
        !edge.resolved.startsWith("node_modules/") &&
        !admitted.has(edge.resolved)
      )
        errors.push(`Unshipped dependency: ${source} -> ${edge.resolved}`);
  }
  const exports = metadata.exports ?? {};
  if (typeof exports !== "object" || Array.isArray(exports))
    throw new Error("Unsupported export shape");
  const bins =
    typeof metadata.bin === "string"
      ? [metadata.bin]
      : Object.values(metadata.bin ?? {});
  for (const target of [...bins, ...Object.values(exports)]) {
    if (typeof target !== "string" || target.includes("*"))
      throw new Error("Unsupported entrypoint shape");
    const path = safePath(target.replace(/^\.\//u, ""));
    if (!admitted.has(path)) errors.push(`Unshipped entrypoint: ${path}`);
  }
  return { runtime, errors };
}

/** Reject native policy errors and imports absent from the exact staged npm package. */
export function checkArchitecture(root = repositoryRoot) {
  const before = snapshot(root);
  const graph = captureGraph(root);
  const stage = mkdtempSync(join(tmpdir(), "markdown-quality-architecture-"));
  try {
    const core = join(stage, "core");
    const { metadata, sourceIdentity } = stageCore(root, core);
    const response = JSON.parse(
      npmCommand(["pack", "--dry-run", "--json", "--ignore-scripts"], {
        cwd: core,
      }),
    );
    const records = Array.isArray(response)
      ? response
      : Object.values(response);
    if (
      records.length !== 1 ||
      records[0].name !== metadata.name ||
      records[0].version !== metadata.version
    )
      throw new Error("Wrong core package inventory");
    const shipment = shipmentErrors(
      root,
      core,
      records[0].files,
      graph,
      metadata,
    );
    if (JSON.stringify(before) !== JSON.stringify(snapshot(root)))
      throw new Error("Architecture snapshot drift");
    const violations = graph.summary.violations.filter(
      ({ rule }) => rule.severity === "error",
    );
    const errors = [
      // Native via/cycle evidence is retained instead of inventing a graph path.
      ...violations.map((v) => `${v.rule.name}: ${JSON.stringify(v)}`),
      ...shipment.errors,
    ];
    if (errors.length) throw new Error(errors.join("\n"));
    return {
      runtime: shipment.runtime,
      files: records[0].files,
      sourceIdentity,
      graphDigest: sha256(JSON.stringify(graph)),
    };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
