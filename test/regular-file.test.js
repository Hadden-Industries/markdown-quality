// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  closeSync,
  fstatSync,
  linkSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { openRegularFile, statRegularFile } from "../src/regular-file.js";
import { consumer, moduleMockExportOption } from "./helpers.js";

test("stable single-link files use complete handle stats on every supported runtime", (t) => {
  const root = consumer(t, { "input.md": "Private.\n" });
  const path = join(root, "input.md");
  const { descriptor, stat } = openRegularFile(path, { bigint: true });
  try {
    const actual = fstatSync(descriptor, { bigint: true });
    for (const key of ["dev", "ino", "birthtimeNs"])
      assert.equal(stat[key], actual[key]);
    assert.equal(readFileSync(descriptor, "utf8"), "Private.\n");
    assert.equal(statRegularFile(path, { bigint: true }).dev, actual.dev);
  } finally {
    closeSync(descriptor);
  }
  assert.throws(() => openRegularFile(root), /regular single-link/u);
  const linkedDirectory = join(root, "linked");
  symlinkSync(
    root,
    linkedDirectory,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(() => openRegularFile(linkedDirectory), /regular single-link/u);
  const alias = join(root, "alias.md");
  linkSync(path, alias);
  assert.throws(() => openRegularFile(path), /regular single-link/u);
  assert.equal(readFileSync(alias, "utf8"), "Private.\n");
});

test("a replacement between path admission and open is refused and its descriptor is closed", (t) => {
  const root = consumer(t, { "input.md": "Original.\n" });
  const path = join(root, "input.md");
  const module = new URL("../src/regular-file.js", import.meta.url).href;
  const program = `
    import assert from 'node:assert/strict';
    import * as fs from 'node:fs';
    import {mock} from 'node:test';
    const path=${JSON.stringify(path)};
    const opened=[], closed=[];
    mock.module('node:fs',{[${JSON.stringify(moduleMockExportOption)}]:{
      constants:fs.constants, lstatSync:fs.lstatSync, fstatSync:fs.fstatSync,
      openSync:(...args)=>{
        fs.renameSync(path,path+'.original');
        fs.writeFileSync(path,'Replacement sentinel.\\n');
        const descriptor=fs.openSync(...args); opened.push(descriptor); return descriptor;
      },
      closeSync:(descriptor)=>{fs.closeSync(descriptor);closed.push(descriptor);}
    }});
    const {openRegularFile}=await import(${JSON.stringify(module)});
    assert.throws(()=>openRegularFile(path),/changed while being opened/);
    assert.equal(opened.length,1);
    assert.deepEqual(closed,opened);
    assert.throws(()=>fs.fstatSync(opened[0]),{code:'EBADF'});
    assert.equal(fs.readFileSync(path,'utf8'),'Replacement sentinel.\\n');
    assert.equal(fs.readFileSync(path+'.original','utf8'),'Original.\\n');
  `;
  execFileSync(
    process.execPath,
    ["--experimental-test-module-mocks", "--input-type=module", "-e", program],
    { timeout: 30000, windowsHide: true },
  );
});
