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

test("qualification and publication Actions retain credential and archive boundaries", () => {
  for (const workflow of [
    "candidate",
    "check",
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
  assert.deepEqual(checked.written, []);
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
  assert.deepEqual((await runQuality({ root, mode: "format" })).written, []);
});
