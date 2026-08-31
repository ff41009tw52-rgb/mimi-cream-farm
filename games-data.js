(() => {
  'use strict';

  const games = [
    {
      grades: ['3'],
      gradeLabel: '三年級',
      subject: 'life',
      icon: 'fas fa-seedling',
      title: '🥬 小白菜救援隊',
      description: '小白菜出現成長危機！快觀察陽光、水分與照顧方式，找出讓小白菜恢復健康的方法，完成農場救援任務！',
      url: '40.html',
      actionLabel: '展開救援',
      actionIcon: 'fas fa-leaf'
    },
    {
      grades: ['5'],
      gradeLabel: '五年級',
      icon: 'fas fa-bone',
      title: '🦴 觀察肌肉與骨骼的連動',
      description: '橘咪咪輕鬆跳上屋頂，白奶油卻在底下胖到跳不起來！「那是因為你不懂骨骼和肌肉的連動啦！」快來觀察身體運動的祕密，順便幫白奶油想想減肥對策吧！',
      url: '26.html',
      actionLabel: '觀察連動',
      actionIcon: 'fas fa-search-plus'
    },
    {
      grades: ['4'],
      gradeLabel: '四年級',
      icon: 'fas fa-tint',
      title: '💧 虹吸現象互動實驗',
      description: '白奶油的專屬魚缸髒了，但他不想弄濕爪子換水。「交給我吧！」橘咪咪拿出一根水管，利用神奇的「虹吸現象」，讓水自動往高處爬再流下來！快來動手試試！',
      url: '27.html',
      actionLabel: '啟動水流',
      actionIcon: 'fas fa-hand-holding-water'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-thermometer-half',
      title: '🌡️ 氣溫的測量',
      description: '「熱死本喵了...」白奶油趴在走廊上融化。橘咪咪推了推眼鏡：「到底有幾度？我們請涵老師來教你正確讀取溫度計！」快來測量氣溫，幫白奶油找最涼爽的地方！',
      url: '28.html',
      actionLabel: '測量氣溫',
      actionIcon: 'fas fa-temperature-high'
    },
    {
      grades: ['6'],
      gradeLabel: '六年級',
      icon: 'fas fa-balance-scale-right',
      title: '⚖️ 改變施力臂與抗力臂',
      description: '白奶油想偷搬整袋超重的貓草，卻推不動！橘咪咪請來洪老師傳授「槓桿魔法」。改變施力臂與抗力臂的長度，竟然能讓胖貓咪也變成大力士？',
      url: '30.html',
      actionLabel: '進行實驗',
      actionIcon: 'fas fa-weight-hanging'
    },
    {
      grades: ['4'],
      gradeLabel: '四年級',
      icon: 'fas fa-bug',
      title: '🪲 獨角仙飼養大師',
      description: '白奶油對著光蠟樹上的獨角仙狂揮貓拳！橘咪咪趕緊請澔哥老師來救援。快來學習從卵到成蟲的飼養祕訣，跟著澔哥佈置完美的甲蟲豪宅，別讓白奶油搞破壞啦！',
      url: '31.html',
      actionLabel: '佈置蟲箱',
      actionIcon: 'fas fa-leaf'
    },
    {
      grades: ['5'],
      gradeLabel: '五年級',
      icon: 'fas fa-fish',
      title: '🐟 鬥魚行為觀察實驗',
      description: '白奶油看著駿老師生態缸裡的鬥魚，流著口水問：「牠為什麼在對著鏡子生氣？」橘咪咪敲了敲牠的頭：「別想著吃！快來觀察鬥魚有趣的展鰭行為，紀錄牠的戰鬥姿勢！」',
      url: '32.html',
      actionLabel: '觀察鬥魚',
      actionIcon: 'fas fa-eye'
    },
    {
      grades: ['5'],
      gradeLabel: '五年級',
      icon: 'fas fa-hand-rock',
      title: '💪 手臂運動原理互動教學',
      description: '為了能多吃幾口罐罐，白奶油決定跟著凱老師練肌肉！動手操作這組超酷的手臂模型，看看二頭肌和三頭肌是怎麼合作讓手臂彎曲的，給白奶油一點特訓吧！',
      url: '33.html',
      moduleUrl: 'games/33/index.js',
      actionLabel: '伸展手臂',
      actionIcon: 'fas fa-dumbbell'
    },
    {
      grades: ['6'],
      gradeLabel: '六年級',
      icon: 'fas fa-circle-notch',
      title: '⚙️ 操作動滑輪',
      description: '白奶油坐在籃子裡耍賴不走，橘咪咪只好請昀老師在穀倉架設滑輪組來吊起這隻胖貓！想知道怎麼操作動滑輪最省力嗎？快來拉拉看！',
      url: '35.html',
      actionLabel: '拉動滑輪',
      actionIcon: 'fas fa-arrow-up'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-paw',
      title: '🐾 動物猜謎大會(需自製動物圖卡)',
      description: '橘咪咪和白奶油在農場裡發現了許多神祕的動物足跡！你能根據牠們的外型特徵和生活習性，猜出是哪位動物朋友來訪嗎？',
      url: '25.html',
      actionLabel: '尋找線索',
      actionIcon: 'fas fa-search'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-temperature-high',
      title: '🔄 物質分類大挑戰',
      description: '橘咪咪把巧克力、水和生雞蛋拿去加熱了！等它們冷卻後，誰能變回原來的樣子呢？快來幫白奶油分類這些奇妙的物質變化吧！',
      url: '22.html',
      actionLabel: '開始分類',
      actionIcon: 'fas fa-undo-alt'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-gem',
      title: '💎 魔法水晶保衛戰',
      description: '農場的魔法水晶受到攻擊啦！快運用「水的三態變化」來防禦！無論是堅硬的冰塊牆、沖刷敵人的水流，還是高溫的水蒸氣，幫白奶油建立最堅固的防線吧！',
      url: '24.html',
      actionLabel: '保衛水晶',
      actionIcon: 'fas fa-shield-alt'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-sun',
      title: '🌿 植物向光性：尋找陽光大冒險',
      description: '橘咪咪發現窗邊的小豆苗歪著頭在看什麼？原來植物也會「追星」！快來幫助小植物繞過障礙物，朝著暖洋洋的太陽生長吧！',
      url: '20.html',
      actionLabel: '尋找陽光',
      actionIcon: 'fas fa-sun'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-icicles',
      title: '🧊 小水滴結冰記：溫度的神祕魔法',
      description: '冬天到了，白奶油的洗臉水竟然變成了硬邦邦的冰塊！跟著小水滴一起體驗從液體變成固體的奇妙旅程，了解溫度是如何改變物質的！',
      url: '21.html',
      actionLabel: '施展冰魔法',
      actionIcon: 'fas fa-snowflake'
    },
    {
      grades: ['3', '5'],
      gradeLabel: '三、五年級',
      icon: 'fas fa-flask',
      title: '🧪 酸鹼滴定',
      description: '就像農場土壤需要酸鹼平衡一樣，讓我們來學習如何知道溶液的酸鹼！',
      url: '04.html',
      actionLabel: '開始滴定',
      actionIcon: 'fas fa-eye-dropper'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-boxes',
      title: '📦 特性分類 (基礎)',
      description: '橘咪咪把農具分類整理好了！這份簡報將帶你認識物質的基本特性與分類方法。',
      url: '01.html',
      actionLabel: '幫忙整理',
      actionIcon: 'fas fa-box-open'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-microscope',
      title: '🚀 特性分類 (進階)',
      description: '白奶油發現了更深奧的分類學問！適合已經了解基礎概念的小小科學家挑戰。',
      url: '02.html',
      actionLabel: '進階觀測',
      actionIcon: 'fas fa-search-plus'
    },
    {
      grades: ['6'],
      gradeLabel: '六年級',
      icon: 'fas fa-bolt',
      title: '⚡ 電流磁效應',
      description: '不可思議的電與磁！與橘咪咪一起來探索電流如何產生磁場',
      url: '03.html',
      actionLabel: '探索電磁',
      actionIcon: 'fas fa-magnet'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-filter',
      title: '🧂 鹽巴沙子分離術',
      description: '糟糕！橘咪咪把鹽巴混進沙坑了。快運用「溶解、過濾、結晶」的科學方法，幫白奶油把乾淨的鹽巴變回來！',
      url: '05.html',
      actionLabel: '施展分離術',
      actionIcon: 'fas fa-magic'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-syringe',
      title: '💉 空氣壓縮大挑戰',
      description: '白奶油發現針筒裡的空氣像是裝了彈簧！用力壓下去它還會彈回來。快來試試看壓縮針筒，看你能把空氣壓得多扁呢？',
      url: '07.html',
      actionLabel: '用力壓縮',
      actionIcon: 'fas fa-compress-alt'
    },
    {
      grades: ['4'],
      gradeLabel: '四年級',
      icon: 'fas fa-lightbulb',
      title: '🔌 奇妙的電路實驗',
      description: '天黑了，橘咪咪在農場倉庫找到了一些電池跟電線，她想知道怎麼做才能讓燈泡發光？一起來動手接通電路吧！',
      url: '08.html',
      actionLabel: '點亮燈泡',
      actionIcon: 'fas fa-lightbulb'
    },
    {
      grades: ['3', '5'],
      gradeLabel: '三、五年級',
      icon: 'fas fa-hand-holding-water',
      title: '🎮 酸鹼接接樂',
      description: '反應力大考驗！請依照白奶油的指令，移動橘咪咪接住正確的溶液。小心別接到錯的喔！',
      url: '09.html',
      actionLabel: '挑戰反應力',
      actionIcon: 'fas fa-stopwatch'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-carrot',
      title: '🥕 蔬菜身世之謎',
      description: '橘咪咪在收成時把蔬菜全搞混了！哪些是根莖類？哪些是葉菜類？快來玩分類遊戲，幫白奶油整理出正確的晚餐食材！',
      url: '11.html',
      actionLabel: '挑選晚餐',
      actionIcon: 'fas fa-shopping-basket'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-map-marked-alt',
      title: '🏝️ 四季農莊：島嶼物語',
      description: '橘咪咪和白奶油發現了一個神祕島嶼！這裡的四季變化對植物有什麼影響？快跟著他們一起探索不同季節最適合種植的作物吧！',
      url: '12.html',
      actionLabel: '出發探索',
      actionIcon: 'fas fa-compass'
    },
    {
      grades: ['3'],
      gradeLabel: '三年級',
      icon: 'fas fa-seedling',
      title: '🌱 播種小達人',
      description: '來挑戰種植小白菜與番茄吧！學習「撒播」與「點播」的技巧，並用正確的方式幫幼苗覆土與澆水，成為優秀的小農夫！',
      url: '14.html',
      actionLabel: '動手播種',
      actionIcon: 'fas fa-seedling'
    },
    {
      grades: ['5'],
      gradeLabel: '五年級',
      icon: 'fas fa-star',
      title: '⭐ 尋找北極星',
      description: '夜空中的指北針！跟著橘咪咪一起觀察四季星空的變化，學習如何透過北斗七星與仙后座找到指引方向的北極星吧！',
      url: '19.html',
      actionLabel: '觀測星空',
      actionIcon: 'fas fa-binoculars'
    },
    {
      grades: ['6'],
      gradeLabel: '六年級',
      icon: 'fas fa-balance-scale',
      title: '⚖️ 槓桿與輪軸對對碰',
      description: '農場裡的省力小祕密！橘咪咪發現只要找對支點，就能輕鬆搬起巨大的南瓜。快來跟白奶油挑戰對對碰，找出生活中的槓桿與輪軸吧！',
      url: '15.html',
      actionLabel: '開始配對',
      actionIcon: 'fas fa-puzzle-piece'
    },
    {
      grades: ['6'],
      gradeLabel: '六年級',
      icon: 'fas fa-cogs',
      title: '⚙️ 槓桿與輪軸對對碰2',
      description: '昀帶來了全新的力學進階挑戰！這次有更多不一樣的農場工具，快來測試你的力學知識，看看能不能全部配對成功！',
      url: '18.html',
      moduleUrl: 'games/18/index.js',
      actionLabel: '進階配對',
      actionIcon: 'fas fa-tools'
    },
    {
      grades: ['4'],
      gradeLabel: '四年級',
      icon: 'fas fa-plug',
      title: '🔌 電路接線挑戰賽',
      description: '橘咪咪的燈泡又不亮了！快跟著澔哥一起挑戰更複雜的電路接線，找出讓所有燈泡發光的正確接法吧！',
      url: '16.html',
      actionLabel: '接通電路',
      actionIcon: 'fas fa-plug'
    },
    {
      grades: ['4'],
      gradeLabel: '四年級',
      icon: 'fas fa-water',
      title: '💧 水生植物到新家',
      description: '生態池種了新植物，請幫白奶油把水生植物們搬到適合它們的新家，一起認識漂浮、沉水與挺水植物！',
      url: '17.html',
      actionLabel: '佈置新家',
      actionIcon: 'fas fa-leaf'
    }
  ];

  const getGameNumber = (game) => {
    if (game.gameNumber) return String(game.gameNumber).padStart(2, '0');

    const match = String(game.url || '').match(/(?:^|\/)(\d{1,2})\.html(?:[?#].*)?$/i);
    return match ? match[1].padStart(2, '0') : '';
  };

  window.FARM_GAMES = Object.freeze(
    games.map((game) => {
      const gameNumber = getGameNumber(game);
      const legacyUrl = game.legacyUrl || game.url;

      return Object.freeze({
        ...game,
        id: game.id || `game-${gameNumber}`,
        gameNumber,
        legacyUrl,
        url: gameNumber ? `play.html?game=${encodeURIComponent(gameNumber)}` : legacyUrl,
        grades: Object.freeze([...game.grades])
      });
    })
  );
})();
