// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const packageName = "@hadden-industries/markdown-quality-linux-x64";
const commands = new URL("../scripts/commands.js", import.meta.url).href;
const family = new URL("../scripts/family-labels.js", import.meta.url).href;
const child = `
  import { npmCommand } from ${JSON.stringify(commands)};
  import { npmRequestDiagnostic } from ${JSON.stringify(family)};
  const endpoint = process.argv[1];
  try {
    npmCommand(process.argv.slice(2));
    throw new Error("Expected a native npm failure");
  } catch (error) {
    process.stdout.write(JSON.stringify({
      status: error.status, signal: error.signal,
      report: error.stdout ? JSON.parse(error.stdout).error : null,
      diagnostic: npmRequestDiagnostic(error, endpoint),
    }));
  }
`;

test("native npm reports the refused method and refuses to replay a failed DELETE", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "markdown-quality-label-test-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  const seen = [];
  let refusal;
  const server = createServer((request, response) => {
    seen.push(request.method);
    if (request.method === "DELETE" && refusal === "disconnect") {
      request.socket.destroy();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    if (request.method === refusal) {
      response.statusCode = 401;
      response.end("{}");
    } else if (request.method === "DELETE") {
      response.statusCode = 503;
      response.end("{}");
    } else response.end('{"pilot":"3.0.2"}');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const registry = `http://127.0.0.1:${server.address().port}/`;
  const endpoint = `${registry}-/package/@hadden-industries%2fmarkdown-quality-linux-x64/dist-tags/pilot`;
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) =>
      /^(?:systemroot|windir|path|pathext|temp|tmp|localappdata|appdata|userprofile|home)$/iu.test(
        name,
      ),
    ),
  );
  for (const [kind, expected] of [
    ["GET", ["GET"]],
    ["DELETE", ["GET", "DELETE"]],
    ["unavailable", ["GET", "DELETE"]],
    ["disconnect", ["GET", "DELETE"]],
  ]) {
    refusal = kind;
    seen.length = 0;
    const { stdout } = await execute(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        child,
        "--",
        endpoint,
        "dist-tag",
        "rm",
        packageName,
        "pilot",
        `--registry=${registry}`,
        "--fetch-retries=0",
        "--no-update-notifier",
        "--json",
        `--userconfig=${join(directory, "user.npmrc")}`,
        `--globalconfig=${join(directory, "global.npmrc")}`,
        `--cache=${join(directory, "cache")}`,
      ],
      { cwd: directory, env, timeout: 15_000, windowsHide: true },
    );
    assert.deepEqual(seen, expected);
    const error = JSON.parse(stdout);
    assert.equal(error.status, 1);
    assert.equal(error.signal, null);
    if (["GET", "DELETE"].includes(kind)) {
      assert.equal(error.report.code, "E401");
      assert.match(
        error.report.summary,
        new RegExp(`^401 Unauthorized - ${kind} http:`, "u"),
      );
    }
    assert.deepEqual(
      error.diagnostic.refusal,
      kind === "DELETE"
        ? { method: "DELETE", status: 401, endpoint }
        : undefined,
    );
  }
});
