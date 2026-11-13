// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { observeCommand } from "./ci-observation.js";
import { budgets } from "./qualification-budgets.js";
import { assertNativeNpmRuntime } from "./consumer-toolchain.js";
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
      { cause: result.error },
    );
    error.status = result.status;
    error.code = result.error?.code;
    // SDK failures end with a compact typed JSON record. Retain a bounded
    // tail so the caller can classify it without replacing native failure.
    error.stdout = String(result.stdout ?? "").slice(-8192);
    error.stderr = String(result.stderr ?? "").slice(-8192);
    error.httpStatus =
      Number(/\(HTTP (\d{3})\)/u.exec(error.stderr)?.[1]) || undefined;
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
  const cli =
    arguments.length < 3 && executable === process.execPath
      ? (process.env.MARKDOWN_QUALITY_CONSUMER_NPM ??
        (process.env.MARKDOWN_QUALITY_PRODUCER_NODE === process.execPath
          ? process.env.MARKDOWN_QUALITY_PRODUCER_NPM
          : null) ??
        npmCliPath(executable))
      : npmCliPath(executable);
  if (executable === process.execPath) assertNativeNpmRuntime(cli);
  return runNpm(executable, cli, args, options);
}

/** Producer work retains its paired Node/npm even inside a consumer lane. */
export function producerToolchain(environment = process.env) {
  const executable = environment.MARKDOWN_QUALITY_PRODUCER_NODE;
  const cli = environment.MARKDOWN_QUALITY_PRODUCER_NPM;
  if (executable === undefined && cli === undefined)
    return { executable: process.execPath, cli: npmCliPath() };
  if (
    typeof executable !== "string" ||
    typeof cli !== "string" ||
    !isAbsolute(executable) ||
    !isAbsolute(cli) ||
    /[\r\n]/u.test(executable + cli)
  )
    throw new Error("Producer Node and npm must be a complete absolute pair.");
  return { executable, cli };
}

export function producerNpmCommand(args, options = {}) {
  const { executable, cli } = producerToolchain();
  const version =
    executable === process.execPath
      ? process.versions.node
      : native(executable, ["-p", "process.versions.node"]).trim();
  assertNativeNpmRuntime(cli, version);
  return runNpm(executable, cli, args, options);
}

function runNpm(executable, cli, args, options) {
  const started = performance.now();
  const installing = ["install", "ci"].includes(args[0]);
  // Bound individual requests within the tooling acquisition budget.
  // Retry only npm's native idempotent reads, never the outer command.
  const acquisition = installing
    ? [
        "--fetch-timeout=15000",
        "--fetch-retries=2",
        "--fetch-retry-factor=2",
        "--fetch-retry-mintimeout=1000",
        "--fetch-retry-maxtimeout=4000",
        // Native phase timings make a killed acquisition diagnosable without
        // enabling verbose request/configuration logging or another upload.
        "--timing",
      ]
    : [];
  const settings = {
    encoding: "utf8",
    timeout: installing ? budgets.install : budgets.read,
    maxBuffer: 8_388_608,
    windowsHide: true,
    ...options,
  };
  const observed = observeCommand(
    `npm ${args[0]}`,
    // Keep the original diagnostic baseline after production budget adoption.
    options.timeout ?? 120_000,
    settings.timeout,
    {
      executable,
      cli,
      cwd: options.cwd ?? process.cwd(),
    },
  );
  const result = spawnSync(
    executable,
    [cli, ...args, ...acquisition],
    settings,
  );
  const stderr = result.stderr ?? "";
  const timings = [
    ...stderr.matchAll(
      /^npm timing ([^\r\n]{1,160}) Completed in (\d{1,12})ms\r?$/gmu,
    ),
  ]
    .map((match) => ({
      phase: match[1].slice(0, 80),
      elapsedMs: Number(match[2]),
    }))
    .sort((a, b) => b.elapsedMs - a.elapsedMs);
  observed(result, {
    completedNpmTimings: timings.slice(0, 512),
    omittedTimingCount: Math.max(0, timings.length - 512),
  });
  if (result.error || result.status !== 0) {
    // Retain the expensive completed phases even when later short phases push
    // them out of the tail. This is diagnostic output, never an admission rule.
    const slowest = [
      ...timings.slice(0, 1),
      ...timings
        .filter(
          (timing) =>
            timing !== timings[0] &&
            /^(?:idealTree|reifyNode):/u.test(timing.phase),
        )
        .slice(0, 2),
    ];
    const summary = slowest.length
      ? `Completed npm timings (overall and dependency phases): ${JSON.stringify(slowest)}\n`
      : "";
    const diagnostic = summary + stderr.slice(-(2000 - summary.length));
    const error = new Error(
      `npm ${args[0]} failed after ${Math.round(performance.now() - started)}ms (status=${result.status}, signal=${result.signal}, error=${result.error?.code ?? "none"}): ${diagnostic}${result.error ? ` ${result.error.message}` : ""}`,
      { cause: result.error },
    );
    error.stdout = String(result.stdout ?? "").slice(-8192);
    error.stderr = String(stderr).slice(-8192);
    error.code = result.error?.code;
    try {
      const record = JSON.parse(error.stdout);
      error.code ??= record.error?.code;
      error.httpStatus =
        Number(
          record.error?.statusCode ?? /^E(\d{3})$/u.exec(error.code ?? "")?.[1],
        ) || undefined;
    } catch {
      /* Native process failures can have no JSON payload. */
    }
    throw error;
  }
  return result.stdout;
}
