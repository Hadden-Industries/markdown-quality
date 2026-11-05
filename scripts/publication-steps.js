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
