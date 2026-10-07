// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import { safePath } from "./configuration.js";
import { decode, digest, fail, limits } from "./contracts.js";

const executionProfileSchema = JSON.parse(
  readFileSync(
    new URL("../schemas/execution.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(
  executionProfileSchema,
);

function boundedFile(root, name) {
  const path = safePath(root, name, { file: true });
  if (lstatSync(path).size > 65536)
    fail("PROFILE_LIMIT", "Trusted profile input exceeds 64 KiB.");
  return readFileSync(path);
}

/** Parse finite trusted qualification controls and contained data-only runtime references.
 * Returned limits override policy limits; original bytes and each declaration are bound.
 */
export function readExecutionProfile({
  root,
  profile = ".markdown-quality-execution.json",
}) {
  root = resolve(root);
  if (realpathSync(root) !== root || lstatSync(root).isSymbolicLink())
    fail("UNSAFE_ROOT", "Trusted root must have no linked parents.");
  const bytes = boundedFile(root, profile);
  const value = JSON.parse(decode(bytes));
  if (
    !validate(value) ||
    value.checkerMs > value.windowMs ||
    value.samples > 100
  )
    fail(
      "INVALID_PROFILE",
      "Execution profile requires finite bounded controls and 1..100 samples.",
    );
  const declarations = {};
  const runtimes = {};
  for (const [name, reference] of Object.entries(value.runtimes)) {
    const content = boundedFile(root, reference.file);
    let version = decode(content).trim();
    if (reference.pointer !== undefined) {
      let parsed = JSON.parse(version);
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
    runtimes[name] = version;
    declarations[name] = { ...reference, sha256: digest(content) };
  }
  return {
    ...value,
    limits: { ...limits, ...value.limits },
    runtimes,
    declarations,
    profileSha256: digest(bytes),
    profilePath: profile,
  };
}
