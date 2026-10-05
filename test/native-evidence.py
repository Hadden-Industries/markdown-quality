# SPDX-License-Identifier: AGPL-3.0-only
"""Supply-chain regression checks without downloading tools or installing Rust."""
import hashlib
import importlib.util
import io
import json
import pathlib
import sys
import tempfile
import tarfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('native_builder', ROOT / 'scripts/build-native.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
freeze_spec = importlib.util.spec_from_file_location('native_freezer', ROOT / 'scripts/freeze-native.py')
freezer = importlib.util.module_from_spec(freeze_spec)
freeze_spec.loader.exec_module(freezer)


class ToolAcquisitionTests(unittest.TestCase):
    def acquire(self, files, expected=None):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            for name, contents in files:
                archive.writestr(name, contents)
        data = stream.getvalue()
        tool_spec = {'url': 'https://fixture.invalid/tool.zip',
                     'sha256': expected or hashlib.sha256(data).hexdigest()}
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(builder.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
                result = builder.acquire_tool('cargo-about', tool_spec, pathlib.Path(directory), '.exe')
            paths = [p.name for p in pathlib.Path(directory).iterdir()]
            contents = (pathlib.Path(directory) / 'cargo-about.exe').read_bytes()
            return result, paths, contents

    def test_unrelated_traversal_member_is_never_extracted(self):
        result, paths, data = self.acquire([('bundle/cargo-about.exe', b'qualified tool'),
                                           ('../../unrelated.txt', b'not extracted')])
        self.assertEqual(paths, ['cargo-about.exe'])
        self.assertEqual(data, b'qualified tool')
        self.assertEqual(result['executableSha256'], hashlib.sha256(data).hexdigest())

    def test_hash_mismatch_never_executes_or_writes_tool(self):
        with self.assertRaisesRegex(ValueError, 'integrity'):
            self.acquire([('cargo-about.exe', b'tampered')], '0' * 64)

    def test_multiple_matching_members_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'ambiguity'):
            self.acquire([('one/cargo-about.exe', b'one'), ('two/cargo-about.exe', b'two')])

    def test_symlink_tool_is_rejected(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            entry = zipfile.ZipInfo('cargo-about.exe')
            entry.create_system = 3
            entry.external_attr = 0o120777 << 16
            archive.writestr(entry, 'elsewhere')
        data = stream.getvalue()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(builder.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
                with self.assertRaisesRegex(ValueError, 'not regular'):
                    builder.acquire_tool('cargo-about', {'url': 'https://fixture.invalid/tool.zip',
                                         'sha256': hashlib.sha256(data).hexdigest()}, pathlib.Path(directory), '.exe')
            self.assertEqual(list(pathlib.Path(directory).iterdir()), [])

    def test_tar_symlink_tool_is_rejected_without_extraction(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            entry = tarfile.TarInfo('bundle/cargo-about')
            entry.type, entry.linkname = tarfile.SYMTYPE, '../../elsewhere'
            archive.addfile(entry)
        data = stream.getvalue()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(builder.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
                with self.assertRaisesRegex(ValueError, 'ambiguity/type'):
                    builder.acquire_tool('cargo-about', {'url': 'https://fixture.invalid/tool.tar.gz',
                                         'sha256': hashlib.sha256(data).hexdigest()}, pathlib.Path(directory), '')
            self.assertEqual(list(pathlib.Path(directory).iterdir()), [])

    def test_tar_fixed_read_ignores_unrelated_traversal(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:xz') as archive:
            for name, contents in [('bundle/cargo-about', b'original tool'), ('../../outside', b'ignored')]:
                entry = tarfile.TarInfo(name)
                entry.size = len(contents)
                archive.addfile(entry, io.BytesIO(contents))
        data = stream.getvalue()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(builder.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
                builder.acquire_tool('cargo-about', {'url': 'https://fixture.invalid/tool.tar.xz',
                                     'sha256': hashlib.sha256(data).hexdigest()}, pathlib.Path(directory), '')
            self.assertEqual([p.name for p in pathlib.Path(directory).iterdir()], ['cargo-about'])


class RegistryCacheTests(unittest.TestCase):
    def fixture(self, base):
        package = base / 'registry/src/index-fixture/demo-1.0.0'
        package.mkdir(parents=True)
        (package / 'Cargo.toml').write_text('fixture manifest')
        cache = base / 'registry/cache/index-fixture/demo-1.0.0.crate'
        cache.parent.mkdir(parents=True)
        cache.write_bytes(b'fixture immutable crate archive')
        metadata = {'name': 'demo', 'version': '1.0.0', 'source': 'registry+fixture',
                    'manifest_path': str(package / 'Cargo.toml')}
        locked = {('demo', '1.0.0', 'registry+fixture'): {'checksum': builder.digest(cache.read_bytes())}}
        return metadata, locked, cache

    def test_normal_registry_cache_needs_no_vendor_checksum_file(self):
        with tempfile.TemporaryDirectory() as directory:
            metadata, locked, cache = self.fixture(pathlib.Path(directory))
            result = builder.registry_source(metadata, locked)
            self.assertEqual(result['sourceArchiveSha256'], builder.digest(cache.read_bytes()))
            self.assertEqual(result['sourceFileSha256']['Cargo.toml'], builder.digest(b'fixture manifest'))

    def test_changed_cache_archive_is_rejected_against_frozen_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            metadata, locked, cache = self.fixture(pathlib.Path(directory))
            cache.write_bytes(b'changed cached source')
            with self.assertRaisesRegex(ValueError, 'frozen lock'):
                builder.registry_source(metadata, locked)


class ArtifactBindingTests(unittest.TestCase):
    def inputs(self, directory):
        for key, config in builder.CONFIG['tools'].items():
            platform = directory / ('native-' + key)
            platform.mkdir()
            binary = 'snapper-fmt.exe' if key.startswith('win') else 'snapper-fmt'
            data = {name: b'original fixture evidence' for name in freezer.FILES if name != 'build-evidence.json'}
            data[binary] = b'fixture executable, never executed'
            binary_hash = freezer.sha(data[binary])
            data['component-inventory.json'] = json.dumps({'binarySha256': binary_hash}).encode()
            evidence = {'githubRun': '123', 'workflowCommit': 'f' * 40,
                        'source': builder.CONFIG['sourceCommit'], 'lockSha256': builder.CONFIG['lockSha256'],
                        'manifestSha256': builder.CONFIG['manifestSha256'], 'target': config['target'],
                        'profile': builder.CONFIG['profile'], 'features': builder.CONFIG['features'],
                        'extractorSource': builder.CONFIG['auditExtractor'],
                        'rust': 'rustc ' + builder.CONFIG['rust'] + ' fixture',
                        'rustRuntimeLicenseInputs': builder.CONFIG['rustRuntimeLicenseInputs'],
                        'tools': {name: {'archive': config[name]} for name in ('cargo-about', 'cargo-auditable')},
                        'binarySha256': binary_hash, 'files': {name: freezer.sha(value) for name, value in data.items()}}
            data['build-evidence.json'] = json.dumps(evidence).encode()
            for name, value in data.items():
                (platform / name).write_bytes(value)

    def test_changed_binary_is_rejected_even_with_matching_declared_run(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = pathlib.Path(temporary)
            self.inputs(base)
            (base / 'native-win32-x64/snapper-fmt.exe').write_bytes(b'changed binary')
            with self.assertRaisesRegex(ValueError, 'byte mismatch'):
                freezer.freeze(base, base / 'output', '123', 'f' * 40, 'https://fixture.invalid/release')

    def test_different_workflow_commit_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = pathlib.Path(temporary)
            self.inputs(base)
            with self.assertRaisesRegex(ValueError, 'provenance mismatch'):
                freezer.freeze(base, base / 'output', '123', 'e' * 40, 'https://fixture.invalid/release')

    def test_matching_inputs_still_do_not_issue_rights_approval(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = pathlib.Path(temporary)
            self.inputs(base)
            result = freezer.freeze(base, base / 'output', '123', 'f' * 40, 'https://fixture.invalid/release')
            self.assertEqual(result['build']['rights'], 'pending independent reconciliation')
            self.assertEqual(result['platforms']['win32-x64']['archiveSha256'],
                             freezer.sha((base / 'output/snapper-windows.zip').read_bytes()))


if __name__ == '__main__':
    unittest.main()
