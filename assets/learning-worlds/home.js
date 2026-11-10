(() => {
  'use strict';
  const subject = document.body.dataset.subject;
  if (!['chinese', 'math'].includes(subject)) return;
  const labels = { '3': '三年級', '4': '四年級', '5': '五年級', '6': '六年級' };
  const worlds = [
    ['science', 'index.html', '自然科學', '科學農場', '♧'],
    ['chinese', 'chinese.html', '國語', '語文故事屋', '文'],
    ['math', 'math.html', '數學', '數學遊樂城', '＋']
  ];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  document.querySelectorAll('[data-world-nav]').forEach(nav => {
    worlds.forEach(([key, href, label, name, symbol]) => {
      const link = el('a', `world-link world-${key}`);
      link.href = href;
      if (key === subject) link.setAttribute('aria-current', 'page');
      const icon = el('span', 'world-symbol', symbol);
      icon.setAttribute('aria-hidden', 'true');
      const wording = el('span', 'world-wording');
      wording.append(el('strong', '', label), el('span', 'world-name', name));
      link.append(icon, wording);
      nav.append(link);
    });
  });
  // Only explicitly published entries with a safe destination receive a link.
  const safeUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  const isReady = game => game.status === 'published' && Boolean(safeUrl(game.url));
  const timestamp = game => Date.parse(game.publishedAt || '') || 0;
  const source = window.LEARNING_GAMES?.[subject];
  const games = Array.isArray(source) ? [...source].filter(g => g.status !== 'hidden').sort((a, b) =>
    Number(isReady(b)) - Number(isReady(a)) ||
    (isReady(a) && isReady(b) ? timestamp(b) - timestamp(a) : 0) ||
    (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id)
  ) : [];
  const makeCard = (game, featured) => {
    const card = el('article', `game-card${featured ? ' featured-card' : ''}`);
    card.dataset.gameId = game.id;
    const art = el('div', `card-art art-${game.artwork || 'book'}`);
    art.setAttribute('aria-hidden', 'true');
    if (safeUrl(game.cover)) {
      const img = el('img', 'game-cover'); img.src = game.cover; img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => art.replaceChildren(el('span', 'art-symbol', game.icon || '✦')), { once: true });
      art.append(img);
    } else {
      const decoration = el('span', 'art-shape');
      art.append(decoration, el('span', 'art-symbol', game.icon || '✦'));
    }
    const body = el('div', 'card-body');
    const meta = el('div', 'card-meta');
    meta.append(el('span', 'grade-label', game.grades.map(grade => labels[grade] || `${grade}年級`).join('・')));
    meta.append(el('span', 'availability', isReady(game) ? '可以玩' : '準備中'));
    const title = el('h3', '', game.title);
    title.id = `${featured ? 'featured' : 'all'}-${game.id}`;
    card.setAttribute('aria-labelledby', title.id);
    body.append(meta, title, el('p', 'game-topic', game.topic), el('p', 'game-description', game.description));
    if (isReady(game)) {
      const link = el('a', 'play-link', '開始玩 →');
      link.href = safeUrl(game.url); link.setAttribute('aria-label', `開始玩「${game.title}」`);
      body.append(link);
    }
    card.append(art, body);
    return card;
  };
  const grid = document.getElementById('all-games');
  const featuredGrid = document.getElementById('featured-games');
  const empty = document.getElementById('empty-state');
  const render = grade => {
    const selected = games.filter(g => grade === 'all' || g.grades.includes(grade));
    const featured = selected.filter(g => g.featured).slice(0, 2);
    grid.replaceChildren(...selected.map(g => makeCard(g, false)));
    featuredGrid.replaceChildren(...featured.map(g => makeCard(g, true)));
    document.getElementById('featured-empty').hidden = featured.length > 0;
    empty.hidden = selected.length > 0;
    const gradeName = grade === 'all' ? '全部年級' : labels[grade];
    if (!selected.length) {
      document.getElementById('empty-title').textContent = grade === 'all' ? '遊戲還在準備中' : `${gradeName}的遊戲還在準備中`;
    }
    const ready = selected.filter(isReady).length;
    const preparing = selected.length - ready;
    const counts = [];
    if (ready) counts.push(`${ready} 款可以玩`);
    if (preparing) counts.push(`${preparing} 款準備中`);
    document.getElementById('filter-status').textContent = `${gradeName}｜${counts.join('、') || '還沒有遊戲'}`;
    document.getElementById('game-count').textContent = selected.length ? `${selected.length} 款遊戲` : '';
  };
  const buttons = [...document.querySelectorAll('[data-grade]')];
  const selectGrade = grade => {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.grade === grade)));
    render(grade);
  };
  buttons.forEach(button => button.addEventListener('click', () => selectGrade(button.dataset.grade)));
  document.getElementById('show-all').addEventListener('click', () => {
    selectGrade('all');
    buttons[0].focus();
  });
  if (!Array.isArray(source)) {
    document.getElementById('filter-status').textContent = '遊戲清單沒載入。請重新整理頁面再試一次。';
  } else selectGrade('all');
})();
