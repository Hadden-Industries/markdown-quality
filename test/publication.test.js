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
import {
  publicationSteps,
  validatePublicationOrigins,
  invocation,
} from "../scripts/publication-origins.js";
import {
  preparePublicationEnvironment,
  verifyCurrentPublicationRef,
  verifyPublicationArchiveBytes,
} from "../scripts/prepare-publication-environment.js";
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
      publicationRun: "456",
      publicationAttempt: "1",
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

function recoveryFixture(t) {
  const data = fixture(t);
  const { input, manifest } = data;
  const control = "b".repeat(40);
  Object.assign(input.context, {
    head: control,
    publicationRun: "789",
    recoveryRun: "456",
    recoveryAttempt: "1",
  });
  input.currentRef.object.sha = control;
  input.previous = {
    run: {
      id: 456,
      run_attempt: 1,
      repository: { full_name: repository },
      path: ".github/workflows/publish.yml",
      event: "workflow_dispatch",
      head_branch: "main",
      head_sha: source,
      status: "completed",
      conclusion: "failure",
    },
    jobs: {
      total_count: 1,
      jobs: [
        {
          name: "publish",
          status: "completed",
          run_id: 456,
          run_attempt: 1,
          head_sha: source,
          steps: publicationSteps.map((name, index) => ({
            name,
            status: "completed",
            conclusion: index === 0 ? "failure" : "skipped",
          })),
        },
      ],
    },
    manifestBytes: readFileSync(join(input.directory, "release-manifest.json")),
    originsBytes: null,
  };
  return { ...data, control };
}

test("legacy partial publication preserves Windows origin and only plans unattempted Linux/core", (t) => {
  const { input, manifest, control } = recoveryFixture(t);
  const map = verifyPublication(input).publicationOrigins;
  assert.deepEqual(map.records, [
    {
      package: manifest.archives[0].package,
      source,
      run: "456",
      attempt: "1",
      state: "retained",
    },
    ...manifest.archives.slice(1).map((a) => ({
      package: a.package,
      source: control,
      run: "789",
      attempt: "1",
      state: "planned",
    })),
  ]);
  const env = preparePublicationEnvironment(
    manifest,
    input.manifestSha,
    map,
    input.context,
  );
  assert.equal(env.PUBLISH_WIN32_X64, "false");
  assert.equal(env.PUBLISH_LINUX_X64, "true");
  assert.equal(env.PUBLISH_CORE, "true");
  assert.equal(env.RELEASE_VERSION, "1.0.0");
});

for (const conclusion of ["success", "failure", "cancelled", "timed_out"])
  test(`an attempted ${conclusion} publication is always retained, never planned again`, (t) => {
    const { input } = recoveryFixture(t);
    input.previous.jobs.jobs[0].steps[1].conclusion = conclusion;
    const map = verifyPublication(input).publicationOrigins;
    assert.deepEqual(
      map.records.map((r) => r.state),
      ["retained", "retained", "planned"],
    );
    assert.equal(map.records[1].run, "456");
  });

const recoveryMutations = {
  "missing prior evidence": (d) => {
    d.input.previous = undefined;
  },
  "live prior publication": (d) => {
    d.input.previous.run.status = "in_progress";
  },
  "foreign prior repository": (d) => {
    d.input.previous.run.repository.full_name = "other/repository";
  },
  "different prior workflow": (d) => {
    d.input.previous.run.path = ".github/workflows/other.yml";
  },
  "different prior branch": (d) => {
    d.input.previous.run.head_branch = "topic";
  },
  "prior attempt substituted": (d) => {
    d.input.previous.run.run_attempt = 2;
  },
  "prior job attempt substituted": (d) => {
    d.input.previous.jobs.jobs[0].run_attempt = 2;
  },
  "prior job source substituted": (d) => {
    d.input.previous.jobs.jobs[0].head_sha = "c".repeat(40);
  },
  "truncated prior jobs": (d) => {
    d.input.previous.jobs.total_count = 2;
  },
  "missing effect step": (d) => {
    d.input.previous.jobs.jobs[0].steps.pop();
  },
  "duplicate effect step": (d) => {
    d.input.previous.jobs.jobs[0].steps.push({
      ...d.input.previous.jobs.jobs[0].steps[0],
    });
  },
  "unknown prior effect": (d) => {
    d.input.previous.jobs.jobs[0].steps[0].conclusion = "unknown";
  },
  "nonterminal prior effect": (d) => {
    d.input.previous.jobs.jobs[0].steps[0].status = "in_progress";
  },
  "different prior manifest": (d) => {
    d.input.previous.manifestBytes = Buffer.from("{}");
  },
  "legacy publisher at changed control source": (d) => {
    d.input.previous.run.head_sha = d.control;
    d.input.previous.jobs.jobs[0].head_sha = d.control;
  },
  "recovery of this same run": (d) => {
    d.input.context.publicationRun = "456";
  },
};
for (const [name, mutate] of Object.entries(recoveryMutations))
  test(`recovery rejects ${name}`, (t) => {
    const d = recoveryFixture(t);
    mutate(d);
    assert.throws(() => verifyPublication(d.input));
  });

test("repeated recovery keeps old retained origin and binds newly attempted package to its actual prior control", (t) => {
  const d = recoveryFixture(t);
  const prior = verifyPublication(d.input).publicationOrigins;
  const originsBytes = Buffer.from(JSON.stringify(prior));
  Object.assign(d.input.context, {
    head: "c".repeat(40),
    publicationRun: "900",
    recoveryRun: "789",
    recoveryAttempt: "1",
    recoveryOriginsSha: sha(originsBytes),
  });
  d.input.currentRef.object.sha = d.input.context.head;
  Object.assign(d.input.previous.run, { id: 789, head_sha: d.control });
  Object.assign(d.input.previous.jobs.jobs[0], {
    run_id: 789,
    head_sha: d.control,
  });
  d.input.previous.jobs.jobs[0].steps[0].conclusion = "skipped";
  d.input.previous.jobs.jobs[0].steps[1].conclusion = "failure";
  d.input.previous.originsBytes = originsBytes;
  const map = verifyPublication(d.input).publicationOrigins;
  assert.deepEqual(map.records[0], prior.records[0]);
  assert.deepEqual(map.records[1], { ...prior.records[1], state: "retained" });
  assert.equal(map.records[2].run, "900");
  assert.equal(map.records[2].source, d.input.context.head);
  d.input.context.recoveryOriginsSha = "";
  assert.throws(() => verifyPublication(d.input), /digest/u);
  d.input.context.recoveryOriginsSha = "f".repeat(64);
  assert.throws(() => verifyPublication(d.input));
});

test("origin map rejects extra, duplicate, missing and unknown fields and context drift", (t) => {
  const { input, manifest } = recoveryFixture(t);
  const map = verifyPublication(input).publicationOrigins;
  const expected = { ...map };
  delete expected.schemaVersion;
  delete expected.records;
  const bad = [
    { ...map, extra: true },
    { ...map, records: [map.records[0], map.records[0], map.records[2]] },
    { ...map, records: map.records.slice(1) },
    {
      ...map,
      records: map.records.map((r, i) => (i === 0 ? { ...r, extra: true } : r)),
    },
    { ...map, run: "999" },
    { ...map, controlSource: "d".repeat(40) },
    {
      ...map,
      records: map.records.map((r, i) =>
        i === 1 ? { ...r, state: "retained", run: map.run } : r,
      ),
    },
  ];
  for (const candidate of bad)
    assert.throws(() =>
      validatePublicationOrigins(candidate, expected, manifest.archives),
    );
  assert.throws(() =>
    preparePublicationEnvironment(manifest, input.manifestSha, map, {
      ...input.context,
      publicationAttempt: "2",
    }),
  );
  assert.throws(() =>
    preparePublicationEnvironment(manifest, input.manifestSha, map, {
      ...input.context,
      head: "d".repeat(40),
    }),
  );
});

test("publication stops if main advances after admission", () => {
  const context = {
    repository,
    event: "workflow_dispatch",
    ref: "refs/heads/main",
    workflowRef: `${repository}/.github/workflows/publish.yml@refs/heads/main`,
    head: source,
  };
  verifyCurrentPublicationRef(
    { ref: "refs/heads/main", object: { sha: source } },
    context,
  );
  assert.throws(() =>
    verifyCurrentPublicationRef(
      { ref: "refs/heads/main", object: { sha: "b".repeat(40) } },
      context,
    ),
  );
});

test("downstream archive admission rejects replacement, integrity drift and escaping filenames", (t) => {
  const { input, manifest } = fixture(t);
  verifyPublicationArchiveBytes(input.directory, manifest);
  const archive = manifest.archives[0];
  const original = readFileSync(join(input.directory, archive.filename));
  writeFileSync(join(input.directory, archive.filename), "replaced");
  assert.throws(() => verifyPublicationArchiveBytes(input.directory, manifest));
  writeFileSync(join(input.directory, archive.filename), original);
  const originalIntegrity = archive.integrity;
  archive.integrity = `sha512-${"A".repeat(86)}==`;
  assert.throws(() => verifyPublicationArchiveBytes(input.directory, manifest));
  archive.integrity = originalIntegrity;
  archive.filename = "../outside.tgz";
  assert.throws(() => verifyPublicationArchiveBytes(input.directory, manifest));
});

test("mixed provenance needs the admitted per-package source and complete invocation including attempt", () => {
  const first = provenanceFixture(),
    second = provenanceFixture();
  second.archive.package = "@hadden-industries/markdown-quality-linux-x64";
  second.audit.verified[0].name = second.archive.package;
  second.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit =
    "b".repeat(40);
  second.statement.predicate.runDetails.metadata.invocationId = `https://github.com/${repository}/actions/runs/789/attempts/2`;
  second.serialize();
  const archives = [first.archive, second.archive];
  const audit = {
    invalid: [],
    missing: [],
    verified: [...first.audit.verified, ...second.audit.verified],
  };
  assert.throws(() => verifyReleaseProvenance(audit, archives, first.expected));
  const expected = {
    ...first.expected,
    publicationOrigins: {
      records: [
        { package: first.archive.package, source, run: "456", attempt: "1" },
        {
          package: second.archive.package,
          source: "b".repeat(40),
          run: "789",
          attempt: "2",
        },
      ],
    },
  };
  assert.deepEqual(
    verifyReleaseProvenance(audit, archives, expected).map((r) => r.invocation),
    expected.publicationOrigins.records.map(invocation),
  );
  expected.publicationOrigins.records[1].attempt = "1";
  assert.throws(() => verifyReleaseProvenance(audit, archives, expected));
});

test("ordinary releases retain strict same-source and common invocation admission", (t) => {
  const { input } = fixture(t);
  const map = verifyPublication(input).publicationOrigins;
  assert.equal(map.recovery, null);
  assert.ok(
    map.records.every(
      (r) =>
        r.source === source &&
        r.run === "456" &&
        r.attempt === "1" &&
        r.state === "planned",
    ),
  );
  input.context.recoveryAttempt = "1";
  assert.throws(() => verifyPublication(input));
});

test("only the publisher has OIDC and original effect names remain stable with conditional single publishes", () => {
  const text = readFileSync(
    new URL("../.github/workflows/publish.yml", import.meta.url),
    "utf8",
  );
  const publisher = text.slice(
    text.indexOf("  publish:\n"),
    text.indexOf("  registry:\n"),
  );
  assert.equal((text.match(/id-token: write/gu) || []).length, 1);
  assert.match(publisher, /id-token: write/u);
  assert.equal((publisher.match(/npm publish /gu) || []).length, 3);
  for (const name of publicationSteps)
    assert.ok(publisher.includes(`- name: ${name}\n`));
  for (const key of ["WIN32_X64", "LINUX_X64", "CORE"])
    assert.ok(publisher.includes(`if: env.PUBLISH_${key} == 'true'`));
  assert.equal(
    (publisher.match(/wait-registry-integrity.js --absent/gu) || []).length,
    3,
  );
  assert.equal(
    (publisher.match(/--current-ref provider\/current-ref.json/gu) || [])
      .length,
    3,
  );
  assert.ok(
    publisher.indexOf("--native-only") <
      publisher.indexOf("- name: Publish coherent core under pilot"),
  );
  assert.ok(!text.includes("--tag latest"));
  assert.ok(!text.includes("npm pack"));
  const registry = text.slice(text.indexOf("  registry:\n"));
  assert.ok(
    registry.includes(
      "    if: ${{ !cancelled() && needs.publish.result == 'success' }}\n",
    ),
    "Registry qualification must survive skipped recovery ancestors, require publication success and honor cancellation",
  );
  assert.ok(!registry.includes("id-token: write"));
});
