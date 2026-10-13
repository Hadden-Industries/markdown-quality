# SPDX-License-Identifier: AGPL-3.0-only
"""Real ABI and owned-Job operations; always launched in a bounded child."""
import ctypes
import importlib.util
from pathlib import Path
import subprocess
import sys
import time

source = Path(__file__).resolve().parents[1] / "scripts/windows-job-source.py"
spec = importlib.util.spec_from_file_location("windows_job_source", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
kernel, Extended, Accounting = module.windows_abi()
assert ctypes.sizeof(ctypes.c_size_t) == 8
assert ctypes.sizeof(Extended) == 144
assert ctypes.sizeof(Extended._fields_[0][1]) == 64
assert ctypes.sizeof(Extended._fields_[1][1]) == 48
assert ctypes.sizeof(Accounting) == 48
assert Extended.peak_job.offset == 136 and Accounting.active.offset == 40
record = Accounting()
assert not kernel.QueryInformationJobObject(1, 1, ctypes.byref(record), ctypes.sizeof(record), None)
read, abort = module.windows_job_raw()
child = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import time; payload=bytearray(16*1024*1024); print('ready',flush=True); time.sleep(0.3)"], stdout=subprocess.PIPE)
assert child.stdout.readline().strip() == b"ready"
memory, accounting = read()
assert memory.peak_job >= 16 * 1024 * 1024
assert accounting.active >= 2 and accounting.processes >= 2
if len(sys.argv) > 1 and sys.argv[1] == "abort":
    print("aborting-owned-job", flush=True)
    abort()
    raise AssertionError("Job abort returned")
child.wait(timeout=5)
deadline = time.monotonic() + 5
while read()[1].active != 1 and time.monotonic() < deadline:
    time.sleep(0.01)
assert read()[1].active == 1
print("quiescent-owned-job")
