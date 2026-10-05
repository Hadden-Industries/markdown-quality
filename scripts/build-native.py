# SPDX-License-Identifier: AGPL-3.0-only
"""Owned hosted build; no registry credentials, installers, or local tool setup.

The embedded graph is conservative stable-Cargo metadata, not proof of exact
linker reachability. License harvest and Rust runtime coverage are separate.
Outputs require independent rights review and runtime qualification before use.
"""
import argparse
import hashlib
import io
import json
import os
import pathlib
import re
import shutil
import stat
import subprocess
import tarfile
import tomllib
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / 'assets/native-build.json').read_text())
MAX_TEXT = 32_000_000


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path, limit=MAX_TEXT):
    with pathlib.Path(path).open('rb') as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Input exceeds evidence bound: ' + str(path))
    return data


def run(args, cwd=None, capture=False, timeout=3600):
    result = subprocess.run(args, cwd=cwd, check=True, timeout=timeout,
                            stdout=subprocess.PIPE if capture else None)
    if capture:
        if len(result.stdout) > MAX_TEXT:
            raise ValueError('Command output exceeds evidence bound')
        return result.stdout


def acquire_tool(name, spec, directory, suffix):
    request = urllib.request.Request(spec['url'], headers={'User-Agent': 'markdown-quality-native-build'})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read(20_000_001)
    if len(data) > 20_000_000 or digest(data) != spec['sha256']:
        raise ValueError('Tool archive integrity failure: ' + name)
    expected = name + suffix
    if spec['url'].endswith('.zip'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > 64 or sum(x.file_size for x in entries) > 100_000_000:
                raise ValueError('Tool archive resource bound')
            members = [x for x in entries if pathlib.PurePosixPath(x.filename).name == expected]
            if len(members) != 1:
                raise ValueError('Tool archive member ambiguity')
            member = members[0]
            kind = stat.S_IFMT(member.external_attr >> 16)
            if member.is_dir() or member.external_attr & 0x10 or (member.create_system == 3 and kind not in (0, stat.S_IFREG)):
                raise ValueError('Tool member is not regular')
            executable = archive.read(member)
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:*') as archive:
            entries = archive.getmembers()
            if len(entries) > 64 or sum(x.size for x in entries) > 100_000_000:
                raise ValueError('Tool archive resource bound')
            members = [x for x in entries if pathlib.PurePosixPath(x.name).name == expected]
            if len(members) != 1 or not members[0].isfile():
                raise ValueError('Tool archive member ambiguity/type')
            executable = archive.extractfile(members[0]).read()
    destination = directory / expected
    destination.write_bytes(executable)
    destination.chmod(0o755)
    return {'archive': spec, 'executableSha256': digest(executable)}


def notice_files(base):
    """Retain original copyright/notice/license texts, including native subtrees."""
    result = []
    for parent, directories, files in os.walk(base, followlinks=False):
        directories[:] = sorted(d for d in directories if d not in ('.git', 'target')
                                and not (pathlib.Path(parent) / d).is_symlink())
        for name in sorted(files):
            path = pathlib.Path(parent) / name
            if path.is_symlink() or not re.match(r'(?i)^(licen[sc]e|copying|copyright|notice|authors)([.\-_]|$)', name):
                continue
            data = read(path, 2_000_000)
            try:
                text = data.decode('utf-8')
            except UnicodeDecodeError:
                raise ValueError('Non-text notice requires manual qualification: ' + str(path))
            result.append({'path': path.relative_to(base).as_posix(), 'sha256': digest(data), 'text': text})
    return result


def acquire_extractor(directory):
    spec = CONFIG['auditExtractor']
    with urllib.request.urlopen(spec['url'], timeout=60) as response:
        data = response.read(2_000_001)
    if len(data) > 2_000_000 or digest(data) != spec['sha256']:
        raise ValueError('Audit extractor source integrity failure')
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        members = archive.getmembers()
        if len(members) > 32 or sum(x.size for x in members) > 2_000_000:
            raise ValueError('Audit extractor source resource bound')
        seen = set()
        for member in members:
            parts = pathlib.PurePosixPath(member.name).parts
            if (not member.isfile() or not parts or parts[0] != 'rust-audit-info-0.5.4'
                    or any(p in ('..', '.', '') or ':' in p or '\\' in p for p in parts)
                    or member.name in seen):
                raise ValueError('Unexpected extractor source member')
            seen.add(member.name)
            path = directory.joinpath(*parts[1:])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(archive.extractfile(member).read())
    vcs = json.loads(read(directory / '.cargo_vcs_info.json'))
    if vcs['git']['sha1'] != spec['sourceCommit']:
        raise ValueError('Extractor source revision mismatch')
    return spec


def registry_source(package, locked):
    """Normal Cargo cache archives are verified against the frozen lock, not vendor metadata."""
    base = pathlib.Path(package['manifest_path']).parent
    identity = (package['name'], package['version'], package['source'])
    checksum = locked[identity]['checksum']
    archive_name = package['name'] + '-' + package['version'] + '.crate'
    cache = base.parent.parent.parent / 'cache' / base.parent.name / archive_name
    data = read(cache, 100_000_000)
    if digest(data) != checksum:
        raise ValueError('Cargo cache archive does not match frozen lock')
    source_files = {}
    for path in sorted(base.rglob('*')):
        if path.is_symlink():
            raise ValueError('Registry source symlink requires qualification')
        if path.is_file() and path.name != '.cargo-ok':
            if len(source_files) >= 10000:
                raise ValueError('Registry source file count bound')
            source_files[path.relative_to(base).as_posix()] = digest(read(path))
    return {'sourceArchiveSha256': checksum, 'sourceFileSha256': source_files,
            'sourceArchiveUrl': 'https://static.crates.io/crates/' + package['name'] + '/' + archive_name}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platform', choices=CONFIG['tools'], required=True)
    parser.add_argument('--source', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise ValueError('This procedure is restricted to hosted CI')
    source, output = args.source.resolve(), args.output.resolve()
    if run(['git', 'rev-parse', 'HEAD'], source, True).decode().strip() != CONFIG['sourceCommit']:
        raise ValueError('Unexpected native source revision')
    for filename, field in [('Cargo.lock', 'lockSha256'), ('Cargo.toml', 'manifestSha256')]:
        # Git checkout on Windows must preserve the committed LF bytes.
        if digest(read(source / filename)) != CONFIG[field]:
            raise ValueError('Frozen source identity mismatch: ' + filename)
    source_manifest = tomllib.loads(read(source / 'Cargo.toml').decode())
    if source_manifest['features']['default'] != CONFIG['features']:
        raise ValueError('Declared feature set differs from frozen source defaults')
    locked = {(p['name'], p['version'], p.get('source')): p
              for p in tomllib.loads(read(source / 'Cargo.lock').decode())['package']}
    output.mkdir(parents=True, exist_ok=False)
    tools = output.parent / ('native-tools-' + args.platform)
    tools.mkdir(exist_ok=False)
    audit = tools / 'extractor-source'
    audit.mkdir()
    extractor_provenance = acquire_extractor(audit)
    suffix = '.exe' if args.platform.startswith('win') else ''
    spec = CONFIG['tools'][args.platform]
    provenance = {name: acquire_tool(name, spec[name], tools, suffix)
                  for name in ('cargo-auditable', 'cargo-about')}
    os.environ['PATH'] = str(tools) + os.pathsep + os.environ['PATH']
    os.environ['RUSTUP_TOOLCHAIN'] = CONFIG['rust']
    # rustup is the runner's installed tool manager; no downloaded installer runs.
    run(['rustup', 'toolchain', 'install', CONFIG['rust'], '--profile', 'minimal'])
    toolchain = run(['rustc', '--version', '--verbose'], capture=True).decode()
    if not toolchain.startswith('rustc ' + CONFIG['rust'] + ' '):
        raise ValueError('Unexpected Rust toolchain')
    if 'commit-hash: ' + CONFIG['rustSourceCommit'] not in toolchain.splitlines():
        raise ValueError('Unexpected Rust source revision')
    target = spec['target']
    features = ['--no-default-features', '--features', ','.join(CONFIG['features'])]
    metadata = json.loads(run(['cargo', 'metadata', '--locked', '--format-version', '1',
                              '--filter-platform', target, *features], source, True))
    config_path = tools / 'about.toml'
    config_path.write_text('accepted = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", '
                          '"Unicode-3.0", "Unicode-DFS-2016", "Zlib", "BSL-1.0", "CC0-1.0", "Unlicense"]\n'
                          'ignore-dev-dependencies = true\nignore-build-dependencies = false\n'
                          'ignore-transitive-dependencies = false\ntargets = ["' + target + '"]\n'
                          '[webpki-roots]\naccepted = ["MPL-2.0"]\n', encoding='utf-8')
    run([str(tools / ('cargo-about' + suffix)), 'generate', '--locked', '--fail', '--format', 'json',
         '--config', str(config_path), '--manifest-path', str(source / 'Cargo.toml'),
         '--output-file', str(output / 'cargo-notices.json'), '--no-default-features',
         '--features', ' '.join(CONFIG['features'])], source)
    cargo_notices = json.loads(read(output / 'cargo-notices.json'))
    packages = []
    mpl_source = output / 'MPL-SOURCE.tar.xz'
    mpl_packages = [p for p in metadata['packages'] if 'MPL-2.0' in (p.get('license') or '')]
    if [(p['name'], p['version'], p['license']) for p in mpl_packages] != [('webpki-roots', '0.25.4', 'MPL-2.0')]:
        raise ValueError('Changed MPL component set requires new rights qualification')
    with tarfile.open(mpl_source, mode='w:xz') as archive:
        total = 0
        for package in mpl_packages:
            base = pathlib.Path(package['manifest_path']).parent
            for path in sorted(base.rglob('*')):
                if path.is_symlink():
                    raise ValueError('MPL source contains a symlink')
                if path.is_file():
                    data = read(path, 8_000_000)
                    total += len(data)
                    if total > MAX_TEXT:
                        raise ValueError('MPL source resource bound')
                    info = tarfile.TarInfo(package['name'] + '-' + package['version'] + '/' + path.relative_to(base).as_posix())
                    info.size, info.mode, info.mtime = len(data), 0o644, 0
                    archive.addfile(info, io.BytesIO(data))
    notice_sections = ['Third-party notices for controlled Snapper 0.11.9 build.\n'
                       'Conservative coverage includes build-only dependencies; this does not relicense components.\n'
                       'Unmodified webpki-roots 0.25.4 source is provided in MPL-SOURCE.tar.xz under MPL-2.0.\n'
                       'The wrapper remains AGPL-3.0-only; original native component licenses remain applicable.']
    for package in sorted(metadata['packages'], key=lambda p: (p['name'], p['version'])):
        base = pathlib.Path(package['manifest_path']).parent
        notices = notice_files(base)
        entry = {key: package.get(key) for key in ('name', 'version', 'license', 'source', 'repository')}
        if (package.get('source') or '').startswith('registry+'):
            entry.update(registry_source(package, locked))
        elif package['name'] == 'snapper-fmt' and base == source and package.get('source') is None:
            entry['sourceCommit'] = CONFIG['sourceCommit']
        else:
            raise ValueError('Unqualified non-registry dependency: ' + package['name'])
        entry['notices'] = notices
        packages.append(entry)
        for notice in notices:
            notice_sections.append(f"\n===== {package['name']} {package['version']} / {notice['path']} =====\n{notice['text']}")
    for license in cargo_notices['licenses']:
        names = ', '.join(item['crate']['name'] + ' ' + item['crate']['version'] for item in license['used_by'])
        notice_sections.append(f"\n===== cargo-about: {license['id']} / {names} =====\n{license['text']}")
    sysroot = pathlib.Path(run(['rustc', '--print', 'sysroot'], capture=True).decode().strip())
    runtime = sysroot / 'share/doc/rust/COPYRIGHT-library.html'
    if not runtime.is_file():
        runtime = sysroot / 'share/doc/rustc/COPYRIGHT-library.html'
    if not runtime.is_file():
        raise ValueError('Official Rust standard-library notices missing')
    shutil.copyfile(runtime, output / 'COPYRIGHT-library.html')
    rust_commit = re.search(r'^commit-hash: ([0-9a-f]{40})$', toolchain, re.MULTILINE)
    if rust_commit is None or rust_commit.group(1) != CONFIG['rustSourceCommit']:
        raise ValueError('Rust source revision unavailable')
    runtime_terms = []
    for license_spec in CONFIG['rustRuntimeLicenseInputs']:
        name, url = license_spec['path'], license_spec['url']
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(1_000_001)
        if len(data) > 1_000_000 or digest(data) != license_spec['sha256']:
            raise ValueError('Rust license text integrity/resource failure')
        runtime_terms.append(license_spec)
        notice_sections.append('\n===== Rust runtime / ' + name + ' =====\n' + data.decode('utf-8'))
    notices_text = '\n'.join(notice_sections)
    if len(notices_text.encode()) > MAX_TEXT:
        raise ValueError('Notices resource bound')
    (output / 'THIRD-PARTY-NOTICES.txt').write_text(notices_text, encoding='utf-8')
    # Notice/source collection is a cheap preflight; compile only after it passes.
    run(['cargo', 'build', '--locked', '--release', '--manifest-path',
         str(audit / 'Cargo.toml')], audit)
    extractor = audit / ('target/release/rust-audit-info' + suffix)
    run(['cargo', 'auditable', 'build', '--locked', '--profile', CONFIG['profile'],
         '--bin', 'snapper-fmt', '--target', target, *features], source)
    executable = source / 'target' / target / CONFIG['profile'] / ('snapper-fmt' + suffix)
    binary = read(executable, 100_000_000)
    embedded = json.loads(run([str(extractor), str(executable), '100000000', '8388608'], capture=True))
    shutil.copyfile(source / 'LICENSE', output / 'LICENSE.snapper')
    shutil.copyfile(executable, output / ('snapper-fmt' + suffix))
    def save(name, value):
        (output / name).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    save('embedded-dependencies.json', embedded)
    save('component-inventory.json', {'schemaVersion': 1, 'binarySha256': digest(binary),
         'coverage': 'Conservative target-filtered Cargo graph, original nested notices, embedded auditable graph, official Rust runtime notices. Native and system linkage requires independent reconciliation.',
         'packages': packages})
    for filename, field in [('Cargo.lock', 'lockSha256'), ('Cargo.toml', 'manifestSha256')]:
        if digest(read(source / filename)) != CONFIG[field]:
            raise ValueError('Native build changed frozen source inputs')
    # Absolute runner paths are not part of the recipient inventory.
    save('build-evidence.json', {'schemaVersion': 1, 'status': 'pending independent rights review and platform qualification',
         'source': CONFIG['sourceCommit'], 'lockSha256': CONFIG['lockSha256'],
         'manifestSha256': CONFIG['manifestSha256'], 'rust': toolchain,
         'target': target, 'profile': CONFIG['profile'], 'features': CONFIG['features'],
         'tools': provenance, 'extractorSource': extractor_provenance,
         'rustRuntimeLicenseInputs': runtime_terms,
         'githubRun': os.environ['GITHUB_RUN_ID'], 'workflowCommit': os.environ['GITHUB_SHA'],
         'binarySha256': digest(binary),
         'files': {p.name: digest(read(p, 100_000_000)) for p in sorted(output.iterdir())}})
    # No automatic rights approval or manifest mutation is performed here.
    print(json.dumps({'platform': args.platform, 'binarySha256': digest(binary), 'packages': len(packages)}))


if __name__ == '__main__':
    main()
