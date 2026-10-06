// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  waitForRegistryIntegrity,
  assertRegistryVersionAbsent,
} from "../scripts/wait-registry-integrity.js";
const name = "@hadden-industries/markdown-quality-win32-x64";
const version = "1.0.0";
const integrity = `sha512-${"A".repeat(86)}==`;
const available = () => ({
  status: 200,
  metadata: { name, version, dist: { integrity } },
});

test("accepted asynchronous publication waits for exact visible bytes without republishing", async () => {
  let requests = 0;
  let elapsed = 0;
  await waitForRegistryIntegrity(name, version, integrity, {
    now: () => elapsed,
    sleep: async (ms) => {
      elapsed += ms;
    },
    lookup: async (url, timeout) => {
      assert.equal(
        url,
        "https://registry.npmjs.org/%40hadden-industries%2Fmarkdown-quality-win32-x64/1.0.0",
      );
      assert.ok(timeout <= 10_000);
      return ++requests < 3 ? { status: 404 } : available();
    },
  });
  assert.equal(requests, 3);
  assert.equal(elapsed, 20_000);
});

test("first-effect absence probe is one read and rejects existing or unavailable versions", async () => {
  let requests = 0;
  await assertRegistryVersionAbsent(name, version, {
    lookup: async () => {
      requests++;
      return { status: 404 };
    },
  });
  assert.equal(requests, 1);
  for (const status of [200, 401, 403, 429, 500, 503]) {
    requests = 0;
    await assert.rejects(
      assertRegistryVersionAbsent(name, version, {
        lookup: async () => {
          requests++;
          return { status };
        },
      }),
    );
    assert.equal(requests, 1);
  }
});

test("a late successful response cannot extend the readback deadline", async () => {
  let elapsed = 0;
  await assert.rejects(
    waitForRegistryIntegrity(name, version, integrity, {
      budget: 1000,
      now: () => elapsed,
      lookup: async () => {
        elapsed = 1001;
        return available();
      },
    }),
    /within five minutes/u,
  );
  await assert.rejects(
    waitForRegistryIntegrity(name, version, integrity, { budget: 300001 }),
  );
});

test("processing wait expires and leaves the immutable publication untouched", async () => {
  let elapsed = 0;
  let requests = 0;
  await assert.rejects(
    waitForRegistryIntegrity(name, version, integrity, {
      budget: 15_000,
      now: () => elapsed,
      sleep: async (ms) => {
        elapsed += ms;
      },
      lookup: async () => {
        requests++;
        return { status: 404 };
      },
    }),
    /did not become available/u,
  );
  assert.equal(elapsed, 15_000);
  assert.equal(requests, 2);
});

test("mismatched bytes and non-processing failures are terminal", async () => {
  for (const result of [
    { status: 403 },
    { status: 503 },
    {
      ...available(),
      metadata: { name, version, dist: { integrity: "wrong" } },
    },
    {
      ...available(),
      metadata: { name: "other", version, dist: { integrity } },
    },
  ]) {
    let requests = 0;
    await assert.rejects(
      waitForRegistryIntegrity(name, version, integrity, {
        lookup: async () => {
          requests++;
          return result;
        },
        sleep: async () => {
          assert.fail("Terminal failure must not retry");
        },
      }),
    );
    assert.equal(requests, 1);
  }
});
