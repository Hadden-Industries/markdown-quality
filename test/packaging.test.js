// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { packRelease } from "../scripts/pack.js";
import {
  native as nativeCommand,
  npmCommand,
  producerToolchain,
} from "../scripts/commands.js";
import { checkLinks } from "../src/analysis.js";
import { digest } from "../src/contracts.js";
import { qualifyRuntime } from "../scripts/qualify-runtime.js";
import { qualifyMinimalConsumer } from "../scripts/qualify-minimal-consumer.js";
import { checkArchitecture } from "../scripts/architecture.js";
import {
  katexNoticePath,
  verifyRecipientAudit,
} from "../scripts/qualify-release-security.js";
import { verifyKaTeXReachability } from "./fixtures/katex-consumer-probe.mjs";

/** Emit live phase boundaries even while a synchronous child command blocks. */
function phase(name, operation) {
  const started = performance.now();
  writeSync(2, JSON.stringify({ packagingPhase: name, event: "start" }) + "\n");
  try {
    return operation();
  } finally {
    // End records duration, not success; the original exception still fails the test.
    writeSync(
      2,
      JSON.stringify({
        packagingPhase: name,
        event: "end",
        elapsedMs: Math.round(performance.now() - started),
      }) + "\n",
    );
  }
}

test("packed root and isolated consumers install without lifecycle scripts and execute offline", async (t) => {
  const temp = mkdtempSync(join(tmpdir(), "markdown-quality-install-"));
  t.after(() =>
    phase("fixture cleanup", () =>
      rmSync(temp, { recursive: true, force: true }),
    ),
  );
  const output = join(temp, "archives"),
    release = phase("pack archives", () => packRelease(output));
  const producer = producerToolchain();
  const producerLock = readFileSync(join(output, "build-package-lock.json"));
  assert.equal(digest(producerLock), release.source.lockSha256);
  assert.deepEqual(
    producerLock,
    readFileSync(new URL("../package-lock.json", import.meta.url)),
  );
  assert.equal(
    release.build.npm,
    nativeCommand(producer.executable, [producer.cli, "--version"]).trim(),
  );
  assert.equal(
    release.build.node,
    nativeCommand(producer.executable, ["--version"]).trim(),
  );
  const native = release.archives.find(
    (a) => a.name === `${process.platform}-${process.arch}`,
  );
  const core = release.archives.find((a) => a.name === "core");
  assert.ok(core.files.some(({ path }) => path === katexNoticePath));
  assert.ok(
    core.files.every(({ path }) => !path.startsWith("node_modules/")),
    "The core archive must use registry dependencies",
  );
  // The real archive is an independent oracle for npm's dry-run admission.
  assert.deepEqual(
    phase("inspect shipment", () => checkArchitecture())
      .files.map((f) => f.path)
      .sort(),
    core.files.map((f) => f.path).sort(),
  );
  assert.ok(core.files.every((f) => !f.path.includes(".npmrc")));
  assert.ok(core.files.some((file) => file.path === "assets/.editorconfig"));
  assert.ok(
    core.files.every(
      (file) =>
        !file.path.startsWith("scripts/") &&
        !file.path.startsWith("test/") &&
        !file.path.includes("dependency-cruiser"),
    ),
    "Development graph tooling must stay outside the consumer archive",
  );
  for (const layout of ["root", "isolated"]) {
    const consumer = join(temp, layout);
    mkdirSync(consumer);
    const install =
      layout === "root" ? consumer : join(consumer, "tooling", "markdown");
    mkdirSync(install, { recursive: true });
    writeFileSync(
      join(install, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        private: true,
        dependencies: { [core.package]: "file:" + join(output, core.filename) },
        optionalDependencies: Object.fromEntries(
          release.archives
            .filter((a) => a.name !== "core")
            .map((a) => [a.package, "file:" + join(output, a.filename)]),
        ),
      }),
    );
    // Fresh acquisition resolves public JS metadata without private credentials.
    // The frozen-lock reinstall and runtime below must work offline.
    phase(`${layout} install`, () =>
      npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
        cwd: install,
      }),
    );
    const lockBefore = readFileSync(join(install, "package-lock.json"));
    const installedCore = join(
      install,
      "node_modules/@hadden-industries/markdown-quality",
    );
    const installedMetadata = JSON.parse(
      readFileSync(join(installedCore, "package.json"), "utf8"),
    );
    assert.equal(installedMetadata.overrides, undefined);
    assert.equal(installedMetadata.bundleDependencies, undefined);
    const installedLock = JSON.parse(lockBefore);
    for (const name of ["eslint", "@eslint/markdown", "katex"]) {
      assert.equal(
        installedLock.packages[`node_modules/${name}`]?.inBundle,
        undefined,
      );
      assert.ok(installedLock.packages[`node_modules/${name}`]?.integrity);
    }
    assert.equal(
      installedLock.packages["node_modules/picomatch"].name,
      "@ryotsu/picomatch",
    );
    npmCommand(["ls", "--all", "--json"], { cwd: install });
    await t.test(`${layout} KaTeX reachability`, () =>
      verifyKaTeXReachability({
        install,
        root: join(temp, `${layout}-math`),
        cli: join(installedCore, "src/cli.js"),
      }),
    );
    await t.test(`${layout} dependency audit`, () => {
      const audit = JSON.parse(
        npmCommand(
          ["audit", "--json", "--ignore-scripts", "--audit-level=none"],
          { cwd: install },
        ),
      );
      verifyRecipientAudit(audit, { lock: installedLock, release });
    });
    assert.equal(
      installedMetadata.dependencies["dependency-cruiser"],
      undefined,
    );
    assert.equal(
      Object.keys(JSON.parse(lockBefore).packages).some((path) =>
        path.endsWith("/dependency-cruiser"),
      ),
      false,
      "Consumer installation must not resolve developer tooling",
    );
    const originalLicense = readFileSync(
      new URL("../LICENSE", import.meta.url),
    );
    assert.deepEqual(
      readFileSync(join(installedCore, "LICENSE")),
      originalLicense,
    );
    assert.deepEqual(
      readFileSync(join(install, "node_modules", native.package, "LICENSE")),
      originalLicense,
    );
    const nativeSpec =
      release.native.platforms[`${process.platform}-${process.arch}`];
    if (release.native.schemaVersion === 2) {
      for (const [name, hash] of Object.entries(nativeSpec.files)) {
        const path =
          name === nativeSpec.executable.split("/").at(-1)
            ? nativeSpec.executable
            : name;
        assert.equal(
          digest(
            readFileSync(join(install, "node_modules", native.package, path)),
          ),
          hash,
          name,
        );
      }
      const inventory = JSON.parse(
        readFileSync(
          join(
            install,
            "node_modules",
            native.package,
            "component-inventory.json",
          ),
          "utf8",
        ),
      );
      assert.equal(inventory.binarySha256, nativeSpec.sha256);
      const componentBytes = readFileSync(
        join(install, "node_modules", native.package, "component.json"),
      );
      assert.ok(
        !componentBytes.includes(13),
        "Transported metadata must use LF",
      );
      const component = JSON.parse(componentBytes.toString("utf8"));
      assert.deepEqual(component.build, release.native.build);
      assert.ok(
        inventory.packages.some(
          (p) => p.name === "webpki-roots" && p.version === "0.25.4",
        ),
      );
      assert.ok(
        readFileSync(
          join(install, "node_modules", native.package, "MPL-SOURCE.tar.xz"),
        ).length > 0,
      );
    }
    for (const file of core.files.filter(
      (f) => !f.path.startsWith("node_modules/") && f.path.endsWith(".md"),
    )) {
      const text = readFileSync(join(installedCore, file.path), "utf8");
      assert.deepEqual(
        checkLinks(
          {
            root: installedCore,
            config: {
              links: { checkLocalTargets: true, rootRelative: "reject" },
            },
          },
          text,
          file.path,
        ).diagnostics,
        [],
        file.path,
      );
    }
    const lock = JSON.parse(lockBefore);
    assert.equal(
      lock.packages["node_modules/@hadden-industries/markdown-quality"].version,
      release.version,
    );
    // Dependency-only consumer: no policy file; package defaults own the scope.
    writeFileSync(
      join(consumer, ".editorconfig"),
      "root = true\n[*]\nmax_line_length = 8\n",
    );
    writeFileSync(join(consumer, "a.md"), "# Heading\n\nAlpha.\nBeta.\n");
    const cli = join(
      install,
      "node_modules/@hadden-industries/markdown-quality/src/cli.js",
    );
    const result = spawnSync(
      process.execPath,
      [cli, "check", "--root", consumer, "--json"],
      {
        encoding: "utf8",
        timeout: 30_000,
        env: {
          SystemRoot: process.env.SystemRoot ?? "",
          HTTPS_PROXY: "http://127.0.0.1:1",
          HTTP_PROXY: "http://127.0.0.1:1",
        },
      },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.operationStatus, "completed");
    assert.equal(report.qualityStatus, "clean");
    assert.equal(report.configurationOrigin.kind, "default-absent");
    assert.deepEqual(report.selection.files, ["a.md"]);
    phase(`${layout} runtime qualification`, () =>
      qualifyRuntime(cli, consumer, process.env),
    );
    // The dependency-only shapes run through npm exec from the real installation
    // root; unpublished native companions are routed as disclosed fixture archives.
    const minimal = phase(`${layout} dependency-only npm exec`, () =>
      qualifyMinimalConsumer({
        install,
        root: consumer,
        packageName: core.package,
      }),
    );
    assert.equal(minimal.layout, layout);
    assert.ok(minimal.commands >= 30, String(minimal.commands));
    assert.deepEqual(
      readFileSync(join(install, "package-lock.json")),
      lockBefore,
    );
    // Second acquisition uses the native frozen lock and executes no lifecycle.
    phase(`${layout} offline reinstall`, () =>
      npmCommand(
        ["ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"],
        { cwd: install },
      ),
    );
  }
});
