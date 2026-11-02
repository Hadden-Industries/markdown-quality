// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Generate deliberately unsafe workflows only outside the analyzed checkout. */
export function prepareCodeqlModelTests(pack, output) {
  cpSync(pack, output, {
    recursive: true,
    filter: (path) => !path.split(/[\\/]/u).includes(".codeql"),
  });
  const fixture = (name) =>
    readFileSync(join(pack, "fixtures", name + ".yml.fixture"), "utf8");
  const base = fixture("shared");
  const guard =
    "      - id: admission\n        run: node producer/scripts/shared-qualification-admission.js verify\n";
  const cases = [
    { name: "approved", expected: "protected", edits: [] },
    {
      name: "checkout_after_failed_admission",
      edits: [
        [
          "      - id: trusted\n",
          "      - id: trusted\n        if: always()\n",
        ],
      ],
    },
    {
      name: "missing_environment",
      edits: [
        ["    environment: markdown-quality-trusted-qualification\n", ""],
      ],
    },
    { name: "missing_guard", edits: [[guard, ""]] },
    {
      name: "late_guard",
      edits: [
        [guard, ""],
        ["      - id: upload", guard + "      - id: upload"],
      ],
    },
    {
      name: "conditional_guard",
      edits: [
        [
          "      - id: admission\n",
          "      - id: admission\n        if: false\n",
        ],
      ],
    },
    {
      name: "ignored_failure",
      edits: [
        [
          "      - id: admission\n",
          "      - id: admission\n        continue-on-error: true\n",
        ],
      ],
    },
    {
      name: "guard_cwd",
      edits: [
        [
          "      - id: admission\n",
          "      - id: admission\n        working-directory: candidate\n",
        ],
      ],
    },
    {
      name: "job_default_cwd",
      edits: [
        [
          "  qualify:\n",
          "  qualify:\n    defaults:\n      run:\n        working-directory: candidate\n",
        ],
      ],
    },
    {
      name: "workflow_default_cwd",
      edits: [
        [
          "jobs:\n",
          "defaults:\n  run:\n    working-directory: candidate\njobs:\n",
        ],
      ],
    },
    {
      name: "bypassed_guard",
      edits: [["admission.js verify\n", "admission.js verify || true\n"]],
    },
    {
      name: "wrong_producer_ref",
      edits: [
        [
          "ref: ${{ job.workflow_sha }}",
          "ref: ${{ inputs.trusted-sha }}",
          true,
        ],
      ],
    },
    {
      name: "wrong_producer_repository",
      edits: [
        [
          "repository: ${{ job.workflow_repository }}",
          "repository: ${{ inputs.trusted-repository }}",
          true,
        ],
      ],
    },
    {
      name: "wrong_producer_path",
      edits: [["path: producer\n", "path: other\n", true]],
    },
    {
      name: "job_override",
      edits: [
        [
          "  qualify:\n",
          "  qualify:\n    env:\n      MQ_TRUSTED_SHA: ${{ inputs.candidate-sha }}\n",
        ],
      ],
    },
    {
      name: "guard_override",
      edits: [
        [
          "      - id: admission\n",
          "      - id: admission\n        env:\n          MQ_TRUSTED_SHA: ${{ inputs.candidate-sha }}\n",
        ],
      ],
    },
    {
      name: "summary_override",
      edits: [
        [
          "      - run: node producer/scripts/shared-qualification-admission.js request\n",
          "      - env:\n          MQ_PROFILE: other.json\n        run: node producer/scripts/shared-qualification-admission.js request\n",
        ],
      ],
    },
    {
      name: "wrong_binding",
      edits: [
        [
          "MQ_TRUSTED_SHA: ${{ inputs.trusted-sha }}",
          "MQ_TRUSTED_SHA: ${{ inputs.candidate-sha }}",
        ],
      ],
    },
    {
      name: "compound_binding",
      edits: [
        [
          "MQ_TRUSTED_SHA: ${{ inputs.trusted-sha }}",
          "MQ_TRUSTED_SHA: ${{ inputs.trusted-sha || inputs.candidate-sha }}",
        ],
      ],
    },
    {
      name: "checkout_mismatch",
      edits: [
        [
          "ref: ${{ inputs.trusted-sha }}\n          path: trusted",
          "ref: ${{ inputs.candidate-sha }}\n          path: trusted",
        ],
      ],
    },
    {
      name: "unrelated_checkout",
      edits: [["path: trusted\n", "path: other\n"]],
    },
    { name: "missing_request", edits: [["    needs: request\n", ""]] },
  ];
  for (const fixtureCase of cases) {
    let source = base;
    for (const [before, after, all = false] of fixtureCase.edits) {
      const count = source.split(before).length - 1;
      assert.ok(
        count > 0 && (all || count === 1),
        `Ambiguous ${fixtureCase.name} fixture edit`,
      );
      source = all
        ? source.replaceAll(before, after)
        : source.replace(before, after);
    }
    const directory = join(output, "tests", fixtureCase.name);
    mkdirSync(join(directory, ".github/workflows"), { recursive: true });
    writeFileSync(
      join(directory, ".github/workflows/caller.yml"),
      fixture("caller"),
    );
    writeFileSync(
      join(directory, ".github/workflows/markdown-quality.yml"),
      source,
    );
    writeFileSync(
      join(directory, "Admission.qlref"),
      "test-support/Admission.ql\n",
    );
    writeFileSync(
      join(directory, "Admission.expected"),
      `| qualify | trusted | upload | workflow_dispatch | ${fixtureCase.expected ?? "unprotected"} |\n`,
    );
  }
  return cases.map(({ name, expected = "unprotected" }) => ({
    name,
    expected,
  }));
}
