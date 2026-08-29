(() => {
  'use strict';

  const shell = document.getElementById('game-shell');
  const frame = document.getElementById('game-frame');
  const loadingPanel = document.getElementById('loading-panel');
  const loadingText = document.getElementById('loading-text');
  const errorPanel = document.getElementById('error-panel');
  const errorText = document.getElementById('error-text');

  const normalizeGameNumber = (value) => {
    const trimmed = String(value || '').trim();
    return /^\d{1,2}$/.test(trimmed) ? trimmed.padStart(2, '0') : '';
  };

  const showError = (message) => {
    document.title = '找不到遊戲｜橘咪咪與白奶油的科學農場';
    shell?.setAttribute('aria-busy', 'false');
    if (loadingPanel) loadingPanel.hidden = true;
    if (frame) frame.hidden = true;
    if (errorText) errorText.textContent = message;
    if (errorPanel) errorPanel.hidden = false;
  };

  if (!shell || !frame || !loadingPanel || !loadingText || !errorPanel || !errorText) {
    return;
  }

  const gameNumber = normalizeGameNumber(new URLSearchParams(window.location.search).get('game'));
  const games = Array.isArray(window.FARM_GAMES) ? window.FARM_GAMES : [];
  const game = games.find((item) => item.gameNumber === gameNumber);

  if (!gameNumber) {
    showError('網址缺少正確的遊戲編號，請回到農場重新選擇遊戲。');
    return;
  }

  if (!game?.legacyUrl) {
    showError(`目前找不到編號 ${gameNumber} 的遊戲，請回到農場重新選擇。`);
    return;
  }

  const plainTitle = String(game.title || `遊戲 ${gameNumber}`)
    .replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '');
  document.title = `${plainTitle}｜橘咪咪與白奶油的科學農場`;
  loadingText.textContent = `正在載入「${plainTitle}」…`;
  frame.title = `${plainTitle}互動遊戲`;

  frame.addEventListener('load', () => {
    shell.setAttribute('aria-busy', 'false');
    loadingPanel.hidden = true;
    frame.hidden = false;
  }, { once: true });

  frame.src = game.legacyUrl;
})();
