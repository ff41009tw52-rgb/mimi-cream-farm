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
    title.textContent = game.title;

    const description = document.createElement('p');
    description.className = 'desc';
    description.textContent = game.description;
    body.append(title, description);

    const link = document.createElement('a');
    link.href = game.url;
    link.className = 'open-btn';
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
      return;
    }

    const fragment = document.createDocumentFragment();
    games.forEach((game) => fragment.appendChild(createGameCard(game)));
    grid.replaceChildren(fragment);
  };

  const setupGradeFilters = () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!filterButtons.length) return;

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');

        const selectedGrade = button.dataset.filter;
        document.querySelectorAll('#game-grid .science-card').forEach((card) => {
          const grades = (card.dataset.grades || '').split(',').filter(Boolean);
          const shouldShow = selectedGrade === 'all' || grades.includes(selectedGrade);
          card.classList.toggle('hidden', !shouldShow);
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    setupGradeFilters();
  });
})();
