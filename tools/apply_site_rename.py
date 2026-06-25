from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'.git', '.github', 'tools', 'node_modules', 'artifacts'}
TEXT_EXTENSIONS = {'.html', '.css', '.js', '.mjs', '.json', '.md', '.txt', '.xml'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'}

PAGE_MAP = {
    'one.html': '01.html',
    'two.html': '02.html',
    'three.html': '03.html',
    'four.html': '04.html',
    '5.html': '05.html',
    '6.html': '06.html',
    '7.html': '07.html',
    '8.html': '08.html',
    '9.html': '09.html',
}

ROOT_IMAGES = {
    'Christmascream.jpg', 'Christmasmimi.jpg', 'GUANWEI.jpg',
    'brazilian-waterweed.jpg', 'cream-solo.JPG', 'duckweed.jpg',
    'icon-192.png', 'icon-512.png', 'mimi-solo.JPG', 'sleepy-cats.JPG',
    'smooth-knotweed.jpg', 'welcome-cats.JPG', 'yellow-water-lily.jpg',
}
EDGE_IMAGES = {
    'edge/1.jpg', 'edge/2.jpg', 'edge/3.jpg', 'edge/4.jpg', 'edge/5.jpg',
    'edge/6.jpg', 'edge/7.jpg', 'edge/8.jpg', 'edge/9.jpg', 'edge/10.jpg',
    'edge/cabbage-dry.png', 'edge/cabbage-low-light.png', 'edge/cabbage-pest.png',
}


def included(path: Path) -> bool:
    return not any(part in EXCLUDED for part in path.parts)


def replace_token(content: str, old: str, new: str) -> str:
    # Avoid converting the final part of longer names, e.g. 25.html when changing 5.html.
    pattern = re.compile(r'(?<![A-Za-z0-9_./-])' + re.escape(old) + r'(?![A-Za-z0-9_./-])')
    return pattern.sub(new, content)


def replace_root_image_token(content: str, old: str, new: str) -> str:
    # Do not re-prefix values that are already in picture/.
    pattern = re.compile(r'(?<![A-Za-z0-9_./-])' + re.escape(old) + r'(?![A-Za-z0-9_./-])')
    return pattern.sub(new, content)


def text_files():
    return [path for path in ROOT.rglob('*') if path.is_file() and included(path) and path.suffix.lower() in TEXT_EXTENSIONS]


def main() -> None:
    required_pages = set(PAGE_MAP)
    missing_pages = [name for name in required_pages if not (ROOT / name).exists()]
    if missing_pages:
        raise SystemExit(f'Missing source pages: {missing_pages}')
    if not (ROOT / 'edge' / 'edge.html').exists():
        raise SystemExit('Missing edge/edge.html tutorial page.')

    all_image_sources = set(ROOT_IMAGES) | set(EDGE_IMAGES)
    missing_images = [name for name in all_image_sources if not (ROOT / name).exists()]
    if missing_images:
        raise SystemExit(f'Missing image files: {missing_images}')

    picture = ROOT / 'picture'
    picture.mkdir(exist_ok=True)

    # Rename activity files first.
    for old, new in PAGE_MAP.items():
        source = ROOT / old
        target = ROOT / new
        if target.exists():
            raise SystemExit(f'Rename target already exists: {new}')
        source.rename(target)

    # Move the non-image teaching page out of edge/.
    tutorial_source = ROOT / 'edge' / 'edge.html'
    tutorial_target = ROOT / 'ai-web-tutorial.html'
    if tutorial_target.exists():
        raise SystemExit('Rename target already exists: ai-web-tutorial.html')
    tutorial_source.rename(tutorial_target)

    # Move all existing local images to picture/ while preserving their file names.
    image_map = {}
    for old in sorted(all_image_sources):
        source = ROOT / old
        target = picture / source.name
        if target.exists():
            raise SystemExit(f'Image target already exists: {target.relative_to(ROOT)}')
        source.rename(target)
        image_map[old] = f'picture/{source.name}'

    # The only external image used by the public site becomes a local asset.
    cubes = picture / 'cubes.png'
    if not cubes.exists():
        import urllib.request
        urllib.request.urlretrieve('https://www.transparenttextures.com/patterns/cubes.png', cubes)
    if cubes.stat().st_size < 100:
        raise SystemExit('Downloaded picture/cubes.png is unexpectedly small.')

    # Rewrite all public references after file moves.
    for path in text_files():
        content = path.read_text(encoding='utf-8', errors='strict')
        original = content

        # Nested legacy page currently points to a root-level activity page.
        if path.relative_to(ROOT).as_posix() == '奶油咪咪農場/index.html':
            content = replace_token(content, 'two.html', '../02.html')

        for old, new in PAGE_MAP.items():
            content = replace_token(content, old, new)

        for old, new in image_map.items():
            if '/' in old:
                content = content.replace(old, new)
            else:
                content = replace_root_image_token(content, old, new)

        if path.name == 'ai-web-tutorial.html':
            for number in range(1, 11):
                content = replace_root_image_token(content, f'{number}.jpg', f'picture/{number}.jpg')

        content = content.replace('https://www.transparenttextures.com/patterns/cubes.png', 'picture/cubes.png')

        if content != original:
            path.write_text(content, encoding='utf-8')

    # Remove edge only when it is genuinely empty.
    edge = ROOT / 'edge'
    remaining = list(edge.iterdir()) if edge.exists() else []
    if remaining:
        raise SystemExit(f'edge/ still has unexpected files: {[item.name for item in remaining]}')
    if edge.exists():
        edge.rmdir()

    # Structural checks that should hold before browser testing.
    for number in range(1, 41):
        page = ROOT / f'{number:02d}.html'
        if not page.exists():
            raise SystemExit(f'Missing standard activity page: {page.name}')
    for filename in ('index.html', 'feedback.html', 'five.html', 'SV.html', 'ai-web-tutorial.html'):
        if not (ROOT / filename).exists():
            raise SystemExit(f'Missing retained page: {filename}')
    for old in PAGE_MAP:
        if (ROOT / old).exists():
            raise SystemExit(f'Old activity name still exists: {old}')
    if (ROOT / 'edge').exists():
        raise SystemExit('edge directory still exists after refactor.')

    # Check public text files for obsolete page links and paths.
    forbidden = list(PAGE_MAP) + ['edge/']
    for path in text_files():
        content = path.read_text(encoding='utf-8', errors='strict')
        for old in forbidden:
            if old in content:
                raise SystemExit(f'Obsolete reference {old!r} remains in {path.relative_to(ROOT)}')

    # Validate local HTML/image references in HTML/CSS/JS/manifest files.
    attr_pattern = re.compile(r'(?:href|src)\s*=\s*[\"\']([^\"\']+)[\"\']', re.I)
    url_pattern = re.compile(r'url\(\s*[\"\']?([^\"\')]+)[\"\']?\s*\)', re.I)
    missing_refs = []
    for path in text_files():
        content = path.read_text(encoding='utf-8', errors='strict')
        targets = attr_pattern.findall(content) + url_pattern.findall(content)
        for target in targets:
            clean = target.split('#', 1)[0].split('?', 1)[0].strip()
            if not clean or clean.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:', '//')):
                continue
            if re.match(r'^[a-z][a-z0-9+.-]*:', clean, flags=re.I):
                continue
            # Validate only local HTML and image-like assets; external libraries are ignored above.
            if not (clean.lower().endswith('.html') or Path(clean).suffix.lower() in IMAGE_EXTENSIONS):
                continue
            destination = (path.parent / clean).resolve()
            try:
                destination.relative_to(ROOT.resolve())
            except ValueError:
                missing_refs.append(f'{path.relative_to(ROOT)} -> {target} (outside repository)')
                continue
            if not destination.exists():
                missing_refs.append(f'{path.relative_to(ROOT)} -> {target}')
    if missing_refs:
        raise SystemExit('Broken local references after refactor:\n' + '\n'.join(sorted(missing_refs)))

    print('Activity pages renamed: 01.html through 09.html')
    print(f'Images moved to picture/: {len(image_map) + 1}')
    print('Moved edge/edge.html to ai-web-tutorial.html')


if __name__ == '__main__':
    main()
