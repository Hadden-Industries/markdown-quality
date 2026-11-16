// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Bind numeric original artifact identities for read-only completion.
 * The GitHub writer identity is bound only when the admitted operation has
 * one; the completion phase authenticates that choice against the decision.
 */
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";

const mode = process.env.RELEASE_MODE;
assert.ok(["execute", "verify"].includes(mode));
const required = ["admissionId", "npmId", "writerAttempt", "writerRun"];
let selected;
if (mode === "verify") {
  assert.ok(Buffer.byteLength(process.env.CONTINUATION_JSON ?? "") <= 4096);
  selected = JSON.parse(process.env.CONTINUATION_JSON);
  const keys = Object.keys(selected).sort();
  assert.ok(
    [required, [...required, "githubId"]].some(
      (expected) => keys.join() === [...expected].sort().join(),
    ),
    "Verification binds the admission, npm and any original GitHub writer",
  );
} else {
  assert.ok(
    !process.env.CONTINUATION_JSON || process.env.CONTINUATION_JSON === "{}",
  );
  const needs = JSON.parse(process.env.NATIVE_RESULTS);
  for (const name of ["admit", "npm"])
    assert.equal(needs[name].result, "success");
  // The admission job derives this output from the authenticated operation.
  const githubWriter = needs.admit.outputs["github-writer"];
  assert.ok(["true", "false"].includes(githubWriter));
  assert.equal(
    needs.github.result,
    githubWriter === "true" ? "success" : "skipped",
    "The GitHub writer result differs from the admitted operation",
  );
  selected = {
    admissionId: needs.admit.outputs["artifact-id"],
    npmId: needs.npm.outputs["artifact-id"],
    ...(githubWriter === "true"
      ? { githubId: needs.github.outputs["artifact-id"] }
      : {}),
    writerRun: process.env.GITHUB_RUN_ID,
    // Execute-mode writers refuse reruns. A copied successful job still came
    // from attempt one when only this read-only completion job is rerun.
    writerAttempt: "1",
  };
}
for (const value of Object.values(selected))
  assert.match(String(value), /^[1-9]\d{0,15}$/u);
assert.ok(process.env.GITHUB_ENV && process.env.GITHUB_OUTPUT);
for (const [field, environment, output] of [
  ["admissionId", "ADMISSION_ID", "admission-id"],
  ["npmId", "NPM_RESULT_ID", "npm-id"],
  ["githubId", "RELEASE_GITHUB_RESULT_ID", "github-id"],
  ["writerRun", "WRITER_RUN", "writer-run"],
  ["writerAttempt", "WRITER_ATTEMPT", "writer-attempt"],
]) {
  if (selected[field] === undefined) continue;
  appendFileSync(process.env.GITHUB_ENV, `${environment}=${selected[field]}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `${output}=${selected[field]}\n`);
}
