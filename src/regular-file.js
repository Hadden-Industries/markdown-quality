// SPDX-License-Identifier: AGPL-3.0-only
import { closeSync, constants, fstatSync, lstatSync, openSync } from "node:fs";

const pathFields = [
  "dev",
  "ino",
  "mode",
  "nlink",
  "size",
  "mtimeMs",
  "ctimeMs",
  "birthtimeMs",
  "birthtimeNs",
];
const fileFields = pathFields.filter((field) => field !== "dev");
const equal = (left, right, fields) =>
  fields.every((field) => left[field] === right[field]);
const regular = (stat) =>
  stat.isFile() &&
  !stat.isSymbolicLink() &&
  (stat.nlink === 1 || stat.nlink === 1n);

/** Open and cross-check a regular single-link leaf; the caller owns ancestor/root admission
 * and must close descriptor. stat is the handle observation, never a path stat.
 * Older Windows Node versions represent dev differently in lstat and fstat.
 * Keep full path-to-path checks, bind the other file fields across observations,
 * and let consumers compare full handle identities, including dev, over time.
 * These are bounded observations, not filesystem locking or an atomic snapshot.
 */
export function openRegularFile(path, options = {}) {
  let descriptor;
  try {
    const before = lstatSync(path, options);
    if (!regular(before)) throw Error("Expected a regular single-link file.");
    // Native POSIX flags also avoid following a replaced leaf or blocking on a
    // substituted FIFO. Windows supplies neither flag; path checks remain mandatory.
    descriptor = openSync(
      path,
      constants.O_RDONLY |
        (constants.O_NOFOLLOW ?? 0) |
        (constants.O_NONBLOCK ?? 0),
    );
    const stat = fstatSync(descriptor, options);
    const after = lstatSync(path, options);
    if (
      !regular(stat) ||
      !regular(after) ||
      !equal(before, after, pathFields) ||
      !equal(before, stat, fileFields) ||
      (process.platform !== "win32" && before.dev !== stat.dev)
    )
      throw Error("File changed while being opened.");
    return { descriptor, stat };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    throw error;
  }
}

/** Observe the authoritative handle stat without retaining an open descriptor. */
export function statRegularFile(path, options = {}) {
  const { descriptor, stat } = openRegularFile(path, options);
  try {
    return stat;
  } finally {
    closeSync(descriptor);
  }
}
