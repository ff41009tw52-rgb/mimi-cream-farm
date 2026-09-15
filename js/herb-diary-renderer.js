(() => {
  'use strict';

  const FALLBACK_PAYLOAD = {
    currentDayKey: 'week1-wednesday',
    availableDayKeys: ['week1-wednesday'],
    days: {
      'week1-wednesday': {
        dayKey: 'week1-wednesday',
        week: 1,
        weekday: '星期三',
        eyebrow: '放學後・想一想',
        heading: '今天我想記住的是……',
        bodyParagraphs: [
          '今天最讓我記住的，不只是拿到迷迭香。',
          '大家看到植物卡時的反應都不太一樣。有人先注意名字，有人先看植物長什麼樣，也有人已經開始想著之後要查什麼了。',
          '原來大家第一眼注意到的東西，真的差很多。'
        ],
        promptLead: '今天我想先寫這一句……',
        inputPlaceholder: '選一句開始，也可以自己寫。',
        events: [
          {
            eventId: 'day1-first-herb-garden',
            image: 'picture/herb-game/diary/day1-garden-memory.png',
            imageAlt: '香草園回憶示意插圖',
            diaryTitle: '第一次進香草園',
            defaultNote: '第一次走進香草園。\n原來不能看到綠色的就直接拔。',
            eventOrder: 1
          },
          {
            eventId: 'day1-service-team-introduction',
            image: 'picture/herb-game/diary/day1-service-team-memory.png',
            imageAlt: '學生與兩位老師集合的回憶示意插圖，非正式角色肖像',
            diaryTitle: '認識香草服務隊',
            defaultNote: '一口氣認識了好多人。\n名字可能還要慢慢記。',
            eventOrder: 2
          }
        ],
        reflections: [
          { id: 'remember-names', prompt: '今天認識的人好多，我想慢慢把大家的名字記起來。' },
          { id: 'different-focus', prompt: '大家注意的東西都不一樣，我覺得很有趣。' },
          { id: 'remember-rosemary', prompt: '迷迭香……這個名字，今天大概真的記住了。' }
        ],
        state: {
          eventNotes: {},
          selectedPromptId: null,
          customReflection: '',
          completed: false,
          view: 'open'
        }
      }
    }
  };

  const game = document.getElementById('diaryGame');
  const eventGrid = document.getElementById('eventGrid');
  const choicesEl = document.getElementById('choices');
  const reflectionBox = document.getElementById('reflectionBox');
  const selectedPromptText = document.getElementById('selectedPromptText');
  const customReflectionInput = document.getElementById('customReflectionInput');
  const pageWhisper = document.getElementById('pageWhisper');
  const spread = document.getElementById('spread');
  const controls = document.getElementById('controls');
  const closedUI = document.getElementById('closedUI');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const reopenBtn = document.getElementById('reopenBtn');
  const continueBtn = document.getElementById('continueBtn');
  const dayLabel = document.getElementById('dayLabel');
  const eyebrow = document.getElementById('diaryEyebrow');
  const reflectionHeading = document.getElementById('reflectionHeading');
  const dailyMemory = document.getElementById('dailyMemory');
  const choiceTitle = document.getElementById('choiceTitle');
  let payload = structuredCloneSafe(FALLBACK_PAYLOAD);
  let activeDayKey = payload.currentDayKey;
  let whisperTimer = 0;

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function dayData() {
    return payload.days?.[activeDayKey] || null;
  }

  function dayState() {
    const day = dayData();
    if (!day) return null;
    const incoming = day.state || {};
    day.state = {
      eventNotes: { ...(incoming.eventNotes || {}) },
      selectedPromptId: incoming.selectedPromptId ?? null,
      customReflection: String(incoming.customReflection || ''),
      completed: Boolean(incoming.completed),
      view: incoming.view === 'closed' ? 'closed' : 'open'
    };
    return day.state;
  }

  function insertLineBreak(editable, event) {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement('br');
    const anchor = document.createTextNode('\u200b');
    range.insertNode(br);
    br.after(anchor);
    const caret = document.createRange();
    caret.setStart(anchor, 1);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertLineBreak', data: '\n' }));
  }

  function insertPlainText(event) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    event.currentTarget.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
  }

  function editableText(element) {
    return (element.innerText ?? element.textContent ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\u200b/g, '');
  }

  function emit(type, extra = {}) {
    const day = dayData();
    if (!day) return;
    const detail = {
      dayKey: activeDayKey,
      state: structuredCloneSafe(dayState()),
      ...extra
    };
    window.parent?.postMessage({ type, detail }, '*');
    game.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  }

  function renderEvents() {
    const day = dayData();
    const state = dayState();
    eventGrid.replaceChildren();
    (day?.events || []).slice(0, 2).forEach((event, index) => {
      const article = document.createElement('article');
      article.className = `event event-slot-${index + 1}`;
      article.style.setProperty('--delay', `${0.12 + index * 0.14}s`);

      const mat = document.createElement('div');
      mat.className = 'photo-mat';
      const img = document.createElement('img');
      img.src = event.image || '';
      img.alt = event.imageAlt || `${event.diaryTitle || '今日事件'}回憶照片`;
      img.draggable = false;
      const heading = document.createElement('h3');
      heading.textContent = event.diaryTitle || '今天的回憶';
      const tape = document.createElement('span');
      tape.className = 'photo-tape';
      tape.setAttribute('aria-hidden', 'true');
      mat.append(img, heading);
      article.append(mat, tape);

      const note = document.createElement('p');
      note.className = 'memory-note';
      note.contentEditable = 'true';
      note.setAttribute('role', 'textbox');
      note.setAttribute('aria-label', `${event.diaryTitle || '今日事件'}筆記`);
      note.setAttribute('spellcheck', 'false');
      note.dataset.eventId = event.eventId;
      note.textContent = Object.prototype.hasOwnProperty.call(state.eventNotes, event.eventId)
        ? state.eventNotes[event.eventId]
        : (event.defaultNote || '');
      note.addEventListener('keydown', event => {
        if (event.key === 'Enter') insertLineBreak(note, event);
      });
      note.addEventListener('input', () => {
        state.eventNotes[event.eventId] = editableText(note);
        state.completed = false;
        emit('herb:diary-state');
      });
      note.addEventListener('paste', insertPlainText);
      article.append(note);
      eventGrid.append(article);
    });
  }

  function renderChoices() {
    const day = dayData();
    const state = dayState();
    choicesEl.replaceChildren();
    (day?.reflections || []).slice(0, 3).forEach((reflection, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.promptId = reflection.id;
      button.setAttribute('aria-pressed', String(state.selectedPromptId === reflection.id));
      button.setAttribute('aria-controls', 'reflectionBox');
      const label = document.createElement('span');
      label.className = 'choice-label';
      label.textContent = reflection.prompt;
      button.append(label);
      button.addEventListener('click', () => selectPrompt(reflection.id));
      choicesEl.append(button);
    });

    const selfButton = document.createElement('button');
    selfButton.type = 'button';
    selfButton.className = 'choice choice-self';
    selfButton.dataset.promptId = 'custom';
    selfButton.setAttribute('aria-pressed', String(state.selectedPromptId === 'custom'));
    selfButton.setAttribute('aria-controls', 'reflectionBox');
    selfButton.textContent = '我想自己寫';
    selfButton.addEventListener('click', () => selectPrompt('custom'));
    choicesEl.append(selfButton);

    const buttons = [...choicesEl.querySelectorAll('button')];
    buttons.forEach((button, index) => button.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[target].focus();
    }));
  }

  function selectedPrompt() {
    const state = dayState();
    if (!state || state.selectedPromptId === 'custom') return '';
    return dayData()?.reflections?.find(item => item.id === state.selectedPromptId)?.prompt || '';
  }

  function syncReflection({ preserveInput = false } = {}) {
    const state = dayState();
    selectedPromptText.textContent = selectedPrompt();
    if (!preserveInput) customReflectionInput.textContent = state.customReflection;
    reflectionBox.classList.toggle('empty', !selectedPrompt() && !state.customReflection);
    reflectionBox.classList.remove('writing');
    void reflectionBox.offsetWidth;
    reflectionBox.classList.add('writing');
  }

  function focusReflectionEnd() {
    customReflectionInput.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(customReflectionInput);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function selectPrompt(promptId) {
    const state = dayState();
    if (!state || state.view !== 'open') return;
    if (promptId !== 'custom' && !dayData()?.reflections?.some(item => item.id === promptId)) return;
    state.selectedPromptId = promptId;
    state.completed = false;
    for (const button of choicesEl.querySelectorAll('.choice')) {
      button.setAttribute('aria-pressed', String(button.dataset.promptId === promptId));
    }
    syncReflection({ preserveInput: true });
    emit('herb:diary-state');
    requestAnimationFrame(focusReflectionEnd);
  }

  function showWhisper(message) {
    clearTimeout(whisperTimer);
    pageWhisper.textContent = message;
    pageWhisper.classList.add('show');
    whisperTimer = window.setTimeout(() => pageWhisper.classList.remove('show'), 2300);
  }

  function setOpen(open, { emitState = true } = {}) {
    const state = dayState();
    if (!state) return;
    state.view = open ? 'open' : 'closed';
    game.dataset.view = state.view;
    spread.inert = !open;
    controls.inert = !open;
    closedUI.inert = open;
    spread.setAttribute('aria-hidden', String(!open));
    controls.setAttribute('aria-hidden', String(!open));
    closedUI.setAttribute('aria-hidden', String(open));
    clearTimeout(whisperTimer);
    pageWhisper.classList.remove('show');
    if (open) {
      game.classList.remove('opening');
      void game.offsetWidth;
      game.classList.add('opening');
      const target = choicesEl.querySelector(`[data-prompt-id="${state.selectedPromptId || ''}"]`) || choicesEl.querySelector('button');
      target?.focus({ preventScroll: true });
    } else {
      reopenBtn.textContent = '回看今天的日記';
      reopenBtn.focus({ preventScroll: true });
    }
    if (emitState) emit('herb:diary-state', { view: state.view });
  }

  function completeDiary() {
    const state = dayState();
    if (!state || state.view !== 'open') return;
    if (!state.selectedPromptId) {
      showWhisper('先圈一句開頭，或選「我想自己寫」。');
      choicesEl.querySelector('button')?.focus({ preventScroll: true });
      return;
    }
    state.completed = true;
    state.view = 'closed';
    setOpen(false, { emitState: false });
    emit('herb:diary-complete', {
      selectedPrompt: selectedPrompt(),
      text: selectedPrompt() + state.customReflection
    });
  }

  function updateNavigation() {
    const keys = Array.isArray(payload.availableDayKeys) ? payload.availableDayKeys.filter(key => payload.days?.[key]) : [];
    const index = keys.indexOf(activeDayKey);
    const canPrev = index > 0;
    const canNext = index >= 0 && index < keys.length - 1;
    prevBtn.disabled = !canPrev;
    prevBtn.setAttribute('aria-disabled', String(!canPrev));
    nextBtn.disabled = !canNext;
    nextBtn.setAttribute('aria-disabled', String(!canNext));
    prevBtn.dataset.targetDay = canPrev ? keys[index - 1] : '';
    nextBtn.dataset.targetDay = canNext ? keys[index + 1] : '';
  }

  function navigate(button) {
    const target = button.dataset.targetDay;
    if (!target || !payload.days?.[target]) return;
    activeDayKey = target;
    payload.currentDayKey = target;
    renderDay();
    emit('herb:diary-navigate');
  }

  function renderDay() {
    const day = dayData();
    const state = dayState();
    if (!day || !state) return;
    dayLabel.textContent = `第 ${day.week} 週・${day.weekday}`;
    eyebrow.textContent = day.eyebrow || '放學後・想一想';
    reflectionHeading.textContent = day.heading || '今天我想記住的是……';
    dailyMemory.replaceChildren(...(day.bodyParagraphs || []).map(text => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));
    choiceTitle.textContent = day.promptLead || '今天我想先寫這一句……';
    customReflectionInput.dataset.placeholder = day.inputPlaceholder || '選一句開始，也可以自己寫。';
    renderEvents();
    renderChoices();
    syncReflection();
    updateNavigation();
    setOpen(state.view !== 'closed', { emitState: false });
    window.herbDiary = { payload, get dayData() { return dayData(); }, get state() { return dayState(); } };
  }

  customReflectionInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') insertLineBreak(customReflectionInput, event);
  });
  customReflectionInput.addEventListener('input', () => {
    const state = dayState();
    state.customReflection = editableText(customReflectionInput);
    state.completed = false;
    reflectionBox.classList.toggle('empty', !selectedPrompt() && !state.customReflection);
    emit('herb:diary-state');
  });
  customReflectionInput.addEventListener('paste', insertPlainText);
  reflectionBox.addEventListener('click', event => {
    if (event.target === reflectionBox || event.target === selectedPromptText) focusReflectionEnd();
  });
  prevBtn.addEventListener('click', () => navigate(prevBtn));
  nextBtn.addEventListener('click', () => navigate(nextBtn));
  reopenBtn.addEventListener('click', () => setOpen(true));
  continueBtn.addEventListener('click', completeDiary);
  game.addEventListener('animationend', event => {
    if (event.animationName === 'open-book') game.classList.remove('opening');
  });

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'herb:diary-init') return;
    const incoming = event.data.payload;
    if (!incoming?.currentDayKey || !incoming?.days?.[incoming.currentDayKey]) return;
    payload = structuredCloneSafe(incoming);
    activeDayKey = payload.currentDayKey;
    renderDay();
  });

  document.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    const warning = document.getElementById('assetWarning');
    warning.hidden = false;
    warning.textContent = '日記圖片載入失敗。';
  }, { once: true }));

  renderDay();
  window.parent?.postMessage({ type: 'herb:diary-ready', detail: { dayKey: activeDayKey } }, '*');
})();
