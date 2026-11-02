// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Model only the repository's live, fail-closed owner approval contract.
 * The native environment model does not cover workflow_dispatch in 2.27.3.
 */

import actions
import codeql.actions.security.ControlChecks
private import codeql.actions.ast.internal.Ast as Internal
private import codeql.actions.ast.internal.Yaml as InternalYaml

private predicate hasDeclaredEnvironment(Job job) {
  exists(InternalYaml::YamlString name |
    (
      name = job.(Internal::JobImpl).getNode().lookup("environment")
      or
      name =
        job.(Internal::JobImpl)
            .getNode()
            .lookup("environment")
            .(InternalYaml::YamlMapping)
            .lookup("name")
    ) and
    name.getValue().trim() != ""
  )
}

bindingset[scalar, expression]
private predicate exactExpression(string scalar, string expression) {
  scalar.regexpReplaceAll("\\s+", "") = "${{" + expression + "}}"
}

bindingset[variable, input]
private predicate boundInput(Run run, string variable, string input) {
  run.getEnclosingWorkflow() instanceof ReusableWorkflow and
  exactExpression(run.getEnclosingWorkflow().getEnv().getEnvVarValue(variable).getValue(),
    "inputs." + input) and
  not exists(run.getEnclosingJob().getEnv().getEnvVarValue(variable)) and
  not exists(run.getEnv().getEnvVarValue(variable))
}

private predicate reviewedInputs(Run run) {
  boundInput(run, "MQ_TRUSTED_SHA", "trusted-sha") and
  boundInput(run, "MQ_TRUSTED_REPOSITORY", "trusted-repository") and
  boundInput(run, "MQ_CANDIDATE_SHA", "candidate-sha") and
  boundInput(run, "MQ_CANDIDATE_REPOSITORY", "candidate-repository") and
  boundInput(run, "MQ_PROFILE", "profile")
}

private predicate immutableProducerBefore(Run run) {
  exists(UsesStep producer |
    producer.getEnclosingJob() = run.getEnclosingJob() and
    producer.getCallee() = "actions/checkout" and
    producer.getVersion().regexpMatch("[a-f0-9]{40}") and
    producer.getArgument("persist-credentials") = "false" and
    producer.getArgument("path") = "producer" and
    exactExpression(producer.getArgument("ref"), "job.workflow_sha") and
    exactExpression(producer.getArgument("repository"), "job.workflow_repository") and
    not exists(producer.getIf()) and
    producer.getAFollowingStep() = run
  )
}

class QualificationAdmission extends ControlCheck instanceof Run {
  QualificationAdmission() {
    this.(Run).getScript().getRawScript().trim() =
      "node producer/scripts/shared-qualification-admission.js verify" and
    not exists(this.(Run).getIf()) and
    not exists(this.(Internal::RunImpl).getNode().lookup("continue-on-error")) and
    this.(Run).getWorkingDirectory() = "GITHUB_WORKSPACE/" and
    not exists(this.getInScopeDefaultValue("run", "working-directory")) and
    hasDeclaredEnvironment(this.getEnclosingJob()) and
    immutableProducerBefore(this.(Run)) and
    reviewedInputs(this.(Run)) and
    exists(LocalJob request, Run summary |
      this.getEnclosingJob().getANeededJob() = request and
      not exists(request.getIf()) and
      request.getAStep() = summary and
      summary.getScript().getRawScript().trim() =
        "node producer/scripts/shared-qualification-admission.js request" and
      not exists(summary.getIf()) and
      not exists(summary.(Internal::RunImpl).getNode().lookup("continue-on-error")) and
      summary.getWorkingDirectory() = "GITHUB_WORKSPACE/" and
      not exists(summary.getInScopeDefaultValue("run", "working-directory")) and
      immutableProducerBefore(summary) and
      reviewedInputs(summary)
    )
  }

  override predicate protectsCategoryAndEvent(string category, string event) {
    category = "untrusted-checkout" and event = "workflow_dispatch"
  }

  override predicate protects(AstNode node, Event event, string category) {
    ControlCheck.super.protects(node, event, category) and
    exists(UsesStep checkout, string kind |
      checkout = node and
      checkout.getEnclosingJob() = this.getEnclosingJob() and
      checkout.getCallee() = "actions/checkout" and
      not exists(checkout.getIf()) and
      kind = ["trusted", "candidate"] and
      checkout.getArgument("path") = kind and
      exactExpression(checkout.getArgument("ref"), "inputs." + kind + "-sha") and
      exactExpression(checkout.getArgument("repository"), "inputs." + kind + "-repository")
    )
  }
}
