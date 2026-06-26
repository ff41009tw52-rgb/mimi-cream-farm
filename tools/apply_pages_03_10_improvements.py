from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def write(name, content):
    (ROOT / name).write_text(content, encoding='utf-8')

def require(content, needle, name):
    if needle not in content:
        raise SystemExit(f'Cannot find expected text in {name}: {needle[:80]!r}')

def inject_before(content, marker, block, name):
    require(content, marker, name)
    if block.strip() in content:
        return content
    return content.replace(marker, block + "\n" + marker)

def replace_once(content, old, new, name):
    require(content, old, name)
    return content.replace(old, new, 1)

# 03 電流磁效應：任務、預測、紀錄、結論
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
old_solutions = """        const solutions = [
            { name: '醋', id: 'vinegar', type: 'acid', originalColor: 'rgba(255, 245, 230, 0.2)' },
            { name: '小蘇打水', id: 'soda', type: 'base', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '食鹽水', id: 'salt', type: 'neutral', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '檸檬酸', id: 'lemon', type: 'strong_acid', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '糖水', id: 'sugar', type: 'neutral', originalColor: 'rgba(255, 240, 200, 0.1)' }
        ];"""
new_solutions = """        const solutions = [
            { name: '檸檬汁', id: 'lemon', type: 'acid', originalColor: 'rgba(255, 245, 210, 0.18)' },
            { name: '食鹽水', id: 'salt', type: 'neutral', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '小蘇打水', id: 'soda', type: 'base', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '清水', id: 'water', type: 'neutral', originalColor: 'rgba(230, 245, 255, 0.16)' }
        ];"""
html = replace_once(html, old_solutions, new_solutions, '04.html')
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
            cell.textContent = resultText.replace(/\s*\(.+?\)/, '');
            cell.style.fontWeight = 'bold';
            cell.style.background = 'rgba(255,255,255,0.14)';
        }
'''
html = inject_before(html, '        // 初始化', update_record, '04.html')
write('04.html', html)

# 05 沙鹽分離：文案、提問、成果、流動
html = read('05.html')
style05 = '''
        .thinking-box { background:#fff8e1; border:2px dashed #ffb74d; padding:10px; border-radius:12px; margin:10px 0 14px; color:#5d4037; font-size:.92rem; line-height:1.45; }
        .thinking-title { font-weight:700; color:#e65100; margin-bottom:4px; }
        #replay-step-btn { background: linear-gradient(135deg, #8bc34a, #689f38); }
        .final-result-card { position:absolute; top:20px; right:20px; max-width:300px; background:rgba(255,255,255,.95); border:3px solid #ffcc80; border-radius:16px; padding:12px; z-index:25; color:#4e342e; box-shadow:0 8px 18px rgba(0,0,0,.18); display:none; }
        .final-result-card.show { display:block; }
        .final-result-card h3 { margin:0 0 8px; color:#ef6c00; }
        .final-result-card ul { margin:0; padding-left:1.2em; line-height:1.6; }
'''
html = inject_before(html, '    </style>', style05, '05.html')
html = html.replace('''        <div class="instruction-box">
            <span id="s-title" class="step-title">步驟 1：觀察混合物</span>
            <div id="s-desc" class="step-desc">觀察燒杯內的物質，可以看到深色的沙子和白色的食鹽混合在一起。</div>
        </div>''', '''        <div class="instruction-box">
            <span id="s-title" class="step-title">步驟 1：觀察混合物</span>
            <div id="s-desc" class="step-desc">觀察燒杯內的物質，可以看到深色的沙子和白色的食鹽混合在一起。</div>
        </div>
        <div class="thinking-box" id="thinkingBox"><div class="thinking-title">停下來想一想</div><div id="thinkingQuestion">沙子和食鹽混在一起時，可以用哪一個特性來分開？</div></div>''')
html = html.replace('''        <div class="controls">
            <button id="main-btn">開始實驗：加水</button>
            <button id="reset-btn" style="background: #6c757d; display: none;">重新開始</button>
        </div>''', '''        <div class="controls">
            <button id="main-btn">開始實驗：加水</button>
            <button id="replay-step-btn" type="button">重看這一步</button>
            <button id="reset-btn" style="background: #6c757d; display: none;">重新開始</button>
        </div>''')
html = html.replace('    <canvas id="canvas"></canvas>', '    <div class="final-result-card" id="finalResultCard"><h3>✅ 分離成功</h3><ul><li>濾紙上留下：沙子</li><li>杯子裡得到：食鹽水</li><li>成功原因：食鹽可溶於水，沙子不易溶於水。</li></ul></div>\n    <canvas id="canvas"></canvas>')
repls = {
"text: '這杯子裡黑黑白白的是什麼？是黑糖粉和白糖粉嗎？能不能讓我舔一口？🤤'": "text: '這杯裡有沙子和食鹽混在一起，我們要怎麼把它們分開呢？🤔'",
"text: '不行！那是沙子和食鹽！橘咪咪你這貪吃鬼。現在我們要加水，利用「溶解」來分開它們。🧐'": "text: '我們先加水。食鹽會溶進水裡，沙子不容易溶於水，這就是第一個線索。🧐'",
"text: '哇！水流下去了，可是沙子卡住了！這就像我偷吃飼料被爸爸抓到一樣🙀'": "text: '哇！水流下去了，可是沙子留在濾網上，原來過濾可以留下不溶於水的固體。🙀'",
"text: '看！濾紙上留下的固體是沙子，流下去的液體是食鹽水。這就是過濾法！✨'": "text: '看！濾紙上留下沙子，流下去的是食鹽水。再把水蒸發，就能讓食鹽重新出現。✨'",
}
for old, new in repls.items(): html = html.replace(old, new)
html = html.replace('let flowRate = 2;', 'let flowRate = 4; // 讓水流與沙子流動更順暢')
html = html.replace('if (sandLeft && Math.random() < 0.9 && shouldPourSand) {\n                    let count = Math.floor(Math.random() * 3) + 2;', 'if (sandLeft && Math.random() < 0.98 && shouldPourSand) {\n                    let count = Math.floor(Math.random() * 4) + 3;')
html = html.replace('vx: -0.2 + (Math.random()-0.5)*0.5, \n                            vy: 1.5 + Math.random(),', 'vx: -0.35 + (Math.random()-0.5)*0.8, \n                            vy: 2.1 + Math.random()*1.4,')
html = html.replace('let drainRate = 0.015;', 'let drainRate = 0.03;')
html = html.replace("const mainBtn = document.getElementById('main-btn');\n        const resetBtn = document.getElementById('reset-btn');", "const mainBtn = document.getElementById('main-btn');\n        const replayStepBtn = document.getElementById('replay-step-btn');\n        const thinkingQuestionEl = document.getElementById('thinkingQuestion');\n        const finalResultCard = document.getElementById('finalResultCard');\n        const resetBtn = document.getElementById('reset-btn');")
html = html.replace('filterSetup.pileHeights.fill(0);', "filterSetup.pileHeights.fill(0);\n            if (finalResultCard) finalResultCard.classList.remove('show');")
old_steps = '''        const stepsData = [
            { t: "步驟 1：觀察混合物", d: "燒杯中有大量的沙子（棕色）與食鹽（白色）混合物，約佔杯身 1/3。", btn: "加入清水" },
            { t: "步驟 2：加水溶解", d: "水柱準確注入燒杯中，準備溶解食鹽。", btn: "開始攪拌" },
            { t: "步驟 3：攪拌加速溶解", d: "玻璃棒深入底部攪拌。食鹽溶解消失，沙子沉澱。", btn: "準備篩網" },
            { t: "步驟 4：準備過濾", d: "裝置移至中央。準備過濾。", btn: "倒入混合液" },
            { t: "步驟 5：過濾分離", d: "沙子平整地堆積在篩網上，食鹽水濾出。", btn: "完成實驗" },
            { t: "實驗完成", d: "實驗成功！篩網上留下了所有的沙子。", btn: "重新開始" }
        ];'''
new_steps = '''        const stepsData = [
            { t: "步驟 1：觀察混合物", d: "燒杯中有沙子（棕色）與食鹽（白色）混合在一起。", btn: "加入清水", q: "沙子和食鹽混在一起時，可以用哪一個特性來分開？" },
            { t: "步驟 2：加水溶解", d: "加入清水後，食鹽會溶進水裡，沙子仍然留在杯中。", btn: "開始攪拌", q: "加水後，哪一種物質溶進水裡？" },
            { t: "步驟 3：攪拌加速溶解", d: "攪拌可以讓食鹽更快溶解，沙子仍然不容易溶於水。", btn: "準備濾網", q: "攪拌後，食鹽看不見了，代表它去哪裡了？" },
            { t: "步驟 4：準備過濾", d: "把濾網與接收杯準備好，讓混合液通過濾網。", btn: "倒入混合液", q: "過濾時，哪一種物質會留在濾網上？" },
            { t: "步驟 5：過濾分離", d: "沙子留在濾網上，食鹽水流到下面的杯子裡。", btn: "完成實驗", q: "過濾後，下面杯子裡的液體是什麼？" },
            { t: "實驗完成", d: "分離成功！濾網上留下沙子，杯子裡得到食鹽水。若再蒸發水分，食鹽會重新出現。", btn: "重新開始", q: "成功原因：食鹽可溶於水，沙子不易溶於水。" }
        ];'''
html = replace_once(html, old_steps, new_steps, '05.html')
html = html.replace('const data = stepsData[s]; titleEl.textContent = data.t; descEl.textContent = data.d;', "const data = stepsData[s]; titleEl.textContent = data.t; descEl.textContent = data.d; thinkingQuestionEl.textContent = data.q || ''; if (finalResultCard) finalResultCard.classList.toggle('show', s === 5);")
html = html.replace("resetBtn.addEventListener('click', () => resetExperiment());", "replayStepBtn.addEventListener('click', () => { const data = stepsData[Math.min(step, 5)]; thinkingQuestionEl.textContent = '重看提示：' + (data.q || data.d); setDialogue(Math.min(step, 5)); });\n        resetBtn.addEventListener('click', () => resetExperiment());")
write('05.html', html)

# 06 角色頁
html = read('06.html')
html = html.replace('橘咪咪 (Mimi)', '橘咪咪：觀察小隊長')
html = html.replace('白奶油 (Cream)', '白奶油：問題發明家')
html = html.replace('<span class="tag mimi-tag">#貪吃鬼</span>', '<span class="tag mimi-tag">#會發現問題</span>')
html = html.replace('<span class="tag cream-tag">#傲嬌任性</span>', '<span class="tag cream-tag">#愛提問</span>')
html = html.replace('''這是一隻個性超級和善的小橘貓，平時對誰都好，是農場裡的暖男擔當。
                        <br><br>
                        <strong>但是！</strong>只要遇到好吃的食物，他的眼神就會變了！雖然貪吃，但他可是非常挑惕的，只吃最好的。而且一旦發現美食，絕對不會放過給任何人（就算是白奶油也別想搶！）。''', '''橘咪咪最會仔細觀察。看到植物葉子變黃、實驗顏色改變，或電路沒有亮，他都會先停下來看一看。
                        <br><br>
                        在科學任務中，他會提醒大家：<strong>「先觀察，再判斷。」</strong>''')
html = html.replace('''擁有美麗火焰色的布偶貓，性格任性又傲嬌，覺得自己是農場裡最可愛的存在（實際上也是）。
                        <br><br>
                        最喜歡做的事就是<strong>搶橘咪咪的食物</strong>，神奇的是，不管怎麼搶、怎麼吃，他永遠都比橘咪咪還要瘦！雖然看起來精明，但其實常常會不小心做出笨笨的事情，讓人好氣又好笑。''', '''白奶油最喜歡問問題。每次看到奇怪的現象，他都會想：「為什麼會這樣？」
                        <br><br>
                        在科學任務中，他會提醒大家：<strong>「大膽提問，再動手找答案。」</strong>''')
html = html.replace('👨‍🏫 貓咪主人介紹', '👨‍🏫 認識農場老師')
style06 = '''
        .cat-quote { margin-top: 14px; padding: 12px; border-radius: 14px; background: #fff8e1; border: 2px dashed #ffb74d; font-weight: bold; color: #5d4037; display: none; }
        .char-card { cursor: pointer; }
        .char-card.active .cat-quote { display: block; }
'''
html = inject_before(html, '    </style>', style06, '06.html')
html = html.replace('</p>\n                </div>\n            </article>', '</p>\n                        <div class="cat-quote">橘咪咪：我先觀察，再把發現告訴大家！</div>\n                </div>\n            </article>', 1)
html = html.replace('</p>\n                </div>\n            </article>', '</p>\n                        <div class="cat-quote">白奶油：我有一個問題！讓我們動手試試看！</div>\n                </div>\n            </article>', 1)
script06 = '''
    <script>
        document.querySelectorAll('.char-card').forEach((card) => card.addEventListener('click', () => card.classList.toggle('active')));
    </script>
'''
html = inject_before(html, '    <script src="home-button.js"></script>', script06, '06.html')
write('06.html', html)

# 07 空氣壓縮
html = read('07.html')
style07 = '''
        .dashboard-07 { position: fixed; top: 18px; right: 18px; z-index: 40; display: grid; gap: 8px; width: min(300px, calc(100vw - 36px)); }
        .metric-card, .prediction-card, .conclusion-card { background: rgba(255,255,255,.94); border-radius: 14px; padding: 10px 14px; box-shadow: 0 6px 16px rgba(0,0,0,.15); color: var(--text-color); font-weight: 700; }
        .metric-card span { color:#1565c0; font-size:1.2rem; }
        .prediction-card button { margin-top: 6px; margin-right: 6px; border:0; border-radius:999px; padding:6px 10px; color:#fff; background:#3498db; font-weight:700; }
        .conclusion-card { display:none; border-left:6px solid var(--success-color); }
        .conclusion-card.show { display:block; }
        .target-line.near { background-color: var(--warning-color); }
        .target-line.near .target-label { background: var(--warning-color); }
        .target-line.success { background-color: var(--success-color); }
        .target-line.success .target-label { background: var(--success-color); }
        @media (max-width: 700px) { .dashboard-07 { position: static; margin: 10px auto; } }
'''
html = inject_before(html, '    </style>', style07, '07.html')
dashboard07 = '''
    <aside class="dashboard-07" aria-label="空氣壓縮觀察數值"><div class="metric-card">現在空氣體積：<span id="volumeValue">0 mL</span></div><div class="metric-card">空氣擠得多不多：<span id="crowdingValue">鬆鬆的</span></div><div class="prediction-card">預測：把活塞往下壓時，空氣粒子會變得比較分散，還是比較擠？<br><button type="button" onclick="answerPrediction07('分散')">比較分散</button><button type="button" onclick="answerPrediction07('擠')">比較擠</button><div id="predictionFeedback07"></div></div><div class="conclusion-card" id="conclusion07">結論：空間變小時，空氣粒子會靠得更近、跑得更快。</div></aside>
'''
html = replace_once(html, '<body>', '<body>\n' + dashboard07, '07.html')
html = html.replace('橡皮擦', '橡皮塞')
html = html.replace("missionDesc.innerHTML = \"空氣彈回 20ml 了！證明<span style='color: #e74c3c; font-weight: bold; font-size: 1.1rem;'>空氣可以被壓縮</span>。\";", "missionDesc.innerHTML = \"空氣彈回 20ml 了！證明<span style='color: #e74c3c; font-weight: bold; font-size: 1.1rem;'>空氣可以被壓縮</span>。<br>結論：空間變小時，空氣粒子會靠得更近、跑得更快。\";\n                document.getElementById('conclusion07')?.classList.add('show');")
html = html.replace('resetBtn.style.display = "none";', 'resetBtn.style.display = "none";\n            document.getElementById(\'conclusion07\')?.classList.remove(\'show\');')
html = html.replace('''        function showTargetLine(ml) {
            targetLine.style.display = 'block';
            let pxFromBottom = (ml / MAX_VOL) * 242 + 74;
            targetLine.style.bottom = pxFromBottom + 'px';
            targetLine.querySelector('.target-label').innerText = ml + 'ml';
        }''', '''        function showTargetLine(ml) {
            targetLine.style.display = 'block';
            let pxFromBottom = (ml / MAX_VOL) * 242 + 74;
            targetLine.style.bottom = pxFromBottom + 'px';
            targetLine.querySelector('.target-label').innerText = ml + 'ml';
            updateTargetLineState();
        }

        function updateDashboard07() {
            const volume = Math.round(currentVol);
            const volumeEl = document.getElementById('volumeValue');
            const crowdingEl = document.getElementById('crowdingValue');
            if (volumeEl) volumeEl.textContent = volume + ' mL';
            if (crowdingEl) {
                crowdingEl.textContent = isBlocked && currentVol < 12 ? '擠在一起' : (isBlocked && currentVol < 18 ? '有點擠' : '鬆鬆的');
                crowdingEl.style.color = isBlocked && currentVol < 12 ? '#e74c3c' : '#1565c0';
            }
            updateTargetLineState();
        }
        function updateTargetLineState() {
            if (!targetLine) return;
            targetLine.classList.remove('near', 'success');
            const distance = Math.abs(currentVol - 20);
            if (distance <= 0.8) targetLine.classList.add('success');
            else if (distance <= 3) targetLine.classList.add('near');
        }
        function answerPrediction07(answer) {
            const feedback = document.getElementById('predictionFeedback07');
            if (!feedback) return;
            if (answer === '擠') { feedback.textContent = '✅ 沒錯！空間變小時，空氣粒子會比較擠。'; feedback.style.color = '#2e7d32'; }
            else { feedback.textContent = '再想想：活塞往下壓，空氣的空間會變小喔。'; feedback.style.color = '#c2410c'; }
        }''')
html = html.replace('''            currentVol = vol;

            let topPx = PLUNGER_BOTTOM_TOP_OFFSET''', '''            currentVol = vol;
            updateDashboard07();

            let topPx = PLUNGER_BOTTOM_TOP_OFFSET''')
write('07.html', html)

# 08 電路引導與修正多燈泡邏輯
html = read('08.html')
style08 = '''
        .guided-card-08 { position: fixed; left: 14px; bottom: 14px; z-index: 60; width: min(390px, calc(100vw - 28px)); background: rgba(255,255,255,.96); border: 3px solid #fbbf24; border-radius: 18px; padding: 12px; box-shadow: 0 10px 24px rgba(0,0,0,.18); font-family:"Microsoft JhengHei", sans-serif; color:#334155; }
        .guided-card-08 h2 { margin:0 0 6px; color:#b45309; font-size:1.05rem; }
        .guided-card-08 ol { margin:0 0 6px 1.2em; line-height:1.55; }
        .guided-card-08 .explain { background:#fffbeb; border-radius:12px; padding:8px; font-weight:700; color:#92400e; }
        @media (max-width: 700px) { .guided-card-08 { position: static; margin: 10px auto; } }
'''
html = inject_before(html, '    </style>', style08, '08.html')
panel08 = '''
    <section class="guided-card-08" aria-label="電路跟著做任務"><h2>💡 跟著做模式</h2><ol><li>先把電池的＋端連到燈泡下面的小圓點。</li><li>再把燈泡旁邊的金屬螺紋連回電池－端。</li><li>打開電源，觀察燈泡是否亮起。</li></ol><div class="explain">成功亮燈的原因：電流走成一個完整的圈圈。</div></section>
'''
html = replace_once(html, '    <div id="root"></div>', '    <div id="root"></div>\n' + panel08, '08.html')
html = html.replace('最多只能使用五顆燈泡喔！', '最多只能使用五顆燈泡喔！每顆燈泡都要有自己的完整迴路才會亮。')
html = html.replace('🔌 按住接點並拖曳來拉電線', '🔌 先連電池＋端，再連燈泡下面的小圓點與金屬螺紋')
old_run = re.search(r"                // --- 核心邏輯 ---\n            const runSimulation = \(\) => \{.*?\n            \};\n\n            return \(", html, flags=re.S)
if not old_run:
    raise SystemExit('Cannot locate runSimulation in 08.html')
new_run = '''                // --- 核心邏輯 ---
            const runSimulation = () => {
                setErrorMsg(''); setLitBulbIds(new Set()); setBrightness(0);
                const adj = {};
                components.forEach(c => {
                    if (c.type === COMPONENT_TYPES.BATTERY) { adj[`${c.id}:pos`] = []; adj[`${c.id}:neg`] = []; }
                    else { adj[`${c.id}:thread`] = []; adj[`${c.id}:tip`] = []; }
                });
                wires.forEach(w => { const u = `${w.start.compId}:${w.start.pointType}`; const v = `${w.end.compId}:${w.end.pointType}`; if (adj[u]) adj[u].push(v); if (adj[v]) adj[v].push(u); });
                // 燈泡內部導通；電池正負極不直接互通，避免多燈泡時錯誤亮燈。
                components.filter(c => c.type === COMPONENT_TYPES.BULB).forEach(bulb => { adj[`${bulb.id}:thread`].push(`${bulb.id}:tip`); adj[`${bulb.id}:tip`].push(`${bulb.id}:thread`); });
                const batteries = components.filter(c => c.type === COMPONENT_TYPES.BATTERY);
                if (batteries.length === 0) { setErrorMsg('需要電池才能供電！'); setIsSwitchOn(false); return; }
                const reachableFrom = (start) => { const seen = new Set([start]); const stack = [start]; while (stack.length) { const node = stack.pop(); (adj[node] || []).forEach(next => { if (!seen.has(next)) { seen.add(next); stack.push(next); } }); } return seen; };
                const lit = new Set(); let shortCircuit = false;
                batteries.forEach(battery => {
                    const fromPos = reachableFrom(`${battery.id}:pos`);
                    const fromNeg = reachableFrom(`${battery.id}:neg`);
                    if (fromPos.has(`${battery.id}:neg`) || fromNeg.has(`${battery.id}:pos`)) shortCircuit = true;
                    components.filter(c => c.type === COMPONENT_TYPES.BULB).forEach(bulb => {
                        const thread = `${bulb.id}:thread`; const tip = `${bulb.id}:tip`;
                        if ((fromPos.has(thread) && fromNeg.has(tip)) || (fromPos.has(tip) && fromNeg.has(thread))) lit.add(bulb.id);
                    });
                });
                if (lit.size > 0) { setLitBulbIds(lit); const brightnessLevel = batteries.length >= 2 ? 2 : 1; setBrightness(brightnessLevel); setErrorMsg(`電路形成完整圈圈！${lit.size} 顆燈泡發光。`); }
                else { setErrorMsg(shortCircuit ? '電池正負極可能直接相連，請讓電流經過燈泡。' : '電源已開啟，但未形成完整迴路。'); }
            };

            return ('''
html = html[:old_run.start()] + new_run + html[old_run.end():]
write('08.html', html)

# 09 任務徽章
html = read('09.html')
html = html.replace('<title>橘咪咪與白奶油的實驗室 V13</title>', '<title>酸鹼分類接接樂</title>')
html = html.replace('<h1>🐱 橘咪咪與白奶油的實驗室</h1>', '<h1>🧪 酸鹼分類接接樂</h1>')
html = html.replace('❤️ 生命: 3', '🎯 挑戰機會: 3 次')
html = html.replace('目標：100分 完美通關！', '目標：完成酸性、鹼性、中性三個任務徽章！')
html = html.replace('targetScore: 100 // 修改：目標分數改為 100', 'targetScore: 3, // 三個任務徽章')
html = html.replace('currentMissionTarget: 2,', 'currentMissionTarget: 2,\n        completedBadges: new Set(),')
html = html.replace('this.state.missionItemsCollected = 0;\n        \n        this.changeMission();', 'this.state.missionItemsCollected = 0;\n        this.state.completedBadges = new Set();\n        \n        this.changeMission();')
html = html.replace('this.state.score += 10;', 'this.state.score += 1;')
html = html.replace('this.showFloatingText("+10", "#2ecc71", this.player.x);', "this.showFloatingText('徽章進度 +1', '#2ecc71', this.player.x);")
html = html.replace('''            if (this.state.score >= this.state.targetScore) {
                this.showResult(true, "pass");
                return;
            }

            if (this.state.missionItemsCollected >= this.state.currentMissionTarget) {
                 this.changeMission();
            }''', '''            this.state.completedBadges.add(this.state.currentMission.type);
            if (this.state.completedBadges.size >= this.state.targetScore) {
                this.showResult(true, "pass");
                return;
            }

            if (this.state.missionItemsCollected >= this.state.currentMissionTarget) {
                 this.changeMission();
            }''')
html = html.replace('scoreEl.textContent = this.state.score;', "scoreEl.textContent = `${this.state.completedBadges.size} / 3`;")
html = html.replace('''        // 修改：更新評價分數區間
        if (this.state.score >= 100) { // 100分 (滿分)''', '''        const badgeText = `<div style="font-size:22px;line-height:2;">🏅 酸性小達人：${this.state.completedBadges.has('acid') ? '完成' : '再挑戰'}<br>🏅 鹼性小達人：${this.state.completedBadges.has('base') ? '完成' : '再挑戰'}<br>🏅 中性小達人：${this.state.completedBadges.has('neutral') ? '完成' : '再挑戰'}</div>`;
        if (this.state.completedBadges.size >= 3) {''')
html = html.replace('白奶油博士：</span>「完美同步！各項數值都達到了理論巔峰，這是一次教科書級別的實驗！」<br><br>', '白奶油博士：</span>「三種溶液分類任務都完成了！」<br><br>')
html = html.replace('橘咪咪：</span>「檢測不到任何誤差！您簡直就是精密的代名詞！」', "橘咪咪：</span>「你拿到三個任務徽章了！」 + badgeText")
html = re.sub(r"\n        \} else if \(this\.state\.score >= 50\).*?\n        \} else \{ // 0 ~ 49分", "\n        } else {", html, flags=re.S)
html = html.replace('白奶油博士：</span>「冷靜點，變數控制失誤常有的事。讓我們重新校準儀器，再來一次。」', "白奶油博士：</span>「再試一次，先看清楚現在要收集酸性、鹼性還是中性。」 + badgeText")
html = html.replace("document.getElementById('score-display').textContent = `🏆 分數: ${this.state.score} / ${this.state.targetScore}`;", "document.getElementById('score-display').textContent = `🏅 任務徽章: ${this.state.completedBadges.size} / 3`;")
html = html.replace("document.getElementById('lives-display').textContent = `生命: ${hearts}`;", "document.getElementById('lives-display').textContent = `挑戰機會: ${this.state.lives} 次 ${hearts}`;")
write('09.html', html)

# 10 老師小屋
html = read('10.html')
html = html.replace('<title>關於老師 - 橘咪咪與白奶油的科學農場</title>', '<title>老師的科學小屋 - 橘咪咪與白奶油的科學農場</title>')
html = html.replace('關於老師', '老師的科學小屋')
style10 = '''
        .promise-list { display:grid; gap:10px; margin: 18px 0; }
        .promise-item { background:#fff8e1; border-left:5px solid #ffb74d; border-radius:12px; padding:12px 14px; font-weight:700; color:#4e342e; }
        details.teacher-surprise { margin-top: 18px; background:#f1f8e9; border:2px dashed #8bc34a; border-radius:14px; padding:12px; }
        details.teacher-surprise summary { cursor:pointer; font-weight:800; color:#33691e; }
        .start-task-btn { display:inline-block; background:#ff8c42; color:white; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:800; box-shadow:0 4px 0 #c65f1c; margin-top:20px; }
'''
html = inject_before(html, '    </style>', style10, '10.html')
html = html.replace('</div>\n\n                    <p class="intro-text">', '</div>\n\n                    <div class="promise-list"><div class="promise-item">🔍 我們會先觀察。</div><div class="promise-item">🧪 我們會自己動手做。</div><div class="promise-item">💡 我們會一起找答案。</div></div>\n\n                    <p class="intro-text">', 1)
html = html.replace('<div class="feature-box">', '<details class="teacher-surprise"><summary>🎁 老師的小驚喜</summary>\n                    <div class="feature-box">', 1)
pos = html.rfind('</div>\n\n                    <div class="footer-nav">')
if pos != -1:
    html = html[:pos] + '</div>\n                    </details>\n\n                    <a class="start-task-btn" href="index.html">開始今天的科學任務</a>' + html[pos+6:]
write('10.html', html)

for page in ['03.html','04.html','05.html','06.html','07.html','08.html','09.html','10.html']:
    text = read(page)
    if '</html>' not in text or '<body' not in text:
        raise SystemExit(f'{page} appears malformed')
    print(f'updated {page}')
