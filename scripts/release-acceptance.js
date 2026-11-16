// SPDX-License-Identifier: AGPL-3.0-only
/** Admit explicit owner decisions about the exact release; never infer them from passing CI. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash, releaseBytes } from "./release-bytes.js";
import { native } from "./commands.js";
import {
  releaseChannel,
  releasePackages,
  releaseVersion,
} from "./release-coordinates.js";

/** Only the protected GitHub role can observe draft decisions. */
export function readDraftDecisions(
  release,
  manifestSha,
  decisions,
  {
    repository,
    gh = (args) => native("gh", args),
    allowImmutableRelease = false,
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
  assert.equal(draft.tagName, `v${release.version}`);
  if (draft.isDraft !== true) {
    assert.equal(allowImmutableRelease, true, "Staging requires a live draft");
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
    assert.equal(published.prerelease, draft.isPrerelease);
  }
  const scratch = mkdtempSync(join(tmpdir(), "markdown-quality-decisions-"));
  try {
    const records = new Map(
      decisions.map(({ name, digest, phase }) => {
        assert.equal(
          name,
          phase === "review"
            ? "release-review.json"
            : "release-acceptance.json",
        );
        assert.ok(["review", "pilot", "acceptance"].includes(phase));
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
        const decision = verifyReleaseAcceptance(
          bytes,
          digest,
          release,
          manifestSha,
          phase,
        );
        if (draft.isDraft)
          assert.equal(
            decision.schemaVersion,
            1,
            "Mutable drafts are only authorized for historical schema-1 decisions",
          );
        return [name, bytes];
      }),
    );
    if (!draft.isPrerelease) {
      const review = JSON.parse(records.get("release-review.json"));
      const acceptance = JSON.parse(records.get("release-acceptance.json"));
      assert.equal(draft.isDraft, false);
      assert.equal(review.schemaVersion, 2);
      assert.equal(acceptance.schemaVersion, 2);
      assert.equal(review.channel, "latest");
      assert.equal(acceptance.channel, "latest");
      releaseVersion(release.version, { stable: true });
    }
    return records;
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
  assert.ok(
    [1, 2].includes(record.schemaVersion),
    "Unsupported owner decision format",
  );
  assert.equal(
    record.phase,
    record.schemaVersion === 1 && phase === "acceptance" ? "pilot" : phase,
  );
  assert.equal(record.version, release.version);
  assert.equal(record.source, release.source.head);
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.owner, "maksymshostak");
  assert.ok(Number.isFinite(Date.parse(record.acceptedAt)));
  const current = record.schemaVersion === 2;
  assert.ok(
    (current
      ? ["review", "acceptance"]
      : ["review", "pilot", "acceptance"]
    ).includes(phase),
  );
  if (current) {
    releaseVersion(record.version);
    assert.equal(record.repository, "Hadden-Industries/markdown-quality");
    assert.match(record.operationId, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
    assert.match(record.controller, /^[a-f0-9]{40}$/u);
    assert.match(record.controllerDeltaSha256, /^[a-f0-9]{64}$/u);
    for (const value of [record.candidate?.run, record.candidate?.attempt])
      assert.match(String(value), /^[1-9]\d{0,15}$/u);
    releaseChannel(record.channel);
    for (const key of ["selectedLabels", "defaults"]) {
      assert.deepEqual(
        Object.keys(record.guards[key]).sort(),
        [...releasePackages].sort(),
      );
      for (const value of Object.values(record.guards[key]))
        if (value !== null) releaseVersion(value);
    }
    assert.ok(
      record.guards.githubLatest === null ||
        (Number.isSafeInteger(record.guards.githubLatest) &&
          record.guards.githubLatest > 0),
    );
  }
  const names =
    phase === "review" ? reviewDecisions : current ? [] : pilotDecisions;
  assert.deepEqual(
    Object.keys(record.decisions ?? {}).sort(),
    [...names].sort(),
  );
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
    if (!current)
      for (const name of ["owlapi", "webvowl"])
        assert.equal(record.decisions[name].subject, "exact public npm pilot");
    else {
      // Reject the common nested-field mistake during read-only admission.
      // The archival writer checks the bound contents and live freshness later,
      // including separately approved preflight refreshes of older acceptances.
      assert.ok(
        record.immutabilityObservation &&
          typeof record.immutabilityObservation === "object" &&
          !Array.isArray(record.immutabilityObservation),
        "Acceptance requires a top-level immutabilityObservation",
      );
      // Live adoption and timed rehearsal are optional. A real trial still binds
      // its exact public tuple; an omitted/declined trial cannot fabricate sign-off.
      assert.ok(
        Object.keys(record.trials ?? {}).every((name) =>
          pilotDecisions.includes(name),
        ),
      );
      for (const trial of Object.values(record.trials ?? {})) {
        assert.ok(["accepted", "skipped"].includes(trial.outcome));
        if (trial.outcome === "skipped") assert.ok(trial.reason?.trim());
        else {
          assert.equal(trial.version, release.version);
          assert.equal(trial.manifestSha256, manifestSha);
          assert.ok(Array.isArray(trial.evidence) && trial.evidence.length > 0);
          for (const evidence of trial.evidence)
            assert.match(evidence.sha256, /^[a-f0-9]{64}$/u);
        }
      }
    }
  }
  return record;
}
