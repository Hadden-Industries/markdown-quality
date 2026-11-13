// SPDX-License-Identifier: AGPL-3.0-only
/** Authenticate immutable writer artifacts independently of the workflow dependency result. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { native } from "./commands.js";
import { hash, releaseBytes } from "./release-bytes.js";
import { verifyEffectJournal } from "./release-effects.js";
import {
  authenticateArtifact,
  retainedArtifact,
  verifyRetainedFiles,
  assertRetainedArtifactIdentity,
} from "./release-retained-artifacts.js";

export function verifyServiceResult(service, bytes, journal, expected) {
  const record = JSON.parse(bytes);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.state, `${service}-acknowledged`);
  assert.deepEqual(record.context, expected);
  assert.equal(record.journalSha256, hash(journal));
  const effects = verifyEffectJournal(journal, expected);
  assert.ok(
    effects.every(
      (effect) =>
        effect.provider === service && effect.outcome === "acknowledged",
    ),
    "Unknown writer effects require reconciliation",
  );
  return { record, effects };
}

/** The transport checks ZIP bytes; this check binds its original producer and service/job scope. */
export async function admitServiceArtifact(
  service,
  directory,
  id,
  expected,
  gh = (args) => native("gh", args),
  {
    artifactName = `${service}-operation-${expected.attempt}`,
    jobName = service,
    checkpoints = [],
  } = {},
) {
  await authenticateArtifact(
    id,
    { ...expected, name: artifactName, job: jobName },
    {
      api: (path) =>
        JSON.parse(gh(["api", `repos/${expected.repository}/${path}`])),
      checkpoints,
      directory,
    },
  );
  return verifyServiceResult(
    service,
    releaseBytes(join(directory, `${service}-result.json`), 2 * 1024 * 1024),
    releaseBytes(join(directory, "effects.jsonl"), 16 * 1024 * 1024),
    expected,
  );
}
