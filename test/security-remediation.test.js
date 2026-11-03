// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import { consumer } from "./helpers.js";
import { createRequire } from "node:module";
import { micromark } from "micromark";
import { math, mathHtml } from "micromark-extension-math";
import { spawnSync } from "node:child_process";

test("minimatch remains above the independent advisory floor in the lock and ESLint consumers", () => {
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url)),
  );
  const versions = Object.entries(lock.packages)
    .filter(([path]) => path.endsWith("node_modules/minimatch"))
    .map(([, value]) => value.version);
  assert.ok(versions.length > 0);
  const requireEslint = createRequire(import.meta.resolve("eslint"));
  const requireConfig = createRequire(
    requireEslint.resolve("@eslint/config-array"),
  );
  for (const require of [requireEslint, requireConfig])
    versions.push(
      JSON.parse(readFileSync(require.resolve("minimatch/package.json")))
        .version,
    );
  for (const version of versions) {
    assert.match(version, /^\d+\.\d+\.\d+$/u);
    const [major, minor, patch] = version.split(".").map(Number);
    assert.ok(
      major > 11 || (major === 11 && (minor > 0 || patch >= 1)),
      version,
    );
  }
});

test("minimatch bounds globparts amplification and preserves ordinary level-two matching", () => {
  const program = `
    const assert = require('node:assert/strict');
    const {Minimatch} = require(process.argv[1]);
    const optimizationLevel = 2;
    const pattern = Array(30).fill('**/../a/b').join('/');
    assert.equal(new Minimatch(pattern, {optimizationLevel, braceExpandMax: 64}).set.length, 64);
    const ordinary = new Minimatch('**/../a/b/**/../c/d', {optimizationLevel});
    assert.equal(ordinary.set.length, 4);
    assert.equal(ordinary.match('../a/b/../c/d'), true);
    assert.equal(ordinary.match('x/a/b/y/c/d'), true);
    const alternate = new Minimatch('{x,*}/{0..999}', {optimizationLevel});
    assert.equal(alternate.set.length, 2000);
    assert.equal(alternate.match('x/5'), true);
    assert.equal(alternate.match('.y/5'), false);
  `;
  const requireEslint = createRequire(import.meta.resolve("eslint"));
  const result = spawnSync(
    process.execPath,
    ["-e", program, requireEslint.resolve("minimatch")],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test("qualification and publication Actions retain credential and archive boundaries", () => {
  for (const workflow of [
    "qualification",
    "ci",
    "security",
    "markdown-quality",
    "native",
    "publish",
    "registry",
  ]) {
    const text = readFileSync(
      new URL(`../.github/workflows/${workflow}.yml`, import.meta.url),
      "utf8",
    );
    assert.ok(!text.includes("allow-unsafe-pr-checkout:"), workflow);
    for (const block of text.split(/(?=^\s+- (?:name:|uses:))/mu)) {
      if (block.includes("uses: actions/checkout@"))
        assert.match(block, /persist-credentials: false/u, workflow);
      if (block.includes("uses: actions/upload-artifact@"))
        assert.ok(!/archive:\s*false/u.test(block), workflow);
      if (workflow === "publish" && block.includes("uses: actions/setup-node@"))
        assert.match(block, /package-manager-cache: false/u);
    }
    if (workflow !== "publish")
      assert.ok(!text.includes("id-token: write"), workflow);
  }
});

test("producer lock and installed math extension resolve fixed KaTeX", () => {
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  const versions = Object.entries(lock.packages)
    .filter(([path]) => path.endsWith("node_modules/katex"))
    .map(([, metadata]) => metadata.version);
  assert.ok(versions.length > 0);
  for (const version of versions) {
    const [major, minor, patch] = version.split(".").map(Number);
    assert.ok(major > 0 || minor > 18 || (minor === 18 && patch >= 2), version);
  }
  const requireMath = createRequire(
    import.meta.resolve("micromark-extension-math"),
  );
  const installed = requireMath("katex");
  assert.ok(versions.includes(installed.version));
});

test("forced math extension and KaTeX pairing renders inline and display expressions", () => {
  const html = micromark(
    "Inline $\\frac{1}{2}$.\n\n$$\nx^2 + y^2 = z^2\n$$\n",
    {
      extensions: [math()],
      htmlExtensions: [mathHtml({ trust: false, throwOnError: true })],
    },
  );
  assert.ok(html.includes('class="math math-inline"'));
  assert.ok(html.includes('class="math math-display"'));
  assert.ok(html.includes('class="katex"'));
  assert.ok(html.includes("<math"));
});

test("math-containing GFM retains literals, diagnostics and write boundaries", async (t) => {
  const input =
    "# Mathematics\n\nInline $x^2 + y^2 = z^2$ remains authored text.\n\n$$\nx^2 + y^2 = z^2\n$$\n\n| Symbol | Value |\n| --- | --- |\n| $x$ | 1 |\n\n- [x] Keep `\\frac{1}{2}` literal.\n";
  const root = consumer(t, { "math.md": input });
  const checked = await runQuality({ root });
  assert.deepEqual(checked.errors, []);
  assert.deepEqual(checked.writtenPaths, []);
  assert.equal(readFileSync(join(root, "math.md"), "utf8"), input);
  assert.ok(!checked.diagnostics.some((d) => d.rule === "parse"));
  const formatted = await runQuality({ root, mode: "format" });
  assert.equal(formatted.exitCode, 0, JSON.stringify(formatted));
  const output = readFileSync(join(root, "math.md"), "utf8");
  for (const literal of [
    "$x^2 + y^2 = z^2$",
    "$$\nx^2 + y^2 = z^2\n$$",
    "`\\frac{1}{2}`",
  ])
    assert.ok(output.includes(literal), literal);
  assert.equal((await runQuality({ root })).exitCode, 0);
  assert.deepEqual(
    (await runQuality({ root, mode: "format" })).writtenPaths,
    [],
  );
});
