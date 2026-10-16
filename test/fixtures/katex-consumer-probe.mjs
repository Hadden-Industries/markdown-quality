// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const core = createRequire(pathToFileURL(join(process.argv[2], "package.json")));
const extension = core.resolve("micromark-extension-math");
const math = createRequire(extension);
const katex = math("katex");
assert.equal(katex.version, "0.19.0");
for (const expression of [String.raw`\href{javascript:alert(1)}{click}`, String.raw`\includegraphics{javascript:alert(1)}`]) {
  const output = katex.renderToString(expression, Object.create({ trust: true, strict: false }));
  assert.ok(!/(?:href|src)=["']javascript:/iu.test(output), output);
}
const trusted = katex.renderToString(String.raw`\href{https://example.com/}{link}`, { trust: true });
assert.ok(trusted.includes('href="https://example.com/"'));
const { micromark } = await import(pathToFileURL(core.resolve("micromark")));
const { math: syntax, mathHtml } = await import(pathToFileURL(extension));
const html = micromark("Inline $x^2$.\n\n$$\ny^2\n$$\n", { extensions: [syntax()], htmlExtensions: [mathHtml({ trust: false, throwOnError: true })] });
assert.ok(html.includes('class="math math-inline"'));
assert.ok(html.includes('class="math math-display"'));
console.log(JSON.stringify({ patched: katex.version, inheritedTrustRejected: true, trustedHttpsPreserved: true, inlineAndDisplayMathPreserved: true }));
