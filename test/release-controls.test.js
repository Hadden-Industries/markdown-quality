// SPDX-License-Identifier: AGPL-3.0-only
/** Release decisions and stage requests use the owner's exact channel and coordinates. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { stageReleaseArchive } from "../scripts/stage-release-package.js";
import {
  verifyReleaseAcceptance,
  reviewDecisions,
} from "../scripts/release-acceptance.js";
import { hash } from "../scripts/release-bytes.js";
import { governance } from "../scripts/github-governance.js";
import {
  verifyNoPendingStages,
  readStageInventory,
} from "../scripts/release-stage-guards.js";
import { stageInventory } from "./release-fixture.js";
import { archivePreflight } from "../scripts/release-decision-transport.js";

const packages = ["win32-x64", "linux-x64", "core"].map(
  (name) =>
    `@hadden-industries/markdown-quality${name === "core" ? "" : `-${name}`}`,
);

test("fresh owner stage inventories block old-version pending requests and intervening publications", () => {
  const fresh = stageInventory();
  verifyNoPendingStages(fresh);
  const pending = structuredClone(fresh),
    bytes = JSON.stringify([
      {
        id: "old",
        packageName: packages[0],
        version: "2.0.0",
        tag: "latest",
        status: "pending",
      },
    ]);
  pending.packages[packages[0]] = {
    responseBytes: bytes,
    sha256: hash(Buffer.from(bytes)),
  };
  assert.equal(readStageInventory(pending)[packages[0]][0].id, "old");
  assert.throws(() => verifyNoPendingStages(pending), /Another npm stage/u);
  assert.throws(
    () =>
      verifyNoPendingStages(fresh, {
        latestStageWriteAt: new Date(Date.now() + 1000).toISOString(),
      }),
    /last publication/u,
  );
  assert.throws(
    () =>
      verifyNoPendingStages({
        ...fresh,
        checkedAt: new Date(Date.now() - 3600001).toISOString(),
      }),
    /fresh/u,
  );
  assert.throws(() => verifyNoPendingStages({ ...fresh, command: "invented" }));
  assert.throws(
    () =>
      verifyNoPendingStages(fresh, {
        history: [
          {
            run: {
              path: ".github/workflows/publish.yml",
              id: 30,
              updated_at: new Date(Date.now() + 1000).toISOString(),
            },
            job: {},
          },
        ],
      }),
    /Another publication/u,
  );
});

test("fresh archive observations retain the original decision digests and exact owner bytes", () => {
  const qualified = {
    version: "4.0.0",
    source: "a".repeat(40),
    manifestSha256: "b".repeat(64),
    evidence: {
      "release-review.json": "c".repeat(64),
      "release-acceptance.json": "d".repeat(64),
    },
  };
  const record = {
    schemaVersion: 1,
    repository: "Hadden-Industries/markdown-quality",
    owner: "maksymshostak",
    version: qualified.version,
    source: qualified.source,
    manifestSha256: qualified.manifestSha256,
    reviewSha256: qualified.evidence["release-review.json"],
    acceptanceSha256: qualified.evidence["release-acceptance.json"],
    stageInventory: stageInventory(),
    immutabilityObservation: { fresh: true },
  };
  // json-identity-contract: bytes; owner: archive-preflight dispatch; reason: Preserve the exact owner wire bytes for the independently supplied digest.
  const raw = JSON.stringify(record),
    env = {
      GITHUB_ACTOR: "maksymshostak",
      PREFLIGHT_JSON: raw,
      PREFLIGHT_SHA: hash(Buffer.from(raw)),
    };
  assert.equal(
    archivePreflight(env, qualified, { original: true }).original,
    true,
  );
  assert.equal(
    archivePreflight(env, qualified, {}).preflightBytes.toString(),
    raw,
  );
  assert.throws(() =>
    archivePreflight({ ...env, GITHUB_ACTOR: "stranger" }, qualified, {}),
  );
  assert.throws(() =>
    archivePreflight(env, { ...qualified, version: "4.0.1" }, {}),
  );
});

for (const version of ["4.0.0", "4.0.0-rc.1"])
  for (const channel of [undefined, "latest"])
    test(`native stage preserves ${version} and ${channel ?? "default pilot"}`, (t) => {
      const directory = mkdtempSync(join(tmpdir(), "release-channel-"));
      t.after(() => rmSync(directory, { recursive: true, force: true }));
      const bytes = Buffer.from("independently frozen native archive");
      const path = join(directory, `native-${version}.tgz`);
      writeFileSync(path, bytes);
      const archive = {
        name: "win32-x64",
        package: packages[0],
        version,
        sha256: hash(bytes),
        integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      };
      const calls = [];
      const result = stageReleaseArchive({
        archive,
        path,
        channel,
        journalDirectory: join(directory, "journal"),
        origin: { source: "a".repeat(40), run: "12", attempt: "1" },
        command(args) {
          calls.push(args);
          return JSON.stringify({
            [archive.package]: {
              ...archive,
              name: archive.package,
              stageId: "original-stage",
            },
          });
        },
      });
      assert.equal(calls.length, 1);
      assert.ok(calls[0].includes(`--tag=${channel ?? "pilot"}`));
      assert.equal(result.tag, channel ?? "pilot");
      const journal = readFileSync(
        join(directory, "journal/win32-x64.jsonl"),
        "utf8",
      );
      assert.equal(JSON.parse(journal.split("\n")[0]).tag, channel ?? "pilot");
    });

test("new acceptance permits omitted trials while retaining exact qualification and independent review", () => {
  const release = { version: "4.0.0-rc.1", source: { head: "a".repeat(40) } };
  const common = {
    schemaVersion: 2,
    repository: "Hadden-Industries/markdown-quality",
    operationId: "release-4.0.0-rc.1",
    owner: "maksymshostak",
    version: release.version,
    source: release.source.head,
    controller: "b".repeat(40),
    controllerDeltaSha256: "c".repeat(64),
    candidate: { run: "12", attempt: "1" },
    manifestSha256: "d".repeat(64),
    acceptedAt: "2026-11-13T00:00:00Z",
    channel: "latest",
    guards: {
      selectedLabels: Object.fromEntries(
        packages.map((name) => [name, "3.0.1"]),
      ),
      defaults: Object.fromEntries(packages.map((name) => [name, "3.0.1"])),
      githubLatest: 438708271,
    },
  };
  const review = {
    ...common,
    phase: "review",
    decisions: Object.fromEntries(
      reviewDecisions.map((name) => [
        name,
        {
          outcome: "accepted",
          independent: true,
          reviewer: "independent fixture reviewer",
          rationale:
            "Accepted exact source evidence under the declared release contract.",
          evidence: [
            {
              url: "https://example.test/exact-evidence",
              sha256: "e".repeat(64),
            },
          ],
        },
      ]),
    ),
  };
  const reviewBytes = Buffer.from(JSON.stringify(review));
  verifyReleaseAcceptance(
    reviewBytes,
    hash(reviewBytes),
    release,
    common.manifestSha256,
    "review",
  );
  const acceptance = {
    ...common,
    phase: "acceptance",
    reviewSha256: hash(reviewBytes),
    publicQualificationRun: "13",
    publicQualificationAttempt: "2",
  };
  const check = (record, phase = "acceptance") => {
    const bytes = Buffer.from(JSON.stringify(record));
    return verifyReleaseAcceptance(
      bytes,
      hash(bytes),
      release,
      common.manifestSha256,
      phase,
    );
  };
  assert.equal(check(acceptance).channel, "latest");
  assert.equal(
    check({
      ...acceptance,
      trials: {
        owlapi: {
          outcome: "skipped",
          reason: "Maintainer did not elect a live trial.",
        },
      },
    }).channel,
    "latest",
  );
  const rejected = structuredClone(review);
  rejected.decisions.security.independent = false;
  assert.throws(() => check(rejected, "review"), /independent/iu);
});

test("tag creation authority cannot bypass separately managed tag update and deletion rules", () => {
  assert.equal(governance.tagRulesets.length, 2);
  const creation = governance.tagRulesets.find((rule) =>
    rule.rules.some((item) => item.type === "creation"),
  );
  const immutable = governance.tagRulesets.find((rule) =>
    rule.rules.some((item) => item.type === "update"),
  );
  assert.deepEqual(creation.bypass_actors, [
    { actor_id: 6131830, actor_type: "User", bypass_mode: "always" },
  ]);
  assert.deepEqual(immutable.bypass_actors, []);
  assert.deepEqual(immutable.rules.map((rule) => rule.type).sort(), [
    "deletion",
    "update",
  ]);
  for (const rule of governance.tagRulesets) {
    assert.equal(rule.target, "tag");
    assert.deepEqual(rule.conditions.ref_name.include, [
      "refs/tags/v*",
      "refs/tags/release-history-*",
    ]);
  }
});
