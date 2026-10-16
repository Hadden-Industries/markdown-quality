# SPDX-License-Identifier: AGPL-3.0-only
"""Supply original JSON buffers admitted by existing native evidence owners.

This collector owns no JSON quality rules, formatting, cumulative accounting or
result schema. The shared engine checks every supplied member and authority.
"""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_owned(path):
    target = ROOT
    for part in path.split('/'):
        if part in ('', '.', '..') or ':' in part or '\\' in part:
            raise ValueError('Unsafe native source path')
        target = target / part
        if target.is_symlink():
            raise ValueError('Linked native source')
    if not target.is_file() or target.stat().st_size > 40000000:
        raise ValueError('Native source is missing or exceeds its bound')
    return target.read_bytes()


def identity(path, body):
    return {'path': path, 'sha256': hashlib.sha256(body).hexdigest(), 'byteLength': len(body)}


def collect():
    archive_owner = load('json_package_archive', 'package-archive.py')
    performance_owner = load('json_performance_evidence', 'qualify-performance.py')
    result = {'inventory': [], 'documents': [], 'authorities': []}

    def authority(path):
        body = read_owned(path)
        result['authorities'].append(identity(path, body))
        return body

    def document(path, member, body, source):
        logical = path + '!/' + member
        result['inventory'].append({**identity(logical, body), 'source': {
            'kind': 'archive-member', **identity(path, source), 'memberPath': member}})
        result['documents'].append({'path': logical, 'base64': base64.b64encode(body).decode('ascii')})

    manifest = json.loads(authority('assets/tool-manifest.json'))
    authority('test/fixtures/performance-oracles.json')
    for name in ('owlapi', 'webvowl'):
        path = f'test/fixtures/performance-incumbents/{name}.json.gz'
        source = read_owned(path)
        body = performance_owner.load_incumbent_bytes(name)
        # The native owner admits the historical full-result oracle. Bind its
        # original bytes and ensure the compressed input did not change meanwhile.
        if read_owned(path) != source:
            raise ValueError('Incumbent changed during admission')
        document(path, name + '.json', body, source)
    for platform, spec in manifest['platforms'].items():
        path = f'packages/{platform}/MPL-SOURCE.tar.xz'
        source = read_owned(path)
        _, members, _, bodies = archive_owner.read_archive_members(
            ROOT / path, expected_sha256=spec['files']['MPL-SOURCE.tar.xz'])
        if read_owned(path) != source:
            raise ValueError('Native source archive changed during admission')
        for member in members:
            if member.name.lower().endswith(('.json', '.jsonld', '.sarif')):
                if (member.name != 'webpki-roots-0.25.4/.cargo_vcs_info.json'
                        or len(bodies[member.name]) != 94
                        or hashlib.sha256(bodies[member.name]).hexdigest() != '555820648728561eac884844e331dd2612e40e257637734b51bb4976bc1307e6'):
                    raise ValueError('Immutable npm source member no longer matches its verified identity')
                document(path, member.name, bodies[member.name], source)
            elif member.name.lower().endswith(('.jsonl', '.ndjson', '.jsonc', '.json5')):
                raise ValueError('Native archive needs an accepted dialect/record contract')

    # The real packer's complete file inventory independently binds every staged
    # member to the final tar bytes. A missing/extra member cannot shrink coverage.
    release_path = 'dist/json-qualification/release-manifest.json'
    if (ROOT / release_path).exists():
        release = json.loads(authority(release_path))
        platforms = set(manifest['platforms'])
        if {item['name'] for item in release['archives']} != platforms | {'core'} or len(release['archives']) != 3:
            raise ValueError('Incomplete package tuple')
        for item in release['archives']:
            filename = item['filename']
            if '/' in filename or '\\' in filename or not filename.endswith('.tgz'):
                raise ValueError('Unsafe package archive filename')
            path = 'dist/json-qualification/' + filename
            source = read_owned(path)
            _, members, inventory, bodies = archive_owner.read_archive_members(
                ROOT / path, expected_sha256=item['sha256'], package_only=True,
                core_inventory=item['files'] if item['name'] == 'core' else None)
            expected = {'package/' + entry['path']: entry['sha256'] for entry in item['files']}
            if len(expected) != len(item['files']) or inventory != expected:
                raise ValueError('Packed membership differs from staged file inventory')
            for entry in item['files']:
                if len(bodies['package/' + entry['path']]) != entry['size']:
                    raise ValueError('Packed member size differs from stage')
            if read_owned(path) != source:
                raise ValueError('Package archive changed during admission')
            if item['name'] != 'core':
                # Its nested source archive has already received original-member
                # analysis above; prove the shipped copy is exactly that source.
                if bodies['package/MPL-SOURCE.tar.xz'] != read_owned(f"packages/{item['name']}/MPL-SOURCE.tar.xz"):
                    raise ValueError('Packed MPL source differs from admitted source')
            for member in members:
                if member.name.lower().endswith(('.json', '.jsonld', '.sarif')):
                    document(path, member.name, bodies[member.name], source)
                elif member.name.lower().endswith(('.jsonl', '.ndjson', '.jsonc', '.json5')):
                    raise ValueError('Package archive needs an accepted dialect/record contract')
    return result


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', newline='\n')
    if len(sys.argv) != 1:
        raise ValueError('This collector has a fixed repository-native input set')
    print(json.dumps(collect(), separators=(',', ':')))
