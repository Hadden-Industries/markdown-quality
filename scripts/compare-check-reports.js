// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, statSync } from "node:fs";
import { compareCheckReports } from "../src/report-comparison.js";
import { defaultExecutionLimits } from "../src/resource-controls.js";
/** Maintainer harness: supplied reports/schemas/manifests are data, never commands.
 * The input-size ceiling resolves before any comparison input is read.
 */
const usage =
  "Usage: node scripts/compare-check-reports.js [--no-input-size-limit | --max-comparison-input-bytes N] old-report new-report old-schema new-schema old-inputs new-inputs";
const args = process.argv.slice(2);
let ceiling = defaultExecutionLimits.maxComparisonInputBytes;
if (args[0] === "--no-input-size-limit") {
  ceiling = null;
  args.shift();
} else if (args[0] === "--max-comparison-input-bytes") {
  ceiling = Number(args[1]);
  if (!Number.isSafeInteger(ceiling) || ceiling < 1) throw new Error(usage);
  args.splice(0, 2);
}
if (args.length !== 6) throw new Error(usage);
function read(path) {
  if (
    !statSync(path).isFile() ||
    (ceiling !== null && statSync(path).size > ceiling)
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
] = args.map(read);
process.stdout.write(
  JSON.stringify(
    compareCheckReports({
      incumbent,
      candidate,
      incumbentSchema,
      candidateSchema,
      incumbentInputs,
      candidateInputs,
    }),
  ) + "\n",
);
