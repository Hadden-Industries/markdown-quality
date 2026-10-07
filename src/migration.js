// SPDX-License-Identifier: AGPL-3.0-only
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
/** Compare separately captured reports without acquisition, execution or source writes.
 * Schemas and manifests are caller-supplied evidence, not authenticated attestations.
 */
export function compareQualityReports({
  incumbent,
  candidate,
  incumbentSchema,
  candidateSchema,
  incumbentInputs,
  candidateInputs,
}) {
  const ajv = new Ajv({ strict: true, allErrors: true });
  function identity(report, schema, inputs) {
    if (!ajv.compile(schema)(report))
      fail("INVALID_REPORT", "Report does not match its supplied schema.");
    if (![1, 2].includes(report.schemaVersion))
      fail(
        "INVALID_REPORT",
        "Comparison cannot interpret an unsupported report schema.",
      );
    const samePaths = (left, right) =>
      JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
    const blocking =
      report.schemaVersion === 1
        ? report.diagnostics.length > 0
        : report.diagnostics.some(
            (finding) =>
              finding.severity === "error" ||
              (report.strict && finding.severity === "warning"),
          );
    // These fields track admission, not analysis: a fully checked batch with
    // blocking findings keeps every path unprocessed, with no writes admitted.
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
    if (
      report.operation !== "check" ||
      report.exitCode === 2 ||
      report.outcome === "error" ||
      report.outcome !== (report.diagnostics.length ? "findings" : "clean") ||
      report.errors.length ||
      !(accounted || blocked) ||
      report.written.length
    )
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
      JSON.stringify(paths) !==
        JSON.stringify(
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
    const inputDigest = digest(
      Buffer.from(
        JSON.stringify(
          ordered.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
        ),
      ),
    );
    return {
      reportSchemaVersion: report.schemaVersion,
      package: report.package,
      tools: report.tools,
      configDigest: report.configDigest,
      configuration: report.configuration,
      policy: report.policy ?? null,
      strict: report.strict ?? false,
      exitCode: report.exitCode,
      inputDigest,
    };
  }
  const before = identity(incumbent, incumbentSchema, incumbentInputs),
    after = identity(candidate, candidateSchema, candidateInputs);
  if (
    before.inputDigest !== after.inputDigest ||
    JSON.stringify(incumbent.selection) !== JSON.stringify(candidate.selection)
  )
    fail(
      "COMPARISON_SCOPE",
      "Reports must describe identical source identities and selection.",
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
  const wouldFormat = (report) =>
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
    schemaVersion: 1,
    incumbent: before,
    candidate: after,
    added,
    resolved: incumbent.diagnostics.filter((d, index) => !matched.has(index)),
    retained,
    messageChanges,
    wouldFormat: {
      incumbent: wouldFormat(incumbent),
      candidate: wouldFormat(candidate),
    },
  };
}
