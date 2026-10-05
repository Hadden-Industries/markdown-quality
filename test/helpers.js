// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
export function consumer(t, files = {}, config = {}) {
  const root = mkdtempSync(join(tmpdir(), "markdown-quality-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({
      schemaVersion: 1,
      preset: "authored-gfm@1",
      include: ["**/*.md"],
      ...config,
    }),
  );
  for (const [path, bytes] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
  }
  return root;
}
