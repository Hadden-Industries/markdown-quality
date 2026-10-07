# SPDX-License-Identifier: AGPL-3.0-only
"""Observe bundled qualification children; OS-specific metrics remain explicit."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def linux_members(group):
    members = []
    for directory in Path("/proc").iterdir():
        if not directory.name.isdecimal():
            continue
        try:
            fields = (directory / "stat").read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) == group and fields[0] != "Z":
                members.append((directory, fields[19]))
        except (FileNotFoundError, ProcessLookupError):
            continue
    return members


def linux_rss(group):
    total = 0
    for directory, birth in linux_members(group):
        try:
            lines = (directory / "smaps_rollup").read_text().splitlines()
            fields = (directory / "stat").read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) != group or fields[19] != birth or fields[0] == "Z":
                continue
            total += int(next(line for line in lines if line.startswith("Rss:")).split()[1]) * 1024
        except (FileNotFoundError, ProcessLookupError):
            continue
    return total


def windows_job():
    """Reuse the native Job accounting boundary; include this Python driver."""
    from ctypes import wintypes
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel.QueryInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p]
    kernel.QueryInformationJobObject.restype = wintypes.BOOL
    kernel.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.TerminateJobObject.restype = wintypes.BOOL
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel.SetInformationJobObject.restype = wintypes.BOOL

    class Basic(ctypes.Structure):
        _fields_ = [("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64), ("flags", wintypes.DWORD), ("working_min", ctypes.c_size_t), ("working_max", ctypes.c_size_t), ("active_limit", wintypes.DWORD), ("affinity", ctypes.c_size_t), ("priority", wintypes.DWORD), ("scheduling", wintypes.DWORD)]

    class Io(ctypes.Structure):
        _fields_ = [(field, ctypes.c_uint64) for field in ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]

    class Extended(ctypes.Structure):
        _fields_ = [("basic", Basic), ("io", Io), ("process_limit", ctypes.c_size_t), ("job_limit", ctypes.c_size_t), ("peak_process", ctypes.c_size_t), ("peak_job", ctypes.c_size_t)]

    class Accounting(ctypes.Structure):
        _fields_ = [("user", ctypes.c_int64), ("kernel", ctypes.c_int64), ("period_user", ctypes.c_int64), ("period_kernel", ctypes.c_int64), ("faults", wintypes.DWORD), ("processes", wintypes.DWORD), ("active", wintypes.DWORD), ("terminated", wintypes.DWORD)]

    job = kernel.CreateJobObjectW(None, None)
    policy = Extended()
    policy.basic.flags = 0x2000  # Kill descendants if the observer exits unexpectedly.
    if not job or not kernel.SetInformationJobObject(job, 9, ctypes.byref(policy), ctypes.sizeof(policy)):
        raise ctypes.WinError(ctypes.get_last_error())
    if not job or not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        raise ctypes.WinError(ctypes.get_last_error())

    def observe():
        memory, accounting = Extended(), Accounting()
        for number, record in ((9, memory), (1, accounting)):
            if not kernel.QueryInformationJobObject(job, number, ctypes.byref(record), ctypes.sizeof(record), None):
                raise ctypes.WinError(ctypes.get_last_error())
        return memory.peak_job, accounting.active - 1

    def abort():
        if not kernel.TerminateJobObject(job, 2):
            raise ctypes.WinError(ctypes.get_last_error())

    return observe, abort


def run():
    node, script, request_path, output = sys.argv[1:]
    output = Path(output)
    request = json.loads(Path(request_path).read_text(encoding="utf-8"))
    profile = request["profile"]
    windows = sys.platform == "win32"
    if not windows and sys.platform != "linux":
        raise RuntimeError("Only Windows/Linux observation is qualified")
    observe, abort = windows_job() if windows else (None, None)
    samples, identities = [], None
    child, failure, cleanup = None, None, "quiescent"
    needs_abort = False
    def interrupted(signum, frame):
        raise InterruptedError("Qualification observer interrupted")
    signal.signal(signal.SIGTERM, interrupted)
    try:
        for index in range(1, profile["samples"] + 1):
            sample = output / f"sample-{index}"
            sample.mkdir()
            receipt_path = sample / "receipt.json"
            peak, polls = 0, 0
            started = time.monotonic()
            env = {name: os.environ[name] for name in ("SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP") if name in os.environ}
            with (sample / "stdout.txt").open("wb") as stdout, (sample / "stderr.txt").open("wb") as stderr:
                child = subprocess.Popen([node, "--max-old-space-size=" + str(profile["nodeOldSpaceMb"]), script, request_path, str(sample / "data"), str(receipt_path)], env=env, stdout=stdout, stderr=stderr, start_new_session=not windows)
                while child.poll() is None:
                    peak = max(peak, observe()[0] if windows else linux_rss(child.pid))
                    polls += 1
                    if time.monotonic() - started > profile["windowMs"] / 1000 or peak > profile["memoryBytes"]:
                        raise RuntimeError("Observation deadline or memory budget exceeded")
                    if any((sample / name).stat().st_size > profile["reportBytes"] for name in ("stdout.txt", "stderr.txt")):
                        raise RuntimeError("Observation output bound exceeded")
                    time.sleep(0.05)
            elapsed = round((time.monotonic() - started) * 1000)
            if windows:
                observed_peak, active = observe()
                peak = max(peak, observed_peak)
            else:
                active = len(linux_members(child.pid))
                if not polls or not peak:
                    raise RuntimeError("No valid process-group memory observation")
            if active:
                raise RuntimeError("Descendants did not quiesce")
            if receipt_path.stat().st_size > profile["reportBytes"]:
                raise RuntimeError("Receipt exceeds report bound")
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            identity = {key: value for key, value in receipt.items() if key != "checkerElapsedMs"}
            if identities is not None and identities != identity:
                raise RuntimeError("Frozen inputs or checker result changed")
            identities = identity
            samples.append({"index": index, "receiptSha256": hashlib.sha256(receipt_path.read_bytes()).hexdigest(), "receiptPath": f"sample-{index}/receipt.json", "checkerElapsedMs": receipt["checkerElapsedMs"], "outerElapsedMsIncludingStaging": elapsed, "peakObservedBytes": peak, "exitCode": child.returncode, "activeDescendants": active, "samplePolls": polls})
            if child.returncode != 0 or receipt["result"]["exitCode"] != 0 or receipt["result"]["errors"] or receipt["result"]["written"] or receipt["checkerElapsedMs"] > profile["checkerMs"] or elapsed > profile["windowMs"] or peak > profile["memoryBytes"]:
                raise RuntimeError("Checker admission, latency or memory budget failed")
    except BaseException as error:
        failure = f"{type(error).__name__}: {error}"
        if windows:
            try:
                needs_abort = observe()[1] != 0
                cleanup = "pending-job-abort" if needs_abort else "quiescent"
            except OSError:
                needs_abort, cleanup = True, "unknown-job-state"
        elif child is not None:
            try:
                if child.poll() is None or linux_members(child.pid):
                    os.killpg(child.pid, signal.SIGKILL)
                child.wait(timeout=5)
                cleanup = "quiescent" if not linux_members(child.pid) else "not-quiescent"
            except (OSError, subprocess.TimeoutExpired):
                cleanup = "unknown-group-state"
    report = {"schemaVersion": 1, "passed": failure is None, "failure": failure, "failureCleanup": cleanup, "requiredConsecutiveSamples": profile["samples"], "profileSha256": profile["profileSha256"], "enforcedProfile": profile, "samples": samples, "observedNearestRankP95Ms": max((sample["checkerElapsedMs"] for sample in samples), default=None) if len(samples) == profile["samples"] else None, "memoryMetric": "Windows Job peak committed bytes including Python; cumulative across the window" if windows else "Sampled sum of dedicated process-group smaps_rollup RSS; excludes Python and counts shared pages per process", "observerSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "python": sys.version, "limitations": "Observed sample window, not statistical tail assurance. Linux scans every 50ms plus overhead; short-lived peaks can be missed. Trusted checker descendants must remain in the owned Job/group. Hosted check/job identity and owner acceptance are separate."}
    encoded = (json.dumps(report, indent=2) + "\n").encode("utf-8")
    if len(encoded) > profile["reportBytes"]:
        # Complete per-sample receipts remain retained; never emit an oversized
        # successful window. A tiny rejected profile can prevent any receipt.
        raise RuntimeError("Observation window exceeds report bound")
    (output / "window.json").write_bytes(encoded)
    if needs_abort:
        abort()
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(run())
