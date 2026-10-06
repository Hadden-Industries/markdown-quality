// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  repository,
  regularBytes,
  readJson,
  releaseNames,
  verifyPayloads,
  verifyBundle,
} from "./release-assets.js";
import { native, gitSource } from "./github-release.js";

export function prepareGithubRelease(qualified, input, output, cwd) {
  const names = releaseNames(qualified);
  const sourceName = `markdown-quality-${qualified.version}-source.tar`;
  const materialPaths = {
    "native-build.json": "assets/native-build.json",
    "native-rights.json": "assets/native-rights.json",
    "tool-manifest.json": "assets/tool-manifest.json",
    LICENSE: "LICENSE",
    "THIRD-PARTY-NOTICES.md": "THIRD-PARTY-NOTICES.md",
  };
  const source = gitSource(qualified, cwd);
  // Exclusive output; interruption leaves a visible stage, never overwrites it.
  mkdirSync(output);
  for (const name of names) {
    const bytes =
      name === sourceName
        ? source
        : materialPaths[name]
          ? native(
              "git",
              ["show", `${qualified.source}:${materialPaths[name]}`],
              { cwd, encoding: null },
            )
          : regularBytes(join(input, name));
    writeFileSync(join(output, name), bytes, { flag: "wx" });
  }
  const payloads = verifyPayloads(qualified, output, source);
  writeFileSync(
    join(output, "release-evidence-manifest.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        repository,
        version: qualified.version,
        tag: `v${qualified.version}`,
        source: qualified.source,
        native: qualified.native,
        candidate: qualified.candidate,
        publication: qualified.publication,
        origins: qualified.origins,
        payloads,
        scope:
          "Immutable archival of the qualified pilot tuple; stable promotion requires separate exact pilot and recovery acceptance.",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  return verifyBundle(qualified, output, source);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: node scripts/prepare-github-release.js QUALIFICATION_JSON INPUT_DIR NEW_BUNDLE_DIR",
  );
  const assets = prepareGithubRelease(
    readJson(resolve(process.argv[2])),
    resolve(process.argv[3]),
    resolve(process.argv[4]),
    fileURLToPath(new URL("../", import.meta.url)),
  );
  process.stdout.write(JSON.stringify(assets) + "\n");
}
