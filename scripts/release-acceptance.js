// SPDX-License-Identifier: AGPL-3.0-only
/** Admit explicit owner decisions about the exact release; never infer them from passing CI. */
import assert from "node:assert/strict";
import { hash } from "./release-bytes.js";

export const reviewDecisions = [
  "semver",
  "security",
  "nativeRights",
  "retention",
];
export const pilotDecisions = ["owlapi", "webvowl", "restoration"];

export function verifyReleaseAcceptance(
  bytes,
  digest,
  release,
  manifestSha,
  phase,
) {
  assert.match(digest, /^[a-f0-9]{64}$/u);
  assert.equal(
    hash(bytes),
    digest,
    "Owner decision digest differs from the explicit dispatch input",
  );
  const record = JSON.parse(bytes);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.phase, phase);
  assert.equal(record.version, release.version);
  assert.equal(record.source, release.source.head);
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.owner, "maksymshostak");
  assert.ok(Number.isFinite(Date.parse(record.acceptedAt)));
  const names = phase === "review" ? reviewDecisions : pilotDecisions;
  assert.ok(["review", "pilot"].includes(phase));
  assert.deepEqual(Object.keys(record.decisions).sort(), [...names].sort());
  for (const name of names) {
    const decision = record.decisions[name];
    assert.equal(decision.outcome, "accepted", `${name} is not accepted`);
    assert.ok(
      typeof decision.rationale === "string" &&
        decision.rationale.trim().length >= 20,
      `${name} requires a meaningful rationale`,
    );
    assert.ok(
      typeof decision.reviewer === "string" && decision.reviewer.trim(),
    );
    assert.ok(
      Array.isArray(decision.evidence) && decision.evidence.length > 0,
      `${name} has no evidence`,
    );
    for (const evidence of decision.evidence) {
      assert.match(evidence.sha256, /^[a-f0-9]{64}$/u);
      const url = new URL(evidence.url);
      assert.equal(url.protocol, "https:");
      assert.ok(!url.username && !url.password);
    }
  }
  if (phase === "review") {
    assert.equal(
      record.decisions.security.independent,
      true,
      "Independent security review is required",
    );
    assert.equal(
      record.decisions.nativeRights.independent,
      true,
      "Native contents/rights review is required",
    );
  } else {
    assert.match(record.reviewSha256, /^[a-f0-9]{64}$/u);
    assert.match(String(record.publicQualificationRun), /^[1-9]\d{0,15}$/u);
    assert.match(String(record.publicQualificationAttempt), /^[1-9]\d{0,15}$/u);
    for (const name of ["owlapi", "webvowl"])
      assert.equal(record.decisions[name].subject, "exact public npm pilot");
  }
  return record;
}
