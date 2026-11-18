// SPDX-License-Identifier: AGPL-3.0-only
/** Read public-safe owner dispatch bytes without draft visibility or project dependencies. */
import { repository } from "./release-identity.js";
import assert from "node:assert/strict";
import { hash } from "./release-bytes.js";
import { native } from "./commands.js";
import { verifyReleaseAcceptance } from "./release-acceptance.js";
import { releaseCommit } from "./release-qualification.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Check the complete local request before spending a hosted run on owner decisions. */
export function verifyDispatchPayload(payload) {
  assert.equal(payload.ref, "main");
  assert.ok(
    payload.inputs &&
      typeof payload.inputs === "object" &&
      !Array.isArray(payload.inputs),
  );
  const entries = Object.entries(payload.inputs);
  assert.ok(entries.length > 0 && entries.length <= 25);
  assert.ok(entries.every(([, value]) => typeof value === "string"));
  // GitHub documents 65,535 characters for the whole inputs payload. Using UTF-8
  // bytes, including JSON escaping, is conservative for every supported string.
  const bytes = Buffer.byteLength(JSON.stringify(payload.inputs));
  assert.ok(
    bytes <= 65535,
    "Combined owner inputs exceed the GitHub dispatch envelope",
  );
  return { inputBytes: bytes };
}

/** Leave room for the other inputs in GitHub's 65,535-byte dispatch envelope. */
export function ownerDispatchBytes(env) {
  assert.equal(
    env.GITHUB_ACTOR?.toLowerCase(),
    "maksymshostak",
    "Only the authenticated owner may dispatch release decisions",
  );
  assert.equal(
    (env.GITHUB_TRIGGERING_ACTOR ?? env.GITHUB_ACTOR)?.toLowerCase(),
    "maksymshostak",
    "Only the owner may rerun a release decision",
  );
  assert.equal(typeof env.REVIEW_JSON, "string");
  const bytes = Buffer.from(env.REVIEW_JSON, "utf8");
  assert.ok(
    bytes.length > 0 && bytes.length <= 48 * 1024,
    "Owner decision exceeds dispatch transport",
  );
  assert.match(env.REVIEW_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(hash(bytes), env.REVIEW_SHA, "Owner dispatch bytes changed");
  return bytes;
}

/** Refresh only live provider observations while preserving the frozen qualification decisions. */
export function archivePreflight(env, qualified, acceptance) {
  if (!env.PREFLIGHT_JSON) return acceptance;
  const bytes = ownerDispatchBytes({
    ...env,
    REVIEW_JSON: env.PREFLIGHT_JSON,
    REVIEW_SHA: env.PREFLIGHT_SHA,
  });
  const record = JSON.parse(bytes);
  for (const [name, expected] of Object.entries({
    schemaVersion: 1,
    repository,
    owner: "maksymshostak",
    version: qualified.version,
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
    reviewSha256: qualified.evidence["release-review.json"],
    acceptanceSha256: qualified.evidence["release-acceptance.json"],
  }))
    assert.equal(record[name], expected);
  assert.deepEqual(
    Object.keys(record).sort(),
    [
      "schemaVersion",
      "repository",
      "owner",
      "version",
      "source",
      "manifestSha256",
      "reviewSha256",
      "acceptanceSha256",
      "stageInventory",
      "immutabilityObservation",
    ].sort(),
  );
  return {
    ...acceptance,
    stageInventory: record.stageInventory,
    immutabilityObservation: record.immutabilityObservation,
    preflightBytes: bytes,
  };
}

/** Bind source, producing attempt and controller delta before a job receives staging authority. */
export function admitOwnerDispatch(
  env,
  release,
  manifestSha,
  candidate,
  command = native,
) {
  const bytes = ownerDispatchBytes(env);
  const decision = verifyReleaseAcceptance(
    bytes,
    env.REVIEW_SHA,
    release,
    manifestSha,
    "review",
  );
  assert.equal(
    decision.schemaVersion,
    2,
    "New staging requires the current owner decision",
  );
  assert.equal(decision.controller, env.GITHUB_SHA);
  assert.equal(String(decision.candidate.run), String(candidate.id));
  assert.equal(
    String(decision.candidate.attempt),
    String(candidate.run_attempt),
  );
  const delta = command(
    "git",
    [
      "diff",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      releaseCommit(release),
      env.GITHUB_SHA,
    ],
    { encoding: null },
  );
  assert.equal(
    hash(delta),
    decision.controllerDeltaSha256,
    "Source-to-controller delta was not approved",
  );
  // Staging uses the signed candidate identity. Any private draft is independently
  // admitted by the archival writer, which alone has genuine draft visibility.
  assert.ok(
    decision.draftId === undefined || decision.draftId === null,
    "A draft-dependent stage requires the protected draft reader",
  );
  return { bytes, decision };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    3,
    "Usage: release-decision-transport.js DISPATCH_JSON",
  );
  console.log(
    JSON.stringify(
      verifyDispatchPayload(JSON.parse(readFileSync(process.argv[2], "utf8"))),
    ),
  );
}
