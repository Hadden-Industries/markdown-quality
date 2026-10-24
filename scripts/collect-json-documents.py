# SPDX-License-Identifier: AGPL-3.0-only
"""Stream original JSON bytes after the existing native owners admit them.

Archive and historical-oracle admission retain their existing finite domain
bounds. This transport adds no growing document/result collection or base64 copy;
the shared engine owns JSON quality and cumulative source/census accounting.
"""

import hashlib
import importlib.util
import json
import struct
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
FRAGMENT = 65536


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_owned(path):
    target = ROOT
    for part in path.split("/"):
        if part in ("", ".", "..") or ":" in part or "\\" in part:
            raise ValueError("Unsafe native source path")
        target = target / part
        if target.is_symlink():
            raise ValueError("Linked native source")
    if not target.is_file() or target.stat().st_size > 40000000:
        raise ValueError("Native source is missing or exceeds its bound")
    return target.read_bytes()


def identity(path, body):
    return {
        "path": path,
        "sha256": hashlib.sha256(body).hexdigest(),
        "byteLength": str(len(body)),
    }


def release_inventory():
    path = "dist/json-qualification/release-manifest.json"
    if not (ROOT / path).exists():
        return None
    release = json.loads(read_owned(path))
    manifest = json.loads(read_owned("assets/tool-manifest.json"))
    if {item["name"] for item in release["archives"]} != set(manifest["platforms"]) | {
        "core"
    } or len(release["archives"]) != 3:
        raise ValueError("Incomplete package tuple")
    for item in release["archives"]:
        filename = item["filename"]
        if "/" in filename or "\\" in filename or not filename.endswith(".tgz"):
            raise ValueError("Unsafe package archive filename")
    return release


def authority_paths():
    yield "assets/tool-manifest.json"
    yield "test/fixtures/performance-oracles.json"
    for name in ("owlapi", "webvowl"):
        yield f"test/fixtures/performance-incumbents/{name}.json.gz"
    manifest = json.loads(read_owned("assets/tool-manifest.json"))
    for platform in manifest["platforms"]:
        yield f"packages/{platform}/MPL-SOURCE.tar.xz"
    release = release_inventory()
    if release is not None:
        yield "dist/json-qualification/release-manifest.json"
        for item in release["archives"]:
            yield "dist/json-qualification/" + item["filename"]


def admitted_documents():
    archive_owner = load("json_package_archive", "package-archive.py")
    performance_owner = load("json_performance_evidence", "qualify-performance.py")
    manifest = json.loads(read_owned("assets/tool-manifest.json"))
    for name in ("owlapi", "webvowl"):
        path = f"test/fixtures/performance-incumbents/{name}.json.gz"
        source = read_owned(path)
        body = performance_owner.load_incumbent_bytes(name)
        if read_owned(path) != source:
            raise ValueError("Incumbent changed during admission")
        yield path, name + ".json", body, identity(path, source)
        del body, source
    for platform, spec in manifest["platforms"].items():
        path = f"packages/{platform}/MPL-SOURCE.tar.xz"
        source = read_owned(path)
        _, members, _, bodies = archive_owner.read_archive_members(
            ROOT / path, expected_sha256=spec["files"]["MPL-SOURCE.tar.xz"]
        )
        if read_owned(path) != source:
            raise ValueError("Native source archive changed during admission")
        pin = identity(path, source)
        del source
        for member in members:
            if member.name.lower().endswith((".json", ".jsonld", ".sarif")):
                body = bodies[member.name]
                if (
                    member.name != "webpki-roots-0.25.4/.cargo_vcs_info.json"
                    or len(body) != 94
                    or hashlib.sha256(body).hexdigest()
                    != "555820648728561eac884844e331dd2612e40e257637734b51bb4976bc1307e6"
                ):
                    raise ValueError(
                        "Immutable npm source member no longer matches its verified identity"
                    )
                yield path, member.name, body, pin
                del body
            elif member.name.lower().endswith(
                (".jsonl", ".ndjson", ".jsonc", ".json5")
            ):
                raise ValueError(
                    "Native archive needs an accepted dialect/record contract"
                )
        del bodies, members
    release = release_inventory()
    if release is None:
        return
    for item in release["archives"]:
        path = "dist/json-qualification/" + item["filename"]
        source = read_owned(path)
        _, members, inventory, bodies = archive_owner.read_archive_members(
            ROOT / path,
            expected_sha256=item["sha256"],
            package_only=True,
            core_inventory=item["files"] if item["name"] == "core" else None,
        )
        expected = {
            "package/" + entry["path"]: entry["sha256"] for entry in item["files"]
        }
        if len(expected) != len(item["files"]) or inventory != expected:
            raise ValueError("Packed membership differs from staged file inventory")
        for entry in item["files"]:
            if len(bodies["package/" + entry["path"]]) != entry["size"]:
                raise ValueError("Packed member size differs from stage")
        if read_owned(path) != source:
            raise ValueError("Package archive changed during admission")
        if item["name"] != "core" and bodies["package/MPL-SOURCE.tar.xz"] != read_owned(
            f"packages/{item['name']}/MPL-SOURCE.tar.xz"
        ):
            raise ValueError("Packed MPL source differs from admitted source")
        pin = identity(path, source)
        del source
        for member in members:
            if member.name.lower().endswith((".json", ".jsonld", ".sarif")):
                yield path, member.name, bodies[member.name], pin
            elif member.name.lower().endswith(
                (".jsonl", ".ndjson", ".jsonc", ".json5")
            ):
                raise ValueError(
                    "Package archive needs an accepted dialect/record contract"
                )
        del bodies, members, inventory, expected


def frame(kind, body):
    if len(body) > FRAGMENT:
        raise ValueError("Native provider frame exceeds its bound")
    sys.stdout.buffer.write(kind.encode("ascii") + struct.pack("<I", len(body)))
    sys.stdout.buffer.write(body)
    sys.stdout.buffer.flush()


def control(value):
    frame(
        "J",
        json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
    )


def main():
    if (
        len(sys.argv) != 3
        or sys.argv[1] != "--phase"
        or sys.argv[2] not in ("authorities", "inventory", "documents")
    ):
        raise ValueError("Expected one fixed native provider phase")
    phase = sys.argv[2]
    if phase == "authorities":
        for path in authority_paths():
            control({"type": "authority", "entry": identity(path, read_owned(path))})
    else:
        for path, member, body, source in admitted_documents():
            logical = path + "!/" + member
            origin = {"kind": "archive-member", **source, "memberPath": member}
            if phase == "inventory":
                control(
                    {
                        "type": "inventory",
                        "entry": {**identity(logical, body), "source": origin},
                    }
                )
            else:
                control({"type": "document", "path": logical, "source": origin})
                for offset in range(0, len(body), FRAGMENT):
                    frame("D", body[offset : offset + FRAGMENT])
                control({"type": "document-end"})
    control({"type": "complete"})


if __name__ == "__main__":
    main()
