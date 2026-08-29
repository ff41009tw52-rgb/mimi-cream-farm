(() => {
  'use strict';

  const getGames = () => Array.isArray(window.FARM_GAMES) ? window.FARM_GAMES : [];

  const createIcon = (className) => {
    const icon = document.createElement('i');
    icon.className = className || 'fas fa-flask';
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  };

  const createGameCard = (game) => {
    const card = document.createElement('div');
    card.className = 'science-card';
    card.setAttribute('role', 'listitem');
    card.dataset.grades = game.grades.join(',');
    if (game.subject) card.dataset.subject = game.subject;
    card.dataset.gameId = game.id;

    const header = document.createElement('div');
    header.className = 'card-icon-header';

    const badge = document.createElement('span');
    badge.className = 'grade-badge';
    badge.textContent = game.gradeLabel;
    header.append(badge, createIcon(game.icon));

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.id = `${game.id}-title`;
    title.textContent = game.title;
    card.setAttribute('aria-labelledby', title.id);

    const description = document.createElement('p');
    description.className = 'desc';
    description.textContent = game.description;
    body.append(title, description);

    const link = document.createElement('a');
    link.href = game.url;
    link.className = 'open-btn';
    link.setAttribute(
      'aria-label',
      `${game.actionLabel}：${String(game.title).replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '')}`
    );
    link.append(document.createTextNode(`${game.actionLabel} `), createIcon(game.actionIcon));

    card.append(header, body, link);
    return card;
  };

  const renderGames = () => {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    const games = getGames();
    if (!games.length) {
      console.warn('[Science Farm] No game data found. Check that games-data.js loads before games-renderer.js.');
      const message = document.createElement('p');
      message.textContent = '遊戲清單暫時無法載入，請重新整理頁面。';
      grid.replaceChildren(message);
      return;
    }

    grid.setAttribute('role', 'list');
    const fragment = document.createDocumentFragment();
    games.forEach((game) => fragment.appendChild(createGameCard(game)));
    grid.replaceChildren(fragment);

    const status = document.getElementById('filter-status');
    if (status) status.textContent = `目前顯示全部 ${games.length} 個遊戲。`;
  };

  const updateFilterStatus = (selectedGrade, visibleCount) => {
    const status = document.getElementById('filter-status');
    if (!status) return;

    const label = selectedGrade === 'all' ? '全部' : `${selectedGrade}年級`;
    status.textContent = `目前顯示${label} ${visibleCount} 個遊戲。`;
  };

  const setupGradeFilters = () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!filterButtons.length) return;

    filterButtons.forEach((button) => {
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
      button.addEventListener('click', () => {
        filterButtons.forEach((item) => {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        const selectedGrade = button.dataset.filter;
        let visibleCount = 0;
        document.querySelectorAll('#game-grid .science-card').forEach((card) => {
          const grades = (card.dataset.grades || '').split(',').filter(Boolean);
          const shouldShow = selectedGrade === 'all' || grades.includes(selectedGrade);
          card.classList.toggle('hidden', !shouldShow);
          if (shouldShow) visibleCount += 1;
        });
        updateFilterStatus(selectedGrade, visibleCount);
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    setupGradeFilters();
  });
})();
