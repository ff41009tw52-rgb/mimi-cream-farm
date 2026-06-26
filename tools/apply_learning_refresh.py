from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFRESH_TAG = '<script src="learning-refresh.js"></script>'
TARGETS = [f'{number:02d}.html' for number in range(3, 11)]


def fail(message: str) -> None:
    raise SystemExit(message)


def read(name: str) -> str:
    path = ROOT / name
    if not path.exists():
        fail(f'Missing {name}')
    return path.read_text(encoding='utf-8')


def write(name: str, content: str) -> None:
    (ROOT / name).write_text(content, encoding='utf-8')


def replace_once(content: str, old: str, new: str, label: str) -> str:
    if old not in content:
        fail(f'Could not find expected text for {label}')
    return content.replace(old, new, 1)


def regex_once(content: str, pattern: str, replacement: str, label: str, flags: int = re.S | re.M) -> str:
    result, count = re.subn(pattern, replacement, content, count=1, flags=flags)
    if count != 1:
        fail(f'Could not patch {label}; replacements={count}')
    return result


def add_refresh_tag(content: str, name: str) -> str:
    content = re.sub(r'\s*<script\s+src=["\']learning-refresh\.js["\']\s*></script>', '', content, flags=re.I)
    marker = '<script src="home-button.js"></script>'
    if marker in content:
        return content.replace(marker, f'{REFRESH_TAG}\n    {marker}', 1)
    if '</body>' not in content:
        fail(f'Could not insert learning refresh script in {name}')
    return content.replace('</body>', f'    {REFRESH_TAG}\n</body>', 1)


# 04: simplify liquids to four familiar choices and let the shared script add record table / tap support.
page04 = read('04.html')
page04 = regex_once(
    page04,
    r"        const solutions = \[.*?\n        \];",
    """        const solutions = [
            { name: '檸檬汁', id: 'lemon', type: 'acid', originalColor: 'rgba(255, 245, 230, 0.2)' },
            { name: '食鹽水', id: 'salt', type: 'neutral', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '小蘇打水', id: 'soda', type: 'base', originalColor: 'rgba(255, 255, 255, 0.15)' },
            { name: '清水', id: 'water', type: 'neutral', originalColor: 'rgba(220, 240, 255, 0.18)' }
        ];""",
    '04 solution list',
)
page04 = add_refresh_tag(page04, '04.html')
write('04.html', page04)

# 05: correct story wording and make sand transfer less abrupt while the shared script adds thinking prompts/results.
page05 = read('05.html')
page05 = replace_once(
    page05,
    '這杯子裡黑黑白白的是什麼？是黑糖粉和白糖粉嗎？能不能讓我舔一口？🤤',
    '這杯子裡黑黑白白的是什麼？是沙子和食鹽嗎？我們可以把它們分開嗎？🔎',
    '05 opening dialogue',
)
page05 = replace_once(
    page05,
    '看！濾紙上留下的固體是沙子，流下去的液體是食鹽水。這就是過濾法！✨',
    '看！濾紙上留下的是沙子，流下去的是食鹽水。想拿回食鹽，下一步還要讓水慢慢蒸發喔！✨',
    '05 completion dialogue',
)
page05 = replace_once(
    page05,
    'if (Math.random() < 0.3) { p.x -= 2; p.y -= 1; }',
    """const flowSpeed = p.type === 'sand' ? 1.35 : 0.8;
                            p.x -= flowSpeed + Math.random() * 0.35;
                            p.y -= p.type === 'sand' ? 0.55 + Math.random() * 0.25 : 0.2;""",
    '05 smoother source-particle flow',
)
page05 = replace_once(
    page05,
    "if (p.type === 'sand' && Math.random() < 0.15) p.alpha = 0;",
    "if (p.type === 'sand') p.alpha = Math.max(0, p.alpha - 0.018);",
    '05 gradual sand exit',
)
page05 = replace_once(
    page05,
    'const threshold = 1.0; const transferRate = 0.4;',
    'const threshold = 0.55; const transferRate = 0.18;',
    '05 smoother pile threshold',
)
page05 = replace_once(
    page05,
    'for (let pass = 0; pass < 2; pass++) {',
    'for (let pass = 0; pass < 5; pass++) {',
    '05 smoother pile passes',
)
page05 = replace_once(
    page05,
    'let flowRate = 2;',
    'let flowRate = 3;',
    '05 water flow rate',
)
page05 = replace_once(
    page05,
    "if (sandLeft && Math.random() < 0.9 && shouldPourSand) {\n                    let count = Math.floor(Math.random() * 3) + 2;",
    "if (sandLeft && shouldPourSand) {\n                    let count = Math.random() < 0.62 ? 1 : 2;",
    '05 controlled sand emission',
)
page05 = replace_once(
    page05,
    'filterSetup.pileHeights[idx] += 3.0;',
    'filterSetup.pileHeights[idx] += 1.75;',
    '05 smoother sand pile growth',
)
page05 = add_refresh_tag(page05, '05.html')
write('05.html', page05)

# 07: expose the existing simulation state to the shared display without changing the mechanics.
page07 = read('07.html')
page07 = replace_once(
    page07,
    '        init();\n    </script>',
    """        window.getAirLabState = () => ({
            volume: currentVol,
            isBlocked,
            step
        });
        init();
    </script>""",
    '07 state bridge',
)
page07 = add_refresh_tag(page07, '07.html')
write('07.html', page07)

# 08: replace the path algorithm so a bulb lights only when its two contacts bridge the same battery positive/negative terminals.
page08 = read('08.html')
new_run_simulation = """            const runSimulation = () => {
                setErrorMsg('');
                setLitBulbIds(new Set());
                setBrightness(0);

                const batteries = components.filter(c => c.type === COMPONENT_TYPES.BATTERY);
                const bulbs = components.filter(c => c.type === COMPONENT_TYPES.BULB);
                if (batteries.length === 0) {
                    setErrorMsg('需要電池才能供電！');
                    setIsSwitchOn(false);
                    return;
                }
                if (bulbs.length === 0) {
                    setErrorMsg('請先放入並連接至少一顆燈泡。');
                    setIsSwitchOn(false);
                    return;
                }

                // Wires are the external conductors. A bulb becomes a conductor only when we test a path through another bulb.
                const wireGraph = new Map();
                const addNode = (node) => {
                    if (!wireGraph.has(node)) wireGraph.set(node, new Set());
                };
                const addWire = (a, b) => {
                    addNode(a); addNode(b);
                    wireGraph.get(a).add(b);
                    wireGraph.get(b).add(a);
                };

                components.forEach(component => {
                    if (component.type === COMPONENT_TYPES.BATTERY) {
                        addNode(`${component.id}:pos`);
                        addNode(`${component.id}:neg`);
                    } else {
                        addNode(`${component.id}:tip`);
                        addNode(`${component.id}:thread`);
                    }
                });
                wires.forEach(wire => addWire(
                    `${wire.start.compId}:${wire.start.pointType}`,
                    `${wire.end.compId}:${wire.end.pointType}`
                ));

                const firstBattery = batteries[0];
                const sourcePos = `${firstBattery.id}:pos`;
                const sourceNeg = `${firstBattery.id}:neg`;

                const hasPath = (start, target, excludedBulbId = null, wireOnly = false) => {
                    const queue = [start];
                    const visited = new Set([start]);
                    while (queue.length) {
                        const current = queue.shift();
                        if (current === target) return true;
                        const nextNodes = new Set(wireGraph.get(current) || []);
                        if (!wireOnly) {
                            const [componentId, terminal] = current.split(':');
                            const component = components.find(item => item.id === componentId);
                            if (component?.type === COMPONENT_TYPES.BULB && component.id !== excludedBulbId) {
                                nextNodes.add(`${componentId}:${terminal === 'tip' ? 'thread' : 'tip'}`);
                            }
                        }
                        nextNodes.forEach(next => {
                            if (!visited.has(next)) {
                                visited.add(next);
                                queue.push(next);
                            }
                        });
                    }
                    return false;
                };

                // A direct wire-only path from + to - is a short circuit; do not light any bulb in that case.
                if (hasPath(sourcePos, sourceNeg, null, true)) {
                    setErrorMsg('電池正、負極直接相連，這是短路。請讓電流先通過燈泡！');
                    setIsSwitchOn(false);
                    return;
                }

                const lit = new Set();
                bulbs.forEach(bulb => {
                    const tip = `${bulb.id}:tip`;
                    const thread = `${bulb.id}:thread`;
                    const tipToPositive = hasPath(tip, sourcePos, bulb.id);
                    const tipToNegative = hasPath(tip, sourceNeg, bulb.id);
                    const threadToPositive = hasPath(thread, sourcePos, bulb.id);
                    const threadToNegative = hasPath(thread, sourceNeg, bulb.id);
                    if ((tipToPositive && threadToNegative) || (tipToNegative && threadToPositive)) {
                        lit.add(bulb.id);
                    }
                });

                if (lit.size > 0) {
                    setLitBulbIds(lit);
                    setBrightness(1);
                    const extraBatteryNote = batteries.length > 1 ? ' 目前以第一顆電池作為電源判斷。' : '';
                    setErrorMsg(`電流形成完整迴路！${lit.size}顆燈泡發亮。${extraBatteryNote}`);
                } else {
                    setErrorMsg('電源已開啟，但燈泡的兩個接點還沒有分別連到電池正、負極。');
                }
            };

"""
page08 = regex_once(
    page08,
    r"            const runSimulation = \(\) => \{.*?^            \};\n\n(?=            return \()",
    new_run_simulation,
    '08 circuit algorithm',
)
page08 = replace_once(
    page08,
    '                            <button onClick={resetBoard}',
    """                            <button onClick={() => {
                                if (isSwitchOn) togglePower();
                                setWires(previous => previous.slice(0, -1));
                                setLitBulbIds(new Set());
                                setErrorMsg('已復原上一條電線。');
                            }} className="flex items-center gap-1 px-4 py-2 bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition font-bold">↶ 上一步</button>
                            <button onClick={resetBoard}""",
    '08 undo button',
)
page08 = add_refresh_tag(page08, '08.html')
write('08.html', page08)

# 09: change from a 100-point game into three classification badges and student-friendly challenge chances.
page09 = read('09.html')
page09 = replace_once(page09, '<title>橘咪咪與白奶油的實驗室 V13</title>', '<title>酸鹼分類接接樂</title>', '09 page title')
page09 = replace_once(page09, '<h1>🐱 橘咪咪與白奶油的實驗室</h1>', '<h1>🧪 白奶油博士的溶液分類任務</h1>', '09 start title')
page09 = replace_once(page09, '<div class="stat-box" id="score-display">🏆 分數: 0 / 100</div>', '<div class="stat-box" id="score-display">🏅 任務徽章：0 / 3</div>', '09 badge display')
page09 = replace_once(page09, '<div class="stat-box" id="lives-display">❤️ 生命: 3</div>', '<div class="stat-box" id="lives-display">🧪 挑戰機會：3 次</div>', '09 chances display')
page09 = replace_once(page09, '<p style="color: #f1c40f; font-weight: bold; font-size: 22px;">目標：100分 完美通關！</p>', '<p style="color: #f1c40f; font-weight: bold; font-size: 22px;">目標：完成酸性、鹼性、中性三枚任務徽章！</p>', '09 start goal')
page09 = replace_once(page09, '<div style="margin-top: 15px; font-size: 20px; color: #fff;">本次得分</div>', '<div style="margin-top: 15px; font-size: 20px; color: #fff;">獲得徽章</div>', '09 result label')
page09 = replace_once(page09, 'targetScore: 100 // 修改：目標分數改為 100', "badges: { acid: false, base: false, neutral: false }", '09 badge state')
page09 = replace_once(
    page09,
    """        this.state.score = 0;
        this.state.lives = 3;""",
    """        this.state.score = 0;
        this.state.badges = { acid: false, base: false, neutral: false };
        this.state.lives = 3;""",
    '09 reset badges',
)
page09 = regex_once(
    page09,
    r"    changeMission: function\(\) \{.*?^    \},\n\n    spawnItem:",
    """    changeMission: function() {
        const availableMissions = this.missions.filter(mission => !this.state.badges[mission.type]);
        if (availableMissions.length === 0) {
            this.showResult(true, 'badges');
            return;
        }
        let newMission;
        do {
            newMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
        } while (availableMissions.length > 1 && this.state.currentMission && newMission.type === this.state.currentMission.type);

        this.state.currentMission = newMission;
        this.state.missionItemsCollected = 0;
        this.state.currentMissionTarget = 2;

        const missionEl = document.getElementById('current-mission');
        const textEl = document.getElementById('mission-text');
        textEl.textContent = newMission.text;
        missionEl.style.backgroundColor = newMission.color;
        missionEl.style.borderColor = newMission.borderColor;
        missionEl.style.transform = 'scale(1.15)';
        setTimeout(() => missionEl.style.transform = 'scale(1)', 250);
    },

    spawnItem:""",
    '09 mission rotation',
)
page09 = replace_once(
    page09,
    """        if (isCorrect) {
            this.state.score += 10;
            this.state.missionItemsCollected++;
            this.showFloatingText("+10", "#2ecc71", this.player.x);
            
            if (this.state.score >= this.state.targetScore) {
                this.showResult(true, "pass");
                return;
            }

            if (this.state.missionItemsCollected >= this.state.currentMissionTarget) {
                 this.changeMission();
            }

        } else {""",
    """        if (isCorrect) {
            this.state.missionItemsCollected++;
            this.showFloatingText('✓ 正確', '#2ecc71', this.player.x);

            if (this.state.missionItemsCollected >= this.state.currentMissionTarget) {
                const completedType = this.state.currentMission.type;
                this.state.badges[completedType] = true;
                const labels = { acid: '酸性小達人', base: '鹼性小達人', neutral: '中性小達人' };
                this.showFloatingText(`🏅 ${labels[completedType]}`, '#f1c40f', this.player.x);
                if (Object.values(this.state.badges).every(Boolean)) {
                    this.showResult(true, 'badges');
                    return;
                }
                this.changeMission();
            }

        } else {""",
    '09 correct collection flow',
)
page09 = replace_once(page09, 'this.showFloatingText("-1 ❤️", "#e74c3c", this.player.x);', "this.showFloatingText('-1 次', '#e74c3c', this.player.x);", '09 error wording')
page09 = regex_once(
    page09,
    r"    showResult: function\(isWin, type\) \{.*?^    \},\n\n    updateUI:",
    """    showResult: function(isWin, type) {
        this.state.isPlaying = false;
        const titleEl = document.getElementById('result-title');
        const msgEl = document.getElementById('result-msg');
        const scoreEl = document.getElementById('final-score');
        const screen = document.getElementById('result-screen');
        const earned = Object.values(this.state.badges).filter(Boolean).length;
        scoreEl.textContent = `${earned} / 3`;
        screen.classList.remove('hidden');

        if (isWin) {
            titleEl.textContent = '🎉 三枚徽章完成！';
            titleEl.style.color = '#2ecc71';
            msgEl.innerHTML = '<span style="color:#f1c40f">白奶油博士：</span>「你已經能分辨酸性、鹼性和中性溶液了！」<br><br><span style="color:#e67e22">橘咪咪：</span>「酸性小達人、鹼性小達人、中性小達人，全都被你收下了！」';
        } else {
            titleEl.textContent = '再試一次！';
            titleEl.style.color = '#e74c3c';
            msgEl.innerHTML = '<span style="color:#e67e22">橘咪咪：</span>「別急，我們先看清楚這次要收集的是哪一種溶液。」<br><br><span style="color:#f1c40f">白奶油博士：</span>「記住：檸檬汁和醋是酸性，小蘇打是鹼性，食鹽水和糖水是中性。」';
        }
    },

    updateUI:""",
    '09 result panel',
)
page09 = regex_once(
    page09,
    r"    updateUI: function\(\) \{.*?^    \},\n\n    showFloatingText:",
    """    updateUI: function() {
        const badgeLabels = [
            ['acid', '酸性小達人'],
            ['base', '鹼性小達人'],
            ['neutral', '中性小達人']
        ];
        const earned = badgeLabels.filter(([type]) => this.state.badges[type]).length;
        const badgeText = badgeLabels.map(([type, label]) => this.state.badges[type] ? `🏅 ${label}` : `○ ${label}`).join('  ');
        document.getElementById('score-display').textContent = `🏅 任務徽章：${earned} / 3`;
        document.getElementById('score-display').title = badgeText;
        document.getElementById('lives-display').textContent = `🧪 挑戰機會：${this.state.lives} 次`;
    },

    showFloatingText:""",
    '09 UI badges',
)
page09 = add_refresh_tag(page09, '09.html')
write('09.html', page09)

# 03, 06 and 10 receive their learning/identity refinements via the shared script.
for filename in ('03.html', '06.html', '10.html'):
    content = add_refresh_tag(read(filename), filename)
    write(filename, content)

# 10 text is intentionally short and student-facing; the shared script turns the existing feature box into a foldable surprise area.
page10 = read('10.html')
page10 = replace_once(page10, '<title>關於老師 - 橘咪咪與白奶油的科學農場</title>', '<title>老師的科學小屋 - 橘咪咪與白奶油的科學農場</title>', '10 page title')
page10 = replace_once(page10, '<h1>🔬 橘咪咪與白奶油的科學農場</h1>', '<h1>🔬 老師的科學小屋</h1>', '10 header title')
page10 = replace_once(page10, '<h2>冠瑋老師的觀察日記</h2>', '<h2>老師的科學小屋</h2>', '10 board title')
page10 = replace_once(page10, '<a href="index.html" class="btn-home">⬅ 回到農場首頁</a>', '<a href="index.html" class="btn-home">🚀 開始今天的科學任務</a>', '10 task button')
write('10.html', page10)

# Ensure all eight pages point to the shared enhancement file exactly once.
for filename in TARGETS:
    content = read(filename)
    if content.count(REFRESH_TAG) != 1:
        fail(f'{filename} does not contain exactly one learning refresh script tag')

print('Learning refresh patches applied to 03.html through 10.html.')
