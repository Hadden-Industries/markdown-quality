// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as quality from "../src/quality.js";
import { consumer } from "./helpers.js";

test("logical content is formatted at its final path without changing the repository", async (t) => {
  assert.equal(
    typeof quality.processDocument,
    "function",
    "The logical-document public contract is required.",
  );
  const root = consumer(t, { "docs/target.md": "Target.\n" });
  const report = await quality.processDocument({
    root,
    path: "docs/generated.md",
    content: Buffer.from(
      "# Policy\n\nFirst sentence. Second sentence.\n\n[Target](target.md)\n",
    ),
    requestId: "generator-1",
  });
  assert.equal(report.exitCode, 0, JSON.stringify(report.errors));
  assert.equal(report.document.requestId, "generator-1");
  assert.equal(
    Buffer.from(report.document.contentBase64, "base64").toString(),
    "# Policy\n\nFirst sentence.\nSecond sentence.\n\n[Target](target.md)\n",
  );
  assert.equal(existsSync(join(root, "docs/generated.md")), false);
  assert.equal(readFileSync(join(root, "docs/target.md"), "utf8"), "Target.\n");
  assert.deepEqual(report.written, []);
});

test("excluded invalid-UTF8 bytes are returned unchanged and an included positive control changes", async (t) => {
  assert.equal(typeof quality.processDocument, "function");
  const root = consumer(
    t,
    {},
    { exclude: ["docs/policy/Editing-Policy.generated.md"] },
  );
  const input = Buffer.from([0xff, 0x0d, 0x0a, 0x00]);
  const excluded = await quality.processDocument({
    root,
    path: "docs/policy/Editing-Policy.generated.md",
    content: input,
  });
  assert.equal(excluded.exitCode, 0);
  assert.equal(excluded.document.decision, "excluded");
  assert.deepEqual(
    Buffer.from(excluded.document.contentBase64, "base64"),
    input,
  );
  const positive = await quality.processDocument({
    root,
    path: "README.md",
    content: Buffer.from("First sentence. Second sentence.\n"),
  });
  assert.equal(positive.exitCode, 0, JSON.stringify(positive.errors));
  assert.equal(
    Buffer.from(positive.document.contentBase64, "base64").toString(),
    "First sentence.\nSecond sentence.\n",
  );
});
