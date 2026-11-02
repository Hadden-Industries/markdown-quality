// SPDX-License-Identifier: AGPL-3.0-only
import { nodeSupport, qualificationMatrix } from "../scripts/node-matrix.js";

export const nextPatchVersion = (version) =>
  version.replace(/\d+$/u, (patch) => String(Number(patch) + 1));

/** Synthetic releases keep offline fixtures independent of real Node patches. */
export function nodeMatrixFixture(policy = nodeSupport) {
  const versions = [
    ...policy.testedLtsMajors.map((major) => `${major}.0.0`),
    policy.minimum,
    // Retain separate floor and latest lanes within the minimum's LTS family.
    nextPatchVersion(policy.minimum),
    policy.reference,
  ];
  const matrix = qualificationMatrix(
    versions.map((version) => ({ version: `v${version}`, lts: "fixture" })),
    policy,
  );
  // Negative proof tests mutate fixtures; never share the policy's OS array.
  return { os: [...matrix.os], node: matrix.node };
}
