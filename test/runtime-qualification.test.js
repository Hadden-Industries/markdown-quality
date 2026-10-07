// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { qualifyRuntime } from "../scripts/qualify-runtime.js";
import { consumer } from "./helpers.js";
test("real runtime proves exact formatting, literal preservation, convergence and three exit classes", (t) => {
  const root = consumer(t);
  const report = qualifyRuntime(
    fileURLToPath(new URL("../src/cli.js", import.meta.url)),
    root,
    process.env,
  );
  assert.equal(report.node, process.version);
  assert.equal(report.formatted.length, 5);
  assert.deepEqual(report.failures, [
    "missing-local-link",
    "invalid-utf8",
    "missing-language",
  ]);
});
