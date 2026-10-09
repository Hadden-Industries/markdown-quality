# SPDX-License-Identifier: AGPL-3.0-only
"""Exercise authored text producers with original source bytes kept separately.

Compilation/acquisition are fixture capabilities; actual Python file writers,
archive repacking, inventory hashes and text streams remain under test.
"""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('text_test_builder', ROOT / 'scripts/build-native.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class TextOutputTests(unittest.TestCase):
    def assert_lf(self, data):
        self.assertNotIn(b'\r', data)
        self.assertTrue(data.endswith(b'\n'))
        data.decode('utf-8', errors='strict')

    def test_qualification_summary_writer_uses_lf(self):
        spec = importlib.util.spec_from_file_location('text_test_observer', ROOT / 'scripts/qualify-performance.py')
        observer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(observer)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / 'summary'
            # Empty aggregation isolates this writer; the JS observer test exercises
            # real nonempty input/process measurements. This does not qualify a fleet.
            with patch.object(observer, 'CORPORA', {}), contextlib.redirect_stdout(io.StringIO()):
                observer.qualify('node', str(ROOT / 'src/cli.js'), Path(temporary), output)
            data = (output / 'qualification.json').read_bytes()
            self.assert_lf(data)
            self.assertEqual(json.loads(data)['corpora'], {})

    def test_native_repack_metadata_and_status_are_lf_for_both_archive_formats(self):
        for schema in (1, 2):
            with self.subTest(schema=schema), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                (root / 'scripts').mkdir()
                (root / 'assets').mkdir()
                archives = root / 'archives'
                archives.mkdir()
                shutil.copyfile(ROOT / 'scripts/prepare-native.py', root / 'scripts/prepare-native.py')
                (root / 'LICENSE').write_bytes(b'Wrapper licence\n')
                platforms = {}
                original = b'Original licence\r\nCopyright fixture\r\n'
                for key in ('win32-x64', 'linux-x64'):
                    (root / 'packages' / key).mkdir(parents=True)
                    binary = 'snapper-fmt.exe' if key.startswith('win') else 'snapper-fmt'
                    files = {binary: b'fixture executable, never run', 'LICENSE': original}
                    if schema == 2:
                        files = {name: b'fixture evidence\n' for name in (
                            'COPYRIGHT-library.html', 'THIRD-PARTY-NOTICES.txt',
                            'embedded-dependencies.json', 'component-inventory.json',
                            'cargo-notices.json', 'build-evidence.json', 'MPL-SOURCE.tar.xz')}
                        files.update({binary: b'fixture executable, never run', 'LICENSE.snapper': original})
                    filename = 'snapper-windows.zip' if key.startswith('win') else 'snapper-linux.tar.xz'
                    if key.startswith('win'):
                        with zipfile.ZipFile(archives / filename, 'w') as archive:
                            for name, data in files.items():
                                archive.writestr(name, data)
                    else:
                        with tarfile.open(archives / filename, 'w:xz') as archive:
                            for name, data in files.items():
                                prefix = '' if schema == 2 else 'snapper-fmt-x86_64-unknown-linux-gnu/'
                                member = tarfile.TarInfo(prefix + name)
                                member.size = len(data)
                                archive.addfile(member, io.BytesIO(data))
                    platforms[key] = {'executable': 'bin/' + binary,
                                      'sha256': builder.digest(files[binary]),
                                      'archiveSha256': builder.digest((archives / filename).read_bytes()),
                                      'files': {name: builder.digest(data) for name, data in files.items()}}
                manifest = {'schemaVersion': schema, 'source': 'fixture', 'platforms': platforms,
                            'build': {'rights': 'fixture, not approval'}}
                (root / 'assets/tool-manifest.json').write_bytes(json.dumps(manifest).encode('utf-8'))
                result = subprocess.run([sys.executable, str(root / 'scripts/prepare-native.py'),
                                         '--archives', str(archives)], capture_output=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)
                for key in platforms:
                    package = root / 'packages' / key
                    self.assert_lf((package / 'component.json').read_bytes())
                    self.assertEqual((package / 'LICENSE.snapper').read_bytes(), original)
                    self.assertEqual((package / platforms[key]['executable']).read_bytes(),
                                     b'fixture executable, never run')
                self.assert_lf(result.stdout)
                self.assertEqual(len(result.stdout.splitlines()), 2)

    def test_build_writes_lf_configuration_json_notices_and_status_before_hashing(self):
        original = 'Original © notice\r\nTabs\t and  spaces\rLone CR\nEscaped \\r\\n\u2028Unicode separator\n'.encode('utf-8')
        rendered = 'Original © notice\nTabs\t and  spaces\nLone CR\nEscaped \\r\\n\u2028Unicode separator\n'.encode('utf-8')
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'source'
            source.mkdir()
            output = root / 'output'
            config = copy.deepcopy(builder.CONFIG)
            target = config['tools']['win32-x64']['target']
            crate = root / 'registry/src/index-fixture/webpki-roots-0.25.4'
            crate.mkdir(parents=True)
            (crate / 'Cargo.toml').write_bytes(b'fixture manifest\n')
            (crate / 'LICENSE').write_bytes(original)
            cache = root / 'registry/cache/index-fixture/webpki-roots-0.25.4.crate'
            cache.parent.mkdir(parents=True)
            cache.write_bytes(b'original crate archive')
            (source / 'Cargo.toml').write_bytes(('[features]\ndefault = ' + json.dumps(config['features']) + '\n').encode())
            (source / 'Cargo.lock').write_bytes(('[[package]]\nname = "webpki-roots"\nversion = "0.25.4"\n'
                                               'source = "registry+fixture"\nchecksum = "' + builder.digest(cache.read_bytes()) + '"\n').encode())
            (source / 'LICENSE').write_bytes(original)
            for filename, field in [('Cargo.toml', 'manifestSha256'), ('Cargo.lock', 'lockSha256')]:
                config[field] = builder.digest((source / filename).read_bytes())
            sysroot = root / 'sysroot'
            runtime = sysroot / 'share/doc/rust/COPYRIGHT-library.html'
            runtime.parent.mkdir(parents=True)
            runtime.write_bytes(original)
            config['rustRuntimeLicenseInputs'] = [{'path': 'LICENSE', 'url': 'https://fixture.invalid/license',
                                                 'sha256': builder.digest(original)}]
            binary = source / 'target' / target / config['profile'] / 'snapper-fmt.exe'
            binary.parent.mkdir(parents=True)
            binary.write_bytes(b'fixture binary')
            package = {'name': 'webpki-roots', 'version': '0.25.4', 'license': 'MPL-2.0',
                       'source': 'registry+fixture', 'manifest_path': str(crate / 'Cargo.toml')}

            def fixture_command(args, cwd=None, capture=False, timeout=3600):
                # Supply external tool results; do not replace any producer write.
                if args[:3] == ['git', 'rev-parse', 'HEAD']:
                    return config['sourceCommit'].encode() + b'\n'
                if args[:3] == ['rustc', '--version', '--verbose']:
                    return ('rustc ' + config['rust'] + ' fixture\ncommit-hash: ' + config['rustSourceCommit'] + '\n').encode()
                if args[:3] == ['rustc', '--print', 'sysroot']:
                    return str(sysroot).encode() + b'\n'
                if args[:2] == ['cargo', 'metadata']:
                    return json.dumps({'packages': [package]}).encode()
                if args[0].endswith('cargo-about.exe'):
                    (output / 'cargo-notices.json').write_bytes(b'{\r\n"licenses":[]\r\n}\r\n')
                if args[0].endswith('rust-audit-info.exe'):
                    return b'{"packages":[]}\n'
                return None

            stream_bytes = io.BytesIO()
            # An explicit hostile host stream proves the producer selects LF.
            stream = io.TextIOWrapper(stream_bytes, encoding='utf-8', newline='\r\n')
            argv = ['build-native.py', '--platform', 'win32-x64', '--source', str(source), '--output', str(output)]
            with patch.object(builder, 'CONFIG', config), patch.object(builder, 'run', fixture_command), \
                    patch.object(builder, 'acquire_extractor', return_value=config['auditExtractor']), \
                    patch.object(builder, 'acquire_tool', side_effect=lambda name, spec, directory, suffix: {'archive': spec}), \
                    patch.object(builder.urllib.request, 'urlopen', side_effect=lambda *args, **kwargs: io.BytesIO(original)), \
                    patch.object(sys, 'argv', argv), \
                    patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_RUN_ID': '123', 'GITHUB_SHA': 'f' * 40}), \
                    contextlib.redirect_stdout(stream):
                builder.main()
            stream.flush()
            try:
                self.assert_lf((root / 'native-tools-win32-x64/about.toml').read_bytes())
                for name in ('cargo-notices.json', 'embedded-dependencies.json', 'component-inventory.json', 'build-evidence.json'):
                    self.assert_lf((output / name).read_bytes())
                notices = (output / 'THIRD-PARTY-NOTICES.txt').read_bytes()
                self.assert_lf(notices)
                self.assertIn(rendered, notices)
                inventory = json.loads((output / 'component-inventory.json').read_bytes())
                record = inventory['packages'][0]['notices'][0]
                self.assertEqual(record['text'].encode('utf-8'), original)
                self.assertEqual(record['sha256'], builder.digest(original))
                self.assertEqual((output / 'LICENSE.snapper').read_bytes(), original)
                self.assertEqual((output / 'COPYRIGHT-library.html').read_bytes(), original)
                evidence = json.loads((output / 'build-evidence.json').read_bytes())
                for name, identity in evidence['files'].items():
                    self.assertEqual(hashlib.sha256((output / name).read_bytes()).hexdigest(), identity)
                self.assert_lf(stream_bytes.getvalue())
            finally:
                stream.detach()


if __name__ == '__main__':
    unittest.main()
