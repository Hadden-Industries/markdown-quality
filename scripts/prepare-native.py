# SPDX-License-Identifier: AGPL-3.0-only
"""Repack frozen native assets; no upstream installer is executed."""
import argparse, hashlib, io, json, pathlib, stat, sys, tarfile, zipfile

root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'assets/tool-manifest.json').read_text(encoding='utf-8'))
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archives', type=pathlib.Path, required=True)
args = parser.parse_args()
for key, spec in manifest['platforms'].items():
    archive_path = args.archives / ('snapper-windows.zip' if key.startswith('win') else 'snapper-linux.tar.xz')
    with archive_path.open('rb') as archive_input:
        archive_bytes = archive_input.read(40_000_001)
    if len(archive_bytes) > 40_000_000:
        raise ValueError('Archive size limit exceeded')
    if hashlib.sha256(archive_bytes).hexdigest() != spec['archiveSha256']:
        raise ValueError('Upstream archive digest mismatch: ' + key)
    if manifest['schemaVersion'] == 2:
        required = {'LICENSE.snapper', 'COPYRIGHT-library.html', 'THIRD-PARTY-NOTICES.txt',
                    'embedded-dependencies.json', 'component-inventory.json', 'cargo-notices.json',
                    'build-evidence.json', 'MPL-SOURCE.tar.xz', pathlib.PurePosixPath(spec['executable']).name}
        if manifest['build'].get('rightsSupplement'):
            required.update(('rights-evidence.json', 'SUPPLEMENTAL-NOTICES.txt'))
        if set(spec['files']) != required:
            raise ValueError('Incomplete controlled native manifest')
        files = {}
        if key.startswith('win'):
            with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
                entries = archive.infolist()
                if len(entries) != len(required) or {x.filename for x in entries} != required or sum(x.file_size for x in entries) > 100_000_000:
                    raise ValueError('Controlled archive contents/resource mismatch')
                for member in entries:
                    kind = stat.S_IFMT(member.external_attr >> 16)
                    if member.is_dir() or (member.create_system == 3 and kind not in (0, stat.S_IFREG)):
                        raise ValueError('Expected regular controlled archive member')
                    files[member.filename] = archive.read(member)
        else:
            with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:xz') as archive:
                entries = archive.getmembers()
                if len(entries) != len(required) or {x.name for x in entries} != required or sum(x.size for x in entries) > 100_000_000:
                    raise ValueError('Controlled archive contents/resource mismatch')
                for member in entries:
                    if not member.isfile():
                        raise ValueError('Expected regular controlled archive member')
                    files[member.name] = archive.extractfile(member).read()
        if any(hashlib.sha256(data).hexdigest() != spec['files'][name] for name, data in files.items()):
            raise ValueError('Controlled evidence digest mismatch')
        binary_name = pathlib.PurePosixPath(spec['executable']).name
        if spec['files'][binary_name] != spec['sha256']:
            raise ValueError('Controlled executable identity mismatch')
        if manifest['build'].get('rightsSupplement'):
            if (hashlib.sha256(files['rights-evidence.json']).hexdigest() != manifest['build']['rightsSupplementSha256']
                    or json.loads(files['rights-evidence.json']) != manifest['build']['rightsSupplement']):
                raise ValueError('Repack rights supplement identity mismatch')
        package = root / 'packages' / key
        executable = package / spec['executable']
        executable.parent.mkdir(exist_ok=True)
        executable.write_bytes(files.pop(binary_name))
        executable.chmod(0o755)
        for name, data in files.items():
            (package / name).write_bytes(data)
        (package / 'LICENSE').write_bytes((root / 'LICENSE').read_bytes())
        component = {'schemaVersion': 2, 'upstream': manifest['source'], 'asset': spec,
                     'build': manifest['build'], 'repackedFiles': {spec['executable']: spec['sha256'], **spec['files']},
                     'nativeTransitiveRights': manifest['build']['rights']}
        (package / 'component.json').write_text(json.dumps(component, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'platform': key, 'sha256': spec['sha256']}))
        continue
    if key.startswith('win'):
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            entries = archive.infolist()
            if len(entries) > 16 or sum(i.file_size for i in entries) > 100_000_000:
                raise ValueError('Archive resource limit exceeded')
            for name in ('snapper-fmt.exe', 'LICENSE'):
                member = archive.getinfo(name)
                member_type = stat.S_IFMT(member.external_attr >> 16)
                if member.is_dir() or (member.create_system == 3 and member_type not in (0, stat.S_IFREG)):
                    raise ValueError('Expected regular archive members')
            data = archive.read('snapper-fmt.exe')
            notice = archive.read('LICENSE')
    else:
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:xz') as archive:
            entries = archive.getmembers()
            if len(entries) > 16 or sum(i.size for i in entries) > 100_000_000:
                raise ValueError('Archive resource limit exceeded')
            prefix = 'snapper-fmt-x86_64-unknown-linux-gnu/'
            if not archive.getmember(prefix + 'snapper-fmt').isfile() or not archive.getmember(prefix + 'LICENSE').isfile():
                raise ValueError('Expected regular archive members')
            data = archive.extractfile(prefix + 'snapper-fmt').read()
            notice = archive.extractfile(prefix + 'LICENSE').read()
    if hashlib.sha256(data).hexdigest() != spec['sha256']:
        raise ValueError('Executable digest mismatch')
    package = root / 'packages' / key
    executable = package / spec['executable']
    executable.parent.mkdir(exist_ok=True)
    executable.write_bytes(data)
    executable.chmod(0o755)
    (package / 'LICENSE.snapper').write_bytes(notice)
    (package / 'LICENSE').write_bytes((root / 'LICENSE').read_bytes())
    component = {'schemaVersion': 1, 'upstream': manifest['source'], 'asset': spec, 'repackedFiles': {spec['executable']: spec['sha256']}, 'extractor': 'Python ' + sys.version.split()[0] + ' zipfile/tarfile; fixed member reads', 'nativeTransitiveRights': 'pending complete upstream compiled-component inventory before registry release'}
    (package / 'component.json').write_text(json.dumps(component, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'platform': key, 'sha256': spec['sha256']}))
