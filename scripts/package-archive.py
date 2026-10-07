# SPDX-License-Identifier: AGPL-3.0-only
"""Preserve generated npm member bytes and normalize the frozen native executable mode."""
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile


def normalize_executable(archive_path: Path, member_name: str, binary_sha256: str):
    if archive_path.stat().st_size > 20000000:
        raise ValueError("Generated package archive exceeds compressed limit")
    source_sha256 = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive.getmembers()
        if len(members) > 100 or sum(member.size for member in members) > 134217728:
            raise ValueError("Generated package archive exceeds limits")
        inventory = {}
        bodies = {}
        for member in members:
            parts = member.name.split("/")
            if (not member.isfile() or not parts or parts[0] != "package"
                    or any(part in ("", ".", "..") or ":" in part or "\\" in part for part in parts)
                    or member.name in inventory):
                raise ValueError("Expected unique regular package members")
            body = archive.extractfile(member).read()
            inventory[member.name] = hashlib.sha256(body).hexdigest()
            bodies[member.name] = body
    if inventory.get(member_name) != binary_sha256:
        raise ValueError("Frozen executable member identity mismatch")
    selected = next(member for member in members if member.name == member_name)
    before_mode = selected.mode
    selected.mode = 0o755
    descriptor, temporary = tempfile.mkstemp(prefix=".markdown-quality-package-", suffix=".tgz", dir=archive_path.parent)
    os.close(descriptor)
    try:
        with tarfile.open(temporary, "w:gz", format=tarfile.PAX_FORMAT) as archive:
            for member in members:
                archive.addfile(member, io.BytesIO(bodies[member.name]))
        with tarfile.open(temporary, "r:gz") as archive:
            output = archive.getmembers()
            verified = {member.name: hashlib.sha256(archive.extractfile(member).read()).hexdigest() for member in output}
            if len(output) != len(members) or verified != inventory:
                raise ValueError("Package rewrite changed member bytes")
            if archive.getmember(member_name).mode != 0o755:
                raise ValueError("Executable mode was not retained")
        os.replace(temporary, archive_path)
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink()
    return {"sourceSha256": source_sha256, "sha256": hashlib.sha256(archive_path.read_bytes()).hexdigest(),
            "member": member_name, "binarySha256": binary_sha256, "beforeMode": oct(before_mode),
            "mode": "0o755", "allMemberBytesPreserved": True}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    if len(sys.argv) != 4:
        raise ValueError("Usage: package-archive.py ARCHIVE MEMBER BINARY_SHA256")
    print(json.dumps(normalize_executable(Path(sys.argv[1]), sys.argv[2], sys.argv[3])))
