// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";

test("the public Node SDK imports and executes an empty selection", async (t) => {
  const { runQuality } = await import("@hadden-industries/markdown-quality");
  const result = await runQuality({ root: consumer(t, {}), files: [] });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.selection.files, []);
});

test("browser imports reject the SDK while published resources remain resolvable", () => {
  // Node also supplies its own condition: browser must take precedence, and the
  // export-map rejection must happen before any Node-only dependency is loaded.
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=browser",
      "--input-type=module",
      "--eval",
      `
        import assert from "node:assert/strict";
        await assert.rejects(import("@hadden-industries/markdown-quality"), {
          code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
        });
        for (const name of [
          "configuration-schema", "result-schema", "effective-configuration-schema",
          "comparison-schema", "execution-schema",
        ]) {
          const { default: schema } = await import(
            "@hadden-industries/markdown-quality/" + name,
            { with: { type: "json" } },
          );
          assert.equal(typeof schema, "object");
        }
        assert.ok(import.meta.resolve(
          "@hadden-industries/markdown-quality/qualification-observer",
        ).endsWith("/assets/qualification/observe.py"));
      `,
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      encoding: "utf8",
      timeout: fixtureCommandTimeoutMs,
    },
  );
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
});
