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


class PackageModeTests(unittest.TestCase):
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
