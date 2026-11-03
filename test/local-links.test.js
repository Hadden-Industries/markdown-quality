// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runQuality } from "../src/quality.js";
import {
  loadConfiguration,
  recheckObservations,
} from "../src/configuration.js";
import { createLinkGraph } from "../src/link-graph.js";
import { consumer } from "./helpers.js";

const findings = (report, rules) =>
  report.diagnostics
    .filter((d) => rules.includes(d.rule))
    .map((d) => `${d.path}:${d.line}:${d.rule}`);
const linkRules = [
  "quality/unresolved-local-fragment",
  "quality/local-path-case-mismatch",
  "local-target",
];

// Expected anchors are hand-derived from the documented model: github-slugger
// lowercases, drops most punctuation and suffixes duplicates in source order.
const target = [
  "# Install",
  "",
  "## Install",
  "",
  "## Café menu",
  "",
  '<a id="Exact"></a>',
  "",
  '<span id="twice"></span> <span id="twice"></span>',
  "",
].join("\n");

test("cross-document fragments resolve against one shared anchor model", async (t) => {
  const links = [
    "[a](b.md#install)",
    "[b](b.md#install-1)",
    "[c](b.md#INSTALL)",
    "[d](b.md#caf%C3%A9-menu)",
    "[e](b.md#café-menu)",
    "[f](b.md#Exact)",
    "[g](b.md#exact)",
    "[h](b.md#twice)",
    "[i](b.md#missing)",
    "[j](b.md#top)",
    "[k](b.md#L10-L12)",
    "[l](b.md#)",
    "[m](b.md#%E0%A4%A)",
  ];
  const root = consumer(t, {
    "a.md": "# A\n\n" + links.map((link) => `- ${link}`).join("\n") + "\n",
    "b.md": target,
  });
  const report = await runQuality({ root });
  assert.deepEqual(findings(report, linkRules), [
    "a.md:9:quality/unresolved-local-fragment",
    "a.md:10:quality/unresolved-local-fragment",
    "a.md:11:quality/unresolved-local-fragment",
    "a.md:15:quality/unresolved-local-fragment",
  ]);
  const ambiguous = report.diagnostics.find((d) => d.line === 10);
  assert.match(ambiguous.message, /more than one explicit anchor/u);
  assert.deepEqual(report.selection.readDependencies, []);
});

test("same-document fragments use the package rule and remain on without filesystem checks", async (t) => {
  const root = consumer(
    t,
    {
      "a.md": "# A\n\n## Part\n\n[ok](#part) [bad](#nowhere) [file](gone.md)\n",
    },
    { links: { checkLocalTargets: false } },
  );
  const report = await runQuality({ root });
  assert.deepEqual(findings(report, linkRules), [
    "a.md:5:quality/unresolved-local-fragment",
  ]);
  // The overlapping upstream rule is off by default but remains selectable.
  assert.equal(
    report.configuration.lint["markdown/no-missing-link-fragments"],
    "off",
  );
  const upstream = consumer(
    t,
    { "a.md": "# A\n\n[bad](#nowhere)\n" },
    { lint: { "markdown/no-missing-link-fragments": "error" } },
  );
  const both = await runQuality({ root: upstream });
  assert.deepEqual(both.diagnostics.map((d) => d.rule).sort(), [
    "markdown/no-missing-link-fragments",
    "quality/unresolved-local-fragment",
  ]);
});

test("excluded targets are read as dependencies only, once, without recursive crawl", async (t) => {
  const root = consumer(
    t,
    {
      "a.md":
        "# A\n\n[one](notes/b.md#b) [two](notes/b.md#b) [bad](notes/b.md#x)\n",
      // b links back to a and contains its own broken link; it is not linted.
      "notes/b.md": "# B\n\n[back](../a.md#a) [broken](missing.md)\n",
    },
    { exclude: ["notes/**"] },
  );
  const report = await runQuality({ root });
  assert.deepEqual(report.selection.files, ["a.md"]);
  assert.deepEqual(report.selection.readDependencies, ["notes/b.md"]);
  assert.deepEqual(findings(report, linkRules), [
    "a.md:3:quality/unresolved-local-fragment",
  ]);
});

test("path components require exact directory-entry spelling on every platform", async (t) => {
  const root = consumer(t, {
    "a.md":
      "# A\n\n[case](Docs/B.md) [ok](docs/B.md) [asset](docs/data.TXT#frag)\n",
    "docs/B.md": "# B\n",
    "docs/data.txt": "data\n",
  });
  const report = await runQuality({ root });
  const mismatches = report.diagnostics.filter(
    (d) => d.rule === "quality/local-path-case-mismatch",
  );
  assert.deepEqual(
    mismatches.map((d) => [d.line, d.column]),
    [
      [3, 1],
      [3, 35],
    ],
  );
  assert.match(mismatches[0].message, /expected docs\/B\.md/u);
  assert.match(mismatches[1].message, /expected docs\/data\.txt/u);
  assert.equal(findings(report, ["local-target"]).length, 0);
});

test("dependency ceilings and freshness are enforced for link targets", async (t) => {
  const root = consumer(
    t,
    {
      "a.md": "# A\n\n[b](x/b.md#b) [c](x/c.md#c)\n",
      "x/b.md": "# B\n",
      "x/c.md": "# C\n",
    },
    { exclude: ["x/**"] },
  );
  const limited = await runQuality({
    root,
    analyzerLimits: { maxReadDependencyDocuments: 1 },
  });
  assert.equal(limited.exitCode, 2);
  assert.equal(limited.errors[0].code, "DEPENDENCY_LIMIT");
  const admitted = await runQuality({
    root,
    analyzerLimits: { maxReadDependencyDocuments: 2 },
  });
  assert.equal(admitted.exitCode, 0, JSON.stringify(admitted.diagnostics));
  assert.deepEqual(admitted.selection.readDependencies, ["x/b.md", "x/c.md"]);
  // A dependency changing between capture and the final verdict fails closed:
  // the graph's captured observation no longer matches the file.
  const context = loadConfiguration({ root });
  const graph = createLinkGraph(context, { admitBytes() {} });
  graph.addDocument("a.md", { generated: [], explicit: [], headings: [] }, [
    { target: "x/b.md", fragment: "b", line: 3, column: 1 },
  ]);
  const found = [];
  graph.resolve((diagnostic) => found.push(diagnostic));
  assert.deepEqual(found, []);
  assert.deepEqual(graph.readDependencies, ["x/b.md"]);
  recheckObservations(graph.observations);
  writeFileSync(join(root, "x/b.md"), "# Changed\n");
  assert.throws(
    () => recheckObservations(graph.observations),
    (error) => error.code === "DEPENDENCY_CHANGED",
  );
});
