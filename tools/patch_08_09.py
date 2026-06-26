from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str) -> str:
    return (ROOT / name).read_text(encoding='utf-8')


def save(name: str, content: str) -> None:
    (ROOT / name).write_text(content, encoding='utf-8')


def replace_section(content: str, start_marker: str, end_marker: str, replacement: str, filename: str) -> str:
    start = content.find(start_marker)
    if start < 0:
        raise RuntimeError(f'{filename}: missing start marker {start_marker!r}')
    end = content.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f'{filename}: missing end marker {end_marker!r}')
    return content[:start] + replacement + content[end:]


# 08.html — evaluate each bulb as an open component so a newly added,
# unconnected bulb cannot borrow another bulb's completed circuit.
page08 = load('08.html')
logic08 = '''// --- 核心邏輯 ---
            const evaluateCircuit = (currentComponents, currentWires) => {
                const node = (componentId, terminal) => `${componentId}:${terminal}`;
                const batteries = currentComponents.filter(component => component.type === COMPONENT_TYPES.BATTERY);
                const bulbs = currentComponents.filter(component => component.type === COMPONENT_TYPES.BULB);

                const buildGraph = ({ openBulbId = null, includeBulbConnections = true } = {}) => {
                    const graph = {};
                    const addNode = (key) => { if (!graph[key]) graph[key] = []; };
                    const connect = (left, right) => {
                        addNode(left);
                        addNode(right);
                        graph[left].push(right);
                        graph[right].push(left);
                    };

                    currentComponents.forEach(component => {
                        if (component.type === COMPONENT_TYPES.BATTERY) {
                            addNode(node(component.id, 'pos'));
                            addNode(node(component.id, 'neg'));
                        } else {
                            addNode(node(component.id, 'thread'));
                            addNode(node(component.id, 'tip'));
                        }
                    });

                    currentWires.forEach(wire => {
                        connect(
                            node(wire.start.compId, wire.start.pointType),
                            node(wire.end.compId, wire.end.pointType)
                        );
                    });

                    if (includeBulbConnections) {
                        bulbs
                            .filter(bulb => bulb.id !== openBulbId)
                            .forEach(bulb => connect(node(bulb.id, 'thread'), node(bulb.id, 'tip')));
                    }
                    return graph;
                };

                const reachable = (graph, startNode) => {
                    const seen = new Set([startNode]);
                    const queue = [startNode];
                    while (queue.length) {
                        const current = queue.shift();
                        (graph[current] || []).forEach(next => {
                            if (!seen.has(next)) {
                                seen.add(next);
                                queue.push(next);
                            }
                        });
                    }
                    return seen;
                };

                const wireOnlyGraph = buildGraph({ includeBulbConnections: false });
                const directShort = batteries.some(battery =>
                    reachable(wireOnlyGraph, node(battery.id, 'pos')).has(node(battery.id, 'neg'))
                );

                // A direct wire short circuit takes priority over lighting bulbs.
                if (directShort) {
                    return { litBulbIds: new Set(), directShort: true };
                }

                const litBulbIds = new Set();
                batteries.forEach(battery => {
                    bulbs.forEach(bulb => {
                        // Keep the tested bulb open. Its two terminals must be reached from
                        // opposite battery terminals through the rest of the circuit.
                        const graph = buildGraph({ openBulbId: bulb.id });
                        const fromPositive = reachable(graph, node(battery.id, 'pos'));
                        const fromNegative = reachable(graph, node(battery.id, 'neg'));
                        const thread = node(bulb.id, 'thread');
                        const tip = node(bulb.id, 'tip');
                        const completesCircuit =
                            (fromPositive.has(thread) && fromNegative.has(tip)) ||
                            (fromPositive.has(tip) && fromNegative.has(thread));
                        if (completesCircuit) litBulbIds.add(bulb.id);
                    });
                });

                return { litBulbIds, directShort: false };
            };

            // Available only on local test servers; it is used by automated circuit cases.
            if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
                window.__evaluateCircuit08 = evaluateCircuit;
            }

            const runSimulation = () => {
                setErrorMsg('');
                setLitBulbIds(new Set());
                setBrightness(0);

                const result = evaluateCircuit(components, wires);
                const batteryCount = components.filter(component => component.type === COMPONENT_TYPES.BATTERY).length;

                if (batteryCount === 0) {
                    setErrorMsg('需要電池才能供電！');
                    setIsSwitchOn(false);
                    return;
                }

                if (result.directShort) {
                    setErrorMsg('電池正負極被電線直接連起來了，請讓電流先經過燈泡。');
                    return;
                }

                if (result.litBulbIds.size > 0) {
                    setLitBulbIds(result.litBulbIds);
                    setBrightness(batteryCount >= 2 ? 2 : 1);
                    setErrorMsg(`電路形成完整圈圈！${result.litBulbIds.size} 顆燈泡發光。`);
                } else {
                    setErrorMsg('電源已開啟，但每一顆燈泡都還沒有形成完整迴路。');
                }
            };

            '''
page08 = replace_section(page08, '// --- 核心邏輯 ---', 'return (', logic08, '08.html')
save('08.html', page08)


# 09.html — award a badge only after two correct catches for that category.
page09 = load('09.html')
page09 = page09.replace('🏆 分數: 0 / 100', '🏅 任務徽章: 0 / 3', 1)
page09 = page09.replace(
    '        this.state.completedBadges = new Set();\n        \n        this.changeMission();',
    '        this.state.completedBadges = new Set();\n        this.state.currentMission = null;\n        \n        this.changeMission();',
    1,
)
page09 = page09.replace(
    "        // 調整難度曲線，因為滿分變成100，所以稍微提早一點點加速\n        let spawnRate = 60;\n        if (this.state.score > 20) spawnRate = 50; \n        if (this.state.score > 60) spawnRate = 45; ",
    "        // 每獲得一枚徽章，掉落速度稍微加快。\n        let spawnRate = 60;\n        if (this.state.completedBadges.size >= 1) spawnRate = 52;\n        if (this.state.completedBadges.size >= 2) spawnRate = 46;",
    1,
)

badge_css = '''
        #badge-tracker {
            position: absolute;
            top: 160px;
            width: 100%;
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
            pointer-events: none;
        }
        .badge-chip {
            background: rgba(0, 0, 0, 0.66);
            border: 2px solid rgba(255,255,255,0.35);
            border-radius: 999px;
            color: #d7dde5;
            font-size: 15px;
            font-weight: 700;
            padding: 7px 11px;
            transition: transform .2s ease, background .2s ease, color .2s ease;
        }
        .badge-chip.earned {
            background: #fff4b8;
            border-color: #f1c40f;
            color: #7a4b00;
            transform: translateY(-2px) scale(1.04);
        }
'''
if '#badge-tracker' not in page09:
    page09 = page09.replace('    </style>', badge_css + '\n    </style>', 1)

tracker_html = '''
        <div id="badge-tracker" aria-label="任務徽章進度">
            <span class="badge-chip" id="badge-acid">⬜ 酸性小達人</span>
            <span class="badge-chip" id="badge-base">⬜ 鹼性小達人</span>
            <span class="badge-chip" id="badge-neutral">⬜ 中性小達人</span>
        </div>
'''
if 'id="badge-tracker"' not in page09:
    page09 = page09.replace('        </div>\n    </div>\n\n    <!-- 開始畫面 -->', '        </div>\n' + tracker_html + '    </div>\n\n    <!-- 開始畫面 -->', 1)

mission09 = '''    changeMission: function() {
        const remaining = this.missions.filter(mission => !this.state.completedBadges.has(mission.type));
        if (remaining.length === 0) {
            this.showResult(true, 'pass');
            return;
        }

        let choices = remaining.filter(mission => !this.state.currentMission || mission.type !== this.state.currentMission.type);
        if (choices.length === 0) choices = remaining;

        const newMission = choices[Math.floor(Math.random() * choices.length)];
        this.state.currentMission = newMission;
        this.state.missionItemsCollected = 0;
        this.state.currentMissionTarget = 2;

        const missionEl = document.getElementById('current-mission');
        document.getElementById('mission-text').textContent = `${newMission.text}（0/${this.state.currentMissionTarget}）`;
        missionEl.style.backgroundColor = newMission.color;
        missionEl.style.borderColor = newMission.borderColor;
        missionEl.style.transform = 'scale(1.15)';
        setTimeout(() => missionEl.style.transform = 'scale(1)', 250);
    },

'''
page09 = replace_section(page09, '    changeMission: function() {', '    spawnItem: function() {', mission09, '09.html')

collect09 = '''    handleCollection: function(item) {
        const isCorrect = item.data.type === this.state.currentMission.type;

        if (isCorrect) {
            this.state.score += 1;
            this.state.missionItemsCollected += 1;
            const progress = this.state.missionItemsCollected;
            const needed = this.state.currentMissionTarget;

            if (progress >= needed) {
                const badgeNames = { acid: '酸性小達人', base: '鹼性小達人', neutral: '中性小達人' };
                this.state.completedBadges.add(this.state.currentMission.type);
                this.showFloatingText(`獲得：${badgeNames[this.state.currentMission.type]}！`, '#2ecc71', this.player.x);
                this.updateUI();

                if (this.state.completedBadges.size >= this.state.targetScore) {
                    this.showResult(true, 'pass');
                    return;
                }

                setTimeout(() => this.changeMission(), 450);
            } else {
                this.showFloatingText(`答對！再收集 ${needed - progress} 個。`, '#2ecc71', this.player.x);
                document.getElementById('mission-text').textContent = `${this.state.currentMission.text}（${progress}/${needed}）`;
            }
        } else {
            this.state.lives -= 1;
            this.showFloatingText('挑戰機會 -1', '#e74c3c', this.player.x);
            this.canvas.style.transform = 'translateX(5px)';
            setTimeout(() => this.canvas.style.transform = 'translateX(0)', 50);
            if (this.state.lives <= 0) {
                this.showResult(false, 'fail');
            }
        }
        this.updateUI();
    },

'''
page09 = replace_section(page09, '    handleCollection: function(item) {', '    showResult: function(', collect09, '09.html')

result09 = '''    showResult: function(isWin, type) {
        this.state.isPlaying = false;
        const titleEl = document.getElementById('result-title');
        const msgEl = document.getElementById('result-msg');
        const scoreEl = document.getElementById('final-score');
        const screen = document.getElementById('result-screen');
        const badge = (type, label) => `${this.state.completedBadges.has(type) ? '✅' : '⬜'} ${label}`;

        scoreEl.textContent = `${this.state.completedBadges.size} / 3`;
        screen.classList.remove('hidden');

        if (isWin) {
            titleEl.textContent = '🎉 三個任務徽章都完成了！';
            titleEl.style.color = '#2ecc71';
            msgEl.innerHTML = `
                <span style="color:#f1c40f">白奶油博士：</span>「你成功分辨酸性、鹼性和中性溶液！」<br><br>
                ${badge('acid', '酸性小達人')}<br>
                ${badge('base', '鹼性小達人')}<br>
                ${badge('neutral', '中性小達人')}<br><br>
                <span style="color:#e67e22">橘咪咪：</span>「科學小達人，分類任務成功！」
            `;
        } else {
            titleEl.textContent = '再挑戰一次';
            titleEl.style.color = '#e67e22';
            msgEl.innerHTML = `
                <span style="color:#e67e22">橘咪咪：</span>「先看清楚白奶油博士要收集哪一類溶液，再試一次！」<br><br>
                ${badge('acid', '酸性小達人')}<br>
                ${badge('base', '鹼性小達人')}<br>
                ${badge('neutral', '中性小達人')}
            `;
        }
    },

'''
page09 = replace_section(page09, '    showResult: function(', '    updateUI: function()', result09, '09.html')

ui09 = '''    updateUI: function() {
        document.getElementById('score-display').textContent = `🏅 任務徽章: ${this.state.completedBadges.size} / 3`;
        const badgeLabels = { acid: '酸性小達人', base: '鹼性小達人', neutral: '中性小達人' };
        Object.entries(badgeLabels).forEach(([type, label]) => {
            const chip = document.getElementById(`badge-${type}`);
            if (!chip) return;
            const earned = this.state.completedBadges.has(type);
            chip.textContent = `${earned ? '✅' : '⬜'} ${label}`;
            chip.classList.toggle('earned', earned);
        });
        let hearts = '';
        for (let i = 0; i < this.state.lives; i++) hearts += '❤️';
        document.getElementById('lives-display').textContent = `挑戰機會: ${this.state.lives} 次 ${hearts}`;
    },

'''
page09 = replace_section(page09, '    updateUI: function() {', '    showFloatingText: function(', ui09, '09.html')
save('09.html', page09)

print('Patched 08.html and 09.html')
