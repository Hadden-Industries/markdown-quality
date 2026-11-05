// SPDX-License-Identifier: AGPL-3.0-only
// Private bounded transport. Markdown policy and analysis remain in operation.js.
import { analyzeOperation } from "./operation.js";
import { decode } from "./contracts.js";
const chunks = [];
let requestBytes = 0;
// The parent resolved this framing ceiling before writing; "null" disables it.
const ceiling = process.argv[2] === "null" ? null : Number(process.argv[2]);
for await (const chunk of process.stdin) {
  requestBytes += chunk.length;
  if (ceiling !== null && requestBytes > ceiling)
    throw new Error("Request exceeds transport bound.");
  chunks.push(chunk);
}
// Pipe chunks may split a UTF-8 code point; decode complete bounded framing once.
const { request, internal } = JSON.parse(decode(Buffer.concat(chunks)));
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
if (
  !logical &&
  ["format", "normalize"].includes(options.mode) &&
  options.dryRun !== true
)
  throw new Error("Bounded transport cannot write checkout documents.");
const admitted = {
  ...options,
  ...(internal.invocation.resourceLimitMode === undefined
    ? {}
    : { resourceLimitMode: internal.invocation.resourceLimitMode }),
  executionLimits: internal.invocation.executionLimits,
};
const trusted = {
  profileSnapshot: internal.profileSnapshot,
  profileOrigin: internal.profileOrigin,
  configurationSource: internal.configurationSource,
};
const result = logical
  ? await analyzeOperation(
      { ...admitted, mode: admitted.mode ?? "format" },
      {
        path: document.path,
        requestId: document.requestId ?? null,
        content: Buffer.from(document.contentBase64, "base64"),
      },
      trusted,
    )
  : await analyzeOperation(admitted, null, trusted);
process.stdout.write(JSON.stringify(result) + "\n");
process.exitCode = result.exitCode;
