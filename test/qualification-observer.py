# SPDX-License-Identifier: AGPL-3.0-only
"""Replay Linux descendant cleanup scheduling through the real bundled observer."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("observer", ROOT / "assets/qualification/observe.py")
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)


class ObserverCleanupTests(unittest.TestCase):
    def exercise(self, behavior):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            request = root / "request.json"
            output = root / "observation"
            output.mkdir()
            request.write_text(json.dumps({"profile": {
                "samples": 1, "windowMs": 15000, "memoryBytes": 536870912,
                "nodeOldSpaceMb": 256, "reportBytes": 8388608,
                "checkerMs": 10000, "profileSha256": "a" * 64,
            }}), encoding="utf-8")
            clock = [0.0]
            state = {"kill_requested": False, "observations_after_kill": 0}

            class Child:
                pid = 424242
                returncode = 0

                def __init__(self, *args, **kwargs):
                    self.polls = 0

                def poll(self):
                    self.polls += 1
                    return None if self.polls == 1 else 0

                def wait(self, timeout):
                    return 0

            def members(group):
                self.assertEqual(group, Child.pid)
                if not state["kill_requested"]:
                    return [("descendant", "birth")]
                state["observations_after_kill"] += 1
                if behavior == "vanishes-before-signal":
                    return []
                if behavior == "persistent" or state["observations_after_kill"] < 3:
                    return [("descendant", "birth")]
                return []

            def kill(group, signal_number):
                self.assertEqual(group, Child.pid)
                self.assertEqual(signal_number, 9)
                state["kill_requested"] = True
                if behavior == "vanishes-before-signal":
                    raise ProcessLookupError("Group exited before signaling")

            def sleep(seconds):
                self.assertGreater(seconds, 0)
                self.assertLessEqual(seconds, 0.05)
                clock[0] += seconds

            with patch.object(observer.sys, "argv", ["observe.py", "node", "delayed.mjs", str(request), str(output)]), \
                    patch.object(observer.sys, "platform", "linux"), \
                    patch.object(observer.subprocess, "Popen", Child), \
                    patch.object(observer, "linux_members", members), \
                    patch.object(observer, "linux_rss", return_value=1024), \
                    patch.object(observer.os, "killpg", side_effect=kill, create=True), \
                    patch.object(observer.signal, "SIGKILL", 9, create=True), \
                    patch.object(observer.signal, "signal"), \
                    patch.object(observer.time, "monotonic", side_effect=lambda: clock[0]), \
                    patch.object(observer.time, "sleep", side_effect=sleep):
                status = observer.run()
            report = json.loads((output / "window.json").read_text(encoding="utf-8"))
            self.assertEqual(status, 1)
            self.assertFalse(report["passed"])
            self.assertIn("Descendants did not quiesce", report["failure"])
            self.assertEqual(report["samples"], [])
            self.assertTrue(state["kill_requested"])
            self.assertLessEqual(clock[0], 5.05)
            return report, state, clock[0]

    def test_delayed_group_exit_is_observed_before_reporting_cleanup(self):
        report, state, elapsed = self.exercise("delayed")
        self.assertEqual(report["failureCleanup"], "quiescent")
        self.assertGreaterEqual(state["observations_after_kill"], 3)
        self.assertGreater(elapsed, 0.05)

    def test_group_disappearing_before_signal_is_reobserved(self):
        report, _, _ = self.exercise("vanishes-before-signal")
        self.assertEqual(report["failureCleanup"], "quiescent")

    def test_persistent_group_stays_failed_at_the_finite_deadline(self):
        report, _, elapsed = self.exercise("persistent")
        self.assertEqual(report["failureCleanup"], "not-quiescent")
        self.assertGreaterEqual(elapsed, 5)


if __name__ == "__main__":
    unittest.main()
