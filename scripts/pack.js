// SPDX-License-Identifier: AGPL-3.0-only
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { npmCommand } from "./commands.js";
import { digest, metadata } from "../src/contracts.js";
import { manifest } from "../src/native-tool.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export function packRelease(output) {
  if (
    digest(readFileSync(join(root, "LICENSE"))) !==
    "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef"
  )
    throw new Error("Original license identity changed");
  if (
    manifest.build?.rightsSupplementSha256 &&
    digest(readFileSync(join(root, "assets/native-rights.json"))) !==
      manifest.build.rightsSupplementSha256
  )
    throw new Error("Native rights supplement identity mismatch");
  for (const [key, spec] of Object.entries(manifest.platforms)) {
    const directory = join(root, "packages", key);
    const pkg = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    if (
      pkg.name !== spec.package ||
      pkg.version !== metadata.version ||
      digest(readFileSync(join(directory, spec.executable))) !== spec.sha256
    )
      throw new Error("Native package identity mismatch: " + key);
    for (const [name, hash] of Object.entries(spec.files ?? {})) {
      const path =
        name === spec.executable.split("/").at(-1) ? spec.executable : name;
      if (digest(readFileSync(join(directory, path))) !== hash)
        throw new Error("Native rights evidence identity mismatch: " + key);
    }
    if (manifest.build?.rightsSupplement) {
      const component = JSON.parse(
        readFileSync(join(directory, "component.json"), "utf8"),
      );
      if (JSON.stringify(component.build) !== JSON.stringify(manifest.build))
        throw new Error("Native repack rights supplement mismatch: " + key);
    }
  }
  output = resolve(output);
  mkdirSync(output, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), "markdown-quality-pack-"));
  try {
    const core = join(stage, "core");
    mkdirSync(core);
    for (const path of metadata.files)
      cpSync(join(root, path), join(core, path), { recursive: true });
    const publishable = { ...metadata };
    delete publishable.scripts;
    publishable.optionalDependencies = Object.fromEntries(
      Object.values(manifest.platforms).map((spec) => [
        spec.package,
        metadata.version,
      ]),
    );
    writeFileSync(
      join(core, "package.json"),
      JSON.stringify(publishable, null, 2) + "\n",
    );
    const archives = [];
    for (const [name, cwd] of [
      ...Object.keys(manifest.platforms).map((key) => [
        key,
        join(root, "packages", key),
      ]),
      ["core", core],
    ]) {
      const response = JSON.parse(
        npmCommand(
          ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
          { cwd },
        ),
      );
      const records = Array.isArray(response)
        ? response
        : Object.values(response);
      if (
        records.length !== 1 ||
        typeof records[0]?.filename !== "string" ||
        !Array.isArray(records[0]?.files)
      )
        throw new Error("Unexpected npm pack response");
      const [pack] = records;
      const path = join(output, pack.filename);
      let executableMode = null;
      if (name === "linux-x64") {
        const spec = manifest.platforms[name];
        const normalized = spawnSync(
          "python",
          [
            join(root, "scripts/package-archive.py"),
            path,
            "package/" + spec.executable,
            spec.sha256,
          ],
          {
            encoding: "utf8",
            timeout: 30000,
            maxBuffer: 1048576,
            windowsHide: true,
          },
        );
        if (normalized.error || normalized.status !== 0)
          throw new Error(
            "Native package executable mode qualification failed: " +
              (normalized.stderr ?? "").slice(0, 2000),
          );
        executableMode = JSON.parse(normalized.stdout);
        if (
          executableMode.sha256 !== digest(readFileSync(path)) ||
          executableMode.mode !== "0o755" ||
          executableMode.allMemberBytesPreserved !== true
        )
          throw new Error("Native package mode evidence mismatch");
      }
      archives.push({
        name,
        package: pack.name,
        version: pack.version,
        filename: pack.filename,
        sha256: digest(readFileSync(path)),
        integrity:
          "sha512-" +
          createHash("sha512").update(readFileSync(path)).digest("base64"),
        executableMode,
        files: pack.files.map((f) => ({
          path: f.path,
          size: f.size,
          sha256: digest(readFileSync(join(cwd, f.path))),
        })),
      });
    }
    const sbom = JSON.parse(
      npmCommand(
        [
          "sbom",
          "--sbom-format",
          "cyclonedx",
          "--package-lock-only",
          "--omit=dev",
        ],
        { cwd: root },
      ),
    );
    const sbomBytes = JSON.stringify(sbom, null, 2) + "\n";
    writeFileSync(join(output, "source-sbom.cdx.json"), sbomBytes);
    const head = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
    const status = spawnSync(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      { cwd: root, encoding: "utf8", timeout: 10_000, windowsHide: true },
    );
    const inventory = {
      schemaVersion: 1,
      version: metadata.version,
      sourcePackageDigest: digest(readFileSync(join(root, "package.json"))),
      source: {
        head: head.status === 0 ? head.stdout.trim() : null,
        clean: status.status === 0 ? status.stdout.length === 0 : null,
        lockSha256: digest(readFileSync(join(root, "package-lock.json"))),
      },
      build: {
        node: process.version,
        npm: npmCommand(["--version"]).trim(),
        platform: process.platform,
        arch: process.arch,
        lifecycleScripts: "disabled",
        attestation: "not-issued",
      },
      sbom: {
        filename: "source-sbom.cdx.json",
        sha256: digest(Buffer.from(sbomBytes)),
        format: sbom.bomFormat,
        specVersion: sbom.specVersion,
        coverage:
          "source npm lock graph; compiled native components not covered",
      },
      native: manifest,
      nativeRights:
        manifest.build?.rights ??
        "pending complete compiled-component inventory",
      archives,
      registry: "not-published",
    };
    writeFileSync(
      join(output, "release-manifest.json"),
      JSON.stringify(inventory, null, 2) + "\n",
    );
    return inventory;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3)
    throw new Error("Usage: node scripts/pack.js OUTPUT_DIRECTORY");
  process.stdout.write(JSON.stringify(packRelease(process.argv[2])) + "\n");
}
