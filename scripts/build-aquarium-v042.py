#!/usr/bin/env python3
"""Bundle the modular V0.4.2 entry for offline use; never edit old entries."""
from pathlib import Path
import re, base64
root = Path(__file__).resolve().parent.parent
html = (root / 'aquarium-v0.4.2.html').read_text()
for path in re.findall(r'<link rel="stylesheet" href="([^"]+)">', html):
    html = html.replace(f'<link rel="stylesheet" href="{path}">', '<style>\n' + (root/path).read_text() + '\n</style>')
scripts = []
for path in re.findall(r'<script defer src="([^"]+)"></script>', html):
    html = html.replace(f'<script defer src="{path}"></script>', '')
    script = (root/path).read_text()
    if path.endswith('/breathing-review.js'):
        data = base64.b64encode((root/'assets/aquarium-v042/carp-review.webp').read_bytes()).decode()
        script = "window.AQUARIUM_BREATHING_IMAGE='data:image/webp;base64," + data + "';\n" + script
    scripts.append('<script>\n' + script.replace('</script', '<\\/script') + '\n</script>')
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
output = root / 'aquarium-v0.4.2-standalone.html'
output.write_text(html)
print(f'{output.name}: {output.stat().st_size} bytes')
