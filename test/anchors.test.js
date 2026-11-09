// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createFragmentResolver } from "../src/anchors.js";

test("fragment lookups preserve namespace precedence and spelling", () => {
  const inventory = structuredClone({
    generated: ["top", "heading", "duplicate"],
    explicit: [
      ["Exact", 1],
      ["duplicate", 2],
    ],
    headings: [],
  });
  const resolve = createFragmentResolver(inventory);
  for (let repeat = 0; repeat < 3; repeat++)
    for (const [fragment, expected] of [
      ["", "resolved"],
      ["L10C2-L12", "resolved"],
      ["HEADING", "resolved"],
      ["Exact", "resolved"],
      ["exact", "missing"],
      ["duplicate", "ambiguous"],
      ["DUPLICATE", "resolved"],
      ["unknown", "missing"],
    ])
      assert.equal(resolve(fragment), expected, fragment);
});

test("resolvers own independent snapshots of mutable transport inventories", () => {
  const inventory = { generated: ["first"], explicit: [["Exact", 1]] };
  const first = createFragmentResolver(inventory);
  inventory.generated[0] = "second";
  inventory.explicit[0][1] = 2;
  const second = createFragmentResolver(inventory);
  assert.equal(first("first"), "resolved");
  assert.equal(first("second"), "missing");
  assert.equal(first("Exact"), "resolved");
  assert.equal(second("first"), "missing");
  assert.equal(second("second"), "resolved");
  assert.equal(second("Exact"), "ambiguous");
});
