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
  runJsonQuality,
  formatJsonValue,
  validateJsonQualityResult,
  verifyJsonQualityInstallation,
  readJsonPolicy,
  jsonContract,
} from "../../tooling/json/public-api.mjs";

async function fixture(t, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), "markdown-json-consumer-"));
  execFileSync("git", ["init", "--quiet", root], { windowsHide: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const policy = {
    schemaVersion: 1,
    defaults: {
      formatContract: "prettier-json",
      allowFormatWrites: true,
      normalization: "NFC",
    },
    exceptions: [
      {
        paths: ["**/node_modules/**"],
        owner: "Repository owner",
        reason: "Every npm installation is excluded",
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

test("native installed payload and generated bootstrap match their exact source", async () => {
  await verifyJsonQualityInstallation({
    toolingRoot: new URL("../../tooling/json/", import.meta.url),
    bootstrapPath: new URL(
      "../../scripts/installRepositoryQualityTools.mjs",
      import.meta.url,
    ),
  });
});

test("repository policy keeps release JSON ordinary and preservation limited to verified immutable members", async () => {
  const policy = await readJsonPolicy(
    fileURLToPath(new URL("../../", import.meta.url)),
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
    ["**/node_modules/**"],
  );
  assert.deepEqual(
    policy.preserveSourcePresentation.flatMap((rule) => rule.paths).sort(),
    [
      "packages/linux-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
      "packages/win32-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
    ],
  );
});

test("hidden and ignored peers remain included while root and nested installations are pruned", async (t) => {
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
  const result = validateJsonQualityResult(
    await runJsonQuality("check", { root }),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.complete, true);
  assert.ok(result.findings.some((f) => f.path === ".hidden/bad.json"));
  assert.ok(result.findings.some((f) => f.path === "ignored/bad.json"));
  assert.ok(result.findings.every((f) => !f.path.includes("node_modules")));
});

test("a bad included peer blocks an otherwise eligible formatting batch without writes", async (t) => {
  const root = await fixture(t);
  const original = '{"ordinary":1}\n';
  writeFileSync(join(root, "ordinary.json"), original);
  execFileSync("git", ["-C", root, "add", "ordinary.json"], {
    windowsHide: true,
  });
  writeFileSync(join(root, "bad.json"), '{"duplicate":1,"duplicate":2}\n');
  const result = validateJsonQualityResult(
    await runJsonQuality("format", { root }),
  );
  assert.equal(result.status, "failed");
  assert.equal(readFileSync(join(root, "ordinary.json"), "utf8"), original);
});

test("release documents are ordinary owned JSON, including a newly added peer", async (t) => {
  const root = await fixture(t);
  mkdirSync(join(root, "docs/releases"), { recursive: true });
  writeFileSync(
    join(root, "docs/releases/new.json"),
    '{"duplicate":1,"duplicate":2}\n',
  );
  const result = validateJsonQualityResult(
    await runJsonQuality("check", { root }),
  );
  assert.equal(result.complete, true);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some(
      (finding) => finding.path === "docs/releases/new.json",
    ),
  );
});

test("strict original buffers reject BOM, invalid UTF-8, escaped duplicates and JSON dialect extensions", async (t) => {
  const root = await fixture(t);
  const invalid = {
    "bom.json": Buffer.from('\ufeff{"value":1}\n'),
    "utf8.json": Buffer.from([123, 34, 118, 34, 58, 34, 0xff, 34, 125]),
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
  const result = validateJsonQualityResult(
    await runJsonQuality("check", { root }),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.complete, true);
  for (const path of Object.keys(invalid))
    assert.ok(
      result.findings.some((finding) => finding.path === path),
      path,
    );
  assert.ok(result.findings.every((finding) => finding.path !== "outer.json"));
});

test("tracked JSON cannot disappear behind the authorized installation boundary", async (t) => {
  const root = await fixture(t);
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "node_modules/tracked.json"), "{invalid");
  execFileSync(
    "git",
    ["-C", root, "add", "--force", "node_modules/tracked.json"],
    { windowsHide: true },
  );
  const result = validateJsonQualityResult(
    await runJsonQuality("check", { root }),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.complete, true);
  assert.ok(
    result.findings.some(
      (finding) => finding.path === "node_modules/tracked.json",
    ),
  );
});

test("a required native provider cannot be omitted to report a physical-only pass", async (t) => {
  const root = await fixture(t, {
    nativeSources: [
      {
        id: "test-native",
        provider: "fixture",
        owner: "Fixture native owner",
        reason: "Native coverage is mandatory",
        minimumDocuments: 1,
      },
    ],
  });
  await assert.rejects(runJsonQuality("check", { root }), /provider/i);
});

test("changed independently declared native authority prevents admission", async (t) => {
  const root = await fixture(t, {
    nativeSources: [
      {
        id: "test-native",
        provider: "fixture",
        owner: "Fixture native owner",
        reason: "Native coverage is mandatory",
        minimumDocuments: 1,
      },
    ],
  });
  const bytes = Buffer.from('{"value":1}\n');
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  writeFileSync(join(root, "native.json"), bytes);
  writeFileSync(join(root, "authority.json"), bytes);
  const provider = () => {
    writeFileSync(join(root, "authority.json"), '{"value":2}\n');
    return {
      inventory: [
        {
          path: "native.json",
          sha256,
          byteLength: bytes.length,
          source: {
            kind: "content-addressed",
            path: "native.json",
            sha256,
            byteLength: bytes.length,
          },
        },
      ],
      documents: [{ path: "native.json", bytes }],
      authorities: [
        { path: "authority.json", sha256, byteLength: bytes.length },
      ],
    };
  };
  await assert.rejects(
    runJsonQuality("check", { root, nativeProviders: { fixture: provider } }),
    /identity|changed|authority/i,
  );
});
