# SPDX-License-Identifier: AGPL-3.0-only
"""Explicit build-only acquisition of frozen native assets."""
import hashlib, json, pathlib, subprocess, sys, tempfile, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'assets/tool-manifest.json').read_text(encoding='utf-8'))
with tempfile.TemporaryDirectory(prefix='markdown-quality-native-') as temporary:
    target = pathlib.Path(temporary)
    for key, spec in manifest['platforms'].items():
        filename = 'snapper-windows.zip' if key.startswith('win') else 'snapper-linux.tar.xz'
        with urllib.request.urlopen(spec['url'], timeout=60) as response:
            data = response.read(40_000_001)
        if len(data) > 40_000_000 or hashlib.sha256(data).hexdigest() != spec['archiveSha256']:
            raise ValueError('Asset size or digest mismatch')
        (target / filename).write_bytes(data)
    subprocess.run([sys.executable, str(root / 'scripts/prepare-native.py'), '--archives', str(target)], check=True)
