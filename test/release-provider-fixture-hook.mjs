// SPDX-License-Identifier: AGPL-3.0-only
/** Cold process isolation adapted from JSON Quality; no production module replacement. */
import { registerHooks, isBuiltin } from "node:module";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { fixtureFetch } from "./release-provider-fixture-transport.mjs";

const transport = new URL(
  "./release-provider-fixture-transport.mjs",
  import.meta.url,
).href;
const native =
  "data:text/javascript," +
  encodeURIComponent(
    `export * from "child_process"; export {spawnSync} from ${JSON.stringify(transport)};`,
  );
const filesystem =
  "data:text/javascript," +
  encodeURIComponent(
    `export * from "fs"; export {fixtureReadFileSync as readFileSync} from ${JSON.stringify(transport)};`,
  );
const npmRoot = pathToFileURL(
  dirname(dirname(process.env.MARKDOWN_QUALITY_PRODUCER_NPM)),
).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "node:child_process")
      return { url: native, shortCircuit: true };
    if (specifier === "node:fs") return { url: filesystem, shortCircuit: true };
    if (
      !isBuiltin(specifier) &&
      !/^(?:file:|data:|[./]|[A-Za-z]:)/u.test(specifier) &&
      !context.parentURL?.startsWith(npmRoot)
    )
      throw Error("Project dependency graph is absent: " + specifier);
    const result = next(specifier, context);
    if (
      result.url?.includes("/node_modules/") &&
      !result.url.startsWith(npmRoot)
    )
      throw Error("Project dependency graph is absent: " + result.url);
    return result;
  },
});
globalThis.fetch = fixtureFetch;
