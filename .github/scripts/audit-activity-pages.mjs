import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'https://ff41009tw52-rgb.github.io/mimi-cream-farm/';
const pinnedBabelVersion = process.env.PINNED_BABEL_VERSION || '';
const indexHtml = fs.readFileSync('index.html', 'utf8');
const links = [...indexHtml.matchAll(/<a\s+href="([^"#?]+\.html)"[^>]*class="open-btn"/g)]
  .map((match) => match[1]);
const pages = [...new Set(['index.html', ...links])];

fs.mkdirSync('artifacts/page-audit', { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const filename of pages) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const resourceResponses = [];

  if (pinnedBabelVersion) {
    await page.route('https://unpkg.com/@babel/standalone/babel.min.js', (route) => {
      route.continue({ url: `https://unpkg.com/@babel/standalone@${pinnedBabelVersion}/babel.min.js` });
    });
  }

  page.on('pageerror', (error) => {
    pageErrors.push({ message: error.message, stack: error.stack || '' });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({ text: message.text(), location: message.location() });
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.url()} :: ${failure?.errorText || 'unknown error'}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (/(tailwindcss|unpkg\.com|react-dom|babel)/i.test(url)) {
      resourceResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });

  const url = new URL(filename, baseUrl).href;
  let responseStatus = null;
  let navigationError = null;

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    responseStatus = response?.status() ?? null;
    await page.waitForTimeout(2500);
  } catch (error) {
    navigationError = error.message;
  }

  const view = await page.evaluate(() => {
    const root = document.getElementById('root');
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const allButtons = [...document.querySelectorAll('a, button')]
      .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return {
      title: document.title,
      rootExists: Boolean(root),
      rootChildCount: root ? root.childElementCount : null,
      bodyText,
      controls: allButtons.slice(0, 12),
    };
  }).catch(() => ({ title: '', rootExists: false, rootChildCount: null, bodyText: '', controls: [] }));

  const issues = [];
  if (navigationError) issues.push(`navigation error: ${navigationError}`);
  if (responseStatus && responseStatus >= 400) issues.push(`HTTP ${responseStatus}`);
  if (pageErrors.length) issues.push(...pageErrors.map((error) => `page error: ${error.message}`));
  if (view.rootExists && view.rootChildCount === 0) issues.push('empty #root: React content did not render');
  if (/^(🏡\s*)?回到?農場首頁$|^🐾\s*回農場$/.test(view.bodyText)) {
    issues.push('only home button is visible');
  }

  const item = {
    filename,
    url,
    responseStatus,
    title: view.title,
    rootExists: view.rootExists,
    rootChildCount: view.rootChildCount,
    bodyText: view.bodyText.slice(0, 240),
    controls: view.controls,
    pageErrors,
    consoleErrors,
    failedRequests,
    resourceResponses,
    issues,
  };
  results.push(item);

  if (issues.length || consoleErrors.length || failedRequests.length) {
    await page.screenshot({ path: path.join('artifacts/page-audit', filename.replace(/[^a-z0-9]+/gi, '_') + '.png'), fullPage: true }).catch(() => {});
  }
  await page.close();
}

await browser.close();

const failed = results.filter((item) => item.issues.length || item.consoleErrors.length || item.failedRequests.length);
const report = {
  baseUrl,
  pinnedBabelVersion: pinnedBabelVersion || null,
  totalPages: results.length,
  pagesWithProblems: failed.length,
  failed,
  results,
};
fs.writeFileSync('artifacts/page-audit/report.json', JSON.stringify(report, null, 2));

console.log(`AUDIT_TOTAL=${results.length}`);
console.log(`AUDIT_PROBLEMS=${failed.length}`);
for (const item of failed) {
  console.log(`\n[${item.filename}]`);
  for (const issue of item.issues) console.log(`ISSUE: ${issue}`);
  for (const issue of item.pageErrors) console.log(`PAGE_ERROR: ${issue.message}`);
  for (const issue of item.consoleErrors.slice(0, 5)) console.log(`CONSOLE_ERROR: ${issue.text}`);
  for (const issue of item.failedRequests.slice(0, 5)) console.log(`REQUEST_FAILED: ${issue}`);
}

if (failed.length) process.exitCode = 1;
