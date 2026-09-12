from pathlib import Path

p = Path('herbgameai-formal.html')
s = p.read_text(encoding='utf-8')

if 'id="member-portrait-viewer"' in s or 'id="member-portrait-viewer-style"' in s:
    raise SystemExit('member portrait viewer already exists; refusing duplicate patch')

old = '<img class="member-avatar-img" src="${info.avatar}" alt="${info.name}" draggable="false"'
new = '<img class="member-avatar-img" data-student-id="${id}" src="${info.avatar}" alt="${info.name}" draggable="false"'
if s.count(old) != 1:
    raise SystemExit(f'student avatar template match count: {s.count(old)}')
s = s.replace(old, new, 1)

style = r'''
    <style id="member-portrait-viewer-style">
        .member-avatar-img[data-student-id] {
            cursor: zoom-in;
            transition: transform 160ms ease;
            transform-origin: center bottom;
        }
        @media (hover: hover) and (pointer: fine) {
            .member-avatar-img[data-student-id]:hover { transform: scale(1.03); }
        }

        .member-portrait-viewer {
            position: fixed;
            inset: 0;
            z-index: 160;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: clamp(1rem, 3vw, 2rem);
            box-sizing: border-box;
            background: rgba(2, 6, 23, 0.82);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms ease;
        }
        .member-portrait-viewer.active { opacity: 1; pointer-events: auto; }
        .member-portrait-viewer-card {
            position: relative;
            width: min(960px, 92vw);
            max-height: 92vh;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
            align-items: center;
            gap: clamp(1rem, 3vw, 2.5rem);
            padding: clamp(1.1rem, 3vw, 2rem);
            box-sizing: border-box;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.22);
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.94);
            box-shadow: 0 24px 70px rgba(0,0,0,0.48);
        }
        .member-portrait-viewer-image-wrap {
            min-width: 0;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .member-portrait-viewer-image {
            display: block;
            width: auto;
            height: auto;
            max-width: min(48vw, 560px);
            max-height: 76vh;
            object-fit: contain;
            object-position: center;
            background: transparent;
            user-select: none;
            -webkit-user-drag: none;
        }
        .member-portrait-viewer-failure {
            min-width: min(360px, 55vw);
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
            border: 1px dashed rgba(255,255,255,0.28);
            border-radius: 18px;
            color: #fecaca;
            font-weight: 900;
            text-align: center;
            background: rgba(127,29,29,0.16);
        }
        .member-portrait-viewer-failure[hidden] { display: none; }
        .member-portrait-viewer-info { color: white; text-align: left; }
        .member-portrait-viewer-name {
            font-size: clamp(1.8rem, 4vw, 3rem);
            line-height: 1.15;
            font-weight: 900;
            letter-spacing: .06em;
        }
        .member-portrait-viewer-plant {
            margin-top: .8rem;
            color: #d9f99d;
            font-size: clamp(1rem, 2.2vw, 1.35rem);
            line-height: 1.5;
            font-weight: 800;
        }
        .member-portrait-viewer-close {
            position: absolute;
            top: .8rem;
            right: .8rem;
            z-index: 2;
            width: 48px;
            height: 48px;
            border: 1px solid rgba(255,255,255,.28);
            border-radius: 50%;
            background: rgba(15,23,42,.76);
            color: white;
            font-size: 1.8rem;
            line-height: 1;
            cursor: pointer;
        }
        .member-portrait-viewer-close:hover { background: rgba(51,65,85,.95); }

        @media (max-width: 700px) {
            .member-portrait-viewer { padding: .7rem; }
            .member-portrait-viewer-card {
                width: 94vw;
                max-height: 94vh;
                grid-template-columns: 1fr;
                gap: .55rem;
                padding: 1rem 1rem 1.1rem;
                overflow-y: auto;
            }
            .member-portrait-viewer-image { max-width: 82vw; max-height: 68vh; }
            .member-portrait-viewer-info { text-align: center; }
            .member-portrait-viewer-plant { margin-top: .35rem; }
            .member-portrait-viewer-close { width: 46px; height: 46px; top: .55rem; right: .55rem; }
        }
    </style>
'''
if s.count('</head>') != 1:
    raise SystemExit('unexpected </head> count')
s = s.replace('</head>', style + '</head>', 1)

viewer = r'''
    <!-- 共用學生人物立繪 Viewer：圖片來源沿用 STUDENT_INFO[id].avatar -->
    <div id="member-portrait-viewer" class="member-portrait-viewer" aria-hidden="true">
        <div class="member-portrait-viewer-card" role="dialog" aria-modal="true" aria-labelledby="member-portrait-viewer-name">
            <button id="member-portrait-viewer-close" class="member-portrait-viewer-close" type="button" aria-label="關閉人物立繪">×</button>
            <div class="member-portrait-viewer-image-wrap">
                <img id="member-portrait-viewer-image" class="member-portrait-viewer-image" alt="" draggable="false" />
                <div id="member-portrait-viewer-failure" class="member-portrait-viewer-failure" hidden>人物圖片載入失敗</div>
            </div>
            <div class="member-portrait-viewer-info">
                <div id="member-portrait-viewer-name" class="member-portrait-viewer-name"></div>
                <div id="member-portrait-viewer-plant" class="member-portrait-viewer-plant"></div>
            </div>
        </div>
    </div>

    <script id="member-portrait-viewer-script">
    (() => {
      'use strict';
      const doc = document;
      const viewer = doc.getElementById('member-portrait-viewer');
      const viewerImage = doc.getElementById('member-portrait-viewer-image');
      const viewerFailure = doc.getElementById('member-portrait-viewer-failure');
      const viewerName = doc.getElementById('member-portrait-viewer-name');
      const viewerPlant = doc.getElementById('member-portrait-viewer-plant');
      const viewerClose = doc.getElementById('member-portrait-viewer-close');
      const memberList = doc.getElementById('member-list');

      if (!viewer || !viewerImage || !viewerFailure || !viewerName || !viewerPlant || !viewerClose || !memberList) {
        console.error('[HerbGame] member portrait viewer init failed');
        return;
      }

      let currentStudentId = null;

      function getStudentInfo(studentId) {
        if (typeof STUDENT_INFO === 'undefined' || !studentId) return null;
        return STUDENT_INFO[studentId] || null;
      }

      function isStudentUnlocked(studentId) {
        return Boolean(window.gameEngine?.gameState?.unlockedStudents?.has?.(studentId));
      }

      function openMemberPortraitViewer(studentId) {
        const info = getStudentInfo(studentId);
        const state = window.gameEngine?.gameState;
        if (!info || !state || !isStudentUnlocked(studentId) || !info.avatar) return false;

        currentStudentId = studentId;
        viewer.dataset.studentId = studentId;
        viewerName.textContent = info.name;
        const plantDiscovered = Boolean(state.discoveredHerbNames?.has?.(info.plant));
        viewerPlant.textContent = `代表植物｜${plantDiscovered ? info.plant : '？？？'}`;

        viewerFailure.hidden = true;
        viewerImage.hidden = false;
        viewerImage.alt = `${info.name}完整人物立繪`;
        viewerImage.src = info.avatar;

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

        currentStudentId = null;
        delete viewer.dataset.studentId;
        return true;
      }

      memberList.addEventListener('click', (event) => {
        const portrait = event.target?.closest?.('.member-avatar-img[data-student-id]');
        if (!portrait || !memberList.contains(portrait)) return;
        const studentId = portrait.dataset.studentId;
        if (!isStudentUnlocked(studentId) || !getStudentInfo(studentId)) return;
        openMemberPortraitViewer(studentId);
      });

      viewerClose.addEventListener('click', (event) => {
        event.preventDefault();
        closeMemberPortraitViewer();
      });

      viewer.addEventListener('click', (event) => {
        if (event.target === viewer) closeMemberPortraitViewer();
      });

      viewerImage.addEventListener('load', () => {
        if (!currentStudentId) return;
        viewerFailure.hidden = true;
        viewerImage.hidden = false;
      });

      viewerImage.addEventListener('error', () => {
        const studentId = currentStudentId;
        const info = getStudentInfo(studentId);
        const failedPath = viewerImage.getAttribute('src') || '';
        console.error('[HerbGame] member portrait viewer image load failed', {
          id: studentId,
          name: info?.name || '',
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
        get activeStudentId() { return currentStudentId; }
      };
    })();
    </script>
'''
if s.count('</body>') != 1:
    raise SystemExit('unexpected </body> count')
s = s.replace('</body>', viewer + '</body>', 1)

p.write_text(s, encoding='utf-8')
