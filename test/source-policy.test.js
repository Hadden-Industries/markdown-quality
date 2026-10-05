// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
function git(directory, ...args) {
  return execFileSync("git", ["-C", directory, ...args], {
    windowsHide: true,
    timeout: 10000,
  });
}
function violations(directory) {
  const records = git(directory, "ls-files", "--eol", "-z")
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  return records.flatMap((record) => {
    const separator = record.indexOf("\t");
    assert.ok(separator >= 0, "Git EOL record must have a path separator");
    const fields = record.slice(0, separator).trim().split(/\s+/u);
    if (fields[2] === "attr/-text") return [];
    const offending = fields
      .slice(0, 2)
      .filter((field) => /\/(?:crlf|mixed)$/u.test(field));
    return offending.length
      ? [{ path: record.slice(separator + 1), offending }]
      : [];
  });
}

test("first-party tracked inputs have LF bytes before provenance hashing", () => {
  assert.deepEqual(violations(root), []);
});

test("native Git fixture rejects checkout drift while preserving upstream licence bytes", () => {
  const directory = mkdtempSync(join(tmpdir(), "markdown-quality-eol-"));
  git(directory, "init", "--quiet");
  git(directory, "config", "core.autocrlf", "false");
  writeFileSync(
    join(directory, ".gitattributes"),
    "* text=auto eol=lf\nthird-party/** -text !eol\n",
  );
  mkdirSync(join(directory, "third-party"));
  const upstream = Buffer.from("Original copyright\r\nOriginal licence\r\n");
  writeFileSync(join(directory, "third-party/LICENSE"), upstream);
  writeFileSync(join(directory, "binary.bin"), Buffer.from([0, 13, 10, 255]));
  writeFileSync(join(directory, "lf.json"), '{"x":1}\n');
  const paths = ["crlf.json", "mixed.json", "space-é.json"];
  if (process.platform !== "win32") paths.push("tab\tname.json");
  for (const path of paths) {
    writeFileSync(
      join(directory, path),
      path === "mixed.json" ? "first\nsecond\r\n" : "first\r\nsecond\r\n",
    );
  }
  git(directory, "add", "--all");
  const observed = violations(directory);
  assert.deepEqual(observed.map((item) => item.path).sort(), [...paths].sort());
  assert.ok(
    observed.every((item) =>
      item.offending.every((field) => field.startsWith("w/")),
    ),
  );
  assert.deepEqual(
    git(directory, "show", ":crlf.json"),
    Buffer.from("first\nsecond\n"),
  );
  assert.deepEqual(git(directory, "show", ":third-party/LICENSE"), upstream);
  assert.deepEqual(
    readFileSync(join(directory, "third-party/LICENSE")),
    upstream,
  );
  for (const path of paths) {
    writeFileSync(
      join(directory, path),
      readFileSync(join(directory, path), "utf8").replaceAll("\r\n", "\n"),
    );
  }
  assert.deepEqual(violations(directory), []);
  // A committed CRLF blob is also rejected even after its working copy becomes LF.
  git(directory, "config", "core.autocrlf", "false");
  writeFileSync(
    join(directory, ".gitattributes"),
    "third-party/** -text !eol\n",
  );
  writeFileSync(join(directory, "crlf.json"), "first\r\nsecond\r\n");
  git(directory, "add", "--all");
  writeFileSync(join(directory, "crlf.json"), "first\nsecond\n");
  assert.deepEqual(violations(directory), [
    { path: "crlf.json", offending: ["i/crlf"] },
  ]);
});
