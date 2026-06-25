from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / "artifacts" / "rename-inventory"
OUT.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"}
TEXT_EXTENSIONS = {".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".xml"}
EXCLUDED_PARTS = {".git", "node_modules", "artifacts"}


def is_included(path: Path) -> bool:
    return not any(part in EXCLUDED_PARTS for part in path.parts)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()

all_files = sorted(path for path in ROOT.rglob("*") if path.is_file() and is_included(path))
html_files = sorted(rel(path) for path in all_files if path.suffix.lower() == ".html")
image_files = sorted(rel(path) for path in all_files if path.suffix.lower() in IMAGE_EXTENSIONS)
root_html_files = sorted(path.name for path in all_files if path.parent == ROOT and path.suffix.lower() == ".html")
edge_files = sorted(item for item in image_files if item.startswith("edge/"))
picture_files = sorted(item for item in image_files if item.startswith("picture/"))

text_files = [path for path in all_files if path.suffix.lower() in TEXT_EXTENSIONS]
references = []
image_ref_pattern = re.compile(r"(?:src|href)\s*=\s*[\"']([^\"']+?\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)(?:[?#][^\"']*)?)[\"']|url\(\s*[\"']?([^\"')]+?\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)(?:[?#][^\"')]* )?)[\"']?\s*\)", re.I | re.X)
html_ref_pattern = re.compile(r"(?:href|src)\s*=\s*[\"']([^\"']+?\.html(?:[?#][^\"']*)?)[\"']", re.I)

for path in text_files:
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = path.read_text(encoding="utf-8", errors="replace")
    for match in image_ref_pattern.finditer(content):
        target = next((group for group in match.groups() if group), "")
        references.append({"kind": "image", "source": rel(path), "target": target, "offset": match.start()})
    for match in html_ref_pattern.finditer(content):
        references.append({"kind": "html", "source": rel(path), "target": match.group(1), "offset": match.start()})

# Expected page naming scheme. Only known current activity file aliases are renamed.
page_rename_map = {
    "one.html": "01.html",
    "two.html": "02.html",
    "three.html": "03.html",
    "four.html": "04.html",
    "5.html": "05.html",
    "6.html": "06.html",
    "7.html": "07.html",
    "8.html": "08.html",
    "9.html": "09.html",
}
for number in range(10, 41):
    current = f"{number}.html"
    target = f"{number:02d}.html"
    if current != target:
        page_rename_map[current] = target

missing_expected_pages = []
for target in [f"{number:02d}.html" for number in range(1, 41)]:
    current_candidates = [old for old, new in page_rename_map.items() if new == target]
    if target not in root_html_files and not any(candidate in root_html_files for candidate in current_candidates):
        missing_expected_pages.append(target)

other_root_html = sorted(name for name in root_html_files if name not in page_rename_map and name not in {"index.html", "feedback.html"})

report = {
    "root_html_files": root_html_files,
    "all_html_files": html_files,
    "image_files": image_files,
    "edge_image_files": edge_files,
    "picture_image_files": picture_files,
    "page_rename_map": page_rename_map,
    "missing_expected_activity_pages": missing_expected_pages,
    "other_root_html_requiring_a_decision": other_root_html,
    "references": references,
    "reference_counts": {
        "image": sum(item["kind"] == "image" for item in references),
        "html": sum(item["kind"] == "html" for item in references),
    },
}

(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

lines = [
    "# 檔名與圖片資料夾整理盤點",
    "",
    "## 根目錄 HTML 檔案",
    *[f"- `{name}`" for name in root_html_files],
    "",
    "## 建議活動頁改名對照",
    *[f"- `{old}` → `{new}`" for old, new in page_rename_map.items() if old in root_html_files],
    "",
    "## 缺少的 01～40 活動頁",
    *( [f"- `{name}`" for name in missing_expected_pages] if missing_expected_pages else ["- 無"] ),
    "",
    "## 非 01～40、需決定是否保留原名的根目錄 HTML",
    *( [f"- `{name}`" for name in other_root_html] if other_root_html else ["- 無"] ),
    "",
    "## 圖片檔案",
    f"- 總數：{len(image_files)}",
    f"- 現在位於 `edge/`：{len(edge_files)}",
    f"- 現在位於 `picture/`：{len(picture_files)}",
    *[f"- `{name}`" for name in image_files],
    "",
    "## 偵測到的連結數量",
    f"- 圖片連結：{report['reference_counts']['image']}",
    f"- HTML 頁面連結：{report['reference_counts']['html']}",
]
(OUT / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"ROOT_HTML={len(root_html_files)}")
print(f"IMAGES={len(image_files)}")
print(f"IMAGE_REFERENCES={report['reference_counts']['image']}")
print(f"HTML_REFERENCES={report['reference_counts']['html']}")
print(f"MISSING_01_TO_40={','.join(missing_expected_pages) if missing_expected_pages else 'none'}")
print(f"OTHER_ROOT_HTML={','.join(other_root_html) if other_root_html else 'none'}")
