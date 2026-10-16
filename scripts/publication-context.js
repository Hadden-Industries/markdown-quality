// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
export const publicationRepository = "Hadden-Industries/markdown-quality";
/** Pure common controls; every gate calls this against its current input. */
export function validatePublicationContext(context) {
  assert.equal(context.repository, publicationRepository);
  assert.equal(context.event, "workflow_dispatch");
  assert.equal(context.ref, "refs/heads/main");
  assert.equal(
    context.workflowRef,
    `${publicationRepository}/.github/workflows/publish.yml@refs/heads/main`,
  );
  assert.match(context.head, /^[a-f0-9]{40}$/u);
}
export function publicationContext(env) {
  return {
    repository: env.GITHUB_REPOSITORY,
    event: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    workflowRef: env.GITHUB_WORKFLOW_REF,
    head: env.GITHUB_SHA,
    runId: env.CANDIDATE_RUN,
    publicationRun: env.GITHUB_RUN_ID,
    publicationAttempt: env.GITHUB_RUN_ATTEMPT,
    recoveryRun: env.RECOVERY_RUN,
    recoveryAttempt: env.RECOVERY_ATTEMPT,
    recoveryOriginsSha: env.RECOVERY_ORIGINS_SHA,
    phase: env.STAGING_PHASE,
  };
}
