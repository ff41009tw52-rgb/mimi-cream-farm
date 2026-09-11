from pathlib import Path
import hashlib
import re
import shutil
import struct

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "picture" / "herb-game" / "ai-characters"
HTML = ROOT / "herbgameai-formal.html"

ASSETS = {
    "mint_student": "01_小琳_mint_student.png",
    "left_student": "02_小安_left_student.png",
    "lemongrass_student": "03_小凱_lemongrass_student.png",
    "pandan_student": "04_小樂_pandan_student.png",
    "mugwort_student": "05_小希_mugwort_student.png",
    "fishmint_student": "06_小柏_fishmint_student.png",
    "pricklyash_student": "07_小杰_pricklyash_student.png",
    "shellginger_student": "08_小羽_shellginger_student.png",
    "teatree_student": "09_小森_teatree_student.png",
    "turmeric_student": "10_小辰_turmeric_student.png",
    "marigold_student": "11_小晴_marigold_student.png",
}
NAMES = {
    "mint_student": "小琳",
    "left_student": "小安",
    "lemongrass_student": "小凱",
    "pandan_student": "小樂",
    "mugwort_student": "小希",
    "fishmint_student": "小柏",
    "pricklyash_student": "小杰",
    "shellginger_student": "小羽",
    "teatree_student": "小森",
    "turmeric_student": "小辰",
    "marigold_student": "小晴",
}


def png_info(path: Path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"not PNG: {path}")
    if data[12:16] != b"IHDR":
        raise SystemExit(f"missing IHDR: {path}")
    width, height, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    has_alpha = color_type in (4, 6) or b"tRNS" in data
    return width, height, bit_depth, color_type, has_alpha, hashlib.sha256(data).hexdigest()


# 1. Keep the existing verified transparent PNG bytes, but expose stable ASCII filenames.
hashes = []
for sid, old_name in ASSETS.items():
    src = ASSET_DIR / old_name
    dst = ASSET_DIR / f"{sid}.png"
    if not src.exists():
        raise SystemExit(f"missing source character image: {src}")
    shutil.copyfile(src, dst)
    width, height, bit_depth, color_type, has_alpha, digest = png_info(dst)
    if (width, height) != (1024, 1536):
        raise SystemExit(f"{sid}: unexpected size {width}x{height}")
    if not has_alpha:
        raise SystemExit(f"{sid}: PNG has no alpha/transparency (color type {color_type})")
    hashes.append(digest)
    print(f"{sid}: {width}x{height}, bit_depth={bit_depth}, color_type={color_type}, sha256={digest[:12]}")
if len(set(hashes)) != len(hashes):
    raise SystemExit("duplicate character image bytes detected")

# 2. Patch only the character-asset integration in the formal game page.
s = HTML.read_text(encoding="utf-8")

# Each student owns one canonical avatar path in STUDENT_INFO.
for sid in ASSETS:
    canonical = f"picture/herb-game/ai-characters/{sid}.png"
    marker = f'id:"{sid}",name:'
    replacement = f'id:"{sid}",avatar:"{canonical}",name:'
    if s.count(marker) != 1:
        raise SystemExit(f"{sid}: STUDENT_INFO marker count={s.count(marker)}")
    s = s.replace(marker, replacement, 1)

# The in-scene sprite table uses the same STUDENT_INFO path instead of duplicating paths.
for sid, name in NAMES.items():
    pattern = rf'"{re.escape(name)}": \{{ id:"{re.escape(sid)}", src:"picture/herb-game/ai-characters/[^\"]+" \}}'
    replacement = f'"{name}": {{ id:"{sid}", src:STUDENT_INFO.{sid}.avatar }}'
    s, count = re.subn(pattern, replacement, s, count=1)
    if count != 1:
        raise SystemExit(f"{sid}: AI_CHARACTER_ASSETS marker count={count}")

# The member gallery now renders the same final transparent PNG after the existing unlock condition is met.
old_gallery = '''                const studentCards = STUDENT_ORDER.map(id => {
                    const info=STUDENT_INFO[id], unlocked=this.gameState.unlockedStudents.has(id), relation=this.gameState.studentRelations[id] || {bond:0,status:"未認識",completedEvents:[],discoveries:[]};
                    const plantShown=this.gameState.discoveredHerbNames.has(info.plant)?info.plant:"？？？";
                    return `<div class="member-card ${unlocked ? '' : 'locked'}"><div class="member-card-layout"><div class="member-avatar-slot ${unlocked ? '' : 'locked'}">${unlocked ? '人物頭像<br><small>待放入</small>' : '？？<br><small>未解鎖</small>'}</div><div class="member-main"><div class="member-name">${unlocked ? info.name : '？？？'}<span class="member-type-badge">學生</span></div>${unlocked ? `<div class="member-meta"><div class="member-meta-row"><strong>代表植物</strong><span>${plantShown}</span></div><div class="member-meta-row"><strong>喜歡的地方</strong><span>${info.favoritePlace}</span></div><div class="member-meta-row"><strong>目前印象</strong><span>${info.currentImpression}</span></div>${relation.discoveries?.length ? `<div class="member-meta-row"><strong>新的發現</strong><span>${relation.discoveries.join("／")}</span></div>` : ""}<div class="member-meta-row"><strong>故事進度</strong><span>${relation.status}</span></div></div><div class="member-bond"><span>相處進度</span><span class="member-bond-value">${relation.bond}%</span></div>` : '<div class="member-desc">尚未解鎖。</div>'}</div></div></div>`;
                }).join('');'''
new_gallery = '''                const studentCards = STUDENT_ORDER.map(id => {
                    const info=STUDENT_INFO[id], unlocked=this.gameState.unlockedStudents.has(id), relation=this.gameState.studentRelations[id] || {bond:0,status:"未認識",completedEvents:[],discoveries:[]};
                    const plantShown=this.gameState.discoveredHerbNames.has(info.plant)?info.plant:"？？？";
                    const avatarHtml = unlocked && info.avatar
                        ? `<img class="member-avatar-img" src="${info.avatar}" alt="${info.name}" draggable="false" onerror="const failedPath=this.getAttribute('src');console.error('[HerbGame] student image load failed','${id}',failedPath);this.style.display='none';this.parentElement.innerHTML='人物圖片<br><small>載入失敗</small>';" />`
                        : '？？<br><small>未解鎖</small>';
                    return `<div class="member-card ${unlocked ? '' : 'locked'}"><div class="member-card-layout"><div class="member-avatar-slot ${unlocked ? '' : 'locked'}">${avatarHtml}</div><div class="member-main"><div class="member-name">${unlocked ? info.name : '？？？'}<span class="member-type-badge">學生</span></div>${unlocked ? `<div class="member-meta"><div class="member-meta-row"><strong>代表植物</strong><span>${plantShown}</span></div><div class="member-meta-row"><strong>喜歡的地方</strong><span>${info.favoritePlace}</span></div><div class="member-meta-row"><strong>目前印象</strong><span>${info.currentImpression}</span></div>${relation.discoveries?.length ? `<div class="member-meta-row"><strong>新的發現</strong><span>${relation.discoveries.join("／")}</span></div>` : ""}<div class="member-meta-row"><strong>故事進度</strong><span>${relation.status}</span></div></div><div class="member-bond"><span>相處進度</span><span class="member-bond-value">${relation.bond}%</span></div>` : '<div class="member-desc">尚未解鎖。</div>'}</div></div></div>`;
                }).join('');'''
if old_gallery not in s:
    raise SystemExit("student gallery block no longer matches formal page")
s = s.replace(old_gallery, new_gallery, 1)

# Give full-body transparent art enough room in the gallery, including tablet/mobile layout.
css_changes = [
    (
        '.member-card-layout { display:grid; grid-template-columns:92px 1fr; gap:1rem; align-items:start; }',
        '.member-card-layout { display:grid; grid-template-columns:104px 1fr; gap:1rem; align-items:start; }',
    ),
    (
        '.member-avatar-slot { width:92px; min-height:92px; border-radius:18px; border:2px dashed #cbd5e1; background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); display:flex; align-items:center; justify-content:center; text-align:center; color:#64748b; font-weight:900; line-height:1.25; padding:.5rem; box-sizing:border-box; }',
        '.member-avatar-slot { width:104px; height:124px; min-height:124px; overflow:hidden; border-radius:18px; border:2px dashed #cbd5e1; background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); display:flex; align-items:center; justify-content:center; text-align:center; color:#64748b; font-weight:900; line-height:1.25; padding:.35rem; box-sizing:border-box; }',
    ),
    (
        '@media (max-width:760px) { .herb-progress-list,.research-options,.de-summary-grid { grid-template-columns:1fr; } .member-meta-row { grid-template-columns:90px 1fr; } .member-card-layout { grid-template-columns:72px 1fr; gap:.8rem; } .member-avatar-slot { width:72px; min-height:72px; border-radius:16px; font-size:.92rem; } }',
        '@media (max-width:760px) { .herb-progress-list,.research-options,.de-summary-grid { grid-template-columns:1fr; } .member-meta-row { grid-template-columns:90px 1fr; } .member-card-layout { grid-template-columns:72px 1fr; gap:.8rem; } .member-avatar-slot { width:72px; height:88px; min-height:88px; border-radius:16px; font-size:.92rem; } }',
    ),
]
for before, after in css_changes:
    if before not in s:
        raise SystemExit(f"CSS marker missing: {before[:55]}")
    s = s.replace(before, after, 1)
if '            min-height:88px;\n            object-fit:contain;' not in s:
    raise SystemExit("member-avatar-img min-height marker missing")
s = s.replace('            min-height:88px;\n            object-fit:contain;', '            min-height:0;\n            object-fit:contain;', 1)

# Show student cutouts not only during free exploration, but also during the 241 introduction sequence.
old_scope = '''    function isExplorationDialogue() {
      const locationName = (engine.dom?.hudLocation?.textContent || "").trim();
      return EXPLORATION_NAMES.has(locationName);
    }'''
new_scope = '''    function isExplorationDialogue() {
      const locationName = (engine.dom?.hudLocation?.textContent || "").trim();
      return EXPLORATION_NAMES.has(locationName) || locationName === "241自然教室";
    }'''
if old_scope not in s:
    raise SystemExit("character scene scope marker missing")
s = s.replace(old_scope, new_scope, 1)

# Fail gracefully if a sprite asset path ever becomes invalid.
old_sprite = '''    const sprite = characterLayer.querySelector("img");

    const plantCardLayer = doc.createElement("div");'''
new_sprite = '''    const sprite = characterLayer.querySelector("img");
    sprite.addEventListener("error", () => {
      const failedPath = sprite.getAttribute("src") || "";
      console.error("[HerbGame] student sprite load failed", activeSpeaker || "unknown", failedPath);
      characterLayer.classList.remove("visible");
      sprite.removeAttribute("src");
    });

    const plantCardLayer = doc.createElement("div");'''
if old_sprite not in s:
    raise SystemExit("sprite insertion marker missing")
s = s.replace(old_sprite, new_sprite, 1)

# Final scoped invariants.
for sid in ASSETS:
    canonical = f"picture/herb-game/ai-characters/{sid}.png"
    if s.count(canonical) != 1:
        raise SystemExit(f"{sid}: canonical path count={s.count(canonical)}")
if '人物頭像<br><small>待放入</small>' in s[s.find('const studentCards = STUDENT_ORDER.map'):s.find('this.dom.memberList.innerHTML')]:
    raise SystemExit("student gallery placeholder remains")
if '？？<br><small>未解鎖</small>' not in s[s.find('const studentCards = STUDENT_ORDER.map'):s.find('this.dom.memberList.innerHTML')]:
    raise SystemExit("locked-student placeholder was removed")
if 'scene20_mint_end' not in s or 'bondChange:35' not in s:
    raise SystemExit("existing Xiaolin Event 1 flow appears to have changed")
if 'scene30_student_intros' not in s or 'scene33_members_update' not in s:
    raise SystemExit("existing 241 introduction/unlock flow appears to have changed")

HTML.write_text(s, encoding="utf-8")

# Remove only temporary integration scaffolding created for this task.
for rel in [
    "tools/trigger-final-student-assets.txt",
    "tools/finalize_student_assets.py",
    ".github/workflows/finalize-student-assets.yml",
    ".github/workflows/test-valid.yml",
    ".github/workflows/integrate-final-student-assets.yml",
]:
    path = ROOT / rel
    if path.exists():
        path.unlink()

print("Final student asset integration completed and temporary scaffolding removed.")
