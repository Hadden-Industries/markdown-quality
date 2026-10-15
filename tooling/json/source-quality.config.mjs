// SPDX-License-Identifier: AGPL-3.0-only
/** This tooling-only guard supplements independently owned JSON identity tests. */
import { jsonQualityEslint } from "./public-api.mjs";

export default [
  {
    files: [
      "src/**/*.{js,mjs,cjs}",
      "scripts/**/*.{js,mjs,cjs}",
      "test/**/*.{js,mjs,cjs}",
      "tooling/json/*.mjs",
    ],
    plugins: { "json-quality": jsonQualityEslint },
    rules: { "json-quality/no-json-stringify-identity": "error" },
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
];
