// SPDX-License-Identifier: AGPL-3.0-only
/** Preserve complete checkpoint records within the signed Git transport budget. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

export const historyTransportLimit = 48 * 1024 * 1024;
const historyExpandedLimit = 256 * 1024 * 1024;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function encodeHistoryCheckpoint(checkpoint) {
  const original = Buffer.from(JSON.stringify(checkpoint, null, 2) + "\n");
  assert.ok(
    original.length <= historyExpandedLimit,
    "Expanded checkpoint exceeds its budget",
  );
  assert.ok(
    [1, 2].includes(checkpoint.schemaVersion),
    "Unknown checkpoint format",
  );
  const bytes = Buffer.from(
    JSON.stringify({
      schemaVersion: 3,
      encoding: "gzip+base64",
      uncompressedBytes: original.length,
      sha256: hash(original),
      content: gzipSync(original).toString("base64"),
    }) + "\n",
  );
  assert.ok(
    bytes.length <= historyTransportLimit,
    "Checkpoint exceeds signed Git transport",
  );
  return bytes;
}

export function decodeHistoryCheckpoint(bytes) {
  assert.ok(
    bytes.length <= historyTransportLimit,
    "Checkpoint exceeds signed Git transport",
  );
  const record = JSON.parse(bytes);
  if (record?.schemaVersion !== 3) return record;
  assert.deepEqual(Object.keys(record).sort(), [
    "content",
    "encoding",
    "schemaVersion",
    "sha256",
    "uncompressedBytes",
  ]);
  assert.equal(record.encoding, "gzip+base64");
  assert.ok(
    Number.isSafeInteger(record.uncompressedBytes) &&
      record.uncompressedBytes > 0 &&
      record.uncompressedBytes <= historyExpandedLimit,
    "Expanded checkpoint exceeds its budget",
  );
  assert.match(record.sha256, /^[a-f0-9]{64}$/u);
  assert.equal(typeof record.content, "string");
  const compressed = Buffer.from(record.content, "base64");
  assert.equal(
    compressed.toString("base64"),
    record.content,
    "Noncanonical checkpoint encoding",
  );
  const original = gunzipSync(compressed, {
    maxOutputLength: record.uncompressedBytes,
  });
  assert.equal(
    original.length,
    record.uncompressedBytes,
    "Checkpoint size changed",
  );
  assert.equal(hash(original), record.sha256, "Checkpoint bytes changed");
  const checkpoint = JSON.parse(original);
  assert.ok(
    [1, 2].includes(checkpoint?.schemaVersion),
    "Unknown checkpoint format",
  );
  return checkpoint;
}
