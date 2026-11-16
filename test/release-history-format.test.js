// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  encodeHistoryCheckpoint,
  decodeHistoryCheckpoint,
  historyTransportLimit,
} from "../scripts/release-history-format.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const envelope = (bytes) => ({
  schemaVersion: 3,
  encoding: "gzip+base64",
  uncompressedBytes: bytes.length,
  sha256: hash(bytes),
  content: gzipSync(bytes).toString("base64"),
});

test("large original evidence round-trips within the signed Git transport budget", () => {
  const checkpoint = {
    schemaVersion: 1,
    complete: true,
    originalEvidence: "original record\n".repeat(4_000_000),
  };
  assert.ok(
    Buffer.byteLength(JSON.stringify(checkpoint)) > historyTransportLimit,
  );
  const bytes = encodeHistoryCheckpoint(checkpoint);
  assert.ok(bytes.length < historyTransportLimit);
  assert.deepEqual(decodeHistoryCheckpoint(bytes), checkpoint);
});

test("legacy single and multiple target records retain their original shape", () => {
  for (const schemaVersion of [1, 2]) {
    const checkpoint = { schemaVersion, complete: true };
    assert.deepEqual(
      decodeHistoryCheckpoint(Buffer.from(JSON.stringify(checkpoint))),
      checkpoint,
    );
    assert.deepEqual(
      decodeHistoryCheckpoint(encodeHistoryCheckpoint(checkpoint)),
      checkpoint,
    );
  }
});

test("compressed history rejects altered bytes, sizes and ambiguous envelopes", () => {
  const raw = Buffer.from(JSON.stringify({ schemaVersion: 2, complete: true }));
  for (const change of [
    (value) => {
      value.sha256 = "0".repeat(64);
    },
    (value) => {
      value.uncompressedBytes--;
    },
    (value) => {
      value.uncompressedBytes++;
    },
    (value) => {
      value.uncompressedBytes = 257 * 1024 * 1024;
    },
    (value) => {
      value.content += "=";
    },
    (value) => {
      value.content = Buffer.from("not gzip").toString("base64");
    },
    (value) => {
      value.encoding = "base64";
    },
    (value) => {
      value.extra = true;
    },
  ]) {
    const value = envelope(raw);
    change(value);
    assert.throws(() =>
      decodeHistoryCheckpoint(Buffer.from(JSON.stringify(value))),
    );
  }
  const bomb = envelope(Buffer.alloc(1024 * 1024, 65));
  bomb.uncompressedBytes = 1024;
  assert.throws(() =>
    decodeHistoryCheckpoint(Buffer.from(JSON.stringify(bomb))),
  );
});
