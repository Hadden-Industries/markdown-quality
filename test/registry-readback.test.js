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

test("installer metadata must expose exact bytes before an accepted publication is ready", async () => {
  let elapsed = 0;
  const requests = [];
  await waitForRegistryIntegrity(name, version, integrity, {
    installMetadata: true,
    now: () => elapsed,
    sleep: async (ms) => {
      elapsed += ms;
    },
    lookup: async (url, timeout, accept) => {
      requests.push({ url, accept });
      assert.ok(timeout <= 10_000);
      if (url.endsWith("/1.0.0")) return available();
      assert.equal(
        url,
        "https://registry.npmjs.org/%40hadden-industries%2Fmarkdown-quality-win32-x64",
      );
      assert.ok(
        [
          "application/json",
          "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
        ].includes(accept),
      );
      return {
        status: 200,
        metadata: {
          name,
          versions: elapsed ? { [version]: available().metadata } : {},
        },
      };
    },
  });
  assert.equal(elapsed, 10_000);
  assert.equal(requests.length, 5);
  assert.equal(requests.at(-1).accept, "application/json");
});

test("installer visibility never retries mismatched bytes, malformed metadata or access failures", async () => {
  for (const result of [
    { status: 403 },
    { status: 503 },
    { status: 200, metadata: { name } },
    { status: 200, metadata: { name, versions: [] } },
    { status: 200, metadata: { name: "wrong", versions: {} } },
    {
      status: 200,
      metadata: {
        name,
        versions: {
          [version]: { ...available().metadata, dist: { integrity: "wrong" } },
        },
      },
    },
    {
      status: 200,
      metadata: {
        name,
        versions: { [version]: { ...available().metadata, version: "9.9.9" } },
      },
    },
  ]) {
    await assert.rejects(
      waitForRegistryIntegrity(name, version, integrity, {
        installMetadata: true,
        lookup: async (url) => (url.endsWith("/1.0.0") ? available() : result),
        sleep: async () =>
          assert.fail("Terminal install metadata failure must not retry"),
      }),
    );
  }
});

test("every allowed package uses complete component encoding for all registry paths", async () => {
  for (const [packageName, encoded] of [
    [
      "@hadden-industries/markdown-quality",
      "%40hadden-industries%2Fmarkdown-quality",
    ],
    [
      "@hadden-industries/markdown-quality-win32-x64",
      "%40hadden-industries%2Fmarkdown-quality-win32-x64",
    ],
    [
      "@hadden-industries/markdown-quality-linux-x64",
      "%40hadden-industries%2Fmarkdown-quality-linux-x64",
    ],
  ]) {
    const metadata = { name: packageName, version, dist: { integrity } };
    const requests = [];
    await waitForRegistryIntegrity(packageName, version, integrity, {
      installMetadata: true,
      lookup: async (url, timeout, accept) => {
        requests.push({ url, accept });
        assert.ok(timeout > 0 && timeout <= 10_000);
        return {
          status: 200,
          metadata: url.endsWith(`/${version}`)
            ? metadata
            : { name: packageName, versions: { [version]: metadata } },
        };
      },
    });
    assert.deepEqual(requests, [
      {
        url: `https://registry.npmjs.org/${encoded}/${version}`,
        accept: "application/json",
      },
      {
        url: `https://registry.npmjs.org/${encoded}`,
        accept:
          "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
      },
      {
        url: `https://registry.npmjs.org/${encoded}`,
        accept: "application/json",
      },
    ]);
    let absentRequests = 0;
    await assertRegistryVersionAbsent(packageName, version, {
      lookup: async (url) => {
        absentRequests++;
        assert.equal(url, `https://registry.npmjs.org/${encoded}/${version}`);
        return { status: 404 };
      },
    });
    assert.equal(absentRequests, 1);
  }
});

test("invalid package identities cause zero requests in readback and absence probes", async () => {
  for (const invalid of [
    `${name}/extra`,
    `${name}%2Fextra`,
    `${name}?version=1`,
    `${name}#fragment`,
    `${name}/../markdown-quality`,
    `${name}\n`,
    ` ${name}`,
    "@wrong/markdown-quality",
    "@hadden-industries/markdown-quality-darwin-x64",
    "@hadden-industries%2Fmarkdown-quality",
    "@hadden-industries\\markdown-quality",
  ]) {
    let requests = 0;
    const lookup = async () => {
      requests++;
      assert.fail("Invalid identity reached lookup");
    };
    await assert.rejects(
      waitForRegistryIntegrity(invalid, version, integrity, {
        lookup,
        installMetadata: true,
      }),
    );
    await assert.rejects(
      assertRegistryVersionAbsent(invalid, version, { lookup }),
    );
    assert.equal(requests, 0, invalid);
  }
});

test("installer 404 and inherited versions wait within the shared deadline", async () => {
  for (const first of [
    { status: 404 },
    {
      status: 200,
      metadata: {
        name,
        versions: Object.create({ [version]: available().metadata }),
      },
    },
  ]) {
    let elapsed = 0;
    let packuments = 0;
    await waitForRegistryIntegrity(name, version, integrity, {
      installMetadata: true,
      now: () => elapsed,
      sleep: async (ms) => {
        elapsed += ms;
      },
      lookup: async (url) =>
        url.endsWith(`/${version}`)
          ? available()
          : ++packuments === 1
            ? first
            : {
                status: 200,
                metadata: {
                  name,
                  versions: { [version]: available().metadata },
                },
              },
    });
    assert.equal(elapsed, 10_000);
    assert.equal(packuments, 3);
  }
});

test("installer metadata shares the original availability deadline", async () => {
  let elapsed = 0;
  await assert.rejects(
    waitForRegistryIntegrity(name, version, integrity, {
      installMetadata: true,
      budget: 1000,
      now: () => elapsed,
      lookup: async (url) => {
        if (url.endsWith("/1.0.0")) return available();
        elapsed = 1001;
        return {
          status: 200,
          metadata: { name, versions: { [version]: available().metadata } },
        };
      },
    }),
    /within five minutes/u,
  );
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
