// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createTestNativeStaging } from "./native-staging-helpers.js";
import { resolveTool, runNative } from "../src/native-tool.js";
import { runNativeChecks } from "../src/native-checks.js";
import { checkProse, checkProseGroup } from "../src/prose-diagnostics.js";
import { consumer, moduleMockExportOption } from "./helpers.js";

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
    "src/analyzer-limits.js",
    "src/native-policy.js",
    "src/native-protocol.js",
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
  const staging = createTestNativeStaging(root);
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
    const mockExports=${JSON.stringify(moduleMockExportOption)};
    mock.module('node:child_process',{[mockExports]:{spawnSync:(...args)=>{
      if(args[1].includes('--check'))checks++;
      return native(...args);
    }}});
    const {createTestNativeStaging}=await import('./test/native-staging-helpers.js');
    const {resolveTool}=await import('./src/native-tool.js');
    const {runNativeChecks}=await import('./src/native-checks.js');
    const staging=createTestNativeStaging(process.cwd());
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
  const staging = createTestNativeStaging(consumer(t));
  assert.ok(staging);
  t.after(() => staging.close());
  const texts = [
    "> 1. First.\n>    Continuation.\n> 2. Second.\n",
    "> 1. First. Second.\n",
    "> 1. First.\r\n>    Continuation. Another.\r\n",
    "- [x] First.\n  Continuation.\n- [ ] Second.\n",
    "\n- First.\n- Second. More.\n",
    "Long " + "sentence ".repeat(1000) + "ends.\n",
    ">> 1. Alpha.\n>> 2. Beta.\n",
    "- Alpha.\n1. Beta.\n",
    "```js\nAlpha. Beta.\n```\n",
  ];
  const tool = resolveTool();
  // Authored public findings, corroborated against the preserved pre-extraction list algorithm.
  const fused = (line) => ({
    source: "snapper",
    rule: "fused",
    line,
    column: 1,
    message: "Sentence layout: fused.",
    severity: "error",
  });
  const expected = [
    [],
    [fused(1)],
    [fused(1), fused(2)],
    [],
    [fused(3)],
    [],
    [],
    [],
    [],
  ];
  assert.deepEqual(
    texts.map((text) => checkProse(tool, text)),
    expected,
  );
  assert.deepEqual(checkProseGroup(tool, texts, staging.token), expected);
  assert.deepEqual(readdirSync(staging.token.path).sort(), [
    ".editorconfig",
    "snapper-check.toml",
  ]);
  staging.close();
  assert.equal(existsSync(staging.token.path), false);
});

test("both prose callers suppress an admitted literal-only native finding", () => {
  const code = `
    import {mock} from 'node:test'; import assert from 'node:assert/strict';
    const option=${JSON.stringify(moduleMockExportOption)};
    mock.module('node:child_process',{[option]:{spawnSync:()=>({status:1,stdout:Buffer.from(JSON.stringify([{would_reformat:true,diagnostics:[{kind:'fused',line:2,excerpt:'Alpha. Beta.'}]}]))})}});
    const {checkProse,checkProseGroup}=await import('./src/prose-diagnostics.js');
    const text='\x60\x60\x60js\\nAlpha. Beta.\\n\x60\x60\x60\\n';
    assert.deepEqual(checkProse({executable:'unused'},text),[]);
    const admitted={wouldReformat:true,diagnostics:[{source:'snapper',rule:'fused',line:2,column:1,message:'Sentence layout: fused.',severity:'error'}]};
    assert.deepEqual(checkProseGroup({executable:'unused'},[text],null,null,[admitted]),[[]]);
  `;
  execFileSync(
    process.execPath,
    ["--experimental-test-module-mocks", "--input-type=module", "-e", code],
    { cwd: new URL("../", import.meta.url), timeout: 10000, windowsHide: true },
  );
});

test("native grouping, report bounds and prose retention enforce independent byte boundaries", () => {
  const code = `
    import {mock} from 'node:test'; import assert from 'node:assert/strict'; import * as cp from 'node:child_process';
    const original=cp.spawnSync; let groups=[];
    const option=${JSON.stringify(moduleMockExportOption)};
    mock.module('node:child_process',{[option]:{spawnSync:(exe,args,options)=>{
      if(!args.includes('--check'))return original(exe,args,options);
      groups.push(args.filter(arg=>/input-[0-9]+\\.md$/.test(arg)).length);
      return {status:0,stdout:Buffer.from('[]')};
    }}});
    const {createTestNativeStaging}=await import('./test/native-staging-helpers.js');
    const {runNativeChecks}=await import('./src/native-checks.js');
    const {checkProseGroup}=await import('./src/prose-diagnostics.js');
    const {limits}=await import('./src/contracts.js');
    const staging=createTestNativeStaging(process.cwd()); assert.ok(staging);
    try {
      for(const [count,expected] of [[31,[31]],[32,[32]],[33,[32,1]]]) {
        groups=[]; runNativeChecks({executable:'unused'},Array(count).fill('Stable.\\n'),staging.token);
        assert.deepEqual(groups,expected);
      }
      groups=[]; runNativeChecks({executable:'unused'},Array(3).fill('x'.repeat(1500000)+'\\n'),staging.token);
      assert.deepEqual(groups,[2,1],'native input bytes split below the count capacity');
      groups=[]; runNativeChecks({executable:'unused'},Array(3).fill('Stable.\\n'),staging.token,null,{...limits,nativeOutputBytes:10000});
      assert.deepEqual(groups,[1,1,1],'independent report-byte upper bound splits the group');
      const text='> 1. '+'x'.repeat(1500000)+'.\\n';
      const admitted=Array.from({length:3},()=>({wouldReformat:true,diagnostics:[{rule:'fused',line:1}]}));
      const starts=[]; groups=[];
      assert.deepEqual(checkProseGroup({executable:'unused'},Array(3).fill(text),staging.token,{start:owners=>starts.push(owners),finish:()=>{}},admitted),[[],[],[]]);
      assert.equal(Math.max(...starts.map(owners=>owners.length)),2,'retention flushes before three large snippets reach the native partitioner');
      assert.deepEqual(groups,[2,1]);
    } finally {staging.close();}
  `;
  execFileSync(
    process.execPath,
    ["--experimental-test-module-mocks", "--input-type=module", "-e", code],
    { cwd: new URL("../", import.meta.url), timeout: 30000, windowsHide: true },
  );
});

test("native protocol and process faults fail once, attribute no guessed results and clean payloads", () => {
  const code = `
    import {mock} from 'node:test';
    import assert from 'node:assert/strict';
    import {readdirSync,existsSync} from 'node:fs';
    import * as cp from 'node:child_process';
    const native=cp.spawnSync;
    let change, calls=0;
    const mockExports=${JSON.stringify(moduleMockExportOption)};
    mock.module('node:child_process',{[mockExports]:{spawnSync:(...args)=>{
      if(!args[1].includes('--check'))return native(...args);
      calls++;
      const result=native(...args);
      if(change)change(result);
      return result;
    }}});
    const {createTestNativeStaging}=await import('./test/native-staging-helpers.js');
    const {resolveTool}=await import('./src/native-tool.js');
    const {runNativeChecks}=await import('./src/native-checks.js');
    const staging=createTestNativeStaging(process.cwd()), tool=resolveTool();
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
