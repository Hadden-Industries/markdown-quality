// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only convergence under one deadline; no request in this module can mutate a provider. */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { transientReadError, retryDelay } from "./github-evidence.js";
import { releasePackages } from "./release-coordinates.js";

/** Only native transport failures, temporary servers and identified rate limits can retry. */
export function transientProviderRead(error) {
  let body;
  try {
    body = JSON.parse(error.stdout);
  } catch {
    /* Native timeouts may have no body. */
  }
  const status = Number(
    error.httpStatus ??
      body?.status ??
      /^E(\d{3})$/u.exec(body?.error?.code ?? "")?.[1],
  );
  const headers =
    error.headers instanceof Headers
      ? error.headers
      : new Headers(error.headers ?? {});
  const rateLimited =
    status === 429 ||
    (status === 403 &&
      (headers.has("retry-after") ||
        headers.get("x-ratelimit-remaining") === "0"));
  if (
    !transientReadError(error) &&
    ![500, 502, 503, 504].includes(status) &&
    !rateLimited
  )
    return null;
  return { status, headers };
}

/** Authenticate writer evidence before calling. Each observation permits only the approved prior-to-target transition. */
export async function verifyReleaseCompletion({
  operation,
  readFamily,
  readGithub,
  now = () => performance.now(),
  sleep = delay,
  random = Math.random,
  budgetMs = 300000,
  deadline: selectedDeadline,
}) {
  assert.ok(budgetMs > 0 && budgetMs <= 300000);
  const deadline = selectedDeadline ?? now() + budgetMs;
  let attempt = 0,
    lastConfirmed = {},
    retryAt = null;
  for (;;) {
    if (now() >= deadline)
      return {
        status: "completion-unconfirmed",
        lastConfirmed,
        retryAt,
        deadline,
      };
    let response;
    try {
      const labels = await readFamily(deadline);
      assert.deepEqual(Object.keys(labels).sort(), [...releasePackages].sort());
      for (const name of releasePackages)
        assert.ok(
          [operation.priors[name], operation.targets[name]].includes(
            labels[name],
          ),
          `Unexpected third npm value for ${name}`,
        );
      lastConfirmed.npm = labels;
      const github = await readGithub(deadline);
      assert.equal(
        github.release.id,
        operation.releaseId,
        "Unexpected release identity",
      );
      assert.equal(github.release.draft, false);
      assert.equal(github.release.immutable, true);
      assert.equal(github.release.tag_name, `v${operation.version}`);
      const latestId = github.latest?.id ?? null;
      assert.ok(
        [operation.priorGithubLatest, operation.targetGithubLatest].includes(
          latestId,
        ),
        "Unexpected third GitHub latest",
      );
      assert.ok(
        [operation.priorPrerelease, operation.targetPrerelease].includes(
          github.release.prerelease,
        ),
        "Unexpected GitHub classification",
      );
      lastConfirmed.github = github;
      const settled =
        releasePackages.every(
          (name) => labels[name] === operation.targets[name],
        ) &&
        latestId === operation.targetGithubLatest &&
        github.release.prerelease === operation.targetPrerelease;
      if (now() < deadline && settled)
        return { status: "complete", lastConfirmed, deadline };
    } catch (error) {
      if (error.code === "LOOKUP_LIMIT_EXCEEDED" || now() >= deadline)
        return {
          status: "completion-unconfirmed",
          lastConfirmed,
          retryAt: error.retryAt ?? retryAt,
          deadline,
        };
      response = transientProviderRead(error);
      if (!response) throw error;
      lastConfirmed.transportError = {
        code: error.code ?? null,
        status: response.status || null,
      };
    }
    const backoff =
      Math.min(16000, 1000 * 2 ** Math.min(attempt, 4)) * (1 + random() * 0.25);
    const hinted = response ? retryDelay(response, 0, Date.now(), random) : 0;
    const wait = Math.max(backoff, hinted);
    retryAt = now() + wait;
    const remaining = deadline - now();
    if (remaining <= 0 || wait >= remaining)
      return {
        status: "completion-unconfirmed",
        lastConfirmed,
        retryAt,
        deadline,
      };
    await sleep(wait);
    attempt++;
  }
}
