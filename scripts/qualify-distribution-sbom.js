// SPDX-License-Identifier: AGPL-3.0-only
/** Compose native inventories of exact package bytes; native CycloneDX owns schema validation. */
import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir, homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCliPath } from "./commands.js";
import { native } from "./commands.js";
import { hash, readJson } from "./release-assets.js";
import { verifyArchiveBytes } from "./release-bytes.js";
import {
  bindNativeSbom,
  reconcileMergedSbom,
  verifyRecipientSbom,
} from "./distribution-sbom.js";

const tools = readJson(new URL("./release-sbom-tools.json", import.meta.url));
const pacote = createRequire(npmCliPath())("pacote");

/** Obtain exact reviewed release assets with gh; never run a downloaded install script. */
function acquireTools(scratch) {
  const platform = `${process.platform}-${process.arch}`;
  assert.ok(["win32-x64", "linux-x64"].includes(platform));
  const result = {};
  for (const name of ["syft", "cyclonedx"]) {
    const tool = tools[name],
      asset = tool[platform];
    const directory = join(scratch, name);
    mkdirSync(directory);
    native("gh", [
      "release",
      "download",
      tool.tag,
      "--repo",
      tool.repository,
      "--pattern",
      asset.asset,
      "--dir",
      directory,
    ]);
    const path = join(directory, asset.asset);
    assert.equal(
      hash(readFileSync(path)),
      asset.sha256,
      "SBOM tool asset digest mismatch",
    );
    if (name === "syft")
      native("tar", ["-xf", path, "-C", directory, asset.executable]);
    const executable = join(directory, asset.executable);
    if (process.platform !== "win32") chmodSync(executable, 0o755);
    const version = native(executable, [
      name === "syft" ? "version" : "--version",
    ]);
    assert.ok(
      version.includes(tool.tag.slice(1)) && version.includes(tool.source),
      "SBOM tool identity mismatch",
    );
    result[name] = {
      executable,
      version,
      executableSha256: hash(readFileSync(executable)),
    };
  }
  return result;
}

/** Verify complete extracted membership against the packer's independently retained inventory. */
function verifyExtractedArchive(root, archive) {
  const files = [];
  const walk = (relative) => {
    const path = join(root, relative),
      stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), "Linked extracted release member");
    if (stat.isDirectory())
      for (const name of readdirSync(path))
        walk(relative ? `${relative}/${name}` : name);
    else {
      assert.ok(stat.isFile());
      files.push({
        path: relative,
        size: stat.size,
        sha256: hash(readFileSync(path)),
      });
    }
  };
  walk("");
  assert.deepEqual(
    files.sort((a, b) => a.path.localeCompare(b.path)),
    archive.files
      .map(({ path, size, sha256 }) => ({ path, size, sha256 }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  );
}

/** Generate the three package inventories and preserve separately scoped recipient resolutions. */
export async function qualifyDistributionSbom(
  directory,
  output,
  recipientDirectory,
) {
  const manifestBytes = readFileSync(join(directory, "release-manifest.json"));
  const release = JSON.parse(manifestBytes);
  assert.equal(release.archives.length, 3);
  mkdirSync(output);
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-distribution-"));
  try {
    const acquired = acquireTools(scratch);
    const validate = (path, version = "v1_7") =>
      native(acquired.cyclonedx.executable, [
        "validate",
        "--input-file",
        path,
        "--input-version",
        version,
        "--fail-on-errors",
      ]);
    const inputs = [];
    const coverage = [];
    for (const archive of release.archives) {
      assert.ok(["win32-x64", "linux-x64", "core"].includes(archive.name));
      const tarball = resolve(directory, archive.filename);
      verifyArchiveBytes(readFileSync(tarball), archive);
      const extracted = join(scratch, `package-${archive.name}`);
      await pacote.extract(tarball, extracted, {
        ignoreScripts: true,
        cache: join(scratch, "npm-cache"),
      });
      verifyExtractedArchive(extracted, archive);
      const raw = join(scratch, `${archive.name}-native.cdx.json`);
      native(
        acquired.syft.executable,
        [
          "scan",
          `dir:${extracted}`,
          ...(archive.name === "core"
            ? ["--select-catalogers", "+javascript-package-cataloger"]
            : []),
          "--source-name",
          archive.package,
          "--source-version",
          release.version,
          "-o",
          `cyclonedx-json@1.7=${raw}`,
        ],
        { env: { ...process.env, SYFT_CHECK_FOR_APP_UPDATE: "false" } },
      );
      validate(raw);
      let bom = readJson(raw);
      if (archive.name === "core") {
        Object.assign(bom.metadata.component, {
          type: "application",
          name: archive.package,
          version: archive.version,
          hashes: [{ alg: "SHA-256", content: archive.sha256 }],
          licenses: [{ expression: "AGPL-3.0-only" }],
        });
        for (const component of bom.components) {
          if (component.type === "file") {
            const metadata = archive.files.find(
              ({ path }) => path === "package.json",
            );
            assert.ok(
              metadata &&
                component.hashes.some(
                  ({ alg, content }) =>
                    alg === "SHA-256" && content === metadata.sha256,
                ),
              "Unmapped core file component",
            );
            component.name = "package/package.json";
          } else {
            assert.equal(
              component.name,
              archive.package,
              "Unexplained bundled component in core scan",
            );
            assert.equal(component.version, archive.version);
          }
        }
        bom.metadata.component.properties = [
          {
            name: "markdown-quality:coverage",
            value:
              "Files shipped in the core archive. External npm dependencies are described separately as observed consumer resolutions, not bundled code or all future compatible resolutions.",
          },
        ];
      } else {
        // Use only the native binary catalog for native coverage; package metadata
        // is supplied from the admitted npm archive below, not guessed by Syft.
        const embedded = readJson(
          join(extracted, "embedded-dependencies.json"),
        );
        bom = bindNativeSbom(bom, {
          archive,
          native: release.native,
          embedded,
          inventory: readJson(join(extracted, "component-inventory.json")),
          build: readJson(join(extracted, "build-evidence.json")),
        });
        coverage.push({
          platform: archive.name,
          runtimeCrates: embedded.packages.filter(
            (component) => component.kind !== "build",
          ).length,
          executableSha256: release.native.platforms[archive.name].sha256,
        });
      }
      const path = join(output, `${archive.name}-distribution.cdx.json`);
      const encoded = JSON.stringify(bom, null, 2) + "\n";
      // An unhandled absolute source path is a coverage/privacy defect, not
      // permission to strip arbitrary fields from scanner output.
      for (const privatePath of [scratch, homedir()]) {
        const posix = privatePath.replaceAll("\\", "/");
        for (const representation of [
          posix,
          posix.replace(
            /^([A-Za-z]):/u,
            (_, drive) => `/${drive.toLowerCase()}`,
          ),
          JSON.stringify(privatePath).slice(1, -1),
        ])
          assert.ok(
            !encoded.includes(representation),
            "Unmapped private path in distribution SBOM",
          );
      }
      writeFileSync(path, encoded, { flag: "wx" });
      validate(path);
      inputs.push(path);
    }
    const merged = join(output, "distribution-sbom.cdx.json");
    native(acquired.cyclonedx.executable, [
      "merge",
      "--input-files",
      ...inputs,
      "--output-file",
      merged,
      "--output-format",
      "json",
      "--output-version",
      "v1_7",
      "--hierarchical",
      "--group",
      "Hadden-Industries",
      "--name",
      "markdown-quality-distribution",
      "--version",
      release.version,
    ]);
    reconcileMergedSbom(
      readJson(merged),
      inputs.map((path) => readJson(path)),
    );
    const validation = validate(merged);
    writeFileSync(join(output, "cyclonedx-validation.txt"), validation, {
      flag: "wx",
    });
    for (const platform of ["windows-latest", "ubuntu-24.04"]) {
      for (const layout of ["root", "isolated"]) {
        const source = join(
          recipientDirectory,
          `recipient-${platform}`,
          `${layout}-sbom.cdx.json`,
        );
        validate(source, "v1_5");
        verifyRecipientSbom(
          readJson(source),
          release,
          platform === "windows-latest" ? "win32-x64" : "linux-x64",
        );
        copyFileSync(
          source,
          join(output, `consumer-${platform}-${layout}.cdx.json`),
        );
      }
    }
    const payloads = readdirSync(output)
      .sort()
      .map((name) => ({
        name,
        sha256: hash(readFileSync(join(output, name))),
      }));
    const evidence = {
      schemaVersion: 1,
      source: release.source.head,
      version: release.version,
      manifestSha256: hash(manifestBytes),
      coverage,
      tools: Object.fromEntries(
        Object.entries(acquired).map(([name, tool]) => [
          name,
          {
            ...tools[name],
            version: tool.version,
            executableSha256: tool.executableSha256,
          },
        ]),
      ),
      payloads,
      scope:
        "Distribution inventories describe shipped archives and embedded runtime crates. Separate consumer SBOMs describe one observed lock resolution per tested layout/platform. Host OS libraries and future semver resolutions are outside those inventories.",
    };
    writeFileSync(
      join(output, "distribution-evidence.json"),
      JSON.stringify(evidence, null, 2) + "\n",
      { flag: "wx" },
    );
    return evidence;
  } finally {
    // mkdtemp owns this exact disposable tree; no caller-provided deletion target.
    assert.ok(
      scratch.startsWith(join(tmpdir(), "markdown-quality-distribution-")),
    );
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(
    [4, 5].includes(process.argv.length),
    "Usage: qualify-distribution-sbom.js ARCHIVES NEW_OUTPUT_DIRECTORY [RECIPIENT_DIRECTORY]",
  );
  await qualifyDistributionSbom(
    resolve(process.argv[2]),
    resolve(process.argv[3]),
    resolve(process.argv[4] ?? "recipient-security"),
  );
}
