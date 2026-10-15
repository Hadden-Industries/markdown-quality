# SPDX-License-Identifier: AGPL-3.0-only
"""Preserve generated npm member bytes and normalize the frozen native executable mode."""
import hashlib
import gzip
import io
import json
import lzma
import os
from pathlib import Path
import sys
import tarfile
import tempfile


def read_archive_members(archive_path: Path, expected_sha256=None, package_only=False):
    """Admit complete native/package tar membership before any caller uses bytes.

    No extraction occurs. Case aliases, links, sparse/extended payload metadata,
    unsafe names and duplicate members are not independent regular documents.
    """
    maximum = 20000000 if package_only else 40000000
    if archive_path.is_symlink() or not archive_path.is_file() or archive_path.stat().st_size > maximum:
        raise ValueError("Generated package archive exceeds compressed limit")
    source = archive_path.read_bytes()
    source_sha256 = hashlib.sha256(source).hexdigest()
    if expected_sha256 is not None and source_sha256 != expected_sha256:
        raise ValueError('Native archive identity mismatch')
    maximum_expanded = 134217728
    if source.startswith(b'\x1f\x8b'):
        decoder = gzip.GzipFile(fileobj=io.BytesIO(source))
    elif source.startswith(b'\xfd7zXZ\x00'):
        decoder = lzma.LZMAFile(io.BytesIO(source))
    else:
        decoder = io.BytesIO(source)
    with decoder:
        expanded = decoder.read(maximum_expanded + 1)
    if len(expanded) > maximum_expanded:
        raise ValueError('Generated package archive exceeds expansion limit')
    with tarfile.open(fileobj=io.BytesIO(expanded), mode="r:") as archive:
        members = []
        expanded_size = 0
        inventory = {}
        bodies = {}
        folded = set()
        for member in archive:
            expanded_size += member.size
            if len(members) >= (100 if package_only else 10000) or expanded_size > maximum_expanded:
                raise ValueError('Generated package archive exceeds limits')
            parts = member.name.split("/")
            if (not member.isfile() or member.sparse is not None or not parts
                    or (package_only and parts[0] != "package")
                    or any(part in ("", ".", "..") or ":" in part or "\\" in part for part in parts)
                    or member.name in inventory or member.name.casefold() in folded
                    or any(key not in ('path', 'mtime', 'atime', 'ctime') for key in member.pax_headers)):
                raise ValueError("Expected unique regular package members")
            folded.add(member.name.casefold())
            body = archive.extractfile(member).read()
            if len(body) != member.size:
                raise ValueError('Incomplete archive member')
            inventory[member.name] = hashlib.sha256(body).hexdigest()
            bodies[member.name] = body
            members.append(member)
    return source_sha256, members, inventory, bodies


def normalize_executable(archive_path: Path, member_name: str, binary_sha256: str):
    source_sha256, members, inventory, bodies = read_archive_members(archive_path, package_only=True)
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
