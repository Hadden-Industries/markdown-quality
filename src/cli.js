#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { runQuality, createResult } from "./quality.js";
import { terminalText } from "./contracts.js";
const args = process.argv.slice(2);
if (args.length === 0 || ["--help", "-h"].includes(args[0])) {
  process.stdout.write(
    "Usage: markdown-quality <check|format|inspect> [--root PATH] [--config PATH] [--json] [--files-json JSON] [-- literal.md ...]\nFull selection is the default. Comparison options are deferred. Exit: 0 clean, 1 findings, 2 operation failure.\n",
  );
} else {
  const terminator = args.indexOf("--");
  let json = args
    .slice(0, terminator < 0 ? args.length : terminator)
    .includes("--json");
  try {
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: "string" },
        config: { type: "string" },
        json: { type: "boolean" },
        "files-json": { type: "string" },
      },
    });
    const hasTerminator = args.includes("--");
    if (
      positionals.length !== (hasTerminator ? args.length - terminator - 1 : 0)
    )
      throw new Error("Literal filenames must follow --.");
    json = values.json ?? false;
    if (values["files-json"] !== undefined && hasTerminator)
      throw new Error("Use only one explicit selection mode.");
    const files =
      values["files-json"] !== undefined
        ? JSON.parse(values["files-json"])
        : hasTerminator
          ? positionals
          : undefined;
    const result = await runQuality({
      mode: args[0],
      root: values.root,
      config: values.config,
      files,
    });
    if (json) process.stdout.write(JSON.stringify(result) + "\n");
    else {
      for (const d of result.diagnostics)
        process.stdout.write(
          `${terminalText(d.path)}:${d.line}:${d.column}: ${d.source}/${d.rule}: ${terminalText(d.message)}\n`,
        );
      for (const e of result.errors)
        process.stdout.write(`${e.code}: ${terminalText(e.message)}\n`);
      process.stdout.write(
        `${result.outcome}; ${result.selection.mode} selection; ${result.selection.files.length} documents; ${result.written.length} written.\n`,
      );
      if (args[0] === "inspect")
        process.stdout.write(
          JSON.stringify({
            package: result.package,
            preset: result.preset,
            tools: result.tools,
            configDigest: result.configDigest,
            configuration: result.configuration,
            selection: result.selection,
          }) + "\n",
        );
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    const message = error.message.startsWith("Unexpected token")
      ? "Invalid files JSON."
      : error.message;
    const result = createResult(args[0]);
    result.errors = [{ code: "CLI_INPUT", message }];
    process.stdout.write(
      json
        ? JSON.stringify(result) + "\n"
        : `CLI_INPUT: ${terminalText(message)}\n`,
    );
    process.exitCode = 2;
  }
}
