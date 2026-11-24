(() => {
  'use strict';

  const missions = [
    {
      title: '檸檬氣泡飲',
      notes: [
        '我挑了一顆圓圓的檸檬，切開後，淡淡的果香飄了出來。',
        '我先把檸檬汁擠進杯裡，再倒入氣泡水。',
        '氣泡爬上杯緣時，我才放進冰塊，聽見杯裡叮噹作響。',
        '喝一口，舌尖先嚐到酸味，接著是淡淡的甜味。'
      ],
      steps: ['擠檸檬汁', '倒氣泡水', '放冰塊'],
      start: [2, 0, 1],
      question: '哪一句寫出檸檬汁和氣泡水的先後？',
      evidence: 1,
      result: '「先擠進杯裡，再倒入氣泡水」交代了前兩步。「才放進冰塊」提示冰塊最後加。',
      positions: [1, 2]
    },
    {
      title: '草莓優格杯',
      notes: [
        '我先在杯底鋪上切好的草莓，杯底像鋪了一層紅色的小石子。',
        '草莓放好後，我舀入優格，讓白色的優格蓋住草莓。',
        '燕麥脆片要等優格放好才撒上去，吃起來才有喀滋聲。',
        '我用透明的杯子，讓大家都能看見一層紅、一層白。'
      ],
      steps: ['鋪草莓', '舀入優格', '撒燕麥脆片'],
      start: [1, 2, 0],
      question: '哪一句能說明為什麼燕麥脆片要放在優格之後？',
      evidence: 2,
      result: '「要等優格放好才撒」交代了最後兩步的先後。「喀滋聲」是對吃起來的聲音所做的描寫。',
      positions: [2, 3]
    },
    {
      title: '黃瓜飯糰',
      notes: [
        '我把手洗乾淨，準備一碗飯、小黃瓜和海苔。',
        '我把飯攤平，放上切好的小黃瓜，再把飯捏起來。',
        '飯糰捏好後，我才在外面包上海苔。',
        '咬下一口，小黃瓜脆脆的，海苔也帶著淡淡的香氣。'
      ],
      steps: ['攤平飯', '放小黃瓜', '把飯捏成團', '包上海苔'],
      start: [3, 1, 0, 2],
      question: '哪一句說明捏飯糰和包海苔的先後？',
      evidence: 2,
      result: '「捏好後，才……包上」把兩個動作連起來。讀到「後」和「才」，就知道海苔該放在第幾步。',
      positions: [3, 4]
    }
  ];

  const app = document.querySelector('#recipe-app');
  const practice = document.querySelector('#sensory-practice');
  const storyMode = document.querySelector('#recipe-mode');
  const practiceMode = document.querySelector('#sensory-mode');
  const smaller = document.querySelector('#recipe-smaller');
  const larger = document.querySelector('#recipe-larger');
  let round = 0;
  let arrangement;
  let chosen;
  let quote;
  let completed;
  let dragged = null;
  let fontSize = 1;

  const find = (selector) => app.querySelector(selector);
  const mission = () => missions[round];

  function setMode(showStory) {
    app.hidden = !showStory;
    practice.hidden = showStory;
    storyMode.setAttribute('aria-pressed', String(showStory));
    practiceMode.setAttribute('aria-pressed', String(!showStory));
    window.gameGuide?.mode(showStory?'recipe':'sensory');
  }

  function resizeText(change) {
    fontSize = Math.min(1.6, Math.max(1, Math.round((fontSize + change) * 10) / 10));
    document.body.style.setProperty('--recipe-scale', fontSize);
    smaller.disabled = fontSize === 1;
    larger.disabled = fontSize === 1.6;
  }

  function begin(focus = false) {
    const current = mission();
    window.gameGuide?.cue('recipe','翻到「'+current.title+'」。幫我把這一頁的步驟排回去。');
    arrangement = [...current.start];
    chosen = null;
    quote = null;
    completed = false;
    app.innerHTML = `
      <article class="recipe-book">
        <div class="recipe-page">
          <div class="recipe-page-head"><h2 tabindex="-1">${current.title}</h2><span>${round + 1} / ${missions.length}</span></div>
          <h3>料理手帳</h3>
          <p class="recipe-instruction">${current.question} 點選一句畫上底線。</p>
          <div class="recipe-quotes" role="group" aria-label="手帳裡的線索">
            ${current.notes.map((note, i) => `<button type="button" data-note="${i}" aria-pressed="false">${note}</button>`).join('')}
          </div>
        </div>
        <div class="recipe-page recipe-work">
          <h3>料理步驟</h3>
          <p class="recipe-instruction">依手帳排順序。點兩張卡互換，也可以拖曳。</p>
          <ol class="recipe-steps"></ol>
          <div class="recipe-actions">
            <button type="button" id="recipe-reset">重排</button>
            <button type="button" id="recipe-check">檢查手帳</button>
            <button type="button" id="recipe-next" hidden>${round === missions.length - 1 ? '再玩一次' : '讀下一頁'}</button>
          </div>
          <p class="recipe-feedback" role="status" aria-live="polite"></p>
        </div>
      </article>`;
    drawSteps();
    if (focus) find('h2').focus();
  }

  function drawSteps(focusIndex) {
    find('.recipe-steps').innerHTML = arrangement.map((step, i) => `
      <li><button type="button" data-step="${i}" draggable="${!completed}" aria-pressed="${chosen === i}" ${completed ? 'disabled' : ''}>
        <span class="step-marker" aria-hidden="true">${i + 1}</span><span>${mission().steps[step]}</span>
      </button></li>`).join('');
    if (focusIndex !== undefined) find(`[data-step="${focusIndex}"]`)?.focus({ preventScroll: true });
  }

  function say(message, state = '') {
    const feedback = find('.recipe-feedback');
    feedback.dataset.state = state;
    feedback.textContent = message;
  }

  function exchange(from, to) {
    [arrangement[from], arrangement[to]] = [arrangement[to], arrangement[from]];
    chosen = null;
    drawSteps(to);
    say(`已交換第 ${from + 1} 步和第 ${to + 1} 步。`);
  }

  function check() {
    const current = mission();
    const stepsCorrect = arrangement.every((step, position) => step === position);
    if (!stepsCorrect) {
      const first = arrangement.findIndex((step, position) => step !== position);
      say(`從第 ${first + 1} 步開始和手帳不同。再讀寫到先後順序的地方，交換那兩張卡。`, 'retry');
      return;
    }
    if (quote !== current.evidence) {
      const [before, after] = current.positions;
      say(`步驟排好了。請在左頁找出一句，同時寫到第 ${before} 步和第 ${after} 步的先後。`, 'retry');
      return;
    }

    completed = true;
    window.gameGuide?.cue('recipe',round===missions.length-1?'三頁食譜都回到手帳裡了。今天的料理屋可以開門了！':'「'+current.title+'」這一頁修好了，下一道料理還在等。');
    drawSteps();
    for (const note of app.querySelectorAll('[data-note]')) note.disabled = true;
    find('#recipe-reset').hidden = true;
    find('#recipe-check').hidden = true;
    find('#recipe-next').hidden = false;
    say(current.result, 'complete');
    find('#recipe-next').focus({ preventScroll: true });
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.note !== undefined) {
      quote = Number(button.dataset.note);
      for (const note of app.querySelectorAll('[data-note]')) note.setAttribute('aria-pressed', String(note === button));
      say('線索已畫上底線。');
    } else if (button.dataset.step !== undefined) {
      const index = Number(button.dataset.step);
      if (chosen === null || chosen === index) {
        chosen = chosen === index ? null : index;
        drawSteps(index);
        say(chosen === null ? '已取消選取。' : '選另一張步驟卡來交換。');
      } else {
        exchange(chosen, index);
      }
    } else if (button.id === 'recipe-check') {
      check();
    } else if (button.id === 'recipe-reset') {
      begin(true);
    } else if (button.id === 'recipe-next') {
      round = (round + 1) % missions.length;
      begin(true);
    }
  });

  app.addEventListener('dragstart', (event) => {
    const step = event.target.closest('[data-step]');
    if (completed || !step) return;
    dragged = Number(step.dataset.step);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', step.textContent.trim());
  });
  app.addEventListener('dragover', (event) => {
    if (dragged === null || !event.target.closest('[data-step]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });
  app.addEventListener('drop', (event) => {
    const step = event.target.closest('[data-step]');
    if (dragged === null || !step) return;
    event.preventDefault();
    const to = Number(step.dataset.step);
    if (dragged !== to) exchange(dragged, to);
    dragged = null;
  });
  app.addEventListener('dragend', () => { dragged = null; });

  storyMode.addEventListener('click', () => setMode(true));
  practiceMode.addEventListener('click', () => setMode(false));
  smaller.addEventListener('click', () => resizeText(-.2));
  larger.addEventListener('click', () => resizeText(.2));
  begin();
})();
