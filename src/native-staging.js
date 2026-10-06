// SPDX-License-Identifier: AGPL-3.0-only
import {
  chmodSync,
  closeSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fail, limits } from "./contracts.js";

export const nativeCheckConfig =
  'format = "markdown"\nmax_width = 0\nclause_breaks = false\nlong_threshold = 2097153\n';
const editorConfig = "root = true\n\n[*]\nmax_line_length = off\n";
const configFiles = new Map([
  ["snapper-check.toml", nativeCheckConfig],
  [".editorconfig", editorConfig],
]);
const inputName = /^input-(?:[0-9]|[12][0-9]|3[01])\.md$/u;

function identity(stat) {
  return { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs };
}
function same(stat, expected) {
  return Object.keys(expected).every((key) => stat[key] === expected[key]);
}
function contains(root, path) {
  const part = relative(root, path);
  return (
    part === "" ||
    (!isAbsolute(part) && part !== ".." && !part.startsWith(".." + sep))
  );
}

/** Establish a private external capability, or preserve the stdin path if unavailable. */
export function createNativeStaging(consumerRoot) {
  let token;
  try {
    const parent = realpathSync(tmpdir());
    // Never create even an empty staging directory inside the consumer checkout.
    if (
      contains(consumerRoot, parent) ||
      (process.platform === "win32" && parent.startsWith("\\\\"))
    )
      return null;
    const parentStat = lstatSync(parent, { bigint: true });
    if (
      process.platform !== "win32" &&
      parentStat.mode & 0o022n &&
      !(parentStat.mode & 0o1000n)
    )
      return null;
    const path = mkdtempSync(join(parent, "markdown-quality-native-"));
    token = { path, identity: identity(lstatSync(path, { bigint: true })) };
    if (process.platform === "win32") restrictWindowsAccess(path);
    else chmodSync(path, 0o700);
    verifyNativeStaging(token, false);
    for (const [name, text] of configFiles) writeStagedFile(token, name, text);
    verifyNativeStaging(token);
    let closed = false;
    return {
      token,
      close() {
        if (closed) return;
        closed = true;
        closeNativeStaging(token);
      },
    };
  } catch {
    // No private document payload is written during capability establishment.
    if (token) closeNativeStaging(token);
    return null;
  }
}

function restrictWindowsAccess(path) {
  const deadline = performance.now() + 1000;
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot || !isAbsolute(systemRoot))
    throw Error("No system directory.");
  const system = join(systemRoot, "System32");
  const options = {
    cwd: fileURLToPath(new URL("../assets/", import.meta.url)),
    env: { SystemRoot: systemRoot, WINDIR: systemRoot },
    shell: false,
    windowsHide: true,
    maxBuffer: 65536,
  };
  function run(command, args) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) throw Error("Private access deadline exceeded.");
    return spawnSync(command, args, { ...options, timeout: remaining });
  }
  const user = run(join(system, "whoami.exe"), ["/user", "/fo", "csv", "/nh"]);
  if (user.error || user.signal || user.status !== 0)
    throw Error("Identity unavailable.");
  const sid = /"(S-1-(?:\d+-)*\d+)"\s*$/u.exec(
    user.stdout.toString("utf8").trim(),
  )?.[1];
  if (!sid) throw Error("Identity unavailable.");
  // Reset an empty owned directory first, then remove inherited entries and grant
  // only the current SID. No consumer ACL or existing directory is modified.
  for (const args of [
    [path, "/reset"],
    [path, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`],
  ]) {
    const result = run(join(system, "icacls.exe"), args);
    if (result.error || result.signal || result.status !== 0)
      throw Error("Private access unavailable.");
  }
}

/** Validate the originally created directory and immutable configuration boundary. */
export function verifyNativeStaging(token, checkConfiguration = true) {
  try {
    const stat = lstatSync(token.path, { bigint: true });
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      !same(stat, token.identity) ||
      realpathSync(token.path) !== token.path
    )
      throw Error("Changed staging root.");
    if (
      process.platform !== "win32" &&
      ((stat.mode & 0o077n) !== 0n || stat.uid !== BigInt(process.getuid()))
    )
      throw Error("Staging access is not private.");
    if (checkConfiguration)
      for (const [name, text] of configFiles) {
        const path = join(token.path, name);
        const file = lstatSync(path, { bigint: true });
        if (
          !file.isFile() ||
          file.isSymbolicLink() ||
          file.nlink !== 1n ||
          file.size !== BigInt(Buffer.byteLength(text)) ||
          readFileSync(path, "utf8") !== text
        )
          throw Error("Changed staging configuration.");
      }
  } catch {
    fail("NATIVE_STAGING", "Private native staging is unavailable or changed.");
  }
}

/** Write one package-selected exclusive file; its caller owns the returned identity. */
export function writeStagedFile(token, name, text) {
  verifyNativeStaging(token, false);
  if (!inputName.test(name) && !configFiles.has(name))
    fail("NATIVE_STAGING", "Invalid native staging input.");
  const path = join(token.path, name);
  let descriptor;
  try {
    descriptor = openSync(path, "wx", 0o600);
    writeFileSync(descriptor, text, "utf8");
    return {
      path,
      identity: identity(fstatSync(descriptor, { bigint: true })),
    };
  } catch {
    fail("NATIVE_STAGING", "Cannot prepare private native input.");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

/** Remove only regular single-link files in the still-owned flat directory. */
export function removeStagedFile(token, file) {
  try {
    verifyNativeStaging(token, false);
    if (dirname(file.path) !== token.path) throw Error("Outside staging.");
    const stat = lstatSync(file.path, { bigint: true });
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1n ||
      !same(stat, file.identity)
    )
      throw Error("Changed staging input.");
    unlinkSync(file.path);
  } catch {
    fail("NATIVE_CLEANUP", "Private native staging cleanup is incomplete.");
  }
}

function closeNativeStaging(token) {
  try {
    verifyNativeStaging(token, false);
    const names = readdirSync(token.path);
    if (
      names.length > 34 ||
      names.some((name) => !inputName.test(name) && !configFiles.has(name))
    )
      throw Error("Unexpected staging contents.");
    for (const name of names) {
      const path = join(token.path, name);
      removeStagedFile(token, {
        path,
        identity: identity(lstatSync(path, { bigint: true })),
      });
    }
    verifyNativeStaging(token, false);
    rmdirSync(token.path);
  } catch {
    fail("NATIVE_CLEANUP", "Private native staging cleanup is incomplete.");
  }
}
