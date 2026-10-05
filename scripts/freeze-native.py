# SPDX-License-Identifier: AGPL-3.0-only
"""Freeze downloaded hosted outputs into deterministic archives and a candidate manifest.

This binds acquisition bytes; it does not issue rights or release approval.
"""
import argparse
import hashlib
import io
import json
import pathlib
import tarfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = ('LICENSE.snapper', 'COPYRIGHT-library.html', 'THIRD-PARTY-NOTICES.txt',
         'embedded-dependencies.json', 'component-inventory.json', 'cargo-notices.json', 'build-evidence.json',
         'MPL-SOURCE.tar.xz')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Native evidence must be a regular file')
    with path.open('rb') as stream:
        data = stream.read(100_000_001)
    if len(data) > 100_000_000:
        raise ValueError('Invalid/bounded native evidence input')
    return data


def freeze(inputs, output, run_id, workflow_commit, release_url, rights_path=None):
    manifest = json.loads((ROOT / 'assets/tool-manifest.json').read_text(encoding='utf-8'))
    build = json.loads((ROOT / 'assets/native-build.json').read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=False)
    manifest['schemaVersion'] = 2
    manifest['build'] = {'runId': run_id, 'workflowCommit': workflow_commit,
                         'rights': 'pending independent reconciliation', 'configSha256': sha(read(ROOT / 'assets/native-build.json'))}
    supplement = None
    if rights_path is not None:
        supplement_bytes = read(rights_path)
        if len(supplement_bytes) > 1_000_000:
            raise ValueError('Rights supplement exceeds bound')
        supplement = json.loads(supplement_bytes)
        if (supplement['schemaVersion'] != 1 or supplement['sourceCommit'] != build['sourceCommit']
                or str(supplement['githubRun']) != str(run_id)
                or supplement['workflowCommit'] != workflow_commit):
            raise ValueError('Rights supplement provenance mismatch')
        manifest['build']['rightsSupplementSha256'] = sha(supplement_bytes)
        # This separately authored repack evidence must never masquerade as build output.
        manifest['build']['rightsSupplement'] = supplement
    for key, spec in manifest['platforms'].items():
        directory = inputs / ('native-' + key)
        binary_name = pathlib.PurePosixPath(spec['executable']).name
        evidence_bytes = {name: read(directory / name) for name in (*FILES, binary_name)}
        evidence = json.loads(evidence_bytes['build-evidence.json'])
        if (str(evidence['githubRun']) != str(run_id) or evidence['workflowCommit'] != workflow_commit
                or evidence['source'] != build['sourceCommit'] or evidence['lockSha256'] != build['lockSha256']
                or evidence['manifestSha256'] != build['manifestSha256']
                or evidence['target'] != build['tools'][key]['target']
                or evidence['profile'] != build['profile'] or evidence['features'] != build['features']
                or not evidence['rust'].startswith('rustc ' + build['rust'] + ' ')
                or evidence['rustRuntimeLicenseInputs'] != build['rustRuntimeLicenseInputs']
                or any(evidence['tools'][name]['archive'] != build['tools'][key][name]
                       for name in ('cargo-about', 'cargo-auditable'))
                or evidence['extractorSource'] != build['auditExtractor']):
            raise ValueError('Hosted build provenance mismatch: ' + key)
        expected = {name: sha(data) for name, data in evidence_bytes.items() if name != 'build-evidence.json'}
        if evidence['files'] != expected or evidence['binarySha256'] != expected[binary_name]:
            raise ValueError('Hosted evidence byte mismatch: ' + key)
        inventory = json.loads(evidence_bytes['component-inventory.json'])
        if inventory['binarySha256'] != expected[binary_name]:
            raise ValueError('Native inventory is not bound to binary')
        if supplement is not None:
            if supplement['binarySha256'][key] != expected[binary_name]:
                raise ValueError('Rights supplement binary mismatch')
            components = {(p['name'], p['version']): p for p in inventory['packages']}
            for item in supplement['components']:
                component = components[(item['name'], item['version'])]
                if component['sourceArchiveSha256'] != item['sourceArchiveSha256']:
                    raise ValueError('Rights supplement source mismatch')
                for notice in item['notices']:
                    if sha(notice['text'].encode('utf-8')) != notice['sha256']:
                        raise ValueError('Rights supplement notice mismatch')
                    if ('sourceFileSha256' in notice and
                            component['sourceFileSha256'].get(notice['path']) != notice['sourceFileSha256']):
                        raise ValueError('Rights supplement original-file mismatch')
                for matched in item.get('sourceCorrespondence', {}).get('sourceMatches', []):
                    if component['sourceFileSha256'].get(matched['cratePath']) != matched['sha256']:
                        raise ValueError('Rights supplement correspondence mismatch')
            evidence_bytes['rights-evidence.json'] = supplement_bytes
            sections = ['Original source notices added during qualified repacking.\n'
                        'Original hosted build outputs remain unchanged.\n'
                        'Component licenses remain applicable; wrapper license is AGPL-3.0-only.']
            for item in supplement['components']:
                for notice in item['notices']:
                    sections.append(f"\n===== {item['name']} {item['version']} / {notice.get('path', 'source notice')} =====\n{notice['text']}")
            evidence_bytes['SUPPLEMENTAL-NOTICES.txt'] = ('\n'.join(sections) + '\n').encode('utf-8')
            expected.update({name: sha(evidence_bytes[name]) for name in ('rights-evidence.json', 'SUPPLEMENTAL-NOTICES.txt')})
        archive_name = 'snapper-windows.zip' if key.startswith('win') else 'snapper-linux.tar.xz'
        stream = io.BytesIO()
        if key.startswith('win'):
            with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for name, data in sorted(evidence_bytes.items()):
                    info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
                    info.create_system = 3
                    info.external_attr = 0o100644 << 16
                    info.compress_type = zipfile.ZIP_DEFLATED
                    archive.writestr(info, data)
        else:
            with tarfile.open(fileobj=stream, mode='w:xz') as archive:
                for name, data in sorted(evidence_bytes.items()):
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    info.mode = 0o755 if name == binary_name else 0o644
                    info.mtime = 0
                    archive.addfile(info, io.BytesIO(data))
        data = stream.getvalue()
        if len(data) > 40_000_000:
            raise ValueError('Frozen archive exceeds acquisition bound')
        (output / archive_name).write_bytes(data)
        spec.update({'sha256': expected[binary_name], 'archiveSha256': sha(data),
                     'url': release_url.rstrip('/') + '/' + archive_name,
                     'files': {name: sha(data) for name, data in sorted(evidence_bytes.items())}})
    (output / 'tool-manifest.candidate.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--workflow-commit', required=True)
    parser.add_argument('--release-url', required=True)
    parser.add_argument('--rights', type=pathlib.Path,
                        help='Separate reviewed original-notice supplement; does not grant approval')
    args = parser.parse_args()
    print(json.dumps(freeze(args.inputs, args.output, args.run_id, args.workflow_commit, args.release_url, args.rights)))
