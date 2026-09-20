(() => {
  'use strict';

  const config = window.SCIENCE_ASSISTANT_CONFIG;
  if (!config) {
    console.warn('[Science Assistant] Missing configuration.');
    return;
  }

  const engine = window.SCIENCE_ASSISTANT_ENGINE;
  if (!engine) {
    console.warn('[Science Assistant] Missing question engine.');
    return;
  }

  const state = {
    grade: null,
    characterKey: 'mimi',
    isReplying: false,
    siteKnowledge: null,
    curriculum: [],
    knowledgePromise: null,
    assistantMessageCount: 0,
    conversation: []
  };

  const loadJson = async (url) => {
    const response = await window.fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(String(response.status) + ' ' + url);
    return response.json();
  };

  const loadKnowledge = async () => {
    try {
      const [siteKnowledge, manifest] = await Promise.all([
        loadJson(config.siteKnowledgeUrl),
        loadJson(config.curriculumManifestUrl)
      ]);
      state.siteKnowledge = siteKnowledge;
      const available = (manifest.datasets || []).filter((dataset) => dataset.status === 'available');
      state.curriculum = await Promise.all(available.map((dataset) => loadJson(dataset.path)));
    } catch (error) {
      console.warn('[Science Assistant] Knowledge files could not be loaded.', error);
    }
  };

  const getStoredGrade = () => {
    try {
      const grade = window.localStorage.getItem(config.storageKey);
      return ['3', '4', '5', '6'].includes(grade) ? grade : null;
    } catch (error) {
      return null;
    }
  };

  const storeGrade = (grade) => {
    try {
      window.localStorage.setItem(config.storageKey, grade);
    } catch (error) {
      // The assistant still works when storage is unavailable.
    }
  };

  const characterForGrade = (grade) => (['3', '4'].includes(grade) ? 'mimi' : 'cream');

  const makeElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  };

  const buildInterface = () => {
    const root = makeElement('aside', 'science-assistant');
    root.setAttribute('aria-label', config.title);

    const launcher = makeElement('button', 'assistant-launcher');
    launcher.type = 'button';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'science-assistant-panel');
    launcher.setAttribute('aria-label', `開啟${config.title}`);

    const launcherFaces = makeElement('span', 'assistant-launcher__faces');
    Object.values(config.characters).forEach((character) => {
      const image = makeElement('img');
      image.src = character.avatar;
      image.alt = '';
      launcherFaces.appendChild(image);
    });
    launcher.append(launcherFaces, makeElement('span', '', '問問我們'));

    const panel = makeElement('section', 'assistant-panel');
    panel.id = 'science-assistant-panel';
    panel.setAttribute('aria-hidden', 'true');

    const header = makeElement('div', 'assistant-header');
    const headerAvatar = makeElement('img', 'assistant-header__avatar');
    headerAvatar.alt = '';

    const headerCopy = makeElement('div', 'assistant-header__copy');
    const headerTitle = makeElement('strong', '', config.title);
    const headerSubtitle = makeElement('span', '', config.subtitle);
    headerCopy.append(headerTitle, headerSubtitle);

    const changeGrade = makeElement('button', 'assistant-icon-btn', '年');
    changeGrade.type = 'button';
    changeGrade.title = '重新選擇年級';
    changeGrade.setAttribute('aria-label', '重新選擇年級');

    const close = makeElement('button', 'assistant-icon-btn', '×');
    close.type = 'button';
    close.title = '收起小幫手';
    close.setAttribute('aria-label', '收起小幫手');
    header.append(headerAvatar, headerCopy, changeGrade, close);

    const main = makeElement('div', 'assistant-main');
    const gradeScreen = makeElement('section', 'assistant-grade-screen');
    const duo = makeElement('div', 'assistant-duo');
    Object.values(config.characters).forEach((character) => {
      const image = makeElement('img');
      image.src = character.avatar;
      image.alt = character.name;
      duo.appendChild(image);
    });

    const gradeTitle = makeElement('h2', '', '你現在是幾年級？');
    const gradeDescription = makeElement(
      'p',
      '',
      '選擇年級後，三、四年級由橘咪咪陪你；五、六年級則由白奶油陪你。'
    );
    const gradeGrid = makeElement('div', 'assistant-grade-grid');
    [
      ['3', '三年級', '橘咪咪'],
      ['4', '四年級', '橘咪咪'],
      ['5', '五年級', '白奶油'],
      ['6', '六年級', '白奶油']
    ].forEach(([grade, label, character]) => {
      const button = makeElement('button', 'assistant-grade-btn', label);
      button.type = 'button';
      button.dataset.grade = grade;
      button.appendChild(makeElement('span', '', `${character}陪你`));
      gradeGrid.appendChild(button);
    });
    const privacy = makeElement('div', 'assistant-privacy-note', '🔒 不需要輸入姓名');
    gradeScreen.append(duo, gradeTitle, gradeDescription, gradeGrid, privacy);

    const chat = makeElement('section', 'assistant-chat');
    chat.hidden = true;
    const messages = makeElement('div', 'assistant-messages');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');

    const quickWrap = makeElement('div', 'assistant-quick-wrap');
    quickWrap.appendChild(makeElement('p', 'assistant-quick-label', '你可以這樣問：'));
    const quickList = makeElement('div', 'assistant-quick-list');
    quickWrap.appendChild(quickList);

    const form = makeElement('form', 'assistant-compose');
    const input = makeElement('textarea');
    input.rows = 1;
    input.maxLength = 120;
    input.placeholder = '輸入自然、遊戲或網站問題……';
    input.setAttribute('aria-label', '輸入問題');
    const send = makeElement('button', 'assistant-send', '➤');
    send.type = 'submit';
    send.disabled = true;
    send.setAttribute('aria-label', '送出問題');
    form.append(input, send);
    chat.append(messages, quickWrap, form);
    main.append(gradeScreen, chat);
    panel.append(header, main);
    root.append(launcher, panel);
    document.body.appendChild(root);

    return {
      root,
      launcher,
      panel,
      headerAvatar,
      headerSubtitle,
      changeGrade,
      close,
      gradeScreen,
      gradeGrid,
      chat,
      messages,
      quickList,
      form,
      input,
      send
    };
  };

  const ui = buildInterface();

  const setOpen = (isOpen) => {
    ui.root.classList.toggle('is-open', isOpen);
    ui.launcher.setAttribute('aria-expanded', String(isOpen));
    ui.panel.setAttribute('aria-hidden', String(!isOpen));

    if (isOpen) {
      window.setTimeout(() => {
        if (state.grade) ui.input.focus();
        else ui.gradeGrid.querySelector('button')?.focus();
      }, 190);
    } else {
      ui.launcher.focus();
    }
  };

  const currentCharacter = () => config.characters[state.characterKey];

  const scrollMessages = () => {
    ui.messages.scrollTop = ui.messages.scrollHeight;
  };

  const makeAction = (action) => {
    if (!action) return null;

    if (action.kind === 'game' && action.href) {
      const link = makeElement('a', 'assistant-message__action', `🎮 開啟 ${action.label}`);
      link.href = action.href;
      return link;
    }

    if (action.kind === 'grade') {
      const button = makeElement('button', 'assistant-message__action', `🌱 顯示${action.grade}年級遊戲`);
      button.type = 'button';
      button.addEventListener('click', () => {
        document.querySelector(`.filter-btn[data-filter="${action.grade}"]`)?.click();
        setOpen(false);
        document.querySelector('.filter-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return button;
    }

    return null;
  };

  const addMessage = (role, text, action) => {
    const row = makeElement('div', `assistant-message assistant-message--${role}`);
    const displayText = role === 'assistant'
      ? engine.stylizeCatReply(
          text,
          currentCharacter().replySuffixes,
          state.assistantMessageCount
        )
      : text;
    const bubble = makeElement('div', 'assistant-message__bubble', displayText);

    if (role === 'assistant') {
      state.assistantMessageCount += 1;
      const avatar = makeElement('img', 'assistant-message__avatar');
      avatar.src = currentCharacter().avatar;
      avatar.alt = currentCharacter().name;
      row.append(avatar, bubble);
      const actionElement = makeAction(action);
      if (actionElement) bubble.appendChild(actionElement);
    } else {
      row.appendChild(bubble);
    }

    ui.messages.appendChild(row);
    scrollMessages();
    return row;
  };

  const addTyping = () => {
    const row = makeElement('div', 'assistant-message assistant-message--assistant');
    const avatar = makeElement('img', 'assistant-message__avatar');
    avatar.src = currentCharacter().avatar;
    avatar.alt = '';
    const bubble = makeElement('div', 'assistant-message__bubble');
    const typing = makeElement('span', 'assistant-typing');
    typing.setAttribute('aria-label', `${currentCharacter().name}正在回覆`);
    typing.append(makeElement('i'), makeElement('i'), makeElement('i'));
    bubble.appendChild(typing);
    row.append(avatar, bubble);
    ui.messages.appendChild(row);
    scrollMessages();
    return row;
  };

  const getGames = () => (Array.isArray(window.FARM_GAMES) ? window.FARM_GAMES : []);

  const getIndexedGame = (gameNumber) => {
    const padded = String(gameNumber).padStart(2, '0');
    return state.siteKnowledge?.games?.find((game) => game.id === padded) || null;
  };

  const getGradeGamesReply = (grade) => {
    const games = getGames().filter((game) => Array.isArray(game.grades) && game.grades.includes(grade));
    if (!games.length) {
      return {
        text: `我目前沒有在網站資料中找到${grade}年級遊戲，所以先不亂推薦。`
      };
    }

    const preview = games
      .slice(0, 3)
      .map((game) => String(game.title).replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, ''))
      .join('、');
    const more = games.length > 3 ? `等，共 ${games.length} 個` : `，共 ${games.length} 個`;
    return {
      text: `網站目前有${preview}${more}。按下面按鈕，我會替你把首頁篩選成${grade}年級。`,
      action: { kind: 'grade', grade }
    };
  };

  const getGameReply = (gameNumber) => {
    const padded = String(gameNumber).padStart(2, '0');
    const game = getGames().find((item) => String(item.gameNumber || item.id || '').padStart(2, '0') === padded);
    const indexed = getIndexedGame(padded);
    if (!game) {
      if (indexed?.status === 'unlisted') {
        return {
          text: '網站中有 ' + padded + ' 號「' + indexed.title + '」模組，但它目前沒有在首頁發布，所以我先不推薦或提供開啟連結。'
        };
      }
      return {
        text: `我目前沒有在網站資料中找到 ${padded} 號遊戲，所以先不亂告訴你。`
      };
    }

    const title = String(game.title).replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '');
    return {
      text: `找到了！${padded} 號是「${title}」。你可以先開啟遊戲查看畫面中的玩法說明。`,
      action: { kind: 'game', href: game.url, label: title }
    };
  };

  const findCurriculumReply = (question) => {
    const units = state.curriculum.filter((unit) => String(unit.grade) === state.grade);
    if (!units.length) return null;

    let best = null;
    for (const unit of units) {
      for (const concept of unit.concepts || []) {
        const matched = (concept.keywords || []).filter((keyword) => question.includes(keyword));
        const score = matched.reduce((total, keyword) => total + (keyword.length >= 2 ? 2 : 1), 0);
        if (!best || score > best.score) best = { unit, concept, score };
      }
    }

    if (!best || best.score < 2) return null;
    const [startPage, endPage] = best.concept.sourcePages;
    const pageLabel = startPage === endPage
      ? '第 ' + startPage + ' 頁'
      : '第 ' + startPage + '–' + endPage + ' 頁';
    const relatedGame = best.concept.relatedGameIds
      ?.map((id) => getIndexedGame(id))
      .find((game) => game?.recommendable);

    return {
      text: best.concept.studentExplanation + '（依據：' + best.unit.title + '，課本' + pageLabel + '）',
      action: relatedGame
        ? {
            kind: 'game',
            href: relatedGame.url,
            label: String(relatedGame.title).replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '')
          }
        : null
    };
  };

  const getAiHistory = () => {
    const limit = Math.max(0, Number(config.aiHistoryLimit) || 8);
    return state.conversation.slice(-limit).map((item) => ({
      role: item.role,
      text: item.text
    }));
  };

  const askAi = async (question) => {
    if (!config.apiEndpoint) {
      throw new Error('AI endpoint is not configured.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      Math.max(3000, Number(config.aiTimeoutMs) || 15000)
    );

    try {
      const response = await window.fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: question,
          grade: state.grade,
          character: state.characterKey,
          history: getAiHistory()
        }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.reply) {
        throw new Error(payload?.detail || payload?.error || ('AI HTTP ' + response.status));
      }

      return {
        intent: 'ai',
        source: 'gemini',
        model: payload.model || null,
        text: String(payload.reply).trim()
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const replyFor = (question, preset) => {
    if (preset?.gameId) {
      return engine.answerQuestion({
        question: preset.gameId + ' 號遊戲在哪裡？',
        grade: state.grade,
        siteKnowledge: state.siteKnowledge,
        curriculum: state.curriculum,
        fallbackText: config.mockFallback
      });
    }
    if (preset?.action === 'grade-games') {
      return engine.answerQuestion({
        question: '有什麼' + state.grade + '年級遊戲？',
        grade: state.grade,
        siteKnowledge: state.siteKnowledge,
        curriculum: state.curriculum,
        fallbackText: config.mockFallback
      });
    }
    if (preset?.answer) return { text: preset.answer };

    return engine.answerQuestion({
      question,
      grade: state.grade,
      siteKnowledge: state.siteKnowledge,
      curriculum: state.curriculum,
      fallbackText: config.mockFallback
    });
  };

  const respond = (question, preset) => {
    if (state.isReplying) return;
    state.isReplying = true;
    ui.send.disabled = true;
    const typing = addTyping();

    window.setTimeout(async () => {
      await state.knowledgePromise;

      let reply = replyFor(question, preset);
      if (!preset && reply?.source === 'fallback') {
        try {
          reply = await askAi(question);
        } catch (error) {
          console.warn('[Science Assistant] AI request failed.', error);
          reply = {
            intent: 'ai_error',
            source: 'fallback',
            text: config.aiErrorMessage || reply.text
          };
        }
      }

      typing.remove();
      addMessage('assistant', reply.text, reply.action);

      state.conversation.push(
        { role: 'user', text: question },
        { role: 'assistant', text: reply.text }
      );
      const keep = Math.max(2, (Number(config.aiHistoryLimit) || 8) * 2);
      if (state.conversation.length > keep) {
        state.conversation.splice(0, state.conversation.length - keep);
      }

      state.isReplying = false;
      ui.send.disabled = !ui.input.value.trim();
    }, 320);
  };

  const ask = (question, preset) => {
    const text = question.trim();
    if (!text || state.isReplying) return;
    addMessage('user', text);
    ui.input.value = '';
    ui.input.style.height = '';
    respond(text, preset);
  };

  const renderQuickPrompts = () => {
    ui.quickList.replaceChildren();
    (config.quickPrompts[state.grade] || []).forEach((prompt) => {
      const button = makeElement('button', 'assistant-quick-btn', prompt.label);
      button.type = 'button';
      button.addEventListener('click', () => ask(prompt.label, prompt));
      ui.quickList.appendChild(button);
    });
  };

  const startChat = (grade) => {
    state.grade = grade;
    state.characterKey = characterForGrade(grade);
    state.assistantMessageCount = 0;
    state.conversation = [];
    storeGrade(grade);

    const character = currentCharacter();
    ui.headerAvatar.src = character.avatar;
    ui.headerAvatar.alt = character.name;
    ui.headerSubtitle.textContent = `${grade}年級・${character.name}陪你`;
    ui.gradeScreen.hidden = true;
    ui.chat.hidden = false;
    ui.messages.replaceChildren();
    renderQuickPrompts();
    addMessage('assistant', character.welcome);
  };

  const showGradeScreen = () => {
    state.grade = null;
    state.isReplying = false;
    state.conversation = [];
    ui.headerAvatar.src = config.characters.mimi.avatar;
    ui.headerAvatar.alt = '橘咪咪';
    ui.headerSubtitle.textContent = config.subtitle;
    ui.chat.hidden = true;
    ui.gradeScreen.hidden = false;
    window.setTimeout(() => ui.gradeGrid.querySelector('button')?.focus(), 0);
  };

  ui.launcher.addEventListener('click', () => {
    showGradeScreen();
    setOpen(true);
  });
  ui.close.addEventListener('click', () => setOpen(false));
  ui.changeGrade.addEventListener('click', showGradeScreen);
  ui.gradeGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-grade]');
    if (button) startChat(button.dataset.grade);
  });
  ui.form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(ui.input.value);
  });
  ui.input.addEventListener('input', () => {
    ui.input.style.height = 'auto';
    ui.input.style.height = `${Math.min(ui.input.scrollHeight, 92)}px`;
    ui.send.disabled = state.isReplying || !ui.input.value.trim();
  });
  ui.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ui.form.requestSubmit();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.root.classList.contains('is-open')) setOpen(false);
  });

  state.knowledgePromise = loadKnowledge();
  showGradeScreen();
})();
