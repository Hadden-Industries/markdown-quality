// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
/** Run a bounded native provider/tool command without a shell. */
export function native(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    shell: false,
    ...options,
  });
  if (result.error || result.status !== 0) {
    const error = new Error(
      `${command} failed (status=${result.status}, signal=${result.signal}): ${[
        result.error?.message,
        result.stderr?.slice(-1000),
        result.stdout?.slice(-1000),
      ]
        .filter(Boolean)
        .join("\n")}`,
    );
    error.status = result.status;
    throw error;
  }
  return result.stdout;
}
/** Resolve the npm shipped with the selected Node installation, without PATH lookup. */
export function npmCliPath(executable = process.execPath) {
  const candidates = [
    join(dirname(executable), "node_modules/npm/bin/npm-cli.js"),
    join(dirname(executable), "../lib/node_modules/npm/bin/npm-cli.js"),
  ];
  const cli = candidates.find(existsSync);
  if (!cli)
    throw new Error("Cannot resolve npm from the selected Node installation.");
  return cli;
}
export function npmCommand(args, options = {}, executable = process.execPath) {
  const cli = npmCliPath(executable);
  const started = performance.now();
  // npm's five-minute per-request default outlives this command's two-minute
  // deadline. Retry only native idempotent reads, inside the unchanged bound.
  const acquisition = ["install", "ci"].includes(args[0])
    ? [
        "--fetch-timeout=15000",
        "--fetch-retries=2",
        "--fetch-retry-factor=2",
        "--fetch-retry-mintimeout=1000",
        "--fetch-retry-maxtimeout=4000",
      ]
    : [];
  const result = spawnSync(executable, [cli, ...args, ...acquisition], {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8_388_608,
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `npm ${args[0]} failed after ${Math.round(performance.now() - started)}ms (status=${result.status}, signal=${result.signal}, error=${result.error?.code ?? "none"}): ${(result.stderr ?? "").slice(0, 2000)}${result.error ? ` ${result.error.message}` : ""}`,
      { cause: result.error },
    );
  return result.stdout;
}
