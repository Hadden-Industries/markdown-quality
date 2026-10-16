// SPDX-License-Identifier: AGPL-3.0-only
/** Stage one frozen archive; the registry's owner approval remains a separate action. */
import { npmCommand } from "./commands.js";
import assert from "node:assert/strict";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseBytes, verifyArchiveBytes } from "./release-bytes.js";
import { publicationContext } from "./publication-context.js";
import { preparePublicationEnvironment } from "./prepare-publication-environment.js";
import { createHash } from "node:crypto";

/** Persist intent before a single native request; any ambiguous result forbids replay. */
export function stageReleaseArchive({
  archive,
  path,
  journalDirectory,
  origin,
  command = npmCommand,
}) {
  verifyArchiveBytes(releaseBytes(path, 20_000_000), archive);
  assert.ok(["win32-x64", "linux-x64", "core"].includes(archive.name));
  assert.equal(
    archive.package,
    "@hadden-industries/markdown-quality" +
      (archive.name === "core" ? "" : `-${archive.name}`),
  );
  assert.match(archive.version, /^[1-9]\d*\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u);
  assert.match(origin.source, /^[a-f0-9]{40}$/u);
  for (const value of [origin.run, origin.attempt])
    assert.match(String(value), /^[1-9]\d{0,15}$/u);
  mkdirSync(journalDirectory, { recursive: true });
  const journal = join(journalDirectory, `${archive.name}.jsonl`);
  const subject = {
    package: archive.package,
    version: archive.version,
    sha256: archive.sha256,
    integrity: archive.integrity,
    tag: "pilot",
    origin,
  };
  // Exclusive creation prevents an Actions rerun from replaying a local request.
  // A new run must additionally reconcile the prior provider step and origin map.
  writeFileSync(
    journal,
    JSON.stringify({ state: "attempted", ...subject }) + "\n",
    { flag: "wx", flush: true },
  );
  try {
    const raw = command([
      "stage",
      "publish",
      path,
      "--ignore-scripts",
      "--access=public",
      "--tag=pilot",
      "--provenance",
      "--json",
      "--registry=https://registry.npmjs.org/",
    ]);
    writeFileSync(join(journalDirectory, `${archive.name}-npm.json`), raw, {
      flag: "wx",
    });
    const response = JSON.parse(raw);
    assert.deepEqual(Object.keys(response), [archive.package]);
    const staged = response[archive.package];
    assert.equal(staged.name, archive.package);
    assert.equal(staged.version, archive.version);
    assert.equal(staged.integrity, archive.integrity);
    assert.ok(
      typeof staged.stageId === "string" &&
        staged.stageId.length > 0 &&
        staged.stageId.length <= 256 &&
        !/[\r\n]/u.test(staged.stageId),
      "npm did not return an inspectable stage identity",
    );
    const result = {
      state: "staged-awaiting-owner",
      ...subject,
      stageId: staged.stageId,
    };
    appendFileSync(journal, JSON.stringify(result) + "\n", { flush: true });
    return result;
  } catch (error) {
    appendFileSync(
      journal,
      JSON.stringify({
        state: "outcome-unknown",
        ...subject,
        message:
          "Inspect the retained native response and npm stage inventory; do not repeat this request.",
      }) + "\n",
      { flush: true },
    );
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: stage-release-package.js PLATFORM ARCHIVES JOURNAL_DIRECTORY",
  );
  const [name, directory, journalDirectory] = process.argv.slice(2);
  const manifestBytes = readFileSync(join(directory, "release-manifest.json"));
  const manifestSha = createHash("sha256").update(manifestBytes).digest("hex");
  assert.equal(manifestSha, process.env.MANIFEST_SHA);
  const release = JSON.parse(manifestBytes);
  const map = JSON.parse(
    readFileSync(join(directory, "publication-origins.json")),
  );
  const context = publicationContext(process.env);
  const environment = preparePublicationEnvironment(
    release,
    manifestSha,
    map,
    context,
  );
  assert.equal(
    environment[`STAGE_${name.replaceAll("-", "_").toUpperCase()}`],
    "true",
    "This package is not eligible for this staging phase",
  );
  const archive = release.archives.find((candidate) => candidate.name === name);
  const result = stageReleaseArchive({
    archive,
    path: resolve(directory, archive.filename),
    journalDirectory,
    origin: map.records.find((record) => record.package === archive.package),
  });
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Staged ${result.package}@${result.version} under pilot. Review the retained stage identity and exact archive integrity, then approve through npm with 2FA. Public availability has not been established.\n`,
    );
}
