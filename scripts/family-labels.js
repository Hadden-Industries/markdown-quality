// SPDX-License-Identifier: AGPL-3.0-only
/** Native-first npm label effects with approved preimages and no inferred attribution. */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { npmCommand } from "./commands.js";
import { releasePackages } from "./release-coordinates.js";
import { transientProviderRead } from "./release-readback.js";
import { retryDelay } from "./github-evidence.js";

/** The caller authenticates settlements before passing their exact package targets. */
export async function executeFamilyLabels({
  operation,
  readLabels,
  command = npmCommand,
  record = () => {},
  write = (_effect, request) => request(),
  settled = {},
  now = () => performance.now(),
  sleep = delay,
  random = Math.random,
  deadline: selectedDeadline,
}) {
  const deadline = selectedDeadline ?? now() + 300000,
    required = new Set(
      Object.keys(settled).filter(
        (name) => settled[name] === operation.targets[name],
      ),
    );
  const observe = async () => {
    let attempt = 0;
    for (;;) {
      assert.ok(
        now() < deadline,
        "Completion unconfirmed within five minutes; retain writer evidence and run read-only verification",
      );
      let labels, response;
      try {
        labels = await readLabels(deadline);
      } catch (error) {
        response = transientProviderRead(error);
        if (!response) throw error;
      }
      if (labels) {
        assert.deepEqual(
          Object.keys(labels).sort(),
          [...releasePackages].sort(),
        );
        for (const name of releasePackages) {
          assert.ok(
            [operation.priors[name], operation.targets[name]].includes(
              labels[name],
            ),
            `Unexpected latest for ${name}; reconcile before changing labels`,
          );
          if (
            labels[name] === operation.targets[name] &&
            operation.targets[name] !== operation.priors[name] &&
            !required.has(name)
          )
            assert.ok(
              settled[name] === operation.targets[name] ||
                operation.noops?.includes(name) ||
                operation.operation === "direct",
              `Matching label for ${name} has no authenticated writer or approved no-op`,
            );
        }
        if (
          now() < deadline &&
          [...required].every(
            (name) => labels[name] === operation.targets[name],
          )
        )
          return labels;
      }
      const wait = Math.max(
        Math.min(16000, 1000 * 2 ** Math.min(attempt++, 4)) *
          (1 + random() * 0.25),
        response ? retryDelay(response, 0, Date.now(), random) : 0,
      );
      await sleep(Math.min(wait, Math.max(0, deadline - now())));
    }
  };
  await observe();
  for (const name of releasePackages) {
    const labels = await observe();
    if (!operation.scope.npm.includes(name)) continue;
    const target = operation.targets[name];
    if (labels[name] === target) {
      assert.ok(
        operation.noops?.includes(name) || settled[name] === target,
        "Already-at-target labels need explicit admission",
      );
      required.add(name);
      record({ state: "observed-target", package: name, version: target });
      continue;
    }
    assert.equal(labels[name], operation.priors[name]);
    const effect = {
      provider: "npm",
      operation: target === null ? "delete-label" : "set-label",
      subject: name,
      prior: labels[name],
      target,
      integrity: operation.targetIntegrities?.[name] ?? null,
      step: `npm/${name}`,
    };
    record({
      state: "attempted",
      package: name,
      previous: labels[name],
      target,
    });
    try {
      write(effect, () =>
        command(
          target === null
            ? [
                "dist-tag",
                "rm",
                name,
                operation.label,
                "--registry=https://registry.npmjs.org/",
              ]
            : [
                "dist-tag",
                "add",
                `${name}@${target}`,
                operation.label,
                "--registry=https://registry.npmjs.org/",
              ],
        ),
      );
    } catch (error) {
      record({ state: "outcome-unknown", package: name, target });
      throw error;
    }
    required.add(name);
    record({ state: "acknowledged", package: name, version: target });
    // Acknowledged writes that have not propagated are verification pending,
    // rather than unknown requests; neither state permits another request.
    await observe();
    record({ state: "verified", package: name, version: target });
  }
  return observe();
}
