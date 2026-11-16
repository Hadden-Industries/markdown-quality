// SPDX-License-Identifier: AGPL-3.0-only
/** Recover native upload acknowledgements from their original Actions step. */
import assert from "node:assert/strict";

const uploadName = /^Run actions\/upload-artifact@[a-f0-9]{40}$/u;
const timestamped = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) (.*)$/u;
const digestLine = /^SHA256 digest of uploaded artifact is ([a-f0-9]{64})$/u;
const idLine =
  /^Artifact ([a-zA-Z0-9._-]+) successfully finalized\. Artifact ID ([1-9]\d{0,15})$/u;

export function publicationUploadStep(job) {
  const uploads = (job.steps ?? []).filter((step) =>
    uploadName.test(step.name),
  );
  assert.ok(uploads.length <= 1, "Ambiguous publication evidence upload step");
  return uploads[0];
}

/** The pinned stock action logs the computed digest before the immutable ID. */
export async function publicationUploadAcknowledgment(job, name, read) {
  const step = publicationUploadStep(job);
  if (!step || step.conclusion === "skipped") return null;
  assert.equal(step.status, "completed");
  assert.ok(["success", "failure"].includes(step.conclusion));
  const start = Date.parse(step.started_at);
  // Job API timestamps have second precision while log timestamps retain fractions.
  const end = Date.parse(step.completed_at) + 1000;
  assert.ok(
    start < end,
    "Original publication upload step times are unavailable",
  );
  assert.ok(Number.isSafeInteger(job.id) && job.id > 0);
  const log = await read(`/actions/jobs/${job.id}/logs`, {
    raw: true,
    maximumBytes: 16 * 1024 * 1024,
  });
  let digest,
    id,
    entered = false;
  for (const line of new TextDecoder("utf-8", { fatal: true })
    .decode(log)
    .split(/\r?\n/u)) {
    const entry = timestamped.exec(line);
    if (!entry) continue;
    const time = Date.parse(entry[1]);
    if (!(time >= start && time < end)) continue;
    if (entry[2] === `##[group]${step.name}`) {
      assert.ok(!entered, "Ambiguous publication upload log boundary");
      entered = true;
    }
    if (!entered) continue;
    if (entry[2] === "Post job cleanup.") break;
    const checksum = digestLine.exec(entry[2]);
    if (checksum) {
      assert.equal(digest, undefined, "Ambiguous publication upload digest");
      digest = `sha256:${checksum[1]}`;
    }
    const finalized = idLine.exec(entry[2]);
    if (finalized) {
      assert.equal(
        finalized[1],
        name,
        "Publication upload belongs to another attempt",
      );
      assert.ok(
        digest && id === undefined,
        "Ambiguous publication upload acknowledgment",
      );
      id = Number(finalized[2]);
      assert.ok(Number.isSafeInteger(id));
    }
  }
  if (id === undefined) {
    assert.notEqual(
      step.conclusion,
      "success",
      "Original publication upload acknowledgment is missing",
    );
    return null;
  }
  return { id, name, digest };
}
