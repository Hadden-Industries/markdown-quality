// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";

/** Present caller-selected public scalar facts; invalid data or summary I/O fails the step.
 * Disable log output when the caller already owns a machine-readable stdout contract.
 */
export function reportCiResult(
  title,
  facts,
  { summaryPath = process.env.GITHUB_STEP_SUMMARY, log = true } = {},
) {
  assert.match(title, /^[A-Za-z][A-Za-z0-9 ()/-]{0,79}$/u);
  assert.ok(facts && typeof facts === "object" && !Array.isArray(facts));
  const entries = Object.entries(facts);
  assert.ok(entries.length > 0 && entries.length <= 32);
  for (const [key, value] of entries) {
    assert.ok(key.length > 0 && key.length <= 80);
    assert.ok(
      typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value)),
      "CI facts must be public scalar values, not raw reports",
    );
  }
  const json = JSON.stringify(facts, null, 2);
  assert.ok(
    Buffer.byteLength(json) <= 8192,
    "CI facts exceed the display bound",
  );
  // JSON escapes embedded newlines. Data cannot begin a workflow-command line
  // or close the summary fence; HTML/Markdown remains inert inside the fence.
  if (summaryPath)
    appendFileSync(
      summaryPath,
      `### ${title}\n\n\`\`\`json\n${json}\n\`\`\`\n\n`,
    );
  if (log) process.stdout.write(JSON.stringify({ title, facts }) + "\n");
}
