// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { npmCommand } from "./commands.js";
import { parseArgs } from "node:util";
import { verifyReleaseProvenance } from "./provenance.js";
import { validatePublicationOrigins } from "./publication-origins.js";
import { waitForRegistryIntegrity } from "./wait-registry-integrity.js";

const { values, positionals } = parseArgs({
  options: {
    manifest: { type: "string" },
    archives: { type: "string" },
    provenance: { type: "boolean", default: false },
    "publication-run": { type: "string" },
    "publication-attempt": { type: "string" },
    "publication-source": { type: "string" },
    "publication-origins": { type: "string" },
    "recovery-run": { type: "string" },
    "recovery-attempt": { type: "string" },
    "recovery-origins-sha256": { type: "string" },
    "retained-only": { type: "boolean", default: false },
    "native-only": { type: "boolean", default: false },
  },
  allowPositionals: true,
});
assert.ok(positionals.length <= 1);
function boundedFile(path, maximum) {
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= maximum);
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= maximum);
  return bytes;
}
const manifestBytes = boundedFile(
  values.manifest
    ? resolve(values.manifest)
    : new URL("../test/registry-alpha.4.json", import.meta.url),
  1_048_576,
);
const expected = JSON.parse(manifestBytes);
const source =
  typeof expected.source === "string" ? expected.source : expected.source.head;
assert.match(source, /^[a-f0-9]{40}$/u);
assert.match(
  expected.version,
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-alpha\.(?:0|[1-9]\d*))?$/u,
);
const archives = values.archives ? resolve(values.archives) : null;
const digest = (data) => createHash("sha256").update(data).digest("hex");
const publicationOrigins = values["publication-origins"]
  ? validatePublicationOrigins(
      JSON.parse(
        boundedFile(resolve(values["publication-origins"]), 1_048_576),
      ),
      {
        version: expected.version,
        artifactSource: source,
        manifestSha: digest(manifestBytes),
        candidateRun: String(process.env.CANDIDATE_RUN),
        controlSource: values["publication-source"],
        run: values["publication-run"],
        attempt: values["publication-attempt"],
        recovery: values["recovery-run"]
          ? {
              run: values["recovery-run"],
              attempt: values["recovery-attempt"],
              originsSha256: values["recovery-origins-sha256"] ?? "",
            }
          : null,
      },
      expected.archives,
    )
  : null;
assert.ok(
  !values["retained-only"] ||
    (values.provenance && publicationOrigins?.recovery),
);
assert.ok(!values["native-only"] || (values.provenance && publicationOrigins));
assert.ok(!(values["retained-only"] && values["native-only"]));
assert.ok(
  values["recovery-run"] ||
    (!values["recovery-attempt"] && !values["recovery-origins-sha256"]),
);
if (publicationOrigins) {
  assert.deepEqual(
    expected.archives.map((a) => a.name),
    ["win32-x64", "linux-x64", "core"],
  );
  assert.deepEqual(
    expected.archives.map((a) => a.package),
    [
      "@hadden-industries/markdown-quality-win32-x64",
      "@hadden-industries/markdown-quality-linux-x64",
      "@hadden-industries/markdown-quality",
    ],
  );
}
const selectedArchives = values["retained-only"]
  ? expected.archives.filter(
      (archive) =>
        publicationOrigins.records.find(
          (record) => record.package === archive.package,
        ).state === "retained",
    )
  : values["native-only"]
    ? expected.archives.filter((a) => a.name !== "core")
    : expected.archives;
const temporary = mkdtempSync(join(tmpdir(), "markdown-quality-registry-"));
assert.ok(
  !values.provenance || !archives,
  "Transported archives have no registry attestations",
);
const records = [];
const provenanceRecords = [];
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
  for (const archive of selectedArchives) {
    let bytes;
    if (archives)
      bytes = boundedFile(join(archives, archive.filename), 20_000_000);
    else {
      if (values["retained-only"])
        await waitForRegistryIntegrity(
          archive.package,
          expected.version,
          archive.integrity,
        );
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
      bytes = await acquire(metadata.dist.tarball, 20000000);
    }
    assert.equal(digest(bytes), archive.sha256);
    assert.equal(
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      archive.integrity,
    );
    records.push({
      package: archive.package,
      version: expected.version,
      publicAnonymousAcquisition: !archives,
      frozenTransportedArchive: Boolean(archives),
      sha256: archive.sha256,
      integrity: archive.integrity,
      bytes: bytes.length,
    });
  }
  const active = selectedArchives.filter(
    (archive) => archive.name === "core" || archive.name === platform,
  );
  const includesCore = active.some((archive) => archive.name === "core");
  for (const layout of active.length ? ["root", "isolated"] : []) {
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
        devDependencies: !includesCore
          ? Object.fromEntries(
              active.map((archive) => [archive.package, expected.version]),
            )
          : {
              "@hadden-industries/markdown-quality": archives
                ? "file:" +
                  join(
                    archives,
                    expected.archives.find((a) => a.name === "core").filename,
                  )
                : expected.version,
            },
        ...(archives
          ? {
              optionalDependencies: Object.fromEntries(
                expected.archives
                  .filter((a) => a.name !== "core")
                  .map((a) => [
                    a.package,
                    "file:" + join(archives, a.filename),
                  ]),
              ),
            }
          : {}),
      }),
    );
    npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: install,
      env: environment,
    });
    const lockBytes = readFileSync(join(install, "package-lock.json"));
    const lock = JSON.parse(lockBytes);
    const verifyFiles = () => {
      for (const archive of active) {
        const directory = join(install, "node_modules", archive.package);
        const metadata = JSON.parse(
          readFileSync(join(directory, "package.json"), "utf8"),
        );
        assert.equal(metadata.publishConfig.access, "public");
        assert.equal(metadata.license, "AGPL-3.0-only");
        assert.equal(metadata.version, expected.version);
        if (archive.name === "linux-x64")
          assert.ok(
            statSync(join(directory, "bin/snapper-fmt")).mode & 0o111,
            "Installed native executable lacks execute permissions",
          );
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
    if (values.provenance) {
      const audit = JSON.parse(
        npmCommand(
          ["audit", "signatures", "--json", "--include-attestations"],
          { cwd: install, env: environment },
        ),
      );
      const verified = verifyReleaseProvenance(audit, active, {
        version: expected.version,
        source,
        publicationRun: values["publication-run"],
        ...(publicationOrigins ? { publicationOrigins } : {}),
      });
      provenanceRecords.push({
        layout,
        platform,
        records: verified,
        nativeAudit: audit,
      });
    }
    let run;
    if (includesCore) {
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
      run = (mode) => {
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
    }
    npmCommand(
      ["ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"],
      { cwd: install, env: environment },
    );
    assert.deepEqual(
      readFileSync(join(install, "package-lock.json")),
      lockBytes,
    );
    verifyFiles();
    if (includesCore) run("check");
    records.push({
      layout,
      platform,
      installedVersion: expected.version,
      allInstalledFileHashesVerified: true,
      lockSha256: digest(lockBytes),
      lifecycleScripts: "disabled",
      anonymousFreshCacheInstall: !archives,
      frozenTransportedArchiveInstall: Boolean(archives),
      offlineFrozenLockReinstall: true,
      ...(includesCore
        ? {
            credentialFreeOfflineRuntime: true,
            unchangedDocumentAndConvergentFormatting: true,
          }
        : { scope: "Retained native package only; no core CLI runtime claim" }),
    });
  }
  const report = {
    schemaVersion: 1,
    candidate: source,
    qualification: archives
      ? "transported candidate archives"
      : "public registry",
    ...(values["retained-only"] || values["native-only"]
      ? {
          scope: values["retained-only"]
            ? "Retained packages before recovery publication"
            : "Native packages before core publication",
          acquiredPackages: selectedArchives.map((archive) => archive.package),
          installedPackages: active.map((archive) => archive.package),
          provenanceCoverage:
            "Installed packages on this supported platform; other native archives have raw-byte verification only",
        }
      : {}),
    version: expected.version,
    platform,
    passed: true,
    observedAt: new Date().toISOString(),
    provenanceAttestation: values.provenance
      ? "verified by npm audit signatures and bound to approved source/workflow/run"
      : "not checked; no attestation claim",
    provenanceRecords,
    records,
  };
  if (positionals.length)
    writeFileSync(
      resolve(positionals[0]),
      JSON.stringify(report, null, 2) + "\n",
      { flag: "wx" },
    );
  process.stdout.write(JSON.stringify(report) + "\n");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
