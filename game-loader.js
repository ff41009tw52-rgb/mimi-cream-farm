(() => {
  'use strict';

  const shell = document.getElementById('game-shell');
  const frame = document.getElementById('game-frame');
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
    document.title = '找不到遊戲｜橘咪咪與白奶油的科學農場';
    shell?.setAttribute('aria-busy', 'false');
    if (loadingPanel) loadingPanel.hidden = true;
    if (gameContent) gameContent.hidden = true;
    if (frame) frame.hidden = true;
    if (skipLink) skipLink.hidden = true;
    if (errorText) errorText.textContent = message;
    if (errorPanel) errorPanel.hidden = false;
  };

  if (
    !shell ||
    !frame ||
    !gameContent ||
    !loadingPanel ||
    !loadingText ||
    !errorPanel ||
    !errorText ||
    !skipLink
  ) {
    return;
  }

  const gameNumber = normalizeGameNumber(new URLSearchParams(window.location.search).get('game'));
  const games = Array.isArray(window.FARM_GAMES) ? window.FARM_GAMES : [];
  const game = games.find((item) => item.gameNumber === gameNumber);

  if (!gameNumber) {
    showError('網址缺少正確的遊戲編號，請回到農場重新選擇遊戲。');
    return;
  }

  if (!game || (!game.moduleUrl && !game.legacyUrl)) {
    showError(`目前找不到編號 ${gameNumber} 的遊戲，請回到農場重新選擇。`);
    return;
  }

  const plainTitle = String(game.title || `遊戲 ${gameNumber}`)
    .replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '');
  document.title = `${plainTitle}｜橘咪咪與白奶油的科學農場`;
  loadingText.textContent = `正在載入「${plainTitle}」…`;
  frame.title = `${plainTitle}互動遊戲`;
  gameContent.setAttribute('aria-label', `${plainTitle}互動遊戲`);

  const finishLoading = (target, targetId) => {
    shell.setAttribute('aria-busy', 'false');
    loadingPanel.hidden = true;
    errorPanel.hidden = true;
    target.hidden = false;
    skipLink.hidden = false;
    skipLink.href = `#${targetId}`;
  };

  const loadLegacyGame = () => {
    if (!game.legacyUrl) {
      showError(`「${plainTitle}」目前沒有可用的相容版本，請回到農場重新選擇。`);
      return;
    }

    gameContent.hidden = true;
    gameContent.replaceChildren();

    frame.addEventListener('load', () => {
      finishLoading(frame, 'game-frame');
    }, { once: true });

    frame.src = game.legacyUrl;
  };

  const loadModuleGame = async () => {
    if (!game.moduleUrl) {
      return false;
    }

    loadingText.textContent = `正在啟動「${plainTitle}」新版介面…`;

    try {
      const moduleUrl = new URL(game.moduleUrl, document.baseURI).href;
      const gameModule = await import(moduleUrl);

      if (typeof gameModule.mount !== 'function') {
        throw new TypeError('遊戲模組缺少 mount()');
      }

      gameContent.replaceChildren();
      await gameModule.mount(gameContent, {
        game,
        gameNumber,
        homeUrl: new URL('index.html', document.baseURI).href,
      });

      frame.hidden = true;
      frame.removeAttribute('src');
      finishLoading(gameContent, 'game-content');
      return true;
    } catch (error) {
      console.warn('[Science Farm] Module load failed; using legacy page.', error);
      gameContent.hidden = true;
      gameContent.replaceChildren();
      loadingText.textContent = '新版載入失敗，正在改用相容模式…';
      return false;
    }
  };

  const start = async () => {
    const moduleLoaded = await loadModuleGame();
    if (!moduleLoaded) {
      loadLegacyGame();
    }
  };

  start();
})();
