from pathlib import Path

path = Path('05.html')
s = path.read_text(encoding='utf-8')
marker = '/* RETAINED_SAND_REPAIR */'
if marker in s:
    print('Retained sand repair already present.')
    raise SystemExit(0)

css = '''
/* RETAINED_SAND_REPAIR */
body[data-farm-home-position="right"] #farm-home-button{left:auto!important;right:16px!important}
@media(max-width:600px){body[data-farm-home-position="right"] #farm-home-button{left:auto!important;right:10px!important}}
'''
s = s.replace('</style>', css + '\n    </style>', 1)

injection = r'''
        /* RETAINED_SAND_REPAIR */
        let retainedSandCount = 0;
        let sandSpawnCarry = 0;
        let sandFinishFrames = 0;
        const retainedSandTarget = 112;

        const originalResetExperiment = resetExperiment;
        resetExperiment = function() {
            originalResetExperiment();
            retainedSandCount = 0;
            sandSpawnCarry = 0;
            sandFinishFrames = 0;
        };

        function hideSourceSandForPouring() {
            beakerA.particles.forEach(p => {
                if (p.type === 'sand') p.alpha = 0;
            });
        }

        function buildFallingParticle(type) {
            const spout = getSpoutTipWorldPos(beakerA);
            const targetX = filterSetup.x + (Math.random() - 0.5) * (type === 'sand' ? 40 : 24);
            const targetY = filterSetup.y - filterSetup.beakerBSize.h + 36;
            const frames = type === 'sand' ? 34 : 29;
            const gravity = 0.18;
            return {
                type,
                x: spout.x + (Math.random() - 0.5) * 3,
                y: spout.y + (Math.random() - 0.5) * 3,
                vx: (targetX - spout.x) / frames,
                vy: (targetY - spout.y - 0.5 * gravity * frames * frames) / frames,
                r: type === 'sand' ? 3.1 : 2.3
            };
        }

        function depositSand(worldX) {
            const r = filterSetup.sieveRadius;
            const index = Math.max(8, Math.min(filterSetup.pileHeights.length - 9, Math.round(worldX - (filterSetup.x - r))));
            filterSetup.pileHeights[index] += 1.2;
            retainedSandCount += 1;
        }

        function makeFinalPileVisible() {
            const r = filterSetup.sieveRadius;
            for (let i = 0; i < filterSetup.pileHeights.length; i++) {
                const x = -r + i;
                if (x < -r || x > r) continue;
                const height = 6 + Math.round(22 * Math.pow(1 - Math.min(1, Math.abs(x) / r), 0.62));
                filterSetup.pileHeights[i] = Math.max(filterSetup.pileHeights[i], height);
            }
        }

        updateAndDrawPouringSystem = function(ctx) {
            const sieveY = filterSetup.y - filterSetup.beakerBSize.h + 40;
            const sieveX = filterSetup.x;
            if (step === 4 && beakerA.angle < -1.25) {
                if (beakerA.waterVolume > 0.5) {
                    for (let i = 0; i < 2; i++) filterSetup.fallingParticles.push(buildFallingParticle('water'));
                }
                if (retainedSandCount < retainedSandTarget) {
                    sandSpawnCarry += 0.32;
                    while (sandSpawnCarry >= 1 && retainedSandCount + filterSetup.fallingParticles.filter(p => p.type === 'sand').length < retainedSandTarget) {
                        filterSetup.fallingParticles.push(buildFallingParticle('sand'));
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
                        if (p.type === 'water') filterSetup.beakerBWaterLevel = Math.min(MAX_BOTTOM_LEVEL, filterSetup.beakerBWaterLevel + 0.055);
                        else depositSand(p.x);
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
                if (beakerA.angle > targetAngle) beakerA.angle -= 0.028;
                if (beakerA.angle < -1.25) {
                    hideSourceSandForPouring();
                    if (beakerA.waterVolume > 0.5) beakerA.waterVolume = Math.max(0, beakerA.waterVolume - 0.11);
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
            resetExperiment();
            step = targetStep;
            if (targetStep >= 2) {
                beakerA.waterVolume = beakerA.maxVolume;
                jug.visible = false; jug.flow = false; jug.flowDone = true; jug.returned = true;
            }
            if (targetStep >= 3) beakerA.particles.forEach(p => { if (p.type === 'salt') p.alpha = 0; });
            if (targetStep >= 4) {
                filterSetup.visible = true;
                filterSetup.x = width * 0.5; filterSetup.y = height * 0.65;
                beakerA.x = filterSetup.x + 105; beakerA.y = height * 0.65 - 350; beakerA.angle = 0;
                filterSetup.beakerBWaterLevel = 0; filterSetup.fallingParticles = []; filterSetup.pileHeights.fill(0);
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
                beakerAngle: beakerA.angle,
                fallingSand: filterSetup.fallingParticles.filter(p => p.type === 'sand').length,
                sandDeposited: retainedSandCount,
                pileMaximum: Math.max(...filterSetup.pileHeights),
                homeOnRight: document.body.dataset.farmHomePosition === 'right'
            });
        }

'''
needle = "        mainBtn.addEventListener('click', () => {"
if needle not in s:
    raise RuntimeError('Cannot locate listener insertion point')
s = s.replace(needle, injection + needle, 1)
path.write_text(s, encoding='utf-8')
print('Injected retained sand animation repair.')
