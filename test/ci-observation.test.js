// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { consumer, fixtureCommandTimeoutMs } from "./helpers.js";
import { observationEnabled } from "../scripts/ci-observation.js";

const commands = new URL("../scripts/commands.js", import.meta.url).href;
const enabled = { MARKDOWN_QUALITY_OBSERVATION: "windows-ci" };

test("observation logging remains explicitly opt-in", () => {
  assert.equal(observationEnabled({}), false);
  assert.equal(observationEnabled(enabled), true);
});

test("hosted observation refuses release workflows and nonmanual events", () => {
  const environment = {
    ...enabled,
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_WORKFLOW: "Observe Windows CI",
  };
  assert.equal(observationEnabled(environment), true);
  for (const change of [
    { GITHUB_EVENT_NAME: "push" },
    { GITHUB_WORKFLOW: "Qualify a deliberate release" },
    { MARKDOWN_QUALITY_OBSERVATION: "unknown" },
  ])
    assert.throws(() => observationEnabled({ ...environment, ...change }));
});

function npmChild(t, operation, options = {}, profile = "windows-ci") {
  const root = consumer(t);
  writeFileSync(
    join(root, "package.json"),
    '{"name":"observation-fixture","version":"1.0.0","private":true}',
  );
  writeFileSync(
    join(root, "package-lock.json"),
    '{"name":"observation-fixture","version":"1.0.0","lockfileVersion":3,"packages":{"":{"name":"observation-fixture","version":"1.0.0"}}}',
  );
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { npmCommand } from ${JSON.stringify(commands)};
       try {
         npmCommand(${JSON.stringify(operation)}, ${JSON.stringify({ cwd: root, ...options })});
       } catch (error) {
         console.error(JSON.stringify({ caught: true, code: error.cause?.code ?? null }));
         process.exitCode = 37;
       }`,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: fixtureCommandTimeoutMs,
      env: {
        ...process.env,
        MARKDOWN_QUALITY_OBSERVATION: profile,
        GITHUB_ACTIONS: "",
      },
    },
  );
  assert.equal(result.error, undefined);
  const events = result.stderr
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { result, events };
}

test("a real successful offline npm ci retains native phases and both process boundaries", (t) => {
  const { result, events } = npmChild(t, [
    "ci",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(events.length, 2);
  assert.equal(events[0].event, "start");
  assert.equal(events[0].limitMs, 300_000);
  assert.equal(events[0].originalLimitMs, 120_000);
  assert.equal(events[1].id, events[0].id);
  assert.equal(events[1].event, "end");
  assert.equal(events[1].status, 0);
  assert.equal(events[1].error, null);
  assert.ok(
    events[1].completedNpmTimings.some(({ phase }) => phase === "command:ci"),
  );
  assert.equal(events[1].omittedTimingCount, 0);
  assert.equal(events[1].exceededOriginalLimit, false);
});

test("real npm failure and timeout remain failures with diagnostic outcomes", (t) => {
  const failure = npmChild(t, ["unknown-observation-command"]);
  assert.equal(failure.result.status, 37);
  assert.equal(failure.events[1].status, 1);
  assert.equal(failure.events[1].error, null);
  const timeout = npmChild(t, ["ci", "--offline", "--ignore-scripts"], {
    timeout: 1,
  });
  assert.equal(timeout.result.status, 37);
  assert.equal(
    timeout.events[0].limitMs,
    1,
    "Explicit fixture bounds must survive observation",
  );
  assert.equal(timeout.events[1].error, "ETIMEDOUT");
  assert.equal(timeout.events[2].code, "ETIMEDOUT");
});

test("ordinary npm execution emits no observation records", (t) => {
  const { result, events } = npmChild(t, ["--version"], {}, "");
  assert.equal(result.status, 0);
  assert.deepEqual(events, []);
});
