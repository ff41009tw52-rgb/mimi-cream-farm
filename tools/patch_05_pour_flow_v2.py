from pathlib import Path

path = Path('05.html')
s = path.read_text(encoding='utf-8')


def replace_once(old, new):
    global s
    if old not in s:
        raise RuntimeError(f'Missing expected text: {old[:90]!r}')
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

# Keep the source water level physically tied to the remaining volume. The prior version
# forced the water surface to the spout as soon as the beaker tipped, making it look empty.
replace_once(
    '''                if ((surfaceWorldY < spoutY || (b.angle < -1.0 && b.waterVolume > 0.5)) && b.waterVolume > 0.5) {
                    surfaceWorldY = spoutY - 2; 
                    b.isPouring = true; 
                } else {
                    b.isPouring = false;
                }''',
    '''                const pouringByTilt = isSource && b.angle < -1.12 && b.waterVolume > 0.5;
                if ((surfaceWorldY < spoutY || pouringByTilt) && b.waterVolume > 0.5) {
                    b.isPouring = true;
                } else {
                    b.isPouring = false;
                }'''
)

# Stop the old source-particle rules from jumping grains outside the beaker or deleting them.
replace_between(
    '                    if (step === 4 && b.waterVolume > 0) {',
    '                    if (step === 2 && b.waterVolume > 20) {',
    ''
)
replace_between(
    '                    if (step === 4 && b.angle < -0.5) {',
    '                    } else {',
    '''                    if (step === 4 && b.angle < -0.5) {
                        // Remaining source grains stay inside the glass while moving grains are
                        // represented by the separate visible stream below.
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y < -h/2 + 4) p.y = -h/2 + 4;
                        if (p.y > bottomWallY) p.y = bottomWallY;
'''
)

# The original fixed timeout can finish the step before the visible stream has drained.
replace_once(
    '''                if (step === 4) { mainBtn.disabled = true; autoStepTimer = setTimeout(() => { if (step === 4) { step = 5; updateUI(5); } autoStepTimer = null; }, 16000); }''',
    '''                if (step === 4) { mainBtn.disabled = true; }'''
)

# Replace the previous all-at-once retained-sand override with a gradual model:
# source sand visibly slides, water stays in the tipped beaker while its volume falls,
# and only a few source grains are removed for each grain that travels to the filter.
replace_between(
    '        /* RETAINED_SAND_REPAIR */',
    '        mainBtn.addEventListener(\'click\', () => {',
    '''        /* SMOOTH_POUR_FLOW_V2 */
        let retainedSandCount = 0;
        let sandSpawnCarry = 0;
        let sandFinishFrames = 0;
        const retainedSandTarget = 100;

        const originalResetExperiment = resetExperiment;
        resetExperiment = function() {
            originalResetExperiment();
            retainedSandCount = 0;
            sandSpawnCarry = 0;
            sandFinishFrames = 0;
        };

        function moveSourceSandTowardSpout() {
            beakerA.particles.forEach(p => {
                if (p.type !== 'sand' || p.alpha <= 0) return;
                // Local coordinates: the pouring lip is at the upper-left side of the glass.
                p.x += (-48 - p.x) * 0.008;
                p.y += (-68 - p.y) * 0.005;
            });
        }

        function releaseSourceSand(count) {
            const grains = beakerA.particles
                .filter(p => p.type === 'sand' && p.alpha > 0)
                .sort((a, b) => (a.x + a.y * 0.35) - (b.x + b.y * 0.35));
            for (let i = 0; i < count && i < grains.length; i++) grains[i].alpha = 0;
        }

        function createPourParticle(type) {
            const spout = getSpoutTipWorldPos(beakerA);
            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const targetX = filterSetup.x + (Math.random() - 0.5) * (type === 'sand' ? 40 : 22);
            const frames = type === 'sand' ? 36 : 30;
            const gravity = 0.18;
            return {
                type,
                x: spout.x + (Math.random() - 0.5) * 3,
                y: spout.y + (Math.random() - 0.5) * 3,
                vx: (targetX - spout.x) / frames,
                vy: (sieveY - 4 - spout.y - 0.5 * gravity * frames * frames) / frames,
                r: type === 'sand' ? 3.0 + Math.random() * 0.4 : 2.3 + Math.random() * 0.8
            };
        }

        function depositSand(worldX) {
            const r = filterSetup.sieveRadius;
            const index = Math.max(8, Math.min(filterSetup.pileHeights.length - 9, Math.round(worldX - (filterSetup.x - r))));
            filterSetup.pileHeights[index] += 2.8;
            retainedSandCount += 1;
        }

        function makeFinalPileVisible() {
            const r = filterSetup.sieveRadius;
            for (let i = 0; i < filterSetup.pileHeights.length; i++) {
                const x = -r + i;
                if (x < -r || x > r) continue;
                const height = 7 + Math.round(22 * Math.pow(1 - Math.min(1, Math.abs(x) / r), 0.62));
                filterSetup.pileHeights[i] = Math.max(filterSetup.pileHeights[i], height);
            }
        }

        function drawPourRibbon(ctx, start, end) {
            const midX = (start.x + end.x) / 2 - 20;
            const midY = Math.min(start.y, end.y) + 30;
            ctx.save();
            ctx.strokeStyle = 'rgba(129, 212, 250, 0.72)';
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(midX, midY, end.x, end.y);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(224, 247, 250, 0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(midX, midY, end.x, end.y);
            ctx.stroke();
            ctx.restore();
        }

        updateAndDrawPouringSystem = function(ctx) {
            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const sieveX = filterSetup.x;
            const pouring = step === 4 && beakerA.angle < -1.12 && beakerA.waterVolume > 0.5;

            if (pouring) {
                const spout = getSpoutTipWorldPos(beakerA);
                drawPourRibbon(ctx, spout, { x: sieveX, y: sieveY - 5 });
                for (let i = 0; i < 2; i++) filterSetup.fallingParticles.push(createPourParticle('water'));
                if (retainedSandCount < retainedSandTarget) {
                    sandSpawnCarry += 0.28;
                    while (sandSpawnCarry >= 1 && retainedSandCount + filterSetup.fallingParticles.filter(p => p.type === 'sand').length < retainedSandTarget) {
                        filterSetup.fallingParticles.push(createPourParticle('sand'));
                        releaseSourceSand(3);
                        sandSpawnCarry -= 1;
                    }
                }
            }

            for (let i = filterSetup.fallingParticles.length - 1; i >= 0; i--) {
                const p = filterSetup.fallingParticles[i];
                p.vx *= 0.997;
                p.vy += 0.18;
                p.x += p.vx;
                p.y += p.vy;
                ctx.beginPath();
                ctx.fillStyle = p.type === 'water' ? WATER_COLOR : SAND_COLOR;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();

                if (p.y >= sieveY) {
                    if (Math.abs(p.x - sieveX) <= filterSetup.sieveRadius) {
                        if (p.type === 'water') {
                            filterSetup.beakerBWaterLevel = Math.min(MAX_BOTTOM_LEVEL, filterSetup.beakerBWaterLevel + 0.052);
                        } else {
                            depositSand(p.x);
                        }
                        filterSetup.fallingParticles.splice(i, 1);
                    } else if (p.y > canvas.height + 30) {
                        filterSetup.fallingParticles.splice(i, 1);
                    }
                }
            }
            smoothSandPile();
        };

        update = function() {
            if (step === 1) {
                jug.visible = true; jug.x = beakerA.x + 50; jug.y = beakerA.y - 200;
                if (!jug.returned) {
                    if (jug.angle > -0.8 && !jug.flowDone) jug.angle -= 0.05;
                    else if (!jug.flowDone) {
                        jug.flow = true;
                        if (beakerA.waterVolume < beakerA.maxVolume) beakerA.waterVolume += 0.5;
                        else { jug.flow = false; jug.flowDone = true; }
                    } else if (jug.angle < 0) {
                        jug.angle += 0.05;
                        if (jug.angle >= 0) { jug.angle = 0; jug.returned = true; }
                    }
                }
            } else jug.visible = false;

            if (step === 2) {
                rod.visible = true; rod.x = beakerA.x; rod.y = beakerA.y - 70; rod.moving = true;
                beakerA.particles.forEach(p => { if (p.type === 'salt' && p.alpha > 0) p.alpha -= 0.005; });
            } else rod.visible = false;

            if (step === 3) {
                filterSetup.x += (width * 0.5 - filterSetup.x) * 0.05;
                filterSetup.y += (height * 0.65 - filterSetup.y) * 0.05;
                beakerA.x += (filterSetup.x + 105 - beakerA.x) * 0.05;
                beakerA.y += (height * 0.65 - 350 - beakerA.y) * 0.05;
                filterSetup.visible = true;
            }

            if (step === 4) {
                const targetAngle = -Math.PI / 2 - 0.4;
                if (beakerA.angle > targetAngle) beakerA.angle -= 0.018;
                if (beakerA.angle < -1.12) {
                    moveSourceSandTowardSpout();
                    if (beakerA.waterVolume > 0.5) beakerA.waterVolume = Math.max(0, beakerA.waterVolume - 0.075);
                }
                const fallingSand = filterSetup.fallingParticles.some(p => p.type === 'sand');
                const finished = beakerA.waterVolume <= 0.5 && retainedSandCount >= retainedSandTarget && !fallingSand;
                sandFinishFrames = finished ? sandFinishFrames + 1 : 0;
                if (sandFinishFrames >= 42) {
                    makeFinalPileVisible();
                    beakerA.waterVolume = 0;
                    beakerA.isPouring = false;
                    step = 5;
                    updateUI(5);
                }
            }
        };

        prepareReplayStep = function(targetStep) {
            if (autoStepTimer) clearTimeout(autoStepTimer);
            if (replayTimer) clearTimeout(replayTimer);
            resetExperiment();
            step = targetStep;
            mainBtn.disabled = false;
            if (targetStep >= 2) {
                beakerA.waterVolume = beakerA.maxVolume;
                jug.visible = false; jug.flow = false; jug.flowDone = true; jug.returned = true;
            }
            if (targetStep >= 3) beakerA.particles.forEach(p => { if (p.type === 'salt') p.alpha = 0; });
            if (targetStep >= 4) {
                filterSetup.visible = true;
                filterSetup.x = width * 0.5; filterSetup.y = height * 0.65;
                beakerA.x = filterSetup.x + 105; beakerA.y = height * 0.65 - 350; beakerA.angle = 0;
                filterSetup.beakerBWaterLevel = 0;
                filterSetup.fallingParticles = [];
                filterSetup.pileHeights.fill(0);
                retainedSandCount = 0; sandSpawnCarry = 0; sandFinishFrames = 0;
            }
            updateUI(targetStep);
        };

        replayCurrentStep = function() {
            prepareReplayStep(step === 5 ? 4 : step);
        };

        if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
            window.__prepareReplay05 = prepareReplayStep;
            window.__getSandLabState05 = () => ({
                step,
                waterVolume: beakerA.waterVolume,
                sourceSandVisible: beakerA.particles.filter(p => p.type === 'sand' && p.alpha > 0).length,
                fallingSand: filterSetup.fallingParticles.filter(p => p.type === 'sand').length,
                sandDeposited: retainedSandCount,
                pileMaximum: Math.max(...filterSetup.pileHeights),
                homeOnRight: document.body.dataset.farmHomePosition === 'right'
            });
        }

'''
)

path.write_text(s, encoding='utf-8')
print('Patched smooth 05 pour flow.')
