# SPDX-License-Identifier: AGPL-3.0-only
"""Exercise native ZIP semantics independently of the workflow adapter."""
import importlib.util
import pathlib
import stat
import tempfile
import unittest
import zipfile

SCRIPTS = pathlib.Path(__file__).resolve().parents[1] / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


extract = load("extract-artifact").extract
pack = load("pack-artifact").pack


class Transport(unittest.TestCase):
    def test_real_hidden_input_roundtrip_and_overflow(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            source, destination = root / "source", root / "destination"
            source.mkdir()
            destination.mkdir()
            (source / ".hidden").mkdir()
            (source / ".hidden" / "target.txt").write_bytes(b"literal\r\nbytes")
            archive = root / "payload.zip"
            pack(source, archive, 1024)
            extract(archive, destination, 1024)
            self.assertEqual((destination / ".hidden" / "target.txt").read_bytes(), b"literal\r\nbytes")
            with self.assertRaises(ValueError):
                extract(archive, destination, 1024)

    def test_unsafe_members_fail_before_materialization(self):
        for members in [["../outside"], ["/absolute"], ["C:drive"], ["a\\b"],
                        ["A", "a"], ["NUL.txt"], ["a."]]:
            with self.subTest(members=members), tempfile.TemporaryDirectory() as temporary:
                root = pathlib.Path(temporary)
                archive, destination = root / "payload.zip", root / "destination"
                destination.mkdir()
                with zipfile.ZipFile(archive, "w") as output:
                    for name in members:
                        entry = zipfile.ZipInfo(name)
                        # Preserve the actual raw ZIP member instead of letting
                        # Windows ZipInfo normalize the negative fixture.
                        entry.filename = name
                        entry.orig_filename = name
                        output.writestr(entry, b"data")
                with self.assertRaises(ValueError):
                    extract(archive, destination, 1024)
                self.assertEqual(list(destination.iterdir()), [])

    def test_links_and_excessive_expansion_are_rejected(self):
        for linked in [False, True]:
            with self.subTest(linked=linked), tempfile.TemporaryDirectory() as temporary:
                root = pathlib.Path(temporary)
                archive, destination = root / "payload.zip", root / "destination"
                destination.mkdir()
                entry = zipfile.ZipInfo("member")
                entry.external_attr = (stat.S_IFLNK | 0o777) << 16 if linked else 0
                with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
                    output.writestr(entry, b"x" * 2048)
                with self.assertRaises(ValueError):
                    extract(archive, destination, 1024)
                self.assertEqual(list(destination.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
