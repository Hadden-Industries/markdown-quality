// SPDX-License-Identifier: AGPL-3.0-only
import { checkArchitecture } from "./architecture.js";
try {
  if (process.argv.length !== 2)
    throw new Error("Usage: npm run check:architecture");
  const result = checkArchitecture();
  console.log(
    `Architecture passed: ${result.runtime.length} shipped JavaScript modules; ${result.graphDigest}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
