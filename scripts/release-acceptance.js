// SPDX-License-Identifier: AGPL-3.0-only
/** Admit explicit owner decisions about the exact release; never infer them from passing CI. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash, releaseBytes } from "./release-bytes.js";
import { native } from "./commands.js";

/** Only the protected GitHub role can observe draft decisions. */
export function readDraftDecisions(
  release,
  manifestSha,
  decisions,
  {
    repository,
    gh = (args) => native("gh", args),
    allowImmutablePrerelease = false,
  },
) {
  assert.equal(repository, "Hadden-Industries/markdown-quality");
  const draft = JSON.parse(
    gh([
      "release",
      "view",
      `v${release.version}`,
      "--repo",
      repository,
      "--json",
      "isDraft,isPrerelease,tagName",
    ]),
  );
  assert.equal(draft.isPrerelease, true);
  assert.equal(draft.tagName, `v${release.version}`);
  if (draft.isDraft !== true) {
    assert.equal(
      allowImmutablePrerelease,
      true,
      "Staging requires a live draft",
    );
    assert.equal(draft.isDraft, false);
    const published = JSON.parse(
      gh(["api", `repos/${repository}/releases/tags/v${release.version}`]),
    );
    assert.equal(published.tag_name, `v${release.version}`);
    assert.equal(published.draft, false);
    assert.equal(
      published.immutable,
      true,
      "Archival recovery requires the immutable release",
    );
    assert.equal(published.prerelease, true);
  }
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-decisions-"));
  try {
    return new Map(
      decisions.map(({ name, digest, phase }) => {
        assert.equal(
          name,
          phase === "review"
            ? "release-review.json"
            : "release-acceptance.json",
        );
        assert.ok(["review", "pilot"].includes(phase));
        gh([
          "release",
          "download",
          `v${release.version}`,
          "--repo",
          repository,
          "--pattern",
          name,
          "--dir",
          scratch,
        ]);
        const bytes = releaseBytes(join(scratch, name), 16 * 1024 * 1024);
        verifyReleaseAcceptance(bytes, digest, release, manifestSha, phase);
        return [name, bytes];
      }),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

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
