// SPDX-License-Identifier: AGPL-3.0-only
// Private bounded transport. Markdown policy and analysis remain in quality.js.
import { runQuality, processDocument } from "./quality.js";
import { decode } from "./contracts.js";
const chunks = [];
let requestBytes = 0;
const ceiling = Number(process.argv[2]);
for await (const chunk of process.stdin) {
  requestBytes += chunk.length;
  if (requestBytes > ceiling)
    throw new Error("Request exceeds transport bound.");
  chunks.push(chunk);
}
// Pipe chunks may split a UTF-8 code point; decode complete bounded framing once.
const request = JSON.parse(decode(Buffer.concat(chunks)));
const { document, ...options } = request;
const logical = Object.hasOwn(request, "document");
if (
  logical &&
  (!document ||
    typeof document !== "object" ||
    Array.isArray(document) ||
    Object.keys(document).some(
      (key) => !["path", "requestId", "contentBase64"].includes(key),
    ) ||
    typeof document.contentBase64 !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      document.contentBase64,
    ) ||
    typeof document.path !== "string")
)
  throw new Error("Invalid logical document framing.");
if (!logical && options.mode === "format")
  throw new Error("Bounded transport cannot write checkout documents.");
const result = logical
  ? await processDocument({
      ...options,
      ...document,
      content: Buffer.from(document.contentBase64, "base64"),
    })
  : await runQuality(options);
process.stdout.write(JSON.stringify(result) + "\n");
process.exitCode = result.exitCode;
