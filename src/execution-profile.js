// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import Ajv from "ajv";
import { safePath, readBoundedFile } from "./consumer-root.js";
import { decode, digest, fail } from "./contracts.js";
import {
  bootstrapCeiling,
  executionLimitKeys,
  qualificationLimitKeys,
  resolveResourcePolicy,
} from "./resource-controls.js";

const executionProfileSchema = JSON.parse(
  readFileSync(
    new URL("../schemas/execution.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(
  executionProfileSchema,
);
export const defaultExecutionProfilePath = ".markdown-quality-execution.json";
export const executionProfileSchemaVersion = 2;

/** Removed schema-1 spellings fail explicitly instead of silently restoring a default. */
const removedProfileKeys = Object.freeze({
  samples: "requiredConsecutiveSamples",
  checkerMs: "executionTimeoutMs",
  windowMs: "sampleTimeoutMs",
  memoryBytes: "maxObservedMemoryBytes",
  nodeOldSpaceMb: "maxNodeOldGenerationMiB",
  reportBytes: "maxOutputBytes",
  requestBytes: "maxRequestBytes",
  stagingBytes: "maxStagedDataBytes",
  stagingEntries: "maxStagedEntries",
  limits: "analyzerLimits",
});

function admitProfileValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_PROFILE", "Execution profile must be a JSON object.");
  for (const [old, replacement] of Object.entries(removedProfileKeys))
    if (Object.hasOwn(value, old))
      fail(
        "INVALID_PROFILE",
        `Execution profile key ${old} was removed; use ${replacement}.`,
      );
  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== executionProfileSchemaVersion
  )
    fail(
      "UNSUPPORTED_PROFILE_VERSION",
      "Execution profiles use schemaVersion 2; migrate schema-1 keys to their renamed fields.",
    );
  if (!validate(value))
    fail(
      "INVALID_PROFILE",
      "Execution profile does not match schema version 2: " +
        JSON.stringify(validate.errors),
    );
  return value;
}

/** Project a sparse profile onto one resource-resolution layer. */
export function profileLayer(value, origin = "execution-profile") {
  const executionLimits = {};
  for (const key of executionLimitKeys)
    if (Object.hasOwn(value, key)) executionLimits[key] = value[key];
  return {
    origin,
    resourceLimitMode: value.resourceLimitMode,
    analyzerLimits: value.analyzerLimits,
    executionLimits,
  };
}

const slash = (path) => path.split(sep).join("/");

/** Load the ordinary sparse profile: an inline object, an explicit contained path, or
 * the exact default file at the root. Default-file absence keeps finite package
 * defaults; present malformed, unreadable, linked or incompatible input fails.
 */
export function loadExecutionProfile({ root, profile, invocation }) {
  if (profile !== null && typeof profile === "object") {
    if (Array.isArray(profile))
      fail("INVALID_PROFILE", "Execution profile must be a JSON object.");
    let value;
    try {
      value = JSON.parse(JSON.stringify(profile));
    } catch {
      fail("INVALID_PROFILE", "Execution profile must be plain JSON data.");
    }
    return {
      origin: { kind: "inline", path: null, bytesSha256: null },
      value: admitProfileValue(value),
      observation: null,
    };
  }
  if (profile !== undefined && (typeof profile !== "string" || !profile))
    fail("INVALID_PROFILE", "Execution profile must be a path or an object.");
  const name = profile ?? defaultExecutionProfilePath;
  let path;
  try {
    path = safePath(root, name, { file: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      if (profile !== undefined)
        fail("MISSING_PROFILE", "Explicit execution profile is missing.");
      return {
        origin: {
          kind: "absent",
          path: defaultExecutionProfilePath,
          bytesSha256: null,
        },
        value: {},
        observation: {
          role: "profile",
          kind: "absent",
          path: resolve(root, defaultExecutionProfilePath),
        },
      };
    }
    throw error;
  }
  const { bytes } = readBoundedFile(
    path,
    bootstrapCeiling("maxProfileBytes", [invocation]),
    "PROFILE_LIMIT",
    "Execution profile exceeds its bootstrap admission ceiling.",
  );
  let value;
  try {
    value = JSON.parse(decode(bytes));
  } catch (error) {
    if (error.code) throw error;
    fail("INVALID_PROFILE", "Execution profile must be JSON.");
  }
  const sha256 = digest(bytes);
  return {
    origin: {
      kind: "file",
      path: slash(relative(root, path)),
      bytesSha256: sha256,
    },
    value: admitProfileValue(value),
    observation: { role: "profile", kind: "file", path, sha256 },
  };
}

function readRuntimeDeclarations(root, runtimes, ceiling) {
  const declarations = {},
    versions = {};
  for (const [name, reference] of Object.entries(runtimes ?? {})) {
    const { bytes: content } = readBoundedFile(
      safePath(root, reference.file, { file: true }),
      ceiling,
      "PROFILE_LIMIT",
      "Runtime declaration exceeds its admission ceiling.",
    );
    let version = decode(content).trim();
    if (reference.pointer !== undefined) {
      let parsed;
      try {
        parsed = JSON.parse(version);
      } catch {
        fail(
          "INVALID_RUNTIME",
          "Runtime declaration pointer target is not JSON.",
        );
      }
      for (const part of reference.pointer.slice(1).split("/")) {
        const key = part.replace(/~1/gu, "/").replace(/~0/gu, "~");
        if (
          parsed === null ||
          typeof parsed !== "object" ||
          !Object.hasOwn(parsed, key)
        )
          fail("INVALID_RUNTIME", "Runtime declaration pointer is missing.");
        parsed = parsed[key];
      }
      version = parsed;
    }
    if (
      typeof version !== "string" ||
      !/^\d+\.\d+(?:\.\d+)?$/u.test(version) ||
      (name === "node" && version.split(".").length !== 3)
    )
      fail(
        "INVALID_RUNTIME",
        "Runtime declarations require exact numeric versions.",
      );
    versions[name] = version;
    declarations[name] = { ...reference, sha256: digest(content) };
  }
  return { versions, declarations };
}

/** Resolve a profile's complete resource policy and contained data-only runtime
 * references. Qualification additionally requires its sample count, runtime and
 * staging/observation declarations; ordinary operations require none of them.
 */
export function readExecutionProfile({
  root,
  profile,
  invocation,
  purpose = "ordinary",
}) {
  root = resolve(root);
  if (realpathSync(root) !== root || lstatSync(root).isSymbolicLink())
    fail("UNSAFE_ROOT", "Profile root must have no linked parents.");
  if (!["ordinary", "qualification"].includes(purpose))
    fail("INVALID_PROFILE", "Unknown execution profile purpose.");
  const loaded = loadExecutionProfile({ root, profile, invocation });
  const policy = resolveResourcePolicy([
    profileLayer(loaded.value),
    invocation,
  ]);
  const limits = policy.executionLimits;
  const value = loaded.value;
  if (purpose === "qualification") {
    if (
      loaded.origin.kind !== "file" ||
      !Number.isSafeInteger(value.requiredConsecutiveSamples) ||
      !value.runtimes
    )
      fail(
        "INVALID_PROFILE",
        "Qualification requires a trusted profile file with requiredConsecutiveSamples and runtimes.",
      );
    for (const key of qualificationLimitKeys)
      if (policy.origins[key] === "undeclared")
        fail(
          "INVALID_PROFILE",
          `Qualification profiles must declare ${key} (a positive integer or null).`,
        );
  }
  if (
    value.requiredConsecutiveSamples !== undefined &&
    limits.maxQualificationSamples !== null &&
    value.requiredConsecutiveSamples > limits.maxQualificationSamples
  )
    fail(
      "INVALID_PROFILE",
      "requiredConsecutiveSamples exceeds maxQualificationSamples.",
    );
  if (
    limits.executionTimeoutMs !== null &&
    limits.sampleTimeoutMs !== null &&
    limits.executionTimeoutMs > limits.sampleTimeoutMs
  )
    fail(
      "INVALID_PROFILE",
      "executionTimeoutMs cannot exceed a finite sampleTimeoutMs.",
    );
  const { versions, declarations } = readRuntimeDeclarations(
    root,
    value.runtimes,
    limits.maxRuntimeDeclarationBytes,
  );
  return {
    schemaVersion: executionProfileSchemaVersion,
    resourceLimitMode: policy.resourceLimitMode,
    requiredConsecutiveSamples: value.requiredConsecutiveSamples ?? null,
    ...limits,
    analyzerLimits: policy.analyzerLimits,
    resourceOrigins: policy.origins,
    toolchain: value.toolchain ?? null,
    runtimes: versions,
    declarations,
    profileOrigin: loaded.origin.kind,
    profileSha256: loaded.origin.bytesSha256,
    profilePath: loaded.origin.path,
    sparseProfile: value,
  };
}
