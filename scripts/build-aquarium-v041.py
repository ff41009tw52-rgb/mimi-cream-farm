#!/usr/bin/env python3
"""Build the portable V0.4.1 HTML from its authoritative modular sources."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
html = (root / 'aquarium-v0.4.1.html').read_text(encoding='utf-8')
for name in ('aquarium.css','aquarium-observation.css'):
    css = (root / 'assets/aquarium-v041-r2' / name).read_text(encoding='utf-8')
    html = html.replace(f'<link rel="stylesheet" href="assets/aquarium-v041-r2/{name}">', '<style>\n' + css + '\n</style>')
scripts = []
for name in ('aquarium-data.js', 'aquarium-save.js', 'aquarium-world.js', 'aquarium-observation-content.js', 'aquarium-observation-renderer.js', 'aquarium-observation.js', 'aquarium-fish-art.js', 'aquarium.js'):
    html = html.replace(f'<script defer src="assets/aquarium-v041-r2/{name}"></script>', '')
    script = (root / 'assets/aquarium-v041-r2' / name).read_text(encoding='utf-8')
    scripts.append('<script>\n' + script.replace('</script', '<\\/script') + '\n</script>')
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
output = root / 'aquarium-v0.4.1-standalone.html'
output.write_text(html, encoding='utf-8')
print(f'{output.name}: {output.stat().st_size} bytes')
