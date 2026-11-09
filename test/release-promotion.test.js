// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  promoteNpmLabels,
  readNpmLabels,
  verifyPromotionLabels,
  verifyStableCompletion,
} from "../scripts/promote-release.js";
import { verifyReleaseAcceptance } from "../scripts/release-acceptance.js";
import { hash } from "../scripts/release-bytes.js";

const packages = [
  "@hadden-industries/markdown-quality-win32-x64",
  "@hadden-industries/markdown-quality-linux-x64",
  "@hadden-industries/markdown-quality",
];
const initial = () =>
  Object.fromEntries(packages.map((name) => [name, "1.0.3"]));

test("npm label readback accepts the pinned CLI's single-result array", () => {
  const readPackages = [];
  const labels = readNpmLabels(undefined, (args) => {
    readPackages.push(args[1]);
    assert.deepEqual(args, [
      "view",
      args[1],
      "dist-tags",
      "--json",
      "--prefer-online",
      "--registry=https://registry.npmjs.org/",
    ]);
    return JSON.stringify([{ latest: "1.0.3", pilot: "3.0.0" }]);
  });
  assert.deepEqual(readPackages, packages);
  assert.deepEqual(labels, initial());
});

test("stable labels advance natives first, core last, and a resumed partial promotion does not replay completed effects", async () => {
  const labels = initial(),
    calls = [],
    records = [];
  const command = (args) => {
    calls.push(args);
    const name = args[2].slice(0, args[2].lastIndexOf("@"));
    labels[name] = "2.0.0";
    if (name === packages[1] && calls.length === 2)
      throw new Error("Response lost after registry accepted the label");
  };
  const options = {
    version: "2.0.0",
    previous: "1.0.3",
    readLabels: async () => ({ ...labels }),
    command,
    record: (event) => records.push(event),
  };
  await assert.rejects(promoteNpmLabels(options), /Response lost/u);
  assert.equal(labels[packages[2]], "1.0.3");
  assert.equal(records.at(-1).state, "outcome-unknown");
  assert.deepEqual(
    await promoteNpmLabels(options),
    Object.fromEntries(packages.map((name) => [name, "2.0.0"])),
  );
  assert.deepEqual(
    calls.map((args) => args[2]),
    packages.map((name) => `${name}@2.0.0`),
  );
  assert.ok(
    calls.every(
      (args) =>
        args[0] === "dist-tag" && args[1] === "add" && args[3] === "latest",
    ),
  );
});

test("an unexpected concurrent latest blocks before another package label is changed", async () => {
  const labels = initial();
  let effects = 0,
    reads = 0;
  await assert.rejects(
    promoteNpmLabels({
      version: "2.0.0",
      previous: "1.0.3",
      readLabels: async () => {
        if (++reads === 2) labels[packages[1]] = "3.0.0";
        return { ...labels };
      },
      command: () => effects++,
    }),
    /Unexpected latest/u,
  );
  assert.equal(effects, 0);
  assert.throws(
    () => verifyPromotionLabels(initial(), "1.0.2", "1.0.3"),
    /advance/u,
  );
});

test("promotion waits for stale native labels before advancing the next package", async () => {
  const labels = initial();
  const writes = [];
  const waits = [];
  const laggingReads = [];
  let elapsed = 0;
  const completed = await promoteNpmLabels({
    version: "2.0.0",
    previous: "1.0.3",
    readLabels: () => {
      const observed = { ...labels };
      const stale = laggingReads.shift();
      if (stale) observed[stale] = "1.0.3";
      return observed;
    },
    command: (args) => {
      const name = args[2].slice(0, args[2].lastIndexOf("@"));
      assert.equal(laggingReads.length, 0);
      writes.push(name);
      labels[name] = "2.0.0";
      // One replica lags after the write and another lags at the next guard.
      laggingReads.push(name, undefined, name);
    },
    now: () => elapsed,
    sleep: (ms) => {
      waits.push(ms);
      elapsed += ms;
    },
  });
  assert.deepEqual(writes, packages);
  assert.equal(waits.length, packages.length * 2);
  assert.deepEqual(completed, labels);
});

test("an unresolved native readback stops the package sequence after one write", async () => {
  const labels = initial();
  const writes = [];
  const records = [];
  const observations = [];
  let elapsed = 0;
  await assert.rejects(
    promoteNpmLabels({
      version: "2.0.0",
      previous: "1.0.3",
      readLabels: (deadline) => {
        if (writes.length) {
          assert.equal(deadline, 300_000);
          assert.ok(elapsed < deadline);
          observations.push(elapsed);
          elapsed += Math.min(2_000, deadline - elapsed);
        }
        return { ...labels };
      },
      command: (args) => writes.push(args[2]),
      record: (event) => records.push(event.state),
      now: () => elapsed,
      sleep: (ms) => {
        elapsed += ms;
        assert.ok(elapsed <= 300_000);
      },
    }),
    /Tag update outcome unresolved/u,
  );
  assert.equal(elapsed, 300_000);
  assert.ok(observations.at(-1) > 270_000);
  assert.deepEqual(writes, [`${packages[0]}@2.0.0`]);
  assert.deepEqual(records, ["attempted", "outcome-unknown"]);
});

test("whole-release completion requires every npm label and the same immutable stable GitHub latest", () => {
  const labels = Object.fromEntries(packages.map((name) => [name, "2.0.0"]));
  const release = {
    id: 17,
    tag_name: "v2.0.0",
    draft: false,
    immutable: true,
    prerelease: false,
  };
  verifyStableCompletion(labels, release, { id: 17 }, { version: "2.0.0" });
  for (const defect of ["npm", "draft", "immutable", "prerelease", "latest"]) {
    const changed = { ...release },
      tags = { ...labels },
      latest = { id: 17 };
    if (defect === "npm") tags[packages[2]] = "1.0.3";
    else if (defect === "latest") latest.id = 18;
    else changed[defect] = !changed[defect];
    assert.throws(() =>
      verifyStableCompletion(tags, changed, latest, { version: "2.0.0" }),
    );
  }
});

test("release decisions cannot be borrowed from another subject or reduced to unchecked booleans", () => {
  const source = "a".repeat(40),
    manifest = "b".repeat(64);
  const record = {
    schemaVersion: 1,
    phase: "review",
    version: "2.0.0",
    source,
    manifestSha256: manifest,
    owner: "maksymshostak",
    acceptedAt: "2026-10-16T00:00:00Z",
    decisions: Object.fromEntries(
      ["semver", "security", "nativeRights", "retention"].map((name) => [
        name,
        {
          outcome: "accepted",
          reviewer: "independent reviewer",
          independent: true,
          rationale: "Bounded review of the exact immutable release subject.",
          evidence: [
            {
              url: "https://example.org/retained-review",
              sha256: "c".repeat(64),
            },
          ],
        },
      ]),
    ),
  };
  const release = { version: "2.0.0", source: { head: source } };
  const verify = (value, subject = release) => {
    const bytes = Buffer.from(JSON.stringify(value));
    return verifyReleaseAcceptance(
      bytes,
      hash(bytes),
      subject,
      manifest,
      "review",
    );
  };
  verify(record);
  assert.throws(() =>
    verify(record, { ...release, source: { head: "d".repeat(40) } }),
  );
  record.decisions.security.evidence = [];
  assert.throws(() => verify(record), /evidence/u);
  record.decisions.security = true;
  assert.throws(() => verify(record));
});
