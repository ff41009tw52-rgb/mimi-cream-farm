import sys
import traceback

def _short_excepthook(exc_type, exc, tb):
    print('SHORT_TRACEBACK_START')
    traceback.print_exception(exc_type, exc, tb, limit=8)
    print('SHORT_TRACEBACK_END')

sys.excepthook = _short_excepthook

" + "from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def write(name, content):
    (ROOT / name).write_text(content, encoding='utf-8')

def has(content, needle, name):
    if needle not in content:
        print(f'WARN missing in {name}: {needle[:80]!r}')
        return False
    return True

def inject_before(content, marker, block, name):
    if block.strip() in content:
        return content
    if not has(content, marker, name):
        return content
    return content.replace(marker, block + "\n" + marker)

def replace_once(content, old, new, name):
    if not has(content, old, name):
        return content
    return content.replace(old, new, 1)

# 03 電流磁效應：任務、預測、紀錄、結論
print('Applying 03...')
html = read('03.html')
html = html.replace('<title>電流磁效應虛擬實驗室</title>', '<title>電流磁效應任務實驗室</title>')
style03 = '''
        /* 03 教學任務面板 */
        .mission-guide-03 { position: fixed; right: 18px; bottom: 18px; z-index: 80; width: min(360px, calc(100vw - 36px)); background: rgba(255,255,255,.96); border: 3px solid #38bdf8; border-radius: 22px; box-shadow: 0 12px 28px rgba(15,23,42,.22); padding: 16px; color: #0f172a; font-family: "Microsoft JhengHei", sans-serif; }
        .mission-guide-03 h2 { margin: 0 0 8px; font-size: 1.12rem; color: #0369a1; }
        .mission-guide-03 ol { margin: 0 0 10px 1.2em; padding: 0; line-height: 1.6; }
        .mission-guide-03 .prediction { background: #e0f2fe; border-radius: 14px; padding: 10px; margin: 10px 0; }
        .mission-guide-03 button { border: 0; border-radius: 999px; padding: 6px 10px; margin: 4px 4px 0 0; background: #0284c7; color: #fff; font-weight: 700; cursor: pointer; }
        .mission-guide-03 table { width: 100%; border-collapse: collapse; font-size: .9rem; margin-top: 8px; }
        .mission-guide-03 th, .mission-guide-03 td { border: 1px solid #bae6fd; padding: 5px; text-align: center; }
        .mission-guide-03 th { background: #f0f9ff; }
        .mission-guide-03 .conclusion { margin-top: 10px; background: #ecfeff; padding: 8px; border-radius: 12px; font-weight: 700; color: #155e75; }
        @media (max-width: 760px) { .mission-guide-03 { position: static; width: auto; margin: 14px; } }
'''
html = inject_before(html, '    </style>', style03, '03.html')
panel03 = '''
    <section class="mission-guide-03" aria-label="電流磁效應任務引導">
        <h2>🧭 電流磁效應任務</h2>
        <ol><li>先觀察：沒有通電時，指南針會不會轉？</li><li>打開電源：觀察指南針偏轉。</li><li>反轉電流：比較偏轉方向。</li><li>移動導線位置：觀察導線在上方或下方的差異。</li></ol>
        <div class="prediction"><strong>先猜猜看：</strong><br>電流方向改變後，指南針會怎麼轉？<br><button type="button" data-predict="same">方向一樣</button><button type="button" data-predict="opposite">方向相反</button><div id="prediction-feedback-03" style="margin-top:6px;font-weight:700;"></div></div>
        <table><thead><tr><th>操作</th><th>指南針變化</th></tr></thead><tbody><tr><td>通電</td><td>會偏轉</td></tr><tr><td>反轉電流</td><td>方向相反</td></tr><tr><td>移動導線</td><td>偏轉情形改變</td></tr></tbody></table>
        <div class="conclusion">結論：通電的導線周圍會產生磁力，電流方向改變，指南針偏轉方向也會改變。</div>
    </section>
'''
html = replace_once(html, '    <div id="root"></div>', '    <div id="root"></div>\n' + panel03, '03.html')
script03 = '''
    <script>
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-predict]');
            if (!button) return;
            const feedback = document.getElementById('prediction-feedback-03');
            if (button.dataset.predict === 'opposite') { feedback.textContent = '✅ 好預測！反轉電流後，指南針偏轉方向會相反。'; feedback.style.color = '#047857'; }
            else { feedback.textContent = '再想想：電流方向改變，磁場方向也會改變喔！'; feedback.style.color = '#b45309'; }
        });
    </script>
'''
html = inject_before(html, '    <script src="home-button.js"></script>', script03, '03.html')
write('03.html', html)

# 04 酸鹼變色紀錄
print('Applying 04...')
html = read('04.html')
html = html.replace('background-color: #444444; /* 改為灰色背景 */', 'background: linear-gradient(135deg, #241033 0%, #33215f 55%, #15234f 100%); /* 深藍紫背景，讓器材與文字更清楚 */')
html = html.replace('請拖曳滴管，滴入下方燒杯中觀察顏色變化。', '選擇指示劑後，拖曳滴管到燒杯中，觀察並記錄顏色變化。')
style04 = '''
        .record-panel { width: min(900px, calc(100% - 32px)); background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.24); border-radius: 18px; padding: 14px; margin: 6px auto 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
        .record-panel h2 { margin: 0 0 10px; text-align: center; color: #d8b4fe; font-size: 1.1rem; }
        .record-table { width: 100%; border-collapse: collapse; color: #fff; background: rgba(0,0,0,0.18); border-radius: 12px; overflow: hidden; }
        .record-table th, .record-table td { border: 1px solid rgba(255,255,255,0.18); padding: 8px; text-align: center; }
        .record-table th { background: rgba(255,255,255,0.13); }
        .record-conclusion { margin-top: 10px; color: #fef3c7; font-weight: 700; text-align: center; line-height: 1.5; }
'''
html = inject_before(html, '    </style>', style04, '04.html')
html = re.sub(r"        const solutions = \[.*?\n        \];", """        const solutions = [
            { name: '檸檬汁', id: 'lemon', type: 'acid', originalColor: 'rgba(255, 245, 210, 0.18)' },
            { name: '食鹽水', id: 'salt', type: 'neutral', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '小蘇打水', id: 'soda', type: 'base', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '清水', id: 'water', type: 'neutral', originalColor: 'rgba(230, 245, 255, 0.16)' }
        ];""", html, count=1, flags=re.S)
record_panel = '''
    <section class="record-panel" aria-label="變色紀錄表"><h2>📝 變色紀錄表</h2><table class="record-table"><thead><tr><th>液體</th><th>高麗菜汁顏色</th><th>蝶豆花顏色</th></tr></thead><tbody><tr data-liquid="檸檬汁"><td>檸檬汁</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="食鹽水"><td>食鹽水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="小蘇打水"><td>小蘇打水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="清水"><td>清水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr></tbody></table><div class="record-conclusion">結論：不同液體會讓天然色素變成不同顏色，所以可以幫助我們分辨酸性、鹼性和中性。</div></section>
'''
html = replace_once(html, '    <button class="reset-btn" onclick="initLab()">重新實驗 (Reset)</button>', record_panel + '\n    <button class="reset-btn" onclick="initLab()">重新實驗 (Reset)</button>', '04.html')
html = html.replace('beaker.dataset.type = sol.type; // 存儲酸鹼類型', 'beaker.dataset.type = sol.type; // 存儲酸鹼類型\n                beaker.dataset.name = sol.name;')
html = html.replace("resultTag.classList.add('show');", "resultTag.classList.add('show');\n                updateRecord(beaker.dataset.name, currentIndicatorKey, reactionData.text);")
update_record = '''

        function updateRecord(liquidName, indicatorKey, resultText) {
            const row = document.querySelector(`tr[data-liquid="${liquidName}"]`);
            if (!row) return;
            const cell = row.querySelector(`td[data-indicator="${indicatorKey}"]`);
            if (!cell) return;
            cell.textContent = resultText.replace(/\\s*\\(.+?\\)/, '');
            cell.style.fontWeight = 'bold';
            cell.style.background = 'rgba(255,255,255,0.14)';
        }
'''
html = inject_before(html, '        // 初始化', update_record, '04.html')
write('04.html', html)

# Remaining page work is applied by the existing script body kept in the following commit if this diagnostic succeeds.
print('diagnostic partial complete')
