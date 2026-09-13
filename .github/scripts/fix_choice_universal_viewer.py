from pathlib import Path
import re

p = Path('herbgameai-formal.html')
s = p.read_text(encoding='utf-8')
original = s


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 occurrence, got {count}')
    s = s.replace(old, new, 1)


replace_once(
    '"校長": { id:"principal", name:"校長", relationshipType:"interaction",',
    '"校長": { id:"principal", name:"校長", role:"校長", relationshipType:"interaction",',
    'principal role',
)
replace_once(
    '"陳冠瑋老師": { id:"teacher_chen", name:"陳冠瑋老師", relationshipType:"interaction",',
    '"陳冠瑋老師": { id:"teacher_chen", name:"陳冠瑋老師", role:"香草服務隊老師", relationshipType:"interaction",',
    'teacher chen role',
)
replace_once(
    '"許恒維老師": { id:"teacher_xu", name:"許恒維老師", relationshipType:"interaction",',
    '"許恒維老師": { id:"teacher_xu", name:"許恒維老師", role:"香草園實作引導老師", relationshipType:"interaction",',
    'teacher xu role',
)

replace_once(
    '<img class="member-avatar-img"\n                               src="${info.avatar}"',
    '<img class="member-avatar-img"\n                               data-character-id="${info.id || name}"\n                               src="${info.avatar}"',
    'staff data-character-id',
)
replace_once(
    'data-student-id="${id}"',
    'data-character-id="${id}"',
    'student data-character-id',
)

replace_once(
    '            handleChoiceSelection(choice, clickedBtn, event) {\n                event.stopPropagation(); \n                if (!this.isShowingChoices) return;\n',
    '            handleChoiceSelection(choice, clickedBtn, event) {\n                event.stopPropagation(); \n                if (!this.isShowingChoices) return;\n                if (clickedBtn && document.activeElement === clickedBtn && typeof clickedBtn.blur === "function") clickedBtn.blur();\n',
    'choice focus release',
)
replace_once(
    '                        STORY_DATA.nodes[tempId] = choice.response;',
    '                        STORY_DATA.nodes[tempId] = { ...choice.response, type: choice.response.type || "dialogue" };',
    'choice response type normalization',
)

s = s.replace('.member-avatar-img[data-student-id]', '.member-avatar-img[data-character-id]')
s = s.replace(
    '共用學生人物立繪 Viewer：圖片來源沿用 STUDENT_INFO[id].avatar',
    '共用人物立繪 Viewer：學生讀 STUDENT_INFO，老師／校長讀 MEMBER_INFO',
)
s = s.replace('member-portrait-viewer-plant', 'member-portrait-viewer-meta')

pattern = re.compile(r'    <script id="member-portrait-viewer-script">.*?    </script>', re.S)
if len(list(pattern.finditer(s))) != 1:
    raise SystemExit('viewer script block count mismatch')

viewer_script = '''    <script id="member-portrait-viewer-script">
    (() => {
      'use strict';
      const doc = document;
      const viewer = doc.getElementById('member-portrait-viewer');
      const viewerImage = doc.getElementById('member-portrait-viewer-image');
      const viewerFailure = doc.getElementById('member-portrait-viewer-failure');
      const viewerName = doc.getElementById('member-portrait-viewer-name');
      const viewerMeta = doc.getElementById('member-portrait-viewer-meta');
      const viewerClose = doc.getElementById('member-portrait-viewer-close');
      const memberList = doc.getElementById('member-list');

      if (!viewer || !viewerImage || !viewerFailure || !viewerName || !viewerMeta || !viewerClose || !memberList) {
        console.error('[HerbGame] member portrait viewer init failed');
        return;
      }

      let currentCharacterId = null;

      function resolvePortraitCharacter(characterId) {
        if (!characterId) return null;
        if (typeof STUDENT_INFO !== 'undefined' && STUDENT_INFO[characterId]) {
          const info = STUDENT_INFO[characterId];
          return { kind: 'student', id: characterId, unlockKey: characterId, info, name: info.name || characterId };
        }
        if (typeof MEMBER_INFO !== 'undefined') {
          const entry = Object.entries(MEMBER_INFO).find(([memberKey, info]) => memberKey === characterId || info?.id === characterId);
          if (entry) {
            const [memberKey, info] = entry;
            return { kind: 'member', id: info.id || memberKey, unlockKey: memberKey, info, name: info.name || memberKey };
          }
        }
        return null;
      }

      function isCharacterUnlocked(characterId) {
        const resolved = resolvePortraitCharacter(characterId);
        const state = window.gameEngine?.gameState;
        if (!resolved || !state) return false;
        if (resolved.kind === 'student') return Boolean(state.unlockedStudents?.has?.(resolved.unlockKey));
        return Boolean(state.unlockedChars?.has?.(resolved.unlockKey));
      }

      function getPortraitMetaText(resolved, state) {
        if (resolved.kind === 'student') {
          const plantDiscovered = Boolean(state.discoveredHerbNames?.has?.(resolved.info.plant));
          return `代表植物｜${plantDiscovered ? resolved.info.plant : '？？？'}`;
        }
        return `身分｜${resolved.info.role || (resolved.id === 'principal' ? '校長' : '老師')}`;
      }

      function openMemberPortraitViewer(characterId) {
        const resolved = resolvePortraitCharacter(characterId);
        const state = window.gameEngine?.gameState;
        if (!resolved || !state || !isCharacterUnlocked(characterId) || !resolved.info.avatar) return false;
        currentCharacterId = resolved.id;
        viewer.dataset.characterId = resolved.id;
        viewerName.textContent = resolved.name;
        viewerMeta.textContent = getPortraitMetaText(resolved, state);
        viewerFailure.hidden = true;
        viewerImage.hidden = false;
        viewerImage.alt = `${resolved.name}完整人物立繪`;
        viewerImage.src = resolved.info.avatar;
        viewer.classList.add('active');
        viewer.setAttribute('aria-hidden', 'false');
        return true;
      }

      function closeMemberPortraitViewer() {
        if (!viewer.classList.contains('active')) return false;
        viewer.classList.remove('active');
        viewer.setAttribute('aria-hidden', 'true');
        const focused = doc.activeElement;
        if (focused && viewer.contains(focused) && typeof focused.blur === 'function') focused.blur();
        currentCharacterId = null;
        delete viewer.dataset.characterId;
        return true;
      }

      memberList.addEventListener('click', (event) => {
        const portrait = event.target?.closest?.('.member-avatar-img[data-character-id]');
        if (!portrait || !memberList.contains(portrait)) return;
        const characterId = portrait.dataset.characterId;
        const resolved = resolvePortraitCharacter(characterId);
        if (!resolved || !isCharacterUnlocked(characterId) || !resolved.info.avatar) return;
        openMemberPortraitViewer(characterId);
      });

      viewerClose.addEventListener('click', (event) => {
        event.preventDefault();
        closeMemberPortraitViewer();
      });

      viewer.addEventListener('click', (event) => {
        if (event.target === viewer) closeMemberPortraitViewer();
      });

      viewerImage.addEventListener('load', () => {
        if (!currentCharacterId) return;
        viewerFailure.hidden = true;
        viewerImage.hidden = false;
      });

      viewerImage.addEventListener('error', () => {
        const characterId = currentCharacterId;
        const resolved = resolvePortraitCharacter(characterId);
        const failedPath = viewerImage.getAttribute('src') || '';
        console.error('[HerbGame] member portrait viewer image load failed', {
          id: characterId,
          name: resolved?.name || '',
          path: failedPath,
          error: 'load failed'
        });
        viewerImage.hidden = true;
        viewerFailure.hidden = false;
      });

      doc.addEventListener('keydown', (event) => {
        if (!viewer.classList.contains('active')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeMemberPortraitViewer();
          return;
        }
        if (event.code === 'Space' || event.key === ' ') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);

      window.__HERBGAME_MEMBER_PORTRAIT_VIEWER = {
        openMemberPortraitViewer,
        closeMemberPortraitViewer,
        resolvePortraitCharacter,
        isCharacterUnlocked,
        get activeCharacterId() { return currentCharacterId; }
      };
    })();
    </script>'''

s = pattern.sub(viewer_script, s, count=1)
if s == original:
    raise SystemExit('patch produced no changes')
p.write_text(s, encoding='utf-8')
print('PATCH_OK')
