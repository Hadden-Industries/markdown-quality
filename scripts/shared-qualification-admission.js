// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRepositoryReader } from "./github-evidence.js";

export const qualificationEnvironment =
  "markdown-quality-trusted-qualification";

export function qualificationRequest(environment = process.env) {
  const repository = (value) => {
    assert.match(value ?? "", /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u);
    return value;
  };
  const sha = (value) => {
    assert.match(value ?? "", /^[a-f0-9]{40}$/u);
    return value;
  };
  const profile = environment.MQ_PROFILE;
  assert.ok(
    typeof profile === "string" &&
      profile.length > 0 &&
      profile.length <= 65536,
  );
  assert.ok(
    !/[\u0000-\u001f\u007f\\:]/u.test(profile) && !profile.startsWith("/"),
  );
  assert.ok(!profile.split("/").some((part) => [".", ".."].includes(part)));
  const runId = Number(environment.GITHUB_RUN_ID);
  assert.ok(Number.isSafeInteger(runId) && runId > 0);
  return {
    repository: repository(environment.GITHUB_REPOSITORY),
    runId,
    producerRepository: repository(environment.MQ_WORKFLOW_REPOSITORY),
    producerSha: sha(environment.MQ_WORKFLOW_SHA),
    trustedRepository: repository(environment.MQ_TRUSTED_REPOSITORY),
    trustedSha: sha(environment.MQ_TRUSTED_SHA),
    candidateRepository: repository(environment.MQ_CANDIDATE_REPOSITORY),
    candidateSha: sha(environment.MQ_CANDIDATE_SHA),
    profile,
  };
}

export function verifyQualificationApproval(protection, reviews) {
  assert.equal(protection.name, qualificationEnvironment);
  assert.ok(Number.isSafeInteger(protection.id) && protection.id > 0);
  assert.equal(
    protection.can_admins_bypass,
    false,
    "Qualification approval must not allow administrator bypass",
  );
  const rule = protection.protection_rules?.find(
    (value) => value.type === "required_reviewers",
  );
  assert.ok(
    rule?.reviewers?.length > 0,
    "Qualification requires configured reviewers",
  );
  assert.ok(
    rule.reviewers.every(
      (value) =>
        ["User", "Team"].includes(value.type) &&
        Number.isSafeInteger(value.reviewer?.id) &&
        value.reviewer.id > 0,
    ),
  );
  assert.ok(Array.isArray(reviews));
  const selected = reviews.filter((value) =>
    value.environments?.some(
      (item) =>
        item.id === protection.id && item.name === qualificationEnvironment,
    ),
  );
  assert.ok(
    selected.every((value) => value.state === "approved"),
    "Qualification approval was rejected or bypassed",
  );
  const review = selected.find((value) => value.state === "approved");
  assert.ok(
    review,
    "This workflow run has no owner-approved qualification request",
  );
  assert.ok(Number.isSafeInteger(review.user?.id) && review.user.id > 0);
  assert.ok(
    rule.reviewers.some(
      (value) => value.type === "Team" || value.reviewer.id === review.user.id,
    ),
    "Approval is not from a configured reviewer",
  );
  return {
    environment: qualificationEnvironment,
    environmentId: protection.id,
    reviewerId: review.user.id,
  };
}

export async function admitSharedQualification({
  environment = process.env,
  read,
} = {}) {
  const request = qualificationRequest(environment);
  read ??= createRepositoryReader({
    repository: request.repository,
    token: environment.GH_TOKEN ?? environment.GITHUB_TOKEN,
  });
  const [protection, reviews] = await Promise.all([
    read(`/environments/${qualificationEnvironment}`),
    read(`/actions/runs/${request.runId}/approvals`),
  ]);
  return { ...request, ...verifyQualificationApproval(protection, reviews) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3);
  if (process.argv[2] === "request") {
    const request = qualificationRequest();
    assert.ok(process.env.GITHUB_STEP_SUMMARY);
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "## Review trusted qualification before execution\n\n" +
        "Approving the protected environment authorizes execution of the reviewed locked archive graph in this exact request. Review the profile and its core/native archives as well as the commits.\n\n" +
        "```json\n" +
        JSON.stringify(request, null, 2) +
        "\n```\n",
    );
    console.log("Trusted qualification request is ready for owner review.");
  } else {
    assert.equal(process.argv[2], "verify");
    await admitSharedQualification();
    console.log("Owner-approved shared qualification admitted.");
  }
}
