# SPDX-License-Identifier: AGPL-3.0-only
import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import sys

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("package_archive", Path(__file__).parents[1] / "scripts/package-archive.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_core_archive(path, files):
    declared = []
    with tarfile.open(path, "w:gz") as archive:
        for name, body in files.items():
            member = tarfile.TarInfo("package/" + name)
            member.size = len(body)
            archive.addfile(member, io.BytesIO(body))
            declared.append({
                "path": name,
                "size": len(body),
                "sha256": hashlib.sha256(body).hexdigest(),
            })
    return hashlib.sha256(path.read_bytes()).hexdigest(), declared


class PackageModeTests(unittest.TestCase):
    def test_core_requires_exact_inventory_without_raising_native_member_bound(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'core.tgz'
            body = b'{}'
            declared = [{'path': f'node_modules/dependency/{index}.json', 'size': len(body),
                         'sha256': hashlib.sha256(body).hexdigest()} for index in range(101)]
            with tarfile.open(path, 'w:gz') as archive:
                for item in declared:
                    member = tarfile.TarInfo('package/' + item['path'])
                    member.size = len(body)
                    archive.addfile(member, io.BytesIO(body))
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            with self.assertRaisesRegex(ValueError, 'exceeds limits'):
                module.read_archive_members(path, digest, package_only=True)
            result = module.read_archive_members(path, digest, package_only=True, core_inventory=declared)
            self.assertEqual(len(result[1]), 101)
            for invalid in (declared[:-1], declared + [{**declared[0], 'path': 'absent.json'}],
                            [{**declared[0], 'sha256': '0' * 64}, *declared[1:]],
                            [{**declared[0], 'size': 8 * 1024 * 1024 + 1}, *declared[1:]]):
                with self.assertRaises(ValueError):
                    module.read_archive_members(path, digest, package_only=True, core_inventory=invalid)

    def test_incidental_bundled_json_is_bound_to_staged_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "core.tgz"
            incidental = "node_modules/format/component.json"
            files = {
                "node_modules/format/package.json": b'{"name":"format","version":"0.2.2"}',
                incidental: b"invalid json",
            }
            digest, declared = write_core_archive(path, files)
            _, _, _, bodies = module.read_archive_members(path, digest, package_only=True, core_inventory=declared)
            self.assertEqual(bodies["package/" + incidental], files[incidental])

            # The new tarball digest is correct but this member differs from stage.
            files[incidental] = b"altered json"
            digest, _ = write_core_archive(path, files)
            with self.assertRaisesRegex(ValueError, "Core member differs from declared digest"):
                module.read_archive_members(path, digest, package_only=True, core_inventory=declared)

    def test_bundled_manifest_requires_strict_json_even_with_matching_digest(self):
        name = "node_modules/eslint/node_modules/@scope/dependency/package.json"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "core.tgz"
            for body in (
                b'{"name":',
                br'{"name":"dependency","\u006eame":"other","version":"1.0.0"}',
                b'{"name":"dependency","version":"1.0.0","value":NaN}',
                b'{"name":"\xff","version":"1.0.0"}',
                b"[]",
            ):
                with self.subTest(body=body):
                    digest, declared = write_core_archive(path, {name: body})
                    with self.assertRaisesRegex(ValueError, "Invalid required bundled JSON"):
                        module.read_archive_members(path, digest, package_only=True, core_inventory=declared)

    def test_eslint_runtime_json_is_required_and_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "core.tgz"
            schema = "node_modules/eslint/node_modules/ajv/lib/refs/json-schema-draft-04.json"
            files = {
                "node_modules/eslint/package.json": b'{"name":"eslint","version":"10.0.0"}',
                "node_modules/eslint/conf/replacements.json": b"{}",
                "node_modules/eslint/node_modules/ajv/lib/refs/json-schema-draft-07.json": b"{}",
            }
            digest, declared = write_core_archive(path, files)
            with self.assertRaisesRegex(ValueError, "Missing required bundled JSON"):
                module.read_archive_members(path, digest, package_only=True, core_inventory=declared)

            files[schema] = b"{"
            digest, declared = write_core_archive(path, files)
            with self.assertRaisesRegex(ValueError, "Invalid required bundled JSON"):
                module.read_archive_members(path, digest, package_only=True, core_inventory=declared)

            files[schema] = b"{}"
            digest, declared = write_core_archive(path, files)
            module.read_archive_members(path, digest, package_only=True, core_inventory=declared)

    def test_case_colliding_members_are_refused_before_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'package.tgz'
            with tarfile.open(path, 'w:gz') as archive:
                for name in ('package/bin/snapper-fmt', 'package/metadata.json', 'package/METADATA.json'):
                    member = tarfile.TarInfo(name)
                    member.size = 1
                    archive.addfile(member, io.BytesIO(b'x'))
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                module.normalize_executable(path, 'package/bin/snapper-fmt', hashlib.sha256(b'x').hexdigest())
            self.assertEqual(path.read_bytes(), original)

    def test_windows_generated_mode_preserves_every_member_byte(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "package.tgz"
            binary = b"frozen-binary\x00\xff"
            with tarfile.open(path, "w:gz") as archive:
                for name, data in {"package/package.json": b'{"license":"AGPL-3.0-only"}', "package/bin/snapper-fmt": binary}.items():
                    member = tarfile.TarInfo(name)
                    member.mode = 0o644
                    member.size = len(data)
                    archive.addfile(member, io.BytesIO(data))
            result = module.normalize_executable(path, "package/bin/snapper-fmt", hashlib.sha256(binary).hexdigest())
            self.assertEqual(result["beforeMode"], "0o644")
            self.assertTrue(result["allMemberBytesPreserved"])
            with tarfile.open(path) as archive:
                self.assertEqual(archive.getmember("package/bin/snapper-fmt").mode, 0o755)
                self.assertEqual(archive.extractfile("package/bin/snapper-fmt").read(), binary)
                self.assertEqual(archive.getmember("package/package.json").mode, 0o644)

    def test_wrong_binary_does_not_replace_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "package.tgz"
            with tarfile.open(path, "w:gz") as archive:
                member = tarfile.TarInfo("package/bin/snapper-fmt")
                member.size = 1
                archive.addfile(member, io.BytesIO(b"x"))
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                module.normalize_executable(path, "package/bin/snapper-fmt", "0" * 64)
            self.assertEqual(path.read_bytes(), original)

    def test_link_member_is_rejected_before_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "package.tgz"
            with tarfile.open(path, "w:gz") as archive:
                member = tarfile.TarInfo("package/bin/snapper-fmt")
                member.type = tarfile.SYMTYPE
                member.linkname = "../../outside"
                archive.addfile(member)
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                module.normalize_executable(path, "package/bin/snapper-fmt", "0" * 64)
            self.assertEqual(path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
