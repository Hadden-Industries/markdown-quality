// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  openJsonRepositorySession,
  formatJsonValue,
  validateJsonQualityEvent,
  verifyJsonQualityInstallation,
  admitJsonPolicy,
  jsonContract,
} from "../../tooling/json/public-api.mjs";

async function fixture(t, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), "markdown-json-consumer-"));
  execFileSync("git", ["init", "--quiet", root], { windowsHide: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const policy = {
    schemaVersion: 2,
    defaults: {
      formatContract: "prettier-json",
      allowFormatWrites: true,
      normalization: "NFC",
    },
    exceptions: [
      {
        paths: ["node_modules/**", "tooling/json/node_modules/**"],
        owner: "Repository owner",
        reason: "Repository npm installations are excluded",
        exclude: true,
      },
    ],
    ...extra,
  };
  writeFileSync(
    join(root, ".json-quality.json"),
    await formatJsonValue(policy),
  );
  return root;
}

async function events(session) {
  const collected = []; // Finite fixture event metadata, not production retention.
  for await (const event of session.events()) {
    assert.equal(validateJsonQualityEvent(event), true);
    collected.push(event);
  }
  return collected;
}
async function checked(root, options = {}) {
  const session = await openJsonRepositorySession({ root, ...options });
  try {
    return await events(session);
  } finally {
    await session.close();
  }
}

test("native installed payload and generated bootstrap match their exact source", async () => {
  await verifyJsonQualityInstallation({
    toolingRoot: fileURLToPath(new URL("../../tooling/json/", import.meta.url)),
    bootstrapPath: fileURLToPath(
      new URL(
        "../../scripts/installRepositoryQualityTools.mjs",
        import.meta.url,
      ),
    ),
  });
});

test("complete read-only verification checks presentation and preserves original numeric bytes", async (t) => {
  const root = await fixture(t),
    path = join(root, "selected.json");
  const original = '{"value":1.00e+2}';
  writeFileSync(path, original);
  const result = await checked(root, { capacityLimits: false });
  assert.equal(result.at(-1).type, "execution-terminal");
  assert.equal(result.at(-1).inventoryComplete, true);
  assert.equal(result.at(-1).contractSatisfied, false);
  assert.ok(
    result.some(
      (event) => event.type === "finding" && event.path === "selected.json",
    ),
  );
  assert.equal(
    result.some((event) => event.type === "written"),
    false,
  );
  assert.equal(readFileSync(path, "utf8"), original);
});

test("repository policy keeps release JSON ordinary and preservation limited to verified immutable members", () => {
  const policy = admitJsonPolicy(
    JSON.parse(
      readFileSync(new URL("../../.json-quality.json", import.meta.url)),
    ),
  );
  for (const path of [
    "docs/releases/1.0.2.json",
    "docs/releases/1.0.3.json",
    "docs/releases/future.json",
  ]) {
    const contract = jsonContract(path, policy, { tracked: true });
    assert.equal(contract.exclude, false);
    assert.equal(contract.formatContract, "prettier-json");
    assert.equal(contract.allowFormatWrites, true);
    assert.equal(contract.normalization, "NFC");
    assert.deepEqual(contract.exceptions, []);
  }
  assert.deepEqual(
    policy.exceptions
      .filter((rule) => rule.exclude)
      .flatMap((rule) => rule.paths),
    ["node_modules/**", "tooling/json/node_modules/**"],
  );
  for (const path of [
    "node_modules/a/node_modules/b/package.json",
    "tooling/json/node_modules/a/node_modules/b/package.json",
  ])
    assert.equal(jsonContract(path, policy).exclude, true, path);
  for (const path of [
    "dist/json-qualification/core.tgz!/package/node_modules/format/component.json",
    "dist/json-qualification/core.tgz!/package/node_modules/a/node_modules/b/package.json",
  ])
    assert.equal(jsonContract(path, policy).exclude, false, path);
  assert.deepEqual(
    policy.preserveSourcePresentation.flatMap((rule) => rule.paths).sort(),
    [
      "dist/json-qualification/hadden-industries-markdown-quality-1.0.3.tgz!/package/node_modules/**",
      "packages/linux-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
      "packages/win32-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
    ],
  );
});

test("hidden and ignored peers stay included while root and nested installations are pruned", async (t) => {
  const root = await fixture(t);
  for (const path of [
    "node_modules",
    "tooling/json/node_modules",
    ".hidden",
    "ignored",
  ])
    mkdirSync(join(root, path), { recursive: true });
  for (const path of [
    "node_modules/bad.json",
    "tooling/json/node_modules/bad.json",
    ".hidden/bad.json",
    "ignored/bad.json",
  ])
    writeFileSync(join(root, path), "{invalid");
  writeFileSync(join(root, ".gitignore"), "ignored/\n");
  const result = await checked(root);
  assert.equal(result.at(-1).inventoryComplete, true);
  assert.equal(result.at(-1).contractSatisfied, false);
  const found = result.filter((event) => event.type === "finding");
  for (const path of [".hidden/bad.json", "ignored/bad.json"])
    assert.ok(found.some((event) => event.path === path));
  assert.ok(found.every((event) => !event.path?.includes("node_modules")));
});

test("a bad included peer blocks an eligible formatting batch without writes", async (t) => {
  const root = await fixture(t),
    original = '{"ordinary":1}\n';
  writeFileSync(join(root, "ordinary.json"), original);
  execFileSync("git", ["-C", root, "add", "ordinary.json"], {
    windowsHide: true,
  });
  writeFileSync(join(root, "bad.json"), '{"duplicate":1,"duplicate":2}\n');
  const session = await openJsonRepositorySession({ root, retainValues: true });
  try {
    const result = await events(session);
    assert.equal(result.at(-1).contractSatisfied, false);
    let terminal;
    for await (const event of session.rewrite("format", {
      files: ["ordinary.json"],
    })) {
      assert.equal(validateJsonQualityEvent(event), true);
      terminal = event;
    }
    assert.equal(terminal.type, "write-failure");
    assert.equal(terminal.written, "0");
    assert.equal(terminal.preflightComplete, false);
    assert.equal(readFileSync(join(root, "ordinary.json"), "utf8"), original);
  } finally {
    await session.close();
  }
});

test("release documents are ordinary owned JSON including a newly added peer", async (t) => {
  const root = await fixture(t);
  mkdirSync(join(root, "docs/releases"), { recursive: true });
  writeFileSync(
    join(root, "docs/releases/new.json"),
    '{"duplicate":1,"duplicate":2}\n',
  );
  const result = await checked(root);
  assert.equal(result.at(-1).inventoryComplete, true);
  assert.equal(result.at(-1).contractSatisfied, false);
  assert.ok(
    result.some(
      (event) =>
        event.type === "finding" && event.path === "docs/releases/new.json",
    ),
  );
});

test("original bytes reject BOM, invalid UTF-8, escaped duplicates and JSON dialect extensions", async (t) => {
  const root = await fixture(t);
  const invalid = {
    "bom.json": Buffer.from('\ufeff{"value":1}\n'),
    "utf8.json": Buffer.from([123, 34, 118, 34, 58, 34, 255, 34, 125]),
    "escaped.json": '{"name":1,"\\u006eame":2}\n',
    "comments.json": '{/* comment */"value":1}\n',
    "trailing.json": '{"value":1,}\n',
  };
  for (const [path, bytes] of Object.entries(invalid))
    writeFileSync(join(root, path), bytes);
  writeFileSync(
    join(root, "outer.json"),
    await formatJsonValue({ embedded: "{invalid JSON", literal: "\\u0061" }),
  );
  const result = await checked(root);
  assert.equal(result.at(-1).inventoryComplete, true);
  assert.equal(result.at(-1).contractSatisfied, false);
  const found = result.filter((event) => event.type === "finding");
  for (const path of Object.keys(invalid))
    assert.ok(
      found.some((event) => event.path === path),
      path,
    );
  assert.ok(found.every((event) => event.path !== "outer.json"));
});

test("tracked JSON cannot disappear behind the installation boundary", async (t) => {
  const root = await fixture(t);
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "node_modules/tracked.json"), "{invalid");
  execFileSync(
    "git",
    ["-C", root, "add", "--force", "node_modules/tracked.json"],
    { windowsHide: true },
  );
  const result = await checked(root);
  assert.equal(result.at(-1).inventoryComplete, true);
  assert.equal(result.at(-1).contractSatisfied, false);
  assert.ok(
    result.some(
      (event) =>
        event.type === "finding" && event.path === "node_modules/tracked.json",
    ),
  );
});

const nativeDefinition = {
  id: "test-native",
  provider: "fixture",
  owner: "Fixture native owner",
  reason: "Native coverage is mandatory",
  minimumDocuments: 1,
};
test("a required native provider cannot be omitted into a physical-only pass", async (t) => {
  const root = await fixture(t, { nativeSources: [nativeDefinition] });
  await assert.rejects(openJsonRepositorySession({ root }), /provider/iu);
});

test("changed independently declared native authority blocks document admission", async (t) => {
  for (const mutate of [false, true]) {
    const root = await fixture(t, { nativeSources: [nativeDefinition] });
    const bytes = Buffer.from('{\n  "value": 1\n}\n');
    const pin = {
      path: "authority.bin",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: String(bytes.length),
    };
    writeFileSync(join(root, pin.path), bytes);
    let opened = false;
    const provider = () => {
      if (mutate) writeFileSync(join(root, pin.path), '{\n  "value": 2\n}\n');
      return {
        authorities: (async function* () {
          yield pin;
        })(),
        inventory: (async function* () {
          yield {
            path: "authority.bin",
            sha256: pin.sha256,
            byteLength: pin.byteLength,
            source: { kind: "content-addressed", ...pin },
          };
        })(),
        documents: (async function* () {
          opened = true;
          yield {
            path: "authority.bin",
            chunks: (async function* () {
              yield bytes;
            })(),
          };
        })(),
      };
    };
    if (mutate) {
      await assert.rejects(
        checked(root, { nativeProviders: { fixture: provider } }),
        /identity|changed|digest/iu,
      );
      assert.equal(opened, false);
    } else {
      const result = await checked(root, {
        nativeProviders: { fixture: provider },
      });
      assert.equal(result.at(-1).contractSatisfied, true);
      assert.equal(opened, true);
    }
  }
});
