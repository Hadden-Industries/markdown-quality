// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { npmCommand } from "./commands.js";

const expected = JSON.parse(
  readFileSync(
    new URL("../test/registry-alpha.2.json", import.meta.url),
    "utf8",
  ),
);
const digest = (data) => createHash("sha256").update(data).digest("hex");
const temporary = mkdtempSync(join(tmpdir(), "markdown-quality-registry-"));
const records = [];
const platform = `${process.platform}-${process.arch}`;
assert.ok(["win32-x64", "linux-x64"].includes(platform));
async function acquire(url, maximum) {
  assert.equal(new URL(url).origin, "https://registry.npmjs.org");
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, url);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    assert.ok(total <= maximum, "Registry response exceeded bound");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
try {
  for (const archive of expected.archives) {
    const metadata = JSON.parse(
      await acquire(
        `https://registry.npmjs.org/${encodeURIComponent(archive.package)}/${expected.version}`,
        1048576,
      ),
    );
    assert.equal(metadata.name, archive.package);
    assert.equal(metadata.version, expected.version);
    assert.equal(metadata.publishConfig.access, "public");
    assert.equal(metadata.license, "AGPL-3.0-only");
    assert.equal(metadata.dist.integrity, archive.integrity);
    const bytes = await acquire(metadata.dist.tarball, 20000000);
    assert.equal(digest(bytes), archive.sha256);
    assert.equal(
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      archive.integrity,
    );
    records.push({
      package: archive.package,
      version: expected.version,
      publicAnonymousAcquisition: true,
      sha256: archive.sha256,
      integrity: archive.integrity,
      bytes: bytes.length,
    });
  }
  for (const layout of ["root", "isolated"]) {
    const consumer = join(temporary, layout);
    const install =
      layout === "root" ? consumer : join(consumer, "tooling", "markdown");
    const home = join(temporary, `home-${layout}`);
    mkdirSync(install, { recursive: true });
    mkdirSync(home);
    const config = join(home, "npmrc");
    writeFileSync(
      config,
      "registry=https://registry.npmjs.org/\nignore-scripts=true\naudit=false\nfund=false\n",
    );
    const environment = {};
    for (const name of [
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "TEMP",
      "TMP",
      "PATH",
      "Path",
    ])
      if (process.env[name]) environment[name] = process.env[name];
    Object.assign(environment, {
      HOME: home,
      USERPROFILE: home,
      NPM_CONFIG_USERCONFIG: config,
      NPM_CONFIG_GLOBALCONFIG: join(home, "global-npmrc"),
      NPM_CONFIG_CACHE: join(home, "cache"),
    });
    writeFileSync(environment.NPM_CONFIG_GLOBALCONFIG, "");
    writeFileSync(
      join(install, "package.json"),
      JSON.stringify({
        name: "registry-fixture",
        version: "1.0.0",
        private: true,
        devDependencies: {
          "@hadden-industries/markdown-quality": expected.version,
        },
      }),
    );
    npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: install,
      env: environment,
    });
    const lockBytes = readFileSync(join(install, "package-lock.json"));
    const lock = JSON.parse(lockBytes);
    const active = expected.archives.filter(
      (archive) => archive.name === "core" || archive.name === platform,
    );
    const verifyFiles = () => {
      for (const archive of active) {
        const directory = join(install, "node_modules", archive.package);
        assert.equal(
          lock.packages[`node_modules/${archive.package}`].version,
          expected.version,
        );
        assert.equal(
          lock.packages[`node_modules/${archive.package}`].integrity,
          archive.integrity,
        );
        for (const file of archive.files)
          assert.equal(
            digest(readFileSync(join(directory, file.path))),
            file.sha256,
            `${archive.package}/${file.path}`,
          );
      }
    };
    verifyFiles();
    writeFileSync(
      join(consumer, ".markdown-quality.json"),
      JSON.stringify({
        schemaVersion: 1,
        preset: "authored-gfm@1",
        include: ["*.md"],
      }),
    );
    const document = join(consumer, "a.md");
    const original = "# Heading\n\nAlpha.\nBeta.\n\n`literal  value`\n";
    writeFileSync(document, original);
    const cli = join(
      install,
      "node_modules/@hadden-industries/markdown-quality/src/cli.js",
    );
    const runtimeEnvironment = {
      HTTP_PROXY: "http://127.0.0.1:1",
      HTTPS_PROXY: "http://127.0.0.1:1",
    };
    for (const name of ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"])
      if (process.env[name]) runtimeEnvironment[name] = process.env[name];
    const run = (mode) => {
      const result = spawnSync(
        process.execPath,
        [cli, mode, "--root", consumer, "--json"],
        {
          cwd: temporary,
          env: runtimeEnvironment,
          timeout: 30000,
          maxBuffer: 1048576,
          encoding: "utf8",
          windowsHide: true,
        },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.package.version, expected.version);
      assert.equal(report.outcome, "clean");
      return report;
    };
    const checked = run("check");
    assert.deepEqual(checked.selection.files, ["a.md"]);
    assert.equal(readFileSync(document, "utf8"), original);
    run("format");
    assert.equal(readFileSync(document, "utf8"), original);
    assert.deepEqual(run("format").written, []);
    npmCommand(
      ["ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"],
      { cwd: install, env: environment },
    );
    assert.deepEqual(
      readFileSync(join(install, "package-lock.json")),
      lockBytes,
    );
    verifyFiles();
    run("check");
    records.push({
      layout,
      platform,
      installedVersion: expected.version,
      allInstalledFileHashesVerified: true,
      lockSha256: digest(lockBytes),
      lifecycleScripts: "disabled",
      anonymousFreshCacheInstall: true,
      offlineFrozenLockReinstall: true,
      credentialFreeOfflineRuntime: true,
      unchangedDocumentAndConvergentFormatting: true,
    });
  }
  const report = {
    schemaVersion: 1,
    candidate: expected.source,
    version: expected.version,
    platform,
    passed: true,
    observedAt: new Date().toISOString(),
    provenanceAttestation: "not-issued by local bootstrap",
    records,
  };
  if (process.argv.length > 2)
    writeFileSync(
      resolve(process.argv[2]),
      JSON.stringify(report, null, 2) + "\n",
      { flag: "wx" },
    );
  process.stdout.write(JSON.stringify(report) + "\n");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
