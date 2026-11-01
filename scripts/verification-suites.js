// SPDX-License-Identifier: AGPL-3.0-only
/** One test inventory. Unknown additions retain runtime coverage until classified. */
import { readdirSync } from "node:fs";
const producerOnly = new Set([
  "affected-tests",
  "architecture",
  "bundled-dependencies",
  "ci-observation",
  "ci-result",
  "ci-consumer",
  "dependency-graph",
  "dependency-impact-cleanup",
  "distribution-sbom",
  "dry-impact",
  "dry-tooling",
  "generated-contracts",
  "generated-windows-job",
  "github-release",
  "node-projections",
  "node-support",
  "npm-acquisition",
  "packaging",
  "packed-qualification",
  "publication",
  "publication-attempts",
  "python-runtime",
  "registry-readback",
  "release-continuation",
  "release-promotion",
  "release-security",
  "release-staging",
  "release-runtime",
  "source-policy",
  "test-outcomes",
  "ci-proof",
  "evidence-transport",
  "workflows",
  "governance",
]);
export function testFiles(runtimeOnly = false) {
  return readdirSync(new URL("../test/", import.meta.url))
    .filter((name) => name.endsWith(".test.js"))
    .filter((name) => !runtimeOnly || !producerOnly.has(name.slice(0, -8)))
    .map((name) => `test/${name}`);
}
