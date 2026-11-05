// SPDX-License-Identifier: AGPL-3.0-only
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { discoverConsumerRoot } from "./consumer-root.js";
import { fail, OperationError, decode, exceeds } from "./contracts.js";
import { validateQualityResult } from "./result-validation.js";
import { defaultReconciliationInventory } from "./documents.js";
import { bindGitExecutable } from "./host-git.js";
import { admitOperationOptions } from "./operation.js";
import { loadExecutionProfile, profileLayer } from "./execution-profile.js";
import {
  bootstrapCeiling,
  executionLimitKeys,
  resolveResourcePolicy,
} from "./resource-controls.js";

/** Child environment deliberately excludes credentials, PATH and Node/config injection. */
export function executionEnvironment() {
  return Object.fromEntries(
    ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
      .filter((name) => process.env[name])
      .map((name) => [name, process.env[name]]),
  );
}

const removedExecutionOptions = Object.freeze({
  checkerMs: "executionTimeoutMs",
  reportBytes: "maxOutputBytes",
  requestBytes: "maxRequestBytes",
  nodeOldSpaceMb: "maxNodeOldGenerationMiB",
});

/** Closed admission for the runner's own controls: signal, process ownership and the
 * same resource fields an execution profile accepts.
 */
function admitExecutionOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options))
    fail("INVALID_EXECUTION", "Execution options must be an object.");
  for (const key of Object.keys(options)) {
    if (Object.hasOwn(removedExecutionOptions, key))
      fail(
        "INVALID_EXECUTION",
        `Execution option ${key} was removed; use ${removedExecutionOptions[key]}.`,
      );
    if (
      !["signal", "processGroup", "resourceLimitMode"].includes(key) &&
      !executionLimitKeys.includes(key)
    )
      fail("INVALID_EXECUTION", "Unknown execution option: " + key);
  }
  const { signal, processGroup = "owned" } = options;
  if (
    !["owned", "inherit"].includes(processGroup) ||
    (signal !== undefined && !(signal instanceof AbortSignal))
  )
    fail(
      "INVALID_EXECUTION",
      "Execution requires a supported containment mode and AbortSignal.",
    );
  const executionLimits = {};
  for (const key of executionLimitKeys)
    if (Object.hasOwn(options, key)) executionLimits[key] = options[key];
  return {
    signal,
    processGroup,
    invocation: {
      origin: "invocation",
      resourceLimitMode: options.resourceLimitMode,
      executionLimits,
    },
  };
}

function admitRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request))
    fail("INVALID_EXECUTION", "Execution requires a request object.");
  for (const key of ["resourceLimitMode", "executionLimits"])
    if (Object.hasOwn(request, key))
      fail(
        "INVALID_EXECUTION",
        `Request ${key} belongs in the runner's options argument.`,
      );
  const { document, ...options } = request;
  admitOperationOptions(options);
  const logical = Object.hasOwn(request, "document");
  if (
    logical &&
    (!document ||
      typeof document !== "object" ||
      Array.isArray(document) ||
      Object.keys(document).some(
        (key) => !["path", "requestId", "contentBase64"].includes(key),
      ) ||
      typeof document.path !== "string" ||
      typeof document.contentBase64 !== "string")
  )
    fail("INVALID_DOCUMENT", "Invalid logical document framing.");
  if (
    !logical &&
    ["format", "normalize"].includes(request.mode) &&
    request.dryRun !== true
  )
    fail(
      "INVALID_EXECUTION",
      "The request runner never writes checkouts; physical repairs require runQuality.",
    );
  return logical;
}

/** Invoke the installed canonical analyzer in a fresh Node process, with resolved
 * framing, deadline and output ceilings, a sanitized environment, cancellation and
 * native process-tree termination. Physical-write restrictions do not imply a sandbox.
 * OS observation/qualification remains the separately shipped observer contract.
 */
export function executeQualityRequest(request, options = {}) {
  return runQualityRequest(request, options);
}

/** Trusted package callers may bind a profile and configuration snapshot. */
export async function runQualityRequest(request, options = {}, internal = {}) {
  const { signal, processGroup, invocation } = admitExecutionOptions(options);
  if (signal?.aborted)
    fail("CANCELLED", "Operation was cancelled before launch.");
  const logical = admitRequest(request);
  invocation.analyzerLimits = request.analyzerLimits;
  // Bind the consumer root and host Git before the child loses its environment.
  const { root } = discoverConsumerRoot(request.root, {
    gitExecutablePath: request.gitExecutablePath,
    gitTimeoutMs: bootstrapCeiling("gitTimeoutMs", [invocation]),
    maxGitOutputBytes: bootstrapCeiling("maxInventoryBytes", [invocation]),
  });
  const profileSnapshot =
    internal.profileSnapshot ??
    loadExecutionProfile({
      root,
      profile: request.executionProfile,
      invocation,
    });
  const limits = resolveResourcePolicy([
    profileLayer(profileSnapshot.value),
    invocation,
  ]).executionLimits;
  let admitted = { ...request, root };
  delete admitted.executionProfile;
  if (!logical)
    admitted.reconciliationInventory = defaultReconciliationInventory(
      root,
      request.files,
      request.reconciliationInventory,
    );
  if (admitted.reconciliationInventory === "git")
    // Candidate data cannot supply the executable, and the checker never
    // inherits a command-search graph.
    admitted.gitExecutablePath = bindGitExecutable(
      root,
      request.gitExecutablePath,
    );
  const frame = {
    request: admitted,
    internal: {
      profileSnapshot: {
        origin: profileSnapshot.origin,
        value: profileSnapshot.value,
        observation: profileSnapshot.observation,
      },
      profileOrigin: internal.profileOrigin,
      configurationSource: internal.configurationSource,
      invocation: {
        resourceLimitMode: invocation.resourceLimitMode,
        executionLimits: invocation.executionLimits,
      },
    },
  };
  const input = Buffer.from(JSON.stringify(frame));
  if (exceeds(input.length, limits.maxRequestBytes))
    fail("REQUEST_LIMIT", "Request exceeds the input framing bound.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        // Null omits the package flag and delegates to the runtime's own limit.
        ...(limits.maxNodeOldGenerationMiB === null
          ? []
          : ["--max-old-space-size=" + limits.maxNodeOldGenerationMiB]),
        fileURLToPath(new URL("./execution-worker.js", import.meta.url)),
        String(limits.maxRequestBytes),
      ],
      {
        env: executionEnvironment(),
        windowsHide: true,
        detached: process.platform !== "win32" && processGroup === "owned",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = [],
      outputBytes = 0,
      stderrBytes = 0,
      failure,
      termination;
    async function stop(code, message) {
      if (failure) return;
      failure = new OperationError(code, message);
      if (!child.pid) return;
      if (process.platform === "win32") {
        termination = new Promise((done) =>
          execFile(
            join(
              process.env.SystemRoot ?? "C:\\Windows",
              "System32",
              "taskkill.exe",
            ),
            ["/PID", String(child.pid), "/T", "/F"],
            {
              windowsHide: true,
              env: executionEnvironment(),
              timeout: limits.cleanupTimeoutMs ?? 0,
            },
            (error) => {
              if (error && child.exitCode === null)
                failure = new OperationError(
                  "CLEANUP_FAILED",
                  "Owned process-tree termination failed.",
                );
              done();
            },
          ),
        );
      } else {
        try {
          process.kill(
            processGroup === "owned" ? -child.pid : child.pid,
            "SIGKILL",
          );
        } catch (error) {
          if (error.code !== "ESRCH")
            failure = new OperationError(
              "CLEANUP_FAILED",
              "Owned process-group termination failed.",
            );
        }
      }
    }
    let timer;
    if (limits.executionTimeoutMs !== null) {
      const deadline = performance.now() + limits.executionTimeoutMs;
      const expire = () => {
        const remaining = deadline - performance.now();
        if (remaining > 0) {
          timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
          return;
        }
        void stop(
          "EXECUTION_TIMEOUT",
          "External checker exceeded its deadline.",
        );
      };
      timer = setTimeout(
        expire,
        Math.min(limits.executionTimeoutMs, 2_147_483_647),
      );
    }
    const cancel = () => stop("CANCELLED", "Operation was cancelled.");
    signal?.addEventListener("abort", cancel, { once: true });
    child.stdout.on("data", (bytes) => {
      outputBytes += bytes.length;
      if (exceeds(outputBytes, limits.maxOutputBytes))
        void stop("REPORT_LIMIT", "Checker output exceeds the report bound.");
      else output.push(bytes);
    });
    child.stderr.on("data", (bytes) => {
      stderrBytes += bytes.length;
      if (exceeds(stderrBytes, limits.maxOutputBytes))
        void stop(
          "REPORT_LIMIT",
          "Checker error output exceeds the report bound.",
        );
    });
    child.stdin.on("error", () => {});
    child.on("error", () => {
      failure = new OperationError(
        "EXECUTION_FAILED",
        "Cannot start installed checker.",
      );
    });
    child.on("close", async (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      await termination;
      if (failure) return reject(failure);
      try {
        const report = JSON.parse(decode(Buffer.concat(output)));
        validateQualityResult(report, {
          operation: request.mode ?? (logical ? "format" : "check"),
          exitCode: code,
          ...(report.operationStatus === "failed"
            ? {}
            : {
                dryRun: request.dryRun === true,
                updateLinks: request.updateLinks === true,
                documentPath: logical ? request.document.path : null,
              }),
          ...(logical ? { requestId: request.document.requestId ?? null } : {}),
        });
        resolve(report);
      } catch (error) {
        reject(
          error.code
            ? error
            : new OperationError(
                "INVALID_RESULT",
                "Checker returned malformed report framing.",
              ),
        );
      }
    });
    child.stdin.end(input);
  });
}
