// SPDX-License-Identifier: AGPL-3.0-only
// Real frozen archives/oracles qualify the consumer-owned streaming boundary.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { provideRepositoryJson } from "../../scripts/native-json-documents.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const expected = new Set([
  "test/fixtures/performance-incumbents/owlapi.json.gz!/owlapi.json",
  "test/fixtures/performance-incumbents/webvowl.json.gz!/webvowl.json",
  ...["linux-x64", "win32-x64"].map(
    (platform) =>
      `packages/${platform}/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json`,
  ),
]);
const release = join(root, "dist/json-qualification/release-manifest.json");
if (existsSync(release))
  for (const archive of JSON.parse(readFileSync(release, "utf8")).archives)
    for (const member of archive.files)
      if (/\.(?:json|jsonld|sarif)$/iu.test(member.path))
        expected.add(
          `dist/json-qualification/${archive.filename}!/package/${member.path}`,
        );

test("native owner streams complete independently inventoried original members in bounded fragments", async () => {
  const supplied = await provideRepositoryJson({ root });
  try {
    for (const key of ["authorities", "inventory", "documents"])
      assert.equal(
        typeof supplied[key]?.[Symbol.asyncIterator],
        "function",
        key,
      );
    const authorities = new Map(),
      inventory = new Map(),
      seen = new Set();
    // These finite test maps are independent of production provider retention.
    for await (const entry of supplied.authorities) {
      assert.equal(typeof entry.byteLength, "string");
      assert.equal(authorities.has(entry.path), false);
      authorities.set(entry.path, entry);
    }
    for await (const entry of supplied.inventory) {
      assert.equal(typeof entry.byteLength, "string");
      assert.equal(authorities.has(entry.source.path), true, entry.source.path);
      assert.equal(inventory.has(entry.path), false);
      inventory.set(entry.path, entry);
    }
    assert.deepEqual(new Set(inventory.keys()), expected);
    for await (const document of supplied.documents) {
      assert.equal(seen.has(document.path), false);
      seen.add(document.path);
      const pin = inventory.get(document.path);
      assert.ok(pin);
      let length = 0n;
      const hash = createHash("sha256");
      for await (const chunk of document.chunks) {
        assert.ok(Buffer.isBuffer(chunk) && chunk.length <= 65536);
        hash.update(chunk);
        length += BigInt(chunk.length);
      }
      const digest = hash.digest("hex");
      assert.equal(String(length), pin.byteLength);
      assert.equal(digest, pin.sha256);
      if (
        document.path.endsWith(
          "!/" + "webpki-roots-0.25.4/.cargo_vcs_info.json",
        )
      ) {
        assert.equal(length, 94n);
        assert.equal(
          digest,
          "555820648728561eac884844e331dd2612e40e257637734b51bb4976bc1307e6",
        );
      }
    }
    assert.deepEqual(seen, expected);
  } finally {
    await supplied.close?.();
  }
});

test("closing a paused native body revokes delivery and settles its owned child", async () => {
  const supplied = await provideRepositoryJson({ root });
  const documents = supplied.documents[Symbol.asyncIterator]();
  try {
    const first = await documents.next();
    assert.equal(first.done, false);
    const chunks = first.value.chunks[Symbol.asyncIterator]();
    assert.ok((await chunks.next()).value.length > 0);
    await supplied.close();
    await assert.rejects(chunks.next(), /closed/u);
  } finally {
    await documents.return();
    await supplied.close();
  }
});

test("EOF after admitted metadata cannot replace the explicit completion frame", async (t) => {
  const directory = mkdtempSync(
    join(tmpdir(), "markdown-native-transport-fault-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const files = [
    "scripts/native-json-documents.mjs",
    "scripts/python-target.js",
    "scripts/collect-json-documents.py",
    "scripts/qualify-performance.py",
    "scripts/package-archive.py",
    "assets/tool-manifest.json",
    "test/fixtures/performance-oracles.json",
    "test/fixtures/performance-policies.json",
    ...["owlapi", "webvowl"].map(
      (name) => `test/fixtures/performance-incumbents/${name}.json.gz`,
    ),
    ...["linux-x64", "win32-x64"].map(
      (name) => `packages/${name}/MPL-SOURCE.tar.xz`,
    ),
  ];
  for (const path of files) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    copyFileSync(join(root, path), join(directory, path));
  }
  writeFileSync(join(directory, "package.json"), '{"type":"module"}\n');
  const collector = join(directory, "scripts/collect-json-documents.py");
  const before = readFileSync(collector, "utf8");
  const terminal = '    control({"type": "complete"})';
  assert.equal(
    before.split(terminal).length,
    2,
    "The fault changes exactly the final marker",
  );
  writeFileSync(
    collector,
    before.replace(
      terminal,
      "    # Deliberate fault: no final completion frame.",
    ),
  );
  const { provideRepositoryJson: faultyProvider } = await import(
    pathToFileURL(join(directory, "scripts/native-json-documents.mjs"))
  );
  const supplied = await faultyProvider({ root: directory });
  let admitted = 0;
  try {
    await assert.rejects(async () => {
      for await (const entry of supplied.authorities) {
        assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
        admitted++;
      }
    }, /completion missing/u);
    assert.equal(
      admitted,
      6,
      "The real owner emitted every authority before the transport fault",
    );
  } finally {
    await supplied.close();
  }
});
