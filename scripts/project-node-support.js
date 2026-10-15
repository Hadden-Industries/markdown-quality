// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nodeSupport, validatePolicy } from "./node-matrix.js";

/** Project current declarations only; historical evidence and synthetic policies stay frozen. */
export function projectNodeSupport(files, policy = nodeSupport) {
  validatePolicy(policy);
  const range = policy.minimums.map((minimum) => `^${minimum}`).join(" || ");
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => {
      if (path === "package.json" || path === "package-lock.json") {
        const value = JSON.parse(source);
        const metadata = path === "package.json" ? value : value.packages[""];
        metadata.engines.node = range;
        return [path, JSON.stringify(value, null, 2) + "\n"];
      }
      if (path === ".github/bootstrap-node.json")
        return [
          path,
          JSON.stringify({ version: policy.reference }, null, 2) + "\n",
        ];
      if (path === "docs/node-runtime-compatibility.md") {
        const start = "<!-- node-support:start -->";
        const end = "<!-- node-support:end -->";
        assert.equal(source.split(start).length, 2);
        assert.equal(source.split(end).length, 2);
        const block = [
          start,
          "",
          ...policy.minimums.map(
            (minimum) => `- Node ${minimum.split(".")[0]}: ${minimum}`,
          ),
          "",
          `Development/release reference: ${policy.reference}.`,
          "",
          end,
        ].join("\n");
        const before = source.indexOf(start);
        const after = source.indexOf(end);
        assert.ok(after > before);
        return [
          path,
          source.slice(0, before) + block + source.slice(after + end.length),
        ];
      }
      assert.match(path, /^\.github\/workflows\/[^/]+\.yml$/u);
      // Narrow scalar projection: matrix/profile expressions and every other byte stay intact.
      return [
        path,
        source.replace(
          /^(\s+node-version: )(\d+\.\d+\.\d+|"\d+\.\d+\.\d+"|'\d+\.\d+\.\d+')([ \t]*(?:#.*)?)$/gmu,
          (_, prefix, scalar, suffix) => {
            const quote = ["'", '"'].includes(scalar[0]) ? scalar[0] : "";
            return `${prefix}${quote}${policy.reference}${quote}${suffix}`;
          },
        ),
      ];
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  const mode = process.argv[2];
  assert.ok(["--check", "--write"].includes(mode));
  const root = new URL("../", import.meta.url);
  const paths = [
    "package.json",
    "package-lock.json",
    ".github/bootstrap-node.json",
    "docs/node-runtime-compatibility.md",
    ...readdirSync(new URL(".github/workflows/", root))
      .filter((path) => path.endsWith(".yml"))
      .map((path) => `.github/workflows/${path}`),
  ];
  const files = Object.fromEntries(
    paths.map((path) => [path, readFileSync(new URL(path, root), "utf8")]),
  );
  const projected = projectNodeSupport(files);
  const drift = paths.filter((path) => projected[path] !== files[path]);
  if (mode === "--write")
    for (const path of drift)
      writeFileSync(new URL(path, root), projected[path]);
  console.log(JSON.stringify({ mode, drift }));
  if (mode === "--check" && drift.length) process.exitCode = 1;
}
