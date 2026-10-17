// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync, closeSync, openSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommand } from "./commands.js";
export const hostedNpmVersion = "12.2.0";
export const selectedNodePrefix = (executable, platform) =>
  platform === "win32"
    ? dirname(executable)
    : resolve(dirname(executable), "..");
export function npmIsolation(temp) {
  assert.ok(temp && !/[\r\n]/u.test(temp));
  return {
    NPM_CONFIG_USERCONFIG: join(temp, "publication-user.npmrc"),
    NPM_CONFIG_GLOBALCONFIG: join(temp, "publication-global.npmrc"),
    NPM_CONFIG_CACHE: join(temp, "publication-cache"),
  };
}
export function acquireHostedNpm(
  env,
  command = npmCommand,
  executable = process.execPath,
  platform = process.platform,
) {
  const isolation = npmIsolation(env.RUNNER_TEMP);
  for (const [key, path] of Object.entries(isolation))
    assert.equal(env[key], path);
  assert.equal(env.NPM_CONFIG_IGNORE_SCRIPTS, "true");
  for (const key of ["NPM_CONFIG_USERCONFIG", "NPM_CONFIG_GLOBALCONFIG"])
    closeSync(openSync(isolation[key], "a"));
  command(
    [
      "install",
      "--global",
      `npm@${hostedNpmVersion}`,
      "--prefix",
      selectedNodePrefix(executable, platform),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--registry=https://registry.npmjs.org/",
    ],
    // Use the shared five-minute acquisition budget, including publisher setup.
    { env },
  );
  assert.equal(
    command(["--version"], { env }).trim(),
    hostedNpmVersion,
    "Selected Node npm version mismatch",
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3);
  if (process.argv[2] === "isolate") {
    assert.ok(process.env.GITHUB_ENV);
    appendFileSync(
      process.env.GITHUB_ENV,
      Object.entries(npmIsolation(process.env.RUNNER_TEMP))
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
  } else {
    assert.equal(process.argv[2], "acquire");
    acquireHostedNpm(process.env);
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `node-executable=${process.execPath}\n`,
      );
  }
}
