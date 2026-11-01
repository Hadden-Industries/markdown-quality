// SPDX-License-Identifier: AGPL-3.0-only
import { stagingSteps } from "../scripts/publication-origins.js";

export function publicationHistoryFixture(attempt = 2) {
  const run = {
    id: 11,
    run_attempt: attempt,
    repository: { id: 3, full_name: "Hadden-Industries/markdown-quality" },
    head_repository: { id: 3, full_name: "Hadden-Industries/markdown-quality" },
    path: ".github/workflows/publish.yml",
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: "b".repeat(40),
    status: "in_progress",
    conclusion: null,
  };
  const job = (n, conclusion = "success", name = "stage") => ({
    id: n * 100,
    name,
    run_id: run.id,
    run_attempt: n,
    head_sha: run.head_sha,
    runner_id: n * 1000,
    started_at: new Date(Date.UTC(2026, 10, 1, 0, n)).toISOString(),
    completed_at: new Date(Date.UTC(2026, 10, 1, 0, n, 30)).toISOString(),
    status: "completed",
    conclusion,
    steps: stagingSteps.map((step) => ({
      name: step,
      status: "completed",
      conclusion,
    })),
  });
  const attempts = Array.from({ length: attempt }, (_, index) => ({
    run: {
      ...run,
      run_attempt: index + 1,
      status: index + 1 === attempt ? run.status : "completed",
    },
    jobs: { total_count: 0, jobs: [] },
  }));
  const set = (n, jobs) => {
    attempts[n - 1].jobs = { total_count: jobs.length, jobs };
  };
  set(attempt, [
    {
      ...job(attempt),
      status: "in_progress",
      conclusion: null,
      completed_at: null,
      steps: [],
    },
  ]);
  return { run, attempts, job, set };
}
