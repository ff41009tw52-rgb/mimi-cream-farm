const stylesheetUrl = new URL('./styles.css', import.meta.url).href;

const loadStylesheet = (root) => new Promise((resolve, reject) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesheetUrl;
  link.addEventListener('load', resolve, { once: true });
  link.addEventListener('error', () => reject(new Error('無法載入第 18 號遊戲樣式')), { once: true });
  root.append(link);
});

const resistanceSvg = '<svg viewBox="0 0 100 60" role="img" aria-label="槓桿上的抗力點"><line x1="10" y1="25" x2="90" y2="45" stroke="#334155" stroke-width="5" stroke-linecap="round"></line><polygon points="60,37 54,50 66,50" fill="#64748b"></polygon><rect x="70" y="28" width="16" height="16" fill="#8b5cf6" transform="rotate(14, 78, 36)"></rect><path d="M78,5 L78,22 M73,14 L78,22 L83,14" fill="none" stroke="#ef4444" stroke-width="3"></path></svg>';
const axleSvg = '<svg viewBox="0 0 100 100" role="img" aria-label="輪軸模型"><circle cx="50" cy="50" r="40" fill="#ef4444" stroke="#dc2626" stroke-width="3"></circle><circle cx="50" cy="50" r="15" fill="#b91c1c" stroke="#991b1b" stroke-width="2"></circle><circle cx="50" cy="50" r="5" fill="#1e293b"></circle><path d="M35,50 Q40,40 50,40 Q60,40 65,50" fill="none" stroke="#f8fafc" stroke-width="3" stroke-dasharray="3"></path></svg>';
const steeringWheelSvg = '<svg viewBox="0 0 100 60" role="img" aria-label="方向盤"><circle cx="50" cy="30" r="22" fill="none" stroke="#334155" stroke-width="4"></circle><circle cx="50" cy="30" r="5" fill="#334155"></circle><line x1="50" y1="34" x2="50" y2="52" stroke="#334155" stroke-width="4"></line><line x1="28" y1="30" x2="46" y2="30" stroke="#334155" stroke-width="4"></line><line x1="54" y1="30" x2="72" y2="30" stroke="#334155" stroke-width="4"></line></svg>';

const levels = [
  {
    title: '第一關：基礎槓桿',
    pairs: [
      { id: 1, name: '定滑輪', icon: '🎡', desc: '改變施力方向', theme: 'blue' },
      { id: 2, name: '動滑輪', icon: '🏗️', desc: '省力但費時', theme: 'orange' },
      { id: 3, name: '支點', icon: '📍', desc: '轉動不動點', theme: 'red' },
      { id: 4, name: '施力點', icon: '💪', desc: '手施加力量處', theme: 'green' },
      { id: 5, name: '抗力點', svg: resistanceSvg, desc: '承受重量處', theme: 'purple' },
      { id: 6, name: '省力槓桿', icon: '✂️', desc: '施力臂較長', theme: 'yellow' }
    ]
  },
  {
    title: '第二關：輪軸與臂長',
    pairs: [
      { id: 3, name: '支點', icon: '📍', desc: '旋轉中心點', theme: 'red' },
      { id: 9, name: '輪軸', svg: axleSvg, desc: '同軸轉動結構', theme: 'rose' },
      { id: 10, name: '施力在輪', svg: steeringWheelSvg, desc: '省力但費時', theme: 'emerald' },
      { id: 11, name: '施力在軸', icon: '🚁', desc: '費力但省時', theme: 'amber' },
      { id: 13, name: '施力臂', icon: '📏', desc: '支點到施力點', theme: 'blue' },
      { id: 14, name: '抗力臂', icon: '📐', desc: '支點到抗力點', theme: 'teal' }
    ]
  }
];

const shuffle = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export async function mount(root, context = {}) {
  if (!root || typeof root.replaceChildren !== 'function') {
    throw new TypeError('第 18 號遊戲需要有效的掛載容器');
  }

  root.replaceChildren();
  await loadStylesheet(root);

  const content = document.createElement('section');
  content.className = 'match18';
  content.setAttribute('aria-labelledby', 'match18-title');
  content.innerHTML = [
    '<div class="match18__shell">',
      '<header class="match18__header">',
        '<a class="match18__home" href="index.html" aria-label="回到科學農場首頁">🐾 回農場</a>',
        '<div><h1 id="match18-title">⚙️ 槓桿輪軸對對碰</h1><p>翻開兩張卡片，配對科學名詞與正確說明。</p></div>',
      '</header>',
      '<div id="match18-level" class="match18__level">第一關：基礎槓桿</div>',
      '<section class="match18__score" aria-label="遊戲資訊">',
        '<p>步數<strong id="match18-moves">0</strong></p>',
        '<p>配對<strong><span id="match18-matches">0</span>／6</strong></p>',
        '<p>時間<strong><span id="match18-timer">0</span> 秒</strong></p>',
      '</section>',
      '<p id="match18-live" class="match18__sr-only" role="status" aria-live="polite"></p>',
      '<div id="match18-grid" class="match18__grid" aria-label="配對卡片區"></div>',
      '<div class="match18__actions"><button id="match18-reset" type="button">重新開始</button></div>',
      '<div id="match18-modal" class="match18__modal" role="dialog" aria-modal="true" aria-labelledby="match18-modal-title" hidden>',
        '<div class="match18__dialog">',
          '<h2 id="match18-modal-title">🎉 挑戰成功！</h2>',
          '<p id="match18-final"></p>',
          '<button id="match18-next" class="match18__next" type="button">前往第二關</button>',
          '<button id="match18-replay" class="match18__replay" type="button">重玩本關</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
  root.append(content);

  const homeLink = content.querySelector('.match18__home');
  const levelIndicator = content.querySelector('#match18-level');
  const movesOutput = content.querySelector('#match18-moves');
  const matchesOutput = content.querySelector('#match18-matches');
  const timerOutput = content.querySelector('#match18-timer');
  const liveRegion = content.querySelector('#match18-live');
  const grid = content.querySelector('#match18-grid');
  const resetButton = content.querySelector('#match18-reset');
  const modal = content.querySelector('#match18-modal');
  const modalTitle = content.querySelector('#match18-modal-title');
  const finalStats = content.querySelector('#match18-final');
  const nextButton = content.querySelector('#match18-next');
  const replayButton = content.querySelector('#match18-replay');

  if (!homeLink || !levelIndicator || !movesOutput || !matchesOutput || !timerOutput || !liveRegion || !grid || !resetButton || !modal || !modalTitle || !finalStats || !nextButton || !replayButton) {
    throw new Error('第 18 號遊戲缺少必要元件');
  }

  if (context.homeUrl) homeLink.href = context.homeUrl;

  let levelIndex = 0;
  let flippedCards = [];
  let matchedCount = 0;
  let moves = 0;
  let seconds = 0;
  let timerId = 0;
  let mismatchId = 0;
  let locked = false;

  const announce = (message) => {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  };

  const stopTimers = () => {
    window.clearInterval(timerId);
    window.clearTimeout(mismatchId);
  };

  const startTimer = () => {
    window.clearInterval(timerId);
    seconds = 0;
    timerOutput.textContent = '0';
    timerId = window.setInterval(() => {
      seconds += 1;
      timerOutput.textContent = String(seconds);
    }, 1000);
  };

  const setCardFace = (card, isFaceUp) => {
    card.classList.toggle('is-flipped', isFaceUp);
    card.setAttribute('aria-pressed', String(isFaceUp));
    const label = isFaceUp ? card.dataset.faceLabel : '未翻開的配對卡片';
    card.setAttribute('aria-label', label);
  };

  const finishLevel = () => {
    window.clearInterval(timerId);
    const isFinalLevel = levelIndex === levels.length - 1;
    modalTitle.textContent = isFinalLevel ? '🏆 全關卡破完！' : '🎉 挑戰成功！';
    finalStats.textContent = seconds + ' 秒內完成，共 ' + moves + ' 次嘗試。';
    nextButton.textContent = isFinalLevel ? '回第一關挑戰' : '前往第二關';
    modal.hidden = false;
    nextButton.focus();
  };

  const resetFlipped = () => {
    flippedCards = [];
    locked = false;
  };

  const checkMatch = () => {
    locked = true;
    moves += 1;
    movesOutput.textContent = String(moves);
    const [first, second] = flippedCards;

    if (first.dataset.pairId === second.dataset.pairId) {
      matchedCount += 1;
      matchesOutput.textContent = String(matchedCount);
      [first, second].forEach((card) => {
        card.classList.add('is-matched');
        card.disabled = true;
        card.setAttribute('aria-label', '已配對：' + card.dataset.pairName);
      });
      announce('配對成功：' + first.dataset.pairName + '，目前完成 ' + matchedCount + ' 組。');
      resetFlipped();
      if (matchedCount === 6) finishLevel();
      return;
    }

    announce('配對不正確，卡片即將蓋回。');
    mismatchId = window.setTimeout(() => {
      setCardFace(first, false);
      setCardFace(second, false);
      resetFlipped();
      first.focus();
    }, 1200);
  };

  const flipCard = (card) => {
    if (locked || card.disabled || card.classList.contains('is-flipped')) return;
    setCardFace(card, true);
    flippedCards.push(card);
    announce('翻開：' + card.dataset.faceLabel);
    if (flippedCards.length === 2) checkMatch();
  };

  const createDeck = () => {
    const cards = [];
    levels[levelIndex].pairs.forEach((pair) => {
      const visual = pair.svg ? '<span class="match18__svg">' + pair.svg + '</span>' : '<span class="match18__icon" aria-hidden="true">' + pair.icon + '</span>';
      cards.push({ pair, type: 'clue', label: pair.desc, html: visual + '<span class="match18__clue">' + pair.desc + '</span>' });
      cards.push({ pair, type: 'term', label: pair.name, html: '<span class="match18__term">' + pair.name + '</span>' });
    });
    return shuffle(cards);
  };

  const initLevel = () => {
    stopTimers();
    modal.hidden = true;
    grid.replaceChildren();
    levelIndicator.textContent = levels[levelIndex].title;
    moves = 0;
    matchedCount = 0;
    flippedCards = [];
    locked = false;
    movesOutput.textContent = '0';
    matchesOutput.textContent = '0';

    createDeck().forEach((data) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'match18__card match18__card--' + data.pair.theme;
      card.dataset.pairId = String(data.pair.id);
      card.dataset.pairName = data.pair.name;
      card.dataset.faceLabel = data.label;
      card.setAttribute('aria-label', '未翻開的配對卡片');
      card.setAttribute('aria-pressed', 'false');
      card.innerHTML = '<span class="match18__card-inner"><span class="match18__front" aria-hidden="true">?</span><span class="match18__back">' + data.html + '</span></span>';
      card.addEventListener('click', () => flipCard(card));
      grid.append(card);
    });

    startTimer();
    announce(levels[levelIndex].title + '開始，共有十二張卡片。');
  };

  resetButton.addEventListener('click', initLevel);
  replayButton.addEventListener('click', initLevel);
  nextButton.addEventListener('click', () => {
    levelIndex = levelIndex === levels.length - 1 ? 0 : levelIndex + 1;
    initLevel();
  });

  initLevel();
}
