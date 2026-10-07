// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
/** Exercise exact output, preservation and failure contracts with the selected Node. */
export function qualifyRuntime(cli, consumer, environment) {
  const root = mkdtempSync(join(consumer, "runtime-corpus-"));
  const formatted = [];
  const failures = [];
  writeFileSync(
    join(root, ".markdown-quality.json"),
    JSON.stringify({
      schemaVersion: 2,
      preset: "authored-gfm@1",
      include: ["*.md"],
    }),
  );
  function run(operation, name, status) {
    const result = spawnSync(
      process.execPath,
      [cli, operation, "--root", root, "--json", "--", name],
      {
        cwd: consumer,
        env: environment,
        timeout: 30000,
        maxBuffer: 1048576,
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, status, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.exitCode, status);
    return report;
  }
  try {
    const publicProbe = join(root, "public-contracts.mjs");
    writeFileSync(
      publicProbe,
      `import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const require=createRequire(process.argv[2]);
const api=await import(pathToFileURL(require.resolve('@hadden-industries/markdown-quality')));
for(const name of ['runQuality','inspectSelection','processDocument','executeQuality','validateQualityResult','readExecutionProfile','stageCandidate','qualifyCandidate']) assert.equal(typeof api[name],'function',name);
for(const name of ['configuration-schema','result-schema','execution-schema']) assert.ok(JSON.parse(readFileSync(require.resolve('@hadden-industries/markdown-quality/'+name),'utf8')));
assert.ok(readFileSync(require.resolve('@hadden-industries/markdown-quality/qualification-observer')).length);
const result=await api.executeQuality({root:process.argv[3],mode:'format',document:{path:'logical.md',requestId:'packed',contentBase64:Buffer.from('Alpha. Beta.\\n').toString('base64')}});
api.validateQualityResult(result,{requestId:'packed',exitCode:0});
assert.equal(Buffer.from(result.document.contentBase64,'base64').toString(),'Alpha.\\nBeta.\\n');
assert.deepEqual(result.written,[]);
`,
    );
    const publicExecution = spawnSync(
      process.execPath,
      [publicProbe, cli, root],
      { env: environment, timeout: 30000, encoding: "utf8", windowsHide: true },
    );
    assert.equal(
      publicExecution.status,
      0,
      publicExecution.stdout + publicExecution.stderr,
    );
    // Authored expected bytes are independent of the formatter's returned output.
    const cases = [
      {
        name: "sentences.md",
        source: "# Heading\n\nAlpha. Beta.\n",
        expected: "# Heading\n\nAlpha.\nBeta.\n",
        status: 1,
      },
      {
        name: "breaks.md",
        source: "First line.  \nSecond line.\n",
        expected: "First line.\\\nSecond line.\n",
        status: 1,
      },
      {
        name: "literal.md",
        source: "```bbcode\n[b]Literal.[/b] Next.  \n   \n```\n",
        expected: "```bbcode\n[b]Literal.[/b] Next.  \n   \n```\n",
        status: 0,
      },
      {
        name: "defaults.md",
        source: "Title\r\n=====\r\n\r\n_text_\r\n\r\n7. Seven\r\n7. Eight\r\n",
        expected: "# Title\n\n*text*\n\n7. Seven\n8. Eight\n",
        status: 1,
      },
      {
        name: "yaml.md",
        source:
          "---\r\ntitle: A\r\nscalar: |\r\n  e\u0301  \r\n\r\n  \\r\\n\r\n---\r\n\r\n# A\r\n",
        expected:
          "---\ntitle: A\nscalar: |\n  e\u0301  \n\n  \\r\\n\n---\n\n# A\n",
        status: 1,
      },
    ];
    for (const fixture of cases) {
      const path = join(root, fixture.name);
      writeFileSync(path, fixture.source);
      run("check", fixture.name, fixture.status);
      assert.equal(
        readFileSync(path, "utf8"),
        fixture.source,
        "Check wrote input",
      );
      run("format", fixture.name, 0);
      assert.equal(
        readFileSync(path, "utf8"),
        fixture.expected,
        "Runtime formatting differs from oracle",
      );
      run("check", fixture.name, 0);
      assert.deepEqual(run("format", fixture.name, 0).written, []);
      assert.equal(
        readFileSync(path, "utf8"),
        fixture.expected,
        "Formatting failed convergence",
      );
      formatted.push({
        path: fixture.name,
        sha256: createHash("sha256").update(fixture.expected).digest("hex"),
      });
    }
    for (const fixture of [
      {
        name: "missing-local-link",
        source: Buffer.from("See [missing](missing.md).\n"),
        status: 1,
      },
      { name: "invalid-utf8", source: Buffer.from([255]), status: 2 },
      {
        name: "missing-language",
        source: Buffer.from("```\nvalue\n```\n"),
        status: 1,
      },
    ]) {
      const name = fixture.name + ".md";
      const path = join(root, name);
      writeFileSync(path, fixture.source);
      const report = run("check", name, fixture.status);
      assert.equal(report.outcome, fixture.status === 1 ? "findings" : "error");
      assert.deepEqual(readFileSync(path), fixture.source);
      const refused = run("format", name, fixture.status);
      assert.deepEqual(refused.written, []);
      assert.deepEqual(
        readFileSync(path),
        fixture.source,
        "Invalid input was overwritten",
      );
      failures.push(fixture.name);
    }
    return {
      node: process.version,
      formatted,
      failures,
      publicContracts:
        "Installed supported exports/schema/observer and bounded logical transport qualified",
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
