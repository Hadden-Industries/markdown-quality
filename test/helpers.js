// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

// Ordinary fixture commands need scheduling headroom on busy hosted runners.
// Tests of deadline enforcement keep their own deliberately short limits.
export const fixtureCommandTimeoutMs = 60_000;

// The exports option arrived in Node 24.15; earlier Node 24 and Node 22 use
// namedExports. See https://nodejs.org/docs/v24.15.0/api/test.html#mockmodulespecifier-options.
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
export const moduleMockExportOption =
  nodeMajor === 22 || (nodeMajor === 24 && nodeMinor < 15)
    ? "namedExports"
    : "exports";

export function consumer(t, files = {}, config = {}) {
  const root = mkdtempSync(join(tmpdir(), "markdown-quality-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({
      schemaVersion: 2,
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
