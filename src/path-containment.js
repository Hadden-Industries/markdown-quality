// SPDX-License-Identifier: AGPL-3.0-only
import { isAbsolute, relative, sep } from "node:path";
/** Lexical host-path containment; callers retain realpath/link admission. */
export function contained(root, path) {
  const part = relative(root, path);
  return (
    part === "" ||
    (!isAbsolute(part) && part !== ".." && !part.startsWith(".." + sep))
  );
}
