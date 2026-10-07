// SPDX-License-Identifier: AGPL-3.0-only
import {
  openSync,
  closeSync,
  writeFileSync,
  fsyncSync,
  chmodSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { safePath } from "./configuration.js";
import { fail } from "./contracts.js";
import { readDocument } from "./documents.js";
function unchanged(root, item, budgets) {
  safePath(root, item.path, { file: true });
  const { stat, bytes } = readDocument(root, item.path, budgets);
  if (
    stat.dev !== item.stat.dev ||
    stat.ino !== item.stat.ino ||
    stat.nlink !== 1n ||
    stat.mode !== item.stat.mode ||
    !bytes.equals(item.bytes)
  )
    fail(
      "PREIMAGE_CHANGED",
      "File identity, permissions, or bytes changed before replacement.",
    );
}
/** Replace only an unchanged single-link preimage, using the operation's resolved read budget. */
export function replaceDocument(root, item, output, budgets) {
  unchanged(root, item, budgets);
  if (
    typeof process.getuid === "function" &&
    item.stat.uid !== BigInt(process.getuid())
  )
    fail(
      "FILE_OWNERSHIP",
      "Formatting a file owned by another user is unsupported.",
    );
  const temp = join(
    dirname(item.path),
    `.markdown-quality-${randomUUID()}.tmp`,
  );
  let fd,
    created = false;
  try {
    fd = openSync(temp, "wx", Number(item.stat.mode & 0o777n));
    created = true;
    writeFileSync(fd, output, "utf8");
    chmodSync(temp, Number(item.stat.mode & 0o777n));
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    unchanged(root, item, budgets);
    renameSync(temp, item.path);
    created = false;
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (created) unlinkSync(temp);
  }
}
