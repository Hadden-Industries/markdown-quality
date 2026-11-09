// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveJsonQualityPolicy,
  resolveJsonSourceContract,
} from "@hadden-industries/json-quality";

const policy = resolveJsonQualityPolicy(
  JSON.parse(
    readFileSync(new URL("../../.json-quality.json", import.meta.url)),
  ),
);
const archive = "dist/json-qualification/hadden-industries-markdown-quality-";

test("repository policy keeps release JSON ordinary and pins only verified attribution exceptions", () => {
  for (const path of [
    "docs/releases/1.0.2.json",
    "docs/releases/1.0.3.json",
    "docs/releases/future.json",
  ]) {
    const contract = resolveJsonSourceContract(path, policy, { tracked: true });
    assert.equal(contract.excludeUntrackedSources, false);
    assert.equal(contract.formatContract, "prettier-json");
    assert.equal(contract.allowSourceRewrites, true);
    assert.equal(contract.normalization, "NFC");
    assert.deepEqual(contract.exceptions, []);
  }

  for (const platform of ["linux", "win32"])
    assert.equal(
      resolveJsonSourceContract(
        `${archive}${platform}-x64-9.9.9-rc.1.tgz!/package/component.json`,
        policy,
      ).formatContract,
      "producer-json-indent",
    );

  const originalNotices = resolveJsonSourceContract(
    "packages/linux-x64/cargo-notices.json",
    policy,
  );
  assert.equal(originalNotices.nfcExemptStringValues.length, 2);
  const { version } = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url)),
  );
  const packedNotices = resolveJsonSourceContract(
    `${archive}linux-x64-${version}.tgz!/package/cargo-notices.json`,
    policy,
  );
  assert.equal(packedNotices.normalization, "NFC");
  assert.equal(packedNotices.allowSourceRewrites, false);
  assert.deepEqual(
    packedNotices.nfcExemptStringValues,
    originalNotices.nfcExemptStringValues,
    "Packed notices must preserve only the same two pinned source values",
  );
  assert.equal(
    resolveJsonSourceContract(
      `${archive}linux-x64-9.9.9-rc.1.tgz!/package/cargo-notices.json`,
      policy,
    ).nfcExemptStringValues,
    undefined,
  );
});

test("repository policy preserves only the declared original archive members", () => {
  assert.deepEqual(
    policy.preserveSourcePresentation.flatMap((rule) => rule.paths).sort(),
    [
      "packages/linux-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
      "packages/win32-x64/MPL-SOURCE.tar.xz!/webpki-roots-0.25.4/.cargo_vcs_info.json",
    ],
  );
});

test("repository policy prunes untracked installations and protects tracked files", () => {
  for (const path of [
    "node_modules/a/node_modules/b/package.json",
    "packages/example/node_modules/a/package.json",
  ]) {
    assert.equal(
      resolveJsonSourceContract(path, policy).excludeUntrackedSources,
      true,
      path,
    );
    const tracked = resolveJsonSourceContract(path, policy, { tracked: true });
    assert.equal(tracked.excludeUntrackedSources, false, path);
    assert.equal(tracked.allowSourceRewrites, false, path);
  }
});
