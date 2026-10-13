// SPDX-License-Identifier: AGPL-3.0-only
export const fingerprint = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
