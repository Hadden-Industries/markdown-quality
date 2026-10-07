// SPDX-License-Identifier: AGPL-3.0-only
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// Invoke the installed public API so the maintainer can select its resource
// budget without adding configuration files to the immutable consumer corpus.
const [cli, root, limits] = process.argv.slice(2);
const { runQuality } = await import(
  pathToFileURL(join(dirname(cli), "quality.js"))
);
const result = await runQuality({
  root,
  mode: "check",
  limits: JSON.parse(limits),
});
process.stdout.write(JSON.stringify(result) + "\n");
process.exitCode = result.exitCode;
