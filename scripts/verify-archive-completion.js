// SPDX-License-Identifier: AGPL-3.0-only
/** Independent archive completion: native producer authentication, bounded reads, zero mutations. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./commands.js";
import {
  hash,
  readJson,
  regularBytes,
  repository,
  verifyInventory,
} from "./release-assets.js";
import { admitServiceArtifact } from "./promotion-handoff.js";
import {
  archiveOperation,
  readArchiveFamily,
} from "./release-archive-state.js";
import { verifyReleaseCompletion } from "./release-readback.js";
import { verifyReleaseTag } from "./verify-release-tag.js";
import { createRepositoryReader } from "./github-evidence.js";
import { readSignedHistoryRefs } from "./release-history.js";
import { budgets } from "./qualification-budgets.js";
import { releasePackages } from "./release-coordinates.js";
import { readFamilyLabels } from "./release-labels.js";

export async function verifyArchiveCompletion(
  input,
  journal,
  output,
  {
    env = process.env,
    gh = (args, options) => native("gh", args, options),
    read: suppliedRead,
    historicalFamily = readFamilyLabels,
    verifyTag = verifyReleaseTag,
  } = {},
) {
  const qualified = readJson(join(input, "qualification.json"));
  const record = readJson(join(journal, "github-result.json"));
  const deadline = Date.now() + 300000;
  const boundedGh = (args, options = {}) => {
    const remaining = deadline - Date.now();
    assert.ok(
      remaining > 0,
      "Read-only completion budget exhausted during writer authentication",
    );
    return gh(args, { ...options, timeout: remaining });
  };
  assert.equal(
    record.qualificationSha256,
    hash(Buffer.from(JSON.stringify(qualified))),
  );
  assert.equal(record.context.repository, repository);
  assert.equal(record.context.workflow, ".github/workflows/github-release.yml");
  assert.equal(record.context.job, "archive");
  assert.equal(record.context.source, qualified.source);
  assert.equal(record.context.manifestSha256, qualified.manifestSha256);
  assert.equal(
    record.context.decisionSha256,
    qualified.evidence["release-acceptance.json"],
  );
  assert.equal(
    record.context.run,
    String(env.ARCHIVE_RUN ?? env.GITHUB_RUN_ID),
  );
  assert.equal(
    record.context.attempt,
    String(env.ARCHIVE_ATTEMPT ?? record.context.attempt),
  );
  const original = await admitServiceArtifact(
    "github",
    journal,
    env.ARCHIVE_JOURNAL_ID,
    record.context,
    boundedGh,
    {
      artifactName: `archive-journal-${record.context.attempt}`,
      jobName: "archive",
      checkpoints: readSignedHistoryRefs(
        JSON.parse(env.HISTORY_CHECKPOINT || "[]"),
        boundedGh,
        { deadline },
      ),
    },
  );
  const review = readJson(join(input, "bundle", "release-review.json"));
  assert.equal(
    hash(regularBytes(join(input, "bundle", "release-review.json"))),
    qualified.evidence["release-review.json"],
  );
  const read =
    suppliedRead ??
    createRepositoryReader({
      repository,
      token: env.GH_TOKEN ?? env.GITHUB_TOKEN,
      budgetMs: budgets.collection,
      deadline,
    });
  const ref = await read(`/git/ref/tags/v${qualified.version}`);
  verifyTag(ref, await read(`/git/tags/${ref.object.sha}`), {
    version: qualified.version,
    source: { head: qualified.source },
  });
  if (qualified.channel === undefined) {
    assert.ok(
      original.effects.every(
        (effect) =>
          Array.isArray(effect.target) &&
          !effect.target.includes("--prerelease=false") &&
          !effect.target.includes("--latest"),
      ),
      "Historical pilot archival cannot classify stable defaults",
    );
    const release = await read(`/releases/${record.releaseId}`);
    assert.equal(release.id, record.releaseId);
    assert.equal(release.tag_name, `v${qualified.version}`);
    assert.equal(release.immutable, true);
    assert.equal(release.draft, false);
    assert.equal(release.prerelease, true);
    verifyInventory(release, record.assets);
    boundedGh([
      "release",
      "verify",
      `v${qualified.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    assert.equal(record.nativeReleaseAndEveryAssetVerified, true);
    const labels = historicalFamily("pilot", { deadline, now: Date.now });
    for (const name of releasePackages)
      assert.equal(labels[name], qualified.version);
    const result = {
      status: "complete",
      scope: "historical-pilot-archive",
      originalWriter: record.context,
      observation: { release, npmPilot: labels },
    };
    mkdirSync(output);
    writeFileSync(
      join(output, "completion.json"),
      JSON.stringify(result, null, 2) + "\n",
      { flag: "wx" },
    );
    return result;
  }
  const operation = archiveOperation(qualified, review, record.releaseId);
  const result = await verifyReleaseCompletion({
    operation,
    now: Date.now,
    deadline,
    readFamily: (end) => readArchiveFamily(qualified, review, end),
    readGithub: async () => {
      const release = await read(`/releases/${record.releaseId}`);
      verifyInventory(release, record.assets);
      let latest;
      try {
        latest = await read("/releases/latest");
      } catch (error) {
        if (
          (operation.targetGithubLatest !== null &&
            operation.priorGithubLatest !== null) ||
          error.httpStatus !== 404
        )
          throw error;
        latest = null;
      }
      return { release, latest };
    },
  });
  mkdirSync(output);
  writeFileSync(
    join(output, "completion.json"),
    JSON.stringify({ ...result, originalWriter: record.context }, null, 2) +
      "\n",
    { flag: "wx" },
  );
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: verify-archive-completion.js INPUTS ORIGINAL_JOURNAL NEW_OUTPUT",
  );
  const result = await verifyArchiveCompletion(
    ...process.argv.slice(2).map((path) => resolve(path)),
  );
  if (result.status !== "complete") process.exitCode = 1;
}
