// SPDX-License-Identifier: AGPL-3.0-only
import { ESLint } from "eslint";
import configuration from "../tooling/json/source-quality.config.mjs";

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: configuration,
});
const results = await eslint.lintFiles([
  "src",
  "scripts",
  "test",
  "tooling/json/*.mjs",
]);
process.stdout.write(
  await (await eslint.loadFormatter("stylish")).format(results),
);
process.exitCode = results.some(
  (result) => result.errorCount || result.warningCount,
)
  ? 1
  : 0;
