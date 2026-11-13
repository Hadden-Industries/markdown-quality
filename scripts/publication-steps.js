// SPDX-License-Identifier: AGPL-3.0-only
/** Native effect names shared by origin planning and complete-attempt admission. */
export const legacyPublicationSteps = [
  "Publish Windows package under pilot and verify integrity",
  "Publish Linux package under pilot and verify integrity",
  "Publish coherent core under pilot and verify integrity",
];
export const stagingSteps = [
  "Stage Windows package under pilot",
  "Stage Linux package under pilot",
  "Stage coherent core under pilot",
];

export const reviewedChannelStagingSteps = [
  "Stage Windows package under reviewed channel",
  "Stage Linux package under reviewed channel",
  "Stage coherent core under reviewed channel",
];

/** Original step names identify effects. Never reinterpret a mixed/partial inventory. */
export function stagingStepNames(job) {
  const inventories = [stagingSteps, reviewedChannelStagingSteps].filter(
    (names) =>
      names.some((name) => job.steps?.some((step) => step.name === name)),
  );
  if (inventories.length !== 1)
    throw new Error("Unknown or mixed staging step inventory");
  return inventories[0];
}
