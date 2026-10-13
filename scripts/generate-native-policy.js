// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sentenceToml } from "../src/native-policy.js";
const target = new URL("../assets/snapper.toml", import.meta.url);
export function checkNativePolicy() {
  assert.equal(
    readFileSync(target, "utf8").replaceAll("\r\n", "\n"),
    sentenceToml(),
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3);
  if (process.argv[2] === "--check") checkNativePolicy();
  else {
    assert.equal(process.argv[2], "--write");
    writeFileSync(target, sentenceToml());
  }
}
