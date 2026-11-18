// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureCommandTimeoutMs } from "../helpers.js";

const math = "# Algebra\n\nInline $x + y$.\n\n$$\nx + y = z\n$$\n";
const renderMarker = "KaTeX renderer invoked";

export function verifyKaTeXReachability({ install, root, cli }) {
  mkdirSync(root);
  writeFileSync(join(root, "math.md"), math);
  const katex = join(install, "node_modules/katex");
  const entry = JSON.parse(readFileSync(join(katex, "package.json"))).exports[
    "."
  ];
  assert.equal(entry.import.default, "./dist/katex.mjs");
  assert.equal(entry.require.default, "./dist/katex.js");
  const esm = join(katex, entry.import.default);
  const commonjs = join(katex, entry.require.default);
  const esmBytes = readFileSync(esm);
  const commonjsBytes = readFileSync(commonjs);
  const trace = join(root, "katex-trace.txt");
  const trap = `
    const trace = ${JSON.stringify(trace)};
    appendFileSync(trace, "KaTeX loaded in thread " + threadId + "\\n");
    function render() {
      appendFileSync(trace, ${JSON.stringify(renderMarker + "\n")});
      throw new Error("KaTeX renderer called during Markdown processing");
    }
    const api = { render, renderToString: render };
  `;

  const run = (...args) => {
    writeFileSync(trace, "");
    const result = spawnSync(process.execPath, args, {
      cwd: install,
      encoding: "utf8",
      timeout: fixtureCommandTimeoutMs,
      windowsHide: true,
    });
    assert.equal(result.error, undefined);
    return { ...result, trace: readFileSync(trace, "utf8") };
  };
  const check = (result) => {
    assert.ok([0, 1].includes(result.status), result.stdout + result.stderr);
    assert.ok(!result.trace.includes(renderMarker), result.trace);
    assert.ok(result.stdout.trim(), result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.operationStatus, "completed", result.stdout);
    assert.deepEqual(report.selection.files, ["math.md"]);
    assert.match(result.trace, /^KaTeX loaded in thread [1-9]\d*$/mu);
  };
  // The fixture's actual module resolution now hits a synchronous tripwire
  // in the main process and worker, independent of loader flags or worker env.
  try {
    writeFileSync(
      esm,
      `
      import { appendFileSync } from "node:fs";
      import { threadId } from "node:worker_threads";
      ${trap}
      export { render, render as renderToString };
      export default api;
    `,
    );
    writeFileSync(
      commonjs,
      `
      const { appendFileSync } = require("node:fs");
      const { threadId } = require("node:worker_threads");
      ${trap}
      module.exports = api;
    `,
    );
    for (const args of [
      [
        "--input-type=module",
        "--eval",
        'import katex from "katex"; katex.renderToString("x");',
      ],
      ["--eval", 'require("katex").renderToString("x");'],
    ]) {
      const control = run(...args);
      assert.equal(control.status, 1, control.stdout + control.stderr);
      assert.ok(control.trace.includes(renderMarker), control.trace);
    }

    check(run(cli, "check", "--root", root, "--json"));
    check(run(cli, "format", "--write", "--root", root, "--json"));
    const sdk = join(install, "katex-sdk-probe.mjs");
    writeFileSync(
      sdk,
      `
        import assert from "node:assert/strict";
        import { processLogicalDocument, runQuality } from "@hadden-industries/markdown-quality";
        const root = process.argv[2];
        const logical = await processLogicalDocument({
          root,
          path: "math.md",
          content: Buffer.from(${JSON.stringify(math)}),
        });
        assert.equal(logical.operationStatus, "completed", JSON.stringify(logical));
        console.log(JSON.stringify(await runQuality({ root, mode: "check" })));
    `,
    );
    check(run(sdk, root));
  } finally {
    writeFileSync(esm, esmBytes);
    writeFileSync(commonjs, commonjsBytes);
  }
}
