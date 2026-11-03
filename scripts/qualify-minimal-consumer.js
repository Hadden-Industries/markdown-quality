// SPDX-License-Identifier: AGPL-3.0-only
// Dependency-only consumer qualification: the application manifest declares only the
// package, with no scripts, policy file, wrapper or extra dependency. Every command is
// the public `npm exec` shape run from the layout's real installation root, offline and
// without prompts, against distinct fixtures so earlier writes cannot hide a check.
import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { npmCliPath } from "./commands.js";

const D = "é";
const C = "é";

/** Remove only fixture Markdown and policy inputs from a consumer root. */
function resetFixture(root, keep) {
  for (const name of readdirSync(root)) {
    if (keep.has(name)) continue;
    rmSync(join(root, name), { recursive: true, force: true });
  }
}

function writeFixture(root, files) {
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  }
}

/** Confirm npm's .bin entry resolves to this installation's packaged CLI. */
function assertInstalledBin(install, packageName) {
  const bin = join(install, "node_modules", ".bin");
  const cli = realpathSync(
    join(install, "node_modules", ...packageName.split("/"), "src", "cli.js"),
  );
  if (process.platform === "win32") {
    // npm's cmd shim names the target relative to its own .bin directory.
    const shim = readFileSync(join(bin, "markdown-quality.cmd"), "utf8");
    const target = /"%dp0%\\([^"]+\\src\\cli\.js)"/u.exec(shim)?.[1];
    assert.ok(target, "Windows shim names the packaged CLI");
    assert.equal(realpathSync(join(bin, ...target.split("\\"))), cli);
  } else {
    const link = join(bin, "markdown-quality");
    assert.ok(lstatSync(link).isSymbolicLink(), "Linux .bin entry is a link");
    assert.equal(realpathSync(link), cli);
  }
  assert.ok(cli.startsWith(realpathSync(install) + sep), "No global binary");
}

/** Run the exact public command shapes; return the evidence summary. */
export function qualifyMinimalConsumer({
  install,
  root = install,
  packageName = "@hadden-industries/markdown-quality",
  environment = process.env,
  npmCli = environment.MARKDOWN_QUALITY_CONSUMER_NPM ?? npmCliPath(),
}) {
  const manifest = JSON.parse(readFileSync(join(install, "package.json")));
  assert.equal(manifest.scripts, undefined, "Consumer declares no scripts");
  assert.deepEqual(Object.keys(manifest.dependencies), [packageName]);
  assertInstalledBin(install, packageName);
  const rootArgument = relative(install, root).split(sep).join("/") || ".";
  // Only the installation's own members survive between fixtures.
  const keep = new Set([
    "package.json",
    "package-lock.json",
    "node_modules",
    "tooling",
  ]);
  // Network is unavailable to product operations; npm itself runs offline and never
  // prompts to acquire a missing binary.
  const env = {
    ...environment,
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
    HTTP_PROXY: "http://127.0.0.1:1",
    HTTPS_PROXY: "http://127.0.0.1:1",
  };
  const cases = [];
  function npmExec(args, { cwd = install, input, status } = {}) {
    const result = spawnSync(
      process.execPath,
      [
        npmCli,
        "exec",
        "--offline",
        "--yes=false",
        "--",
        "markdown-quality",
        ...args,
      ],
      {
        cwd,
        env,
        input,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 16_777_216,
        windowsHide: true,
      },
    );
    assert.equal(result.error, undefined, String(result.error));
    if (status !== undefined)
      assert.equal(
        result.status,
        status,
        `${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
      );
    cases.push({ command: ["markdown-quality", ...args], exit: result.status });
    return result;
  }
  const json = (args, options) => {
    const result = npmExec(args, options);
    return JSON.parse(result.stdout);
  };
  const scenario = (files) => {
    resetFixture(root, keep);
    writeFixture(root, files);
  };
  const read = (path) => readFileSync(join(root, path), "utf8");

  // Clean input, literal names and explicit empty selection.
  scenario({
    "README.md": "# Fixture\n\nPlain prose.\n",
    "docs/literal [1].md": "# Literal\n\nSee [home](../README.md#fixture).\n",
  });
  npmExec(["check", "--root", rootArgument], { status: 0 });
  const inspected = json(["inspect", "--root", rootArgument, "--json"], {
    status: 0,
  });
  assert.equal(inspected.qualityStatus, "not-checked");
  assert.equal(inspected.configurationOrigin.kind, "default-absent");
  assert.deepEqual(inspected.selection.files, [
    "README.md",
    "docs/literal [1].md",
  ]);
  npmExec(["check", "--root", rootArgument, "--", "docs/literal [1].md"], {
    status: 0,
  });
  const empty = json(
    ["check", "--root", rootArgument, "--json", "--files-json", "[]"],
    { status: 0 },
  );
  assert.deepEqual(empty.selection.files, []);
  if (root === install) {
    // An omitted root resolves to the nearest package root from a nested directory.
    const nested = json(["check", "--json"], {
      cwd: join(root, "docs"),
      status: 0,
    });
    assert.equal(nested.selection.files.length, 2);
  }

  // Formatting drift: format repairs presentation and check then passes.
  scenario({ "a.md": "# A\n\n*   item\n" });
  npmExec(["check", "--root", rootArgument], { status: 1 });
  npmExec(["format", "--root", rootArgument], { status: 0 });
  assert.equal(read("a.md"), "# A\n\n- item\n");
  npmExec(["check", "--root", rootArgument], { status: 0 });

  // NFC drift: check fails, preview writes nothing, normalize repairs it.
  scenario({ "a.md": `# A\n\nCaf${D} prose.\n` });
  npmExec(["check", "--root", rootArgument], { status: 1 });
  const preview = json(
    ["normalize", "--root", rootArgument, "--dry-run", "--json"],
    { status: 0 },
  );
  assert.equal(preview.operationStatus, "previewed");
  assert.equal(preview.proposedChanges.length, 1);
  assert.equal(read("a.md"), `# A\n\nCaf${D} prose.\n`);
  npmExec(["normalize", "--root", rootArgument], { status: 0 });
  assert.equal(read("a.md"), `# A\n\nCaf${C} prose.\n`);
  npmExec(["check", "--root", rootArgument], { status: 0 });

  // Combined drift in both repair orders.
  for (const order of [
    ["format", "normalize"],
    ["normalize", "format"],
  ]) {
    scenario({ "a.md": `# A\n\n*   Caf${D}\n` });
    npmExec([order[0], "--root", rootArgument], { status: 0 });
    npmExec(["check", "--root", rootArgument], { status: 1 });
    npmExec([order[1], "--root", rootArgument], { status: 0 });
    npmExec(["check", "--root", rootArgument], { status: 0 });
    assert.equal(read("a.md"), `# A\n\n- Caf${C}\n`);
  }

  // Anchor changes need --update-links and repair selected local references.
  scenario({
    "a.md": `# Caf${D}\n`,
    "b.md": `# B\n\nSee [a](a.md#caf${D}).\n`,
  });
  npmExec(["normalize", "--root", rootArgument], { status: 1 });
  const anchors = json(
    [
      "normalize",
      "--root",
      rootArgument,
      "--update-links",
      "--dry-run",
      "--json",
    ],
    { status: 0 },
  );
  assert.equal(anchors.anchorChanges.length, 1);
  assert.equal(anchors.backlinkCoverage.externalReferences, "unverified");
  assert.equal(read("b.md"), `# B\n\nSee [a](a.md#caf${D}).\n`);
  npmExec(["normalize", "--root", rootArgument, "--update-links"], {
    status: 0,
  });
  assert.equal(read("b.md"), `# B\n\nSee [a](a.md#caf${C}).\n`);
  npmExec(["check", "--root", rootArgument], { status: 0 });

  // Sparse overrides, cross-document fragments and invalid input.
  scenario({
    ".markdown-quality.json": JSON.stringify({
      exclude: ["drafts/**"],
      syntax: { frontmatter: "toml" },
      lint: { "quality/long-prose-line": "off" },
    }),
    "a.md": "+++\ntitle = 'A'\n+++\n\n# A\n\nSee [b](b.md#missing).\n",
    "b.md": "# B\n",
    "drafts/c.md": "Bare https://example.invalid/draft\n",
  });
  const sparse = json(["check", "--root", rootArgument, "--json"], {
    status: 1,
  });
  assert.deepEqual(
    sparse.diagnostics.map((d) => d.rule),
    ["quality/unresolved-local-fragment"],
  );
  assert.equal(sparse.configurationOrigin.kind, "file");
  scenario({ "bad.md": Buffer.from([0xff]) });
  npmExec(["check", "--root", rootArgument], { status: 2 });

  // Resource controls: persisted opt-in, one-flag override, finite and null bounds.
  scenario({
    ".markdown-quality-execution.json": JSON.stringify({
      resourceLimitMode: "unlimited",
    }),
    "a.md": "# A\n\nPlain prose.\n",
  });
  const unlimited = json(["inspect", "--root", rootArgument, "--json"], {
    status: 0,
  });
  assert.equal(unlimited.resourcePolicy.resourceLimitMode, "unlimited");
  scenario({
    "profile.json": JSON.stringify({ analyzerLimits: { maxDocumentBytes: 1 } }),
    "a.md": "# A\n\nPlain prose.\n",
  });
  npmExec(
    ["check", "--root", rootArgument, "--execution-profile", "profile.json"],
    {
      status: 2,
    },
  );
  writeFixture(root, {
    "profile.json": JSON.stringify({
      analyzerLimits: { maxDocumentBytes: null },
    }),
  });
  npmExec(
    ["check", "--root", rootArgument, "--execution-profile", "profile.json"],
    {
      status: 0,
    },
  );
  const flagged = json(
    [
      "inspect",
      "--root",
      rootArgument,
      "--resource-limit-mode",
      "unlimited",
      "--json",
    ],
    { status: 0 },
  );
  assert.equal(flagged.configuration.analyzerLimits.maxDocumentBytes, null);

  // Bounded logical stdin framing formats supplied bytes without checkout writes.
  const logical = json(
    ["format", "--stdin-request", "--root", rootArgument, "--json"],
    {
      input: JSON.stringify({
        path: "generated.md",
        requestId: "minimal",
        contentBase64: Buffer.from("# G\n\n*   item\n").toString("base64"),
      }),
      status: 0,
    },
  );
  assert.equal(
    Buffer.from(logical.document.contentBase64, "base64").toString(),
    "# G\n\n- item\n",
  );
  assert.ok(!existsSync(join(root, "generated.md")));
  resetFixture(root, keep);
  return {
    layout: root === install ? "root" : "isolated",
    install: resolve(install),
    commands: cases.length,
    cases,
  };
}
