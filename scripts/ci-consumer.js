// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { nodeSupport } from "./node-matrix.js";
import { createHash } from "node:crypto";
import { supportsPython } from "./python-target.js";

/** Admission is independent of presentation and requires both actual installations. */
export function validateConsumer(
  report,
  {
    source,
    node,
    os,
    qualification = "transported candidate archives",
    policy = nodeSupport,
  },
) {
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.passed, true);
  assert.equal(report.candidate, source);
  assert.equal(report.node, `v${node}`);
  assert.equal(report.npm, policy.consumerNpm);
  assert.equal(report.qualification, qualification);
  assert.equal(
    report.platform,
    os.startsWith("windows") ? "win32-x64" : "linux-x64",
  );
  assert.match(report.manifestSha256, /^[a-f0-9]{64}$/u);
  assert.equal(report.archives.length, 3);
  assert.deepEqual(report.archives.map((a) => a.package).sort(), [
    "@hadden-industries/markdown-quality",
    "@hadden-industries/markdown-quality-linux-x64",
    "@hadden-industries/markdown-quality-win32-x64",
  ]);
  for (const archive of report.archives)
    assert.match(archive.sha256, /^[a-f0-9]{64}$/u);
  const layouts = report.records.filter((record) =>
    Object.hasOwn(record, "layout"),
  );
  assert.deepEqual(layouts.map((record) => record.layout).sort(), [
    "isolated",
    "root",
  ]);
  for (const layout of layouts) {
    assert.equal(layout.platform, report.platform);
    assert.equal(layout.installedVersion, report.version);
    for (const key of [
      "allInstalledFileHashesVerified",
      "offlineFrozenLockReinstall",
      "credentialFreeOfflineRuntime",
      "unchangedDocumentAndConvergentFormatting",
    ])
      assert.equal(layout[key], true, `Missing ${layout.layout} ${key}`);
    assert.equal(
      layout.frozenTransportedArchiveInstall,
      qualification === "transported candidate archives",
    );
    assert.equal(layout.lifecycleScripts, "disabled");
    assert.match(layout.lockSha256, /^[a-f0-9]{64}$/u);
    assert.ok(layout.runtimeQualification);
    assert.equal(
      layout.evidence.filename,
      `${layout.layout}-qualification.json`,
    );
    assert.match(layout.evidence.sha256, /^[a-f0-9]{64}$/u);
    const { evidence, ...record } = layout;
    assert.equal(
      createHash("sha256")
        .update(
          // json-identity-contract: bytes; owner: qualify-public-registry layout writer; reason: Reconstruct the exact LF wire envelope whose separate file was hashed before upload, retaining its recorded key order.
          JSON.stringify({
            schemaVersion: 1,
            candidate: source,
            node: `v${node}`,
            ...record,
          }) + "\n",
        )
        .digest("hex"),
      evidence.sha256,
      "Layout evidence does not bind its own attributed result",
    );
  }
  if (
    node === policy.reference &&
    qualification === "transported candidate archives"
  ) {
    assert.equal(report.performance?.schemaVersion, 1);
    assert.ok(
      supportsPython(report.performance.python),
      "Missing or unsupported corpus Python identity",
    );
    assert.deepEqual(Object.keys(report.performance.corpora).sort(), [
      "owlapi",
      "webvowl",
    ]);
    for (const corpus of Object.values(report.performance.corpora)) {
      assert.equal(corpus.observations.length, 6);
      assert.equal(corpus.completeDiagnosticAndSelectedSourceParity, true);
      assert.ok(
        Number.isFinite(corpus.observedP95Ms) &&
          corpus.observedP95Ms > 0 &&
          corpus.observedP95Ms <= 30000,
      );
      assert.ok(
        Number.isSafeInteger(corpus.peakTreeBytes) &&
          corpus.peakTreeBytes > 0 &&
          corpus.peakTreeBytes <= 536870912,
      );
      for (const sample of corpus.observations)
        assert.equal(sample.activeDescendants, 0);
    }
  }
  return report;
}
