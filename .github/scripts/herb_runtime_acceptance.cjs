const puppeteer = require('puppeteer-core');
const assert = require('assert');

const base = process.env.TEST_URL || 'http://127.0.0.1:8000/herbgameai-formal.html';
const urlWith = (params) => base + (base.includes('?') ? '&' : '?') + params;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function finishTyping(page) {
  if (await page.evaluate(() => window.gameEngine?.isTyping)) {
    await page.keyboard.press('Space');
    await sleep(80);
  }
}

async function advanceTo(page, expected) {
  await finishTyping(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(id => window.gameEngine?.currentNodeId === id, {timeout: 5000}, expected);
  await sleep(280);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  await page.goto(urlWith('preview=xiaolin-event-01'), {waitUntil: 'networkidle2', timeout: 60000});
  await page.waitForFunction(() => window.gameEngine && window.__HERBGAME_AI_VISUAL, {timeout: 30000});
  await page.waitForFunction(() => document.querySelector('#ai-character-sprite')?.getAttribute('src')?.includes('mint_student_transparent.png'), {timeout: 30000});
  await page.waitForFunction(() => document.querySelector('#ai-character-sprite')?.complete && document.querySelector('#ai-character-sprite')?.naturalWidth > 0, {timeout: 30000});
  await sleep(350);

  let first = await page.evaluate(() => {
    const sp = document.querySelector('#ai-character-sprite');
    const r = sp.getBoundingClientRect();
    return {id: gameEngine.currentNodeId, typing: gameEngine.isTyping, src: sp.getAttribute('src'), opacity: getComputedStyle(sp).opacity, x:r.x, y:r.y, w:r.width, h:r.height};
  });
  assert.equal(first.id, 'ai_mint_e01_01');
  assert(first.src.endsWith('mint_student_transparent.png'));
  assert.equal(first.opacity, '1');

  // Deployed image itself must contain substantial true transparency.
  const alpha0 = await page.evaluate(() => {
    const im = document.querySelector('#ai-character-sprite');
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(im,0,0);
    const d = ctx.getImageData(0,0,c.width,c.height).data;
    let zero = 0; for (let i=3;i<d.length;i+=4) if (d[i]===0) zero++;
    return zero/(d.length/4);
  });
  assert(alpha0 > 0.30, `mint alpha0 too low: ${alpha0}`);

  // Count subsequent sprite load events: same character must not reload between lines.
  await page.evaluate(() => {
    window.__spriteReloads = 0;
    document.querySelector('#ai-character-sprite').addEventListener('load', () => window.__spriteReloads++);
  });

  // A: while typing, first Space only completes current line.
  assert.equal(await page.evaluate(() => gameEngine.currentNodeId), 'ai_mint_e01_01');
  if (await page.evaluate(() => gameEngine.isTyping)) {
    await page.keyboard.press('Space'); await sleep(80);
    assert.equal(await page.evaluate(() => gameEngine.currentNodeId), 'ai_mint_e01_01');
    assert.equal(await page.evaluate(() => gameEngine.isTyping), false);
  }

  // B + one-to-one focus: next Space -> player line; XiaoLin stays, same src/position, 85%, no reload.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => gameEngine.currentNodeId === 'ai_mint_e01_02', {timeout:5000});
  await sleep(300);
  let playerLine = await page.evaluate(() => {
    const sp=document.querySelector('#ai-character-sprite'), r=sp.getBoundingClientRect();
    return {src:sp.getAttribute('src'),opacity:getComputedStyle(sp).opacity,x:r.x,y:r.y,w:r.width,h:r.height,reloads:window.__spriteReloads,visible:document.querySelector('#ai-character-layer').classList.contains('visible')};
  });
  assert(playerLine.visible);
  assert(playerLine.src.endsWith('mint_student_transparent.png'));
  assert.equal(playerLine.opacity,'0.85');
  assert.equal(playerLine.reloads,0);
  assert(Math.abs(playerLine.x-first.x)<1 && Math.abs(playerLine.w-first.w)<1 && Math.abs(playerLine.h-first.h)<1);

  // NPC line returns to 100% without reload.
  await advanceTo(page,'ai_mint_e01_03');
  let npcAgain=await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('#ai-character-sprite')).opacity,reloads:window.__spriteReloads,src:document.querySelector('#ai-character-sprite').getAttribute('src')}));
  assert.equal(npcAgain.opacity,'1'); assert.equal(npcAgain.reloads,0); assert(npcAgain.src.endsWith('mint_student_transparent.png'));

  // Player again -> 85% without flash/reload.
  await advanceTo(page,'ai_mint_e01_04');
  assert.equal(await page.$eval('#ai-character-sprite',el=>getComputedStyle(el).opacity),'0.85');
  assert.equal(await page.evaluate(()=>window.__spriteReloads),0);

  // Narration inside same one-to-one event also keeps XiaoLin at 85%.
  await page.evaluate(()=>gameEngine.loadNode('ai_mint_e01_06',{skipHistory:true}));
  await sleep(300);
  assert.equal(await page.$eval('#ai-character-sprite',el=>getComputedStyle(el).opacity),'0.85');
  assert.equal(await page.evaluate(()=>window.__spriteReloads),0);

  // C: explicit repeat keydown is ignored.
  await finishTyping(page);
  const repeatBefore=await page.evaluate(()=>gameEngine.currentNodeId);
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',repeat:true,bubbles:true})));
  await sleep(80);
  assert.equal(await page.evaluate(()=>gameEngine.currentNodeId),repeatBefore);

  // D: choices visible => Space is inert.
  await page.evaluate(()=>gameEngine.loadNode('ai_mint_distance_choice',{skipHistory:true}));
  await sleep(120); await finishTyping(page);
  await page.waitForFunction(()=>gameEngine.isShowingChoices===true,{timeout:5000});
  const choiceId=await page.evaluate(()=>gameEngine.currentNodeId);
  await page.keyboard.press('Space'); await sleep(120);
  assert.equal(await page.evaluate(()=>gameEngine.currentNodeId),choiceId);
  assert.equal(await page.evaluate(()=>gameEngine.isShowingChoices),true);
  assert.equal(await page.$eval('#ai-character-sprite',el=>getComputedStyle(el).opacity),'0.85');

  // Reset to a completed normal dialogue for blocked-layer tests.
  await page.evaluate(()=>{gameEngine.isShowingChoices=false;gameEngine.dom.choicesContainer.classList.remove('show');gameEngine.loadNode('ai_mint_e01_04',{skipHistory:true});});
  await sleep(120); await finishTyping(page);

  // E/F/G/I: panel, map, research tablet, video layer all block Space.
  for (const id of ['player-panel','campus-map-layer','research-tablet-layer','video-placeholder']) {
    const before=await page.evaluate(()=>gameEngine.currentNodeId);
    await page.evaluate(id=>document.getElementById(id).classList.add('active'),id);
    await page.keyboard.press('Space'); await sleep(80);
    assert.equal(await page.evaluate(()=>gameEngine.currentNodeId),before,`${id} allowed Space advance`);
    await page.evaluate(id=>document.getElementById(id).classList.remove('active'),id);
  }

  // Focused interactive controls must not double-trigger global Space navigation.
  const focusedBefore=await page.evaluate(()=>gameEngine.currentNodeId);
  await page.focus('#btn-open-panel');
  await page.keyboard.down('Space'); await page.keyboard.up('Space'); await sleep(100);
  assert.equal(await page.evaluate(()=>gameEngine.currentNodeId),focusedBefore);
  // Native button behavior may open the panel; close it for remaining tests.
  await page.evaluate(()=>document.getElementById('player-panel').classList.remove('active'));
  await page.evaluate(()=>document.activeElement?.blur?.());

  // H: plant card first Space only closes card; second Space advances.
  await page.evaluate(()=>gameEngine.loadNode('ai_mint_e01_01',{skipHistory:true}));
  await sleep(150); await finishTyping(page);
  await page.evaluate(()=>window.__HERBGAME_AI_VISUAL.showPlantCard('mint'));
  await page.waitForSelector('#plant-card-reveal-layer.active');
  const cardNode=await page.evaluate(()=>gameEngine.currentNodeId);
  await page.keyboard.press('Space'); await sleep(100);
  assert.equal(await page.evaluate(()=>gameEngine.currentNodeId),cardNode);
  assert.equal(await page.$eval('#plant-card-reveal-layer',el=>el.classList.contains('active')),false);
  await sleep(150);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>gameEngine.currentNodeId==='ai_mint_e01_02',{timeout:5000});

  // Gallery: same STUDENT_INFO.avatar source; unlocked XiaoLin and all 11 after simulated unlock use new unique transparent filenames.
  await page.evaluate(()=>{for(const id of ['mint_student','left_student','lemongrass_student','pandan_student','mugwort_student','fishmint_student','pricklyash_student','shellginger_student','teatree_student','turmeric_student','marigold_student']) gameEngine.gameState.unlockedStudents.add(id);gameEngine.renderPlayerPanel();});
  const gallery=await page.$$eval('#member-list img.member-avatar-img',els=>els.map(i=>({alt:i.alt,src:i.getAttribute('src')})).filter(x=>x.src?.includes('/ai-characters/')));
  assert.equal(gallery.length,11);
  assert.equal(new Set(gallery.map(x=>x.src)).size,11);
  assert(gallery.every(x=>x.src.endsWith('_transparent.png')));

  if (pageErrors.length) throw new Error('page errors:\n'+pageErrors.join('\n'));
  console.log('runtime acceptance passed', {alpha0, galleryCount:gallery.length});
  await browser.close();
})().catch(err=>{ console.error(err); process.exit(1); });
