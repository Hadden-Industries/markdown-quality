// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { packRelease } from "../scripts/pack.js";
import { npmCommand } from "../scripts/commands.js";
import { checkLinks } from "../src/analysis.js";
import { digest } from "../src/contracts.js";
import { qualifyRuntime } from "../scripts/qualify-runtime.js";
test("packed root and isolated consumers install without lifecycle scripts and execute offline", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "markdown-quality-install-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const output = join(temp, "archives"),
    release = packRelease(output);
  const native = release.archives.find(
    (a) => a.name === `${process.platform}-${process.arch}`,
  );
  const core = release.archives.find((a) => a.name === "core");
  assert.ok(
    core.files.every(
      (f) => !f.path.includes("node_modules") && !f.path.includes(".npmrc"),
    ),
  );
  assert.ok(core.files.some((file) => file.path === "assets/.editorconfig"));
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
    npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: install,
    });
    const lockBefore = readFileSync(join(install, "package-lock.json"));
    const installedCore = join(
      install,
      "node_modules/@hadden-industries/markdown-quality",
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
    for (const file of core.files.filter((f) => f.path.endsWith(".md"))) {
      const text = readFileSync(join(installedCore, file.path), "utf8");
      assert.deepEqual(
        checkLinks(
          {
            root: installedCore,
            config: { links: { localFiles: true, rootRelative: "reject" } },
          },
          text,
          file.path,
        ),
        [],
        file.path,
      );
    }
    const lock = JSON.parse(lockBefore);
    assert.equal(
      lock.packages["node_modules/@hadden-industries/markdown-quality"].version,
      release.version,
    );
    writeFileSync(
      join(consumer, ".markdown-quality.json"),
      JSON.stringify({
        schemaVersion: 1,
        preset: "authored-gfm@1",
        include: ["*.md"],
      }),
    );
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
    assert.equal(JSON.parse(result.stdout).outcome, "clean");
    qualifyRuntime(cli, consumer, process.env);
    assert.deepEqual(
      readFileSync(join(install, "package-lock.json")),
      lockBefore,
    );
    // Second acquisition uses the native frozen lock and executes no lifecycle.
    npmCommand(
      ["ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"],
      { cwd: install },
    );
  }
});
