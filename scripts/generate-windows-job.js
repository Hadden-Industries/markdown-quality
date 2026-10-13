// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const start = "# BEGIN GENERATED WINDOWS JOB\n";
const end = "# END GENERATED WINDOWS JOB\n";
const targets = [
  "assets/qualification/observe.py",
  "scripts/qualify-performance.py",
];
export function embedWindowsJob(target, source) {
  assert.equal(
    target.split(start).length,
    2,
    "Missing or duplicate Windows start marker",
  );
  assert.equal(
    target.split(end).length,
    2,
    "Missing or duplicate Windows end marker",
  );
  const begin = target.indexOf(start) + start.length,
    finish = target.indexOf(end);
  assert.ok(finish >= begin, "Reversed Windows markers");
  return (
    target.slice(0, begin) + source.trimEnd() + "\n" + target.slice(finish)
  );
}
function project(write = false) {
  const source = readFileSync(
    new URL("./windows-job-source.py", import.meta.url),
    "utf8",
  ).replaceAll("\r\n", "\n");
  for (const path of targets) {
    const url = new URL("../" + path, import.meta.url);
    const actual = readFileSync(url, "utf8").replaceAll("\r\n", "\n");
    const expected = embedWindowsJob(actual, source);
    if (write) writeFileSync(url, expected);
    else assert.equal(actual, expected, `Stale embedded Windows Job: ${path}`);
  }
}
export const checkWindowsJob = () => project();
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3);
  if (process.argv[2] === "--check") checkWindowsJob();
  else {
    assert.equal(process.argv[2], "--write");
    project(true);
  }
}
