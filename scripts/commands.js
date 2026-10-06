// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
/** Resolve the npm shipped with the selected Node installation, without PATH lookup. */
export function npmCliPath() {
  const candidates = [
    join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ];
  const cli = candidates.find(existsSync);
  if (!cli)
    throw new Error("Cannot resolve npm from the selected Node installation.");
  return cli;
}
export function npmCommand(args, options = {}) {
  const cli = npmCliPath();
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
