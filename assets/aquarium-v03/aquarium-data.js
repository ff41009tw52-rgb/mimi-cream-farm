/* V0.3 balancing and species extension points. No simulation branches per species. */
(() => {
const TEST_MODE=new URLSearchParams(location.search).get('test')==='1';
const CONFIG=Object.freeze({
 TEST_MODE,SAVE_KEY:TEST_MODE?'aquarium_game_save_v3_test':'aquarium_game_save_v3',
 MANUAL_KEY:TEST_MODE?'aquarium_game_save_v3_test_manual':'aquarium_game_save_v3_manual',
 LEGACY_KEY:'aquarium_game_save_v1',LEGACY_MANUAL_KEY:'aquarium_game_save_v1_manual',
 V2_KEY:'aquarium_game_save_v2',V2_MANUAL_KEY:'aquarium_game_save_v2_manual',
 SCHEMA_VERSION:3,GAME_VERSION:'0.3',CAPACITY:10,START_COINS:20,MAX_COINS:999999,
 GROWTH_SCALE:TEST_MODE?.04:1,COIN_SCALE:TEST_MODE?.12:1,XP_SCALE:TEST_MODE?4:1,
 HUNGER_PER_SECOND:.018,WATER_PER_SECOND:.005,MAX_FOOD:18,FOOD_PER_DROP:3,
 FEED_COOLDOWN:.7,FOOD_SINK_SPEED:.025,FOOD_BOTTOM_SECONDS:22,MAX_DROPS:30,
 AUTO_SAVE_SECONDS:15,SAVE_DEBOUNCE_MS:900,MAX_OFFLINE_TIME:4*3600,
 OFFLINE_GROWTH_PER_HOUR:4,OFFLINE_HUNGER_PER_HOUR:5,OFFLINE_MAX_REWARD:120,
 CLEAN_SECONDS:2.1,CLEAN_COOLDOWN:45,CLEAN_EFFICIENCY:38,CARE_XP_SECONDS:60,
 LEVEL_XP:[0,45,130,300,1100],MAX_DECOR:20,MAX_NAME:12,SNAP_SLOTS:16,PLAYTEST:new URLSearchParams(location.search).get('playtest')==='1'
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
// These are game preferences, not a biology curriculum.
const environment={
 guppy:{plant:1.4,shelter:.35,curiosity:.35},goldfish:{plant:.4,curiosity:.6,rock:.25},
 cory:{bottom:1.2,wood:1.4,rock:1.1,shelter:1.5},zebra:{plant:.25,curiosity:.2,openWater:1.6},
 molly:{plant:.8,wood:.25,curiosity:.5},swordtail:{plant:.5,curiosity:.6},
 whitecloud:{plant:.35,openWater:1.5},cardinal:{plant:.4,openWater:1.7},
 angel:{tallPlant:1.7,plant:.6,shelter:.2},betta:{plant:1.5,shelter:.8,curiosity:.25}
};
const SPECIES=Object.freeze(Object.fromEntries(Object.entries(rows).map(([id,row])=>[id,Object.freeze({...base,...row,environment:environment[id],poiInterval:[35,65],poiChance:row.schoolingStrength>.3?.42:.68,personalities:id==='angel'?['leisurely','foodie','curious','shy']:['active','leisurely','foodie','curious','shy']})])));
const decorRows={
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
};
const behaviorTags={
 smallplant:{tags:['plant'],anchor:.82,footprint:.075},tallplant:{tags:['plant','tallPlant'],anchor:.88,footprint:.075},
 moss:{tags:['plant','bottom'],anchor:.55,footprint:.085},smallrock:{tags:['rock','bottom'],anchor:.35,footprint:.07},
 bigrock:{tags:['rock','bottom'],anchor:.4,footprint:.105},wood:{tags:['wood','bottom','curiosity'],anchor:.38,footprint:.12},
 cave:{tags:['shelter','rock','bottom'],anchor:.45,footprint:.12,canHide:true},
 ship:{tags:['shelter','curiosity','bottom'],anchor:.4,footprint:.13,canHide:true},chest:{tags:['curiosity','bottom'],anchor:.5,footprint:.1}
};
const DECORATIONS=Object.freeze(Object.fromEntries(Object.entries(decorRows).map(([id,d])=>[id,Object.freeze({...d,...behaviorTags[id]})])));
const PERSONALITIES=Object.freeze({
 active:{name:'好動',desc:'喜歡多游一小段。',speed:1.08,burst:1.2,pause:.85,pauseTime:.85,food:1,poi:1},
 leisurely:{name:'悠閒',desc:'停一停，再慢慢出發。',speed:.9,burst:.85,pause:1.15,pauseTime:1.18,food:1,poi:1},
 foodie:{name:'貪吃',desc:'餓的時候，眼裡都是飼料。',speed:1,burst:1,pause:1,pauseTime:1,food:1.18,poi:1},
 curious:{name:'好奇',desc:'偶爾看看新布置。',speed:1.03,burst:1,pause:1,pauseTime:1,food:1,poi:1.18},
 shy:{name:'怕生',desc:'喜歡綠葉旁的小角落。',speed:.96,burst:.95,pause:1.1,pauseTime:1.1,food:1,poi:1.08,shelter:1.18}
});
const TANK_TIERS=Object.freeze([
 {tier:1,name:'小小水族箱',capacity:10,decorCapacity:12,price:0,level:1},
 {tier:2,name:'成長水族箱',capacity:12,decorCapacity:15,price:400,level:3},
 {tier:3,name:'悠悠水族箱',capacity:15,decorCapacity:18,price:1550,level:4},
 {tier:4,name:'豐富水族箱',capacity:18,decorCapacity:20,price:4800,level:5}
]);
const VARIANTS=Object.freeze({
 guppy_sky:{species:'guppy',name:'晴空藍',color:'#8ad6df',tail:'#7aa9e1',accent:'#dae7ff',rule:{type:'adult',species:'guppy',count:1},condition:'養成 1 隻孔雀魚成魚'},
 guppy_sunset:{species:'guppy',name:'晚霞粉',color:'#dba8c7',tail:'#da8499',accent:'#ffe1c2',rule:{type:'achievement',id:'companionship'},condition:'完成「長久陪伴」並領取獎勵'},
 goldfish_cream:{species:'goldfish',name:'奶油白',color:'#f1ebd1',tail:'#ead9b1',accent:'#fffaf0',rule:{type:'adult',species:'goldfish',count:1},condition:'養成 1 隻金魚成魚'},
 molly_pearl:{species:'molly',name:'珍珠銀',color:'#b5ccd3',tail:'#94afb9',accent:'#f4f3e6',rule:{type:'achievement',id:'plantGarden'},condition:'收藏三種水草，領取「水草小天地」'},
 angel_gold:{species:'angel',name:'晨光金',color:'#f1d593',tail:'#dcb779',accent:'#fff1c5',rule:{type:'adult',species:'angel',count:3},condition:'累計養成 3 隻神仙魚成魚'},
 betta_orchid:{species:'betta',name:'蘭花紫',color:'#b5a7d9',tail:'#aa8ec4',accent:'#e8d9f5',rule:{type:'adult',species:'betta',count:1},condition:'養成 1 隻鬥魚成魚'},
 betta_dawn:{species:'betta',name:'朝霞紅',color:'#df9887',tail:'#cf817e',accent:'#f6d3a8',rule:{type:'achievement',id:'allSpecies'},condition:'發現全部 10 種魚，領取「魚類觀察家」'}
});
const ACHIEVEMENTS=Object.freeze([
 {id:'firstPurchase',name:'第一位新住客',desc:'第一次自己購買魚兒。',goal:1,metric:'purchases',reward:{coins:10}},
 {id:'firstAdult',name:'長大了！',desc:'第一次把一隻魚養成成魚。',goal:1,metric:'adults',reward:{coins:10}},
 {id:'fiveSpecies',name:'小小收藏家',desc:'在圖鑑發現 5 種魚。',goal:5,metric:'species',reward:{coins:15}},
 {id:'allSpecies',name:'魚類觀察家',desc:'在圖鑑發現全部 10 種魚。',goal:10,metric:'species',reward:{variant:'betta_dawn'}},
 {id:'eightFish',name:'熱鬧水族箱',desc:'同時照顧 8 隻魚。',goal:8,metric:'fish',reward:{coins:15}},
 {id:'fiveDecor',name:'我的風格',desc:'在魚缸放置 5 件裝飾。',goal:5,metric:'decor',reward:{coins:10}},
 {id:'plantGarden',name:'水草小天地',desc:'收藏小水草、高水草與莫絲。',goal:3,metric:'plants',reward:{variant:'molly_pearl'}},
 {id:'clearWater',name:'清澈日常',desc:'累積 30 分鐘保持水質 70 以上。',goal:1800,metric:'water',reward:{coins:10}},
 {id:'companionship',name:'長久陪伴',desc:'同一隻魚累積相伴 90 分鐘遊玩時間。',goal:5400,metric:'companionship',reward:{variant:'guppy_sunset'}},
 {id:'expandedTank',name:'一起長大',desc:'把同一個魚缸升到成長水族箱。',goal:2,metric:'tier',reward:{coins:15}}
]);
window.AquariumData=Object.freeze({CONFIG,SPECIES,DECORATIONS,PERSONALITIES,TANK_TIERS,VARIANTS,ACHIEVEMENTS});
})();
