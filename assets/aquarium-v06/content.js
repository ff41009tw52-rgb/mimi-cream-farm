/* Additive catalog loaded before validators capture their catalog references.
 * The ten original species, their art, rewards and save IDs remain unchanged. */
(() => {
'use strict';
const D=window.AquariumData;
const base={acceleration:2,turnSpeed:3,schoolingStrength:0,pauseChance:.25,pauseDuration:[.6,1.8],burstChance:.08,burstFactor:1.6,foodPreference:'any',bottomDweller:false,foodBoost:1.55,art:null,poiInterval:[35,65],poiChance:.6,personalities:['active','leisurely','foodie','curious','shy']};
const rows={
 platy:{name:'月光魚',nickname:'小月',size:88,speed:.048,depth:[.28,.67],price:125,unlockLevel:2,growthTime:780,coinInterval:55,values:[2,5,8],color:'#eaa269',tail:'#cf7759',shape:'platy',depthName:'中層',growthLabel:'中等',desc:'圓潤的小探險家，扇形尾鰭輕輕擺動。',environment:{plant:1.1,curiosity:.6}},
 harlequin:{name:'三角燈',nickname:'小角',size:77,speed:.066,depth:[.28,.62],price:210,unlockLevel:3,growthTime:960,coinInterval:48,values:[2,5,9],schoolingStrength:.55,color:'#dca18a',tail:'#c48371',shape:'harlequin',depthName:'中層',growthLabel:'中等',desc:'身體後方的深色三角斑，是牠的招牌記號。',environment:{plant:.5,openWater:1.5}},
 honey:{name:'蜜糖麗麗魚',nickname:'小蜜',size:99,speed:.03,depth:[.2,.6],price:310,unlockLevel:4,growthTime:1320,coinInterval:68,values:[3,7,12],pauseChance:.35,color:'#dab058',tail:'#c4924c',shape:'honey',depthName:'中上層',growthLabel:'較慢',desc:'暖金色的橢圓魚身，帶著兩條細長腹鰭。',environment:{plant:1.3,tallPlant:.8,shelter:.5}},
 kuhli:{name:'酷利泥鰍',nickname:'小條',size:118,speed:.035,depth:[.83,.92],price:320,unlockLevel:4,growthTime:1260,coinInterval:70,values:[3,7,12],bottomDweller:true,foodPreference:'bottom',pauseChance:.42,color:'#d6b080',tail:'#b69068',shape:'kuhli',depthName:'底層',growthLabel:'較慢',desc:'細長條紋身體輕輕彎曲，沿著缸底尋找食物。',environment:{bottom:1.5,wood:1.2,shelter:1.5}},
 bolivian:{name:'玻利維亞鳳凰',nickname:'小鳳',size:111,speed:.036,depth:[.52,.85],price:490,unlockLevel:5,growthTime:1620,coinInterval:78,values:[4,9,16],color:'#ceb780',tail:'#cc866f',shape:'bolivian',depthName:'中下層',growthLabel:'慢',desc:'側扁魚身有深色斑，背鰭前方高高豎起。',environment:{bottom:1,rock:1.1,shelter:.5}}
};
const knowledge={
 platy:{scientific:'Xiphophorus maculatus',habitat:'中美洲的淡水溪流與河川。',body:'身體短而側扁，尾鰭呈扇形；觀賞品系有多種體色。',diet:'雜食，會吃小型動物及植物性食物，飼養時需要多樣化餵食。',habit:'通常溫和，喜歡有植物遮蔽的活動空間。',care:'常見飼養水溫約 20～26°C；偏好較硬的水。不要只看體色就決定混養。',source:'xiphophorus-maculatus'},
 harlequin:{scientific:'Trigonostigma heteromorpha',habitat:'東南亞植被茂密的淡水溪流與林地水域。',body:'側面較薄，身體後半有醒目的深色三角斑。',diet:'主要吃小型無脊椎動物，也能接受適當大小的人工飼料。',habit:'喜歡同類成群活動，單獨飼養容易緊張。',care:'常見飼養水溫約 21～28°C；與體型相近、溫和的魚搭配，避開會吞食小魚的魚種。',source:'trigonostigma-heteromorpha'},
 honey:{scientific:'Trichogaster chuna',habitat:'南亞恆河及布拉馬普特拉河流域的緩流水域。',body:'橢圓側扁，背鰭、臀鰭延長，腹鰭呈細絲狀。',diet:'偏好小型昆蟲及其他無脊椎動物，也接受合適的人工飼料。',habit:'有輔助呼吸的迷鰓器官，會到水面呼吸；雄魚繁殖時可能護域。',care:'常見飼養水溫約 22～27°C；提供水草遮蔽與平靜水面，避免和過於強勢的魚同養。',source:'trichogaster-chuna'},
 kuhli:{scientific:'Pangio 屬條紋型泥鰍',habitat:'東南亞的淡水林溪、緩流與落葉堆積處。',body:'身體細長，有深色環帶與嘴邊觸鬚，小魚鰭靠近身體。',diet:'在底層尋找小型無脊椎動物及可食碎屑，不是只吃剩菜的清潔魚。',habit:'偏好昏暗、有遮蔽物的底層；同類相伴較安心。',care:'常見條紋型如 P. semicincta 約 21～26°C；用細砂、提供躲藏處與防逃縫隙。市售酷利泥鰍可能包含不同近似種。',source:'pangio-semicincta'},
 bolivian:{scientific:'Mikrogeophagus altispinosus',habitat:'玻利維亞與巴西馬德拉河上游流域的淡水水域。',body:'身體側扁，體側有深色斑，背鰭前段較高，鰭緣帶暖紅色。',diet:'從底砂找小型無脊椎動物與有機食物，飼養時提供多樣、適口的食物。',habit:'常在底層覓食，繁殖護幼時會有領域性。',care:'常見飼養水溫約 24～28°C；留足底層活動空間與視線遮蔽，避免擁擠。',source:'mikrogeophagus-altispinosus'}
};
const decor={
 crypt:{name:'矮椒草',kind:'plant',height:.17,price:40,unlockLevel:1,color:'#77946b',tags:['plant'],footprint:.075,anchor:.82,desc:'皺皺的葉片貼近底砂，像一小叢綠色植物。'},
 pebbles:{name:'鵝卵石堆',kind:'ground',height:.09,ratio:.58,price:45,unlockLevel:1,color:'#b1b6a8',tags:['rock','bottom'],footprint:.1,anchor:.4,desc:'幾顆圓圓的石頭疊在一起，很有自然的感覺。'},
 anubias:{name:'水榕',kind:'plant',height:.2,price:75,unlockLevel:2,color:'#42785e',tags:['plant','wood'],footprint:.09,anchor:.8,desc:'深綠色的圓葉片，從根莖向外長出來。'},
 lava:{name:'火山石',kind:'ground',height:.12,ratio:.8,price:85,unlockLevel:2,color:'#866e65',tags:['rock','bottom'],footprint:.1,anchor:.4,desc:'紅褐色的石頭上有許多小孔，像天然的水中造景。'},
 urn:{name:'陶甕',kind:'ground',height:.14,ratio:.9,price:100,unlockLevel:2,color:'#c28d6c',tags:['shelter','bottom'],footprint:.11,anchor:.45,canHide:true,desc:'陶土色的小甕，開口像魚兒可以躲藏的小屋。'},
 amazon:{name:'皇冠草',kind:'plant',height:.31,price:125,unlockLevel:3,color:'#6b9a65',tags:['plant','tallPlant'],footprint:.09,anchor:.88,desc:'寬長葉片從中心向外展開，像綠色皇冠。'},
 riccia:{name:'鹿角苔',kind:'plant',height:.1,price:105,unlockLevel:3,color:'#8cb26b',tags:['plant','bottom'],footprint:.085,anchor:.55,desc:'細小的分叉構造聚在一起，像一塊淺綠色地毯。'},
 seiryu:{name:'青龍石',kind:'ground',height:.17,ratio:1.04,price:135,unlockLevel:3,color:'#82918d',tags:['rock','bottom'],footprint:.1,anchor:.4,desc:'灰藍色的石頭有淺色紋路，表面凹凸不平。'},
 arch:{name:'石拱門',kind:'ground',height:.17,ratio:.85,price:155,unlockLevel:3,color:'#a4ae98',tags:['shelter','rock'],footprint:.14,anchor:.5,canHide:true,desc:'兩根石柱撐起一道拱門，中間留著可以穿過的空間。'},
 rotala:{name:'紅宮廷',kind:'plant',height:.29,price:185,unlockLevel:4,color:'#b37d75',tags:['plant','tallPlant'],footprint:.09,anchor:.85,desc:'細長的莖上有一對對小葉，帶著柔和的紅綠色。'},
 branchwood:{name:'分枝沉木',kind:'ground',height:.21,ratio:1.05,price:220,unlockLevel:4,color:'#9a7a58',tags:['wood','shelter','curiosity'],footprint:.14,anchor:.45,desc:'向左右舒展的曲枝，像水中的小樹。'},
 lighthouse:{name:'小燈塔',kind:'ground',height:.22,ratio:1.35,price:330,unlockLevel:5,color:'#d9cbb1',tags:['curiosity'],footprint:.1,anchor:.45,desc:'奶油白的燈塔配上紅色屋頂，讓水族箱更有特色。'}
};
const bonusAchievements=[
 {id:'fourSpecies',name:'認識新朋友',desc:'在圖鑑發現 4 種不同的魚。',goal:4,metric:'species',reward:{coins:12}},
 {id:'threePurchases',name:'採購小達人',desc:'累計購買 3 隻魚兒。',goal:3,metric:'purchases',reward:{coins:18}},
 {id:'twoAdults',name:'養魚真有耐心',desc:'累計將 2 隻魚養成成魚。',goal:2,metric:'adults',reward:{coins:25}},
 {id:'sevenDecor',name:'水族箱設計家',desc:'在同一個魚缸布置 7 件裝飾。',goal:7,metric:'decor',reward:{coins:35}},
 {id:'twelveSpecies',name:'魚類探索家',desc:'在圖鑑發現 12 種不同的魚。',goal:12,metric:'species',reward:{coins:55}},
 {id:'fifteenSpecies',name:'魚類研究家',desc:'在圖鑑發現全部 15 種魚。',goal:15,metric:'species',reward:{coins:90}}
];
const category=(id,d)=>d.kind==='substrate'?'sand':d.kind==='plant'?'plants':['cave','ship','chest','urn','arch','lighthouse'].includes(id)?'special':'nature';
window.AquariumData=Object.freeze({...D,
 ACHIEVEMENTS:Object.freeze([...D.ACHIEVEMENTS.map(a=>a.id==='allSpecies'?Object.freeze({...a,desc:'在圖鑑發現 10 種魚。'}):a),...bonusAchievements.map(a=>Object.freeze(a))]),
 VARIANTS:Object.freeze({...D.VARIANTS,betta_dawn:Object.freeze({...D.VARIANTS.betta_dawn,condition:'發現 10 種魚，領取「魚類觀察家」'})}),
 SPECIES:Object.freeze({...D.SPECIES,...Object.fromEntries(Object.entries(rows).map(([id,r])=>[id,Object.freeze({...base,...r,knowledge:knowledge[id]})]))}),
 DECORATIONS:Object.freeze(Object.fromEntries(Object.entries({...D.DECORATIONS,...decor}).map(([id,d])=>[id,Object.freeze({unlockLevel:1,...d,category:category(id,d)})])))
});
})();
