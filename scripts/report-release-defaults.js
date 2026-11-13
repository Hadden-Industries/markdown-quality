// SPDX-License-Identifier: AGPL-3.0-only
/** Always-run read-only observations after public qualification, including a failed direct-latest matrix. */
import { appendFileSync, writeFileSync } from "node:fs";
import { native } from "./commands.js";
import { releasePackages } from "./release-coordinates.js";
import { readPackageTags } from "./release-labels.js";

const report = {
  kind: "observed-defaults-only",
  qualified: false,
  qualificationJobs: JSON.parse(process.env.NEEDS_JSON),
  observedAt: new Date().toISOString(),
  npm: {},
};
const deadline = performance.now() + 120000;
for (const name of releasePackages) {
  try {
    report.npm[name] = readPackageTags(name, {
      deadline,
      allowAbsentPackage: true,
    });
  } catch (error) {
    report.npm[name] = {
      observation: "unconfirmed",
      code: error.code ?? null,
      httpStatus: error.httpStatus ?? null,
    };
  }
}
try {
  report.githubLatest = JSON.parse(
    native(
      "gh",
      ["api", "repos/Hadden-Industries/markdown-quality/releases/latest"],
      { timeout: Math.max(1, deadline - performance.now()) },
    ),
  );
} catch (error) {
  report.githubLatest = {
    observation: "unconfirmed",
    httpStatus: error.httpStatus ?? null,
  };
}
writeFileSync(
  "observed-defaults.json",
  JSON.stringify(report, null, 2) + "\n",
  { flag: "wx" },
);
appendFileSync(
  process.env.GITHUB_STEP_SUMMARY,
  `### Observed public defaults after qualification\n\nThese read-only observations do not establish release qualification. Native approval may already have moved defaults even when a matrix lane failed. Inspect the original stage journals and this attempt's results before recovery.\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`,
);
