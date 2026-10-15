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
  readdirSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createNativeStaging,
  verifyNativeStaging,
  verifyStagedFile,
  writeStagedFile,
  removeStagedFile,
} from "../src/native-staging.js";
import { consumer } from "./helpers.js";

test("owned staging admits 34 known entries and refuses a 35th unknown entry", (t) => {
  for (const extra of [false, true]) {
    const staging = createNativeStaging(consumer(t));
    assert.ok(staging);
    for (let index = 0; index < 32; index++)
      writeStagedFile(staging.token, `input-${index}.md`, "Private.\n");
    assert.equal(readdirSync(staging.token.path).length, 34);
    assert.throws(
      () => writeStagedFile(staging.token, "input-32.md", "Unadmitted.\n"),
      { code: "NATIVE_STAGING" },
    );
    if (extra) {
      const sentinel = join(staging.token.path, "sentinel.md");
      writeFileSync(sentinel, "Owned test sentinel.", { flag: "wx" });
      assert.equal(readdirSync(staging.token.path).length, 35);
      assert.throws(() => staging.close(), { code: "NATIVE_CLEANUP" });
      assert.equal(readdirSync(staging.token.path).length, 35);
      // Explicit test-owned recovery after verifying the original capability; no production fallback.
      verifyNativeStaging(staging.token);
      for (const name of [
        "sentinel.md",
        ".editorconfig",
        "snapper-check.toml",
        ...Array.from({ length: 32 }, (_, index) => `input-${index}.md`),
      ])
        unlinkSync(join(staging.token.path, name));
      rmdirSync(staging.token.path);
    } else staging.close();
    assert.equal(existsSync(staging.token.path), false);
  }
});

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

test("staged handle device, inode and birth identity remain mandatory for checking and removal", (t) => {
  const staging = createNativeStaging(consumer(t));
  assert.ok(staging);
  t.after(() => staging.close());
  const text = "Private.\n";
  const file = writeStagedFile(staging.token, "input-0.md", text);
  for (const key of ["dev", "ino", "birthtimeNs"]) {
    const original = file.identity[key];
    file.identity[key] = original + 1n;
    try {
      assert.throws(() => verifyStagedFile(staging.token, file, text), {
        code: "NATIVE_STAGING",
      });
      assert.throws(() => removeStagedFile(staging.token, file), {
        code: "NATIVE_CLEANUP",
      });
      assert.ok(existsSync(file.path), `${key} mismatch removed the original`);
    } finally {
      file.identity[key] = original;
    }
  }
  verifyStagedFile(staging.token, file, text);
  removeStagedFile(staging.token, file);
  assert.equal(existsSync(file.path), false);
});
