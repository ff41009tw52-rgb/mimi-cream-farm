from pathlib import Path
from PIL import Image
import hashlib, re, subprocess

ASSETS = [
    ("mint_student",        "1etFumWOsRzXMg8xLStUOEJjM112DSEYc"),
    ("left_student",        "1CT8-yIyZ-E7Jf90kSOXDBAJ-ducZoEL-"),
    ("lemongrass_student",  "1o6NbWyrXWaHy2cfi12f_D4DmqhtjeW3X"),
    ("pandan_student",      "1ENyYdS41HpWjSbqfozjIT4Fv_QKeEw2Y"),
    ("mugwort_student",     "1-CCw6whKxArcXbRC_Bf9IyF7aLaoHcVP"),
    ("fishmint_student",    "1HCgoKTtemi2IF_7PCVCh6w_fEVP0nquz"),
    ("pricklyash_student",  "1VCo2dmho8chozFOkshuzvWDJq4CNyqh2"),
    ("shellginger_student", "1KVgEvoCVpmH2wPM8-nOSGIrkfFwdeheS"),
    ("teatree_student",     "1PHwaFgbhkfxpZ7AMRCQP25tAxXHZCxbk"),
    ("turmeric_student",    "100dlw2OoGsuvKGAsTvRObTb6rxYAmOcR"),
    ("marigold_student",    "1jSNzmKn3gVXJSC3LxCGSoAjdY6kiyLOn"),
]
IDS=[sid for sid,_ in ASSETS]
OUT=Path("picture/herb-game/ai-characters")
OUT.mkdir(parents=True,exist_ok=True)

# Download each latest Drive source directly to a brand-new cache-safe filename.
for sid,file_id in ASSETS:
    target=OUT/f"{sid}_transparent.png"
    urls=[
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t",
        f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t",
    ]
    ok=False
    for url in urls:
        proc=subprocess.run(["curl","-L","--fail","--silent","--show-error","--retry","2","-o",str(target),url])
        if proc.returncode==0 and target.exists() and target.read_bytes()[:8]==b"\x89PNG\r\n\x1a\n":
            ok=True; break
    if not ok:
        raise SystemExit(f"Drive download failed: {sid}")

# Verify transparency, dimensions and uniqueness; do not trust the .png extension alone.
hashes=[]
for sid in IDS:
    p=OUT/f"{sid}_transparent.png"
    with Image.open(p) as im:
        if im.size != (1024,1536):
            raise SystemExit(f"{sid}: unexpected size {im.size}")
        rgba=im.convert("RGBA")
        alpha=rgba.getchannel("A")
        amin,amax=alpha.getextrema()
        hist=alpha.histogram(); total=im.width*im.height
        alpha0=hist[0]/total
        if amin != 0 or alpha0 < .30 or amax <= 0:
            raise SystemExit(f"{sid}: invalid transparency alpha={amin}-{amax}, alpha0={alpha0:.1%}")
        print(f"{sid}: {im.mode} {im.size[0]}x{im.size[1]} alpha={amin}-{amax}, alpha0={alpha0:.1%}")
    hashes.append(hashlib.sha256(p.read_bytes()).hexdigest())
if len(set(hashes)) != 11:
    raise SystemExit("duplicate student image bytes detected")

p=Path("herbgameai-formal.html")
s=p.read_text(encoding="utf-8")

# STUDENT_INFO.avatar is the sole student-image Source of Truth.
for sid in IDS:
    new=f"picture/herb-game/ai-characters/{sid}_transparent.png"
    pat=rf'(id:"{re.escape(sid)}",avatar:")[^"]+("\s*,name:)'
    s2,n=re.subn(pat,rf'\g<1>{new}\2',s,count=1)
    if n != 1:
        raise SystemExit(f"avatar patch failed for {sid}: {n}")
    s=s2

old="console.error('[HerbGame] student image load failed','${id}',failedPath);this.style.display='none';this.parentElement.innerHTML='人物圖片<br><small>載入失敗</small>';"
new="console.error('[HerbGame] student image load failed',{name:'${info.name}',id:'${id}',path:failedPath,error:'load failed'});this.style.display='none';this.parentElement.innerHTML='人物圖片<br><small>載入失敗</small>';"
if old not in s:
    raise SystemExit("student gallery error handler marker missing")
s=s.replace(old,new,1)

style_marker='#ai-character-layer.visible.position-center #ai-character-sprite{opacity:1;transform:translateX(-50%)}'
if style_marker not in s:
    raise SystemExit("character style marker missing")
s=s.replace(style_marker,style_marker+'\n      #ai-character-layer.visible.listening #ai-character-sprite{opacity:.85}',1)

old_error='''    sprite.addEventListener("error", () => {
      const failedPath = sprite.getAttribute("src") || "";
      console.error("[HerbGame] student sprite load failed", activeSpeaker || "unknown", failedPath);
      characterLayer.classList.remove("visible");
      sprite.removeAttribute("src");
    });'''
new_error='''    sprite.addEventListener("error", () => {
      const failedPath = sprite.getAttribute("src") || "";
      const failedVisual = getCharacterVisualInfo(activeSpeaker);
      console.error("[HerbGame] student sprite load failed", {name:activeSpeaker || "unknown", id:failedVisual?.id || "unknown", path:failedPath, error:"load failed"});
      hideCharacter(true);
    });'''
if old_error not in s:
    raise SystemExit("sprite error handler marker missing")
s=s.replace(old_error,new_error,1)

old_hide='''    function hideCharacter(immediate=false) {
      clearTimeout(swapTimer);
      activeSpeaker = "";
      characterLayer.classList.remove("visible");
      if (immediate) sprite.removeAttribute("src");
    }'''
new_hide='''    function hideCharacter(immediate=false) {
      clearTimeout(swapTimer);
      activeSpeaker = "";
      characterLayer.classList.remove("visible","listening");
      if (immediate) sprite.removeAttribute("src");
    }'''
if old_hide not in s:
    raise SystemExit("hideCharacter marker missing")
s=s.replace(old_hide,new_hide,1)

# Same one-to-one NPC remains loaded: speaker=100%; player/narration=85%; only true context changes clear/swap.
pattern=r'''    function renderCharacterForDialogue\(node\) \{.*?\n    \}\n\n    function showPlantCard'''
replacement='''    function renderCharacterForDialogue(node) {
      if (!node) { hideCharacter(false); return; }
      if (node.clearCharacter || node.hideCharacter) { hideCharacter(false); return; }
      if (!isExplorationDialogue()) { hideCharacter(false); return; }

      const visual = getCharacterVisualInfo(node.speaker);
      if (node.speakerType === "npc") {
        if (!visual) { hideCharacter(false); return; }
        const pos = ["left","center","right"].includes(node.characterPosition) ? node.characterPosition : "right";
        characterLayer.classList.remove("position-left","position-center","position-right");
        characterLayer.classList.add(`position-${pos}`);
        sprite.alt = node.speaker || "";
        if (activeSpeaker === node.speaker && sprite.getAttribute("src") === visual.src) {
          characterLayer.classList.remove("listening");
          characterLayer.classList.add("visible");
          return;
        }
        clearTimeout(swapTimer);
        const hadCharacter = Boolean(activeSpeaker && sprite.getAttribute("src"));
        characterLayer.classList.remove("listening","visible");
        swapTimer = setTimeout(() => {
          sprite.src = visual.src;
          activeSpeaker = node.speaker;
          requestAnimationFrame(() => requestAnimationFrame(() => characterLayer.classList.add("visible")));
        }, hadCharacter ? 165 : 45);
        return;
      }

      if ((node.speakerType === "player" || node.speakerType === "system" || !node.speakerType) && activeSpeaker && sprite.getAttribute("src")) {
        characterLayer.classList.add("visible","listening");
        return;
      }
      hideCharacter(false);
    }

    function showPlantCard'''
s2,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
if n != 1:
    raise SystemExit(f"renderCharacterForDialogue replacement failed: {n}")
s=s2

marker='''    const originalHandleDialogueClick = engine.handleDialogueClick.bind(engine);
    engine.handleDialogueClick = function(...args) {
      if (plantCardActive) { hidePlantCard(); return; }
      if (Date.now() - plantCardDismissedAt < 120) return;
      return originalHandleDialogueClick(...args);
    };
'''
addition='''    const originalHandleDialogueClick = engine.handleDialogueClick.bind(engine);
    engine.handleDialogueClick = function(...args) {
      if (plantCardActive) { hidePlantCard(); return; }
      if (Date.now() - plantCardDismissedAt < 120) return;
      return originalHandleDialogueClick(...args);
    };

    function hasInteractiveKeyboardFocus(target) {
      const el = target && target.nodeType === 1 ? target : null;
      return Boolean(el?.closest?.('button,input,textarea,select,a,[contenteditable="true"],[role="button"],[role="option"],[role="menuitem"]'));
    }

    doc.addEventListener("keydown", (event) => {
      if (!(event.code === "Space" || event.key === " ")) return;
      if (event.repeat) return;
      if (!gameScreen?.classList.contains("active")) return;

      if (plantCardActive) {
        event.preventDefault();
        engine.handleDialogueClick();
        return;
      }

      const systemOverlay = engine.dom?.systemOverlay;
      if (systemOverlay?.classList.contains("active")) {
        const continueBtn = systemOverlay.querySelector('#btn-overlay-continue, #btn-mission-continue');
        if (continueBtn && !continueBtn.disabled) {
          event.preventDefault();
          continueBtn.click();
        }
        return;
      }

      if (hasInteractiveKeyboardFocus(event.target) || hasInteractiveKeyboardFocus(doc.activeElement)) return;
      if (engine.isShowingChoices || engine.dom?.choicesContainer?.classList.contains("show")) return;
      if (engine.dom?.playerPanel?.classList.contains("active")) return;
      if (engine.dom?.campusMapLayer?.classList.contains("active")) return;
      if (engine.dom?.researchTabletLayer?.classList.contains("active")) return;
      if (engine.dom?.videoPlaceholder?.classList.contains("active")) return;
      if (engine.isProcessingEvent) return;
      if (!engine.dom?.dialogueBox || engine.dom.dialogueBox.parentElement?.style.display === "none") return;

      event.preventDefault();
      engine.handleDialogueClick();
    });
'''
if marker not in s:
    raise SystemExit("handleDialogueClick wrapper marker missing")
s=s.replace(marker,addition,1)

# Hard acceptance guards.
refs=re.findall(r"picture/herb-game/ai-characters/[^\"'`<>]+?\.png",s)
expected={f"picture/herb-game/ai-characters/{sid}_transparent.png" for sid in IDS}
if set(refs) != expected or len(refs) != 11:
    raise SystemExit(f"unexpected student image refs: {refs}")
for sid in IDS:
    if f'"{sid}": {{ id:"{sid}", src:STUDENT_INFO.{sid}.avatar }}' not in s:
        raise SystemExit(f"AI_CHARACTER_ASSETS no longer reads STUDENT_INFO for {sid}")
for old_name in [
    '01_小琳_mint_student.png','02_小安_left_student.png','03_小凱_lemongrass_student.png','04_小樂_pandan_student.png','05_小希_mugwort_student.png','06_小柏_fishmint_student.png','07_小杰_pricklyash_student.png','08_小羽_shellginger_student.png','09_小森_teatree_student.png','10_小辰_turmeric_student.png','11_小晴_marigold_student.png']:
    if old_name in s:
        raise SystemExit(f"old portrait reference remains: {old_name}")
for token in [
    '#ai-character-layer.visible.listening #ai-character-sprite{opacity:.85}',
    'if (event.repeat) return;',
    'engine.handleDialogueClick();',
    'playerPanel?.classList.contains("active")',
    'campusMapLayer?.classList.contains("active")',
    'researchTabletLayer?.classList.contains("active")',
    'videoPlaceholder?.classList.contains("active")',
    'ai_mint_e01_01','ai_mint_distance_choice','mint_student_event_01','plant-card-reveal-layer','getDay1DiaryText']:
    if token not in s:
        raise SystemExit(f"missing required token: {token}")
segment=s[s.find('function renderCharacterForDialogue'):s.find('function showPlantCard')]
if 'speakerType !== "npc"' in segment:
    raise SystemExit("legacy speakerType hide rule remains")

p.write_text(s,encoding="utf-8")
print("patched",p.stat().st_size,"bytes")
