from pathlib import Path
import hashlib
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "herbgameai-formal.html"
ASSET_DIR = ROOT / "picture" / "herb-game" / "ai-characters"

ASSETS = {
    "mint_student": ("小琳", "01_小琳_mint_student.png"),
    "left_student": ("小安", "02_小安_left_student.png"),
    "lemongrass_student": ("小凱", "03_小凱_lemongrass_student.png"),
    "pandan_student": ("小樂", "04_小樂_pandan_student.png"),
    "mugwort_student": ("小希", "05_小希_mugwort_student.png"),
    "fishmint_student": ("小柏", "06_小柏_fishmint_student.png"),
    "pricklyash_student": ("小杰", "07_小杰_pricklyash_student.png"),
    "shellginger_student": ("小羽", "08_小羽_shellginger_student.png"),
    "teatree_student": ("小森", "09_小森_teatree_student.png"),
    "turmeric_student": ("小辰", "10_小辰_turmeric_student.png"),
    "marigold_student": ("小晴", "11_小晴_marigold_student.png"),
}


def png_info(path: Path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise SystemExit(f"invalid PNG: {path}")
    width, height, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    has_alpha = color_type in (4, 6) or b"tRNS" in data
    return width, height, bit_depth, color_type, has_alpha, hashlib.sha256(data).hexdigest()


# Re-verify the 11 already-committed transparent web assets without re-encoding them.
hashes = []
for sid, (_, filename) in ASSETS.items():
    p = ASSET_DIR / filename
    if not p.exists():
        raise SystemExit(f"missing character asset: {p}")
    width, height, bit_depth, color_type, has_alpha, digest = png_info(p)
    if width < 500 or height < 900:
        raise SystemExit(f"{sid}: unexpectedly small asset {width}x{height}")
    if not has_alpha:
        raise SystemExit(f"{sid}: transparency missing")
    hashes.append(digest)
    print(f"verified {sid}: {width}x{height}, alpha=yes, sha256={digest[:12]}")
if len(set(hashes)) != 11:
    raise SystemExit("duplicate character image bytes detected")

s = HTML.read_text(encoding="utf-8")

# One asset path per student in STUDENT_INFO. Existing story/personality/plant data stays untouched.
for sid, (_, filename) in ASSETS.items():
    path = f"picture/herb-game/ai-characters/{filename}"
    marker = f'id:"{sid}",name:'
    replacement = f'id:"{sid}",avatar:"{path}",name:'
    if s.count(marker) != 1:
        raise SystemExit(f"{sid}: STUDENT_INFO marker count={s.count(marker)}")
    s = s.replace(marker, replacement, 1)

# Scene sprites read that same path, avoiding a second independent mapping.
for sid, (name, filename) in ASSETS.items():
    old = f'"{name}": {{ id:"{sid}", src:"picture/herb-game/ai-characters/{filename}" }}'
    new = f'"{name}": {{ id:"{sid}", src:STUDENT_INFO.{sid}.avatar }}'
    if s.count(old) != 1:
        raise SystemExit(f"{sid}: AI character mapping count={s.count(old)}")
    s = s.replace(old, new, 1)

# Replace only the student-gallery image placeholder; unlock/status/bond/plant rules are unchanged.
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
    raise SystemExit("student gallery block did not match current formal page")
s = s.replace(old_gallery, new_gallery, 1)

# Improve full-body display in the member gallery while retaining responsive layout.
replacements = [
    ('.member-card-layout { display:grid; grid-template-columns:92px 1fr; gap:1rem; align-items:start; }',
     '.member-card-layout { display:grid; grid-template-columns:104px 1fr; gap:1rem; align-items:start; }'),
    ('.member-avatar-slot { width:92px; min-height:92px; border-radius:18px; border:2px dashed #cbd5e1; background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); display:flex; align-items:center; justify-content:center; text-align:center; color:#64748b; font-weight:900; line-height:1.25; padding:.5rem; box-sizing:border-box; }',
     '.member-avatar-slot { width:104px; height:124px; min-height:124px; overflow:hidden; border-radius:18px; border:2px dashed #cbd5e1; background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); display:flex; align-items:center; justify-content:center; text-align:center; color:#64748b; font-weight:900; line-height:1.25; padding:.35rem; box-sizing:border-box; }'),
    ('@media (max-width:760px) { .herb-progress-list,.research-options,.de-summary-grid { grid-template-columns:1fr; } .member-meta-row { grid-template-columns:90px 1fr; } .member-card-layout { grid-template-columns:72px 1fr; gap:.8rem; } .member-avatar-slot { width:72px; min-height:72px; border-radius:16px; font-size:.92rem; } }',
     '@media (max-width:760px) { .herb-progress-list,.research-options,.de-summary-grid { grid-template-columns:1fr; } .member-meta-row { grid-template-columns:90px 1fr; } .member-card-layout { grid-template-columns:72px 1fr; gap:.8rem; } .member-avatar-slot { width:72px; height:88px; min-height:88px; border-radius:16px; font-size:.92rem; } }'),
    ('            min-height:88px;\n            object-fit:contain;',
     '            min-height:0;\n            object-fit:contain;'),
]
for before, after in replacements:
    if before not in s:
        raise SystemExit(f"layout marker missing: {before[:45]}")
    s = s.replace(before, after, 1)

# Student cutouts also appear during the 241自然教室 introduction sequence.
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

# Graceful failure instead of a broken-image icon if an asset path ever fails.
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
    raise SystemExit("sprite marker missing")
s = s.replace(old_sprite, new_sprite, 1)

# Protect the existing story-state rules this task must not change.
student_block = s[s.find('const studentCards = STUDENT_ORDER.map'):s.find('this.dom.memberList.innerHTML')]
if '人物頭像<br><small>待放入</small>' in student_block:
    raise SystemExit("student gallery placeholder still remains")
if '？？<br><small>未解鎖</small>' not in student_block:
    raise SystemExit("locked-student placeholder was removed")
for required in ['scene20_mint_end', 'bondChange:35', 'scene30_student_intros', 'scene33_members_update']:
    if required not in s:
        raise SystemExit(f"existing flow marker missing: {required}")

HTML.write_text(s, encoding="utf-8")

# Remove only task-specific scaffolding; the resulting commit contains the actual HTML integration.
for rel in [
    "tools/trigger-final-student-assets.txt",
    "tools/download_final_students.py",
    "tools/finalize_student_assets.py",
    "tools/apply_character_integration.py",
    ".github/workflows/finalize-student-assets.yml",
    ".github/workflows/test-valid.yml",
    ".github/workflows/integrate-final-student-assets.yml",
]:
    p = ROOT / rel
    if p.exists():
        p.unlink()

print("Character integration complete; temporary task scaffolding removed.")
