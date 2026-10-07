// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createNativeStaging } from "../src/native-staging.js";
import { resolveTool, runNative } from "../src/native-tool.js";
import { runNativeChecks } from "../src/native-checks.js";
import { checkProse, checkProseGroup } from "../src/prose-diagnostics.js";
import { consumer } from "./helpers.js";

test("the original stdin path owns its EditorConfig boundary inside a consumer", async (t) => {
  const root = consumer(t, {
    ".editorconfig": "root = true\n[*]\nmax_line_length = 8\n",
  });
  const packageRoot = join(root, "installed-package");
  for (const folder of ["src", "assets"])
    mkdirSync(join(packageRoot, folder), { recursive: true });
  for (const file of [
    "package.json",
    "src/contracts.js",
    "src/native-tool.js",
    "assets/tool-manifest.json",
    "assets/snapper.toml",
  ])
    copyFileSync(
      new URL("../" + file, import.meta.url),
      join(packageRoot, file),
    );
  const boundary = new URL("../assets/.editorconfig", import.meta.url);
  if (existsSync(boundary))
    copyFileSync(boundary, join(packageRoot, "assets/.editorconfig"));
  const { runNative: installedRunNative } = await import(
    pathToFileURL(join(packageRoot, "src/native-tool.js")).href
  );
  const text =
    "This is a sufficiently long sentence to reveal any wrapping configuration.\n";
  assert.equal(installedRunNative(resolveTool(), text), text);
});

test("real native groups retain every input's findings and a private config boundary", (t) => {
  const root = consumer(t, {
    ".editorconfig": "root = true\n[*]\nmax_line_length = 8\n",
  });
  const staging = createNativeStaging(root);
  assert.ok(staging, "The supported host must establish private staging.");
  t.after(() => staging.close());
  const tool = resolveTool();
  const texts = [
    "Alpha.\n",
    "Alpha. Beta.\n",
    "# Title\n\n> 1. Alpha.\n> 2. Beta.\n",
  ];
  const results = runNativeChecks(tool, texts, staging.token);
  for (let index = 0; index < texts.length; index++)
    assert.deepEqual(
      results[index].diagnostics,
      runNative(tool, texts[index], true),
    );
  assert.equal(results[0].wouldReformat, false);
  assert.equal(results[1].wouldReformat, true);
});

test("one admitted group performs one native check rather than per-document launches", () => {
  const code = `
    import {mock} from 'node:test';
    import * as cp from 'node:child_process';
    const native=cp.spawnSync;
    let checks=0;
    // Use the supported native option without changing the mocked behavior.
    const mockExports=process.versions.node.startsWith('22.')?'namedExports':'exports';
    mock.module('node:child_process',{[mockExports]:{spawnSync:(...args)=>{
      if(args[1].includes('--check'))checks++;
      return native(...args);
    }}});
    const {createNativeStaging}=await import('./src/native-staging.js');
    const {resolveTool}=await import('./src/native-tool.js');
    const {runNativeChecks}=await import('./src/native-checks.js');
    const staging=createNativeStaging(process.cwd());
    try{runNativeChecks(resolveTool(),['Alpha.\\n','Beta.\\n','Gamma.\\n'],staging.token);}
    finally{staging.close();}
    console.log(JSON.stringify({checks}));
  `;
  const observed = JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-test-module-mocks", "--input-type=module", "-e", code],
      {
        cwd: new URL("../", import.meta.url),
        windowsHide: true,
        timeout: 30000,
      },
    ),
  );
  assert.equal(observed.checks, 1);
});

test("independent list and continuation rechecks preserve real findings and line order", (t) => {
  const staging = createNativeStaging(consumer(t));
  assert.ok(staging);
  t.after(() => staging.close());
  const texts = [
    "> 1. First.\n>    Continuation.\n> 2. Second.\n",
    "> 1. First. Second.\n",
    "> 1. First.\r\n>    Continuation. Another.\r\n",
    "- [x] First.\n  Continuation.\n- [ ] Second.\n",
    "\n- First.\n- Second. More.\n",
    "Long " + "sentence ".repeat(1000) + "ends.\n",
  ];
  const tool = resolveTool();
  assert.deepEqual(
    checkProseGroup(tool, texts, staging.token),
    texts.map((text) => checkProse(tool, text)),
  );
  assert.deepEqual(readdirSync(staging.token.path).sort(), [
    ".editorconfig",
    "snapper-check.toml",
  ]);
  staging.close();
  assert.equal(existsSync(staging.token.path), false);
});

test("native protocol and process faults fail once, attribute no guessed results and clean payloads", () => {
  const code = `
    import {mock} from 'node:test';
    import assert from 'node:assert/strict';
    import {readdirSync,existsSync} from 'node:fs';
    import * as cp from 'node:child_process';
    const native=cp.spawnSync;
    let change, calls=0;
    const mockExports=process.versions.node.startsWith('22.')?'namedExports':'exports';
    mock.module('node:child_process',{[mockExports]:{spawnSync:(...args)=>{
      if(!args[1].includes('--check'))return native(...args);
      calls++;
      const result=native(...args);
      if(change)change(result);
      return result;
    }}});
    const {createNativeStaging}=await import('./src/native-staging.js');
    const {resolveTool}=await import('./src/native-tool.js');
    const {runNativeChecks}=await import('./src/native-checks.js');
    const staging=createNativeStaging(process.cwd()), tool=resolveTool();
    const rewrite=(fn)=>result=>{
      const reports=JSON.parse(result.stdout);fn(reports,result);
      result.stdout=Buffer.from(JSON.stringify(reports));
    };
    const faults=[
      ['NATIVE_REPORT',result=>result.stdout=Buffer.from('{')],
      ['NATIVE_REPORT',rewrite(reports=>reports.push(reports[0]))],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].file+='-unknown')],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].original_lines++)],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].formatted_lines=-1)],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].formatted_lines=Number.MAX_SAFE_INTEGER+1)],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].diagnostics[0].kind='unknown')],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].diagnostics[0].line=0)],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].diagnostics.push(reports[0].diagnostics[0]))],
      ['NATIVE_REPORT',rewrite(reports=>reports[0].diagnostics[0].excerpt='x'.repeat(204))],
      ['NATIVE_REPORT',rewrite(reports=>reports.splice(0))],
      ['NATIVE_REPORT',result=>result.status=0],
      ['NATIVE_FAILURE',result=>result.error=Object.assign(new Error('private path'),{code:'ETIMEDOUT'})],
      ['NATIVE_FAILURE',result=>{result.signal='SIGTERM';result.status=null;}],
      ['NATIVE_FAILURE',result=>result.error=Object.assign(new Error('private content'),{code:'ENOBUFS'})],
      ['NATIVE_FAILURE',result=>result.status=2],
    ];
    try {
      for(const [expected, fault] of faults){
        change=fault;const before=calls;
        assert.throws(()=>runNativeChecks(tool,['Alpha. Beta.\\n','Clean.\\n'],staging.token),error=>error.code===expected && !/private path|private content/.test(error.message));
        assert.equal(calls-before,1,'A failed group must not retry or split.');
        assert.deepEqual(readdirSync(staging.token.path).sort(),['.editorconfig','snapper-check.toml']);
      }
      change=undefined;calls=0;
      const inputs=Array.from({length:33},()=> 'Stable.\\n');
      assert.equal(runNativeChecks(tool,inputs,staging.token).length,33);
      assert.equal(calls,2,'Partition the file ceiling before invoking.');
      calls=0;
      const manyLines='# Heading\\n\\n'+'\\n'.repeat(3000);
      assert.deepEqual(runNativeChecks(tool,[manyLines],staging.token)[0].wouldReformat,null);
      assert.equal(calls,1,'Predictable output-risk cases take the original stdin path.');
    } finally {staging.close();}
    assert.equal(existsSync(staging.token.path),false);
    console.log(JSON.stringify({faults:faults.length}));
  `;
  const observed = JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-test-module-mocks", "--input-type=module", "-e", code],
      {
        cwd: new URL("../", import.meta.url),
        windowsHide: true,
        timeout: 30000,
      },
    ),
  );
  assert.equal(observed.faults, 16);
});

test("a reused stable native report cannot suppress independent prose findings", () => {
  const diagnostic = {
    source: "snapper",
    rule: "fused",
    line: 1,
    column: 1,
    severity: "error",
    message: "Sentence layout: fused.",
  };
  assert.deepEqual(
    checkProseGroup(resolveTool(), ["Alpha.\n"], undefined, undefined, [
      { wouldReformat: false, diagnostics: [diagnostic] },
    ]),
    [[diagnostic]],
  );
});
