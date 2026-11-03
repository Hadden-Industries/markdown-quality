// SPDX-License-Identifier: AGPL-3.0-only
// Private operation owner shared by the public SDK, the CLI and the bounded transport.
import { join } from "node:path";
import { loadConfiguration, recheckObservations } from "./configuration.js";
import { safePath } from "./consumer-root.js";
import {
  selectDocuments,
  readDocument,
  createPathDecision,
} from "./documents.js";
import { resolveTool } from "./native-tool.js";
import { createDocumentAnalyzer } from "./document-analysis.js";
import { createDocumentAnalyzerPool } from "./document-analysis-pool.js";
import { replaceDocument } from "./replacement.js";
import { createNativeStaging } from "./native-staging.js";
import { effectivePolicy } from "./preset.js";
import { createLinter } from "./analysis.js";
import { createLinkGraph } from "./link-graph.js";
import { prepareNormalizeBatch } from "./normalize-batch.js";
import { changeRecords } from "./normalization.js";
import { createInitialQualityResult } from "./result-construction.js";
import {
  decode,
  digest,
  fail,
  OperationError,
  diagnosticBudget,
  diagnosticCollector,
  exceeds,
} from "./contracts.js";

const operationKeys = [
  "mode",
  "root",
  "config",
  "files",
  "reconciliationInventory",
  "concurrency",
  "strict",
  "analyzerLimits",
  "executionProfile",
  "executionLimits",
  "resourceLimitMode",
  "gitExecutablePath",
  "dryRun",
  "updateLinks",
];
/** Removed SDK spellings fail explicitly so they cannot silently restore a default. */
const removedOperationKeys = Object.freeze({
  inventory: "reconciliationInventory",
  limits: "analyzerLimits",
  gitExecutable: "gitExecutablePath",
});

/** Closed plain-data admission for operation options; unknown keys are refused. */
export function admitOperationOptions(options, extra = []) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(options))
  )
    fail("INVALID_OPTION", "Operation options must be a plain object.");
  for (const key of Object.keys(options)) {
    if (Object.hasOwn(removedOperationKeys, key))
      fail(
        "INVALID_OPTION",
        `Option ${key} was removed; use ${removedOperationKeys[key]}.`,
      );
    if (!operationKeys.includes(key) && !extra.includes(key))
      fail("INVALID_OPTION", "Unknown operation option: " + key);
  }
  for (const key of ["root", "config", "gitExecutablePath"])
    if (options[key] !== undefined && typeof options[key] !== "string")
      fail("INVALID_OPTION", `Option ${key} must be a string.`);
  for (const key of ["dryRun", "updateLinks"])
    if (options[key] !== undefined && typeof options[key] !== "boolean")
      fail("INVALID_OPTION", `Option ${key} must be a boolean.`);
  if (
    (options.dryRun || options.updateLinks) &&
    (options.mode ?? "check") !== "normalize"
  )
    fail(
      "INVALID_OPTION",
      "dryRun and updateLinks apply only to the normalize operation.",
    );
  if (
    options.executionLimits !== undefined &&
    (options.executionLimits === null ||
      typeof options.executionLimits !== "object" ||
      Array.isArray(options.executionLimits))
  )
    fail("INVALID_OPTION", "executionLimits must be an object.");
  if (
    options.analyzerLimits !== undefined &&
    options.analyzerLimits !== false &&
    (options.analyzerLimits === null ||
      typeof options.analyzerLimits !== "object" ||
      Array.isArray(options.analyzerLimits))
  )
    fail("INVALID_OPTION", "analyzerLimits must be false or an object.");
  return options;
}

const sortDiagnostics = (a, b) =>
  a.path < b.path
    ? -1
    : a.path > b.path
      ? 1
      : a.line - b.line ||
        a.column - b.column ||
        a.rule.localeCompare(b.rule, "en");

/** Format may leave only ordinary NFC findings on prose whose Unicode it preserves;
 * normalize may leave only canonical-presentation drift that format repairs.
 */
export function residualAllowed(mode, diagnostic) {
  if (mode === "format")
    return (
      diagnostic.source === "quality" &&
      diagnostic.rule === "quality/non-nfc-prose"
    );
  return (
    mode === "normalize" &&
    (diagnostic.source === "formatter" || diagnostic.source === "snapper")
  );
}

/** All supported Markdown under the root outside hard operational boundaries, including
 * tracked and ordinarily excluded files and every `.md` file whatever the include
 * scope: a read scope, never a write selection.
 */
async function listReverseInventory(context, options) {
  const inventory = await selectDocuments(
    {
      ...context,
      config: {
        ...context.config,
        include: ["**/*.md", ...context.config.include],
        exclude: [],
      },
    },
    undefined,
    {
      reconciliationInventory: options.reconciliationInventory,
      gitExecutablePath: options.gitExecutablePath,
    },
  );
  return inventory.files;
}

function reportedError(error) {
  return {
    code: error instanceof OperationError ? error.code : "OPERATION_FAILED",
    message:
      error instanceof OperationError ? error.message : "Operation failed.",
  };
}

/** Run checking, inspection, or guarded formatting with explicit operation, quality
 * and per-document analysis/write states. `internal` carries trusted transport
 * snapshots only; public callers cannot supply it.
 */
export async function analyzeOperation(
  options = {},
  document = null,
  internal = {},
) {
  const mode = options?.mode ?? "check";
  const concurrency =
    options?.concurrency === undefined ? 1 : options.concurrency;
  const result = createInitialQualityResult(
    mode,
    options?.files !== undefined,
    options ?? {},
  );
  const repair = mode === "format" || mode === "normalize";
  const dryRun = options?.dryRun === true;
  const physicalWrite = repair && !document && !dryRun;
  let analyzer,
    staging,
    stagingAttempted = false,
    analysisRequested = false;
  const records = new Map();
  async function closeAnalysis() {
    if (analyzer) {
      const owned = analyzer;
      analyzer = undefined;
      await owned.close();
    }
    if (staging) {
      const owned = staging;
      staging = undefined;
      owned.close();
    }
  }
  function setRecords(paths) {
    result.documentResults = paths.map((path) => {
      const record = {
        path,
        analysisStatus: "not-requested",
        writeStatus: "not-requested",
      };
      records.set(path, record);
      return record;
    });
  }
  try {
    admitOperationOptions(options, document ? ["mode"] : []);
    if (options.strict !== undefined && typeof options.strict !== "boolean")
      fail("INVALID_STRICT", "Strict must be a boolean.");
    result.strict = options.strict ?? false;
    if (!["check", "format", "inspect", "normalize"].includes(mode))
      fail("INVALID_OPERATION", "Unknown operation.");
    if (!Number.isInteger(concurrency) || concurrency < 1)
      fail(
        "INVALID_CONCURRENCY",
        "Concurrency must be an integer of at least 1.",
      );
    const context = loadConfiguration(options, internal);
    result.policy = effectivePolicy(context.config);
    result.resourcePolicy = {
      resourceLimitMode: context.resources.resourceLimitMode,
      resourceLimitModeOrigin: context.resources.resourceLimitModeOrigin,
      executionProfile: { ...context.resources.executionProfile },
      executionLimits: { ...context.resources.executionLimits },
      origins: { ...context.resources.origins },
      externalConstraints: context.resources.externalConstraints,
    };
    await createLinter(context).calculateConfigForFile(
      join(context.root, "document.md"),
    );
    Object.assign(result, context.provenance);
    result.configuration = context.config;
    if (mode === "inspect") result.root = context.root;
    const budgets = context.config.analyzerLimits;
    if (document) {
      if (
        !Buffer.isBuffer(document.content) ||
        (document.requestId !== null &&
          typeof document.requestId !== "string") ||
        options.files !== undefined ||
        options.reconciliationInventory !== undefined
      )
        fail(
          "INVALID_DOCUMENT",
          "Logical requests require bytes, a path and an optional string request identity.",
        );
      if (
        exceeds(document.content.length, budgets.maxDocumentBytes) ||
        exceeds(document.content.length, budgets.maxTotalDocumentBytes)
      )
        fail(
          "DOCUMENT_LIMIT",
          "Logical content exceeds the selected input bound.",
        );
      const decision = createPathDecision(context.config)(document.path, {
        explicit: true,
      });
      result.document = {
        path: document.path,
        requestId: document.requestId,
        decision: decision.decision,
        contentBase64: document.content.toString("base64"),
      };
      const { decision: reason, ...details } = decision;
      result.selection = {
        mode: "explicit",
        files: reason === "selected" ? [document.path] : [],
        omissions: reason === "selected" ? [] : [{ ...details, reason }],
        reconciliationDecisions: [],
        readDependencies: [],
      };
      if (reason === "selected")
        safePath(context.root, document.path, { missing: true, file: true });
    } else
      result.selection = await selectDocuments(context, options.files, {
        reconciliationInventory: options.reconciliationInventory,
        gitExecutablePath: options.gitExecutablePath,
      });
    setRecords(result.selection.files);
    // No native process or tool resolution is necessary for a zero selection.
    if (result.selection.files.length === 0 || mode === "inspect") {
      if (result.selection.files.length) resolveTool();
      recheckObservations(context.observations);
      result.operationStatus = dryRun ? "previewed" : "completed";
      result.qualityStatus = mode === "inspect" ? "not-checked" : "clean";
      result.qualityBasis =
        mode === "inspect"
          ? null
          : physicalWrite
            ? "applied"
            : repair
              ? "candidate"
              : "input";
      result.exitCode = 0;
      return result;
    }
    // An intentional NFC exemption is not silently re-enabled by a repair request.
    if (
      mode === "normalize" &&
      context.config.lint["quality/non-nfc-prose"] === "off"
    ) {
      recheckObservations(context.observations);
      result.refusals.push({
        code: "NFC_RULE_DISABLED",
        message:
          "quality/non-nfc-prose is off, an intentional exemption; enable it (info, warn or error) to request normalization.",
        path: null,
        line: null,
        column: null,
      });
      if (physicalWrite)
        for (const record of result.documentResults)
          record.writeStatus = "refused";
      result.operationStatus = "refused";
      result.exitCode = 1;
      return result;
    }
    const tool = resolveTool();
    analysisRequested = true;
    analyzer =
      concurrency === 1
        ? createDocumentAnalyzer(context, tool)
        : createDocumentAnalyzerPool(
            () => createDocumentAnalyzer(context, tool),
            concurrency,
          );
    const candidates = [];
    const normalized = new Map();
    const collector = diagnosticCollector(budgets, true);
    result.diagnostics = collector.diagnostics;
    let total = 0,
      outputTotal = 0;
    // Unique selected and dependency inputs share one retained-byte account.
    const admitBytes = (bytes) => {
      total += bytes;
      if (exceeds(total, budgets.maxTotalDocumentBytes))
        fail(
          "BATCH_LIMIT",
          "Total document and link-dependency bytes exceed the limit.",
        );
    };
    const graph = createLinkGraph(context, { admitBytes });
    let prepared = [],
      preparedBytes = 0;
    let inputs = [],
      inputBytes = 0;
    async function flushPrepared() {
      if (!prepared.length) return;
      const group = prepared;
      prepared = [];
      preparedBytes = 0;
      if (group.length > 1 && !stagingAttempted) {
        stagingAttempted = true;
        const started = performance.now();
        staging = createNativeStaging(context.root, budgets);
        const elapsed = performance.now() - started;
        for (const record of group) record.elapsedMs += elapsed;
      }
      const verified = await analyzer.verify(
        group.map(({ formatted, elapsedMs, precheck }) => ({
          output: formatted.output,
          elapsedMs,
          precheck: formatted.prechecked ? precheck : undefined,
          literalExclusions: formatted.literalExclusions,
        })),
        staging?.token,
      );
      for (const [index, { file, item, formatted }] of group.entries()) {
        if (formatted.deferredError)
          fail(formatted.deferredError.code, formatted.deferredError.message);
        const outputBytes = Buffer.byteLength(formatted.output);
        if (exceeds(outputBytes, budgets.maxDocumentBytes))
          fail("DOCUMENT_LIMIT", "Formatted document exceeds the size limit.");
        outputTotal += outputBytes;
        if (exceeds(outputTotal, budgets.maxTotalDocumentBytes))
          fail(
            "BATCH_LIMIT",
            "Total formatted document bytes exceed the limit.",
          );
        const diagnostics = [
          ...formatted.diagnostics.slice(0, formatted.whitespaceCount),
          ...verified.diagnostics[index],
          ...formatted.diagnostics.slice(formatted.whitespaceCount),
        ];
        // Check reports input drift; normalize reports its candidate's remaining
        // presentation drift, which only format repairs.
        if (
          (mode === "check" &&
            !item.bytes.equals(Buffer.from(formatted.output))) ||
          (mode === "normalize" && normalized.get(file) !== formatted.output)
        )
          diagnostics.push({
            source: "formatter",
            rule: "layout",
            line: 1,
            column: 1,
            severity: "error",
            message: "Document requires formatting.",
          });
        diagnosticBudget(diagnostics, budgets);
        for (const d of diagnostics) collector.push({ path: file, ...d });
        graph.addDocument(
          file,
          formatted.links.anchors,
          formatted.links.references,
        );
        records.get(file).analysisStatus = "completed";
        if (mode === "format")
          candidates.push({ file, item, output: formatted.output });
        // Normalization writes its own source-edited candidate, never a printer pass.
        if (mode === "normalize")
          candidates.push({ file, item, output: normalized.get(file) });
      }
    }
    async function flushInputs() {
      if (!inputs.length) return;
      const group = inputs;
      inputs = [];
      inputBytes = 0;
      let setupMs = 0;
      if (group.length > 1 && !stagingAttempted) {
        stagingAttempted = true;
        const started = performance.now();
        staging = createNativeStaging(context.root, budgets);
        setupMs = performance.now() - started;
      }
      let checks;
      let overheadMs = setupMs;
      if (staging) {
        const started = performance.now();
        checks = await analyzer.precheck(
          group.map((record) => record.original),
          staging.token,
        );
        overheadMs += Math.max(
          0,
          performance.now() - started - checks.workerMs,
        );
      }
      const parallel =
        concurrency > 1
          ? await analyzer.prepareGroup(
              group.map(({ original, file }, index) => ({
                data: {
                  text: original,
                  file,
                  mode,
                  precheck: checks?.checks[index],
                },
                milliseconds:
                  budgets.documentAnalysisTimeoutMs === null
                    ? null
                    : budgets.documentAnalysisTimeoutMs -
                      overheadMs -
                      (checks?.elapsedMs[index] ?? 0),
              })),
            )
          : undefined;
      for (const [index, { file, item, original }] of group.entries()) {
        const precheck = checks?.checks[index];
        let elapsedMs = overheadMs + (checks?.elapsedMs[index] ?? 0);
        let formatted;
        try {
          if (parallel) {
            if (parallel[index].error) throw parallel[index].error;
            formatted = parallel[index].formatted;
            elapsedMs += parallel[index].elapsedMs;
          } else {
            const started = performance.now();
            formatted = await analyzer.prepare(
              { text: original, file, mode, precheck },
              budgets.documentAnalysisTimeoutMs === null
                ? null
                : budgets.documentAnalysisTimeoutMs - elapsedMs,
            );
            elapsedMs += performance.now() - started;
          }
        } catch (error) {
          await flushPrepared();
          throw error;
        }
        // Batching work units bound retained candidate payloads; they are not
        // resource ceilings and do not change verdicts.
        const retainedBytes =
          item.bytes.length +
          Buffer.byteLength(formatted.output) +
          Buffer.byteLength(
            JSON.stringify(formatted.literalExclusions ?? null),
          );
        if (
          prepared.length >= 32 ||
          preparedBytes + retainedBytes > 4 * 1024 * 1024 ||
          formatted.deferredError
        )
          await flushPrepared();
        prepared.push({ file, item, formatted, elapsedMs, precheck });
        preparedBytes += retainedBytes;
        if (formatted.deferredError) await flushPrepared();
      }
      await flushPrepared();
    }
    const readMember = (file) => {
      const item = document
        ? { bytes: document.content }
        : readDocument(context.root, file, budgets);
      if (physicalWrite && item.stat.nlink !== 1n)
        fail("HARD_LINK", "Hard-linked documents cannot be repaired.");
      total += item.bytes.length;
      if (exceeds(total, budgets.maxTotalDocumentBytes))
        fail("BATCH_LIMIT", "Total document bytes exceed the limit.");
      return { item, text: decode(item.bytes) };
    };
    let members, batch, reversePaths;
    const memberObservations = [];
    if (mode === "normalize") {
      // The complete proposed batch, including dependent fragment edits, is known
      // before any member is analyzed or written.
      members = new Map(
        result.selection.files.map((file) => [file, readMember(file)]),
      );
      if (options.updateLinks)
        reversePaths = await listReverseInventory(context, options);
      batch = prepareNormalizeBatch(
        context,
        [...members].map(([path, { text }]) => ({ path, text })),
        {
          updateLinks: options.updateLinks === true,
          admitBytes,
          listReverseInventory: () => reversePaths ?? [],
        },
      );
      for (const [path, plan] of batch.plans) normalized.set(path, plan.output);
      // Previews and the first replacement require every member to keep its bytes;
      // later replacements rely on each file's own guarded preimage.
      for (const [path, { item }] of members)
        if (!document)
          memberObservations.push({
            role: "dependency",
            kind: "file",
            path: join(context.root, path),
            sha256: digest(item.bytes),
          });
    }
    for (const file of result.selection.files) {
      let item, original;
      try {
        if (members) {
          ({ item } = members.get(file));
          original = normalized.get(file);
        } else ({ item, text: original } = readMember(file));
      } catch (error) {
        await flushInputs();
        throw error;
      }
      if (
        inputs.length >= 32 ||
        inputBytes + item.bytes.length > 4 * 1024 * 1024
      )
        await flushInputs();
      inputs.push({ file, item, original });
      inputBytes += item.bytes.length;
    }
    await flushInputs();
    await flushPrepared();
    // Quiesce the worker and remove private payloads before admitting any write.
    await closeAnalysis();
    // Cross-document fragments use every proposed batch output and captured
    // dependency content, never a partially written mixture.
    graph.resolve((diagnostic) => collector.push(diagnostic));
    result.selection.readDependencies = graph.readDependencies;
    const observations = [
      ...context.observations,
      ...graph.observations,
      ...(batch?.observations ?? []),
    ];
    result.diagnostics.sort(sortDiagnostics);
    // Refuse stale success: policy and dependency inputs must still match.
    recheckObservations([...observations, ...memberObservations]);
    if (reversePaths !== undefined) {
      const current = await listReverseInventory(context, options);
      if (
        current.length !== reversePaths.length ||
        current.some((path, index) => path !== reversePaths[index])
      )
        fail(
          "DEPENDENCY_CHANGED",
          "The reverse-reference inventory changed during normalization.",
        );
    }
    if (batch) {
      for (const [path, plan] of batch.plans)
        result.proposedChanges.push(
          ...changeRecords(path, plan.text, plan.edits),
        );
      result.anchorChanges.push(...batch.anchorChanges);
      result.refusals.push(
        ...batch.refusals.map(({ code, message, path, line, column }) => ({
          code,
          message,
          path: path ?? null,
          line: line ?? null,
          column: column ?? null,
        })),
      );
      if (batch.anchorChanges.length)
        // A local inventory never proves the absence of external callers.
        result.backlinkCoverage = {
          inventoriedDocuments: batch.inventoriedDocuments,
          externalReferences: "unverified",
        };
    }
    const blocked =
      result.refusals.length > 0 ||
      result.diagnostics.some(
        (d) =>
          (d.severity === "error" ||
            (result.strict && d.severity === "warning")) &&
          !residualAllowed(mode, d),
      );
    result.qualityStatus = result.diagnostics.length ? "findings" : "clean";
    result.qualityBasis = mode === "check" ? "input" : "candidate";
    if (blocked) {
      if (physicalWrite)
        for (const record of result.documentResults)
          record.writeStatus = "refused";
      result.operationStatus = mode === "check" ? "completed" : "refused";
      result.exitCode = 1;
      return result;
    }
    if (dryRun) {
      // A preview is complete analysis with zero source writes, never write authority.
      result.operationStatus = "previewed";
      result.exitCode = 0;
      return result;
    }
    if (document) {
      if (repair)
        result.document.contentBase64 = Buffer.from(
          candidates[0].output,
        ).toString("base64");
    } else if (physicalWrite) {
      const changed = [];
      for (const candidate of candidates) {
        const record = records.get(candidate.file);
        if (candidate.item.bytes.equals(Buffer.from(candidate.output)))
          record.writeStatus = "unchanged";
        else {
          record.writeStatus = "pending";
          changed.push(candidate);
        }
      }
      for (const [index, candidate] of changed.entries()) {
        // Earlier replacements are this operation's own postimages; policy inputs
        // are rechecked before every later write.
        if (index > 0) recheckObservations(observations);
        replaceDocument(
          context.root,
          candidate.item,
          candidate.output,
          budgets,
        );
        records.get(candidate.file).writeStatus = "written";
        result.writtenPaths.push(candidate.file);
      }
      result.qualityBasis = "applied";
    }
    result.operationStatus = "completed";
    result.exitCode = 0;
  } catch (error) {
    result.errors.push(reportedError(error));
  } finally {
    try {
      await closeAnalysis();
    } catch (error) {
      result.exitCode = 2;
      result.errors.push(reportedError(error));
    }
  }
  if (result.exitCode === 2 || result.errors.length) {
    result.exitCode = 2;
    result.operationStatus = "failed";
    result.qualityStatus = analysisRequested ? "incomplete" : "not-checked";
    result.qualityBasis = null;
    for (const record of result.documentResults) {
      if (analysisRequested && record.analysisStatus === "not-requested")
        record.analysisStatus = "incomplete";
      if (physicalWrite && record.writeStatus === "not-requested")
        record.writeStatus = "refused";
    }
  }
  return result;
}
