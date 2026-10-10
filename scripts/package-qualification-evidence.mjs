// SPDX-License-Identifier: AGPL-3.0-only
import { join } from "node:path";
import { packageQualificationEvidence } from "../src/qualification-evidence.js";

const index = packageQualificationEvidence({
  sourceRoot: join(process.env.RUNNER_TEMP, "shared-markdown-evidence"),
  outputRoot: join(process.env.RUNNER_TEMP, "shared-markdown-upload"),
});
process.stdout.write(
  JSON.stringify({
    passed: index.passed,
    samples: index.samples.length,
    payloadRetention: index.payloadRetention,
  }) + "\n",
);
