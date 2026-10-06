// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

async function registryLookup(url, timeout) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
    headers: { accept: "application/json", "cache-control": "no-cache" },
  });
  if (response.status !== 200) {
    await response.body?.cancel();
    return { status: response.status };
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      assert.ok(size <= 262_144, "Registry version metadata exceeds limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return {
    status: 200,
    metadata: JSON.parse(Buffer.concat(chunks).toString("utf8")),
  };
}

export async function waitForRegistryIntegrity(
  name,
  version,
  integrity,
  {
    lookup = registryLookup,
    now = () => performance.now(),
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
    budget = 300_000,
  } = {},
) {
  assert.match(
    name,
    /^@hadden-industries\/markdown-quality(?:-(?:win32|linux)-x64)?$/u,
  );
  assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u);
  assert.match(integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
  assert.ok(Number.isFinite(budget) && budget > 0 && budget <= 300_000);
  const deadline = now() + budget;
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
  for (;;) {
    const remaining = deadline - now();
    assert.ok(
      remaining > 0,
      "Published version did not become available within five minutes",
    );
    const result = await lookup(
      url,
      Math.max(1, Math.floor(Math.min(remaining, 10_000))),
    );
    assert.ok(
      now() < deadline,
      "Published version did not become available within five minutes",
    );
    if (result.status === 200) {
      assert.equal(result.metadata.name, name);
      assert.equal(result.metadata.version, version);
      assert.equal(
        result.metadata.dist?.integrity,
        integrity,
        "Published archive integrity mismatch",
      );
      return;
    }
    assert.equal(
      result.status,
      404,
      "Registry readback failed; only processing 404 is retryable",
    );
    const delay = Math.min(10_000, deadline - now());
    assert.ok(
      delay > 0,
      "Published version did not become available within five minutes",
    );
    await sleep(delay);
  }
}

export async function assertRegistryVersionAbsent(
  name,
  version,
  { lookup = registryLookup } = {},
) {
  assert.match(
    name,
    /^@hadden-industries\/markdown-quality(?:-(?:win32|linux)-x64)?$/u,
  );
  assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u);
  const result = await lookup(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`,
    10_000,
  );
  assert.equal(
    result.status,
    404,
    "First publication requires a proven unattempted effect and absent registry version",
  );
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5);
  if (process.argv[2] === "--absent")
    await assertRegistryVersionAbsent(...process.argv.slice(3));
  else await waitForRegistryIntegrity(...process.argv.slice(2));
  console.log(
    process.argv[2] === "--absent"
      ? "Unattempted version is absent."
      : "Published version is available with the exact approved integrity.",
  );
}
