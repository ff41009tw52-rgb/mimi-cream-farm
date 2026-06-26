from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str) -> str:
    return (ROOT / name).read_text(encoding='utf-8')


def save(name: str, content: str) -> None:
    (ROOT / name).write_text(content, encoding='utf-8')


def must_replace(content: str, old: str, new: str, filename: str, count: int = 1) -> str:
    if old not in content:
        raise RuntimeError(f'{filename}: target text was not found: {old[:90]!r}')
    return content.replace(old, new, count)


def replace_section(content: str, start_marker: str, end_marker: str, replacement: str, filename: str) -> str:
    start = content.find(start_marker)
    if start < 0:
        raise RuntimeError(f'{filename}: missing start marker {start_marker!r}')
    end = content.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f'{filename}: missing end marker {end_marker!r}')
    return content[:start] + replacement + content[end:]


# 03 — Instruction guide is a normal-flow, closed-by-default details panel.
page03 = load('03.html')
old_css03 = '.mission-guide-03{position:fixed;right:18px;bottom:18px;z-index:80;width:min(360px,calc(100vw - 36px));background:rgba(255,255,255,.96);border:3px solid #38bdf8;border-radius:22px;box-shadow:0 12px 28px rgba(15,23,42,.22);padding:16px;color:#0f172a;font-family:"Microsoft JhengHei",sans-serif}.mission-guide-03 h2{margin:0 0 8px;color:#0369a1}.mission-guide-03 ol{margin:0 0 10px 1.2em;padding:0;line-height:1.6}.mission-guide-03 button{border:0;border-radius:999px;padding:6px 10px;margin:4px;background:#0284c7;color:white;font-weight:700}.mission-guide-03 table{width:100%;border-collapse:collapse;font-size:.9rem}.mission-guide-03 th,.mission-guide-03 td{border:1px solid #bae6fd;padding:5px;text-align:center}.mission-guide-03 th{background:#f0f9ff}.mission-guide-03 .conclusion{margin-top:10px;background:#ecfeff;padding:8px;border-radius:12px;font-weight:700;color:#155e75}@media(max-width:760px){.mission-guide-03{position:static;width:auto;margin:14px}}'
new_css03 = '''/* 教學提示採文件流排版；不以固定浮窗遮住實驗內容。 */
        .mission-guide-03 {
            position: static;
            width: min(100% - 32px, 1024px);
            margin: 0 auto 32px;
            background: rgba(255,255,255,.98);
            border: 3px solid #38bdf8;
            border-radius: 22px;
            box-shadow: 0 10px 24px rgba(15,23,42,.14);
            color: #0f172a;
            font-family: "Microsoft JhengHei", sans-serif;
        }
        .mission-guide-03 summary {
            cursor: pointer;
            list-style: none;
            padding: 14px 18px;
            color: #0369a1;
            font-size: 1.08rem;
            font-weight: 800;
        }
        .mission-guide-03 summary::-webkit-details-marker { display: none; }
        .mission-guide-03 summary::after { content: '＋'; float: right; font-size: 1.35rem; line-height: .9; }
        .mission-guide-03[open] summary { border-bottom: 1px solid #bae6fd; }
        .mission-guide-03[open] summary::after { content: '－'; }
        .mission-guide-03 .mission-guide-content { padding: 0 18px 18px; }
        .mission-guide-03 h2 { margin: 14px 0 8px; font-size: 1.22rem; color: #0369a1; }
        .mission-guide-03 ol { margin: 0 0 10px 1.2em; padding: 0; line-height: 1.65; }
        .mission-guide-03 button { border: 0; border-radius: 999px; padding: 7px 12px; margin: 5px 5px 0 0; background: #0284c7; color: white; font-weight: 700; cursor: pointer; }
        .mission-guide-03 table { width: 100%; border-collapse: collapse; font-size: .92rem; margin-top: 10px; }
        .mission-guide-03 th, .mission-guide-03 td { border: 1px solid #bae6fd; padding: 6px; text-align: center; }
        .mission-guide-03 th { background: #f0f9ff; }
        .mission-guide-03 .conclusion { margin-top: 12px; background: #ecfeff; padding: 10px; border-radius: 12px; font-weight: 700; color: #155e75; }
        @media (max-width: 760px) { .mission-guide-03 { width: calc(100% - 24px); margin-bottom: 22px; } }'''
page03 = must_replace(page03, old_css03, new_css03, '03.html')
old_guide03 = '<section class="mission-guide-03"><h2>🧭 電流磁效應任務</h2><ol><li>先觀察：沒有通電時，指南針會不會轉？</li><li>打開電源：觀察指南針偏轉。</li><li>反轉電流：比較偏轉方向。</li><li>移動導線位置：觀察導線在上方或下方的差異。</li></ol><strong>先猜猜看：</strong> 電流方向改變後，指南針會怎麼轉？<br><button data-predict="same">方向一樣</button><button data-predict="opposite">方向相反</button><div id="prediction-feedback-03"></div><table><thead><tr><th>操作</th><th>指南針變化</th></tr></thead><tbody><tr><td>通電</td><td>會偏轉</td></tr><tr><td>反轉電流</td><td>方向相反</td></tr><tr><td>移動導線</td><td>偏轉情形改變</td></tr></tbody></table><div class="conclusion">結論：通電的導線周圍會產生磁力，電流方向改變，指南針偏轉方向也會改變。</div></section>'
new_guide03 = '''<details class="mission-guide-03">
        <summary>🧭 打開電流磁效應任務提示</summary>
        <div class="mission-guide-content">
            <h2>電流磁效應任務</h2>
            <ol><li>先觀察：沒有通電時，指南針會不會轉？</li><li>打開電源：觀察指南針偏轉。</li><li>反轉電流：比較偏轉方向。</li><li>移動導線位置：觀察導線在上方或下方的差異。</li></ol>
            <strong>先猜猜看：</strong> 電流方向改變後，指南針會怎麼轉？<br>
            <button data-predict="same">方向一樣</button><button data-predict="opposite">方向相反</button><div id="prediction-feedback-03" aria-live="polite"></div>
            <table><thead><tr><th>操作</th><th>指南針變化</th></tr></thead><tbody><tr><td>通電</td><td>會偏轉</td></tr><tr><td>反轉電流</td><td>方向相反</td></tr><tr><td>移動導線</td><td>偏轉情形改變</td></tr></tbody></table>
            <div class="conclusion">結論：通電的導線周圍會產生磁力，電流方向改變，指南針偏轉方向也會改變。</div>
        </div>
    </details>'''
page03 = must_replace(page03, old_guide03, new_guide03, '03.html')
page03 = must_replace(page03, 'className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto"', 'className="min-h-screen px-4 pb-8 pt-24 md:px-8 md:pb-10 md:pt-24 max-w-5xl mx-auto"', '03.html')
save('03.html', page03)


# home-button.js — allow individual pages to choose right-side placement safely.
home = load('home-button.js')
home = must_replace(home, "  const homeUrl = new URL('index.html', document.baseURI);", "  const homeUrl = new URL('index.html', document.baseURI);\n  const homeOnRight = document.body?.dataset.farmHomePosition === 'right';", 'home-button.js')
home = must_replace(home, '        left: 16px;', "        ${homeOnRight ? 'right: 16px; left: auto;' : 'left: 16px; right: auto;'}", 'home-button.js')
home = must_replace(home, '          left: 10px;', "          ${homeOnRight ? 'right: 10px; left: auto;' : 'left: 10px; right: auto;'}", 'home-button.js')
save('home-button.js', home)


# 05 — move only this page's home button to the right; replay current step from a known start state.
page05 = load('05.html')
page05 = must_replace(page05, '<body>', '<body data-farm-home-position="right">', '05.html')
page05 = must_replace(page05, '.thinking-box{background:#fff8e1;border:2px dashed #ffb74d;padding:10px;border-radius:12px;margin:10px 0 14px;color:#5d4037}.final-result-card{position:absolute;top:20px;right:20px;max-width:300px;background:rgba(255,255,255,.95);border:3px solid #ffcc80;border-radius:16px;padding:12px;z-index:25;color:#4e342e;display:none}.final-result-card.show{display:block}#replay-step-btn{background:linear-gradient(135deg,#8bc34a,#689f38)}', '''.thinking-box{background:#fff8e1;border:2px dashed #ffb74d;padding:10px;border-radius:12px;margin:10px 0 14px;color:#5d4037}.final-result-card{position:absolute;top:20px;right:20px;max-width:300px;background:rgba(255,255,255,.95);border:3px solid #ffcc80;border-radius:16px;padding:12px;z-index:25;color:#4e342e;display:none}.final-result-card.show{display:block}#replay-step-btn{background:linear-gradient(135deg,#8bc34a,#689f38)}#replay-step-btn.replaying{animation:replayPulse .8s ease-in-out infinite alternate}@keyframes replayPulse{from{filter:brightness(1)}to{filter:brightness(1.17);transform:translateY(-1px)}}''', '05.html')
page05 = must_replace(page05, '        let autoStepTimer = null;\n        const MAX_BOTTOM_LEVEL = 90;', '        let autoStepTimer = null;\n        let replayTimer = null;\n        let sandSpawned = 0;\n        const MAX_BOTTOM_LEVEL = 90;', '05.html')
page05 = must_replace(page05, "            if (autoStepTimer) clearTimeout(autoStepTimer);\n            step = 0;", "            if (autoStepTimer) clearTimeout(autoStepTimer);\n            if (replayTimer) clearTimeout(replayTimer);\n            step = 0;\n            sandSpawned = 0;", '05.html')

old_pour05 = '''        function updateAndDrawPouringSystem(ctx) {
            let bottomIsFull = filterSetup.beakerBWaterLevel >= MAX_BOTTOM_LEVEL;
            let topIsAlmostEmpty = beakerA.waterVolume <= 0.5;

            if (step === 4 && beakerA.isPouring && !topIsAlmostEmpty && !bottomIsFull) {
                const spoutPos = getSpoutTipWorldPos(beakerA);
                let flowRate = 4; 

                for(let k=0; k < flowRate; k++) {
                    filterSetup.fallingParticles.push({
                        type: 'water',
                        x: spoutPos.x + (Math.random()-0.5)*3, 
                        y: spoutPos.y + (Math.random()-0.5)*3,
                        vx: -0.5 + (Math.random()-0.5)*0.5, 
                        vy: 1 + Math.random(),      
                        r: 2.5 + Math.random()*1.5,
                        life: 100
                    });
                }

                let sandLeft = beakerA.particles.some(p => p.type === 'sand' && p.alpha > 0);
                
                let shouldPourSand = filterSetup.beakerBWaterLevel < MAX_BOTTOM_LEVEL - 5;

                if (sandLeft && Math.random() < 0.9 && shouldPourSand) {
                    let count = Math.floor(Math.random() * 3) + 2; 
                    for(let i=0; i<count; i++) {
                        filterSetup.fallingParticles.push({
                            type: 'sand',
                            x: spoutPos.x + (Math.random()-0.5)*4, 
                            y: spoutPos.y + (Math.random()-0.5)*4,
                            vx: -0.2 + (Math.random()-0.5)*0.5, 
                            vy: 1.5 + Math.random(),
                            r: 3.5, 
                            life: 100
                        });
                    }
                }
            }

            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const sieveX = filterSetup.x;
            const sieveStartIdxX = sieveX - filterSetup.sieveRadius;
            
            for (let i = filterSetup.fallingParticles.length - 1; i >= 0; i--) {
                let p = filterSetup.fallingParticles[i];
                p.vx *= 0.98; p.vy += 0.25; 
                p.x += p.vx; p.y += p.vy;
                
                ctx.beginPath();
                ctx.fillStyle = (p.type === 'water') ? WATER_COLOR : SAND_COLOR;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();

                if (p.y >= sieveY) {
                    if (Math.abs(p.x - sieveX) < filterSetup.sieveRadius) {
                        if (p.type === 'water') {
                            filterSetup.beakerBWaterLevel += 0.2; 
                            if (filterSetup.beakerBWaterLevel > MAX_BOTTOM_LEVEL) {
                                filterSetup.beakerBWaterLevel = MAX_BOTTOM_LEVEL;
                            }
                            filterSetup.fallingParticles.splice(i, 1);
                        } else {
                            let relativeX = p.x - sieveStartIdxX;
                            let distFromCenter = p.x - sieveX;
                            if (Math.abs(distFromCenter) > 20) {
                                relativeX -= Math.sign(distFromCenter) * 15; 
                            }
                            
                            let idx = Math.floor(relativeX);
                            if (idx >= 10 && idx < filterSetup.pileHeights.length - 10) { 
                                filterSetup.pileHeights[idx] += 3.0; 
                            }
                            filterSetup.fallingParticles.splice(i, 1);
                        }
                    } else if (p.y > canvas.height) {
                        filterSetup.fallingParticles.splice(i, 1);
                    }
                }
            }
            smoothSandPile();
        }'''
new_pour05 = '''        function updateAndDrawPouringSystem(ctx) {
            const bottomIsFull = filterSetup.beakerBWaterLevel >= MAX_BOTTOM_LEVEL;
            const topIsAlmostEmpty = beakerA.waterVolume <= 0.5;
            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const sieveX = filterSetup.x;
            const sieveStartIdxX = sieveX - filterSetup.sieveRadius;

            const createStreamParticle = (type) => {
                const spoutPos = getSpoutTipWorldPos(beakerA);
                const targetX = sieveX + (Math.random() - 0.5) * (type === 'sand' ? 32 : 22);
                const targetY = sieveY - 4;
                const flightFrames = type === 'sand' ? 28 + Math.random() * 7 : 24 + Math.random() * 6;
                const gravity = 0.24;
                return {
                    type,
                    x: spoutPos.x + (Math.random() - 0.5) * 3,
                    y: spoutPos.y + (Math.random() - 0.5) * 3,
                    vx: (targetX - spoutPos.x) / flightFrames,
                    vy: (targetY - spoutPos.y - 0.5 * gravity * flightFrames * flightFrames) / flightFrames,
                    r: type === 'sand' ? 3.1 + Math.random() * 0.6 : 2.3 + Math.random() * 1.2,
                    life: 100
                };
            };

            if (step === 4 && beakerA.isPouring && !topIsAlmostEmpty && !bottomIsFull) {
                for (let k = 0; k < 3; k++) filterSetup.fallingParticles.push(createStreamParticle('water'));
                const sandLeft = beakerA.particles.some(p => p.type === 'sand' && p.alpha > 0);
                if (sandLeft && filterSetup.beakerBWaterLevel < MAX_BOTTOM_LEVEL - 5) {
                    const sandCount = Math.random() < 0.72 ? 2 : 1;
                    for (let i = 0; i < sandCount; i++) {
                        filterSetup.fallingParticles.push(createStreamParticle('sand'));
                        sandSpawned++;
                    }
                }
            }

            for (let i = filterSetup.fallingParticles.length - 1; i >= 0; i--) {
                const p = filterSetup.fallingParticles[i];
                p.vx *= 0.995;
                p.vy += 0.24;
                p.x += p.vx;
                p.y += p.vy;

                ctx.beginPath();
                ctx.fillStyle = p.type === 'water' ? WATER_COLOR : SAND_COLOR;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();

                if (p.y >= sieveY) {
                    if (Math.abs(p.x - sieveX) < filterSetup.sieveRadius) {
                        if (p.type === 'water') {
                            filterSetup.beakerBWaterLevel = Math.min(MAX_BOTTOM_LEVEL, filterSetup.beakerBWaterLevel + 0.24);
                            filterSetup.fallingParticles.splice(i, 1);
                        } else {
                            let relativeX = p.x - sieveStartIdxX;
                            const distFromCenter = p.x - sieveX;
                            if (Math.abs(distFromCenter) > 20) relativeX -= Math.sign(distFromCenter) * 12;
                            const idx = Math.floor(relativeX);
                            if (idx >= 10 && idx < filterSetup.pileHeights.length - 10) filterSetup.pileHeights[idx] += 1.65;
                            filterSetup.fallingParticles.splice(i, 1);
                        }
                    } else if (p.y > canvas.height + 30) {
                        filterSetup.fallingParticles.splice(i, 1);
                    }
                }
            }
            smoothSandPile();
        }'''
page05 = must_replace(page05, old_pour05, new_pour05, '05.html')
page05 = must_replace(page05, "                if (beakerA.angle > targetAngle) beakerA.angle -= 0.004;", "                if (beakerA.angle > targetAngle) beakerA.angle -= 0.016;", '05.html')
page05 = must_replace(page05, "                    let drainRate = 0.03;\n                    if (drainRate < 0.005) drainRate = 0.005;", "                    let drainRate = 0.12;", '05.html')
page05 = must_replace(page05, "if (step === 4) { mainBtn.disabled = true; autoStepTimer = setTimeout(() => { step = 5; updateUI(5); autoStepTimer = null; }, 25000); }", "if (step === 4) { mainBtn.disabled = true; autoStepTimer = setTimeout(() => { if (step === 4) { step = 5; updateUI(5); } autoStepTimer = null; }, 16000); }", '05.html')

replay05 = '''        function prepareReplayStep(targetStep) {
            if (autoStepTimer) clearTimeout(autoStepTimer);
            if (replayTimer) clearTimeout(replayTimer);
            resetExperiment();
            step = targetStep;
            mainBtn.disabled = false;

            if (targetStep >= 2) {
                beakerA.waterVolume = beakerA.maxVolume;
                jug.visible = false;
                jug.flow = false;
                jug.flowDone = true;
                jug.returned = true;
            }
            if (targetStep >= 3) {
                beakerA.particles.forEach(p => { if (p.type === 'salt') p.alpha = 0; });
            }
            if (targetStep >= 4) {
                filterSetup.visible = true;
                filterSetup.x = width * 0.5;
                filterSetup.y = height * 0.65;
                beakerA.x = filterSetup.x + 105;
                beakerA.y = height * 0.65 - 350;
                beakerA.angle = 0;
                filterSetup.beakerBWaterLevel = 0;
                filterSetup.trappedSand = [];
                filterSetup.fallingParticles = [];
                filterSetup.pileHeights.fill(0);
                sandSpawned = 0;
            }

            updateUI(targetStep);
            if (targetStep === 1 || targetStep === 2 || targetStep === 4) {
                mainBtn.disabled = true;
                replayTimer = setTimeout(() => {
                    if (step === targetStep) mainBtn.disabled = false;
                    replayTimer = null;
                }, targetStep === 4 ? 4500 : 1800);
            }
        }

        function replayCurrentStep() {
            const targetStep = step === 5 ? 4 : step;
            replayStepBtn.disabled = true;
            replayStepBtn.classList.add('replaying');
            replayStepBtn.textContent = targetStep === 4 ? '重播過濾中…' : '重播中…';
            prepareReplayStep(targetStep);
            setTimeout(() => {
                replayStepBtn.disabled = false;
                replayStepBtn.classList.remove('replaying');
                replayStepBtn.textContent = '重看這一步';
            }, 650);
        }

        if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
            window.__prepareReplay05 = prepareReplayStep;
            window.__getSandLabState05 = () => ({
                step,
                waterVolume: beakerA.waterVolume,
                beakerAngle: beakerA.angle,
                fallingSand: filterSetup.fallingParticles.filter(p => p.type === 'sand').length,
                sandSpawned,
                homeOnRight: document.body.dataset.farmHomePosition === 'right'
            });
        }

'''
page05 = must_replace(page05, "        mainBtn.addEventListener('click', () => {", replay05 + "        mainBtn.addEventListener('click', () => {", '05.html')
page05 = must_replace(page05, "        replayStepBtn.addEventListener('click',()=>{thinkingQuestionEl.textContent='重看提示：'+(stepsData[Math.min(step,5)].q||stepsData[Math.min(step,5)].d);});", "        replayStepBtn.addEventListener('click', replayCurrentStep);", '05.html')
save('05.html', page05)


# 07 — lock the plunger exactly at 20 mL during step 2.
page07 = load('07.html')
page07 = must_replace(page07, ".plunger-group:active {\n            cursor: grabbing;\n        }", ".plunger-group:active {\n            cursor: grabbing;\n        }\n        .plunger-group.locked {\n            cursor: not-allowed;\n            filter: saturate(.75);\n        }\n        .plunger-group.locked::after {\n            content: '固定在 20 mL';\n            position: absolute;\n            left: 50%;\n            bottom: -30px;\n            transform: translateX(-50%);\n            white-space: nowrap;\n            padding: 4px 8px;\n            border-radius: 999px;\n            background: #fff3cd;\n            color: #8a5700;\n            font-size: 12px;\n            font-weight: 700;\n            box-shadow: 0 2px 6px rgba(0,0,0,.12);\n        }", '07.html')
page07 = must_replace(page07, "        function setMission(s) {\n            step = s;", "        function setMission(s) {\n            step = s;\n            plunger.classList.toggle('locked', s === 2);", '07.html')
page07 = must_replace(page07, "            else if (s === 2) {\n                missionTitle.innerText = \"步驟 2：堵住出口\";", "            else if (s === 2) {\n                updatePlungerPos(20);\n                missionTitle.innerText = \"步驟 2：堵住出口\";", '07.html')
page07 = must_replace(page07, "        function startDrag(e) {\n            if(step === 4 || step === 5) return;", "        function startDrag(e) {\n            // 步驟 2 要先固定 20 mL 並安裝橡皮塞，不能再拖動活塞。\n            if (step === 2) return;\n            if(step === 4 || step === 5) return;", '07.html')
page07 = must_replace(page07, "        init();", "        if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {\n            window.__setMission07 = setMission;\n            window.__updatePlungerPos07 = updatePlungerPos;\n        }\n\n        init();", '07.html')
save('07.html', page07)

print('Patched 03, 05, 07 and page-specific home-button position.')
