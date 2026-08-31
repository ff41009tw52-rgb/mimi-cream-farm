const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const games = ['02','03','11','14','15','18','19','20','22','24','25','26','27','28','31','32','33','35'];
const viewports = [
  { name: 'iphone-se-ish', width: 375, height: 812 },
  { name: 'iphone-modern-ish', width: 390, height: 844 },
];

(async () => {
  fs.mkdirSync('qa-interaction', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const report = [];

  for (const viewport of viewports) {
    const dir = path.join('qa-interaction', viewport.name);
    fs.mkdirSync(dir, { recursive: true });

    for (const game of games) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        screen: { width: viewport.width, height: viewport.height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
        locale: 'zh-TW',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(String(err)));
      page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'failed' }));

      let navigationError = '';
      try {
        await page.goto(`http://127.0.0.1:4173/play.html?game=${game}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => document.querySelector('#game-shell')?.getAttribute('aria-busy') === 'false', { timeout: 20000 });
        await page.waitForTimeout(2200);
      } catch (error) {
        navigationError = String(error);
      }

      const parent = await page.evaluate(() => {
        const shell = document.querySelector('#game-shell');
        const content = document.querySelector('#game-content');
        const legacy = document.querySelector('#game-frame');
        const errorPanel = document.querySelector('#error-panel');
        const rect = content?.getBoundingClientRect();
        return {
          title: document.title,
          ariaBusy: shell?.getAttribute('aria-busy') || null,
          gameContentHidden: content?.hidden ?? null,
          legacyFrameHidden: legacy?.hidden ?? null,
          errorHidden: errorPanel?.hidden ?? null,
          errorText: document.querySelector('#error-text')?.textContent || '',
          pageScrollWidth: document.documentElement.scrollWidth,
          pageClientWidth: document.documentElement.clientWidth,
          contentScrollWidth: content?.scrollWidth || 0,
          contentClientWidth: content?.clientWidth || 0,
          contentHeight: rect?.height || 0,
          textStart: (content?.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
        };
      });

      const srcdocFrame = page.frames().find(frame => frame.url() === 'about:srcdoc');
      let inner = null;
      if (srcdocFrame) {
        try {
          inner = await srcdocFrame.evaluate(() => ({
            title: document.title,
            readyState: document.readyState,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            bodyTextStart: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
          }));
        } catch (error) {
          inner = { error: String(error) };
        }
      }

      const isModule = parent.gameContentHidden === false && parent.legacyFrameHidden === true && parent.errorHidden === true;
      const isNative = isModule && !srcdocFrame;
      const horizontalOverflow = srcdocFrame
        ? Number(inner?.scrollWidth || 0) > Number(inner?.clientWidth || 0) + 2
        : Number(parent.contentScrollWidth || 0) > Number(parent.contentClientWidth || 0) + 2;
      const blankContent = srcdocFrame
        ? !(inner?.bodyTextStart || '').trim()
        : !(parent.textStart || '').trim();

      const screenshotPath = path.join(dir, `game-${game}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.push({
        game,
        viewport,
        navigationError,
        isModule,
        isNative,
        horizontalOverflow,
        blankContent,
        parent,
        inner,
        consoleErrors,
        pageErrors,
        failedRequests: failedRequests.slice(0, 30),
        screenshotPath,
      });
      await context.close();
    }
  }

  fs.writeFileSync('qa-interaction/report.json', JSON.stringify(report, null, 2));
  const lines = ['# PR #23 P2 + native mobile visual QA', ''];
  for (const r of report) {
    lines.push(`## ${r.game} — ${r.viewport.width}×${r.viewport.height}`);
    lines.push(`- module: ${r.isModule ? 'yes' : 'NO'}`);
    lines.push(`- mode: ${r.isNative ? 'native module' : 'safe-wrapper srcdoc'}`);
    lines.push(`- horizontal overflow: ${r.horizontalOverflow ? 'YES' : 'no'}`);
    lines.push(`- blank content: ${r.blankContent ? 'YES' : 'no'}`);
    if (r.inner) lines.push(`- inner viewport/scroll: ${r.inner.clientWidth || '?'}×${r.inner.clientHeight || '?'} / ${r.inner.scrollWidth || '?'}×${r.inner.scrollHeight || '?'}`);
    lines.push(`- parent content width: ${r.parent.contentClientWidth}/${r.parent.contentScrollWidth}`);
    lines.push(`- console errors: ${r.consoleErrors.length}; page errors: ${r.pageErrors.length}; failed requests: ${r.failedRequests.length}`);
    if (r.navigationError) lines.push(`- navigation error: ${r.navigationError}`);
    lines.push(`- screenshot: ${r.screenshotPath}`);
    lines.push('');
  }
  fs.writeFileSync('qa-interaction/report.md', lines.join('\n'));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
