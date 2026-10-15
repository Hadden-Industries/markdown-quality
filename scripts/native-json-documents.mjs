// SPDX-License-Identifier: AGPL-3.0-only
/** Native storage admission supplies original buffers; the shared engine owns quality. */
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repositoryPython } from "./python-target.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export function provideRepositoryJson({ root }) {
  if (resolve(root) !== resolve(repositoryRoot))
    throw new Error("Native repository context differs.");
  const result = spawnSync(
    repositoryPython(root),
    ["-I", "-B", join(root, "scripts/collect-json-documents.py")],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "Native JSON admission failed: " +
        (result.stderr || result.error?.message),
    );
  const admitted = JSON.parse(result.stdout);
  return {
    ...admitted,
    documents: admitted.documents.map(({ path, base64 }) => ({
      path,
      bytes: Buffer.from(base64, "base64"),
    })),
  };
}
