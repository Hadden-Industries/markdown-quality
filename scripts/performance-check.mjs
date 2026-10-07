// SPDX-License-Identifier: AGPL-3.0-only
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Invoke the installed public API so the maintainer can select its resource
// budget without adding configuration files to the immutable consumer corpus.
const [cli, root, limits, gitExecutable, config] = process.argv.slice(2);
const require = createRequire(pathToFileURL(cli));
const { runQuality } = await import(
  pathToFileURL(require.resolve("@hadden-industries/markdown-quality"))
);
const result = await runQuality({
  root,
  mode: "check",
  limits: JSON.parse(limits),
  config,
  gitExecutable,
});
process.stdout.write(JSON.stringify(result) + "\n");
process.exitCode = result.exitCode;
