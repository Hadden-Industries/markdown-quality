// SPDX-License-Identifier: AGPL-3.0-only
/** Frozen tooling identities; public runtime limits have separate owners. */
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join, isAbsolute } from "node:path";
import { native, npmCliPath } from "./commands.js";
import { budgets } from "./qualification-budgets.js";
import { assertNativeNpmRuntime } from "./consumer-toolchain.js";
export { native, budgets };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { nodeSupport } = await import("./node-matrix.js");
  const operation = process.argv[2];
  if (operation === "retain") {
    assert.ok(process.env.GITHUB_ENV);
    const npm = process.env.npm_execpath;
    assert.ok(npm, "Retain through the selected producer npm");
    assert.equal(
      assertNativeNpmRuntime(npm).npm,
      nodeSupport.producerNpm.version,
    );
    appendFileSync(
      process.env.GITHUB_ENV,
      `MARKDOWN_QUALITY_PRODUCER_NODE=${process.execPath}\nMARKDOWN_QUALITY_PRODUCER_NPM=${npm}\n`,
    );
  } else if (operation === "producer-npm" || operation === "consumer-npm") {
    const args = ["install", "--ignore-scripts", "--no-audit", "--no-fund"];
    if (operation === "consumer-npm") {
      const directory = resolve(process.argv[3]);
      mkdirSync(directory, { recursive: true });
      const version = process.env.CONSUMER_NPM || nodeSupport.consumerNpm;
      assert.match(version, /^\d+\.\d+\.\d+$/u);
      args.push("--prefix", directory, `npm@${version}`);
    } else {
      assert.ok(
        process.env.GITHUB_PATH,
        "Producer setup requires the hosted path channel",
      );
      args.push("--global", `npm@${nodeSupport.producerNpm.version}`);
    }
    native(process.execPath, [npmCliPath(), ...args], {
      stdio: "inherit",
      timeout: budgets.install,
    });
    if (operation === "producer-npm") {
      const prefix = native(process.execPath, [
        npmCliPath(),
        "prefix",
        "--global",
      ]).trim();
      assert.ok(isAbsolute(prefix) && !/[\r\n]/u.test(prefix));
      appendFileSync(
        process.env.GITHUB_PATH,
        (process.platform === "win32" ? prefix : join(prefix, "bin")) + "\n",
      );
    }
  } else throw new Error("Expected retain, producer-npm or consumer-npm");
}
