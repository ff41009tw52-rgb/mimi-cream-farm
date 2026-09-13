(() => {
  'use strict';

  const shell = document.getElementById('game-shell');
  const gameContent = document.getElementById('game-content');
  const loadingPanel = document.getElementById('loading-panel');
  const loadingText = document.getElementById('loading-text');
  const errorPanel = document.getElementById('error-panel');
  const errorText = document.getElementById('error-text');
  const skipLink = document.getElementById('skip-link');

  const normalizeGameNumber = (value) => {
    const trimmed = String(value || '').trim();
    return /^\d{1,2}$/.test(trimmed) ? trimmed.padStart(2, '0') : '';
  };

  const showError = (message) => {
    document.title = '遊戲暫時無法載入｜橘咪咪與白奶油的科學農場';
    shell?.setAttribute('aria-busy', 'false');
    if (loadingPanel) loadingPanel.hidden = true;
    if (gameContent) gameContent.hidden = true;
    if (skipLink) skipLink.hidden = true;
    if (errorText) errorText.textContent = message;
    if (errorPanel) errorPanel.hidden = false;
  };

  if (!shell || !gameContent || !loadingPanel || !loadingText || !errorPanel || !errorText || !skipLink) return;

  const gameNumber = normalizeGameNumber(new URLSearchParams(window.location.search).get('game'));
  const games = Array.isArray(window.FARM_GAMES) ? window.FARM_GAMES : [];
  const game = games.find((item) => item.gameNumber === gameNumber);

  if (!gameNumber) {
    showError('網址缺少正確的遊戲編號，請回到農場重新選擇遊戲。');
    return;
  }

  if (!game?.moduleUrl) {
    showError(`目前找不到編號 ${gameNumber} 的遊戲，請回到農場重新選擇。`);
    return;
  }

  const plainTitle = String(game.title || `遊戲 ${gameNumber}`)
    .replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '');
  document.title = `${plainTitle}｜橘咪咪與白奶油的科學農場`;
  loadingText.textContent = `正在啟動「${plainTitle}」…`;
  gameContent.setAttribute('aria-label', `${plainTitle}互動遊戲`);

  const start = async () => {
    try {
      const gameModule = await import(new URL(game.moduleUrl, document.baseURI).href);
      if (typeof gameModule.mount !== 'function') throw new TypeError('遊戲模組缺少 mount()');

      gameContent.replaceChildren();
      await gameModule.mount(gameContent, {
        game,
        gameNumber,
        homeUrl: new URL('index.html', document.baseURI).href,
      });

      shell.setAttribute('aria-busy', 'false');
      loadingPanel.hidden = true;
      errorPanel.hidden = true;
      gameContent.hidden = false;
      skipLink.hidden = false;
      skipLink.href = '#game-content';
    } catch (error) {
      console.error('[Science Farm] Module load failed.', error);
      gameContent.replaceChildren();
      showError(`「${plainTitle}」暫時無法載入，請重新整理或回到農場選擇其他遊戲。`);
    }
  };

  start();
})();
