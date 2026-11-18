// SPDX-License-Identifier: AGPL-3.0-only
/** Trusted repository and package names for release workflows. */
export const repository = "Hadden-Industries/markdown-quality";
export const repositoryUrl = `https://github.com/${repository}`;
export const corePackage = "@hadden-industries/markdown-quality";

// Publication writes the Windows and Linux companions before the core package.
export const nativeReleasePlatforms = Object.freeze(["win32-x64", "linux-x64"]);
export const nativeReleasePackages = Object.freeze(
  Object.fromEntries(
    nativeReleasePlatforms.map((platform) => [
      platform,
      `${corePackage}-${platform}`,
    ]),
  ),
);
export const releaseMembers = Object.freeze({
  ...nativeReleasePackages,
  core: corePackage,
});
export const releaseMemberNames = Object.freeze(Object.keys(releaseMembers));
export const releasePackages = Object.freeze(Object.values(releaseMembers));
