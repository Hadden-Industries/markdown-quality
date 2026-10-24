// SPDX-License-Identifier: AGPL-3.0-only
/** Re-present admitted historical reports while retaining their established full-result oracles. */
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { readDocument } from "../src/documents.js";
import { replaceDocument } from "../src/replacement.js";
import { digest } from "../src/contracts.js";
import {
  formatJsonSource,
  JSON_TRANSFORM_CAPABILITIES,
} from "../tooling/json/public-api.mjs";
import { provideRepositoryJson } from "./native-json-documents.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
// The existing 1.66 MB/87,991-value report requires 408,759,816 accounted
// formatter bytes. This finite owning-writer allowance also leaves room for
// checked originals/candidates; ordinary JSON checking retains its 32 MiB target.
const writerMemoryBytes = 536870912;
const changes = [];
const inputs = [];
const targets = new Map(
  ["owlapi", "webvowl"].map((name) => {
    const path = `test/fixtures/performance-incumbents/${name}.json.gz`;
    return [`${path}!/${name}.json`, path];
  }),
);
const pins = new Map();

/** Exhaust every native phase before writes, retaining only the two explicitly
 * selected finite writer inputs. Other native payloads remain streamed.
 */
async function visitNative(consume, inventory = () => {}) {
  const supplied = await provideRepositoryJson({ root });
  try {
    for await (const ignored of supplied.authorities) void ignored;
    for await (const entry of supplied.inventory) inventory(entry);
    for await (const document of supplied.documents) await consume(document);
  } finally {
    await supplied.close();
  }
}
await visitNative(
  async (document) => {
    const path = targets.get(document.path);
    if (!path) {
      for await (const ignored of document.chunks) void ignored;
      return;
    }
    const pin = pins.get(document.path);
    if (
      !pin ||
      BigInt(pin.byteLength) >
        BigInt(JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes)
    )
      throw new Error(
        "Incumbent exceeds the explicit finite writer capability.",
      );
    if (inputs.some((input) => input.path === path))
      throw new Error("Duplicate incumbent writer input.");
    const original = readDocument(root, path);
    if (
      digest(original.bytes) !== pin.source.sha256 ||
      String(original.bytes.length) !== pin.source.byteLength ||
      digest(original.bytes) !== document.source.sha256
    )
      throw new Error("Incumbent changed after native admission.");
    const bytes = Buffer.alloc(Number(pin.byteLength));
    let offset = 0;
    for await (const fragment of document.chunks) {
      if (offset + fragment.length > bytes.length)
        throw new Error("Incumbent exceeds its admitted identity.");
      bytes.set(fragment, offset);
      offset += fragment.length;
    }
    if (offset !== bytes.length || digest(bytes) !== pin.sha256)
      throw new Error("Incumbent body differs from independent inventory.");
    inputs.push({ path, original, bytes });
  },
  (entry) => {
    if (!targets.has(entry.path)) return;
    if (pins.has(entry.path)) throw new Error("Duplicate incumbent inventory.");
    pins.set(entry.path, entry);
  },
);
if (inputs.length !== 2 || pins.size !== 2)
  throw new Error("Required admitted incumbent is missing.");
// Close native admission before formatter work so its delivery deadline does
// not include an unrelated formatter. This is a fixed two-input finite writer.
for (const input of inputs) {
  const formatted = await formatJsonSource(
    new TextDecoder("utf-8", { fatal: true }).decode(input.bytes),
    { runtimeControls: { managedMemoryTargetBytes: writerMemoryBytes } },
  );
  input.bytes = undefined;
  changes.push({
    path: input.path,
    original: input.original,
    formatted: gzipSync(Buffer.from(formatted), { level: 9 }),
  });
}
// Finish presentation and admission of both reports before replacing either.
for (const change of changes) {
  const current = readDocument(root, change.path);
  if (
    current.stat.dev !== change.original.stat.dev ||
    current.stat.ino !== change.original.stat.ino ||
    current.stat.nlink !== 1n ||
    current.stat.mode !== change.original.stat.mode ||
    !current.bytes.equals(change.original.bytes)
  )
    throw new Error("Incumbent changed before its owning writer.");
}
const written = [];
try {
  for (const change of changes) {
    if (change.original.bytes.equals(change.formatted)) continue;
    // Reuse the product's identity-checked, mode-preserving atomic replacement.
    replaceDocument(root, change.original, change.formatted);
    written.push(change.path);
  }
  // The existing native owner rechecks the unchanged, independently established
  // semantic oracles; this operation creates no new performance observations.
  await visitNative(async (document) => {
    for await (const ignored of document.chunks) void ignored;
  });
} catch (error) {
  console.error(
    "Incumbent presentation stopped; completed paths: " +
      JSON.stringify(written),
  );
  throw error;
}
console.log(
  "Presented both incumbent reports; original full-result oracle hashes are unchanged.",
);
