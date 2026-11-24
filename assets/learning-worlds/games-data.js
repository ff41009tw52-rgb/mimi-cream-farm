/* New subjects only. See README.md for publishing and sorting rules. */
(() => {
  'use strict';
  const catalogs = {
  "chinese": [
    {
      "id": "chinese-food-radio",
      "title": "白奶油的美食電台",
      "grades": [
        "4"
      ],
      "topic": "康軒四上｜感官描寫、動作順序",
      "description": "把兩句描述剪成廣播，聽聽眾怎麼挑餐。每一句能排除哪一份？",
      "icon": "播",
      "artwork": "kitchen",
      "cover": "learning-games/field-studio/radio.webp",
      "url": "learning-games/food-radio.html",
      "status": "published",
      "publishedAt": "2026-11-25T04:30:00+08:00",
      "order": 0,
      "featured": true
    },
    {
      "id": "chinese-sensory-kitchen",
      "title": "白奶油的文字料理屋",
      "grades": ["4"],
      "topic": "康軒四上｜段落線索、順序、五感描寫",
      "description": "讀料理手帳，把打亂的步驟排回去，再標出能支持你決定的那一句。",
      "icon": "香",
      "artwork": "kitchen",
      "cover": "",
      "url": "learning-games/kitchen.html",
      "status": "published",
      "publishedAt": "2026-11-09T23:47:00+08:00",
      "order": 0,
      "featured": true
    },
    {
      "id": "chinese-character-factory",
      "title": "橘咪咪的國字拼裝工廠",
      "grades": [
        "4"
      ],
      "topic": "國字部件、詞語線索",
      "description": "橘咪咪把國字拆成左右兩個部件。讀一讀句子，想想空格缺了哪個字，再選出部件把它拼回去。",
      "icon": "字",
      "artwork": "letters",
      "cover": "",
      "url": "learning-games/characters.html",
      "status": "published",
      "publishedAt": "2026-11-09T23:45:00+08:00",
      "order": 1,
      "featured": true
    },
    {
      "id": "chinese-typo-team",
      "title": "白奶油的錯字捕捉隊",
      "grades": [
        "4"
      ],
      "topic": "形近字、同音字",
      "description": "白奶油把「一棵樹」寫成了「一顆樹」。讀讀句子，找出用錯的字，幫牠改一改。",
      "icon": "尋",
      "artwork": "search",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 2,
      "featured": false
    },
    {
      "id": "chinese-idiom-treasure",
      "title": "成語寶藏獵人",
      "grades": [
        "4"
      ],
      "topic": "讀懂成語、學會怎麼用",
      "description": "藏寶圖上寫著「一舉兩得」。哪個故事裡，主角做一件事就得到兩個好處？選出符合成語意思的線索，繼續找寶藏。",
      "icon": "藏",
      "artwork": "treasure",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 3,
      "featured": false
    },
    {
      "id": "chinese-reading-detectives",
      "title": "貓咪閱讀偵探社",
      "grades": [
        "4"
      ],
      "topic": "讀故事、找線索",
      "description": "故事裡的角色說「我沒事」，卻一直低著頭。從角色說的話和做的事找線索，想想角色可能在想什麼。",
      "icon": "讀",
      "artwork": "book",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 4,
      "featured": true
    },
    {
      "id": "chinese-sound-forest",
      "title": "國字聲音森林",
      "grades": [
        "4"
      ],
      "topic": "聽字音、認部件",
      "description": "森林裡傳來一個字的讀音。先聽清楚，再看看每個字有哪些部件，幫橘咪咪找出讀音對得上的國字。",
      "icon": "音",
      "artwork": "forest",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 5,
      "featured": false
    }
  ],
  "math": [
    {
      "id": "math-valley-rescue",
      "title": "橘咪咪的山谷救援",
      "grades": [
        "4"
      ],
      "topic": "南一四上｜假分數、帶分數與數線",
      "description": "讀求救座標派出無人機，把急救包送進山谷，還要留下足夠的電飛回基地。",
      "icon": "救",
      "artwork": "race",
      "cover": "learning-games/field-studio/valley.webp",
      "url": "learning-games/valley-rescue.html",
      "status": "published",
      "publishedAt": "2026-11-25T04:30:00+08:00",
      "order": 0,
      "featured": true
    },
    {
      "id": "math-angle-park",
      "title": "角度遊樂園",
      "grades": ["4"],
      "topic": "南一四上｜角度與量角器",
      "description": "橘咪咪和白奶油來到遊樂園。拖動量角器上的藍線，轉出題目指定的角度，再看看它是哪一種角。",
      "icon": "∠",
      "artwork": "angles",
      "cover": "",
      "url": "learning-games/angles.html",
      "status": "published",
      "publishedAt": "2026-11-09T23:48:00+08:00",
      "order": 0,
      "featured": true
    },
    {
      "id": "math-cat-market",
      "title": "橘咪咪的貓咪超級市場",
      "grades": [
        "4"
      ],
      "topic": "算總價、算找零",
      "description": "橘咪咪在超市幫忙結帳。先算兩包餅乾一共多少錢，再看看客人付 100 元該找多少。",
      "icon": "＋",
      "artwork": "market",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 1,
      "featured": true
    },
    {
      "id": "math-pizza-restaurant",
      "title": "白奶油的披薩餐廳",
      "grades": [
        "4"
      ],
      "topic": "分數、假分數與帶分數互換",
      "description": "照兩桌的分數訂單裝箱。散片格不夠時，把等份的小片合成整張披薩。",
      "icon": "½",
      "artwork": "pizza",
      "cover": "",
      "url": "learning-games/pizza.html",
      "status": "published",
      "publishedAt": "2026-11-11T16:00:00+08:00",
      "order": 2,
      "featured": true
    },
    {
      "id": "math-fraction-rail",
      "title": "橘咪咪的分數軌道",
      "grades": ["4"],
      "topic": "分數數線、刻度與位置",
      "description": "替橘咪咪鋪好等距軌道，照車票移動小火車。超過 1 的分數要停在哪裡？換一種寫法，看看是不是同一站。",
      "icon": "↔",
      "artwork": "race",
      "cover": "",
      "url": "learning-games/fraction-rail.html",
      "status": "published",
      "publishedAt": "2026-11-11T16:01:00+08:00",
      "order": 0,
      "featured": true
    },
    {
      "id": "math-geometry-architect",
      "title": "橘咪咪的幾何建築師",
      "grades": [
        "4"
      ],
      "topic": "面積、周長",
      "description": "橘咪咪要替小屋鋪地板、圍籬笆。看圖找出長和寬，算一算地板有多大、籬笆需要多長。",
      "icon": "△",
      "artwork": "blocks",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 3,
      "featured": false
    },
    {
      "id": "math-fraction-bridge",
      "title": "貓咪分數橋梁工程隊",
      "grades": [
        "4"
      ],
      "topic": "比分數大小、找等值分數",
      "description": "橋面有個缺口，占全長的 1/2。占全長 2/4 的木板剛好放得下嗎？比一比分數，幫兩隻貓咪補好橋面。",
      "icon": "＝",
      "artwork": "bridge",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 4,
      "featured": true
    },
    {
      "id": "math-equation-repair",
      "title": "白奶油的算式修復站",
      "grades": [
        "4"
      ],
      "topic": "加減乘除的計算順序",
      "description": "白奶油看到一道有括號的算式，想知道該先算哪裡。找出正確的順序，幫牠一步一步算完。",
      "icon": "×",
      "artwork": "gears",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 5,
      "featured": false
    },
    {
      "id": "math-math-racing",
      "title": "貓咪數學賽車",
      "grades": [
        "4"
      ],
      "topic": "練習算得又快又準",
      "description": "橘咪咪和白奶油的賽車準備出發。看清楚題目再作答，試試看自己能又快又準地答對幾題。",
      "icon": "⑦",
      "artwork": "race",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 6,
      "featured": false
    }
  ]
};
  window.LEARNING_GAMES = Object.freeze(Object.fromEntries(
    Object.entries(catalogs).map(([subject, games]) => [subject, Object.freeze(
      games.map(game => Object.freeze({ ...game, grades: Object.freeze([...game.grades]) }))
    )])
  ));
})();
