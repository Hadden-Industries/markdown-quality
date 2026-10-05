// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";

// Interpret only npm audit signatures' successful, cryptographically verified
// output. npm/pacote owns certificate, transparency-log, signature, package PURL
// and tarball-integrity verification; this adds the required release-origin gate.
export function verifyReleaseProvenance(audit, archives, expected) {
  assert.deepEqual(audit.invalid, []);
  assert.deepEqual(audit.missing, []);
  assert.ok(Array.isArray(audit.verified));
  const records = [];
  for (const archive of archives) {
    const matches = audit.verified.filter(
      (record) =>
        record.name === archive.package && record.version === expected.version,
    );
    assert.equal(
      matches.length,
      1,
      `Missing or duplicate verified provenance: ${archive.package}`,
    );
    const record = matches[0];
    assert.equal(record.registry, "https://registry.npmjs.org/");
    const bundles = record.attestationBundles.filter(
      (entry) => entry.predicateType === "https://slsa.dev/provenance/v1",
    );
    assert.equal(
      bundles.length,
      1,
      "Expected one verified GitHub SLSA v1 provenance statement",
    );
    const statement = JSON.parse(
      Buffer.from(bundles[0].bundle.dsseEnvelope.payload, "base64").toString(
        "utf8",
      ),
    );
    assert.equal(statement._type, "https://in-toto.io/Statement/v1");
    assert.equal(statement.predicateType, "https://slsa.dev/provenance/v1");
    const definition = statement.predicate.buildDefinition;
    assert.equal(
      definition.buildType,
      "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
    );
    assert.deepEqual(definition.externalParameters.workflow, {
      ref: "refs/heads/main",
      repository: "https://github.com/Hadden-Industries/markdown-quality",
      path: ".github/workflows/publish.yml",
    });
    assert.deepEqual(definition.resolvedDependencies, [
      {
        uri: "git+https://github.com/Hadden-Industries/markdown-quality@refs/heads/main",
        digest: { gitCommit: expected.source },
      },
    ]);
    assert.equal(
      definition.internalParameters.github.event_name,
      "workflow_dispatch",
    );
    assert.equal(
      statement.predicate.runDetails.builder.id,
      "https://github.com/actions/runner/github-hosted",
    );
    const invocation = statement.predicate.runDetails.metadata.invocationId;
    assert.match(
      invocation,
      /^https:\/\/github\.com\/Hadden-Industries\/markdown-quality\/actions\/runs\/[1-9]\d*\/attempts\/[1-9]\d*$/u,
    );
    if (expected.publicationRun)
      assert.equal(invocation.split("/")[7], String(expected.publicationRun));
    records.push({
      package: archive.package,
      version: expected.version,
      source: expected.source,
      invocation,
      cryptographicVerifier: "npm audit signatures",
    });
  }
  assert.equal(
    new Set(records.map((record) => record.invocation)).size,
    1,
    "The release tuple must share one publication run/attempt",
  );
  return records;
}
