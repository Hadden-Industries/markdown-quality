# SPDX-License-Identifier: AGPL-3.0-only
"""Build-only source embedded into both standalone observation drivers."""


def windows_abi():
    import ctypes
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
    kernel.GetCurrentProcess.argtypes = []
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel.QueryInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p]
    kernel.QueryInformationJobObject.restype = wintypes.BOOL
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel.SetInformationJobObject.restype = wintypes.BOOL
    kernel.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.TerminateJobObject.restype = wintypes.BOOL
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.CloseHandle.restype = wintypes.BOOL
    return kernel, Extended, Accounting


def windows_job_raw():
    import ctypes
    kernel, Extended, Accounting = windows_abi()
    job = kernel.CreateJobObjectW(None, None)
    if not job:
        raise ctypes.WinError(ctypes.get_last_error())
    policy = Extended()
    policy.basic.flags = 0x2000  # Kill descendants on driver exit; no resource limits.
    if not kernel.SetInformationJobObject(job, 9, ctypes.byref(policy), ctypes.sizeof(policy)):
        error = ctypes.WinError(ctypes.get_last_error())
        kernel.CloseHandle(job)
        raise error
    if not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        error = ctypes.WinError(ctypes.get_last_error())
        kernel.CloseHandle(job)
        raise error

    def read():
        memory, accounting = Extended(), Accounting()
        for number, record in ((9, memory), (1, accounting)):
            if not kernel.QueryInformationJobObject(job, number, ctypes.byref(record), ctypes.sizeof(record), None):
                raise ctypes.WinError(ctypes.get_last_error())
        return memory, accounting

    def abort():
        if not kernel.TerminateJobObject(job, 2):
            raise ctypes.WinError(ctypes.get_last_error())

    return read, abort
