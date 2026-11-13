// SPDX-License-Identifier: AGPL-3.0-only
/** Recheck approved provider preimages immediately before one native staging request. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { native, npmCommand } from "./commands.js";
import { releaseBytes, hash } from "./release-bytes.js";
import { releaseChannel, releasePackages } from "./release-coordinates.js";
import { readPackageTags } from "./release-labels.js";

/** The sole owner captures private native npm state; OIDC publishing grants no account-token fallback. */
export function readStageInventory(
  captured,
  { history = [], currentRun, latestStageWriteAt } = {},
) {
  const checkedAt = Date.parse(captured?.checkedAt);
  assert.ok(
    Number.isFinite(checkedAt) &&
      checkedAt <= Date.now() &&
      Date.now() - checkedAt <= 3600000,
    "Capture a fresh owner-authenticated npm stage inventory before dispatch",
  );
  assert.equal(
    captured.command,
    "npm stage list --json --registry=https://registry.npmjs.org/",
  );
  if (latestStageWriteAt)
    assert.ok(
      Date.parse(latestStageWriteAt) <= checkedAt,
      "Refresh the stage observation after the last publication",
    );
  for (const entry of history)
    if (
      entry.run.path === ".github/workflows/publish.yml" &&
      String(entry.run.id) !== String(currentRun) &&
      (entry.jobs?.jobs.length || entry.job)
    )
      assert.ok(
        Date.parse(entry.run.updated_at) <= checkedAt,
        "Another publication changed after the owner inspected pending stages; refresh the decision",
      );
  assert.deepEqual(
    Object.keys(captured.packages).sort(),
    [...releasePackages].sort(),
  );
  const inventory = {},
    ids = new Set();
  for (const name of releasePackages) {
    const observation = captured.packages[name],
      bytes = Buffer.from(observation.responseBytes);
    assert.ok(bytes.length <= 65536);
    assert.equal(hash(bytes), observation.sha256);
    inventory[name] = JSON.parse(bytes);
    assert.ok(
      Array.isArray(inventory[name]) && inventory[name].length <= 10000,
    );
    for (const stage of inventory[name]) {
      assert.equal(stage.packageName, name);
      assert.equal(typeof stage.id, "string");
      assert.ok(!ids.has(stage.id), "Duplicate stage inventory member");
      ids.add(stage.id);
    }
  }
  return inventory;
}
export function verifyNoPendingStages(captured, options) {
  for (const [name, stages] of Object.entries(
    readStageInventory(captured, options),
  ))
    assert.ok(
      stages.every((stage) =>
        ["approved", "published", "rejected"].includes(stage.status),
      ),
      `Another npm stage can still move ${name}; settle it with owner 2FA before another release effect`,
    );
}

export function verifyStageGuards(
  review,
  release,
  archive,
  map,
  journals,
  {
    tags = readPackageTags,
    command = npmCommand,
    gh = (args) => native("gh", args),
    history = [],
  } = {},
) {
  const channel = releaseChannel(review.channel),
    current = releasePackages.indexOf(archive.package);
  assert.ok(current >= 0);
  const deadline = performance.now() + 300000;
  const inventory = readStageInventory(review.stageInventory, {
    history,
    currentRun: map.run,
  });
  for (const [index, name] of releasePackages.entries()) {
    const subject = release.archives.find((value) => value.package === name);
    const origin = map.records.find((value) => value.package === name);
    let attributable = index < current && origin.state === "retained";
    const priorJournal = join(journals, `${subject.name}.jsonl`);
    let ownStageId;
    if (index < current && existsSync(priorJournal)) {
      const result = JSON.parse(
        releaseBytes(priorJournal, 65536)
          .toString("utf8")
          .trim()
          .split("\n")
          .at(-1),
      );
      assert.equal(result.state, "staged-awaiting-owner");
      for (const key of ["package", "version", "integrity", "sha256"])
        assert.equal(result[key], subject[key]);
      for (const key of ["source", "run", "attempt"])
        assert.equal(String(result.origin[key]), String(origin[key]));
      assert.equal(result.tag, channel);
      ownStageId = result.stageId;
      attributable = true;
    }
    // Dist-tags cannot reveal a request that is still awaiting owner approval.
    // The pinned native CLI paginates the provider's authenticated stage list.
    // A superseded pending stage must be rejected/settled by the owner first.
    // Private stage inventory is captured by the sole owner through native npm,
    // then bound to the authenticated raw decision. OIDC publish authority does
    // not silently acquire account credentials for this private read.
    const pending = inventory[name];
    for (const stage of pending) {
      assert.equal(stage.packageName, name);
      if (["approved", "published", "rejected"].includes(stage.status))
        continue;
      assert.ok(
        ownStageId &&
          stage.id === ownStageId &&
          stage.version === release.version &&
          stage.tag === channel,
        `Another npm stage can still move ${name}; reject/supersede it with owner 2FA and retain the native settlement before continuing`,
      );
    }
    const observed = tags(name, {
      deadline,
      allowAbsentPackage:
        review.guards.selectedLabels[name] === null &&
        review.guards.defaults[name] === null,
    });
    const selected = observed[channel] ?? null,
      latest = observed.latest ?? null;
    const allowedTarget = attributable && selected === release.version;
    assert.ok(
      selected === review.guards.selectedLabels[name] || allowedTarget,
      `Unexpected ${channel} for ${name}`,
    );
    assert.ok(
      latest === review.guards.defaults[name] ||
        (channel === "latest" && allowedTarget),
      `Unexpected npm default for ${name}`,
    );
    if (allowedTarget) {
      const integrity = JSON.parse(
        command(
          [
            "view",
            `${name}@${release.version}`,
            "dist.integrity",
            "--json",
            "--registry=https://registry.npmjs.org/",
            "--fetch-retries=0",
          ],
          { timeout: Math.max(1, Math.floor(deadline - performance.now())) },
        ),
      );
      assert.equal(
        Array.isArray(integrity) ? integrity[0] : integrity,
        subject.integrity,
      );
    }
  }
  let latest;
  try {
    latest = JSON.parse(
      gh(["api", "repos/Hadden-Industries/markdown-quality/releases/latest"]),
    ).id;
  } catch (error) {
    let body;
    try {
      body = JSON.parse(error.stdout);
    } catch {
      /* Preserve non-404 errors. */
    }
    if (review.guards.githubLatest !== null || String(body?.status) !== "404")
      throw error;
    latest = null;
  }
  assert.equal(
    latest,
    review.guards.githubLatest,
    "GitHub latest changed after owner review",
  );
}
