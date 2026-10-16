// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { native } from "../scripts/commands.js";

test("native failures retain bounded stdout diagnostics and their exit status", () => {
  assert.throws(
    () =>
      native(process.execPath, [
        "-e",
        'console.error("stderr detail"); console.log("x".repeat(5000) + "schema validation failed"); process.exit(7)',
      ]),
    (error) => {
      assert.equal(error.status, 7);
      assert.match(error.message, /stderr detail/u);
      assert.match(error.message, /schema validation failed/u);
      assert.ok(error.message.length < 2500);
      return true;
    },
  );
});
