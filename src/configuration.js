// SPDX-License-Identifier: AGPL-3.0-only
import { lstatSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import Ajv from "ajv";
import markdown from "@eslint/markdown";
import {
  canonicalJson,
  decode,
  deepFreeze,
  digest,
  exceeds,
  fail,
} from "./contracts.js";
import {
  packageConfigurationDefaults,
  presetIdentity,
  configurationSchemaVersion,
  qualityRuleDefaults,
} from "./preset.js";
import {
  discoverConsumerRoot,
  readBoundedFile,
  safePath,
} from "./consumer-root.js";
import {
  bootstrapCeiling,
  resolveResourcePolicy,
} from "./resource-controls.js";
import { loadExecutionProfile, profileLayer } from "./execution-profile.js";

const packaged = (name) => readFileSync(new URL(`../${name}`, import.meta.url));
const schema = JSON.parse(packaged("schemas/configuration.schema.json"));
const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);

export const defaultConfigurationPath = ".markdown-quality.json";

// Versioned identity preimages. Changing a prefix or the canonical serializer is a
// contract change; equivalent absent, {} and explicit inputs share effective identity.
const effectiveIdentityPrefix = "markdown-quality:effective-configuration:3\n";
const defaultIdentityPrefix = "markdown-quality:default-configuration:3\n";
const resolverInputs = [
  "src/configuration.js",
  "src/preset.js",
  "src/analyzer-limits.js",
  "src/resource-controls.js",
  "schemas/configuration.schema.json",
  "schemas/effective-configuration.schema.json",
];
export const defaultConfigurationSha256 = digest(
  defaultIdentityPrefix + canonicalJson(packageConfigurationDefaults),
);
/** Identity of the maintained resolver/default/schema/preset input inventory. */
export const policyResolverInputsSha256 = digest(
  canonicalJson(
    resolverInputs.map((path) => ({ path, sha256: digest(packaged(path)) })),
  ),
);
export function effectiveConfigurationSha256(config) {
  return digest(effectiveIdentityPrefix + canonicalJson(config));
}

const slash = (path) => path.split(sep).join("/");

/** Old explicit markers and removed spellings fail with migration guidance. */
function admitInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_CONFIG", "Configuration must be a JSON object.");
  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== configurationSchemaVersion
  )
    fail(
      "UNSUPPORTED_CONFIG_VERSION",
      `Configuration schemaVersion ${JSON.stringify(value.schemaVersion)} is not supported; omit it or use 3 with preset ${presetIdentity}, renaming limits to analyzerLimits and links.localFiles to links.checkLocalTargets.`,
    );
  if (value.preset !== undefined && value.preset !== presetIdentity)
    fail(
      "UNSUPPORTED_PRESET",
      `Preset ${JSON.stringify(value.preset)} is not supported; omit it or use ${presetIdentity}.`,
    );
  if (Object.hasOwn(value, "limits"))
    fail(
      "INVALID_CONFIG",
      "Configuration key limits was removed; use analyzerLimits.",
    );
  if (value.links && typeof value.links === "object") {
    if (Object.hasOwn(value.links, "localFiles"))
      fail(
        "INVALID_CONFIG",
        "Configuration key links.localFiles was removed; use links.checkLocalTargets.",
      );
    if (value.links.rootRelative === "root")
      fail(
        "INVALID_CONFIG",
        'links.rootRelative "root" was renamed to "consumer-root".',
      );
  }
  if (!validate(value))
    fail(
      "INVALID_CONFIG",
      "Configuration does not match schema version 3: " +
        JSON.stringify(validate.errors),
    );
  return value;
}

/** Bounded entry admission happens before any merge or traversal work. */
function admitEntries(value, budgets) {
  const patterns = [...(value.include ?? []), ...(value.exclude ?? [])];
  if (
    exceeds((value.include ?? []).length, budgets.maxPatternsPerList) ||
    exceeds((value.exclude ?? []).length, budgets.maxPatternsPerList) ||
    exceeds(
      Object.keys(value.lint ?? {}).length,
      budgets.maxRuleOverrideCount,
    ) ||
    patterns.some((pattern) =>
      exceeds([...pattern].length, budgets.maxPatternCodePoints),
    )
  )
    fail(
      "CONFIG_LIMIT",
      "Configuration entries exceed the selected resource limits.",
    );
  for (const rule of Object.keys(value.lint ?? {}))
    if (
      !(
        rule.startsWith("markdown/") &&
        Object.hasOwn(markdown.rules, rule.slice(9))
      ) &&
      !Object.hasOwn(qualityRuleDefaults, rule)
    )
      fail("INVALID_RULE", "Unknown Markdown rule: " + rule);
  for (const pattern of patterns)
    if (
      pattern.startsWith("/") ||
      pattern.includes("\\") ||
      pattern.split("/").includes("..") ||
      pattern.includes("\0")
    )
      fail(
        "INVALID_PATTERN",
        "Patterns must be relative slash-separated globs.",
      );
}

/** Resolve sparse input into one separately owned immutable effective snapshot.
 * Known maps merge by key, supplied lists replace defaults, and mandatory
 * operational boundaries are not configuration entries.
 */
export function resolveEffectiveConfiguration(value, analyzerLimits) {
  const defaults = packageConfigurationDefaults;
  return deepFreeze({
    schemaVersion: configurationSchemaVersion,
    preset: presetIdentity,
    include: [...(value.include ?? defaults.include)],
    exclude: [...(value.exclude ?? defaults.exclude)],
    lint: { ...defaults.lint, ...value.lint },
    syntax: { ...defaults.syntax, ...value.syntax },
    links: { ...defaults.links, ...value.links },
    layout: { ...defaults.layout, ...value.layout },
    analyzerLimits: { ...analyzerLimits },
  });
}

/** Only an ENOENT observation of the expected default member is proven absence. */
function readConfigurationInput(root, config, ceiling, snapshot) {
  if (config === undefined) {
    const path = join(root, defaultConfigurationPath);
    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return {
        origin: {
          kind: "default-absent",
          path: defaultConfigurationPath,
          source: null,
        },
        bytes: null,
        observation: { role: "configuration", kind: "absent", path },
      };
    }
    if (stat.isSymbolicLink())
      fail("UNSAFE_PATH", "Symbolic links and junctions are not supported.");
    config = defaultConfigurationPath;
  }
  if (typeof config !== "string" || !config)
    fail("INVALID_CONFIG", "Configuration path must be a nonempty string.");
  let path;
  try {
    path = safePath(root, config, { file: true });
  } catch (error) {
    if (error.code === "ENOENT")
      fail("MISSING_CONFIG", "Explicit configuration file is missing.");
    throw error;
  }
  const { bytes } = readBoundedFile(
    path,
    ceiling,
    "CONFIG_LIMIT",
    "Configuration exceeds its admission ceiling.",
  );
  const relativePath = slash(relative(root, path));
  return {
    origin: snapshot
      ? { kind: "trusted-snapshot", path: relativePath, source: snapshot }
      : { kind: "file", path: relativePath, source: null },
    bytes,
    observation: {
      role: "configuration",
      kind: "file",
      path,
      sha256: digest(bytes),
    },
  };
}

/** Resolve root, execution profile and configuration once. Inputs are snapshotted
 * with their observations so callers can refuse stale success before results or writes.
 * `internal` is supplied only by trusted package transports, never by SDK callers.
 */
export function loadConfiguration(options = {}, internal = {}) {
  const invocation = {
    origin: "invocation",
    resourceLimitMode: options.resourceLimitMode,
    analyzerLimits: options.analyzerLimits,
    executionLimits: options.executionLimits,
  };
  const { root, method } = discoverConsumerRoot(options.root, {
    gitExecutablePath: options.gitExecutablePath,
    gitTimeoutMs: bootstrapCeiling("gitTimeoutMs", [invocation]),
  });
  const profile =
    internal.profileSnapshot ??
    loadExecutionProfile({
      root,
      profile: options.executionProfile,
      invocation,
    });
  const executionLayer = profileLayer(profile.value);
  const input = readConfigurationInput(
    root,
    options.config,
    bootstrapCeiling("maxConfigurationBytes", [executionLayer, invocation]),
    internal.configurationSource,
  );
  let value = {};
  if (input.bytes) {
    try {
      value = JSON.parse(decode(input.bytes));
    } catch (error) {
      if (error.code) throw error;
      fail("INVALID_CONFIG", "Configuration must be JSON.");
    }
    admitInput(value);
  }
  const resources = resolveResourcePolicy([
    { origin: "configuration", analyzerLimits: value.analyzerLimits },
    executionLayer,
    invocation,
  ]);
  if (
    input.bytes &&
    exceeds(input.bytes.length, resources.analyzerLimits.maxConfigurationBytes)
  )
    fail("CONFIG_LIMIT", "Configuration exceeds the selected size limit.");
  admitEntries(value, resources.analyzerLimits);
  const config = resolveEffectiveConfiguration(value, resources.analyzerLimits);
  return {
    root,
    rootDiscovery: method,
    config,
    provenance: deepFreeze({
      configurationOrigin: input.origin,
      configurationBytesSha256: input.bytes ? digest(input.bytes) : null,
      defaultConfigurationSha256,
      policyResolverInputsSha256,
      effectiveConfigurationSha256: effectiveConfigurationSha256(config),
    }),
    resources: deepFreeze({
      ...resources,
      executionProfile: internal.profileOrigin ?? {
        kind: profile.origin.kind,
        path: profile.origin.path,
        bytesSha256: profile.origin.bytesSha256,
      },
    }),
    profile,
    observations: [input.observation, profile.observation].filter(Boolean),
  };
}

/** Refuse stale success: absent inputs must remain absent and files must keep their
 * exact admitted bytes and unlinked regular identity. This is a cooperative
 * observation window, not protection against arbitrary same-user races.
 */
export function recheckObservations(observations, budgets = {}) {
  for (const observation of observations) {
    const code =
      observation.role === "configuration"
        ? "CONFIG_CHANGED"
        : observation.role === "profile"
          ? "PROFILE_CHANGED"
          : "DEPENDENCY_CHANGED";
    let stat;
    try {
      stat = lstatSync(observation.path);
    } catch (error) {
      if (error.code === "ENOENT" && observation.kind === "absent") continue;
      fail(
        code,
        "A policy or dependency input disappeared or became unreadable.",
      );
    }
    if (observation.kind === "absent")
      fail(code, "An absent policy input appeared during the operation.");
    if (stat.isSymbolicLink() || !stat.isFile())
      fail(code, "A policy or dependency input became linked or irregular.");
    let bytes;
    try {
      ({ bytes } = readBoundedFile(
        observation.path,
        budgets.maxBytes ?? null,
        code,
        "A policy or dependency input changed size.",
      ));
    } catch (error) {
      if (error.code === code) throw error;
      fail(code, "A policy or dependency input became unreadable.");
    }
    if (digest(bytes) !== observation.sha256)
      fail(code, "A policy or dependency input changed during the operation.");
  }
}

export { safePath, contained } from "./consumer-root.js";
export { resolveConsumerRoot, discoverConsumerRoot } from "./consumer-root.js";
