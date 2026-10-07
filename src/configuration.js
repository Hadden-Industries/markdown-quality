// SPDX-License-Identifier: AGPL-3.0-only
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute, sep } from "node:path";
import Ajv from "ajv";
import markdown from "@eslint/markdown";
import { decode, digest, fail, limits, exceeds } from "./contracts.js";
import { lintDefaults, advisoryDefaults } from "./preset.js";
const schema = JSON.parse(
  readFileSync(
    new URL("../schemas/configuration.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
const validateLimits = new Ajv({ allErrors: true, strict: true }).compile(
  schema.properties.limits,
);
function resolveLimits(base, override) {
  if (override === undefined) return { ...base };
  if (!validateLimits(override))
    fail(
      "INVALID_CONFIG",
      "Limits must be false or known positive safe integers/null.",
    );
  return override === false
    ? Object.fromEntries(Object.keys(limits).map((key) => [key, null]))
    : { ...base, ...override };
}
export function contained(root, path) {
  const rel = relative(root, path);
  return (
    rel === "" ||
    (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + sep))
  );
}
export function safePath(root, input, { missing = false, file = false } = {}) {
  if (
    typeof input !== "string" ||
    input.includes("\0") ||
    input.replace(/^[A-Za-z]:[\\/]/u, "").includes(":")
  )
    fail("UNSAFE_PATH", "Invalid path.");
  const path = resolve(root, input);
  if (!contained(root, path))
    fail("UNSAFE_PATH", "Path escapes the consumer root.");
  const parts = relative(root, path).split(sep).filter(Boolean);
  if (parts.length === 0 && file && !lstatSync(root).isFile())
    fail("INVALID_FILE", "Expected a regular file.");
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (missing && error.code === "ENOENT") return path;
      throw error;
    }
    if (stat.isSymbolicLink())
      fail("UNSAFE_PATH", "Symbolic links and junctions are not supported.");
    if (!contained(root, realpathSync(current)))
      fail("UNSAFE_PATH", "Resolved path escapes the consumer root.");
    if (i < parts.length - 1 && !stat.isDirectory())
      fail("UNSAFE_PATH", "A path parent is not a directory.");
    if (i === parts.length - 1 && file && !stat.isFile())
      fail("INVALID_FILE", "Expected a regular file.");
  }
  return path;
}
export function loadConfiguration({ root, config, limits: overrides } = {}) {
  if (!root) {
    root = resolve(process.cwd());
    while (!existsSync(join(root, ".markdown-quality.json"))) {
      const parent = dirname(root);
      if (parent === root)
        fail("MISSING_CONFIG", "No .markdown-quality.json found.");
      root = parent;
    }
  }
  root = resolve(root);
  const rootStat = lstatSync(root);
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    realpathSync(root) !== root
  )
    fail(
      "UNSAFE_ROOT",
      "Consumer root must be a real directory without linked parents.",
    );
  const path = safePath(root, config ?? ".markdown-quality.json", {
    file: true,
  });
  // Validate invocation overrides before acquisition. Read the configuration
  // before enforcing its resolved ceiling so it can declare its own bypass.
  resolveLimits(limits, overrides);
  const bytes = readFileSync(path);
  let value;
  try {
    value = JSON.parse(decode(bytes));
  } catch (error) {
    if (error.code) throw error;
    fail("INVALID_CONFIG", "Configuration must be JSON.");
  }
  if (!validate(value))
    fail(
      "INVALID_CONFIG",
      "Configuration does not match schema version 1: " +
        JSON.stringify(validate.errors),
    );
  const budgets = resolveLimits(resolveLimits(limits, value.limits), overrides);
  if (exceeds(bytes.length, budgets.configBytes))
    fail("CONFIG_LIMIT", "Configuration exceeds the size limit.");
  if (
    exceeds(value.include.length, budgets.patterns) ||
    exceeds((value.exclude ?? []).length, budgets.patterns) ||
    exceeds((value.ignoreFiles ?? []).length, budgets.ignoreFiles) ||
    exceeds(Object.keys(value.lint ?? {}).length, budgets.lintRules) ||
    [
      ...value.include,
      ...(value.exclude ?? []),
      ...(value.ignoreFiles ?? []),
    ].some((pattern) => exceeds([...pattern].length, budgets.patternLength))
  )
    fail(
      "CONFIG_LIMIT",
      "Configuration entries exceed the selected resource limits.",
    );
  for (const rule of Object.keys(value.lint ?? {})) {
    if (
      !(
        rule.startsWith("markdown/") &&
        Object.hasOwn(markdown.rules, rule.slice(9))
      ) &&
      !Object.hasOwn(advisoryDefaults, rule)
    )
      fail("INVALID_RULE", "Unknown Markdown rule: " + rule);
  }
  for (const pattern of [...value.include, ...(value.exclude ?? [])]) {
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
  const effective = {
    ...value,
    exclude: value.exclude ?? [],
    ignoreFiles: value.ignoreFiles ?? [".gitignore", ".prettierignore"],
    lint: {
      ...Object.fromEntries(
        Object.entries(lintDefaults).map(([rule, setting]) => [
          rule,
          Array.isArray(setting) ? setting[0] : setting,
        ]),
      ),
      ...advisoryDefaults,
      ...value.lint,
    },
    links: { localFiles: true, rootRelative: "reject", ...value.links },
    layout: { endOfLine: "lf", tabWidth: 2, ...value.layout },
    syntax: { frontmatter: "yaml", ...value.syntax },
    limits: budgets,
  };
  return { root, config: effective, configDigest: digest(bytes) };
}
