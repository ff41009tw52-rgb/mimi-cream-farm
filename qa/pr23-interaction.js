const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const VIEWPORT = { width: 375, height: 812 };
const results = [];
const safeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);

async function loadGame(browser, game, options = {}) {
  const context = await browser.newContext({ viewport: VIEWPORT, screen: VIEWPORT, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-TW' });
  const page = await context.newPage();
  let blockedRaw = 0;
  if (options.blockRaw) {
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith('https://raw.githubusercontent.com/')) {
        blockedRaw += 1;
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });
  }
  const errors = [];
  page.on('pageerror', e => errors.push('page: ' + e));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  await page.goto(`http://127.0.0.1:4173/play.html?game=${game}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#game-shell')?.getAttribute('aria-busy') === 'false', { timeout: 20000 });
  await page.waitForTimeout(2200);
  const frame = page.frames().find(f => f.url() === 'about:srcdoc');
  if (!frame) throw new Error(`game ${game}: srcdoc frame not found`);
  return { context, page, frame, errors, getBlockedRaw: () => blockedRaw };
}

async function touchDragTo(page, source, endX, endY, steps = 14) {
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error('source has no box');
  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const point = (x, y) => ({ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(startX, startY)] });
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(startX + (endX - startX) * t, startY + (endY - startY) * t)] });
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise(resolve => setTimeout(resolve, 650));
}

async function capture(page, name) {
  const file = path.join('qa-interaction', `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

(async () => {
  fs.mkdirSync('qa-interaction', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] });

  // 04: endpoint is deliberately above the beaker center because endDrag tests the bottom of the dragged dropper clone.
  {
    let s;
    try {
      s = await loadGame(browser, '04');
      const source = s.frame.locator('#dropperBottle');
      const beaker = s.frame.locator('.beaker').first();
      const b = await beaker.boundingBox();
      if (!b) throw new Error('beaker box missing');
      const before = await s.frame.locator('.result-tag.show').count();
      await touchDragTo(s.page, source, b.x + b.width / 2, b.y - 38);
      const after = await s.frame.locator('.result-tag.show').count();
      const rows = await s.frame.locator('.record-table tbody tr').allInnerTexts().catch(() => []);
      const shot = await capture(s.page, '04-retest');
      results.push({ game: '04', ok: after > before, before, after, rows, beakerBox: b, screenshot: shot, errors: s.errors });
    } catch (e) { results.push({ game: '04', ok: false, error: String(e), errors: s?.errors || [] }); }
    finally { if (s) await s.context.close(); }
  }

  // 17: click the interactive parent card, not the pointer-events-none text child.
  {
    let s;
    try {
      s = await loadGame(browser, '17');
      await s.frame.getByRole('button', { name: /我認識它們了，開始挑戰/ }).click();
      await s.page.waitForTimeout(250);
      const plantCard = s.frame.getByText('台灣萍蓬草', { exact: true }).last().locator('..');
      await plantCard.click();
      await s.frame.locator('[data-zone="floating-leaved"]').click();
      await s.page.waitForTimeout(300);
      const text = safeText(await s.frame.locator('body').innerText());
      const shot = await capture(s.page, '17-retest');
      results.push({ game: '17', ok: text.includes('答對') || text.includes('紅寶石') || text.includes('特有種'), evidence: text, screenshot: shot, errors: s.errors });
    } catch (e) { results.push({ game: '17', ok: false, error: String(e), errors: s?.errors || [] }); }
    finally { if (s) await s.context.close(); }
  }

  // 40: prove whether the wrapper really depends on GitHub Raw by blocking that host exactly.
  {
    let s;
    try {
      s = await loadGame(browser, '40', { blockRaw: true });
      await s.page.waitForTimeout(500);
      const text = safeText(await s.frame.locator('body').innerText());
      const blockedRaw = s.getBlockedRaw();
      const shot = await capture(s.page, '40-raw-blocked-retest');
      results.push({ game: '40-blocked', ok: blockedRaw > 0 && text.includes('暫時無法載入網站'), blockedRaw, evidence: text, screenshot: shot, errors: s.errors });
    } catch (e) { results.push({ game: '40-blocked', ok: false, error: String(e), blockedRaw: s?.getBlockedRaw?.() || 0, errors: s?.errors || [] }); }
    finally { if (s) await s.context.close(); }
  }

  fs.writeFileSync('qa-interaction/report.json', JSON.stringify(results, null, 2));
  const lines = ['# PR #23 targeted P1 retest', ''];
  for (const r of results) {
    lines.push(`## ${r.game}`);
    lines.push(`- result: ${r.ok ? 'PASS' : 'FAIL / RISK'}`);
    for (const [k,v] of Object.entries(r)) {
      if (['game','ok','screenshot','errors'].includes(k)) continue;
      lines.push(`- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
    lines.push(`- runtime errors: ${(r.errors || []).length}`);
    if (r.screenshot) lines.push(`- screenshot: ${r.screenshot}`);
    lines.push('');
  }
  fs.writeFileSync('qa-interaction/report.md', lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
