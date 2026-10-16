// SPDX-License-Identifier: AGPL-3.0-only
import {
  cpSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  lstatSync,
} from "node:fs";
import { join } from "node:path";
import { stageBundledDependencies } from "./bundled-dependencies.js";
import {
  readOwned,
  safePath,
  sha256,
  limits,
  git,
} from "./dependency-graph.js";

/** Construct the same core consumed by npm packing and shipment inspection. */
export function stageCore(root, core) {
  const metadata = JSON.parse(readOwned(root, "package.json"));
  const manifest = JSON.parse(readOwned(root, "assets/tool-manifest.json"));
  let entries = 0,
    bytes = 0;
  function admit(path) {
    safePath(path);
    let target = root;
    for (const part of path.split("/")) {
      target = join(target, part);
      if (lstatSync(target).isSymbolicLink())
        throw new Error("Linked core stage input");
    }
    if (++entries > limits.files) throw new Error("Core stage entry limit");
    // readOwned rejects redirects; directory iteration below rejects links too.
    const absolute = join(root, path);
    const parent = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/"))
      : "";
    const name = path.slice(parent.length ? parent.length + 1 : 0);
    const entry = readdirSync(join(root, parent), { withFileTypes: true }).find(
      (e) => e.name === name,
    );
    if (!entry || entry.isSymbolicLink())
      throw new Error("Unsafe core stage input");
    if (entry.isDirectory())
      for (const child of readdirSync(absolute)) admit(`${path}/${child}`);
    else {
      bytes += readOwned(root, path).length;
      if (bytes > limits.bytes) throw new Error("Core stage byte limit");
    }
  }
  for (const path of metadata.files) admit(path);
  mkdirSync(core);
  for (const path of metadata.files)
    cpSync(join(root, path), join(core, path), { recursive: true });
  // Preserve unknown-on-failure identity semantics while sharing host Git binding.
  const observeGit = (args) => {
    try {
      return git(root, args).trim();
    } catch {
      return null;
    }
  };
  const head = observeGit(["rev-parse", "HEAD"]),
    tree = observeGit(["rev-parse", "HEAD^{tree}"]),
    status = observeGit(["status", "--porcelain=v1", "--untracked-files=all"]);
  const sourceIdentity = {
    head,
    tree,
    clean: status === null ? null : status.length === 0,
    lockSha256: sha256(readOwned(root, "package-lock.json")),
  };
  writeFileSync(
    join(core, "assets/source-identity.json"),
    JSON.stringify(sourceIdentity, null, 2) + "\n",
  );
  const publishable = { ...metadata };
  delete publishable.scripts;
  publishable.optionalDependencies = Object.fromEntries(
    Object.values(manifest.platforms).map((spec) => [
      spec.package,
      metadata.version,
    ]),
  );
  stageBundledDependencies(root, core, publishable);
  writeFileSync(
    join(core, "package.json"),
    JSON.stringify(publishable, null, 2) + "\n",
  );
  return { metadata: publishable, sourceIdentity };
}
