// SPDX-License-Identifier: AGPL-3.0-only
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import { digest, fail } from "./contracts.js";
const inputSchema = {
  type: "array",
  uniqueItems: true,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["path", "bytes", "sha256"],
    properties: {
      path: { type: "string", minLength: 1 },
      bytes: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
      sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  },
};
/** Historical schema 1-3 readers retain their explicit admission semantics: these
 * fields tracked batch admission, so a fully checked blocked batch kept every path
 * unprocessed. They are never reinterpreted as missing analysis.
 */
function historicalCheck(report) {
  const samePaths = (left, right) =>
    isDeepStrictEqual([...left].sort(), [...right].sort());
  const blocking =
    report.schemaVersion === 1
      ? report.diagnostics.length > 0
      : report.diagnostics.some(
          (finding) =>
            finding.severity === "error" ||
            (report.strict && finding.severity === "warning"),
        );
  const accounted =
    report.exitCode === 0 &&
    !blocking &&
    report.unprocessed.length === 0 &&
    samePaths(report.unchanged, report.selection.files);
  const blocked =
    report.exitCode === 1 &&
    blocking &&
    report.outcome === "findings" &&
    report.diagnostics.length > 0 &&
    report.unchanged.length === 0 &&
    samePaths(report.unprocessed, report.selection.files);
  return (
    report.operation === "check" &&
    report.exitCode !== 2 &&
    report.outcome !== "error" &&
    report.outcome === (report.diagnostics.length ? "findings" : "clean") &&
    !report.errors.length &&
    (accounted || blocked) &&
    !report.written.length
  );
}

/** Schema 4 check reports state completion, quality basis and per-document effects. */
function currentCheck(report) {
  const blocking = report.diagnostics.some(
    (finding) =>
      finding.severity === "error" ||
      (report.strict && finding.severity === "warning"),
  );
  return (
    report.operation === "check" &&
    report.operationStatus === "completed" &&
    report.qualityBasis === "input" &&
    report.qualityStatus ===
      (report.diagnostics.length ? "findings" : "clean") &&
    report.exitCode === (blocking ? 1 : 0) &&
    !report.errors.length &&
    !report.writtenPaths.length &&
    isDeepStrictEqual(
      report.documentResults.map((record) => record.path),
      report.selection.files,
    ) &&
    report.documentResults.every(
      (record) =>
        record.analysisStatus === "completed" &&
        record.writeStatus === "not-requested",
    )
  );
}

/** Compare separately captured complete check reports without acquisition, execution or
 * source writes. Repair or preview receipts are refused. Schemas and manifests are
 * caller-supplied evidence, not authenticated attestations.
 */
export function compareCheckReports({
  incumbent,
  candidate,
  incumbentSchema,
  candidateSchema,
  incumbentInputs,
  candidateInputs,
}) {
  const ajv = new Ajv({ strict: true, allErrors: true });
  function identity(report, schema, inputs) {
    if (!new Ajv({ strict: true, allErrors: true }).compile(schema)(report))
      fail("INVALID_REPORT", "Report does not match its supplied schema.");
    if (![1, 2, 3, 4].includes(report.schemaVersion))
      fail(
        "INVALID_REPORT",
        "Comparison cannot interpret an unsupported report schema.",
      );
    if (!(report.schemaVersion === 4 ? currentCheck : historicalCheck)(report))
      fail(
        "INVALID_REPORT",
        "Comparison requires complete read-only check reports.",
      );
    if (!ajv.compile(inputSchema)(inputs))
      fail("INVALID_INPUT_MANIFEST", "Invalid source input manifest.");
    const ordered = [...inputs].sort((a, b) =>
      a.path.localeCompare(b.path, "en"),
    );
    const paths = ordered.map((input) => input.path);
    if (
      new Set(paths).size !== paths.length ||
      !isDeepStrictEqual(
        paths,
        [...report.selection.files].sort((a, b) => a.localeCompare(b, "en")),
      )
    )
      fail(
        "INVALID_INPUT_MANIFEST",
        "Manifest must identify every selected path exactly once.",
      );
    const scope = new Set(paths);
    if (report.diagnostics.some((finding) => !scope.has(finding.path)))
      fail(
        "COMPARISON_SCOPE",
        "Diagnostics must belong to the selected scope.",
      );
    // Preimage: UTF-8 JSON of path-sorted {path, bytes, sha256} records, where bytes is
    // a byte count and sha256 the exact file digest; not semantic Markdown equivalence.
    const inputManifestSha256 = digest(
      Buffer.from(
        JSON.stringify(
          ordered.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
        ),
      ),
    );
    return {
      reportSchemaVersion: report.schemaVersion,
      // Preimage: the report's own selection-object serialization for its schema.
      selectionSha256: digest(Buffer.from(JSON.stringify(report.selection))),
      package: report.package,
      tools: report.tools,
      // Historical configDigest was the same exact configuration-byte digest.
      configurationBytesSha256:
        report.schemaVersion === 4
          ? report.configurationBytesSha256
          : report.configDigest,
      effectiveConfigurationSha256:
        report.schemaVersion === 4 ? report.effectiveConfigurationSha256 : null,
      configuration: report.configuration,
      policy: report.policy ?? null,
      strict: report.strict ?? false,
      exitCode: report.exitCode,
      inputManifestSha256,
    };
  }
  const before = identity(incumbent, incumbentSchema, incumbentInputs),
    after = identity(candidate, candidateSchema, candidateInputs);
  if (
    before.inputManifestSha256 !== after.inputManifestSha256 ||
    incumbent.selection.mode !== candidate.selection.mode ||
    !isDeepStrictEqual(
      [...incumbent.selection.files].sort(),
      [...candidate.selection.files].sort(),
    )
  )
    fail(
      "COMPARISON_SCOPE",
      "Reports must describe identical source identities and selected scope.",
    );
  const key = (d) =>
    JSON.stringify([d.path, d.source, d.rule, d.severity, d.line, d.column]);
  const oldBuckets = new Map(),
    matched = new Set();
  for (const [index, finding] of incumbent.diagnostics.entries()) {
    const identity = key(finding);
    if (!oldBuckets.has(identity)) oldBuckets.set(identity, []);
    oldBuckets.get(identity).push(index);
  }
  const added = [],
    retained = [],
    messageChanges = [];
  const pairings = new Map();
  // Reserve all unchanged messages first; rewordings must not steal an exact
  // match from a later finding that shares the same positional identity.
  for (const [candidateIndex, finding] of candidate.diagnostics.entries()) {
    const bucket = oldBuckets.get(key(finding));
    const exact =
      bucket?.findIndex(
        (index) => incumbent.diagnostics[index].message === finding.message,
      ) ?? -1;
    if (exact >= 0) pairings.set(candidateIndex, bucket.splice(exact, 1)[0]);
  }
  for (const [candidateIndex, finding] of candidate.diagnostics.entries()) {
    const bucket = oldBuckets.get(key(finding));
    const index = pairings.get(candidateIndex) ?? bucket?.shift();
    if (index === undefined) {
      added.push(finding);
      continue;
    }
    matched.add(index);
    retained.push(finding);
    if (incumbent.diagnostics[index].message !== finding.message)
      messageChanges.push({
        before: incumbent.diagnostics[index],
        after: finding,
      });
  }
  // Paths carrying formatter-layout diagnostics; neither write eligibility nor a
  // prediction that formatting would succeed.
  const formattingDriftPaths = (report) =>
    [
      ...new Set(
        report.diagnostics
          .filter(
            (d) =>
              d.source === "formatter" &&
              ["layout", "formatter/layout"].includes(d.rule),
          )
          .map((d) => d.path),
      ),
    ].sort();
  return {
    schemaVersion: 3,
    incumbent: before,
    candidate: after,
    added,
    resolved: incumbent.diagnostics.filter((d, index) => !matched.has(index)),
    retained,
    messageChanges,
    formattingDriftPaths: {
      incumbent: formattingDriftPaths(incumbent),
      candidate: formattingDriftPaths(candidate),
    },
  };
}
