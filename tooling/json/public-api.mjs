// SPDX-License-Identifier: AGPL-3.0-only
/** Development-only public contracts; a parent installation cannot satisfy this bridge. */
import { assertIsolatedJsonQuality } from "@hadden-industries/json-quality";

assertIsolatedJsonQuality(new URL("./", import.meta.url));
export * from "@hadden-industries/json-quality";
export { default as jsonQualityEslint } from "@hadden-industries/json-quality/eslint";
