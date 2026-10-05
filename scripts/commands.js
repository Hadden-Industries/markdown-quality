// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
export function npmCommand(args, options = {}) {
  const candidates = [
    join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ];
  const cli = candidates.find(existsSync);
  if (!cli)
    throw new Error("Cannot resolve npm from the selected Node installation.");
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8_388_608,
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `npm ${args[0]} failed: ${(result.stderr ?? "").slice(0, 2000)}`,
    );
  return result.stdout;
}
