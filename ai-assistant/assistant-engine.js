(() => {
  'use strict';

  const GRADE_MAP = Object.freeze({
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6'
  });

  const normalizeText = (value) => String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[，。！？、；：「」『』（）()【】\[\]\s\-_.:：・]/g, '');

  const cleanTitle = (value) => String(value || '').replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '');

  const detectGrade = (question, fallbackGrade) => {
    const match = String(question || '').match(/([三四五六3-6])\s*年級/);
    return (match && GRADE_MAP[match[1]]) || String(fallbackGrade || '');
  };

  const extractGameNumber = (question) => {
    const source = String(question || '');
    const explicit = source.match(/(?:第\s*)?(\d{1,2})\s*(?:號|關)/);
    const contextual = /遊戲|實驗|模組|關卡/.test(source) && source.match(/\b(\d{1,2})\b/);
    const value = Number((explicit || contextual || [])[1]);
    return Number.isInteger(value) && value >= 1 && value <= 41
      ? String(value).padStart(2, '0')
      : null;
  };

  const getBigrams = (value) => {
    const text = normalizeText(value);
    if (!text) return [];
    if (text.length === 1) return [text];
    const result = [];
    for (let index = 0; index < text.length - 1; index += 1) {
      result.push(text.slice(index, index + 2));
    }
    return result;
  };

  const diceSimilarity = (left, right) => {
    const leftPairs = getBigrams(left);
    const rightPairs = getBigrams(right);
    if (!leftPairs.length || !rightPairs.length) return 0;
    const counts = new Map();
    rightPairs.forEach((pair) => counts.set(pair, (counts.get(pair) || 0) + 1));
    let overlap = 0;
    leftPairs.forEach((pair) => {
      const count = counts.get(pair) || 0;
      if (count > 0) {
        overlap += 1;
        counts.set(pair, count - 1);
      }
    });
    return (2 * overlap) / (leftPairs.length + rightPairs.length);
  };

  const classifyQuestion = (question, fallbackGrade) => {
    const text = normalizeText(question);
    const grade = detectGrade(question, fallbackGrade);
    const gameNumber = extractGameNumber(question);

    if (!text) {
      return { type: 'empty', confidence: 1, entities: { grade, gameNumber } };
    }

    if (/(網頁|網站|畫面|按鈕).*(卡住|沒反應|當機|打不開|無法|錯誤)|回報問題|怎麼操作|^(卡住|沒反應|當機|打不開)/.test(text)) {
      return { type: 'site_help', confidence: 0.98, entities: { grade, gameNumber } };
    }

    if (
      (/年級/.test(text) && /(遊戲|實驗)/.test(text) && /(有什麼|有哪些|推薦|適合)/.test(text))
      || /推薦.*(遊戲|實驗)/.test(text)
    ) {
      return { type: 'grade_games', confidence: 0.96, entities: { grade, gameNumber } };
    }

    if (gameNumber && /(遊戲|實驗|模組|關卡|在哪|怎麼玩|開啟|打開|內容)/.test(text)) {
      return { type: 'game_lookup', confidence: 0.99, entities: { grade, gameNumber } };
    }

    if (/(遊戲|實驗|模組|關卡)/.test(text)) {
      return { type: 'game_search', confidence: 0.9, entities: { grade, gameNumber } };
    }

    if (/(為什麼|怎麼|如何|什麼是|有什麼不同|一樣嗎|會不會|能不能|哪一個|哪一種)/.test(text)) {
      return { type: 'curriculum', confidence: 0.72, entities: { grade, gameNumber } };
    }

    return { type: 'unknown', confidence: 0.35, entities: { grade, gameNumber } };
  };

  const gameSearchScore = (question, game) => {
    const query = normalizeText(question);
    const title = normalizeText(cleanTitle(game.title));
    if (!query || !title) return 0;

    let score = 0;
    if (query === title) score += 20;
    else if (query.includes(title) || title.includes(query)) score += 10;

    if (query.includes(game.id)) score += 2;
    if (normalizeText(game.topicGroup) && query.includes(normalizeText(game.topicGroup))) score += 6;

    (game.topics || []).forEach((topic) => {
      const normalized = normalizeText(topic);
      if (normalized && query.includes(normalized)) {
        score += normalized.length >= 2 ? 5 : 1;
      } else if (normalized && getBigrams(normalized).some((pair) => query.includes(pair))) {
        score += 4;
      }
    });

    (game.aliases || []).forEach((alias) => {
      const normalized = normalizeText(alias);
      if (normalized && (query.includes(normalized) || normalized.includes(query))) score += 7;
    });

    score += diceSimilarity(query, title) * 5;
    score += diceSimilarity(query, game.description) * 2;
    return score;
  };

  const searchGames = (question, siteKnowledge, options = {}) => {
    const games = Array.isArray(siteKnowledge?.games) ? siteKnowledge.games : [];
    const exactId = options.gameNumber || extractGameNumber(question);
    if (exactId) {
      const exact = games.find((game) => game.id === exactId);
      return exact ? [{ game: exact, score: 100, exact: true }] : [];
    }

    const grade = detectGrade(question, options.grade);
    return games
      .map((game) => ({ game, score: gameSearchScore(question, game), exact: false }))
      .filter((result) => result.score >= 4)
      .filter((result) => !options.recommendableOnly || result.game.recommendable)
      .filter((result) => !options.gradeOnly || !grade || result.game.grades.includes(grade))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.game.recommendable !== right.game.recommendable) return left.game.recommendable ? -1 : 1;
        return Number(right.game.id) - Number(left.game.id);
      });
  };

  const conceptKeywordScore = (question, concept) => {
    const query = normalizeText(question);
    return (concept.keywords || []).reduce((score, keyword) => {
      const normalized = normalizeText(keyword);
      return normalized && query.includes(normalized)
        ? score + (normalized.length >= 2 ? 4 : 1)
        : score;
    }, 0);
  };

  const searchCurriculum = (question, curriculum, grade) => {
    const units = (Array.isArray(curriculum) ? curriculum : [])
      .filter((unit) => !grade || String(unit.grade) === String(grade));
    const results = [];

    units.forEach((unit) => {
      const concepts = new Map((unit.concepts || []).map((concept) => [concept.id, concept]));

      (unit.qaSeeds || []).forEach((qa) => {
        const concept = concepts.get(qa.conceptId);
        if (!concept) return;
        const similarity = diceSimilarity(question, qa.query);
        const keywordScore = conceptKeywordScore(question, concept);
        const query = normalizeText(question);
        const seed = normalizeText(qa.query);
        const phraseScore = query.includes(seed) || seed.includes(query) ? 7 : 0;
        const score = (similarity * 9) + keywordScore + phraseScore;
        if (score >= 5) {
          results.push({
            unit,
            concept,
            answer: qa.answer,
            gameId: qa.gameId || null,
            score,
            matchType: 'qa'
          });
        }
      });

      (unit.concepts || []).forEach((concept) => {
        const keywordScore = conceptKeywordScore(question, concept);
        const similarity = Math.max(
          diceSimilarity(question, concept.coreConcept),
          diceSimilarity(question, concept.studentExplanation)
        );
        const score = keywordScore + (similarity * 4);
        if (score >= 4) {
          results.push({
            unit,
            concept,
            answer: concept.studentExplanation,
            gameId: null,
            score,
            matchType: 'concept'
          });
        }
      });
    });

    return results.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.matchType === 'qa' ? -1 : 1;
    });
  };

  const sourceLabel = (unit, concept) => {
    const pages = concept.sourcePages || [];
    const pageLabel = pages[0] === pages[1]
      ? '第 ' + pages[0] + ' 頁'
      : '第 ' + pages[0] + '–' + pages[1] + ' 頁';
    return unit.title + '，課本' + pageLabel;
  };

  const gameAction = (game) => game?.recommendable && game.url
    ? { kind: 'game', href: game.url, label: cleanTitle(game.title) }
    : null;

  const answerExactGame = (gameNumber, siteKnowledge) => {
    const game = (siteKnowledge?.games || []).find((entry) => entry.id === gameNumber);
    if (!game) {
      return {
        intent: 'game_lookup',
        source: 'site-knowledge',
        text: '我目前沒有在網站資料中找到 ' + gameNumber + ' 號遊戲，所以先不亂告訴你。'
      };
    }

    if (game.audience === 'teacher') {
      return {
        intent: 'game_lookup',
        source: 'site-knowledge',
        policy: 'teacher-resource',
        text: gameNumber + ' 號「' + game.title + '」是教師資源，不是學生遊戲，因此不會放入學生推薦或提供遊戲按鈕。'
      };
    }

    if (!game.recommendable) {
      return {
        intent: 'game_lookup',
        source: 'site-knowledge',
        policy: 'unlisted',
        text: '網站中有 ' + gameNumber + ' 號「' + game.title + '」模組，但它目前沒有在首頁發布，所以我先不推薦或提供開啟連結。'
      };
    }

    const description = game.description ? '內容是：' + game.description : '可以開啟頁面查看玩法說明。';
    return {
      intent: 'game_lookup',
      source: 'site-knowledge',
      text: '找到了！' + gameNumber + ' 號是「' + cleanTitle(game.title) + '」。' + description,
      action: gameAction(game)
    };
  };

  const answerGradeGames = (grade, siteKnowledge) => {
    const games = (siteKnowledge?.games || [])
      .filter((game) => game.recommendable && (!grade || game.grades.includes(grade)))
      .sort((left, right) => {
        const leftDate = left.publishedAt || '';
        const rightDate = right.publishedAt || '';
        if (rightDate !== leftDate) return rightDate.localeCompare(leftDate);
        return Number(right.id) - Number(left.id);
      });

    if (!games.length) {
      return {
        intent: 'grade_games',
        source: 'site-knowledge',
        text: '我目前沒有在網站資料中找到' + (grade ? grade + '年級' : '符合條件的') + '遊戲，所以先不亂推薦。'
      };
    }

    const preview = games.slice(0, 4).map((game) => game.id + ' 號「' + cleanTitle(game.title) + '」').join('、');
    const more = games.length > 4 ? '等，共 ' + games.length + ' 個' : '，共 ' + games.length + ' 個';
    return {
      intent: 'grade_games',
      source: 'site-knowledge',
      text: (grade ? grade + '年級' : '網站') + '目前有 ' + preview + more + '。按下面按鈕可篩選首頁。',
      action: grade ? { kind: 'grade', grade } : gameAction(games[0])
    };
  };

  const answerGameSearch = (question, grade, siteKnowledge) => {
    const results = searchGames(question, siteKnowledge, { grade });
    if (!results.length) {
      return {
        intent: 'game_search',
        source: 'site-knowledge',
        text: '我目前沒有找到符合這個主題的已確認遊戲。你可以改用遊戲編號、完整名稱或自然主題再問一次。'
      };
    }

    const top = results[0].game;
    if (!top.recommendable && results[0].score >= 10) {
      return answerExactGame(top.id, siteKnowledge);
    }

    const published = results
      .map((result) => result.game)
      .filter((game) => game.recommendable)
      .filter((game) => !grade || game.grades.includes(grade))
      .slice(0, 3);

    if (!published.length) {
      return {
        intent: 'game_search',
        source: 'site-knowledge',
        text: '我找到了相關模組，但沒有符合目前年級且已在首頁發布的學生遊戲，所以先不推薦。'
      };
    }

    const list = published.map((game) => game.id + ' 號「' + cleanTitle(game.title) + '」').join('、');
    return {
      intent: 'game_search',
      source: 'site-knowledge',
      text: '找到的已發布遊戲有：' + list + '。我先提供最相符的遊戲連結。',
      action: gameAction(published[0])
    };
  };

  const answerSiteHelp = (question) => {
    const text = normalizeText(question);
    if (/回報|錯誤/.test(text)) {
      return {
        intent: 'site_help',
        source: 'site-rules',
        text: '請按首頁右下角的「回報問題」，並寫下遊戲編號、使用的裝置，以及發生問題前做了什麼。'
      };
    }
    if (/年級|篩選/.test(text)) {
      return {
        intent: 'site_help',
        source: 'site-rules',
        text: '首頁上方有三到六年級篩選按鈕。選擇年級後，只會顯示該年級已發布的遊戲。'
      };
    }
    if (/打不開|無法開啟|載入/.test(text)) {
      return {
        intent: 'site_help',
        source: 'site-rules',
        text: '請先確認網路，再重新整理頁面；若只有某個遊戲打不開，請記下遊戲編號並使用右下角的「回報問題」。'
      };
    }
    return {
      intent: 'site_help',
      source: 'site-rules',
      text: '可以先重新整理頁面。若仍然卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲和使用的裝置。'
    };
  };

  const answerCurriculum = (question, grade, curriculum, siteKnowledge) => {
    const result = searchCurriculum(question, curriculum, grade)[0];
    if (!result) return null;
    const relatedId = result.gameId || (result.concept.relatedGameIds || [])[0];
    const relatedGame = relatedId
      ? (siteKnowledge?.games || []).find((game) => game.id === relatedId && game.recommendable)
      : null;
    return {
      intent: 'curriculum',
      source: result.matchType === 'qa' ? 'curriculum-qa' : 'curriculum-concept',
      conceptId: result.concept.id,
      confidence: Math.min(1, result.score / 14),
      text: result.answer + '（依據：' + sourceLabel(result.unit, result.concept) + '）',
      action: gameAction(relatedGame)
    };
  };

  const answerQuestion = ({
    question,
    grade,
    siteKnowledge,
    curriculum,
    fallbackText
  }) => {
    const classification = classifyQuestion(question, grade);
    const resolvedGrade = classification.entities.grade || String(grade || '');

    if (classification.type === 'empty') {
      return { intent: 'empty', source: 'rules', text: '請先輸入一個問題。' };
    }
    if (classification.type === 'site_help') return answerSiteHelp(question);
    if (classification.type === 'grade_games') return answerGradeGames(resolvedGrade, siteKnowledge);
    if (classification.type === 'game_lookup') {
      return answerExactGame(classification.entities.gameNumber, siteKnowledge);
    }
    if (classification.type === 'game_search') {
      return answerGameSearch(question, resolvedGrade, siteKnowledge);
    }

    const curriculumReply = answerCurriculum(question, resolvedGrade, curriculum, siteKnowledge);
    if (curriculumReply) return curriculumReply;

    return {
      intent: 'unknown',
      source: 'fallback',
      confidence: classification.confidence,
      text: fallbackText || '我目前的資料還沒有這題，所以先不猜答案。你可以換一個自然關鍵詞、遊戲名稱或編號再問一次。'
    };
  };

  window.SCIENCE_ASSISTANT_ENGINE = Object.freeze({
    normalizeText,
    detectGrade,
    extractGameNumber,
    classifyQuestion,
    searchGames,
    searchCurriculum,
    answerQuestion
  });
})();
