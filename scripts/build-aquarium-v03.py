#!/usr/bin/env python3
"""Build the portable V0.3 HTML from its authoritative modular sources."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
html = (root / 'aquarium-v0.3.html').read_text(encoding='utf-8')
css = (root / 'assets/aquarium-v03/aquarium.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="assets/aquarium-v03/aquarium.css">', '<style>\n' + css + '\n</style>')
scripts = []
for name in ('aquarium-data.js', 'aquarium-save.js', 'aquarium-world.js', 'aquarium.js'):
    html = html.replace(f'<script defer src="assets/aquarium-v03/{name}"></script>', '')
    script = (root / 'assets/aquarium-v03' / name).read_text(encoding='utf-8')
    scripts.append('<script>\n' + script.replace('</script', '<\\/script') + '\n</script>')
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
output = root / 'aquarium-v0.3-standalone.html'
output.write_text(html, encoding='utf-8')
print(f'{output.name}: {output.stat().st_size} bytes')
