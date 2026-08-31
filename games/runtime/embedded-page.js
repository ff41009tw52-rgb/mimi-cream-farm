const escapeAttribute = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const injectBase = (html, baseUrl) => {
  const baseTag = '<base href="' + escapeAttribute(baseUrl) + '">';
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (headTag) => headTag + '\n' + baseTag);
  }
  return baseTag + html;
};

export function mountEmbeddedPage(root, options = {}) {
  if (!root || typeof root.replaceChildren !== 'function') {
    return Promise.reject(new TypeError('遊戲需要有效的掛載容器'));
  }

  const html = String(options.html || '');
  const baseUrl = String(options.baseUrl || document.baseURI);
  const title = String(options.title || '科學農場互動遊戲');

  if (!html.trim()) {
    return Promise.reject(new Error('遊戲模組沒有可載入的內容'));
  }

  root.replaceChildren();

  const style = document.createElement('style');
  style.textContent = [
    '.embedded-game-module { width: 100%; height: 100%; min-height: 100%; }',
    '.embedded-game-module__frame { display: block; width: 100%; height: 100%; min-height: 100%; border: 0; background: #fff; }'
  ].join('');

  const wrapper = document.createElement('div');
  wrapper.className = 'embedded-game-module';

  const frame = document.createElement('iframe');
  frame.className = 'embedded-game-module__frame';
  frame.title = title;
  frame.setAttribute('allow', 'fullscreen');
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

  wrapper.append(frame);
  root.append(style, wrapper);

  return new Promise((resolve, reject) => {
    frame.addEventListener('load', () => resolve(), { once: true });
    frame.addEventListener('error', () => reject(new Error('封裝遊戲頁面載入失敗')), { once: true });
    frame.srcdoc = injectBase(html, baseUrl);
  });
}
