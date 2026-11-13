// SPDX-License-Identifier: AGPL-3.0-only
/** Durable provider-specific effects. Unknown requests require reconciliation, never replay. */
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash, releaseBytes } from "./release-bytes.js";
import { releasePackages } from "./release-coordinates.js";

/** Context is frozen before startup; append and flush intent before entering native provider code. */
export function createEffectJournal(directory, context) {
  assert.equal(context.repository, "Hadden-Industries/markdown-quality");
  for (const name of ["controller", "source"])
    assert.match(context[name], /^[a-f0-9]{40}$/u);
  for (const name of ["manifestSha256", "decisionSha256"])
    assert.match(context[name], /^[a-f0-9]{64}$/u);
  for (const name of ["run", "attempt"])
    assert.match(String(context[name]), /^[1-9]\d{0,15}$/u);
  assert.ok(context.operationId && context.workflow && context.job);
  mkdirSync(directory);
  const path = join(directory, "effects.jsonl");
  const append = (value) =>
    appendFileSync(path, JSON.stringify(value) + "\n", { flush: true });
  writeFileSync(
    path,
    JSON.stringify({ schemaVersion: 2, state: "startup", context }) + "\n",
    { flag: "wx", flush: true },
  );
  let sequence = 0;
  return {
    path,
    read(provider, subject, request) {
      assert.ok(["npm", "github"].includes(provider));
      const result = request();
      append({
        state: "read",
        provider,
        subject,
        resultSha256: hash(Buffer.from(JSON.stringify(result) ?? "null")),
      });
      return result;
    },
    write(effect, request) {
      assert.ok(["npm", "github"].includes(effect.provider));
      if (effect.provider === "npm")
        assert.ok(releasePackages.includes(effect.subject));
      assert.ok(
        Object.hasOwn(effect, "prior") &&
          Object.hasOwn(effect, "target") &&
          effect.operation &&
          effect.step,
      );
      const intent = {
        ...effect,
        schemaVersion: 2,
        state: "intent",
        sequence: ++sequence,
        context,
      };
      const intentBytes = Buffer.from(JSON.stringify(intent) + "\n");
      append(intent);
      try {
        const result = request();
        append({
          state: "acknowledged",
          sequence,
          intentSha256: hash(intentBytes),
          resultSha256: hash(Buffer.from(JSON.stringify(result) ?? "null")),
        });
        return result;
      } catch (error) {
        append({
          state: "outcome-unknown",
          sequence,
          intentSha256: hash(intentBytes),
        });
        throw error;
      }
    },
    seal(service, result) {
      const bytes = releaseBytes(path, 16 * 1024 * 1024);
      assert.ok(
        verifyEffectJournal(bytes, context).every(
          (effect) => effect.outcome === "acknowledged",
        ),
        "Cannot seal unresolved effects",
      );
      const record = {
        ...result,
        schemaVersion: 1,
        state: `${service}-acknowledged`,
        context,
        journalSha256: hash(bytes),
      };
      writeFileSync(
        join(directory, `${service}-result.json`),
        JSON.stringify(record, null, 2) + "\n",
        { flag: "wx", flush: true },
      );
      return record;
    },
  };
}

/** Authenticate exact original bytes; a provider value alone is never an operation receipt. */
export function verifyEffectJournal(bytes, context) {
  assert.ok(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024);
  assert.equal(bytes.at(-1), 10, "Incomplete effect journal");
  const lines = bytes.toString("utf8").slice(0, -1).split("\n");
  const records = lines.map((line) => JSON.parse(line));
  assert.equal(records[0].schemaVersion, 2);
  assert.equal(records[0].state, "startup");
  assert.deepEqual(records[0].context, context);
  const intents = new Map(),
    outcomes = new Map();
  for (let index = 1; index < records.length; index++) {
    const record = records[index];
    if (record.state === "read") continue;
    if (record.state === "intent") {
      assert.equal(record.schemaVersion, 2);
      assert.ok(["npm", "github"].includes(record.provider));
      if (record.provider === "npm")
        assert.ok(releasePackages.includes(record.subject));
      assert.ok(
        record.operation &&
          record.step &&
          Object.hasOwn(record, "prior") &&
          Object.hasOwn(record, "target"),
      );
      assert.deepEqual(record.context, context);
      assert.equal(record.sequence, intents.size + 1);
      assert.ok(!intents.has(record.sequence));
      intents.set(record.sequence, {
        record,
        sha256: hash(Buffer.from(lines[index] + "\n")),
      });
    } else {
      assert.ok(["acknowledged", "outcome-unknown"].includes(record.state));
      assert.ok(intents.has(record.sequence) && !outcomes.has(record.sequence));
      assert.equal(record.intentSha256, intents.get(record.sequence).sha256);
      outcomes.set(record.sequence, record);
    }
  }
  return [...intents.values()].map(({ record }) => ({
    ...record,
    outcome: outcomes.get(record.sequence)?.state ?? "outcome-unknown",
  }));
}

/** A settlement binds the unknown original intent and independently retained provider observation. */
export function verifyEffectSettlement(settlement, journal, context) {
  assert.equal(settlement.schemaVersion, 1);
  assert.equal(settlement.owner, "maksymshostak");
  assert.equal(settlement.operationId, context.operationId);
  assert.equal(settlement.journalSha256, hash(journal));
  const effects = verifyEffectJournal(journal, context);
  const effect = effects.find(
    (value) => value.sequence === settlement.sequence,
  );
  assert.ok(effect && effect.outcome === "outcome-unknown");
  assert.ok(
    ["applied", "not-applied", "cancelled-before-request"].includes(
      settlement.disposition,
    ),
  );
  assert.ok(settlement.rationale?.trim().length >= 20);
  assert.ok(settlement.providerEvidence?.length > 0);
  for (const entry of settlement.providerEvidence) {
    assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(new URL(entry.url).protocol, "https:");
  }
  return effect;
}

/** Only an independent native read-only reconciliation supports an explicit applied disposition. */
export function verifySettlementObservation(
  settlement,
  effect,
  context,
  observation,
  producer,
) {
  assert.equal(
    settlement.disposition,
    "applied",
    "A prior value or public absence cannot prove that an unknown request was not applied",
  );
  assert.equal(producer.run.path, ".github/workflows/promote-release.yml");
  assert.equal(producer.run.event, "workflow_dispatch");
  assert.equal(producer.run.head_branch, "main");
  assert.equal(producer.job.name, "reconcile");
  assert.equal(producer.job.status, "completed");
  assert.equal(producer.job.conclusion, "success");
  assert.equal(observation.schemaVersion, 1);
  assert.equal(observation.kind, "release-effect-observation");
  assert.equal(observation.readerController, producer.run.head_sha);
  assert.deepEqual(observation.originalContext, context);
  assert.equal(observation.journalSha256, settlement.journalSha256);
  assert.equal(observation.sequence, effect.sequence);
  assert.ok(
    Number.isFinite(Date.parse(observation.observedAt)) &&
      Date.parse(observation.observedAt) <= Date.now(),
  );
  for (const name of [
    "provider",
    "operation",
    "subject",
    "prior",
    "target",
    "step",
    "integrity",
  ])
    assert.deepEqual(
      observation.effect[name],
      effect[name],
      "Settlement observation belongs to another effect",
    );
  assert.equal(observation.observedState, "target-visible");
  if (effect.provider === "npm")
    assert.equal(observation.observation.npm[effect.subject], effect.target);
  else {
    assert.equal(observation.observation.github.release.id, effect.subject);
    assert.equal(
      observation.observation.github.release.prerelease,
      effect.target.prerelease,
    );
    assert.equal(
      observation.observation.github.latest?.id ?? null,
      effect.target.latest,
    );
  }
}

/** Independently verified draft/immutable state may settle only the exact matching archive effect. */
export function archiveEffectObserved(effect, context, proof) {
  if (
    !proof ||
    effect.provider !== "github" ||
    context.workflow !== ".github/workflows/github-release.yml"
  )
    return false;
  const tag = `v${proof.qualified.version}`,
    release = proof.archive;
  if (
    context.source !== proof.qualified.source ||
    context.manifestSha256 !== proof.qualified.manifestSha256 ||
    effect.subject !== tag ||
    effect.releaseId !== release.id ||
    effect.target?.[0] !== tag ||
    release?.tag_name !== tag ||
    !Number.isSafeInteger(release.id)
  )
    return false;
  if (effect.operation === "create") return true;
  if (effect.operation === "upload") {
    const name = effect.target[1]?.split(/[\\/]/u).at(-1);
    const expected = proof.expectedAssets.find((asset) => asset.name === name);
    return (
      !!expected &&
      release.assets.some(
        (asset) =>
          asset.name === name &&
          asset.size === expected.size &&
          asset.digest === (expected.digest ?? `sha256:${expected.sha256}`),
      )
    );
  }
  if (effect.operation !== "edit" || !release.immutable || release.draft)
    return false;
  if (effect.target.includes("--draft=false")) return true;
  return (
    effect.target.includes("--prerelease=false") &&
    effect.target.includes("--latest") &&
    release.prerelease === false &&
    proof.latestId === release.id
  );
}
