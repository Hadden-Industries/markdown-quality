// SPDX-License-Identifier: AGPL-3.0-only
import { limits } from "../src/contracts.js";
import { createNativeStaging } from "../src/native-staging.js";

/** Behavior tests require real private staging, not the optional fast-path deadline. */
export function createTestNativeStaging(root) {
  return createNativeStaging(root, { ...limits, stagingMs: 30_000 });
}
