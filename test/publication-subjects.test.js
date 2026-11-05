// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicationHistoryFixture } from "./publication-history-fixture.js";
import { downloadEvidence } from "../scripts/download-evidence.js";
import {
  readPublicationHistory,
  verifyPublicationHistory,
} from "../scripts/publication-history.js";
import {
  publicationSubject,
  readPublicationSubjects,
  readArchivedPublicationSubjects,
} from "../scripts/publication-subjects.js";

function publisher(id, source, conclusion = "success") {
  const f = publicationHistoryFixture(1);
  Object.assign(f.run, {
    id,
    head_sha: source.repeat(40),
    status: "completed",
    conclusion,
  });
  f.attempts[0].run = { ...f.run };
  f.set(1, [f.job(1, conclusion)]);
  return f;
}
function setup({ oldVersion = "1.0.0", order = "recent" } = {}) {
  const current = publisher(44, "d");
  current.run.status = "in_progress";
  current.run.conclusion = null;
  current.attempts[0].run = { ...current.run };
  current.set(1, []);
  const old = publisher(11, "a", "failure"),
    owner = publisher(22, "b");
  const original = Buffer.from(JSON.stringify({ version: oldVersion }));
  const own = Buffer.from('{"version":"2.0.0"}');
  const cached = {
    run: structuredClone(old.run),
    attempts: structuredClone(old.attempts),
    manifestSha256: publicationSubject(original).manifestSha256,
  };
  let receipt = {
    schemaVersion: 1,
    run: "22",
    attempt: "1",
    manifestSha256: publicationSubject(own).manifestSha256,
    history: [cached],
  };
  let snapshot = [{ ...cached, manifestBytes: original.toJSON() }];
  const downloads = [];
  const gh = (args) => {
    if (args[1].includes("workflows/publish.yml/runs"))
      return JSON.stringify([
        {
          total_count: 3,
          workflow_runs: (order === "recent"
            ? [current, owner, old]
            : [old, current, owner]
          ).map((f) => f.run),
        },
      ]);
    const match =
      /runs\/(\d+)(?:\/attempts\/(\d+))?(\/jobs\?per_page=100)?$/u.exec(
        args[1],
      );
    assert.ok(match, args[1]);
    const f = [current, old, owner].find((f) => f.run.id === Number(match[1]));
    return JSON.stringify(
      match[3]
        ? f.attempts[Number(match[2]) - 1].jobs
        : match[2]
          ? f.attempts[Number(match[2]) - 1].run
          : f.run,
    );
  };
  const download = async ({ run, destination }) => {
    downloads.push(run.id);
    if (run.id === 11)
      throw Object.assign(new Error("Original artifact is absent"), {
        code: "PUBLICATION_ARTIFACT_MISSING",
      });
    mkdirSync(join(destination, "frozen-release"), { recursive: true });
    mkdirSync(join(destination, "provider"));
    writeFileSync(
      join(destination, "frozen-release/release-manifest.json"),
      own,
    );
    writeFileSync(
      join(destination, "provider/publication-history.json"),
      JSON.stringify(receipt),
    );
    writeFileSync(
      join(destination, "provider/staging-history.json"),
      JSON.stringify(snapshot),
    );
  };
  const collect = () =>
    readPublicationHistory(44, gh, download, {
      version: "3.0.0",
      archives: () => [],
    });
  return {
    current,
    old,
    owner,
    cached,
    receipt,
    snapshot,
    downloads,
    gh,
    download,
    collect,
  };
}

for (const order of ["recent", "oldest"])
  test(`version scoping reuses authenticated original subjects with ${order} provider ordering`, async () => {
    const f = setup({ order });
    const history = await f.collect();
    assert.deepEqual(f.downloads, order === "recent" ? [22] : [11, 22]);
    const old = history.find((e) => e.run.id === 11);
    assert.equal(old.manifestBytes, undefined);
    assert.equal(old.subject.version, "1.0.0");
    verifyPublicationHistory(
      { version: "3.0.0", archives: [] },
      {
        run: "44",
        attempt: "1",
        controlSource: f.current.run.head_sha,
        records: [],
      },
      history,
    );
    // A serialized or forged scalar cannot grant the collector's live admission.
    assert.throws(
      () =>
        verifyPublicationHistory(
          { version: "3.0.0", archives: [] },
          {
            run: "44",
            attempt: "1",
            controlSource: f.current.run.head_sha,
            records: [],
          },
          history.map((entry) => (entry === old ? { ...entry } : entry)),
        ),
      /Missing prior manifest/u,
    );
  });

test("same-version subjects still require the original full publication artifact", async () => {
  const f = setup({ oldVersion: "3.0.0" });
  await assert.rejects(f.collect, /Original artifact is absent/u);
  assert.deepEqual(f.downloads, [22, 11]);
});

test("unclassified attempts and provider corruption remain finite refusals", async () => {
  const unknown = setup();
  unknown.receipt.history.length = 0;
  unknown.snapshot.length = 0;
  await assert.rejects(unknown.collect, /Original artifact is absent/u);
  const corrupt = setup();
  await assert.rejects(
    () =>
      readPublicationHistory(
        44,
        corrupt.gh,
        async () => {
          throw new Error("Provider digest mismatch");
        },
        {
          version: "3.0.0",
          archives: () => assert.fail("Digest failures cannot fall back"),
        },
      ),
    /Provider digest mismatch/u,
  );
});

for (const fault of [
  "new attempt",
  "changed execution",
  "changed steps",
  "contradictory subject",
  "wrong digest",
  "invalid byte",
])
  test(`retained subjects refuse ${fault}`, async () => {
    const f = setup();
    if (fault === "new attempt") {
      const replacement = publisher(11, "a", "failure");
      f.old.run.run_attempt = 2;
      f.old.attempts.push({
        run: { ...f.old.run },
        jobs: {
          total_count: 1,
          jobs: [{ ...replacement.job(2, "skipped"), run_attempt: 2 }],
        },
      });
    }
    if (fault === "changed execution")
      f.old.attempts[0].jobs.jobs[0].runner_id += 1;
    if (fault === "changed steps") {
      f.snapshot[0] = {
        ...f.snapshot[0],
        attempts: structuredClone(f.snapshot[0].attempts),
      };
      f.snapshot[0].attempts[0].jobs.jobs[0].steps[0].conclusion = "success";
    }
    if (fault === "contradictory subject")
      f.cached.subject = {
        version: "3.0.0",
        manifestSha256: f.cached.manifestSha256,
      };
    if (fault === "wrong digest") f.cached.manifestSha256 = "f".repeat(64);
    if (fault === "invalid byte") f.snapshot[0].manifestBytes.data[0] = 256;
    await assert.rejects(f.collect);
  });

test("compact receipts retain verifiable version bindings without original manifest buffers", () => {
  const root = mkdtempSync(join(tmpdir(), "publication-subject-"));
  try {
    const f = setup();
    mkdirSync(join(root, "provider"));
    f.cached.subject = {
      version: "1.0.0",
      manifestSha256: f.cached.manifestSha256,
    };
    writeFileSync(
      join(root, "provider/publication-history.json"),
      JSON.stringify(f.receipt),
    );
    const subjects = readPublicationSubjects(
      root,
      { run: f.owner.run, attempt: 1 },
      Buffer.from('{"version":"2.0.0"}'),
    );
    assert.equal(subjects[0].subject.version, "1.0.0");
    f.receipt.history.push(f.cached);
    writeFileSync(
      join(root, "provider/publication-history.json"),
      JSON.stringify(f.receipt),
    );
    assert.throws(
      () =>
        readPublicationSubjects(
          root,
          { run: f.owner.run, attempt: 1 },
          Buffer.from('{"version":"2.0.0"}'),
        ),
      /strictly equal/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const fault of [
  "valid",
  "mutable",
  "wrong digest",
  "native verification",
  "missing asset",
])
  test(`immutable archive subjects enforce ${fault} evidence`, () => {
    const root = mkdtempSync(join(tmpdir(), "publication-archive-"));
    try {
      const f = setup();
      const manifest = Buffer.from('{"version":"2.0.0"}');
      f.cached.subject = {
        version: "1.0.0",
        manifestSha256: f.cached.manifestSha256,
      };
      const payloads = new Map([
        ["release-manifest.json", manifest],
        ["publication-history.json", Buffer.from(JSON.stringify(f.receipt))],
        ["staging-provider.json", Buffer.from(JSON.stringify(f.owner))],
      ]);
      const release = {
        id: 123,
        tag_name: "v2.0.0",
        draft: false,
        immutable: true,
        assets: [...payloads].map(([name, bytes]) => ({
          name,
          size: bytes.length,
          digest: `sha256:${publicationSubjectDigest(bytes)}`,
        })),
      };
      const verified = [];
      if (fault === "mutable") release.immutable = false;
      if (fault === "wrong digest")
        release.assets[0].digest = `sha256:${"f".repeat(64)}`;
      if (fault === "missing asset")
        release.assets = release.assets.filter(
          (asset) => asset.name !== "staging-provider.json",
        );
      const gh = (args) => {
        if (args[0] === "api") return JSON.stringify([[release]]);
        if (args[1] === "download")
          writeFileSync(
            join(args.at(-1), args[args.indexOf("--pattern") + 1]),
            payloads.get(args[args.indexOf("--pattern") + 1]),
          );
        else {
          verified.push(args[1]);
          if (fault === "native verification" && args[1] === "verify-asset")
            throw new Error("Native attestation verification failed");
        }
        return "{}";
      };
      if (!["valid", "mutable"].includes(fault)) {
        assert.throws(() => readArchivedPublicationSubjects(gh, root));
        return;
      }
      const subjects = readArchivedPublicationSubjects(gh, root);
      if (fault === "mutable") {
        assert.deepEqual(subjects, []);
        assert.deepEqual(verified, []);
        return;
      }
      assert.deepEqual(
        subjects.map((s) => s.subject.version),
        ["1.0.0", "2.0.0"],
      );
      assert.deepEqual(verified, [
        "verify",
        "verify-asset",
        "verify-asset",
        "verify-asset",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

import { createHash } from "node:crypto";
const publicationSubjectDigest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

for (const fault of ["unchanged", "digest", "size"])
  test(`post-transfer expiration preserves ${fault} metadata identity`, async () => {
    const bytes = Buffer.from(
      "provider payload whose extraction must never start",
    );
    const metadata = {
      id: 7,
      expired: false,
      digest: `sha256:${publicationSubjectDigest(bytes)}`,
      size_in_bytes: bytes.length,
      workflow_run: {
        id: 11,
        repository_id: 3,
        head_repository_id: 3,
        head_sha: "a".repeat(40),
      },
    };
    let reads = 0;
    await assert.rejects(
      () =>
        downloadEvidence({
          id: 7,
          destination: "unused",
          runId: 11,
          repositoryId: 3,
          headSha: "a".repeat(40),
          read: async (path) => {
            if (path.endsWith("/zip")) return bytes;
            if (++reads === 1) return metadata;
            return {
              ...metadata,
              expired: true,
              ...(fault === "digest"
                ? { digest: `sha256:${"f".repeat(64)}` }
                : {}),
              ...(fault === "size" ? { size_in_bytes: bytes.length + 1 } : {}),
            };
          },
        }),
      (error) =>
        fault === "unchanged"
          ? error.code === "EVIDENCE_ARTIFACT_EXPIRED"
          : error.code !== "EVIDENCE_ARTIFACT_EXPIRED",
    );
    assert.equal(reads, 2);
  });

for (const oldVersion of ["1.0.0", "3.0.0"])
  test(`authenticated expired ${oldVersion} history retains version scoping and same-version refusal`, async () => {
    const f = setup({ order: "oldest", oldVersion });
    const download = async (input) => {
      if (input.run.id !== 11) return f.download(input);
      return downloadEvidence({
        id: 7,
        destination: input.destination,
        runId: 11,
        repositoryId: 3,
        headSha: f.old.run.head_sha,
        read: async (path) => {
          assert.equal(path, "/actions/artifacts/7");
          return {
            id: 7,
            expired: true,
            digest: `sha256:${"a".repeat(64)}`,
            size_in_bytes: 100,
            workflow_run: {
              id: 11,
              repository_id: 3,
              head_repository_id: 3,
              head_sha: f.old.run.head_sha,
            },
          };
        },
      });
    };
    const collect = () =>
      readPublicationHistory(44, f.gh, download, {
        version: "3.0.0",
        archives: () => [],
      });
    if (oldVersion === "1.0.0")
      assert.equal(
        (await collect()).find((entry) => entry.run.id === 11).subject.version,
        "1.0.0",
      );
    else await assert.rejects(collect, { code: "EVIDENCE_ARTIFACT_EXPIRED" });
  });

for (const fault of ["source", "digest", "repository"])
  test(`expiration never hides invalid ${fault} metadata`, async () => {
    const metadata = {
      id: 7,
      expired: true,
      digest: `sha256:${"a".repeat(64)}`,
      size_in_bytes: 100,
      workflow_run: {
        id: 11,
        repository_id: 3,
        head_repository_id: 3,
        head_sha: "a".repeat(40),
      },
    };
    if (fault === "source") metadata.workflow_run.head_sha = "b".repeat(40);
    if (fault === "digest") metadata.digest = "invalid";
    if (fault === "repository") metadata.workflow_run.repository_id = 4;
    await assert.rejects(
      () =>
        downloadEvidence({
          id: 7,
          destination: "unused",
          runId: 11,
          repositoryId: 3,
          headSha: "a".repeat(40),
          read: async () => metadata,
        }),
      (error) => error.code !== "EVIDENCE_ARTIFACT_EXPIRED",
    );
  });
