from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]

def r(n): return (ROOT/n).read_text(encoding='utf-8')
def w(n,s): (ROOT/n).write_text(s,encoding='utf-8')
def add_before(s, marker, block):
    return s if block.strip() in s else s.replace(marker, block+'\n'+marker)
def add_after(s, marker, block):
    return s if block.strip() in s else s.replace(marker, marker+'\n'+block)
def rep(s,a,b): return s.replace(a,b,1) if a in s else s

def page03():
    s=r('03.html')
    s=s.replace('電流磁效應虛擬實驗室','電流磁效應任務實驗室')
    css='''
        .mission-guide-03{position:fixed;right:18px;bottom:18px;z-index:80;width:min(360px,calc(100vw - 36px));background:rgba(255,255,255,.96);border:3px solid #38bdf8;border-radius:22px;box-shadow:0 12px 28px rgba(15,23,42,.22);padding:16px;color:#0f172a;font-family:"Microsoft JhengHei",sans-serif}.mission-guide-03 h2{margin:0 0 8px;color:#0369a1}.mission-guide-03 ol{margin:0 0 10px 1.2em;padding:0;line-height:1.6}.mission-guide-03 button{border:0;border-radius:999px;padding:6px 10px;margin:4px;background:#0284c7;color:white;font-weight:700}.mission-guide-03 table{width:100%;border-collapse:collapse;font-size:.9rem}.mission-guide-03 th,.mission-guide-03 td{border:1px solid #bae6fd;padding:5px;text-align:center}.mission-guide-03 th{background:#f0f9ff}.mission-guide-03 .conclusion{margin-top:10px;background:#ecfeff;padding:8px;border-radius:12px;font-weight:700;color:#155e75}@media(max-width:760px){.mission-guide-03{position:static;width:auto;margin:14px}}
'''
    s=add_before(s,'    </style>',css)
    panel='''    <section class="mission-guide-03"><h2>🧭 電流磁效應任務</h2><ol><li>先觀察：沒有通電時，指南針會不會轉？</li><li>打開電源：觀察指南針偏轉。</li><li>反轉電流：比較偏轉方向。</li><li>移動導線位置：觀察導線在上方或下方的差異。</li></ol><strong>先猜猜看：</strong> 電流方向改變後，指南針會怎麼轉？<br><button data-predict="same">方向一樣</button><button data-predict="opposite">方向相反</button><div id="prediction-feedback-03"></div><table><thead><tr><th>操作</th><th>指南針變化</th></tr></thead><tbody><tr><td>通電</td><td>會偏轉</td></tr><tr><td>反轉電流</td><td>方向相反</td></tr><tr><td>移動導線</td><td>偏轉情形改變</td></tr></tbody></table><div class="conclusion">結論：通電的導線周圍會產生磁力，電流方向改變，指南針偏轉方向也會改變。</div></section>'''
    s=add_after(s,'    <div id="root"></div>',panel)
    js='''<script>document.addEventListener('click',e=>{const b=e.target.closest('[data-predict]');if(!b)return;const f=document.getElementById('prediction-feedback-03');f.textContent=b.dataset.predict==='opposite'?'✅ 好預測！反轉電流後方向會相反。':'再想想：電流方向改變，磁場方向也會改變喔！';});</script>'''
    s=add_before(s,'    <script src="home-button.js"></script>',js)
    w('03.html',s)

def page04():
    s=r('04.html')
    s=s.replace('background-color: #444444; /* 改為灰色背景 */','background:linear-gradient(135deg,#241033 0%,#33215f 55%,#15234f 100%);')
    s=s.replace('請拖曳滴管，滴入下方燒杯中觀察顏色變化。','選擇指示劑後，拖曳滴管到燒杯中，觀察並記錄顏色變化。')
    css='.record-panel{width:min(900px,calc(100% - 32px));background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.24);border-radius:18px;padding:14px;margin:6px auto 20px}.record-table{width:100%;border-collapse:collapse;color:white;background:rgba(0,0,0,.18)}.record-table th,.record-table td{border:1px solid rgba(255,255,255,.2);padding:8px;text-align:center}.record-conclusion{margin-top:10px;color:#fef3c7;font-weight:700;text-align:center}'
    s=add_before(s,'    </style>',css)
    s=re.sub(r"        const solutions = \[.*?\n        \];","""        const solutions = [
            { name: '檸檬汁', id: 'lemon', type: 'acid', originalColor: 'rgba(255, 245, 210, 0.18)' },
            { name: '食鹽水', id: 'salt', type: 'neutral', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '小蘇打水', id: 'soda', type: 'base', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '清水', id: 'water', type: 'neutral', originalColor: 'rgba(230, 245, 255, 0.16)' }
        ];""",s,count=1,flags=re.S)
    table='''<section class="record-panel"><h2>📝 變色紀錄表</h2><table class="record-table"><thead><tr><th>液體</th><th>高麗菜汁顏色</th><th>蝶豆花顏色</th></tr></thead><tbody><tr data-liquid="檸檬汁"><td>檸檬汁</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="食鹽水"><td>食鹽水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="小蘇打水"><td>小蘇打水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr><tr data-liquid="清水"><td>清水</td><td data-indicator="cabbage">尚未觀察</td><td data-indicator="butterfly">尚未觀察</td></tr></tbody></table><div class="record-conclusion">結論：不同液體會讓天然色素變成不同顏色，所以可以幫助我們分辨酸性、鹼性和中性。</div></section>'''
    s=add_before(s,'    <button class="reset-btn" onclick="initLab()">重新實驗 (Reset)</button>',table)
    s=s.replace('beaker.dataset.type = sol.type; // 存儲酸鹼類型','beaker.dataset.type = sol.type; // 存儲酸鹼類型\n                beaker.dataset.name = sol.name;')
    s=s.replace("resultTag.classList.add('show');","resultTag.classList.add('show');\n                updateRecord(beaker.dataset.name,currentIndicatorKey,reactionData.text);")
    s=add_before(s,'        // 初始化',"""
        function updateRecord(liquidName,indicatorKey,resultText){const row=document.querySelector(`tr[data-liquid="${liquidName}"]`);if(!row)return;const cell=row.querySelector(`td[data-indicator="${indicatorKey}"]`);if(!cell)return;cell.textContent=resultText.replace(/\s*\(.+?\)/,'');cell.style.fontWeight='bold';cell.style.background='rgba(255,255,255,.14)';}
""")
    w('04.html',s)

def page05():
    s=r('05.html')
    s=add_before(s,'    </style>','.thinking-box{background:#fff8e1;border:2px dashed #ffb74d;padding:10px;border-radius:12px;margin:10px 0 14px;color:#5d4037}.final-result-card{position:absolute;top:20px;right:20px;max-width:300px;background:rgba(255,255,255,.95);border:3px solid #ffcc80;border-radius:16px;padding:12px;z-index:25;color:#4e342e;display:none}.final-result-card.show{display:block}#replay-step-btn{background:linear-gradient(135deg,#8bc34a,#689f38)}')
    s=s.replace('</div>\n        </div>\n\n        <div class="controls">','</div>\n        </div>\n        <div class="thinking-box"><b>停下來想一想</b><div id="thinkingQuestion">沙子和食鹽混在一起時，可以用哪一個特性來分開？</div></div>\n\n        <div class="controls">',1)
    s=s.replace('<button id="main-btn">開始實驗：加水</button>','<button id="main-btn">開始實驗：加水</button>\n            <button id="replay-step-btn" type="button">重看這一步</button>')
    s=add_before(s,'    <canvas id="canvas"></canvas>','<div class="final-result-card" id="finalResultCard"><h3>✅ 分離成功</h3><ul><li>濾紙上留下：沙子</li><li>杯子裡得到：食鹽水</li><li>成功原因：食鹽可溶於水，沙子不易溶於水。</li></ul></div>')
    s=s.replace('這杯子裡黑黑白白的是什麼？是黑糖粉和白糖粉嗎？能不能讓我舔一口？🤤','這杯裡有沙子和食鹽混在一起，我們要怎麼把它們分開呢？🤔')
    s=s.replace('let flowRate = 2;','let flowRate = 4;')
    s=s.replace('let drainRate = 0.015;','let drainRate = 0.03;')
    s=s.replace('text: \'看！濾紙上留下的固體是沙子，流下去的液體是食鹽水。這就是過濾法！✨\'','text: \'看！濾紙上留下沙子，流下去的是食鹽水。再把水蒸發，就能讓食鹽重新出現。✨\'')
    s=s.replace("const mainBtn = document.getElementById('main-btn');","const mainBtn = document.getElementById('main-btn');\n        const replayStepBtn = document.getElementById('replay-step-btn');\n        const thinkingQuestionEl = document.getElementById('thinkingQuestion');\n        const finalResultCard = document.getElementById('finalResultCard');")
    s=s.replace('const data = stepsData[s]; titleEl.textContent = data.t; descEl.textContent = data.d;','const data = stepsData[s]; titleEl.textContent = data.t; descEl.textContent = data.d; thinkingQuestionEl.textContent = data.q || data.d; if(finalResultCard) finalResultCard.classList.toggle(\'show\',s===5);')
    s=s.replace('{ t: "步驟 2：加水溶解", d: "水柱準確注入燒杯中，準備溶解食鹽。", btn: "開始攪拌" }','{ t: "步驟 2：加水溶解", d: "水柱準確注入燒杯中，準備溶解食鹽。", btn: "開始攪拌", q:"加水後，哪一種物質溶進水裡？" }')
    s=s.replace("resetBtn.addEventListener('click', () => resetExperiment());","replayStepBtn.addEventListener('click',()=>{thinkingQuestionEl.textContent='重看提示：'+(stepsData[Math.min(step,5)].q||stepsData[Math.min(step,5)].d);});\n        resetBtn.addEventListener('click', () => resetExperiment());")
    w('05.html',s)

def page06():
    s=r('06.html')
    s=s.replace('橘咪咪 (Mimi)','橘咪咪：觀察小隊長').replace('白奶油 (Cream)','白奶油：問題發明家').replace('👨‍🏫 貓咪主人介紹','👨‍🏫 認識農場老師')
    s=s.replace('#貪吃鬼','#會發現問題').replace('#傲嬌任性','#愛提問')
    s=add_before(s,'    </style>','.cat-quote{margin-top:14px;padding:12px;border-radius:14px;background:#fff8e1;border:2px dashed #ffb74d;font-weight:bold;color:#5d4037;display:none}.char-card{cursor:pointer}.char-card.active .cat-quote{display:block}')
    s=s.replace('</p>\n                </div>\n            </article>','</p><div class="cat-quote">點我：我先觀察，再把發現告訴大家！</div>\n                </div>\n            </article>',1)
    s=s.replace('</p>\n                </div>\n            </article>','</p><div class="cat-quote">點我：我有一個問題！讓我們動手試試看！</div>\n                </div>\n            </article>',1)
    s=add_before(s,'    <script src="home-button.js"></script>',"<script>document.querySelectorAll('.char-card').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('active')));</script>")
    w('06.html',s)

def page07():
    s=r('07.html')
    s=add_before(s,'    </style>','.dashboard-07{position:fixed;top:18px;right:18px;z-index:40;display:grid;gap:8px;width:min(300px,calc(100vw - 36px))}.metric-card,.prediction-card,.conclusion-card{background:rgba(255,255,255,.94);border-radius:14px;padding:10px 14px;box-shadow:0 6px 16px rgba(0,0,0,.15);color:var(--text-color);font-weight:700}.metric-card span{color:#1565c0;font-size:1.2rem}.prediction-card button{margin:6px 6px 0 0;border:0;border-radius:999px;padding:6px 10px;color:#fff;background:#3498db;font-weight:700}.conclusion-card{display:none}.conclusion-card.show{display:block}.target-line.near{background-color:var(--warning-color)}.target-line.success{background-color:var(--success-color)}')
    s=add_after(s,'<body>','<aside class="dashboard-07"><div class="metric-card">現在空氣體積：<span id="volumeValue">0 mL</span></div><div class="metric-card">空氣擠得多不多：<span id="crowdingValue">鬆鬆的</span></div><div class="prediction-card">預測：把活塞往下壓時，空氣粒子會變得比較分散，還是比較擠？<br><button onclick="answerPrediction07(\'分散\')">比較分散</button><button onclick="answerPrediction07(\'擠\')">比較擠</button><div id="predictionFeedback07"></div></div><div class="conclusion-card" id="conclusion07">結論：空間變小時，空氣粒子會靠得更近、跑得更快。</div></aside>')
    s=s.replace('橡皮擦','橡皮塞')
    s=add_before(s,'        function varColor(name) {',"""        function updateDashboard07(){const v=Math.round(currentVol);document.getElementById('volumeValue').textContent=v+' mL';const c=document.getElementById('crowdingValue');c.textContent=isBlocked&&currentVol<12?'擠在一起':(isBlocked&&currentVol<18?'有點擠':'鬆鬆的');targetLine.classList.remove('near','success');const d=Math.abs(currentVol-20);if(d<=0.8)targetLine.classList.add('success');else if(d<=3)targetLine.classList.add('near');}
        function answerPrediction07(a){const f=document.getElementById('predictionFeedback07');f.textContent=a==='擠'?'✅ 沒錯！空間變小時，空氣粒子會比較擠。':'再想想：活塞往下壓，空氣的空間會變小喔。';}
""")
    s=s.replace('currentVol = vol;','currentVol = vol;\n            updateDashboard07();',1)
    s=s.replace('空氣彈回 20ml 了！證明','空氣彈回 20ml 了！結論：空間變小時，空氣粒子會靠得更近、跑得更快。證明')
    w('07.html',s)

def page08():
    s=r('08.html')
    s=add_before(s,'    </style>','.guided-card-08{position:fixed;left:14px;bottom:14px;z-index:60;width:min(390px,calc(100vw - 28px));background:rgba(255,255,255,.96);border:3px solid #fbbf24;border-radius:18px;padding:12px;box-shadow:0 10px 24px rgba(0,0,0,.18);font-family:"Microsoft JhengHei";color:#334155}.guided-card-08 h2{margin:0 0 6px;color:#b45309}.guided-card-08 ol{margin:0 0 6px 1.2em}.guided-card-08 .explain{background:#fffbeb;border-radius:12px;padding:8px;font-weight:700;color:#92400e}')
    s=add_after(s,'    <div id="root"></div>','<section class="guided-card-08"><h2>💡 跟著做模式</h2><ol><li>先把電池的＋端連到燈泡下面的小圓點。</li><li>再把燈泡旁邊的金屬螺紋連回電池－端。</li><li>打開電源，觀察燈泡是否亮起。</li></ol><div class="explain">成功亮燈的原因：電流走成一個完整的圈圈。</div></section>')
    s=s.replace('最多只能使用五顆燈泡喔！','最多只能使用五顆燈泡喔！每顆燈泡都要有自己的完整迴路才會亮。').replace('🔌 按住接點並拖曳來拉電線','🔌 先連電池＋端，再連燈泡下面的小圓點與金屬螺紋')
    s=s.replace('setErrorMsg(`電源已開啟！${successfulPathBulbs.size}顆燈泡發光。`);','setErrorMsg(`電路形成完整圈圈！${successfulPathBulbs.size} 顆燈泡發光。`);')
    w('08.html',s)

def page09():
    s=r('09.html')
    s=s.replace('橘咪咪與白奶油的實驗室 V13','酸鹼分類接接樂').replace('🐱 橘咪咪與白奶油的實驗室','🧪 酸鹼分類接接樂').replace('❤️ 生命: 3','🎯 挑戰機會: 3 次').replace('目標：100分 完美通關！','目標：完成酸性、鹼性、中性三個任務徽章！')
    s=s.replace('生命: ${hearts}','挑戰機會: ${this.state.lives} 次 ${hearts}')
    s=s.replace('🏆 分數: ${this.state.score} / ${this.state.targetScore}','🏅 任務徽章: ${Math.min(3, Math.floor(this.state.score/30))} / 3')
    s=add_before(s,'        <p style="color: #f1c40f;','        <div style="font-size:20px;color:#fff;line-height:1.8;background:rgba(0,0,0,.25);padding:12px 18px;border-radius:14px;">🏅 酸性小達人　🏅 鹼性小達人　🏅 中性小達人</div>')
    w('09.html',s)

def page10():
    s=r('10.html')
    s=s.replace('關於老師','老師的科學小屋')
    s=add_before(s,'    </style>','.promise-list{display:grid;gap:10px;margin:18px 0}.promise-item{background:#fff8e1;border-left:5px solid #ffb74d;border-radius:12px;padding:12px 14px;font-weight:700;color:#4e342e}details.teacher-surprise{margin-top:18px;background:#f1f8e9;border:2px dashed #8bc34a;border-radius:14px;padding:12px}details.teacher-surprise summary{cursor:pointer;font-weight:800;color:#33691e}.start-task-btn{display:inline-block;background:#ff8c42;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:800;box-shadow:0 4px 0 #c65f1c;margin-top:20px}')
    s=s.replace('</div>\n\n                    <p class="intro-text">','</div>\n\n<div class="promise-list"><div class="promise-item">🔍 我們會先觀察。</div><div class="promise-item">🧪 我們會自己動手做。</div><div class="promise-item">💡 我們會一起找答案。</div></div>\n\n                    <p class="intro-text">',1)
    s=s.replace('<div class="feature-box">','<details class="teacher-surprise"><summary>🎁 老師的小驚喜</summary><div class="feature-box">',1)
    s=add_before(s,'                    <div class="footer-nav">','</details><a class="start-task-btn" href="index.html">開始今天的科學任務</a>')
    w('10.html',s)

for fn in [page03,page04,page05,page06,page07,page08,page09,page10]:
    print('RUN', fn.__name__); fn()
for p in ['03.html','04.html','05.html','06.html','07.html','08.html','09.html','10.html']:
    assert '</html>' in r(p)
    print('updated',p)
