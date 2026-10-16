// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { consumer } from "./helpers.js";
import { npmCommand } from "../scripts/commands.js";

test("a stalled registry read retries within the unchanged install deadline", async (t) => {
  const root = consumer(t),
    fixture = join(root, "fixture"),
    install = join(root, "install");
  mkdirSync(fixture);
  mkdirSync(install);
  writeFileSync(
    join(fixture, "package.json"),
    JSON.stringify({ name: "mq-network-fixture", version: "1.0.0" }),
  );
  const packed = JSON.parse(
    npmCommand(["pack", "--json", "--ignore-scripts"], { cwd: fixture }),
  );
  const archive = (Array.isArray(packed) ? packed : Object.values(packed))[0];
  const server = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import http from "node:http";
    import { readFileSync, writeFileSync } from "node:fs";
    const attempts = {};
    const server = http.createServer((request, response) => {
      if (request.url === "/fixture.tgz") {
        response.end(readFileSync(process.argv[1]));
        return;
      }
      const representation = request.headers.accept ?? "default";
      attempts[representation] = (attempts[representation] ?? 0) + 1;
      writeFileSync(process.argv[2], JSON.stringify(attempts));
      // Each metadata representation stalls once, whether npm requests them
      // concurrently or serially. Success requires recovery of the same read.
      if (attempts[representation] === 1) return;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ name: "mq-network-fixture", "dist-tags": { latest: "1.0.0" }, versions: {
        "1.0.0": { name: "mq-network-fixture", version: "1.0.0", dist: { tarball: "http://127.0.0.1:" + server.address().port + "/fixture.tgz" } }
      } }));
    });
    server.listen(0, "127.0.0.1", () => process.stdout.write(String(server.address().port)));
  `,
      join(fixture, archive.filename),
      join(root, "requests"),
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  t.after(async () => {
    server.kill();
    await once(server, "exit");
  });
  const [port] = await once(server.stdout, "data");
  writeFileSync(
    join(install, "package.json"),
    JSON.stringify({
      name: "recipient",
      version: "1.0.0",
      private: true,
      dependencies: { "mq-network-fixture": "1.0.0" },
    }),
  );
  const empty = join(root, "empty-npmrc");
  writeFileSync(empty, "");
  writeFileSync(join(root, "global-npmrc"), "");
  npmCommand(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--registry=http://127.0.0.1:" + port,
    ],
    {
      cwd: install,
      timeout: 30000,
      env: {
        ...process.env,
        NPM_CONFIG_USERCONFIG: empty,
        NPM_CONFIG_GLOBALCONFIG: join(root, "global-npmrc"),
        NPM_CONFIG_CACHE: join(root, "cache"),
      },
    },
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        join(install, "node_modules/mq-network-fixture/package.json"),
      ),
    ).version,
    "1.0.0",
  );
  assert.ok(
    Object.values(JSON.parse(readFileSync(join(root, "requests")))).some(
      (attempts) => attempts > 1,
    ),
    "Only idempotent stalled reads are retried",
  );
});
