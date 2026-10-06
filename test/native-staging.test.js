// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createNativeStaging,
  verifyNativeStaging,
  writeStagedFile,
  removeStagedFile,
} from "../src/native-staging.js";
import { consumer } from "./helpers.js";

test("staging refuses consumer-contained temporary storage and changed configuration", (t) => {
  assert.equal(createNativeStaging(tmpdir()), null);
  const staging = createNativeStaging(consumer(t));
  assert.ok(staging);
  t.after(() => staging.close());
  const config = join(staging.token.path, "snapper-check.toml");
  writeFileSync(config, "ignore = ['**']\n");
  assert.throws(() => verifyNativeStaging(staging.token), {
    code: "NATIVE_STAGING",
  });
  staging.close();
  assert.equal(existsSync(staging.token.path), false);
});

test("owned identities prevent cleanup from following replacement inputs", (t) => {
  const staging = createNativeStaging(consumer(t));
  assert.ok(staging);
  const file = writeStagedFile(staging.token, "input-0.md", "Private.\n");
  const original = join(staging.token.path, "original.md");
  renameSync(file.path, original);
  writeFileSync(file.path, "Replacement sentinel.\n");
  assert.throws(() => removeStagedFile(staging.token, file), {
    code: "NATIVE_CLEANUP",
  });
  assert.equal(existsSync(original), true);
  assert.throws(() => staging.close(), { code: "NATIVE_CLEANUP" });
  // Test-owned recovery is explicit; production cleanup must not delete unknown contents.
  rmSync(original);
  rmSync(file.path);
  rmSync(join(staging.token.path, ".editorconfig"));
  rmSync(join(staging.token.path, "snapper-check.toml"));
  rmdirSync(staging.token.path);
});

test("a replaced staging root is rejected without changing the replacement sentinel", (t) => {
  const staging = createNativeStaging(consumer(t));
  assert.ok(staging);
  const moved = staging.token.path + "-retained";
  renameSync(staging.token.path, moved);
  mkdirSync(staging.token.path);
  const sentinel = join(staging.token.path, "sentinel.md");
  writeFileSync(sentinel, "Unrelated.\n");
  assert.throws(() => verifyNativeStaging(staging.token), {
    code: "NATIVE_STAGING",
  });
  assert.equal(existsSync(sentinel), true);
  rmSync(sentinel);
  rmdirSync(staging.token.path);
  renameSync(moved, staging.token.path);
  staging.close();
});
