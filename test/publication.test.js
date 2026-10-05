// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyPublication } from "../scripts/verify-publication.js";
import { verifyReleaseProvenance } from "../scripts/provenance.js";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const source = "a".repeat(40);
const repository = "Hadden-Industries/markdown-quality";
function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "publication-boundary-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "source"),
    directory = join(temporary, "archives");
  mkdirSync(join(root, "assets"), { recursive: true });
  mkdirSync(directory);
  const metadata = {
    name: "@hadden-industries/markdown-quality",
    version: "1.0.0",
    license: "AGPL-3.0-only",
    publishConfig: { access: "public" },
  };
  writeFileSync(join(root, "package.json"), JSON.stringify(metadata));
  writeFileSync(join(root, "package-lock.json"), "{}\n");
  writeFileSync(
    join(root, "LICENSE"),
    readFileSync(new URL("../LICENSE", import.meta.url)),
  );
  const native = { fixture: "approved native identity" };
  writeFileSync(
    join(root, "assets/tool-manifest.json"),
    JSON.stringify(native),
  );
  writeFileSync(join(directory, "source-sbom.cdx.json"), "{}\n");
  const archives = ["win32-x64", "linux-x64", "core"].map((name) => {
    const packageName = metadata.name + (name === "core" ? "" : `-${name}`);
    const filename = packageName.slice(1).replace("/", "-") + "-1.0.0.tgz";
    const bytes = Buffer.from(`OPAQUE QUALIFIED ARCHIVE FIXTURE ${name}`);
    writeFileSync(join(directory, filename), bytes);
    const digest = sha(bytes);
    return {
      name,
      package: packageName,
      filename,
      version: "1.0.0",
      sha256: digest,
      integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      ...(name === "linux-x64"
        ? {
            executableMode: {
              mode: "0o755",
              allMemberBytesPreserved: true,
              sha256: digest,
            },
          }
        : {}),
    };
  });
  const manifest = {
    version: "1.0.0",
    source: {
      head: source,
      clean: true,
      lockSha256: sha(readFileSync(join(root, "package-lock.json"))),
    },
    sourcePackageDigest: sha(readFileSync(join(root, "package.json"))),
    native,
    build: { lifecycleScripts: "disabled" },
    sbom: {
      filename: "source-sbom.cdx.json",
      sha256: sha(readFileSync(join(directory, "source-sbom.cdx.json"))),
    },
    archives,
  };
  const serialize = () => {
    const bytes = Buffer.from(JSON.stringify(manifest));
    writeFileSync(join(directory, "release-manifest.json"), bytes);
    input.manifestSha = sha(bytes);
  };
  const run = {
    id: 123,
    run_attempt: 1,
    repository: { full_name: repository },
    event: "push",
    path: ".github/workflows/candidate.yml",
    head_branch: "main",
    head_sha: source,
    status: "completed",
    conclusion: "success",
  };
  const input = {
    root,
    directory,
    run,
    jobs: {
      total_count: 3,
      jobs: [
        "pack",
        "consumer (windows-latest)",
        "consumer (ubuntu-24.04)",
      ].map((name) => ({
        name,
        head_sha: source,
        status: "completed",
        conclusion: "success",
        run_id: 123,
        run_attempt: 1,
      })),
    },
    currentRef: { ref: "refs/heads/main", object: { sha: source } },
    environment: {
      name: "npm-publication",
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    },
    branches: {
      total_count: 1,
      branch_policies: [{ name: "main", type: "branch" }],
    },
    context: {
      repository,
      event: "workflow_dispatch",
      ref: "refs/heads/main",
      workflowRef: `${repository}/.github/workflows/publish.yml@refs/heads/main`,
      head: source,
      runId: "123",
    },
  };
  serialize();
  return { input, manifest, serialize };
}
test("exact qualified opaque tuple is admitted without extraction or execution", (t) => {
  const { input } = fixture(t);
  assert.equal(verifyPublication(input).version, "1.0.0");
});
const mutations = {
  "different repository": ({ input }) => {
    input.run.repository.full_name = "other/project";
  },
  "candidate PR event": ({ input }) => {
    input.run.event = "pull_request";
  },
  "different trusted workflow": ({ input }) => {
    input.run.path = ".github/workflows/other.yml";
  },
  "skipped platform job": ({ input }) => {
    input.jobs.jobs[1].conclusion = "skipped";
  },
  "omitted platform job": ({ input }) => {
    input.jobs.jobs.pop();
  },
  "duplicate platform job": ({ input }) => {
    input.jobs.jobs[1].name = input.jobs.jobs[2].name;
  },
  "job from old attempt": ({ input }) => {
    input.jobs.jobs[1].run_attempt = 2;
  },
  "candidate head mismatch": ({ input }) => {
    input.run.head_sha = "b".repeat(40);
  },
  "default branch advanced": ({ input }) => {
    input.currentRef.object.sha = "b".repeat(40);
  },
  "unrestricted environment": ({ input }) => {
    input.environment.deployment_branch_policy = null;
  },
  "same-named tag permitted": ({ input }) => {
    input.branches.branch_policies[0].type = "tag";
  },
  "extra branch permitted": ({ input }) => {
    input.branches.total_count = 2;
    input.branches.branch_policies.push({ name: "*", type: "branch" });
  },
  "publication from topic branch": ({ input }) => {
    input.context.ref = "refs/heads/topic";
  },
  "different manifest digest": ({ input }) => {
    input.manifestSha = "0".repeat(64);
  },
  "archive traversal": ({ manifest }) => {
    manifest.archives[0].filename = "../outside.tgz";
  },
  "archive replaced": ({ input, manifest }) => {
    writeFileSync(
      join(input.directory, manifest.archives[0].filename),
      "replacement",
    );
  },
  "uncoordinated core version": ({ manifest }) => {
    manifest.archives[2].version = "1.0.1";
  },
  "unclean packed source": ({ manifest }) => {
    manifest.source.clean = false;
  },
  "source lock drift": ({ input }) => {
    writeFileSync(join(input.root, "package-lock.json"), '{"drift":true}');
  },
  "native asset drift": ({ input }) => {
    writeFileSync(
      join(input.root, "assets/tool-manifest.json"),
      '{"changed":true}',
    );
  },
  "Linux executable mode lost": ({ manifest }) => {
    manifest.archives[1].executableMode.mode = "0o644";
  },
  "SBOM substituted": ({ input }) => {
    writeFileSync(
      join(input.directory, "source-sbom.cdx.json"),
      '{"changed":true}',
    );
  },
};
for (const [name, mutate] of Object.entries(mutations))
  test(`publication rejects ${name}`, (t) => {
    const data = fixture(t);
    mutate(data);
    data.serialize();
    if (name === "different manifest digest")
      data.input.manifestSha = "0".repeat(64);
    assert.throws(() => verifyPublication(data.input));
  });

// Structural fixtures represent native npm's verified output. They do not claim
// that their dummy envelopes have real signatures or execute the crypto verifier.
function provenanceFixture() {
  const expected = { version: "1.0.0", source, publicationRun: 456 };
  const archive = { package: "@hadden-industries/markdown-quality" };
  const statement = {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            ref: "refs/heads/main",
            repository: `https://github.com/${repository}`,
            path: ".github/workflows/publish.yml",
          },
        },
        resolvedDependencies: [
          {
            uri: `git+https://github.com/${repository}@refs/heads/main`,
            digest: { gitCommit: source },
          },
        ],
        internalParameters: { github: { event_name: "workflow_dispatch" } },
      },
      runDetails: {
        builder: { id: "https://github.com/actions/runner/github-hosted" },
        metadata: {
          invocationId: `https://github.com/${repository}/actions/runs/456/attempts/1`,
        },
      },
    },
  };
  const audit = {
    invalid: [],
    missing: [],
    verified: [
      {
        name: archive.package,
        version: "1.0.0",
        registry: "https://registry.npmjs.org/",
        attestationBundles: [],
      },
    ],
  };
  const serialize = () => {
    audit.verified[0].attestationBundles = [
      {
        predicateType: statement.predicateType,
        bundle: {
          dsseEnvelope: {
            payload: Buffer.from(JSON.stringify(statement)).toString("base64"),
          },
        },
      },
    ];
  };
  serialize();
  return { expected, archive, statement, audit, serialize };
}
test("verified native provenance is bound to publication source and run", () => {
  const data = provenanceFixture();
  assert.equal(
    verifyReleaseProvenance(data.audit, [data.archive], data.expected)[0]
      .source,
    source,
  );
});
const provenanceMutations = {
  "missing native verification": (data) => {
    data.audit.verified = [];
  },
  "invalid native signature": (data) => {
    data.audit.invalid.push({ code: "EATTESTATIONVERIFY" });
  },
  "different source commit": (data) => {
    data.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit =
      "b".repeat(40);
  },
  "different workflow": (data) => {
    data.statement.predicate.buildDefinition.externalParameters.workflow.path =
      ".github/workflows/evil.yml";
  },
  "topic workflow reference": (data) => {
    data.statement.predicate.buildDefinition.externalParameters.workflow.ref =
      "refs/heads/topic";
  },
  "different publication run": (data) => {
    data.expected.publicationRun = 457;
  },
  "unsupported provenance version": (data) => {
    data.statement.predicateType = "https://slsa.dev/provenance/v0.2";
  },
};
for (const [name, mutate] of Object.entries(provenanceMutations))
  test(`provenance rejects ${name}`, () => {
    const data = provenanceFixture();
    mutate(data);
    if (data.audit.verified.length) data.serialize();
    assert.throws(() =>
      verifyReleaseProvenance(data.audit, [data.archive], data.expected),
    );
  });
