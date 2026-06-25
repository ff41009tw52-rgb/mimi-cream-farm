from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_TAG = '<script src="home-button.js"></script>'

changed = []
for path in sorted(ROOT.glob('*.html')):
    if path.name == 'index.html':
        continue

    content = path.read_text(encoding='utf-8')
    original = content

    # Keep exactly one shared navigation script at the end of each root page.
    content = re.sub(
        r'\s*<script\s+src=["\']home-button\.js["\']\s*></script>',
        '',
        content,
        flags=re.IGNORECASE,
    )
    match = re.search(r'</body\s*>', content, flags=re.IGNORECASE)
    if match:
        content = content[:match.start()] + f'    {SCRIPT_TAG}\n' + content[match.start():]
    else:
        # A few older pages have no closing body tag; browsers still parse a final script correctly.
        content = content.rstrip() + f'\n    {SCRIPT_TAG}\n'

    if content != original:
        path.write_text(content, encoding='utf-8')
        changed.append(path.name)

if not changed:
    raise SystemExit('No root HTML pages were updated.')

print(f'Updated pages: {len(changed)}')
for name in changed:
    print(f'- {name}')
