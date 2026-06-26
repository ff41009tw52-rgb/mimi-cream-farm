from pathlib import Path
import re

path = Path('05.html')
s = path.read_text(encoding='utf-8')


def replace_once(old, new):
    global s
    if old not in s:
        raise RuntimeError(f'Missing target: {old[:100]!r}')
    s = s.replace(old, new, 1)


def replace_between(start_marker, end_marker, replacement):
    global s
    start = s.find(start_marker)
    if start < 0:
        raise RuntimeError(f'Missing start marker: {start_marker!r}')
    end = s.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f'Missing end marker: {end_marker!r}')
    s = s[:start] + replacement + s[end:]

# Make the page-level right-side home-button position explicit.
replace_once(
    '#replay-step-btn.replaying{animation:replayPulse .8s ease-in-out infinite alternate}@keyframes replayPulse{from{filter:brightness(1)}to{filter:brightness(1.17);transform:translateY(-1px)}}',
    '''#replay-step-btn.replaying{animation:replayPulse .8s ease-in-out infinite alternate}@keyframes replayPulse{from{filter:brightness(1)}to{filter:brightness(1.17);transform:translateY(-1px)}}
        body[data-farm-home-position="right"] #farm-home-button{left:auto!important;right:16px!important}
        @media(max-width:600px){body[data-farm-home-position="right"] #farm-home-button{left:auto!important;right:10px!important}}'''
)

# Add reliable sand state. The final pile is independent of temporary falling particles.
replace_once(
    '            pileHeights: new Array(130).fill(0), \n            beakerBSize: { w: 140, h: 160 }',
    '''            pileHeights: new Array(130).fill(0),
            beakerBSize: { w: 140, h: 160 },
            sandDeposited: 0,
            sandTarget: 112,
            sandSpawnCarry: 0,
            completionFrames: 0'''
)
replace_once(
    '            filterSetup.pileHeights.fill(0);',
    '''            filterSetup.pileHeights.fill(0);
            filterSetup.sandDeposited = 0;
            filterSetup.sandSpawnCarry = 0;
            filterSetup.completionFrames = 0;'''
)

# Do not randomly delete source sand while drawing the tipped beaker.
replace_once(
    '''                        if (p.x < leftWallX && p.y < spoutOpeningY && b.isPouring) {
                             if (p.type === 'sand' && Math.random() < 0.15) p.alpha = 0; 
                        }''',
    '''                        // Source sand is removed only when it becomes a visible falling grain.
                        // This prevents it from disappearing before it reaches the filter.''' 
)

# Stable stream and retained pile: emit source sand at a fixed pace, deposit it permanently,
# and finish only after both water and sand have completed their paths.
replace_between(
    '        function updateAndDrawPouringSystem(ctx) {',
    '        function drawJug(ctx) {',
    '''        function addSandToFilterPile(worldX) {
            const r = filterSetup.sieveRadius;
            const relativeX = worldX - (filterSetup.x - r);
            const index = Math.max(8, Math.min(filterSetup.pileHeights.length - 9, Math.round(relativeX)));
            filterSetup.pileHeights[index] += 1.15;
            filterSetup.sandDeposited += 1;
        }

        function ensureVisibleFinalSandPile() {
            const r = filterSetup.sieveRadius;
            const startX = -r;
            for (let i = 0; i < filterSetup.pileHeights.length; i++) {
                const x = startX + i;
                if (x < -r || x > r) continue;
                const edgeRatio = Math.min(1, Math.abs(x) / r);
                const desiredHeight = 6 + Math.round(22 * Math.pow(1 - edgeRatio, 0.62));
                filterSetup.pileHeights[i] = Math.max(filterSetup.pileHeights[i], desiredHeight);
            }
        }

        function releaseOneSourceSand() {
            const source = beakerA.particles.find(p => p.type === 'sand' && p.alpha > 0);
            if (source) source.alpha = 0;
        }

        function updateAndDrawPouringSystem(ctx) {
            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const sieveX = filterSetup.x;
            const createParticle = (type) => {
                const spout = getSpoutTipWorldPos(beakerA);
                const targetX = sieveX + (Math.random() - 0.5) * (type === 'sand' ? 42 : 26);
                const targetY = sieveY - 3;
                const frames = type === 'sand' ? 34 : 28;
                const gravity = 0.18;
                return {
                    type,
                    x: spout.x + (Math.random() - 0.5) * 3,
                    y: spout.y + (Math.random() - 0.5) * 3,
                    vx: (targetX - spout.x) / frames,
                    vy: (targetY - spout.y - 0.5 * gravity * frames * frames) / frames,
                    r: type === 'sand' ? 2.8 + Math.random() * 0.55 : 2.1 + Math.random() * 0.8
                };
            };

            if (step === 4 && beakerA.angle < -1.25) {
                if (beakerA.waterVolume > 0.5) {
                    for (let k = 0; k < 2; k++) filterSetup.fallingParticles.push(createParticle('water'));
                }
                if (filterSetup.sandDeposited < filterSetup.sandTarget) {
                    filterSetup.sandSpawnCarry += 0.32;
                    while (filterSetup.sandSpawnCarry >= 1 && filterSetup.sandDeposited + filterSetup.fallingParticles.filter(p => p.type === 'sand').length < filterSetup.sandTarget) {
                        filterSetup.fallingParticles.push(createParticle('sand'));
                        releaseOneSourceSand();
                        filterSetup.sandSpawnCarry -= 1;
                    }
                }
            }

            for (let i = filterSetup.fallingParticles.length - 1; i >= 0; i--) {
                const particle = filterSetup.fallingParticles[i];
                particle.vx *= 0.997;
                particle.vy += 0.18;
                particle.x += particle.vx;
                particle.y += particle.vy;

                ctx.beginPath();
                ctx.fillStyle = particle.type === 'water' ? WATER_COLOR : SAND_COLOR;
                ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
                ctx.fill();

                if (particle.y >= sieveY) {
                    if (Math.abs(particle.x - sieveX) <= filterSetup.sieveRadius) {
                        if (particle.type === 'water') {
                            filterSetup.beakerBWaterLevel = Math.min(MAX_BOTTOM_LEVEL, filterSetup.beakerBWaterLevel + 0.035);
                        } else {
                            addSandToFilterPile(particle.x);
                        }
                        filterSetup.fallingParticles.splice(i, 1);
                    } else if (particle.y > canvas.height + 30) {
                        filterSetup.fallingParticles.splice(i, 1);
                    }
                }
            }
            smoothSandPile();
        }

'''
)

# Replace filtering end logic. Never clear the retained pile or moving particles at completion.
replace_between(
    '            if (step === 4) { ',
    '        }\n\n        function loop() {',
    '''            if (step === 4) {
                const targetAngle = -Math.PI / 2 - 0.4;
                if (beakerA.angle > targetAngle) beakerA.angle -= 0.012;

                if (beakerA.angle < -1.25 && beakerA.waterVolume > 0.5) {
                    beakerA.waterVolume = Math.max(0, beakerA.waterVolume - 0.075);
                }

                const fallingSand = filterSetup.fallingParticles.some(p => p.type === 'sand');
                const ready = beakerA.waterVolume <= 0.5 &&
                    filterSetup.sandDeposited >= filterSetup.sandTarget && !fallingSand;
                filterSetup.completionFrames = ready ? filterSetup.completionFrames + 1 : 0;

                if (filterSetup.completionFrames >= 42) {
                    ensureVisibleFinalSandPile();
                    beakerA.isPouring = false;
                    beakerA.waterVolume = 0;
                    if (step === 4) {
                        step = 5;
                        updateUI(5);
                        if (autoStepTimer) clearTimeout(autoStepTimer);
                    }
                }
            }
'''
)

# Remove the fixed timeout; completion is now based on visible retained sand and water.
replace_once(
    '                if (step === 4) { mainBtn.disabled = true; autoStepTimer = setTimeout(() => { if (step === 4) { step = 5; updateUI(5); } autoStepTimer = null; }, 16000); }',
    '                if (step === 4) { mainBtn.disabled = true; }'
)

# Make replay show an actual visible restart. For the filtering step we reset the sand state,
# start from the unpoured beaker, and re-enable the control only after the animation completes.
replace_between(
    '        function prepareReplayStep(targetStep) {',
    '        function replayCurrentStep() {',
    '''        function prepareReplayStep(targetStep) {
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
                filterSetup.fallingParticles = [];
                filterSetup.pileHeights.fill(0);
                filterSetup.sandDeposited = 0;
                filterSetup.sandSpawnCarry = 0;
                filterSetup.completionFrames = 0;
            }

            updateUI(targetStep);
            if (targetStep === 1 || targetStep === 2) {
                mainBtn.disabled = true;
                replayTimer = setTimeout(() => { if (step === targetStep) mainBtn.disabled = false; }, 1800);
            }
        }

'''
)

# Permit automated verification of final retained sand without exposing helpers on the live site.
replace_once(
    "                sandSpawned,\n                homeOnRight: document.body.dataset.farmHomePosition === 'right'",
    "                sandDeposited: filterSetup.sandDeposited,\n                pileMaximum: Math.max(...filterSetup.pileHeights),\n                homeOnRight: document.body.dataset.farmHomePosition === 'right'"
)

path.write_text(s, encoding='utf-8')
print('Patched 05 sand separation animation.')
