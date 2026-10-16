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


def read_archive_members(archive_path: Path, expected_sha256=None, package_only=False, core_inventory=None):
    """Admit complete native/package tar membership before any caller uses bytes.

    No extraction occurs. Case aliases, links, sparse/extended payload metadata,
    unsafe names and duplicate members are not independent regular documents.
    """
    declared = None
    if core_inventory is not None:
        # Bundled core admission uses the existing architecture envelope, plus
        # exact packer membership. Native package normalization keeps its 100-file bound.
        if not package_only or expected_sha256 is None or not isinstance(core_inventory, list) or not 0 < len(core_inventory) <= 4096:
            raise ValueError('Invalid core inventory admission')
        declared = {}
        for item in core_inventory:
            path, size, digest = item['path'], item['size'], item['sha256']
            if not isinstance(path, str) or type(size) is not int or not 0 <= size <= 8 * 1024 * 1024 or not isinstance(digest, str) or len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
                raise ValueError('Invalid core member declaration')
            key = 'package/' + path
            if key in declared:
                raise ValueError('Duplicate core member declaration')
            declared[key] = (size, digest)
        if sum(size for size, _ in declared.values()) > 64 * 1024 * 1024:
            raise ValueError('Core inventory exceeds architecture byte limit')
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
            if len(members) >= (len(declared) if declared is not None else 100 if package_only else 10000) or expanded_size > maximum_expanded:
                raise ValueError('Generated package archive exceeds limits')
            if declared is not None and (member.name not in declared or member.size != declared[member.name][0]):
                raise ValueError('Core archive differs from exact declared membership')
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
            if declared is not None and inventory[member.name] != declared[member.name][1]:
                raise ValueError('Core member differs from declared digest')
            bodies[member.name] = body
            members.append(member)
        if declared is not None and set(inventory) != set(declared):
            raise ValueError('Core archive omitted declared members')
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
