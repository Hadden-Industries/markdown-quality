// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { formatLayout } from "../src/literal-layout.js";
import { parse } from "../src/analysis.js";

const fence = "`".repeat(3);
const options = {
  parser: "markdown",
  proseWrap: "preserve",
  embeddedLanguageFormatting: "off",
  endOfLine: "lf",
  tabWidth: 2,
  plugins: [],
};
function literals(text) {
  const result = [];
  function visit(node) {
    if (node.type === "code")
      result.push({ lang: node.lang, meta: node.meta, value: node.value });
    for (const child of node.children ?? []) visit(child);
  }
  visit(parse(text));
  return result;
}
const cases = [];
for (const body of [
  " first\n \n second",
  "def sample():\n    pass\n    \n    return 1",
  "a  \n\t \nend",
  "\n \n\n",
]) {
  const plain = `${fence}diff meta\n${body}\n${fence}\n`;
  cases.push(
    plain,
    plain
      .split("\n")
      .slice(0, -1)
      .map((line) => "> " + line)
      .join("\n") + "\n",
    "100. " + plain.split("\n").slice(0, -1).join("\n     ") + "\n",
    "~~\n\n" + plain.replaceAll(fence, "~~~~"),
    plain.replaceAll("\n", "\r\n"),
  );
}
cases.push(
  "    a  \n\n    b  \n",
  "    a  \n \n    b  \n",
  "    a  \n     \n    b  \n",
  ">     a  \n> \n>     b  \n",
  "-     a  \n\n      b  \n",
  "    ```diff  \n    a\n    ```\n",
  "        ```\n        a\n",
  "\t```\n\ta\n",
  "> \t```diff\n> a  \n>  \n> ```\n",
  "> > ```python\n> > a  \n> >  \n> > ```\n",
  "```text\na  \n> ``` \n",
  "  ```text\na  \n  ```\n",
  "```text\n\ue000  \n\t \n```\n",
  "```text\n \n```\n",
  "```text\n\n```\n",
  "```text\na\u00a0\n```\n",
  "```text\n \n",
  "```text\na\n    ```   ",
  "```text\na\n    ```   \n",
  "```text\n    ```  \n```\n",
  "```text\n```   \n",
  `${fence}text\n${Array.from({ length: 256 }, (_, i) => String.fromCharCode(0xe000 + i)).join("")}  \n \n${fence}\n`,
);
for (const [index, input] of cases.entries())
  test(`literal layout case ${index + 1} retains code values and converges`, async () => {
    const selectedOptions = {
      ...options,
      endOfLine: input.includes("\r\n") ? "crlf" : "lf",
    };
    const output = await formatLayout(input, selectedOptions);
    assert.deepEqual(literals(output), literals(input));
    assert.equal(await formatLayout(output, selectedOptions), output);
  });
