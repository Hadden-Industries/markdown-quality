# SPDX-License-Identifier: AGPL-3.0-only
"""Maintainer-only six-run qualification of an already installed candidate.

Corpora are complete, immutable public Git checkouts, used only as data. Downloads
and installation precede this command and are excluded from measured operation.
Each observation gets a fresh driver and process tree; no runtime limits change.
"""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import traceback


CORPORA = {
    "owlapi": "073beefb7805130bc0452472d1a9c801471fbaf1",
    "webvowl": "b0fe00404eedf12a59084871863500869474bd3a",
}
ORACLES = json.loads((Path(__file__).resolve().parent.parent / "test/fixtures/performance-oracles.json").read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def manifest(root, revision):
    def git(*args):
        return subprocess.check_output(["git", "-C", str(root), *args], timeout=30)

    assert git("rev-parse", "HEAD").decode().strip() == revision
    records = []
    for name in git("ls-files", "-z").decode("utf-8").split("\0"):
        if not name:
            continue
        path = root / name
        assert path.is_file() and not path.is_symlink(), name
        data = path.read_bytes()
        records.append({"path": name, "bytes": len(data), "sha256": digest(data)})
    records.sort(key=lambda item: item["path"])
    return {"revision": revision, "files": records,
            "sha256": digest(json.dumps(records, sort_keys=True).encode())}


def windows_job():
    from ctypes import wintypes
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)

    class Basic(ctypes.Structure):
        _fields_ = [("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64),
                    ("flags", wintypes.DWORD), ("working_min", ctypes.c_size_t),
                    ("working_max", ctypes.c_size_t), ("active_limit", wintypes.DWORD),
                    ("affinity", ctypes.c_size_t), ("priority", wintypes.DWORD),
                    ("scheduling", wintypes.DWORD)]

    class Io(ctypes.Structure):
        _fields_ = [(field, ctypes.c_uint64) for field in
                    ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]

    class Extended(ctypes.Structure):
        _fields_ = [("basic", Basic), ("io", Io), ("process_limit", ctypes.c_size_t),
                    ("job_limit", ctypes.c_size_t), ("peak_process", ctypes.c_size_t),
                    ("peak_job", ctypes.c_size_t)]

    class Accounting(ctypes.Structure):
        _fields_ = [("user", ctypes.c_int64), ("kernel", ctypes.c_int64),
                    ("period_user", ctypes.c_int64), ("period_kernel", ctypes.c_int64),
                    ("faults", wintypes.DWORD), ("processes", wintypes.DWORD),
                    ("active", wintypes.DWORD), ("terminated", wintypes.DWORD)]

    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel.QueryInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p,
                                               wintypes.DWORD, ctypes.c_void_p]
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    job = kernel.CreateJobObjectW(None, None)
    policy = Extended()
    policy.basic.flags = 0x2000  # Kill descendants on driver exit; no memory/CPU limits.
    if not job or not kernel.SetInformationJobObject(job, 9, ctypes.byref(policy), ctypes.sizeof(policy)):
        raise ctypes.WinError(ctypes.get_last_error())
    if not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        raise ctypes.WinError(ctypes.get_last_error())

    def read():
        memory, cpu = Extended(), Accounting()
        for number, record in ((9, memory), (1, cpu)):
            if not kernel.QueryInformationJobObject(job, number, ctypes.byref(record), ctypes.sizeof(record), None):
                raise ctypes.WinError(ctypes.get_last_error())
        return {"peakTreeBytes": memory.peak_job, "activeDescendants": cpu.active - 1,
                "processesIncludingDriver": cpu.processes,
                "userCpuMsIncludingDriver": cpu.user / 10000,
                "kernelCpuMsIncludingDriver": cpu.kernel / 10000,
                "memoryMetric": "Windows Job Object peak committed bytes, including fresh Python driver and all descendants; not RSS"}

    return read


def linux_tree():
    """Observe the dedicated driver process group; disappearing processes are normal."""
    members, rss = [], 0
    for path in Path("/proc").iterdir():
        if not path.name.isdecimal():
            continue
        try:
            fields = (path / "stat").read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) != os.getpgrp():
                continue
            members.append(int(path.name))
            for line in (path / "status").read_text().splitlines():
                if line.startswith("VmRSS:"):
                    rss += int(line.split()[1]) * 1024
        except (FileNotFoundError, ProcessLookupError):
            continue
    return members, rss


def observe(node, cli, corpus, output):
    if sys.platform == "linux":
        assert os.getpgrp() == os.getpid(), "Observer requires its own process group"
    try:
        observe_owned(node, cli, corpus, output)
    except BaseException:
        if sys.platform == "linux":
            # This dedicated group includes the driver, CLI and native grandchildren.
            # Fail closed even if the driver is interrupted before producing JSON.
            traceback.print_exc()
            sys.stderr.flush()
            os.killpg(os.getpid(), signal.SIGKILL)
        raise


def observe_owned(node, cli, corpus, output):
    output = Path(output)
    environment = {key: value for key, value in os.environ.items()
                   if key.upper() in ("SYSTEMROOT", "WINDIR", "TEMP", "TMP")}
    environment.update(HTTP_PROXY="http://127.0.0.1:9", HTTPS_PROXY="http://127.0.0.1:9",
                       ALL_PROXY="http://127.0.0.1:9")
    job = windows_job() if sys.platform == "win32" else None
    assert job or (sys.platform == "linux" and os.getpgrp() == os.getpid())
    peak, seen, samples = 0, set(), 0
    with output.with_suffix(".stdout.json").open("xb") as stdout, output.with_suffix(".stderr.txt").open("xb") as stderr:
        started = time.perf_counter()
        child = subprocess.Popen([node, cli, "check", "--root", corpus, "--json"],
                                 cwd=str(Path(cli).parent), env=environment, stdout=stdout, stderr=stderr)
        while child.poll() is None:
            if job is None:
                members, memory = linux_tree()
                seen.update(members)
                peak = max(peak, memory)
                samples += 1
            if time.perf_counter() - started > 120:
                raise TimeoutError("Operation exceeded observer deadline; no retry")
            time.sleep(0.01)
        elapsed = (time.perf_counter() - started) * 1000
    resources = job() if job else {
        "peakTreeBytes": peak, "activeDescendants": len(linux_tree()[0]) - 1,
        "sampledProcessesIncludingDriver": len(seen), "memorySamples": samples,
        "memoryMetric": "Sum of Linux process-group VmRSS, including fresh Python driver and descendants, sampled every 10 ms; brief peaks/children may be missed; shared pages may be counted more than once",
    }
    if job is None:
        import resource
        own, children = resource.getrusage(resource.RUSAGE_SELF), resource.getrusage(resource.RUSAGE_CHILDREN)
        resources.update(userCpuMsIncludingDriver=(own.ru_utime + children.ru_utime) * 1000,
                         kernelCpuMsIncludingDriver=(own.ru_stime + children.ru_stime) * 1000)
    raw = output.with_suffix(".stdout.json").read_bytes()
    result = json.loads(raw)
    report = {**resources, "elapsedMs": elapsed, "exitCode": child.returncode,
              "outcome": result["outcome"], "selected": len(result["selection"]["files"]),
              "resultSha256": digest(raw), "diagnostics": result["diagnostics"], "errors": result["errors"],
              "version": result["package"]["version"], "tools": result["tools"]}
    output.with_suffix(".resources.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    assert child.returncode in (0, 1) and not result["errors"], report
    assert resources["activeDescendants"] == 0, report
    print(json.dumps(report))


def qualify(node, cli, corpus_parent, output):
    output.mkdir(parents=True, exist_ok=False)
    version = json.loads((Path(cli).resolve().parent.parent / "package.json").read_text(encoding="utf-8"))["version"]
    report = {"schemaVersion": 1, "platform": sys.platform, "node": subprocess.check_output([node, "--version"]).decode().strip(),
              "method": "Six fresh-process full checks per complete public corpus; warm filesystem; excludes installation and acquisition. Nearest-rank observed p95 is the maximum of six; no population percentile claim. All observations retained; no retries.",
              "corpora": {}}
    for name, revision in CORPORA.items():
        corpus = corpus_parent / name
        before = manifest(corpus, revision)
        observations = []
        for index in range(1, 7):
            command = [sys.executable, str(Path(__file__).resolve()), "--observe", node, cli, str(corpus), str(output / f"{name}-{index}")]
            child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                     start_new_session=sys.platform == "linux")
            try:
                stdout, stderr = child.communicate(timeout=150)
            finally:
                if sys.platform == "linux":
                    # Dispose only this dedicated observer group, including interrupted descendants.
                    try:
                        os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                elif child.poll() is None:
                    child.kill()
            (output / f"{name}-{index}.driver.stdout.txt").write_bytes(stdout)
            (output / f"{name}-{index}.driver.stderr.txt").write_bytes(stderr)
            assert child.returncode == 0, stderr.decode(errors="replace")
            observations.append(json.loads(stdout))
        assert manifest(corpus, revision) == before, "Checking changed corpus bytes"
        assert len({item["resultSha256"] for item in observations}) == 1
        for index, observation in enumerate(observations, 1):
            assert observation["version"] == version
            result = json.loads((output / f"{name}-{index}.stdout.json").read_bytes())
            result["package"]["version"] = "<candidate>"
            canonical = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            assert digest(canonical) == ORACLES["corpora"][name]["resultSha256WithoutVersion"], "Candidate differs from the current-policy baseline oracle"
            assert observation["selected"] == ORACLES["corpora"][name]["selected"]
            assert observation["diagnostics"] == ORACLES["corpora"][name]["diagnostics"]
        assert max(item["elapsedMs"] for item in observations) <= 30000
        assert max(item["peakTreeBytes"] for item in observations) <= 536870912
        report["corpora"][name] = {"manifest": before, "observations": observations,
                                  "baselineSource": ORACLES["baselineSource"],
                                  "completeBaselineResultParityExceptVersion": True,
                                  "observedP95Ms": max(item["elapsedMs"] for item in observations),
                                  "peakTreeBytes": max(item["peakTreeBytes"] for item in observations)}
    (output / "qualification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "output": str(output)}))


if __name__ == "__main__":
    if sys.platform == "linux":
        def interrupted(signum, frame):
            # Let qualify's finally dispose its current dedicated observer group.
            raise InterruptedError("Qualification interrupted")
        signal.signal(signal.SIGTERM, interrupted)
    if len(sys.argv) > 1 and sys.argv[1] == "--observe":
        observe(*sys.argv[2:])
    else:
        parser = argparse.ArgumentParser()
        parser.add_argument("--node", required=True)
        parser.add_argument("--cli", required=True)
        parser.add_argument("--corpora", required=True, type=Path)
        parser.add_argument("--output", required=True, type=Path)
        arguments = parser.parse_args()
        qualify(arguments.node, arguments.cli, arguments.corpora, arguments.output)
