(() => {
  'use strict';

  window.SCIENCE_ASSISTANT_CONFIG = {
    storageKey: 'scienceFarmAssistantGrade',
    siteKnowledgeUrl: 'data/site-knowledge.json',
    curriculumManifestUrl: 'knowledge/index.json',
    apiEndpoint: 'https://mimi-cream-ai.ff41009tw52.workers.dev/',
    aiTimeoutMs: 35000,
    aiHistoryLimit: 8,
    aiErrorMessage: '現在有點忙，暫時連不上 AI。你可以再試一次，或換個方式問我。',
    title: '橘咪咪與白奶油的科學小幫手',
    subtitle: '自然不懂？遊戲不會玩？來問我們！',
    characters: {
      mimi: {
        name: '橘咪咪',
        grades: ['3', '4'],
        gradeLabel: '三、四年級',
        avatar: 'ai-assistant/assets/mimi-avatar.jpg',
        welcome: '嗨！我是橘咪咪。自然問題、找遊戲或網站操作，都可以先問我！',
        replySuffixes: ['喵！', '一起來看看喵！', '橘咪咪陪你找答案喵～']
      },
      cream: {
        name: '白奶油',
        grades: ['5', '6'],
        gradeLabel: '五、六年級',
        avatar: 'ai-assistant/assets/cream-avatar.jpg',
        welcome: '你好！我是白奶油。我可以陪你比較現象、找證據，也能幫你找到適合的遊戲。',
        replySuffixes: ['喵嗚～', '讓本喵陪你慢慢找～', '白奶油記住了喵～']
      }
    },
    quickPrompts: {
      '3-4': [
        {
          label: '🌱 為什麼植物需要陽光？',
          answer: '植物會利用陽光製造生長需要的養分。少了足夠的陽光，植物可能長得比較細弱。'
        },
        { label: '🎮 有什麼三、四年級遊戲？', action: 'grade-games' },
        {
          label: '🌊 流水會怎麼改變地表？',
          answer: '流水會侵蝕地表，也會搬運泥沙等物質，再把它們堆積在別的地方。水流越強，改變地表的力量通常越大。'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ],
      '5-6': [
        {
          label: '💪 肌肉和骨骼怎麼合作？',
          answer: '肌肉收縮時會拉動相連的骨骼，讓關節產生動作。彎曲和伸直手臂時，會由不同的肌肉互相配合。'
        },
        { label: '🎮 有什麼五、六年級遊戲？', action: 'grade-games' },
        {
          label: '⚙️ 動滑輪為什麼比較省力？',
          answer: '動滑輪能把重物的重量分給多段繩子承擔，所以拉起重物時通常比較省力，但需要拉更長的繩子。'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ],
      '3': [
        {
          label: '🌱 為什麼植物需要陽光？',
          answer: '植物會利用陽光製造生長需要的養分。少了足夠的陽光，植物可能長得比較細弱。'
        },
        { label: '🎮 有什麼三年級遊戲？', action: 'grade-games' },
        {
          label: '❓ 這個遊戲怎麼玩？',
          answer: '請告訴我遊戲名稱或編號，例如「40 怎麼玩？」我會先幫你找到正確的遊戲。'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ],
      '4': [
        {
          label: '🌊 流水會怎麼改變地表？',
          answer: '流水會侵蝕地表，也會搬運泥沙等物質，再把它們堆積在別的地方。水流越強，改變地表的力量通常越大。'
        },
        { label: '🎮 有什麼四年級遊戲？', action: 'grade-games' },
        {
          label: '💧 41 號遊戲在哪裡？',
          answer: '我會從網站現有的遊戲資料中尋找 41 號遊戲。',
          gameId: '41'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ],
      '5': [
        {
          label: '💪 肌肉和骨骼怎麼合作？',
          answer: '肌肉收縮時會拉動相連的骨骼，讓關節產生動作。彎曲和伸直手臂時，會由不同的肌肉互相配合。'
        },
        { label: '🎮 有什麼五年級遊戲？', action: 'grade-games' },
        {
          label: '❓ 這個遊戲怎麼玩？',
          answer: '請告訴我遊戲名稱或編號，我會先用網站資料幫你找到正確頁面。'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ],
      '6': [
        {
          label: '⚙️ 動滑輪為什麼比較省力？',
          answer: '動滑輪能把重物的重量分給多段繩子承擔，所以拉起重物時通常比較省力，但需要拉更長的繩子。'
        },
        { label: '🎮 有什麼六年級遊戲？', action: 'grade-games' },
        {
          label: '❓ 這個遊戲怎麼玩？',
          answer: '請告訴我遊戲名稱或編號，我會先用網站資料幫你找到正確頁面。'
        },
        {
          label: '🛠️ 網頁卡住了',
          answer: '可以先重新整理頁面。若還是卡住，請按右下角的「回報問題」，並告訴老師是哪一個遊戲。'
        }
      ]
    },
    mockFallback: '我目前的資料還沒有這題，所以先不猜答案。你可以改用自然關鍵詞、遊戲名稱、遊戲編號，或請我推薦這個年級的遊戲。'
  };
})();
