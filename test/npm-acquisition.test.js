// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { consumer } from "./helpers.js";
import { npmCommand } from "../scripts/commands.js";

/** Own the server until consumption finishes, before test filesystem cleanup. */
async function withFixtureServer(source, args, consume) {
  const server = spawn(
    process.execPath,
    ["--input-type=module", "-e", source, ...args],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let diagnostic = "";
  server.stderr.on("data", (bytes) => {
    diagnostic = (diagnostic + bytes).slice(-2000);
  });
  // Observe completion before startup: an already-exited child will not emit
  // another close when cleanup calls kill().
  const closed = new Promise((resolve) => server.once("close", resolve));
  const startup = new AbortController();
  const deadline = setTimeout(() => startup.abort(), 5000);
  try {
    let port;
    try {
      [port] = await Promise.race([
        once(server.stdout, "data", { signal: startup.signal }),
        closed.then((code) => {
          throw new Error(`Registry fixture exited (${code}): ${diagnostic}`);
        }),
        once(server, "error", { signal: startup.signal }).then(([error]) => {
          throw error;
        }),
      ]);
    } finally {
      clearTimeout(deadline);
      startup.abort();
    }
    assert.match(String(port), /^\d+$/u);
    return await consume(port);
  } finally {
    // Node skips later after hooks if an earlier one throws. Stop this child
    // before the consumer fixture's after hook attempts to remove its files.
    server.kill();
    await closed;
  }
}

test("a registry startup failure reports its diagnostic and cleanup completes", async () => {
  await assert.rejects(
    withFixtureServer(
      'console.error("fixture startup failure"); process.exit(7)',
      [],
      () => assert.fail("A failed server cannot serve a consumer"),
    ),
    /Registry fixture exited \(7\): fixture startup failure/u,
  );
});

test("a failed registry consumer closes its server before filesystem cleanup", async () => {
  let pid;
  const failure = new Error("injected consumer failure");
  await assert.rejects(
    withFixtureServer(
      "process.stdout.write(String(process.pid)); setInterval(() => {}, 1000)",
      [],
      (value) => {
        pid = Number(value);
        assert.equal(
          process.kill(pid, 0),
          true,
          "Server must be live during consumption",
        );
        throw failure;
      },
    ),
    (error) => error === failure,
  );
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("an install timeout reports bounded native npm phase diagnostics", async (t) => {
  const root = consumer(t);
  writeFileSync(join(root, "package.json"), JSON.stringify({ private: true }));
  writeFileSync(join(root, "user-npmrc"), "");
  writeFileSync(join(root, "global-npmrc"), "");
  await withFixtureServer(
    `import http from "node:http";
     const server = http.createServer(() => {});
     server.listen(0, "127.0.0.1", () => process.stdout.write(String(server.address().port)));`,
    [],
    (port) => {
      assert.throws(
        () =>
          npmCommand(
            [
              "install",
              "mq-network-fixture@1.0.0",
              "--ignore-scripts",
              "--no-audit",
              "--no-fund",
              "--registry=http://127.0.0.1:" + port,
            ],
            {
              cwd: root,
              timeout: 5000,
              env: {
                ...process.env,
                NPM_CONFIG_USERCONFIG: join(root, "user-npmrc"),
                NPM_CONFIG_GLOBALCONFIG: join(root, "global-npmrc"),
                NPM_CONFIG_CACHE: join(root, "cache"),
              },
            },
          ),
        (error) => {
          assert.equal(error.cause?.code, "ETIMEDOUT");
          assert.match(error.message, /npm timing .+ Completed in \d+ms/u);
          assert.ok(error.message.length < 2500);
          return true;
        },
      );
    },
  );
});

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
  await withFixtureServer(
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
    [join(fixture, archive.filename), join(root, "requests")],
    (port) => {
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
    },
  );
});
