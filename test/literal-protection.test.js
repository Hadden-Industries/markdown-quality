// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { protectOpaqueLiterals } from "../src/literal-protection.js";

test("many opaque spans preserve order, literal bytes and normalized physical endings", () => {
  const source =
    "---\r\ntitle: 'Raw  '\r\n---\r\n\r\n" +
    Array.from(
      { length: 1500 },
      (_, index) =>
        `- <a id="${index}"></a> Value ${index}.\r\n  Continue.\r\n`,
    ).join("\r\n") +
    "\r\n`literal \r\n bytes`\r\n";
  const protectedLiterals = protectOpaqueLiterals(source, undefined, "lf");
  const printed = protectedLiterals.text.replaceAll("\r\n", "\n");
  assert.equal(
    protectedLiterals.restore(printed),
    source.replaceAll("\r\n", "\n"),
  );
  assert.equal(
    protectedLiterals.restore(printed),
    source.replaceAll("\r\n", "\n"),
  );
  const markers = protectedLiterals.text.match(/MQ_OPAQUE_[a-f0-9]+_\d+/gu);
  assert.equal(markers.length, 3002);
  assert.equal(new Set(markers).size, markers.length);
  for (const changed of [
    printed.replace(markers[1], markers[2]),
    printed + markers[1],
    printed.replace(markers[1], "missing"),
    printed.replace(`data-mq="${markers[1]}"`, `changed="${markers[1]}"`),
  ]) {
    assert.throws(() => protectedLiterals.restore(changed), {
      code: "PRESERVATION",
    });
  }
});

test("opaque restoration rejects unowned protection markers", () => {
  const source = '<a id="first"></a> Alpha.\n';
  const protectedLiterals = protectOpaqueLiterals(source, undefined, "lf");
  const marker = protectedLiterals.text.match(/MQ_OPAQUE_[a-f0-9]+_\d+/u)[0];
  assert.throws(
    () =>
      protectedLiterals.restore(
        protectedLiterals.text + marker.replace(/_0$/u, "_999"),
      ),
    { code: "PRESERVATION" },
  );
});
