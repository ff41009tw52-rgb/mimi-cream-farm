/* New subjects only. See README.md for publishing and sorting rules. */
(() => {
  'use strict';
  const catalogs = {
  "chinese": [
    {
      "id": "chinese-character-factory",
      "title": "橘咪咪的國字拼裝工廠",
      "grades": [
        "4"
      ],
      "topic": "國字部件、造詞",
      "description": "橘咪咪把國字部件放進工具箱。找出合適的部件，拼出國字，再組成詞語。",
      "icon": "字",
      "artwork": "letters",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
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
      "description": "白奶油的筆記裡混進了錯字！仔細看字形、讀字音，幫牠把句子改正。",
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
      "topic": "成語理解與應用",
      "description": "藏寶圖上的提示都是成語。讀懂意思，選出符合情境的成語，找出寶藏。",
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
      "topic": "閱讀理解與推論",
      "description": "和兩隻貓咪讀故事、找線索，從文章裡推敲角色的想法，解開故事中的謎題。",
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
      "topic": "字音與部件辨識",
      "description": "森林裡傳來不同的字音。跟著橘咪咪聽一聽、認一認，找到對應的國字與部件。",
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
      "id": "math-cat-market",
      "title": "橘咪咪的貓咪超級市場",
      "grades": [
        "4"
      ],
      "topic": "四則運算、金錢計算",
      "description": "橘咪咪的小超市要補貨了！計算商品總價與找零，幫牠核對每一筆帳。",
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
      "topic": "分數概念與操作",
      "description": "白奶油要把披薩分給朋友。試著平均分切，用分數表示每一份的大小。",
      "icon": "½",
      "artwork": "pizza",
      "cover": "",
      "url": "",
      "status": "coming-soon",
      "publishedAt": null,
      "order": 2,
      "featured": false
    },
    {
      "id": "math-geometry-architect",
      "title": "橘咪咪的幾何建築師",
      "grades": [
        "4"
      ],
      "topic": "面積、周長",
      "description": "橘咪咪想蓋一座貓咪小屋。量一量邊長，算出圍牆長度和地板面積。",
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
      "topic": "分數比較、等值分數",
      "description": "兩隻貓咪正在修橋！比較分數大小，找出等值分數，把橋面一塊塊接起來。",
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
      "topic": "四則混合運算",
      "description": "白奶油把算式的順序弄亂了。看清楚括號與運算符號，依照正確順序算出答案。",
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
      "topic": "計算能力與競賽",
      "description": "橘咪咪和白奶油的賽車準備出發！看清題目、算出答案，挑戰自己的計算速度。",
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
