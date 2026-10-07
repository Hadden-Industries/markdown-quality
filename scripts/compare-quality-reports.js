// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, statSync } from "node:fs";
import { compareQualityReports } from "../src/migration.js";
/** Maintainer harness: supplied reports/schemas/manifests are data, never commands. */
const args = process.argv.slice(2);
const unlimited = args[0] === "--no-limits";
const paths = unlimited ? args.slice(1) : args;
if (paths.length !== 6)
  throw new Error(
    "Usage: node scripts/compare-quality-reports.js [--no-limits] old-report new-report old-schema new-schema old-inputs new-inputs",
  );
function read(path) {
  if (
    !statSync(path).isFile() ||
    (!unlimited && statSync(path).size > 8 * 1024 * 1024)
  )
    throw new Error("Comparison input must be a bounded regular JSON file.");
  return JSON.parse(readFileSync(path, "utf8"));
}
const [
  incumbent,
  candidate,
  incumbentSchema,
  candidateSchema,
  incumbentInputs,
  candidateInputs,
] = paths.map(read);
process.stdout.write(
  JSON.stringify(
    compareQualityReports({
      incumbent,
      candidate,
      incumbentSchema,
      candidateSchema,
      incumbentInputs,
      candidateInputs,
    }),
  ) + "\n",
);
