// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import { consumer } from "./helpers.js";

const policyRules = [
  "quality/disallowed-html-construct",
  "quality/missing-html-image-alt",
  "quality/placeholder-image-alt",
  "quality/unlabeled-image-link",
  "markdown/require-alt-text",
];
const findings = (report) =>
  report.diagnostics
    .filter((d) => policyRules.includes(d.rule))
    .map((d) => `${d.line}:${d.rule}`);

test("finite unsafe HTML patterns fail while benign semantic HTML passes", async (t) => {
  const lines = [
    "# Title",
    "",
    "<script>alert(1)</script>",
    "",
    '<a href="javascript:alert(1)">x</a>',
    "",
    '<a href="&#106;avascript:alert(1)">x</a>',
    "",
    '<a href=" java\tscript:alert(1)">x</a>',
    "",
    '<div onclick="go()">x</div>',
    "",
    '<img src="a.png" srcset="b.png 1x, vbscript:x 2x" alt="Chart">',
    "",
    "<details><summary>More</summary>Body <kbd>Ctrl</kbd></details>",
    "",
    "<!-- <script>not executable</script> -->",
    "",
    "Inline `<script>` code is literal.",
    "",
    "```html",
    "<script>literal()</script>",
    "```",
    "",
    '<a id="anchor" title="onclick=javascript:x">Plain</a>',
    "",
  ];
  const root = consumer(t, { "a.md": lines.join("\n") });
  const before = readFileSync(join(root, "a.md"));
  const report = await runQuality({ root });
  assert.deepEqual(findings(report), [
    "3:quality/disallowed-html-construct",
    "5:quality/disallowed-html-construct",
    "7:quality/disallowed-html-construct",
    "9:quality/disallowed-html-construct",
    "11:quality/disallowed-html-construct",
    "13:quality/disallowed-html-construct",
  ]);
  assert.match(
    report.diagnostics.find((d) => d.line === 3).message,
    /not a sanitizer/u,
  );
  // Checking never rewrites raw HTML.
  assert.deepEqual(readFileSync(join(root, "a.md")), before);
});

test("HTML images need an alt attribute; empty alt is decorative", async (t) => {
  const root = consumer(t, {
    "a.md": [
      "# Title",
      "",
      '<img src="a.png">',
      "",
      '<img src="divider.png" alt="">',
      "",
      '<a href="b.md"><img src="a.png" alt=""></a>',
      "",
      '<a href="b.md" aria-label="Open the guide"><img src="a.png" alt=""></a>',
      "",
      '<a href="b.md"><img src="a.png" alt="Build status"></a>',
      "",
    ].join("\n"),
    "b.md": "# B\n",
  });
  const report = await runQuality({ root });
  // The upstream rule owns the default missing-alt finding; no duplicate.
  assert.deepEqual(findings(report), [
    "3:markdown/require-alt-text",
    "7:quality/unlabeled-image-link",
  ]);
  const parserOwned = consumer(
    t,
    {
      "a.md":
        '# Title\n\n<img src="a.png">\n\n<img src="b.png" aria-hidden="true">\n',
    },
    { lint: { "markdown/require-alt-text": "off" } },
  );
  assert.deepEqual(findings(await runQuality({ root: parserOwned })), [
    "3:quality/missing-html-image-alt",
  ]);
});

test("Markdown image alternatives and image-only links have static label policy", async (t) => {
  const root = consumer(t, {
    "a.md": [
      "# Title",
      "",
      "![Image](a.png)",
      "",
      "![ Screenshot ](a.png)",
      "",
      "![Quarterly revenue chart](a.png)",
      "",
      "[![image](a.png)](b.md)",
      "",
      "[![Build status](badge.svg)](b.md)",
      "",
      "[Guide ![icon](i.png)](b.md)",
      "",
      "| Logo |",
      "| ---- |",
      "| ![photo](a.png) |",
      "",
      "![picture][ref]",
      "",
      "[ref]: a.png",
      "",
    ].join("\n"),
    "a.png": "",
    "badge.svg": "",
    "i.png": "",
    "b.md": "# B\n",
  });
  const report = await runQuality({ root });
  assert.deepEqual(findings(report), [
    "3:quality/placeholder-image-alt",
    "5:quality/placeholder-image-alt",
    "9:quality/unlabeled-image-link",
    "9:quality/placeholder-image-alt",
    "13:quality/placeholder-image-alt",
    "17:quality/placeholder-image-alt",
    "19:quality/placeholder-image-alt",
  ]);
});

test("an empty Markdown alternative is reported once by its existing owner", async (t) => {
  const root = consumer(t, {
    "a.md": "# Title\n\n[![](a.png)](b.md)\n",
    "a.png": "",
    "b.md": "# B\n",
  });
  const report = await runQuality({ root });
  const rules = report.diagnostics.map((d) => d.rule);
  assert.ok(
    rules.includes("markdown/require-alt-text") ||
      rules.includes("markdown/no-empty-images"),
    rules.join(),
  );
  assert.ok(!rules.includes("quality/unlabeled-image-link"));
});
