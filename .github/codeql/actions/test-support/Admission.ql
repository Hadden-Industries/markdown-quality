// SPDX-License-Identifier: AGPL-3.0-only
import actions
import codeql.actions.security.UntrustedCheckoutQuery
import codeql.actions.security.CachePoisoningQuery
import codeql.actions.security.PoisonableSteps
import codeql.actions.security.ControlChecks
import QualificationAdmission

from LocalJob job, PRHeadCheckoutStep source, PoisonableStep sink, Event event, string verdict
where
  job.getAStep() = source and
  source.getId() = "trusted" and
  source.getAFollowingStep() = sink and
  sink.getId() = "upload" and
  job.getATriggerEvent() = event and
  event.isExternallyTriggerable() and
  hasDefaultBranchCacheWriteAccess(job, event) and
  not job.isPrivileged() and
  (
    exists(ControlCheck check |
      check.protects(source, event, ["untrusted-checkout", "artifact-poisoning"])
    ) and
    verdict = "protected"
    or
    not exists(ControlCheck check |
      check.protects(source, event, ["untrusted-checkout", "artifact-poisoning"])
    ) and
    verdict = "unprotected"
  )
select job.getId(), source.getId(), sink.getId(), event.getName(), verdict
