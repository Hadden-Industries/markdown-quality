# SPDX-License-Identifier: AGPL-3.0-only
"""Exercise the real qualifier's oracle admission and fresh-measurement control flow."""
import gzip
import importlib.util
import inspect
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("qualifier", ROOT / "scripts/qualify-performance.py")
qualifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qualifier)


class QualificationTests(unittest.TestCase):
    def test_complete_reports_match_preexisting_oracles(self):
        for name in qualifier.CORPORA:
            result = qualifier.load_incumbent(name)
            expected = qualifier.ORACLES["corpora"][name]
            self.assertEqual(len(result["diagnostics"]), expected["diagnosticCount"])
            self.assertEqual(len(result["selection"]["files"]), expected["selected"])
            self.assertEqual(result["errors"], [])

    def test_missing_corrupt_and_changed_reports_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            fixtures = Path(directory)
            with patch.object(qualifier, "INCUMBENTS", fixtures):
                with self.assertRaises(FileNotFoundError):
                    qualifier.load_incumbent("owlapi")
                fixture = fixtures / "owlapi.json.gz"
                fixture.write_bytes(b"invalid gzip")
                with self.assertRaises(gzip.BadGzipFile):
                    qualifier.load_incumbent("owlapi")
                original = json.loads(gzip.decompress((ROOT / "test/fixtures/performance-incumbents/owlapi.json.gz").read_bytes()))
                original["diagnostics"][0]["message"] += " changed"
                fixture.write_bytes(gzip.compress(json.dumps(original).encode()))
                with self.assertRaisesRegex(AssertionError, "retained full oracle"):
                    qualifier.load_incumbent("owlapi")

    def exercise(self, *, elapsed=29999, peak=536870912, mutate=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "package.json").write_text('{"version":"1.0.3"}')
            cli = root / "src/cli.js"
            cli.parent.mkdir()
            corpora = root / "corpora"
            for name in qualifier.CORPORA:
                (corpora / name).mkdir(parents=True)
            calls = []

            class Observation:
                returncode = 0
                pid = 99999999

                def __init__(self, command, **options):
                    calls.append(command)
                    name = Path(command[5]).name.removesuffix("-data")
                    result = json.loads(gzip.decompress((ROOT / f"test/fixtures/performance-incumbents/{name}.json.gz").read_bytes()))
                    result["package"]["version"] = "1.0.3"
                    if mutate:
                        mutate(result)
                    Path(command[6] + ".stdout.json").write_text(json.dumps(result))
                    self.report = {"version": "1.0.3", "selected": len(result["selection"]["files"]),
                                   "diagnostics": result["diagnostics"], "elapsedMs": elapsed,
                                   "peakTreeBytes": peak, "resultSha256": "same-result-per-corpus"}

                def communicate(self, **options):
                    return json.dumps(self.report).encode(), b""

                def poll(self):
                    return 0

            # Replay the observed pre-candidate Windows baseline failure. The
            # historical producer must never be launched by the repaired path.
            historical_failure = subprocess.CompletedProcess([], 2, b"", b'ANALYSIS_FAILURE: Document analysis is unavailable.')
            with patch.object(qualifier, "manifest", return_value={"frozen": True}), \
                    patch.object(qualifier.subprocess, "check_output", return_value=b"v24.21.0\n"), \
                    patch.object(qualifier.subprocess, "run", return_value=historical_failure) as historical, \
                    patch.object(qualifier.subprocess, "Popen", Observation), \
                    patch.object(qualifier.os, "killpg", create=True):
                arguments = ["node", str(cli), corpora, root / "observations"]
                # Also permits replay against the defective pre-repair signature.
                if "incumbent_cli" in inspect.signature(qualifier.qualify).parameters:
                    arguments.append(root / "historical/src/cli.js")
                qualifier.qualify(*arguments)
                historical.assert_not_called()
            self.assertEqual(len(calls), 12)
            for command in calls:
                self.assertEqual(command[4], str(cli))
                self.assertEqual(command[-1], ".markdown-quality-trusted-inputs/policy.json")
            report = json.loads((root / "observations/qualification.json").read_text())
            for corpus in report["corpora"].values():
                self.assertTrue(corpus["retainedIncumbentFullResultOracleVerified"])
                self.assertNotIn("incumbentFullResultOracleReproduced", corpus)

    def test_frozen_oracle_survives_historical_worker_failure_and_measures_all_candidates(self):
        self.exercise()

    def test_candidate_time_and_memory_gates_still_reject(self):
        for options, reason in [({"elapsed": 30001}, "Candidate observed p95"), ({"peak": 536870913}, "Candidate peak memory")]:
            with self.subTest(options=options), self.assertRaisesRegex(AssertionError, reason):
                self.exercise(**options)

    def test_same_counts_with_changed_finding_still_reject(self):
        def change_finding(result):
            result["diagnostics"][0]["message"] += " changed"
        with self.assertRaisesRegex(AssertionError, "Candidate findings differ"):
            self.exercise(mutate=change_finding)


if __name__ == "__main__":
    unittest.main()
