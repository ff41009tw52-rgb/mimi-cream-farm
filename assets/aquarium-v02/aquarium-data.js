/* V0.2 balancing and species extension points. No simulation branches per species. */
(() => {
const TEST_MODE=new URLSearchParams(location.search).get('test')==='1';
const CONFIG=Object.freeze({
 TEST_MODE,SAVE_KEY:TEST_MODE?'aquarium_game_save_v2_test':'aquarium_game_save_v2',
 MANUAL_KEY:TEST_MODE?'aquarium_game_save_v2_test_manual':'aquarium_game_save_v2_manual',
 LEGACY_KEY:'aquarium_game_save_v1',LEGACY_MANUAL_KEY:'aquarium_game_save_v1_manual',
 SCHEMA_VERSION:2,GAME_VERSION:'0.2',CAPACITY:10,START_COINS:20,MAX_COINS:999999,
 GROWTH_SCALE:TEST_MODE?.04:1,COIN_SCALE:TEST_MODE?.12:1,XP_SCALE:TEST_MODE?4:1,
 HUNGER_PER_SECOND:.018,WATER_PER_SECOND:.005,MAX_FOOD:18,FOOD_PER_DROP:3,
 FEED_COOLDOWN:.7,FOOD_SINK_SPEED:.025,FOOD_BOTTOM_SECONDS:22,MAX_DROPS:30,
 AUTO_SAVE_SECONDS:15,SAVE_DEBOUNCE_MS:900,MAX_OFFLINE_TIME:4*3600,
 OFFLINE_GROWTH_PER_HOUR:4,OFFLINE_HUNGER_PER_HOUR:5,OFFLINE_MAX_REWARD:120,
 CLEAN_SECONDS:2.1,CLEAN_COOLDOWN:45,CLEAN_EFFICIENCY:38,CARE_XP_SECONDS:60,
 LEVEL_XP:[0,45,130,300,620],MAX_DECOR:12,MAX_NAME:12
});
const base={acceleration:2,turnSpeed:3,schoolingStrength:0,pauseChance:.22,pauseDuration:[.5,1.6],burstChance:.08,burstFactor:1.6,foodPreference:'any',bottomDweller:false,foodBoost:1.55,art:null};
const rows={
 guppy:{name:'孔雀魚',nickname:'小彩',size:85,speed:.075,depth:[.17,.56],price:65,unlockLevel:1,growthTime:600,coinInterval:45,values:[2,4,6],acceleration:3.8,turnSpeed:5.5,schoolingStrength:.13,burstChance:.28,pauseChance:.25,color:'#82cfc1',tail:'#ef8769',shape:'guppy',depthName:'中上層',growthLabel:'較快',desc:'活潑探險家：靈巧轉身、短衝刺，偶爾靠近同伴。'},
 goldfish:{name:'金魚',nickname:'小金',size:114,speed:.034,depth:[.23,.76],price:110,unlockLevel:1,growthTime:1200,coinInterval:60,values:[3,6,10],acceleration:.8,turnSpeed:1.4,pauseChance:.38,pauseDuration:[1.2,3],burstChance:.01,foodBoost:2,color:'#ffb844',tail:'#f89636',shape:'goldfish',depthName:'中層至中下層',growthLabel:'較慢',desc:'慢悠悠的大住客，平順加速，常停著擺尾；餓時才追得快。'},
 cory:{name:'鼠魚',nickname:'小點',size:96,speed:.032,depth:[.81,.9],price:85,unlockLevel:1,growthTime:900,coinInterval:55,values:[2,5,7],acceleration:3,turnSpeed:3.5,bottomDweller:true,foodPreference:'bottom',pauseChance:.55,pauseDuration:[1.5,3],burstChance:.4,burstFactor:2,color:'#d8d4b7',tail:'#9ba998',shape:'cory',depthName:'底層',growthLabel:'中等',desc:'底砂小巡邏員，短短衝一段再停下，優先搜尋沉底飼料。'},
 zebra:{name:'斑馬魚',nickname:'小斑',size:78,speed:.095,depth:[.16,.54],price:100,unlockLevel:2,growthTime:660,coinInterval:38,values:[2,4,6],acceleration:4.2,turnSpeed:6,schoolingStrength:.38,burstChance:.36,pauseChance:.12,color:'#bcd9d4',tail:'#8cc6c2',shape:'slim',pattern:'stripes',depthName:'中上層',growthLabel:'快',desc:'帶條紋的快游派，愛靠近同類，常穿過中央泳區。'},
 molly:{name:'黑摩利',nickname:'小墨',size:100,speed:.042,depth:[.33,.73],price:145,unlockLevel:2,growthTime:720,coinInterval:62,values:[3,6,9],acceleration:1.7,turnSpeed:2.8,pauseChance:.16,color:'#52656b',tail:'#6f8184',shape:'oval',depthName:'中層',growthLabel:'較快',desc:'穩穩地游、穩穩地長大，柔和加速，不急著搶食。'},
 swordtail:{name:'紅劍魚',nickname:'小劍',size:104,speed:.071,depth:[.3,.69],price:190,unlockLevel:3,growthTime:960,coinInterval:57,values:[3,6,11],acceleration:3,turnSpeed:4,burstChance:.23,color:'#ed9270',tail:'#ce7158',shape:'sword',depthName:'中層',growthLabel:'中等',desc:'細長尾劍的中層探索家，偶爾短衝，成魚收益不錯。'},
 whitecloud:{name:'白雲山魚',nickname:'小雲',size:75,speed:.061,depth:[.2,.6],price:175,unlockLevel:3,growthTime:840,coinInterval:43,values:[2,5,8],acceleration:2.8,turnSpeed:4.5,schoolingStrength:.52,pauseChance:.18,color:'#b9cbc1',tail:'#dd8269',shape:'slim',pattern:'line',depthName:'中上層',growthLabel:'中等偏快',desc:'柔和的小群游魚，喜歡同類相伴，但各自保留一點距離。'},
 cardinal:{name:'紅蓮燈',nickname:'小燈',size:70,speed:.057,depth:[.39,.68],price:260,unlockLevel:4,growthTime:1080,coinInterval:47,values:[3,6,10],acceleration:2.7,turnSpeed:4,schoolingStrength:.62,pauseChance:.15,color:'#77c8d3',tail:'#7aadb7',shape:'slim',pattern:'neon',depthName:'中層',growthLabel:'中等偏慢',desc:'藍紅光帶的小住客，群聚傾向明顯，讓魚缸亮起來。'},
 angel:{name:'神仙魚',nickname:'小羽',size:124,speed:.026,depth:[.31,.73],price:390,unlockLevel:4,growthTime:1800,coinInterval:82,values:[4,10,18],acceleration:.65,turnSpeed:1.2,pauseChance:.32,pauseDuration:[1.3,3.3],burstChance:.01,foodBoost:1.7,color:'#e5e8d3',tail:'#b9ccc0',shape:'angel',depthName:'中層',growthLabel:'慢',desc:'高高的三角魚鰭，轉彎寬、長得慢，養成後帶來大枚金幣。'},
 betta:{name:'鬥魚',nickname:'小綢',size:111,speed:.029,depth:[.19,.59],price:480,unlockLevel:5,growthTime:1440,coinInterval:75,values:[4,9,15],acceleration:1.2,turnSpeed:2,pauseChance:.48,pauseDuration:[1.4,3.2],burstChance:.08,schoolingStrength:0,color:'#7495c7',tail:'#b489bb',shape:'betta',depthName:'中上層',growthLabel:'較慢',desc:'獨自巡遊的長鰭住客，輕輕停頓，再展開尾巴慢慢前進。'}
};
const SPECIES=Object.freeze(Object.fromEntries(Object.entries(rows).map(([id,row])=>[id,Object.freeze({...base,...row})])));
const DECORATIONS=Object.freeze({
 river:{name:'河砂',price:0,kind:'substrate',color:'#e2d5ae',desc:'暖暖的自然底砂。'},
 white:{name:'白砂',price:65,kind:'substrate',color:'#f0eedb',desc:'清爽明亮，襯出魚兒的顏色。'},
 black:{name:'黑砂',price:95,kind:'substrate',color:'#71817d',desc:'沉穩的底色，讓亮色魚更醒目。'},
 smallplant:{name:'小水草',price:35,kind:'plant',height:.18,color:'#7cb799',desc:'不擋泳區的綠色小角落。'},
 tallplant:{name:'高水草',price:60,kind:'plant',height:.33,color:'#579e85',desc:'沿著兩側向上生長的葉片。'},
 moss:{name:'莫絲',price:50,kind:'plant',height:.09,color:'#7aa184',desc:'貼著底砂，蓬鬆又柔和。'},
 smallrock:{name:'小石頭',price:40,kind:'ground',height:.065,color:'#bac3af',desc:'一顆溫柔的小石頭。'},
 bigrock:{name:'大石頭',price:70,kind:'ground',height:.13,color:'#96aaa0',desc:'低低的岩石，魚可以從上方游過。'},
 wood:{name:'沉木',price:100,kind:'ground',height:.14,color:'#a08868',desc:'讓魚缸多一點森林感。'},
 cave:{name:'洞穴',price:125,kind:'ground',height:.135,color:'#a3b2a0',desc:'一個安靜的小角落。'},
 ship:{name:'沉船',price:165,kind:'ground',height:.16,color:'#ab8b63',desc:'底層的一段小小航海故事。'},
 chest:{name:'寶箱',price:150,kind:'ground',height:.09,color:'#b88d58',desc:'藏著光芒的袖珍寶箱。'}
});
window.AquariumData=Object.freeze({CONFIG,SPECIES,DECORATIONS});
})();
