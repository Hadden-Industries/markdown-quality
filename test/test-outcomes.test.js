// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { consumer } from "./helpers.js";

test("native test progress is observable before a test can finish", async (t) => {
  const root = consumer(t);
  const fixture = join(root, "waiting.test.mjs");
  const unlock = join(root, "continue");
  writeFileSync(
    fixture,
    `import test from "node:test";
    import { existsSync } from "node:fs";
    import { setTimeout } from "node:timers/promises";
    test("waiting for parent", { timeout: 4000 }, async (t) => {
      while (!existsSync(${JSON.stringify(unlock)}))
        await setTimeout(10, undefined, { signal: t.signal });
    });`,
  );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(
    process.execPath,
    [
      "--test",
      "--test-reporter=" +
        new URL("../scripts/test-outcomes.js", import.meta.url).href,
      fixture,
    ],
    { env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], timeout: 5000 },
  );
  const closed = new Promise((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal })),
  );
  let diagnostic = "";
  child.stderr.on("data", (bytes) => {
    diagnostic = (diagnostic + bytes).slice(-2000);
  });
  const events = [];
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      const event = JSON.parse(line);
      events.push(event);
      if (
        event.type === "test:dequeue" &&
        event.name === "waiting for parent"
      ) {
        // This marker unlocks completion. Buffered outcome-only reporting cannot
        // reach it, and the diagnostic subprocess deadline fails the test.
        writeFileSync(unlock, "continue\n");
      }
    }
    const result = await closed;
    assert.equal(result.code, 0, diagnostic + JSON.stringify(events));
    assert.ok(
      events.some(
        (event) =>
          event.type === "test:dequeue" && event.name === "waiting for parent",
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "test:pass" && event.name === "waiting for parent",
      ),
    );
  } finally {
    child.kill();
    await closed;
  }
});

test("native failure diagnostics retain throwing frames and error metadata", (t) => {
  const root = consumer(t);
  const fixture = join(root, "failure.test.mjs");
  writeFileSync(
    fixture,
    `import test from "node:test";
    function innerFailure() {
      throw Object.assign(new Error("outer diagnostic", { cause: new Error("inner cause") }), {
        code: "FIXTURE_FAILURE", actual: 7, expected: 8,
      });
    }
    test("throws inside helper", () => innerFailure());`,
  );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-reporter=" +
        new URL("../scripts/test-outcomes.js", import.meta.url).href,
      fixture,
    ],
    { env, windowsHide: true, encoding: "utf8", timeout: 5000 },
  );
  assert.equal(result.status, 1, result.stderr);
  const events = result.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const failure = events.find((event) => event.type === "test:fail");
  assert.equal(failure.failure, "outer diagnostic");
  assert.equal(
    Object.hasOwn(failure, "stack"),
    false,
    "Compared outcomes must stay independent of call stacks",
  );
  const diagnostic = events
    .filter((event) => event.type === "test:diagnostic")
    .map((event) => event.message)
    .join("\n");
  for (const expected of [
    /innerFailure/u,
    /failure\.test\.mjs:\d+:\d+/u,
    /FIXTURE_FAILURE/u,
    /inner cause/u,
    /actual: 7/u,
    /expected: 8/u,
  ])
    assert.match(diagnostic, expected);
});
